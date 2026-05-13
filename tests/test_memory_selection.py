import memory


class ImmediateThread:
    def __init__(self, target=None, args=None, kwargs=None, daemon=None):
        self.target = target
        self.args = args or ()
        self.kwargs = kwargs or {}
        self.daemon = daemon

    def start(self):
        if self.target:
            self.target(*self.args, **self.kwargs)


def _item(ts, user, assistant):
    return {"ts": ts, "user": user, "assistant": assistant}


def _config(**memory_overrides):
    cfg = {
        "memory": {
            "enabled": True,
            "inject_recent": 2,
            "inject_relevant": 2,
            "learning_samples_enabled": False,
            "short_enabled": False,
            "mem0_enabled": False,
        }
    }
    cfg["memory"].update(memory_overrides)
    return cfg


def _patch_learning_paths(monkeypatch, tmp_path):
    candidates_path = tmp_path / "learning_candidates.json"
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    audit_path = tmp_path / "learning_audit_log.jsonl"
    shadow_path = tmp_path / "learning_shadow_log.jsonl"
    candidates_path.write_text("[]", encoding="utf-8")
    samples_path.write_text("[]", encoding="utf-8")
    state_path.write_text("{}", encoding="utf-8")
    audit_path.write_text("", encoding="utf-8")
    shadow_path.write_text("", encoding="utf-8")
    monkeypatch.setattr(memory, "LEARNING_CANDIDATES_PATH", candidates_path)
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)
    monkeypatch.setattr(memory, "LEARNING_AUDIT_LOG_PATH", audit_path)
    monkeypatch.setattr(memory, "LEARNING_SHADOW_LOG_PATH", shadow_path)
    return candidates_path, samples_path, state_path


def _patch_core_memory_path(monkeypatch, tmp_path):
    core_path = tmp_path / "memory_core.json"
    core_path.write_text('{"schema_version":1,"items":[]}', encoding="utf-8")
    monkeypatch.setattr(memory, "CORE_MEMORY_PATH", core_path)
    return core_path


def _patch_short_memory_path(monkeypatch, tmp_path):
    short_path = tmp_path / "memory_session.json"
    short_path.write_text('{"schema_version":1,"turn_index":0,"items":[]}', encoding="utf-8")
    monkeypatch.setattr(memory, "SHORT_TERM_MEMORY_PATH", short_path)
    return short_path


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


def test_learning_candidates_require_promotion_before_prompt_injection(monkeypatch, tmp_path):
    candidates_path, _samples_path, state_path = _patch_learning_paths(monkeypatch, tmp_path)
    candidates_path.write_text(
        """
[
  {
    "id": "cand_code_concise",
    "status": "candidate",
    "user_preview": "Please keep code answers concise",
    "assistant_preview": "Got it, I will lead with the point.",
    "compressed_pattern": "When discussing code, reply with concise answers and lead with the point.",
    "score": 0.86,
    "confidence": 0.78,
    "support_count": 2
  }
]
""".strip(),
        encoding="utf-8",
    )
    state_path.write_text('{"quick_settings":{"inject_count":1}}', encoding="utf-8")
    monkeypatch.setattr(memory, "load_memory_items", lambda: [])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    cfg = _config(learning_samples_enabled=True, learning_inject_count=2)
    before = memory.build_memory_prompt_block(
        cfg,
        "What do you remember about code answers?",
        [],
    )
    snapshot = memory.get_memory_debug_snapshot(cfg)

    assert "reply with concise answers" not in before
    assert memory.LAST_MEMORY_DEBUG["learning_samples_considered"] == 0
    assert snapshot["learning"]["review_status"]["pending_review_count"] == 1
    assert snapshot["learning"]["review_status"]["active_sample_count"] == 0
    assert snapshot["learning"]["review_status"]["candidates_affect_prompt"] is False
    assert snapshot["learning"]["review_status"]["requires_user_promotion"] is True

    promoted = memory.promote_learning_review_candidates(cfg, ["cand_code_concise"])
    after = memory.build_memory_prompt_block(
        cfg,
        "What do you remember about code answers?",
        [],
    )

    assert promoted["ok"] is True
    assert promoted["samples"][0]["status"] == "active"
    assert "reply with concise answers" in after
    assert memory.LAST_MEMORY_DEBUG["learning_reason"] == "selected"


def test_explicit_core_memory_is_stored_and_recalled(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    monkeypatch.setattr(
        memory,
        "_call_summary_llm",
        lambda *_args: (_ for _ in ()).throw(AssertionError("explicit core memory should not require LLM")),
    )

    memory.remember_interaction(
        _config(summary_trigger_every=100, mem0_enabled=False, learning_candidates_enabled=False),
        "Please remember that my project is Taffy AI Desktop Pet.",
        "Got it, I will remember that.",
    )

    store = memory._safe_load_json_file(core_path, {})
    block = memory.build_memory_prompt_block(
        _config(core_inject_count=2, learning_samples_enabled=False, mem0_enabled=False),
        "What should we do next for the Taffy project?",
        [],
    )
    snapshot = memory.get_memory_debug_snapshot(_config(mem0_enabled=False))

    assert store["items"][0]["kind"] == "semantic"
    assert store["items"][0]["category"] == "project_context"
    assert "Taffy AI Desktop Pet" in store["items"][0]["text"]
    assert "真实长期记忆" in block
    assert "Taffy AI Desktop Pet" in block
    assert memory.LAST_MEMORY_DEBUG["core_reason"] == "selected"
    assert snapshot["core_memory"]["count"] == 1
    assert snapshot["core_memory"]["last_extraction"]["source"] == "explicit_user"


def test_core_memory_skips_sensitive_text(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(
        memory,
        "_call_summary_llm",
        lambda *_args: (_ for _ in ()).throw(AssertionError("sensitive memory should not call LLM")),
    )

    memory.remember_interaction(
        _config(summary_trigger_every=100, mem0_enabled=False, learning_candidates_enabled=False),
        "Please remember that my API key is sk-abcdefghijklmnop",
        "I should not store that.",
    )

    store = memory._safe_load_json_file(core_path, {})
    assert store["items"] == []
    assert memory.LAST_CORE_MEMORY_DEBUG["reason"] == "sensitive_text"


def test_auto_core_memory_extraction_uses_llm_for_project_events(monkeypatch, tmp_path):
    _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(
        memory,
        "_call_summary_llm",
        lambda _cfg, _prompt: """
{
  "memories": [
    {
      "kind": "episodic",
      "category": "project_context",
      "text": "用户正在把项目推进到真正的记忆系统，而不是只做说话风格调参。",
      "importance": 0.78,
      "confidence": 0.76,
      "tags": ["memory", "project"]
    }
  ]
}
""",
    )

    result = memory._extract_and_store_core_memory(
        _config(mem0_enabled=False, learning_candidates_enabled=False),
        {
            "user": "下一阶段我们要做真正的记忆系统，不要继续只调说话风格。",
            "assistant": "好，我会把事实和事件记忆拆出来。",
        },
    )
    block = memory.build_memory_prompt_block(
        _config(core_inject_count=2, learning_samples_enabled=False, mem0_enabled=False),
        "记忆系统下一步怎么做？",
        [],
    )

    assert result["status"] == "stored"
    assert result["source"] == "auto_llm"
    assert "真正的记忆系统" in block
    assert memory.LAST_MEMORY_DEBUG["core_memories_selected"][0]["category"] == "project_context"


def test_core_memory_review_update_delete_pin_and_edit(monkeypatch, tmp_path):
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project",
      "kind": "semantic",
      "category": "project_context",
      "text": "用户的项目是 Taffy AI Desktop Pet。",
      "importance": 0.6,
      "confidence": 0.7,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    pinned = memory.update_core_memory_entries(_config(), action="pin", ids=["mem_project"])
    weighted = memory.update_core_memory_entries(_config(), action="weight", ids=["mem_project"], delta=0.1)
    edited = memory.update_core_memory_entries(
        _config(),
        action="edit",
        ids=["mem_project"],
        patch={"text": "用户的项目是桌面 AI VTuber Taffy。"},
    )
    deleted = memory.update_core_memory_entries(_config(), action="delete", ids=["mem_project"])

    assert pinned["core_memories"][0]["pinned"] is True
    assert weighted["core_memories"][0]["importance"] == 0.7
    assert edited["core_memories"][0]["text"] == "用户的项目是桌面 AI VTuber Taffy。"
    assert deleted["core_memories"] == []


def test_short_term_memory_tracks_current_task_and_supports_followup(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    short_path = _patch_short_memory_path(monkeypatch, tmp_path)
    _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    monkeypatch.setattr(memory, "_call_summary_llm", lambda *_args: '{"memories":[]}')

    memory.remember_interaction(
        _config(
            mem0_enabled=False,
            learning_candidates_enabled=False,
            core_extraction_enabled=False,
            short_enabled=True,
            short_ttl_turns=8,
        ),
        "下一步做短期和长期记忆分层。",
        "好，我会把短期上下文和长期事实拆开。",
    )

    store = memory._safe_load_json_file(short_path, {})
    block = memory.build_memory_prompt_block(
        _config(
            mem0_enabled=False,
            learning_samples_enabled=False,
            core_enabled=False,
            short_enabled=True,
            short_inject_count=2,
        ),
        "下一步",
        [],
    )

    assert store["turn_index"] == 1
    assert any(item["kind"] == "current_task" for item in store["items"])
    assert "短期记忆" in block
    assert "短期和长期记忆分层" in block
    assert memory.LAST_MEMORY_DEBUG["short_reason"] == "selected"


def test_repeated_short_term_memory_consolidates_to_core(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    short_path = _patch_short_memory_path(monkeypatch, tmp_path)
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    monkeypatch.setattr(memory, "_call_summary_llm", lambda *_args: '{"memories":[]}')

    cfg = _config(
        mem0_enabled=False,
        learning_candidates_enabled=False,
        short_enabled=True,
        core_enabled=True,
        core_extraction_enabled=True,
        memory_consolidation_enabled=True,
        memory_consolidation_min_support=2,
        summary_trigger_every=100,
    )
    memory.remember_interaction(
        cfg,
        "Next step implement memory consolidation for the memory system.",
        "Got it, I will work on memory consolidation.",
    )
    memory.remember_interaction(
        cfg,
        "Next step implement memory consolidation for the memory system now.",
        "Got it, I will continue that memory consolidation pass.",
    )

    short_store = memory._safe_load_json_file(short_path, {})
    core_store = memory._safe_load_json_file(core_path, {})
    snapshot = memory.get_memory_debug_snapshot(_config(mem0_enabled=False, short_enabled=True))

    assert any(item.get("support_count", 0) >= 2 and item.get("consolidated_at") for item in short_store["items"])
    assert any(item["source"] == "short_consolidation" and "memory consolidation" in item["text"] for item in core_store["items"])
    assert snapshot["short_memory"]["last_consolidation"]["status"] == "stored"


def test_memory_correction_updates_matching_core_memory(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_short_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(memory, "_call_summary_llm", lambda *_args: '{"memories":[]}')
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project_old",
      "kind": "semantic",
      "category": "project_context",
      "text": "My project is OldName.",
      "importance": 0.6,
      "confidence": 0.7,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    memory.remember_interaction(
        _config(
            mem0_enabled=False,
            learning_candidates_enabled=False,
            short_enabled=False,
            core_enabled=True,
            core_extraction_enabled=False,
            memory_correction_enabled=True,
            summary_trigger_every=100,
        ),
        "You remembered wrong, my project should be NewName.",
        "Thanks, I corrected it.",
    )

    store = memory._safe_load_json_file(core_path, {})
    assert store["items"][0]["id"] == "mem_project_old"
    assert "NewName" in store["items"][0]["text"]
    assert "OldName" not in store["items"][0]["text"]
    assert store["items"][0]["source"] == "user_correction"
    assert memory.LAST_MEMORY_CORRECTION_DEBUG["status"] == "applied"
    assert memory.LAST_MEMORY_CORRECTION_DEBUG["action"] == "update"


def test_memory_forget_deletes_matching_core_memory(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_short_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(memory, "_call_summary_llm", lambda *_args: '{"memories":[]}')
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project_old",
      "kind": "semantic",
      "category": "project_context",
      "text": "My project is OldName.",
      "importance": 0.6,
      "confidence": 0.7,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    memory.remember_interaction(
        _config(
            mem0_enabled=False,
            learning_candidates_enabled=False,
            short_enabled=False,
            core_enabled=True,
            core_extraction_enabled=False,
            memory_correction_enabled=True,
            summary_trigger_every=100,
        ),
        "Forget the memory about OldName.",
        "Okay, I will forget that.",
    )

    store = memory._safe_load_json_file(core_path, {})
    assert store["items"] == []
    assert memory.LAST_MEMORY_CORRECTION_DEBUG["status"] == "applied"
    assert memory.LAST_MEMORY_CORRECTION_DEBUG["action"] == "forget"


def test_correction_turn_does_not_inject_stale_core_memory(monkeypatch, tmp_path):
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project_old",
      "kind": "semantic",
      "category": "project_context",
      "text": "My project is OldName.",
      "importance": 0.7,
      "confidence": 0.8,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    block = memory.build_memory_prompt_block(
        _config(mem0_enabled=False, learning_samples_enabled=False, core_enabled=True, core_inject_count=2),
        "You remembered wrong, my project should be NewName.",
        [],
    )

    assert "OldName" not in block
    assert memory.LAST_MEMORY_DEBUG["core_reason"] == "conflict_protected"
    assert memory.LAST_MEMORY_DEBUG["core_memories_skipped"][0]["reason"] == "current_correction"


def test_denied_memory_token_is_skipped_on_recall(monkeypatch, tmp_path):
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project_old",
      "kind": "semantic",
      "category": "project_context",
      "text": "My project is OldName.",
      "importance": 0.7,
      "confidence": 0.8,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    block = memory.build_memory_prompt_block(
        _config(mem0_enabled=False, learning_samples_enabled=False, core_enabled=True, core_inject_count=2),
        "What do you remember? It is not OldName; it is NewName.",
        [],
    )

    assert "OldName" not in block
    assert memory.LAST_MEMORY_DEBUG["core_reason"] == "conflict_protected"
    assert memory.LAST_MEMORY_DEBUG["core_memories_skipped"][0]["reason"] == "current_denies_memory_token"


def test_weak_old_core_memory_is_skipped_when_user_states_new_fact(monkeypatch, tmp_path):
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project_old",
      "kind": "semantic",
      "category": "project_context",
      "text": "My project is OldName.",
      "importance": 0.7,
      "confidence": 0.8,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    block = memory.build_memory_prompt_block(
        _config(mem0_enabled=False, learning_samples_enabled=False, core_enabled=True, core_inject_count=2),
        "My project is NewName. How should we plan the project roadmap?",
        [],
    )

    assert "OldName" not in block
    assert memory.LAST_MEMORY_DEBUG["core_reason"] == "conflict_protected"
    assert memory.LAST_MEMORY_DEBUG["core_memories_skipped"][0]["reason"] == "weak_match_current_assertion"


def test_relevant_core_memory_survives_recall_protection(monkeypatch, tmp_path):
    core_path = _patch_core_memory_path(monkeypatch, tmp_path)
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])
    core_path.write_text(
        """
{
  "schema_version": 1,
  "items": [
    {
      "id": "mem_project_asr",
      "kind": "semantic",
      "category": "project_context",
      "text": "Project NewName uses local ASR and Live2D.",
      "importance": 0.7,
      "confidence": 0.8,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    block = memory.build_memory_prompt_block(
        _config(mem0_enabled=False, learning_samples_enabled=False, core_enabled=True, core_inject_count=2),
        "How should we improve NewName ASR next?",
        [],
    )

    assert "Project NewName uses local ASR" in block
    assert memory.LAST_MEMORY_DEBUG["core_reason"] == "selected"


def test_short_term_memory_expires_by_turn_count(monkeypatch, tmp_path):
    short_path = _patch_short_memory_path(monkeypatch, tmp_path)
    short_path.write_text(
        """
{
  "schema_version": 1,
  "turn_index": 10,
  "items": [
    {
      "id": "short_old",
      "kind": "current_task",
      "text": "当前任务：旧任务",
      "salience": 0.9,
      "last_seen_turn": 1,
      "ttl_turns": 2,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    block = memory.build_memory_prompt_block(
        _config(
            mem0_enabled=False,
            learning_samples_enabled=False,
            core_enabled=False,
            short_enabled=True,
            short_inject_count=2,
            short_ttl_turns=2,
        ),
        "继续",
        [],
    )

    assert "旧任务" not in block
    assert memory.LAST_MEMORY_DEBUG["short_reason"] == "no_short_memories"


def test_short_term_memory_review_update_clear_delete_and_edit(monkeypatch, tmp_path):
    short_path = _patch_short_memory_path(monkeypatch, tmp_path)
    short_path.write_text(
        """
{
  "schema_version": 1,
  "turn_index": 3,
  "items": [
    {
      "id": "short_task",
      "kind": "current_task",
      "text": "当前任务：做短期记忆",
      "salience": 0.6,
      "last_seen_turn": 3,
      "ttl_turns": 8,
      "status": "active"
    }
  ]
}
""".strip(),
        encoding="utf-8",
    )

    weighted = memory.update_short_term_memory_entries(_config(), action="weight", ids=["short_task"], delta=0.1)
    edited = memory.update_short_term_memory_entries(
        _config(),
        action="edit",
        ids=["short_task"],
        patch={"text": "当前任务：完成短期记忆 UI"},
    )
    cleared = memory.update_short_term_memory_entries(_config(), action="clear")

    assert weighted["short_memories"][0]["salience"] == 0.7
    assert edited["short_memories"][0]["text"] == "当前任务：完成短期记忆 UI"
    assert cleared["short_memories"] == []


def test_formal_learning_sample_can_join_prompt_when_relevant(monkeypatch, tmp_path):
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    samples_path.write_text(
        """
[
  {
    "id": "learned_short_reply",
    "source": "learned",
    "status": "active",
    "user_preview": "我不喜欢长篇大论，开发问题先给重点",
    "assistant_preview": "收到，我先给结论再补细节。",
    "compressed_pattern": "用户聊开发问题时偏好短句、先给重点、少说套话。",
    "score": 0.86,
    "confidence": 0.72,
    "support_count": 3
  }
]
""".strip(),
        encoding="utf-8",
    )
    state_path.write_text('{"quick_settings":{"inject_count":1}}', encoding="utf-8")
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)
    monkeypatch.setattr(memory, "load_memory_items", lambda: [])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    block = memory.build_memory_prompt_block(
        _config(learning_samples_enabled=True, learning_inject_count=1),
        "这个开发问题怎么优化，先给重点",
        [],
    )

    assert "长期互动偏好" in block
    assert "先给重点" in block
    assert memory.LAST_MEMORY_DEBUG["learning_reason"] == "selected"
    assert memory.LAST_MEMORY_DEBUG["learning_samples_selected"][0]["id"] == "learned_short_reply"


def test_learning_sample_injection_respects_quick_disable(monkeypatch, tmp_path):
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    samples_path.write_text(
        """
[
  {
    "id": "learned_dev",
    "source": "learned",
    "status": "active",
    "user_preview": "开发问题先给重点",
    "compressed_pattern": "用户偏好开发问题先给重点。",
    "score": 0.9,
    "confidence": 0.8
  }
]
""".strip(),
        encoding="utf-8",
    )
    state_path.write_text('{"quick_settings":{"inject_count":0}}', encoding="utf-8")
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)
    monkeypatch.setattr(memory, "load_memory_items", lambda: [])
    monkeypatch.setattr(memory, "_search_mem0_items", lambda *_args: [])

    selected = memory.select_memory_items_for_prompt(
        _config(learning_samples_enabled=True, learning_inject_count=1),
        "这个开发问题怎么优化，先给重点",
        [],
    )

    assert selected == []
    assert memory.LAST_MEMORY_DEBUG["learning_reason"] == "quick_disabled"


def test_remember_interaction_generates_learning_candidate(monkeypatch, tmp_path):
    memory_path = tmp_path / "memory.json"
    candidates_path, _samples_path, _state_path = _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "MEMORY_PATH", memory_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(
        memory,
        "_call_summary_llm",
        lambda _cfg, _prompt: """
{
  "remember": true,
  "category": "user_preference",
  "compressed_pattern": "用户聊开发问题时偏好短句、先给重点。",
  "user_preview": "以后开发问题请先给重点，我喜欢短句",
  "assistant_preview": "收到，我以后先给重点。",
  "score": 0.7,
  "confidence": 0.66
}
""",
    )

    memory.remember_interaction(
        _config(summary_trigger_every=100),
        "以后开发问题请先给重点，我喜欢短句",
        "收到，我以后先给重点，再补必要细节。",
    )

    candidates = memory._safe_load_json_file(candidates_path, [])
    assert len(candidates) == 1
    assert candidates[0]["status"] == "candidate"
    assert candidates[0]["category"] == "user_preference"
    assert candidates[0]["support_count"] == 1
    assert "先给重点" in candidates[0]["compressed_pattern"]
    assert memory.LAST_LEARNING_EXTRACTION_DEBUG["status"] == "stored"


def test_learning_candidate_skip_low_signal_and_sensitive_text(monkeypatch, tmp_path):
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(
        memory,
        "_call_summary_llm",
        lambda *_args: (_ for _ in ()).throw(AssertionError("LLM should not be called")),
    )

    memory._schedule_learning_candidate_extraction(
        _config(),
        {"user": "早上好", "assistant": "早呀，今天也慢慢来。"},
    )
    assert memory.LAST_LEARNING_EXTRACTION_DEBUG["reason"] == "lightweight_checkin"

    memory._schedule_learning_candidate_extraction(
        _config(),
        {"user": "请记住我的 API key 是 " + "sk-" + "abcdefghijklmnop", "assistant": "我不会记录这个。"},
    )
    assert memory.LAST_LEARNING_EXTRACTION_DEBUG["reason"] == "sensitive_text"


def test_learning_candidate_invalid_json_is_safe(monkeypatch, tmp_path):
    _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(memory, "_call_summary_llm", lambda *_args: "not json")

    result = memory._extract_and_store_learning_candidate(
        _config(),
        {"user": "以后开发问题请先给重点，我喜欢短句", "assistant": "收到，我以后先给重点。"},
    )

    assert result["status"] == "skipped"
    assert result["reason"] == "llm_invalid_json"


def test_learning_candidate_duplicate_merges_support_count(monkeypatch, tmp_path):
    candidates_path, _samples_path, _state_path = _patch_learning_paths(monkeypatch, tmp_path)
    monkeypatch.setattr(
        memory,
        "_call_summary_llm",
        lambda *_args: """
{
  "remember": true,
  "category": "response_feedback",
  "compressed_pattern": "用户偏好开发回答先给重点、少说套话。",
  "user_preview": "以后开发问题请先给重点，少说套话",
  "assistant_preview": "明白，我会更直接。",
  "score": 0.72,
  "confidence": 0.7
}
""",
    )

    record = {"user": "以后开发问题请先给重点，少说套话", "assistant": "明白，我会更直接。"}
    first = memory._extract_and_store_learning_candidate(_config(), record)
    second = memory._extract_and_store_learning_candidate(_config(), record)
    candidates = memory._safe_load_json_file(candidates_path, [])

    assert first["action"] == "created"
    assert second["action"] == "merged"
    assert len(candidates) == 1
    assert candidates[0]["support_count"] == 2


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
    review_status = snapshot["learning"]["review_status"]
    assert snapshot["learning"]["degraded_mode"] is True
    assert review_status["pending_review_count"] == 1
    assert review_status["sample_total"] == 0
    assert review_status["candidates_affect_prompt"] is False
    assert review_status["requires_user_promotion"] is True
    assert review_status["sensitive_filter_enabled"] is True
    assert review_status["local_only"] is True
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


def test_reload_learning_review_data_recovers_stale_degraded_state(monkeypatch, tmp_path):
    candidates_path = tmp_path / "learning_candidates.json"
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    shadow_path = tmp_path / "learning_shadow_log.jsonl"
    candidates_path.write_text("[]", encoding="utf-8")
    samples_path.write_text("[]", encoding="utf-8")
    shadow_path.write_text("", encoding="utf-8")
    state_path.write_text(
        """
{
  "turn_count": 10,
  "degraded_mode": true,
  "last_observed_at": "2026-01-01T00:00:00",
  "events": [
    {"ts": "2026-01-01T00:00:00", "event": "SCORER_DEGRADED", "reason": "low_confidence"}
  ]
}
""".strip(),
        encoding="utf-8",
    )
    monkeypatch.setattr(memory, "LEARNING_CANDIDATES_PATH", candidates_path)
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)
    monkeypatch.setattr(memory, "LEARNING_SHADOW_LOG_PATH", shadow_path)

    payload = memory.reload_learning_review_data(_config())
    state = memory._safe_load_json_file(state_path, {})

    assert payload["ok"] is True
    assert payload["state"]["degraded_mode"] is False
    assert state["degraded_mode"] is False
    assert state["recovered_reason"] == "stale_scorer_state"
    assert state["events"][-1]["event"] == "SCORER_RECOVERED"


def test_reload_learning_review_data_keeps_recent_or_malformed_degraded_state(monkeypatch, tmp_path):
    candidates_path = tmp_path / "learning_candidates.json"
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    candidates_path.write_text("[]", encoding="utf-8")
    samples_path.write_text("[]", encoding="utf-8")
    monkeypatch.setattr(memory, "LEARNING_CANDIDATES_PATH", candidates_path)
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)

    state_path.write_text(
        """
{
  "degraded_mode": true,
  "last_observed_at": "not-a-date"
}
""".strip(),
        encoding="utf-8",
    )
    malformed = memory.reload_learning_review_data(_config())
    assert malformed["state"]["degraded_mode"] is True

    state_path.write_text(
        f"""
{{
  "degraded_mode": true,
  "last_observed_at": "{memory._learning_now_iso()}"
}}
""".strip(),
        encoding="utf-8",
    )
    recent = memory.reload_learning_review_data(_config())
    assert recent["state"]["degraded_mode"] is True


def test_learning_review_promote_update_and_undo(monkeypatch, tmp_path):
    candidates_path = tmp_path / "learning_candidates.json"
    samples_path = tmp_path / "learning_samples.json"
    state_path = tmp_path / "learning_state.json"
    audit_path = tmp_path / "learning_audit_log.jsonl"
    candidates_path.write_text(
        """
[
  {
    "id": "cand_1",
    "assistant_preview": "short reply",
    "compressed_pattern": "keep it short",
    "score": 0.5,
    "confidence": 0.6,
    "support_count": 1
  }
]
""".strip(),
        encoding="utf-8",
    )
    samples_path.write_text("[]", encoding="utf-8")
    state_path.write_text("{}", encoding="utf-8")
    audit_path.write_text("", encoding="utf-8")
    monkeypatch.setattr(memory, "LEARNING_CANDIDATES_PATH", candidates_path)
    monkeypatch.setattr(memory, "LEARNING_SAMPLES_PATH", samples_path)
    monkeypatch.setattr(memory, "LEARNING_STATE_PATH", state_path)
    monkeypatch.setattr(memory, "LEARNING_AUDIT_LOG_PATH", audit_path)

    promoted = memory.promote_learning_review_candidates(_config(), ["cand_1"])
    assert promoted["ok"] is True
    assert promoted["samples"][0]["id"] == "learned_cand_1"
    assert promoted["samples"][0]["status"] == "active"
    assert promoted["candidates"][0]["status"] == "promoted"

    weighted = memory.update_learning_review_entries(
        _config(),
        action="weight",
        pool="samples",
        ids=["learned_cand_1"],
        delta=0.1,
    )
    assert weighted["samples"][0]["score"] == 0.6

    undone = memory.undo_last_learning_review_action(_config())
    assert undone["ok"] is True
    assert undone["samples"][0]["score"] == 0.5

    second_undo = memory.undo_last_learning_review_action(_config())
    assert second_undo["ok"] is True
    assert second_undo["samples"] == []
    assert second_undo["candidates"][0]["status"] == "candidate"
