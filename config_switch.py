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

REPLY_LANGUAGES = [
    {"id": "zh", "label": "中文", "description": "Default Simplified Chinese character replies."},
    {"id": "en", "label": "English", "description": "Force English character replies."},
    {"id": "ja", "label": "日本語", "description": "Force Japanese character replies."},
    {"id": "ko", "label": "한국어", "description": "Force Korean character replies."},
    {"id": "auto", "label": "Auto", "description": "Follow the user's main input language."},
]

ALLOWED_REPLY_LANGUAGES = {item["id"] for item in REPLY_LANGUAGES}
VOICE_BY_REPLY_LANGUAGE = {
    "zh": "zh-CN-XiaoxiaoNeural",
    "en": "en-US-AriaNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
}
GPT_SOVITS_LANG_BY_REPLY_LANGUAGE = {
    "zh": "zh",
    "en": "en",
    "ja": "ja",
    "ko": "ko",
    "auto": "zh",
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


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _safe_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return int(default)


def _normalize_reply_language(value, default="zh"):
    raw = str(value or default or "zh").strip().lower()
    aliases = {
        "follow": "auto",
        "match": "auto",
        "cn": "zh",
        "zh-cn": "zh",
        "zh_cn": "zh",
        "chinese": "zh",
        "english": "en",
        "jp": "ja",
        "japanese": "ja",
        "kr": "ko",
        "korean": "ko",
    }
    lang = aliases.get(raw, raw)
    if lang not in ALLOWED_REPLY_LANGUAGES:
        lang = default if default in ALLOWED_REPLY_LANGUAGES else "zh"
    return lang


def _reply_language_from_payload(payload, current="zh"):
    if not isinstance(payload, dict):
        return _normalize_reply_language(current)
    if "assistant_reply_language" in payload:
        return _normalize_reply_language(payload.get("assistant_reply_language"), current)
    if "reply_language" in payload:
        return _normalize_reply_language(payload.get("reply_language"), current)
    section = payload.get("language")
    if isinstance(section, dict) and "assistant_reply_language" in section:
        return _normalize_reply_language(section.get("assistant_reply_language"), current)
    return _normalize_reply_language(current)


def _has_reply_language_update(payload):
    if not isinstance(payload, dict):
        return False
    return (
        "assistant_reply_language" in payload
        or "reply_language" in payload
        or (
            isinstance(payload.get("language"), dict)
            and "assistant_reply_language" in payload.get("language", {})
        )
    )


def _recommended_voice_for_reply_language(lang):
    return VOICE_BY_REPLY_LANGUAGE.get(_normalize_reply_language(lang), VOICE_BY_REPLY_LANGUAGE["zh"])


def _gpt_sovits_lang_for_reply_language(lang):
    return GPT_SOVITS_LANG_BY_REPLY_LANGUAGE.get(_normalize_reply_language(lang), "zh")


def _apply_tts_language_defaults(tts, reply_language):
    if not isinstance(tts, dict):
        return
    if not str(tts.get("provider", "") or "").strip():
        tts["provider"] = "browser"
    if tts.get("auto_voice_by_reply_language", True) is False:
        tts["gpt_sovits_text_lang"] = _gpt_sovits_lang_for_reply_language(reply_language)
        return
    provider = str(tts.get("provider", "browser") or "browser").strip().lower()
    if provider in {"browser", "edge_tts"}:
        voice = _recommended_voice_for_reply_language(reply_language)
        tts["voice"] = voice
        tts["voices"] = [voice]
    tts["gpt_sovits_text_lang"] = _gpt_sovits_lang_for_reply_language(reply_language)


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
        "auto_voice_by_reply_language": bool(cfg.get("auto_voice_by_reply_language", True)),
        "gpt_sovits_text_lang": str(cfg.get("gpt_sovits_text_lang", "zh") or "zh").strip().lower(),
        "gpt_sovits_api_url": safe_url_display(
            cfg.get("gpt_sovits_api_url", ""),
            default_url=GPT_SOVITS_DEFAULT_API_URL,
        ),
        "allow_browser_fallback": bool(cfg.get("allow_browser_fallback", False)),
    }


def _build_stickers_current(stickers_cfg):
    cfg = stickers_cfg if isinstance(stickers_cfg, dict) else {}
    return {
        "assistant_enabled": bool(cfg.get("assistant_enabled", True)),
        "assistant_chance": max(0.0, min(1.0, _safe_float(cfg.get("assistant_chance", 0.18), 0.18))),
        "assistant_cooldown_ms": max(10000, min(30 * 60 * 1000, _safe_int(cfg.get("assistant_cooldown_ms", 60000), 60000))),
    }


def build_config_switch_payload(config, *, env_path=None):
    cfg = config if isinstance(config, dict) else {}
    env_file = ENV_PATH if env_path is None else Path(env_path)
    reply_language = _normalize_reply_language(cfg.get("assistant_reply_language", "zh"))
    return {
        "ok": True,
        "target": "config.local.json",
        "secrets": {
            "api_key_storage": ".env",
            "api_key_returned": False,
        },
        "llm_presets": list(LLM_PRESETS.values()),
        "tts_presets": list(TTS_PRESETS.values()),
        "reply_languages": REPLY_LANGUAGES,
        "voice_by_reply_language": VOICE_BY_REPLY_LANGUAGE,
        "current": {
            "assistant_reply_language": reply_language,
            "llm": _build_llm_current(cfg.get("llm", {}), env_file),
            "tts": _build_tts_current(cfg.get("tts", {})),
            "stickers": _build_stickers_current(cfg.get("stickers", {})),
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


def _normalize_tts_update(raw, existing=None):
    body = raw if isinstance(raw, dict) else {}
    current = existing if isinstance(existing, dict) else {}
    provider = _clean_text(body.get("provider") or current.get("provider") or "browser", 64).lower()
    if provider not in ALLOWED_TTS_PROVIDERS:
        raise DiagnosticError(
            code="config_switch_invalid_tts_provider",
            reason=f"Unsupported TTS provider: {provider or '(empty)'}",
            solution="Use browser, edge_tts, or gpt_sovits.",
            config_key="tts.provider",
        )
    preset = TTS_PRESETS[provider]
    voice = _clean_text(body.get("voice") or current.get("voice") or preset.get("voice") or TTS_DEFAULT_VOICE, 120)
    update = {
        "provider": provider,
        "voice": voice,
        "voices": [voice] if voice else [],
        "auto_voice_by_reply_language": _safe_bool(
            body.get("auto_voice_by_reply_language", current.get("auto_voice_by_reply_language", True)),
            True,
        ),
        "gpt_sovits_text_lang": _clean_text(
            body.get("gpt_sovits_text_lang") or current.get("gpt_sovits_text_lang") or "zh",
            8,
        ).lower(),
        "allow_browser_fallback": _safe_bool(
            body.get("allow_browser_fallback", current.get("allow_browser_fallback", False)),
            False,
        ),
    }
    if provider == "gpt_sovits":
        update["gpt_sovits_api_url"] = _normalize_http_url(
            body.get("gpt_sovits_api_url") or current.get("gpt_sovits_api_url") or preset["gpt_sovits_api_url"],
            default_url=preset["gpt_sovits_api_url"],
            config_key="tts.gpt_sovits_api_url",
        )
    return update


def _normalize_sticker_update(raw, existing=None):
    body = raw if isinstance(raw, dict) else {}
    current = existing if isinstance(existing, dict) else {}
    return {
        "assistant_enabled": _safe_bool(
            body.get("assistant_enabled", body.get("assistantEnabled", current.get("assistant_enabled", True))),
            True,
        ),
        "assistant_chance": max(
            0.0,
            min(1.0, _safe_float(body.get("assistant_chance", current.get("assistant_chance", 0.18)), 0.18)),
        ),
        "assistant_cooldown_ms": max(
            10000,
            min(
                30 * 60 * 1000,
                _safe_int(body.get("assistant_cooldown_ms", current.get("assistant_cooldown_ms", 60000)), 60000),
            ),
        ),
    }


def save_config_switch_update(body, *, local_config_path=None, env_path=None):
    payload = body if isinstance(body, dict) else {}
    local_path = LOCAL_CONFIG_PATH if local_config_path is None else Path(local_config_path)
    env_file = ENV_PATH if env_path is None else Path(env_path)
    local_config = _read_json_object(local_path)

    llm_update = None
    tts_update = None
    sticker_update = None
    key_saved = False

    current_reply_language = _normalize_reply_language(local_config.get("assistant_reply_language", "zh"))
    reply_language = _reply_language_from_payload(payload, current_reply_language)
    if _has_reply_language_update(payload):
        local_config["assistant_reply_language"] = reply_language

    if "llm" in payload:
        llm_update = _normalize_llm_update(payload.get("llm", {}))
        llm = _ensure_section(local_config, "llm")
        llm["provider"] = llm_update["provider"]
        llm["base_url"] = llm_update["base_url"]
        llm["model"] = llm_update["model"]
        llm["api_key"] = ""
        if llm_update["api_key_env"]:
            llm["api_key_env"] = llm_update["api_key_env"]
        elif "api_key_env" in llm:
            llm["api_key_env"] = ""
        key_saved = _write_env_value(env_file, llm_update["api_key_env"], llm_update["api_key"])

    if "tts" in payload:
        tts = _ensure_section(local_config, "tts")
        tts_update = _normalize_tts_update(payload.get("tts", {}), tts)
        for key, value in tts_update.items():
            tts[key] = value

    if _has_reply_language_update(payload) or "tts" in payload:
        tts = _ensure_section(local_config, "tts")
        if "auto_voice_by_reply_language" not in tts:
            tts["auto_voice_by_reply_language"] = True
        _apply_tts_language_defaults(tts, reply_language)

    if "stickers" in payload:
        stickers = _ensure_section(local_config, "stickers")
        sticker_update = _normalize_sticker_update(payload.get("stickers", {}), stickers)
        for key, value in sticker_update.items():
            stickers[key] = value

    _write_json_object(local_path, local_config)

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
            } if llm_update else {},
            "assistant_reply_language": reply_language,
            "tts": {
                "provider": _ensure_section(local_config, "tts").get("provider", "browser"),
                "voice": _ensure_section(local_config, "tts").get("voice", ""),
                "auto_voice_by_reply_language": bool(
                    _ensure_section(local_config, "tts").get("auto_voice_by_reply_language", True)
                ),
                "gpt_sovits_text_lang": _ensure_section(local_config, "tts").get("gpt_sovits_text_lang", "zh"),
                "gpt_sovits_api_url": safe_url_display(
                    _ensure_section(local_config, "tts").get("gpt_sovits_api_url", ""),
                    default_url=GPT_SOVITS_DEFAULT_API_URL,
                ),
                "allow_browser_fallback": bool(_ensure_section(local_config, "tts").get("allow_browser_fallback", False)),
            },
            "stickers": sticker_update or _build_stickers_current(local_config.get("stickers", {})),
        },
    }
