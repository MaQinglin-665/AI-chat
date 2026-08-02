from http import HTTPStatus

from app_chat_route import PRE_FINALIZED_STREAM_SENTINEL, _build_chat_config, handle_chat_route
from app_delivered_turn import DeliveredTurnRegistry
from companion_turn_contract import build_companion_turn


RECEIPT_CAPABILITY = {"client_capabilities": {"delivered_turn_receipt_v1": True}}


def test_auto_awareness_opt_in_stays_private_to_resolved_chat_config():
    resolved = _build_chat_config(
        {
            "auto": True,
            "natural_participation": True,
        },
        {"natural_conversation": {"enabled": True}},
        "private proactive prompt",
        sanitize_input_modality_func=lambda _value, is_auto=False: "auto" if is_auto else "text",
        clean_experience_text_func=lambda value, limit: str(value or "")[:limit],
        sanitize_character_experience_profile_func=lambda _value: None,
        sanitize_auto_thought_burst_func=lambda _value: None,
        sanitize_conversation_context_func=lambda _value, _message: None,
    )

    assert resolved["_input_modality"] == "auto"
    assert resolved["_natural_participation"] is True


class RouteRecorder:
    def __init__(self):
        self.json = []
        self.sse = []
        self.sse_started = []
        self.perf = []
        self.exceptions = []
        self.remembered = []
        self.sessions = []
        self.staged = []
        self.now = 100

    def send_json(self, data, status=HTTPStatus.OK, extra_headers=None):
        self.json.append(
            {
                "data": data,
                "status": status,
                "headers": extra_headers,
            }
        )

    def begin_sse(self, perf_trace_id):
        self.sse_started.append(perf_trace_id)

    def send_sse(self, data):
        self.sse.append(data)

    def log_perf(self, *args, **kwargs):
        self.perf.append((args, kwargs))

    def log_exception(self, *args, **kwargs):
        self.exceptions.append((args, kwargs))

    def perf_now(self):
        self.now += 5
        return self.now

    def remember(self, config, user_message, reply, is_auto=False, interaction_id=""):
        self.remembered.append(
            {
                "config": config,
                "user_message": user_message,
                "reply": reply,
                "is_auto": is_auto,
                "interaction_id": interaction_id,
            }
        )

    def update_session(self, config, user_message, history, assistant_reply=""):
        self.sessions.append(
            {
                "config": config,
                "user_message": user_message,
                "history": history,
                "assistant_reply": assistant_reply,
            }
        )

    def stage_delivery(self, commit):
        self.staged.append(commit)
        return f"delivery_receipt_{len(self.staged):016d}"

    def commit_latest_delivery(self):
        self.staged[-1]()


def _deps(recorder, **overrides):
    deps = {
        "send_json_func": recorder.send_json,
        "begin_sse_func": recorder.begin_sse,
        "send_sse_func": recorder.send_sse,
        "load_config_func": lambda: {"llm": {"provider": "openai"}},
        "sanitize_input_modality_func": lambda value, is_auto=False: "auto" if is_auto else (value or "text"),
        "clean_experience_text_func": lambda value, _limit: str(value or "").strip(),
        "sanitize_character_experience_profile_func": lambda value: value if isinstance(value, dict) else None,
        "sanitize_auto_thought_burst_func": lambda value: value if isinstance(value, dict) else {},
        "sanitize_conversation_context_func": lambda value, _message: value if isinstance(value, dict) else None,
        "ensure_character_brain_decision_func": lambda config, *_args, **_kwargs: config,
        "call_llm_func": lambda *_args, **_kwargs: "reply",
        "call_llm_stream_func": lambda *_args, **_kwargs: iter(["stream reply"]),
        "finalize_assistant_reply_func": lambda _config, _llm_cfg, _provider, _message, _history, reply, is_auto=False: reply,
        "apply_demo_stable_identity_fallback_func": lambda _config, _message, reply: reply,
        "apply_character_runtime_reply_func": lambda _config, reply: (reply, None),
        "apply_character_brain_reply_text_func": lambda _config, _message, reply: reply,
        "build_companion_turn_func": build_companion_turn,
        "remember_interaction_func": recorder.remember,
        "update_character_brain_session_state_func": recorder.update_session,
        "stage_delivered_turn_func": recorder.stage_delivery,
        "acknowledge_delivered_turn_func": lambda _delivery_id: {"ok": False, "status": "unknown"},
        "build_character_brain_response_payload_func": lambda _config: None,
        "get_history_summary_settings_func": lambda _config: {"keep_recent_messages": 8},
        "sanitize_history_func": lambda history, max_items=8: list(history)[-max_items:],
        "diagnose_llm_exception_func": lambda exc, _llm_cfg: exc,
        "log_backend_exception_func": recorder.log_exception,
        "log_backend_perf_func": recorder.log_perf,
        "diagnostic_payload_func": lambda exc: {"error": str(exc)},
        "perf_now_ms_func": recorder.perf_now,
    }
    deps.update(overrides)
    return deps


def _handle(path, body, recorder, **overrides):
    handle_chat_route(
        path,
        body,
        perf_trace_id="chat_test",
        perf_started_ms=100,
        client_to_server_ms=3,
        perf_headers={"X-Perf-Trace-Id": "chat_test"},
        **_deps(recorder, **overrides),
    )


def test_handle_chat_route_rejects_empty_message():
    recorder = RouteRecorder()

    _handle("/api/chat", {"message": "   "}, recorder)

    assert recorder.json[-1]["status"] == HTTPStatus.BAD_REQUEST
    assert recorder.json[-1]["data"] == {"error": "message cannot be empty."}
    assert recorder.json[-1]["headers"] == {"X-Perf-Trace-Id": "chat_test"}
    assert recorder.remembered == []


def test_handle_chat_route_rejects_non_string_image_data_url():
    recorder = RouteRecorder()

    _handle("/api/chat", {"message": "hello", "image_data_url": 123}, recorder)

    assert recorder.json[-1]["status"] == HTTPStatus.BAD_REQUEST
    assert recorder.json[-1]["data"] == {"error": "image_data_url must be a string."}
    assert recorder.remembered == []


def test_handle_chat_route_returns_direct_reply_with_runtime_and_brain_payload():
    recorder = RouteRecorder()

    def ensure_brain(config, user_message, history, is_auto=False):
        assert user_message == "hello"
        assert history == [{"role": "user", "content": "hi"}]
        updated = dict(config)
        updated["_brain_payload"] = {"intent": "answer"}
        return updated

    def call_llm(user_message, history, image_data_url="", is_auto=False, force_tools=False, config=None):
        assert user_message == "hello"
        assert history == [{"role": "user", "content": "hi"}]
        assert image_data_url == ""
        assert is_auto is False
        assert force_tools is True
        assert config["_input_modality"] == "text"
        return "base reply"

    _handle(
        "/api/chat",
        {
            "message": "hello",
            "history": [{"role": "user", "content": "hi"}],
            "force_tools": True,
            **RECEIPT_CAPABILITY,
        },
        recorder,
        ensure_character_brain_decision_func=ensure_brain,
        call_llm_func=call_llm,
        apply_character_runtime_reply_func=lambda _config, reply: (f"{reply} runtime", {"emotion": "happy"}),
        apply_character_brain_reply_text_func=lambda _config, _message, reply: f"{reply} brain",
        build_character_brain_response_payload_func=lambda config: config.get("_brain_payload"),
    )

    assert recorder.json[-1]["status"] == HTTPStatus.OK
    assert recorder.json[-1]["headers"] == {"X-Perf-Trace-Id": "chat_test"}
    assert recorder.json[-1]["data"] == {
        "reply": "base reply runtime brain",
        "character_runtime": {"emotion": "happy"},
        "character_brain": {"intent": "answer"},
        "delivery_id": "delivery_receipt_0000000000000001",
    }
    assert recorder.remembered == []
    assert recorder.sessions == []
    recorder.commit_latest_delivery()
    assert recorder.remembered[-1]["reply"] == "base reply runtime brain"
    assert recorder.remembered[-1]["interaction_id"] == "chat_test"
    assert recorder.sessions[-1]["assistant_reply"] == "base reply runtime brain"
    assert any(kwargs.get("stage") == "request_received" for _args, kwargs in recorder.perf)
    assert any(kwargs.get("stage") == "response_sent" for _args, kwargs in recorder.perf)


def test_legacy_chat_client_keeps_immediate_persistence_without_a_receipt():
    recorder = RouteRecorder()

    _handle("/api/chat", {"message": "hello"}, recorder)

    payload = recorder.json[-1]["data"]
    assert "delivery_id" not in payload
    assert recorder.staged == []
    assert recorder.remembered[-1]["reply"] == "reply"
    assert recorder.sessions[-1]["assistant_reply"] == "reply"


def test_receipt_commit_does_not_advance_session_when_memory_commit_fails():
    recorder = RouteRecorder()

    def fail_remember(*_args, **_kwargs):
        raise RuntimeError("memory write failed")

    _handle(
        "/api/chat",
        {"message": "hello", **RECEIPT_CAPABILITY},
        recorder,
        remember_interaction_func=fail_remember,
    )

    assert len(recorder.staged) == 1
    try:
        recorder.commit_latest_delivery()
    except RuntimeError as exc:
        assert str(exc) == "memory write failed"
    else:
        raise AssertionError("receipt commit must surface a synchronous memory failure")
    assert recorder.sessions == []


def test_receipt_reports_session_failure_without_replaying_memory_side_effects():
    recorder = RouteRecorder()
    registry = DeliveredTurnRegistry(
        token_func=lambda _size: "delivery_receipt_0123456789session",
    )

    def fail_session(*_args, **_kwargs):
        raise RuntimeError("session update failed")

    _handle(
        "/api/chat",
        {"message": "hello", **RECEIPT_CAPABILITY},
        recorder,
        stage_delivered_turn_func=registry.stage,
        update_character_brain_session_state_func=fail_session,
    )

    delivery_id = recorder.json[-1]["data"]["delivery_id"]
    assert registry.acknowledge(delivery_id) == {"ok": False, "status": "commit_failed"}
    assert [item["reply"] for item in recorder.remembered] == ["reply"]
    assert registry.acknowledge(delivery_id) == {"ok": False, "status": "commit_failed"}
    assert [item["reply"] for item in recorder.remembered] == ["reply"]


def test_receipt_aware_request_acknowledges_pending_turns_before_planning():
    recorder = RouteRecorder()
    calls = []

    def acknowledge(delivery_id):
        calls.append(delivery_id)
        return {"ok": True, "status": "committed"}

    def ensure(config, *_args, **_kwargs):
        assert calls == ["delivery_receipt_0123456789prior"]
        return config

    _handle(
        "/api/chat",
        {
            "message": "continue",
            "pending_delivery_ids": ["delivery_receipt_0123456789prior"],
            **RECEIPT_CAPABILITY,
        },
        recorder,
        acknowledge_delivered_turn_func=acknowledge,
        ensure_character_brain_decision_func=ensure,
    )

    assert calls == ["delivery_receipt_0123456789prior"]


def test_delivered_turn_stays_uncommitted_when_terminal_json_write_fails():
    recorder = RouteRecorder()
    writes = []

    def fail_first_terminal_write(data, status=HTTPStatus.OK, extra_headers=None):
        writes.append({"data": data, "status": status, "headers": extra_headers})
        if len(writes) == 1:
            raise BrokenPipeError("renderer disconnected")

    _handle(
        "/api/chat",
        {"message": "hello", **RECEIPT_CAPABILITY},
        recorder,
        send_json_func=fail_first_terminal_write,
    )

    assert len(recorder.staged) == 1
    assert recorder.remembered == []
    assert recorder.sessions == []
    assert writes[-1]["status"] == HTTPStatus.INTERNAL_SERVER_ERROR


def test_delivered_turn_stays_uncommitted_when_terminal_sse_write_fails():
    recorder = RouteRecorder()

    def fail_done_event(data):
        if data.get("type") == "done":
            raise BrokenPipeError("renderer disconnected")
        recorder.send_sse(data)

    _handle(
        "/api/chat_stream",
        {"message": "hello", **RECEIPT_CAPABILITY},
        recorder,
        call_llm_stream_func=lambda *_args, **_kwargs: iter(["stream reply"]),
        send_sse_func=fail_done_event,
    )

    assert len(recorder.staged) == 1
    assert recorder.remembered == []
    assert recorder.sessions == []
    assert recorder.sse[-1]["type"] == "error"


def test_delivered_turn_commit_uses_current_session_not_request_snapshot():
    recorder = RouteRecorder()
    cfg = {
        "llm": {"provider": "openai"},
        "_character_brain_decision": {"intent": "casual"},
        "_character_brain_session_state": {"turns": 3},
    }

    _handle("/api/chat", {"message": "hello", **RECEIPT_CAPABILITY}, recorder, load_config_func=lambda: cfg)

    assert recorder.sessions == []
    recorder.commit_latest_delivery()
    assert "_character_brain_session_state" not in recorder.sessions[-1]["config"]


def test_handle_chat_route_drops_only_the_duplicate_current_user_history_item():
    recorder = RouteRecorder()
    observed = {}

    def ensure_brain(config, user_message, history, is_auto=False):
        observed["brain_history"] = history
        return config

    def call_llm(user_message, history, **_kwargs):
        observed["llm_history"] = history
        return "reply"

    _handle(
        "/api/chat",
        {
            "message": "continue",
            "history": [
                {"role": "assistant", "content": "We were fixing the voice pause lease."},
                {"role": "user", "content": "continue"},
            ],
            **RECEIPT_CAPABILITY,
        },
        recorder,
        ensure_character_brain_decision_func=ensure_brain,
        call_llm_func=call_llm,
    )

    expected = [{"role": "assistant", "content": "We were fixing the voice pause lease."}]
    assert observed["brain_history"] == expected
    assert observed["llm_history"] == expected
    assert recorder.sessions == []
    recorder.commit_latest_delivery()
    assert recorder.sessions[-1]["history"] == expected


def test_handle_chat_stream_sends_delta_and_done_events():
    recorder = RouteRecorder()
    finalized = {}

    def finalize(_config, _llm_cfg, provider, user_message, history, reply, is_auto=False):
        finalized["provider"] = provider
        finalized["user_message"] = user_message
        finalized["history"] = history
        finalized["is_auto"] = is_auto
        return f"{reply}!"

    _handle(
        "/api/chat_stream",
        {
            "message": "hello",
            "history": [
                {"role": "user", "content": "old"},
                {"role": "assistant", "content": "recent"},
            ],
            "auto": True,
            **RECEIPT_CAPABILITY,
        },
        recorder,
        call_llm_stream_func=lambda *_args, **_kwargs: iter(["hel", "", "lo"]),
        finalize_assistant_reply_func=finalize,
        get_history_summary_settings_func=lambda _config: {"keep_recent_messages": 1},
        apply_character_runtime_reply_func=lambda _config, reply: (reply, {"action": "wave"}),
        build_character_brain_response_payload_func=lambda _config: {"intent": "stream"},
    )

    assert recorder.sse_started == ["chat_test"]
    assert recorder.sse[:2] == [
        {"type": "delta", "text": "hel"},
        {"type": "delta", "text": "lo"},
    ]
    assert recorder.sse[-1] == {
        "type": "done",
        "reply": "hello!",
        "character_runtime": {"action": "wave"},
        "character_brain": {"intent": "stream"},
        "delivery_id": "delivery_receipt_0000000000000001",
    }
    assert finalized == {
        "provider": "openai",
        "user_message": "hello",
        "history": [{"role": "assistant", "content": "recent"}],
        "is_auto": True,
    }
    assert recorder.remembered == []
    assert recorder.sessions == []
    recorder.commit_latest_delivery()
    assert recorder.remembered[-1]["reply"] == "hello!"
    assert recorder.remembered[-1]["is_auto"] is True
    assert recorder.remembered[-1]["interaction_id"] == "chat_test"
    assert recorder.sessions[-1]["assistant_reply"] == "hello!"


def test_handle_chat_stream_skips_finalize_after_pre_finalized_sentinel():
    recorder = RouteRecorder()
    finalized = []

    _handle(
        "/api/chat_stream",
        {"message": "hello", **RECEIPT_CAPABILITY},
        recorder,
        call_llm_stream_func=lambda *_args, **_kwargs: iter(
            [PRE_FINALIZED_STREAM_SENTINEL, "already final"]
        ),
        finalize_assistant_reply_func=lambda *_args, **_kwargs: finalized.append(True),
    )

    assert finalized == []
    assert recorder.sse[-1] == {
        "type": "done",
        "reply": "already final",
        "delivery_id": "delivery_receipt_0000000000000001",
    }
    response_events = [kwargs for _args, kwargs in recorder.perf if kwargs.get("stage") == "response_sent"]
    assert response_events[-1]["pre_finalized"] is True


def test_model_direct_reply_keeps_text_and_adds_turn_without_legacy_metadata():
    recorder = RouteRecorder()
    cfg = {
        "llm": {"provider": "openai"},
        "character_runtime": {"model_direct_reply": True, "enabled": True},
        "companion_turn": {"enabled": True},
    }

    _handle(
        "/api/chat",
        {"message": "hello", **RECEIPT_CAPABILITY},
        recorder,
        load_config_func=lambda: cfg,
        call_llm_func=lambda *_args, **_kwargs: "  Let me think for a second.  ",
        apply_demo_stable_identity_fallback_func=lambda *_args, **_kwargs: "demo rewrite",
        apply_character_runtime_reply_func=lambda *_args, **_kwargs: ("runtime rewrite", {"emotion": "happy"}),
        apply_character_brain_reply_text_func=lambda *_args, **_kwargs: "brain rewrite",
        build_character_brain_response_payload_func=lambda *_args, **_kwargs: {"intent": "hidden"},
    )

    payload = recorder.json[-1]["data"]
    assert payload["reply"] == "  Let me think for a second.  "
    assert payload["delivery_id"] == "delivery_receipt_0000000000000001"
    assert "character_runtime" not in payload
    assert "character_brain" not in payload
    turn = payload["turn"]
    assert {key: turn[key] for key in (
        "version",
        "id",
        "reply_text",
        "spoken_text",
        "mode",
        "input_modality",
        "performance",
        "source",
    )} == {
        "version": 1,
        "id": "chat_test",
        "reply_text": "  Let me think for a second.  ",
        "spoken_text": "  Let me think for a second.  ",
        "mode": "reply",
        "input_modality": "text",
        "performance": {
            "emotion": "thinking",
            "action": "think",
            "intensity": "medium",
            "voice_style": "curious",
            "source": "model_director",
        },
        "source": "model_direct",
    }
    assert turn["performance_segments_version"] == 1
    assert len(turn["performance_segments"]) == 1
    assert turn["performance_segments"][0]["text"] == "Let me think for a second."
    assert turn["performance_segments"][0]["performance"]["emotion"] == "thinking"
    assert recorder.remembered == []
    assert recorder.sessions == []
    recorder.commit_latest_delivery()
    assert recorder.remembered[-1]["reply"] == "  Let me think for a second.  "
    assert recorder.sessions[-1]["assistant_reply"] == "  Let me think for a second.  "


def test_model_direct_stream_keeps_delta_done_and_turn_text_identical():
    recorder = RouteRecorder()
    cfg = {
        "llm": {"provider": "openai"},
        "character_runtime": {"model_direct_reply": True},
        "companion_turn": {"enabled": True},
    }

    _handle(
        "/api/chat_stream",
        {"message": "hello"},
        recorder,
        load_config_func=lambda: cfg,
        call_llm_stream_func=lambda *_args, **_kwargs: iter(["  model", " reply  "]),
        finalize_assistant_reply_func=lambda *_args, **_kwargs: "finalizer rewrite",
        apply_demo_stable_identity_fallback_func=lambda *_args, **_kwargs: "demo rewrite",
        apply_character_runtime_reply_func=lambda *_args, **_kwargs: ("runtime rewrite", {"emotion": "happy"}),
        apply_character_brain_reply_text_func=lambda *_args, **_kwargs: "brain rewrite",
        build_character_brain_response_payload_func=lambda *_args, **_kwargs: {"intent": "hidden"},
    )

    deltas = [event["text"] for event in recorder.sse if event.get("type") == "delta"]
    done = recorder.sse[-1]
    assert "".join(deltas) == "  model reply  "
    assert done["reply"] == "".join(deltas)
    assert done["turn"]["reply_text"] == done["reply"]
    assert done["turn"]["spoken_text"] == done["reply"]
    assert "character_runtime" not in done
    assert "character_brain" not in done


def test_handle_chat_stream_sends_error_event_on_llm_failure():
    recorder = RouteRecorder()

    def failing_stream(*_args, **_kwargs):
        raise RuntimeError("provider down")
        yield ""

    _handle(
        "/api/chat_stream",
        {"message": "hello"},
        recorder,
        call_llm_stream_func=failing_stream,
        diagnose_llm_exception_func=lambda exc, _llm_cfg: RuntimeError(f"diagnosed: {exc}"),
    )

    assert recorder.sse_started == ["chat_test"]
    assert recorder.sse[-1] == {
        "type": "error",
        "error": "diagnosed: provider down",
    }
    assert recorder.exceptions
    assert any(kwargs.get("stage") == "fail" for _args, kwargs in recorder.perf)


def test_natural_voice_silence_returns_decision_without_persisting_assistant():
    recorder = RouteRecorder()
    config = {
        "llm": {"provider": "openai"},
        "character_runtime": {"model_direct_reply": True},
        "natural_conversation": {
            "enabled": True,
            "voice_only": True,
            "allow_silence": True,
        },
    }

    _handle(
        "/api/chat",
        {
            "message": "我随便哼两句。",
            "input_modality": "voice",
            **RECEIPT_CAPABILITY,
        },
        recorder,
        load_config_func=lambda: config,
        call_llm_func=lambda *_args, **_kwargs: "[[TAFFY_SILENCE]]",
    )

    payload = recorder.json[-1]["data"]
    assert payload["reply"] == ""
    assert payload["conversation_decision"]["mode"] == "silence"
    assert "delivery_id" not in payload
    assert recorder.remembered == []
    assert recorder.sessions == []
    assert recorder.staged == []


def test_natural_voice_stream_buffers_and_strips_private_reply_control():
    recorder = RouteRecorder()
    config = {
        "llm": {"provider": "openai"},
        "character_runtime": {"model_direct_reply": True},
        "natural_conversation": {
            "enabled": True,
            "voice_only": True,
            "quick_delay_ms": 200,
        },
    }

    _handle(
        "/api/chat_stream",
        {"message": "星语，你怎么看？", "input_modality": "voice"},
        recorder,
        load_config_func=lambda: config,
        call_llm_stream_func=lambda *_args, **_kwargs: iter(
            ["[[TAFFY_REPLY:quick]]", "我想了一下，可以试试。"]
        ),
    )

    deltas = [item["text"] for item in recorder.sse if item.get("type") == "delta"]
    done = next(item for item in recorder.sse if item.get("type") == "done")
    assert "".join(deltas) == "我想了一下，可以试试。"
    assert all("TAFFY_" not in item for item in deltas)
    assert done["reply"] == "我想了一下，可以试试。"
    assert done["conversation_decision"]["mode"] == "reply"
    assert done["conversation_decision"]["thinking_level"] == "quick"
