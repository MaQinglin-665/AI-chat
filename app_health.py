import importlib.util
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

from character_runtime import (
    evaluate_backend_entry_guard,
    preview_backend_entry_noop_adapter,
    preview_backend_entry_request,
)
from config import (
    GPT_SOVITS_DEFAULT_API_URL,
    OLLAMA_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
    SERVER_TTS_PROVIDERS,
    TTS_DEFAULT_PROVIDER,
    VOLCENGINE_ACCESS_TOKEN_ENV,
    VOLCENGINE_APP_ID_ENV,
    VOSK_MODEL_LARGE_ROOT,
    VOSK_MODEL_ROOT,
)


OPENAI_COMPATIBLE_PROVIDERS = {"openai", "openai-compatible", "openai_compatible"}
SUPPORTED_LLM_PROVIDERS = OPENAI_COMPATIBLE_PROVIDERS | {"ollama"}


def parse_bool_flag(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value or "").strip().lower()
    if not text:
        return bool(default)
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    return bool(default)


def safe_dict(value):
    return value if isinstance(value, dict) else {}


def get_env_or_inline_value(config, inline_key, env_key, default_env=""):
    cfg = safe_dict(config)
    inline = str(cfg.get(inline_key, "") or "").strip()
    env_name = str(cfg.get(env_key, default_env) or default_env).strip()
    env_value = str(os.environ.get(env_name, "") or "").strip() if env_name else ""
    return inline or env_value, env_name


def parse_http_url(raw, default_url=""):
    value = str(raw or "").strip() or str(default_url or "").strip()
    if not value:
        return "", None, "missing_url"
    try:
        parts = urlsplit(value)
        # Accessing .port validates malformed port text.
        _ = parts.port
    except ValueError:
        return value, None, "invalid_url"
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return value, None, "invalid_url"
    return value, parts, ""


def safe_url_display(raw, default_url=""):
    value, parts, error = parse_http_url(raw, default_url=default_url)
    if error or parts is None:
        return ""
    try:
        port = f":{parts.port}" if parts.port else ""
    except ValueError:
        return ""
    path = str(parts.path or "").rstrip("/")
    display = f"{parts.scheme}://{parts.hostname}{port}{path}"
    return display[:180]


def is_loopback_http_url(raw, default_url=""):
    _, parts, error = parse_http_url(raw, default_url=default_url)
    if error or parts is None:
        return False
    host = str(parts.hostname or "").strip().lower()
    return host in {"localhost", "::1"} or host == "127.0.0.1" or host.startswith("127.")


def resolve_llm_provider_for_health(llm_cfg):
    cfg = safe_dict(llm_cfg)
    provider = str(cfg.get("provider", "") or "").strip().lower()
    if provider:
        return provider
    base_url = str(cfg.get("base_url", "") or "").strip().lower()
    return "ollama" if "11434" in base_url or "ollama" in base_url else "openai-compatible"


def summarize_messages_severity(errors, warnings):
    if errors:
        return "error"
    if warnings:
        return "warning"
    return "ok"


def build_server_health_summary(config, api_token_env_default):
    cfg = safe_dict(config)
    server_cfg = safe_dict(cfg.get("server"))
    host = str(server_cfg.get("host", "") or "").strip()
    port_value = server_cfg.get("port", "")
    errors = []
    warnings = []
    actions = []

    if not host:
        errors.append("server.host is empty.")
        actions.append("Set server.host to 127.0.0.1 for local desktop use.")

    try:
        port = int(port_value)
        if port < 0 or port > 65535:
            raise ValueError("port outside 0-65535")
    except (TypeError, ValueError):
        port = None
        errors.append("server.port is not a valid port.")
        actions.append("Set server.port to an integer from 0 to 65535, for example 8123.")

    require_token = parse_bool_flag(server_cfg.get("require_api_token", False), False)
    token_env = str(
        server_cfg.get("api_token_env", api_token_env_default) or api_token_env_default
    ).strip() or api_token_env_default
    token_value = str(server_cfg.get("api_token", "") or "").strip() or str(
        os.environ.get(token_env, "") or ""
    ).strip()
    if require_token and not token_value:
        errors.append("server.require_api_token is true but no token is configured.")
        actions.append(f"Set env {token_env}, or disable server.require_api_token only for local dev.")

    return {
        "ok": not errors,
        "severity": summarize_messages_severity(errors, warnings),
        "host": host,
        "port": port,
        "require_api_token": bool(require_token),
        "api_token_configured": bool(token_value),
        "messages": errors + warnings,
        "actions": actions,
    }


def build_llm_health_summary(config):
    cfg = safe_dict(config)
    llm_cfg = safe_dict(cfg.get("llm"))
    provider = resolve_llm_provider_for_health(llm_cfg)
    model = str(llm_cfg.get("model", "") or "").strip()
    default_base_url = OLLAMA_DEFAULT_BASE_URL if provider == "ollama" else OPENAI_DEFAULT_BASE_URL
    raw_base_url = str(llm_cfg.get("base_url", "") or "").strip()
    base_url, _, url_error = parse_http_url(raw_base_url, default_url=default_base_url)
    api_key_value, api_key_env = get_env_or_inline_value(
        llm_cfg,
        "api_key",
        "api_key_env",
        OPENAI_DEFAULT_KEY_ENV,
    )
    errors = []
    warnings = []
    actions = []

    if provider not in SUPPORTED_LLM_PROVIDERS:
        errors.append(f"Unsupported llm.provider: {provider or '(empty)'}.")
        actions.append("Use openai-compatible, openai, openai_compatible, or ollama.")
    if not model:
        errors.append("llm.model is empty.")
        actions.append("Set llm.model to an available model name.")
    if url_error:
        errors.append("llm.base_url is missing or invalid.")
        actions.append("Set llm.base_url to an http(s) endpoint, for example http://127.0.0.1:11434.")
    if provider in OPENAI_COMPATIBLE_PROVIDERS and not is_loopback_http_url(base_url) and not api_key_value:
        errors.append("LLM API key is missing for the configured remote provider.")
        actions.append(f"Set env {api_key_env} or use a local Ollama provider.")

    if provider == "ollama":
        actions.append("Make sure Ollama is running and the configured model has been pulled.")

    return {
        "ok": not errors,
        "severity": summarize_messages_severity(errors, warnings),
        "provider": provider,
        "model": model,
        "base_url_configured": bool(raw_base_url),
        "base_url_display": safe_url_display(raw_base_url, default_url=default_base_url),
        "api_key_env": api_key_env,
        "api_key_configured": bool(api_key_value),
        "network_checked": False,
        "messages": errors + warnings,
        "actions": actions,
    }


def build_tts_health_summary(config):
    cfg = safe_dict(config)
    tts_cfg = safe_dict(cfg.get("tts"))
    provider = str(tts_cfg.get("provider", TTS_DEFAULT_PROVIDER) or TTS_DEFAULT_PROVIDER).strip().lower()
    errors = []
    warnings = []
    actions = []
    details = {
        "provider": provider,
        "server_tts_provider": provider in SERVER_TTS_PROVIDERS,
        "browser_fallback_enabled": parse_bool_flag(tts_cfg.get("allow_browser_fallback", False), False),
        "network_checked": False,
    }

    if provider == "browser":
        details["mode"] = "frontend_browser"
        return {
            "ok": True,
            "severity": "ok",
            **details,
            "messages": [],
            "actions": [],
        }

    if provider not in SERVER_TTS_PROVIDERS:
        errors.append(f"Unsupported tts.provider: {provider or '(empty)'}.")
        actions.append("Use browser for first run, or edge_tts, gpt_sovits, or volcengine_tts for server TTS.")
    elif provider == "edge_tts":
        installed = importlib.util.find_spec("edge_tts") is not None
        details["edge_tts_installed"] = installed
        if not installed:
            errors.append("edge-tts is not installed.")
            actions.append("Run python -m pip install -r requirements.txt.")
    elif provider == "gpt_sovits":
        raw_url = str(tts_cfg.get("gpt_sovits_api_url", "") or "").strip()
        _, _, url_error = parse_http_url(raw_url, default_url=GPT_SOVITS_DEFAULT_API_URL)
        details["api_url_configured"] = bool(raw_url)
        details["api_url_display"] = safe_url_display(raw_url, default_url=GPT_SOVITS_DEFAULT_API_URL)
        if url_error:
            errors.append("tts.gpt_sovits_api_url is missing or invalid.")
            actions.append("Set tts.gpt_sovits_api_url to the running GPT-SoVITS /tts endpoint.")
        else:
            actions.append("Make sure GPT-SoVITS is running before using /api/tts.")
    elif provider in {"volcengine_tts", "volcengine"}:
        app_id_env = str(
            tts_cfg.get("app_id_env", VOLCENGINE_APP_ID_ENV) or VOLCENGINE_APP_ID_ENV
        ).strip()
        app_id = str(tts_cfg.get("app_id", "") or tts_cfg.get("appid", "") or "").strip()
        if not app_id and app_id_env:
            app_id = str(os.environ.get(app_id_env, "") or "").strip()
        access_token = str(tts_cfg.get("access_token", "") or tts_cfg.get("token", "") or "").strip()
        access_token_env = str(
            tts_cfg.get("access_token_env", VOLCENGINE_ACCESS_TOKEN_ENV)
            or VOLCENGINE_ACCESS_TOKEN_ENV
        ).strip()
        if not access_token and access_token_env:
            access_token = str(os.environ.get(access_token_env, "") or "").strip()
        details["app_id_configured"] = bool(app_id)
        details["access_token_configured"] = bool(access_token)
        details["app_id_env"] = app_id_env
        details["access_token_env"] = access_token_env
        if not app_id:
            errors.append("Volcengine TTS app_id is missing.")
            actions.append(f"Set tts.app_id or env {app_id_env}.")
        if not access_token:
            errors.append("Volcengine TTS access_token is missing.")
            actions.append(f"Set tts.access_token or env {access_token_env}.")

    return {
        "ok": not errors,
        "severity": summarize_messages_severity(errors, warnings),
        **details,
        "messages": errors + warnings,
        "actions": actions,
    }


def resolve_vosk_model_root_for_health():
    env_path = str(os.environ.get("VOSK_MODEL_PATH", "") or "").strip()
    if env_path:
        candidate = Path(env_path).expanduser()
        if candidate.exists():
            return candidate
    if VOSK_MODEL_LARGE_ROOT.exists():
        return VOSK_MODEL_LARGE_ROOT
    return VOSK_MODEL_ROOT


def build_asr_health_summary(config):
    cfg = safe_dict(config)
    asr_cfg = safe_dict(cfg.get("asr"))
    errors = []
    warnings = []
    actions = []
    vosk_installed = importlib.util.find_spec("vosk") is not None
    model_root = resolve_vosk_model_root_for_health()
    model_found = model_root.exists()

    if not vosk_installed:
        warnings.append("vosk is not installed; /api/asr_pcm transcription will fail.")
        actions.append("Run python -m pip install -r requirements.txt.")
    if not model_found:
        warnings.append("Vosk model directory was not found.")
        actions.append("Download a Vosk Chinese model under models/vosk, or set VOSK_MODEL_PATH.")

    wake_words = asr_cfg.get("wake_words", [])
    wake_word_count = len(wake_words) if isinstance(wake_words, list) else 0
    return {
        "ok": not errors and not warnings,
        "severity": summarize_messages_severity(errors, warnings),
        "vosk_installed": bool(vosk_installed),
        "vosk_model_found": bool(model_found),
        "vosk_model_path": str(model_root),
        "wake_word_enabled": parse_bool_flag(asr_cfg.get("wake_word_enabled", True), True),
        "wake_word_count": wake_word_count,
        "messages": errors + warnings,
        "actions": actions,
    }


def build_readiness_summary(checks):
    blockers = []
    warnings = []
    actions = []
    if not isinstance(checks, dict):
        return {
            "ok": False,
            "status": "degraded",
            "blocking_checks": ["checks"],
            "warning_checks": [],
            "actions": [],
        }
    for name, check in checks.items():
        if not isinstance(check, dict):
            continue
        severity = str(check.get("severity", "") or "").strip().lower()
        ok = bool(check.get("ok", False))
        if not ok and severity != "warning":
            blockers.append(str(name))
        elif not ok or severity == "warning":
            warnings.append(str(name))
        check_actions = check.get("actions", [])
        if not isinstance(check_actions, list):
            check_actions = []
        for action in check_actions:
            text = str(action or "").strip()
            if text and text not in actions:
                actions.append(text)
    status = "ok" if not blockers and not warnings else ("degraded" if blockers else "warning")
    return {
        "ok": not blockers,
        "status": status,
        "blocking_checks": blockers,
        "warning_checks": warnings,
        "actions": actions[:8],
    }


def get_character_runtime_settings(config):
    default_settings = {
        "enabled": False,
        "return_metadata": False,
        "demo_stable": False,
        "auto_apply_reply_cue": False,
        "persona_override": {"enabled": False, "name": "", "style": ""},
    }
    try:
        if not isinstance(config, dict):
            return dict(default_settings)
        raw = config.get("character_runtime", {})
        if not isinstance(raw, dict):
            return dict(default_settings)
        enabled = parse_bool_flag(raw.get("enabled", False), False)
        return_metadata = parse_bool_flag(raw.get("return_metadata", False), False)
        demo_stable = parse_bool_flag(raw.get("demo_stable", False), False)
        auto_apply_reply_cue = parse_bool_flag(raw.get("auto_apply_reply_cue", False), False)
        override_raw = raw.get("persona_override", {})
        override_enabled = False
        override_name = ""
        override_style = ""
        if isinstance(override_raw, dict):
            override_enabled = parse_bool_flag(override_raw.get("enabled", False), False)
            override_name = str(override_raw.get("name", "") or "").strip()
            override_style = str(override_raw.get("style", "") or "").strip()
            if len(override_name) > 80:
                override_name = override_name[:80].strip()
            if len(override_style) > 280:
                override_style = override_style[:280].strip()
            if not override_name and not override_style:
                override_enabled = False
        if not enabled:
            return dict(default_settings)
        return {
            "enabled": True,
            "return_metadata": return_metadata,
            "demo_stable": demo_stable,
            "auto_apply_reply_cue": auto_apply_reply_cue,
            "persona_override": {
                "enabled": bool(override_enabled),
                "name": override_name,
                "style": override_style,
            },
        }
    except Exception:
        return dict(default_settings)


def build_character_runtime_health_summary(config):
    settings = get_character_runtime_settings(config if isinstance(config, dict) else {})
    persona_override = settings.get("persona_override", {})
    persona_override_enabled = False
    if isinstance(persona_override, dict):
        persona_override_enabled = parse_bool_flag(
            persona_override.get("enabled", False),
            False,
        )
    return {
        "enabled": bool(settings.get("enabled", False)),
        "return_metadata": bool(settings.get("return_metadata", False)),
        "demo_stable": bool(settings.get("demo_stable", False)),
        "auto_apply_reply_cue": bool(settings.get("auto_apply_reply_cue", False)),
        "persona_override_enabled": bool(persona_override_enabled),
    }


def build_character_runtime_backend_entry_summary(config):
    settings = get_character_runtime_settings(config if isinstance(config, dict) else {})
    persona_override = settings.get("persona_override", {})
    persona_override_enabled = False
    if isinstance(persona_override, dict):
        persona_override_enabled = parse_bool_flag(
            persona_override.get("enabled", False),
            False,
        )
    guard = evaluate_backend_entry_guard(
        configured_enabled=bool(settings.get("enabled", False)),
        backend_entry_wired=False,
        automatic_runtime_connected=False,
        scheduler_default_changed=False,
        config_write_enabled=False,
        runtime_cue_enabled=False,
        live2d_enabled=False,
        tts_enabled=False,
    )
    entry_preview = preview_backend_entry_request(guard=guard)
    adapter_preview = preview_backend_entry_noop_adapter(guard=guard)
    return {
        "read_only": True,
        "skeleton_only": True,
        "default_off_baseline": True,
        "configured_enabled": bool(settings.get("enabled", False)),
        "configured_return_metadata": bool(settings.get("return_metadata", False)),
        "configured_demo_stable": bool(settings.get("demo_stable", False)),
        "configured_persona_override_enabled": bool(persona_override_enabled),
        "explicit_enable_required": True,
        "automatic_runtime_connected": False,
        "scheduler_default_changed": False,
        "config_write_enabled": False,
        "runtime_cue_enabled": False,
        "live2d_enabled": False,
        "tts_enabled": False,
        "entry_ready": bool(guard.get("entry_ready", False)),
        "blocked_reasons": list(guard.get("blocked_reasons", [])),
        "guard_contract": guard.get("guard_contract", {}),
        "guard_runtime_states": guard.get("runtime_states", {}),
        "entry_execution_preview": entry_preview,
        "entry_adapter_preview": adapter_preview,
        "next_action": str(guard.get("next_action", "")),
    }


def build_health_payload(
    *,
    detailed=False,
    load_config_func,
    default_config,
    diagnostic_payload_func,
    get_server_security_settings_func,
    resolve_live2d_model_path_func,
    validate_live2d_model_path_func,
    api_token_env_default,
):
    config_ok = True
    config_error = ""
    try:
        cfg = load_config_func()
    except Exception as exc:
        cfg = default_config
        config_ok = False
        config_error = diagnostic_payload_func(exc).get("error", "")

    payload = {
        "ok": config_ok,
        "status": "ok" if config_ok else "degraded",
        "server_time": datetime.now().isoformat(timespec="seconds"),
    }
    if not detailed:
        return payload

    security = get_server_security_settings_func(cfg)
    live2d_ok = True
    live2d_error = ""
    live2d_resolved = ""
    try:
        model_path_value = str((cfg or {}).get("model_path", "") or "").strip()
        resolved = resolve_live2d_model_path_func(model_path_value)
        live2d_resolved = str(resolved) if resolved else ""
        validate_live2d_model_path_func(cfg)
    except Exception as exc:
        live2d_ok = False
        live2d_error = diagnostic_payload_func(exc).get("error", "")

    payload["checks"] = {
        "config_load": {
            "ok": config_ok,
            "severity": "ok" if config_ok else "error",
            "error": config_error if not config_ok else "",
        },
        "live2d_model_path": {
            "ok": live2d_ok,
            "severity": "ok" if live2d_ok else "error",
            "error": live2d_error if not live2d_ok else "",
            "resolved_path": live2d_resolved,
        },
    }
    payload["checks"]["server"] = build_server_health_summary(
        cfg,
        api_token_env_default,
    )
    payload["checks"]["llm"] = build_llm_health_summary(cfg)
    payload["checks"]["tts"] = build_tts_health_summary(cfg)
    payload["checks"]["asr"] = build_asr_health_summary(cfg)
    payload["readiness"] = build_readiness_summary(payload["checks"])
    payload["security"] = {
        "require_api_token": bool(security.get("require_api_token", False)),
        "api_token_env": str(security.get("api_token_env", api_token_env_default) or api_token_env_default),
        "api_token_configured": bool(str(security.get("expected_api_token", "") or "").strip()),
        "cors_allow_loopback": bool(security.get("allow_loopback", True)),
        "cors_allowed_origins": sorted(security.get("allowed_origins", set())),
    }
    payload["character_runtime"] = build_character_runtime_health_summary(cfg)
    payload["character_runtime_backend_entry"] = build_character_runtime_backend_entry_summary(cfg)
    return payload


def reload_runtime_config(
    *,
    load_config_func,
    validate_live2d_model_path_func,
    reset_runtime_state_func,
    default_config,
):
    config = load_config_func()
    validate_live2d_model_path_func(config)
    reset_runtime_state_func()
    server_cfg = config.get("server", {}) if isinstance(config, dict) else {}
    host = str(server_cfg.get("host", default_config["server"]["host"])).strip()
    try:
        port = int(server_cfg.get("port", default_config["server"]["port"]))
    except (TypeError, ValueError):
        port = int(default_config["server"]["port"])
    return {
        "ok": True,
        "message": "\u914d\u7f6e\u5df2\u91cd\u8f7d",
        "reloaded_at": datetime.now().isoformat(timespec="seconds"),
        "server": {"host": host, "port": port},
    }


def run_startup_self_check(
    config,
    *,
    validate_live2d_model_path_func,
    diagnostic_payload_func,
    api_token_env_default,
):
    findings = []
    safe_cfg = config if isinstance(config, dict) else {}
    server_cfg = safe_cfg.get("server", {}) if isinstance(safe_cfg.get("server", {}), dict) else {}
    tools_cfg = safe_cfg.get("tools", {}) if isinstance(safe_cfg.get("tools", {}), dict) else {}
    llm_cfg = safe_cfg.get("llm", {}) if isinstance(safe_cfg.get("llm", {}), dict) else {}

    require_token = bool(server_cfg.get("require_api_token", False))
    token_env = str(server_cfg.get("api_token_env", api_token_env_default) or api_token_env_default).strip()
    token_env = token_env or api_token_env_default
    configured_token = str(server_cfg.get("api_token", "") or "").strip() or str(os.environ.get(token_env, "") or "").strip()
    if require_token and not configured_token:
        findings.append(
            f"[startup][warn] server.require_api_token=true but token is empty. Set env {token_env}."
        )

    if bool(tools_cfg.get("allow_shell", False)):
        findings.append(
            "[startup][warn] tools.allow_shell=true. Consider disabling it for production/public releases."
        )

    runtime_summary = build_character_runtime_health_summary(safe_cfg)
    findings.append(
        "[startup][info] character_runtime "
        f"enabled={str(runtime_summary['enabled']).lower()} "
        f"return_metadata={str(runtime_summary['return_metadata']).lower()} "
        f"demo_stable={str(runtime_summary['demo_stable']).lower()} "
        f"auto_apply_reply_cue={str(runtime_summary['auto_apply_reply_cue']).lower()} "
        f"persona_override_enabled={str(runtime_summary['persona_override_enabled']).lower()}"
    )

    llm_provider = str(llm_cfg.get("provider", "") or "").strip().lower()
    if llm_provider in OPENAI_COMPATIBLE_PROVIDERS:
        key_env = str(llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV) or OPENAI_DEFAULT_KEY_ENV).strip()
        key_env = key_env or OPENAI_DEFAULT_KEY_ENV
        key_value = str(llm_cfg.get("api_key", "") or "").strip() or str(os.environ.get(key_env, "") or "").strip()
        if not key_value:
            findings.append(
                f"[startup][warn] llm provider is {llm_provider} but no API key found in env {key_env}."
            )

    health_summaries = {
        "server": build_server_health_summary(safe_cfg, api_token_env_default),
        "llm": build_llm_health_summary(safe_cfg),
        "tts": build_tts_health_summary(safe_cfg),
        "asr": build_asr_health_summary(safe_cfg),
    }
    for scope, summary in health_summaries.items():
        if not isinstance(summary, dict):
            continue
        for message in summary.get("messages", []):
            text = str(message or "").strip()
            if not text:
                continue
            if scope == "server" and "require_api_token" in text:
                continue
            if scope == "llm" and "API key" in text:
                continue
            findings.append(f"[startup][warn] {scope}: {text}")
    try:
        validate_live2d_model_path_func(safe_cfg)
    except Exception as exc:
        findings.append(f"[startup][warn] {diagnostic_payload_func(exc).get('error', '')}")
    return findings
