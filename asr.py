import json
import re
import threading
import os
from pathlib import Path

try:
    import vosk
except Exception:
    vosk = None

from config import VOSK_MODEL_LARGE_ROOT, VOSK_MODEL_ROOT
from utils import _clamp_int

VOSK_LOCK = threading.Lock()

_VOSK_MODEL = None

def resolve_vosk_model_root():
    env_path = str(os.getenv("VOSK_MODEL_PATH", "")).strip()
    if env_path:
        p = Path(env_path).expanduser()
        if p.exists():
            return p
    if VOSK_MODEL_LARGE_ROOT.exists():
        return VOSK_MODEL_LARGE_ROOT
    return VOSK_MODEL_ROOT

def extract_vosk_text(result_json):
    try:
        payload = json.loads(result_json or "{}")
    except Exception:
        payload = {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return ""
    normalized = re.sub(r"\s+", " ", text).strip()
    # Chinese output from Vosk is often cleaner without spaces.
    if re.search(r"[\u4e00-\u9fff]", normalized):
        normalized = normalized.replace(" ", "")
    return normalized

def get_vosk_model():
    global _VOSK_MODEL
    if vosk is None:
        raise RuntimeError("Vosk is not installed. Run: pip install vosk")
    if _VOSK_MODEL is not None:
        return _VOSK_MODEL
    model_root = resolve_vosk_model_root()
    if not model_root.exists():
        raise RuntimeError(
            "Vosk model not found. Expected path: "
            f"{model_root}. Please download vosk-model-cn-0.22 or vosk-model-small-cn-0.22."
        )
    with VOSK_LOCK:
        if _VOSK_MODEL is None:
            _VOSK_MODEL = vosk.Model(str(model_root))
    return _VOSK_MODEL

def transcribe_pcm16_with_vosk(pcm16_bytes, sample_rate=16000):
    data = pcm16_bytes if isinstance(pcm16_bytes, (bytes, bytearray)) else b""
    if len(data) < 3200:
        return ""
    sr = _clamp_int(sample_rate, 16000, 8000, 48000)
    model = get_vosk_model()
    rec = vosk.KaldiRecognizer(model, float(sr))
    rec.SetWords(False)
    parts = []
    chunk_size = 4000
    for idx in range(0, len(data), chunk_size):
        piece = bytes(data[idx : idx + chunk_size])
        if rec.AcceptWaveform(piece):
            seg = extract_vosk_text(rec.Result())
            if seg:
                parts.append(seg)
    final_seg = extract_vosk_text(rec.FinalResult())
    if final_seg:
        parts.append(final_seg)
    if not parts:
        return ""
    return "".join(parts)

def guess_audio_content_type(audio_bytes):
    if not isinstance(audio_bytes, (bytes, bytearray)) or len(audio_bytes) < 12:
        return "application/octet-stream"
    data = bytes(audio_bytes)
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio/wav"
    if data[:4] == b"OggS":
        return "audio/ogg"
    if data[:4] == b"fLaC":
        return "audio/flac"
    if data[:3] == b"ID3" or data[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
        return "audio/mpeg"
    return "application/octet-stream"
