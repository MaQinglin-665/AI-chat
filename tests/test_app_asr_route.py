import base64
from http import HTTPStatus

from app_asr_route import decode_audio_base64, handle_asr_pcm_request


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
