"""Deterministic, text-only performance planning for model-direct companion turns.

The director runs *after* the final reply exists. It never changes or stores
that reply, does not call an LLM, and returns only a small allowlisted
performance plan for the optional companion-turn contract. Ambiguous replies
deliberately return ``None`` rather than inventing a reaction.
"""

from __future__ import annotations

import re


SEGMENT_EMOTIONS = {
    "neutral",
    "happy",
    "playful",
    "excited",
    "shy",
    "hurt",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "serious",
    "thinking",
}


def _clean_text(value):
    return " ".join(str(value or "").split()).strip()


def _has_strong_punctuation(text):
    """Treat an emphatic punctuation mark as a high-energy delivery signal."""
    return bool(re.search(r"(?:[!?]|\uFF01|\uFF1F)", text))


def _plan(emotion, action, intensity, voice_style):
    return {
        "emotion": emotion,
        "action": action,
        "intensity": intensity,
        "voice_style": voice_style,
        "source": "model_director",
    }


def _normalize_baseline(value):
    raw = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "joy": "happy",
        "cheerful": "happy",
        "teasing": "playful",
        "worry": "anxious",
        "worried": "anxious",
        "nervous": "anxious",
        "annoyed": "angry",
        "curious": "thinking",
        "thoughtful": "thinking",
        "comfort": "hurt",
        "soft": "sad",
        "steady": "serious",
    }
    normalized = aliases.get(raw, raw)
    return normalized if normalized in SEGMENT_EMOTIONS else "neutral"


def infer_segment_performance(segment_text, baseline=None):
    """Infer one conservative, speech-ready semantic performance segment.

    The visible sentence remains authoritative. A turn-level baseline is used
    only when the sentence itself does not carry a clearer signal.
    """
    text = _clean_text(segment_text)
    if not text:
        return _plan("neutral", "none", "low", "neutral")
    lower = text.casefold()
    strong = _has_strong_punctuation(text)

    if re.search(
        r"(?:\babsolutely not\b|\bno way i(?:'m| am) doing\b|\bi won'?t\b|"
        r"\bthat'?s not okay\b|\bdon'?t do that\b|\bstop that\b|"
        r"不行|不可以|别这样|住手|太过分|气死|生气|恼火)",
        lower,
    ):
        return _plan("angry", "shake_head", "high" if strong else "medium", "serious")
    if re.search(
        r"(?:\bwait[,— -]*(?:what|really)\b|\bno way\b|\bseriously\?\b|"
        r"\bwhat(?:\?!|!|\?)|真的假的|不会吧|怎么会|居然[？?!！]|欸[？?!！]|诶[？?!！])",
        lower,
    ):
        return _plan("surprised", "surprised", "high" if strong else "medium", "curious")
    if re.search(
        r"(?:\bi can'?t believe we did it\b|\bwe did it\b|\bthis is amazing\b|"
        r"\bso excited\b|\byes[!！]+\b|太棒了|太好啦|好耶|成功了|做到了|激动死了)",
        lower,
    ):
        return _plan("excited", "happy_idle", "high", "cheerful")
    if re.search(
        r"(?:\bdon'?t look at me like that\b|\byou'?re making me blush\b|"
        r"\bthat'?s embarrassing\b|害羞|脸红|别这么看|不好意思啦|人家才没有)",
        lower,
    ):
        return _plan("shy", "none", "medium", "soft")
    if re.search(
        r"(?:\bthat hurt\b|\bthat'?s a little unfair\b|\bi feel left out\b|"
        r"\byou forgot me\b|委屈|欺负人|把我忘了|有点受伤|不公平)",
        lower,
    ):
        return _plan("hurt", "none", "low", "soft")
    if re.search(
        r"(?:\b(?:haha|hehe|lol|lmao)\b|\bi'?m teasing\b|\bjust kidding\b|"
        r"\byou got me\b|哈哈|嘿嘿|逗你|开玩笑|才怪|骗你的|哼哼)",
        lower,
    ):
        return _plan("playful", "happy_idle" if strong else "none", "high" if strong else "medium", "teasing")
    if re.search(
        r"(?:\blet me think\b|\bgive me (?:a )?second\b|\bone moment\b|"
        r"\bi need (?:a moment|a minute|to think)\b|\bmaybe\b|\bperhaps\b|"
        r"想一下|让我想想|我想想|我看看|也许|可能是|分析一下)",
        lower,
    ):
        return _plan("thinking", "think" if strong else "none", "medium", "curious")
    if re.search(
        r"(?:\bi'?m sorry\b|\bthat sounds hard\b|\bthat hurts\b|\bthat'?s sad\b|"
        r"\bi'?m here with you\b|抱歉|对不起|难过|遗憾|听起来很难|心疼)",
        lower,
    ):
        return _plan("sad", "none", "low", "soft")
    if re.search(
        r"(?:\bi'?m worried\b|\bthis could go wrong\b|\bnot looking good\b|"
        r"\bcareful\b|担心|焦虑|不太妙|小心|紧张|怕是)",
        lower,
    ):
        return _plan("anxious", "none", "low", "soft")
    if re.search(
        r"(?:\bimportant\b|\bto be clear\b|\bseriously(?: speaking)?[,!:]\s*|\bthe key is\b|"
        r"\bwe need to\b|\bmust\b|认真说|说正经的|重点是|必须|务必|先别闹)",
        lower,
    ):
        return _plan("serious", "none", "medium", "serious")
    if re.search(
        r"(?:\b(?:great|awesome|wonderful|nice|lovely|glad)\b|"
        r"\bthank you\b|开心|喜欢|太好了|真棒|可爱|谢谢|不错嘛)",
        lower,
    ):
        return _plan("happy", "none", "high" if strong else "medium", "cheerful")

    baseline_emotion = _normalize_baseline(
        baseline.get("emotion") if isinstance(baseline, dict) else baseline
    )
    baseline_voice = (
        str(baseline.get("voice_style") or "").strip().lower()
        if isinstance(baseline, dict)
        else ""
    )
    if baseline_emotion != "neutral":
        default_voice = {
            "happy": "cheerful",
            "playful": "teasing",
            "excited": "cheerful",
            "shy": "soft",
            "hurt": "soft",
            "sad": "soft",
            "anxious": "soft",
            "angry": "serious",
            "surprised": "curious",
            "serious": "serious",
            "thinking": "curious",
        }.get(baseline_emotion, "neutral")
        return _plan(
            baseline_emotion,
            "none",
            "low" if baseline_emotion in {"hurt", "sad", "anxious"} else "medium",
            baseline_voice or default_voice,
        )
    return _plan("neutral", "none", "low", baseline_voice or "neutral")


def split_performance_segments(reply_text, baseline=None, max_segments=12):
    """Return stable sentence offsets plus bounded allowlisted performance."""
    source = str(reply_text or "")
    if not source.strip():
        return []
    boundary = re.compile(r".+?(?:[.!?。！？]+[”’\"']*|…+[”’\"']*|$)", re.S)
    segments = []
    for match in boundary.finditer(source):
        raw = match.group(0)
        text = raw.strip()
        if not text:
            continue
        leading = len(raw) - len(raw.lstrip())
        trailing = len(raw.rstrip())
        start = match.start() + leading
        end = match.start() + trailing
        plan = infer_segment_performance(text, baseline=baseline)
        segments.append(
            {
                "index": len(segments),
                "start": start,
                "end": end,
                "text": text,
                "performance": plan,
            }
        )
        if len(segments) >= max(1, min(24, int(max_segments or 12))):
            break
    return segments


def infer_model_direct_performance(reply_text):
    """Return an allowlisted plan only for a clear, visible reply signal.

    Matching intentionally favors clear boundaries and deliberation over a
    broad sentiment guess. This keeps ordinary prose from acquiring a gesture
    merely because it happens to contain a word such as ``seriously``.
    """
    text = _clean_text(reply_text)
    if not text:
        return None
    lower = text.casefold()
    strong = _has_strong_punctuation(text)

    if re.search(
        r"(?:\bi can(?:not|'t) do that\b|\bi won't do that\b|\bthat's not okay\b|"
        r"\babsolutely not\b|\bdon't do that\b|\u4e0d\u884c|\u4e0d\u80fd\u8fd9\u6837|"
        r"\u522b\u8fd9\u6837|\u4e0d\u53ef\u4ee5\u8fd9\u6837)",
        lower,
    ):
        return _plan("neutral", "shake_head", "medium", "serious")

    if re.search(
        r"(?:\blet me think\b|\bgive me (?:a )?second\b|\bone moment\b|"
        r"\bi need (?:a moment|a minute|to think)\b|\bi'?ll think\b|\bi am thinking\b|"
        r"\bi'm thinking\b|\u60f3\u4e00\u4e0b|\u8ba9\u6211\u60f3\u60f3|"
        r"\u6211\u60f3\u60f3|\u7b49\u6211\u60f3\u4e00\u4e0b|\u5bb9\u6211\u60f3\u60f3)",
        lower,
    ):
        return _plan("thinking", "think", "medium", "curious")

    if re.search(
        r"(?:\bno way\b|\bwait,? what\b|\breally\?|\bwhat(?:\?!|!|\?)|"
        r"\u771f\u7684\u5047\u7684|\u4e0d\u4f1a\u5427|\u600e\u4e48\u4f1a)",
        lower,
    ):
        return _plan("surprised", "surprised", "high" if strong else "medium", "curious")

    if re.search(
        r"(?:\b(?:haha|hehe|lol|lmao)\b|\byou got me\b|\u54c8\u54c8|\u563f\u563f|"
        r"\u9017\u4f60|\u5f00\u73a9\u7b11)",
        lower,
    ):
        return _plan("playful", "happy_idle" if strong else "none", "high" if strong else "medium", "teasing")

    if re.search(
        r"(?:\b(?:great|awesome|wonderful|nice|congratulations|we did it)\b|\byes!|"
        r"\u592a\u597d\u4e86|\u597d\u8036|\u592a\u68d2\u4e86|\u505a\u5230\u4e86)",
        lower,
    ):
        return _plan("happy", "wave" if strong else "none", "high" if strong else "medium", "cheerful")

    if re.search(
        r"(?:\bi'?m sorry\b|\bthat sounds hard\b|\bthat hurts\b|\u62b1\u6b49|"
        r"\u96be\u53d7|\u9057\u61be|\u542c\u8d77\u6765\u5f88\u96be)",
        lower,
    ):
        return _plan("sad", "none", "low", "soft")
    inferred = infer_segment_performance(text)
    if inferred["emotion"] != "neutral":
        inferred["source"] = "model_director"
        return inferred
    return None
