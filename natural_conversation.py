"""Private control contract for natural, non-obligatory voice conversation.

The language model may choose a reply, a visible micro-reaction, a deferred
thought, or silence. Control tags are removed before chat text, memory, and TTS
see the result. Missing or malformed tags always degrade to a normal reply.
"""

from __future__ import annotations

import re


CONTROL_PREFIX_RE = re.compile(
    r"^\s*\[\[TAFFY_(?P<mode>REPLY|SILENCE|REACT|DEFER)"
    r"(?::(?P<detail>[A-Za-z0-9_-]+))?\]\]\s*",
    re.IGNORECASE,
)

VALID_REPLY_DEPTHS = {"quick", "normal", "deep"}
VALID_REACTIONS = {"thinking", "soft_ack", "curious", "concerned"}


def get_natural_conversation_settings(config) -> dict:
    safe = config if isinstance(config, dict) else {}
    raw = safe.get("natural_conversation")
    raw = raw if isinstance(raw, dict) else {}

    def _bounded_int(key, default, minimum, maximum):
        try:
            value = int(raw.get(key, default))
        except (TypeError, ValueError):
            value = default
        return max(minimum, min(maximum, value))

    return {
        "enabled": raw.get("enabled") is True,
        "voice_only": raw.get("voice_only", True) is not False,
        "allow_silence": raw.get("allow_silence", True) is not False,
        "allow_micro_reaction": raw.get("allow_micro_reaction", True) is not False,
        "allow_defer": raw.get("allow_defer", True) is not False,
        "remember_ambient_context": raw.get("remember_ambient_context", True) is not False,
        "ambient_context_ttl_ms": _bounded_int(
            "ambient_context_ttl_ms", 180000, 30000, 900000
        ),
        "quick_delay_ms": _bounded_int("quick_delay_ms", 650, 200, 1600),
        "normal_delay_ms": _bounded_int("normal_delay_ms", 1250, 500, 3000),
        "deep_delay_ms": _bounded_int("deep_delay_ms", 2300, 900, 5000),
    }


def is_natural_conversation_enabled(config) -> bool:
    settings = get_natural_conversation_settings(config)
    if not settings["enabled"]:
        return False
    if bool((config or {}).get("_natural_participation")):
        return True
    if not settings["voice_only"]:
        return True
    return str((config or {}).get("_input_modality") or "").strip().lower() == "voice"


def build_natural_conversation_prompt_block(config) -> str:
    if not is_natural_conversation_enabled(config):
        return ""
    settings = get_natural_conversation_settings(config)
    allowed = ["[[TAFFY_REPLY:quick|normal|deep]] followed by the spoken reply"]
    if settings["allow_micro_reaction"]:
        allowed.append(
            "[[TAFFY_REACT:thinking|soft_ack|curious|concerned]] with no spoken reply"
        )
    if settings["allow_defer"]:
        allowed.append("[[TAFFY_DEFER]] when the thought may matter later but not now")
    if settings["allow_silence"]:
        allowed.append("[[TAFFY_SILENCE]] when a human companion would simply keep listening")
    return (
        "[Natural voice participation contract]\n"
        "This is continuous companionship, not mandatory question-answering. "
        "First decide whether you genuinely have something worth saying now.\n"
        "Begin the output with exactly one private control tag. Allowed forms: "
        + "; ".join(allowed)
        + ".\n"
        "A direct question, explicit request, correction, safety concern, or clear address to you normally requires a reply. "
        "Humming, filler sounds, unfinished self-talk, ambient fragments, and remarks not directed at you may receive silence, a micro-reaction, or defer. "
        "Emotional disclosure may receive a small reaction or a reply depending on whether words would actually help. "
        "If uncertain whether the user expects an answer, choose a brief reply. "
        "Choose quick for an immediate simple response, normal for ordinary thought, and deep only when real reflection is useful. "
        "Never quote, explain, or imitate these control tags in the spoken reply."
    )


def _delay_for_depth(settings, depth):
    return int(
        settings[
            {
                "quick": "quick_delay_ms",
                "deep": "deep_delay_ms",
            }.get(depth, "normal_delay_ms")
        ]
    )


def parse_natural_conversation_output(text, config) -> dict:
    """Strip one private control prefix and return a public-safe decision."""
    source = str(text or "")
    settings = get_natural_conversation_settings(config)
    default = {
        "version": 1,
        "mode": "reply",
        "thinking_level": "normal",
        "thinking_delay_ms": _delay_for_depth(settings, "normal"),
        "reaction": "",
        "reply_text": source,
        "controlled": False,
    }
    if not is_natural_conversation_enabled(config):
        return default
    match = CONTROL_PREFIX_RE.match(source)
    if not match:
        return default

    mode = match.group("mode").lower()
    detail = str(match.group("detail") or "").strip().lower()
    body = source[match.end() :].strip()
    if mode == "reply":
        depth = detail if detail in VALID_REPLY_DEPTHS else "normal"
        if not body:
            return default
        return {
            **default,
            "thinking_level": depth,
            "thinking_delay_ms": _delay_for_depth(settings, depth),
            "reply_text": body,
            "controlled": True,
        }
    if mode == "react" and settings["allow_micro_reaction"]:
        reaction = detail if detail in VALID_REACTIONS else "thinking"
        return {
            **default,
            "mode": "micro_reaction",
            "thinking_level": "quick",
            "thinking_delay_ms": _delay_for_depth(settings, "quick"),
            "reaction": reaction,
            "reply_text": "",
            "controlled": True,
        }
    if mode == "defer" and settings["allow_defer"]:
        return {
            **default,
            "mode": "defer",
            "thinking_level": "normal",
            "reaction": "thinking",
            "reply_text": "",
            "controlled": True,
        }
    if mode == "silence" and settings["allow_silence"]:
        return {
            **default,
            "mode": "silence",
            "thinking_level": "quick",
            "thinking_delay_ms": _delay_for_depth(settings, "quick"),
            "reply_text": "",
            "controlled": True,
        }
    return default


def public_natural_conversation_decision(decision) -> dict | None:
    if not isinstance(decision, dict) or decision.get("controlled") is not True:
        return None
    mode = str(decision.get("mode") or "reply")
    if mode not in {"reply", "silence", "micro_reaction", "defer"}:
        mode = "reply"
    level = str(decision.get("thinking_level") or "normal")
    if level not in VALID_REPLY_DEPTHS:
        level = "normal"
    reaction = str(decision.get("reaction") or "")
    if reaction not in VALID_REACTIONS:
        reaction = ""
    return {
        "version": 1,
        "mode": mode,
        "thinking_level": level,
        "thinking_delay_ms": max(
            0, min(5000, int(decision.get("thinking_delay_ms") or 0))
        ),
        "reaction": reaction,
    }
