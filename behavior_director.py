"""Explainable, non-executing behaviour director for the desktop companion."""
from __future__ import annotations

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
    types = [item.get("type") for item in recent]
    if "tts_started" in types:
        return {"action": "stay_quiet", "reason": "assistant_speaking", "event_count": len(recent)}
    last_tts = next((item for item in reversed(recent) if item.get("type") == "tts_finished"), None)
    if last_tts and now - int(last_tts.get("at_ms", now)) < settings["quiet_after_tts_ms"]:
        return {"action": "stay_quiet", "reason": "post_tts_settle", "event_count": len(recent)}
    if "voice_turn" in types and "assistant_reply" not in types:
        return {"action": "micro_reaction", "reason": "unanswered_voice_presence", "event_count": len(recent)}
    material = life_material if isinstance(life_material, dict) else {}
    if material.get("has_material") and any(kind in types for kind in ("desktop_observed", "user_chat", "qq_inbound")):
        return {
            "action": "prepare_proactive",
            "reason": "grounded_life_material",
            "event_count": len(recent),
            "material_reasons": list(material.get("reasons") or [])[:3],
        }
    return {"action": "stay_quiet", "reason": "no_grounded_impulse", "event_count": len(recent)}
