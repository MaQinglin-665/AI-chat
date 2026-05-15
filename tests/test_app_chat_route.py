from http import HTTPStatus

from app_chat_route import PRE_FINALIZED_STREAM_SENTINEL, handle_chat_route


class RouteRecorder:
    def __init__(self):
        self.json = []
        self.sse = []
        self.sse_started = []
        self.perf = []
        self.exceptions = []
        self.remembered = []
        self.sessions = []
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

    def remember(self, config, user_message, reply, is_auto=False):
        self.remembered.append(
            {
                "config": config,
                "user_message": user_message,
                "reply": reply,
                "is_auto": is_auto,
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
        "remember_interaction_func": recorder.remember,
        "update_character_brain_session_state_func": recorder.update_session,
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
    }
    assert recorder.remembered[-1]["reply"] == "base reply runtime brain"
    assert recorder.sessions[-1]["assistant_reply"] == "base reply runtime brain"
    assert any(kwargs.get("stage") == "request_received" for _args, kwargs in recorder.perf)
    assert any(kwargs.get("stage") == "response_sent" for _args, kwargs in recorder.perf)


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
    }
    assert finalized == {
        "provider": "openai",
        "user_message": "hello",
        "history": [{"role": "assistant", "content": "recent"}],
        "is_auto": True,
    }
    assert recorder.remembered[-1]["reply"] == "hello!"
    assert recorder.remembered[-1]["is_auto"] is True
    assert recorder.sessions[-1]["assistant_reply"] == "hello!"


def test_handle_chat_stream_skips_finalize_after_pre_finalized_sentinel():
    recorder = RouteRecorder()
    finalized = []

    _handle(
        "/api/chat_stream",
        {"message": "hello"},
        recorder,
        call_llm_stream_func=lambda *_args, **_kwargs: iter(
            [PRE_FINALIZED_STREAM_SENTINEL, "already final"]
        ),
        finalize_assistant_reply_func=lambda *_args, **_kwargs: finalized.append(True),
    )

    assert finalized == []
    assert recorder.sse[-1] == {"type": "done", "reply": "already final"}
    response_events = [kwargs for _args, kwargs in recorder.perf if kwargs.get("stage") == "response_sent"]
    assert response_events[-1]["pre_finalized"] is True


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
