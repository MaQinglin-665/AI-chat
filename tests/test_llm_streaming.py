import json

import llm_streaming


class _FakeStreamResponse:
    def __init__(self, lines):
        self.lines = [line.encode("utf-8") for line in lines]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def __iter__(self):
        return iter(self.lines)


def test_chat_stream_uses_explicit_stream_timeout(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["timeout"] = timeout
        return _FakeStreamResponse(
            [
                'data: {"choices":[{"delta":{"content":"你好"}}]}\n',
                "data: [DONE]\n",
            ]
        )

    monkeypatch.setattr(llm_streaming.urllib.request, "urlopen", fake_urlopen)
    chunks = list(
        llm_streaming.iter_openai_chat_stream(
            {
                "base_url": "http://127.0.0.1:9999/v1",
                "model": "demo",
                "stream_timeout_sec": 17,
            },
            [{"role": "user", "content": "test"}],
        )
    )

    assert captured["timeout"] == 17
    assert chunks == ["你好"]


def test_stream_timeout_ignores_legacy_timeout_sec(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["timeout"] = timeout
        event = {"type": "response.output_text.delta", "delta": "ok"}
        return _FakeStreamResponse([f"data: {json.dumps(event)}\n", "data: [DONE]\n"])

    monkeypatch.setattr(llm_streaming.urllib.request, "urlopen", fake_urlopen)
    chunks = list(
        llm_streaming.iter_openai_responses_stream(
            {
                "base_url": "http://127.0.0.1:9999/v1",
                "model": "demo",
                "timeout_sec": 15,
            },
            [{"role": "user", "content": "test"}],
        )
    )

    assert captured["timeout"] == 45
    assert chunks == ["ok"]
