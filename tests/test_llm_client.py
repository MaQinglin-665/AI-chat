import pytest

import llm_client


def test_openai_compatible_preserves_chat_error_when_responses_fallback_fails(monkeypatch):
    calls = []

    def fake_http_post_json(url, *_args, **_kwargs):
        calls.append(url)
        if url.endswith("/chat/completions"):
            raise RuntimeError("LLM HTTP 500: no available token")
        if url.endswith("/responses"):
            raise RuntimeError("LLM HTTP 500: not implemented")
        raise AssertionError(url)

    monkeypatch.setattr(llm_client, "http_post_json", fake_http_post_json)

    cfg = {
        "base_url": "http://127.0.0.1:9999/v1",
        "model": "test-model",
    }

    with pytest.raises(RuntimeError, match="no available token"):
        llm_client.call_openai_compatible(cfg, [{"role": "user", "content": "hi"}])

    assert calls == [
        "http://127.0.0.1:9999/v1/chat/completions",
        "http://127.0.0.1:9999/v1/responses",
    ]


def test_openai_compatible_can_use_max_completion_tokens(monkeypatch):
    captured = {}

    def fake_http_post_json(url, payload, **kwargs):
        captured["url"] = url
        captured["payload"] = payload
        captured["kwargs"] = kwargs
        return {"choices": [{"message": {"content": "ok"}, "finish_reason": "stop"}]}

    monkeypatch.setattr(llm_client, "http_post_json", fake_http_post_json)

    result = llm_client.call_openai_compatible(
        {
            "base_url": "http://127.0.0.1:9999/v1",
            "model": "test-model",
            "max_output_tokens": 384,
            "use_max_completion_tokens": True,
            "allow_high_output_tokens": True,
        },
        [{"role": "user", "content": "hi"}],
    )

    assert result == "ok"
    assert captured["url"] == "http://127.0.0.1:9999/v1/chat/completions"
    assert captured["payload"]["max_completion_tokens"] == 384
    assert "max_tokens" not in captured["payload"]


def test_openai_compatible_parses_string_bool_for_max_completion_tokens(monkeypatch):
    captured = {}

    def fake_http_post_json(url, payload, **kwargs):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "ok"}, "finish_reason": "stop"}]}

    monkeypatch.setattr(llm_client, "http_post_json", fake_http_post_json)

    result = llm_client.call_openai_compatible(
        {
            "base_url": "http://127.0.0.1:9999/v1",
            "model": "test-model",
            "max_output_tokens": 384,
            "use_max_completion_tokens": "false",
            "allow_high_output_tokens": "true",
        },
        [{"role": "user", "content": "hi"}],
    )

    assert result == "ok"
    assert captured["payload"]["max_tokens"] == 384
    assert "max_completion_tokens" not in captured["payload"]


def test_openai_compatible_length_retry_uses_max_completion_tokens(monkeypatch):
    payloads = []

    def fake_http_post_json(url, payload, **kwargs):
        payloads.append(payload)
        if len(payloads) == 1:
            return {
                "choices": [
                    {"message": {"content": "partial"}, "finish_reason": "length"}
                ]
            }
        return {"choices": [{"message": {"content": "complete"}, "finish_reason": "stop"}]}

    monkeypatch.setattr(llm_client, "http_post_json", fake_http_post_json)

    result = llm_client.call_openai_compatible(
        {
            "base_url": "http://127.0.0.1:9999/v1",
            "model": "test-model",
            "max_output_tokens": 384,
            "length_retry_max_output_tokens": 768,
            "retry_on_length": True,
            "use_max_completion_tokens": True,
            "allow_high_output_tokens": True,
        },
        [{"role": "user", "content": "hi"}],
    )

    assert result == "complete"
    assert payloads[0]["max_completion_tokens"] == 384
    assert payloads[1]["max_completion_tokens"] == 768
    assert "max_tokens" not in payloads[0]
    assert "max_tokens" not in payloads[1]


def test_call_ollama_allows_lower_num_ctx_floor_for_lightweight_tasks(monkeypatch):
    captured = {}

    def fake_http_post_json(url, payload, **kwargs):
        captured["url"] = url
        captured["payload"] = payload
        captured["kwargs"] = kwargs
        return {"message": {"content": "你好"}}

    monkeypatch.setattr(llm_client, "http_post_json", fake_http_post_json)

    result = llm_client.call_ollama(
        {
            "base_url": "http://127.0.0.1:11434",
            "model": "test-model",
            "num_ctx": 512,
            "min_num_ctx": 512,
        },
        [{"role": "user", "content": "hello"}],
    )

    assert result == "你好"
    assert captured["url"] == "http://127.0.0.1:11434/api/chat"
    assert captured["payload"]["options"]["num_ctx"] == 512
