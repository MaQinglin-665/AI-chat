"""Startup helpers for the desktop pet backend."""

from __future__ import annotations


def ensure_config_hint(config_path, example_config_path):
    if config_path.exists():
        return
    if not example_config_path.exists():
        return
    print("Tip: copy config.example.json to config.json and set model_path if needed.")


def run_startup_self_check(
    config,
    *,
    run_startup_self_check_func,
    validate_live2d_model_path_func,
    diagnostic_payload_func,
    api_token_env_default,
):
    return run_startup_self_check_func(
        config,
        validate_live2d_model_path_func=validate_live2d_model_path_func,
        diagnostic_payload_func=diagnostic_payload_func,
        api_token_env_default=api_token_env_default,
    )
