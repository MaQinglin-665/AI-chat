import re


def has_memory_forget_intent(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(forget this|forget that|forget what|forget the memory|forget .*memory|forget .*about|"
            r"delete memory|remove memory|clear memory|"
            r"don't remember|do not remember|"
            r"忘掉|忘记这|忘记刚|删掉|删除记忆|清除记忆|别记住|别记录|不要记住|不要再记)",
            safe,
            flags=re.IGNORECASE,
        )
    )


def has_memory_correction_intent(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    if has_memory_forget_intent(safe):
        return True
    return bool(
        re.search(
            r"(you remembered wrong|remembered wrong|that's wrong|that is wrong|not that|not this|"
            r"actually\s+(?:it'?s|it is|my|the|this|that)|"
            r"should be|correct to|correction|change it to|update it to|"
            r"你记错|记错了|不对|错了|不是这个|不是这样|应该是|其实是|改成|更正|纠正)",
            safe,
            flags=re.IGNORECASE,
        )
    )


def extract_memory_correction_text(text, *, normalize_memory_text, tokenize_memory_text):
    safe = normalize_memory_text(text, max_len=220)
    if not safe:
        return ""
    cleaned = re.sub(
        r"^(你记错了?|记错了?|不对|错了|不是这个|不是这样|actually|you remembered wrong|remembered wrong|that's wrong|that is wrong)"
        r"[，,。.:：\s]*",
        "",
        safe,
        flags=re.IGNORECASE,
    ).strip()
    for pattern in (
        r"(?:应该是|其实是|改成|更正为|纠正为)[：:，,\s]*(.+)$",
        r"(?:should be|actually|correct(?:ion)?(?: to)?|change it to|update it to)[：:，,\s]*(.+)$",
    ):
        match = re.search(pattern, safe, flags=re.IGNORECASE)
        if match:
            tail = normalize_memory_text(match.group(1), max_len=180)
            if len(tail) >= 4 and len(tokenize_memory_text(tail)) >= 2:
                return tail
            if len(cleaned) >= 4:
                return cleaned
    return cleaned if len(cleaned) >= 4 else safe


def score_memory_correction_match(query_text, correction_text, item, *, helpers):
    safe = item if isinstance(item, dict) else {}
    text = helpers["normalize_memory_text"](safe.get("text", ""), max_len=260)
    if not text:
        return 0.0
    score = max(
        helpers["core_memory_similarity"](query_text, text),
        helpers["core_memory_similarity"](correction_text, text),
    )
    query_tokens = helpers["tokenize_memory_text"](f"{query_text} {correction_text}")
    text_tokens = helpers["tokenize_memory_text"](text)
    if query_tokens and text_tokens:
        score = max(score, len(query_tokens & text_tokens) / max(1, min(len(query_tokens), len(text_tokens))))
    category = str(safe.get("category", "") or "").strip()
    kind = str(safe.get("kind", "") or "").strip()
    joined = f"{query_text} {correction_text}".lower()
    if category == "project_context" and re.search(r"(project|repo|codebase|项目|仓库|功能|live2d|tts|asr|llm)", joined):
        score += 0.12
    if category == "user_preference" and re.search(r"(prefer|like|dislike|喜欢|不喜欢|偏好)", joined):
        score += 0.12
    if kind in {"current_task", "recent_decision", "open_loop"} and re.search(r"(下一步|任务|继续|做|next|task|continue)", joined):
        score += 0.08
    return round(min(1.0, score), 4)
