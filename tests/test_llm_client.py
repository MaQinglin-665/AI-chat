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
