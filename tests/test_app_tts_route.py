from http import HTTPStatus

from app_tts_route import extract_tts_request, estimate_wav_duration_ms, handle_tts_request


def _tiny_wav_bytes():
    import io
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b"\x00\x00" * 8000)
    return buf.getvalue()


def test_extract_tts_request_keeps_supported_prosody_keys():
    text, voice, prosody = extract_tts_request(
        {
            "text": " hello ",
            "voice": "v1",
            "speed_ratio": 0.9,
            "ignored": True,
        }
    )

    assert text == "hello"
    assert voice == "v1"
    assert prosody == {"speed_ratio": 0.9}


def test_handle_tts_request_rejects_empty_text():
    sent = {}

    handle_tts_request(
        {"text": "   "},
        perf_trace_id="tts_test",
        perf_started_ms=100,
        client_to_server_ms=3,
        perf_headers={"X-Perf-Trace-Id": "tts_test"},
        send_json_func=lambda data, status=HTTPStatus.OK, extra_headers=None: sent.update(
            {"data": data, "status": status, "headers": extra_headers}
        ),
        send_audio_func=lambda *_args, **_kwargs: None,
        synthesize_tts_audio_func=lambda *_args, **_kwargs: b"audio",
        guess_audio_content_type_func=lambda _audio: "audio/wav",
        log_backend_perf_func=lambda *_args, **_kwargs: None,
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
        perf_now_ms_func=lambda: 120,
    )

    assert sent["status"] == HTTPStatus.BAD_REQUEST
    assert sent["data"]["error"] == "text cannot be empty."


def test_handle_tts_request_sends_audio_on_success():
    sent = {}
    perf_events = []
    audio = _tiny_wav_bytes()

    handle_tts_request(
        {"text": "hello", "voice": "v1", "pitch": 1.1},
        perf_trace_id="tts_test",
        perf_started_ms=100,
        client_to_server_ms=3,
        perf_headers={"X-Perf-Trace-Id": "tts_test"},
        send_json_func=lambda *_args, **_kwargs: None,
        send_audio_func=lambda audio, content_type="audio/mpeg", status=HTTPStatus.OK, extra_headers=None: sent.update(
            {
                "audio": audio,
                "content_type": content_type,
                "status": status,
                "headers": extra_headers,
            }
        ),
        synthesize_tts_audio_func=lambda text, voice_override=None, prosody=None, perf_trace_id=None: audio,
        guess_audio_content_type_func=lambda _audio: "audio/wav",
        log_backend_perf_func=lambda *args, **kwargs: perf_events.append((args, kwargs)),
        log_backend_exception_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
        perf_now_ms_func=lambda: 120,
    )

    assert sent["audio"] == audio
    assert sent["content_type"] == "audio/wav"
    response_events = [kwargs for _args, kwargs in perf_events if kwargs.get("stage") == "response_sent"]
    assert response_events
    assert response_events[-1]["audio_duration_ms"] == 1000


def test_estimate_wav_duration_ms_returns_negative_for_unknown_audio():
    assert estimate_wav_duration_ms(b"not audio") == -1
