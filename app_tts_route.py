from http import HTTPStatus
import wave
from io import BytesIO


TTS_PROSODY_KEYS = (
    "speed_ratio",
    "pitch_ratio",
    "volume_ratio",
    "rate",
    "pitch",
    "volume",
)


def extract_tts_request(body):
    payload = body if isinstance(body, dict) else {}
    text = str(payload.get("text", "")).strip()
    voice = payload.get("voice")
    prosody = {}
    for key in TTS_PROSODY_KEYS:
        if key in payload:
            prosody[key] = payload.get(key)
    return text, voice, prosody


def estimate_wav_duration_ms(audio):
    if not isinstance(audio, (bytes, bytearray)) or len(audio) < 44:
        return -1
    try:
        with wave.open(BytesIO(bytes(audio)), "rb") as wav:
            frame_rate = wav.getframerate()
            frames = wav.getnframes()
            if frame_rate <= 0 or frames < 0:
                return -1
            return int(round(frames * 1000 / frame_rate))
    except Exception:
        return -1


def handle_tts_request(
    body,
    *,
    perf_trace_id,
    perf_started_ms,
    client_to_server_ms,
    perf_headers,
    send_json_func,
    send_audio_func,
    synthesize_tts_audio_func,
    guess_audio_content_type_func,
    log_backend_perf_func,
    log_backend_exception_func,
    diagnostic_payload_func,
    perf_now_ms_func,
):
    text, voice, prosody = extract_tts_request(body)
    log_backend_perf_func(
        "TTS",
        perf_trace_id,
        stage="request_received",
        client_to_server_ms=client_to_server_ms,
        text_chars=len(text),
        has_voice=bool(str(voice or "").strip()),
        prosody_keys=len(prosody),
    )
    if not text:
        send_json_func(
            {"error": "text cannot be empty."},
            status=HTTPStatus.BAD_REQUEST,
            extra_headers=perf_headers,
        )
        return
    try:
        tts_synth_started_ms = perf_now_ms_func()
        audio = synthesize_tts_audio_func(
            text,
            voice_override=voice,
            prosody=prosody,
            perf_trace_id=perf_trace_id,
        )
        tts_synth_ms = perf_now_ms_func() - tts_synth_started_ms
        if not audio:
            send_json_func(
                {"error": "TTS 返回空音频，请检查语音服务是否正常运行。"},
                status=HTTPStatus.SERVICE_UNAVAILABLE,
                extra_headers=perf_headers,
            )
            return
        send_audio_func(
            audio,
            content_type=guess_audio_content_type_func(audio),
            extra_headers=perf_headers,
        )
        log_backend_perf_func(
            "TTS",
            perf_trace_id,
            stage="response_sent",
            synth_ms=tts_synth_ms,
            total_ms=perf_now_ms_func() - perf_started_ms,
            audio_bytes=len(audio),
            audio_duration_ms=estimate_wav_duration_ms(audio),
        )
    except Exception as exc:
        log_backend_perf_func(
            "TTS",
            perf_trace_id,
            stage="fail",
            total_ms=perf_now_ms_func() - perf_started_ms,
            error_type=type(exc).__name__,
        )
        log_backend_exception_func(
            "TTS",
            exc,
            extra=(
                f"/api/tts failed | voice={voice!r} | "
                f"text_len={len(text)} | prosody={list(prosody.keys())}"
            ),
        )
        send_json_func(
            diagnostic_payload_func(exc),
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
            extra_headers=perf_headers,
        )
