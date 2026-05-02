import base64
from http import HTTPStatus


def decode_audio_base64(audio_base64):
    raw = str(audio_base64 or "").strip()
    if not raw:
        return None, "audio_base64 cannot be empty."
    try:
        return base64.b64decode(raw, validate=True), ""
    except Exception:
        return None, "audio_base64 decode failed."


def handle_asr_pcm_request(
    body,
    *,
    send_json_func,
    load_config_func,
    transcribe_pcm16_func,
    sanitize_hotword_replacements_func,
    apply_hotword_replacements_func,
    log_backend_exception_func,
    diagnostic_payload_func,
):
    payload = body if isinstance(body, dict) else {}
    pcm_data, decode_error = decode_audio_base64(payload.get("audio_base64", ""))
    if decode_error:
        send_json_func(
            {"error": decode_error},
            status=HTTPStatus.BAD_REQUEST,
        )
        return

    sample_rate = payload.get("sample_rate", 16000)
    try:
        raw_text = transcribe_pcm16_func(
            pcm_data,
            sample_rate=sample_rate,
        )
        cfg = load_config_func()
        asr_cfg = cfg.get("asr", {}) if isinstance(cfg, dict) else {}
        replacements = sanitize_hotword_replacements_func(
            asr_cfg.get("hotword_replacements", {})
        )
        text = apply_hotword_replacements_func(raw_text, replacements)
        send_json_func({"text": text, "raw_text": raw_text})
    except Exception as exc:
        log_backend_exception_func("ASR", exc, extra="/api/asr_pcm failed")
        send_json_func(
            diagnostic_payload_func(exc),
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )
