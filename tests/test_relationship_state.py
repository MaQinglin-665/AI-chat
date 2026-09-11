import json

import copy

import app
import relationship_state


def _config(enabled=True):
    return {"relationship_state": {"enabled": enabled}}


def _entry_map(state):
    return {entry["key"]: entry for entry in state["entries"]}


def test_load_recovers_from_backup_and_drops_unsafe_entries(monkeypatch, tmp_path):
    path = tmp_path / "relationship_state.json"
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", path)
    path.write_text("{not valid json", encoding="utf-8")
    path.with_suffix(".bak").write_text(
        json.dumps(
            {
                "revision": 8,
                "enabled": True,
                "familiarity": {"eligible_turns": 31},
                "entries": [
                    {"key": "address", "value": "Quinn", "source": "manual"},
                    {"key": "address", "value": "sk-abcdefghijklmnop", "source": "manual"},
                    {"key": "desktop_access", "value": "enabled"},
                    {"key": "reply_length", "value": "detailed"},
                ],
            }
        ),
        encoding="utf-8",
    )

    state = relationship_state.load_relationship_state()

    assert state["revision"] == 8
    assert state["familiarity"] == {"level": "familiar", "eligible_turns": 31}
    entries = _entry_map(state)
    assert entries["reply_length"]["value"] == "detailed"
    assert entries["address"]["value"] == "Quinn"
    assert "desktop_access" not in entries


def test_manual_turns_advance_familiarity_and_keep_only_explicit_preferences(monkeypatch, tmp_path):
    path = tmp_path / "relationship_state.json"
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", path)

    changed = relationship_state.record_relationship_interaction(
        _config(),
        "Please call me Quinn. Keep your answers concise, and don't tease me.",
        "Got it, Quinn.",
    )

    assert changed is True
    state = relationship_state.load_relationship_state()
    assert state["familiarity"] == {"level": "new", "eligible_turns": 1}
    entries = _entry_map(state)
    assert entries["address"]["value"] == "Quinn"
    assert entries["reply_length"]["value"] == "concise"
    assert entries["teasing"]["value"] == "none"
    assert all(entry["source"] == "explicit_user" for entry in entries.values())
    persisted = path.read_text(encoding="utf-8")
    assert "Keep your answers concise" not in persisted
    assert "Got it, Quinn" not in persisted

    assert relationship_state.record_relationship_interaction(
        _config(),
        "This automatic turn must not count.",
        "It will not.",
        is_auto=True,
    ) is False
    assert relationship_state.load_relationship_state()["familiarity"]["eligible_turns"] == 1


def test_interaction_id_deduplicates_relationship_growth_without_exposing_the_id(monkeypatch, tmp_path):
    path = tmp_path / "relationship_state.json"
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", path)

    assert relationship_state.record_relationship_interaction(
        _config(),
        "Please call me Quinn.",
        "Got it.",
        interaction_id="private-chat-trace-1",
    ) is True
    first = relationship_state.load_relationship_state()
    assert relationship_state.record_relationship_interaction(
        _config(),
        "Please call me Quinn.",
        "Got it.",
        interaction_id="private-chat-trace-1",
    ) is False
    duplicate = relationship_state.load_relationship_state()

    assert duplicate["revision"] == first["revision"]
    assert duplicate["familiarity"]["eligible_turns"] == 1
    assert _entry_map(duplicate)["address"]["evidence_count"] == 1
    assert "private-chat-trace-1" not in path.read_text(encoding="utf-8")
    assert len(duplicate["recent_interaction_fingerprints"]) == 1
    assert "recent_interaction_fingerprints" not in relationship_state.get_relationship_state_for_client(_config())["state"]

    assert relationship_state.record_relationship_interaction(
        _config(),
        "A genuinely new turn should count.",
        "It does.",
        interaction_id="private-chat-trace-2",
    ) is True
    assert relationship_state.load_relationship_state()["familiarity"]["eligible_turns"] == 2


def test_address_parser_rejects_questions_negations_and_conditionals(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[{"key": "address", "value": "Quinn"}],
    )

    for message in (
        "Don't call me Nova.",
        "Could you call me later?",
        "Why did you call me a liar?",
        "If you call me Nova, I will laugh.",
        "Call me when you are ready.",
        "别叫我小Q。",
    ):
        assert relationship_state.extract_explicit_relationship_preferences(message) == {}
        relationship_state.record_relationship_interaction(_config(), message, "Understood.")
        assert _entry_map(relationship_state.load_relationship_state())["address"]["value"] == "Quinn"

    relationship_state.record_relationship_interaction(
        _config(),
        "Please call me Nova.",
        "Of course.",
    )
    assert _entry_map(relationship_state.load_relationship_state())["address"]["value"] == "Nova"


def test_latest_explicit_correction_can_replace_a_manual_preference(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    saved = relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[{"key": "reply_length", "value": "concise"}],
    )
    assert saved["ok"] is True
    assert _entry_map(saved["state"])["reply_length"]["source"] == "manual"

    relationship_state.record_relationship_interaction(
        _config(),
        "Actually, please give me more detail.",
        "I can do that.",
    )

    entry = _entry_map(relationship_state.load_relationship_state())["reply_length"]
    assert entry["value"] == "detailed"
    assert entry["source"] == "explicit_user"
    assert entry["status"] == "active"


def test_explicit_relationship_forget_clears_only_the_named_preference(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[
            {"key": "address", "value": "Nova"},
            {"key": "teasing", "value": "gentle"},
        ],
    )

    relationship_state.record_relationship_interaction(
        _config(),
        "Forget that you should call me Nova.",
        "Okay, I will stop using that address.",
    )

    entries = _entry_map(relationship_state.load_relationship_state())
    assert "address" not in entries
    assert entries["teasing"]["value"] == "gentle"


def test_ambiguous_address_forget_does_not_remove_a_name_preference(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[{"key": "address", "value": "Nova"}],
    )

    relationship_state.record_relationship_interaction(
        _config(),
        "Forget that you should call me when the build finishes.",
        "Okay.",
    )

    assert _entry_map(relationship_state.load_relationship_state())["address"]["value"] == "Nova"


def test_update_rejects_unallowlisted_or_sensitive_values_without_mutating_state(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    initial = relationship_state.get_relationship_state_for_client(_config())["state"]

    rejected_key = relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[{"key": "desktop_access", "value": "enabled"}],
    )
    rejected_value = relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[{"key": "address", "value": "C:\\Users\\private"}],
    )

    assert rejected_key["ok"] is False
    assert rejected_value["ok"] is False
    assert relationship_state.get_relationship_state_for_client(_config())["state"] == initial


def test_prompt_is_bounded_transcript_free_and_pausing_removes_it(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[
            {"key": "address", "value": "小Q"},
            {"key": "advice_style", "value": "ask_first"},
            {"key": "teasing", "value": "gentle"},
        ],
    )
    relationship_state.record_relationship_interaction(
        _config(),
        "Here is a private sentence that must not be placed in the prompt.",
        "Understood.",
    )

    prompt = relationship_state.build_relationship_state_prompt_block(_config())
    assert "Relationship continuity" in prompt
    assert "小Q" in prompt
    assert "ask whether advice is wanted" in prompt
    assert "private sentence" not in prompt
    assert "current user message" in prompt

    paused = relationship_state.update_relationship_state(
        _config(), action="set_enabled", enabled=False
    )
    assert paused["ok"] is True
    assert relationship_state.build_relationship_state_prompt_block(_config()) == ""
    assert relationship_state.get_relationship_state_for_client(_config())["state"]["enabled"] is False


def test_reset_only_clears_relationship_state_and_feature_disabled_fails_closed(monkeypatch, tmp_path):
    path = tmp_path / "relationship_state.json"
    unrelated = tmp_path / "memory_core.json"
    unrelated.write_text('{"important": "keep"}', encoding="utf-8")
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", path)
    relationship_state.record_relationship_interaction(_config(), "Be direct.", "Okay.")

    reset = relationship_state.update_relationship_state(_config(), action="reset")
    disabled = relationship_state.update_relationship_state(
        _config(False), action="upsert", entries=[{"key": "teasing", "value": "playful"}]
    )

    assert reset["ok"] is True
    assert reset["state"]["revision"] == 2
    assert reset["state"]["familiarity"]["eligible_turns"] == 0
    assert reset["state"]["entries"] == []
    assert unrelated.read_text(encoding="utf-8") == '{"important": "keep"}'
    assert disabled["ok"] is False
    assert disabled["available"] is False


def test_model_direct_prompt_uses_structured_state_and_suppresses_legacy_summary(monkeypatch, tmp_path):
    monkeypatch.setattr(relationship_state, "RELATIONSHIP_STATE_PATH", tmp_path / "relationship_state.json")
    relationship_state.update_relationship_state(
        _config(),
        action="upsert",
        entries=[{"key": "advice_style", "value": "ask_first"}],
    )
    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg["assistant_prompt"] = "Base prompt."
    cfg["llm"] = {"provider": "openai"}
    cfg["character_runtime"]["model_direct_reply"] = True
    cfg["relationship_state"]["enabled"] = True
    monkeypatch.setattr(app, "build_manual_persona_card_block", lambda: "")
    monkeypatch.setattr(app, "build_wakeup_summary_block", lambda: "")
    monkeypatch.setattr(app, "build_persona_memory_block", lambda: "")
    monkeypatch.setattr(app, "build_relationship_memory_block", lambda: "LEGACY RELATIONSHIP SUMMARY")
    monkeypatch.setattr(app, "build_memory_prompt_block", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(
        app,
        "build_prompt_with_history_summary",
        lambda *, history, base_prompt, **_kwargs: (base_prompt, history),
    )

    prompt, _ = app._build_base_prompt(cfg, "Give me a thought.", [], cfg["llm"], "openai")

    assert "Relationship continuity" in prompt
    assert "ask whether advice is wanted" in prompt
    assert "LEGACY RELATIONSHIP SUMMARY" not in prompt
