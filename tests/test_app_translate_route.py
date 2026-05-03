from app_translate_route import (
    TRANSLATE_LLM_LOCK,
    build_translate_messages,
    handle_translate_request,
    resolve_translate_max_tokens,
    resolve_translate_num_ctx,
    resolve_translate_timeout_sec,
    should_use_translate_max_completion_tokens,
)
import threading
import time


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


def test_resolve_translate_max_tokens_defaults_and_clamps():
    assert resolve_translate_max_tokens({}) == 384
    assert resolve_translate_max_tokens({"translate_max_tokens": "bad"}) == 384
    assert resolve_translate_max_tokens({"translate_max_tokens": 32}) == 64
    assert resolve_translate_max_tokens({"translate_max_tokens": 9999}) == 1024


def test_should_use_translate_max_completion_tokens_for_mimo_or_explicit_config():
    assert should_use_translate_max_completion_tokens({"model": "mimo-v2.5-pro"}) is True
    assert should_use_translate_max_completion_tokens(
        {"base_url": "https://api.xiaomimimo.com/v1", "model": "other"}
    ) is True
    assert should_use_translate_max_completion_tokens(
        {"model": "mimo-v2.5-pro", "translate_use_max_completion_tokens": False}
    ) is False
    assert should_use_translate_max_completion_tokens(
        {"model": "mimo-v2.5-pro", "translate_use_max_completion_tokens": "false"}
    ) is False
    assert should_use_translate_max_completion_tokens(
        {"translate_use_max_completion_tokens": "true"}
    ) is True
    assert should_use_translate_max_completion_tokens({"use_max_completion_tokens": True}) is True
    assert should_use_translate_max_completion_tokens({"use_max_completion_tokens": "false"}) is False
    assert should_use_translate_max_completion_tokens({"model": "gpt-compatible"}) is False


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
    assert called["cfg"]["max_output_tokens"] == 384
    assert called["cfg"]["max_tokens"] == 384
    assert called["cfg"]["max_completion_tokens"] == 384
    assert called["cfg"]["use_max_completion_tokens"] is False
    assert called["cfg"]["allow_high_output_tokens"] is True
    assert called["cfg"]["temperature"] == 0.1
    assert called["cfg"]["request_timeout"] == 45
    assert called["cfg"]["num_ctx"] == 512
    assert called["cfg"]["min_num_ctx"] == 512
    assert called["cfg"]["model"] == "translate-model"
    assert called["messages"] == build_translate_messages("hello")


def test_handle_translate_request_streams_for_openai_compatible():
    sent = {}
    calls = []

    def fail_nonstream(_cfg, _messages):
        calls.append("nonstream")
        raise RuntimeError("nonstream failed")

    def stream_translation(_cfg, _messages):
        calls.append("stream")
        yield "你"
        yield "好"

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai-compatible",
                "model": "main-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=fail_nonstream,
        iter_openai_chat_stream_func=stream_translation,
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert calls == ["stream"]
    assert sent["data"]["translated"] == "你好"
    assert sent["data"]["translated_text"] == "你好"
    assert sent["data"]["degraded"] is False
    assert sent["data"]["fallback"] is False


def test_handle_translate_request_prefers_stream_for_openai_compatible():
    sent = {}
    calls = []

    def unexpected_nonstream(_cfg, _messages):
        calls.append("nonstream")
        return "nonstream result"

    def stream_translation(_cfg, _messages):
        calls.append("stream")
        yield "ni "
        yield "hao"

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai-compatible",
                "model": "main-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=unexpected_nonstream,
        iter_openai_chat_stream_func=stream_translation,
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert calls == ["stream"]
    assert sent["data"]["translated"] == "ni hao"
    assert sent["data"]["degraded"] is False


def test_handle_translate_request_falls_back_to_nonstream_when_stream_empty():
    sent = {}
    calls = []

    def nonstream_translation(_cfg, _messages):
        calls.append("nonstream")
        return "ni hao"

    def empty_stream(_cfg, _messages):
        calls.append("stream")
        if False:
            yield ""

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai-compatible",
                "model": "main-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=nonstream_translation,
        iter_openai_chat_stream_func=empty_stream,
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert calls == ["stream", "nonstream"]
    assert sent["data"]["translated"] == "ni hao"
    assert sent["data"]["degraded"] is False


def test_handle_translate_request_degrades_when_openai_compatible_stream_fails():
    sent = {}
    notices = []
    calls = []

    def stream_fails(_cfg, _messages):
        calls.append("stream")
        raise RuntimeError("stream failed")
        yield ""

    def nonstream_should_not_run(_cfg, _messages):
        calls.append("nonstream")
        return "nonstream result"

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai-compatible",
                "model": "main-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=nonstream_should_not_run,
        iter_openai_chat_stream_func=stream_fails,
        diagnose_llm_exception_func=lambda exc, _cfg: RuntimeError(f"diagnosed: {exc}"),
        log_backend_notice_func=lambda *args, **kwargs: notices.append((args, kwargs)),
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert calls == ["stream"]
    assert sent["data"]["translated"] == "hello"
    assert sent["data"]["degraded"] is True
    assert sent["data"]["fallback"] is True
    assert "diagnosed" in sent["data"]["error"]
    assert notices


def test_handle_translate_request_accepts_openai_compatible_underscore_alias():
    sent = {}
    calls = []

    def stream_translation(_cfg, _messages):
        calls.append("stream")
        yield "ni hao"

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {
            "llm": {
                "provider": "openai_compatible",
                "model": "main-model",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda *_args, **_kwargs: "nonstream",
        iter_openai_chat_stream_func=stream_translation,
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert calls == ["stream"]
    assert sent["data"]["translated"] == "ni hao"
    assert sent["data"]["degraded"] is False


def test_handle_translate_request_serializes_translate_llm_calls():
    active = 0
    max_active = 0
    entered = threading.Event()
    lock = threading.Lock()
    results = []

    def slow_stream(_cfg, _messages):
        nonlocal active, max_active
        with lock:
            active += 1
            max_active = max(max_active, active)
            entered.set()
        time.sleep(0.03)
        with lock:
            active -= 1
        yield "ok"

    def worker():
        sent = {}
        handle_translate_request(
            {"text": "hello"},
            send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
            load_config_func=lambda: {
                "llm": {
                    "provider": "openai-compatible",
                    "model": "main-model",
                }
            },
            call_ollama_func=lambda *_args, **_kwargs: "unused",
            call_openai_compatible_func=lambda *_args, **_kwargs: "nonstream",
            iter_openai_chat_stream_func=slow_stream,
            diagnose_llm_exception_func=lambda exc, _cfg: exc,
            log_backend_notice_func=lambda *_args, **_kwargs: None,
            diagnostic_payload_func=lambda exc: {"error": str(exc)},
        )
        results.append(sent["data"]["translated"])

    first = threading.Thread(target=worker)
    second = threading.Thread(target=worker)
    first.start()
    assert entered.wait(timeout=1)
    second.start()
    first.join(timeout=3)
    second.join(timeout=3)

    assert len(results) == 2
    assert results == ["ok", "ok"]
    assert max_active == 1
    assert not TRANSLATE_LLM_LOCK.locked()


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


def test_handle_translate_request_allows_translate_max_tokens_override():
    called = {}

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda _data, status=200: None,
        load_config_func=lambda: {
            "llm": {
                "provider": "openai",
                "translate_max_tokens": 256,
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda cfg, _messages: called.update({"cfg": cfg}) or "ni hao",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert called["cfg"]["max_output_tokens"] == 256
    assert called["cfg"]["max_tokens"] == 256
    assert called["cfg"]["max_completion_tokens"] == 256
    assert called["cfg"]["use_max_completion_tokens"] is False
    assert called["cfg"]["allow_high_output_tokens"] is False


def test_handle_translate_request_enables_max_completion_tokens_for_mimo():
    called = {}

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda _data, status=200: None,
        load_config_func=lambda: {
            "llm": {
                "provider": "openai-compatible",
                "base_url": "https://api.xiaomimimo.com/v1",
                "model": "mimo-v2.5-pro",
            }
        },
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda cfg, _messages: called.update({"cfg": cfg}) or "ni hao",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert called["cfg"]["max_output_tokens"] == 384
    assert called["cfg"]["max_completion_tokens"] == 384
    assert called["cfg"]["use_max_completion_tokens"] is True


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
    assert response["max_tokens"] == 384


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
