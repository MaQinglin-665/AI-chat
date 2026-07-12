"""Small, public-safe contract for one assistant companion turn.

The chat reply remains the model-owned user-visible text. This module projects
that final text plus allowlisted runtime or deterministic delivery hints into a
stable payload for clients that coordinate subtitle, voice, and Live2D.
"""

from __future__ import annotations

from companion_performance_director import infer_model_direct_performance


CONTRACT_VERSION = 1
VALID_EMOTIONS = {
    "neutral",
    "happy",
    "playful",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "thinking",
}
VALID_ACTIONS = {
    "none",
    "nod",
    "think",
    "happy_idle",
    "wave",
    "shake_head",
    "surprised",
}
VALID_INTENSITIES = {"low", "medium", "high"}
VALID_VOICE_STYLES = {
    "neutral",
    "soft",
    "cheerful",
    "teasing",
    "serious",
    "curious",
    "warm",
}


def is_model_direct_reply_enabled(config) -> bool:
    if not isinstance(config, dict):
        return False
    settings = config.get("character_runtime")
    return isinstance(settings, dict) and settings.get("model_direct_reply") is True


def is_companion_turn_enabled(config) -> bool:
    if not isinstance(config, dict):
        return False
    settings = config.get("companion_turn")
    return isinstance(settings, dict) and settings.get("enabled") is True


def _clean_key(value) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def _normalize_emotion(value) -> str:
    aliases = {
        "idle": "neutral",
        "joy": "happy",
        "cheerful": "happy",
        "teasing": "playful",
        "worry": "anxious",
        "worried": "anxious",
        "nervous": "anxious",
        "curious": "thinking",
        "thoughtful": "thinking",
        "think": "thinking",
        "surprise": "surprised",
        "annoyed": "angry",
    }
    normalized = aliases.get(_clean_key(value), _clean_key(value))
    return normalized if normalized in VALID_EMOTIONS else "neutral"


def _normalize_action(value) -> str:
    aliases = {"ponder": "think", "thinking": "think", "consider": "think"}
    normalized = aliases.get(_clean_key(value), _clean_key(value))
    return normalized if normalized in VALID_ACTIONS else "none"


def _normalize_intensity(value) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if value >= 0.72:
            return "high"
        if value <= 0.34:
            return "low"
        return "medium"
    aliases = {
        "normal": "medium",
        "strong": "high",
        "large": "high",
        "big": "high",
        "excited": "high",
        "intense": "high",
        "soft": "low",
        "small": "low",
        "subtle": "low",
        "calm": "low",
    }
    normalized = aliases.get(_clean_key(value), _clean_key(value))
    return normalized if normalized in VALID_INTENSITIES else "medium"


def _normalize_voice_style(value) -> str:
    normalized = _clean_key(value)
    return normalized if normalized in VALID_VOICE_STYLES else "neutral"


def _select_explicit_performance(runtime_metadata, character_brain):
    candidates = (
        (runtime_metadata, "character_runtime"),
        (character_brain, "character_brain"),
    )
    for raw, source in candidates:
        if not isinstance(raw, dict):
            continue
        fields = {
            "emotion": raw.get("emotion"),
            "action": raw.get("action"),
            "intensity": raw.get("intensity"),
            "voice_style": raw.get("voice_style"),
        }
        if any(value not in (None, "") for value in fields.values()):
            return {
                "emotion": _normalize_emotion(fields["emotion"]),
                "action": _normalize_action(fields["action"]),
                "intensity": _normalize_intensity(fields["intensity"]),
                "voice_style": _normalize_voice_style(fields["voice_style"]),
                "source": source,
            }
    return None


def build_companion_turn(
    config,
    reply_text,
    *,
    turn_id,
    is_auto=False,
    input_modality="text",
    runtime_metadata=None,
    character_brain=None,
):
    """Return an optional public contract without ever changing ``reply_text``."""
    if not is_companion_turn_enabled(config):
        return None

    text = str(reply_text or "")
    if not text.strip():
        return None

    safe_turn_id = str(turn_id or "").strip()[:120] or "companion-turn"
    modality = _clean_key(input_modality) or "text"
    if modality not in {"text", "voice", "auto"}:
        modality = "auto" if is_auto else "text"

    performance = _select_explicit_performance(runtime_metadata, character_brain)
    if performance is None and is_model_direct_reply_enabled(config):
        performance = infer_model_direct_performance(text)
    return {
        "version": CONTRACT_VERSION,
        "id": safe_turn_id,
        "reply_text": text,
        "spoken_text": text,
        "mode": "auto" if is_auto else "reply",
        "input_modality": modality,
        "performance": performance,
        "source": "model_direct" if is_model_direct_reply_enabled(config) else "reply_pipeline",
    }
