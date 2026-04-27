import json
from pathlib import Path

import config


def _setup_paths(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "_ENV_LOADED", True)
    monkeypatch.setattr(config, "ENV_PATH", tmp_path / ".env")
    monkeypatch.setattr(config, "EXAMPLE_CONFIG_PATH", tmp_path / "config.example.json")
    monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.json")
    monkeypatch.setattr(config, "LOCAL_CONFIG_PATH", tmp_path / "config.local.json")


def _write_json(path: Path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_migrates_legacy_default_gpt_sovits_to_browser(monkeypatch, tmp_path):
    _setup_paths(monkeypatch, tmp_path)
    _write_json(
        config.CONFIG_PATH,
        {
            "tts": {
                "provider": "gpt_sovits",
                "voice": "default",
                "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
                "gpt_sovits_method": "POST",
                "gpt_sovits_format": "wav",
            }
        },
    )

    loaded = config.load_config()

    assert loaded.get("onboarding_completed") is True
    assert loaded.get("tts", {}).get("provider") == "browser"
    assert loaded.get("tts", {}).get("voice") == config.TTS_DEFAULT_VOICE
    assert loaded.get("tts", {}).get("allow_browser_fallback") is True


def test_keeps_customized_gpt_sovits_for_legacy_user(monkeypatch, tmp_path):
    _setup_paths(monkeypatch, tmp_path)
    _write_json(
        config.CONFIG_PATH,
        {
            "tts": {
                "provider": "gpt_sovits",
                "voice": "default",
                "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
                "gpt_sovits_ref_audio_path": "tts_ref/custom.wav",
            }
        },
    )

    loaded = config.load_config()

    assert loaded.get("onboarding_completed") is True
    assert loaded.get("tts", {}).get("provider") == "gpt_sovits"


def test_keeps_gpt_sovits_when_onboarding_completed_present(monkeypatch, tmp_path):
    _setup_paths(monkeypatch, tmp_path)
    _write_json(
        config.CONFIG_PATH,
        {
            "onboarding_completed": True,
            "tts": {
                "provider": "gpt_sovits",
                "voice": "default",
                "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
            },
        },
    )

    loaded = config.load_config()

    assert loaded.get("onboarding_completed") is True
    assert loaded.get("tts", {}).get("provider") == "gpt_sovits"
