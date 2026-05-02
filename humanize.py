import re
import random

from config import DEFAULT_CONFIG
from utils import _clamp_int, _truncate_text
from llm_client import call_openai_compatible, call_ollama, http_post_json, is_local_url, get_openai_tuning
from memory import merge_prompt_with_memory

TOOL_META_MARKER = "[[TAFFY_TOOL_META]]"

DEFAULT_HUMANIZE_SETTINGS = {
    "enabled": True,
    "strip_fillers": True,
    "refine_enabled": True,
    "refine_max_chars": 120,
    "refine_timeout_sec": 12,
    "refine_min_chars": 36,
}

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

def load_emotion_state():
    try:
        from emotion import load_emotion_state as _fn
    except Exception:
        from app import load_emotion_state as _fn
    return _fn()


def build_inner_state_block(config):
    try:
        from emotion import build_inner_state_block as _fn
    except Exception:
        from app import build_inner_state_block as _fn
    return _fn(config)


def build_time_awareness_block():
    from app import build_time_awareness_block as _fn
    return _fn()


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

def resolve_reply_language(config):
    raw = str(
        (config or {}).get("assistant_reply_language", "")
        or (config or {}).get("reply_language", "")
        or ""
    ).strip().lower()
    if raw in {"en", "english"}:
        return "en"
    if raw in {"zh", "zh-cn", "zh_cn", "chinese"}:
        return "zh"
    return "auto"

def _text_language_counts(text):
    safe = str(text or "")
    latin = len(re.findall(r"[A-Za-z]", safe))
    cjk = len(re.findall(r"[\u4e00-\u9fff]", safe))
    return latin, cjk

def is_mostly_chinese_text(text):
    latin, cjk = _text_language_counts(text)
    return cjk >= 4 and cjk > latin * 0.55

def is_explicit_chinese_reply_request(user_message):
    safe = str(user_message or "").lower()
    return bool(
        re.search(r"(用中文|中文回答|回复中文|说中文|請用中文|请用中文|answer in chinese|reply in chinese|use chinese)", safe)
    )

def build_english_reply_fallback(reply):
    visible, meta = split_tool_meta_suffix(reply)
    text = str(visible or "").strip()
    if not text:
        return reply
    return "I got you. I'll keep my main replies in English, and you can read the Chinese translation below." + meta

def enforce_reply_language(config, user_message, reply):
    if resolve_reply_language(config if isinstance(config, dict) else {}) != "en":
        return reply
    if is_explicit_chinese_reply_request(user_message):
        return reply
    visible, meta = split_tool_meta_suffix(reply)
    text = str(visible or "").strip()
    if not text:
        return reply
    if is_mostly_chinese_text(text):
        return build_english_reply_fallback(text + meta)
    return reply

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
    emotion = load_emotion_state()
    dominant = emotion.get("dominant", "neutral") if isinstance(emotion, dict) else "neutral"
    if dominant == "happy":
        score["playful"] += 3
    elif dominant == "sad":
        score["comfort"] += 3
    elif dominant == "anxious":
        score["steady"] += 2

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
    if visible_chars <= 4:
        return "brief"
    if visible_chars >= 42:
        return "normal"
    question_marks = len(re.findall(r"[?？]", text))
    if question_marks >= 2:
        return "normal"
    # Add Neuro-style unpredictability: occasionally override density
    r = random.random()
    if not is_auto:
        if r < 0.15:
            return "brief"     # 15% chance of ultra-short reply
        elif r > 0.88:
            return "expanded"  # 12% chance of long reply
    return "brief"

def build_style_prompt_block(style_name):
    style = normalize_style_name(style_name)
    base = (
        "回复风格要求：有自己的想法和态度，不是什么都附和。"
        "长度跟着话题走，无聊的一句带过，有意思的可以多说。"
        "说话自然有个性，可以吐槽、反问、跑题、接梗。"
    )
    style_map = {
        "comfort": "语气温和，先接住对方的感受。",
        "clear": "语气直接，先给结论。",
        "playful": "语气轻快活泼。",
        "steady": "语气沉稳简练。",
        "neutral": "语气自然随意。",
    }
    return f"{base}\n当前语境风格：{style}\n{style_map.get(style, style_map['neutral'])}"

def build_human_prompt_block(user_message, safe_history, is_auto=False):
    density = infer_reply_density(user_message, safe_history, is_auto=is_auto)
    user_text = str(user_message or "").strip()
    lines = [
        "像真人聊天一样回复，语气自然，有自己的态度和想法。",
        "不要用客服腔、总结腔、教科书腔。",
        "可以吐槽、反问、抬杠、跑题，像真人一样有个性。",
        "不要引用不存在的前文，不确定就先问一句。",
        "不要每次都以问句结尾。大部分时候直接把话说完就行，像真人一样有时候就是陈述。只有真的好奇才追问。",
    ]
    density_map = {
        "brief": "这轮极简回复，1句话甚至几个字就够了，像随口嘟囔。",
        "normal": "这轮正常聊，2-3句，自然展开。",
        "expanded": "这轮话多一点，可以展开讲、跑题、自言自语，4-6句都行。",
    }
    lines.append(density_map.get(density, density_map["normal"]))
    if re.fullmatch(r"(在吗|在嘛|在不在|在么|喂|嗨|hi|hello)[!！?？]*", user_text, re.I):
        lines.append("如果用户只是在确认你在不在，就简单接一句，不要脑补对方情绪或处境。")
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
        recent_assistant.append(f'"{compact}"')
        if len(recent_assistant) >= 2:
            break
    if recent_assistant:
        lines.append(
            "避免复读你刚说过的措辞，尤其别重复：" + "、".join(reversed(recent_assistant))
        )
    if is_auto:
        lines.append("如果是你主动开口，要像突然想到就说一句，别像提醒播报，也别像任务通知。")
    return "\n".join(lines)

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
    if resolve_reply_language(config if isinstance(config, dict) else {}) == "en":
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
        "不要出现好的、当然可以、让我来、总之、希望这能帮到你、作为AI等套话；"
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

    # 非技术闲聊里，如果仍然出现"把人当设备"的表达，再做一次兜底替换。
    if re.search(r"(设备|终端|客户端|主机)", out, re.I):
        out = re.sub(r"(设备|终端|客户端|主机)", "你", out, flags=re.I)

    out = re.sub(r"\s{2,}", " ", out).strip()
    return (out or text) + meta

def _collect_recent_assistant_replies(safe_history, limit=3):
    try:
        keep = max(1, int(limit))
    except (TypeError, ValueError):
        keep = 3
    replies = []
    for turn in (safe_history or []):
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role", "")).strip().lower()
        content = str(turn.get("content", "")).strip()
        if role == "assistant" and content:
            replies.append(content)
    return replies[-keep:]

def _normalize_reply_for_similarity(text):
    out = str(text or "").strip().lower()
    if not out:
        return ""
    out = re.sub(r"\s+", "", out)
    out = re.sub(r"[，。！？、,.!?~…:：;；\"'“”‘’\(\)\[\]{}<>《》【】_/\-\\]+", "", out)
    return out

def _reply_similarity(a, b):
    from difflib import SequenceMatcher

    na = _normalize_reply_for_similarity(a)
    nb = _normalize_reply_for_similarity(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    ratio = SequenceMatcher(None, na, nb).ratio()
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if len(shorter) >= 8 and shorter in longer:
        cover = len(shorter) / max(1, len(longer))
        ratio = max(ratio, min(0.99, 0.72 + cover * 0.28))
    return float(ratio)

def _is_reply_too_similar_to_recent(reply_text, safe_history, threshold=0.84):
    candidate = str(reply_text or "").strip()
    if not candidate:
        return False
    normalized_candidate = _normalize_reply_for_similarity(candidate)
    if not normalized_candidate:
        return False
    recent = _collect_recent_assistant_replies(safe_history, limit=3)
    if not recent:
        return False
    effective_threshold = float(threshold)
    clen = len(normalized_candidate)
    if clen >= 32:
        effective_threshold = min(effective_threshold, 0.82)
    elif clen <= 8:
        effective_threshold = max(effective_threshold, 0.92)
    for prev in recent:
        prev_text = str(prev or "").strip()
        if not prev_text:
            continue
        sim = _reply_similarity(candidate, prev_text)
        if sim >= effective_threshold:
            return True
        normalized_prev = _normalize_reply_for_similarity(prev_text)
        if (
            normalized_prev
            and len(normalized_candidate) >= 10
            and len(normalized_prev) >= 10
            and normalized_candidate[:8] == normalized_prev[:8]
            and sim >= (effective_threshold - 0.08)
        ):
            return True
    return False

def maybe_diversify_repetitive_reply(config, llm_cfg, provider, user_message, safe_history, reply, is_auto=False):
    if is_auto:
        return reply
    if resolve_reply_language(config if isinstance(config, dict) else {}) == "en":
        return reply

    visible, meta = split_tool_meta_suffix(reply)
    current = str(visible or "").strip()
    if len(current) < 5:
        return reply
    if not _is_reply_too_similar_to_recent(current, safe_history, threshold=0.84):
        return reply

    recent = _collect_recent_assistant_replies(safe_history, limit=2)
    recent_hint = " / ".join(
        re.sub(r"\s+", " ", str(item or "").strip())[:48]
        for item in recent
        if str(item or "").strip()
    )
    rewrite_prompt = (
        "重写下面这句回复。\n"
        "要求：保留核心意思，但要明显换一种说法和节奏；"
        "不要套模板；结尾默认用陈述句，不要问句。\n"
        f"用户这轮：{str(user_message or '').strip()[:120]}\n"
        f"你最近两句：{recent_hint or '（无）'}\n"
        f"当前回复：{current}\n"
        "只输出重写后的最终回复。"
    )
    messages = [{"role": "user", "content": rewrite_prompt}]
    diversify_cfg = dict(llm_cfg or {})
    diversify_cfg["temperature"] = max(1.08, float(diversify_cfg.get("temperature", 0.7)))
    diversify_cfg["frequency_penalty"] = 0.35
    diversify_cfg["presence_penalty"] = 0.45
    diversify_cfg["max_output_tokens"] = min(
        160,
        max(64, int(diversify_cfg.get("max_output_tokens", diversify_cfg.get("max_tokens", 96)))),
    )
    diversify_cfg["verbosity"] = "low"
    diversify_cfg["reasoning_effort"] = "minimal"
    diversify_cfg["request_timeout"] = 12

    try:
        if provider in {"openai", "openai-compatible", "openai_compatible"}:
            rewritten = call_openai_compatible(diversify_cfg, messages)
        elif provider == "ollama":
            rewritten = call_ollama(diversify_cfg, messages)
        else:
            return reply
    except Exception:
        return reply

    settings = get_humanize_settings(config)
    candidate = cleanup_assistant_reply_local(
        rewritten,
        strip_fillers=settings["strip_fillers"],
    )
    candidate_visible, _ = split_tool_meta_suffix(candidate)
    candidate_visible = str(candidate_visible or "").strip()
    if len(candidate_visible) < 4:
        return reply
    if _is_reply_too_similar_to_recent(candidate_visible, safe_history, threshold=0.87):
        return reply
    return candidate_visible + meta

def apply_question_ending_limiter(reply, safe_history):
    visible, meta = split_tool_meta_suffix(reply)
    text = str(visible or "").strip()
    if not text or not text.rstrip().endswith(("?", "？")):
        return reply

    recent = _collect_recent_assistant_replies(safe_history, limit=3)
    if len(recent) < 2:
        return reply
    question_tail_count = sum(
        1 for item in recent if str(item or "").strip().endswith(("?", "？"))
    )
    if question_tail_count < 2:
        return reply

    core = re.sub(r"[?？]+\s*$", "", text).strip()
    core = re.sub(r"(吗|嘛|么|呢|吧|呀|啊)\s*$", "", core).strip()
    if not core:
        return reply
    if core.endswith(("。", "！", "!")):
        adjusted = core
    else:
        adjusted = core + "。"
    return adjusted + meta

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
        final_reply = enforce_reply_language(config, user_message, final_reply)
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
        final_reply = enforce_reply_language(config, user_message, final_reply)
        final_reply = apply_contextual_human_override(
            user_message,
            final_reply,
            is_auto=is_auto,
        )
        final_reply = apply_human_address_guard(user_message, final_reply)
    final_reply = maybe_diversify_repetitive_reply(
        config,
        llm_cfg,
        provider,
        user_message,
        safe_history,
        final_reply,
        is_auto=is_auto,
    )
    final_reply = apply_question_ending_limiter(final_reply, safe_history)
    if settings["enabled"]:
        final_reply = cleanup_assistant_reply_local(
            final_reply,
            strip_fillers=settings["strip_fillers"],
        )
    final_reply = enforce_reply_language(config, user_message, final_reply)
    return final_reply.strip()

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
