import threading
import time

import app_brain_session


def test_update_session_state_returns_none_without_decision():
    called = False

    def update_state(*_args, **_kwargs):
        nonlocal called
        called = True

    result = app_brain_session.update_character_brain_session_state(
        {},
        "hi",
        [],
        assistant_reply="hello",
        get_history_summary_settings_func=lambda _config: {},
        sanitize_history_func=lambda history, max_items: history[-max_items:],
        update_brain_session_state_func=update_state,
        decay_brain_session_state_func=lambda state, now_ts: state,
        now_func=lambda: 10.0,
    )

    assert result is None
    assert called is False


def test_update_session_state_writes_config_and_decision_continuity():
    captured = {}
    decision = {"intent": "task_help"}
    cfg = {
        "_character_brain_decision": decision,
        "_character_brain_session_state": {"turns": 1},
        "_character_experience_profile": {"tone": "soft"},
    }

    def sanitize(history, max_items):
        captured["max_items"] = max_items
        return history[-max_items:]

    def update_state(previous, **kwargs):
        captured["previous"] = previous
        captured.update(kwargs)
        return {"turns": previous["turns"] + 1, "last": kwargs["assistant_reply"]}

    result = app_brain_session.update_character_brain_session_state(
        cfg,
        "hi",
        [{"role": "user", "content": "old"}, {"role": "user", "content": "new"}],
        assistant_reply="hello",
        get_history_summary_settings_func=lambda _config: {"keep_recent_messages": 1},
        sanitize_history_func=sanitize,
        update_brain_session_state_func=update_state,
        decay_brain_session_state_func=lambda state, now_ts: state,
        now_func=lambda: 123.0,
    )

    assert result == {"turns": 2, "last": "hello"}
    assert cfg["_character_brain_session_state"] == result
    assert decision["continuity"] == result
    assert captured["previous"] == {"turns": 1}
    assert captured["history"] == [{"role": "user", "content": "new"}]
    assert captured["experience_profile"] == {"tone": "soft"}
    assert captured["now_ts"] == 123.0
    assert captured["max_items"] == 1


def test_get_session_state_decays_global_state_and_returns_copy():
    app_brain_session.reset_character_brain_session_state()
    cfg = {"_character_brain_decision": {"intent": "casual"}}

    app_brain_session.update_character_brain_session_state(
        cfg,
        "hi",
        [],
        assistant_reply="hello",
        get_history_summary_settings_func=lambda _config: {},
        sanitize_history_func=lambda history, max_items: history,
        update_brain_session_state_func=lambda previous, **_kwargs: {"turns": 1},
        decay_brain_session_state_func=lambda state, now_ts: state,
        now_func=lambda: 1.0,
    )

    first = app_brain_session.get_character_brain_session_state(
        decay_brain_session_state_func=lambda state, now_ts: {**state, "decayed_at": now_ts},
        now_func=lambda: 2.0,
    )
    first["turns"] = 99
    second = app_brain_session.get_character_brain_session_state(
        decay_brain_session_state_func=lambda state, now_ts: state,
        now_func=lambda: 3.0,
    )

    assert first == {"turns": 99, "decayed_at": 2.0}
    assert second == {"turns": 1, "decayed_at": 2.0}


def test_concurrent_session_updates_advance_from_the_latest_committed_state():
    app_brain_session.reset_character_brain_session_state()
    barrier = threading.Barrier(2)
    seen_previous_turns = []

    def update_state(previous, **_kwargs):
        seen_previous_turns.append(int(previous.get("turns", 0)))
        time.sleep(0.02)
        return {"turns": int(previous.get("turns", 0)) + 1}

    def advance(intent):
        barrier.wait(timeout=2)
        return app_brain_session.update_character_brain_session_state(
            {"_character_brain_decision": {"intent": intent}},
            "continue",
            [],
            assistant_reply="okay",
            get_history_summary_settings_func=lambda _config: {},
            sanitize_history_func=lambda history, max_items: history[-max_items:],
            update_brain_session_state_func=update_state,
            decay_brain_session_state_func=lambda state, now_ts: dict(state),
            now_func=lambda: 1.0,
        )

    threads = [threading.Thread(target=advance, args=(intent,)) for intent in ("casual", "comfort")]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=2)

    state = app_brain_session.get_character_brain_session_state(
        decay_brain_session_state_func=lambda value, now_ts: dict(value),
        now_func=lambda: 2.0,
    )
    assert sorted(seen_previous_turns) == [0, 1]
    assert state == {"turns": 2}
