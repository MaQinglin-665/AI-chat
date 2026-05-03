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


def test_memory_debug_snapshot_includes_learning_diagnostics(monkeypatch, tmp_path):
    monkeypatch.setattr(memory, "load_memory_items", lambda: [])
    candidates_path = tmp_path / "learning_candidates.json"
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    audit_path = tmp_path / "learning_audit_log.jsonl"
    candidates_path.write_text(
        """
[
  {
    "id": "cand_1",
    "user_preview": "hello",
    "assistant_preview": "world",
    "compressed_pattern": "short pattern",
    "score": 0.8,
    "confidence": 0.7
  }
]
""".strip(),
        encoding="utf-8",
    )
    samples_path.write_text("[]", encoding="utf-8")
    state_path.write_text(
        """
{
  "turn_count": 101,
  "degraded_mode": true,
  "current_window": [
    {"candidate": false, "confidence": 0.4, "score": 0.5, "signal_count": 0},
    {"candidate": true, "confidence": 0.6, "score": 0.8, "signal_count": 2}
  ],
  "health_windows": [
    {
      "window_ended_at": "2026-01-01T00:00:00+08:00",
      "window_size": 100,
      "candidate_in_rate": 0.02,
      "avg_confidence": 0.42,
      "signal_coverage": 0.5
    }
  ],
  "events": [
    {
      "ts": "2026-01-01T00:00:00+08:00",
      "event": "SCORER_DEGRADED",
      "reason": "low_confidence",
      "window_count": 2
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )
    audit_path.write_text(
        """
{"id":"audit_1","ts":"2026-01-01T00:00:01+08:00","action":"promote","before":{"large":true},"after":{"large":true},"detail":{"candidate_ids":["cand_1"],"promoted":1,"skipped":0}}
""".strip(),
        encoding="utf-8",
    )
    monkeypatch.setattr(memory, "LEARNING_CANDIDATES_PATH", candidates_path)
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)
    monkeypatch.setattr(memory, "LEARNING_AUDIT_LOG_PATH", audit_path)

    snapshot = memory.get_memory_debug_snapshot(_config())

    diagnostics = snapshot["learning"]["diagnostics"]
    assert snapshot["learning"]["degraded_mode"] is True
    assert diagnostics["degraded_reason"] == "low_confidence"
    assert diagnostics["latest_event"]["event"] == "SCORER_DEGRADED"
    assert diagnostics["health_windows"][0]["avg_confidence"] == 0.42
    assert diagnostics["current_window_size"] == 2
    assert diagnostics["current_window_avg_confidence"] == 0.5
    assert diagnostics["current_window_signal_coverage"] == 0.5
    assert snapshot["learning"]["recent_audit"] == [
        {
            "id": "audit_1",
            "ts": "2026-01-01T00:00:01+08:00",
            "action": "promote",
            "event": "",
            "detail": {"candidate_ids": ["cand_1"], "promoted": 1, "skipped": 0},
        }
    ]


def test_learning_garbled_diagnostics_do_not_flag_normal_chinese():
    diagnostics = memory._build_learning_diagnostics(
        [
            {
                "id": "cand_normal",
                "user_preview": "我在想未来编程会怎么样，现在 vibe coding",
                "assistant_preview": "未来的编程就像是一场没有终点的马拉松。",
                "compressed_pattern": "未来编程似无尽马拉松。",
            }
        ],
        [
            {
                "id": "sample_normal",
                "user_preview": "早上好",
                "assistant_preview": "就是刚好看到你了，顺手说一句早上好。",
                "compressed_pattern": "轻松接梗再温和回应。",
            }
        ],
        {"events": [], "health_windows": [], "current_window": []},
    )

    assert diagnostics["garbled_count"] == 0
    assert diagnostics["garbled_candidates_count"] == 0
    assert diagnostics["garbled_samples_count"] == 0


def test_learning_diagnostics_handles_malformed_state_shape():
    diagnostics = memory._build_learning_diagnostics(
        [{"id": "cand", "assistant_preview": "hello"}],
        [],
        {"events": "bad", "health_windows": {"bad": True}, "current_window": None},
    )

    assert diagnostics["degraded_reason"] == ""
    assert diagnostics["latest_event"] == {}
    assert diagnostics["health_windows"] == []
    assert diagnostics["current_window_size"] == 0
    assert diagnostics["current_window_avg_confidence"] == 0
    assert diagnostics["current_window_signal_coverage"] == 0
