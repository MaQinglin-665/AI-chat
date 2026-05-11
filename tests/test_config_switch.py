import json

import pytest

from config import DiagnosticError
from config_switch import build_config_switch_payload, save_config_switch_update


def test_config_switch_save_writes_local_config_and_env_without_json_secret(tmp_path, monkeypatch):
    local_config_path = tmp_path / "config.local.json"
    env_path = tmp_path / ".env"
    local_config_path.write_text(
        json.dumps(
            {
                "assistant_name": "keep-me",
                "llm": {"temperature": 0.25, "api_key": "old-inline-secret"},
                "tts": {"stream_mode": "final_only"},
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
                "allow_browser_fallback": True,
            },
        },
        local_config_path=local_config_path,
        env_path=env_path,
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
    assert saved["tts"]["allow_browser_fallback"] is True
    assert "sk-secret-value" not in serialized
    assert "old-inline-secret" not in serialized
    assert "user:pass" not in serialized
    assert "token=secret" not in serialized
    assert "DASHSCOPE_TEST_KEY=sk-secret-value-123" in env_path.read_text(encoding="utf-8")
    assert result["saved"]["api_key_saved"] is True


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
        },
        env_path=env_path,
    )

    serialized = json.dumps(payload, ensure_ascii=False)
    assert payload["current"]["llm"]["api_key_configured"] is True
    assert payload["current"]["llm"]["base_url"] == "https://example.test/v1"
    assert payload["current"]["tts"]["gpt_sovits_api_url"] == "http://127.0.0.1:9880/tts"
    assert "sk-file-secret" not in serialized
    assert "user:pass" not in serialized
    assert "api_key=secret" not in serialized
    assert "token=secret" not in serialized
