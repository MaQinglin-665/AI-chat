from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


TOPIC_STACK_LIMIT = 3

TOPIC_LABELS = {
    "persona_feedback": "persona feedback",
    "emotional_support": "emotional support",
    "character_runtime": "ASR/TTS/Live2D runtime",
    "coding": "coding",
    "planning": "next-step planning",
    "task": "task thread",
    "progress": "progress",
    "casual": "casual chat",
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


def derive_topic(user_message: str, intent: str, *, is_next_step_request) -> str:
    text = _clean_text(user_message, 300).lower()
    compact = re.sub(r"\s+", "", text)
    if intent == "feedback":
        return "persona_feedback"
    if intent == "comfort":
        return "emotional_support"
    if re.search(r"(voice|tts|asr|live2d|motion|expression|speech|sentence)", compact):
        return "character_runtime"
    if re.search(r"(code|bug|fix|implement|error|traceback|test|pytest)", compact):
        return "coding"
    if is_next_step_request(user_message) or re.search(r"(todo|plan|roadmap|priority)", compact):
        return "planning"
    if re.search(r"(\u4e0b\u4e00\u6b65|\u63a5\u4e0b\u6765|\u5148\u505a\u4ec0\u4e48|\u8be5\u505a\u4ec0\u4e48|\u8ba1\u5212|\u4f18\u5148)", text):
        return "planning"
    if intent in {"task_help", "question"}:
        return "task"
    if intent == "encouragement":
        return "progress"
    return "casual"


def clean_topic_excerpt(value: Any, max_len: int = 90) -> str:
    text = _clean_text(value, max_len)
    if not text:
        return ""
    text = re.sub(
        r"(?i)(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['\"]?[^'\"\s,;]+",
        "[redacted]",
        text,
    )
    return _clean_text(text, max_len)


def topic_label_for(topic: str, user_message: str = "") -> str:
    safe_topic = _clean_text(topic, 48) or "casual"
    if safe_topic in TOPIC_LABELS:
        return TOPIC_LABELS[safe_topic]
    excerpt = clean_topic_excerpt(user_message, 48)
    return excerpt or safe_topic


def public_topic_stack(value: Optional[Any]) -> List[Dict[str, Any]]:
    if isinstance(value, dict):
        raw_stack = value.get("topic_stack")
    else:
        raw_stack = value
    if not isinstance(raw_stack, list):
        return []
    stack: List[Dict[str, Any]] = []
    for item in raw_stack:
        if not isinstance(item, dict):
            continue
        topic_id = _clean_text(item.get("topic_id") or item.get("topic"), 48)
        label = _clean_text(item.get("label"), 64) or topic_label_for(topic_id)
        if not topic_id and not label:
            continue
        stack.append(
            {
                "topic_id": topic_id or "casual",
                "label": label,
                "intent": _clean_text(item.get("intent"), 40) or "casual",
                "last_user": clean_topic_excerpt(item.get("last_user") or item.get("user_excerpt"), 90),
                "last_assistant": clean_topic_excerpt(
                    item.get("last_assistant") or item.get("assistant_excerpt"),
                    90,
                ),
                "turns": max(1, min(99, _safe_int(item.get("turns"), 1))),
                "updated_at": max(0, _safe_int(item.get("updated_at"), 0)),
            }
        )
        if len(stack) >= TOPIC_STACK_LIMIT:
            break
    return stack


def detect_topic_reference_move(user_message: str) -> str:
    text = _clean_text(user_message, 240).lower()
    compact = re.sub(r"\s+", "", text)
    if not compact:
        return ""
    if re.search(r"(notthat|thatsnotit|that'snotit|wrongthread|wrongtopic)", compact) or re.search(
        r"(\u4e0d\u662f\u8fd9\u4e2a|\u4e0d\u662f\u90a3\u4e2a|\u4e0d\u5bf9|\u6211\u4e0d\u662f\u8bf4)",
        text,
    ):
        return "repair"
    if re.search(r"(shorter|toomuch|too long|summari[sz]e|one sentence|briefly)", text) or re.search(
        r"(\u8bf4\u77ed\u70b9|\u77ed\u4e00\u70b9|\u7b80\u5355\u70b9|\u7b80\u77ed|\u592a\u957f|\u522b\u5c55\u5f00|\u4e00\u53e5\u8bdd|\u5c11\u4e00\u70b9)",
        text,
    ):
        return "shorten"
    if re.search(r"(more detail|elaborate|expand|go deeper|tell me more)", text) or re.search(
        r"(\u8be6\u7ec6\u70b9|\u5c55\u5f00|\u591a\u8bf4\u4e00\u70b9|\u7ec6\u8bf4)",
        text,
    ):
        return "expand"
    if re.search(r"(rephrase|say it differently|different wording|another way)", text) or re.search(
        r"(\u6362\u4e2a\u8bf4\u6cd5|\u91cd\u65b0\u8bf4|\u6362\u4e00\u4e0b)",
        text,
    ):
        return "rephrase"
    if re.search(r"(continue|go on|keep going|same topic|that one|that thing|what about that|about it|back to that|previous point|last thing)", text) or re.search(
        r"(\u7ee7\u7eed|\u63a5\u7740|\u63a5\u4e0a|\u8bf4\u4e0b\u53bb|\u8bf4\u5b8c|\u56de\u5230\u521a\u624d|\u521a\u624d\u90a3\u4e2a|\u521a\u521a\u90a3\u4e2a|\u521a\u624d\u8bf4\u7684|\u4e0a\u4e00\u4e2a|\u4e0a\u4e00\u70b9|\u90a3\u4e2a\u5462|\u8fd9\u4e2a\u5462|\u8fd8\u662f\u8fd9\u4e2a|\u90a3\u90e8\u5206)",
        text,
    ):
        return "continue_topic"
    return ""


def public_topic_reference(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    move = _clean_text(raw.get("reply_move"), 48)
    if move not in {"continue_topic", "shorten", "expand", "rephrase", "repair"}:
        move = "none"
    topic_id = _clean_text(raw.get("topic_id"), 48)
    label = _clean_text(raw.get("label"), 64) or topic_label_for(topic_id)
    try:
        confidence = float(raw.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    active = raw.get("active") is True and move != "none" and bool(topic_id or label)
    return {
        "active": bool(active),
        "reply_move": move if active else "none",
        "topic_id": topic_id,
        "label": label if active else "",
        "reason": _clean_text(raw.get("reason"), 48) if active else "",
        "confidence": max(0.0, min(1.0, confidence if active else 0.0)),
    }


def build_topic_reference(user_message: str, topic_stack: Optional[Any]) -> Dict[str, Any]:
    stack = public_topic_stack(topic_stack)
    move = detect_topic_reference_move(user_message)
    if not move or not stack:
        return public_topic_reference({})
    target = stack[0]
    return public_topic_reference(
        {
            "active": True,
            "reply_move": move,
            "topic_id": target.get("topic_id"),
            "label": target.get("label"),
            "reason": "implicit_recent_topic",
            "confidence": 0.72 if len(stack) == 1 else 0.64,
        }
    )


def update_topic_stack(
    previous: Optional[Dict[str, Any]],
    *,
    topic: str,
    intent: str,
    user_message: str,
    assistant_reply: str = "",
    decision: Optional[Dict[str, Any]] = None,
    now: int = 0,
) -> List[Dict[str, Any]]:
    stack = public_topic_stack(previous)
    ref = public_topic_reference(
        decision.get("topic_reference") if isinstance(decision, dict) else None
    )
    target_id = _clean_text(ref.get("topic_id"), 48) if ref.get("active") else ""
    topic_id = target_id or _clean_text(topic, 48) or "casual"
    label = _clean_text(ref.get("label"), 64) if ref.get("active") else ""
    label = label or topic_label_for(topic_id, user_message)
    user_excerpt = clean_topic_excerpt(user_message, 90)
    assistant_excerpt = clean_topic_excerpt(assistant_reply, 90)
    if not user_excerpt and not assistant_excerpt:
        return stack[:TOPIC_STACK_LIMIT]

    existing: Optional[Dict[str, Any]] = None
    rest: List[Dict[str, Any]] = []
    for item in stack:
        if not existing and _clean_text(item.get("topic_id"), 48) == topic_id:
            existing = item
            continue
        rest.append(item)
    existing = existing or {}
    existing_intent = _clean_text(existing.get("intent"), 40)
    next_intent = _clean_text(intent, 40) or existing_intent or "casual"
    if ref.get("active") and existing_intent and next_intent in {"casual", "question"}:
        next_intent = existing_intent
    entry = {
        "topic_id": topic_id,
        "label": label,
        "intent": next_intent,
        "last_user": user_excerpt or clean_topic_excerpt(existing.get("last_user"), 90),
        "last_assistant": assistant_excerpt or clean_topic_excerpt(existing.get("last_assistant"), 90),
        "turns": max(1, min(99, _safe_int(existing.get("turns"), 0) + 1)),
        "updated_at": max(0, _safe_int(now, 0)),
    }
    return [entry, *rest][:TOPIC_STACK_LIMIT]
