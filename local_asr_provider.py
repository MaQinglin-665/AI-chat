import base64
import io
import importlib.util
import json
import os
import re
import threading
import time
import uuid
import wave
from collections import OrderedDict
from pathlib import Path
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from asr import transcribe_pcm16_with_vosk_result


FUNASR_MODEL_LOCK = threading.Lock()
FUNASR_SESSION_LOCK = threading.Lock()
FUNASR_MODELS = {}
FUNASR_MODEL_FAILURES = {}
FUNASR_STREAM_SESSIONS = OrderedDict()
MAX_FUNASR_STREAM_SESSIONS = 4
FUNASR_STREAM_SESSION_TTL_SEC = 120
FUNASR_MODEL_FAILURE_RETRY_SEC = 120
SENSEVOICE_LANGUAGE_TAGS = {"zh", "en", "yue", "ja", "ko", "auto"}
SENSEVOICE_EMOTION_TAGS = {
    "angry",
    "disgusted",
    "fearful",
    "happy",
    "neutral",
    "sad",
    "surprised",
    "unknown",
}
SENSEVOICE_CONTROL_TAGS = {"withitn", "woitn", "itn"}
SUSPICIOUS_NONSPEECH_TRANSCRIPT_RE = re.compile(
    r"(?i)^(?:字幕|本字幕|字幕由|subtitle(?:s)?\s+by|captions?\s+by|"
    r"感谢观看|谢谢观看|thanks?\s+for\s+watching)"
)
SENSEVOICE_SERVICE_DEFAULT_URL = "http://127.0.0.1:9890"


def normalize_asr_provider(value):
    text = str(value or "auto").strip().lower().replace("-", "_")
    if text in {"funasr", "hybrid", "funasr_hybrid", "sensevoice", "paraformer"}:
        return "funasr_hybrid"
    if text in {"vosk", "legacy", "local_vosk"}:
        return "vosk"
    return "auto"


def get_local_asr_capability(asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    provider = normalize_asr_provider(cfg.get("provider", "auto"))
    funasr_installed = importlib.util.find_spec("funasr") is not None
    torch_installed = importlib.util.find_spec("torch") is not None
    enabled = provider != "vosk" and funasr_installed and torch_installed
    return {
        "provider": provider,
        "funasr_installed": bool(funasr_installed),
        "torch_installed": bool(torch_installed),
        "hybrid_available": bool(enabled),
        "streaming_available": bool(enabled and cfg.get("streaming_enabled", True) is not False),
        "final_refine_available": bool(enabled and cfg.get("final_refine_enabled", True) is not False),
    }


def _resolve_device(asr_config):
    requested = str(asr_config.get("funasr_device", "auto") or "auto").strip().lower()
    if requested in {"cpu", "cuda"}:
        return requested
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def _create_funasr_model(model_name, device):
    from funasr import AutoModel

    resolved_model = str(model_name or "").strip()
    if resolved_model and not Path(resolved_model).expanduser().is_dir():
        cache_root = Path(
            os.environ.get(
                "MODELSCOPE_CACHE",
                Path.home() / ".cache" / "modelscope" / "hub" / "models",
            )
        )
        cached_candidate = cache_root.joinpath(*resolved_model.split("/"))
        if cached_candidate.is_dir():
            resolved_model = str(cached_candidate)
    return AutoModel(
        model=resolved_model,
        device=device,
        disable_update=True,
        ncpu=2,
    )


def _load_funasr_model(kind, asr_config):
    if kind not in {"final", "streaming"}:
        raise RuntimeError("Unsupported local ASR model kind.")
    capability = get_local_asr_capability(asr_config)
    if not capability["hybrid_available"]:
        raise RuntimeError("FunASR local dependencies are unavailable.")
    model_key = "funasr_final_model" if kind == "final" else "funasr_streaming_model"
    default_model = "iic/SenseVoiceSmall" if kind == "final" else "paraformer-zh-streaming"
    model_name = str(asr_config.get(model_key, default_model) or default_model).strip()
    device = _resolve_device(asr_config)
    cache_key = (kind, model_name, device)
    with FUNASR_MODEL_LOCK:
        model = FUNASR_MODELS.get(cache_key)
        if model is not None:
            return model
        failed_at = float(FUNASR_MODEL_FAILURES.get(cache_key, 0.0) or 0.0)
        try:
            retry_after = float(
                asr_config.get(
                    "funasr_model_failure_retry_sec",
                    FUNASR_MODEL_FAILURE_RETRY_SEC,
                )
                or FUNASR_MODEL_FAILURE_RETRY_SEC
            )
        except (TypeError, ValueError):
            retry_after = FUNASR_MODEL_FAILURE_RETRY_SEC
        retry_after = max(15.0, min(900.0, retry_after))
        if failed_at and time.monotonic() - failed_at < retry_after:
            raise RuntimeError(
                f"FunASR {kind} model is cooling down after a failed load."
            )
        try:
            model = _create_funasr_model(model_name, device)
        except Exception as exc:
            FUNASR_MODEL_FAILURES[cache_key] = time.monotonic()
            raise RuntimeError(f"FunASR {kind} model failed to load on {device}.") from exc
        FUNASR_MODEL_FAILURES.pop(cache_key, None)
        FUNASR_MODELS[cache_key] = model
        return model


def preload_funasr_final_model(asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    return _load_funasr_model("final", cfg)


def _pcm16_to_float32(pcm16_bytes):
    try:
        import numpy as np
    except Exception as exc:
        raise RuntimeError("NumPy is required for local FunASR.") from exc
    data = pcm16_bytes if isinstance(pcm16_bytes, (bytes, bytearray)) else b""
    if len(data) < 2:
        return np.zeros((0,), dtype=np.float32)
    usable = len(data) - (len(data) % 2)
    return np.frombuffer(bytes(data[:usable]), dtype="<i2").astype(np.float32) / 32768.0


def _clean_funasr_text(value):
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        from funasr.utils.postprocess_utils import rich_transcription_postprocess

        text = rich_transcription_postprocess(text)
    except Exception:
        text = re.sub(r"<\|[^|]+\|>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    return text


def _analyze_paralinguistic_audio(pcm16_bytes, sample_rate=16000):
    audio = _pcm16_to_float32(pcm16_bytes)
    if audio.size < max(800, int(float(sample_rate or 16000) * 0.05)):
        return {
            "voiced": False,
            "voiced_ratio": 0.0,
            "pitch_stability": 0.0,
            "energy": 0.0,
        }
    try:
        import numpy as np

        rate = max(8000, min(48000, int(sample_rate or 16000)))
        frame_size = max(320, int(rate * 0.04))
        hop = max(160, int(rate * 0.02))
        min_lag = max(1, int(rate / 420))
        max_lag = min(frame_size - 2, int(rate / 70))
        periodicities = []
        pitches = []
        for start in range(0, max(1, audio.size - frame_size + 1), hop):
            frame = audio[start : start + frame_size]
            if frame.size < frame_size:
                break
            frame = frame - float(np.mean(frame))
            rms = float(np.sqrt(np.mean(frame * frame)))
            if rms < 0.004:
                continue
            windowed = frame * np.hanning(frame.size)
            corr = np.correlate(windowed, windowed, mode="full")[frame.size - 1 :]
            base = float(corr[0]) if corr.size else 0.0
            if base <= 1e-8 or max_lag <= min_lag:
                continue
            region = corr[min_lag : max_lag + 1]
            offset = int(np.argmax(region))
            lag = min_lag + offset
            periodicity = max(0.0, min(1.0, float(corr[lag]) / base))
            periodicities.append(periodicity)
            if periodicity >= 0.45:
                pitches.append(rate / lag)
        voiced_frames = [value for value in periodicities if value >= 0.45]
        voiced_ratio = len(voiced_frames) / max(1, len(periodicities))
        pitch_stability = 0.0
        if len(pitches) >= 2:
            mean_pitch = float(np.mean(pitches))
            if mean_pitch > 0:
                pitch_stability = max(
                    0.0,
                    min(1.0, 1.0 - float(np.std(pitches)) / mean_pitch),
                )
        return {
            "voiced": voiced_ratio >= 0.35,
            "voiced_ratio": round(voiced_ratio, 3),
            "pitch_stability": round(pitch_stability, 3),
            "energy": round(float(np.sqrt(np.mean(audio * audio))), 6),
        }
    except Exception:
        return {
            "voiced": False,
            "voiced_ratio": 0.0,
            "pitch_stability": 0.0,
            "energy": 0.0,
        }


def _extract_sensevoice_result(result, pcm16_bytes=b"", sample_rate=16000):
    item = result[0] if isinstance(result, list) and result else result
    raw = item.get("text", "") if isinstance(item, dict) else item
    raw_text = str(raw or "").strip()
    tags = [
        str(tag or "").strip()
        for tag in re.findall(r"<\|([^|]+)\|>", raw_text)
        if str(tag or "").strip()
    ]
    lowered = [tag.lower() for tag in tags]
    language = next((tag for tag in lowered if tag in SENSEVOICE_LANGUAGE_TAGS), "")
    emotion = next((tag for tag in lowered if tag in SENSEVOICE_EMOTION_TAGS), "")
    events = []
    for tag, key in zip(tags, lowered):
        if (
            key in SENSEVOICE_LANGUAGE_TAGS
            or key in SENSEVOICE_EMOTION_TAGS
            or key in SENSEVOICE_CONTROL_TAGS
        ):
            continue
        normalized = re.sub(r"[^a-z0-9_-]+", "_", key).strip("_")
        if normalized and normalized not in events:
            events.append(normalized)
    text = re.sub(r"<\|[^|]+\|>", "", raw_text)
    text = re.sub(r"^[😀🤧😷👏😭🎼]+|[😮😡😰😔😊🤢]+$", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    audio_features = _analyze_paralinguistic_audio(
        pcm16_bytes,
        sample_rate=sample_rate,
    )
    speech_only = not text and (
        "speech" in events
        or audio_features.get("voiced") is True
    )
    cue_type = ""
    if not text:
        if "laughter" in events:
            cue_type = "laughter"
        elif "crying" in events:
            cue_type = "crying"
        elif "cough" in events:
            cue_type = "cough"
        elif "sneeze" in events:
            cue_type = "sneeze"
        elif "breath" in events:
            cue_type = "breath"
        elif speech_only:
            cue_type = "nonverbal_vocalization"
    if (
        text
        and SUSPICIOUS_NONSPEECH_TRANSCRIPT_RE.search(text)
        and audio_features.get("voiced_ratio", 0.0) >= 0.55
        and audio_features.get("pitch_stability", 0.0) >= 0.72
    ):
        text = ""
        cue_type = "nonverbal_vocalization"
    non_speech_events = {
        event
        for event in events
        if event not in {"speech"}
    }
    semantic_chars = len(re.sub(r"[\s\W_]+", "", text, flags=re.UNICODE))
    if (
        text
        and non_speech_events
        and audio_features.get("voiced_ratio", 0.0) >= 0.7
        and audio_features.get("pitch_stability", 0.0) >= 0.82
        and semantic_chars <= 3
    ):
        text = ""
        cue_type = cue_type or "nonverbal_vocalization"
    paralinguistic = {
        "emotion": emotion or "unknown",
        "events": events[:6],
        "cue_type": cue_type,
        "voiced": audio_features.get("voiced") is True,
        "voiced_ratio": audio_features.get("voiced_ratio", 0.0),
        "pitch_stability": audio_features.get("pitch_stability", 0.0),
    }
    meaningful = bool(
        cue_type
        or (emotion and emotion not in {"neutral", "unknown"})
        or any(event not in {"speech"} for event in events)
    )
    paralinguistic["meaningful"] = meaningful
    return {
        "text": text,
        "language": language,
        "paralinguistic": paralinguistic,
    }


def _extract_funasr_text(result):
    item = result[0] if isinstance(result, list) and result else result
    if isinstance(item, dict):
        return _clean_funasr_text(item.get("text", ""))
    return _clean_funasr_text(item)


def _detect_text_language(text):
    value = str(text or "")
    han = len(re.findall(r"[\u4e00-\u9fff]", value))
    latin = len(re.findall(r"[A-Za-z]", value))
    if han:
        return "zh-CN"
    if latin:
        return "en-US"
    return ""


def _resolve_sensevoice_service_url(asr_config, path="/v1/audio/transcriptions"):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    if cfg.get("sensevoice_service_enabled", True) is False:
        return ""
    raw = str(
        cfg.get("sensevoice_service_url", SENSEVOICE_SERVICE_DEFAULT_URL)
        or SENSEVOICE_SERVICE_DEFAULT_URL
    ).strip().rstrip("/")
    parsed = urllib_parse.urlparse(raw)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("SenseVoice service must use a loopback HTTP address.")
    if parsed.path.endswith(path):
        return raw
    return f"{raw}{path}"


def get_sensevoice_service_status(asr_config=None, timeout_sec=0.8):
    endpoint = _resolve_sensevoice_service_url(asr_config, path="/health")
    if not endpoint:
        return {"available": False, "ready": False, "status": "disabled"}
    req = urllib_request.Request(endpoint, method="GET")
    try:
        with urllib_request.urlopen(
            req,
            timeout=max(0.2, min(3.0, float(timeout_sec or 0.8))),
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return {"available": False, "ready": False, "status": "offline"}
    status = str(payload.get("status", "") or "").strip().lower()
    return {
        "available": True,
        "ready": payload.get("ready") is True,
        "status": status if status in {"starting", "warming", "ready", "error"} else "starting",
        "error": str(payload.get("error", "") or "")[:80],
    }


def transcribe_pcm16_with_sensevoice_service_result(
    pcm16_bytes,
    sample_rate=16000,
    asr_config=None,
):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    endpoint = _resolve_sensevoice_service_url(cfg)
    if not endpoint:
        raise RuntimeError("SenseVoice service is disabled.")
    encoded = base64.b64encode(bytes(pcm16_bytes or b"")).decode("ascii")
    body = json.dumps(
        {
            "audio_base64": encoded,
            "sample_rate": max(8000, min(48000, int(sample_rate or 16000))),
            "input_language_mode": str(
                cfg.get("input_language_mode", "auto") or "auto"
            )[:12],
        }
    ).encode("utf-8")
    req = urllib_request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout_sec = max(
        1.0,
        min(30.0, float(cfg.get("sensevoice_service_timeout_sec", 8) or 8)),
    )
    try:
        with urllib_request.urlopen(req, timeout=timeout_sec) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError("Persistent SenseVoice service is not ready.") from exc
    raw_text = re.sub(r"\s+", " ", str(payload.get("raw_text", "") or "")).strip()
    result = {
        "raw_text": raw_text,
        "detected_language": str(payload.get("detected_language", "") or "")
        if str(payload.get("detected_language", "") or "") in {"zh-CN", "en-US"}
        else _detect_text_language(raw_text),
        "confidence": 0.0,
        "language_selection_ambiguous": False,
        "provider": "sensevoice",
        "fallback_used": False,
    }
    if isinstance(payload.get("paralinguistic"), dict):
        result["paralinguistic"] = payload["paralinguistic"]
    return result


def _resolve_whisper_fallback_url(asr_config):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    if cfg.get("whisper_fallback_enabled", False) is not True:
        return ""
    raw = str(cfg.get("whisper_fallback_url", "") or "").strip().rstrip("/")
    if not raw:
        return ""
    parsed = urllib_parse.urlparse(raw)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("Whisper fallback must use a loopback HTTP service.")
    if parsed.path.endswith("/audio/transcriptions"):
        return raw
    return f"{raw}/v1/audio/transcriptions"


def _pcm16_wav_bytes(pcm16_bytes, sample_rate):
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(max(8000, min(48000, int(sample_rate or 16000))))
        wav_file.writeframes(bytes(pcm16_bytes or b""))
    return output.getvalue()


def transcribe_pcm16_with_whisper_service_result(
    pcm16_bytes,
    sample_rate=16000,
    asr_config=None,
):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    endpoint = _resolve_whisper_fallback_url(cfg)
    if not endpoint:
        raise RuntimeError("Local Whisper fallback is disabled.")
    boundary = f"----TaffyASR{uuid.uuid4().hex}"
    wav_bytes = _pcm16_wav_bytes(pcm16_bytes, sample_rate)
    language_mode = str(cfg.get("input_language_mode", "auto") or "auto").lower()
    language = "en" if language_mode.startswith("en") else "zh"
    fields = (
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="model"\r\n\r\n'
            "local-whisper\r\n"
        ).encode("utf-8")
        + (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="language"\r\n\r\n'
            f"{language}\r\n"
        ).encode("utf-8")
        + (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="file"; filename="speech.wav"\r\n'
            "Content-Type: audio/wav\r\n\r\n"
        ).encode("utf-8")
        + wav_bytes
        + f"\r\n--{boundary}--\r\n".encode("utf-8")
    )
    timeout_sec = max(3.0, min(60.0, float(cfg.get("whisper_fallback_timeout_sec", 20) or 20)))
    req = urllib_request.Request(
        endpoint,
        data=fields,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=timeout_sec) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError("Local Whisper fallback transcription failed.") from exc
    text = re.sub(r"\s+", " ", str(payload.get("text", "") or "")).strip()
    return {
        "raw_text": text,
        "detected_language": _detect_text_language(text),
        "confidence": 0.0,
        "language_selection_ambiguous": False,
        "provider": "whisper",
        "fallback_used": True,
    }


def transcribe_pcm16_with_sensevoice_result(pcm16_bytes, sample_rate=16000, asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    audio = _pcm16_to_float32(pcm16_bytes)
    if audio.size < max(800, int(float(sample_rate or 16000) * 0.05)):
        return {
            "raw_text": "",
            "detected_language": "",
            "confidence": 0.0,
            "language_selection_ambiguous": False,
            "provider": "sensevoice",
            "fallback_used": False,
        }
    model = _load_funasr_model("final", cfg)
    language_mode = str(cfg.get("input_language_mode", "auto") or "auto").lower()
    language = "zh" if language_mode.startswith("zh") else ("en" if language_mode.startswith("en") else "auto")
    try:
        batch_size_s = max(
            4,
            min(30, int(cfg.get("funasr_batch_size_s", 12) or 12)),
        )
        result = model.generate(
            input=audio,
            cache={},
            language=language,
            use_itn=True,
            batch_size_s=batch_size_s,
        )
    except Exception as exc:
        raise RuntimeError("SenseVoiceSmall transcription failed.") from exc
    extracted = _extract_sensevoice_result(
        result,
        pcm16_bytes=pcm16_bytes,
        sample_rate=sample_rate,
    )
    text = extracted["text"]
    return {
        "raw_text": text,
        "detected_language": _detect_text_language(text),
        "confidence": 0.0,
        "language_selection_ambiguous": False,
        "provider": "sensevoice",
        "fallback_used": False,
        "paralinguistic": extracted["paralinguistic"],
    }


def transcribe_pcm16_with_local_fallback_result(pcm16_bytes, sample_rate=16000, asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    provider = normalize_asr_provider(cfg.get("provider", "auto"))
    if provider != "vosk" and cfg.get("final_refine_enabled", True) is not False:
        if cfg.get("sensevoice_service_enabled", True) is not False:
            try:
                return transcribe_pcm16_with_sensevoice_service_result(
                    pcm16_bytes,
                    sample_rate=sample_rate,
                    asr_config=cfg,
                )
            except Exception:
                # A cold or unavailable persistent service must never make the
                # microphone wait for an in-process model load. Vosk remains
                # the immediate compatibility fallback until the service is ready.
                pass
        else:
            try:
                return transcribe_pcm16_with_sensevoice_result(
                    pcm16_bytes,
                    sample_rate=sample_rate,
                    asr_config=cfg,
                )
            except Exception:
                pass
    vosk_error = None
    try:
        result = transcribe_pcm16_with_vosk_result(
            pcm16_bytes,
            sample_rate=sample_rate,
            asr_config=cfg,
        )
    except Exception as exc:
        vosk_error = exc
        result = {"raw_text": ""}
    if not str(result.get("raw_text", "") or "").strip() and _resolve_whisper_fallback_url(cfg):
        try:
            return transcribe_pcm16_with_whisper_service_result(
                pcm16_bytes,
                sample_rate=sample_rate,
                asr_config=cfg,
            )
        except Exception:
            if vosk_error is not None:
                raise vosk_error
    if vosk_error is not None:
        raise vosk_error
    result = dict(result)
    result["provider"] = "vosk"
    result["fallback_used"] = provider != "vosk"
    return result


def _cleanup_stale_stream_sessions(now=None):
    current = float(now if now is not None else time.monotonic())
    stale = [
        session_id
        for session_id, session in FUNASR_STREAM_SESSIONS.items()
        if current - float(session.get("updated_at", current)) > FUNASR_STREAM_SESSION_TTL_SEC
    ]
    for session_id in stale:
        FUNASR_STREAM_SESSIONS.pop(session_id, None)


def start_funasr_stream_session(session_id, asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    safe_session_id = str(session_id or "").strip()[:96]
    if not safe_session_id:
        raise ValueError("ASR stream session_id is required.")
    capability = get_local_asr_capability(cfg)
    if not capability["streaming_available"]:
        return {"enabled": False, "provider": "vosk", "partial_text": ""}
    model = _load_funasr_model("streaming", cfg)
    now = time.monotonic()
    with FUNASR_SESSION_LOCK:
        _cleanup_stale_stream_sessions(now)
        while len(FUNASR_STREAM_SESSIONS) >= MAX_FUNASR_STREAM_SESSIONS:
            FUNASR_STREAM_SESSIONS.popitem(last=False)
        FUNASR_STREAM_SESSIONS[safe_session_id] = {
            "model": model,
            "cache": {},
            "parts": [],
            "updated_at": now,
            "config": dict(cfg),
        }
    return {"enabled": True, "provider": "paraformer", "partial_text": ""}


def append_funasr_stream_audio(session_id, pcm16_bytes, *, is_final=False):
    safe_session_id = str(session_id or "").strip()[:96]
    with FUNASR_SESSION_LOCK:
        session = FUNASR_STREAM_SESSIONS.get(safe_session_id)
    if not session:
        return {"enabled": False, "provider": "vosk", "partial_text": ""}
    audio = _pcm16_to_float32(pcm16_bytes)
    if audio.size:
        cfg = session["config"]
        chunk_size = cfg.get("funasr_chunk_size", [0, 10, 5])
        if not isinstance(chunk_size, list) or len(chunk_size) != 3:
            chunk_size = [0, 10, 5]
        try:
            with FUNASR_MODEL_LOCK:
                result = session["model"].generate(
                    input=audio,
                    cache=session["cache"],
                    is_final=bool(is_final),
                    chunk_size=chunk_size,
                    encoder_chunk_look_back=4,
                    decoder_chunk_look_back=1,
                )
            delta = _extract_funasr_text(result)
        except Exception as exc:
            with FUNASR_SESSION_LOCK:
                FUNASR_STREAM_SESSIONS.pop(safe_session_id, None)
            raise RuntimeError("Paraformer streaming transcription failed.") from exc
        if delta:
            session["parts"].append(delta)
    session["updated_at"] = time.monotonic()
    text = _clean_funasr_text(" ".join(session["parts"]))
    if is_final:
        with FUNASR_SESSION_LOCK:
            FUNASR_STREAM_SESSIONS.pop(safe_session_id, None)
    return {
        "enabled": True,
        "provider": "paraformer",
        "partial_text": text,
        "final": bool(is_final),
    }


def cancel_funasr_stream_session(session_id):
    safe_session_id = str(session_id or "").strip()[:96]
    with FUNASR_SESSION_LOCK:
        removed = FUNASR_STREAM_SESSIONS.pop(safe_session_id, None)
    return {"enabled": bool(removed), "provider": "paraformer", "partial_text": ""}
