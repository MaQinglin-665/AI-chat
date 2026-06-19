import json
import re
from datetime import datetime


CORE_MEMORY_KINDS = {"semantic", "episodic"}

CORE_MEMORY_CATEGORIES = {
    "project_context",
    "stable_fact",
    "user_preference",
    "relationship",
    "recent_event",
}


def _default_normalize_text(value, max_len=220):
    safe = " ".join(str(value or "").split())
    return safe[: max(0, int(max_len or 0))]


def _default_clamp_int(value, default, min_value, max_value):
    try:
        ivalue = int(value)
    except (TypeError, ValueError):
        ivalue = int(default)
    return max(min_value, min(max_value, ivalue))


def classify_core_memory_text(text):
    safe = str(text or "").strip().lower()
    category = "stable_fact"
    kind = "semantic"
    if re.search(r"(项目|仓库|project|repo|repository|codebase|功能|bug|live2d|tts|asr|llm|electron|python)", safe):
        category = "project_context"
    elif re.search(r"(喜欢|不喜欢|偏好|prefer|preference|like|dislike|讨厌)", safe):
        category = "user_preference"
    elif re.search(r"(关系|陪伴|朋友|聊天方式|相处|称呼|叫我|call me)", safe):
        category = "relationship"
    if re.search(r"(今天|刚刚|刚才|昨天|昨晚|这次|现在|正在|已经|完成|修复|下一步|下一阶段|today|yesterday|now|currently|finished|fixed)", safe):
        kind = "episodic"
        if category == "stable_fact":
            category = "recent_event"
    return kind, category


def make_core_memory_id(kind, category, text, now_func=None):
    slug = re.sub(r"[^a-z0-9]+", "_", str(text or "").lower()).strip("_")[:24]
    if not slug:
        slug = "memory"
    safe_kind = kind if kind in CORE_MEMORY_KINDS else "semantic"
    safe_category = category if category in CORE_MEMORY_CATEGORIES else "stable_fact"
    now = now_func() if callable(now_func) else datetime.now()
    return f"mem_{now.strftime('%Y%m%d%H%M%S%f')}_{safe_kind}_{safe_category}_{slug}"


def normalize_core_memory_item(
    item,
    fallback_id="",
    *,
    normalize_text_func=None,
    looks_garbled_func=None,
    looks_sensitive_func=None,
    looks_stagey_func=None,
    clamp_int_func=None,
    now_func=None,
):
    normalize_text = normalize_text_func or _default_normalize_text
    looks_garbled = looks_garbled_func or (lambda _text: False)
    looks_sensitive = looks_sensitive_func or (lambda _text: False)
    looks_stagey = looks_stagey_func or (lambda _text: False)
    clamp_int = clamp_int_func or _default_clamp_int
    safe = item if isinstance(item, dict) else {}
    text = normalize_text(safe.get("text", ""), max_len=260)
    if len(text) < 4:
        return None
    if looks_garbled(text) or looks_sensitive(text) or looks_stagey(text):
        return None
    kind = str(safe.get("kind", "semantic") or "semantic").strip().lower()
    if kind not in CORE_MEMORY_KINDS:
        kind = "semantic"
    category = str(safe.get("category", "stable_fact") or "stable_fact").strip().lower()
    if category not in CORE_MEMORY_CATEGORIES:
        category = "stable_fact"
    try:
        importance = max(0.0, min(1.0, float(safe.get("importance", 0.55) or 0.55)))
    except (TypeError, ValueError):
        importance = 0.55
    try:
        confidence = max(0.0, min(1.0, float(safe.get("confidence", 0.55) or 0.55)))
    except (TypeError, ValueError):
        confidence = 0.55
    tags = safe.get("tags", [])
    if not isinstance(tags, list):
        tags = []
    tags = [
        normalize_text(tag, max_len=24)
        for tag in tags[:8]
        if normalize_text(tag, max_len=24)
    ]
    origin = safe.get("origin") if isinstance(safe.get("origin"), dict) else {}
    now = now_func() if callable(now_func) else datetime.now()
    now_text = now.isoformat(timespec="seconds")
    return {
        "id": str(
            safe.get("id")
            or fallback_id
            or make_core_memory_id(kind, category, text, now_func=now_func)
        ).strip(),
        "kind": kind,
        "category": category,
        "text": text,
        "source": str(safe.get("source", "conversation") or "conversation").strip()[:40],
        "status": str(safe.get("status", "active") or "active").strip().lower(),
        "importance": round(importance, 4),
        "confidence": round(confidence, 4),
        "tags": tags,
        "created_at": str(safe.get("created_at", "") or now_text).strip(),
        "updated_at": str(safe.get("updated_at", "") or safe.get("created_at", "") or now_text).strip(),
        "last_used_at": str(safe.get("last_used_at", "") or "").strip(),
        "use_count": clamp_int(safe.get("use_count", 0), 0, 0, 999999),
        "pinned": bool(safe.get("pinned", False)),
        "origin": {
            "user_preview": normalize_text(origin.get("user_preview", ""), max_len=140),
            "assistant_preview": normalize_text(origin.get("assistant_preview", ""), max_len=160),
        },
    }


def load_core_memory_items(path, **normalize_kwargs):
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return []
    raw_items = data.get("items", []) if isinstance(data, dict) else data
    if not isinstance(raw_items, list):
        return []
    items = []
    for idx, raw in enumerate(raw_items):
        item = normalize_core_memory_item(raw, fallback_id=f"mem_{idx}", **normalize_kwargs)
        if item and item.get("status") not in {"deleted", "rejected", "archived"}:
            items.append(item)
    return items


def save_core_memory_items(path, items, logger=None, **normalize_kwargs):
    normalized = []
    for idx, raw in enumerate(items if isinstance(items, list) else []):
        item = normalize_core_memory_item(raw, fallback_id=f"mem_{idx}", **normalize_kwargs)
        if item is not None:
            normalized.append(item)
    now_func = normalize_kwargs.get("now_func")
    now = now_func() if callable(now_func) else datetime.now()
    payload = {
        "schema_version": 1,
        "updated_at": now.isoformat(timespec="seconds"),
        "items": normalized,
    }
    tmp_path = path.with_suffix(".tmp")
    bak_path = path.with_suffix(".bak")
    previous = None
    if path.exists():
        try:
            previous = path.read_bytes()
        except Exception:
            previous = None
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(path)
    if previous is not None:
        try:
            bak_path.write_bytes(previous)
        except Exception:
            if logger:
                logger.debug("write core memory backup failed", exc_info=True)


def core_memory_similarity(
    a,
    b,
    *,
    learning_pattern_key_func=None,
    tokenize_text_func=None,
):
    pattern_key = learning_pattern_key_func or (lambda value: re.sub(r"\s+", "", str(value or "").lower()))
    tokenize_text = tokenize_text_func or (lambda value: {part for part in str(value or "").lower().split() if part})
    key_a = pattern_key(a)
    key_b = pattern_key(b)
    if not key_a or not key_b:
        return 0.0
    if key_a == key_b:
        return 1.0
    if len(key_a) >= 12 and len(key_b) >= 12 and (key_a in key_b or key_b in key_a):
        return 0.9
    tokens_a = tokenize_text(a)
    tokens_b = tokenize_text(b)
    if not tokens_a or not tokens_b:
        return 0.0
    overlap = len(tokens_a & tokens_b)
    return round(overlap / max(1, min(len(tokens_a), len(tokens_b))), 4)
