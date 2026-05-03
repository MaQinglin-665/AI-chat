import memory


def _item(ts, user, assistant):
    return {"ts": ts, "user": user, "assistant": assistant}


def _config(**memory_overrides):
    cfg = {
        "memory": {
            "enabled": True,
            "inject_recent": 2,
            "inject_relevant": 2,
            "mem0_enabled": False,
        }
    }
    cfg["memory"].update(memory_overrides)
    return cfg


def test_low_signal_reply_does_not_inject_recent_memory(monkeypatch):
    monkeypatch.setattr(
        memory,
        "load_memory_items",
        lambda: [
            _item("2026-01-01T10:00:00", "old topic about tea", "assistant tea reply"),
            _item("2026-01-01T10:01:00", "old topic about cookies", "assistant cookie reply"),
        ],
    )
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(_config(inject_recent=2), "continue", [])

    assert selected == []


def test_unmatched_specific_query_does_not_fallback_to_recent_memory(monkeypatch):
    monkeypatch.setattr(
        memory,
        "load_memory_items",
        lambda: [
            _item("2026-01-01T10:00:00", "old topic about tea", "assistant tea reply"),
            _item("2026-01-01T10:01:00", "old topic about cookies", "assistant cookie reply"),
        ],
    )
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(
        _config(inject_recent=2),
        "Explain the current weather forecast",
        [],
    )

    assert selected == []


def test_relevant_memory_is_selected_without_unrelated_recent_padding(monkeypatch):
    project = _item("2026-01-01T10:00:00", "project alpha uses local asr", "we fixed mic input")
    unrelated_recent = _item("2026-01-01T10:01:00", "old topic about cookies", "assistant cookie reply")
    monkeypatch.setattr(memory, "load_memory_items", lambda: [project, unrelated_recent])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(
        _config(inject_recent=2, inject_relevant=2),
        "How is project alpha local asr going?",
        [],
    )

    assert selected == [project]


def test_explicit_memory_request_can_fallback_to_recent_memory(monkeypatch):
    recent = _item("2026-01-01T10:01:00", "old topic about cookies", "assistant cookie reply")
    monkeypatch.setattr(memory, "load_memory_items", lambda: [recent])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(
        _config(inject_recent=1, inject_relevant=1),
        "What do you remember?",
        [],
    )

    assert selected == [recent]


def test_just_now_feedback_is_not_treated_as_memory_request(monkeypatch):
    recent = _item("2026-01-01T10:01:00", "old topic about cookies", "assistant cookie reply")
    monkeypatch.setattr(memory, "load_memory_items", lambda: [recent])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(
        _config(inject_recent=1, inject_relevant=1),
        "\u521a\u521a\u58f0\u97f3\u53d8\u5c0f\u4e86",
        [],
    )

    assert selected == []


def test_memory_debug_records_low_signal_skip(monkeypatch):
    monkeypatch.setattr(memory, "load_memory_items", lambda: [])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(_config(), "好的", [])

    assert selected == []
    assert memory.LAST_MEMORY_DEBUG["reason"] == "low_signal_or_unspecific"
    assert memory.LAST_MEMORY_DEBUG["explicit_memory_intent"] is False
    assert memory.LAST_MEMORY_DEBUG["is_specific_memory_query"] is False


def test_memory_debug_snapshot_includes_last_selection(monkeypatch):
    recent = _item("2026-01-01T10:01:00", "old topic about cookies", "assistant cookie reply")
    monkeypatch.setattr(memory, "load_memory_items", lambda: [recent])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(
        _config(inject_recent=1, inject_relevant=1),
        "What do you remember?",
        [],
    )
    snapshot = memory.get_memory_debug_snapshot(_config())

    assert selected == [recent]
    assert snapshot["ok"] is True
    assert snapshot["memory"]["memory_count"] == 1
    assert snapshot["memory"]["last_selection"]["reason"] == "selected"
    assert snapshot["memory"]["last_selection"]["selected"][0]["user"] == "old topic about cookies"
