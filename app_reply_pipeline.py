"""Reply post-processing helpers for chat routes."""

from __future__ import annotations

from character_brain import merge_brain_runtime_metadata
from character_runtime import (
    emotion_to_live2d_hint,
    looks_like_empty_text_wrapper_fragment,
    looks_like_runtime_metadata_only_text,
    normalize_runtime_payload,
)


def _is_model_direct_reply_enabled(config) -> bool:
    if not isinstance(config, dict):
        return False
    settings = config.get("character_runtime")
    return isinstance(settings, dict) and settings.get("model_direct_reply") is True


def apply_character_runtime_reply(
    config,
    raw_reply,
    *,
    get_character_runtime_settings_func,
    log_backend_exception_func,
):
    if _is_model_direct_reply_enabled(config):
        return raw_reply, None

    settings = get_character_runtime_settings_func(config)
    if not settings.get("enabled", False):
        return raw_reply, None

    fallback_text = raw_reply if isinstance(raw_reply, str) else str(raw_reply or "")
    try:
        normalized = normalize_runtime_payload(raw_reply)
        normalized_text = str(normalized.get("text", "") or "").strip()
        reply_text = normalized_text
        if not reply_text:
            fallback_normalized = normalize_runtime_payload(fallback_text)
            fallback_visible_text = str(fallback_normalized.get("text", "") or "").strip()
            if fallback_visible_text:
                reply_text = fallback_visible_text
            elif looks_like_runtime_metadata_only_text(
                fallback_text
            ) or looks_like_empty_text_wrapper_fragment(fallback_text):
                reply_text = ""
            else:
                reply_text = fallback_text
        runtime_meta = None
        if settings.get("return_metadata", False):
            emotion = str(normalized.get("emotion", "neutral") or "neutral").strip().lower() or "neutral"
            voice_style = (
                str(normalized.get("voice_style", "neutral") or "neutral").strip().lower() or "neutral"
            )
            action = str(normalized.get("action", "none") or "none").strip().lower() or "none"
            intensity = str(normalized.get("intensity", "normal") or "normal").strip().lower() or "normal"
            runtime_meta = {
                "emotion": emotion,
                "action": action,
                "intensity": intensity,
                "live2d_hint": str(normalized.get("live2d_hint") or emotion_to_live2d_hint(emotion)),
                "voice_style": voice_style,
            }
            runtime_meta = merge_brain_runtime_metadata(
                runtime_meta,
                config.get("_character_brain_decision") if isinstance(config, dict) else None,
            )
        return reply_text, runtime_meta
    except Exception as exc:
        log_backend_exception_func(
            "CHAR_RUNTIME",
            exc,
            extra="normalize runtime payload failed; fallback to raw reply",
        )
        return fallback_text, None


def apply_character_brain_reply_text(
    config,
    user_message,
    reply,
    *,
    apply_character_brain_reply_constraints_func,
    enforce_reply_language_func,
):
    if not isinstance(config, dict):
        return str(reply or "")
    if _is_model_direct_reply_enabled(config):
        return str(reply or "")
    decision = config.get("_character_brain_decision") or config.get(
        "_character_brain_response_decision"
    )
    constrained = apply_character_brain_reply_constraints_func(
        reply,
        decision,
        user_message=user_message,
    )
    enforced = enforce_reply_language_func(config, user_message, constrained)
    if enforced != constrained:
        return apply_character_brain_reply_constraints_func(
            enforced,
            decision,
            user_message=user_message,
        )
    return enforced
