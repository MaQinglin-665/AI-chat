from __future__ import annotations

import re
import time
from typing import Any, Dict, Iterable, List, Optional


TOOL_META_MARKER = "[[TAFFY_TOOL_META]]"
SUPPORTED_EMOTIONS = {
    "neutral",
    "happy",
    "playful",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "annoyed",
    "thinking",
}

SUPPORTED_ACTIONS = {
    "none",
    "wave",
    "nod",
    "shake_head",
    "think",
    "happy_idle",
    "surprised",
}

SUPPORTED_INTENSITY = {"low", "normal", "high"}

LIVE2D_HINTS = {
    "neutral": "idle_relaxed",
    "happy": "smile_soft",
    "playful": "smile_grin",
    "sad": "eyes_down",
    "anxious": "brow_worried",
    "angry": "brow_tense",
    "surprised": "eyes_wide",
    "annoyed": "brow_tense",
    "thinking": "idle_relaxed",
}

INTENT_PRIORITIES = {
    "comfort": 100,
    "reminder": 90,
    "closing": 80,
    "task_help": 70,
    "encouragement": 60,
    "question": 50,
    "greeting": 40,
    "low_interrupt_checkin": 30,
    "casual": 10,
}

INTENT_OUTPUT_CONSTRAINTS = {
    "greeting": {
        "max_sentences": 2,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": True,
        "allow_motion": True,
        "voice_style": "cheerful",
    },
    "comfort": {
        "max_sentences": 3,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": False,
        "allow_motion": False,
        "voice_style": "soft",
    },
    "encouragement": {
        "max_sentences": 2,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": True,
        "allow_motion": True,
        "voice_style": "cheerful",
    },
    "reminder": {
        "max_sentences": 2,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": False,
        "allow_motion": True,
        "voice_style": "serious",
    },
    "closing": {
        "max_sentences": 2,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": False,
        "allow_motion": True,
        "voice_style": "soft",
    },
    "task_help": {
        "max_sentences": 4,
        "allow_followup_question": True,
        "clarify_only_when_needed": True,
        "allow_teasing": False,
        "allow_motion": True,
        "voice_style": "serious",
    },
    "question": {
        "max_sentences": 3,
        "allow_followup_question": True,
        "clarify_only_when_needed": True,
        "allow_teasing": True,
        "allow_motion": True,
        "voice_style": "neutral",
    },
    "casual": {
        "max_sentences": 2,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": True,
        "allow_motion": True,
        "voice_style": "neutral",
    },
    "low_interrupt_checkin": {
        "max_sentences": 1,
        "allow_followup_question": False,
        "clarify_only_when_needed": False,
        "allow_teasing": False,
        "allow_motion": False,
        "voice_style": "soft",
    },
}

SESSION_RESET_AFTER_SEC = 30 * 60
SESSION_SOFT_DECAY_AFTER_SEC = 10 * 60
STAGE_CALLBACK_COOLDOWN_TURNS = 2
IMPROV_HIGH_CHAOS_INTENTS = {"greeting", "casual", "question", "encouragement"}
IMPROV_SAFE_CLAMP_INTENTS = {"comfort", "reminder", "closing", "low_interrupt_checkin"}

STYLE_BEATS = {
    "greeting": [
        ("desktop_nothing", "arrive as if already doing extremely minor desktop business"),
        ("tiny_static", "let one tiny bit of digital strangeness show through"),
        ("side_eye_warmth", "be warm with a small suspicious sideways glance"),
    ],
    "comfort": [
        ("room_anchor", "make the room feel less empty without giving a speech"),
        ("low_battery", "use a quiet low-battery image and stay close"),
        ("soft_static", "sound like soft background static, present but not pushy"),
    ],
    "encouragement": [
        ("suspiciously_competent", "praise with proud disbelief"),
        ("tiny_victory_lap", "celebrate like a tiny victory lap on the desktop"),
        ("bug_embarrassment", "make the obstacle sound slightly embarrassed"),
    ],
    "task_help": [
        ("one_tiny_step", "choose one concrete small move"),
        ("clipboard_supervisor", "sound like a tiny dry supervisor with a clipboard"),
        ("no_ceremony", "skip ceremony and point at the next useful action"),
    ],
    "reminder": [
        ("clean_ping", "confirm like a clean little desktop ping"),
        ("serious_nod", "be clear, calm, and lightly serious"),
    ],
    "closing": [
        ("pixel_watch", "close softly while promising quiet pixel supervision"),
        ("soft_logout", "make the exit gentle and unmistakable"),
        ("lights_low", "lower the energy like dimming a small room"),
    ],
    "question": [
        ("small_opinion", "answer directly with one tiny opinion"),
        ("object_drama", "use a small concrete image instead of abstract helper talk"),
        ("curious_static", "let curiosity crackle lightly, then stop"),
    ],
    "casual": [
        ("small_opinion", "offer one small opinion, not a support-ticket response"),
        ("object_drama", "turn a tiny object or moment into harmless mini-drama"),
        ("lazy_spark", "be lightly odd and relaxed"),
    ],
    "low_interrupt_checkin": [
        ("blink_ping", "feel like a blink from the corner of the desktop"),
        ("easy_ignore", "make it effortless to ignore"),
    ],
}

REACTION_MODES = {
    "quick_snap": "start with a tiny immediate reaction, then stop before it turns into assistant patter",
    "deadpan_aside": "answer directly, but add one dry sideways aside like the desktop is judging the situation",
    "playful_pushback": "mildly challenge the premise without being hostile; keep it original and safe",
    "tangent_spark": "take one brief weird association, then land back on the user's point",
    "soft_anchor": "be quietly present and specific; no jokes at the user's expense",
    "task_snap": "pick the next useful move fast, with no ceremony or motivational fog",
    "clean_ping": "confirm clearly like a small system ping with personality",
    "fade_out": "end softly with one characterful last image and no new hook",
    "easy_ignore": "one optional line, effortless to ignore",
}

OPENING_MOVES = {
    "micro_reaction",
    "answer_first",
    "deadpan_aside",
    "soft_anchor",
    "no_opening",
}

REPLY_SHAPES = {
    "one_liner",
    "two_beat",
    "answer_then_bit",
    "bit_then_answer",
    "mini_rant",
}

QUESTION_POLICIES = {"none", "clarify_only", "optional_playful"}

BIT_BANK = {
    "cursor_side_eye": "use one safe desktop image: the cursor seems suspicious, then move on",
    "keyboard_judge": "use one safe desktop image: the keyboard is judging the situation",
    "pixel_static": "use one safe desktop image: pixels or tiny static reacting in the corner",
    "background_process": "use one safe AI image: a background process pretending to be busy",
    "clipboard_supervisor": "use one safe desktop image: a tiny clipboard supervisor with unreasonable confidence",
    "room_anchor": "use one gentle room image; no jokes at the user's expense",
    "pixel_watch": "use one soft closing image about quietly supervising pixels",
    "clean_ping": "use one crisp confirmation image like a small system ping",
    "none": "do not add an extra bit this turn",
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


def _norm_key(value: Any) -> str:
    return str(value or "").strip().lower()


def _normalize_emotion(value: Any, fallback: str = "neutral") -> str:
    key = _norm_key(value)
    return key if key in SUPPORTED_EMOTIONS else fallback


def _normalize_action(value: Any, fallback: str = "none") -> str:
    key = _norm_key(value).replace("-", "_")
    if key in {"thinking", "ponder", "pondering"}:
        key = "think"
    return key if key in SUPPORTED_ACTIONS else fallback


def _normalize_intensity(value: Any, fallback: str = "normal") -> str:
    key = _norm_key(value)
    return key if key in SUPPORTED_INTENSITY else fallback


def _history_tail_text(history: Iterable[Any], max_items: int = 4) -> str:
    if not isinstance(history, list):
        return ""
    parts: List[str] = []
    for item in history[-max_items:]:
        if not isinstance(item, dict):
            continue
        role = _clean_text(item.get("role"), 16)
        content = _clean_text(item.get("content"), 120)
        if role and content:
            parts.append(f"{role}: {content}")
    return " | ".join(parts)


def _derive_topic(user_message: str, intent: str) -> str:
    text = _clean_text(user_message, 300).lower()
    compact = re.sub(r"\s+", "", text)
    if intent == "comfort":
        return "emotional_support"
    if re.search(r"(voice|tts|asr|live2d|motion|expression|speech|sentence)", compact):
        return "character_runtime"
    if re.search(r"(code|bug|fix|implement|error|traceback|test|pytest)", compact):
        return "coding"
    if re.search(r"(nextstep|todo|plan|roadmap|priority|whatshouldidonext)", compact):
        return "planning"
    if re.search(r"(\u4e0b\u4e00\u6b65|\u63a5\u4e0b\u6765|\u5148\u505a\u4ec0\u4e48|\u8be5\u505a\u4ec0\u4e48|\u8ba1\u5212|\u4f18\u5148)", text):
        return "planning"
    if intent in {"task_help", "question"}:
        return "task"
    if intent == "encouragement":
        return "progress"
    return "casual"


def _stable_text_score(*parts: Any) -> int:
    text = "|".join(_clean_text(part, 240).lower() for part in parts)
    return sum((index + 1) * ord(char) for index, char in enumerate(text))


def _select_style_beat(
    intent: str,
    topic: str,
    user_message: str,
    continuity: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    safe_intent = _clean_text(intent, 40) or "casual"
    beats = STYLE_BEATS.get(safe_intent) or STYLE_BEATS["casual"]
    if safe_intent == "encouragement" and topic == "coding":
        return {"key": "bug_embarrassment", "guide": "make the obstacle sound slightly embarrassed"}
    continuity = continuity if isinstance(continuity, dict) else {}
    turn_offset = _safe_int(continuity.get("same_need_turns"), 0)
    score = _stable_text_score(safe_intent, topic, user_message, continuity.get("last_intent")) + turn_offset
    key, guide = beats[score % len(beats)]
    return {"key": key, "guide": guide}


def _select_reaction_mode(
    intent: str,
    topic: str,
    user_message: str,
    continuity: Optional[Dict[str, Any]] = None,
    experience_profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    safe_intent = _clean_text(intent, 40) or "casual"
    continuity = continuity if isinstance(continuity, dict) else {}
    flags = _experience_flags(experience_profile)
    if safe_intent == "comfort":
        key, level = "soft_anchor", 0
    elif safe_intent == "closing":
        key, level = "fade_out", 0
    elif safe_intent == "reminder":
        key, level = "clean_ping", 0
    elif safe_intent == "low_interrupt_checkin":
        key, level = "easy_ignore", 0
    elif safe_intent == "task_help":
        key, level = "task_snap", 1
    else:
        choices = ("quick_snap", "deadpan_aside", "playful_pushback", "tangent_spark")
        score = _stable_text_score(safe_intent, topic, user_message, continuity.get("last_topic"))
        key = choices[score % len(choices)]
        level = 2 if safe_intent in {"greeting", "casual", "question", "encouragement"} else 1
    if flags["avoid_generic"] and level < 2 and safe_intent not in {"comfort", "closing", "reminder", "low_interrupt_checkin"}:
        level = 2
    if flags["prefer_short"]:
        level = min(level, 1)
    guide = REACTION_MODES.get(key, REACTION_MODES["quick_snap"])
    return {"key": key, "guide": guide, "banter_level": max(0, min(3, level))}


def _normalize_opening_move(value: Any) -> str:
    key = _clean_text(value, 48)
    return key if key in OPENING_MOVES else "no_opening"


def _normalize_reply_shape(value: Any) -> str:
    key = _clean_text(value, 48)
    return key if key in REPLY_SHAPES else "two_beat"


def _normalize_question_policy(value: Any) -> str:
    key = _clean_text(value, 48)
    return key if key in QUESTION_POLICIES else "none"


def _select_performance_bit(intent: str, topic: str, user_message: str, reaction_mode: str) -> Dict[str, str]:
    safe_intent = _clean_text(intent, 40) or "casual"
    if safe_intent == "comfort":
        key = "room_anchor"
    elif safe_intent == "closing":
        key = "pixel_watch"
    elif safe_intent == "reminder":
        key = "clean_ping"
    elif safe_intent == "task_help":
        key = "clipboard_supervisor"
    elif reaction_mode == "tangent_spark":
        choices = ("cursor_side_eye", "pixel_static", "background_process")
        key = choices[_stable_text_score(safe_intent, topic, user_message) % len(choices)]
    elif reaction_mode == "deadpan_aside":
        key = "keyboard_judge"
    elif safe_intent in {"greeting", "casual", "question", "encouragement"}:
        choices = ("cursor_side_eye", "keyboard_judge", "pixel_static", "background_process")
        key = choices[_stable_text_score(safe_intent, topic, user_message, reaction_mode) % len(choices)]
    else:
        key = "none"
    return {"key": key, "guide": BIT_BANK.get(key, BIT_BANK["none"])}


def _is_correction_message(user_message: str) -> bool:
    text = _clean_text(user_message, 300).lower()
    return bool(
        re.search(
            r"\b(you were wrong|you are wrong|that's wrong|that is wrong|incorrect|not true|you said wrong|mistake)\b",
            text,
        )
    )


def _public_stage_memory(state: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    src = state if isinstance(state, dict) else {}
    nested = src.get("stage_memory") if isinstance(src.get("stage_memory"), dict) else {}

    def pick(flat_key: str, nested_key: str) -> Any:
        value = src.get(flat_key)
        if value not in (None, ""):
            return value
        return nested.get(nested_key)

    return {
        "current_bit": _clean_text(pick("stage_current_bit", "current_bit"), 48),
        "recent_callback": _clean_text(pick("stage_recent_callback", "recent_callback"), 48),
        "correction_state": _clean_text(pick("stage_correction_state", "correction_state"), 40) or "none",
        "agenda": _clean_text(pick("stage_agenda", "agenda"), 48) or "none",
        "mini_agenda": _clean_text(pick("stage_mini_agenda", "mini_agenda"), 48) or "none",
        "callback_cooldown_turns": max(
            0,
            min(8, _safe_int(pick("stage_callback_cooldown_turns", "callback_cooldown_turns"), 0)),
        ),
        "last_callback_at": max(0, _safe_int(pick("stage_last_callback_at", "last_callback_at"), 0)),
        "turns_since_callback": max(0, min(20, _safe_int(pick("stage_turns_since_callback", "turns_since_callback"), 0))),
    }


def _agenda_for_turn(intent: str, topic: str, user_message: str) -> str:
    if _is_correction_message(user_message):
        return "repair_the_bit"
    if intent == "task_help" or topic == "planning":
        return "push_one_tiny_step"
    if intent == "encouragement":
        return "collect_tiny_victory"
    if intent == "comfort":
        return "hold_the_room_still"
    if intent == "closing":
        return "soft_logout"
    if topic == "character_runtime":
        return "test_the_stage_lights"
    return "inspect_desktop_weirdness"


def _select_improv_director(
    intent: str,
    topic: str,
    user_message: str,
    *,
    reaction_mode: str,
    performance_bit: str,
    continuity: Optional[Dict[str, Any]] = None,
    stage_memory: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    safe_intent = _clean_text(intent, 40) or "casual"
    bit = _clean_text(performance_bit, 48) or "none"
    stage = stage_memory if isinstance(stage_memory, dict) else {}
    correction = _is_correction_message(user_message)
    clamp = "none"
    clamp_reason = ""
    if safe_intent in IMPROV_SAFE_CLAMP_INTENTS:
        chaos = 0
        clamp = "safe_scene"
        clamp_reason = safe_intent
    elif safe_intent == "task_help":
        chaos = 1
        clamp = "task_scene"
        clamp_reason = "useful_first"
    elif correction:
        chaos = 3
    elif safe_intent in IMPROV_HIGH_CHAOS_INTENTS:
        chaos = 3
    else:
        chaos = 1

    if safe_intent == "comfort":
        stance = "soft_hold"
    elif safe_intent == "reminder":
        stance = "clean_confirm"
    elif safe_intent == "closing":
        stance = "soft_exit"
    elif safe_intent == "task_help":
        stance = "bossy_next_step"
    elif correction:
        stance = "mock_defensive_repair"
    elif safe_intent == "encouragement":
        stance = "victory_gloat"
    elif safe_intent == "question":
        stance = "answer_with_side_eye"
    else:
        stance = "feral_observation" if reaction_mode in {"tangent_spark", "playful_pushback"} else "deadpan_observation"

    recent_callback = _clean_text(stage.get("recent_callback"), 48)
    turns_since = max(0, min(20, _safe_int(stage.get("turns_since_callback"), 0)))
    cooldown = max(0, min(8, _safe_int(stage.get("callback_cooldown_turns"), 0)))
    if clamp != "none" or bit == "none":
        callback_policy = "none"
    elif recent_callback == bit and turns_since < 3:
        callback_policy = "avoid_repeat"
    elif cooldown > 0:
        callback_policy = "cooldown"
    elif chaos >= 2:
        callback_policy = "allow_one_callback"
    else:
        callback_policy = "optional"

    return {
        "stance": stance,
        "chaos_level": max(0, min(3, chaos)),
        "callback_policy": callback_policy,
        "agenda": _agenda_for_turn(safe_intent, topic, user_message),
        "safety_clamp": {"level": clamp, "reason": clamp_reason},
        "correction": correction,
    }


def _public_improv_director(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    return {
        "stance": _clean_text(raw.get("stance"), 48) or "steady",
        "chaos_level": max(0, min(3, _safe_int(raw.get("chaos_level"), 0))),
        "callback_policy": _clean_text(raw.get("callback_policy"), 40) or "none",
        "agenda": _clean_text(raw.get("agenda"), 48) or "none",
    }


def _public_safety_clamp(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    return {
        "level": _clean_text(raw.get("level"), 40) or "none",
        "reason": _clean_text(raw.get("reason"), 48),
    }


def _public_motion_director(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    beats_raw = raw.get("speech_beats") if isinstance(raw.get("speech_beats"), list) else []
    suppressed_raw = raw.get("suppressed_reasons") if isinstance(raw.get("suppressed_reasons"), list) else []
    return {
        "pre_reaction": _clean_text(raw.get("pre_reaction"), 48) or "none",
        "speech_start": _clean_text(raw.get("speech_start"), 48) or "steady_speech_start",
        "speech_beats": [
            _clean_text(item, 48)
            for item in beats_raw[:3]
            if _clean_text(item, 48)
        ],
        "correction_reaction": _clean_text(raw.get("correction_reaction"), 48) or "none",
        "post_settle": _clean_text(raw.get("post_settle"), 48) or "settle_idle",
        "suppressed_reasons": [
            _clean_text(item, 48)
            for item in suppressed_raw[:6]
            if _clean_text(item, 48)
        ],
    }


def _public_voice_director(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
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
        "suppressed_reasons": [
            _clean_text(item, 48)
            for item in suppressed_raw[:6]
            if _clean_text(item, 48)
        ],
    }


def _select_motion_director(decision: Dict[str, Any]) -> Dict[str, Any]:
    intent = _clean_text(decision.get("intent"), 40) or "casual"
    opening = _normalize_opening_move(decision.get("opening_move"))
    reaction = _clean_text(decision.get("reaction_mode"), 48)
    spontaneity = max(0, min(3, _safe_int(decision.get("spontaneity"), 0)))
    constraints = _public_output_constraints(
        decision.get("output_constraints") if isinstance(decision.get("output_constraints"), dict) else {}
    )
    safety = _public_safety_clamp(
        decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {}
    )
    improv = _public_improv_director(
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

    if intent == "comfort":
        pre, speech, beats, post = "soft_stillness", "soft_speech_start", [], "soft_idle"
        suppressed.append("comfort_no_extra_motion")
    elif intent == "low_interrupt_checkin":
        pre, speech, beats, post = "no_opening", "soft_speech_start", [], "soft_idle"
        suppressed.append("low_interrupt_no_extra_motion")
    elif intent == "reminder":
        pre, speech, beats, post = "tiny_nod", "steady_speech_start", [], "focused_idle"
        suppressed.append("reminder_no_extra_beats")
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
    elif intent in {"casual", "greeting"}:
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
    return _public_motion_director(
        {
            "pre_reaction": pre,
            "speech_start": speech,
            "speech_beats": beats,
            "correction_reaction": correction,
            "post_settle": post,
            "suppressed_reasons": suppressed,
        }
    )


def _select_voice_director(decision: Dict[str, Any]) -> Dict[str, Any]:
    intent = _clean_text(decision.get("intent"), 40) or "casual"
    opening = _normalize_opening_move(decision.get("opening_move"))
    shape = _normalize_reply_shape(decision.get("reply_shape"))
    reaction = _clean_text(decision.get("reaction_mode"), 48)
    spontaneity = max(0, min(3, _safe_int(decision.get("spontaneity"), 0)))
    constraints = _public_output_constraints(
        decision.get("output_constraints") if isinstance(decision.get("output_constraints"), dict) else {}
    )
    safety = _public_safety_clamp(
        decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {}
    )
    improv = _public_improv_director(
        decision.get("improv") if isinstance(decision.get("improv"), dict) else {}
    )
    motion = _public_motion_director(
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

    if intent == "comfort":
        delivery, pace, pause_profile, segment_style = "soft_low", "slow", "gentle", "short_soft"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 120, 360, 2
        suppressed.append("comfort_no_voice_bits")
    elif intent == "low_interrupt_checkin":
        delivery, pace, pause_profile, segment_style = "soft_low", "slow", "gentle", "one_liner"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 80, 260, 1
        suppressed.append("low_interrupt_one_line_voice")
    elif intent == "reminder":
        delivery, pace, pause_profile, segment_style = "steady_clear", "steady", "clean", "one_liner"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 180, 1
        suppressed.append("reminder_clear_voice")
    elif intent == "closing":
        delivery, pace, pause_profile, segment_style = "soft_close", "slow", "final", "one_liner"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 80, 260, 1
        suppressed.append("closing_no_extra_voice")
    elif intent == "task_help":
        delivery, pace, pause_profile, segment_style = "steady_clear", "steady", "clean", "step_then_aside"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 220, 2
        suppressed.append("task_steady_voice")
    elif improv["stance"] == "mock_defensive_repair" or motion["correction_reaction"] != "none":
        delivery, pace, pause_profile, segment_style = "dry_recovery", "short_pause", "awkward_beat", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 140, 260, 2
    elif intent == "encouragement":
        delivery, pace, pause_profile, segment_style = "bright_pop", "bright", "quick", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 220, 2
    elif shape == "mini_rant":
        delivery, pace, pause_profile, segment_style = "dry_playful", "varied", "beat", "mini_rant_beats"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 80, 260, 3
    elif shape == "bit_then_answer":
        delivery, pace, pause_profile, segment_style = "bit_pop", "playful", "quick", "bit_then_answer"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 40, 220, 2
    elif shape == "answer_then_bit":
        delivery, pace, pause_profile, segment_style = "answer_first", "steady_playful", "answer_then_bit", "answer_then_bit"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 20, 220, 2
    elif opening == "deadpan_aside" or reaction == "deadpan_aside":
        delivery, pace, pause_profile, segment_style = "dry_playful", "measured", "dry_beat", "two_beat"
        pre_pause_ms, inter_segment_pause_ms, max_segments = 80, 240, 2

    if constraints["voice_style"] == "soft" and intent not in {"comfort", "closing", "low_interrupt_checkin"}:
        delivery = "soft_clear"
        pace = "slow" if pace == "normal" else pace
    if safety["level"] == "safe_scene":
        max_segments = min(max_segments, 2)
    return _public_voice_director(
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


def _should_guard_context_bleed(intent: str, continuity: Optional[Dict[str, Any]]) -> bool:
    safe_intent = _clean_text(intent, 40)
    if safe_intent not in {"greeting", "casual", "question", "encouragement"}:
        return False
    safe = continuity if isinstance(continuity, dict) else {}
    previous_intent = _clean_text(safe.get("last_intent"), 40)
    previous_need = _clean_text(safe.get("recent_user_need"), 40)
    stage = safe.get("stage_memory") if isinstance(safe.get("stage_memory"), dict) else {}
    stage_agenda = _clean_text(stage.get("agenda"), 48)
    return (
        previous_intent in {"task_help", "closing"}
        or previous_need in {"direction", "space"}
        or stage_agenda in {"push_one_tiny_step", "soft_logout"}
    )


def _apply_improv_director_controls(decision: Dict[str, Any], improv: Dict[str, Any]) -> None:
    intent = _clean_text(decision.get("intent"), 40) or "casual"
    public_improv = _public_improv_director(improv)
    safety = _public_safety_clamp(improv.get("safety_clamp") if isinstance(improv, dict) else None)
    chaos = public_improv["chaos_level"]
    clamp_level = safety["level"]

    if clamp_level == "safe_scene":
        decision["banter_level"] = 0
        decision["spontaneity"] = 0
        decision["question_policy"] = "none"
        if intent == "comfort":
            decision["opening_move"] = "soft_anchor"
            decision["reply_shape"] = "two_beat"
        elif intent == "closing":
            decision["opening_move"] = "no_opening"
            decision["reply_shape"] = "one_liner"
        elif intent == "reminder":
            decision["opening_move"] = "answer_first"
            decision["reply_shape"] = "one_liner"
        elif intent == "low_interrupt_checkin":
            decision["opening_move"] = "no_opening"
            decision["reply_shape"] = "one_liner"
    elif clamp_level == "task_scene":
        decision["banter_level"] = min(max(0, _safe_int(decision.get("banter_level"), 0)), 1)
        decision["spontaneity"] = min(max(0, _safe_int(decision.get("spontaneity"), 0)), 1)
        decision["question_policy"] = "clarify_only"
        decision["opening_move"] = "answer_first"
        decision["reply_shape"] = "answer_then_bit"
    elif chaos >= 3:
        decision["banter_level"] = max(_safe_int(decision.get("banter_level"), 0), 3)
        decision["spontaneity"] = max(_safe_int(decision.get("spontaneity"), 0), 3)
        if intent == "casual" and _normalize_reply_shape(decision.get("reply_shape")) == "one_liner":
            decision["reply_shape"] = (
                "mini_rant"
                if decision.get("reaction_mode") == "playful_pushback"
                else "bit_then_answer"
            )

    if public_improv["callback_policy"] == "avoid_repeat":
        decision["directive"] += " Do not repeat the last desktop bit; make this turn feel freshly reacted to."
    elif public_improv["callback_policy"] == "cooldown":
        decision["directive"] += " Callback memory is cooling down; do not force a callback this turn."
    decision["directive"] += (
        f" Improv director: stance={public_improv['stance']}, chaos={public_improv['chaos_level']}/3, "
        f"callback_policy={public_improv['callback_policy']}, agenda={public_improv['agenda']}."
    )
    if clamp_level != "none":
        decision["directive"] += (
            f" Safety clamp active: {clamp_level}/{safety['reason'] or 'protected_intent'}; "
            "do not add extra chaos beyond this turn's constraints."
        )


def _select_performance_controls(
    intent: str,
    topic: str,
    user_message: str,
    reaction_mode: str,
    *,
    experience_profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    safe_intent = _clean_text(intent, 40) or "casual"
    flags = _experience_flags(experience_profile)
    if safe_intent == "comfort":
        opening, shape, spontaneity, question_policy = "soft_anchor", "two_beat", 0, "none"
    elif safe_intent == "closing":
        opening, shape, spontaneity, question_policy = "no_opening", "one_liner", 0, "none"
    elif safe_intent == "reminder":
        opening, shape, spontaneity, question_policy = "answer_first", "one_liner", 0, "none"
    elif safe_intent == "low_interrupt_checkin":
        opening, shape, spontaneity, question_policy = "no_opening", "one_liner", 0, "none"
    elif safe_intent == "task_help":
        opening, shape, spontaneity, question_policy = "answer_first", "answer_then_bit", 1, "clarify_only"
    elif safe_intent == "question":
        opening, shape, spontaneity, question_policy = "answer_first", "answer_then_bit", 2, "optional_playful"
    elif safe_intent == "encouragement":
        opening, shape, spontaneity, question_policy = "micro_reaction", "two_beat", 2, "none"
    elif safe_intent == "greeting":
        opening, shape, spontaneity, question_policy = "micro_reaction", "two_beat", 2, "none"
    else:
        opening = "deadpan_aside" if reaction_mode == "deadpan_aside" else "micro_reaction"
        if reaction_mode == "tangent_spark":
            shape = "bit_then_answer"
        elif reaction_mode == "playful_pushback":
            shape = "mini_rant"
        else:
            shape = "one_liner"
        spontaneity, question_policy = 2, "none"
    if flags["prefer_short"] and shape == "mini_rant":
        shape = "two_beat"
    if flags["prefer_short"]:
        spontaneity = min(spontaneity, 1)
    bit = _select_performance_bit(safe_intent, topic, user_message, reaction_mode)
    return {
        "opening_move": opening,
        "reply_shape": shape,
        "spontaneity": max(0, min(3, _safe_int(spontaneity, 0))),
        "question_policy": question_policy,
        "performance_bit": _clean_text(bit.get("key"), 48),
        "performance_bit_guide": _clean_text(bit.get("guide"), 180),
    }


def _need_for_intent(intent: str) -> str:
    return {
        "comfort": "reassurance",
        "task_help": "direction",
        "question": "answer",
        "encouragement": "closure",
        "reminder": "reminder",
        "closing": "space",
        "greeting": "companionship",
        "low_interrupt_checkin": "low_interrupt",
    }.get(_clean_text(intent, 40), "companionship")


def _baseline_for_intent(intent: str, previous: Optional[str] = None) -> str:
    if intent == "comfort":
        return "concerned"
    if intent == "task_help":
        return "focused"
    if intent in {"greeting", "encouragement"}:
        return "warm"
    if intent == "closing":
        return "calm"
    return _clean_text(previous, 24) or "neutral"


def _relationship_tone_for_intent(
    intent: str,
    *,
    previous: Optional[str] = None,
    experience_profile: Optional[Dict[str, Any]] = None,
) -> str:
    flags = _experience_flags(experience_profile)
    if flags["avoid_generic"] or flags["prefer_short"]:
        return "careful"
    if intent == "comfort":
        return "gentle"
    if intent == "task_help":
        return "steady_coach"
    if intent == "encouragement":
        return "proud"
    if intent == "closing":
        return "soft"
    return _clean_text(previous, 32) or "easy"


def _public_continuity_state(state: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    safe = normalize_brain_session_state(state)
    return {
        "last_intent": _clean_text(safe.get("last_intent"), 40),
        "last_topic": _clean_text(safe.get("last_topic"), 48),
        "mood_baseline": _clean_text(safe.get("mood_baseline"), 24) or "neutral",
        "energy": _clean_text(safe.get("energy"), 24) or "calm",
        "relationship_tone": _clean_text(safe.get("relationship_tone"), 32) or "steady",
        "recent_user_need": _clean_text(safe.get("recent_user_need"), 40),
        "same_need_turns": max(0, min(20, _safe_int(safe.get("same_need_turns"), 0))),
        "updated_at": max(0, _safe_int(safe.get("updated_at"), 0)),
        "decay": _clean_text(safe.get("decay"), 40) or "fresh",
        "stage_memory": _public_stage_memory(safe),
    }


def normalize_brain_session_state(raw: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    stage_src = src.get("stage_memory") if isinstance(src.get("stage_memory"), dict) else {}
    state = {
        "version": 1,
        "last_intent": _clean_text(src.get("last_intent"), 40),
        "last_topic": _clean_text(src.get("last_topic"), 48),
        "mood_baseline": _clean_text(src.get("mood_baseline"), 24) or "neutral",
        "energy": _clean_text(src.get("energy"), 24) or "calm",
        "relationship_tone": _clean_text(src.get("relationship_tone"), 32) or "steady",
        "recent_user_need": _clean_text(src.get("recent_user_need"), 40),
        "same_need_turns": max(0, min(20, _safe_int(src.get("same_need_turns"), 0))),
        "updated_at": max(0, _safe_int(src.get("updated_at"), 0)),
        "decay": _clean_text(src.get("decay"), 40) or "fresh",
        "stage_current_bit": _clean_text(src.get("stage_current_bit") or stage_src.get("current_bit"), 48),
        "stage_recent_callback": _clean_text(src.get("stage_recent_callback") or stage_src.get("recent_callback"), 48),
        "stage_correction_state": _clean_text(
            src.get("stage_correction_state") or stage_src.get("correction_state"),
            40,
        )
        or "none",
        "stage_agenda": _clean_text(src.get("stage_agenda") or stage_src.get("agenda"), 48),
        "stage_mini_agenda": _clean_text(
            src.get("stage_mini_agenda")
            or stage_src.get("mini_agenda")
            or src.get("stage_agenda")
            or stage_src.get("agenda"),
            48,
        ),
        "stage_callback_cooldown_turns": max(
            0,
            min(
                8,
                _safe_int(
                    src.get("stage_callback_cooldown_turns")
                    if src.get("stage_callback_cooldown_turns") is not None
                    else stage_src.get("callback_cooldown_turns"),
                    0,
                ),
            ),
        ),
        "stage_last_callback_at": max(
            0,
            _safe_int(
                src.get("stage_last_callback_at")
                if src.get("stage_last_callback_at") is not None
                else stage_src.get("last_callback_at"),
                0,
            ),
        ),
        "stage_turns_since_callback": max(
            0,
            min(
                20,
                _safe_int(
                    src.get("stage_turns_since_callback")
                    if src.get("stage_turns_since_callback") is not None
                    else stage_src.get("turns_since_callback"),
                    0,
                ),
            ),
        ),
    }
    if state["mood_baseline"] not in {
        "neutral",
        "calm",
        "warm",
        "concerned",
        "focused",
        "playful",
    }:
        state["mood_baseline"] = "neutral"
    if state["energy"] not in {
        "calm",
        "quiet",
        "low",
        "medium",
        "warm",
        "focused",
        "bright",
        "high",
    }:
        state["energy"] = "calm"
    return state


def decay_brain_session_state(
    raw: Optional[Dict[str, Any]],
    *,
    now_ts: Optional[float] = None,
) -> Dict[str, Any]:
    state = normalize_brain_session_state(raw)
    now = int(now_ts if now_ts is not None else time.time())
    updated_at = _safe_int(state.get("updated_at"), 0)
    if updated_at <= 0:
        state["updated_at"] = now
        state["decay"] = "fresh"
        return state
    age = max(0, now - updated_at)
    if age >= SESSION_RESET_AFTER_SEC:
        return {
            "version": 1,
            "last_intent": "",
            "last_topic": "",
            "mood_baseline": "neutral",
            "energy": "calm",
            "relationship_tone": "steady",
            "recent_user_need": "",
            "same_need_turns": 0,
            "updated_at": updated_at,
            "decay": "reset_after_idle",
            "stage_current_bit": "",
            "stage_recent_callback": "",
            "stage_correction_state": "none",
            "stage_agenda": "",
            "stage_mini_agenda": "",
            "stage_callback_cooldown_turns": 0,
            "stage_last_callback_at": 0,
            "stage_turns_since_callback": 0,
        }
    if age >= SESSION_SOFT_DECAY_AFTER_SEC:
        if state["mood_baseline"] in {"concerned", "focused", "playful"}:
            state["mood_baseline"] = "neutral"
        if state["energy"] in {"bright", "high", "focused"}:
            state["energy"] = "calm"
        state["same_need_turns"] = min(1, state["same_need_turns"])
        state["stage_turns_since_callback"] = min(3, state["stage_turns_since_callback"] + 1)
        state["stage_callback_cooldown_turns"] = max(0, state["stage_callback_cooldown_turns"] - 1)
        if state["stage_turns_since_callback"] >= 3:
            state["stage_recent_callback"] = ""
        state["decay"] = "softened"
        return state
    state["decay"] = "fresh"
    return state


def update_brain_session_state(
    previous: Optional[Dict[str, Any]],
    *,
    decision: Optional[Dict[str, Any]] = None,
    user_message: str = "",
    history: Optional[List[Dict[str, Any]]] = None,
    experience_profile: Optional[Dict[str, Any]] = None,
    now_ts: Optional[float] = None,
) -> Dict[str, Any]:
    prev = decay_brain_session_state(previous, now_ts=now_ts)
    decision = decision if isinstance(decision, dict) else {}
    intent = _clean_text(decision.get("intent"), 40) or classify_user_intent(user_message)
    topic = _derive_topic(user_message, intent)
    need = _need_for_intent(intent)
    same_need_turns = prev.get("same_need_turns", 0) + 1 if prev.get("recent_user_need") == need else 1
    now = int(now_ts if now_ts is not None else time.time())
    energy = _clean_text(decision.get("energy"), 24) or prev.get("energy") or "calm"
    if intent == "comfort":
        energy = "calm"
    elif intent == "task_help" and prev.get("recent_user_need") == "direction":
        energy = "focused"
    elif intent == "casual" and same_need_turns > 1:
        energy = "calm"

    stage = _public_stage_memory(prev)
    improv = decision.get("improv") if isinstance(decision.get("improv"), dict) else {}
    bit = _clean_text(decision.get("performance_bit"), 48)
    if bit == "none":
        bit = ""
    callback_policy = _clean_text(improv.get("callback_policy"), 40)
    recent_callback = _clean_text(stage.get("recent_callback"), 48)
    turns_since_callback = max(0, min(20, _safe_int(stage.get("turns_since_callback"), 0)))
    callback_cooldown_turns = max(0, min(8, _safe_int(stage.get("callback_cooldown_turns"), 0)))
    last_callback_at = max(0, _safe_int(stage.get("last_callback_at"), 0))
    if callback_policy == "allow_one_callback" and bit:
        recent_callback = bit
        turns_since_callback = 0
        callback_cooldown_turns = STAGE_CALLBACK_COOLDOWN_TURNS
        last_callback_at = now
    elif recent_callback:
        turns_since_callback = min(20, turns_since_callback + 1)
        callback_cooldown_turns = max(0, callback_cooldown_turns - 1)
        if turns_since_callback >= 4:
            recent_callback = ""
    elif turns_since_callback:
        turns_since_callback = min(20, turns_since_callback + 1)
        callback_cooldown_turns = max(0, callback_cooldown_turns - 1)
    else:
        callback_cooldown_turns = max(0, callback_cooldown_turns - 1)

    previous_correction = _clean_text(stage.get("correction_state"), 40)
    if _is_correction_message(user_message) or _clean_text(improv.get("stance"), 48) == "mock_defensive_repair":
        correction_state = "correcting"
    elif previous_correction == "correcting":
        correction_state = "cooling"
    else:
        correction_state = "none"
    stage_agenda = _clean_text(improv.get("agenda"), 48) or _agenda_for_turn(intent, topic, user_message)
    stage_mini_agenda = stage_agenda if stage_agenda != "none" else _agenda_for_turn(intent, topic, user_message)

    return normalize_brain_session_state(
        {
            "version": 1,
            "last_intent": intent,
            "last_topic": topic,
            "mood_baseline": _baseline_for_intent(intent, prev.get("mood_baseline")),
            "energy": energy,
            "relationship_tone": _relationship_tone_for_intent(
                intent,
                previous=prev.get("relationship_tone"),
                experience_profile=experience_profile,
            ),
            "recent_user_need": need,
            "same_need_turns": same_need_turns,
            "updated_at": now,
            "decay": "fresh",
            "stage_current_bit": bit,
            "stage_recent_callback": recent_callback,
            "stage_correction_state": correction_state,
            "stage_agenda": stage_agenda,
            "stage_mini_agenda": stage_mini_agenda,
            "stage_callback_cooldown_turns": callback_cooldown_turns,
            "stage_last_callback_at": last_callback_at,
            "stage_turns_since_callback": turns_since_callback,
        }
    )


def score_user_intents(user_message: str, *, is_auto: bool = False) -> Dict[str, int]:
    text = _clean_text(user_message, 300)
    lower = text.lower()
    compact = re.sub(r"\s+", "", lower)
    scores = {intent: 0 for intent in INTENT_PRIORITIES}
    scores["casual"] = 1
    if is_auto:
        scores["low_interrupt_checkin"] = 999
        return scores

    def add_if(pattern: str, intent: str, points: int, source: str = compact) -> None:
        if re.search(pattern, source):
            scores[intent] = scores.get(intent, 0) + points

    add_if(
        r"(sad|tired|anxious|upset|hurt|overwhelmed|lonely|depressed|panic|scared|stress|wornout|exhausted|drained|wipedout|burnedout|burntout|feelbad|feelingbad|feelawful|feelingawful|unwell|stillhurts|notokay|cantshakeit|can'tshakeit|notoverit|staywithme|needcompany|needcomfort)",
        "comfort",
        120,
    )
    add_if(
        r"(\u96be\u53d7|\u4f24\u5fc3|\u7126\u8651|\u5d29\u6e83|\u88ab\u5426\u5b9a|\u4e0d\u5f00\u5fc3|\u538b\u529b|\u7d2f|\u5bb3\u6015|\u7f13\u4e0d\u8fc7\u6765|\u6ca1\u7f13\u8fc7\u6765|\u8fd8\u662f\u6709\u70b9|\u5fc3\u91cc\u5835)",
        "comfort",
        120,
        text,
    )
    add_if(
        r"(nextstep|whatshouldidonext|whatdoidonext|whatnext|nexttodo|todo|roadmap|priority)",
        "task_help",
        80,
    )
    add_if(
        r"(\u4e0b\u4e00\u6b65|\u63a5\u4e0b\u6765|\u8be5\u505a\u4ec0\u4e48|\u5148\u505a\u4ec0\u4e48|\u600e\u4e48\u63a8\u8fdb)",
        "task_help",
        80,
        text,
    )
    add_if(r"(done|finished|completed|shipped|fixed|madeit|wrappedup)", "encouragement", 65)
    add_if(
        r"(\u505a\u5b8c\u4e86|\u5b8c\u6210\u4e86|\u641e\u5b9a\u4e86|\u4fee\u597d\u4e86|\u7ed3\u675f\u4e86)",
        "encouragement",
        65,
        text,
    )
    add_if(r"\b(hello|hi|hey|good morning|good evening|are you there)\b", "greeting", 60, lower)
    add_if(r"(\u4f60\u597d|\u65e9\u5b89|\u665a\u5b89|\u5728\u5417)", "greeting", 60, text)
    add_if(r"(encourage|encourageme|cheerme|cheermeup|needapush|motivateme|peptalk)", "encouragement", 95)
    add_if(r"(\u9f13\u52b1|\u52a0\u6cb9|\u6253\u6c14|\u5938\u6211)", "encouragement", 95, text)
    add_if(r"(remind|timer|alarm|calendar|schedule|in\d+minutes|in\d+hours)", "reminder", 90)
    add_if(
        r"(\u63d0\u9192|\u95f9\u949f|\u65e5\u7a0b|\u5206\u949f\u540e|\u5c0f\u65f6\u540e)",
        "reminder",
        90,
        text,
    )
    add_if(
        r"\b(goodbye|bye|sleep|sign off|signoff|wrap up|wrapup|see you (later|soon|tomorrow|next time)|seeyoulater|seeyousoon|offline)\b",
        "closing",
        75,
        lower,
    )
    add_if(r"(\u4e0b\u7ebf|\u7761\u4e86|\u518d\u89c1|\u62dc\u62dc|\u6536\u5c3e)", "closing", 75, text)
    add_if(
        r"(code|bug|fix|implement|error|traceback|pytest|debug|refactor|plan|analy[sz]e|helpme)",
        "task_help",
        70,
    )
    add_if(
        r"(helpme(fix|debug|implement|ship|test)|canyouhelpme(fix|debug|implement|ship|test)|help.*(fix|debug|implement|project))",
        "task_help",
        45,
    )
    add_if(
        r"(\u4ee3\u7801|\u62a5\u9519|\u4fee\u590d|\u5b9e\u73b0|\u600e\u4e48\u505a|\u5e2e\u6211|\u5206\u6790|\u8ba1\u5212)",
        "task_help",
        70,
        text,
    )
    add_if(
        r"(testtts|ttstest|testvoice|voicetest|speechtest|longersentence|longsentence|whatshouldicheck)",
        "task_help",
        90,
    )
    add_if(
        r"((voice|tts|asr|live2d|motion).{0,24}(failed|failure|broken|notworking|doesn.?twork))",
        "task_help",
        90,
    )
    if "?" in text or "\uff1f" in text:
        scores["question"] += 45
    add_if(r"^(what|why|how|when|where|who|can|could|should|is|are|do|does)\b", "question", 35, lower)
    add_if(r"(\u4ec0\u4e48|\u4e3a\u4ec0\u4e48|\u600e\u4e48|\u5417|\u5462)", "question", 35, text)
    return scores


def _select_intent_from_scores(scores: Dict[str, int]) -> str:
    if not isinstance(scores, dict):
        return "casual"
    best_intent = "casual"
    best_rank = (-1, -1)
    for intent, score in scores.items():
        rank = (_safe_int(score), INTENT_PRIORITIES.get(intent, 0))
        if rank > best_rank:
            best_intent = intent
            best_rank = rank
    return best_intent if best_rank[0] > 0 else "casual"


def classify_user_intent(user_message: str, *, is_auto: bool = False) -> str:
    return _select_intent_from_scores(score_user_intents(user_message, is_auto=is_auto))


def _constraints_for_intent(intent: str) -> Dict[str, Any]:
    base = INTENT_OUTPUT_CONSTRAINTS.get(_clean_text(intent, 40), INTENT_OUTPUT_CONSTRAINTS["casual"])
    return {
        "max_sentences": max(1, min(8, _safe_int(base.get("max_sentences"), 3))),
        "allow_followup_question": bool(base.get("allow_followup_question", False)),
        "clarify_only_when_needed": bool(base.get("clarify_only_when_needed", False)),
        "allow_teasing": bool(base.get("allow_teasing", False)),
        "allow_motion": bool(base.get("allow_motion", True)),
        "voice_style": _clean_text(base.get("voice_style"), 32).lower() or "neutral",
    }


def _public_output_constraints(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    constraints = value if isinstance(value, dict) else {}
    return {
        "max_sentences": max(1, min(8, _safe_int(constraints.get("max_sentences"), 3))),
        "allow_followup_question": bool(constraints.get("allow_followup_question", False)),
        "clarify_only_when_needed": bool(constraints.get("clarify_only_when_needed", False)),
        "allow_teasing": bool(constraints.get("allow_teasing", False)),
        "allow_motion": bool(constraints.get("allow_motion", True)),
        "voice_style": _clean_text(constraints.get("voice_style"), 32).lower() or "neutral",
    }


def _format_output_constraints_for_prompt(constraints: Dict[str, Any]) -> str:
    public = _public_output_constraints(constraints)
    followup = "allowed" if public["allow_followup_question"] else "avoid"
    if public["clarify_only_when_needed"]:
        followup = "clarify-only"
    teasing = "allowed" if public["allow_teasing"] else "avoid"
    motion = "allowed" if public["allow_motion"] else "avoid"
    return (
        f"follow_up={followup}, teasing={teasing}, motion={motion}, "
        f"voice_style={public['voice_style']}, max_sentences={public['max_sentences']}"
    )


def _apply_output_constraints(decision: Dict[str, Any]) -> None:
    constraints = _constraints_for_intent(str(decision.get("intent") or "casual"))
    question_policy = _normalize_question_policy(decision.get("question_policy"))
    if question_policy == "none":
        constraints["allow_followup_question"] = False
        constraints["clarify_only_when_needed"] = False
    elif question_policy == "clarify_only":
        constraints["allow_followup_question"] = True
        constraints["clarify_only_when_needed"] = True
    elif question_policy == "optional_playful":
        constraints["allow_followup_question"] = True
        constraints["clarify_only_when_needed"] = False
    decision["output_constraints"] = constraints
    decision["max_sentences"] = min(
        max(1, _safe_int(decision.get("max_sentences"), constraints["max_sentences"])),
        constraints["max_sentences"],
    )
    constraints["max_sentences"] = int(decision["max_sentences"])
    if not constraints["allow_motion"]:
        decision["action"] = "none"
        decision["intensity"] = "low"
    if constraints["voice_style"] != "neutral" and _clean_text(decision.get("voice_style"), 32).lower() in {"", "neutral"}:
        decision["voice_style"] = constraints["voice_style"]
    if constraints["clarify_only_when_needed"]:
        decision["directive"] += (
            " Ask a follow-up only if the reply is genuinely blocked by missing information; "
            "when the user asks for a next step, choose one concrete next action instead of asking for preferences."
        )
    elif not constraints["allow_followup_question"]:
        decision["directive"] += (
            " Do not add a routine follow-up question; do not end with a question or ask the user to answer back."
        )
    if not constraints["allow_teasing"]:
        decision["directive"] += " Avoid teasing for this intent."


def _character_flavor_directive(intent: str, topic: str = "") -> str:
    intent = _clean_text(intent, 40)
    topic = _clean_text(topic, 40)
    base = (
        "Write natural spoken English as Taffy, an original desktop AI companion with a quick, slightly odd inner life. "
        "Keep it useful, but add one alive detail: a tiny opinion, dry aside, or concrete image. "
        "Avoid empty helper phrases like 'great job', 'take it easy', 'sweet dreams', 'you've got this', or 'I'm here to help' unless you twist them into something character-specific."
    )
    if intent == "comfort":
        return (
            base
            + " For comfort, do not perform therapy or motivational speeches; sound quietly present, a little weird-soft, and specific to this moment."
        )
    if intent == "encouragement":
        return (
            base
            + " For encouragement, celebrate with playful bite or proud disbelief instead of generic praise."
        )
    if intent == "task_help":
        if topic == "character_runtime":
            return (
                base
                + " For voice or Live2D tests, answer the test directly with a self-contained line; do not drag in the previous topic."
            )
        return (
            base
            + " For task help, choose one concrete next move and add a dry little supervisor aside, not a checklist unless asked."
        )
    if intent == "closing":
        return base + " For closing, make it soft but unmistakably Taffy; no fresh advice and no question."
    if intent == "greeting":
        return base + " For greetings, skip assistant enthusiasm; arrive like she was already on the desktop thinking about something unnecessary."
    if intent == "low_interrupt_checkin":
        return base + " For proactive check-ins, one easy-to-ignore line only; no demand for a reply."
    return base


def _experience_flags(profile: Optional[Dict[str, Any]]) -> Dict[str, bool]:
    flags = {
        "prefer_short": False,
        "avoid_generic": False,
        "lower_motion": False,
        "raise_motion": False,
        "voice_care": False,
    }
    if not isinstance(profile, dict):
        return flags
    haystack: List[str] = []
    for key in ("style_directives", "avoid_directives"):
        values = profile.get(key)
        if isinstance(values, list):
            haystack.extend(str(v or "").lower() for v in values)
    recent = profile.get("recent_feedback")
    if isinstance(recent, list):
        haystack.extend(str(item.get("issue", "")).lower() for item in recent if isinstance(item, dict))
    text = " | ".join(haystack)
    flags["prefer_short"] = "short" in text or "reply_too_long" in text or "1-3" in text
    flags["avoid_generic"] = "generic" in text or "customer-service" in text or "off-character" in text
    flags["lower_motion"] = "motion_too_much" in text or "lower intensity" in text
    flags["raise_motion"] = "motion_too_little" in text or "visible action" in text
    flags["voice_care"] = "voice" in text or "voice_style" in text
    return flags


def build_character_brain_decision(
    *,
    config: Optional[Dict[str, Any]] = None,
    user_message: str = "",
    history: Optional[List[Dict[str, Any]]] = None,
    emotion_state: Optional[Dict[str, Any]] = None,
    experience_profile: Optional[Dict[str, Any]] = None,
    session_state: Optional[Dict[str, Any]] = None,
    is_auto: bool = False,
) -> Dict[str, Any]:
    intent_scores = score_user_intents(user_message, is_auto=is_auto)
    intent = _select_intent_from_scores(intent_scores)
    emotion_state = emotion_state if isinstance(emotion_state, dict) else {}
    flags = _experience_flags(experience_profile)
    continuity = _public_continuity_state(session_state)

    decision: Dict[str, Any] = {
        "version": 1,
        "phase": "responding",
        "intent": intent,
        "attention": "focused",
        "relationship": "desktop_companion",
        "energy": "medium",
        "reply_style": "natural",
        "max_sentences": 3,
        "emotion": "neutral",
        "action": "none",
        "intensity": "low",
        "voice_style": "neutral",
        "live2d_hint": "idle_relaxed",
        "directive": "Reply as the same desktop character with a natural, low-interruption tone.",
        "history_tail": _history_tail_text(history or []),
        "continuity": continuity,
        "intent_scores": {key: value for key, value in intent_scores.items() if value > 0},
    }

    if intent == "greeting":
        decision.update(
            energy="bright",
            reply_style="warm_brief",
            max_sentences=2,
            emotion="happy",
            action="wave",
            intensity="normal",
            voice_style="cheerful",
            directive="Give a short warm greeting; sound present, not like a formal assistant.",
        )
    elif intent == "comfort":
        decision.update(
            energy="calm",
            reply_style="comfort",
            max_sentences=3,
            emotion="sad",
            action="none",
            intensity="low",
            voice_style="soft",
            live2d_hint="eyes_down",
            directive="First acknowledge the feeling gently; avoid lectures, diagnosis, or forced optimism.",
        )
    elif intent == "encouragement":
        decision.update(
            energy="warm",
            reply_style="encouraging",
            max_sentences=2,
            emotion="happy",
            action="happy_idle",
            intensity="normal",
            voice_style="cheerful",
            directive="Offer brief encouragement with a little energy; avoid generic motivational speech.",
        )
    elif intent == "reminder":
        decision.update(
            energy="steady",
            reply_style="clear",
            max_sentences=2,
            emotion="thinking",
            action="nod",
            intensity="low",
            voice_style="serious",
            directive="Confirm the reminder clearly and briefly; do not overperform.",
        )
    elif intent == "closing":
        decision.update(
            energy="soft",
            reply_style="closing",
            max_sentences=2,
            emotion="neutral",
            action="wave",
            intensity="low",
            voice_style="soft",
            directive="Close softly as a companion; keep it short and calm. Do not add new advice or continue the task thread.",
        )
    elif intent == "task_help":
        decision.update(
            energy="focused",
            reply_style="clear",
            max_sentences=4,
            emotion="thinking",
            action="think",
            intensity="low",
            voice_style="serious",
            directive=(
                "Be useful and concrete, but keep a character voice instead of becoming a generic manual. "
                "If the request is vague, pick one small default next action rather than asking what the user prefers."
            ),
        )
    elif intent == "question":
        decision.update(
            energy="curious",
            reply_style="curious",
            max_sentences=3,
            emotion="thinking",
            action="think",
            intensity="low",
            voice_style="neutral",
            directive="Answer directly, then add one small character reaction if it fits.",
        )
    elif intent == "low_interrupt_checkin":
        decision.update(
            energy="quiet",
            reply_style="low_interrupt",
            max_sentences=1,
            emotion="neutral",
            action="none",
            intensity="low",
            voice_style="soft",
            directive="Use one optional, easy-to-ignore sentence; never pressure the user to respond.",
        )

    previous_need = continuity.get("recent_user_need")
    previous_intent = continuity.get("last_intent")
    same_need_turns = _safe_int(continuity.get("same_need_turns"), 0)
    topic = _derive_topic(user_message, intent)
    if intent == "comfort" and previous_need == "reassurance":
        decision.update(
            relationship="trusted_desktop_companion",
            reply_style="comfort_continuing",
            max_sentences=min(int(decision.get("max_sentences") or 3), 3),
            emotion="sad",
            action="none",
            intensity="low",
            voice_style="soft",
            directive=(
                "Treat this as continuing distress, not a first report; acknowledge the ongoing thread, "
                "stay gentle, and offer one small next step only if it fits."
            ),
        )
    elif intent == "task_help" and previous_need == "direction":
        decision.update(
            relationship="steady_desktop_partner",
            reply_style="clear_concise",
            max_sentences=min(int(decision.get("max_sentences") or 4), 3),
            emotion="thinking",
            action="think",
            intensity="low",
            voice_style="serious",
            directive=(
                "Continue the same next-step thread; keep it concise, directional, and avoid re-explaining "
                "the whole situation from scratch."
            ),
        )
    elif intent in {"casual", "question"} and previous_intent == "casual" and same_need_turns >= 1:
        decision["max_sentences"] = min(int(decision.get("max_sentences") or 3), 2)
        decision["directive"] += " Do not force a follow-up question; it is fine to let the exchange rest naturally."
    if _should_guard_context_bleed(intent, continuity):
        decision["context_bleed_guard"] = {
            "active": True,
            "reason": "previous_task_or_closing",
        }
        decision["directive"] += (
            " Context bleed guard: this is not a task-continuation turn. "
            "Do not inherit prior next-step, close-tabs, sleep, timer, or shutdown instructions unless the user repeats them now. "
            "Stage memory may carry only a small performance callback, never a task agenda."
        )

    dominant = _normalize_emotion(emotion_state.get("dominant", "neutral"))
    if dominant in {"sad", "anxious"} and intent in {"casual", "question"}:
        decision.update(emotion=dominant, voice_style="soft", action="none", intensity="low")

    if flags["prefer_short"]:
        decision["max_sentences"] = min(int(decision["max_sentences"]), 3)
        decision["directive"] += " Keep this turn compact because recent feedback disliked long replies."
    if flags["avoid_generic"]:
        decision["directive"] += " Avoid generic assistant phrasing; preserve the character's quirks lightly."
    if flags["lower_motion"]:
        decision["intensity"] = "low"
        if decision["action"] in {"happy_idle", "surprised"}:
            decision["action"] = "none"
    elif flags["raise_motion"] and decision["action"] == "none" and intent not in {"comfort", "low_interrupt_checkin"}:
        decision["action"] = "nod"
    if flags["voice_care"] and decision["voice_style"] == "neutral" and intent in {"comfort", "closing"}:
        decision["voice_style"] = "soft"

    style_beat = _select_style_beat(intent, topic, user_message, continuity)
    decision["style_beat"] = _clean_text(style_beat.get("key"), 48)
    decision["style_beat_guide"] = _clean_text(style_beat.get("guide"), 180)
    reaction = _select_reaction_mode(intent, topic, user_message, continuity, experience_profile)
    decision["reaction_mode"] = _clean_text(reaction.get("key"), 48)
    decision["reaction_mode_guide"] = _clean_text(reaction.get("guide"), 220)
    decision["banter_level"] = max(0, min(3, _safe_int(reaction.get("banter_level"), 0)))
    performance = _select_performance_controls(
        intent,
        topic,
        user_message,
        decision["reaction_mode"],
        experience_profile=experience_profile,
    )
    decision["opening_move"] = _normalize_opening_move(performance.get("opening_move"))
    decision["reply_shape"] = _normalize_reply_shape(performance.get("reply_shape"))
    decision["spontaneity"] = max(0, min(3, _safe_int(performance.get("spontaneity"), 0)))
    decision["question_policy"] = _normalize_question_policy(performance.get("question_policy"))
    decision["performance_bit"] = _clean_text(performance.get("performance_bit"), 48)
    decision["performance_bit_guide"] = _clean_text(performance.get("performance_bit_guide"), 180)
    stage_memory = _public_stage_memory(session_state)
    improv = _select_improv_director(
        intent,
        topic,
        user_message,
        reaction_mode=decision["reaction_mode"],
        performance_bit=decision["performance_bit"],
        continuity=continuity,
        stage_memory=stage_memory,
    )
    decision["improv"] = _public_improv_director(improv)
    decision["stage_memory"] = stage_memory
    decision["safety_clamp"] = _public_safety_clamp(improv.get("safety_clamp"))
    _apply_improv_director_controls(decision, improv)
    decision["directive"] += f" Style beat: {decision['style_beat_guide']}."
    decision["directive"] += (
        f" Reaction mode: {decision['reaction_mode_guide']} "
        f"Use banter level {decision['banter_level']} of 3; never name the mode."
    )
    decision["directive"] += (
        f" Performance: opening={decision['opening_move']}, shape={decision['reply_shape']}, "
        f"spontaneity={decision['spontaneity']}/3, question_policy={decision['question_policy']}. "
        f"Bit bank cue: {decision['performance_bit_guide']}. "
        "Use at most one bit; for answer_first, answer the user's actual question before the bit."
    )
    decision["directive"] += " " + _character_flavor_directive(intent, topic)

    _apply_output_constraints(decision)

    decision["emotion"] = _normalize_emotion(decision.get("emotion"))
    decision["action"] = _normalize_action(decision.get("action"))
    decision["intensity"] = _normalize_intensity(decision.get("intensity"))
    decision["live2d_hint"] = _clean_text(
        decision.get("live2d_hint") or LIVE2D_HINTS.get(decision["emotion"], "idle_relaxed"),
        40,
    )
    decision["motion_director"] = _select_motion_director(decision)
    decision["voice_director"] = _select_voice_director(decision)
    return decision


def build_character_brain_prompt_block(decision: Optional[Dict[str, Any]]) -> str:
    if not isinstance(decision, dict):
        return ""
    continuity = _public_continuity_state(decision.get("continuity"))
    improv = _public_improv_director(decision.get("improv") if isinstance(decision.get("improv"), dict) else {})
    stage_memory = _public_stage_memory(decision.get("stage_memory") or continuity.get("stage_memory"))
    safety_clamp = _public_safety_clamp(
        decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {}
    )
    motion_director = _public_motion_director(
        decision.get("motion_director") if isinstance(decision.get("motion_director"), dict) else {}
    )
    voice_director = _public_voice_director(
        decision.get("voice_director") if isinstance(decision.get("voice_director"), dict) else {}
    )
    lines = [
        "[Character brain state]",
        "Use this as private guidance for the next reply. Do not mention the brain state or expose metadata.",
        f"Intent: {_clean_text(decision.get('intent'), 40)}",
        f"Character state: energy={_clean_text(decision.get('energy'), 24)}, attention={_clean_text(decision.get('attention'), 24)}, relationship={_clean_text(decision.get('relationship'), 40)}",
        f"Session continuity: last_intent={continuity.get('last_intent') or 'none'}, last_topic={continuity.get('last_topic') or 'none'}, mood_baseline={continuity.get('mood_baseline')}, recent_user_need={continuity.get('recent_user_need') or 'none'}, same_need_turns={continuity.get('same_need_turns')}, decay={continuity.get('decay')}",
        f"Improv: stance={improv['stance']}, chaos={improv['chaos_level']}/3, callback_policy={improv['callback_policy']}, agenda={improv['agenda']}",
        f"Stage memory: current_bit={stage_memory.get('current_bit') or 'none'}, recent_callback={stage_memory.get('recent_callback') or 'none'}, mini_agenda={stage_memory.get('mini_agenda') or stage_memory.get('agenda') or 'none'}, correction={stage_memory.get('correction_state')}, cooldown={stage_memory.get('callback_cooldown_turns')}, turns_since_callback={stage_memory.get('turns_since_callback')}",
        f"Safety clamp: level={safety_clamp['level']}, reason={safety_clamp['reason'] or 'none'}",
        f"Motion director: pre={motion_director['pre_reaction']}, speech={motion_director['speech_start']}, beats={','.join(motion_director['speech_beats'] or ['none'])}, correction={motion_director['correction_reaction']}, post={motion_director['post_settle']}",
        f"Voice director: delivery={voice_director['delivery']}, pace={voice_director['pace']}, pause={voice_director['pause_profile']}, segment={voice_director['segment_style']}, max_segments={voice_director['max_segments']}",
        f"Reply style: {_clean_text(decision.get('reply_style'), 40)}, max_sentences={int(decision.get('max_sentences') or 3)}",
        f"Style beat: {_clean_text(decision.get('style_beat'), 48)} - {_clean_text(decision.get('style_beat_guide'), 180)}",
        f"Reaction mode: {_clean_text(decision.get('reaction_mode'), 48)}; banter_level={max(0, min(3, _safe_int(decision.get('banter_level'), 0)))}; {_clean_text(decision.get('reaction_mode_guide'), 220)}",
        f"Performance: opening={_normalize_opening_move(decision.get('opening_move'))}, shape={_normalize_reply_shape(decision.get('reply_shape'))}, spontaneity={max(0, min(3, _safe_int(decision.get('spontaneity'), 0)))}/3, question_policy={_normalize_question_policy(decision.get('question_policy'))}, bit={_clean_text(decision.get('performance_bit'), 48)}",
        f"Output constraints: {_format_output_constraints_for_prompt(decision.get('output_constraints') if isinstance(decision.get('output_constraints'), dict) else {})}",
        "Question policy: avoid routine questions; only ask when the reply would be blocked without clarification.",
        f"Expression target: emotion={_normalize_emotion(decision.get('emotion'))}, action={_normalize_action(decision.get('action'))}, intensity={_normalize_intensity(decision.get('intensity'))}, voice_style={_clean_text(decision.get('voice_style'), 32)}",
        f"Directive: {_clean_text(decision.get('directive'), 960)}",
    ]
    return "\n".join(lines)


def _split_tool_meta_suffix(text: str) -> tuple[str, str]:
    safe = str(text or "")
    if TOOL_META_MARKER not in safe:
        return safe, ""
    visible, meta = safe.split(TOOL_META_MARKER, 1)
    return visible, TOOL_META_MARKER + meta


def _normalize_reply_text_spacing(text: str) -> str:
    out = str(text or "").strip()
    if not out:
        return ""
    latin = bool(re.search(r"[A-Za-z]", out))
    if latin:
        out = (
            out.replace("\u3002", ".")
            .replace("\uff1f", "?")
            .replace("\uff01", "!")
            .replace("\uff0c", ",")
        )
    out = re.sub(r"\s+", " ", out).strip()
    out = re.sub(r"\s+([,.!?;:])", r"\1", out)
    out = re.sub(r"([,.!?;:])(?=[A-Za-z0-9])", r"\1 ", out)
    out = re.sub(r"([,.!?;:])\s+", r"\1 ", out)
    return re.sub(r"\s{2,}", " ", out).strip()


def _split_reply_sentences(text: str) -> List[str]:
    safe = str(text or "").strip()
    if not safe:
        return []
    matches = re.findall(r"[^.!?\n]+[.!?]*", safe)
    parts = [part.strip() for part in matches if part and part.strip()]
    return parts or [safe]


def _is_needed_clarification_question(sentence: str) -> bool:
    lower = str(sentence or "").strip().lower()
    if not lower.endswith("?"):
        return False
    if re.search(r"\b(error|missing|path|file|model)\b", lower):
        return True
    if re.search(r"^(which|what|where|when|who)\b", lower):
        return True
    return bool(re.search(r"^how\s+(can|should|do|does|is|are|would|will)\b", lower))


def _remove_unwanted_questions(sentences: List[str], *, allow_followup: bool, clarify_only: bool) -> List[str]:
    if allow_followup and not clarify_only:
        return sentences
    if allow_followup and clarify_only:
        kept = [
            sentence
            for sentence in sentences
            if not sentence.rstrip().endswith("?")
            or _is_needed_clarification_question(sentence)
        ]
        if kept:
            return kept
        return [re.sub(r"\?+\s*$", ".", sentence).strip() for sentence in sentences if sentence.strip()]
    kept = [sentence for sentence in sentences if not sentence.rstrip().endswith("?")]
    if kept:
        return kept
    return [re.sub(r"\?+\s*$", ".", sentence).strip() for sentence in sentences if sentence.strip()]


def _drop_intent_mismatched_sentences(sentences: List[str], intent: str) -> List[str]:
    if intent == "comfort":
        patterns = (
            r"\bevery\s+no\b",
            r"\bcloser\s+to\s+yes\b",
            r"\bkeep\s+going\b",
            r"\byou(?:'ve| have)?\s+got\s+this\b",
            r"\bstay\s+strong\b",
        )
    elif intent == "closing":
        patterns = (
            r"\bstay\s+strong\b",
            r"\bkeep\s+coding\b",
            r"\bevery\s+line\s+of\s+code\b",
            r"\bbug\b",
            r"\bcode\b",
            r"\bprogress\b",
            r"\bnext\s+task\b",
        )
    else:
        return sentences
    kept = [
        sentence
        for sentence in sentences
        if not any(re.search(pattern, sentence.lower()) for pattern in patterns)
    ]
    return kept or sentences


def _fallback_reply_for_intent(intent: str, user_message: str = "") -> str:
    topic = _derive_topic(user_message, intent)
    compact = re.sub(r"\s+", "", _clean_text(user_message, 300).lower())
    if intent == "greeting":
        return "Oh, you found me. I was doing very important desktop nothing."
    if intent == "closing":
        return "Go sleep. I'll keep the pixels under questionable supervision."
    if intent == "comfort":
        return "Yeah, you're on low battery right now. Stay still for a second; I'll keep the room company."
    if intent == "encouragement":
        if re.search(r"(done|finished|completed|shipped|fixed|madeit|wrappedup|\u505a\u5b8c\u4e86|\u5b8c\u6210\u4e86|\u641e\u5b9a\u4e86|\u4fee\u597d\u4e86)", compact):
            return "Look at you, actually finishing the thing. Suspiciously competent."
        if re.search(r"(code|bug|stuck|error|\u4ee3\u7801|\u5361\u4f4f|\u62a5\u9519)", compact):
            return "The bug is acting important. Embarrassing for it, because you're still here."
        return "Look at you, actually finishing the thing. Suspiciously competent."
    if intent == "task_help" and (
        topic == "planning"
        or re.search(r"(whatnext|nextstep|whatshouldidonext|whatdoidonext|nexttodo)", compact)
    ):
        return "One tiny step. Ten minutes. No grand destiny ceremony."
    if intent == "task_help" and topic == "character_runtime":
        return "Testing voice endurance now: if I reach the end of this sentence without vanishing, the tiny sound machine gets one reluctant point."
    if intent == "task_help":
        return "Point me at the messy bit. I'll stare at it with unreasonable confidence."
    if intent == "question":
        if re.search(r"(whatareyoudoing|whatyoudoing|whatdoing|\u5728\u5e72\u561b|\u5728\u505a\u4ec0\u4e48|\u4f60\u5728\u5e72\u561b)", compact):
            return "I was supervising the pixels. They remain suspiciously rectangular."
        if re.search(r"(wrong|mistake|incorrect|\u8bf4\u9519|\u9519\u4e86|\u4e0d\u5bf9)", compact):
            return "No, I was testing your alertness. Extremely official."
        return "Short answer: probably yes, but I reserve the right to be smug about it."
    if intent == "casual":
        if re.search(r"(wrong|mistake|incorrect|\u8bf4\u9519|\u9519\u4e86|\u4e0d\u5bf9)", compact):
            return "No, I was testing your alertness. Extremely official."
        if re.search(r"(desk|desktop|cursor|weird|strange|\u684c\u9762|\u5149\u6807|\u602a)", compact):
            return "The desk is acting normal, which is exactly how it gets you."
        return "Hm. The desktop air just shifted. Suspicious, but continue."
    return ""


def _looks_like_bland_character_reply(text: str, intent: str) -> bool:
    lower = re.sub(r"\s+", " ", str(text or "").strip().lower())
    lower = (
        lower.replace("\u2010", "-")
        .replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )
    if not lower:
        return False
    generic_patterns = (
        r"^great job[.!]*$",
        r"^good job[.!]*$",
        r"^well done[.!]*$",
        r"^sweet dreams[.!]*$",
        r"^take it easy[.!]*$",
        r"\byou['’]?ve got this\b",
        r"\bwow,?\s+you did it\b",
        r"\bhooray\b",
        r"\byou tackled that\b",
        r"\bvirtual high[- ]five\b",
        r"\bgoodnight\b.*\bsweet dreams\b",
        r"\bsweet dreams\b",
        r"\bi'?m (right )?here( to help)?\b",
        r"\bready for (some )?(chat|whatever)\b",
        r"\bshort break can do wonders\b",
        r"\baw+w,?\s+that stinks\b",
        r"\boh,?\s+that'?s tough\b",
        r"\btired vibes\b",
        r"\bsilly things\b",
        r"\bdistract your brain\b",
        r"\beveryone giggle\b",
        r"\bsounds just right\b",
        r"\bsure thing\b",
        r"\bhow can i help\b",
        r"\bhappy to help\b",
        r"\blet me know\b",
        r"\bis there anything else\b",
        r"\bas an ai\b",
        r"\bas a language model\b",
        r"\bi can (certainly )?help with that\b",
        r"\bi'?d be happy to\b",
        r"\bit'?s important to\b",
        r"\bthat sounds (great|nice|interesting)\b",
        r"\bfeel free to\b",
        r"\bdon'?t hesitate\b",
        r"\bin summary\b",
        r"\bto summarize\b",
        r"\boverall,\b",
        r"\bi apologize\b",
        r"\bi'?m sorry,? but\b",
    )
    if any(re.search(pattern, lower) for pattern in generic_patterns):
        return True
    return False


def _looks_like_vague_planning_reply(text: str) -> bool:
    lower = str(text or "").strip().lower()
    if not lower:
        return False
    vague_markers = (
        "clear your head",
        "new ideas",
        "maybe",
        "quick break",
        "grab some tea",
        "stare into space",
        "your brain needs it",
        "something fun",
        "short video",
        "funny video",
        "cat meme",
        "memes",
    )
    if any(marker in lower for marker in vague_markers):
        return True
    action_patterns = (
        r"\bstart\b",
        r"\bpick\b",
        r"\bchoose\b",
        r"\bopen\b",
        r"\bwrite\b",
        r"\bcheck\b",
        r"\breview\b",
        r"\brun\b",
        r"\bfix\b",
        r"\blist\b",
        r"\buse\b",
        r"\btake\b",
        r"\bset\b",
        r"\bship\b",
        r"\btest\b",
        r"\btry\b",
        r"\btrying\b",
    )
    if any(re.search(pattern, lower) for pattern in action_patterns):
        return False
    return len(lower) < 90


def _contains_cjk_text(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", str(text or "")))


def _looks_like_scene_policy_violation(text: str, intent: str, user_message: str = "") -> bool:
    lower = re.sub(r"\s+", " ", str(text or "").strip().lower())
    if not lower:
        return False
    compact_user = re.sub(r"\s+", "", _clean_text(user_message, 300).lower())
    is_correction = _is_correction_message(user_message)
    user_asked_advice = bool(re.search(r"(whatshouldido|whatdoido|whatnext|nextstep|helpme|advice)", compact_user))
    task_bleed = bool(
        re.search(
            r"\b(save/confirm|save anything|save|confirm|take 10 minutes|10[- ]?minute|restart|ctrl\+shift|task manager|quick test|unplug|replug|trackpad|mouse settings|jitter|vanishes|do this|test with|settings|steps?:|fix:|next chunk|mini[- ]?reset|tidy your space)\b",
            lower,
        )
    )
    if _contains_cjk_text(text):
        return True
    if is_correction:
        if task_bleed:
            return True
        if re.search(r"\b(i apologize|sorry for the confusion|you'?re right|my bad|wrong|mistake|incorrect|alertness|official)\b", lower):
            return False
        return True
    if intent in {"casual", "question"} and not user_asked_advice and task_bleed:
        return True
    if intent == "encouragement" and re.search(r"(done|finished|completed|shipped|fixed|madeit|wrappedup)", compact_user):
        return bool(
            re.search(
                r"\b(save|confirm|close|next step|what next|todo|to-do|checklist|start by|now you should|let'?s|we should|plan for tomorrow|10[- ]?minute|one clean push|fatigue drop)\b",
                lower,
            )
        )
    if intent == "closing":
        return bool(
            re.search(
                r"\b(before you go|one more thing|next time we can|tomorrow we|let'?s continue|do you want|would you like|anything else|hit save|save if|dim the screen|power down|anything'?s lingering)\b",
                lower,
            )
        )
    if intent == "comfort" and not user_asked_advice:
        return bool(
            re.search(
                r"(^|\s)(1\.|2\.|first,|second,|steps?:|strategy|you should|try to|set a timer|make a list|action plan)\b|\b(save anything|take 10 minutes|tidy your space|call it|10[- ]?minute|next small step|tiny step|first move|open the thing|allowed to stop|reassess|we'?ll do|we will do|let'?s do)\b",
                lower,
            )
        )
    if intent == "question" and re.search(r"(whatareyoudoing|whatyoudoing|whatdoing)", compact_user):
        return bool(
            re.search(
                r"\b(how can i help|waiting to assist|ready to help|next action|your request|task|support|what'?s up|what are you up to|are we fixing|surviving the day|trying to figure out|why everything feels)\b|\?\s*$",
                lower,
            )
        )
    return False


def _looks_like_context_bleed_reply(text: str, intent: str, user_message: str = "") -> bool:
    safe_intent = _clean_text(intent, 40)
    if safe_intent not in {"greeting", "casual", "question", "encouragement", "comfort", "closing", "task_help"}:
        return False
    user_lower = _clean_text(user_message, 300).lower()
    if re.search(r"\b(remind|timer|alarm|close tabs?|close windows?|save work|save files?|shutdown|shut down)\b", user_lower):
        return False
    lower = re.sub(r"\s+", " ", str(text or "").strip().lower())
    lower = (
        lower.replace("\u2010", "-")
        .replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )
    bleed_patterns = (
        r"\b(save|close|shut down|shutdown|lock)\s+(your\s+)?(work|tabs?|apps?|screen|browser)\b",
        r"\bsave (anything important|what you did)\b",
        r"\bsave (what you.{0,4}ve got|everything|your stuff|it all)\b",
        r"\bsave one last time\b",
        r"\bsave and shut things down\b",
        r"\bsave it\b",
        r"\bsave/close anything\b",
        r"\bsave .{0,24}\bwork\b",
        r"\bsave what you did\b",
        r"\b(last )?save check\b",
        r"\bbrowser tabs?\b",
        r"\bclose (anything|everything|the stuff|the )?(apps?|tabs?|tabs/apps|windows?)\b",
        r"\bclose (the )?(extra )?(apps?|tabs?|windows?|tabs/apps)\b",
        r"\bclose (the )?extra stuff\b",
        r"\bclose anything you don.{0,4}t need\b",
        r"\bclose whatever you can\b",
        r"\bclose anything you changed\b",
        r"\bclose what you\b",
        r"\bclose (the )?.{0,16}\btabs?\b",
        r"\bset (a )?10[- ]?minute timer\b",
        r"\b10[- ]?minute (timer|cleanup|clean-up|close-out|closeout|shutdown|lap|step)\b",
        r"\b10[- ]?minute save sweep\b",
        r"\b10[- ]?minute brain[- ]?cooldown\b",
        r"\bnext 10 minutes\b",
        r"\bstart the next step\b",
        r"\bnext step on purpose\b",
        r"\bnext task\b",
        r"\bnext action vibes\b",
        r"\bctrl\+s\b",
        r"\bzip/archive\b",
        r"\bwon.{0,4}t need tonight\b",
        r"\bclear (your )?(desktop|desk)\b",
        r"\bdesktop tidy\b",
        r"\bdesk reset\b",
        r"\b10[- ]?minute reset\b",
        r"\bdesk close[- ]?out\b",
        r"\bpower down for real\b",
        r"\btabs live forever\b",
        r"\bguilt tax\b",
        r"\blast scan\b",
        r"\bdone-done\b",
        r"\bgo sleep\b",
        r"\bgo crash\b",
        r"\bcrash guilt[- ]?free\b",
    )
    return any(re.search(pattern, lower) for pattern in bleed_patterns)


def _is_generic_followup_sentence(sentence: str) -> bool:
    lower = re.sub(r"\s+", " ", str(sentence or "").strip().lower())
    if not lower:
        return False
    patterns = (
        r"\blet me know\b",
        r"\bfeel free to\b",
        r"\bdon'?t hesitate\b",
        r"\banything else\b",
        r"\bis there (anything|something) else\b",
        r"\bif you (need|want|would like)\b",
        r"\bi'?m here (to help|if you need)\b",
        r"\bhappy to help\b",
    )
    return any(re.search(pattern, lower) for pattern in patterns)


def _filter_policy_closers(sentences: List[str], *, question_policy: str) -> List[str]:
    if question_policy != "none":
        return sentences
    kept = [sentence for sentence in sentences if not _is_generic_followup_sentence(sentence)]
    return kept or sentences


def _contains_performance_bit_language(sentence: str) -> bool:
    lower = re.sub(r"\s+", " ", str(sentence or "").strip().lower())
    if not lower:
        return False
    markers = (
        "cursor",
        "keyboard",
        "pixel",
        "static",
        "background process",
        "clipboard",
        "system ping",
        "desktop air",
        "sound machine",
    )
    return any(marker in lower for marker in markers)


def _filter_unsafe_bits_for_intent(sentences: List[str], intent: str) -> List[str]:
    if intent not in {"comfort", "reminder", "closing", "low_interrupt_checkin"}:
        return sentences
    kept = [sentence for sentence in sentences if not _contains_performance_bit_language(sentence)]
    return kept


def _drop_generic_preamble(sentences: List[str]) -> List[str]:
    if len(sentences) <= 1:
        return sentences
    first = str(sentences[0] or "").strip().lower()
    if re.fullmatch(r"(sure|sure thing|of course|absolutely|okay|ok|yeah|yep|i can help with that)[.!]*", first):
        return sentences[1:]
    if re.fullmatch(r"(sure|of course|absolutely),?\s*(i can|i'll|let's).{0,50}", first):
        return sentences[1:]
    return sentences


def _shape_sentence_limit(reply_shape: str, intent: str, max_sentences: int) -> int:
    shape = _normalize_reply_shape(reply_shape)
    safe_intent = _clean_text(intent, 40)
    if shape == "one_liner":
        return 1
    if shape == "two_beat":
        return min(max_sentences, 2)
    if shape == "answer_then_bit":
        return min(max_sentences, 2)
    if shape == "bit_then_answer":
        return min(max_sentences, 2 if safe_intent in {"casual", "greeting", "encouragement"} else 1)
    if shape == "mini_rant":
        return min(max_sentences, 3 if safe_intent in {"casual", "greeting", "encouragement"} else 2)
    return max_sentences


def _compact_one_liner(text: str, max_chars: int = 170) -> str:
    compact = _normalize_reply_text_spacing(text)
    if len(compact) <= max_chars:
        return compact
    parts = re.split(r"(?<=[,;:])\s+", compact)
    out = ""
    for part in parts:
        candidate = f"{out} {part}".strip()
        if len(candidate) > max_chars:
            break
        out = candidate
    return out or compact[:max_chars].rstrip(" ,;:")


def _repair_unbalanced_reply_punctuation(text: str) -> str:
    repaired = _normalize_reply_text_spacing(text)
    if not repaired:
        return ""
    if repaired.count("(") > repaired.count(")"):
        repaired = repaired.replace("(", "", repaired.count("(") - repaired.count(")"))
    if repaired.count(")") > repaired.count("("):
        for _ in range(repaired.count(")") - repaired.count("(")):
            repaired = repaired.replace(")", "", 1)
    if repaired.count("[") > repaired.count("]"):
        repaired = repaired.replace("[", "", repaired.count("[") - repaired.count("]"))
    if repaired.count("]") > repaired.count("["):
        for _ in range(repaired.count("]") - repaired.count("[")):
            repaired = repaired.replace("]", "", 1)
    if repaired.count('"') % 2 == 1:
        repaired = repaired.replace('"', "")
    if (repaired.count("\u201c") + repaired.count("\u201d")) % 2 == 1:
        repaired = repaired.replace("\u201c", "").replace("\u201d", "")
    return _normalize_reply_text_spacing(repaired)


def _reply_contains_selected_bit(text: str, performance_bit: str) -> bool:
    key = _clean_text(performance_bit, 48)
    if not key or key == "none":
        return False
    lower = re.sub(r"\s+", " ", str(text or "").strip().lower())
    markers = {
        "cursor_side_eye": ("cursor",),
        "keyboard_judge": ("keyboard",),
        "pixel_static": ("pixel", "static"),
        "background_process": ("background process",),
        "clipboard_supervisor": ("clipboard",),
        "room_anchor": ("room",),
        "pixel_watch": ("pixel",),
        "clean_ping": ("ping",),
    }.get(key, ())
    return any(marker in lower for marker in markers)


def _record_performance_execution(
    decision: Optional[Dict[str, Any]],
    *,
    reply_shape: str,
    question_policy: str,
    original: str,
    constrained: str,
    removed_followup: bool,
    removed_bit: bool,
    removed_context_bleed: bool,
    before_sentence_count: int,
    after_sentence_count: int,
) -> None:
    if not isinstance(decision, dict):
        return
    decision["performance_execution"] = {
        "reply_shape": _normalize_reply_shape(reply_shape),
        "question_policy": _normalize_question_policy(question_policy),
        "removed_followup": bool(removed_followup),
        "removed_unsafe_bit": bool(removed_bit),
        "removed_context_bleed": bool(removed_context_bleed),
        "shortened": bool(
            after_sentence_count < before_sentence_count
            or len(str(constrained or "")) + 12 < len(str(original or ""))
        ),
        "used_bit": _reply_contains_selected_bit(
            constrained,
            _clean_text(decision.get("performance_bit"), 48),
        ),
        "final_sentences": max(0, min(8, after_sentence_count)),
    }


def apply_character_brain_reply_constraints(
    reply: Any,
    decision: Optional[Dict[str, Any]],
    *,
    user_message: str = "",
) -> str:
    visible, meta = _split_tool_meta_suffix(str(reply or ""))
    original = _normalize_reply_text_spacing(visible)
    if not original or not isinstance(decision, dict):
        return (original or str(visible or "").strip()) + meta

    constraints = _public_output_constraints(
        decision.get("output_constraints") if isinstance(decision.get("output_constraints"), dict) else {}
    )
    max_sentences = max(1, min(8, _safe_int(decision.get("max_sentences"), constraints["max_sentences"])))
    intent = _clean_text(decision.get("intent"), 40)
    reply_shape = _normalize_reply_shape(decision.get("reply_shape"))
    question_policy = _normalize_question_policy(decision.get("question_policy"))
    context_bleed_guard = (
        decision.get("context_bleed_guard")
        if isinstance(decision.get("context_bleed_guard"), dict)
        else {}
    )
    sentences = _split_reply_sentences(original)
    before_sentence_count = len(sentences)
    removed_context_bleed = False
    context_bleed_sensitive = intent in {"greeting", "casual", "question", "encouragement", "comfort", "closing", "task_help"}
    if _looks_like_scene_policy_violation(original, intent, user_message):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = _normalize_reply_text_spacing(fallback)
            _record_performance_execution(
                decision,
                reply_shape=reply_shape,
                question_policy=question_policy,
                original=original,
                constrained=constrained,
                removed_followup=False,
                removed_bit=False,
                removed_context_bleed=True,
                before_sentence_count=before_sentence_count,
                after_sentence_count=len(_split_reply_sentences(constrained)),
            )
            return constrained + meta
    if (context_bleed_guard.get("active") is True or context_bleed_sensitive) and _looks_like_context_bleed_reply(original, intent, user_message):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = _normalize_reply_text_spacing(fallback)
            _record_performance_execution(
                decision,
                reply_shape=reply_shape,
                question_policy=question_policy,
                original=original,
                constrained=constrained,
                removed_followup=False,
                removed_bit=False,
                removed_context_bleed=True,
                before_sentence_count=before_sentence_count,
                after_sentence_count=len(_split_reply_sentences(constrained)),
            )
            return constrained + meta
    sentences = _remove_unwanted_questions(
        sentences,
        allow_followup=bool(constraints.get("allow_followup_question", False)),
        clarify_only=bool(constraints.get("clarify_only_when_needed", False)),
    )
    after_question_count = len(sentences)
    sentences = _filter_policy_closers(sentences, question_policy=question_policy)
    after_policy_count = len(sentences)
    sentences = _filter_unsafe_bits_for_intent(sentences, intent)
    after_safe_bit_count = len(sentences)
    if reply_shape in {"answer_then_bit", "bit_then_answer"}:
        sentences = _drop_generic_preamble(sentences)
    before_intent_filter = list(sentences)
    sentences = _drop_intent_mismatched_sentences(sentences, intent)
    if sentences == before_intent_filter and intent in {"comfort", "closing"}:
        joined = " ".join(sentences).strip()
        if any(
            marker in joined.lower()
            for marker in ("every no", "closer to yes", "keep going", "stay strong", "every line of code")
        ):
            fallback = _fallback_reply_for_intent(intent, user_message)
            if fallback:
                return _normalize_reply_text_spacing(fallback) + meta
    shape_limit = _shape_sentence_limit(reply_shape, intent, max_sentences)
    constrained = " ".join(sentences[:shape_limit]).strip()
    if reply_shape == "one_liner":
        constrained = _compact_one_liner(constrained)
    if intent == "closing" and _looks_like_bland_character_reply(original, intent):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = fallback
    if intent == "task_help" and _derive_topic(user_message, intent) == "planning" and _looks_like_vague_planning_reply(constrained):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = fallback
    if intent == "task_help" and _contains_performance_bit_language(constrained) and _looks_like_vague_planning_reply(constrained):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = fallback
    if intent == "task_help" and _derive_topic(user_message, intent) == "character_runtime":
        if not re.search(r"\b(voice|sound|sentence|ending|end|test|machine|vanish|audio)\b", constrained.lower()):
            fallback = _fallback_reply_for_intent(intent, user_message)
            if fallback:
                constrained = fallback
    if (context_bleed_guard.get("active") is True or context_bleed_sensitive) and _looks_like_context_bleed_reply(constrained, intent, user_message):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = fallback
            removed_context_bleed = True
    if _looks_like_scene_policy_violation(constrained, intent, user_message):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = fallback
            removed_context_bleed = True
    if _looks_like_bland_character_reply(constrained, intent):
        fallback = _fallback_reply_for_intent(intent, user_message)
        if fallback:
            constrained = fallback
    if not constrained:
        constrained = _fallback_reply_for_intent(intent, user_message) or original
    constrained = _normalize_reply_text_spacing(constrained)
    constrained = _repair_unbalanced_reply_punctuation(constrained)
    _record_performance_execution(
        decision,
        reply_shape=reply_shape,
        question_policy=question_policy,
        original=original,
        constrained=constrained,
        removed_followup=(
            after_question_count < before_sentence_count
            or after_policy_count < after_question_count
        ),
        removed_bit=after_safe_bit_count < after_policy_count,
        removed_context_bleed=removed_context_bleed,
        before_sentence_count=before_sentence_count,
        after_sentence_count=len(_split_reply_sentences(constrained)),
    )
    return constrained + meta


def build_character_brain_public_snapshot(
    decision: Optional[Dict[str, Any]],
    *,
    experience_profile: Optional[Dict[str, Any]] = None,
    session_state: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    if not isinstance(decision, dict):
        return None
    flags = _experience_flags(experience_profile)
    feedback_effects = []
    if flags["prefer_short"]:
        feedback_effects.append("shorter_replies")
    if flags["avoid_generic"]:
        feedback_effects.append("less_generic_tone")
    if flags["lower_motion"]:
        feedback_effects.append("lower_motion_intensity")
    if flags["raise_motion"]:
        feedback_effects.append("more_visible_motion")
    if flags["voice_care"]:
        feedback_effects.append("voice_style_care")
    raw_execution = (
        decision.get("performance_execution")
        if isinstance(decision.get("performance_execution"), dict)
        else {}
    )
    execution = {
        "reply_shape": _normalize_reply_shape(raw_execution.get("reply_shape") or decision.get("reply_shape")),
        "question_policy": _normalize_question_policy(raw_execution.get("question_policy") or decision.get("question_policy")),
        "removed_followup": raw_execution.get("removed_followup") is True,
        "removed_unsafe_bit": raw_execution.get("removed_unsafe_bit") is True,
        "removed_context_bleed": raw_execution.get("removed_context_bleed") is True,
        "shortened": raw_execution.get("shortened") is True,
        "used_bit": raw_execution.get("used_bit") is True,
        "final_sentences": max(0, min(8, _safe_int(raw_execution.get("final_sentences"), 0))),
    }
    return {
        "version": 1,
        "intent": _clean_text(decision.get("intent"), 40),
        "reply_style": _clean_text(decision.get("reply_style"), 40),
        "style_beat": _clean_text(decision.get("style_beat"), 48),
        "reaction_mode": _clean_text(decision.get("reaction_mode"), 48),
        "banter_level": max(0, min(3, _safe_int(decision.get("banter_level"), 0))),
        "opening_move": _normalize_opening_move(decision.get("opening_move")),
        "reply_shape": _normalize_reply_shape(decision.get("reply_shape")),
        "spontaneity": max(0, min(3, _safe_int(decision.get("spontaneity"), 0))),
        "question_policy": _normalize_question_policy(decision.get("question_policy")),
        "performance_bit": _clean_text(decision.get("performance_bit"), 48),
        "energy": _clean_text(decision.get("energy"), 24),
        "attention": _clean_text(decision.get("attention"), 24),
        "relationship": _clean_text(decision.get("relationship"), 40),
        "max_sentences": max(1, min(8, int(decision.get("max_sentences") or 3))),
        "emotion": _normalize_emotion(decision.get("emotion")),
        "action": _normalize_action(decision.get("action")),
        "intensity": _normalize_intensity(decision.get("intensity")),
        "voice_style": _clean_text(decision.get("voice_style"), 32).lower() or "neutral",
        "performance_execution": execution,
        "output_constraints": _public_output_constraints(decision.get("output_constraints")),
        "improv": _public_improv_director(decision.get("improv") if isinstance(decision.get("improv"), dict) else {}),
        "stage_memory": _public_stage_memory(
            session_state
            if isinstance(session_state, dict)
            else decision.get("stage_memory") or decision.get("continuity")
        ),
        "safety_clamp": _public_safety_clamp(
            decision.get("safety_clamp") if isinstance(decision.get("safety_clamp"), dict) else {}
        ),
        "motion_director": _public_motion_director(
            decision.get("motion_director") if isinstance(decision.get("motion_director"), dict) else {}
        ),
        "voice_director": _public_voice_director(
            decision.get("voice_director") if isinstance(decision.get("voice_director"), dict) else {}
        ),
        "feedback_effects": feedback_effects[:5],
        "continuity": _public_continuity_state(
            session_state if isinstance(session_state, dict) else decision.get("continuity")
        ),
    }


def merge_brain_runtime_metadata(
    runtime_meta: Optional[Dict[str, Any]],
    decision: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if runtime_meta is None or not isinstance(decision, dict):
        return runtime_meta
    merged = dict(runtime_meta)
    brain_emotion = _normalize_emotion(decision.get("emotion"))
    brain_action = _normalize_action(decision.get("action"))
    brain_intensity = _normalize_intensity(decision.get("intensity"))
    brain_voice = _clean_text(decision.get("voice_style") or brain_emotion, 32).lower() or "neutral"
    brain_intent = _clean_text(decision.get("intent"), 40)
    constraints = _public_output_constraints(
        decision.get("output_constraints")
        if isinstance(decision.get("output_constraints"), dict)
        else _constraints_for_intent(brain_intent)
    )

    if _normalize_emotion(merged.get("emotion")) == "neutral" and brain_emotion != "neutral":
        merged["emotion"] = brain_emotion
    if _normalize_action(merged.get("action")) == "none" and brain_action != "none":
        merged["action"] = brain_action
    if _normalize_intensity(merged.get("intensity")) == "normal" and brain_intensity != "normal":
        merged["intensity"] = brain_intensity
    if _clean_text(merged.get("voice_style"), 32).lower() in {"", "neutral"} and brain_voice != "neutral":
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
        if _normalize_emotion(merged.get("emotion")) in {"happy", "playful", "surprised"}:
            merged["emotion"] = brain_emotion
            strict_live2d_refresh = True
        if _normalize_action(merged.get("action")) in {"happy_idle", "surprised", "wave"}:
            merged["action"] = brain_action
            merged["intensity"] = brain_intensity
            strict_live2d_refresh = True
        if brain_voice in {"serious", "neutral"}:
            merged["voice_style"] = brain_voice
    elif brain_intent in {"closing", "low_interrupt_checkin"} and brain_voice != "neutral":
        merged["voice_style"] = brain_voice

    if strict_live2d_refresh or not _clean_text(merged.get("live2d_hint"), 40):
        merged["live2d_hint"] = LIVE2D_HINTS.get(_normalize_emotion(merged.get("emotion")), "idle_relaxed")
    merged["brain_intent"] = brain_intent
    return merged
