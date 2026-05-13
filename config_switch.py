import copy
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from app_health import get_env_or_inline_value, parse_http_url, safe_url_display
from config import (
    DiagnosticError,
    ENV_PATH,
    GPT_SOVITS_DEFAULT_API_URL,
    LOCAL_CONFIG_PATH,
    OLLAMA_DEFAULT_BASE_URL,
    OLLAMA_DEFAULT_MODEL,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
    OPENAI_DEFAULT_MODEL,
    TTS_DEFAULT_VOICE,
    VOLCENGINE_ACCESS_TOKEN_ENV,
    VOLCENGINE_APP_ID_ENV,
    VOLCENGINE_SECRET_KEY_ENV,
    VOLCENGINE_TTS_DEFAULT_API_URL,
    VOLCENGINE_TTS_DEFAULT_CLUSTER,
    VOLCENGINE_TTS_DEFAULT_VOICE,
    WEB_DIR,
)


DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_DEFAULT_MODEL = "qwen-plus"
DASHSCOPE_KEY_ENV = "DASHSCOPE_API_KEY"
FIRST_RUN_DEFAULT_BASE_URL = "http://127.0.0.1:8000/v1"
FIRST_RUN_DEFAULT_KEY_ENV = "TAFFY_LLM_API_KEY"
FIRST_RUN_ALLOWED_PROVIDERS = {"openai-compatible", "openai", "ollama"}

LLM_PRESETS = {
    "dashscope": {
        "id": "dashscope",
        "label": "DashScope / Qwen",
        "provider": "openai-compatible",
        "base_url": DASHSCOPE_BASE_URL,
        "model": DASHSCOPE_DEFAULT_MODEL,
        "api_key_env": DASHSCOPE_KEY_ENV,
        "requires_api_key": True,
    },
    "openai": {
        "id": "openai",
        "label": "OpenAI",
        "provider": "openai",
        "base_url": OPENAI_DEFAULT_BASE_URL,
        "model": OPENAI_DEFAULT_MODEL,
        "api_key_env": OPENAI_DEFAULT_KEY_ENV,
        "requires_api_key": True,
    },
    "ollama": {
        "id": "ollama",
        "label": "Ollama local",
        "provider": "ollama",
        "base_url": OLLAMA_DEFAULT_BASE_URL,
        "model": OLLAMA_DEFAULT_MODEL,
        "api_key_env": "",
        "requires_api_key": False,
    },
    "custom_openai_compatible": {
        "id": "custom_openai_compatible",
        "label": "Custom OpenAI-compatible",
        "provider": "openai-compatible",
        "base_url": "http://127.0.0.1:8000/v1",
        "model": OPENAI_DEFAULT_MODEL,
        "api_key_env": "TAFFY_LLM_API_KEY",
        "requires_api_key": True,
    },
}

TTS_PRESETS = {
    "browser": {
        "id": "browser",
        "label": "Browser voice",
        "provider": "browser",
        "voice": TTS_DEFAULT_VOICE,
        "server_tts_provider": False,
    },
    "edge_tts": {
        "id": "edge_tts",
        "label": "Edge TTS",
        "provider": "edge_tts",
        "voice": TTS_DEFAULT_VOICE,
        "server_tts_provider": True,
    },
    "volcengine_tts": {
        "id": "volcengine_tts",
        "label": "Volcengine TTS",
        "provider": "volcengine_tts",
        "voice": VOLCENGINE_TTS_DEFAULT_VOICE,
        "api_url": VOLCENGINE_TTS_DEFAULT_API_URL,
        "cluster": VOLCENGINE_TTS_DEFAULT_CLUSTER,
        "server_tts_provider": True,
    },
    "gpt_sovits": {
        "id": "gpt_sovits",
        "label": "GPT-SoVITS",
        "provider": "gpt_sovits",
        "voice": "default",
        "gpt_sovits_api_url": GPT_SOVITS_DEFAULT_API_URL,
        "server_tts_provider": True,
    },
}

ALLOWED_LLM_PRESETS = set(LLM_PRESETS)
ALLOWED_TTS_PROVIDERS = set(TTS_PRESETS)
ENV_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,63}$")
LIVE2D_CUSTOM_ID = "__custom_live2d__"
LIVE2D_MOTION_FAMILIES = {
    "idle": ("idle", "breath", "main"),
    "reaction": ("flick", "tap", "reaction", "pose"),
    "speech": ("talk", "speech", "tap", "flick"),
    "body": ("body", "tapbody", "flickbody"),
    "upbeat": ("happy", "joy", "smile", "flickup", "victory"),
    "soft_down": ("sad", "down", "flickdown", "soft"),
}


def _clean_text(value, max_len=200):
    text = " ".join(str(value or "").split()).strip()
    return text[:max_len]


def _clean_env_name(value, *, allow_empty=False):
    text = _clean_text(value, 64)
    if not text and allow_empty:
        return ""
    if not ENV_NAME_RE.match(text):
        raise DiagnosticError(
            code="config_switch_invalid_env",
            reason="Environment variable name is invalid.",
            solution="Use letters, numbers, and underscores, starting with a letter or underscore.",
            config_key="llm.api_key_env",
        )
    return text


def _normalize_http_url(raw, *, default_url, config_key):
    value = str(raw or "").strip() or str(default_url or "").strip()
    parsed_value, parts, error = parse_http_url(value, default_url=default_url)
    if error or parts is None:
        raise DiagnosticError(
            code="config_switch_invalid_url",
            reason=f"{config_key} must be a valid http(s) URL.",
            solution="Use a URL such as http://127.0.0.1:11434 or https://api.example.com/v1.",
            config_key=config_key,
            detail=parsed_value,
        )
    host = parts.hostname or ""
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    netloc = f"{host}:{parts.port}" if parts.port else host
    path = str(parts.path or "").rstrip("/")
    return urlunsplit((parts.scheme, netloc, path, "", ""))


def _safe_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value or "").strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    return bool(default)


def _safe_float(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _safe_int(value, default):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return int(default)


def _clamp_float(value, default, low, high):
    return max(float(low), min(float(high), _safe_float(value, default)))


def _read_json_object(path):
    file_path = Path(path)
    if not file_path.exists():
        return {}
    try:
        raw = file_path.read_text(encoding="utf-8-sig")
        if not raw.strip():
            return {}
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DiagnosticError(
            code="config_switch_local_json_invalid",
            reason="config.local.json is not valid JSON.",
            solution="Fix config.local.json before saving from the UI.",
            config_key="config.local.json",
            detail=str(exc),
        ) from exc
    if not isinstance(data, dict):
        raise DiagnosticError(
            code="config_switch_local_json_invalid",
            reason="config.local.json must contain a JSON object.",
            solution="Replace the root value with an object before saving from the UI.",
            config_key="config.local.json",
        )
    return data


def _atomic_write_text(path, text):
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = file_path.with_name(f"{file_path.name}.tmp")
    tmp_path.write_text(text, encoding="utf-8")
    tmp_path.replace(file_path)


def _write_json_object(path, data):
    _atomic_write_text(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def _ensure_section(config, name):
    section = config.get(name)
    if not isinstance(section, dict):
        section = {}
        config[name] = section
    return section


def _web_model_path_from_file(path, *, web_dir=None):
    root = (WEB_DIR if web_dir is None else Path(web_dir)).resolve()
    try:
        resolved = Path(path).resolve()
        rel = resolved.relative_to(root)
    except Exception:
        return ""
    rel_text = rel.as_posix()
    if not rel_text.lower().startswith("models/"):
        return ""
    return "/" + rel_text


def discover_live2d_model_presets(*, web_dir=None):
    root = WEB_DIR if web_dir is None else Path(web_dir)
    model_root = root / "models"
    if not model_root.exists() or not model_root.is_dir():
        return []
    items = []
    for path in sorted(model_root.rglob("*.model3.json"))[:80]:
        if not path.is_file():
            continue
        web_path = _web_model_path_from_file(path, web_dir=root)
        if not web_path:
            continue
        label_base = path.parent.name or path.stem.replace(".model3", "")
        label = f"{label_base} ({path.name})"
        items.append(
            {
                "id": web_path,
                "label": _clean_text(label, 120),
                "model_path": web_path,
            }
        )
    return items


def _normalize_live2d_model_path(value, *, web_dir=None):
    raw = str(value or "").strip().replace("\\", "/")
    if not raw:
        raise DiagnosticError(
            code="config_switch_live2d_empty",
            reason="Live2D model path cannot be empty.",
            solution="Choose a detected model or enter a /models/.../*.model3.json path.",
            config_key="model_path",
        )
    if "://" in raw or raw.startswith("//"):
        raise DiagnosticError(
            code="config_switch_live2d_url_not_allowed",
            reason="Live2D model path must be a local web model path.",
            solution="Put the model under web/models and use a path such as /models/hiyori/model.model3.json.",
            config_key="model_path",
        )
    if ".." in Path(raw).parts:
        raise DiagnosticError(
            code="config_switch_live2d_path_escape",
            reason="Live2D model path cannot contain parent-directory segments.",
            solution="Use a model file under web/models.",
            config_key="model_path",
        )

    root = (WEB_DIR if web_dir is None else Path(web_dir)).resolve()
    if raw.startswith("/models/"):
        candidate = root / raw.lstrip("/")
    elif raw.startswith("models/"):
        candidate = root / raw
    else:
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = root / raw

    try:
        resolved = candidate.resolve()
        rel = resolved.relative_to(root)
    except Exception as exc:
        raise DiagnosticError(
            code="config_switch_live2d_outside_web",
            reason="Live2D model path must stay inside the web directory.",
            solution="Put the model under web/models and select it from the list.",
            config_key="model_path",
            detail=str(candidate),
        ) from exc

    web_path = "/" + rel.as_posix()
    if not web_path.lower().startswith("/models/"):
        raise DiagnosticError(
            code="config_switch_live2d_outside_models",
            reason="Live2D model path must stay inside web/models.",
            solution="Move the model folder into web/models and select the model3.json file.",
            config_key="model_path",
            detail=web_path,
        )
    if not web_path.lower().endswith(".model3.json"):
        raise DiagnosticError(
            code="config_switch_live2d_not_model3",
            reason="Live2D model path must point to a .model3.json file.",
            solution="Select the model's .model3.json file.",
            config_key="model_path",
            detail=web_path,
        )
    if not resolved.exists() or not resolved.is_file():
        raise DiagnosticError(
            code="config_switch_live2d_not_found",
            reason="Live2D model file was not found.",
            solution="Confirm the model folder is under web/models and refresh the config panel.",
            config_key="model_path",
            detail=web_path,
        )
    return web_path


def _live2d_model_file_from_web_path(model_path, *, web_dir=None):
    web_path = _normalize_live2d_model_path(model_path, web_dir=web_dir)
    root = (WEB_DIR if web_dir is None else Path(web_dir)).resolve()
    return root / web_path.lstrip("/"), web_path


def _normalize_live2d_family_text(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _live2d_empty_compatibility_report(*warnings, missing_motion_families=None):
    return {
        "motion_groups": [],
        "expressions": [],
        "compatibility": {
            "warnings": [item for item in warnings if item],
            "missing_motion_families": list(missing_motion_families or []),
        },
    }


def inspect_live2d_model_compatibility(model_path, *, web_dir=None):
    try:
        model_file, _web_path = _live2d_model_file_from_web_path(model_path, web_dir=web_dir)
    except DiagnosticError:
        raise
    except Exception:
        return _live2d_empty_compatibility_report(
            "model_path_unavailable",
            missing_motion_families=LIVE2D_MOTION_FAMILIES.keys(),
        )

    try:
        data = json.loads(model_file.read_text(encoding="utf-8"))
    except Exception:
        return _live2d_empty_compatibility_report(
            "model_json_unreadable",
            missing_motion_families=LIVE2D_MOTION_FAMILIES.keys(),
        )

    if not isinstance(data, dict):
        return _live2d_empty_compatibility_report(
            "model_json_not_object",
            missing_motion_families=LIVE2D_MOTION_FAMILIES.keys(),
        )

    refs = data.get("FileReferences") if isinstance(data.get("FileReferences"), dict) else {}
    motions = refs.get("Motions") if isinstance(refs.get("Motions"), dict) else {}
    motion_groups = []
    normalized_group_names = []
    for name in sorted(motions, key=lambda item: str(item).lower()):
        entries = motions.get(name)
        count = len(entries) if isinstance(entries, list) else 0
        if count <= 0:
            continue
        text_name = _clean_text(name, 80)
        motion_groups.append({"name": text_name, "count": count})
        normalized_group_names.append(_normalize_live2d_family_text(text_name))

    expressions = []
    raw_expressions = refs.get("Expressions")
    if isinstance(raw_expressions, list):
        for item in raw_expressions[:80]:
            if not isinstance(item, dict):
                continue
            file_name = _clean_text(item.get("File"), 160)
            expression_name = _clean_text(item.get("Name"), 80) or _clean_text(Path(file_name).stem, 80)
            if expression_name or file_name:
                expressions.append({"name": expression_name, "file": file_name})

    missing = []
    for family, tokens in LIVE2D_MOTION_FAMILIES.items():
        normalized_tokens = [_normalize_live2d_family_text(token) for token in tokens]
        if not any(
            token and token in group_name
            for group_name in normalized_group_names
            for token in normalized_tokens
        ):
            missing.append(family)

    warnings = []
    if not motion_groups:
        warnings.append("no_motion_groups")
    if not expressions:
        warnings.append("no_expressions")
    if missing:
        warnings.append("missing_motion_families")

    return {
        "motion_groups": motion_groups,
        "expressions": expressions,
        "compatibility": {
            "warnings": warnings,
            "missing_motion_families": missing,
        },
    }


def _read_env_file_value(path, name):
    env_name = str(name or "").strip()
    if not env_name:
        return ""
    file_path = Path(path)
    if not file_path.exists():
        return ""
    pattern = re.compile(r"^\s*" + re.escape(env_name) + r"\s*=\s*(.*?)\s*$")
    try:
        lines = file_path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    except Exception:
        return ""
    for line in lines:
        match = pattern.match(line)
        if match:
            return match.group(1).strip().strip("'\"")
    return ""


def _write_env_value(path, name, value):
    if not str(name or "").strip() and not str(value or "").strip():
        return False
    env_name = _clean_env_name(name)
    secret = str(value or "").strip()
    if not secret:
        return False
    if "\n" in secret or "\r" in secret:
        raise DiagnosticError(
            code="config_switch_invalid_secret",
            reason="API key cannot contain line breaks.",
            solution="Paste a single-line API key.",
            config_key="llm.api_key",
        )
    file_path = Path(path)
    lines = []
    if file_path.exists():
        lines = file_path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    pattern = re.compile(r"^\s*" + re.escape(env_name) + r"\s*=")
    next_lines = []
    updated = False
    for line in lines:
        if pattern.match(line):
            next_lines.append(f"{env_name}={secret}")
            updated = True
        else:
            next_lines.append(line)
    if not updated:
        next_lines.append(f"{env_name}={secret}")
    _atomic_write_text(file_path, "\n".join(next_lines).rstrip() + "\n")
    os.environ[env_name] = secret
    return True


def _detect_llm_preset(llm_cfg):
    provider = str(llm_cfg.get("provider", "") or "").strip().lower()
    base_url = safe_url_display(llm_cfg.get("base_url", ""))
    model = str(llm_cfg.get("model", "") or "").strip()
    for preset_id, preset in LLM_PRESETS.items():
        if preset_id == "custom_openai_compatible":
            continue
        if provider != preset["provider"]:
            continue
        if safe_url_display(preset["base_url"]) != base_url:
            continue
        if preset_id == "ollama" or model == preset["model"]:
            return preset_id
    return "custom_openai_compatible" if provider in {"openai", "openai-compatible", "openai_compatible"} else "ollama"


def _build_llm_current(llm_cfg, env_path):
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    api_key_value, api_key_env = get_env_or_inline_value(cfg, "api_key", "api_key_env", OPENAI_DEFAULT_KEY_ENV)
    if not api_key_value and api_key_env:
        api_key_value = _read_env_file_value(env_path, api_key_env)
    return {
        "preset_id": _detect_llm_preset(cfg),
        "provider": str(cfg.get("provider", "") or "").strip().lower(),
        "base_url": safe_url_display(cfg.get("base_url", "")),
        "model": str(cfg.get("model", "") or "").strip(),
        "api_key_env": api_key_env,
        "api_key_configured": bool(api_key_value),
    }


def _build_tts_current(tts_cfg):
    cfg = tts_cfg if isinstance(tts_cfg, dict) else {}
    provider = str(cfg.get("provider", "browser") or "browser").strip().lower()
    if provider == "volcengine":
        provider = "volcengine_tts"
    stream_mode = str(cfg.get("stream_mode", "realtime") or "realtime").strip().lower()
    if stream_mode not in {"final_only", "realtime"}:
        stream_mode = "realtime"
    if provider == "gpt_sovits" and not bool(cfg.get("gpt_sovits_realtime_tts", False)):
        stream_mode = "final_only"
    return {
        "provider": provider if provider in ALLOWED_TTS_PROVIDERS else "browser",
        "voice": str(cfg.get("voice", "") or "").strip(),
        "gpt_sovits_api_url": safe_url_display(
            cfg.get("gpt_sovits_api_url", ""),
            default_url=GPT_SOVITS_DEFAULT_API_URL,
        ),
        "api_url": safe_url_display(
            cfg.get("api_url", ""),
            default_url=VOLCENGINE_TTS_DEFAULT_API_URL,
        ),
        "cluster": str(cfg.get("cluster", VOLCENGINE_TTS_DEFAULT_CLUSTER) or VOLCENGINE_TTS_DEFAULT_CLUSTER).strip(),
        "stream_mode": stream_mode,
        "gpt_sovits_timeout_sec": max(1, min(180, _safe_int(cfg.get("gpt_sovits_timeout_sec", 60), 60))),
        "allow_browser_fallback": bool(cfg.get("allow_browser_fallback", False)),
    }


def _build_live2d_current(config, live2d_models, *, web_dir=None):
    cfg = config if isinstance(config, dict) else {}
    model_cfg = cfg.get("model", {}) if isinstance(cfg.get("model", {}), dict) else {}
    model_path = str(cfg.get("model_path", "") or "").strip().replace("\\", "/")
    model_paths = {item.get("model_path") for item in live2d_models if isinstance(item, dict)}
    report = _live2d_empty_compatibility_report("model_path_unset")
    if model_path:
        try:
            report = inspect_live2d_model_compatibility(model_path, web_dir=web_dir)
        except DiagnosticError as exc:
            report = _live2d_empty_compatibility_report(
                exc.code or "model_path_invalid",
                missing_motion_families=LIVE2D_MOTION_FAMILIES.keys(),
            )
    return {
        "model_path": model_path,
        "preset_id": model_path if model_path in model_paths else LIVE2D_CUSTOM_ID,
        "scale": _clamp_float(model_cfg.get("scale", 1.0), 1.0, 0.1, 3.0),
        "x_ratio": _clamp_float(model_cfg.get("x_ratio", 0.26), 0.26, 0.0, 1.0),
        "y_ratio": _clamp_float(model_cfg.get("y_ratio", 0.96), 0.96, 0.0, 1.0),
        **report,
    }


def build_config_switch_payload(config, *, env_path=None, web_dir=None):
    cfg = config if isinstance(config, dict) else {}
    env_file = ENV_PATH if env_path is None else Path(env_path)
    live2d_models = discover_live2d_model_presets(web_dir=web_dir)
    return {
        "ok": True,
        "target": "config.local.json",
        "secrets": {
            "api_key_storage": ".env",
            "api_key_returned": False,
        },
        "llm_presets": list(LLM_PRESETS.values()),
        "tts_presets": list(TTS_PRESETS.values()),
        "live2d_models": live2d_models,
        "current": {
            "llm": _build_llm_current(cfg.get("llm", {}), env_file),
            "tts": _build_tts_current(cfg.get("tts", {})),
            "live2d": _build_live2d_current(cfg, live2d_models, web_dir=web_dir),
        },
    }


def _normalize_llm_update(raw):
    body = raw if isinstance(raw, dict) else {}
    preset_id = _clean_text(body.get("preset_id") or body.get("preset") or "custom_openai_compatible", 64)
    if preset_id not in ALLOWED_LLM_PRESETS:
        raise DiagnosticError(
            code="config_switch_invalid_llm_provider",
            reason=f"Unsupported LLM preset: {preset_id or '(empty)'}",
            solution="Use dashscope, openai, ollama, or custom_openai_compatible.",
            config_key="llm.provider",
        )
    preset = LLM_PRESETS[preset_id]
    provider = preset["provider"]
    base_url = _normalize_http_url(
        body.get("base_url") or preset["base_url"],
        default_url=preset["base_url"],
        config_key="llm.base_url",
    )
    model = _clean_text(body.get("model") or preset["model"], 120)
    if not model:
        raise DiagnosticError(
            code="config_switch_empty_model",
            reason="LLM model cannot be empty.",
            solution="Choose a model name supported by the selected provider.",
            config_key="llm.model",
        )
    api_key_env = _clean_env_name(
        body.get("api_key_env") or preset.get("api_key_env", ""),
        allow_empty=not bool(preset.get("requires_api_key")),
    )
    api_key = str(body.get("api_key", "") or "").strip()
    if "\n" in api_key or "\r" in api_key:
        raise DiagnosticError(
            code="config_switch_invalid_secret",
            reason="API key cannot contain line breaks.",
            solution="Paste a single-line API key.",
            config_key="llm.api_key",
        )
    if api_key and not api_key_env:
        raise DiagnosticError(
            code="config_switch_missing_env",
            reason="API key env name is required when saving an API key.",
            solution="Set llm.api_key_env before saving the key.",
            config_key="llm.api_key_env",
        )
    return {
        "preset_id": preset_id,
        "provider": provider,
        "base_url": base_url,
        "model": model,
        "api_key_env": api_key_env,
        "api_key": api_key,
    }


def _normalize_tts_update(raw):
    body = raw if isinstance(raw, dict) else {}
    provider = _clean_text(body.get("provider") or "browser", 64).lower()
    if provider == "volcengine":
        provider = "volcengine_tts"
    if provider not in ALLOWED_TTS_PROVIDERS:
        raise DiagnosticError(
            code="config_switch_invalid_tts_provider",
            reason=f"Unsupported TTS provider: {provider or '(empty)'}",
            solution="Use browser, edge_tts, gpt_sovits, or volcengine_tts.",
            config_key="tts.provider",
        )
    preset = TTS_PRESETS[provider]
    voice = _clean_text(body.get("voice") or preset.get("voice") or TTS_DEFAULT_VOICE, 120)
    stream_mode = _clean_text(body.get("stream_mode") or "realtime", 32).lower()
    if stream_mode not in {"final_only", "realtime"}:
        stream_mode = "realtime"
    update = {
        "provider": provider,
        "voice": voice,
        "voices": [voice] if voice else [],
        "stream_mode": stream_mode,
        "allow_browser_fallback": _safe_bool(body.get("allow_browser_fallback", False), False),
    }
    if provider == "gpt_sovits":
        update["gpt_sovits_api_url"] = _normalize_http_url(
            body.get("gpt_sovits_api_url") or preset["gpt_sovits_api_url"],
            default_url=preset["gpt_sovits_api_url"],
            config_key="tts.gpt_sovits_api_url",
        )
        update["gpt_sovits_realtime_tts"] = stream_mode == "realtime"
        update["gpt_sovits_timeout_sec"] = max(
            1,
            min(180, _safe_int(body.get("gpt_sovits_timeout_sec"), 60)),
        )
    if provider == "volcengine_tts":
        update["api_url"] = _normalize_http_url(
            body.get("api_url") or preset["api_url"],
            default_url=preset["api_url"],
            config_key="tts.api_url",
        )
        update["cluster"] = _clean_text(body.get("cluster") or preset.get("cluster"), 80)
        update["app_id_env"] = VOLCENGINE_APP_ID_ENV
        update["access_token_env"] = VOLCENGINE_ACCESS_TOKEN_ENV
        update["secret_key_env"] = VOLCENGINE_SECRET_KEY_ENV
    return update


def _normalize_live2d_update(raw, *, web_dir=None):
    body = raw if isinstance(raw, dict) else {}
    return {
        "model_path": _normalize_live2d_model_path(body.get("model_path"), web_dir=web_dir),
        "scale": _clamp_float(body.get("scale"), 1.0, 0.1, 3.0),
        "x_ratio": _clamp_float(body.get("x_ratio"), 0.26, 0.0, 1.0),
        "y_ratio": _clamp_float(body.get("y_ratio"), 0.96, 0.0, 1.0),
    }


def _normalize_first_run_llm_update(raw):
    body = raw.get("llm", raw) if isinstance(raw, dict) else {}
    provider = _clean_text(body.get("provider") or "openai-compatible", 64).lower()
    if provider == "openai_compatible":
        provider = "openai-compatible"
    if provider not in FIRST_RUN_ALLOWED_PROVIDERS:
        raise DiagnosticError(
            code="first_run_invalid_llm_provider",
            reason=f"Unsupported LLM provider: {provider or '(empty)'}.",
            solution="Use openai-compatible, openai, or ollama.",
            config_key="llm.provider",
        )

    default_url = OLLAMA_DEFAULT_BASE_URL if provider == "ollama" else FIRST_RUN_DEFAULT_BASE_URL
    default_model = OLLAMA_DEFAULT_MODEL if provider == "ollama" else OPENAI_DEFAULT_MODEL
    base_url = _normalize_http_url(
        body.get("base_url") or default_url,
        default_url=default_url,
        config_key="llm.base_url",
    )
    model = _clean_text(body.get("model") or default_model, 120)
    if not model:
        raise DiagnosticError(
            code="first_run_empty_model",
            reason="LLM model cannot be empty.",
            solution="Choose a model name supported by your provider.",
            config_key="llm.model",
        )

    requires_key = provider in {"openai", "openai-compatible"}
    api_key_env = _clean_env_name(
        body.get("api_key_env") or ("" if provider == "ollama" else FIRST_RUN_DEFAULT_KEY_ENV),
        allow_empty=not requires_key,
    )
    api_key = str(body.get("api_key", "") or "").strip()
    if "\n" in api_key or "\r" in api_key:
        raise DiagnosticError(
            code="first_run_invalid_secret",
            reason="API key cannot contain line breaks.",
            solution="Paste a single-line API key.",
            config_key="llm.api_key",
        )
    if api_key and not api_key_env:
        raise DiagnosticError(
            code="first_run_missing_env",
            reason="API key env name is required when saving an API key.",
            solution="Set llm.api_key_env before saving the key.",
            config_key="llm.api_key_env",
        )

    return {
        "provider": provider,
        "base_url": base_url,
        "model": model,
        "api_key_env": api_key_env,
        "api_key": api_key,
        "requires_api_key": requires_key,
    }


def save_first_run_llm_config(body, *, local_config_path=None, env_path=None):
    llm_update = _normalize_first_run_llm_update(body)
    local_path = LOCAL_CONFIG_PATH if local_config_path is None else Path(local_config_path)
    env_file = ENV_PATH if env_path is None else Path(env_path)
    existing_key = ""
    if llm_update["api_key_env"]:
        existing_key = (
            str(os.environ.get(llm_update["api_key_env"], "") or "").strip()
            or _read_env_file_value(env_file, llm_update["api_key_env"])
        )
    if llm_update["requires_api_key"] and not llm_update["api_key"] and not existing_key:
        raise DiagnosticError(
            code="first_run_missing_api_key",
            reason="API key is missing for the selected remote-compatible provider.",
            solution="Paste an API key, or choose Ollama for a local model that does not require one.",
            config_key="llm.api_key",
        )

    local_config = _read_json_object(local_path)
    local_config["onboarding_completed"] = True
    llm = _ensure_section(local_config, "llm")
    llm["provider"] = llm_update["provider"]
    llm["base_url"] = llm_update["base_url"]
    llm["model"] = llm_update["model"]
    llm["api_key"] = ""
    if llm_update["api_key_env"]:
        llm["api_key_env"] = llm_update["api_key_env"]
    elif "api_key_env" in llm:
        llm["api_key_env"] = ""

    _write_json_object(local_path, local_config)
    key_saved = _write_env_value(env_file, llm_update["api_key_env"], llm_update["api_key"])

    return {
        "ok": True,
        "saved": {
            "local_config": str(Path(local_path).name),
            "api_key_saved": bool(key_saved),
            "api_key_returned": False,
            "llm": {
                "provider": llm_update["provider"],
                "base_url": safe_url_display(llm_update["base_url"]),
                "model": llm_update["model"],
                "api_key_env": llm_update["api_key_env"],
                "api_key_configured": bool(llm_update["api_key"] or existing_key),
            },
        },
    }


def build_config_switch_test_config(body, base_config, *, web_dir=None):
    payload = body if isinstance(body, dict) else {}
    config = copy.deepcopy(base_config if isinstance(base_config, dict) else {})
    if isinstance(payload.get("llm"), dict):
        llm_update = _normalize_llm_update(payload.get("llm", {}))
        llm = _ensure_section(config, "llm")
        llm["provider"] = llm_update["provider"]
        llm["base_url"] = llm_update["base_url"]
        llm["model"] = llm_update["model"]
        llm["api_key_env"] = llm_update["api_key_env"]
        llm["api_key"] = llm_update["api_key"]
    if isinstance(payload.get("tts"), dict):
        tts_update = _normalize_tts_update(payload.get("tts", {}))
        tts = _ensure_section(config, "tts")
        for key, value in tts_update.items():
            tts[key] = value
    if isinstance(payload.get("live2d"), dict):
        live2d_update = _normalize_live2d_update(payload.get("live2d", {}), web_dir=web_dir)
        config["model_path"] = live2d_update["model_path"]
        model = _ensure_section(config, "model")
        model["scale"] = live2d_update["scale"]
        model["x_ratio"] = live2d_update["x_ratio"]
        model["y_ratio"] = live2d_update["y_ratio"]
    return config


def validate_config_switch_live2d_update(raw, *, web_dir=None):
    update = _normalize_live2d_update(raw, web_dir=web_dir)
    update.update(inspect_live2d_model_compatibility(update["model_path"], web_dir=web_dir))
    return {
        "ok": True,
        "live2d": update,
        "reload_required": True,
    }


def save_config_switch_update(body, *, local_config_path=None, env_path=None, web_dir=None):
    payload = body if isinstance(body, dict) else {}
    llm_update = _normalize_llm_update(payload.get("llm", {}))
    tts_update = _normalize_tts_update(payload.get("tts", {}))
    live2d_update = (
        _normalize_live2d_update(payload.get("live2d", {}), web_dir=web_dir)
        if isinstance(payload.get("live2d"), dict)
        else None
    )
    local_path = LOCAL_CONFIG_PATH if local_config_path is None else Path(local_config_path)
    env_file = ENV_PATH if env_path is None else Path(env_path)
    local_config = _read_json_object(local_path)

    llm = _ensure_section(local_config, "llm")
    llm["provider"] = llm_update["provider"]
    llm["base_url"] = llm_update["base_url"]
    llm["model"] = llm_update["model"]
    llm["api_key"] = ""
    if llm_update["api_key_env"]:
        llm["api_key_env"] = llm_update["api_key_env"]
    elif "api_key_env" in llm:
        llm["api_key_env"] = ""

    tts = _ensure_section(local_config, "tts")
    for key, value in tts_update.items():
        tts[key] = value
    if live2d_update:
        local_config["model_path"] = live2d_update["model_path"]
        model = _ensure_section(local_config, "model")
        model["scale"] = live2d_update["scale"]
        model["x_ratio"] = live2d_update["x_ratio"]
        model["y_ratio"] = live2d_update["y_ratio"]

    _write_json_object(local_path, local_config)
    key_saved = _write_env_value(env_file, llm_update["api_key_env"], llm_update["api_key"])

    return {
        "ok": True,
        "saved": {
            "local_config": str(Path(local_path).name),
            "api_key_saved": bool(key_saved),
            "llm": {
                "preset_id": llm_update["preset_id"],
                "provider": llm_update["provider"],
                "base_url": safe_url_display(llm_update["base_url"]),
                "model": llm_update["model"],
                "api_key_env": llm_update["api_key_env"],
            },
            "tts": {
                "provider": tts_update["provider"],
                "voice": tts_update["voice"],
                "gpt_sovits_api_url": safe_url_display(
                    tts_update.get("gpt_sovits_api_url", ""),
                    default_url=GPT_SOVITS_DEFAULT_API_URL,
                ),
                "allow_browser_fallback": bool(tts_update.get("allow_browser_fallback", False)),
            },
            "live2d": (
                {
                    "model_path": live2d_update["model_path"],
                    "scale": live2d_update["scale"],
                    "x_ratio": live2d_update["x_ratio"],
                    "y_ratio": live2d_update["y_ratio"],
                    **inspect_live2d_model_compatibility(live2d_update["model_path"], web_dir=web_dir),
                }
                if live2d_update
                else None
            ),
        },
    }
