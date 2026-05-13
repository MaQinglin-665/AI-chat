from __future__ import annotations

import re
from typing import Any, Dict, Optional


BARGE_IN_KINDS = {
    "stop",
    "correction",
    "shorten",
    "rephrase",
    "continue",
    "supplement",
    "new_topic",
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


def interruption_context(config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(config, dict):
        return {}
    context = config.get("_conversation_context")
    if not isinstance(context, dict):
        return {}
    interruption = context.get("interruption") if isinstance(context.get("interruption"), dict) else context
    if not isinstance(interruption, dict):
        return {}
    return interruption


def detect_barge_in_reply_policy(user_message: str, config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    interruption = interruption_context(config)
    if not interruption:
        return {
            "active": False,
            "kind": "none",
            "reply_move": "none",
            "goal": "",
            "assistant_summary": "",
            "previous_user_summary": "",
            "turn_action": "",
            "segment_role": "",
        }
    raw_policy = interruption.get("reply_policy") if isinstance(interruption.get("reply_policy"), dict) else {}
    text = _clean_text(user_message, 240).lower()
    compact = re.sub(r"\s+", "", text)
    kind = _clean_text(raw_policy.get("kind"), 48)
    if kind not in BARGE_IN_KINDS:
        if re.search(r"(not that|that's not|thats not|wrong|no i mean|i meant|not this)", text) or re.search(
            r"(\u4e0d\u662f\u8fd9\u4e2a|\u4e0d\u5bf9|\u6211\u4e0d\u662f\u8bf4|\u6211\u8bf4\u7684\u662f|\u4e0d\u662f\u90a3\u4e2a)",
            text,
        ):
            kind = "correction"
        elif re.search(r"(shorter|too long|briefly|one sentence|summari[sz]e|less detail)", text) or re.search(
            r"(\u8bf4\u77ed\u70b9|\u77ed\u4e00\u70b9|\u7b80\u5355\u70b9|\u7b80\u77ed|\u592a\u957f|\u4e00\u53e5\u8bdd|\u5c11\u4e00\u70b9)",
            text,
        ):
            kind = "shorten"
        elif re.search(r"(rephrase|say it differently|different wording|another way|say that again)", text) or re.search(
            r"(\u6362\u4e2a\u8bf4\u6cd5|\u91cd\u65b0\u8bf4|\u6362\u4e00\u4e0b|\u518d\u8bf4\u4e00\u904d)",
            text,
        ):
            kind = "rephrase"
        elif re.search(r"(continue|go on|keep going|finish that|same topic)", text) or re.search(
            r"(\u7ee7\u7eed|\u63a5\u7740|\u8bf4\u5b8c|\u8fd8\u662f\u8fd9\u4e2a|\u521a\u624d\u90a3\u4e2a)",
            text,
        ):
            kind = "continue"
        elif re.search(r"(stop|cancel|never mind|nevermind|wait|hold on|drop it|forget it)", text) or re.search(
            r"(\u505c|\u522b\u8bf4|\u6253\u4f4f|\u7b49\u7b49|\u7b97\u4e86|\u5148\u522b|\u4e0d\u7528\u4e86)",
            text,
        ):
            kind = "stop"
        elif re.search(r"^(also|plus|and|actually|by the way|btw)\b", text) or re.search(
            r"(\u8fd8\u6709|\u53e6\u5916|\u8865\u5145|\u987a\u4fbf|\u5176\u5b9e|\u5bf9\u4e86)",
            text,
        ):
            kind = "supplement"
        else:
            kind = "new_topic" if compact else "stop"
    move_by_kind = {
        "stop": "yield",
        "correction": "repair",
        "shorten": "shorten",
        "rephrase": "rephrase",
        "continue": "continue_topic",
        "supplement": "integrate",
        "new_topic": "answer_latest",
    }
    goal_by_kind = {
        "stop": "stop_or_acknowledge_briefly",
        "correction": "repair_mismatch_without_defensiveness",
        "shorten": "compress_interrupted_answer",
        "rephrase": "restate_interrupted_point",
        "continue": "continue_only_if_user_asked",
        "supplement": "fold_user_addition_into_current_thread",
        "new_topic": "answer_latest_message_without_resuming_old_answer",
    }
    turn_manager = interruption.get("turn_manager") if isinstance(interruption.get("turn_manager"), dict) else {}
    return {
        "active": True,
        "kind": kind,
        "reply_move": _clean_text(raw_policy.get("reply_move"), 48) or move_by_kind[kind],
        "goal": _clean_text(raw_policy.get("goal"), 96) or goal_by_kind[kind],
        "assistant_summary": _clean_text(
            interruption.get("assistant_summary") or interruption.get("assistant_partial"),
            140,
        ),
        "previous_user_summary": _clean_text(
            interruption.get("previous_user_summary") or interruption.get("previous_user_message"),
            100,
        ),
        "turn_action": _clean_text(turn_manager.get("action"), 48),
        "segment_role": _clean_text(turn_manager.get("segment_role"), 32),
    }


def public_barge_in_policy(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    kind = _clean_text(raw.get("kind"), 48)
    if kind not in BARGE_IN_KINDS:
        kind = "none"
    active = raw.get("active") is True and kind != "none"
    return {
        "active": active,
        "kind": kind if active else "none",
        "reply_move": _clean_text(raw.get("reply_move"), 48) if active else "none",
        "goal": _clean_text(raw.get("goal"), 96) if active else "",
        "assistant_summary": _clean_text(raw.get("assistant_summary"), 140) if active else "",
        "previous_user_summary": _clean_text(raw.get("previous_user_summary"), 100) if active else "",
        "turn_action": _clean_text(raw.get("turn_action"), 48) if active else "",
        "segment_role": _clean_text(raw.get("segment_role"), 32) if active else "",
    }


def apply_barge_in_policy_controls(decision: Dict[str, Any]) -> None:
    barge = public_barge_in_policy(
        decision.get("barge_in_policy") if isinstance(decision.get("barge_in_policy"), dict) else {}
    )
    if not barge["active"]:
        return
    kind = barge["kind"]
    cap_by_kind = {
        "stop": 1,
        "correction": 2,
        "shorten": 2,
        "rephrase": 2,
        "continue": 3,
        "supplement": 2,
        "new_topic": 2,
    }
    decision["relationship"] = "interruptible_desktop_companion"
    decision["reply_style"] = "barge_in_followup"
    decision["question_policy"] = "none"
    decision["max_sentences"] = min(
        max(1, _safe_int(decision.get("max_sentences"), 3)),
        cap_by_kind.get(kind, 2),
    )
    if kind == "stop":
        decision["opening_move"] = "micro_reaction"
        decision["reply_shape"] = "one_liner"
        decision["banter_level"] = 0
        decision["spontaneity"] = 0
    elif kind in {"shorten", "rephrase", "correction"}:
        decision["opening_move"] = "answer_first"
        decision["reply_shape"] = "one_liner"
        decision["banter_level"] = min(max(0, _safe_int(decision.get("banter_level"), 0)), 1)
        decision["spontaneity"] = min(max(0, _safe_int(decision.get("spontaneity"), 0)), 1)
    elif kind == "continue":
        decision["opening_move"] = "answer_first"
        decision["reply_shape"] = "two_beat"
    else:
        decision["opening_move"] = "answer_first"
        decision["reply_shape"] = "two_beat"
        decision["banter_level"] = min(max(0, _safe_int(decision.get("banter_level"), 0)), 1)
        decision["spontaneity"] = min(max(0, _safe_int(decision.get("spontaneity"), 0)), 1)
    decision["directive"] += (
        f" Barge-in reply policy: kind={kind}, reply_move={barge['reply_move']}, goal={barge['goal'] or 'answer_latest_first'}. "
        "Treat the interrupted assistant summary as context only; do not resume it unless this policy asks for continue. "
        "Answer the user's latest interruption as a natural conversational move."
    )
