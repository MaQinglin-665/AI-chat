"""Character Brain session-state helpers used by the app layer."""

from __future__ import annotations

import threading
import time


_SESSION_LOCK = threading.Lock()
_SESSION_STATE = {}


def reset_character_brain_session_state():
    global _SESSION_STATE
    with _SESSION_LOCK:
        _SESSION_STATE = {}


def get_character_brain_session_state(*, decay_brain_session_state_func, now_func=time.time):
    global _SESSION_STATE
    now_ts = now_func()
    with _SESSION_LOCK:
        state = decay_brain_session_state_func(_SESSION_STATE, now_ts=now_ts)
        _SESSION_STATE = dict(state)
        return dict(state)


def update_character_brain_session_state(
    config,
    user_message,
    history,
    *,
    assistant_reply="",
    get_history_summary_settings_func,
    sanitize_history_func,
    update_brain_session_state_func,
    decay_brain_session_state_func,
    now_func=time.time,
):
    global _SESSION_STATE
    if not isinstance(config, dict):
        return None
    decision = config.get("_character_brain_decision") or config.get(
        "_character_brain_response_decision"
    )
    if not isinstance(decision, dict):
        return None
    try:
        history_settings = get_history_summary_settings_func(config)
        keep_recent = int(history_settings.get("keep_recent_messages", 8))
        safe_history = sanitize_history_func(history, max_items=keep_recent)
    except Exception:
        safe_history = []
    request_snapshot = config.get("_character_brain_session_state")
    now_ts = now_func()
    with _SESSION_LOCK:
        # A delivery acknowledgement can run concurrently with another request.
        # Keep the read/derive/write cycle under the same lock so both confirmed
        # turns advance from the latest session state instead of overwriting each
        # other. Delivery commits intentionally remove request_snapshot first.
        previous = request_snapshot if isinstance(request_snapshot, dict) else decay_brain_session_state_func(
            _SESSION_STATE,
            now_ts=now_ts,
        )
        state = update_brain_session_state_func(
            previous,
            decision=decision,
            user_message=user_message,
            assistant_reply=assistant_reply,
            history=safe_history,
            experience_profile=config.get("_character_experience_profile"),
            now_ts=now_ts,
        )
        _SESSION_STATE = dict(state)
    config["_character_brain_session_state"] = dict(state)
    decision["continuity"] = dict(state)
    return dict(state)
