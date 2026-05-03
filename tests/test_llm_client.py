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
