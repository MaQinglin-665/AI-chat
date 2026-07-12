from pathlib import Path

import app_startup


def test_ensure_config_hint_prints_only_when_example_exists_and_config_missing(capsys, tmp_path):
    config_path = tmp_path / "config.json"
    example_path = tmp_path / "config.example.json"
    example_path.write_text("{}", encoding="utf-8")

    app_startup.ensure_config_hint(config_path, example_path)

    captured = capsys.readouterr()
    assert "copy config.example.json to config.json" in captured.out

    config_path.write_text("{}", encoding="utf-8")
    app_startup.ensure_config_hint(config_path, example_path)

    captured = capsys.readouterr()
    assert captured.out == ""


def test_run_startup_self_check_wires_dependencies():
    captured = {}

    def run_check(config, *, validate_live2d_model_path_func, diagnostic_payload_func, api_token_env_default):
        captured.update(
            {
                "config": config,
                "validate": validate_live2d_model_path_func,
                "diagnostic": diagnostic_payload_func,
                "api_token_env_default": api_token_env_default,
            }
        )
        return ["ok"]

    def validate(_config):
        return Path("model.model3.json")

    def diagnostic(exc):
        return {"error": str(exc)}

    cfg = {"server": {"require_api_token": True}}
    findings = app_startup.run_startup_self_check(
        cfg,
        run_startup_self_check_func=run_check,
        validate_live2d_model_path_func=validate,
        diagnostic_payload_func=diagnostic,
        api_token_env_default="TOKEN_ENV",
    )

    assert findings == ["ok"]
    assert captured == {
        "config": cfg,
        "validate": validate,
        "diagnostic": diagnostic,
        "api_token_env_default": "TOKEN_ENV",
    }
