from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


THOUGHT_BURST_MOTION_PLANS: Dict[str, Dict[str, Any]] = {
    "mutter": {"pre": "micro_pulse", "speech": "dry_speech_start", "beats": ["deadpan_pause"], "correction": "none", "post": "settle_idle"},
    "aside": {"pre": "side_eye", "speech": "dry_speech_start", "beats": ["blink_pulse"], "correction": "none", "post": "settle_idle"},
    "tiny_rant": {"pre": "side_eye", "speech": "dry_speech_start", "beats": ["deadpan_pause", "head_tilt", "idle_fidget"], "correction": "none", "post": "settle_idle"},
    "callback": {"pre": "blink_pulse", "speech": "expressive_speech_start", "beats": ["side_eye", "tiny_nod"], "correction": "none", "post": "settle_idle"},
    "mock_defense": {"pre": "embarrassed_recovery", "speech": "dry_speech_start", "beats": ["deadpan_pause", "tiny_nod"], "correction": "embarrassed_recovery", "post": "settle_idle"},
    "celebration": {"pre": "happy_pulse", "speech": "bright_speech_start", "beats": ["tiny_victory_nod", "blink_pulse"], "correction": "none", "post": "settle_idle"},
    "topic_spark": {"pre": "head_tilt", "speech": "curious_speech_start", "beats": ["side_eye", "head_tilt", "idle_fidget"], "correction": "none", "post": "settle_idle"},
}

THOUGHT_BURST_VOICE_PLANS: Dict[str, Dict[str, Any]] = {
    "mutter": {"delivery": "dry_mutter", "pace": "measured", "pause_profile": "mutter", "segment_style": "one_liner", "pre_pause_ms": 30, "inter_segment_pause_ms": 90, "max_segments": 1},
    "aside": {"delivery": "dry_playful", "pace": "measured", "pause_profile": "dry_beat", "segment_style": "two_beat", "pre_pause_ms": 40, "inter_segment_pause_ms": 120, "max_segments": 2},
    "tiny_rant": {"delivery": "dry_playful", "pace": "varied", "pause_profile": "thought_burst_beats", "segment_style": "thought_burst_beats", "pre_pause_ms": 60, "inter_segment_pause_ms": 140, "max_segments": 4},
    "callback": {"delivery": "bit_pop", "pace": "playful", "pause_profile": "callback", "segment_style": "two_beat", "pre_pause_ms": 30, "inter_segment_pause_ms": 120, "max_segments": 2},
    "mock_defense": {"delivery": "dry_recovery", "pace": "short_pause", "pause_profile": "awkward_beat", "segment_style": "two_beat", "pre_pause_ms": 70, "inter_segment_pause_ms": 140, "max_segments": 3},
    "celebration": {"delivery": "bright_pop", "pace": "bright", "pause_profile": "celebration_beats", "segment_style": "two_beat", "pre_pause_ms": 20, "inter_segment_pause_ms": 110, "max_segments": 2},
    "topic_spark": {"delivery": "dry_playful", "pace": "varied", "pause_profile": "tangent_beat", "segment_style": "thought_burst_beats", "pre_pause_ms": 40, "inter_segment_pause_ms": 130, "max_segments": 3},
}


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _clean_text(value: Any, max_len: int = 180) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) > max_len:
        return text[: max(0, max_len - 3)].rstrip() + "..."
    return text


def public_motion_director(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    beats_raw = raw.get("speech_beats") if isinstance(raw.get("speech_beats"), list) else []
    suppressed_raw = raw.get("suppressed_reasons") if isinstance(raw.get("suppressed_reasons"), list) else []
    return {
        "pre_reaction": _clean_text(raw.get("pre_reaction"), 48) or "none",
        "speech_start": _clean_text(raw.get("speech_start"), 48) or "steady_speech_start",
        "speech_beats": [_clean_text(item, 48) for item in beats_raw[:3] if _clean_text(item, 48)],
        "correction_reaction": _clean_text(raw.get("correction_reaction"), 48) or "none",
        "post_settle": _clean_text(raw.get("post_settle"), 48) or "settle_idle",
        "suppressed_reasons": [_clean_text(item, 48) for item in suppressed_raw[:6] if _clean_text(item, 48)],
    }


def public_voice_director(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    suppressed_raw = raw.get("suppressed_reasons") if isinstance(raw.get("suppressed_reasons"), list) else []
    return {
        "delivery": _clean_text(raw.get("delivery"), 48) or "steady_clear",
        "pace": _clean_text(raw.get("pace"), 32) or "normal",
        "pause_profile": _clean_text(raw.get("pause_profile"), 48) or "light",
        "segment_style": _clean_text(raw.get("segment_style"), 48) or "whole",
        "pre_pause_ms": max(0, min(1200, _safe_int(raw.get("pre_pause_ms"), 0))),
        "inter_segment_pause_ms": max(0, min(1600, _safe_int(raw.get("inter_segment_pause_ms"), 160))),
        "max_segments": max(1, min(4, _safe_int(raw.get("max_segments"), 1))),
        "suppressed_reasons": [_clean_text(item, 48) for item in suppressed_raw[:6] if _clean_text(item, 48)],
    }


def thought_burst_type_from_decision(decision: Dict[str, Any]) -> str:
    burst = decision.get("thought_burst") if isinstance(decision.get("thought_burst"), dict) else {}
    thought_type = _clean_text(burst.get("thought_type"), 40).lower()
    if thought_type not in THOUGHT_BURST_MOTION_PLANS:
        return "aside"
    return thought_type


def select_motion_director(decision: Dict[str, Any], *, deps: Dict[str, Any]) -> Dict[str, Any]:
    clean_text = deps["clean_text"]
    safe_int = deps["safe_int"]
    intent = clean_text(decision.get("intent"), 40) or "casual"
    opening = deps["normalize_opening_move"](decision.get("opening_move"))
    reaction = clean_text(decision.get("reaction_mode"), 48)
    spontaneity = max(0, min(3, safe_int(decision.get("spontaneity"), 0)))
    constraints = deps["public_output_constraints"](
        decision.get("output_constraints") if isinstance(decision.get("output_constraints"), dict) else {}
    )
    safety = deps["public_safety_clamp"](
        decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {}
    )
    improv = deps["public_improv_director"](
        decision.get("improv") if isinstance(decision.get("improv"), dict) else {}
    )
    suppressed: List[str] = []
    allow_motion = constraints.get("allow_motion") is not False
    if not allow_motion:
        suppressed.append("motion_disallowed")
    if safety["level"] != "none":
        suppressed.append(f"safety_clamp_{safety['level']}")

    pre = "blink_pulse"
    speech = "expressive_speech_start"
    beats: List[str] = []
    correction = "none"
    post = "settle_idle"

    if intent == "thought_burst":
        thought_type = thought_burst_type_from_decision(decision)
        plan = THOUGHT_BURST_MOTION_PLANS.get(thought_type, THOUGHT_BURST_MOTION_PLANS["aside"])
        pre = clean_text(plan.get("pre"), 48) or "side_eye"
        speech = clean_text(plan.get("speech"), 48) or "dry_speech_start"
        base_beats = plan.get("beats") if isinstance(plan.get("beats"), list) else []
        beat_limit = max(0, min(len(base_beats), spontaneity if allow_motion else 0))
        beats = [clean_text(item, 48) for item in base_beats[:beat_limit] if clean_text(item, 48)]
        correction = clean_text(plan.get("correction"), 48) or "none"
        post = clean_text(plan.get("post"), 48) or "settle_idle"
        suppressed.append("thought_burst_choreography")
    elif intent == "comfort":
        pre, speech, beats, post = "soft_stillness", "soft_speech_start", [], "soft_idle"
        suppressed.append("comfort_no_extra_motion")
    elif intent == "low_interrupt_checkin":
        pre, speech, beats, post = "no_opening", "soft_speech_start", [], "soft_idle"
        suppressed.append("low_interrupt_no_extra_motion")
    elif intent == "reminder":
        pre, speech, beats, post = "tiny_nod", "steady_speech_start", [], "focused_idle"
        suppressed.append("reminder_no_extra_beats")
    elif intent == "feedback":
        pre, speech, beats, post = "tiny_nod", "steady_speech_start", [], "settle_idle"
        suppressed.append("feedback_no_extra_bits")
    elif intent == "closing":
        pre, speech, beats, post = "no_opening", "closing_speech_start", [], "closing_idle"
        suppressed.append("closing_no_extra_beats")
    elif intent == "task_help":
        pre, speech, post = "thinking_nod", "steady_speech_start", "focused_idle"
        beats = ["tiny_nod"] if spontaneity >= 1 and allow_motion else []
    elif improv["stance"] == "mock_defensive_repair":
        pre, speech, post = "embarrassed_recovery", "dry_speech_start", "settle_idle"
        beats = ["deadpan_pause"] if spontaneity >= 1 and allow_motion else []
        correction = "embarrassed_recovery"
    elif intent == "encouragement":
        pre, speech, post = "happy_pulse", "bright_speech_start", "settle_idle"
        beats = ["tiny_victory_nod"] if spontaneity >= 1 and allow_motion else []
    elif intent == "question":
        pre = "head_tilt" if opening == "answer_first" else "blink_pulse"
        if reaction in {"deadpan_aside", "tangent_spark"}:
            pre = "side_eye"
        speech = "curious_speech_start"
        beats = ["tiny_nod"] if spontaneity >= 1 and allow_motion else []
        if spontaneity >= 3 and allow_motion:
            beats.append("blink_pulse")
    elif intent in {"casual", "greeting", "thought_burst"}:
        pre = "deadpan_pause" if opening == "deadpan_aside" else "side_eye"
        if reaction == "quick_snap":
            pre = "micro_pulse"
        speech = "dry_speech_start" if reaction == "deadpan_aside" else "expressive_speech_start"
        if spontaneity >= 1 and allow_motion:
            beats.append("blink_pulse")
        if spontaneity >= 2 and allow_motion:
            beats.append("head_tilt")
        if spontaneity >= 3 and allow_motion:
            beats.append("idle_fidget")

    if not allow_motion:
        beats = []
    return public_motion_director(
        {
            "pre_reaction": pre,
            "speech_start": speech,
            "speech_beats": beats,
            "correction_reaction": correction,
            "post_settle": post,
            "suppressed_reasons": suppressed,
        }
    )


def select_voice_director(decision: Dict[str, Any], *, deps: Dict[str, Any]) -> Dict[str, Any]:
    clean_text = deps["clean_text"]
    safe_int = deps["safe_int"]
    intent = clean_text(decision.get("intent"), 40) or "casual"
    opening = deps["normalize_opening_move"](decision.get("opening_move"))
    shape = deps["normalize_reply_shape"](decision.get("reply_shape"))
    reaction = clean_text(decision.get("reaction_mode"), 48)
    spontaneity = max(0, min(3, safe_int(decision.get("spontaneity"), 0)))
    constraints = deps["public_output_constraints"](
        decision.get("output_constraints") if isinstance(decision.get("output_constraints"), dict) else {}
    )
    safety = deps["public_safety_clamp"](
        decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {}
    )
    improv = deps["public_improv_director"](
        decision.get("improv") if isinstance(decision.get("improv"), dict) else {}
    )
    motion = public_motion_director(
        decision.get("motion_director") if isinstance(decision.get("motion_director"), dict) else {}
    )
    suppressed: List[str] = []
    if safety["level"] != "none":
        suppressed.append(f"safety_clamp_{safety['level']}")
    if spontaneity <= 0:
        suppressed.append("spontaneity_zero_no_voice_beats")

    delivery = "steady_clear"
    pace = "normal"
    pause_profile = "light"
    segment_style = "whole"
    pre_pause_ms = 0
    inter_segment_pause_ms = 160
    max_segments = 1

    if intent == "thought_burst":
        thought_type = thought_burst_type_from_decision(decision)
        plan = THOUGHT_BURST_VOICE_PLANS.get(thought_type, THOUGHT_BURST_VOICE_PLANS["aside"])
        delivery = clean_text(plan.get("delivery"), 48) or "dry_playful"
        pace = clean_text(plan.get("pace"), 32) or "measured"
        pause_profile = clean_text(plan.get("pause_profile"), 48) or "dry_beat"
        segment_style = clean_text(plan.get("segment_style"), 48) or "two_beat"
        pre_pause_ms = max(0, min(1200, safe_int(plan.get("pre_pause_ms"), 80)))
        inter_segment_pause_ms = max(0, min(1600, safe_int(plan.get("inter_segment_pause_ms"), 220)))
        requested = max(1, min(4, safe_int(decision.get("max_sentences"), safe_int(plan.get("max_segments"), 2))))
        max_segments = max(1, min(requested, safe_int(plan.get("max_segments"), requested)))
        suppressed.append("thought_burst_choreography")
    elif intent == "comfort":
        delivery, pace, pause_profile, segment_style = "soft_low", "slow", "gentle", "short_soft"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 60, 140, 2
        suppressed.append("comfort_no_voice_bits")
    elif intent == "low_interrupt_checkin":
        delivery, pace, pause_profile, segment_style = "soft_low", "slow", "gentle", "one_liner"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 120, 1
        suppressed.append("low_interrupt_one_line_voice")
    elif intent == "reminder":
        delivery, pace, pause_profile, segment_style = "steady_clear", "steady", "clean", "one_liner"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 20, 100, 1
        suppressed.append("reminder_clear_voice")
    elif intent == "feedback":
        delivery, pace, pause_profile, segment_style = "steady_clear", "measured", "grounded", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 30, 120, 2
        suppressed.append("feedback_no_voice_bits")
    elif intent == "closing":
        delivery, pace, pause_profile, segment_style = "soft_close", "slow", "final", "one_liner"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 120, 1
        suppressed.append("closing_no_extra_voice")
    elif intent == "task_help":
        delivery, pace, pause_profile, segment_style = "steady_clear", "steady", "clean", "step_then_aside"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 20, 120, 2
        suppressed.append("task_steady_voice")
    elif improv["stance"] == "mock_defensive_repair" or motion["correction_reaction"] != "none":
        delivery, pace, pause_profile, segment_style = "dry_recovery", "short_pause", "awkward_beat", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 70, 140, 2
    elif intent == "encouragement":
        delivery, pace, pause_profile, segment_style = "bright_pop", "bright", "quick", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 20, 120, 2
    elif shape == "mini_rant":
        delivery, pace, pause_profile, segment_style = "dry_playful", "varied", "beat", "mini_rant_beats"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 140, 3
    elif shape == "bit_then_answer":
        delivery, pace, pause_profile, segment_style = "bit_pop", "playful", "quick", "bit_then_answer"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 20, 120, 2
    elif shape == "answer_then_bit":
        delivery, pace, pause_profile, segment_style = "answer_first", "steady_playful", "answer_then_bit", "answer_then_bit"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 10, 120, 2
    elif opening == "deadpan_aside" or reaction == "deadpan_aside":
        delivery, pace, pause_profile, segment_style = "dry_playful", "measured", "dry_beat", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 130, 2

    if constraints["voice_style"] == "soft" and intent not in {"comfort", "closing", "low_interrupt_checkin"}:
        delivery = "soft_clear"
        pace = "slow" if pace == "normal" else pace
    if safety["level"] == "safe_scene":
        max_segments = min(max_segments, 2)
    return public_voice_director(
        {
            "delivery": delivery,
            "pace": pace,
            "pause_profile": pause_profile,
            "segment_style": segment_style,
            "pre_pause_ms": pre_pause_ms,
            "inter_segment_pause_ms": inter_segment_pause_ms,
            "max_segments": max_segments,
            "suppressed_reasons": suppressed,
        }
    )
