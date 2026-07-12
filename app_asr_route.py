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
    transcribe_pcm16_result_func=None,
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
        cfg = load_config_func()
        asr_cfg = cfg.get("asr", {}) if isinstance(cfg, dict) else {}
        if not isinstance(asr_cfg, dict):
            asr_cfg = {}
        result = None
        if callable(transcribe_pcm16_result_func):
            # Model locations and language mode stay in local server config.
            # Request JSON intentionally cannot select or disclose a model path.
            result = transcribe_pcm16_result_func(
                pcm_data,
                sample_rate=sample_rate,
                asr_config=asr_cfg,
            )
            raw_text = str(result.get("raw_text", "") or "") if isinstance(result, dict) else ""
        else:
            raw_text = transcribe_pcm16_func(
                pcm_data,
                sample_rate=sample_rate,
            )
        replacements = sanitize_hotword_replacements_func(
            asr_cfg.get("hotword_replacements", {})
        )
        text = apply_hotword_replacements_func(raw_text, replacements)
        response = {"text": text, "raw_text": raw_text}
        if isinstance(result, dict):
            language = str(result.get("detected_language", "") or "")
            try:
                confidence = float(result.get("confidence", 0.0))
            except (TypeError, ValueError):
                confidence = 0.0
            response["detected_language"] = language if language in {"zh-CN", "en-US"} else ""
            response["confidence"] = max(0.0, min(1.0, confidence))
            response["language_selection_ambiguous"] = result.get("language_selection_ambiguous") is True
        send_json_func(response)
    except Exception as exc:
        log_backend_exception_func("ASR", exc, extra="/api/asr_pcm failed")
        send_json_func(
            diagnostic_payload_func(exc),
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )
