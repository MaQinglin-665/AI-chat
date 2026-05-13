import json

import pytest

from config import DiagnosticError
from config_switch import (
    build_config_switch_payload,
    build_config_switch_test_config,
    discover_live2d_model_presets,
    inspect_live2d_model_compatibility,
    save_config_switch_update,
    validate_config_switch_live2d_update,
)


def test_config_switch_save_writes_local_config_and_env_without_json_secret(tmp_path, monkeypatch):
    local_config_path = tmp_path / "config.local.json"
    env_path = tmp_path / ".env"
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "demo_model" / "demo.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text("{}", encoding="utf-8")
    local_config_path.write_text(
        json.dumps(
            {
                "assistant_name": "keep-me",
                "llm": {"temperature": 0.25, "api_key": "old-inline-secret"},
                "tts": {"stream_mode": "final_only"},
                "model": {"scale": 0.8, "x_ratio": 0.2, "y_ratio": 0.9},
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    monkeypatch.delenv("DASHSCOPE_TEST_KEY", raising=False)

    result = save_config_switch_update(
        {
            "llm": {
                "preset_id": "dashscope",
                "model": "qwen-turbo",
                "api_key_env": "DASHSCOPE_TEST_KEY",
                "api_key": "sk-secret-value-123",
            },
            "tts": {
                "provider": "gpt_sovits",
                "voice": "default",
                "gpt_sovits_api_url": "http://user:pass@127.0.0.1:9880/tts?token=secret",
                "stream_mode": "realtime",
                "gpt_sovits_timeout_sec": 30,
                "allow_browser_fallback": True,
            },
            "live2d": {
                "model_path": "/models/demo_model/demo.model3.json",
                "scale": 1.25,
                "x_ratio": 0.3,
                "y_ratio": 0.88,
            },
        },
        local_config_path=local_config_path,
        env_path=env_path,
        web_dir=web_dir,
    )

    saved = json.loads(local_config_path.read_text(encoding="utf-8"))
    serialized = json.dumps(saved, ensure_ascii=False)

    assert result["ok"] is True
    assert saved["assistant_name"] == "keep-me"
    assert saved["llm"]["temperature"] == 0.25
    assert saved["llm"]["provider"] == "openai-compatible"
    assert saved["llm"]["model"] == "qwen-turbo"
    assert saved["llm"]["api_key_env"] == "DASHSCOPE_TEST_KEY"
    assert saved["llm"]["api_key"] == ""
    assert saved["tts"]["provider"] == "gpt_sovits"
    assert saved["tts"]["gpt_sovits_api_url"] == "http://127.0.0.1:9880/tts"
    assert saved["tts"]["stream_mode"] == "realtime"
    assert saved["tts"]["gpt_sovits_realtime_tts"] is True
    assert saved["tts"]["gpt_sovits_timeout_sec"] == 30
    assert saved["tts"]["allow_browser_fallback"] is True
    assert saved["model_path"] == "/models/demo_model/demo.model3.json"
    assert saved["model"]["scale"] == 1.25
    assert saved["model"]["x_ratio"] == 0.3
    assert saved["model"]["y_ratio"] == 0.88
    assert "sk-secret-value" not in serialized
    assert "old-inline-secret" not in serialized
    assert "user:pass" not in serialized
    assert "token=secret" not in serialized
    assert "DASHSCOPE_TEST_KEY=sk-secret-value-123" in env_path.read_text(encoding="utf-8")
    assert result["saved"]["api_key_saved"] is True
    assert result["saved"]["live2d"]["model_path"] == "/models/demo_model/demo.model3.json"


def test_config_switch_rejects_unknown_provider_without_writing(tmp_path):
    local_config_path = tmp_path / "config.local.json"
    env_path = tmp_path / ".env"

    with pytest.raises(DiagnosticError) as exc:
        save_config_switch_update(
            {
                "llm": {"preset_id": "not-real"},
                "tts": {"provider": "browser"},
            },
            local_config_path=local_config_path,
            env_path=env_path,
        )

    assert exc.value.code == "config_switch_invalid_llm_provider"
    assert not local_config_path.exists()
    assert not env_path.exists()


def test_config_switch_payload_reports_key_presence_without_leaking_secret(tmp_path, monkeypatch):
    env_path = tmp_path / ".env"
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "hiyori" / "hiyori.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text("{}", encoding="utf-8")
    env_path.write_text("TAFFY_LLM_API_KEY=sk-file-secret\n", encoding="utf-8")
    monkeypatch.delenv("TAFFY_LLM_API_KEY", raising=False)

    payload = build_config_switch_payload(
        {
            "llm": {
                "provider": "openai-compatible",
                "base_url": "https://user:pass@example.test/v1?api_key=secret",
                "model": "custom-model",
                "api_key_env": "TAFFY_LLM_API_KEY",
                "api_key": "",
            },
            "tts": {
                "provider": "gpt_sovits",
                "voice": "default",
                "gpt_sovits_api_url": "http://user:pass@127.0.0.1:9880/tts?token=secret",
            },
            "model_path": "/models/hiyori/hiyori.model3.json",
            "model": {"scale": 1.2, "x_ratio": 0.25, "y_ratio": 0.92},
        },
        env_path=env_path,
        web_dir=web_dir,
    )

    serialized = json.dumps(payload, ensure_ascii=False)
    assert payload["current"]["llm"]["api_key_configured"] is True
    assert payload["current"]["llm"]["base_url"] == "https://example.test/v1"
    assert payload["current"]["tts"]["gpt_sovits_api_url"] == "http://127.0.0.1:9880/tts"
    assert payload["live2d_models"][0]["model_path"] == "/models/hiyori/hiyori.model3.json"
    assert payload["current"]["live2d"]["preset_id"] == "/models/hiyori/hiyori.model3.json"
    assert payload["current"]["live2d"]["scale"] == 1.2
    assert "sk-file-secret" not in serialized
    assert "user:pass" not in serialized
    assert "api_key=secret" not in serialized
    assert "token=secret" not in serialized


def test_config_switch_rejects_live2d_path_outside_models(tmp_path):
    local_config_path = tmp_path / "config.local.json"
    env_path = tmp_path / ".env"
    web_dir = tmp_path / "web"
    (web_dir / "models").mkdir(parents=True)

    with pytest.raises(DiagnosticError) as exc:
        save_config_switch_update(
            {
                "llm": {"preset_id": "ollama"},
                "tts": {"provider": "browser"},
                "live2d": {"model_path": "../secret.model3.json"},
            },
            local_config_path=local_config_path,
            env_path=env_path,
            web_dir=web_dir,
        )

    assert exc.value.code == "config_switch_live2d_path_escape"
    assert not local_config_path.exists()


def test_discover_live2d_model_presets_lists_web_models(tmp_path):
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "avatar" / "avatar.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text("{}", encoding="utf-8")

    presets = discover_live2d_model_presets(web_dir=web_dir)

    assert presets == [
        {
            "id": "/models/avatar/avatar.model3.json",
            "label": "avatar (avatar.model3.json)",
            "model_path": "/models/avatar/avatar.model3.json",
        }
    ]


def test_config_switch_test_config_applies_unsaved_values_without_writing(tmp_path):
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "avatar" / "avatar.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text("{}", encoding="utf-8")
    base = {
        "assistant_name": "keep",
        "llm": {"provider": "ollama", "base_url": "http://127.0.0.1:11434", "model": "old"},
        "tts": {"provider": "browser", "voice": "old"},
    }

    updated = build_config_switch_test_config(
        {
            "llm": {
                "preset_id": "custom_openai_compatible",
                "base_url": "https://api.example.test/v1",
                "model": "demo",
                "api_key_env": "DEMO_KEY",
                "api_key": "sk-inline-test",
            },
            "tts": {"provider": "edge_tts", "voice": "zh-CN-XiaoxiaoNeural"},
            "live2d": {"model_path": "/models/avatar/avatar.model3.json"},
        },
        base,
        web_dir=web_dir,
    )

    assert base["llm"]["model"] == "old"
    assert updated["assistant_name"] == "keep"
    assert updated["llm"]["provider"] == "openai-compatible"
    assert updated["llm"]["model"] == "demo"
    assert updated["llm"]["api_key"] == "sk-inline-test"
    assert updated["tts"]["provider"] == "edge_tts"
    assert updated["model_path"] == "/models/avatar/avatar.model3.json"


def test_validate_config_switch_live2d_update_returns_reload_hint(tmp_path):
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "avatar" / "avatar.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text(
        json.dumps(
            {
                "Version": 3,
                "FileReferences": {
                    "Motions": {
                        "Idle": [{"File": "idle.motion3.json"}],
                        "Tap@Body": [{"File": "tap.motion3.json"}],
                    },
                    "Expressions": [{"Name": "smile", "File": "smile.exp3.json"}],
                },
            }
        ),
        encoding="utf-8",
    )

    result = validate_config_switch_live2d_update(
        {"model_path": "/models/avatar/avatar.model3.json", "scale": 1.4},
        web_dir=web_dir,
    )

    assert result["ok"] is True
    assert result["reload_required"] is True
    assert result["live2d"]["model_path"] == "/models/avatar/avatar.model3.json"
    assert result["live2d"]["scale"] == 1.4
    assert result["live2d"]["motion_groups"] == [
        {"name": "Idle", "count": 1},
        {"name": "Tap@Body", "count": 1},
    ]
    assert result["live2d"]["expressions"] == [{"name": "smile", "file": "smile.exp3.json"}]
    assert "body" not in result["live2d"]["compatibility"]["missing_motion_families"]


def test_live2d_compatibility_report_warns_without_blocking_empty_model(tmp_path):
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "empty" / "empty.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text("{}", encoding="utf-8")

    result = validate_config_switch_live2d_update(
        {"model_path": "/models/empty/empty.model3.json"},
        web_dir=web_dir,
    )

    assert result["ok"] is True
    assert result["live2d"]["motion_groups"] == []
    assert result["live2d"]["expressions"] == []
    assert "no_motion_groups" in result["live2d"]["compatibility"]["warnings"]
    assert "no_expressions" in result["live2d"]["compatibility"]["warnings"]
    assert result["live2d"]["compatibility"]["missing_motion_families"]


def test_live2d_compatibility_report_reads_model3_metadata(tmp_path):
    web_dir = tmp_path / "web"
    model_file = web_dir / "models" / "report" / "report.model3.json"
    model_file.parent.mkdir(parents=True)
    model_file.write_text(
        json.dumps(
            {
                "Version": 3,
                "FileReferences": {
                    "Motions": {
                        "Idle": [{"File": "idle.motion3.json"}],
                        "FlickUp": [{"File": "happy.motion3.json"}],
                        "FlickDown": [{"File": "soft.motion3.json"}],
                        "Tap@Body": [{"File": "tap.motion3.json"}],
                    },
                    "Expressions": [{"Name": "smile", "File": "expressions/smile.exp3.json"}],
                },
            }
        ),
        encoding="utf-8",
    )

    report = inspect_live2d_model_compatibility("/models/report/report.model3.json", web_dir=web_dir)

    assert report["motion_groups"][0] == {"name": "FlickDown", "count": 1}
    assert {"name": "Tap@Body", "count": 1} in report["motion_groups"]
    assert report["expressions"] == [{"name": "smile", "file": "expressions/smile.exp3.json"}]
    assert "no_motion_groups" not in report["compatibility"]["warnings"]
