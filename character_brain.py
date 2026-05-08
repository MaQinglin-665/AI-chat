from __future__ import annotations

import re
import time
from typing import Any, Dict, Iterable, List, Optional


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
    if re.search(r"(code|bug|fix|implement|error|traceback|test|pytest)", compact):
        return "coding"
    if re.search(r"(nextstep|todo|plan|roadmap|priority|whatshouldidonext)", compact):
        return "planning"
    if re.search(r"(\u4e0b\u4e00\u6b65|\u63a5\u4e0b\u6765|\u8ba1\u5212|\u4f18\u5148)", text):
        return "planning"
    if re.search(r"(voice|tts|asr|live2d|motion|expression)", compact):
        return "character_runtime"
    if intent in {"task_help", "question"}:
        return "task"
    if intent == "encouragement":
        return "progress"
    return "casual"


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
    }


def normalize_brain_session_state(raw: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
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
        }
    if age >= SESSION_SOFT_DECAY_AFTER_SEC:
        if state["mood_baseline"] in {"concerned", "focused", "playful"}:
            state["mood_baseline"] = "neutral"
        if state["energy"] in {"bright", "high", "focused"}:
            state["energy"] = "calm"
        state["same_need_turns"] = min(1, state["same_need_turns"])
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
        r"(sad|tired|anxious|upset|hurt|overwhelmed|lonely|depressed|panic|scared|stress|burnedout|burntout)",
        "comfort",
        120,
    )
    add_if(
        r"(\u96be\u53d7|\u4f24\u5fc3|\u7126\u8651|\u5d29\u6e83|\u88ab\u5426\u5b9a|\u4e0d\u5f00\u5fc3|\u538b\u529b|\u7d2f|\u5bb3\u6015)",
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
    add_if(r"\b(hello|hi|hey|good morning|good evening)\b", "greeting", 45, lower)
    add_if(r"(\u4f60\u597d|\u65e9\u5b89|\u665a\u5b89|\u5728\u5417)", "greeting", 45, text)
    add_if(r"(encourage|cheerme|needapush|motivateme)", "encouragement", 55)
    add_if(r"(\u9f13\u52b1|\u52a0\u6cb9|\u6253\u6c14|\u5938\u6211)", "encouragement", 55, text)
    add_if(r"(remind|timer|alarm|calendar|schedule|in\d+minutes|in\d+hours)", "reminder", 90)
    add_if(
        r"(\u63d0\u9192|\u95f9\u949f|\u65e5\u7a0b|\u5206\u949f\u540e|\u5c0f\u65f6\u540e)",
        "reminder",
        90,
        text,
    )
    add_if(r"\b(goodbye|bye|sleep|sign off|signoff|wrap up|wrapup|see you|seeyou|offline)\b", "closing", 75, lower)
    add_if(r"(\u4e0b\u7ebf|\u7761\u4e86|\u518d\u89c1|\u62dc\u62dc|\u6536\u5c3e)", "closing", 75, text)
    add_if(
        r"(code|bug|fix|implement|error|traceback|pytest|debug|refactor|plan|analy[sz]e|helpme)",
        "task_help",
        70,
    )
    add_if(
        r"(\u4ee3\u7801|\u62a5\u9519|\u4fee\u590d|\u5b9e\u73b0|\u600e\u4e48\u505a|\u5e2e\u6211|\u5206\u6790|\u8ba1\u5212)",
        "task_help",
        70,
        text,
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
        decision["directive"] += " Ask a follow-up only if the reply is genuinely blocked by missing information."
    elif not constraints["allow_followup_question"]:
        decision["directive"] += " Do not add a routine follow-up question."
    if not constraints["allow_teasing"]:
        decision["directive"] += " Avoid teasing for this intent."


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
            directive="Close softly as a companion; keep it short and calm.",
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
            directive="Be useful and concrete, but keep a character voice instead of becoming a generic manual.",
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

    _apply_output_constraints(decision)

    decision["emotion"] = _normalize_emotion(decision.get("emotion"))
    decision["action"] = _normalize_action(decision.get("action"))
    decision["intensity"] = _normalize_intensity(decision.get("intensity"))
    decision["live2d_hint"] = _clean_text(
        decision.get("live2d_hint") or LIVE2D_HINTS.get(decision["emotion"], "idle_relaxed"),
        40,
    )
    return decision


def build_character_brain_prompt_block(decision: Optional[Dict[str, Any]]) -> str:
    if not isinstance(decision, dict):
        return ""
    continuity = _public_continuity_state(decision.get("continuity"))
    lines = [
        "[Character brain state]",
        "Use this as private guidance for the next reply. Do not mention the brain state or expose metadata.",
        f"Intent: {_clean_text(decision.get('intent'), 40)}",
        f"Character state: energy={_clean_text(decision.get('energy'), 24)}, attention={_clean_text(decision.get('attention'), 24)}, relationship={_clean_text(decision.get('relationship'), 40)}",
        f"Session continuity: last_intent={continuity.get('last_intent') or 'none'}, last_topic={continuity.get('last_topic') or 'none'}, mood_baseline={continuity.get('mood_baseline')}, recent_user_need={continuity.get('recent_user_need') or 'none'}, same_need_turns={continuity.get('same_need_turns')}, decay={continuity.get('decay')}",
        f"Reply style: {_clean_text(decision.get('reply_style'), 40)}, max_sentences={int(decision.get('max_sentences') or 3)}",
        f"Output constraints: {_format_output_constraints_for_prompt(decision.get('output_constraints') if isinstance(decision.get('output_constraints'), dict) else {})}",
        f"Expression target: emotion={_normalize_emotion(decision.get('emotion'))}, action={_normalize_action(decision.get('action'))}, intensity={_normalize_intensity(decision.get('intensity'))}, voice_style={_clean_text(decision.get('voice_style'), 32)}",
        f"Directive: {_clean_text(decision.get('directive'), 240)}",
    ]
    return "\n".join(lines)


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
    return {
        "version": 1,
        "intent": _clean_text(decision.get("intent"), 40),
        "reply_style": _clean_text(decision.get("reply_style"), 40),
        "energy": _clean_text(decision.get("energy"), 24),
        "attention": _clean_text(decision.get("attention"), 24),
        "relationship": _clean_text(decision.get("relationship"), 40),
        "max_sentences": max(1, min(8, int(decision.get("max_sentences") or 3))),
        "emotion": _normalize_emotion(decision.get("emotion")),
        "action": _normalize_action(decision.get("action")),
        "intensity": _normalize_intensity(decision.get("intensity")),
        "voice_style": _clean_text(decision.get("voice_style"), 32).lower() or "neutral",
        "output_constraints": _public_output_constraints(decision.get("output_constraints")),
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

    if _normalize_emotion(merged.get("emotion")) == "neutral" and brain_emotion != "neutral":
        merged["emotion"] = brain_emotion
    if _normalize_action(merged.get("action")) == "none" and brain_action != "none":
        merged["action"] = brain_action
    if _normalize_intensity(merged.get("intensity")) == "normal" and brain_intensity != "normal":
        merged["intensity"] = brain_intensity
    if _clean_text(merged.get("voice_style"), 32).lower() in {"", "neutral"} and brain_voice != "neutral":
        merged["voice_style"] = brain_voice
    if not _clean_text(merged.get("live2d_hint"), 40):
        merged["live2d_hint"] = LIVE2D_HINTS.get(_normalize_emotion(merged.get("emotion")), "idle_relaxed")
    merged["brain_intent"] = _clean_text(decision.get("intent"), 40)
    return merged
