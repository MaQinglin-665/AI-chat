import re


def strip_short_memory_prefix(text, *, normalize_memory_text):
    safe = normalize_memory_text(text, max_len=220)
    return re.sub(
        r"^(当前任务|当前话题|最近判断|未完成事项|用户当前状态)[：:]\s*",
        "",
        safe,
        flags=re.IGNORECASE,
    ).strip()


def is_completed_or_decided_short_memory(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(完成|已完成|修复|通过|决定|确认|下一阶段|收口|上线|发布|"
            r"done|finished|fixed|implemented|passed|decided|confirmed|released)",
            safe,
            flags=re.IGNORECASE,
        )
    )


def short_memory_consolidation_reason(item, settings, *, helpers):
    safe = item if isinstance(item, dict) else {}
    if safe.get("consolidated_at"):
        return ""
    text = strip_short_memory_prefix(
        safe.get("text", ""),
        normalize_memory_text=helpers["normalize_memory_text"],
    )
    if (
        len(text) < 4
        or helpers["looks_garbled_text"](text)
        or helpers["looks_sensitive_memory_text"](text)
        or helpers["looks_stagey_text"](text)
    ):
        return ""
    kind = str(safe.get("kind", "") or "").strip().lower()
    support_count = helpers["clamp_int"](safe.get("support_count", 1), 1, 1, 999)
    min_support = int(settings.get("memory_consolidation_min_support", 2) or 2)
    if kind in {"current_task", "recent_decision", "open_loop"} and support_count >= min_support:
        return "repeated_short_memory"
    if kind in {"current_task", "recent_decision", "open_loop"} and is_completed_or_decided_short_memory(text):
        return "completed_or_decided"
    if kind == "current_topic" and support_count >= min_support + 1:
        return "repeated_topic"
    return ""


def build_short_memory_consolidation_candidate(item, reason, *, helpers):
    safe = item if isinstance(item, dict) else {}
    text = strip_short_memory_prefix(
        safe.get("text", ""),
        normalize_memory_text=helpers["normalize_memory_text"],
    )
    kind, category = helpers["classify_core_memory_text"](text)
    short_kind = str(safe.get("kind", "") or "").strip().lower()
    if short_kind in {"current_task", "recent_decision", "open_loop"}:
        kind = "episodic"
        if category == "stable_fact":
            category = "recent_event"
    salience = helpers["clamp_float"](safe.get("salience", 0.62), 0.62, 0.0, 1.0)
    support_count = helpers["clamp_int"](safe.get("support_count", 1), 1, 1, 999)
    return {
        "kind": kind,
        "category": category,
        "text": text,
        "source": "short_consolidation",
        "importance": max(0.62, salience),
        "confidence": 0.72 if support_count >= 2 else 0.66,
        "tags": list(dict.fromkeys([*(safe.get("tags", []) or []), "consolidated", reason]))[:8],
        "origin": safe.get("origin", {}) if isinstance(safe.get("origin"), dict) else {},
    }
