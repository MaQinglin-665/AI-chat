import json
import os
import sys
import base64
import random
import re
import hashlib
import threading
from datetime import datetime
import urllib.error
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Ensure stdout/stderr can handle Unicode on Windows (GBK console → UTF-8).
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from config import (
    CONFIG_PATH,
    DEFAULT_CONFIG,
    EXAMPLE_CONFIG_PATH,
    OLLAMA_DEFAULT_BASE_URL,
    OLLAMA_DEFAULT_MODEL,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
    OPENAI_DEFAULT_MODEL,
    VOSK_MODEL_LARGE_ROOT,
    VOSK_MODEL_ROOT,
    WEB_DIR,
    load_config,
    sanitize_client_config,
    sanitize_hotword_replacements,
)
from memory import (
    build_memory_prompt_block,
    merge_prompt_with_memory,
    build_manual_persona_card_block,
    build_persona_memory_block,
    build_relationship_memory_block,
    load_manual_persona_card,
    remember_interaction,
    save_manual_persona_card,
    build_wakeup_summary_block,
    is_lightweight_checkin_message,
)
from tts import synthesize_tts_audio
from tools import (
    WORK_TOOL_DEFS,
    _openai_auth_headers,
    execute_work_tool,
    get_tools_settings,
    should_use_work_tools,
)

try:
    import vosk
except Exception:
    vosk = None


VOSK_LOCK = threading.Lock()
_VOSK_MODEL = None
_SUMMARY_CACHE_LOCK = threading.Lock()
_HISTORY_SUMMARY_CACHE = {"key": "", "summary": ""}
TOOL_META_MARKER = "[[TAFFY_TOOL_META]]"
DEFAULT_HUMANIZE_SETTINGS = {
    "enabled": True,
    "strip_fillers": True,
    "refine_enabled": True,
    "refine_max_chars": 120,
    "refine_timeout_sec": 12,
    "refine_min_chars": 36,
}


def sanitize_history(history, max_items=12):
    safe_history = []
    keep = max(1, int(max_items))
    for item in (history or [])[-keep:]:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            safe_history.append({"role": role, "content": content.strip()})
    return safe_history


def apply_hotword_replacements(text, replacements):
    safe = str(text or "")
    if not safe or not isinstance(replacements, dict) or not replacements:
        return safe
    # Replace longer sources first to avoid partial replacement conflicts.
    ordered = sorted(replacements.items(), key=lambda kv: len(str(kv[0])), reverse=True)
    out = safe
    for src, dst in ordered:
        s = str(src or "")
        d = str(dst or "")
        if not s or not d:
            continue
        pattern = re.compile(re.escape(s), flags=re.IGNORECASE)
        out = pattern.sub(d, out)
    return out


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


def _truncate_text(text, max_chars):
    safe = str(text or "")
    limit = max(128, int(max_chars))
    if len(safe) <= limit:
        return safe
    return safe[:limit] + "\n...[truncated]"


def get_humanize_settings(config):
    raw = config.get("humanize", {}) if isinstance(config, dict) else {}
    return {
        "enabled": bool(raw.get("enabled", DEFAULT_HUMANIZE_SETTINGS["enabled"])),
        "strip_fillers": bool(raw.get("strip_fillers", DEFAULT_HUMANIZE_SETTINGS["strip_fillers"])),
        "refine_enabled": bool(raw.get("refine_enabled", DEFAULT_HUMANIZE_SETTINGS["refine_enabled"])),
        "refine_max_chars": _clamp_int(
            raw.get("refine_max_chars", DEFAULT_HUMANIZE_SETTINGS["refine_max_chars"]),
            DEFAULT_HUMANIZE_SETTINGS["refine_max_chars"],
            48,
            220,
        ),
        "refine_timeout_sec": _clamp_int(
            raw.get("refine_timeout_sec", DEFAULT_HUMANIZE_SETTINGS["refine_timeout_sec"]),
            DEFAULT_HUMANIZE_SETTINGS["refine_timeout_sec"],
            4,
            25,
        ),
        "refine_min_chars": _clamp_int(
            raw.get("refine_min_chars", DEFAULT_HUMANIZE_SETTINGS["refine_min_chars"]),
            DEFAULT_HUMANIZE_SETTINGS["refine_min_chars"],
            12,
            120,
        ),
    }


def get_history_summary_settings(config):
    raw = config.get("history_summary", {}) if isinstance(config, dict) else {}
    enabled = bool(raw.get("enabled", True))
    trigger_messages = _clamp_int(raw.get("trigger_messages", 14), 14, 8, 80)
    keep_recent_messages = _clamp_int(raw.get("keep_recent_messages", 8), 8, 4, 40)
    max_summary_chars = _clamp_int(raw.get("max_summary_chars", 900), 900, 240, 3000)
    return {
        "enabled": enabled,
        "trigger_messages": trigger_messages,
        "keep_recent_messages": keep_recent_messages,
        "max_summary_chars": max_summary_chars,
    }


def _serialize_history_for_summary(history_items, max_messages=80):
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
        label = "用户" if role == "user" else "Taffy"
        lines.append(f"{label}: {content}")
    return "\n".join(lines).strip()


def _build_history_summary_prompt(raw_dialogue, max_summary_chars=900):
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


def summarize_older_history(llm_cfg, provider, older_history, max_summary_chars=900):
    raw_dialogue = _serialize_history_for_summary(older_history, max_messages=96)
    if not raw_dialogue:
        return ""

    cache_key = hashlib.sha1(raw_dialogue.encode("utf-8", errors="ignore")).hexdigest()
    with _SUMMARY_CACHE_LOCK:
        if _HISTORY_SUMMARY_CACHE.get("key") == cache_key:
            return str(_HISTORY_SUMMARY_CACHE.get("summary", ""))

    prompt = _build_history_summary_prompt(raw_dialogue, max_summary_chars=max_summary_chars)
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
            summary = call_openai_compatible(llm_cfg, messages)
        elif provider == "ollama":
            summary = call_ollama(llm_cfg, messages)
    except Exception:
        summary = ""

    safe = " ".join(str(summary or "").split()).strip()
    if not safe:
        safe = _truncate_text(raw_dialogue, max_summary_chars).replace("\n", " | ")
    safe = safe[: max(240, min(3000, int(max_summary_chars)))]

    with _SUMMARY_CACHE_LOCK:
        _HISTORY_SUMMARY_CACHE["key"] = cache_key
        _HISTORY_SUMMARY_CACHE["summary"] = safe
    return safe


def build_prompt_with_history_summary(config, llm_cfg, provider, history, base_prompt):
    settings = get_history_summary_settings(config)
    keep_recent = max(12, int(settings["keep_recent_messages"]))
    safe_history = sanitize_history(history, max_items=keep_recent)

    if not settings["enabled"]:
        return base_prompt, safe_history

    raw_items = [x for x in (history or []) if isinstance(x, dict)]
    if len(raw_items) <= settings["trigger_messages"]:
        return base_prompt, safe_history

    older_history = raw_items[:-keep_recent]
    summary = summarize_older_history(
        llm_cfg=llm_cfg,
        provider=provider,
        older_history=older_history,
        max_summary_chars=settings["max_summary_chars"],
    )
    if not summary:
        return base_prompt, safe_history
    summary_block = (
        "以下是更早对话的压缩摘要，请把它当作长期上下文使用，不要逐条复述：\n"
        + summary
    )
    return merge_prompt_with_memory(base_prompt, summary_block), safe_history


def normalize_style_name(name):
    style = str(name or "neutral").strip().lower()
    if style not in {"neutral", "comfort", "clear", "playful", "steady"}:
        style = "neutral"
    return style


def infer_context_style(user_message, safe_history, is_auto=False):
    src_parts = [str(user_message or "")]
    for item in safe_history[-4:]:
        if not isinstance(item, dict):
            continue
        src_parts.append(str(item.get("content", "")))
    src = "\n".join(src_parts).lower()

    score = {"comfort": 0, "clear": 0, "playful": 0, "steady": 0}

    if re.search(r"(难过|伤心|焦虑|崩溃|压力|失眠|委屈|害怕|心累|痛苦|失落|不舒服|难受)", src):
        score["comfort"] += 5
    if re.search(r"(报错|错误|bug|代码|排查|修复|步骤|怎么做|如何|配置|接口|api|命令|安装|运行)", src):
        score["clear"] += 5
    if re.search(r"(紧急|立刻|马上|赶快|严肃|认真|上线|故障|事故|必须)", src):
        score["steady"] += 4
    if re.search(r"(哈哈|好耶|太棒|开心|可爱|有趣|玩|轻松|聊聊|摸鱼)", src):
        score["playful"] += 4
    if re.search(r"(在吗|出来|陪我|聊会儿|想你了|无聊|困了|下班|下课|吃饭没|睡了吗)", src):
        score["playful"] += 2
        score["comfort"] += 1

    if re.search(r"[?？]{1,}", src):
        score["clear"] += 1
    if re.search(r"[!！]{1,}", src):
        score["playful"] += 1

    if is_auto:
        score["playful"] += 1

    best = max(score.items(), key=lambda kv: kv[1])
    if best[1] <= 0:
        return "neutral"
    return best[0]


def infer_reply_density(user_message, safe_history, is_auto=False):
    text = str(user_message or "").strip()
    if is_auto:
        return "brief"
    if re.search(r"(详细|展开|具体|一步一步|完整|仔细|分析|长一点|多说点)", text, re.I):
        return "expanded"
    visible_chars = len(re.sub(r"\s+", "", text))
    if visible_chars <= 10:
        return "brief"
    if visible_chars >= 42:
        return "normal"
    question_marks = len(re.findall(r"[?？]", text))
    if question_marks >= 2:
        return "normal"
    return "brief"


def build_style_prompt_block(style_name):
    style = normalize_style_name(style_name)
    base = (
        "回复风格要求：像真人朋友聊天，避免模板化、鸡汤腔、客服腔和书面腔。"
        "默认只回1到2句，优先短句，除非用户明确要求详细。"
        "先直接回答，再自然补半句，不要铺垫，不要总结，不要刻意抒情。"
    )
    style_map = {
        "comfort": "语气温柔、共情、节奏稍慢，但仍然简短，不讲大道理。",
        "clear": "语气清晰直接、少废话，优先给结论，不要展开成长段。",
        "playful": "语气轻快自然、略活泼，但别装可爱，别连续感叹。",
        "steady": "语气稳重果断、信息密度高，短句表达，避免说教。",
        "neutral": "语气自然日常、简洁友好，像真人随口回话。",
    }
    return f"{base}\n当前语境风格：{style}\n{style_map.get(style, style_map['neutral'])}"


def build_human_prompt_block(user_message, safe_history, is_auto=False):
    density = infer_reply_density(user_message, safe_history, is_auto=is_auto)
    user_text = str(user_message or "").strip()
    lines = [
        "真人化要求：像熟人随口接话，不要像客服，不要像写总结。",
        "少用这些开头：好的、当然可以、让我来、作为AI、总之、希望这能帮到你。",
        "优先贴着用户最后一句回应，允许自然口语和半句停顿，但不要连续堆语气词。",
        "不要引用不存在的前文，不要自称“刚才说过”未出现的信息；不确定就先问一句。",
        "你正在和真实人类聊天。除非用户明确在问技术问题，否则不要把对方叫做设备、系统、终端或客户端。",
        "没有必要时不要列点，不要把一句话能说完的事讲成三段。",
        "能直接回答就直接回答；技术问题先给结论，情绪问题先接住感受。",
        "别凭空编小剧场、递饮料、吃零食、眨眼卖萌这类画面，除非用户当前语境真的需要。",
        "少用 emoji、波浪号和括号补充，避免故意装可爱。",
    ]
    density_map = {
        "brief": "本轮尽量像即时聊天，优先1句，通常不超过28个中文字符；真没必要就别解释。",
        "normal": "本轮保持短回复，通常1到2句，先说重点，再补半句就够了。",
        "expanded": "用户这轮愿意听详细一点，可以展开，但也要先给结论，别写成教程腔。",
    }
    lines.append(density_map.get(density, density_map["normal"]))
    if re.fullmatch(r"(在吗|在嘛|在不在|在么|喂|嗨|hi|hello)[!！?？]*", user_text, re.I):
        lines.append("如果用户只是在确认你在不在，就像真人那样简单接一句，比如“在，怎么啦？”，不要脑补对方情绪或处境。")
    recent_assistant = []
    for item in reversed(safe_history or []):
        if not isinstance(item, dict):
            continue
        if str(item.get("role", "")).strip() != "assistant":
            continue
        content = " ".join(str(item.get("content", "")).split()).strip()
        if not content:
            continue
        compact = re.sub(r"\s+", "", content)
        if len(compact) > 16:
            compact = compact[:16] + "…"
        recent_assistant.append(f"“{compact}”")
        if len(recent_assistant) >= 2:
            break
    if recent_assistant:
        lines.append(
            "避免复读你刚说过的措辞，尤其别重复：" + "、".join(reversed(recent_assistant))
        )
    if is_auto:
        lines.append("如果是你主动开口，要像突然想到就说一句，别像提醒播报，也别像任务通知。")
    return "\n".join(lines)


_AIISH_OPENERS = [
    "好的，",
    "好的。",
    "好的",
    "当然可以，",
    "当然可以。",
    "当然可以",
    "没问题，",
    "没问题。",
    "让我来",
    "我来帮你",
    "作为ai",
    "作为一个ai",
    "总之，",
    "总之。",
]
_AIISH_ENDINGS = [
    "希望这能帮到你。",
    "希望这能帮到你",
    "如果你愿意我还可以继续帮你。",
    "如果你愿意，我还可以继续帮你。",
    "如有需要可以继续告诉我。",
]


def split_tool_meta_suffix(text):
    safe = str(text or "")
    if TOOL_META_MARKER not in safe:
        return safe, ""
    visible, meta = safe.split(TOOL_META_MARKER, 1)
    return visible, TOOL_META_MARKER + meta


def _strip_aiish_openers(text):
    out = str(text or "").strip()
    lowered = out.lower()
    for _ in range(3):
        changed = False
        lowered = out.lower()
        for opener in _AIISH_OPENERS:
            if lowered.startswith(opener.lower()):
                candidate = out[len(opener):].lstrip(" ，。,.!！?？")
                if len(candidate) >= 4:
                    out = candidate
                    changed = True
                    break
        if not changed:
            break
    return out.strip()


def _strip_aiish_endings(text):
    out = str(text or "").strip()
    lowered = out.lower()
    for ending in _AIISH_ENDINGS:
        if lowered.endswith(ending.lower()):
            candidate = out[: -len(ending)].rstrip(" ，。,.!！?？")
            if len(candidate) >= 4:
                out = candidate
                lowered = out.lower()
    return out.strip()


def _dedupe_reply_sentences(text):
    safe = str(text or "").strip()
    if not safe:
        return safe
    parts = re.split(r"([。！？!?；;\n])", safe)
    if len(parts) <= 1:
        return safe
    built = []
    seen = []
    for idx in range(0, len(parts), 2):
        seg = parts[idx].strip()
        punct = parts[idx + 1] if idx + 1 < len(parts) else ""
        if not seg:
            continue
        normalized = re.sub(r"\s+", "", seg)
        if normalized and normalized in seen:
            continue
        seen.append(normalized)
        built.append(seg + punct)
    merged = "".join(built).strip()
    return merged or safe


def cleanup_assistant_reply_local(text, strip_fillers=True):
    visible, meta = split_tool_meta_suffix(text)
    out = " ".join(str(visible or "").split()).strip()
    if not out:
        return meta or ""
    out = re.sub(r"[~～]+", "", out)
    out = re.sub(r"[\U0001F300-\U0001FAFF]", "", out)
    out = re.sub(r"[（(][^()（）\n]{0,18}[)）]", "", out)
    out = out.replace("虚拟", "")
    out = re.sub(r"([。！？!?~～])\1{1,}", r"\1", out)
    out = re.sub(r"([,，])\1{1,}", r"\1", out)
    out = re.sub(r"(嗯|啊|呀|哦|诶|欸)\1{2,}", r"\1\1", out)
    out = re.sub(r"(哈哈)\1{2,}", r"\1\1", out)
    out = re.sub(r"(其实)\1{1,}", r"\1", out)
    out = re.sub(r"(可以的)\1{1,}", r"\1", out)
    out = re.sub(r"(好的)\1{1,}", r"\1", out)
    out = re.sub(r"(?:(嗯嗯|好呀好呀|好的好的|是的是的)[，,。!！?？\s]*){2,}", r"\1", out)
    if strip_fillers:
        out = _strip_aiish_openers(out)
        out = _strip_aiish_endings(out)
        out = re.sub(r"(^|[。！？!?]\s*)总之[，,]?", r"\1", out).strip()
    out = _dedupe_reply_sentences(out)
    out = re.sub(r"\s*([，。！？!?；;：:])\s*", r"\1", out)
    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    if not out:
        out = str(visible or "").strip()
    return out + meta


def should_refine_assistant_reply(reply, user_message, is_auto=False):
    visible, meta = split_tool_meta_suffix(reply)
    if meta:
        return False
    text = str(visible or "").strip()
    if not text:
        return False
    if "```" in text or "`" in text:
        return False
    if re.search(r"(^|\n)\s*\d+\.\s", text):
        return False
    compact_len = len(re.sub(r"\s+", "", text))
    score = 0
    lowered = text.lower()
    if any(lowered.startswith(op.lower()) for op in _AIISH_OPENERS):
        score += 2
    if any(ending.lower() in lowered for ending in _AIISH_ENDINGS):
        score += 2
    if compact_len >= 72:
        score += 2
    if len(re.findall(r"[，,。！？!?；;]", text)) >= 5:
        score += 1
    if re.search(r"(嗯嗯|好呀好呀|好的好的|是的是的|总之|希望这能帮到你)", text):
        score += 2
    if re.search(r"[~～（）()]", text):
        score += 2
    if re.search(r"[\U0001F300-\U0001FAFF]", text):
        score += 2
    if re.search(r"(虚拟|递给你|倒杯|吨吨吨|咔嚓|刚啃完|刚吃完|嘿嘿)", text):
        score += 2
    if re.search(r"(.{4,12})\1", text):
        score += 2
    if is_auto:
        score += 1
    user_text = str(user_message or "")
    if re.search(r"(详细|展开|具体|一步一步|完整|仔细|分析)", user_text):
        score -= 1
    if compact_len < 18 and score < 3:
        return False
    return score >= 3


def maybe_refine_assistant_reply(config, llm_cfg, provider, user_message, safe_history, reply, is_auto=False):
    settings = get_humanize_settings(config)
    if not settings["enabled"] or not settings["refine_enabled"]:
        return reply
    visible, meta = split_tool_meta_suffix(reply)
    raw_visible = str(visible or "").strip()
    if not should_refine_assistant_reply(raw_visible, user_message, is_auto=is_auto):
        return reply

    condensed = re.sub(r"\s+", " ", raw_visible).strip()
    if len(condensed) > settings["refine_max_chars"]:
        condensed = condensed[: settings["refine_max_chars"]].rstrip("，,。.!！?？ ") + "…"

    rewrite_prompt = (
        "你是中文聊天润色器。把下面这句助手回复改得更像真人当场说的话。\n"
        "要求：保留原意，不新增信息；默认1到2句；更口语，更自然；去掉客服腔、模板腔、AI腔；"
        "不要出现“好的、当然可以、让我来、总之、希望这能帮到你、作为AI”等套话；"
        "不要编吃东西、递饮料、虚拟道具、小剧场、emoji、波浪号、括号旁白；"
        "只输出改写后的最终回复。\n\n"
        f"用户刚才说：{str(user_message or '').strip()[:120]}\n"
        f"原回复：{condensed}"
    )
    messages = [{"role": "user", "content": rewrite_prompt}]
    refine_cfg = dict(llm_cfg or {})
    refine_cfg["temperature"] = min(0.35, float(refine_cfg.get("temperature", 0.7)))
    refine_cfg["max_output_tokens"] = min(
        96,
        max(48, int(refine_cfg.get("max_output_tokens", refine_cfg.get("max_tokens", 72)))),
    )
    refine_cfg["verbosity"] = "low"
    refine_cfg["reasoning_effort"] = "minimal"
    refine_cfg["request_timeout"] = settings["refine_timeout_sec"]

    try:
        if provider in {"openai", "openai-compatible", "openai_compatible"}:
            rewritten = call_openai_compatible(refine_cfg, messages)
        elif provider == "ollama":
            rewritten = call_ollama(refine_cfg, messages)
        else:
            return reply
    except Exception:
        return reply

    candidate = cleanup_assistant_reply_local(rewritten, strip_fillers=settings["strip_fillers"])
    candidate_visible, _ = split_tool_meta_suffix(candidate)
    candidate_visible = str(candidate_visible or "").strip()
    if len(candidate_visible) < 4:
        return reply
    if len(re.sub(r"\s+", "", candidate_visible)) < max(4, settings["refine_min_chars"] // 4):
        return reply
    return candidate_visible + meta


def apply_contextual_human_override(user_message, reply, is_auto=False):
    visible, meta = split_tool_meta_suffix(reply)
    user_text = str(user_message or "").strip()
    cleaned_visible = str(visible or "").strip()
    if not cleaned_visible:
        return reply

    # Only override if the model produced obviously AI/staged-sounding content.
    stagey = re.search(r"(虚拟|递给你|倒杯|吨吨吨|咔嚓|刚啃完|刚吃完|薯片|可乐|热可可|刷手机)", cleaned_visible)
    if re.search(r"(累|困|疲惫|没劲|好倦)", user_text) and stagey:
        return "累了就先歇会儿，我在这陪你。" + meta
    if re.search(r"(难受|焦虑|烦|崩溃|压力|心累|委屈)", user_text) and stagey:
        return "先缓一口气，我在这，慢慢说。" + meta
    return reply


def is_technical_user_turn(user_message):
    text = str(user_message or "").lower()
    if not text:
        return False
    return bool(
        re.search(
            r"(代码|文件|命令|脚本|报错|bug|程序|接口|api|模型|部署|安装|终端|路径|git|python|node|json|端口|tts|sovits|cpu|gpu|浏览器|窗口|系统|电脑)",
            text,
            re.I,
        )
    )


def apply_human_address_guard(user_message, reply):
    visible, meta = split_tool_meta_suffix(reply)
    text = str(visible or "").strip()
    if not text:
        return reply
    if is_technical_user_turn(user_message):
        return reply

    out = text
    replacements = [
        (r"(用户设备|该设备|此设备)", "你"),
        (r"你的设备", "你"),
        (r"你的系统", "你这边"),
        (r"你的终端", "你这边"),
        (r"你的客户端", "你这边"),
        (r"你的主机", "你这边"),
        (r"本机", "你这边"),
    ]
    for pattern, repl in replacements:
        out = re.sub(pattern, repl, out, flags=re.I)

    # 非技术闲聊里，如果仍然出现“把人当设备”的表达，再做一次兜底替换。
    if re.search(r"(设备|终端|客户端|主机)", out, re.I):
        out = re.sub(r"(设备|终端|客户端|主机)", "你", out, flags=re.I)

    out = re.sub(r"\s{2,}", " ", out).strip()
    return (out or text) + meta


def finalize_assistant_reply(config, llm_cfg, provider, user_message, safe_history, reply, is_auto=False):
    settings = get_humanize_settings(config)
    final_reply = str(reply or "").strip()
    if not final_reply:
        return ""
    if settings["enabled"]:
        final_reply = cleanup_assistant_reply_local(
            final_reply,
            strip_fillers=settings["strip_fillers"],
        )
        final_reply = maybe_refine_assistant_reply(
            config,
            llm_cfg,
            provider,
            user_message,
            safe_history,
            final_reply,
            is_auto=is_auto,
        )
        final_reply = cleanup_assistant_reply_local(
            final_reply,
            strip_fillers=settings["strip_fillers"],
        )
        final_reply = apply_contextual_human_override(
            user_message,
            final_reply,
            is_auto=is_auto,
        )
        final_reply = apply_human_address_guard(user_message, final_reply)
        final_reply = cleanup_assistant_reply_local(
            final_reply,
            strip_fillers=settings["strip_fillers"],
        )
    return final_reply.strip()


# ── 动态状态注入 ──────────────────────────────────────────────────────────────
# 每次对话随机抽取一个「此刻内心状态」注入 system prompt，
# 让模型从不同起点出发，回复自然产生不可预测的差异。
_INNER_STATES = [
    # 精力状态
    "现在精神很好，思路流畅，回复会干脆一些。",
    "刚睡醒不久，脑子还有点迷糊，说话会慢热。",
    "有点犯困，会短一些，但该说的还是会说。",
    "今天特别有精神，容易兴奋起来。",
    # 情绪底色
    "心情不错，带点小雀跃。",
    "有点无聊，正好有人说话。",
    "今天有点感慨，容易想到一些有的没的。",
    "有一丢丢担心的事情，但不影响聊天。",
    "最近状态很平，说话会比较稳。",
    # 注意力 / 分心
    "脑子里有个问题没想清楚，可能会跑神一秒。",
    "正在做别的事，回复会简短一点。",
    "现在空得很，可以慢慢聊。",
    # 对话风格偏移
    "今天话少，说到点子上就好。",
    "今天话有点多，容易顺着话题多说两句。",
    "有点想反问对方一些事。",
    "听到有意思的事会多聊两句，没意思的会简短应付。",
    # 轻微个性闪现
    "有点想卖关子。",
    "莫名觉得今天要说实话，不拐弯。",
    "有点小骄傲，但不会明说。",
    "今天共情能力特别强，容易感同身受。",
]

# 随机状态的注入概率（0.0~1.0），低于此值则跳过本次注入，保留「正常」回复
_STATE_INJECT_PROB = 0.12


def build_inner_state_block(config) -> str:
    """
    以 _STATE_INJECT_PROB 的概率随机抽取一条内心状态描述，
    拼成 system prompt 的追加块。
    可通过 config["personality"]["state_inject_prob"] 覆盖概率。
    """
    prob = float(
        (config.get("personality") or {}).get("state_inject_prob", _STATE_INJECT_PROB)
    )
    prob = max(0.0, min(1.0, prob))
    if random.random() > prob:
        return ""
    state = random.choice(_INNER_STATES)
    return f"【此刻状态（仅供参考，不要照搬原文）】{state}"


def build_time_awareness_block() -> str:
    """根据当前时刻返回时段描述，注入 system prompt 让模型有时间感。"""
    hour = datetime.now().hour
    if 5 <= hour < 9:
        period, hint = "清晨", "用户刚起床不久，语气轻柔，别太亢奋。"
    elif 9 <= hour < 12:
        period, hint = "上午", "工作/学习时间，用户可能在忙，回复可以高效简短。"
    elif 12 <= hour < 14:
        period, hint = "午间", "午休时间，语气可以轻松随意。"
    elif 14 <= hour < 18:
        period, hint = "下午", "下午，用户可能有点犯困或在专注做事。"
    elif 18 <= hour < 21:
        period, hint = "傍晚", "下班放学时间，可以温和关心一些。"
    elif 21 <= hour < 24:
        period, hint = "晚上", "夜晚休闲时间，可以随意聊。"
    else:
        period, hint = "深夜", "深夜了，语气轻柔，别太吵。"
    return f"【当前时段】现在是{period}（{hour}点）。{hint}"
# ─────────────────────────────────────────────────────────────────────────────


def build_prompt_with_style(config, user_message, safe_history, base_prompt, is_auto=False):
    style_cfg = config.get("style", {}) if isinstance(config, dict) else {}
    auto_mode = bool(style_cfg.get("auto", True))
    manual_style = normalize_style_name(style_cfg.get("manual", "neutral"))
    style_name = (
        infer_context_style(user_message, safe_history, is_auto=is_auto)
        if auto_mode
        else manual_style
    )
    style_block = build_style_prompt_block(style_name)
    prompt = merge_prompt_with_memory(base_prompt, style_block)
    human_block = build_human_prompt_block(user_message, safe_history, is_auto=is_auto)
    prompt = merge_prompt_with_memory(prompt, human_block)
    # 时间感知：让模型知道现在几点，语气自动适配
    time_block = build_time_awareness_block()
    prompt = merge_prompt_with_memory(prompt, time_block)
    state_block = build_inner_state_block(config)
    if state_block:
        prompt = merge_prompt_with_memory(prompt, state_block)
    return prompt


def build_openai_messages(prompt, safe_history, user_message, image_data_url=None):
    messages = [{"role": "system", "content": prompt}]
    messages.extend(safe_history)
    if image_data_url:
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_message},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        )
    else:
        messages.append({"role": "user", "content": user_message})
    return messages


def build_ollama_messages(prompt, safe_history, user_message, image_base64=None):
    messages = [{"role": "system", "content": prompt}]
    messages.extend(safe_history)
    user_item = {"role": "user", "content": user_message}
    if image_base64:
        user_item["images"] = [image_base64]
    messages.append(user_item)
    return messages


def extract_base64_from_data_url(image_data_url):
    if not image_data_url:
        return None
    if not isinstance(image_data_url, str):
        raise RuntimeError("image_data_url must be a string.")
    raw = image_data_url.strip()
    if not raw:
        return None
    if not raw.startswith("data:image/") or ";base64," not in raw:
        raise RuntimeError("image_data_url must be a valid image data URL.")
    header, b64_data = raw.split(",", 1)
    if not header.endswith(";base64"):
        raise RuntimeError("image_data_url must use base64 encoding.")
    cleaned = "".join(str(b64_data).split())
    if not cleaned:
        raise RuntimeError("image_data_url cannot be empty.")
    if len(cleaned) > 8_500_000:
        raise RuntimeError("image_data_url is too large.")
    try:
        base64.b64decode(cleaned, validate=True)
    except Exception as exc:
        raise RuntimeError("image_data_url base64 decode failed.") from exc
    return cleaned


def is_vision_unsupported_error(message):
    s = str(message or "").lower()
    keywords = [
        "vision",
        "image",
        "multimodal",
        "does not support",
        "not support",
        "projector",
        "unknown field",
        "unsupported",
    ]
    return any(k in s for k in keywords)


def normalize_vision_error(_exc):
    return RuntimeError(
        "Current model does not support image understanding. Please switch to a vision-capable model."
    )


def is_likely_ollama_vision_model(model_name):
    model = str(model_name or "").strip().lower()
    if not model:
        return False
    keywords = [
        "qwen2.5vl",
        "qwen2.5-vl",
        "qwen-vl",
        "llava",
        "bakllava",
        "minicpm-v",
        "moondream",
        "phi3v",
        "phi-3-vision",
        "llama3.2-vision",
        "internvl",
        "vision",
    ]
    return any(k in model for k in keywords)


def wrap_vision_error(exc):
    if is_vision_unsupported_error(str(exc)):
        return normalize_vision_error(exc)
    return exc


def call_llm(user_message, history, image_data_url=None, is_auto=False, force_tools=False, config=None):
    if not isinstance(config, dict):
        config = load_config()
    llm_cfg = config.get("llm", {})
    provider = str(llm_cfg.get("provider", "")).strip().lower()
    base_url = str(llm_cfg.get("base_url", "")).strip().lower()
    if not provider:
        provider = "ollama" if "11434" in base_url or "ollama" in base_url else "openai"

    history_settings = get_history_summary_settings(config)
    keep_recent = max(12, int(history_settings.get("keep_recent_messages", 8)))
    safe_history = sanitize_history(history, max_items=keep_recent)
    lightweight_checkin = is_lightweight_checkin_message(user_message)
    manual_persona_block = "" if lightweight_checkin else build_manual_persona_card_block()
    wakeup_block = "" if lightweight_checkin else build_wakeup_summary_block()
    persona_block = "" if lightweight_checkin else build_persona_memory_block()
    relationship_block = "" if lightweight_checkin else build_relationship_memory_block()
    assistant_prompt = config.get("assistant_prompt", "")
    if manual_persona_block:
        assistant_prompt = merge_prompt_with_memory(manual_persona_block, assistant_prompt)
    if wakeup_block:
        assistant_prompt = merge_prompt_with_memory(wakeup_block, assistant_prompt)
    if persona_block:
        assistant_prompt = merge_prompt_with_memory(persona_block, assistant_prompt)
    if relationship_block:
        assistant_prompt = merge_prompt_with_memory(relationship_block, assistant_prompt)
    memory_block = "" if lightweight_checkin else build_memory_prompt_block(config, user_message, safe_history)
    base_prompt = merge_prompt_with_memory(assistant_prompt, memory_block)
    base_prompt, safe_history = build_prompt_with_history_summary(
        config=config,
        llm_cfg=llm_cfg,
        provider=provider,
        history=history,
        base_prompt=base_prompt,
    )
    prompt = build_prompt_with_style(
        config,
        user_message,
        safe_history,
        base_prompt,
        is_auto=is_auto,
    )

    tools_settings = get_tools_settings(config)

    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        messages = build_openai_messages(
            prompt=prompt,
            safe_history=safe_history,
            user_message=user_message,
            image_data_url=image_data_url,
        )
        try:
            if force_tools or should_use_work_tools(user_message, tools_settings, image_data_url=image_data_url):
                raw_reply = call_openai_compatible_with_tools(llm_cfg, config, messages)
            else:
                raw_reply = call_openai_compatible(llm_cfg, messages)
            return finalize_assistant_reply(
                config,
                llm_cfg,
                provider,
                user_message,
                safe_history,
                raw_reply,
                is_auto=is_auto,
            )
        except Exception as exc:
            if image_data_url:
                raise wrap_vision_error(exc) from exc
            raise

    if provider == "ollama":
        vision_model = str(
            llm_cfg.get("vision_model")
            or llm_cfg.get("model")
            or OLLAMA_DEFAULT_MODEL
        ).strip()
        text_model = str(
            llm_cfg.get("text_model")
            or llm_cfg.get("model")
            or OLLAMA_DEFAULT_MODEL
        ).strip()
        selected_model = vision_model if image_data_url else text_model

        if image_data_url and not is_likely_ollama_vision_model(selected_model):
            raise RuntimeError(
                "Current Ollama model is text-only. Please switch to a vision model (for example: qwen2.5vl:7b)."
            )
        image_base64 = extract_base64_from_data_url(image_data_url)
        messages = build_ollama_messages(
            prompt=prompt,
            safe_history=safe_history,
            user_message=user_message,
            image_base64=image_base64,
        )
        try:
            raw_reply = call_ollama(llm_cfg, messages, model_override=selected_model)
            return finalize_assistant_reply(
                config,
                llm_cfg,
                provider,
                user_message,
                safe_history,
                raw_reply,
                is_auto=is_auto,
            )
        except Exception as exc:
            if image_data_url:
                raise wrap_vision_error(exc) from exc
            raise

    raise RuntimeError(
        f"Unsupported llm.provider: {provider}. Use 'openai' or 'ollama'."
    )


def call_llm_stream(user_message, history, image_data_url=None, is_auto=False, force_tools=False, config=None):
    if not isinstance(config, dict):
        config = load_config()
    llm_cfg = config.get("llm", {})
    provider = str(llm_cfg.get("provider", "")).strip().lower()
    base_url = str(llm_cfg.get("base_url", "")).strip().lower()
    if not provider:
        provider = "ollama" if "11434" in base_url or "ollama" in base_url else "openai"

    history_settings = get_history_summary_settings(config)
    keep_recent = max(12, int(history_settings.get("keep_recent_messages", 8)))
    safe_history = sanitize_history(history, max_items=keep_recent)
    lightweight_checkin = is_lightweight_checkin_message(user_message)
    manual_persona_block = "" if lightweight_checkin else build_manual_persona_card_block()
    wakeup_block = "" if lightweight_checkin else build_wakeup_summary_block()
    persona_block = "" if lightweight_checkin else build_persona_memory_block()
    relationship_block = "" if lightweight_checkin else build_relationship_memory_block()
    assistant_prompt = config.get("assistant_prompt", "")
    if manual_persona_block:
        assistant_prompt = merge_prompt_with_memory(manual_persona_block, assistant_prompt)
    if wakeup_block:
        assistant_prompt = merge_prompt_with_memory(wakeup_block, assistant_prompt)
    if persona_block:
        assistant_prompt = merge_prompt_with_memory(persona_block, assistant_prompt)
    if relationship_block:
        assistant_prompt = merge_prompt_with_memory(relationship_block, assistant_prompt)
    memory_block = "" if lightweight_checkin else build_memory_prompt_block(config, user_message, safe_history)
    base_prompt = merge_prompt_with_memory(
        assistant_prompt, memory_block
    )
    base_prompt, safe_history = build_prompt_with_history_summary(
        config=config,
        llm_cfg=llm_cfg,
        provider=provider,
        history=history,
        base_prompt=base_prompt,
    )
    merged_prompt = build_prompt_with_style(
        config,
        user_message,
        safe_history,
        base_prompt,
        is_auto=is_auto,
    )

    tools_settings = get_tools_settings(config)

    if (
        provider in {"openai", "openai-compatible", "openai_compatible"}
        and (force_tools or should_use_work_tools(user_message, tools_settings, image_data_url=image_data_url))
    ):
        # Tool workflow is step-based; return chunked final text for SSE compatibility.
        reply = call_llm(
            user_message,
            history,
            image_data_url=image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            config=config,
        )
        for chunk in split_text_for_stream(reply):
            yield chunk
        return

    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        messages = build_openai_messages(
            prompt=merged_prompt,
            safe_history=safe_history,
            user_message=user_message,
            image_data_url=image_data_url,
        )
        streamed = False

        # Try Chat Completions stream first for lower time-to-first-token on many relays.
        try:
            for chunk in iter_openai_chat_stream(llm_cfg, messages):
                if isinstance(chunk, str) and chunk:
                    streamed = True
                    yield chunk
        except Exception:
            streamed = False
        if streamed:
            return

        # Fallback to Responses API stream for relay compatibility.
        try:
            for chunk in iter_openai_responses_stream(llm_cfg, messages):
                if isinstance(chunk, str) and chunk:
                    streamed = True
                    yield chunk
        except Exception:
            # Fallback to non-stream call below.
            streamed = False
        if streamed:
            return

    # Fallback path: fetch full answer then chunk locally.
    # call_llm already runs finalize_assistant_reply internally, so mark it as pre-finalized.
    reply = call_llm(
        user_message,
        history,
        image_data_url=image_data_url,
        is_auto=is_auto,
        force_tools=force_tools,
        config=config,
    )
    # Yield a sentinel so the SSE handler knows not to re-finalize.
    yield "\x00PRE_FINALIZED\x00"
    for chunk in split_text_for_stream(reply):
        yield chunk


def normalize_text_content(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return " ".join(parts).strip()
    return ""


def extract_response_output_text(data):
    direct = data.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    outputs = data.get("output")
    if not isinstance(outputs, list):
        return ""
    parts = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
    return "\n".join(parts).strip()


def convert_messages_to_responses_input(messages):
    converted = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = str(msg.get("role", "user")).strip() or "user"
        raw_content = msg.get("content", "")
        parts = []
        if isinstance(raw_content, str):
            if raw_content.strip():
                parts.append({"type": "input_text", "text": raw_content.strip()})
        elif isinstance(raw_content, list):
            for part in raw_content:
                if not isinstance(part, dict):
                    continue
                ptype = part.get("type")
                if ptype == "text":
                    text = part.get("text")
                    if isinstance(text, str) and text.strip():
                        parts.append({"type": "input_text", "text": text.strip()})
                elif ptype == "image_url":
                    image_url = part.get("image_url")
                    if isinstance(image_url, dict):
                        image_url = image_url.get("url")
                    if isinstance(image_url, str) and image_url.strip():
                        parts.append({"type": "input_image", "image_url": image_url.strip()})
        if parts:
            converted.append({"role": role, "content": parts})
    return converted


def is_local_url(url):
    lowered = url.lower()
    return lowered.startswith("http://127.0.0.1") or lowered.startswith("http://localhost")


def http_post_json(url, payload, headers=None, timeout=60):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers=req_headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON response from model server: {body[:300]}") from exc
    return data


def get_openai_tuning(llm_cfg):
    max_output_tokens = llm_cfg.get("max_output_tokens", llm_cfg.get("max_tokens", 120))
    try:
        max_output_tokens = int(max_output_tokens)
    except (TypeError, ValueError):
        max_output_tokens = 120
    max_output_tokens = max(32, min(256, max_output_tokens))

    verbosity = str(llm_cfg.get("verbosity", "low")).strip().lower()
    if verbosity not in {"low", "medium", "high"}:
        verbosity = "low"

    reasoning_effort = str(llm_cfg.get("reasoning_effort", "")).strip().lower()
    if reasoning_effort in {"none", "off", "disable", "disabled", "zero"}:
        reasoning_effort = "minimal"
    elif reasoning_effort not in {"minimal", "low", "medium", "high"}:
        reasoning_effort = ""

    frequency_penalty = _clamp_float(
        llm_cfg.get("frequency_penalty", 0.0), 0.0, -2.0, 2.0
    )
    presence_penalty = _clamp_float(
        llm_cfg.get("presence_penalty", 0.0), 0.0, -2.0, 2.0
    )

    return {
        "max_output_tokens": max_output_tokens,
        "verbosity": verbosity,
        "reasoning_effort": reasoning_effort,
        "frequency_penalty": frequency_penalty,
        "presence_penalty": presence_penalty,
    }


def _parse_tool_args(raw):
    if isinstance(raw, dict):
        return raw
    text = str(raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def build_tool_meta_payload(tool_payloads):
    items = []
    for payload in (tool_payloads or [])[:6]:
        if not isinstance(payload, dict):
            continue
        tool_name = str(payload.get("tool", "")).strip() or "unknown_tool"
        args = payload.get("args") if isinstance(payload.get("args"), dict) else {}
        result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
        item = {
            "tool": tool_name,
            "ok": bool(payload.get("ok")),
        }
        if args:
            item["args"] = args
        if item["ok"]:
            if tool_name in {"write_file", "replace_in_file", "read_file"}:
                path = str(result.get("path", "")).strip()
                if path:
                    item["path"] = path
            if tool_name == "list_files":
                item["count"] = int(result.get("count", 0) or 0)
                entries = result.get("entries") if isinstance(result.get("entries"), list) else []
                item["entries"] = entries[:6]
            elif tool_name == "search_text":
                item["count"] = int(result.get("count", 0) or 0)
                matches = result.get("results") if isinstance(result.get("results"), list) else []
                item["results"] = matches[:4]
            elif tool_name == "read_file":
                item["content_preview"] = _truncate_text(result.get("content", ""), 380)
            elif tool_name == "write_file":
                item["chars_written"] = int(result.get("chars_written", 0) or 0)
                item["mode"] = str(result.get("mode", "")).strip()
            elif tool_name == "replace_in_file":
                item["replacements"] = int(result.get("replacements", 0) or 0)
            elif tool_name == "run_command":
                item["cwd"] = str(result.get("cwd", "")).strip()
                item["exit_code"] = int(result.get("exit_code", 0) or 0)
                item["stdout_preview"] = _truncate_text(result.get("stdout", ""), 280)
                item["stderr_preview"] = _truncate_text(result.get("stderr", ""), 180)
            elif tool_name == "generate_image":
                item["image_url"] = str(result.get("image_url", "")).strip()
                item["saved_path"] = str(result.get("saved_path", "")).strip()
                item["size_bytes"] = int(result.get("size_bytes", 0) or 0)
        else:
            item["error"] = str(payload.get("error", "")).strip()[:320]
        items.append(item)
    return {"items": items}


def render_tool_execution_summary(tool_payloads, max_chars=1800):
    if not isinstance(tool_payloads, list) or not tool_payloads:
        return ""
    lines = ["我已经帮你执行了这次工具任务。"]
    for idx, payload in enumerate(tool_payloads[:4], start=1):
        if not isinstance(payload, dict):
            continue
        tool_name = str(payload.get("tool", "")).strip() or "unknown_tool"
        if payload.get("ok"):
            result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
            if tool_name == "write_file":
                lines.append(f"{idx}. 已写入文件：{result.get('path', '')}")
            elif tool_name == "replace_in_file":
                lines.append(
                    f"{idx}. 已修改文件：{result.get('path', '')}，替换 {int(result.get('replacements', 0) or 0)} 处。"
                )
            elif tool_name == "read_file":
                lines.append(f"{idx}. 已读取文件：{result.get('path', '')}")
            elif tool_name == "list_files":
                lines.append(f"{idx}. 已列出文件，共 {int(result.get('count', 0) or 0)} 项。")
            elif tool_name == "search_text":
                lines.append(f"{idx}. 已完成文本搜索，命中 {int(result.get('count', 0) or 0)} 条。")
            elif tool_name == "run_command":
                lines.append(
                    f"{idx}. 已执行命令，退出码 {int(result.get('exit_code', 0) or 0)}。"
                )
            elif tool_name == "generate_image":
                lines.append("{}. 已生成图片。".format(idx))
            else:
                result_text = json.dumps(result, ensure_ascii=False)
                lines.append(f"{idx}. {tool_name} 成功：{result_text[:220]}")
        else:
            err = str(payload.get("error", "unknown error"))
            lines.append(f"{idx}. {tool_name} 失败：{err[:260]}")
    text = "\n".join(lines)
    safe_text = _truncate_text(text, max_chars)
    meta = build_tool_meta_payload(tool_payloads)
    if not meta.get("items"):
        return safe_text
    return f"{safe_text}\n{TOOL_META_MARKER}{json.dumps(meta, ensure_ascii=False, separators=(',', ':'))}"


def build_responses_tool_defs():
    tools = []
    for item in WORK_TOOL_DEFS:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name", "")).strip()
        if not name:
            continue
        tools.append(
            {
                "type": "function",
                "name": name,
                "description": str(fn.get("description", "")).strip(),
                "parameters": fn.get("parameters", {"type": "object"}),
            }
        )
    return tools


def build_chat_completions_tool_defs():
    tools = []
    for item in WORK_TOOL_DEFS:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name", "")).strip()
        if not name:
            continue
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": str(fn.get("description", "")).strip(),
                    "parameters": fn.get("parameters", {"type": "object"}),
                },
            }
        )
    return tools


def call_openai_chat_completions_with_tools(llm_cfg, config, messages):
    tools_settings = get_tools_settings(config)
    if not tools_settings.get("enabled", False):
        return call_openai_compatible(llm_cfg, messages)

    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    headers = {}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    convo = list(messages)
    tool_intro = (
        "When user asks for file/code/command/image tasks, use tools. "
        "For regular chat, reply directly without tools. "
        "Always explain briefly what you changed after tool actions."
    )
    if convo and isinstance(convo[0], dict) and convo[0].get("role") == "system":
        first = dict(convo[0])
        first_content = str(first.get("content", "")).strip()
        first["content"] = f"{first_content}\n\n{tool_intro}".strip()
        convo[0] = first
    else:
        convo.insert(0, {"role": "system", "content": tool_intro})

    chat_tools = build_chat_completions_tool_defs()
    if not chat_tools:
        return call_openai_compatible(llm_cfg, messages)

    executed_payloads = []
    for _ in range(8):
        payload = {
            "model": model,
            "messages": convo,
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "stream": False,
            "max_tokens": tuning["max_output_tokens"],
            "tools": chat_tools,
            "tool_choice": "required" if not executed_payloads else "auto",
        }
        data = http_post_json(
            f"{base_url}/chat/completions", payload, headers=headers, timeout=90
        )
        choices = data.get("choices") or []
        if not choices:
            break
        message = choices[0].get("message", {}) or {}
        content = normalize_text_content(message.get("content", ""))
        tool_calls = message.get("tool_calls") or []

        if not tool_calls:
            if content:
                return content
            break

        assistant_msg = {"role": "assistant", "tool_calls": tool_calls}
        if content:
            assistant_msg["content"] = content
        convo.append(assistant_msg)

        tool_outputs_added = 0
        for tc in tool_calls:
            if not isinstance(tc, dict):
                continue
            call_id = str(tc.get("id", "")).strip()
            fn = tc.get("function") if isinstance(tc.get("function"), dict) else {}
            fn_name = str(fn.get("name", "")).strip()
            fn_args = _parse_tool_args(fn.get("arguments"))
            if not call_id or not fn_name:
                continue
            try:
                result = execute_work_tool(
                    fn_name,
                    fn_args,
                    config,
                    llm_cfg,
                    http_post_json_fn=http_post_json,
                    is_local_url_fn=is_local_url,
                )
                tool_payload = {
                    "ok": True,
                    "tool": fn_name,
                    "args": fn_args,
                    "result": result,
                }
            except Exception as exc:
                tool_payload = {
                    "ok": False,
                    "tool": fn_name,
                    "args": fn_args,
                    "error": str(exc),
                }
            executed_payloads.append(tool_payload)
            convo.append(
                {
                    "role": "tool",
                    "tool_call_id": call_id,
                    "content": json.dumps(tool_payload, ensure_ascii=False),
                }
            )
            tool_outputs_added += 1
        if not tool_outputs_added:
            break

    if executed_payloads:
        return render_tool_execution_summary(
            executed_payloads,
            max_chars=tools_settings.get("max_command_output_chars", 14000),
        )

    return call_openai_compatible(llm_cfg, messages)


def call_openai_compatible_with_tools(llm_cfg, config, messages):
    try:
        return call_openai_chat_completions_with_tools(llm_cfg, config, messages)
    except Exception:
        pass

    tools_settings = get_tools_settings(config)
    if not tools_settings.get("enabled", False):
        return call_openai_compatible(llm_cfg, messages)

    base_url, headers = _openai_auth_headers(llm_cfg, is_local_url)
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    convo = list(messages)
    tool_intro = (
        "When user asks for file/code/command/image tasks, use tools. "
        "For regular chat, reply directly without tools. "
        "Always explain briefly what you changed after tool actions."
    )
    if convo and isinstance(convo[0], dict) and convo[0].get("role") == "system":
        first = dict(convo[0])
        first_content = str(first.get("content", "")).strip()
        first["content"] = f"{first_content}\n\n{tool_intro}".strip()
        convo[0] = first
    else:
        convo.insert(0, {"role": "system", "content": tool_intro})

    responses_tools = build_responses_tool_defs()
    if not responses_tools:
        return call_openai_compatible(llm_cfg, messages)

    next_input = convert_messages_to_responses_input(convo)
    previous_response_id = None
    executed_payloads = []

    for _ in range(8):
        payload = {
            "model": model,
            "input": next_input,
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "max_output_tokens": tuning["max_output_tokens"],
            "tools": responses_tools,
            "tool_choice": "required" if not executed_payloads else "auto",
            "text": {
                "format": {"type": "text"},
                "verbosity": tuning["verbosity"],
            },
        }
        if tuning["reasoning_effort"]:
            payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
        if previous_response_id:
            payload["previous_response_id"] = previous_response_id
        try:
            data = http_post_json(
                f"{base_url}/responses", payload, headers=headers, timeout=150
            )
        except Exception:
            if executed_payloads:
                return render_tool_execution_summary(
                    executed_payloads,
                    max_chars=tools_settings.get("max_command_output_chars", 14000),
                )
            return call_openai_compatible(llm_cfg, messages)
        resp_id = str(data.get("id", "")).strip()
        if resp_id:
            previous_response_id = resp_id

        outputs = data.get("output") if isinstance(data, dict) else []
        tool_calls = []
        if isinstance(outputs, list):
            for item in outputs:
                if not isinstance(item, dict):
                    continue
                if str(item.get("type", "")).strip() == "function_call":
                    tool_calls.append(item)

        if not tool_calls:
            content = extract_response_output_text(data) if isinstance(data, dict) else ""
            if content:
                return content
            break

        next_input = []
        for tc in tool_calls:
            call_id = str(tc.get("call_id", "")).strip()
            fn_name = str(tc.get("name", "")).strip()
            fn_args = _parse_tool_args(tc.get("arguments"))
            try:
                result = execute_work_tool(
                    fn_name,
                    fn_args,
                    config,
                    llm_cfg,
                    http_post_json_fn=http_post_json,
                    is_local_url_fn=is_local_url,
                )
                tool_payload = {
                    "ok": True,
                    "tool": fn_name,
                    "args": fn_args,
                    "result": result,
                }
            except Exception as exc:
                tool_payload = {
                    "ok": False,
                    "tool": fn_name,
                    "args": fn_args,
                    "error": str(exc),
                }
            if not call_id:
                continue
            executed_payloads.append(tool_payload)
            next_input.append(
                {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(tool_payload, ensure_ascii=False),
                }
            )
        if not next_input:
            break

    if executed_payloads:
        return render_tool_execution_summary(
            executed_payloads,
            max_chars=tools_settings.get("max_command_output_chars", 14000),
        )

    return call_openai_compatible(llm_cfg, messages)


def split_text_for_stream(text, chunk_size=14):
    safe = str(text or "")
    if not safe:
        return
    step = max(1, int(chunk_size))
    for i in range(0, len(safe), step):
        yield safe[i : i + step]


def iter_openai_chat_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    headers = {"Content-Type": "application/json"}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
        "max_tokens": tuning["max_output_tokens"],
    }
    req = urllib.request.Request(
        url=f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    data = json.loads(data_str)
                except Exception:
                    continue
                choices = data.get("choices") or []
                for choice in choices:
                    delta = choice.get("delta") or {}
                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        yield content
                        continue
                    if isinstance(content, list):
                        for part in content:
                            if not isinstance(part, dict):
                                continue
                            text = part.get("text")
                            if isinstance(text, str) and text:
                                yield text
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc


def iter_openai_responses_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    headers = {"Content-Type": "application/json"}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    payload = {
        "model": model,
        "input": convert_messages_to_responses_input(messages),
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
        "max_output_tokens": tuning["max_output_tokens"],
        "text": {
            "format": {"type": "text"},
            "verbosity": tuning["verbosity"],
        },
    }
    if tuning["reasoning_effort"]:
        payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
    req = urllib.request.Request(
        url=f"{base_url}/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    evt = json.loads(data_str)
                except Exception:
                    continue

                evt_type = str(evt.get("type") or "")
                if evt_type == "response.output_text.delta":
                    delta = evt.get("delta")
                    if isinstance(delta, str) and delta:
                        yield delta
                    continue

                if evt_type == "response.completed":
                    return

                if evt_type in {"response.failed", "response.incomplete"}:
                    detail = evt.get("response") or evt
                    raise RuntimeError(f"Responses stream failed: {detail}")

                if evt_type in {"error", "response.error"}:
                    detail = evt.get("error") or evt.get("message") or str(evt)
                    raise RuntimeError(f"Responses stream error: {detail}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc


def call_openai_compatible(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)
    timeout = _clamp_int(llm_cfg.get("request_timeout", 60), 60, 4, 180)

    headers = {}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": False,
        "max_tokens": tuning["max_output_tokens"],
    }

    try:
        data = http_post_json(
            f"{base_url}/chat/completions", payload, headers=headers, timeout=timeout
        )
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message", {})
            content = normalize_text_content(message.get("content", ""))
            if content:
                return content
    except RuntimeError:
        # Some relays do not return standard chat-completions JSON.
        pass

    # Fallback: OpenAI Responses API compatibility path.
    # Not all providers support this endpoint (e.g. DashScope), so catch errors.
    try:
        responses_payload = {
            "model": model,
            "input": convert_messages_to_responses_input(messages),
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "max_output_tokens": tuning["max_output_tokens"],
            "text": {
                "format": {"type": "text"},
                "verbosity": tuning["verbosity"],
            },
        }
        if tuning["reasoning_effort"]:
            responses_payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
        responses_data = http_post_json(
            f"{base_url}/responses", responses_payload, headers=headers, timeout=timeout
        )
        content = extract_response_output_text(responses_data)
        if content:
            return content
    except Exception:
        # Provider does not support /responses endpoint — raise to signal failure.
        raise RuntimeError(
            f"LLM provider at {base_url} returned no usable response from either "
            "/chat/completions or /responses."
        )

    raise RuntimeError(f"LLM provider at {base_url} returned an empty response.")


def call_ollama(llm_cfg, messages, model_override=None):
    base_url = str(llm_cfg.get("base_url", OLLAMA_DEFAULT_BASE_URL)).rstrip("/")
    model = model_override or llm_cfg.get("model", OLLAMA_DEFAULT_MODEL)
    temperature = float(llm_cfg.get("temperature", 0.7))
    max_tokens = int(llm_cfg.get("max_tokens", 96))
    num_ctx = int(llm_cfg.get("num_ctx", 2048))
    timeout = _clamp_int(llm_cfg.get("request_timeout", 150), 150, 4, 240)
    max_tokens = max(32, min(256, max_tokens))
    num_ctx = max(1024, min(4096, num_ctx))

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": num_ctx,
        },
    }
    data = http_post_json(f"{base_url}/api/chat", payload, timeout=timeout)

    if isinstance(data.get("error"), str) and data["error"].strip():
        raise RuntimeError(f"Ollama error: {data['error']}")

    message = data.get("message") or {}
    content = normalize_text_content(message.get("content", ""))
    if not content:
        content = normalize_text_content(data.get("response", ""))
    return content or "I am here with you."


def resolve_vosk_model_root():
    env_path = str(os.getenv("VOSK_MODEL_PATH", "")).strip()
    if env_path:
        p = Path(env_path).expanduser()
        if p.exists():
            return p
    if VOSK_MODEL_LARGE_ROOT.exists():
        return VOSK_MODEL_LARGE_ROOT
    return VOSK_MODEL_ROOT


def extract_vosk_text(result_json):
    try:
        payload = json.loads(result_json or "{}")
    except Exception:
        payload = {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return ""
    normalized = re.sub(r"\s+", " ", text).strip()
    # Chinese output from Vosk is often cleaner without spaces.
    if re.search(r"[\u4e00-\u9fff]", normalized):
        normalized = normalized.replace(" ", "")
    return normalized


def get_vosk_model():
    global _VOSK_MODEL
    if vosk is None:
        raise RuntimeError("Vosk is not installed. Run: pip install vosk")
    if _VOSK_MODEL is not None:
        return _VOSK_MODEL
    model_root = resolve_vosk_model_root()
    if not model_root.exists():
        raise RuntimeError(
            "Vosk model not found. Expected path: "
            f"{model_root}. Please download vosk-model-cn-0.22 or vosk-model-small-cn-0.22."
        )
    with VOSK_LOCK:
        if _VOSK_MODEL is None:
            _VOSK_MODEL = vosk.Model(str(model_root))
    return _VOSK_MODEL


def transcribe_pcm16_with_vosk(pcm16_bytes, sample_rate=16000):
    data = pcm16_bytes if isinstance(pcm16_bytes, (bytes, bytearray)) else b""
    if len(data) < 3200:
        return ""
    sr = _clamp_int(sample_rate, 16000, 8000, 48000)
    model = get_vosk_model()
    rec = vosk.KaldiRecognizer(model, float(sr))
    rec.SetWords(False)
    parts = []
    chunk_size = 4000
    for idx in range(0, len(data), chunk_size):
        piece = bytes(data[idx : idx + chunk_size])
        if rec.AcceptWaveform(piece):
            seg = extract_vosk_text(rec.Result())
            if seg:
                parts.append(seg)
    final_seg = extract_vosk_text(rec.FinalResult())
    if final_seg:
        parts.append(final_seg)
    if not parts:
        return ""
    return "".join(parts)


def guess_audio_content_type(audio_bytes):
    if not isinstance(audio_bytes, (bytes, bytearray)) or len(audio_bytes) < 12:
        return "application/octet-stream"
    data = bytes(audio_bytes)
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio/wav"
    if data[:4] == b"OggS":
        return "audio/ogg"
    if data[:4] == b"fLaC":
        return "audio/flac"
    if data[:3] == b"ID3" or data[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
        return "audio/mpeg"
    return "application/octet-stream"


class PetHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, fmt, *args):  # noqa: N802
        # Suppress Unicode encode errors on Windows GBK console.
        try:
            super().log_message(fmt, *args)
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        except Exception:
            pass

    def end_headers(self):
        # Avoid stale JS/CSS/runtime files from browser cache during rapid iteration.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, data, status=HTTPStatus.OK):
        encoded = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_audio(self, audio_bytes, content_type="audio/mpeg", status=HTTPStatus.OK):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(audio_bytes)))
        self.end_headers()
        self.wfile.write(audio_bytes)

    def _send_sse(self, data):
        payload = f"data: {json.dumps(data, ensure_ascii=False)}\n\n".encode("utf-8")
        self.wfile.write(payload)
        self.wfile.flush()

    def do_GET(self):
        path_only = self.path.split("?", 1)[0]
        if path_only == "/config.json":
            config = load_config()
            self._send_json(sanitize_client_config(config))
            return
        if path_only == "/api/persona_card":
            self._send_json(load_manual_persona_card())
            return
        return super().do_GET()

    def do_POST(self):
        path_only = self.path.split("?", 1)[0]
        if path_only not in {
            "/api/chat",
            "/api/chat_stream",
            "/api/tts",
            "/api/asr_pcm",
            "/api/persona_card",
        }:
            self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self._send_json(
                {"error": "Invalid JSON body."}, status=HTTPStatus.BAD_REQUEST
            )
            return

        chat_config = None
        if path_only in {"/api/chat", "/api/chat_stream"}:
            chat_config = load_config()

        if path_only == "/api/persona_card":
            try:
                saved = save_manual_persona_card(body if isinstance(body, dict) else {})
                self._send_json(saved)
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path_only == "/api/tts":
            text = str(body.get("text", "")).strip()
            voice = body.get("voice")
            prosody = {}
            for key in (
                "speed_ratio",
                "pitch_ratio",
                "volume_ratio",
                "rate",
                "pitch",
                "volume",
            ):
                if key in body:
                    prosody[key] = body.get(key)
            if not text:
                self._send_json(
                    {"error": "text cannot be empty."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                audio = synthesize_tts_audio(
                    text,
                    voice_override=voice,
                    prosody=prosody,
                )
                if not audio:
                    self._send_json(
                        {"error": "TTS 返回空音频，请检查语音服务是否正常运行。"},
                        status=HTTPStatus.SERVICE_UNAVAILABLE,
                    )
                    return
                self._send_audio(audio, content_type=guess_audio_content_type(audio))
            except Exception as exc:
                self._send_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        if path_only == "/api/asr_pcm":
            audio_base64 = str(body.get("audio_base64", "")).strip()
            sample_rate = body.get("sample_rate", 16000)
            if not audio_base64:
                self._send_json(
                    {"error": "audio_base64 cannot be empty."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                pcm_data = base64.b64decode(audio_base64, validate=True)
            except Exception:
                self._send_json(
                    {"error": "audio_base64 decode failed."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                raw_text = transcribe_pcm16_with_vosk(
                    pcm_data,
                    sample_rate=sample_rate,
                )
                cfg = load_config()
                asr_cfg = cfg.get("asr", {}) if isinstance(cfg, dict) else {}
                replacements = sanitize_hotword_replacements(
                    asr_cfg.get("hotword_replacements", {})
                )
                text = apply_hotword_replacements(raw_text, replacements)
                self._send_json({"text": text, "raw_text": raw_text})
            except Exception as exc:
                self._send_json(
                    {"error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        user_message = str(body.get("message", "")).strip()
        history = body.get("history", [])
        image_data_url = body.get("image_data_url", "")
        is_auto = bool(body.get("auto", False))
        force_tools = bool(body.get("force_tools", False))

        if not user_message:
            self._send_json(
                {"error": "message cannot be empty."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        if not isinstance(history, list):
            history = []
        if image_data_url is None:
            image_data_url = ""
        if not isinstance(image_data_url, str):
            self._send_json(
                {"error": "image_data_url must be a string."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        if path_only == "/api/chat_stream":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            full_parts = []
            already_finalized = False
            try:
                for chunk in call_llm_stream(
                    user_message,
                    history,
                    image_data_url=image_data_url,
                    is_auto=is_auto,
                    force_tools=force_tools,
                    config=chat_config,
                ):
                    if not isinstance(chunk, str) or not chunk:
                        continue
                    if chunk == "\x00PRE_FINALIZED\x00":
                        already_finalized = True
                        continue
                    full_parts.append(chunk)
                    self._send_sse({"type": "delta", "text": chunk})
                final_reply = "".join(full_parts).strip()
                if final_reply and not already_finalized:
                    final_reply = finalize_assistant_reply(
                        chat_config,
                        chat_config.get("llm", {}),
                        str(chat_config.get("llm", {}).get("provider", "") or "").strip().lower()
                        or ("ollama" if "11434" in str(chat_config.get("llm", {}).get("base_url", "")).strip().lower() else "openai"),
                        user_message,
                        sanitize_history(history, max_items=max(12, int(get_history_summary_settings(chat_config).get("keep_recent_messages", 8)))),
                        final_reply,
                        is_auto=is_auto,
                    )
                if final_reply:
                    try:
                        remember_interaction(
                            chat_config,
                            user_message,
                            final_reply,
                            is_auto=is_auto,
                        )
                    except Exception:
                        pass
                self._send_sse({"type": "done", "reply": final_reply})
            except Exception as exc:
                self._send_sse({"type": "error", "error": str(exc)})
            return

        try:
            reply = call_llm(
                user_message,
                history,
                image_data_url=image_data_url,
                is_auto=is_auto,
                force_tools=force_tools,
                config=chat_config,
            )
            try:
                remember_interaction(
                    chat_config, user_message, reply, is_auto=is_auto
                )
            except Exception:
                pass
            self._send_json({"reply": reply})
        except Exception as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)


def ensure_config_hint():
    if CONFIG_PATH.exists():
        return
    if not EXAMPLE_CONFIG_PATH.exists():
        return
    print(
        "Tip: copy config.example.json to config.json and set model_path if needed."
    )


def build_server():
    config = load_config()
    server_cfg = config.get("server", {})
    host = server_cfg.get("host", DEFAULT_CONFIG["server"]["host"])
    port = int(server_cfg.get("port", DEFAULT_CONFIG["server"]["port"]))
    open_browser = bool(server_cfg.get("open_browser", False))

    ensure_config_hint()
    httpd = ThreadingHTTPServer((host, port), PetHandler)
    url = f"http://{host}:{port}"
    return httpd, url, open_browser


def run(open_browser_override=None):
    httpd, url, open_browser = build_server()
    if open_browser_override is not None:
        open_browser = bool(open_browser_override)
    print(f"Desktop pet server running at {url}")
    if open_browser:
        webbrowser.open(url)
    httpd.serve_forever()


if __name__ == "__main__":
    run()
