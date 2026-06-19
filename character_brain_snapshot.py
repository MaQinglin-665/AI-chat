from __future__ import annotations

from typing import Any, Dict, Optional


def _call(deps: Dict[str, Any], name: str, *args: Any, **kwargs: Any) -> Any:
    func = deps.get(name)
    if not callable(func):
        raise KeyError(f"Missing character brain snapshot dependency: {name}")
    return func(*args, **kwargs)


def _safe_int(deps: Dict[str, Any], value: Any, default: int = 0) -> int:
    return int(_call(deps, "safe_int", value, default))


def _clean_text(deps: Dict[str, Any], value: Any, max_len: int = 180) -> str:
    return str(_call(deps, "clean_text", value, max_len))


def _feedback_effects(deps: Dict[str, Any], experience_profile: Optional[Dict[str, Any]]) -> list[str]:
    flags = _call(deps, "experience_flags", experience_profile)
    flags = flags if isinstance(flags, dict) else {}
    effects = []
    if flags.get("prefer_short"):
        effects.append("shorter_replies")
    if flags.get("avoid_generic"):
        effects.append("less_generic_tone")
    if flags.get("lower_motion"):
        effects.append("lower_motion_intensity")
    if flags.get("raise_motion"):
        effects.append("more_visible_motion")
    if flags.get("voice_care"):
        effects.append("voice_style_care")
    return effects[:5]


def _build_performance_execution(deps: Dict[str, Any], decision: Dict[str, Any]) -> Dict[str, Any]:
    raw_execution = (
        decision.get("performance_execution")
        if isinstance(decision.get("performance_execution"), dict)
        else {}
    )
    return {
        "reply_shape": _call(
            deps,
            "normalize_reply_shape",
            raw_execution.get("reply_shape") or decision.get("reply_shape"),
        ),
        "question_policy": _call(
            deps,
            "normalize_question_policy",
            raw_execution.get("question_policy") or decision.get("question_policy"),
        ),
        "removed_followup": raw_execution.get("removed_followup") is True,
        "removed_unsafe_bit": raw_execution.get("removed_unsafe_bit") is True,
        "removed_context_bleed": raw_execution.get("removed_context_bleed") is True,
        "shortened": raw_execution.get("shortened") is True,
        "used_bit": raw_execution.get("used_bit") is True,
        "final_sentences": max(0, min(8, _safe_int(deps, raw_execution.get("final_sentences"), 0))),
        "stage_callback_added": raw_execution.get("stage_callback_added") is True,
        "stage_callback_suppressed": _clean_text(deps, raw_execution.get("stage_callback_suppressed"), 48),
        "stage_callback_bit": _clean_text(deps, raw_execution.get("stage_callback_bit"), 48),
        "quality_score": max(0, min(100, _safe_int(deps, raw_execution.get("quality_score"), 100))),
        "quality_issues": [
            _clean_text(deps, item, 48)
            for item in (raw_execution.get("quality_issues") if isinstance(raw_execution.get("quality_issues"), list) else [])[:8]
            if _clean_text(deps, item, 48)
        ],
        "quality_repair_actions": [
            _clean_text(deps, item, 48)
            for item in (raw_execution.get("quality_repair_actions") if isinstance(raw_execution.get("quality_repair_actions"), list) else [])[:8]
            if _clean_text(deps, item, 48)
        ],
    }


def _thought_burst_snapshot(deps: Dict[str, Any], decision: Dict[str, Any]) -> Dict[str, Any]:
    thought = decision.get("thought_burst")
    if not isinstance(thought, dict):
        return {}
    return {
        "thought_type": _clean_text(deps, thought.get("thought_type"), 40),
        "length_budget": _clean_text(deps, thought.get("length_budget"), 48),
        "min_sentences": max(0, min(4, _safe_int(deps, thought.get("min_sentences"), 0))),
        "max_sentences": max(0, min(4, _safe_int(deps, thought.get("max_sentences"), 0))),
        "stance": _clean_text(deps, thought.get("stance"), 48),
        "burst_reason": _clean_text(deps, thought.get("burst_reason"), 48),
    }


def build_public_snapshot(
    decision: Optional[Dict[str, Any]],
    *,
    experience_profile: Optional[Dict[str, Any]] = None,
    session_state: Optional[Dict[str, Any]] = None,
    deps: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not isinstance(decision, dict):
        return None
    return {
        "version": 1,
        "intent": _clean_text(deps, decision.get("intent"), 40),
        "reply_style": _clean_text(deps, decision.get("reply_style"), 40),
        "style_beat": _clean_text(deps, decision.get("style_beat"), 48),
        "reaction_mode": _clean_text(deps, decision.get("reaction_mode"), 48),
        "banter_level": max(0, min(3, _safe_int(deps, decision.get("banter_level"), 0))),
        "opening_move": _call(deps, "normalize_opening_move", decision.get("opening_move")),
        "reply_shape": _call(deps, "normalize_reply_shape", decision.get("reply_shape")),
        "spontaneity": max(0, min(3, _safe_int(deps, decision.get("spontaneity"), 0))),
        "question_policy": _call(deps, "normalize_question_policy", decision.get("question_policy")),
        "performance_bit": _clean_text(deps, decision.get("performance_bit"), 48),
        "energy": _clean_text(deps, decision.get("energy"), 24),
        "attention": _clean_text(deps, decision.get("attention"), 24),
        "relationship": _clean_text(deps, decision.get("relationship"), 40),
        "max_sentences": max(1, min(8, int(decision.get("max_sentences") or 3))),
        "input_modality": _call(deps, "input_modality", {"_input_modality": decision.get("input_modality")}),
        "asr_status": _call(
            deps,
            "public_asr_status",
            {"_conversation_context": {"asr": decision.get("asr_status")}},
        ),
        "emotion": _call(deps, "normalize_emotion", decision.get("emotion")),
        "action": _call(deps, "normalize_action", decision.get("action")),
        "intensity": _call(deps, "normalize_intensity", decision.get("intensity")),
        "voice_style": _clean_text(deps, decision.get("voice_style"), 32).lower() or "neutral",
        "thought_burst": _thought_burst_snapshot(deps, decision),
        "performance_execution": _build_performance_execution(deps, decision),
        "reply_quality": _call(deps, "public_reply_quality", decision.get("reply_quality")),
        "output_constraints": _call(deps, "public_output_constraints", decision.get("output_constraints")),
        "topic_reference": _call(
            deps,
            "public_topic_reference",
            decision.get("topic_reference") if isinstance(decision.get("topic_reference"), dict) else {},
        ),
        "barge_in_policy": _call(
            deps,
            "public_barge_in_policy",
            decision.get("barge_in_policy") if isinstance(decision.get("barge_in_policy"), dict) else {},
        ),
        "topic_stack": _call(
            deps,
            "public_topic_stack",
            session_state if isinstance(session_state, dict) else decision.get("topic_stack"),
        ),
        "conversation_director": _call(
            deps,
            "public_conversation_director",
            decision.get("conversation_director") if isinstance(decision.get("conversation_director"), dict) else {},
        ),
        "improv": _call(
            deps,
            "public_improv_director",
            decision.get("improv") if isinstance(decision.get("improv"), dict) else {},
        ),
        "stage_memory": _call(
            deps,
            "public_stage_memory",
            session_state
            if isinstance(session_state, dict)
            else decision.get("stage_memory") or decision.get("continuity"),
        ),
        "safety_clamp": _call(
            deps,
            "public_safety_clamp",
            decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {},
        ),
        "motion_director": _call(
            deps,
            "public_motion_director",
            decision.get("motion_director") if isinstance(decision.get("motion_director"), dict) else {},
        ),
        "voice_director": _call(
            deps,
            "public_voice_director",
            decision.get("voice_director") if isinstance(decision.get("voice_director"), dict) else {},
        ),
        "feedback_effects": _feedback_effects(deps, experience_profile),
        "continuity": _call(
            deps,
            "public_continuity_state",
            session_state if isinstance(session_state, dict) else decision.get("continuity"),
        ),
    }


def merge_runtime_metadata(
    runtime_meta: Optional[Dict[str, Any]],
    decision: Optional[Dict[str, Any]],
    *,
    deps: Dict[str, Any],
    live2d_hints: Dict[str, str],
) -> Optional[Dict[str, Any]]:
    if runtime_meta is None or not isinstance(decision, dict):
        return runtime_meta
    merged = dict(runtime_meta)
    brain_emotion = _call(deps, "normalize_emotion", decision.get("emotion"))
    brain_action = _call(deps, "normalize_action", decision.get("action"))
    brain_intensity = _call(deps, "normalize_intensity", decision.get("intensity"))
    brain_voice = _clean_text(deps, decision.get("voice_style") or brain_emotion, 32).lower() or "neutral"
    brain_intent = _clean_text(deps, decision.get("intent"), 40)
    raw_constraints = (
        decision.get("output_constraints")
        if isinstance(decision.get("output_constraints"), dict)
        else _call(deps, "constraints_for_intent", brain_intent)
    )
    constraints = _call(deps, "public_output_constraints", raw_constraints)

    if _call(deps, "normalize_emotion", merged.get("emotion")) == "neutral" and brain_emotion != "neutral":
        merged["emotion"] = brain_emotion
    if _call(deps, "normalize_action", merged.get("action")) == "none" and brain_action != "none":
        merged["action"] = brain_action
    if _call(deps, "normalize_intensity", merged.get("intensity")) == "normal" and brain_intensity != "normal":
        merged["intensity"] = brain_intensity
    if _clean_text(deps, merged.get("voice_style"), 32).lower() in {"", "neutral"} and brain_voice != "neutral":
        merged["voice_style"] = brain_voice

    strict_live2d_refresh = False
    if not constraints["allow_motion"]:
        merged["action"] = "none"
        merged["intensity"] = "low"
        strict_live2d_refresh = True
    if brain_intent == "comfort":
        if brain_emotion in {"sad", "anxious"}:
            merged["emotion"] = brain_emotion
        merged["voice_style"] = "soft"
        merged["action"] = "none"
        merged["intensity"] = "low"
        strict_live2d_refresh = True
    elif brain_intent in {"task_help", "reminder"}:
        if _call(deps, "normalize_emotion", merged.get("emotion")) in {"happy", "playful", "surprised"}:
            merged["emotion"] = brain_emotion
            strict_live2d_refresh = True
        if _call(deps, "normalize_action", merged.get("action")) in {"happy_idle", "surprised", "wave"}:
            merged["action"] = brain_action
            merged["intensity"] = brain_intensity
            strict_live2d_refresh = True
        if brain_voice in {"serious", "neutral"}:
            merged["voice_style"] = brain_voice
    elif brain_intent in {"closing", "low_interrupt_checkin"} and brain_voice != "neutral":
        merged["voice_style"] = brain_voice

    if strict_live2d_refresh or not _clean_text(deps, merged.get("live2d_hint"), 40):
        merged["live2d_hint"] = live2d_hints.get(
            _call(deps, "normalize_emotion", merged.get("emotion")),
            "idle_relaxed",
        )
    merged["brain_intent"] = brain_intent
    return merged
