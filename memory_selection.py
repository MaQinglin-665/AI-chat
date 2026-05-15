import re


RECALL_GENERIC_TOKENS = {
    "memory", "memories", "remember", "remembered", "wrong", "correct", "correction",
    "forget", "delete", "remove", "should", "actually", "called", "named", "project",
    "repo", "codebase", "next", "step", "continue", "topic", "task", "about",
    "记忆", "记得", "记错", "忘记", "忘掉", "删除", "更正", "纠正", "应该", "其实",
    "不是", "项目", "仓库", "下一步", "继续", "任务", "话题",
}


def is_core_memory_prompt_eligible(item, settings, *, looks_garbled_text, looks_sensitive_memory_text):
    safe = item if isinstance(item, dict) else {}
    if not safe:
        return False
    if str(safe.get("status", "active") or "active").strip().lower() != "active":
        return False
    if looks_garbled_text(safe.get("text", "")) or looks_sensitive_memory_text(safe.get("text", "")):
        return False
    try:
        importance = float(safe.get("importance", 0) or 0)
    except (TypeError, ValueError):
        importance = 0.0
    try:
        confidence = float(safe.get("confidence", 0) or 0)
    except (TypeError, ValueError):
        confidence = 0.0
    return (
        importance >= float(settings.get("core_min_importance", 0.45))
        and confidence >= float(settings.get("core_min_confidence", 0.55))
    )


def strong_recall_tokens(text, *, tokenize_memory_text):
    tokens = tokenize_memory_text(text)
    out = set()
    for token in tokens:
        safe = str(token or "").strip().lower()
        if not safe or safe in RECALL_GENERIC_TOKENS:
            continue
        if re.fullmatch(r"[a-z0-9_][a-z0-9_-]{2,}", safe):
            out.add(safe)
            continue
        if re.fullmatch(r"[\u4e00-\u9fff]{2,10}", safe) and safe not in RECALL_GENERIC_TOKENS:
            out.add(safe)
    return out


def extract_denied_memory_tokens(text, *, normalize_memory_text, strong_recall_tokens_fn):
    safe = str(text or "").strip()
    if not safe:
        return set()
    out = set()
    patterns = (
        r"\bnot\s+(?:called|named|about|this|that|it|as)?\s*([A-Za-z0-9_-]{2,})",
        r"\binstead of\s+([A-Za-z0-9_-]{2,})",
        r"\bno longer\s+(?:called|named|about)?\s*([A-Za-z0-9_-]{2,})",
        r"(?:不是叫|不是|不叫|并非|不要叫|别叫)\s*([A-Za-z0-9_-]{2,}|[\u4e00-\u9fff]{2,12})",
    )
    for pattern in patterns:
        for match in re.finditer(pattern, safe, flags=re.IGNORECASE):
            token = normalize_memory_text(match.group(1), max_len=40).strip("，,。.!！?？:：;；\"'“”‘’()（）[]【】")
            if token:
                out.update(strong_recall_tokens_fn(token) or {token.lower()})
    return {token for token in out if token and token not in RECALL_GENERIC_TOKENS}


def has_current_fact_assertion(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(my .{0,32}\b(?:is|are|was|were|called|named)\b|"
            r"\bi (?:am|prefer|like|dislike|want|need)\b|"
            r"\bthe .{0,32}\b(?:is|are|should be|changed to)\b|"
            r"我.{0,12}(?:叫|是|喜欢|不喜欢|想要|需要|希望|偏好)|"
            r"(?:项目|仓库|名字|称呼).{0,16}(?:是|叫|改成|应该是))",
            safe,
            flags=re.IGNORECASE,
        )
    )


def memory_recall_conflict_reason(user_message, memory_text, settings=None, *, helpers):
    settings = settings or {}
    if not settings.get("memory_conflict_protection_enabled", True):
        return ""
    user = helpers["normalize_memory_text"](user_message, max_len=220)
    item_text = helpers["normalize_memory_text"](memory_text, max_len=260)
    if not user or not item_text:
        return ""
    if helpers["has_memory_forget_intent"](user):
        return "current_forget_request"
    if helpers["has_memory_correction_intent"](user):
        return "current_correction"
    denied = helpers["extract_denied_memory_tokens"](user)
    if denied and denied & helpers["strong_recall_tokens"](item_text):
        return "current_denies_memory_token"
    return ""


def compact_memory_skip_item(item, reason, score=0, source="memory", *, normalize_memory_text, clamp_int):
    safe = item if isinstance(item, dict) else {}
    text = safe.get("text")
    if text is None:
        text = f"{safe.get('user', '')} {safe.get('assistant', '')}"
    return {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": str(source or "").strip()[:40],
        "reason": str(reason or "").strip()[:80],
        "score": clamp_int(score, 0, 0, 999),
        "text": normalize_memory_text(text, max_len=120),
    }


def select_core_memory_items_for_prompt(
    eligible,
    settings,
    query_tokens,
    user_message="",
    explicit_memory_intent=False,
    *,
    tokenize_memory_text,
    learning_item_sort_time,
    conflict_reason_fn,
    append_unique_core_memory_item,
    compact_skip_item_fn,
):
    query = query_tokens if isinstance(query_tokens, set) else set()
    requires_strong_match = has_current_fact_assertion(user_message) and not explicit_memory_intent
    scored = []
    skipped = []
    for idx, item in enumerate(eligible):
        memory_tokens = tokenize_memory_text(
            f"{item.get('text', '')} {' '.join(item.get('tags', []) if isinstance(item.get('tags'), list) else [])}"
        )
        relevance = len(query & memory_tokens)
        conflict_reason = conflict_reason_fn(user_message, item.get("text", ""), settings=settings)
        if conflict_reason:
            skipped.append(compact_skip_item_fn(item, conflict_reason, score=relevance, source="core_memory"))
            continue
        if requires_strong_match and relevance <= 1:
            skipped.append(compact_skip_item_fn(item, "weak_match_current_assertion", score=relevance, source="core_memory"))
            continue
        if relevance <= 0 and not explicit_memory_intent:
            continue
        try:
            importance = float(item.get("importance", 0) or 0)
        except (TypeError, ValueError):
            importance = 0.0
        try:
            confidence = float(item.get("confidence", 0) or 0)
        except (TypeError, ValueError):
            confidence = 0.0
        pinned = 1 if item.get("pinned") else 0
        scored.append((relevance, pinned, importance, confidence, learning_item_sort_time(item), -idx, item))
    if not scored:
        return [], "conflict_protected" if skipped else "no_relevant_memories", skipped[:8]
    scored.sort(reverse=True)

    count = max(0, int(settings.get("core_inject_count", 0) or 0))
    selected = []
    seen = set()
    for relevance, _pinned, _importance, _confidence, _time, _idx, item in scored:
        enriched = dict(item)
        enriched["memory_kind"] = str(item.get("kind", "") or "").strip()
        enriched["kind"] = "core_memory"
        enriched["relevance"] = relevance
        if append_unique_core_memory_item(selected, seen, enriched) and len(selected) >= count:
            break
    if selected:
        reason = "selected"
    elif skipped:
        reason = "conflict_protected"
    else:
        reason = "no_match"
    return selected, reason, skipped[:8]


def is_short_followup_message(text):
    compact = re.sub(r"[\s\u3000，。！？!?.,;:、~～'\"]+", "", str(text or "").strip().lower())
    return compact in {
        "继续",
        "下一步",
        "下一个阶段",
        "下一阶段",
        "好的",
        "好",
        "做吧",
        "做",
        "开始吧",
        "继续做",
        "next",
        "nextstep",
        "continue",
        "goon",
    }


def select_short_term_memory_items_for_prompt(
    items,
    settings,
    query_tokens,
    user_message,
    explicit_memory_intent=False,
    *,
    tokenize_memory_text,
    looks_sensitive_memory_text,
    looks_garbled_text,
    conflict_reason_fn,
    append_unique_short_term_memory_item,
    compact_skip_item_fn,
):
    query = query_tokens if isinstance(query_tokens, set) else set()
    followup = is_short_followup_message(user_message)
    scored = []
    skipped = []
    for idx, item in enumerate(items):
        if str(item.get("status", "active") or "active").strip().lower() != "active":
            continue
        text = item.get("text", "")
        if looks_sensitive_memory_text(text) or looks_garbled_text(text):
            continue
        memory_tokens = tokenize_memory_text(f"{text} {' '.join(item.get('tags', []) if isinstance(item.get('tags'), list) else [])}")
        relevance = len(query & memory_tokens)
        conflict_reason = conflict_reason_fn(user_message, text, settings=settings)
        if conflict_reason:
            skipped.append(compact_skip_item_fn(item, conflict_reason, score=relevance, source="short_term_memory"))
            continue
        if relevance <= 0 and not followup and not explicit_memory_intent:
            continue
        try:
            salience = float(item.get("salience", 0) or 0)
        except (TypeError, ValueError):
            salience = 0.0
        try:
            last_seen_turn = int(item.get("last_seen_turn", 0) or 0)
        except (TypeError, ValueError):
            last_seen_turn = 0
        scored.append((relevance, 1 if followup else 0, salience, last_seen_turn, -idx, item))
    if not scored:
        return [], "no_relevant_short_memories", skipped[:8]
    scored.sort(reverse=True)

    count = max(0, int(settings.get("short_inject_count", 0) or 0))
    selected = []
    seen = set()
    for relevance, _followup, _salience, _turn, _idx, item in scored:
        enriched = dict(item)
        enriched["kind"] = "short_term_memory"
        enriched["short_kind"] = str(item.get("kind", "") or "").strip()
        enriched["relevance"] = relevance
        if append_unique_short_term_memory_item(selected, seen, enriched) and len(selected) >= count:
            break
    if selected:
        reason = "selected"
    elif skipped:
        reason = "conflict_protected"
    else:
        reason = "no_match"
    return selected, reason, skipped[:8]
