from datetime import datetime
from pathlib import Path

from app_health import parse_bool_flag, safe_dict, safe_url_display
from config import DiagnosticError, ENV_PATH, validate_live2d_model_path
from config_switch import build_config_switch_payload, save_first_run_llm_config


OPENAI_COMPATIBLE_PROVIDERS = {"openai", "openai-compatible", "openai_compatible"}
SUPPORTED_FIRST_RUN_PROVIDERS = OPENAI_COMPATIBLE_PROVIDERS | {"ollama"}


def _clean_text(value, max_len=180):
    text = " ".join(str(value or "").split()).strip()
    return text[:max_len]


def _safe_live2d_status(config):
    cfg = config if isinstance(config, dict) else {}
    raw_model_path = _clean_text(cfg.get("model_path", ""), 240)
    try:
        validate_live2d_model_path(cfg)
        return {
            "ok": True,
            "configured": True,
            "model_path": raw_model_path,
            "message": "",
        }
    except DiagnosticError as exc:
        return {
            "ok": False,
            "configured": False,
            "model_path": raw_model_path,
            "code": exc.code,
            "reason": exc.reason,
            "solution": exc.solution,
        }
    except Exception as exc:
        return {
            "ok": False,
            "configured": False,
            "model_path": raw_model_path,
            "code": "live2d_status_error",
            "reason": str(exc),
            "solution": "Check model_path and the model files under web/models.",
        }


def _safe_safety_status(config):
    cfg = config if isinstance(config, dict) else {}
    observe_cfg = safe_dict(cfg.get("observe"))
    tools_cfg = safe_dict(cfg.get("tools"))
    attach_mode = _clean_text(observe_cfg.get("attach_mode") or "manual", 32).lower()
    if attach_mode in {"auto", "always"}:
        normalized_attach_mode = "always"
    else:
        normalized_attach_mode = "manual"
    allow_auto_chat = parse_bool_flag(observe_cfg.get("allow_auto_chat", False), False)
    auto_chat_enabled = parse_bool_flag(observe_cfg.get("auto_chat_enabled", False), False)
    tools_enabled = parse_bool_flag(tools_cfg.get("enabled", False), False)
    allow_shell = parse_bool_flag(tools_cfg.get("allow_shell", False), False)
    desktop_observation_auto = normalized_attach_mode == "always"
    ok = not desktop_observation_auto and not tools_enabled and not allow_shell
    return {
        "ok": ok,
        "observe_attach_mode": normalized_attach_mode,
        "desktop_observation_auto": desktop_observation_auto,
        "observe_allow_auto_chat": allow_auto_chat,
        "observe_auto_chat_enabled": auto_chat_enabled,
        "tools_enabled": tools_enabled,
        "tools_allow_shell": allow_shell,
        "summary": [
            f"observe.attach_mode={normalized_attach_mode}",
            f"tools.enabled={str(tools_enabled).lower()}",
            f"tools.allow_shell={str(allow_shell).lower()}",
        ],
    }


def _safe_llm_status(config, *, env_path=None):
    cfg = config if isinstance(config, dict) else {}
    switch_payload = build_config_switch_payload(cfg, env_path=env_path or ENV_PATH)
    current = safe_dict(switch_payload.get("current")).get("llm", {})
    current = safe_dict(current)
    provider = _clean_text(current.get("provider"), 64).lower()
    if provider == "openai_compatible":
        provider = "openai-compatible"
    base_url = safe_url_display(current.get("base_url", ""))
    model = _clean_text(current.get("model"), 120)
    api_key_env = _clean_text(current.get("api_key_env"), 64)
    api_key_configured = current.get("api_key_configured") is True
    provider_supported = provider in SUPPORTED_FIRST_RUN_PROVIDERS
    requires_api_key = provider in OPENAI_COMPATIBLE_PROVIDERS
    configured = bool(
        provider_supported
        and provider
        and base_url
        and model
        and (api_key_configured or not requires_api_key)
    )
    missing = []
    if not provider_supported:
        missing.append("provider")
    if not base_url:
        missing.append("base_url")
    if not model:
        missing.append("model")
    if requires_api_key and not api_key_configured:
        missing.append("api_key")
    return {
        "configured": configured,
        "provider": provider,
        "base_url": base_url,
        "model": model,
        "api_key_env": api_key_env,
        "api_key_configured": api_key_configured,
        "api_key_returned": False,
        "requires_api_key": requires_api_key,
        "missing": missing,
    }


def build_first_run_status_payload(config, *, env_path=None):
    cfg = config if isinstance(config, dict) else {}
    llm_status = _safe_llm_status(cfg, env_path=env_path)
    live2d_status = _safe_live2d_status(cfg)
    safety_status = _safe_safety_status(cfg)
    onboarding_completed = cfg.get("onboarding_completed") is True
    needs_first_run = (not onboarding_completed) or (not llm_status["configured"])
    return {
        "ok": True,
        "server_time": datetime.now().isoformat(timespec="seconds"),
        "first_run": {
            "onboarding_completed": onboarding_completed,
            "needs_first_run": needs_first_run,
            "baseline_ready": bool(llm_status["configured"] and live2d_status["ok"] and safety_status["ok"]),
        },
        "llm": llm_status,
        "live2d": live2d_status,
        "safety": safety_status,
        "secrets": {
            "api_key_storage": ".env",
            "api_key_returned": False,
        },
    }


def configure_first_run_llm(body, *, local_config_path=None, env_path=None):
    return save_first_run_llm_config(
        body if isinstance(body, dict) else {},
        local_config_path=local_config_path,
        env_path=Path(env_path) if env_path is not None else None,
    )
