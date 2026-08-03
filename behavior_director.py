"""Explainable, non-executing behaviour director for the desktop companion."""
from __future__ import annotations

from threading import RLock
from time import time


def _now_ms():
    return int(time() * 1000)


def get_settings(config):
    raw = config.get("behavior_director") if isinstance(config, dict) else {}
    raw = raw if isinstance(raw, dict) else {}
    return {
        "enabled": raw.get("enabled") is True,
        "event_window_ms": max(30_000, min(30 * 60_000, int(raw.get("event_window_ms", 300_000) or 300_000))),
        "quiet_after_tts_ms": max(1_000, min(120_000, int(raw.get("quiet_after_tts_ms", 8_000) or 8_000))),
    }


def _event_sequence(event, fallback=0):
    try:
        value = int(event.get("sequence", 0) or 0)
    except (AttributeError, TypeError, ValueError):
        value = 0
    return value if value > 0 else int(fallback or 0)


def _latest_event(events, event_types):
    allowed = set(event_types)
    candidates = [
        (item, index)
        for index, item in enumerate(events, start=1)
        if isinstance(item, dict) and item.get("type") in allowed
    ]
    if not candidates:
        return None
    item, index = max(
        candidates,
        key=lambda pair: (
            _event_sequence(pair[0], pair[1]),
            int(pair[0].get("at_ms", 0) or 0),
            pair[1],
        ),
    )
    return item


class BehaviorDecisionCursor:
    """Process-local exactly-once guard for proactive suggestions."""

    def __init__(self):
        self._lock = RLock()
        self._last_consumed_sequence = 0

    def consume(self, decision):
        result = dict(decision) if isinstance(decision, dict) else {}
        if result.get("action") != "prepare_proactive":
            return result
        try:
            sequence = int(result.get("trigger_sequence", 0) or 0)
        except (TypeError, ValueError):
            sequence = 0
        if sequence <= 0:
            return result
        with self._lock:
            if sequence <= self._last_consumed_sequence:
                return {
                    "action": "stay_quiet",
                    "reason": "trigger_already_consumed",
                    "event_count": int(result.get("event_count", 0) or 0),
                    "trigger_sequence": sequence,
                }
            self._last_consumed_sequence = sequence
        return result


def decide(config, event_snapshot, *, life_material=None, now_ms=None):
    """Return a suggestion only; callers retain all sending/tool safety gates."""
    settings = get_settings(config)
    now = int(now_ms or _now_ms())
    if not settings["enabled"]:
        return {"action": "stay_quiet", "reason": "disabled", "event_count": 0}
    events = event_snapshot.get("events", []) if isinstance(event_snapshot, dict) else []
    recent = [
        item for item in events
        if isinstance(item, dict) and 0 <= now - int(item.get("at_ms", 0) or 0) <= settings["event_window_ms"]
    ]
    latest_tts = _latest_event(recent, {"tts_started", "tts_finished"})
    if latest_tts and latest_tts.get("type") == "tts_started":
        return {
            "action": "stay_quiet",
            "reason": "assistant_speaking",
            "event_count": len(recent),
            "trigger_sequence": _event_sequence(latest_tts),
        }
    if latest_tts and latest_tts.get("type") == "tts_finished":
        since_finished = now - int(latest_tts.get("at_ms", now) or now)
        if since_finished < settings["quiet_after_tts_ms"]:
            return {
                "action": "stay_quiet",
                "reason": "post_tts_settle",
                "event_count": len(recent),
                "trigger_sequence": _event_sequence(latest_tts),
            }
    latest_voice = _latest_event(recent, {"voice_turn"})
    latest_reply = _latest_event(recent, {"assistant_reply"})
    if latest_voice and (
        latest_reply is None
        or _event_sequence(latest_voice) > _event_sequence(latest_reply)
    ):
        return {
            "action": "micro_reaction",
            "reason": "unanswered_voice_presence",
            "event_count": len(recent),
            "trigger_sequence": _event_sequence(latest_voice),
        }
    material = life_material if isinstance(life_material, dict) else {}
    grounded_candidates = [
        item for item in recent
        if item.get("type") != "user_chat" or item.get("is_auto") is not True
    ]
    grounded_event = _latest_event(grounded_candidates, {"desktop_observed", "user_chat", "qq_inbound"})
    if material.get("has_material") and grounded_event:
        return {
            "action": "prepare_proactive",
            "reason": "grounded_life_material",
            "event_count": len(recent),
            "trigger_sequence": _event_sequence(grounded_event),
            "material_reasons": list(material.get("reasons") or [])[:3],
        }
    return {"action": "stay_quiet", "reason": "no_grounded_impulse", "event_count": len(recent)}
