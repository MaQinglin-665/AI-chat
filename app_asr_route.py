import base64
import math
import struct
from http import HTTPStatus


def sanitize_paralinguistic_result(raw):
    if not isinstance(raw, dict):
        return None
    allowed_emotions = {
        "angry",
        "disgusted",
        "fearful",
        "happy",
        "neutral",
        "sad",
        "surprised",
        "unknown",
    }
    allowed_events = {
        "speech",
        "laughter",
        "crying",
        "cough",
        "sneeze",
        "breath",
        "applause",
        "bgm",
        "music",
    }
    allowed_cues = {
        "",
        "nonverbal_vocalization",
        "laughter",
        "crying",
        "cough",
        "sneeze",
        "breath",
    }
    emotion = str(raw.get("emotion", "unknown") or "unknown").strip().lower()
    cue_type = str(raw.get("cue_type", "") or "").strip().lower()
    events = []
    for value in raw.get("events", []) if isinstance(raw.get("events"), list) else []:
        event = str(value or "").strip().lower()
        if event in allowed_events and event not in events:
            events.append(event)
        if len(events) >= 6:
            break
    try:
        voiced_ratio = float(raw.get("voiced_ratio", 0.0) or 0.0)
    except (TypeError, ValueError):
        voiced_ratio = 0.0
    try:
        pitch_stability = float(raw.get("pitch_stability", 0.0) or 0.0)
    except (TypeError, ValueError):
        pitch_stability = 0.0
    safe = {
        "emotion": emotion if emotion in allowed_emotions else "unknown",
        "events": events,
        "cue_type": cue_type if cue_type in allowed_cues else "",
        "voiced": raw.get("voiced") is True,
        "voiced_ratio": max(0.0, min(1.0, voiced_ratio)),
        "pitch_stability": max(0.0, min(1.0, pitch_stability)),
        "meaningful": raw.get("meaningful") is True,
    }
    if not safe["meaningful"] and not safe["cue_type"] and safe["emotion"] in {"neutral", "unknown"}:
        return None
    return safe


def decode_audio_base64(audio_base64):
    raw = str(audio_base64 or "").strip()
    if not raw:
        return None, "audio_base64 cannot be empty."
    try:
        return base64.b64decode(raw, validate=True), ""
    except Exception:
        return None, "audio_base64 decode failed."


def pcm16_audio_stats(pcm_data, sample_rate=16000):
    usable_bytes = len(pcm_data or b"") - (len(pcm_data or b"") % 2)
    if usable_bytes <= 0:
        return {"audio_ms": 0, "rms": 0.0, "peak": 0.0}
    sample_count = usable_bytes // 2
    squared_total = 0
    peak_value = 0
    for (value,) in struct.iter_unpack("<h", pcm_data[:usable_bytes]):
        squared_total += value * value
        peak_value = max(peak_value, abs(value))
    safe_rate = max(1, int(sample_rate or 16000))
    return {
        "audio_ms": round(sample_count * 1000 / safe_rate),
        "rms": round(math.sqrt(squared_total / sample_count) / 32768, 6),
        "peak": round(peak_value / 32768, 6),
    }


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
    log_backend_perf_func=None,
    perf_now_ms_func=None,
):
    started_ms = perf_now_ms_func() if callable(perf_now_ms_func) else 0
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
            provider = str(result.get("provider", "") or "").strip().lower()
            if provider in {"sensevoice", "vosk", "whisper"}:
                response["provider"] = provider
            if "fallback_used" in result:
                response["fallback_used"] = result.get("fallback_used") is True
            paralinguistic = sanitize_paralinguistic_result(result.get("paralinguistic"))
            if paralinguistic:
                response["paralinguistic"] = paralinguistic
        if callable(log_backend_perf_func):
            stats = pcm16_audio_stats(pcm_data, sample_rate=sample_rate)
            provider = str(response.get("provider", "") or asr_cfg.get("provider", "vosk"))
            total_ms = (
                max(0, perf_now_ms_func() - started_ms)
                if callable(perf_now_ms_func)
                else 0
            )
            log_backend_perf_func(
                "ASR",
                payload.get("_perf_trace_id", "asr_pcm"),
                stage="response_sent",
                audio_ms=stats["audio_ms"],
                rms=stats["rms"],
                peak=stats["peak"],
                provider=provider,
                text_chars=len(text),
                total_ms=total_ms,
            )
        send_json_func(response)
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
        # The renderer may intentionally cancel a stale preview/final request
        # when the microphone closes. There is no client left to receive an
        # error response, so avoid a second write to the closed socket.
        return
    except Exception as exc:
        log_backend_exception_func("ASR", exc, extra="/api/asr_pcm failed")
        send_json_func(
            diagnostic_payload_func(exc),
            status=HTTPStatus.INTERNAL_SERVER_ERROR,
        )


def handle_asr_stream_request(
    body,
    *,
    send_json_func,
    load_config_func,
    start_stream_func,
    append_stream_func,
    cancel_stream_func,
    log_backend_exception_func,
):
    payload = body if isinstance(body, dict) else {}
    action = str(payload.get("action", "") or "").strip().lower()
    session_id = str(payload.get("session_id", "") or "").strip()[:96]
    if action not in {"start", "append", "finish", "cancel"}:
        send_json_func({"error": "Unsupported ASR stream action."}, status=HTTPStatus.BAD_REQUEST)
        return
    if not session_id:
        send_json_func({"error": "ASR stream session_id is required."}, status=HTTPStatus.BAD_REQUEST)
        return
    try:
        cfg = load_config_func()
        asr_cfg = cfg.get("asr", {}) if isinstance(cfg, dict) else {}
        if not isinstance(asr_cfg, dict):
            asr_cfg = {}
        if action == "start":
            send_json_func(start_stream_func(session_id, asr_cfg))
            return
        if action == "cancel":
            send_json_func(cancel_stream_func(session_id))
            return
        encoded_audio = payload.get("audio_base64", "")
        if action == "finish" and not str(encoded_audio or "").strip():
            pcm_data, decode_error = b"", ""
        else:
            pcm_data, decode_error = decode_audio_base64(encoded_audio)
        if decode_error:
            send_json_func({"error": decode_error}, status=HTTPStatus.BAD_REQUEST)
            return
        send_json_func(
            append_stream_func(session_id, pcm_data, is_final=action == "finish")
        )
    except Exception as exc:
        log_backend_exception_func("ASR", exc, extra=f"/api/asr_stream {action} failed")
        # Streaming is an enhancement. A model/dependency failure must leave the
        # existing final Vosk request path available instead of failing the mic.
        send_json_func(
            {
                "enabled": False,
                "provider": "vosk",
                "partial_text": "",
                "fallback_used": True,
            }
        )
