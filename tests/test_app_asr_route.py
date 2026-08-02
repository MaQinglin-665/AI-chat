import base64
import struct
from http import HTTPStatus

import asr
from app_asr_route import (
    decode_audio_base64,
    handle_asr_pcm_request,
    handle_asr_stream_request,
    pcm16_audio_stats,
)
from hotword_utils import apply_hotword_replacements


def test_decode_audio_base64_rejects_empty_value():
    data, error = decode_audio_base64("")

    assert data is None
    assert error == "audio_base64 cannot be empty."


def test_decode_audio_base64_rejects_invalid_value():
    data, error = decode_audio_base64("not valid base64")

    assert data is None
    assert error == "audio_base64 decode failed."


def test_pcm16_audio_stats_reports_duration_and_safe_numeric_levels():
    pcm = struct.pack("<" + ("h" * 1600), *([3277] * 1600))

    stats = pcm16_audio_stats(pcm, sample_rate=16000)

    assert stats["audio_ms"] == 100
    assert 0.099 < stats["rms"] < 0.101
    assert 0.099 < stats["peak"] < 0.101


def test_handle_asr_pcm_request_logs_audio_levels_without_audio_content():
    sent = {}
    logged = []
    clock = iter([1000, 1042])
    pcm = struct.pack("<" + ("h" * 320), *([1640] * 320))

    handle_asr_pcm_request(
        {"audio_base64": base64.b64encode(pcm).decode("ascii"), "sample_rate": 16000},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"asr": {"provider": "vosk"}},
        transcribe_pcm16_func=lambda *_args, **_kwargs: "",
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, _replacements: text,
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
        log_backend_perf_func=lambda *args, **kwargs: logged.append((args, kwargs)),
        perf_now_ms_func=lambda: next(clock),
    )

    assert sent["status"] == HTTPStatus.OK
    assert sent["data"] == {"text": "", "raw_text": ""}
    assert logged[0][0] == ("ASR", "asr_pcm")
    assert logged[0][1]["audio_ms"] == 20
    assert logged[0][1]["text_chars"] == 0
    assert 0.049 < logged[0][1]["rms"] < 0.051
    assert "audio" not in logged[0][1]


def test_handle_asr_pcm_request_applies_hotword_replacements():
    sent = {}
    audio = base64.b64encode(b"pcm").decode("ascii")

    handle_asr_pcm_request(
        {"audio_base64": audio, "sample_rate": 16000},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"asr": {"hotword_replacements": {"taffy": "馨语"}}},
        transcribe_pcm16_func=lambda pcm, sample_rate=16000: "hello taffy",
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, replacements: text.replace("taffy", replacements["taffy"]),
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["status"] == HTTPStatus.OK
    assert sent["data"] == {"text": "hello 馨语", "raw_text": "hello taffy"}


def test_handle_asr_pcm_request_uses_server_local_language_config_and_returns_safe_metadata():
    sent = {}
    captured = {}
    audio = base64.b64encode(b"pcm").decode("ascii")
    server_asr = {
        "input_language_mode": "auto",
        "vosk_model_paths": {"en-US": "D:/private/models/en"},
        "hotword_replacements": {"taffy": "assistant"},
    }

    def transcribe_result(pcm, sample_rate=16000, asr_config=None):
        captured["pcm"] = pcm
        captured["sample_rate"] = sample_rate
        captured["asr_config"] = asr_config
        return {"raw_text": "hello taffy", "detected_language": "en-US", "confidence": 0.84}

    handle_asr_pcm_request(
        {
            "audio_base64": audio,
            "sample_rate": 16000,
            "vosk_model_paths": {"en-US": "D:/attacker/override"},
        },
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"asr": server_asr},
        transcribe_pcm16_func=lambda *_args, **_kwargs: "legacy should not run",
        transcribe_pcm16_result_func=transcribe_result,
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, replacements: text.replace("taffy", replacements["taffy"]),
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert captured["pcm"] == b"pcm"
    assert captured["sample_rate"] == 16000
    assert captured["asr_config"] is server_asr
    assert sent["status"] == HTTPStatus.OK
    assert sent["data"] == {
        "text": "hello assistant",
        "raw_text": "hello taffy",
        "detected_language": "en-US",
        "confidence": 0.84,
        "language_selection_ambiguous": False,
    }


def test_handle_asr_pcm_request_returns_allowlisted_paralinguistic_metadata():
    sent = {}
    audio = base64.b64encode(b"pcm").decode("ascii")

    handle_asr_pcm_request(
        {"audio_base64": audio, "sample_rate": 16000},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"asr": {}},
        transcribe_pcm16_func=lambda *_args, **_kwargs: "",
        transcribe_pcm16_result_func=lambda *_args, **_kwargs: {
            "raw_text": "",
            "provider": "sensevoice",
            "paralinguistic": {
                "emotion": "happy",
                "events": ["laughter", "private-event"],
                "cue_type": "laughter",
                "voiced": True,
                "voiced_ratio": 2,
                "pitch_stability": 0.8,
                "meaningful": True,
            },
        },
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, _replacements: text,
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["data"]["paralinguistic"] == {
        "emotion": "happy",
        "events": ["laughter"],
        "cue_type": "laughter",
        "voiced": True,
        "voiced_ratio": 1.0,
        "pitch_stability": 0.8,
        "meaningful": True,
    }


def test_apply_hotword_replacements_matches_spaced_cjk_asr_text():
    text = apply_hotword_replacements("心 语你在吗", {"心语": "馨语AI桌宠"})

    assert text == "馨语AI桌宠你在吗"


def test_apply_hotword_replacements_avoids_repeating_prefix_expansion():
    text = apply_hotword_replacements("馨语AI桌宠你好", {"馨语": "馨语AI桌宠"})

    assert text == "馨语AI桌宠你好"


def test_handle_asr_pcm_request_reports_transcription_failure():
    sent = {}
    logged = []
    audio = base64.b64encode(b"pcm").decode("ascii")

    handle_asr_pcm_request(
        {"audio_base64": audio},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {},
        transcribe_pcm16_func=lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("vosk down")),
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, replacements: text,
        log_backend_exception_func=lambda *args, **kwargs: logged.append((args, kwargs)),
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["status"] == HTTPStatus.INTERNAL_SERVER_ERROR
    assert sent["data"] == {"error": "vosk down"}
    assert logged


def test_handle_asr_pcm_request_ignores_client_disconnect_during_response():
    logged = []
    diagnostic_calls = []
    audio = base64.b64encode(b"pcm").decode("ascii")

    handle_asr_pcm_request(
        {"audio_base64": audio},
        send_json_func=lambda *_args, **_kwargs: (_ for _ in ()).throw(
            ConnectionAbortedError("renderer cancelled stale ASR request")
        ),
        load_config_func=lambda: {},
        transcribe_pcm16_func=lambda *_args, **_kwargs: "hello",
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, _replacements: text,
        log_backend_exception_func=lambda *args, **kwargs: logged.append((args, kwargs)),
        diagnostic_payload_func=lambda exc: diagnostic_calls.append(exc) or {"error": str(exc)},
    )

    assert logged == []
    assert diagnostic_calls == []


def test_handle_asr_pcm_request_does_not_return_private_model_path_on_load_failure(tmp_path, monkeypatch):
    sent = {}
    private_model = tmp_path / "private-english-model"
    private_model.mkdir()
    audio = base64.b64encode(b"x" * 4000).decode("ascii")

    class _FailingVosk:
        def Model(self, path):
            raise RuntimeError(f"load failed at {path}")

    asr._VOSK_MODELS.clear()
    monkeypatch.setattr(asr, "vosk", _FailingVosk())

    handle_asr_pcm_request(
        {"audio_base64": audio},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "asr": {"input_language_mode": "en", "vosk_model_paths": {"en-US": str(private_model)}}
        },
        transcribe_pcm16_func=lambda *_args, **_kwargs: "",
        transcribe_pcm16_result_func=asr.transcribe_pcm16_with_vosk_result,
        sanitize_hotword_replacements_func=lambda raw: raw,
        apply_hotword_replacements_func=lambda text, _replacements: text,
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["status"] == HTTPStatus.INTERNAL_SERVER_ERROR
    assert str(private_model) not in sent["data"]["error"]
    assert "en-US Vosk model is unavailable" in sent["data"]["error"]


def test_handle_asr_stream_request_uses_server_config_and_returns_partial_text():
    sent = {}
    calls = []
    audio = base64.b64encode(b"pcm").decode("ascii")
    server_asr = {"provider": "funasr_hybrid", "funasr_streaming_model": "private-model"}

    handle_asr_stream_request(
        {"action": "append", "session_id": "mic-1", "audio_base64": audio, "provider": "vosk"},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"asr": server_asr},
        start_stream_func=lambda *_args: {},
        append_stream_func=lambda session_id, pcm, is_final=False: calls.append(
            (session_id, pcm, is_final)
        ) or {"enabled": True, "provider": "paraformer", "partial_text": "你好"},
        cancel_stream_func=lambda *_args: {},
        log_backend_exception_func=lambda *_args, **_kwargs: None,
    )

    assert calls == [("mic-1", b"pcm", False)]
    assert sent["status"] == HTTPStatus.OK
    assert sent["data"]["partial_text"] == "你好"


def test_handle_asr_stream_failure_degrades_to_vosk_without_failing_microphone():
    sent = {}
    logged = []

    handle_asr_stream_request(
        {"action": "start", "session_id": "mic-2"},
        send_json_func=lambda data, status=HTTPStatus.OK: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"asr": {"provider": "auto"}},
        start_stream_func=lambda *_args: (_ for _ in ()).throw(RuntimeError("private path")),
        append_stream_func=lambda *_args, **_kwargs: {},
        cancel_stream_func=lambda *_args: {},
        log_backend_exception_func=lambda *args, **kwargs: logged.append((args, kwargs)),
    )

    assert sent["status"] == HTTPStatus.OK
    assert sent["data"] == {
        "enabled": False,
        "provider": "vosk",
        "partial_text": "",
        "fallback_used": True,
    }
    assert logged
