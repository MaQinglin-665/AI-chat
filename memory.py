import atexit
import json
import logging
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path

from config import MEMORY_PATH, MEMORY_SUMMARY_PATH
import memory_consolidation
import memory_correction
import memory_debug
import memory_selection
import memory_store

logger = logging.getLogger(__name__)

try:
    from mem0 import Memory as Mem0Memory
except Exception:
    Mem0Memory = None


MEMORY_LOCK = threading.Lock()
MEM0_LOCK = threading.Lock()
SUMMARY_LOCK = threading.Lock()
LEARNING_LOCK = threading.Lock()

MEM0_DIR = MEMORY_PATH.parent / ".mem0"
MEM0_QDRANT_DIR = MEM0_DIR / "qdrant"
MEM0_HISTORY_DB_PATH = MEM0_DIR / "history.db"
PROFILE_MEMORY_PATH = MEMORY_PATH.parent / "memory_profile.json"
RELATIONSHIP_MEMORY_PATH = MEMORY_PATH.parent / "memory_relationship.json"
MANUAL_PERSONA_CARD_PATH = MEMORY_PATH.parent / "memory_persona_card.json"
SHORT_TERM_MEMORY_PATH = MEMORY_PATH.parent / "memory_session.json"
CORE_MEMORY_PATH = MEMORY_PATH.parent / "memory_core.json"
LEARNING_CANDIDATES_PATH = MEMORY_PATH.parent / "learning_candidates.json"
LEARNING_SAMPLES_PATH = MEMORY_PATH.parent / "learning_samples.json"
LEARNING_STATE_PATH = MEMORY_PATH.parent / "learning_state.json"
LEARNING_AUDIT_LOG_PATH = MEMORY_PATH.parent / "learning_audit_log.jsonl"
LEARNING_SHADOW_LOG_PATH = MEMORY_PATH.parent / "learning_shadow_log.jsonl"

MEM0_CLIENT = None
LAST_MEMORY_DEBUG = {}
LAST_LEARNING_EXTRACTION_DEBUG = {}
LAST_SHORT_TERM_MEMORY_DEBUG = {}
LAST_CORE_MEMORY_DEBUG = {}
LAST_MEMORY_CONSOLIDATION_DEBUG = {}
LAST_MEMORY_CORRECTION_DEBUG = {}
MEM0_CLIENT_KEY = ""

LEGACY_MANUAL_PERSONA_CARD_FIELDS = (
    "identity",
    "user_preferences",
    "user_dislikes",
    "common_topics",
    "reply_style",
    "companionship_style",
)

MANUAL_PERSONA_CARD_FIELDS = (
    "character_name",
    "user_alias",
    "personality_tags",
    "speaking_style",
    "catchphrases",
    "likes",
    "dislikes",
    "initiative_level",
    "relationship_role",
    *LEGACY_MANUAL_PERSONA_CARD_FIELDS,
)

MANUAL_PERSONA_CARD_LIMITS = {
    "character_name": 80,
    "user_alias": 80,
    "personality_tags": 220,
    "speaking_style": 360,
    "catchphrases": 220,
    "likes": 400,
    "dislikes": 320,
    "initiative_level": 24,
    "relationship_role": 24,
    "identity": 180,
    "user_preferences": 400,
    "user_dislikes": 300,
    "common_topics": 320,
    "reply_style": 360,
    "companionship_style": 360,
}

CORE_MEMORY_KINDS = {"semantic", "episodic"}
CORE_MEMORY_CATEGORIES = {
    "project_context",
    "stable_fact",
    "user_preference",
    "relationship",
    "recent_event",
}
SHORT_TERM_MEMORY_KINDS = {
    "current_topic",
    "current_task",
    "recent_decision",
    "user_state",
    "open_loop",
}

PERSONA_RELATIONSHIP_ROLES = (
    "\u5b66\u4e60\u642d\u5b50",
    "\u684c\u9762\u4f19\u4f34",
    "\u60c5\u7eea\u966a\u4f34",
    "\u5de5\u4f5c\u52a9\u624b",
)

PERSONA_INITIATIVE_LEVELS = (
    "\u4f4e",
    "\u9002\u4e2d",
    "\u9ad8",
    "\u5f88\u9ad8",
)


def _close_mem0_client():
    global MEM0_CLIENT, MEM0_CLIENT_KEY
    client = MEM0_CLIENT
    MEM0_CLIENT = None
    MEM0_CLIENT_KEY = ""
    if client is None:
        return
    try:
        close_fn = getattr(client, "close", None)
        if callable(close_fn):
            close_fn()
    except Exception:
        logger.debug("close mem0 client failed", exc_info=True)


atexit.register(_close_mem0_client)


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

LEARNING_CANDIDATE_CATEGORIES = {
    "user_preference",
    "project_context",
    "relationship_style",
    "response_feedback",
    "stable_fact",
}


def _clamp_int(value, default, min_value, max_value):
    try:
        ivalue = int(value)
    except (TypeError, ValueError):
        ivalue = int(default)
    return max(min_value, min(max_value, ivalue))


def _clamp_float(value, default, min_value, max_value):
    try:
        fvalue = float(value)
    except (TypeError, ValueError):
        fvalue = float(default)
    return max(min_value, min(max_value, fvalue))


def get_memory_settings(config):
    raw = config.get("memory", {}) if isinstance(config, dict) else {}
    return {
        "enabled": bool(raw.get("enabled", True)),
        "max_items": _clamp_int(raw.get("max_items", 600), 600, 50, 4000),
        "inject_recent": _clamp_int(raw.get("inject_recent", 2), 2, 0, 8),
        "inject_relevant": _clamp_int(raw.get("inject_relevant", 4), 4, 0, 12),
        "learning_samples_enabled": bool(raw.get("learning_samples_enabled", True)),
        "learning_inject_count": _clamp_int(raw.get("learning_inject_count", 2), 2, 0, 4),
        "learning_min_score": _clamp_float(raw.get("learning_min_score", 0.55), 0.55, 0.0, 1.0),
        "learning_min_confidence": _clamp_float(raw.get("learning_min_confidence", 0.45), 0.45, 0.0, 1.0),
        "learning_candidates_enabled": bool(raw.get("learning_candidates_enabled", True)),
        "learning_candidate_max_items": _clamp_int(raw.get("learning_candidate_max_items", 200), 200, 20, 1000),
        "learning_candidate_min_score": _clamp_float(raw.get("learning_candidate_min_score", 0.45), 0.45, 0.0, 1.0),
        "learning_candidate_min_confidence": _clamp_float(raw.get("learning_candidate_min_confidence", 0.45), 0.45, 0.0, 1.0),
        "short_enabled": bool(raw.get("short_enabled", True)),
        "short_max_items": _clamp_int(raw.get("short_max_items", 24), 24, 4, 80),
        "short_inject_count": _clamp_int(raw.get("short_inject_count", 4), 4, 0, 8),
        "short_ttl_turns": _clamp_int(raw.get("short_ttl_turns", 16), 16, 2, 80),
        "memory_consolidation_enabled": bool(raw.get("memory_consolidation_enabled", True)),
        "memory_consolidation_min_support": _clamp_int(raw.get("memory_consolidation_min_support", 2), 2, 2, 8),
        "memory_correction_enabled": bool(raw.get("memory_correction_enabled", True)),
        "memory_conflict_protection_enabled": bool(raw.get("memory_conflict_protection_enabled", True)),
        "core_enabled": bool(raw.get("core_enabled", True)),
        "core_extraction_enabled": bool(raw.get("core_extraction_enabled", True)),
        "core_max_items": _clamp_int(raw.get("core_max_items", 300), 300, 20, 1200),
        "core_inject_count": _clamp_int(raw.get("core_inject_count", 3), 3, 0, 6),
        "core_min_importance": _clamp_float(raw.get("core_min_importance", 0.45), 0.45, 0.0, 1.0),
        "core_min_confidence": _clamp_float(raw.get("core_min_confidence", 0.55), 0.55, 0.0, 1.0),
        "summary_trigger_every": _clamp_int(raw.get("summary_trigger_every", 10), 10, 5, 50),
        "mem0_enabled": bool(raw.get("mem0_enabled", True)),
        "mem0_top_k": _clamp_int(raw.get("mem0_top_k", 5), 5, 1, 12),
        "mem0_threshold": _clamp_float(raw.get("mem0_threshold", 0.35), 0.35, 0.0, 1.0),
        "mem0_user_id": str(raw.get("mem0_user_id", "taffy-user") or "taffy-user").strip() or "taffy-user",
        "mem0_collection": str(raw.get("mem0_collection", "taffy_memory") or "taffy_memory").strip() or "taffy_memory",
        "mem0_qdrant_path": str(raw.get("mem0_qdrant_path", MEM0_QDRANT_DIR) or MEM0_QDRANT_DIR),
        "mem0_history_db_path": str(raw.get("mem0_history_db_path", MEM0_HISTORY_DB_PATH) or MEM0_HISTORY_DB_PATH),
        "mem0_embedding_model": str(raw.get("mem0_embedding_model", "text-embedding-v3") or "text-embedding-v3").strip() or "text-embedding-v3",
        "mem0_embedding_dims": _clamp_int(raw.get("mem0_embedding_dims", 1024), 1024, 128, 4096),
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
    "\u597d",
    "\u597d\u7684",
    "\u53ef\u4ee5",
    "\u884c",
    "\u55ef",
    "\u55ef\u55ef",
    "\u662f\u7684",
    "\u7ee7\u7eed",
    "\u4e0b\u4e00\u6b65",
    "\u7136\u540e\u5462",
}


def has_explicit_memory_intent(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(remember|recall|memory|memories|previously|earlier|last time|\u8bb0\u5f97|\u8bb0\u5fc6|\u4e4b\u524d|\u4ee5\u524d|\u4e0a\u6b21)",
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


def load_memory_items():
    return memory_store.load_interaction_items(
        MEMORY_PATH,
        normalize_text=normalize_memory_text,
        looks_garbled=looks_garbled_text,
        looks_stagey=looks_stagey_text,
    )


def save_memory_items(items):
    return memory_store.save_interaction_items(
        MEMORY_PATH,
        items,
        normalize_text=normalize_memory_text,
        looks_garbled=looks_garbled_text,
        looks_stagey=looks_stagey_text,
        logger=logger,
    )


def has_explicit_memory_write_intent(text):
    safe = str(text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(please remember|remember that|remember this|make a note|note that|"
            r"记住|记一下|帮我记|记到记忆|请记得|以后记得|你要记得)",
            safe,
        )
    )


def _extract_explicit_memory_text(text):
    raw = str(text or "").strip()
    if not raw:
        return ""
    patterns = [
        r"^(?:请|麻烦你|帮我|你)?(?:记住|记一下|帮我记|记到记忆里|请记得|以后记得|你要记得)[：:，,\s]*(.+)$",
        r"^(?:please\s+)?remember(?:\s+that|\s+this)?[:\s,]*(.+)$",
        r"^make\s+a\s+note(?:\s+that)?[:\s,]*(.+)$",
        r"^note\s+that[:\s,]*(.+)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, raw, flags=re.IGNORECASE)
        if match:
            return normalize_memory_text(match.group(1), max_len=220)
    return ""


def _classify_core_memory_text(text):
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


def _make_core_memory_id(kind, category, text):
    slug = re.sub(r"[^a-z0-9]+", "_", str(text or "").lower()).strip("_")[:24]
    if not slug:
        slug = "memory"
    safe_kind = kind if kind in CORE_MEMORY_KINDS else "semantic"
    safe_category = category if category in CORE_MEMORY_CATEGORIES else "stable_fact"
    return f"mem_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{safe_kind}_{safe_category}_{slug}"


def _normalize_core_memory_item(item, fallback_id=""):
    safe = item if isinstance(item, dict) else {}
    text = normalize_memory_text(safe.get("text", ""), max_len=260)
    if len(text) < 4:
        return None
    if looks_garbled_text(text) or looks_sensitive_memory_text(text) or looks_stagey_text(text):
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
        normalize_memory_text(tag, max_len=24)
        for tag in tags[:8]
        if normalize_memory_text(tag, max_len=24)
    ]
    origin = safe.get("origin") if isinstance(safe.get("origin"), dict) else {}
    now = datetime.now().isoformat(timespec="seconds")
    return {
        "id": str(safe.get("id") or fallback_id or _make_core_memory_id(kind, category, text)).strip(),
        "kind": kind,
        "category": category,
        "text": text,
        "source": str(safe.get("source", "conversation") or "conversation").strip()[:40],
        "status": str(safe.get("status", "active") or "active").strip().lower(),
        "importance": round(importance, 4),
        "confidence": round(confidence, 4),
        "tags": tags,
        "created_at": str(safe.get("created_at", "") or now).strip(),
        "updated_at": str(safe.get("updated_at", "") or safe.get("created_at", "") or now).strip(),
        "last_used_at": str(safe.get("last_used_at", "") or "").strip(),
        "use_count": _clamp_int(safe.get("use_count", 0), 0, 0, 999999),
        "pinned": bool(safe.get("pinned", False)),
        "origin": {
            "user_preview": normalize_memory_text(origin.get("user_preview", ""), max_len=140),
            "assistant_preview": normalize_memory_text(origin.get("assistant_preview", ""), max_len=160),
        },
    }


def load_core_memory_items():
    if not CORE_MEMORY_PATH.exists():
        return []
    try:
        data = json.loads(CORE_MEMORY_PATH.read_text(encoding="utf-8-sig"))
    except Exception:
        return []
    raw_items = data.get("items", []) if isinstance(data, dict) else data
    if not isinstance(raw_items, list):
        return []
    items = []
    for idx, raw in enumerate(raw_items):
        item = _normalize_core_memory_item(raw, fallback_id=f"mem_{idx}")
        if item and item.get("status") not in {"deleted", "rejected", "archived"}:
            items.append(item)
    return items


def save_core_memory_items(items):
    normalized = []
    for idx, raw in enumerate(items if isinstance(items, list) else []):
        item = _normalize_core_memory_item(raw, fallback_id=f"mem_{idx}")
        if item is not None:
            normalized.append(item)
    payload = {
        "schema_version": 1,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "items": normalized,
    }
    tmp_path = CORE_MEMORY_PATH.with_suffix(".tmp")
    bak_path = CORE_MEMORY_PATH.with_suffix(".bak")
    previous = None
    if CORE_MEMORY_PATH.exists():
        try:
            previous = CORE_MEMORY_PATH.read_bytes()
        except Exception:
            previous = None
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(CORE_MEMORY_PATH)
    if previous is not None:
        try:
            bak_path.write_bytes(previous)
        except Exception:
            logger.debug("write core memory backup failed", exc_info=True)


def _core_memory_similarity(a, b):
    key_a = _learning_pattern_key(a)
    key_b = _learning_pattern_key(b)
    if not key_a or not key_b:
        return 0.0
    if key_a == key_b:
        return 1.0
    if len(key_a) >= 12 and len(key_b) >= 12 and (key_a in key_b or key_b in key_a):
        return 0.9
    tokens_a = tokenize_memory_text(a)
    tokens_b = tokenize_memory_text(b)
    if not tokens_a or not tokens_b:
        return 0.0
    overlap = len(tokens_a & tokens_b)
    return round(overlap / max(1, min(len(tokens_a), len(tokens_b))), 4)


def _short_term_now_iso():
    return datetime.now().isoformat(timespec="seconds")


def _load_short_term_memory_state():
    if not SHORT_TERM_MEMORY_PATH.exists():
        return {"schema_version": 1, "turn_index": 0, "items": []}
    try:
        data = json.loads(SHORT_TERM_MEMORY_PATH.read_text(encoding="utf-8-sig"))
    except Exception:
        return {"schema_version": 1, "turn_index": 0, "items": []}
    if not isinstance(data, dict):
        return {"schema_version": 1, "turn_index": 0, "items": []}
    items = data.get("items", [])
    if not isinstance(items, list):
        items = []
    try:
        turn_index = max(0, int(data.get("turn_index", 0) or 0))
    except (TypeError, ValueError):
        turn_index = 0
    return {
        "schema_version": 1,
        "turn_index": turn_index,
        "updated_at": str(data.get("updated_at", "") or "").strip(),
        "items": items,
    }


def _normalize_short_term_memory_item(item, fallback_id="", current_turn=0, ttl_turns=16):
    safe = item if isinstance(item, dict) else {}
    text = normalize_memory_text(safe.get("text", ""), max_len=240)
    if len(text) < 3:
        return None
    if looks_garbled_text(text) or looks_sensitive_memory_text(text) or looks_stagey_text(text):
        return None
    kind = str(safe.get("kind", "current_topic") or "current_topic").strip().lower()
    if kind not in SHORT_TERM_MEMORY_KINDS:
        kind = "current_topic"
    try:
        salience = max(0.0, min(1.0, float(safe.get("salience", 0.55) or 0.55)))
    except (TypeError, ValueError):
        salience = 0.55
    try:
        last_seen_turn = max(0, int(safe.get("last_seen_turn", current_turn) or current_turn))
    except (TypeError, ValueError):
        last_seen_turn = max(0, int(current_turn or 0))
    try:
        ttl = max(1, int(safe.get("ttl_turns", ttl_turns) or ttl_turns))
    except (TypeError, ValueError):
        ttl = max(1, int(ttl_turns or 16))
    support_count = _clamp_int(safe.get("support_count", 1), 1, 1, 999)
    tags = safe.get("tags", [])
    if isinstance(tags, str):
        tags = re.split(r"[,，\s]+", tags)
    if not isinstance(tags, list):
        tags = []
    origin = safe.get("origin") if isinstance(safe.get("origin"), dict) else {}
    now = _short_term_now_iso()
    return {
        "id": str(safe.get("id") or fallback_id or _make_core_memory_id("episodic", "recent_event", text)).strip(),
        "kind": kind,
        "text": text,
        "source": str(safe.get("source", "conversation") or "conversation").strip()[:40],
        "status": str(safe.get("status", "active") or "active").strip().lower(),
        "salience": round(salience, 4),
        "tags": [
            normalize_memory_text(tag, max_len=24)
            for tag in tags[:8]
            if normalize_memory_text(tag, max_len=24)
        ],
        "created_at": str(safe.get("created_at", "") or now).strip(),
        "updated_at": str(safe.get("updated_at", "") or safe.get("created_at", "") or now).strip(),
        "last_seen_turn": last_seen_turn,
        "ttl_turns": ttl,
        "support_count": support_count,
        "consolidated_at": str(safe.get("consolidated_at", "") or "").strip(),
        "consolidated_memory_ids": [
            str(item_id or "").strip()
            for item_id in safe.get("consolidated_memory_ids", [])
            if str(item_id or "").strip()
        ][:8]
        if isinstance(safe.get("consolidated_memory_ids", []), list)
        else [],
        "origin": {
            "user_preview": normalize_memory_text(origin.get("user_preview", ""), max_len=140),
            "assistant_preview": normalize_memory_text(origin.get("assistant_preview", ""), max_len=160),
        },
    }


def _normalize_short_term_memory_state(state, settings=None):
    safe = state if isinstance(state, dict) else {}
    settings = settings or {}
    try:
        turn_index = max(0, int(safe.get("turn_index", 0) or 0))
    except (TypeError, ValueError):
        turn_index = 0
    ttl = int(settings.get("short_ttl_turns", 16) or 16)
    items = []
    for idx, raw in enumerate(safe.get("items", []) if isinstance(safe.get("items", []), list) else []):
        item = _normalize_short_term_memory_item(raw, fallback_id=f"short_{idx}", current_turn=turn_index, ttl_turns=ttl)
        if item and item.get("status") not in {"deleted", "rejected", "archived"}:
            items.append(item)
    return {
        "schema_version": 1,
        "turn_index": turn_index,
        "updated_at": str(safe.get("updated_at", "") or "").strip(),
        "items": items,
    }


def load_short_term_memory_items(settings=None):
    state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
    return state.get("items", [])


def _save_short_term_memory_state(state):
    safe = _normalize_short_term_memory_state(state)
    safe["updated_at"] = _short_term_now_iso()
    tmp_path = SHORT_TERM_MEMORY_PATH.with_suffix(".tmp")
    bak_path = SHORT_TERM_MEMORY_PATH.with_suffix(".bak")
    previous = None
    if SHORT_TERM_MEMORY_PATH.exists():
        try:
            previous = SHORT_TERM_MEMORY_PATH.read_bytes()
        except Exception:
            previous = None
    tmp_path.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(SHORT_TERM_MEMORY_PATH)
    if previous is not None:
        try:
            bak_path.write_bytes(previous)
        except Exception:
            logger.debug("write short-term memory backup failed", exc_info=True)


def _prune_short_term_items(items, current_turn):
    pruned = []
    for item in items if isinstance(items, list) else []:
        try:
            last_seen = int(item.get("last_seen_turn", current_turn) or current_turn)
            ttl = int(item.get("ttl_turns", 16) or 16)
        except (TypeError, ValueError):
            last_seen = current_turn
            ttl = 16
        if current_turn - last_seen <= ttl:
            pruned.append(item)
    return pruned


def _short_term_memory_id(kind, text):
    return _make_core_memory_id("episodic", "recent_event", f"{kind} {text}")


def _derive_short_term_memory_candidates(user, assistant, settings):
    user_text = normalize_memory_text(user, max_len=180)
    assistant_text = normalize_memory_text(assistant, max_len=180)
    if not user_text or looks_sensitive_memory_text(user_text) or looks_sensitive_memory_text(assistant_text):
        return []
    compact = re.sub(r"\s+", "", user_text.lower())
    candidates = []
    ttl = int(settings.get("short_ttl_turns", 16) or 16)
    origin = {
        "user_preview": normalize_memory_text(user, max_len=140),
        "assistant_preview": normalize_memory_text(assistant, max_len=160),
    }

    def add(kind, text, salience, tags=None, ttl_multiplier=1):
        text = normalize_memory_text(text, max_len=220)
        if len(text) < 3:
            return
        candidates.append(
            {
                "id": _short_term_memory_id(kind, text),
                "kind": kind,
                "text": text,
                "source": "conversation",
                "salience": salience,
                "tags": tags or [],
                "ttl_turns": max(2, int(ttl * ttl_multiplier)),
                "origin": origin,
            }
        )

    task_signal = re.search(
        r"(下一步|下一阶段|直接进入|继续|做吧|好的做|开始做|先做|优化|实现|修复|需要|计划|接下来|"
        r"next step|continue|start|implement|fix|optimi[sz]e)",
        user_text,
        flags=re.IGNORECASE,
    )
    if task_signal:
        add("current_task", f"当前任务：{user_text}", 0.78, ["task"], ttl_multiplier=1.25)
    if re.search(r"(我觉得|我认为|不是|并非|更像|应该|最好|希望|想要|需要|not really|should|prefer)", user_text, flags=re.IGNORECASE):
        add("recent_decision", f"最近判断：{user_text}", 0.7, ["decision"], ttl_multiplier=1.15)
    if re.search(r"(累|困|开心|难受|焦虑|生气|担心|满意|不满意|confused|tired|happy|worried)", user_text, flags=re.IGNORECASE):
        add("user_state", f"用户当前状态：{user_text}", 0.62, ["state"], ttl_multiplier=0.75)
    if len(compact) >= 8 and not is_lightweight_checkin_message(user_text):
        add("current_topic", f"当前话题：{user_text}", 0.56, ["topic"], ttl_multiplier=1)
    if re.search(r"(稍后|之后|待办|还没|需要确认|手动验收|manual check|todo|later)", user_text, flags=re.IGNORECASE):
        add("open_loop", f"未完成事项：{user_text}", 0.76, ["open_loop"], ttl_multiplier=1.5)
    return candidates[:4]


def _set_last_short_term_memory_debug(snapshot):
    global LAST_SHORT_TERM_MEMORY_DEBUG
    LAST_SHORT_TERM_MEMORY_DEBUG = memory_debug.normalize_debug_snapshot(snapshot)


def _compact_short_term_memory_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "turn_index": _clamp_int(safe.get("turn_index", 0), 0, 0, 999999),
        "stored": _clamp_int(safe.get("stored", 0), 0, 0, 20),
        "merged": _clamp_int(safe.get("merged", 0), 0, 0, 20),
        "expired": _clamp_int(safe.get("expired", 0), 0, 0, 999),
        "memory_ids": [
            str(item_id or "").strip()[:80]
            for item_id in safe.get("memory_ids", [])
            if str(item_id or "").strip()
        ][:8],
    }


def _update_short_term_memory(config, record):
    settings = get_memory_settings(config)
    safe = record if isinstance(record, dict) else {}
    user = normalize_memory_text(safe.get("user", ""), max_len=240)
    assistant = normalize_memory_text(safe.get("assistant", ""), max_len=280)
    debug = {
        "at": _short_term_now_iso(),
        "status": "skipped",
        "reason": "",
        "turn_index": 0,
        "stored": 0,
        "merged": 0,
        "expired": 0,
        "memory_ids": [],
    }
    if not settings.get("short_enabled", True):
        debug["reason"] = "short_memory_disabled"
        _set_last_short_term_memory_debug(debug)
        return debug
    with MEMORY_LOCK:
        state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
        current_turn = int(state.get("turn_index", 0) or 0) + 1
        state["turn_index"] = current_turn
        before_count = len(state.get("items", []))
        items = _prune_short_term_items(state.get("items", []), current_turn)
        debug["expired"] = max(0, before_count - len(items))
        debug["turn_index"] = current_turn

        if (
            is_lightweight_checkin_message(user)
            or len(user) < 2
            or len(assistant) < 2
            or looks_garbled_text(user)
            or looks_garbled_text(assistant)
            or looks_stagey_text(assistant)
            or looks_sensitive_memory_text(user)
            or looks_sensitive_memory_text(assistant)
        ):
            state["items"] = items
            _save_short_term_memory_state(state)
            debug["reason"] = "low_signal_or_unsafe"
            _set_last_short_term_memory_debug(debug)
            return debug

        candidates = _derive_short_term_memory_candidates(user, assistant, settings)
        if not candidates:
            state["items"] = items
            _save_short_term_memory_state(state)
            debug["reason"] = "no_short_memory_candidate"
            _set_last_short_term_memory_debug(debug)
            return debug

        now = _short_term_now_iso()
        stored = 0
        merged = 0
        changed_ids = []
        for raw in candidates:
            candidate = _normalize_short_term_memory_item(raw, current_turn=current_turn, ttl_turns=settings.get("short_ttl_turns", 16))
            if not candidate:
                continue
            candidate["created_at"] = now
            candidate["updated_at"] = now
            candidate["last_seen_turn"] = current_turn
            existing = None
            for item in items:
                if item.get("kind") == candidate.get("kind") and _core_memory_similarity(item.get("text", ""), candidate.get("text", "")) >= 0.72:
                    existing = item
                    break
            if existing is not None:
                existing["text"] = candidate["text"] if len(candidate["text"]) >= len(existing.get("text", "")) else existing.get("text", "")
                existing["salience"] = round(max(float(existing.get("salience", 0) or 0), float(candidate.get("salience", 0) or 0)), 4)
                existing["updated_at"] = now
                existing["last_seen_turn"] = current_turn
                existing["ttl_turns"] = max(int(existing.get("ttl_turns", 1) or 1), int(candidate.get("ttl_turns", 1) or 1))
                existing["support_count"] = min(999, int(existing.get("support_count", 1) or 1) + 1)
                existing["tags"] = list(dict.fromkeys([*(existing.get("tags", []) or []), *(candidate.get("tags", []) or [])]))[:8]
                changed_ids.append(existing.get("id", ""))
                merged += 1
            else:
                candidate["id"] = _short_term_memory_id(candidate.get("kind", "current_topic"), candidate.get("text", ""))
                items.append(candidate)
                changed_ids.append(candidate["id"])
                stored += 1
        items = sorted(
            items,
            key=lambda item: (
                int(item.get("last_seen_turn", 0) or 0),
                float(item.get("salience", 0) or 0),
            ),
            reverse=True,
        )[: int(settings.get("short_max_items", 24) or 24)]
        state["items"] = items
        _save_short_term_memory_state(state)
    debug.update(
        {
            "status": "stored" if stored or merged else "skipped",
            "reason": "" if stored or merged else "no_short_memory_candidate",
            "stored": stored,
            "merged": merged,
            "memory_ids": changed_ids,
        }
    )
    _set_last_short_term_memory_debug(debug)
    return debug


def _human_time_ago(ts_str):
    if not ts_str:
        return "之前"
    try:
        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        diff = now - ts
        seconds = diff.total_seconds()

        if seconds < 0 or seconds < 120:
            return "刚才"
        if seconds < 3600:
            return f"{int(seconds // 60)}分钟前"
        if seconds < 86400:
            return f"{int(seconds // 3600)}小时前"
        if seconds < 86400 * 2:
            return "昨天"
        if seconds < 86400 * 7:
            return f"{int(seconds // 86400)}天前"
        if seconds < 86400 * 30:
            weeks = int(seconds // (86400 * 7))
            return "上周" if weeks <= 1 else f"{weeks}周前"
        if seconds < 86400 * 365:
            months = int(seconds // (86400 * 30))
            return "上个月" if months <= 1 else f"{months}个月前"
        years = int(seconds // (86400 * 365))
        return "去年" if years <= 1 else f"{years}年前"
    except Exception:
        return "之前"


def _resolve_llm_api_key(config):
    llm_cfg = config.get("llm", {}) if isinstance(config, dict) else {}
    env_name = str(llm_cfg.get("api_key_env", "OPENAI_API_KEY") or "OPENAI_API_KEY").strip()
    direct_key = str(llm_cfg.get("api_key", "") or "").strip()
    if direct_key:
        return direct_key
    return os.environ.get(env_name, "").strip()


def _build_mem0_client_config(config, settings):
    llm_cfg = config.get("llm", {}) if isinstance(config, dict) else {}
    api_key = _resolve_llm_api_key(config)
    if not api_key or Mem0Memory is None:
        return None

    base_url = str(llm_cfg.get("base_url", "") or "").strip() or "https://api.openai.com/v1"
    model = str(llm_cfg.get("model", "") or "qwen-plus").strip() or "qwen-plus"
    qdrant_path = Path(settings["mem0_qdrant_path"]).expanduser()
    history_db_path = Path(settings["mem0_history_db_path"]).expanduser()
    qdrant_path.mkdir(parents=True, exist_ok=True)
    history_db_path.parent.mkdir(parents=True, exist_ok=True)

    return {
        "vector_store": {
            "provider": "qdrant",
            "config": {
                "collection_name": settings["mem0_collection"],
                "path": str(qdrant_path.resolve()),
                "embedding_model_dims": settings["mem0_embedding_dims"],
                "on_disk": True,
            },
        },
        "llm": {
            "provider": "openai",
            "config": {
                "model": model,
                "api_key": api_key,
                "openai_base_url": base_url,
                "temperature": 0.15,
                "max_tokens": 128,
            },
        },
        "embedder": {
            "provider": "openai",
            "config": {
                "model": settings["mem0_embedding_model"],
                "api_key": api_key,
                "openai_base_url": base_url,
                "embedding_dims": settings["mem0_embedding_dims"],
            },
        },
        "history_db_path": str(history_db_path.resolve()),
        "version": "v1.1",
    }


def _get_mem0_client(config):
    settings = get_memory_settings(config)
    if not settings["enabled"] or not settings["mem0_enabled"] or Mem0Memory is None:
        return None

    client_config = _build_mem0_client_config(config, settings)
    if not client_config:
        return None

    client_key = json.dumps(client_config, ensure_ascii=True, sort_keys=True)
    global MEM0_CLIENT, MEM0_CLIENT_KEY
    with MEM0_LOCK:
        if MEM0_CLIENT is not None and MEM0_CLIENT_KEY == client_key:
            return MEM0_CLIENT
        try:
            MEM0_CLIENT = Mem0Memory.from_config(client_config)
            MEM0_CLIENT_KEY = client_key
            return MEM0_CLIENT
        except Exception:
            MEM0_CLIENT = None
            MEM0_CLIENT_KEY = ""
            return None


def _parse_mem0_result(item):
    if not isinstance(item, dict):
        return None
    metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
    user = normalize_memory_text(metadata.get("raw_user", ""), max_len=240)
    assistant = normalize_memory_text(metadata.get("raw_assistant", ""), max_len=280)
    if not user:
        memory_text = normalize_memory_text(item.get("memory", ""), max_len=280)
        match = re.search(r"用户说[:：]\s*(.*?)\s*Taffy回答[:：]\s*(.*)$", memory_text)
        if match:
            user = normalize_memory_text(match.group(1), max_len=240)
            assistant = normalize_memory_text(match.group(2), max_len=280)
        else:
            user = memory_text
            assistant = normalize_memory_text(memory_text, max_len=280)
    ts = (
        str(metadata.get("ts", "")).strip()
        or str(item.get("created_at", "")).strip()
        or str(item.get("updated_at", "")).strip()
    )
    if not user or not assistant:
        return None
    return {"ts": ts, "user": user, "assistant": assistant}


def _build_mem0_query(user_message, safe_history):
    query_parts = [str(user_message or "").strip()]
    query_parts.extend(
        str(msg.get("content", "")).strip()
        for msg in safe_history[-4:]
        if isinstance(msg, dict) and msg.get("role") == "user"
    )
    return " ".join(part for part in query_parts if part).strip()


def _search_mem0_items(config, user_message, safe_history):
    client = _get_mem0_client(config)
    if client is None:
        return []
    settings = get_memory_settings(config)
    query = _build_mem0_query(user_message, safe_history)
    if not query:
        return []
    try:
        payload = client.search(
            query,
            user_id=settings["mem0_user_id"],
            limit=settings["mem0_top_k"],
            threshold=settings["mem0_threshold"],
            rerank=False,
        )
    except Exception:
        return []

    results = payload.get("results") if isinstance(payload, dict) else payload
    if not isinstance(results, list):
        return []

    items = []
    for raw in results:
        parsed = _parse_mem0_result(raw)
        if parsed:
            items.append(parsed)
    return items


def _remember_interaction_mem0(config, user, assistant, ts):
    client = _get_mem0_client(config)
    if client is None:
        return
    settings = get_memory_settings(config)
    memory_text = f"用户说：{user} Taffy回答：{assistant}"
    metadata = {
        "raw_user": user,
        "raw_assistant": assistant,
        "ts": ts,
        "source": "taffy-chat",
    }
    try:
        client.add(
            [{"role": "user", "content": memory_text}],
            user_id=settings["mem0_user_id"],
            metadata=metadata,
            infer=False,
        )
    except Exception:
        logger.debug("mem0 add interaction failed", exc_info=True)


def _append_unique_memory_item(chosen, seen, item):
    if not isinstance(item, dict):
        return False
    key = (item.get("ts", ""), item.get("user", ""), item.get("assistant", ""))
    if key in seen:
        return False
    seen.add(key)
    chosen.append(item)
    return True


def _append_unique_learning_item(chosen, seen, item):
    if not isinstance(item, dict):
        return False
    key = ("learning", item.get("id", ""), item.get("compressed_pattern", ""))
    if key in seen:
        return False
    seen.add(key)
    chosen.append(item)
    return True


def _append_unique_core_memory_item(chosen, seen, item):
    if not isinstance(item, dict):
        return False
    key = ("core", item.get("id", ""), item.get("text", ""))
    if key in seen:
        return False
    seen.add(key)
    chosen.append(item)
    return True


def _append_unique_short_term_memory_item(chosen, seen, item):
    if not isinstance(item, dict):
        return False
    key = ("short", item.get("id", ""), item.get("text", ""))
    if key in seen:
        return False
    seen.add(key)
    chosen.append(item)
    return True


def _compact_memory_debug_item(item, source="", score=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "ts": str(safe.get("ts", ""))[:32],
        "user": normalize_memory_text(safe.get("user", ""), max_len=90),
        "assistant": normalize_memory_text(safe.get("assistant", ""), max_len=110),
        "source": str(source or "").strip(),
    }
    if score is not None:
        try:
            out["score"] = int(score)
        except (TypeError, ValueError):
            out["score"] = 0
    return out


def _compact_core_memory_prompt_item(item, score=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": "core_memory",
        "kind": str(safe.get("memory_kind") or safe.get("kind", "")).strip()[:24],
        "category": str(safe.get("category", "")).strip()[:40],
        "text": normalize_memory_text(safe.get("text", ""), max_len=120),
        "importance": safe.get("importance", 0),
        "confidence": safe.get("confidence", 0),
        "pinned": bool(safe.get("pinned", False)),
        "created_at": str(safe.get("created_at", "")).strip()[:40],
        "updated_at": str(safe.get("updated_at", "")).strip()[:40],
    }
    if score is not None:
        try:
            out["relevance"] = int(score)
        except (TypeError, ValueError):
            out["relevance"] = 0
    return out


def _compact_short_term_memory_prompt_item(item, score=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": "short_term_memory",
        "kind": str(safe.get("kind", "")).strip()[:40],
        "text": normalize_memory_text(safe.get("text", ""), max_len=120),
        "salience": safe.get("salience", 0),
        "last_seen_turn": safe.get("last_seen_turn", 0),
        "ttl_turns": safe.get("ttl_turns", 0),
        "support_count": safe.get("support_count", 0),
        "consolidated_at": str(safe.get("consolidated_at", "")).strip()[:40],
        "updated_at": str(safe.get("updated_at", "")).strip()[:40],
    }
    if score is not None:
        try:
            out["relevance"] = int(score)
        except (TypeError, ValueError):
            out["relevance"] = 0
    return out


def _compact_learning_prompt_item(item, score=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": "learning_sample",
        "score": safe.get("score", 0),
        "confidence": safe.get("confidence", 0),
        "support_count": safe.get("support_count", 0),
        "user_preview": normalize_memory_text(safe.get("user_preview", ""), max_len=90),
        "assistant_preview": normalize_memory_text(safe.get("assistant_preview", ""), max_len=90),
        "compressed_pattern": normalize_memory_text(safe.get("compressed_pattern", ""), max_len=110),
    }
    if score is not None:
        try:
            out["relevance"] = int(score)
        except (TypeError, ValueError):
            out["relevance"] = 0
    return out


def _learning_item_sort_time(item):
    raw = str((item or {}).get("updated_at") or (item or {}).get("created_at") or "").strip()
    if not raw:
        return 0.0
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        return 0.0
    return parsed.timestamp()


def _learning_item_quality(item):
    safe = item if isinstance(item, dict) else {}
    try:
        score = float(safe.get("score", 0) or 0)
    except (TypeError, ValueError):
        score = 0.0
    try:
        confidence = float(safe.get("confidence", 0) or 0)
    except (TypeError, ValueError):
        confidence = 0.0
    try:
        support = int(safe.get("support_count", 0) or 0)
    except (TypeError, ValueError):
        support = 0
    return score, confidence, support


def _is_learning_sample_prompt_eligible(item, settings):
    safe = item if isinstance(item, dict) else {}
    if not safe:
        return False
    status = str(safe.get("status", "") or "").strip().lower()
    source = str(safe.get("source", "") or "").strip().lower()
    item_id = str(safe.get("id", "") or "").strip().lower()
    if status in {"archived", "deleted", "rejected"}:
        return False
    if status and status not in {"active", "promoted", "learned", "candidate"}:
        return False
    if status == "candidate" and source != "learned" and not item_id.startswith(("learned_", "manual_")):
        return False
    if _is_learning_text_garbled(safe):
        return False
    if looks_stagey_text(safe.get("assistant_preview", "")) or looks_stagey_text(safe.get("compressed_pattern", "")):
        return False
    score, confidence, _support = _learning_item_quality(safe)
    return (
        score >= float(settings.get("learning_min_score", 0.55))
        and confidence >= float(settings.get("learning_min_confidence", 0.45))
    )


def _select_learning_samples_for_prompt(settings, query_tokens, explicit_memory_intent=False):
    if not settings.get("learning_samples_enabled", True):
        return [], "disabled", 0
    count = max(0, int(settings.get("learning_inject_count", 0) or 0))
    if count <= 0:
        return [], "count_zero", 0
    _candidates, samples, state = _load_learning_review_store()
    quick = _learning_quick_settings(state)
    if quick.get("inject_count", 1) < 1:
        return [], "quick_disabled", len(samples)

    eligible = [
        item for item in samples
        if _is_learning_sample_prompt_eligible(item, settings)
    ]
    if not eligible:
        return [], "no_eligible_samples", len(samples)

    query = query_tokens if isinstance(query_tokens, set) else set()
    scored = []
    for idx, item in enumerate(eligible):
        sample_tokens = tokenize_memory_text(
            f"{item.get('user_preview', '')} {item.get('assistant_preview', '')} {item.get('compressed_pattern', '')}"
        )
        relevance = len(query & sample_tokens)
        if relevance <= 0 and not explicit_memory_intent:
            continue
        score, confidence, support = _learning_item_quality(item)
        scored.append((relevance, score, confidence, support, _learning_item_sort_time(item), -idx, item))

    if not scored:
        return [], "no_relevant_samples", len(samples)
    scored.sort(reverse=True)

    selected = []
    seen = set()
    for relevance, _score, _confidence, _support, _time, _idx, item in scored:
        enriched = dict(item)
        enriched["kind"] = "learning_sample"
        enriched["relevance"] = relevance
        if _append_unique_learning_item(selected, seen, enriched) and len(selected) >= count:
            break
    return selected, "selected" if selected else "no_match", len(samples)


def _set_last_learning_extraction_debug(snapshot):
    global LAST_LEARNING_EXTRACTION_DEBUG
    LAST_LEARNING_EXTRACTION_DEBUG = memory_debug.normalize_debug_snapshot(snapshot)


def _compact_learning_extraction_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "candidate_id": str(safe.get("candidate_id", "")).strip()[:80],
        "category": str(safe.get("category", "")).strip()[:40],
        "score": safe.get("score", 0),
        "confidence": safe.get("confidence", 0),
        "support_count": safe.get("support_count", 0),
        "action": str(safe.get("action", "")).strip()[:40],
    }


def _has_explicit_learning_signal(user_text):
    safe = str(user_text or "").strip().lower()
    if not safe:
        return False
    return bool(
        re.search(
            r"(remember this|remember that|please remember|from now on|next time|call me|i prefer|i like|i dislike|"
            r"don't|do not|avoid|以后|下次|记住|记一下|我喜欢|我不喜欢|别再|不要再|不要|希望你|叫我|称呼我)",
            safe,
        )
    )


def _learning_candidate_skip_reason(settings, user, assistant):
    if not settings.get("learning_candidates_enabled", True):
        return "candidate_learning_disabled"
    if is_lightweight_checkin_message(user):
        return "lightweight_checkin"
    if len(str(user or "").strip()) < 6 or len(str(assistant or "").strip()) < 4:
        return "too_short"
    if looks_garbled_text(user) or looks_garbled_text(assistant):
        return "garbled_text"
    if looks_stagey_text(assistant):
        return "stagey_reply"
    if looks_sensitive_memory_text(user) or looks_sensitive_memory_text(assistant):
        return "sensitive_text"
    if not _has_explicit_learning_signal(user) and not is_specific_memory_query(user):
        return "low_signal"
    return ""


def _build_learning_candidate_prompt(user, assistant, explicit_signal=False):
    explicit_note = "这轮用户有明确记忆/偏好指令，可适度提高 score。" if explicit_signal else "这轮没有明确记忆指令，只在信息稳定、可复用时记。"
    return (
        "你是本地桌宠的记忆提炼器。只根据下面这一轮用户和桌宠的聊天，判断是否值得形成一条候选长期记忆。\n"
        "只允许记稳定、可复用、对以后聊天有帮助的信息；不要记录一次性闲聊、临时情绪、隐私密钥、路径、账号、token、API key。\n"
        "如果值得记，输出一个 JSON 对象；如果不值得记，输出 {\"remember\": false}。\n"
        "JSON 字段必须是：remember(boolean), category, compressed_pattern, user_preview, assistant_preview, score, confidence。\n"
        "category 只能是 user_preference, project_context, relationship_style, response_feedback, stable_fact。\n"
        "compressed_pattern 用中文，40字以内，写成可长期复用的偏好/事实，不要写成对用户说的话。\n"
        "score/confidence 是 0 到 1 的数字。\n"
        f"{explicit_note}\n\n"
        f"用户：{normalize_memory_text(user, 240)}\n"
        f"桌宠：{normalize_memory_text(assistant, 260)}"
    )


def _parse_json_object_from_llm(text):
    raw = str(text or "").strip()
    if not raw:
        return None
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _normalize_learning_candidate_payload(raw, user, assistant, explicit_signal=False):
    data = raw if isinstance(raw, dict) else {}
    if data.get("remember") is False:
        return None, "llm_no_candidate"
    category = str(data.get("category", "") or "").strip()
    if category not in LEARNING_CANDIDATE_CATEGORIES:
        return None, "invalid_category"
    compressed = normalize_memory_text(data.get("compressed_pattern", ""), max_len=120)
    user_preview = normalize_memory_text(data.get("user_preview") or user, max_len=140)
    assistant_preview = normalize_memory_text(data.get("assistant_preview") or assistant, max_len=160)
    if len(compressed) < 4:
        return None, "empty_pattern"
    if (
        looks_garbled_text(compressed)
        or looks_sensitive_memory_text(compressed)
        or looks_stagey_text(compressed)
        or looks_sensitive_memory_text(user_preview)
        or looks_sensitive_memory_text(assistant_preview)
    ):
        return None, "unsafe_candidate"
    try:
        score = float(data.get("score", 0.55) or 0.55)
    except (TypeError, ValueError):
        score = 0.55
    try:
        confidence = float(data.get("confidence", 0.5) or 0.5)
    except (TypeError, ValueError):
        confidence = 0.5
    if explicit_signal:
        score += 0.12
        confidence += 0.08
    return {
        "category": category,
        "compressed_pattern": compressed,
        "user_preview": user_preview,
        "assistant_preview": assistant_preview,
        "score": round(max(0.0, min(1.0, score)), 4),
        "confidence": round(max(0.0, min(1.0, confidence)), 4),
    }, ""


def _learning_pattern_key(text):
    compact = re.sub(r"[\s\u3000，。！？!?.,;:、~～'\"“”‘’（）()【】\[\]{}<>《》\-_/\\]+", "", str(text or "").lower())
    return compact[:96]


def _learning_patterns_similar(a, b):
    key_a = _learning_pattern_key(a)
    key_b = _learning_pattern_key(b)
    if not key_a or not key_b:
        return False
    if key_a == key_b or key_a in key_b or key_b in key_a:
        return True
    tokens_a = tokenize_memory_text(a)
    tokens_b = tokenize_memory_text(b)
    if not tokens_a or not tokens_b:
        return False
    overlap = len(tokens_a & tokens_b)
    return overlap >= 2 and overlap / max(1, min(len(tokens_a), len(tokens_b))) >= 0.6


def _make_learning_candidate_id(category, pattern):
    slug = re.sub(r"[^a-z0-9]+", "_", str(pattern or "").lower()).strip("_")[:24]
    if not slug:
        slug = "memory"
    return f"cand_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{category}_{slug}"


def _trim_learning_candidates(candidates, max_items):
    limit = max(1, int(max_items or 200))
    items = [item for item in candidates if isinstance(item, dict)]
    if len(items) <= limit:
        return items
    def sort_key(item):
        score, confidence, support = _learning_item_quality(item)
        status = str(item.get("status", "candidate") or "candidate").strip().lower()
        promoted_penalty = -1 if status == "promoted" else 0
        return (promoted_penalty, score, confidence, support, _learning_item_sort_time(item))
    return sorted(items, key=sort_key, reverse=True)[:limit]


def _record_learning_candidate(candidate, settings):
    if not isinstance(candidate, dict):
        return None, "invalid_candidate"
    score = float(candidate.get("score", 0) or 0)
    confidence = float(candidate.get("confidence", 0) or 0)
    if score < float(settings.get("learning_candidate_min_score", 0.45)):
        return None, "low_score"
    if confidence < float(settings.get("learning_candidate_min_confidence", 0.45)):
        return None, "low_confidence"

    now = _learning_now_iso()
    with LEARNING_LOCK:
        candidates, samples, state = _load_learning_review_store()
        existing = None
        for item in candidates:
            if _learning_patterns_similar(item.get("compressed_pattern", ""), candidate.get("compressed_pattern", "")):
                existing = item
                break
        if existing is not None:
            existing["support_count"] = max(0, int(existing.get("support_count", 0) or 0)) + 1
            existing["score"] = round(max(float(existing.get("score", 0) or 0), score), 4)
            existing["confidence"] = round(max(float(existing.get("confidence", 0) or 0), confidence), 4)
            existing["category"] = existing.get("category") or candidate.get("category", "")
            existing["updated_at"] = now
            if score >= float(existing.get("score", 0) or 0):
                existing["user_preview"] = candidate.get("user_preview", existing.get("user_preview", ""))
                existing["assistant_preview"] = candidate.get("assistant_preview", existing.get("assistant_preview", ""))
                existing["compressed_pattern"] = candidate.get("compressed_pattern", existing.get("compressed_pattern", ""))
            action = "merged"
            item = existing
        else:
            item = {
                "id": _make_learning_candidate_id(candidate.get("category", "stable_fact"), candidate.get("compressed_pattern", "")),
                "source": "auto_llm",
                "status": "candidate",
                "category": candidate.get("category", "stable_fact"),
                "user_preview": candidate.get("user_preview", ""),
                "assistant_preview": candidate.get("assistant_preview", ""),
                "compressed_pattern": candidate.get("compressed_pattern", ""),
                "score": round(score, 4),
                "confidence": round(confidence, 4),
                "support_count": 1,
                "created_at": now,
                "updated_at": now,
            }
            candidates.append(item)
            action = "created"
        candidates = _trim_learning_candidates(candidates, settings.get("learning_candidate_max_items", 200))
        state["last_candidate_extracted_at"] = now
        _save_learning_review_store(candidates, samples, state)
    return item, action


def _extract_and_store_learning_candidate(config, record):
    settings = get_memory_settings(config)
    safe = record if isinstance(record, dict) else {}
    user = normalize_memory_text(safe.get("user", ""), max_len=240)
    assistant = normalize_memory_text(safe.get("assistant", ""), max_len=280)
    explicit_signal = _has_explicit_learning_signal(user)
    base_debug = {
        "at": _learning_now_iso(),
        "status": "skipped",
        "reason": "",
        "action": "",
        "candidate_id": "",
        "category": "",
        "score": 0,
        "confidence": 0,
        "support_count": 0,
    }
    skip_reason = _learning_candidate_skip_reason(settings, user, assistant)
    if skip_reason:
        base_debug["reason"] = skip_reason
        _set_last_learning_extraction_debug(base_debug)
        return base_debug

    prompt = _build_learning_candidate_prompt(user, assistant, explicit_signal=explicit_signal)
    try:
        raw = _call_summary_llm(config, prompt)
    except Exception:
        logger.debug("learning candidate extraction llm failed", exc_info=True)
        base_debug["reason"] = "llm_error"
        _set_last_learning_extraction_debug(base_debug)
        return base_debug
    data = _parse_json_object_from_llm(raw)
    if data is None:
        base_debug["reason"] = "llm_invalid_json" if str(raw or "").strip() else "llm_empty"
        _set_last_learning_extraction_debug(base_debug)
        return base_debug
    candidate, reason = _normalize_learning_candidate_payload(data, user, assistant, explicit_signal=explicit_signal)
    if not candidate:
        base_debug["reason"] = reason or "candidate_rejected"
        _set_last_learning_extraction_debug(base_debug)
        return base_debug
    item, action = _record_learning_candidate(candidate, settings)
    if not item:
        base_debug["reason"] = action or "candidate_rejected"
        _set_last_learning_extraction_debug(base_debug)
        return base_debug

    debug = {
        **base_debug,
        "status": "stored",
        "reason": "",
        "action": action,
        "candidate_id": item.get("id", ""),
        "category": item.get("category", ""),
        "score": item.get("score", 0),
        "confidence": item.get("confidence", 0),
        "support_count": item.get("support_count", 0),
    }
    _set_last_learning_extraction_debug(debug)
    return debug


def _schedule_learning_candidate_extraction(config, record):
    settings = get_memory_settings(config)
    user = record.get("user", "") if isinstance(record, dict) else ""
    assistant = record.get("assistant", "") if isinstance(record, dict) else ""
    skip_reason = _learning_candidate_skip_reason(settings, user, assistant)
    if skip_reason:
        _set_last_learning_extraction_debug(
            {
                "at": _learning_now_iso(),
                "status": "skipped",
                "reason": skip_reason,
                "action": "",
                "candidate_id": "",
                "category": "",
                "score": 0,
                "confidence": 0,
                "support_count": 0,
            }
        )
        return
    threading.Thread(
        target=_extract_and_store_learning_candidate,
        args=(config, dict(record)),
        daemon=True,
    ).start()


def _set_last_core_memory_debug(snapshot):
    global LAST_CORE_MEMORY_DEBUG
    LAST_CORE_MEMORY_DEBUG = memory_debug.normalize_debug_snapshot(snapshot)


def _compact_core_memory_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "action": str(safe.get("action", "")).strip()[:40],
        "stored": _clamp_int(safe.get("stored", 0), 0, 0, 20),
        "merged": _clamp_int(safe.get("merged", 0), 0, 0, 20),
        "source": str(safe.get("source", "")).strip()[:40],
        "memory_ids": [
            str(item_id or "").strip()[:80]
            for item_id in safe.get("memory_ids", [])
            if str(item_id or "").strip()
        ][:8],
    }


def _has_core_memory_signal(user, assistant):
    text = f"{user}\n{assistant}".lower()
    if has_explicit_memory_write_intent(user):
        return True
    return bool(
        re.search(
            r"(项目|仓库|repo|codebase|正在|完成|修复|下一步|下一阶段|计划|目标|"
            r"我叫|我是|我的|我在|我喜欢|我不喜欢|叫我|称呼我|"
            r"project|currently|finished|fixed|plan|goal|call me|my name is)",
            text,
        )
    )


def _build_explicit_core_memory_candidate(user, assistant):
    text = _extract_explicit_memory_text(user)
    if not text:
        return None
    kind, category = _classify_core_memory_text(text)
    return {
        "kind": kind,
        "category": category,
        "text": text,
        "source": "explicit_user",
        "importance": 0.86,
        "confidence": 0.88,
        "tags": [],
        "origin": {
            "user_preview": normalize_memory_text(user, max_len=140),
            "assistant_preview": normalize_memory_text(assistant, max_len=160),
        },
    }


def _build_core_memory_extraction_prompt(user, assistant):
    return (
        "你是本地桌宠的“真实记忆”提炼器，不是回复风格调参器。\n"
        "只根据下面这一轮聊天，提炼事实、事件、项目进展、用户稳定信息或关系信息。\n"
        "不要记录“用户喜欢短句/少说套话/语气如何”等回复风格规则；这类内容属于互动偏好学习，不属于真实记忆。\n"
        "不要记录一次性寒暄、临时情绪、隐私密钥、账号、token、API key、本地敏感路径、文件内容、截图内容或工具结果。\n"
        "最多输出2条。没有值得长期保存的真实记忆时，输出 {\"memories\": []}。\n"
        "输出 JSON 对象：{\"memories\":[{\"kind\":\"semantic|episodic\",\"category\":\"project_context|stable_fact|user_preference|relationship|recent_event\",\"text\":\"...\",\"importance\":0.0,\"confidence\":0.0,\"tags\":[\"...\"]}]}。\n"
        "text 用中文，80字以内，只写可复用事实或发生过的事件，不要写成对用户说的话。\n\n"
        f"用户：{normalize_memory_text(user, 240)}\n"
        f"桌宠：{normalize_memory_text(assistant, 260)}"
    )


def _normalize_core_memory_payload(raw, user, assistant, *, source="auto_llm"):
    safe = raw if isinstance(raw, dict) else {}
    if safe.get("remember") is False:
        return None, "llm_no_memory"
    text = normalize_memory_text(
        safe.get("text") or safe.get("memory") or safe.get("content") or "",
        max_len=260,
    )
    if len(text) < 4:
        return None, "empty_memory"
    kind = str(safe.get("kind", "") or "").strip().lower()
    category = str(safe.get("category", "") or "").strip().lower()
    inferred_kind, inferred_category = _classify_core_memory_text(text)
    if kind not in CORE_MEMORY_KINDS:
        kind = inferred_kind
    if category not in CORE_MEMORY_CATEGORIES:
        category = inferred_category
    if (
        looks_garbled_text(text)
        or looks_sensitive_memory_text(text)
        or looks_stagey_text(text)
        or looks_sensitive_memory_text(user)
        or looks_sensitive_memory_text(assistant)
    ):
        return None, "unsafe_memory"
    try:
        importance = float(safe.get("importance", 0.55) or 0.55)
    except (TypeError, ValueError):
        importance = 0.55
    try:
        confidence = float(safe.get("confidence", 0.55) or 0.55)
    except (TypeError, ValueError):
        confidence = 0.55
    tags = safe.get("tags", [])
    if not isinstance(tags, list):
        tags = []
    return {
        "kind": kind,
        "category": category,
        "text": text,
        "source": source,
        "importance": round(max(0.0, min(1.0, importance)), 4),
        "confidence": round(max(0.0, min(1.0, confidence)), 4),
        "tags": tags[:8],
        "origin": {
            "user_preview": normalize_memory_text(user, max_len=140),
            "assistant_preview": normalize_memory_text(assistant, max_len=160),
        },
    }, ""


def _parse_core_memory_payloads(data, user, assistant):
    if not isinstance(data, dict):
        return [], "llm_invalid_json"
    raw_items = data.get("memories", [])
    if raw_items is None:
        raw_items = []
    if not isinstance(raw_items, list):
        raw_items = [raw_items]
    memories = []
    last_reason = ""
    for raw in raw_items[:4]:
        candidate, reason = _normalize_core_memory_payload(raw, user, assistant, source="auto_llm")
        if candidate:
            memories.append(candidate)
        elif reason:
            last_reason = reason
    if not memories:
        return [], last_reason or "llm_no_memory"
    return memories[:2], ""


def _trim_core_memory_items(items, max_items):
    limit = max(1, int(max_items or 300))
    safe_items = [item for item in items if isinstance(item, dict)]
    if len(safe_items) <= limit:
        return safe_items
    def sort_key(item):
        return (
            float(item.get("importance", 0) or 0),
            float(item.get("confidence", 0) or 0),
            int(item.get("use_count", 0) or 0),
            _learning_item_sort_time(item),
        )
    return sorted(safe_items, key=sort_key, reverse=True)[:limit]


def _record_core_memory_candidates(candidates, settings):
    normalized = []
    for raw in candidates if isinstance(candidates, list) else []:
        item = _normalize_core_memory_item(raw)
        if item is not None:
            normalized.append(item)
    if not normalized:
        return [], {"stored": 0, "merged": 0, "action": "none"}

    min_importance = float(settings.get("core_min_importance", 0.45))
    min_confidence = float(settings.get("core_min_confidence", 0.55))
    normalized = [
        item for item in normalized
        if float(item.get("importance", 0) or 0) >= min_importance
        and float(item.get("confidence", 0) or 0) >= min_confidence
    ]
    if not normalized:
        return [], {"stored": 0, "merged": 0, "action": "below_threshold"}

    now = datetime.now().isoformat(timespec="seconds")
    stored = 0
    merged = 0
    changed_ids = []
    with MEMORY_LOCK:
        items = load_core_memory_items()
        for candidate in normalized:
            existing = None
            for item in items:
                if _core_memory_similarity(item.get("text", ""), candidate.get("text", "")) >= 0.8:
                    existing = item
                    break
            if existing is not None:
                existing["importance"] = round(max(float(existing.get("importance", 0) or 0), float(candidate.get("importance", 0) or 0)), 4)
                existing["confidence"] = round(max(float(existing.get("confidence", 0) or 0), float(candidate.get("confidence", 0) or 0)), 4)
                existing["updated_at"] = now
                existing["status"] = "active"
                if len(str(candidate.get("text", ""))) > len(str(existing.get("text", ""))):
                    existing["text"] = candidate.get("text", existing.get("text", ""))
                if candidate.get("tags"):
                    existing["tags"] = list(dict.fromkeys([*(existing.get("tags", []) or []), *candidate.get("tags", [])]))[:8]
                changed_ids.append(existing.get("id", ""))
                merged += 1
                continue
            candidate["id"] = _make_core_memory_id(candidate.get("kind", "semantic"), candidate.get("category", "stable_fact"), candidate.get("text", ""))
            candidate["created_at"] = now
            candidate["updated_at"] = now
            candidate["status"] = "active"
            items.append(candidate)
            changed_ids.append(candidate["id"])
            stored += 1
        items = _trim_core_memory_items(items, settings.get("core_max_items", 300))
        save_core_memory_items(items)
    action = "stored" if stored and not merged else "merged" if merged and not stored else "stored_and_merged" if stored and merged else "none"
    return changed_ids, {"stored": stored, "merged": merged, "action": action}


def _set_last_memory_consolidation_debug(snapshot):
    global LAST_MEMORY_CONSOLIDATION_DEBUG
    LAST_MEMORY_CONSOLIDATION_DEBUG = memory_debug.normalize_debug_snapshot(snapshot)


def _compact_memory_consolidation_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "action": str(safe.get("action", "")).strip()[:40],
        "scanned": _clamp_int(safe.get("scanned", 0), 0, 0, 999),
        "candidates": _clamp_int(safe.get("candidates", 0), 0, 0, 80),
        "stored": _clamp_int(safe.get("stored", 0), 0, 0, 80),
        "merged": _clamp_int(safe.get("merged", 0), 0, 0, 80),
        "short_ids": [
            str(item_id or "").strip()[:80]
            for item_id in safe.get("short_ids", [])
            if str(item_id or "").strip()
        ][:8],
        "memory_ids": [
            str(item_id or "").strip()[:80]
            for item_id in safe.get("memory_ids", [])
            if str(item_id or "").strip()
        ][:8],
    }


def _set_last_memory_correction_debug(snapshot):
    global LAST_MEMORY_CORRECTION_DEBUG
    LAST_MEMORY_CORRECTION_DEBUG = memory_debug.normalize_debug_snapshot(snapshot)


def _compact_memory_correction_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "action": str(safe.get("action", "")).strip()[:40],
        "core_changed": _clamp_int(safe.get("core_changed", 0), 0, 0, 80),
        "short_changed": _clamp_int(safe.get("short_changed", 0), 0, 0, 80),
        "score": safe.get("score", 0),
        "memory_ids": [
            str(item_id or "").strip()[:80]
            for item_id in safe.get("memory_ids", [])
            if str(item_id or "").strip()
        ][:8],
        "short_ids": [
            str(item_id or "").strip()[:80]
            for item_id in safe.get("short_ids", [])
            if str(item_id or "").strip()
        ][:8],
    }


def _strip_short_memory_prefix(text):
    return memory_consolidation.strip_short_memory_prefix(
        text,
        normalize_memory_text=normalize_memory_text,
    )


def _is_completed_or_decided_short_memory(text):
    return memory_consolidation.is_completed_or_decided_short_memory(text)


def _memory_consolidation_helpers():
    return {
        "normalize_memory_text": normalize_memory_text,
        "looks_garbled_text": looks_garbled_text,
        "looks_sensitive_memory_text": looks_sensitive_memory_text,
        "looks_stagey_text": looks_stagey_text,
        "clamp_int": _clamp_int,
        "clamp_float": _clamp_float,
        "classify_core_memory_text": _classify_core_memory_text,
    }


def _short_memory_consolidation_reason(item, settings):
    return memory_consolidation.short_memory_consolidation_reason(
        item,
        settings,
        helpers=_memory_consolidation_helpers(),
    )


def _build_short_memory_consolidation_candidate(item, reason):
    return memory_consolidation.build_short_memory_consolidation_candidate(
        item,
        reason,
        helpers=_memory_consolidation_helpers(),
    )

def _maybe_consolidate_short_term_memories(config):
    settings = get_memory_settings(config)
    debug = {
        "at": _short_term_now_iso(),
        "status": "skipped",
        "reason": "",
        "action": "",
        "scanned": 0,
        "candidates": 0,
        "stored": 0,
        "merged": 0,
        "short_ids": [],
        "memory_ids": [],
    }
    if (
        not settings.get("enabled", True)
        or not settings.get("short_enabled", True)
        or not settings.get("core_enabled", True)
        or not settings.get("core_extraction_enabled", True)
        or not settings.get("memory_consolidation_enabled", True)
    ):
        debug["reason"] = "consolidation_disabled"
        _set_last_memory_consolidation_debug(debug)
        return debug

    with MEMORY_LOCK:
        state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
        current_turn = int(state.get("turn_index", 0) or 0)
        items = _prune_short_term_items(state.get("items", []), current_turn)

    candidates = []
    candidate_short_ids = []
    for item in items:
        reason = _short_memory_consolidation_reason(item, settings)
        if not reason:
            continue
        candidate = _build_short_memory_consolidation_candidate(item, reason)
        if _normalize_core_memory_item(candidate):
            candidates.append(candidate)
            candidate_short_ids.append(str(item.get("id", "") or "").strip())

    debug["scanned"] = len(items)
    debug["candidates"] = len(candidates)
    debug["short_ids"] = candidate_short_ids[:8]
    if not candidates:
        debug["reason"] = "no_consolidation_candidate"
        _set_last_memory_consolidation_debug(debug)
        return debug

    memory_ids, result = _record_core_memory_candidates(candidates, settings)
    debug["action"] = result.get("action", "")
    debug["stored"] = result.get("stored", 0)
    debug["merged"] = result.get("merged", 0)
    debug["memory_ids"] = memory_ids
    if not memory_ids:
        debug["reason"] = result.get("action", "core_memory_rejected")
        _set_last_memory_consolidation_debug(debug)
        return debug

    now = _short_term_now_iso()
    ids_by_short = {}
    for short_id, memory_id in zip(candidate_short_ids, memory_ids):
        if short_id and memory_id:
            ids_by_short.setdefault(short_id, []).append(memory_id)
    with MEMORY_LOCK:
        state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
        for item in state.get("items", []):
            item_id = str(item.get("id", "") or "").strip()
            if item_id not in ids_by_short:
                continue
            item["consolidated_at"] = now
            item["consolidated_memory_ids"] = ids_by_short[item_id][:8]
        _save_short_term_memory_state(state)

    debug["status"] = "stored"
    _set_last_memory_consolidation_debug(debug)
    return debug


def has_memory_forget_intent(text):
    return memory_correction.has_memory_forget_intent(text)


def has_memory_correction_intent(text):
    return memory_correction.has_memory_correction_intent(text)


def _extract_memory_correction_text(text):
    return memory_correction.extract_memory_correction_text(
        text,
        normalize_memory_text=normalize_memory_text,
        tokenize_memory_text=tokenize_memory_text,
    )


def _memory_correction_helpers():
    return {
        "normalize_memory_text": normalize_memory_text,
        "tokenize_memory_text": tokenize_memory_text,
        "core_memory_similarity": _core_memory_similarity,
    }


def _score_memory_correction_match(query_text, correction_text, item):
    return memory_correction.score_memory_correction_match(
        query_text,
        correction_text,
        item,
        helpers=_memory_correction_helpers(),
    )

def _apply_memory_correction_from_turn(config, record):
    settings = get_memory_settings(config)
    safe = record if isinstance(record, dict) else {}
    user = normalize_memory_text(safe.get("user", ""), max_len=240)
    debug = {
        "at": _short_term_now_iso(),
        "status": "skipped",
        "reason": "",
        "action": "",
        "core_changed": 0,
        "short_changed": 0,
        "score": 0,
        "memory_ids": [],
        "short_ids": [],
    }
    if not settings.get("enabled", True) or not settings.get("core_enabled", True) or not settings.get("memory_correction_enabled", True):
        debug["reason"] = "correction_disabled"
        _set_last_memory_correction_debug(debug)
        return debug
    if not has_memory_correction_intent(user):
        debug["reason"] = "no_correction_intent"
        _set_last_memory_correction_debug(debug)
        return debug
    if len(user) < 4 or looks_garbled_text(user) or looks_sensitive_memory_text(user) or looks_stagey_text(user):
        debug["reason"] = "low_signal_or_unsafe"
        _set_last_memory_correction_debug(debug)
        return debug

    correction_text = _extract_memory_correction_text(user)
    if len(correction_text) < 4 or looks_garbled_text(correction_text) or looks_sensitive_memory_text(correction_text):
        debug["reason"] = "invalid_correction_text"
        _set_last_memory_correction_debug(debug)
        return debug

    is_forget = has_memory_forget_intent(user)
    changed_core_ids = []
    changed_short_ids = []
    best_score = 0.0
    now = datetime.now().isoformat(timespec="seconds")

    with MEMORY_LOCK:
        core_items = load_core_memory_items()
        short_state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
        short_items = short_state.get("items", [])
        if is_forget:
            kept_core = []
            for item in core_items:
                score = _score_memory_correction_match(user, correction_text, item)
                best_score = max(best_score, score)
                if score >= 0.22:
                    changed_core_ids.append(item.get("id", ""))
                else:
                    kept_core.append(item)
            kept_short = []
            for item in short_items:
                score = _score_memory_correction_match(user, correction_text, item)
                best_score = max(best_score, score)
                if score >= 0.22:
                    changed_short_ids.append(item.get("id", ""))
                else:
                    kept_short.append(item)
            if changed_core_ids:
                save_core_memory_items(kept_core)
            if changed_short_ids:
                short_state["items"] = kept_short
                _save_short_term_memory_state(short_state)
        else:
            scored_core = [
                (_score_memory_correction_match(user, correction_text, item), item)
                for item in core_items
            ]
            scored_core = [(score, item) for score, item in scored_core if score >= 0.22]
            scored_core.sort(key=lambda pair: pair[0], reverse=True)
            if scored_core:
                best_score, best_item = scored_core[0]
                best_item["text"] = correction_text
                best_item["source"] = "user_correction"
                best_item["updated_at"] = now
                best_item["status"] = "active"
                best_item["confidence"] = round(max(float(best_item.get("confidence", 0) or 0), 0.78), 4)
                best_item["importance"] = round(max(float(best_item.get("importance", 0) or 0), 0.62), 4)
                best_item["tags"] = list(dict.fromkeys([*(best_item.get("tags", []) or []), "corrected"]))[:8]
                save_core_memory_items(core_items)
                changed_core_ids.append(best_item.get("id", ""))

            scored_short = [
                (_score_memory_correction_match(user, correction_text, item), item)
                for item in short_items
            ]
            scored_short = [(score, item) for score, item in scored_short if score >= 0.22]
            scored_short.sort(key=lambda pair: pair[0], reverse=True)
            if scored_short:
                short_score, short_item = scored_short[0]
                best_score = max(best_score, short_score)
                short_item["text"] = f"最近更正：{correction_text}"
                short_item["source"] = "user_correction"
                short_item["updated_at"] = now
                short_item["support_count"] = min(999, int(short_item.get("support_count", 1) or 1) + 1)
                _save_short_term_memory_state(short_state)
                changed_short_ids.append(short_item.get("id", ""))

    if not is_forget and not changed_core_ids:
        kind, category = _classify_core_memory_text(correction_text)
        candidate = {
            "kind": kind,
            "category": category,
            "text": correction_text,
            "source": "user_correction",
            "importance": 0.72,
            "confidence": 0.82,
            "tags": ["corrected"],
            "origin": {
                "user_preview": normalize_memory_text(user, max_len=140),
                "assistant_preview": normalize_memory_text(safe.get("assistant", ""), max_len=160),
            },
        }
        created_ids, result = _record_core_memory_candidates([candidate], settings)
        changed_core_ids.extend(created_ids)
        debug["action"] = result.get("action", "")
    else:
        debug["action"] = "forget" if is_forget else "update"

    debug.update(
        {
            "status": "applied" if changed_core_ids or changed_short_ids else "skipped",
            "reason": "" if changed_core_ids or changed_short_ids else "no_matching_memory",
            "core_changed": len(changed_core_ids),
            "short_changed": len(changed_short_ids),
            "score": round(best_score, 4),
            "memory_ids": changed_core_ids,
            "short_ids": changed_short_ids,
        }
    )
    _set_last_memory_correction_debug(debug)
    return debug


def _extract_and_store_core_memory(config, record):
    settings = get_memory_settings(config)
    safe = record if isinstance(record, dict) else {}
    user = normalize_memory_text(safe.get("user", ""), max_len=240)
    assistant = normalize_memory_text(safe.get("assistant", ""), max_len=280)
    base_debug = {
        "at": _learning_now_iso(),
        "status": "skipped",
        "reason": "",
        "action": "",
        "stored": 0,
        "merged": 0,
        "source": "",
        "memory_ids": [],
    }
    if not settings.get("core_enabled", True) or not settings.get("core_extraction_enabled", True):
        base_debug["reason"] = "core_memory_disabled"
        _set_last_core_memory_debug(base_debug)
        return base_debug
    if is_lightweight_checkin_message(user):
        base_debug["reason"] = "lightweight_checkin"
        _set_last_core_memory_debug(base_debug)
        return base_debug
    if len(user) < 4 or len(assistant) < 2:
        base_debug["reason"] = "too_short"
        _set_last_core_memory_debug(base_debug)
        return base_debug
    if looks_garbled_text(user) or looks_garbled_text(assistant):
        base_debug["reason"] = "garbled_text"
        _set_last_core_memory_debug(base_debug)
        return base_debug
    if looks_stagey_text(assistant):
        base_debug["reason"] = "stagey_reply"
        _set_last_core_memory_debug(base_debug)
        return base_debug
    if looks_sensitive_memory_text(user) or looks_sensitive_memory_text(assistant):
        base_debug["reason"] = "sensitive_text"
        _set_last_core_memory_debug(base_debug)
        return base_debug
    if not _has_core_memory_signal(user, assistant):
        base_debug["reason"] = "low_signal"
        _set_last_core_memory_debug(base_debug)
        return base_debug

    explicit = _build_explicit_core_memory_candidate(user, assistant)
    candidates = []
    source = "auto_llm"
    if explicit:
        candidates.append(explicit)
        source = "explicit_user"
    else:
        try:
            raw = _call_summary_llm(config, _build_core_memory_extraction_prompt(user, assistant))
        except Exception:
            logger.debug("core memory extraction llm failed", exc_info=True)
            base_debug["reason"] = "llm_error"
            _set_last_core_memory_debug(base_debug)
            return base_debug
        data = _parse_json_object_from_llm(raw)
        if data is None:
            base_debug["reason"] = "llm_invalid_json" if str(raw or "").strip() else "llm_empty"
            _set_last_core_memory_debug(base_debug)
            return base_debug
        candidates, reason = _parse_core_memory_payloads(data, user, assistant)
        if not candidates:
            base_debug["reason"] = reason or "llm_no_memory"
            _set_last_core_memory_debug(base_debug)
            return base_debug

    memory_ids, result = _record_core_memory_candidates(candidates, settings)
    if not memory_ids:
        base_debug["reason"] = result.get("action", "memory_rejected")
        _set_last_core_memory_debug(base_debug)
        return base_debug
    debug = {
        **base_debug,
        "status": "stored",
        "reason": "",
        "action": result.get("action", ""),
        "stored": result.get("stored", 0),
        "merged": result.get("merged", 0),
        "source": source,
        "memory_ids": memory_ids,
    }
    _set_last_core_memory_debug(debug)
    return debug


def _schedule_core_memory_extraction(config, record):
    settings = get_memory_settings(config)
    if not settings.get("core_enabled", True) or not settings.get("core_extraction_enabled", True):
        _set_last_core_memory_debug(
            {
                "at": _learning_now_iso(),
                "status": "skipped",
                "reason": "core_memory_disabled",
                "action": "",
                "stored": 0,
                "merged": 0,
                "source": "",
                "memory_ids": [],
            }
        )
        return
    threading.Thread(
        target=_extract_and_store_core_memory,
        args=(config, dict(record)),
        daemon=True,
    ).start()


def _set_last_memory_debug(snapshot):
    global LAST_MEMORY_DEBUG
    LAST_MEMORY_DEBUG = memory_debug.normalize_debug_snapshot(snapshot)


RECALL_GENERIC_TOKENS = memory_selection.RECALL_GENERIC_TOKENS


def _is_core_memory_prompt_eligible(item, settings):
    return memory_selection.is_core_memory_prompt_eligible(
        item,
        settings,
        looks_garbled_text=looks_garbled_text,
        looks_sensitive_memory_text=looks_sensitive_memory_text,
    )


def _strong_recall_tokens(text):
    return memory_selection.strong_recall_tokens(
        text,
        tokenize_memory_text=tokenize_memory_text,
    )


def _extract_denied_memory_tokens(text):
    return memory_selection.extract_denied_memory_tokens(
        text,
        normalize_memory_text=normalize_memory_text,
        strong_recall_tokens_fn=_strong_recall_tokens,
    )


def _has_current_fact_assertion(text):
    return memory_selection.has_current_fact_assertion(text)


def _memory_selection_helpers():
    return {
        "normalize_memory_text": normalize_memory_text,
        "has_memory_forget_intent": has_memory_forget_intent,
        "has_memory_correction_intent": has_memory_correction_intent,
        "extract_denied_memory_tokens": _extract_denied_memory_tokens,
        "strong_recall_tokens": _strong_recall_tokens,
    }


def _memory_recall_conflict_reason(user_message, memory_text, settings=None):
    return memory_selection.memory_recall_conflict_reason(
        user_message,
        memory_text,
        settings=settings,
        helpers=_memory_selection_helpers(),
    )

def _compact_memory_skip_item(item, reason, score=0, source="memory"):
    return memory_selection.compact_memory_skip_item(
        item,
        reason,
        score=score,
        source=source,
        normalize_memory_text=normalize_memory_text,
        clamp_int=_clamp_int,
    )


def _select_core_memories_for_prompt(settings, query_tokens, user_message="", explicit_memory_intent=False):
    if not settings.get("core_enabled", True):
        return [], "disabled", 0, []
    count = max(0, int(settings.get("core_inject_count", 0) or 0))
    if count <= 0:
        return [], "count_zero", 0, []
    items = load_core_memory_items()
    eligible = [
        item for item in items
        if _is_core_memory_prompt_eligible(item, settings)
    ]
    if not eligible:
        return [], "no_eligible_memories", len(items), []
    selected, reason, skipped = memory_selection.select_core_memory_items_for_prompt(
        eligible,
        settings,
        query_tokens,
        user_message=user_message,
        explicit_memory_intent=explicit_memory_intent,
        tokenize_memory_text=tokenize_memory_text,
        learning_item_sort_time=_learning_item_sort_time,
        conflict_reason_fn=_memory_recall_conflict_reason,
        append_unique_core_memory_item=_append_unique_core_memory_item,
        compact_skip_item_fn=_compact_memory_skip_item,
    )
    return selected, reason, len(items), skipped[:8]


def _is_short_followup_message(text):
    return memory_selection.is_short_followup_message(text)


def _select_short_term_memories_for_prompt(settings, query_tokens, user_message, explicit_memory_intent=False):
    if not settings.get("short_enabled", True):
        return [], "disabled", 0, []
    count = max(0, int(settings.get("short_inject_count", 0) or 0))
    if count <= 0:
        return [], "count_zero", 0, []
    state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
    current_turn = int(state.get("turn_index", 0) or 0)
    items = _prune_short_term_items(state.get("items", []), current_turn)
    if not items:
        return [], "no_short_memories", 0, []
    selected, reason, skipped = memory_selection.select_short_term_memory_items_for_prompt(
        items,
        settings,
        query_tokens,
        user_message,
        explicit_memory_intent=explicit_memory_intent,
        tokenize_memory_text=tokenize_memory_text,
        looks_sensitive_memory_text=looks_sensitive_memory_text,
        looks_garbled_text=looks_garbled_text,
        conflict_reason_fn=_memory_recall_conflict_reason,
        append_unique_short_term_memory_item=_append_unique_short_term_memory_item,
        compact_skip_item_fn=_compact_memory_skip_item,
    )
    return selected, reason, len(items), skipped[:8]


def select_memory_items_for_prompt(config, user_message, safe_history):
    settings = get_memory_settings(config)
    explicit_memory_intent = has_explicit_memory_intent(user_message)
    specific_memory_query = is_specific_memory_query(user_message)
    correction_or_forget_intent = has_memory_correction_intent(user_message) or has_memory_forget_intent(user_message)
    debug = {
        "message": normalize_memory_text(user_message, max_len=160),
        "enabled": bool(settings["enabled"]),
        "mem0_enabled": bool(settings["mem0_enabled"]),
        "is_lightweight_checkin": is_lightweight_checkin_message(user_message),
        "explicit_memory_intent": explicit_memory_intent,
        "is_specific_memory_query": specific_memory_query,
        "correction_or_forget_intent": correction_or_forget_intent,
        "reason": "",
        "selected": [],
        "candidate_count": 0,
        "relevant_candidates": [],
        "recent_considered": 0,
        "learning_samples_enabled": bool(settings["learning_samples_enabled"]),
        "learning_samples_considered": 0,
        "learning_samples_selected": [],
        "learning_reason": "",
        "short_memory_enabled": bool(settings["short_enabled"]),
        "short_memories_considered": 0,
        "short_memories_selected": [],
        "short_memories_skipped": [],
        "short_reason": "",
        "core_memory_enabled": bool(settings["core_enabled"]),
        "core_memories_considered": 0,
        "core_memories_selected": [],
        "core_memories_skipped": [],
        "core_reason": "",
        "memory_skipped": [],
    }
    if not settings["enabled"]:
        debug["reason"] = "memory_disabled"
        _set_last_memory_debug(debug)
        return []
    if is_lightweight_checkin_message(user_message):
        debug["reason"] = "lightweight_checkin"
        _set_last_memory_debug(debug)
        return []

    query_parts = [str(user_message or "")]
    query_parts.extend(
        str(msg.get("content", ""))
        for msg in safe_history[-4:]
        if isinstance(msg, dict) and msg.get("role") == "user"
    )
    query_tokens = tokenize_memory_text(" ".join(query_parts))

    short_selected, short_reason, short_count, short_skipped = _select_short_term_memories_for_prompt(
        settings,
        query_tokens,
        user_message,
        explicit_memory_intent=explicit_memory_intent,
    )
    debug["short_memories_considered"] = short_count
    debug["short_memories_selected"] = [
        _compact_short_term_memory_prompt_item(item, score=item.get("relevance", 0))
        for item in short_selected
    ]
    debug["short_memories_skipped"] = short_skipped
    debug["short_reason"] = short_reason

    if not explicit_memory_intent and not specific_memory_query and not correction_or_forget_intent and not short_selected:
        debug["reason"] = "low_signal_or_unspecific"
        _set_last_memory_debug(debug)
        return []

    with MEMORY_LOCK:
        fallback_items = load_memory_items()
    debug["candidate_count"] = len(fallback_items)

    chosen = []
    seen = set()
    relevant_target = max(0, settings["inject_relevant"])
    total_target = max(0, relevant_target + settings["inject_recent"])

    requires_strong_match = _has_current_fact_assertion(user_message) and not explicit_memory_intent

    for item in _search_mem0_items(config, user_message, safe_history):
        mem0_text = f"{item.get('user', '')} {item.get('assistant', '')}"
        conflict_reason = _memory_recall_conflict_reason(user_message, mem0_text, settings=settings)
        if conflict_reason:
            debug["memory_skipped"].append(_compact_memory_skip_item(item, conflict_reason, source="mem0"))
            continue
        _append_unique_memory_item(chosen, seen, item)
        if len(chosen) >= relevant_target:
            break

    core_selected, core_reason, core_count, core_skipped = _select_core_memories_for_prompt(
        settings,
        query_tokens,
        user_message=user_message,
        explicit_memory_intent=explicit_memory_intent,
    )
    debug["core_memories_considered"] = core_count
    debug["core_memories_selected"] = [
        _compact_core_memory_prompt_item(item, score=item.get("relevance", 0))
        for item in core_selected
    ]
    debug["core_memories_skipped"] = core_skipped
    debug["core_reason"] = core_reason

    if relevant_target > len(chosen) and query_tokens:
        scored = []
        for idx, item in enumerate(fallback_items):
            memory_tokens = tokenize_memory_text(
                f"{item.get('user', '')} {item.get('assistant', '')}"
            )
            score = len(query_tokens & memory_tokens)
            conflict_reason = _memory_recall_conflict_reason(
                user_message,
                f"{item.get('user', '')} {item.get('assistant', '')}",
                settings=settings,
            )
            if conflict_reason:
                debug["memory_skipped"].append(_compact_memory_skip_item(item, conflict_reason, score=score, source="history"))
                continue
            if requires_strong_match and score <= 1:
                debug["memory_skipped"].append(_compact_memory_skip_item(item, "weak_match_current_assertion", score=score, source="history"))
                continue
            if score > 0:
                scored.append((score, idx, item))
        scored.sort(key=lambda row: (row[0], row[1]), reverse=True)
        debug["relevant_candidates"] = [
            _compact_memory_debug_item(item, source="keyword", score=score)
            for score, _idx, item in scored[:8]
        ]

        for score, _, item in scored:
            if score <= 0:
                continue
            if _append_unique_memory_item(chosen, seen, item) and len(chosen) >= relevant_target:
                break

    recent_n = settings["inject_recent"] if explicit_memory_intent else 0
    debug["recent_considered"] = recent_n
    if recent_n > 0 and len(chosen) < total_target:
        recent_items = fallback_items[-recent_n:]
        for item in recent_items:
            conflict_reason = _memory_recall_conflict_reason(
                user_message,
                f"{item.get('user', '')} {item.get('assistant', '')}",
                settings=settings,
            )
            if conflict_reason:
                debug["memory_skipped"].append(_compact_memory_skip_item(item, conflict_reason, source="recent"))
                continue
            if _append_unique_memory_item(chosen, seen, item) and len(chosen) >= total_target:
                break

    result = chosen[:total_target] if total_target else []
    learning_selected, learning_reason, learning_count = _select_learning_samples_for_prompt(
        settings,
        query_tokens,
        explicit_memory_intent=explicit_memory_intent,
    )
    debug["learning_samples_considered"] = learning_count
    debug["learning_samples_selected"] = [
        _compact_learning_prompt_item(item, score=item.get("relevance", 0))
        for item in learning_selected
    ]
    debug["learning_reason"] = learning_reason
    debug["selected"] = [
        _compact_memory_debug_item(item, source="selected")
        for item in result
    ]
    debug["memory_skipped"] = debug["memory_skipped"][:8]
    result = short_selected + core_selected + result + learning_selected
    debug["reason"] = "selected" if result else "no_match"
    _set_last_memory_debug(debug)
    return result


def build_memory_prompt_block(config, user_message, safe_history):
    selected = select_memory_items_for_prompt(config, user_message, safe_history)
    if not selected:
        return ""

    short_lines = []
    core_lines = []
    lines = []
    learned_lines = []
    for item in selected:
        if item.get("kind") == "short_term_memory":
            text = normalize_memory_text(item.get("text", ""), max_len=120)
            short_kind = normalize_memory_text(item.get("short_kind", ""), max_len=30)
            if text and short_kind:
                short_lines.append(f"- {short_kind}：{text}")
            elif text:
                short_lines.append(f"- {text}")
            continue
        if item.get("kind") == "core_memory":
            ago = _human_time_ago(str(item.get("updated_at") or item.get("created_at") or "").strip())
            text = normalize_memory_text(item.get("text", ""), max_len=120)
            category = normalize_memory_text(item.get("category", ""), max_len=30)
            if text and category:
                core_lines.append(f"- {ago}，{category}：{text}")
            elif text:
                core_lines.append(f"- {ago}，{text}")
            continue
        if item.get("kind") == "learning_sample":
            pattern = normalize_memory_text(item.get("compressed_pattern", ""), max_len=120)
            user_preview = normalize_memory_text(item.get("user_preview", ""), max_len=70)
            if pattern and user_preview:
                learned_lines.append(f'- 和当前话题相关的长期偏好：{pattern}（来自用户表达：“{user_preview}”）。')
            elif pattern:
                learned_lines.append(f"- 和当前话题相关的长期偏好：{pattern}。")
            continue
        ago = _human_time_ago(str(item.get("ts", "")).strip())
        user = normalize_memory_text(item.get("user", ""), max_len=70)
        assistant = normalize_memory_text(item.get("assistant", ""), max_len=90)
        lines.append(f'- {ago}，你们聊过：用户说“{user}”，你回答“{assistant}”。')

    blocks = []
    if short_lines:
        blocks.append(
            "以下是当前会话的短期记忆，用来保持当下任务、话题和未完成事项的连续性。优先用于理解“下一步、继续、好的”等短回复，不要把它当成长期事实反复强调：\n"
            + "\n".join(short_lines)
        )
    if core_lines:
        blocks.append(
            "以下是已经保存的真实长期记忆，包括事实、事件、项目进展或关系信息。只在自然相关时轻量使用，不要逐条复述，也不要主动解释你在使用记忆：\n"
            + "\n".join(core_lines)
        )
    if lines:
        blocks.append(
            "以下是你和用户过去对话里值得参考的记忆。只在自然相关时用上，不要逐条复述，也不要强行提起：\n"
            + "\n".join(lines)
        )
    if learned_lines:
        blocks.append(
            "以下是已经人工确认或高置信沉淀的长期互动偏好。把它当成轻量风格约束，不要主动解释你在使用记忆：\n"
            + "\n".join(learned_lines)
        )
    return "\n\n".join(blocks)


def merge_prompt_with_memory(prompt, memory_block):
    base = str(prompt or "").strip()
    memory = str(memory_block or "").strip()
    if base and memory:
        return f"{base}\n\n{memory}"
    return base or memory


def _safe_load_json_file(path, fallback):
    return memory_store.safe_load_json_file(path, fallback)


def _safe_save_json_file(path, payload):
    return memory_store.safe_save_json_file(path, payload)


def _tail_jsonl(path, limit=5):
    return memory_store.tail_jsonl(path, limit=limit)


def _compact_learning_audit_item(item):
    safe = item if isinstance(item, dict) else {}
    detail = safe.get("detail") if isinstance(safe.get("detail"), dict) else {}
    compact_detail = {}
    for key in ("candidate_ids", "promoted", "skipped", "pool", "ids", "delta", "changed"):
        if key in detail:
            compact_detail[key] = detail.get(key)
    return {
        "id": str(safe.get("id", ""))[:64],
        "ts": str(safe.get("ts", ""))[:40],
        "action": str(safe.get("action", safe.get("event", "")))[:48],
        "event": str(safe.get("event", ""))[:48],
        "detail": compact_detail,
    }


def _compact_learning_item(item):
    safe = item if isinstance(item, dict) else {}
    return {
        "id": str(safe.get("id", "")).strip(),
        "status": str(safe.get("status", "")).strip(),
        "score": safe.get("score", 0),
        "confidence": safe.get("confidence", 0),
        "support_count": safe.get("support_count", 0),
        "assistant_preview": normalize_memory_text(safe.get("assistant_preview", ""), max_len=90),
        "compressed_pattern": normalize_memory_text(safe.get("compressed_pattern", ""), max_len=110),
    }


def _is_learning_text_garbled(item):
    safe = item if isinstance(item, dict) else {}
    return any(
        looks_garbled_text(safe.get(key, ""))
        for key in ("assistant_preview", "user_preview", "compressed_pattern")
    )


def _compact_learning_health_window(window):
    safe = window if isinstance(window, dict) else {}
    return {
        "window_ended_at": str(safe.get("window_ended_at", "")).strip(),
        "window_size": safe.get("window_size", 0),
        "candidate_in_rate": safe.get("candidate_in_rate", 0),
        "avg_confidence": safe.get("avg_confidence", 0),
        "signal_coverage": safe.get("signal_coverage", 0),
    }


def _compact_learning_event(event):
    safe = event if isinstance(event, dict) else {}
    return {
        "ts": str(safe.get("ts", "")).strip(),
        "event": str(safe.get("event", "")).strip(),
        "reason": str(safe.get("reason", "")).strip(),
        "window_count": safe.get("window_count", 0),
    }


def _build_learning_diagnostics(candidates, samples, state):
    candidate_items = [item for item in candidates if isinstance(item, dict)]
    sample_items = [item for item in samples if isinstance(item, dict)]
    all_items = candidate_items + sample_items
    garbled_items = [item for item in all_items if _is_learning_text_garbled(item)]
    events = state.get("events", []) if isinstance(state, dict) else []
    if not isinstance(events, list):
        events = []
    health_windows = state.get("health_windows", []) if isinstance(state, dict) else []
    if not isinstance(health_windows, list):
        health_windows = []
    current_window = state.get("current_window", []) if isinstance(state, dict) else []
    if not isinstance(current_window, list):
        current_window = []

    degraded_events = [
        _compact_learning_event(item)
        for item in events
        if isinstance(item, dict) and str(item.get("event", "")).strip()
    ]
    latest_degraded = degraded_events[-1] if degraded_events else {}
    return {
        "degraded_reason": latest_degraded.get("reason", ""),
        "latest_event": latest_degraded,
        "health_windows": [
            _compact_learning_health_window(item)
            for item in health_windows[-3:]
            if isinstance(item, dict)
        ],
        "current_window_size": len(current_window),
        "current_window_avg_confidence": _avg_numeric_field(current_window, "confidence"),
        "current_window_signal_coverage": _rate_positive_field(current_window, "signal_count"),
        "garbled_count": len(garbled_items),
        "garbled_candidates_count": sum(1 for item in candidate_items if _is_learning_text_garbled(item)),
        "garbled_samples_count": sum(1 for item in sample_items if _is_learning_text_garbled(item)),
        "garbled_examples": [_compact_learning_item(item) for item in garbled_items[:3]],
    }


def _is_pending_learning_candidate(item):
    if not isinstance(item, dict):
        return False
    status = str(item.get("status", "candidate") or "candidate").strip().lower()
    return status in {"", "candidate"}


def _is_active_learning_sample(item):
    if not isinstance(item, dict):
        return False
    status = str(item.get("status", "active") or "active").strip().lower()
    return status not in {"archived", "deleted", "rejected"}


def _build_learning_review_status(settings, candidates, samples, state, memory_count):
    quick = _learning_quick_settings(state)
    inject_limit = max(0, int(settings.get("learning_inject_count", 0) or 0))
    quick_injection_enabled = bool(quick.get("inject_count", 1) >= 1)
    samples_enabled = bool(settings.get("enabled", True) and settings.get("learning_samples_enabled", True))
    prompt_injection_enabled = bool(samples_enabled and quick_injection_enabled and inject_limit > 0)
    prompt_eligible_samples = [
        item for item in samples
        if _is_learning_sample_prompt_eligible(item, settings)
    ]
    return {
        "enabled": bool(settings.get("enabled", True)),
        "mem0_enabled": bool(settings.get("mem0_enabled", False)),
        "memory_count": int(memory_count or 0),
        "candidates_enabled": bool(settings.get("learning_candidates_enabled", True)),
        "samples_enabled": samples_enabled,
        "quick_injection_enabled": quick_injection_enabled,
        "prompt_injection_enabled": prompt_injection_enabled,
        "prompt_inject_limit": inject_limit,
        "prompt_inject_effective_limit": inject_limit if prompt_injection_enabled else 0,
        "candidate_total": len(candidates),
        "pending_review_count": sum(1 for item in candidates if _is_pending_learning_candidate(item)),
        "sample_total": len(samples),
        "active_sample_count": sum(1 for item in samples if _is_active_learning_sample(item)),
        "prompt_eligible_sample_count": len(prompt_eligible_samples),
        "candidate_max_items": int(settings.get("learning_candidate_max_items", 0) or 0),
        "candidate_min_score": settings.get("learning_candidate_min_score", 0),
        "candidate_min_confidence": settings.get("learning_candidate_min_confidence", 0),
        "sample_min_score": settings.get("learning_min_score", 0),
        "sample_min_confidence": settings.get("learning_min_confidence", 0),
        "candidates_affect_prompt": False,
        "requires_user_promotion": True,
        "sensitive_filter_enabled": True,
        "local_only": True,
        "input_scope": "chat_turn_text_only",
        "degraded_mode": bool((state or {}).get("degraded_mode", False)),
    }


def _avg_numeric_field(items, key):
    values = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        try:
            values.append(float(item.get(key, 0) or 0))
        except (TypeError, ValueError):
            continue
    if not values:
        return 0
    return round(sum(values) / len(values), 4)


def _rate_positive_field(items, key):
    valid = [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []
    if not valid:
        return 0
    positives = 0
    for item in valid:
        try:
            if float(item.get(key, 0) or 0) > 0:
                positives += 1
        except (TypeError, ValueError):
            continue
    return round(positives / len(valid), 4)


def _learning_now_iso():
    return datetime.now().isoformat(timespec="seconds")


def _normalize_learning_review_item(item, fallback_id=""):
    safe = item if isinstance(item, dict) else {}
    item_id = str(safe.get("id") or fallback_id or "").strip()
    assistant_preview = normalize_memory_text(safe.get("assistant_preview", ""), max_len=220)
    user_preview = normalize_memory_text(safe.get("user_preview", ""), max_len=220)
    compressed_pattern = normalize_memory_text(safe.get("compressed_pattern", ""), max_len=260)
    if not item_id or (not assistant_preview and not compressed_pattern):
        return None
    out = dict(safe)
    out["id"] = item_id
    out["assistant_preview"] = assistant_preview
    out["user_preview"] = user_preview
    out["compressed_pattern"] = compressed_pattern
    try:
        out["score"] = max(0.0, min(1.0, float(safe.get("score", 0) or 0)))
    except (TypeError, ValueError):
        out["score"] = 0.0
    try:
        out["confidence"] = max(0.0, min(1.0, float(safe.get("confidence", 0) or 0)))
    except (TypeError, ValueError):
        out["confidence"] = 0.0
    try:
        out["support_count"] = max(0, int(safe.get("support_count", 0) or 0))
    except (TypeError, ValueError):
        out["support_count"] = 0
    out["status"] = str(safe.get("status", "candidate") or "candidate").strip() or "candidate"
    out["created_at"] = str(safe.get("created_at", "")).strip()
    out["updated_at"] = str(safe.get("updated_at", "")).strip()
    return out


def _load_learning_review_store():
    candidates_raw = _safe_load_json_file(LEARNING_CANDIDATES_PATH, [])
    samples_raw = _safe_load_json_file(LEARNING_SAMPLES_PATH, [])
    state = _safe_load_json_file(LEARNING_STATE_PATH, {})
    if not isinstance(candidates_raw, list):
        candidates_raw = []
    if not isinstance(samples_raw, list):
        samples_raw = []
    if not isinstance(state, dict):
        state = {}
    candidates = [
        item
        for idx, raw in enumerate(candidates_raw)
        for item in [_normalize_learning_review_item(raw, f"cand_{idx}")]
        if item is not None
    ]
    samples = [
        item
        for idx, raw in enumerate(samples_raw)
        for item in [_normalize_learning_review_item(raw, f"sample_{idx}")]
        if item is not None
    ]
    return candidates, samples, state


def _save_learning_review_store(candidates, samples, state=None):
    _safe_save_json_file(LEARNING_CANDIDATES_PATH, candidates if isinstance(candidates, list) else [])
    _safe_save_json_file(LEARNING_SAMPLES_PATH, samples if isinstance(samples, list) else [])
    if isinstance(state, dict):
        _safe_save_json_file(LEARNING_STATE_PATH, state)


def _learning_quick_settings(state):
    raw = state.get("quick_settings", {}) if isinstance(state, dict) else {}
    if not isinstance(raw, dict):
        raw = {}
    try:
        inject_count = int(raw.get("inject_count", 1) or 0)
    except (TypeError, ValueError):
        inject_count = 1
    try:
        promotion_min_support = int(raw.get("promotion_min_support", 1) or 1)
    except (TypeError, ValueError):
        promotion_min_support = 1
    return {
        "inject_count": 1 if inject_count >= 1 else 0,
        "promotion_min_support": 2 if promotion_min_support >= 2 else 1,
    }


def _build_learning_review_payload(candidates, samples, state, message=""):
    return {
        "ok": True,
        "message": str(message or "").strip(),
        "candidates": candidates,
        "samples": samples,
        "quick_settings": _learning_quick_settings(state),
        "state": {
            "degraded_mode": bool((state or {}).get("degraded_mode", False)),
            "turn_count": int((state or {}).get("turn_count", 0) or 0),
        },
    }


def _append_learning_audit(action, before, after, detail=None):
    event = {
        "id": f"audit_{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
        "ts": datetime.now().isoformat(timespec="microseconds"),
        "action": str(action or "").strip(),
        "before": before,
        "after": after,
        "detail": detail if isinstance(detail, dict) else {},
    }
    with LEARNING_AUDIT_LOG_PATH.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps(event, ensure_ascii=False) + "\n")


def _snapshot_learning_review(candidates, samples, state):
    try:
        safe_candidates = json.loads(json.dumps(candidates, ensure_ascii=False))
        safe_samples = json.loads(json.dumps(samples, ensure_ascii=False))
    except Exception:
        safe_candidates = []
        safe_samples = []
    return {
        "candidates": safe_candidates if isinstance(safe_candidates, list) else [],
        "samples": safe_samples if isinstance(safe_samples, list) else [],
        "quick_settings": _learning_quick_settings(state),
        "degraded_mode": bool((state or {}).get("degraded_mode", False)),
    }


def _last_learning_shadow_observation_at():
    for item in reversed(_tail_jsonl(LEARNING_SHADOW_LOG_PATH, limit=20)):
        if not isinstance(item, dict):
            continue
        if str(item.get("type", "")).strip() != "learning_observation":
            continue
        ts = str(item.get("ts", "")).strip()
        if ts:
            return ts
    return ""


def _parse_learning_observed_datetime(value):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except Exception:
        return None


def _maybe_recover_stale_learning_state(state):
    safe = state if isinstance(state, dict) else {}
    if not safe.get("degraded_mode", False):
        return safe, False
    last_observed = str(safe.get("last_observed_at", "") or "").strip()
    if not last_observed:
        last_observed = _last_learning_shadow_observation_at()
    # The old scorer pipeline is no longer active in this build. If no scorer
    # observation has landed recently, recover from stale degraded state so the
    # review UI does not look permanently broken.
    observed_dt = _parse_learning_observed_datetime(last_observed)
    if observed_dt is None:
        return safe, False
    if observed_dt.tzinfo is not None:
        age_days = (datetime.now(observed_dt.tzinfo) - observed_dt).total_seconds() / 86400
    else:
        age_days = (datetime.now() - observed_dt).total_seconds() / 86400
    if age_days < 3:
        return safe, False

    recovered = dict(safe)
    recovered["degraded_mode"] = False
    recovered["recovered_from_degraded_at"] = _learning_now_iso()
    recovered["recovered_reason"] = "stale_scorer_state"
    events = recovered.get("events", [])
    if not isinstance(events, list):
        events = []
    events.append(
        {
            "ts": recovered["recovered_from_degraded_at"],
            "event": "SCORER_RECOVERED",
            "reason": "stale_scorer_state",
        }
    )
    recovered["events"] = events[-20:]
    return recovered, True


def get_learning_candidates_for_review(config=None):
    candidates, samples, state = _load_learning_review_store()
    return _build_learning_review_payload(candidates, samples, state)


def get_learning_samples_for_review(config=None):
    return get_learning_candidates_for_review(config)


def reload_learning_review_data(config=None):
    candidates, samples, state = _load_learning_review_store()
    state, recovered = _maybe_recover_stale_learning_state(state)
    if recovered:
        _save_learning_review_store(candidates, samples, state)
    message = "Learning review data reloaded."
    if recovered:
        message = "Learning review data reloaded; stale degraded state recovered."
    return _build_learning_review_payload(candidates, samples, state, message=message)


def _find_learning_items_by_ids(items, ids):
    wanted = {str(item_id or "").strip() for item_id in ids if str(item_id or "").strip()}
    return [item for item in items if str(item.get("id", "")).strip() in wanted]


def promote_learning_review_candidates(config, candidate_ids):
    ids = [str(item_id or "").strip() for item_id in candidate_ids if str(item_id or "").strip()]
    candidates, samples, state = _load_learning_review_store()
    before = _snapshot_learning_review(candidates, samples, state)
    selected = _find_learning_items_by_ids(candidates, ids)
    existing_sample_ids = {str(item.get("id", "")).strip() for item in samples}
    promoted = 0
    now = _learning_now_iso()
    for item in selected:
        sample = dict(item)
        sample["id"] = f"learned_{item['id']}" if not str(item["id"]).startswith(("learned_", "manual_")) else item["id"]
        sample["source"] = str(sample.get("source", "") or "learned")
        sample["status"] = "active"
        sample["updated_at"] = now
        if not sample.get("created_at"):
            sample["created_at"] = now
        if sample["id"] in existing_sample_ids:
            continue
        samples.append(sample)
        existing_sample_ids.add(sample["id"])
        item["status"] = "promoted"
        item["updated_at"] = now
        promoted += 1
    after = _snapshot_learning_review(candidates, samples, state)
    _append_learning_audit(
        "promote",
        before,
        after,
        {"candidate_ids": ids, "promoted": promoted, "skipped": max(0, len(ids) - promoted)},
    )
    _save_learning_review_store(candidates, samples, state)
    return _build_learning_review_payload(
        candidates,
        samples,
        state,
        message=f"Promoted {promoted} learning candidate(s).",
    )


def update_learning_review_entries(
    config,
    *,
    action,
    pool="candidates",
    ids=None,
    delta=0.0,
    quick_settings=None,
):
    action_key = str(action or "").strip().lower()
    candidates, samples, state = _load_learning_review_store()
    before = _snapshot_learning_review(candidates, samples, state)
    target = samples if str(pool or "").strip().lower() == "samples" else candidates
    ids = [str(item_id or "").strip() for item_id in (ids or []) if str(item_id or "").strip()]
    changed = 0
    now = _learning_now_iso()

    if action_key == "config":
        quick = _learning_quick_settings({"quick_settings": quick_settings or {}})
        state["quick_settings"] = quick
        changed = 1
    elif action_key == "delete":
        wanted = set(ids)
        kept = [item for item in target if str(item.get("id", "")).strip() not in wanted]
        changed = len(target) - len(kept)
        if target is samples:
            samples = kept
        else:
            candidates = kept
    elif action_key == "weight":
        try:
            step = float(delta)
        except (TypeError, ValueError):
            step = 0.0
        wanted = set(ids)
        for item in target:
            if str(item.get("id", "")).strip() not in wanted:
                continue
            try:
                score = float(item.get("score", 0) or 0)
            except (TypeError, ValueError):
                score = 0.0
            item["score"] = round(max(0.0, min(1.0, score + step)), 4)
            item["updated_at"] = now
            changed += 1
    elif action_key == "keep":
        wanted = set(ids)
        for item in target:
            if str(item.get("id", "")).strip() not in wanted:
                continue
            item["status"] = "active" if target is samples else "candidate"
            item["updated_at"] = now
            changed += 1
    else:
        return {"ok": False, "error": f"Unsupported learning action: {action_key}"}

    after = _snapshot_learning_review(candidates, samples, state)
    _append_learning_audit(
        action_key,
        before,
        after,
        {"pool": pool, "ids": ids, "delta": delta, "changed": changed},
    )
    _save_learning_review_store(candidates, samples, state)
    return _build_learning_review_payload(
        candidates,
        samples,
        state,
        message=f"Learning review action '{action_key}' changed {changed} item(s).",
    )


def _build_core_memory_review_payload(memories=None, message=""):
    items = memories if isinstance(memories, list) else load_core_memory_items()
    active = [item for item in items if str(item.get("status", "active")).lower() == "active"]
    pinned = [item for item in active if item.get("pinned")]
    return {
        "ok": True,
        "message": str(message or "").strip(),
        "core_memories": items,
        "stats": {
            "total": len(items),
            "active": len(active),
            "pinned": len(pinned),
            "semantic": sum(1 for item in active if item.get("kind") == "semantic"),
            "episodic": sum(1 for item in active if item.get("kind") == "episodic"),
        },
    }


def _build_short_term_memory_review_payload(state=None, message=""):
    settings = get_memory_settings({})
    safe_state = _normalize_short_term_memory_state(state if isinstance(state, dict) else _load_short_term_memory_state(), settings=settings)
    current_turn = int(safe_state.get("turn_index", 0) or 0)
    items = _prune_short_term_items(safe_state.get("items", []), current_turn)
    return {
        "ok": True,
        "message": str(message or "").strip(),
        "short_memories": items,
        "stats": {
            "total": len(items),
            "turn_index": current_turn,
            "current_topic": sum(1 for item in items if item.get("kind") == "current_topic"),
            "current_task": sum(1 for item in items if item.get("kind") == "current_task"),
            "open_loop": sum(1 for item in items if item.get("kind") == "open_loop"),
        },
    }


def get_short_term_memories_for_review(config=None):
    settings = get_memory_settings(config or {})
    return _build_short_term_memory_review_payload(
        _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
    )


def _apply_short_term_memory_patch(item, patch):
    safe_patch = patch if isinstance(patch, dict) else {}
    updated = dict(item)
    if "text" in safe_patch:
        text = normalize_memory_text(safe_patch.get("text", ""), max_len=240)
        if len(text) < 3:
            return None, "empty_text"
        if looks_garbled_text(text) or looks_sensitive_memory_text(text) or looks_stagey_text(text):
            return None, "unsafe_text"
        updated["text"] = text
    if "kind" in safe_patch:
        kind = str(safe_patch.get("kind", "") or "").strip().lower()
        if kind in SHORT_TERM_MEMORY_KINDS:
            updated["kind"] = kind
    if "tags" in safe_patch:
        tags = safe_patch.get("tags", [])
        if isinstance(tags, str):
            tags = re.split(r"[,，\s]+", tags)
        if not isinstance(tags, list):
            tags = []
        updated["tags"] = [
            normalize_memory_text(tag, max_len=24)
            for tag in tags[:8]
            if normalize_memory_text(tag, max_len=24)
        ]
    if "salience" in safe_patch:
        try:
            updated["salience"] = round(max(0.0, min(1.0, float(safe_patch.get("salience", updated.get("salience", 0)) or 0))), 4)
        except (TypeError, ValueError):
            pass
    updated["updated_at"] = _short_term_now_iso()
    normalized = _normalize_short_term_memory_item(updated)
    if normalized is None:
        return None, "invalid_memory"
    return normalized, ""


def update_short_term_memory_entries(config, *, action, ids=None, delta=0.0, patch=None):
    settings = get_memory_settings(config or {})
    action_key = str(action or "").strip().lower()
    ids = [str(item_id or "").strip() for item_id in (ids or []) if str(item_id or "").strip()]
    wanted = set(ids)
    changed = 0
    with MEMORY_LOCK:
        state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
        current_turn = int(state.get("turn_index", 0) or 0)
        items = _prune_short_term_items(state.get("items", []), current_turn)
        if action_key == "clear":
            changed = len(items)
            items = []
        elif action_key == "delete":
            before = len(items)
            items = [item for item in items if str(item.get("id", "")).strip() not in wanted]
            changed = before - len(items)
        elif action_key == "weight":
            try:
                step = float(delta)
            except (TypeError, ValueError):
                step = 0.0
            for item in items:
                if str(item.get("id", "")).strip() not in wanted:
                    continue
                try:
                    salience = float(item.get("salience", 0) or 0)
                except (TypeError, ValueError):
                    salience = 0.0
                item["salience"] = round(max(0.0, min(1.0, salience + step)), 4)
                item["updated_at"] = _short_term_now_iso()
                changed += 1
        elif action_key == "edit":
            edited = []
            for item in items:
                if str(item.get("id", "")).strip() not in wanted:
                    edited.append(item)
                    continue
                patched, reason = _apply_short_term_memory_patch(item, patch or {})
                if patched is None:
                    return {"ok": False, "error": f"Short-term memory edit rejected: {reason}"}
                edited.append(patched)
                changed += 1
            items = edited
        else:
            return {"ok": False, "error": f"Unsupported short-term memory action: {action_key}"}
        state["items"] = items
        _save_short_term_memory_state(state)
    return _build_short_term_memory_review_payload(
        state,
        message=f"Short-term memory action '{action_key}' changed {changed} item(s).",
    )


def get_core_memories_for_review(config=None):
    return _build_core_memory_review_payload()


def _apply_core_memory_patch(item, patch):
    safe_patch = patch if isinstance(patch, dict) else {}
    updated = dict(item)
    if "text" in safe_patch:
        text = normalize_memory_text(safe_patch.get("text", ""), max_len=260)
        if len(text) < 4:
            return None, "empty_text"
        if looks_garbled_text(text) or looks_sensitive_memory_text(text) or looks_stagey_text(text):
            return None, "unsafe_text"
        updated["text"] = text
    if "kind" in safe_patch:
        kind = str(safe_patch.get("kind", "") or "").strip().lower()
        if kind in CORE_MEMORY_KINDS:
            updated["kind"] = kind
    if "category" in safe_patch:
        category = str(safe_patch.get("category", "") or "").strip().lower()
        if category in CORE_MEMORY_CATEGORIES:
            updated["category"] = category
    if "tags" in safe_patch:
        tags = safe_patch.get("tags", [])
        if isinstance(tags, str):
            tags = re.split(r"[,，\s]+", tags)
        if not isinstance(tags, list):
            tags = []
        updated["tags"] = [
            normalize_memory_text(tag, max_len=24)
            for tag in tags[:8]
            if normalize_memory_text(tag, max_len=24)
        ]
    for key in ("importance", "confidence"):
        if key not in safe_patch:
            continue
        try:
            updated[key] = round(max(0.0, min(1.0, float(safe_patch.get(key, updated.get(key, 0)) or 0))), 4)
        except (TypeError, ValueError):
            pass
    updated["updated_at"] = datetime.now().isoformat(timespec="seconds")
    normalized = _normalize_core_memory_item(updated)
    if normalized is None:
        return None, "invalid_memory"
    return normalized, ""


def update_core_memory_entries(config, *, action, ids=None, delta=0.0, patch=None):
    action_key = str(action or "").strip().lower()
    ids = [str(item_id or "").strip() for item_id in (ids or []) if str(item_id or "").strip()]
    wanted = set(ids)
    changed = 0
    now = datetime.now().isoformat(timespec="seconds")
    with MEMORY_LOCK:
        items = load_core_memory_items()
        if action_key == "delete":
            before = len(items)
            items = [item for item in items if str(item.get("id", "")).strip() not in wanted]
            changed = before - len(items)
        elif action_key in {"pin", "unpin"}:
            for item in items:
                if str(item.get("id", "")).strip() not in wanted:
                    continue
                item["pinned"] = action_key == "pin"
                item["updated_at"] = now
                changed += 1
        elif action_key == "weight":
            try:
                step = float(delta)
            except (TypeError, ValueError):
                step = 0.0
            for item in items:
                if str(item.get("id", "")).strip() not in wanted:
                    continue
                try:
                    importance = float(item.get("importance", 0) or 0)
                except (TypeError, ValueError):
                    importance = 0.0
                item["importance"] = round(max(0.0, min(1.0, importance + step)), 4)
                item["updated_at"] = now
                changed += 1
        elif action_key == "edit":
            edited = []
            for item in items:
                if str(item.get("id", "")).strip() not in wanted:
                    edited.append(item)
                    continue
                patched, reason = _apply_core_memory_patch(item, patch or {})
                if patched is None:
                    return {"ok": False, "error": f"Core memory edit rejected: {reason}"}
                edited.append(patched)
                changed += 1
            items = edited
        else:
            return {"ok": False, "error": f"Unsupported core memory action: {action_key}"}
        save_core_memory_items(items)
    return _build_core_memory_review_payload(
        items,
        message=f"Core memory action '{action_key}' changed {changed} item(s).",
    )


def undo_last_learning_review_action(config=None):
    audits = _tail_jsonl(LEARNING_AUDIT_LOG_PATH, limit=80)
    if not audits:
        candidates, samples, state = _load_learning_review_store()
        return _build_learning_review_payload(candidates, samples, state, message="No learning action to undo.")
    undone_ids = {
        str((item.get("detail") or {}).get("undone", "")).strip()
        for item in audits
        if isinstance(item, dict)
        and str(item.get("action", "")).strip().lower() == "undo"
        and isinstance(item.get("detail"), dict)
    }
    last = None
    for item in reversed(audits):
        if not isinstance(item, dict):
            continue
        action = str(item.get("action", "")).strip().lower()
        audit_id = str(item.get("id", "")).strip()
        if action == "undo" or not audit_id or audit_id in undone_ids:
            continue
        if isinstance(item.get("before"), dict):
            last = item
            break
    if last is None:
        candidates, samples, state = _load_learning_review_store()
        return _build_learning_review_payload(candidates, samples, state, message="No learning action to undo.")
    before = last.get("before") if isinstance(last, dict) else None
    if not isinstance(before, dict):
        candidates, samples, state = _load_learning_review_store()
        return {"ok": False, "error": "Last learning audit entry cannot be undone."}
    candidates = before.get("candidates", [])
    samples = before.get("samples", [])
    state = _safe_load_json_file(LEARNING_STATE_PATH, {})
    if not isinstance(candidates, list):
        candidates = []
    if not isinstance(samples, list):
        samples = []
    if not isinstance(state, dict):
        state = {}
    if isinstance(before.get("quick_settings"), dict):
        state["quick_settings"] = before["quick_settings"]
    undo_before = _snapshot_learning_review(*_load_learning_review_store())
    _save_learning_review_store(candidates, samples, state)
    _append_learning_audit(
        "undo",
        undo_before,
        _snapshot_learning_review(candidates, samples, state),
        {"undone": last.get("id", "")},
    )
    return _build_learning_review_payload(candidates, samples, state, message="Undid the last learning review action.")


def get_memory_debug_snapshot(config):
    settings = get_memory_settings(config)
    with MEMORY_LOCK:
        memory_count = len(load_memory_items())
        short_state = _normalize_short_term_memory_state(_load_short_term_memory_state(), settings=settings)
        short_items = _prune_short_term_items(short_state.get("items", []), int(short_state.get("turn_index", 0) or 0))
        core_items = load_core_memory_items()
        last_memory_debug = dict(LAST_MEMORY_DEBUG) if isinstance(LAST_MEMORY_DEBUG, dict) else {}
    last_extraction_debug = _compact_learning_extraction_debug(LAST_LEARNING_EXTRACTION_DEBUG)
    last_short_debug = _compact_short_term_memory_debug(LAST_SHORT_TERM_MEMORY_DEBUG)
    last_core_debug = _compact_core_memory_debug(LAST_CORE_MEMORY_DEBUG)
    last_consolidation_debug = _compact_memory_consolidation_debug(LAST_MEMORY_CONSOLIDATION_DEBUG)
    last_correction_debug = _compact_memory_correction_debug(LAST_MEMORY_CORRECTION_DEBUG)
    candidates, samples, state = _load_learning_review_store()
    review_status = _build_learning_review_status(settings, candidates, samples, state, memory_count)
    return {
        "ok": True,
        "memory": {
            "enabled": bool(settings["enabled"]),
            "mem0_enabled": bool(settings["mem0_enabled"]),
            "memory_count": memory_count,
            "last_selection": last_memory_debug,
        },
        "short_memory": {
            "enabled": bool(settings["short_enabled"]),
            "count": len(short_items),
            "turn_index": int(short_state.get("turn_index", 0) or 0),
            "inject_count": settings["short_inject_count"],
            "ttl_turns": settings["short_ttl_turns"],
            "consolidation_enabled": bool(settings["memory_consolidation_enabled"]),
            "consolidation_min_support": settings["memory_consolidation_min_support"],
            "last_update": last_short_debug,
            "last_consolidation": last_consolidation_debug,
            "recent": [_compact_short_term_memory_prompt_item(item) for item in short_items[:5]],
        },
        "core_memory": {
            "enabled": bool(settings["core_enabled"]),
            "extraction_enabled": bool(settings["core_extraction_enabled"]),
            "correction_enabled": bool(settings["memory_correction_enabled"]),
            "count": len(core_items),
            "inject_count": settings["core_inject_count"],
            "min_importance": settings["core_min_importance"],
            "min_confidence": settings["core_min_confidence"],
            "last_extraction": last_core_debug,
            "last_correction": last_correction_debug,
            "recent": [_compact_core_memory_prompt_item(item) for item in core_items[-5:]],
        },
        "learning": {
            "candidates_count": len(candidates),
            "samples_count": len(samples),
            "last_extraction": last_extraction_debug,
            "degraded_mode": bool(state.get("degraded_mode", False)),
            "turn_count": int(state.get("turn_count", 0) or 0),
            "review_status": review_status,
            "diagnostics": _build_learning_diagnostics(candidates, samples, state),
            "recent_candidates": [_compact_learning_item(item) for item in candidates[-5:]],
            "recent_samples": [_compact_learning_item(item) for item in samples[-5:]],
            "recent_audit": [
                _compact_learning_audit_item(item)
                for item in _tail_jsonl(LEARNING_AUDIT_LOG_PATH, limit=5)
            ],
            "recent_shadow": _tail_jsonl(LEARNING_SHADOW_LOG_PATH, limit=5),
        },
    }


def _load_wakeup_summary():
    if not MEMORY_SUMMARY_PATH.exists():
        return ""
    try:
        data = json.loads(MEMORY_SUMMARY_PATH.read_text(encoding="utf-8-sig"))
    except Exception:
        return ""
    return str(data.get("summary", "")).strip()


def _save_wakeup_summary(summary, item_count):
    payload = json.dumps(
        {
            "summary": str(summary or "").strip(),
            "item_count": int(item_count or 0),
            "updated_at": datetime.now().isoformat(timespec="seconds"),
        },
        ensure_ascii=False,
        indent=2,
    )
    tmp_path = MEMORY_SUMMARY_PATH.with_suffix(".tmp")
    tmp_path.write_text(payload, encoding="utf-8")
    tmp_path.replace(MEMORY_SUMMARY_PATH)


def _load_json_summary(path):
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _save_json_summary(path, payload):
    safe = payload if isinstance(payload, dict) else {}
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(
        json.dumps(safe, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(path)


def _normalize_persona_value(value, max_len=240):
    if isinstance(value, (list, tuple, set)):
        value = ", ".join(str(item).strip() for item in value if str(item).strip())
    return normalize_memory_text(value, max_len=max_len)


def _is_regression_persona_placeholder(value):
    return bool(re.fullmatch(r"\u56de\u5f52\u68c0\u67e5-\d+", str(value or "").strip()))


def _is_legacy_only_persona_text(value):
    parts = [part.strip() for part in re.split(r"[;\uff1b]", str(value or "").strip()) if part.strip()]
    if not parts:
        return False
    return all(
        re.fullmatch(
            r"\u4e3b\u52a8\u7a0b\u5ea6[:\uff1a]\s*(?:\u4f4e|\u9002\u4e2d|\u9ad8|\u5f88\u9ad8)\s*",
            part,
        )
        or re.fullmatch(
            r"\u5173\u7cfb\u5b9a\u4f4d[:\uff1a]\s*(?:\u684c\u9762\u4f19\u4f34|\u5b66\u4e60\u642d\u5b50|\u60c5\u7eea\u966a\u4f34|\u5de5\u4f5c\u52a9\u624b)\s*",
            part,
        )
        for part in parts
    )


def _normalize_persona_relationship_role(value):
    text = _normalize_persona_value(value, max_len=MANUAL_PERSONA_CARD_LIMITS["relationship_role"])
    if not text:
        return ""
    if text in PERSONA_RELATIONSHIP_ROLES:
        return text
    if any(keyword in text for keyword in ("\u5b66\u4e60", "\u642d\u5b50")):
        return PERSONA_RELATIONSHIP_ROLES[0]
    if any(keyword in text for keyword in ("\u684c\u9762", "\u4f19\u4f34")):
        return PERSONA_RELATIONSHIP_ROLES[1]
    if any(keyword in text for keyword in ("\u60c5\u7eea", "\u966a\u4f34", "\u5b89\u6170")):
        return PERSONA_RELATIONSHIP_ROLES[2]
    if any(keyword in text for keyword in ("\u5de5\u4f5c", "\u52a9\u624b", "\u6548\u7387")):
        return PERSONA_RELATIONSHIP_ROLES[3]
    lowered = text.lower()
    if any(keyword in lowered for keyword in ("study", "learn")):
        return PERSONA_RELATIONSHIP_ROLES[0]
    if any(keyword in lowered for keyword in ("desktop", "partner")):
        return PERSONA_RELATIONSHIP_ROLES[1]
    if any(keyword in lowered for keyword in ("emotion", "companion", "support")):
        return PERSONA_RELATIONSHIP_ROLES[2]
    if any(keyword in lowered for keyword in ("work", "assistant", "productivity")):
        return PERSONA_RELATIONSHIP_ROLES[3]
    return ""


def _normalize_persona_initiative_level(value):
    text = _normalize_persona_value(value, max_len=MANUAL_PERSONA_CARD_LIMITS["initiative_level"])
    if not text:
        return ""
    direct_map = {
        "\u4f4e": PERSONA_INITIATIVE_LEVELS[0],
        "\u8f83\u4f4e": PERSONA_INITIATIVE_LEVELS[0],
        "\u88ab\u52a8": PERSONA_INITIATIVE_LEVELS[0],
        "\u5c11\u6253\u6270": PERSONA_INITIATIVE_LEVELS[0],
        "\u9002\u4e2d": PERSONA_INITIATIVE_LEVELS[1],
        "\u4e2d": PERSONA_INITIATIVE_LEVELS[1],
        "\u5e73\u8861": PERSONA_INITIATIVE_LEVELS[1],
        "\u4e00\u822c": PERSONA_INITIATIVE_LEVELS[1],
        "\u9ad8": PERSONA_INITIATIVE_LEVELS[2],
        "\u8f83\u9ad8": PERSONA_INITIATIVE_LEVELS[2],
        "\u4e3b\u52a8": PERSONA_INITIATIVE_LEVELS[2],
        "\u5f88\u9ad8": PERSONA_INITIATIVE_LEVELS[3],
        "\u8d85\u9ad8": PERSONA_INITIATIVE_LEVELS[3],
    }
    if text in direct_map:
        return direct_map[text]
    lowered = text.lower()
    if "low" in lowered:
        return PERSONA_INITIATIVE_LEVELS[0]
    if "very high" in lowered or "ultra" in lowered:
        return PERSONA_INITIATIVE_LEVELS[3]
    if "high" in lowered:
        return PERSONA_INITIATIVE_LEVELS[2]
    if "mid" in lowered or "medium" in lowered:
        return PERSONA_INITIATIVE_LEVELS[1]
    if "\u4e3b\u52a8" in text:
        return PERSONA_INITIATIVE_LEVELS[2]
    if "\u4f4e\u6253\u6270" in text:
        return PERSONA_INITIATIVE_LEVELS[0]
    return text


def _extract_alias_from_identity(identity):
    text = str(identity or "").strip()
    if not text:
        return ""
    patterns = (
        r"(?:\u53eb\u6211|\u79f0\u547c\u6211|\u558a\u6211)([^\s,\uFF0C\u3002\uFF1B;\u3001]{1,20})",
        r"(?:\u7528\u6237\u79f0\u547c|\u79f0\u547c\u7528\u6237)\s*[:\uFF1A]\s*([^\s,\uFF0C\u3002\uFF1B;\u3001]{1,20})",
    )
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return normalize_memory_text(match.group(1), max_len=MANUAL_PERSONA_CARD_LIMITS["user_alias"])
    return ""


def _compose_legacy_identity(card):
    parts = []
    character_name = str(card.get("character_name", "")).strip()
    user_alias = str(card.get("user_alias", "")).strip()
    if character_name:
        parts.append(f"\u89d2\u8272\u540d\uff1a{character_name}")
    if user_alias:
        parts.append(f"\u7528\u6237\u79f0\u547c\uff1a{user_alias}")
    return normalize_memory_text("; ".join(parts), max_len=MANUAL_PERSONA_CARD_LIMITS["identity"])


def _compose_legacy_reply_style(card):
    parts = []
    speaking_style = str(card.get("speaking_style", "")).strip()
    catchphrases = str(card.get("catchphrases", "")).strip()
    if speaking_style:
        parts.append(speaking_style)
    if catchphrases:
        parts.append(f"\u53e3\u5934\u7985\uff1a{catchphrases}")
    return normalize_memory_text("; ".join(parts), max_len=MANUAL_PERSONA_CARD_LIMITS["reply_style"])


def _compose_legacy_companionship_style(card):
    parts = []
    personality_tags = str(card.get("personality_tags", "")).strip()
    initiative_level = str(card.get("initiative_level", "")).strip()
    relationship_role = str(card.get("relationship_role", "")).strip()
    if personality_tags:
        parts.append(f"\u6027\u683c\u6807\u7b7e\uff1a{personality_tags}")
    if initiative_level:
        parts.append(f"\u4e3b\u52a8\u7a0b\u5ea6\uff1a{initiative_level}")
    if relationship_role:
        parts.append(f"\u5173\u7cfb\u5b9a\u4f4d\uff1a{relationship_role}")
    return normalize_memory_text("; ".join(parts), max_len=MANUAL_PERSONA_CARD_LIMITS["companionship_style"])


def _normalize_manual_persona_card(card):
    src = card if isinstance(card, dict) else {}
    if any(_is_regression_persona_placeholder(src.get(key, "")) for key in ("character_name", "identity")):
        src = {}
    normalized = {}
    for key in MANUAL_PERSONA_CARD_FIELDS:
        if key == "relationship_role":
            normalized[key] = _normalize_persona_relationship_role(src.get(key, ""))
            continue
        if key == "initiative_level":
            normalized[key] = _normalize_persona_initiative_level(src.get(key, ""))
            continue
        max_len = MANUAL_PERSONA_CARD_LIMITS.get(key, 240)
        value = _normalize_persona_value(src.get(key, ""), max_len=max_len)
        if _is_regression_persona_placeholder(value):
            value = ""
        if key in {"personality_tags", "companionship_style"} and _is_legacy_only_persona_text(value):
            value = ""
        normalized[key] = value

    identity = str(normalized.get("identity", "")).strip()
    companionship_style = str(normalized.get("companionship_style", "")).strip()

    if not normalized.get("character_name") and identity:
        normalized["character_name"] = normalize_memory_text(
            identity, max_len=MANUAL_PERSONA_CARD_LIMITS["character_name"]
        )
    if not normalized.get("user_alias") and identity:
        normalized["user_alias"] = _extract_alias_from_identity(identity)
    if not normalized.get("likes"):
        normalized["likes"] = (
            normalized.get("user_preferences", "") or normalized.get("common_topics", "")
        )
    if not normalized.get("dislikes"):
        normalized["dislikes"] = normalized.get("user_dislikes", "")
    if not normalized.get("speaking_style"):
        normalized["speaking_style"] = normalized.get("reply_style", "")
    if (
        not normalized.get("personality_tags")
        and companionship_style
        and not _is_legacy_only_persona_text(companionship_style)
    ):
        normalized["personality_tags"] = normalize_memory_text(
            companionship_style, max_len=MANUAL_PERSONA_CARD_LIMITS["personality_tags"]
        )
    if not normalized.get("relationship_role") and companionship_style:
        normalized["relationship_role"] = _normalize_persona_relationship_role(companionship_style)
    if not normalized.get("initiative_level") and companionship_style:
        normalized["initiative_level"] = _normalize_persona_initiative_level(companionship_style)
    if not normalized.get("initiative_level"):
        normalized["initiative_level"] = PERSONA_INITIATIVE_LEVELS[1]

    if not normalized.get("identity"):
        normalized["identity"] = _compose_legacy_identity(normalized)
    if not normalized.get("user_preferences"):
        normalized["user_preferences"] = normalize_memory_text(
            normalized.get("likes", ""), max_len=MANUAL_PERSONA_CARD_LIMITS["user_preferences"]
        )
    if not normalized.get("user_dislikes"):
        normalized["user_dislikes"] = normalize_memory_text(
            normalized.get("dislikes", ""), max_len=MANUAL_PERSONA_CARD_LIMITS["user_dislikes"]
        )
    if not normalized.get("common_topics") and normalized.get("likes"):
        normalized["common_topics"] = normalize_memory_text(
            normalized.get("likes", ""), max_len=MANUAL_PERSONA_CARD_LIMITS["common_topics"]
        )
    if not normalized.get("reply_style"):
        normalized["reply_style"] = _compose_legacy_reply_style(normalized)
    if not normalized.get("companionship_style"):
        normalized["companionship_style"] = _compose_legacy_companionship_style(normalized)

    updated_at = str(src.get("updated_at", "")).strip()
    normalized["updated_at"] = updated_at
    return normalized


def load_manual_persona_card():
    if not MANUAL_PERSONA_CARD_PATH.exists():
        return _normalize_manual_persona_card({})
    try:
        data = json.loads(MANUAL_PERSONA_CARD_PATH.read_text(encoding="utf-8-sig"))
    except Exception:
        return _normalize_manual_persona_card({})
    return _normalize_manual_persona_card(data if isinstance(data, dict) else {})


def save_manual_persona_card(card):
    safe = _normalize_manual_persona_card(card)
    safe["updated_at"] = datetime.now().isoformat(timespec="seconds")
    tmp_path = MANUAL_PERSONA_CARD_PATH.with_suffix(".tmp")
    tmp_path.write_text(
        json.dumps(safe, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(MANUAL_PERSONA_CARD_PATH)
    return safe


def build_manual_persona_card_block():
    card = load_manual_persona_card()
    mapping = [
        ("character_name", "\u89d2\u8272\u540d"),
        ("user_alias", "\u7528\u6237\u79f0\u547c"),
        ("personality_tags", "\u6027\u683c\u6807\u7b7e"),
        ("speaking_style", "\u8bf4\u8bdd\u98ce\u683c"),
        ("catchphrases", "\u53e3\u5934\u7985"),
        ("likes", "\u559c\u6b22\u7684\u4e8b\u7269"),
        ("dislikes", "\u4e0d\u559c\u6b22\u7684\u4e8b\u7269"),
        ("initiative_level", "\u4e3b\u52a8\u7a0b\u5ea6"),
        ("relationship_role", "\u5173\u7cfb\u5b9a\u4f4d"),
    ]
    lines = []
    for key, label in mapping:
        value = str(card.get(key, "")).strip()
        if not value:
            continue
        lines.append(f"- {label}: {value}")
    if not lines:
        return ""
    return (
        "以下是用户手动填写的人设卡（高优先级，回答时尽量遵守；如与用户最新明确指令冲突，以最新指令为准）：\n"
        + "\n".join(lines)
    )


def _build_dialogue_excerpt(items, limit=60):
    sample = items[-max(1, int(limit)) :]
    return "\n\n".join(
        f"[{str(item.get('ts', ''))[:10]}] 用户：{normalize_memory_text(item.get('user', ''), 80)}\n"
        f"Taffy：{normalize_memory_text(item.get('assistant', ''), 100)}"
        for item in sample
        if isinstance(item, dict)
    )


def _call_summary_llm(config, prompt):
    from config import load_config

    cfg = config if isinstance(config, dict) else load_config()
    llm_cfg = cfg.get("llm", {})
    provider = str(llm_cfg.get("provider", "")).strip().lower()
    messages = [{"role": "user", "content": str(prompt or "").strip()}]

    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        from app import call_openai_compatible

        return call_openai_compatible(llm_cfg, messages)
    if provider == "ollama":
        from app import call_ollama

        return call_ollama(llm_cfg, messages)
    return ""


def _refresh_wakeup_summary(config):
    with SUMMARY_LOCK:
        try:
            with MEMORY_LOCK:
                items = load_memory_items()
            if not items:
                return

            dialogue = _build_dialogue_excerpt(items, limit=60)
            prompt = (
                "请根据以下历史对话，写一段100字以内的中文用户画像摘要。"
                "只保留事实、偏好、常见情绪、近期目标和长期习惯，不要编造，不要分点。\n\n"
                f"{dialogue}"
            )
            summary = _call_summary_llm(config, prompt)
            summary = " ".join(str(summary or "").split()).strip()
            if (
                len(summary) >= 8
                and not looks_garbled_text(summary)
                and not looks_stagey_text(summary)
            ):
                _save_wakeup_summary(summary, len(items))
        except Exception:
            logger.debug("refresh wakeup summary failed", exc_info=True)


def _refresh_persona_and_relationship_memory(config):
    with SUMMARY_LOCK:
        try:
            with MEMORY_LOCK:
                items = load_memory_items()
            if not items:
                return

            dialogue = _build_dialogue_excerpt(items, limit=80)
            profile_prompt = (
                "请根据以下历史对话，提炼一段80字以内的中文“用户人设记忆”。"
                "只保留稳定且有助于长期相处的信息：偏好、习惯、常聊话题、正在推进的项目、称呼偏好。"
                "不要编造，不要分点，不要写推测。\n\n"
                f"{dialogue}"
            )
            relationship_prompt = (
                "请根据以下历史对话，提炼一段80字以内的中文“关系记忆”。"
                "描述用户和 Taffy 更适合怎样互动：偏好短句还是详细、喜欢被安慰还是直接建议、聊天时的熟悉感与语气。"
                "只保留从对话中能看出的稳定互动偏好，不要编造，不要分点。\n\n"
                f"{dialogue}"
            )
            profile_summary = " ".join(str(_call_summary_llm(config, profile_prompt) or "").split()).strip()
            relationship_summary = " ".join(str(_call_summary_llm(config, relationship_prompt) or "").split()).strip()

            if (
                len(profile_summary) >= 8
                and not looks_garbled_text(profile_summary)
                and not looks_stagey_text(profile_summary)
            ):
                _save_json_summary(
                    PROFILE_MEMORY_PATH,
                    {
                        "summary": profile_summary,
                        "updated_at": datetime.now().isoformat(timespec="seconds"),
                        "item_count": len(items),
                    },
                )
            if (
                len(relationship_summary) >= 8
                and not looks_garbled_text(relationship_summary)
                and not looks_stagey_text(relationship_summary)
            ):
                _save_json_summary(
                    RELATIONSHIP_MEMORY_PATH,
                    {
                        "summary": relationship_summary,
                        "updated_at": datetime.now().isoformat(timespec="seconds"),
                        "item_count": len(items),
                    },
                )
        except Exception:
            logger.debug("refresh persona and relationship memory failed", exc_info=True)


def build_wakeup_summary_block():
    summary = _load_wakeup_summary()
    if not summary:
        return ""
    if looks_garbled_text(summary) or looks_stagey_text(summary):
        return ""
    return f"关于用户的长期画像：{summary}"


def build_persona_memory_block():
    data = _load_json_summary(PROFILE_MEMORY_PATH)
    summary = str(data.get("summary", "")).strip()
    if not summary:
        return ""
    if looks_garbled_text(summary) or looks_stagey_text(summary):
        return ""
    return f"关于用户的人设记忆：{summary}"


def build_relationship_memory_block():
    data = _load_json_summary(RELATIONSHIP_MEMORY_PATH)
    summary = str(data.get("summary", "")).strip()
    if not summary:
        return ""
    if looks_garbled_text(summary) or looks_stagey_text(summary):
        return ""
    return f"你和用户的关系记忆：{summary}"


def remember_interaction(config, user_message, assistant_reply, is_auto=False):
    settings = get_memory_settings(config)
    if not settings["enabled"] or is_auto:
        return

    user = normalize_memory_text(user_message, max_len=240)
    assistant = normalize_memory_text(assistant_reply, max_len=280)
    if len(user) < 2 or len(assistant) < 2:
        return
    if looks_garbled_text(user) or looks_garbled_text(assistant):
        return
    if looks_stagey_text(assistant):
        return

    record = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "user": user,
        "assistant": assistant,
    }

    with MEMORY_LOCK:
        items = load_memory_items()
        if items:
            last = items[-1]
            if last.get("user") == record["user"] and last.get("assistant") == record["assistant"]:
                return
        items.append(record)
        if len(items) > settings["max_items"]:
            items = items[-settings["max_items"] :]
        save_memory_items(items)
        new_count = len(items)

    if settings["mem0_enabled"]:
        threading.Thread(
            target=_remember_interaction_mem0,
            args=(config, record["user"], record["assistant"], record["ts"]),
            daemon=True,
        ).start()

    _update_short_term_memory(config, record)
    _maybe_consolidate_short_term_memories(config)
    correction_debug = _apply_memory_correction_from_turn(config, record)
    if correction_debug.get("status") == "applied":
        _set_last_core_memory_debug(
            {
                "at": _learning_now_iso(),
                "status": "skipped",
                "reason": "handled_by_memory_correction",
                "action": "",
                "stored": 0,
                "merged": 0,
                "source": "",
                "memory_ids": [],
            }
        )
    else:
        _schedule_core_memory_extraction(config, record)
    _schedule_learning_candidate_extraction(config, record)

    if new_count % settings["summary_trigger_every"] == 0:
        threading.Thread(
            target=_refresh_wakeup_summary,
            args=(config,),
            daemon=True,
        ).start()
        threading.Thread(
            target=_refresh_persona_and_relationship_memory,
            args=(config,),
            daemon=True,
        ).start()
