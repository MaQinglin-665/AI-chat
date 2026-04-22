import atexit
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

MANUAL_PERSONA_CARD_FIELDS = (
    "identity",
    "user_preferences",
    "user_dislikes",
    "common_topics",
    "reply_style",
    "companionship_style",
)

MANUAL_PERSONA_CARD_LIMITS = {
    "identity": 180,
    "user_preferences": 400,
    "user_dislikes": 300,
    "common_topics": 320,
    "reply_style": 360,
    "companionship_style": 360,
}


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


def _normalize_manual_persona_card(card):
    src = card if isinstance(card, dict) else {}
    normalized = {}
    for key in MANUAL_PERSONA_CARD_FIELDS:
        max_len = MANUAL_PERSONA_CARD_LIMITS.get(key, 240)
        normalized[key] = normalize_memory_text(src.get(key, ""), max_len=max_len)
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
        ("identity", "角色与身份"),
        ("user_preferences", "用户偏好"),
        ("user_dislikes", "用户不喜欢"),
        ("common_topics", "常聊话题"),
        ("reply_style", "希望Taffy说话方式"),
        ("companionship_style", "希望Taffy陪伴方式"),
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
