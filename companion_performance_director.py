"""Deterministic, text-only performance planning for model-direct companion turns.

The director runs *after* the final reply exists. It never changes or stores
that reply, does not call an LLM, and returns only a small allowlisted
performance plan for the optional companion-turn contract. Ambiguous replies
deliberately return ``None`` rather than inventing a reaction.
"""

from __future__ import annotations

import re


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
    return None
