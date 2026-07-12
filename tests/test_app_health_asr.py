import json

import app_health


def _availability(
    *,
    language_mode="auto",
    chinese_available=True,
    english_configured=False,
    english_available=False,
):
    return {
        "input_language_mode": language_mode,
        "languages": {
            "zh-CN": {
                "configured": True,
                "available": chinese_available,
                "required": False,
            },
            "en-US": {
                "configured": english_configured,
                "available": english_available,
                "required": False,
            },
        },
    }


def test_asr_health_reports_optional_english_model_without_leaking_model_paths(monkeypatch):
    monkeypatch.setattr(app_health.importlib.util, "find_spec", lambda _name: object())
    monkeypatch.setattr(
        app_health,
        "get_vosk_model_availability",
        lambda _cfg: _availability(english_configured=True, english_available=False),
    )

    summary = app_health.build_asr_health_summary(
        {"asr": {"vosk_model_paths": {"en-US": "D:/private/models/english"}}}
    )

    assert summary["bilingual_local_ready"] is False
    assert summary["local_languages"]["zh-CN"]["available"] is True
    assert summary["local_languages"]["en-US"] == {"configured": True, "available": False}
    assert any("Configured English Vosk model" in message for message in summary["messages"])
    assert "D:/private/models/english" not in json.dumps(summary)
    assert "vosk_model_path" not in summary


def test_asr_health_reports_bilingual_ready_only_when_both_local_models_are_available(monkeypatch):
    monkeypatch.setattr(app_health.importlib.util, "find_spec", lambda _name: object())
    monkeypatch.setattr(
        app_health,
        "get_vosk_model_availability",
        lambda _cfg: _availability(english_configured=True, english_available=True),
    )

    summary = app_health.build_asr_health_summary({"asr": {}})

    assert summary["ok"] is True
    assert summary["bilingual_local_ready"] is True
    assert summary["local_languages"]["en-US"]["available"] is True


def test_asr_health_keeps_legacy_model_found_true_for_usable_english_only_mode(monkeypatch):
    monkeypatch.setattr(app_health.importlib.util, "find_spec", lambda _name: object())
    monkeypatch.setattr(
        app_health,
        "get_vosk_model_availability",
        lambda _cfg: _availability(
            language_mode="en-US",
            chinese_available=False,
            english_configured=True,
            english_available=True,
        ),
    )

    summary = app_health.build_asr_health_summary({"asr": {"input_language_mode": "en"}})

    assert summary["ok"] is True
    assert summary["vosk_model_found"] is True
    assert summary["local_languages"]["zh-CN"]["available"] is False
