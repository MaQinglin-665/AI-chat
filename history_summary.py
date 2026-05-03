import hashlib

from utils import _clamp_int, _truncate_text


def sanitize_history(history, max_items=12):
    safe_history = []
    keep = max(1, int(max_items))
    for item in (history or [])[-keep:]:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            safe_history.append({"role": role, "content": content.strip()})
    return safe_history


def get_history_summary_settings(config):
    raw = config.get("history_summary", {}) if isinstance(config, dict) else {}
    enabled = bool(raw.get("enabled", True))
    trigger_messages = _clamp_int(raw.get("trigger_messages", 14), 14, 8, 80)
    keep_recent_messages = _clamp_int(raw.get("keep_recent_messages", 8), 8, 4, 40)
    max_summary_chars = _clamp_int(raw.get("max_summary_chars", 900), 900, 240, 3000)
    sync_summarize_on_chat = bool(raw.get("sync_summarize_on_chat", False))
    return {
        "enabled": enabled,
        "trigger_messages": trigger_messages,
        "keep_recent_messages": keep_recent_messages,
        "max_summary_chars": max_summary_chars,
        "sync_summarize_on_chat": sync_summarize_on_chat,
    }


def serialize_history_for_summary(history_items, max_messages=80):
    lines = []
    for item in (history_items or [])[-max_messages:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        if role not in {"user", "assistant"}:
            continue
        content = " ".join(str(item.get("content", "")).split()).strip()
        if not content:
            continue
        content = content[:260]
        label = "用户" if role == "user" else "馨语AI桌宠"
        lines.append(f"{label}: {content}")
    return "\n".join(lines).strip()


def build_history_summary_prompt(raw_dialogue, max_summary_chars=900):
    limit = max(240, min(3000, int(max_summary_chars)))
    return (
        "请将以下较早的多轮对话压缩成可供后续继续聊天使用的摘要。\n"
        "要求：\n"
        "1) 中文输出，简洁自然；\n"
        "2) 只保留事实、偏好、未完成事项、用户当前目标；\n"
        "3) 不要编造，不要加入建议；\n"
        f"4) 总长度不超过 {limit} 个中文字符。\n\n"
        "对话：\n"
        f"{raw_dialogue}"
    )


def summarize_older_history(
    llm_cfg,
    provider,
    older_history,
    *,
    max_summary_chars=900,
    allow_create=True,
    cache_lock,
    summary_cache,
    call_openai_compatible_func,
    call_ollama_func,
):
    raw_dialogue = serialize_history_for_summary(older_history, max_messages=96)
    if not raw_dialogue:
        return ""

    cache_key = hashlib.sha1(raw_dialogue.encode("utf-8", errors="ignore")).hexdigest()
    with cache_lock:
        if summary_cache.get("key") == cache_key:
            return str(summary_cache.get("summary", ""))

    if not allow_create:
        return ""

    prompt = build_history_summary_prompt(raw_dialogue, max_summary_chars=max_summary_chars)
    messages = [
        {
            "role": "system",
            "content": (
                "You summarize conversation history for memory compression. "
                "Be accurate, concise, and avoid adding new facts."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    summary = ""
    try:
        if provider in {"openai", "openai-compatible", "openai_compatible"}:
            summary = call_openai_compatible_func(llm_cfg, messages)
        elif provider == "ollama":
            summary = call_ollama_func(llm_cfg, messages)
    except Exception:
        summary = ""

    safe = " ".join(str(summary or "").split()).strip()
    if not safe:
        safe = _truncate_text(raw_dialogue, max_summary_chars).replace("\n", " | ")
    safe = safe[: max(240, min(3000, int(max_summary_chars)))]

    with cache_lock:
        summary_cache["key"] = cache_key
        summary_cache["summary"] = safe
    return safe


def build_prompt_with_history_summary(
    config,
    llm_cfg,
    provider,
    history,
    base_prompt,
    *,
    summarize_older_history_func,
    merge_prompt_with_memory_func,
):
    settings = get_history_summary_settings(config)
    keep_recent = int(settings["keep_recent_messages"])
    safe_history = sanitize_history(history, max_items=keep_recent)

    if not settings["enabled"]:
        return base_prompt, safe_history

    raw_items = [x for x in (history or []) if isinstance(x, dict)]
    if len(raw_items) <= settings["trigger_messages"]:
        return base_prompt, safe_history

    older_history = raw_items[:-keep_recent]
    summary = summarize_older_history_func(
        llm_cfg=llm_cfg,
        provider=provider,
        older_history=older_history,
        max_summary_chars=settings["max_summary_chars"],
        allow_create=settings["sync_summarize_on_chat"],
    )
    if not summary:
        return base_prompt, safe_history
    summary_block = (
        "以下是更早对话的压缩摘要，请把它当作长期上下文使用，不要逐条复述：\n"
        + summary
    )
    return merge_prompt_with_memory_func(base_prompt, summary_block), safe_history
