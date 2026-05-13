from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


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


def public_reply_quality(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    issues_raw = raw.get("issues") if isinstance(raw.get("issues"), list) else []
    actions_raw = raw.get("repair_actions") if isinstance(raw.get("repair_actions"), list) else []
    pre_raw = raw.get("pre_issues") if isinstance(raw.get("pre_issues"), list) else []
    return {
        "score": max(0, min(100, _safe_int(raw.get("score"), 100))),
        "passed": raw.get("passed") is not False,
        "issues": [_clean_text(item, 48) for item in issues_raw[:8] if _clean_text(item, 48)],
        "pre_issues": [_clean_text(item, 48) for item in pre_raw[:8] if _clean_text(item, 48)],
        "repair_actions": [_clean_text(item, 48) for item in actions_raw[:8] if _clean_text(item, 48)],
        "final_sentences": max(0, min(8, _safe_int(raw.get("final_sentences"), 0))),
        "final_chars": max(0, min(1200, _safe_int(raw.get("final_chars"), 0))),
        "reason": _clean_text(raw.get("reason"), 96),
    }


def assess_reply_quality(
    text: str,
    decision: Dict[str, Any],
    *,
    user_message: str = "",
    original: str = "",
    deps: Dict[str, Any],
) -> Dict[str, Any]:
    normalized = deps["normalize_reply_text_spacing"](text)
    original_text = deps["normalize_reply_text_spacing"](original)
    intent = deps["clean_text"](decision.get("intent"), 40)
    modality = deps["clean_text"](decision.get("input_modality"), 32) or "text"
    conv = deps["public_conversation_director"](
        decision.get("conversation_director") if isinstance(decision.get("conversation_director"), dict) else {}
    )
    barge = deps["public_barge_in_policy"](
        decision.get("barge_in_policy") if isinstance(decision.get("barge_in_policy"), dict) else {}
    )
    question_policy = deps["normalize_question_policy"](decision.get("question_policy"))
    max_sentences = max(1, min(8, deps["safe_int"](decision.get("max_sentences"), 3)))
    sentences = deps["split_reply_sentences"](normalized)
    issues: List[str] = []
    if not normalized:
        issues.append("empty_reply")
    if len(sentences) > max_sentences:
        issues.append("too_many_sentences")
    if modality == "voice" and len(sentences) > max(1, deps["safe_int"](conv.get("max_spoken_beats"), 1)):
        issues.append("too_long_for_voice")
    if question_policy == "none":
        if normalized.rstrip().endswith("?"):
            issues.append("unnecessary_question")
        if any(deps["is_generic_followup_sentence"](sentence) for sentence in sentences):
            issues.append("generic_followup")
    if deps["looks_like_bland_character_reply"](normalized, intent):
        issues.append("generic_customer_service")
    if deps["looks_like_scene_policy_violation"](normalized, intent, user_message):
        issues.append("scene_policy_drift")
    if deps["looks_like_context_bleed_reply"](normalized, intent, user_message):
        issues.append("context_bleed")
    if barge["active"]:
        kind = barge["kind"]
        lower = normalized.lower()
        if kind == "stop" and (len(normalized) > 90 or len(sentences) > 1):
            issues.append("missed_stop_barge_in")
        if kind == "shorten" and (len(normalized) > 220 or len(sentences) > 2):
            issues.append("missed_shorten_barge_in")
        if kind == "new_topic" and re.search(r"\b(as i was saying|to continue|going back|where i left off)\b", lower):
            issues.append("resumed_interrupted_answer")
        if kind in {"correction", "rephrase"} and re.search(r"\b(let me continue|as i was saying)\b", lower):
            issues.append("missed_barge_in_adjustment")
    pre_issues = ["needed_repair"] if original_text and len(original_text) > len(normalized) + 12 else []
    penalty = {
        "empty_reply": 80,
        "too_many_sentences": 18,
        "too_long_for_voice": 16,
        "unnecessary_question": 18,
        "generic_followup": 14,
        "generic_customer_service": 26,
        "scene_policy_drift": 32,
        "context_bleed": 32,
        "missed_stop_barge_in": 30,
        "missed_shorten_barge_in": 24,
        "resumed_interrupted_answer": 28,
        "missed_barge_in_adjustment": 24,
    }
    score = 100 - sum(penalty.get(issue, 10) for issue in dict.fromkeys(issues))
    return public_reply_quality(
        {
            "score": max(0, score),
            "passed": not issues,
            "issues": list(dict.fromkeys(issues)),
            "pre_issues": pre_issues,
            "repair_actions": [],
            "final_sentences": len(sentences),
            "final_chars": len(normalized),
            "reason": "ok" if not issues else "needs_attention",
        }
    )


def apply_reply_quality_repair(
    text: str,
    decision: Dict[str, Any],
    *,
    user_message: str = "",
    original: str = "",
    deps: Dict[str, Any],
) -> tuple[str, Dict[str, Any]]:
    current = deps["normalize_reply_text_spacing"](text)
    report = assess_reply_quality(current, decision, user_message=user_message, original=original, deps=deps)
    issues = set(report["issues"])
    actions: List[str] = []
    intent = deps["clean_text"](decision.get("intent"), 40)
    conv = deps["public_conversation_director"](
        decision.get("conversation_director") if isinstance(decision.get("conversation_director"), dict) else {}
    )
    barge = deps["public_barge_in_policy"](
        decision.get("barge_in_policy") if isinstance(decision.get("barge_in_policy"), dict) else {}
    )
    if {"scene_policy_drift", "context_bleed", "generic_customer_service"} & issues:
        fallback = deps["fallback_reply_for_intent"](intent, user_message)
        if fallback:
            current = deps["normalize_reply_text_spacing"](fallback)
            actions.append("fallback_for_quality")
    if {"generic_followup", "unnecessary_question"} & issues:
        sentences = deps["split_reply_sentences"](current)
        filtered = deps["remove_unwanted_questions"](sentences, allow_followup=False, clarify_only=False)
        filtered = deps["filter_policy_closers"](filtered, question_policy="none")
        if filtered:
            current = deps["normalize_reply_text_spacing"](" ".join(filtered))
            actions.append("removed_extra_question")
    if "too_long_for_voice" in issues:
        limit = max(1, min(2, deps["safe_int"](conv.get("max_spoken_beats"), 1)))
        sentences = deps["split_reply_sentences"](current)
        if len(sentences) > limit:
            current = deps["normalize_reply_text_spacing"](" ".join(sentences[:limit]))
            actions.append("compressed_voice_reply")
    if barge["active"]:
        kind = barge["kind"]
        if kind == "stop" and ("missed_stop_barge_in" in issues or len(current) > 90):
            current = "Okay, stopping there."
            actions.append("honored_stop_barge_in")
        elif kind == "shorten" and ("missed_shorten_barge_in" in issues or len(current) > 180):
            current = deps["compact_one_liner"](" ".join(deps["split_reply_sentences"](current)[:1]), 150)
            actions.append("honored_shorten_barge_in")
        elif kind == "new_topic" and "resumed_interrupted_answer" in issues:
            fallback = deps["fallback_reply_for_intent"](intent, user_message)
            if fallback:
                current = deps["normalize_reply_text_spacing"](fallback)
                actions.append("dropped_interrupted_resume")
    final = assess_reply_quality(current, decision, user_message=user_message, original=original, deps=deps)
    final["pre_issues"] = report["issues"] or report["pre_issues"]
    final["repair_actions"] = actions
    if actions:
        final["passed"] = not final["issues"]
        final["reason"] = "repaired" if final["passed"] else "repaired_with_residual_issues"
    return current, public_reply_quality(final)
