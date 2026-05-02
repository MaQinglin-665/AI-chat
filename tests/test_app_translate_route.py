from app_translate_route import build_translate_messages, handle_translate_request


def test_build_translate_messages_requests_simplified_chinese_only():
    messages = build_translate_messages("hello")

    assert messages[0]["role"] == "system"
    assert "Simplified Chinese" in messages[0]["content"]
    assert messages[1] == {"role": "user", "content": "hello"}


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

    handle_translate_request(
        {"text": "hello"},
        send_json_func=lambda data, status=200: sent.update({"data": data, "status": status}),
        load_config_func=lambda: {"llm": {"provider": "openai"}},
        call_ollama_func=lambda *_args, **_kwargs: "unused",
        call_openai_compatible_func=lambda _cfg, _messages: "你好",
        diagnose_llm_exception_func=lambda exc, _cfg: exc,
        log_backend_notice_func=lambda *_args, **_kwargs: None,
        diagnostic_payload_func=lambda exc: {"error": str(exc)},
    )

    assert sent["data"]["translated"] == "你好"
    assert sent["data"]["translated_text"] == "你好"
    assert sent["data"]["degraded"] is False
    assert sent["data"]["fallback"] is False


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
