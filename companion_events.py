"""Bounded local event stream for companion behaviour decisions.

Events are deliberately metadata-only: message text, screenshots, tokens and
tool payloads never enter this stream.  It gives separate runtime subsystems a
common clock without creating a second autonomous execution path.
"""
from __future__ import annotations

from collections import deque
from threading import RLock
from time import time


ALLOWED_EVENT_TYPES = frozenset(
    {
        "user_chat",
        "assistant_reply",
        "voice_turn",
        "tts_started",
        "tts_finished",
        "desktop_observed",
        "qq_inbound",
        "qq_outbound",
    }
)


def _now_ms():
    return int(time() * 1000)


def _clean_event(event_type, metadata=None, now_ms=None):
    event_type = str(event_type or "").strip().lower()
    if event_type not in ALLOWED_EVENT_TYPES:
        return None
    raw = metadata if isinstance(metadata, dict) else {}
    event = {"type": event_type, "at_ms": int(now_ms or _now_ms())}
    for key in ("source", "modality", "reason", "interaction_id"):
        value = str(raw.get(key, "") or "").strip()
        if value:
            event[key] = value[:80]
    for key in ("is_auto", "has_context"):
        if raw.get(key) is True:
            event[key] = True
    return event


class CompanionEventBus:
    def __init__(self, max_events=96):
        self._events = deque(maxlen=max(16, min(240, int(max_events or 96))))
        self._lock = RLock()
        self._sequence = 0

    def publish(self, event_type, metadata=None, *, now_ms=None):
        event = _clean_event(event_type, metadata, now_ms)
        if event is None:
            return None
        with self._lock:
            self._sequence += 1
            event["sequence"] = self._sequence
            self._events.append(event)
        return dict(event)

    def snapshot(self, *, now_ms=None, limit=48):
        now = int(now_ms or _now_ms())
        with self._lock:
            events = list(self._events)[-max(1, min(96, int(limit or 48))):]
        return {"now_ms": now, "events": [dict(event) for event in events]}

    def clear(self):
        with self._lock:
            self._events.clear()
