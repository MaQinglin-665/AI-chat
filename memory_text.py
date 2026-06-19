import re


EN_STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with",
    "is", "are", "was", "were", "be", "been", "am", "i", "you", "he", "she",
    "it", "we", "they", "this", "that", "these", "those", "my", "your", "his",
    "her", "our", "their", "me", "him", "them", "do", "does", "did", "have",
    "has", "had", "can", "could", "will", "would", "should", "at", "by",
    "from", "as", "if", "then", "than",
}

CN_WORD_STOPWORDS = {
    "我们", "你们", "他们", "她们", "这个", "那个", "这里", "那里", "现在", "然后",
    "就是", "一个", "一些", "没有", "可以", "不是", "什么", "怎么", "真的", "但是",
    "因为", "所以", "而且", "如果", "已经", "还是", "只是",
}

CN_CHAR_STOPWORDS = {
    "的", "了", "吗", "呢", "啊", "呀", "哦", "吧", "嘛", "啦", "这", "那", "我",
    "你", "他", "她", "它", "们", "是", "在", "有", "和", "就", "都", "也", "很",
    "还", "又", "被", "让", "给", "对", "把", "着", "个",
}

STAGEY_REPLY_RE = re.compile(
    r"(递给你|倒(一)?杯|泡(杯|壶)?茶|茶(刚)?泡开|分你半杯|陪你喝|"
    r"刚(揉|眯|啃|吃)|揉了揉眼|眨巴眼|端来一杯|拿了杯)"
)

MOJIBAKE_RE = re.compile(r"(浣犲|鍦ㄥ悧|鍢匡紝|銆\?|鐢ㄦ埛|鍥炵瓟|涓€|锛|鎬庝箞)")

SENSITIVE_MEMORY_RE = re.compile(
    r"(?i)("
    r"api[_-]?key|secret|password|passwd|authorization|bearer\s+[a-z0-9._-]+|"
    r"sk-[a-z0-9]{16,}|github_pat_[a-z0-9_]+|ghp_[a-z0-9]{16,}|"
    r"[a-z]:\\(?:users|ai|windows|program files)|"
    r"/(?:users|home|var|etc)/|"
    r"https?://[^/\s]+:[^@\s]+@"
    r")"
)

LOW_SIGNAL_MEMORY_QUERIES = {
    "ok",
    "okay",
    "yes",
    "yep",
    "sure",
    "good",
    "continue",
    "goon",
    "next",
    "nextstep",
    "好",
    "好的",
    "可以",
    "行",
    "嗯",
    "嗯嗯",
    "是的",
    "继续",
    "下一步",
    "然后呢",
}


def normalize_memory_text(text, max_len=220):
    safe = " ".join(str(text or "").split())
    if len(safe) > max_len:
        safe = safe[: max_len - 1].rstrip() + "..."
    return safe


def looks_garbled_text(text):
    s = str(text or "").strip()
    if not s:
        return False
    if "\ufffd" in s:
        return True
    return bool(MOJIBAKE_RE.search(s))


def looks_stagey_text(text):
    s = str(text or "").strip()
    if not s:
        return False
    return bool(STAGEY_REPLY_RE.search(s))


def looks_sensitive_memory_text(text):
    s = str(text or "").strip()
    if not s:
        return False
    return bool(SENSITIVE_MEMORY_RE.search(s))


def is_lightweight_checkin_message(text):
    safe = re.sub(r"\s+", "", str(text or "").strip().lower())
    if not safe:
        return False
    return bool(
        re.fullmatch(
            r"(在吗|在嘛|在不在|在么|喂|嗨|hi|hello|哈喽|早|早安|早上好|晚安|午安|睡了吗)[!！?？~～]*",
            safe,
        )
    )


def has_explicit_memory_intent(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(remember|recall|memory|memories|previously|earlier|last time|记得|记忆|之前|以前|上次)",
            safe,
        )
    )


def is_specific_memory_query(text):
    raw = str(text or "").strip()
    if not raw:
        return False
    compact = re.sub(r"[\s\u3000，。！？!?.,;:、~～'\"]+", "", raw.lower())
    if compact in LOW_SIGNAL_MEMORY_QUERIES:
        return False
    if has_explicit_memory_intent(raw):
        return True

    alpha_terms = re.findall(r"[A-Za-z0-9_]{3,}", raw.lower())
    cjk_terms = [ch for ch in raw if "\u4e00" <= ch <= "\u9fff" and ch not in CN_CHAR_STOPWORDS]
    tokens = tokenize_memory_text(raw)
    if len(alpha_terms) >= 2:
        return True
    if len(cjk_terms) >= 6 and len(tokens) >= 2:
        return True
    return len(tokens) >= 3 and len(compact) >= 8


def tokenize_memory_text(text):
    src = str(text or "")
    tokens = set()

    for token in re.findall(r"[A-Za-z0-9_]{2,}", src.lower()):
        if token not in EN_STOPWORDS:
            tokens.add(token)

    for chunk in re.findall(r"[\u4e00-\u9fff]{2,10}", src):
        if chunk not in CN_WORD_STOPWORDS:
            tokens.add(chunk)
        for i in range(len(chunk) - 1):
            bg = chunk[i : i + 2]
            if bg in CN_WORD_STOPWORDS:
                continue
            if all(ch in CN_CHAR_STOPWORDS for ch in bg):
                continue
            tokens.add(bg)

    for ch in src:
        if "\u4e00" <= ch <= "\u9fff" and ch not in CN_CHAR_STOPWORDS:
            tokens.add(ch)

    return tokens
