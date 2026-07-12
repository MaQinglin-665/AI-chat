import base64
from http import HTTPStatus

import asr
from app_asr_route import decode_audio_base64, handle_asr_pcm_request
from hotword_utils import apply_hotword_replacements


def test_decode_audio_base64_rejects_empty_value():
    data, error = decode_audio_base64("")

    assert data is None
    assert error == "audio_base64 cannot be empty."


def test_decode_audio_base64_rejects_invalid_value():
    data, error = decode_audio_base64("not valid base64")

    assert data is None
    assert error == "audio_base64 decode failed."


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
