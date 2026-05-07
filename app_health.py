import os
from datetime import datetime

from character_runtime import (
    evaluate_backend_entry_guard,
    preview_backend_entry_noop_adapter,
    preview_backend_entry_request,
)
from config import OPENAI_DEFAULT_KEY_ENV


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
            "error": config_error if not config_ok else "",
        },
        "live2d_model_path": {
            "ok": live2d_ok,
            "error": live2d_error if not live2d_ok else "",
            "resolved_path": live2d_resolved,
        },
    }
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
    if llm_provider in {"openai", "openai_compatible"}:
        key_env = str(llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV) or OPENAI_DEFAULT_KEY_ENV).strip()
        key_env = key_env or OPENAI_DEFAULT_KEY_ENV
        key_value = str(llm_cfg.get("api_key", "") or "").strip() or str(os.environ.get(key_env, "") or "").strip()
        if not key_value:
            findings.append(
                f"[startup][warn] llm provider is {llm_provider} but no API key found in env {key_env}."
            )
    try:
        validate_live2d_model_path_func(safe_cfg)
    except Exception as exc:
        findings.append(f"[startup][warn] {diagnostic_payload_func(exc).get('error', '')}")
    return findings
