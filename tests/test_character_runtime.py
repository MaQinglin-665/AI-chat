from character_runtime import (
    CharacterRuntime,
    build_backend_entry_guard_contract,
    build_backend_entry_preview_request_schema,
    emotion_to_live2d_hint,
    evaluate_backend_entry_guard,
    normalize_runtime_payload,
    preview_backend_entry_noop_adapter,
    preview_backend_entry_request,
)


def test_runtime_initial_snapshot():
    runtime = CharacterRuntime()
    snap = runtime.snapshot()
    assert snap["phase"] == "idle"
    assert snap["emotion"] == "neutral"
    assert snap["pending_events"] == 0
    assert snap["low_interruption"] is True
    assert snap["proactive_enabled"] is False
    assert snap["proactive_block_reason"] == "proactive_disabled"


def test_backend_entry_guard_contract_is_read_only_and_fail_closed():
    contract = build_backend_entry_guard_contract()
    assert contract["read_only"] is True
    assert contract["fail_closed"] is True
    assert "explicit_enable_flag" in contract["required_checks"]
    assert "emit_runtime_cue" in contract["disallowed_actions"]
    assert "move_live2d" in contract["disallowed_actions"]
    assert "play_tts" in contract["disallowed_actions"]
    assert contract["operator_confirmation"] == "required_in_later_implementation_task"


def test_backend_entry_preview_schema_is_narrow_and_read_only():
    schema = build_backend_entry_preview_request_schema()
    assert schema["read_only"] is True
    assert schema["fail_closed"] is True
    assert schema["allowed_fields"] == ["type", "action"]
    assert schema["allowed_types"] == ["automatic_character_runtime"]
    assert schema["allowed_actions"] == ["none", "emit_runtime_cue"]
    assert schema["unknown_fields"] == "ignored_and_reported"


def test_backend_entry_guard_evaluator_keeps_skeleton_not_ready():
    guard = evaluate_backend_entry_guard(configured_enabled=True)
    assert guard["read_only"] is True
    assert guard["fail_closed"] is True
    assert guard["entry_ready"] is False
    assert guard["blocked_reasons"] == [
        "backend_entry_not_wired",
        "automatic_runtime_disconnected",
        "scheduler_default_unchanged",
        "config_write_disabled",
        "runtime_cue_disabled",
    ]
    assert guard["runtime_states"] == {
        "configured_enabled": True,
        "backend_entry_wired": False,
        "automatic_runtime_connected": False,
        "scheduler_default_changed": False,
        "config_write_enabled": False,
        "runtime_cue_enabled": False,
        "live2d_enabled": False,
        "tts_enabled": False,
    }


def test_backend_entry_request_preview_never_executes_in_skeleton():
    guard = evaluate_backend_entry_guard(configured_enabled=True)
    preview = preview_backend_entry_request(
        {"type": "automatic_character_runtime", "action": "emit_runtime_cue"},
        guard=guard,
    )
    assert preview["read_only"] is True
    assert preview["dry_run"] is True
    assert preview["accepted"] is False
    assert preview["would_execute"] is False
    assert preview["request_schema"]["allowed_fields"] == ["type", "action"]
    assert preview["request_type"] == "automatic_character_runtime"
    assert preview["requested_action"] == "emit_runtime_cue"
    assert preview["ignored_fields"] == []
    assert preview["validation_errors"] == []
    assert preview["guard_entry_ready"] is False
    assert "backend_entry_not_wired" in preview["blocked_reasons"]
    assert "runtime_cue_disabled" in preview["blocked_reasons"]


def test_backend_entry_request_preview_ignores_unknown_fields():
    preview = preview_backend_entry_request(
        {
            "type": "desktop_observation",
            "action": "read_files",
            "path": "C:/Users",
            "tool_call": {"name": "shell"},
        },
    )
    assert preview["accepted"] is False
    assert preview["would_execute"] is False
    assert preview["request_type"] == "desktop_observation"
    assert preview["requested_action"] == "read_files"
    assert preview["ignored_fields"] == ["path", "tool_call"]
    assert preview["validation_errors"] == [
        "unsupported_request_type",
        "unsupported_requested_action",
        "ignored_unknown_fields",
    ]


def test_backend_entry_noop_adapter_never_dispatches():
    guard = evaluate_backend_entry_guard(configured_enabled=True)
    adapter = preview_backend_entry_noop_adapter(
        {"type": "automatic_character_runtime", "action": "emit_runtime_cue"},
        guard=guard,
    )
    assert adapter["read_only"] is True
    assert adapter["noop"] is True
    assert adapter["adapter_ready"] is False
    assert adapter["default_off"] is True
    assert adapter["accepted"] is False
    assert adapter["would_execute"] is False
    assert adapter["executed"] is False
    assert adapter["dispatched"] is False
    assert adapter["dispatch_target"] == "none"
    assert adapter["request_preview"]["requested_action"] == "emit_runtime_cue"
    assert adapter["side_effects"] == {
        "config_written": False,
        "automatic_runtime_connected": False,
        "scheduler_default_changed": False,
        "runtime_cue_emitted": False,
        "live2d_moved": False,
        "tts_played": False,
        "polling_started": False,
        "followup_executed": False,
        "desktop_observed": False,
        "screenshot_captured": False,
        "files_read": False,
        "shell_executed": False,
        "tools_called": False,
    }


def test_normalize_payload_with_plain_text():
    payload = normalize_runtime_payload("hello runtime")
    assert payload["text"] == "hello runtime"
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_normalize_payload_with_json_string():
    payload = normalize_runtime_payload('{"text":"hi","emotion":"happy","voice_style":"warm"}')
    assert payload["text"] == "hi"
    assert payload["emotion"] == "happy"
    assert payload["voice_style"] == "warm"


def test_normalize_payload_with_dict():
    payload = normalize_runtime_payload({"text": "dict input", "emotion": "sad", "voice_style": "soft"})
    assert payload["text"] == "dict input"
    assert payload["emotion"] == "sad"
    assert payload["voice_style"] == "soft"


def test_normalize_payload_fills_missing_fields():
    payload = normalize_runtime_payload({"text": "only text"})
    assert payload["text"] == "only text"
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_unknown_emotion_falls_back_to_neutral():
    payload = normalize_runtime_payload({"text": "x", "emotion": "mysterious"})
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_malformed_json_fallback_is_safe_text():
    payload = normalize_runtime_payload('{"text":"broken"')
    assert payload["text"] == "broken"
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_empty_text_wrapper_fragment_is_not_visible_reply():
    payload = normalize_runtime_payload('{"text":')
    assert payload["text"] == ""
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_plain_text_with_runtime_metadata_suffix_is_cleaned():
    payload = normalize_runtime_payload(
        "Got it! Feeling peppy after your lunch break?\n"
        "emotion: happy\n"
        "action: nod\n"
        "voice_style: cheerful"
    )

    assert payload["text"] == "Got it! Feeling peppy after your lunch break?"
    assert payload["emotion"] == "happy"
    assert payload["action"] == "nod"
    assert payload["voice_style"] == "cheerful"


def test_plain_text_with_json_like_runtime_metadata_suffix_is_cleaned():
    payload = normalize_runtime_payload(
        'Nice, I can do that.\n'
        '{"emotion": "happy", "action": "wave", "intensity": "normal", "voice_style": "cheerful"}'
    )

    assert payload["text"] == "Nice, I can do that."
    assert payload["emotion"] == "happy"
    assert payload["action"] == "wave"
    assert payload["intensity"] == "normal"
    assert payload["voice_style"] == "cheerful"


def test_plain_text_with_partial_json_like_runtime_metadata_suffix_is_cleaned():
    payload = normalize_runtime_payload('Nice, I can do that.\n{"emotion"')

    assert payload["text"] == "Nice, I can do that."
    assert payload["emotion"] == "neutral"
    assert payload["action"] == "none"


def test_plain_text_trailing_runtime_keyword_is_not_stripped():
    payload = normalize_runtime_payload("Let's name the feeling emotion")

    assert payload["text"] == "Let's name the feeling emotion"
    assert payload["emotion"] == "neutral"


def test_plain_text_with_partial_runtime_metadata_suffix_is_cleaned():
    payload = normalize_runtime_payload(
        "Ah, you're still going strong. Take a quick stretch if you can.\n"
        "emotion: thinking action:"
    )

    assert payload["text"] == "Ah, you're still going strong. Take a quick stretch if you can."
    assert payload["emotion"] == "thinking"
    assert payload["action"] == "none"


def test_empty_input_fallback_is_safe_defaults():
    payload = normalize_runtime_payload("")
    assert payload == {
        "text": "",
        "emotion": "neutral",
        "action": "none",
        "intensity": "normal",
        "voice_style": "neutral",
    }


def test_contract_emotions_are_supported_and_not_forced_to_neutral():
    payload = normalize_runtime_payload(
        {"text": "ok", "emotion": "surprised", "action": "surprised", "intensity": "high"}
    )
    assert payload["emotion"] == "surprised"
    assert payload["action"] == "surprised"
    assert payload["intensity"] == "high"

    payload = normalize_runtime_payload({"text": "ok", "emotion": "annoyed", "action": "shake_head"})
    assert payload["emotion"] == "annoyed"
    assert payload["action"] == "shake_head"

    payload = normalize_runtime_payload({"text": "ok", "emotion": "thinking", "action": "think"})
    assert payload["emotion"] == "thinking"
    assert payload["action"] == "think"


def test_runtime_action_and_intensity_fallbacks_are_safe():
    payload = normalize_runtime_payload({"text": "ok", "emotion": "happy", "action": "missing", "intensity": "x"})
    assert payload["action"] == "none"
    assert payload["intensity"] == "normal"


def test_runtime_action_alias_thinking_normalizes_to_think():
    payload = normalize_runtime_payload({"text": "ok", "emotion": "thinking", "action": "thinking"})
    assert payload["action"] == "think"


def test_runtime_payload_uses_message_or_content_when_text_missing():
    payload = normalize_runtime_payload({"message": "message fallback", "emotion": "happy"})
    assert payload["text"] == "message fallback"

    payload = normalize_runtime_payload({"content": [{"text": "nested content"}], "emotion": "happy"})
    assert payload["text"] == "nested content"


def test_emotion_to_live2d_hint_mapping():
    assert emotion_to_live2d_hint("happy") == "smile_soft"
    assert emotion_to_live2d_hint("sad") == "eyes_down"
    assert emotion_to_live2d_hint("unknown") == "idle_relaxed"


def test_user_and_reply_transition_emit_directives():
    runtime = CharacterRuntime()

    runtime.enqueue("user_message", {"text": "hello"}, source="chat")
    directives = runtime.run_once()
    assert directives
    assert directives[0].channel == "motion"
    assert directives[0].name == "listen_ack"
    assert runtime.snapshot()["phase"] == "thinking"

    runtime.enqueue("assistant_reply", {"text": "hi", "emotion": "happy"}, source="llm")
    directives = runtime.run_once()
    assert [d.channel for d in directives] == ["voice", "motion"]
    assert directives[1].payload["live2d_hint"] == "smile_soft"
    snap = runtime.snapshot()
    assert snap["phase"] == "speaking"
    assert snap["emotion"] == "happy"
    assert snap["voice_style"] == "happy"


def test_tts_finished_sets_cooldown():
    now = {"t": 100.0}
    runtime = CharacterRuntime(clock=lambda: now["t"], proactive_cooldown_sec=30.0)

    runtime.enqueue("tts_finished")
    directives = runtime.run_once()
    assert directives and directives[0].name == "return_idle"

    snap = runtime.snapshot()
    assert snap["phase"] == "idle"
    assert snap["last_spoken_at"] == 100.0
    assert snap["next_proactive_at"] == 130.0


def test_low_interruption_blocks_proactive_tick():
    now = {"t": 0.0}
    runtime = CharacterRuntime(clock=lambda: now["t"], low_interruption=True, proactive_enabled=True)
    directives = runtime.run_once()
    assert directives == []
    assert runtime.snapshot()["proactive_block_reason"] == "low_interruption_enabled"


def test_proactive_tick_requires_explicit_enable_switch():
    now = {"t": 10.0}
    runtime = CharacterRuntime(clock=lambda: now["t"], low_interruption=False)
    directives = runtime.run_once()
    assert directives == []
    assert runtime.snapshot()["proactive_block_reason"] == "proactive_disabled"


def test_proactive_tick_with_cooldown_when_low_interruption_off():
    now = {"t": 10.0}
    runtime = CharacterRuntime(
        clock=lambda: now["t"],
        low_interruption=False,
        proactive_enabled=True,
        proactive_cooldown_sec=20.0,
    )

    directives = runtime.run_once()
    assert len(directives) == 1
    assert directives[0].channel == "initiative"
    assert directives[0].name == "proactive_checkin"

    # Before cooldown elapsed, no repeated proactive trigger.
    now["t"] = 25.0
    assert runtime.run_once() == []
    assert runtime.snapshot()["proactive_block_reason"] == "cooldown_active"

    # After cooldown elapsed, proactive can trigger again.
    now["t"] = 31.0
    directives = runtime.run_once()
    assert len(directives) == 1
    assert directives[0].name == "proactive_checkin"


def test_recent_user_activity_blocks_proactive_tick_until_idle_window():
    now = {"t": 100.0}
    runtime = CharacterRuntime(
        clock=lambda: now["t"],
        low_interruption=False,
        proactive_enabled=True,
        proactive_cooldown_sec=5.0,
        proactive_user_idle_sec=30.0,
    )

    runtime.enqueue("user_message", {"text": "hello"}, source="chat")
    runtime.run_once()
    assert runtime.snapshot()["last_user_at"] == 100.0

    now["t"] = 120.0
    assert runtime.run_once() == []
    assert runtime.snapshot()["proactive_block_reason"] == "phase_not_idle"

    runtime.enqueue("tts_finished")
    runtime.run_once()
    now["t"] = 126.0
    assert runtime.run_once() == []
    assert runtime.snapshot()["proactive_block_reason"] == "recent_user_activity"

    now["t"] = 131.0
    directives = runtime.run_once()
    assert len(directives) == 1
    assert directives[0].name == "proactive_checkin"


def test_recent_assistant_activity_blocks_proactive_tick_after_cooldown():
    now = {"t": 200.0}
    runtime = CharacterRuntime(
        clock=lambda: now["t"],
        low_interruption=False,
        proactive_enabled=True,
        proactive_cooldown_sec=5.0,
        proactive_user_idle_sec=5.0,
        proactive_assistant_idle_sec=30.0,
    )

    runtime.enqueue("assistant_reply", {"text": "hi"}, source="llm")
    runtime.run_once()
    runtime.enqueue("tts_finished")
    runtime.run_once()

    now["t"] = 206.0
    assert runtime.run_once() == []
    assert runtime.snapshot()["proactive_block_reason"] == "recent_assistant_activity"

    now["t"] = 231.0
    directives = runtime.run_once()
    assert len(directives) == 1
    assert directives[0].payload["reason"] == "cooldown_elapsed"
