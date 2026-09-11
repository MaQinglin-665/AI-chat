import json
import os
import re
import threading
from collections import OrderedDict
from pathlib import Path

try:
    import vosk
except Exception:
    vosk = None

from config import ROOT_DIR, VOSK_MODEL_LARGE_ROOT, VOSK_MODEL_ROOT
from utils import _clamp_int


VOSK_LOCK = threading.Lock()
VOSK_LANGUAGES = ("zh-CN", "en-US")
VOSK_AUTO_SELECTION_MARGIN = 0.08
MAX_VOSK_MODEL_CACHE = 2
_VOSK_MODELS = OrderedDict()


def normalize_vosk_language_mode(value):
    text = str(value or "auto").strip().lower().replace("_", "-")
    if text in {"zh", "zh-cn", "chinese", "cn"}:
        return "zh-CN"
    if text in {"en", "en-us", "english", "us"}:
        return "en-US"
    return "auto"


def resolve_vosk_model_root():
    env_path = str(os.getenv("VOSK_MODEL_PATH", "")).strip()
    if env_path:
        candidate = Path(env_path).expanduser()
        if candidate.exists():
            return candidate
    if VOSK_MODEL_LARGE_ROOT.exists():
        return VOSK_MODEL_LARGE_ROOT
    return VOSK_MODEL_ROOT


def _configured_model_path(value):
    text = str(value or "").strip()
    if not text:
        return None
    candidate = Path(text).expanduser()
    if not candidate.is_absolute():
        candidate = ROOT_DIR / candidate
    return candidate


def _configured_language_path(paths, language):
    if not isinstance(paths, dict):
        return None
    aliases = ("zh-CN", "zh", "cn") if language == "zh-CN" else ("en-US", "en", "us")
    for alias in aliases:
        if alias in paths:
            candidate = _configured_model_path(paths.get(alias))
            if candidate is not None:
                return candidate
    return None


def resolve_vosk_model_paths(asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    configured = cfg.get("vosk_model_paths", {})
    chinese = _configured_language_path(configured, "zh-CN") or resolve_vosk_model_root()
    english = _configured_language_path(configured, "en-US")
    return {"zh-CN": chinese, "en-US": english}


def get_vosk_model_availability(asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    paths = resolve_vosk_model_paths(cfg)
    mode = normalize_vosk_language_mode(cfg.get("input_language_mode", "auto"))
    languages = {}
    for language in VOSK_LANGUAGES:
        path = paths.get(language)
        languages[language] = {
            "configured": path is not None,
            "available": bool(path and path.is_dir()),
            "required": mode == language,
        }
    return {"input_language_mode": mode, "languages": languages}


def _normalize_vosk_text(text):
    normalized = re.sub(r"\s+", " ", str(text or "")).strip()
    if not normalized:
        return ""
    # Keep Latin/mixed-language word boundaries. Only compact spaces between
    # adjacent Han characters or Chinese punctuation.
    normalized = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", normalized)
    normalized = re.sub(
        r"(?<=[\u4e00-\u9fff])\s+(?=[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A\u3001])",
        "",
        normalized,
    )
    normalized = re.sub(
        r"(?<=[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A\u3001])\s+(?=[\u4e00-\u9fff])",
        "",
        normalized,
    )
    return normalized


def _parse_vosk_result(result_json):
    try:
        payload = json.loads(result_json or "{}")
    except Exception:
        payload = {}
    text = _normalize_vosk_text(payload.get("text", ""))
    confidences = []
    direct_confidence = payload.get("confidence")
    try:
        if direct_confidence is not None:
            confidences.append(float(direct_confidence))
    except (TypeError, ValueError):
        pass
    words = payload.get("result", [])
    if isinstance(words, list):
        for word in words:
            if not isinstance(word, dict):
                continue
            try:
                confidence = float(word.get("conf"))
            except (TypeError, ValueError):
                continue
            if 0 <= confidence <= 1:
                confidences.append(confidence)
    confidence = sum(confidences) / len(confidences) if confidences else 0.0
    return text, max(0.0, min(1.0, confidence))


def extract_vosk_text(result_json):
    return _parse_vosk_result(result_json)[0]


def get_vosk_model(model_root=None):
    if vosk is None:
        raise RuntimeError("Vosk is not installed. Run: pip install vosk")
    path = Path(model_root).expanduser() if model_root else resolve_vosk_model_root()
    if not path.is_dir():
        raise RuntimeError(
            "Vosk model directory is unavailable. Install a local Chinese or English Vosk model and configure asr.vosk_model_paths."
        )
    cache_key = str(path.resolve())
    with VOSK_LOCK:
        cached = _VOSK_MODELS.get(cache_key)
        if cached is None:
            cached = vosk.Model(str(path))
            while len(_VOSK_MODELS) >= MAX_VOSK_MODEL_CACHE:
                _VOSK_MODELS.popitem(last=False)
            _VOSK_MODELS[cache_key] = cached
        else:
            _VOSK_MODELS.move_to_end(cache_key)
    return cached


def preload_vosk_models(asr_config=None):
    cfg = asr_config if isinstance(asr_config, dict) else {}
    paths = resolve_vosk_model_paths(cfg)
    mode = normalize_vosk_language_mode(cfg.get("input_language_mode", "auto"))
    languages = (mode,) if mode in VOSK_LANGUAGES else VOSK_LANGUAGES
    loaded = []
    for language in languages:
        path = paths.get(language)
        if not path or not Path(path).is_dir():
            continue
        get_vosk_model(path)
        loaded.append(language)
    return tuple(loaded)


def _transcribe_with_model(pcm16_bytes, sample_rate, model, language):
    recognizer = vosk.KaldiRecognizer(model, float(sample_rate))
    if hasattr(recognizer, "SetWords"):
        recognizer.SetWords(True)
    parts = []
    confidences = []
    chunk_size = 4000
    for idx in range(0, len(pcm16_bytes), chunk_size):
        piece = bytes(pcm16_bytes[idx : idx + chunk_size])
        if recognizer.AcceptWaveform(piece):
            text, confidence = _parse_vosk_result(recognizer.Result())
            if text:
                parts.append(text)
                if confidence > 0:
                    confidences.append(confidence)
    text, confidence = _parse_vosk_result(recognizer.FinalResult())
    if text:
        parts.append(text)
        if confidence > 0:
            confidences.append(confidence)
    joined = _normalize_vosk_text(" ".join(parts))
    return {
        "raw_text": joined,
        "detected_language": language if joined else "",
        "confidence": round(sum(confidences) / len(confidences), 4) if confidences else 0.0,
    }


def _candidate_selection_score(candidate):
    text = str(candidate.get("raw_text", "") or "")
    language = str(candidate.get("detected_language", "") or "")
    try:
        confidence = float(candidate.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    # Vosk may omit word confidences for a model/build. A neutral baseline and
    # a small script fit make selection stable without pretending to splice text.
    score = confidence if confidence > 0 else 0.5
    han_count = len(re.findall(r"[\u4e00-\u9fff]", text))
    latin_words = len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text))
    if language == "zh-CN":
        score += 0.06 if han_count else -0.06
    elif language == "en-US":
        score += 0.06 if latin_words else -0.06
    return score


def _candidate_languages(mode, paths):
    if mode == "zh-CN":
        return ("zh-CN",)
    if mode == "en-US":
        return ("en-US",)
    return tuple(language for language in VOSK_LANGUAGES if paths.get(language) and paths[language].is_dir())


def transcribe_pcm16_with_vosk_result(pcm16_bytes, sample_rate=16000, asr_config=None):
    data = pcm16_bytes if isinstance(pcm16_bytes, (bytes, bytearray)) else b""
    if len(data) < 3200:
        return {
            "raw_text": "",
            "detected_language": "",
            "confidence": 0.0,
            "language_selection_ambiguous": False,
        }
    cfg = asr_config if isinstance(asr_config, dict) else {}
    mode = normalize_vosk_language_mode(cfg.get("input_language_mode", "auto"))
    paths = resolve_vosk_model_paths(cfg)
    if mode == "en-US" and not (paths.get("en-US") and paths["en-US"].is_dir()):
        raise RuntimeError(
            "English Vosk model is unavailable. Set asr.vosk_model_paths.en-US to a local model directory."
        )
    if mode == "zh-CN" and not (paths.get("zh-CN") and paths["zh-CN"].is_dir()):
        raise RuntimeError(
            "Chinese Vosk model is unavailable. Install a local Chinese model under models/vosk or configure VOSK_MODEL_PATH."
        )
    languages = _candidate_languages(mode, paths)
    if not languages:
        if mode == "en-US":
            raise RuntimeError(
                "English Vosk model is unavailable. Set asr.vosk_model_paths.en-US to a local model directory."
            )
        raise RuntimeError(
            "Vosk model not found. Install a local Chinese model under models/vosk or configure VOSK_MODEL_PATH."
        )
    sample_rate = _clamp_int(sample_rate, 16000, 8000, 48000)
    candidates = []
    for language in languages:
        try:
            model = get_vosk_model(paths[language])
        except Exception as exc:
            # Configuration paths are private local state and must not travel
            # back through the API error payload.
            raise RuntimeError(f"Local {language} Vosk model is unavailable or failed to load.") from exc
        try:
            candidate = _transcribe_with_model(data, sample_rate, model, language)
        except Exception as exc:
            raise RuntimeError(f"Local {language} Vosk transcription failed.") from exc
        if candidate["raw_text"]:
            candidates.append(candidate)
    if not candidates:
        return {
            "raw_text": "",
            "detected_language": "",
            "confidence": 0.0,
            "language_selection_ambiguous": False,
        }
    ranked = sorted(
        candidates,
        key=lambda item: (
            _candidate_selection_score(item),
            float(item.get("confidence", 0.0) or 0.0),
            item.get("detected_language") == "zh-CN",
        ),
        reverse=True,
    )
    selected = ranked[0]
    ambiguous = False
    if mode == "auto" and len(ranked) > 1:
        score_gap = _candidate_selection_score(ranked[0]) - _candidate_selection_score(ranked[1])
        if score_gap < VOSK_AUTO_SELECTION_MARGIN:
            ambiguous = True
            # Confidence is not calibrated across models. In an ambiguous auto
            # decision retain the legacy Chinese candidate when present and
            # surface low confidence to the existing confirmation flow.
            selected = next(
                (item for item in ranked if item.get("detected_language") == "zh-CN"),
                selected,
            )
    result = dict(selected)
    result["language_selection_ambiguous"] = ambiguous
    return result


def transcribe_pcm16_with_vosk(pcm16_bytes, sample_rate=16000, asr_config=None):
    return transcribe_pcm16_with_vosk_result(
        pcm16_bytes,
        sample_rate=sample_rate,
        asr_config=asr_config,
    )["raw_text"]


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
