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
    return {
        "provider": provider if provider in ALLOWED_TTS_PROVIDERS else "browser",
        "voice": str(cfg.get("voice", "") or "").strip(),
        "gpt_sovits_api_url": safe_url_display(
            cfg.get("gpt_sovits_api_url", ""),
            default_url=GPT_SOVITS_DEFAULT_API_URL,
        ),
        "allow_browser_fallback": bool(cfg.get("allow_browser_fallback", False)),
    }


def build_config_switch_payload(config, *, env_path=None):
    cfg = config if isinstance(config, dict) else {}
    env_file = ENV_PATH if env_path is None else Path(env_path)
    return {
        "ok": True,
        "target": "config.local.json",
        "secrets": {
            "api_key_storage": ".env",
            "api_key_returned": False,
        },
        "llm_presets": list(LLM_PRESETS.values()),
        "tts_presets": list(TTS_PRESETS.values()),
        "current": {
            "llm": _build_llm_current(cfg.get("llm", {}), env_file),
            "tts": _build_tts_current(cfg.get("tts", {})),
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
    if provider not in ALLOWED_TTS_PROVIDERS:
        raise DiagnosticError(
            code="config_switch_invalid_tts_provider",
            reason=f"Unsupported TTS provider: {provider or '(empty)'}",
            solution="Use browser, edge_tts, or gpt_sovits.",
            config_key="tts.provider",
        )
    preset = TTS_PRESETS[provider]
    voice = _clean_text(body.get("voice") or preset.get("voice") or TTS_DEFAULT_VOICE, 120)
    update = {
        "provider": provider,
        "voice": voice,
        "voices": [voice] if voice else [],
        "allow_browser_fallback": _safe_bool(body.get("allow_browser_fallback", False), False),
    }
    if provider == "gpt_sovits":
        update["gpt_sovits_api_url"] = _normalize_http_url(
            body.get("gpt_sovits_api_url") or preset["gpt_sovits_api_url"],
            default_url=preset["gpt_sovits_api_url"],
            config_key="tts.gpt_sovits_api_url",
        )
    return update


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


def save_config_switch_update(body, *, local_config_path=None, env_path=None):
    payload = body if isinstance(body, dict) else {}
    llm_update = _normalize_llm_update(payload.get("llm", {}))
    tts_update = _normalize_tts_update(payload.get("tts", {}))
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
        },
    }
