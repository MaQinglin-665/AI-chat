"""Cloud-planned interaction continuity with compact, inspectable state.

The mind decides whether an active human interaction still has momentum. It
never sends messages or executes tools; callers retain turn-taking and safety
authority. Only a bounded conclusion is persisted, never hidden reasoning.
"""
from __future__ import annotations

import json
import re
import threading
from datetime import datetime
from pathlib import Path

from obsidian_knowledge import ensure_vault, get_settings as get_knowledge_settings


STATE_FILE = ".xinyu-interaction-mind.json"
_LOCK = threading.RLock()
_ACTIONS = frozenset({"speak", "ask_followup", "interrupt", "observe", "recall", "research", "wait", "close"})
_REASONS = frozenset({
    "unfinished_meaning", "emotional_resonance", "useful_followup", "playful_impulse",
    "shared_context", "need_grounding", "user_still_speaking", "natural_pause",
    "topic_closed", "respect_user_space", "uncertain",
})


def get_settings(config) -> dict:
    safe = config if isinstance(config, dict) else {}
    raw = safe.get("interaction_mind")
    raw = raw if isinstance(raw, dict) else {}
    observe = safe.get("observe") if isinstance(safe.get("observe"), dict) else {}
    # Active companionship is already the user's opt-in to cloud proactive
    # decisions. The explicit switch can also enable the mind independently.
    enabled = raw.get("enabled") is True or observe.get("auto_chat_enabled") is True
    return {
        "enabled": enabled,
        "min_confidence": max(0.35, min(0.9, float(raw.get("min_confidence", 0.58) or 0.58))),
        "interrupt_confidence": max(0.65, min(0.98, float(raw.get("interrupt_confidence", 0.82) or 0.82))),
        "pulse_min_ms": max(2_500, min(30_000, int(raw.get("pulse_min_ms", 6_000) or 6_000))),
        "pulse_max_ms": max(5_000, min(60_000, int(raw.get("pulse_max_ms", 16_000) or 16_000))),
    }


def _state_path(config) -> Path:
    return Path(get_knowledge_settings(config)["vault_path"]) / STATE_FILE


def load_state(config) -> dict:
    try:
        parsed = json.loads(_state_path(config).read_text(encoding="utf-8"))
    except Exception:
        parsed = {}
    if not isinstance(parsed, dict):
        parsed = {}
    return {
        "interruption_aversion": max(0, min(6, int(parsed.get("interruption_aversion", 0) or 0))),
        "last_feedback": str(parsed.get("last_feedback") or "")[:80],
        "updated_at": str(parsed.get("updated_at") or "")[:32],
    }


def record_feedback(config, user_message) -> dict:
    """Learn only explicit turn-taking preference, not ordinary conversation."""
    text = re.sub(r"\s+", " ", str(user_message or "")).strip()
    if not text:
        return load_state(config)
    quiet = re.search(r"(?:先别|不要|别).{0,8}(?:打断|插话|抢话)|让我说完|先听我说完|等我说完", text, re.I)
    invite = re.search(r"可以.{0,8}(?:打断|插话|抢话)|随时.{0,8}(?:接话|打断)|不用等我说完", text, re.I)
    if not quiet and not invite:
        return load_state(config)
    ensure_vault(config)
    with _LOCK:
        state = load_state(config)
        current = int(state["interruption_aversion"])
        if quiet:
            current = min(6, current + 2)
            feedback = "prefer_less_interruption"
        else:
            current = max(0, current - 1)
            feedback = "allow_more_interruption"
        saved = {
            "interruption_aversion": current,
            "last_feedback": feedback,
            "updated_at": datetime.now().isoformat(timespec="seconds"),
        }
        _state_path(config).write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding="utf-8")
        return saved


def sanitize_snapshot(snapshot) -> dict:
    raw = snapshot if isinstance(snapshot, dict) else {}
    def text(key, limit):
        return re.sub(r"\s+", " ", str(raw.get(key) or "")).strip()[:limit]
    reasons = raw.get("candidate_reasons") if isinstance(raw.get("candidate_reasons"), list) else []
    return {
        "source": text("source", 40),
        "latest_user": text("latest_user", 480),
        "latest_assistant": text("latest_assistant", 480),
        "topic_anchor": text("topic_anchor", 300),
        "candidate_reasons": [re.sub(r"[^a-z0-9_-]", "", str(x).lower())[:40] for x in reasons[:6]],
        "user_speaking": raw.get("user_speaking") is True,
        "assistant_speaking": raw.get("assistant_speaking") is True,
        "user_typing": raw.get("user_typing") is True,
        "seconds_since_user": max(0, min(86_400, int(raw.get("seconds_since_user", 0) or 0))),
        "seconds_since_assistant": max(0, min(86_400, int(raw.get("seconds_since_assistant", 0) or 0))),
        "desktop_change_pending": raw.get("desktop_change_pending") is True,
        "tools_available": raw.get("tools_available") is True,
    }


def build_prompt(snapshot, preference) -> str:
    state = sanitize_snapshot(snapshot)
    aversion = max(0, min(6, int((preference or {}).get("interruption_aversion", 0) or 0)))
    return (
        "You are Xinyu's private unified interaction mind. Decide whether the current human interaction still has living momentum. "
        "You do not write the visible reply and you never execute tools. Think about meaning, relationship, timing, emotional residue, curiosity, and whether silence is more human. "
        "Rules and timers are only evidence, never reasons by themselves. A desktop change alone is not a reason to speak. "
        "A concrete observation, memory recall, or web lookup may be proposed only when it would materially improve the interaction. "
        "Interruption is rare: use it only for a highly relevant, short, socially natural impulse; obey explicit requests to let the user finish. "
        "Return one JSON object only, without markdown or hidden reasoning.\n"
        "Schema: {\"action\":\"speak|ask_followup|interrupt|observe|recall|research|wait|close\","
        "\"confidence\":0.0,\"interaction_open\":true,"
        "\"reason_code\":\"unfinished_meaning|emotional_resonance|useful_followup|playful_impulse|shared_context|need_grounding|user_still_speaking|natural_pause|topic_closed|respect_user_space|uncertain\","
        "\"topic_anchor\":\"brief subject\",\"utterance_intent\":\"brief visible-reply goal, not the reply\",\"wait_ms\":8000}.\n"
        f"Learned interruption aversion (0 permissive, 6 strongly avoid): {aversion}.\n"
        "Current bounded interaction snapshot:\n"
        + json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    )


def _extract_json(text):
    source = str(text or "").strip()
    if source.startswith("```"):
        source = re.sub(r"^```(?:json)?\s*|\s*```$", "", source, flags=re.I)
    start, end = source.find("{"), source.rfind("}")
    if start < 0 or end <= start:
        return {}
    try:
        parsed = json.loads(source[start:end + 1])
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def parse_decision(text, config, *, preference=None) -> dict:
    raw = _extract_json(text)
    settings = get_settings(config)
    action = str(raw.get("action") or "wait").strip().lower()
    if action not in _ACTIONS:
        action = "wait"
    try:
        confidence = max(0.0, min(1.0, float(raw.get("confidence", 0) or 0)))
    except (TypeError, ValueError):
        confidence = 0.0
    reason = str(raw.get("reason_code") or "uncertain").strip().lower()
    if reason not in _REASONS:
        reason = "uncertain"
    aversion = int((preference or load_state(config)).get("interruption_aversion", 0) or 0)
    threshold = settings["interrupt_confidence"] + min(0.12, aversion * 0.02) if action == "interrupt" else settings["min_confidence"]
    if action not in {"wait", "close"} and confidence < threshold:
        action, reason = "wait", "uncertain"
    wait_ms = max(settings["pulse_min_ms"], min(settings["pulse_max_ms"], int(raw.get("wait_ms", settings["pulse_min_ms"]) or settings["pulse_min_ms"])))
    return {
        "version": 1,
        "action": action,
        "confidence": round(confidence, 3),
        "interaction_open": raw.get("interaction_open") is not False and action != "close",
        "reason_code": reason,
        "topic_anchor": re.sub(r"\s+", " ", str(raw.get("topic_anchor") or "")).strip()[:240],
        "utterance_intent": re.sub(r"\s+", " ", str(raw.get("utterance_intent") or "")).strip()[:240],
        "wait_ms": wait_ms,
    }
