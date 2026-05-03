from app_translate_route import (
    build_translate_messages,
    handle_translate_request,
    resolve_translate_num_ctx,
    resolve_translate_timeout_sec,
)


def test_build_translate_messages_requests_simplified_chinese_only():
    messages = build_translate_messages("hello")

    assert messages[0]["role"] == "system"
    assert "Simplified Chinese" in messages[0]["content"]
    assert messages[1] == {"role": "user", "content": "hello"}


def test_resolve_translate_timeout_sec_defaults_and_clamps():
    assert resolve_translate_timeout_sec({}) == 45
    assert resolve_translate_timeout_sec({"translate_timeout_sec": "bad"}) == 45
    assert resolve_translate_timeout_sec({"translate_timeout_sec": 3}) == 10
    assert resolve_translate_timeout_sec({"translate_timeout_sec": 999}) == 120


def test_resolve_translate_num_ctx_defaults_and_clamps():
    assert resolve_translate_num_ctx({}) == 512
    assert resolve_translate_num_ctx({"translate_num_ctx": "bad"}) == 512
    assert resolve_translate_num_ctx({"translate_num_ctx": 128}) == 256
    assert resolve_translate_num_ctx({"translate_num_ctx": 9999}) == 2048


def test_handle_translate_request_rejects_empty_text():
    sent = {}

    handle_translate_request(
        {"text": "  "},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {},
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda *_args, **_kwargs: "unused",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["data"] == {"error": "text is empty"}


def test_handle_translate_request_returns_success_payload():
    sent = {}
    called = {}

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai",
                "model": "main-model",
                "translate_model": "translate-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda cfg, messages: called.update(
            {"cfg": cfg, "messages": messages}
        ) or "ni hao",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["data"]["translated"] == "ni hao"
    assert sent["data"]["translated_text"] == "ni hao"
    assert sent["data"]["degraded"] is False
    assert sent["data"]["fallback"] is False
    assert called["cfg"]["max_output_tokens"] == 96
    assert called["cfg"]["max_tokens"] == 96
    assert called["cfg"]["temperature"] == 0.1
    assert called["cfg"]["request_timeout"] == 45
    assert called["cfg"]["num_ctx"] == 512
    assert called["cfg"]["min_num_ctx"] == 512
    assert called["cfg"]["model"] == "translate-model"
    assert called["messages"] == build_translate_messages("hello")


def test_handle_translate_request_allows_translate_timeout_override():
    called = {}

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda _data, status=200: None,
        load_config_func=lambda: {
            "llm": {
                "provider": "openai",
                "translate_timeout_sec": 72,
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda cfg, _messages: called.update({"cfg": cfg}) or "你好",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert called["cfg"]["request_timeout"] == 72


def test_handle_translate_request_allows_translate_num_ctx_override():
    called = {}

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda _data, status=200: None,
        load_config_func=lambda: {
            "llm": {
                "provider": "ollama",
                "translate_num_ctx": 768,
            }
        },
        call_ollama_func=lambda cfg, _messages: called.update({"cfg": cfg}) or "你好",
        call_openai_compatible_func=lambda *_args, **_kwargs: "unused",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert called["cfg"]["num_ctx"] == 768
    assert called["cfg"]["min_num_ctx"] == 768


def test_handle_translate_request_logs_perf_events():
    sent = {}
    perf_events = []
    now_values = iter([1000, 1042, 1075])

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai",
                "model": "main-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda _cfg, _messages: "你好",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
        perf_trace_id="translate_test",
        perf_started_ms=900,
        client_to_server_ms=12,
        log_backend_perf_func=lambda *args, **kwargs: perf_events.append((args, kwargs)),
        perf_now_ms_func=lambda: next(now_values),
    )

    assert sent["data"]["translated"] == "你好"
    stages = [kwargs.get("stage") for _args, kwargs in perf_events]
    assert stages == ["request_received", "response_sent"]
    response = perf_events[-1][1]
    assert response["llm_ms"] == 42
    assert response["total_ms"] == 175
    assert response["provider"] == "openai"
    assert response["model"] == "main-model"
    assert response["text_chars"] == 5
    assert response["translated_chars"] == 2
    assert response["degraded"] is False
    assert response["num_ctx"] == 512


def test_handle_translate_request_falls_back_to_source_text_on_failure():
    sent = {}
    notices = []

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"llm": {"provider": "openai"}},
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("down")),
        diagnose_llm_exception_func=lambda exc, _cfg: RuntimeError(f"diagnosed: {exc}"),
        log_backend_notice_func=lambda *args, **kwargs: notices.append((args, kwargs)),
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["data"]["translated"] == "hello"
    assert sent["data"]["translated_text"] == "hello"
    assert sent["data"]["degraded"] is True
    assert sent["data"]["fallback"] is True
    assert "diagnosed" in sent["data"]["error"]
    assert notices
