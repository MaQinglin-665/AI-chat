import numpy as np
import json

import local_asr_provider as provider


class _FakeModel:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = []

    def generate(self, **kwargs):
        self.calls.append(kwargs)
        text = self.outputs.pop(0) if self.outputs else ""
        return [{"text": text}]


def setup_function():
    provider.FUNASR_MODELS.clear()
    provider.FUNASR_MODEL_FAILURES.clear()
    provider.FUNASR_STREAM_SESSIONS.clear()


def teardown_function():
    provider.FUNASR_MODELS.clear()
    provider.FUNASR_MODEL_FAILURES.clear()
    provider.FUNASR_STREAM_SESSIONS.clear()


def test_normalize_asr_provider_keeps_legacy_and_hybrid_choices():
    assert provider.normalize_asr_provider("vosk") == "vosk"
    assert provider.normalize_asr_provider("FunASR-Hybrid") == "funasr_hybrid"
    assert provider.normalize_asr_provider("unexpected") == "auto"


def test_sensevoice_result_uses_local_model_without_fabricating_confidence(monkeypatch):
    model = _FakeModel(["<|zh|><|NEUTRAL|>你 好 Live2D"])
    monkeypatch.setattr(provider, "_load_funasr_model", lambda *_args: model)

    pcm = np.array([200, -200] * 1200, dtype="<i2").tobytes()
    result = provider.transcribe_pcm16_with_sensevoice_result(
        pcm,
        asr_config={"input_language_mode": "auto"},
    )

    assert result["raw_text"] == "你好 Live2D"
    assert result["detected_language"] == "zh-CN"
    assert result["confidence"] == 0.0
    assert result["provider"] == "sensevoice"
    assert model.calls[0]["language"] == "auto"


def test_sensevoice_keeps_hidden_emotion_and_audio_event_metadata(monkeypatch):
    model = _FakeModel(["<|zh|><|HAPPY|><|Laughter|><|woitn|>"])
    monkeypatch.setattr(provider, "_load_funasr_model", lambda *_args: model)
    monkeypatch.setattr(
        provider,
        "_analyze_paralinguistic_audio",
        lambda *_args, **_kwargs: {
            "voiced": True,
            "voiced_ratio": 0.82,
            "pitch_stability": 0.91,
            "energy": 0.03,
        },
    )

    pcm = np.array([200, -200] * 1200, dtype="<i2").tobytes()
    result = provider.transcribe_pcm16_with_sensevoice_result(pcm)

    assert result["raw_text"] == ""
    assert result["paralinguistic"]["emotion"] == "happy"
    assert result["paralinguistic"]["events"] == ["laughter"]
    assert result["paralinguistic"]["cue_type"] == "laughter"
    assert result["paralinguistic"]["meaningful"] is True


def test_sensevoice_suppresses_subtitle_hallucination_for_stable_voiced_audio(monkeypatch):
    monkeypatch.setattr(
        provider,
        "_analyze_paralinguistic_audio",
        lambda *_args, **_kwargs: {
            "voiced": True,
            "voiced_ratio": 0.88,
            "pitch_stability": 0.93,
            "energy": 0.02,
        },
    )

    extracted = provider._extract_sensevoice_result(
        [{"text": "<|zh|><|NEUTRAL|><|Speech|><|woitn|>字幕by秦兰娅"}],
        pcm16_bytes=b"pcm",
    )

    assert extracted["text"] == ""
    assert extracted["paralinguistic"]["cue_type"] == "nonverbal_vocalization"
    assert extracted["paralinguistic"]["meaningful"] is True


def test_hybrid_final_transcription_falls_back_to_vosk(monkeypatch):
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_sensevoice_result",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("model unavailable")),
    )
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_vosk_result",
        lambda *_args, **_kwargs: {
            "raw_text": "fallback works",
            "detected_language": "en-US",
            "confidence": 0.81,
            "language_selection_ambiguous": False,
        },
    )

    result = provider.transcribe_pcm16_with_local_fallback_result(
        b"pcm",
        asr_config={"provider": "auto"},
    )

    assert result["raw_text"] == "fallback works"
    assert result["provider"] == "vosk"
    assert result["fallback_used"] is True


def test_persistent_sensevoice_service_result_uses_loopback_json(monkeypatch):
    captured = {}

    class _Response:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return json.dumps(
                {
                    "raw_text": "hello \u4f60\u597d",
                    "detected_language": "zh-CN",
                    "paralinguistic": {"emotion": "happy", "meaningful": True},
                }
            ).encode("utf-8")

    def fake_open(request, timeout):
        captured["url"] = request.full_url
        captured["body"] = json.loads(request.data.decode("utf-8"))
        captured["timeout"] = timeout
        return _Response()

    monkeypatch.setattr(provider.urllib_request, "urlopen", fake_open)
    pcm = np.array([100, -100] * 900, dtype="<i2").tobytes()
    result = provider.transcribe_pcm16_with_sensevoice_service_result(
        pcm,
        asr_config={
            "sensevoice_service_url": "http://127.0.0.1:9890",
            "sensevoice_service_timeout_sec": 3,
        },
    )

    assert captured["url"] == "http://127.0.0.1:9890/v1/audio/transcriptions"
    assert captured["body"]["sample_rate"] == 16000
    assert captured["timeout"] == 3
    assert result["raw_text"] == "hello \u4f60\u597d"
    assert result["provider"] == "sensevoice"
    assert result["paralinguistic"]["emotion"] == "happy"


def test_persistent_sensevoice_service_rejects_non_loopback_url():
    try:
        provider._resolve_sensevoice_service_url(
            {"sensevoice_service_url": "https://example.com"}
        )
    except RuntimeError as exc:
        assert "loopback" in str(exc)
    else:
        raise AssertionError("non-loopback SenseVoice services must be rejected")


def test_hybrid_does_not_cold_load_in_process_while_service_is_unavailable(monkeypatch):
    calls = []
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_sensevoice_service_result",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("warming")),
    )
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_sensevoice_result",
        lambda *_args, **_kwargs: calls.append("in_process"),
    )
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_vosk_result",
        lambda *_args, **_kwargs: {
            "raw_text": "\u5feb\u901f\u56de\u9000",
            "detected_language": "zh-CN",
            "confidence": 0.7,
            "language_selection_ambiguous": False,
        },
    )

    result = provider.transcribe_pcm16_with_local_fallback_result(
        b"pcm",
        asr_config={"provider": "auto", "sensevoice_service_enabled": True},
    )

    assert calls == []
    assert result["raw_text"] == "\u5feb\u901f\u56de\u9000"
    assert result["provider"] == "vosk"


def test_empty_vosk_result_uses_enabled_loopback_whisper_fallback(monkeypatch):
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_vosk_result",
        lambda *_args, **_kwargs: {
            "raw_text": "",
            "detected_language": "",
            "confidence": 0.0,
        },
    )
    monkeypatch.setattr(
        provider,
        "transcribe_pcm16_with_whisper_service_result",
        lambda *_args, **_kwargs: {
            "raw_text": "自然说话可以识别",
            "detected_language": "zh-CN",
            "confidence": 0.0,
            "provider": "whisper",
            "fallback_used": True,
        },
    )

    result = provider.transcribe_pcm16_with_local_fallback_result(
        b"pcm",
        asr_config={
            "provider": "vosk",
            "whisper_fallback_enabled": True,
            "whisper_fallback_url": "http://127.0.0.1:9889",
        },
    )

    assert result["raw_text"] == "自然说话可以识别"
    assert result["provider"] == "whisper"
    assert result["fallback_used"] is True


def test_whisper_fallback_rejects_non_loopback_service():
    try:
        provider._resolve_whisper_fallback_url(
            {
                "whisper_fallback_enabled": True,
                "whisper_fallback_url": "https://example.com",
            }
        )
    except RuntimeError as exc:
        assert "loopback" in str(exc)
    else:
        raise AssertionError("non-loopback Whisper services must be rejected")


def test_failed_funasr_model_load_uses_cooldown_before_retry(monkeypatch):
    attempts = []
    clock = {"now": 100.0}

    monkeypatch.setattr(
        provider,
        "get_local_asr_capability",
        lambda _cfg: {"hybrid_available": True},
    )
    monkeypatch.setattr(provider, "_resolve_device", lambda _cfg: "cpu")
    monkeypatch.setattr(provider.time, "monotonic", lambda: clock["now"])
    monkeypatch.setattr(
        provider,
        "_create_funasr_model",
        lambda model_name, device: (
            attempts.append((model_name, device)),
            (_ for _ in ()).throw(RuntimeError("offline")),
        )[1],
    )

    config = {
        "funasr_final_model": "iic/SenseVoiceSmall",
        "funasr_model_failure_retry_sec": 120,
    }
    for _ in range(2):
        try:
            provider._load_funasr_model("final", config)
        except RuntimeError:
            pass

    assert len(attempts) == 1
    clock["now"] += 121
    try:
        provider._load_funasr_model("final", config)
    except RuntimeError:
        pass
    assert len(attempts) == 2


def test_paraformer_stream_session_accumulates_ordered_partial_text(monkeypatch):
    model = _FakeModel(["你 好", "Live2D"])
    monkeypatch.setattr(
        provider,
        "get_local_asr_capability",
        lambda _cfg: {"hybrid_available": True, "streaming_available": True},
    )
    monkeypatch.setattr(provider, "_load_funasr_model", lambda *_args: model)
    pcm = np.array([100, -100] * 800, dtype="<i2").tobytes()

    started = provider.start_funasr_stream_session("mic-1", {"streaming_enabled": True})
    first = provider.append_funasr_stream_audio("mic-1", pcm)
    final = provider.append_funasr_stream_audio("mic-1", pcm, is_final=True)

    assert started["enabled"] is True
    assert first["partial_text"] == "你好"
    assert final["partial_text"] == "你好 Live2D"
    assert final["final"] is True
    assert "mic-1" not in provider.FUNASR_STREAM_SESSIONS
    assert model.calls[0]["is_final"] is False
    assert model.calls[1]["is_final"] is True


def test_stream_session_reports_vosk_when_optional_runtime_is_missing(monkeypatch):
    monkeypatch.setattr(
        provider,
        "get_local_asr_capability",
        lambda _cfg: {"hybrid_available": False, "streaming_available": False},
    )

    result = provider.start_funasr_stream_session("mic-2", {})

    assert result == {"enabled": False, "provider": "vosk", "partial_text": ""}
    assert provider.FUNASR_STREAM_SESSIONS == {}
