import atexit
import hashlib
import json
import logging
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path

from config import MEMORY_PATH, MEMORY_SUMMARY_PATH

logger = logging.getLogger(__name__)

try:
    from mem0 import Memory as Mem0Memory
except Exception:
    Mem0Memory = None


MEMORY_LOCK = threading.Lock()
MEM0_LOCK = threading.Lock()
SUMMARY_LOCK = threading.Lock()

MEM0_DIR = MEMORY_PATH.parent / ".mem0"
MEM0_QDRANT_DIR = MEM0_DIR / "qdrant"
MEM0_HISTORY_DB_PATH = MEM0_DIR / "history.db"
PROFILE_MEMORY_PATH = MEMORY_PATH.parent / "memory_profile.json"
RELATIONSHIP_MEMORY_PATH = MEMORY_PATH.parent / "memory_relationship.json"
MANUAL_PERSONA_CARD_PATH = MEMORY_PATH.parent / "memory_persona_card.json"

MEM0_CLIENT = None
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


def is_lightweight_checkin_message(text):
    safe = re.sub(r"\s+", "", str(text or "").strip().lower())
    if not safe:
        return False
    return bool(
        re.fullmatch(
            r"(在吗|在嘛|在不在|在么|喂|嗨|hi|hello|哈喽|早|早安|晚安|午安|睡了吗)[!！?？~～]*",
            safe,
        )
    )


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
    if not MEMORY_PATH.exists():
        return []
    try:
        data = json.loads(MEMORY_PATH.read_text(encoding="utf-8-sig"))
    except Exception:
        return []
    if not isinstance(data, list):
        return []

    items = []
    for raw in data:
        if not isinstance(raw, dict):
            continue
        user = normalize_memory_text(raw.get("user", ""), max_len=240)
        assistant = normalize_memory_text(raw.get("assistant", ""), max_len=280)
        ts = str(raw.get("ts", "")).strip()
        if not user or not assistant:
            continue
        if looks_garbled_text(user) or looks_garbled_text(assistant):
            continue
        if looks_stagey_text(assistant):
            continue
        items.append({"ts": ts, "user": user, "assistant": assistant})
    return items


def save_memory_items(items):
    serializable = []
    for item in items:
        if not isinstance(item, dict):
            continue
        user = normalize_memory_text(item.get("user", ""), max_len=240)
        assistant = normalize_memory_text(item.get("assistant", ""), max_len=280)
        ts = str(item.get("ts", "")).strip()
        if not user or not assistant:
            continue
        if looks_garbled_text(user) or looks_garbled_text(assistant):
            continue
        if looks_stagey_text(assistant):
            continue
        serializable.append({"ts": ts, "user": user, "assistant": assistant})

    payload = json.dumps(serializable, ensure_ascii=False, indent=2)
    tmp_path = MEMORY_PATH.with_suffix(".tmp")
    bak_path = MEMORY_PATH.with_suffix(".bak")
    previous = None
    if MEMORY_PATH.exists():
        try:
            previous = MEMORY_PATH.read_bytes()
        except Exception:
            previous = None

    tmp_path.write_text(payload, encoding="utf-8")
    tmp_path.replace(MEMORY_PATH)

    if previous is not None:
        try:
            bak_path.write_bytes(previous)
        except Exception:
            logger.debug("write memory backup failed", exc_info=True)


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


def _memory_item_id(item):
    if not isinstance(item, dict):
        return ""
    raw = (
        str(item.get("ts", "")).strip()
        + "\n"
        + str(item.get("user", "")).strip()
        + "\n"
        + str(item.get("assistant", "")).strip()
    )
    if not raw.strip():
        return ""
    return hashlib.sha1(raw.encode("utf-8", errors="ignore")).hexdigest()[:16]


def _safe_summary_payload(raw, max_len=520):
    src = raw if isinstance(raw, dict) else {}
    summary = normalize_memory_text(src.get("summary", ""), max_len=max_len)
    updated_at = str(src.get("updated_at", "")).strip()
    try:
        item_count = int(src.get("item_count", 0))
    except (TypeError, ValueError):
        item_count = 0
    if item_count < 0:
        item_count = 0
    return {
        "summary": summary,
        "updated_at": updated_at,
        "item_count": item_count,
    }


def _extract_iso_datetime(ts_str):
    text = str(ts_str or "").strip()
    if not text:
        return None
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except Exception:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _resolve_recent_updated_at(items, summary_payloads):
    candidates = []
    for item in items or []:
        ts = str((item or {}).get("ts", "")).strip()
        dt = _extract_iso_datetime(ts)
        if dt is not None:
            candidates.append((dt, ts))
    for payload in summary_payloads or []:
        ts = str((payload or {}).get("updated_at", "")).strip()
        dt = _extract_iso_datetime(ts)
        if dt is not None:
            candidates.append((dt, ts))
    if not candidates:
        return ""
    candidates.sort(key=lambda pair: pair[0], reverse=True)
    return str(candidates[0][1]).strip()


def get_memory_dashboard(config):
    settings = get_memory_settings(config if isinstance(config, dict) else {})
    with MEMORY_LOCK:
        items = load_memory_items()
    wakeup_summary = _safe_summary_payload(_load_json_summary(MEMORY_SUMMARY_PATH))
    profile_summary = _safe_summary_payload(_load_json_summary(PROFILE_MEMORY_PATH))
    relationship_summary = _safe_summary_payload(_load_json_summary(RELATIONSHIP_MEMORY_PATH))

    view_items = []
    for item in reversed(items):
        safe_item = {
            "id": _memory_item_id(item),
            "ts": str(item.get("ts", "")).strip(),
            "time_ago": _human_time_ago(item.get("ts", "")),
            "user": normalize_memory_text(item.get("user", ""), max_len=240),
            "assistant": normalize_memory_text(item.get("assistant", ""), max_len=280),
        }
        if not safe_item["user"] or not safe_item["assistant"] or not safe_item["id"]:
            continue
        view_items.append(safe_item)

    recent_updated_at = _resolve_recent_updated_at(
        items,
        [wakeup_summary, profile_summary, relationship_summary],
    )
    return {
        "ok": True,
        "memory_enabled": bool(settings.get("enabled", True)),
        "total_items": len(items),
        "recent_updated_at": recent_updated_at,
        "recent_updated_ago": _human_time_ago(recent_updated_at),
        "user_preferences": profile_summary,
        "relationship_status": relationship_summary,
        "memory_summary": wakeup_summary,
        "items": view_items,
    }


def delete_memory_item(item_id):
    safe_item_id = str(item_id or "").strip()
    if not safe_item_id:
        return {"ok": False, "error": "item_id is required.", "deleted": False}

    deleted = False
    removed_item = {}
    with MEMORY_LOCK:
        items = load_memory_items()
        kept = []
        for item in items:
            if not deleted and _memory_item_id(item) == safe_item_id:
                deleted = True
                removed_item = item if isinstance(item, dict) else {}
                continue
            kept.append(item)
        if deleted:
            save_memory_items(kept)
            total_items = len(kept)
        else:
            total_items = len(items)

    return {
        "ok": True,
        "deleted": deleted,
        "item_id": safe_item_id,
        "total_items": total_items,
        "removed_item": {
            "ts": str(removed_item.get("ts", "")).strip(),
            "user": normalize_memory_text(removed_item.get("user", ""), max_len=240),
            "assistant": normalize_memory_text(removed_item.get("assistant", ""), max_len=280),
        } if deleted else {},
    }


def clear_all_memory_items():
    with MEMORY_LOCK:
        save_memory_items([])
    with SUMMARY_LOCK:
        _save_json_summary(MEMORY_SUMMARY_PATH, {})
        _save_json_summary(PROFILE_MEMORY_PATH, {})
        _save_json_summary(RELATIONSHIP_MEMORY_PATH, {})
    return {"ok": True, "cleared": True, "total_items": 0}


def export_memory_json(config):
    settings = get_memory_settings(config if isinstance(config, dict) else {})
    with MEMORY_LOCK:
        items = load_memory_items()
    wakeup_summary = _safe_summary_payload(_load_json_summary(MEMORY_SUMMARY_PATH), max_len=1200)
    profile_summary = _safe_summary_payload(_load_json_summary(PROFILE_MEMORY_PATH), max_len=1200)
    relationship_summary = _safe_summary_payload(_load_json_summary(RELATIONSHIP_MEMORY_PATH), max_len=1200)
    return {
        "schema_version": 1,
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "memory_enabled": bool(settings.get("enabled", True)),
        "items": items,
        "summaries": {
            "memory_summary": wakeup_summary,
            "user_preferences": profile_summary,
            "relationship_status": relationship_summary,
        },
    }


def _coalesce_summary_payload(import_payload, key):
    src = import_payload if isinstance(import_payload, dict) else {}
    summaries = src.get("summaries", {})
    if isinstance(summaries, dict):
        raw = summaries.get(key)
        if isinstance(raw, dict):
            return _safe_summary_payload(raw, max_len=1200)
    top_level = src.get(key)
    if isinstance(top_level, dict):
        return _safe_summary_payload(top_level, max_len=1200)
    return {}


def import_memory_json(payload):
    src = payload if isinstance(payload, dict) else {}
    raw_items = src.get("items", [])
    if not isinstance(raw_items, list):
        raw_items = []

    with MEMORY_LOCK:
        save_memory_items(raw_items)
        imported_items = load_memory_items()

    imported_count = len(imported_items)
    memory_summary_payload = _coalesce_summary_payload(src, "memory_summary")
    user_preferences_payload = _coalesce_summary_payload(src, "user_preferences")
    relationship_payload = _coalesce_summary_payload(src, "relationship_status")

    with SUMMARY_LOCK:
        _save_json_summary(MEMORY_SUMMARY_PATH, memory_summary_payload)
        _save_json_summary(PROFILE_MEMORY_PATH, user_preferences_payload)
        _save_json_summary(RELATIONSHIP_MEMORY_PATH, relationship_payload)

    return {
        "ok": True,
        "imported_items": imported_count,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }


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


def select_memory_items_for_prompt(config, user_message, safe_history):
    settings = get_memory_settings(config)
    if not settings["enabled"]:
        return []
    if is_lightweight_checkin_message(user_message):
        return []

    with MEMORY_LOCK:
        fallback_items = load_memory_items()

    chosen = []
    seen = set()
    relevant_target = max(0, settings["inject_relevant"])
    total_target = max(0, relevant_target + settings["inject_recent"])

    for item in _search_mem0_items(config, user_message, safe_history):
        if _append_unique_memory_item(chosen, seen, item) and len(chosen) >= relevant_target:
            return chosen[:total_target] if total_target else []

    query_parts = [str(user_message or "")]
    query_parts.extend(
        str(msg.get("content", ""))
        for msg in safe_history[-4:]
        if isinstance(msg, dict) and msg.get("role") == "user"
    )
    query_tokens = tokenize_memory_text(" ".join(query_parts))

    if relevant_target > len(chosen) and query_tokens:
        scored = []
        for idx, item in enumerate(fallback_items):
            memory_tokens = tokenize_memory_text(
                f"{item.get('user', '')} {item.get('assistant', '')}"
            )
            score = len(query_tokens & memory_tokens)
            if score > 0:
                scored.append((score, idx, item))
        scored.sort(key=lambda row: (row[0], row[1]), reverse=True)

        for score, _, item in scored:
            if score <= 0:
                continue
            if _append_unique_memory_item(chosen, seen, item) and len(chosen) >= relevant_target:
                break

    recent_n = settings["inject_recent"]
    if recent_n > 0 and len(chosen) < total_target:
        recent_items = fallback_items[-recent_n:]
        for item in recent_items:
            if _append_unique_memory_item(chosen, seen, item) and len(chosen) >= total_target:
                break

    return chosen[:total_target] if total_target else []


def build_memory_prompt_block(config, user_message, safe_history):
    selected = select_memory_items_for_prompt(config, user_message, safe_history)
    if not selected:
        return ""

    lines = []
    for item in selected:
        ago = _human_time_ago(str(item.get("ts", "")).strip())
        user = normalize_memory_text(item.get("user", ""), max_len=70)
        assistant = normalize_memory_text(item.get("assistant", ""), max_len=90)
        lines.append(f'- {ago}，你们聊过：用户说“{user}”，你回答“{assistant}”。')

    return (
        "以下是你和用户过去对话里值得参考的记忆。只在自然相关时用上，不要逐条复述，也不要强行提起：\n"
        + "\n".join(lines)
    )


def merge_prompt_with_memory(prompt, memory_block):
    base = str(prompt or "").strip()
    memory = str(memory_block or "").strip()
    if base and memory:
        return f"{base}\n\n{memory}"
    return base or memory


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
    normalized = {}
    for key in MANUAL_PERSONA_CARD_FIELDS:
        if key == "relationship_role":
            normalized[key] = _normalize_persona_relationship_role(src.get(key, ""))
            continue
        if key == "initiative_level":
            normalized[key] = _normalize_persona_initiative_level(src.get(key, ""))
            continue
        max_len = MANUAL_PERSONA_CARD_LIMITS.get(key, 240)
        normalized[key] = _normalize_persona_value(src.get(key, ""), max_len=max_len)

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
    if not normalized.get("personality_tags") and companionship_style:
        normalized["personality_tags"] = normalize_memory_text(
            companionship_style, max_len=MANUAL_PERSONA_CARD_LIMITS["personality_tags"]
        )
    if not normalized.get("relationship_role") and companionship_style:
        normalized["relationship_role"] = _normalize_persona_relationship_role(companionship_style)
    if not normalized.get("initiative_level") and companionship_style:
        normalized["initiative_level"] = _normalize_persona_initiative_level(companionship_style)
    if not normalized.get("relationship_role"):
        normalized["relationship_role"] = PERSONA_RELATIONSHIP_ROLES[1]
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
