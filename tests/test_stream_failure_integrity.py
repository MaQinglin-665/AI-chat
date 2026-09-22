import json

import pytest

import llm_runtime
import llm_streaming


def runtime_stream(provider, chat, responses, ollama, direct):
    config = {"llm": {"provider": provider}}
    return llm_runtime.call_llm_stream_impl(
        "test", [], config=config,
        load_config_fn=lambda: config,
        build_reply_llm_cfg_fn=lambda config, raw: raw,
        ensure_llm_auth_ready_fn=lambda config: None,
        build_base_prompt_fn=lambda *args, **kwargs: ("base", []),
        build_prompt_with_style_fn=lambda config, message, history, prompt, **kwargs: prompt,
        build_reply_language_block_fn=lambda config: "",
        merge_prompt_with_memory_fn=lambda left, right: left + right,
        build_demo_stable_reply_behavior_block_fn=lambda config: "",
        apply_character_runtime_prompt_contract_fn=lambda config, prompt: prompt,
        get_tools_settings_fn=lambda config: {},
        should_use_work_tools_fn=lambda *args, **kwargs: False,
        call_llm_fn=direct,
        split_text_for_stream_fn=lambda text: [text],
        build_openai_messages_fn=lambda **kwargs: [],
        iter_openai_chat_stream_fn=chat,
        iter_openai_responses_stream_fn=responses,
        iter_ollama_chat_stream_fn=ollama,
    )


@pytest.mark.parametrize("failed_provider", ["chat", "responses", "ollama"])
def test_partial_reply_failure_never_appends_a_replacement(failed_provider):
    fallback_calls = []

    def broken(*args, **kwargs):
        yield "The first answer"
        raise RuntimeError("upstream interrupted")

    def replacement(*args, **kwargs):
        fallback_calls.append(True)
        return iter(["A different answer"])

    def direct(*args, **kwargs):
        fallback_calls.append(True)
        return "Buffered answer"

    empty = lambda *args, **kwargs: iter(())
    stream = runtime_stream(
        "ollama" if failed_provider == "ollama" else "openai",
        broken if failed_provider == "chat" else empty,
        broken if failed_provider == "responses" else replacement,
        broken, direct,
    )
    assert next(stream) == "The first answer"
    with pytest.raises(RuntimeError, match="upstream interrupted"):
        next(stream)
    assert fallback_calls == []


def test_failure_before_any_text_keeps_compatible_fallback():
    def unsupported(*args, **kwargs):
        raise RuntimeError("unsupported streaming endpoint")

    stream = runtime_stream("openai", unsupported, lambda *args: iter(["ok"]), None,
                            lambda *args, **kwargs: pytest.fail("unneeded direct fallback"))
    assert list(stream) == ["ok"]


class TerminalStream:
    def __init__(self, lines):
        self.lines = lines
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True

    def __iter__(self):
        yield from (line.encode("utf-8") for line in self.lines)
        raise AssertionError("Read after terminal event: a keepalive connection would hang here")


@pytest.mark.parametrize("kind", ["chat", "responses", "ollama"])
def test_terminal_event_closes_stream_without_waiting_for_disconnect(monkeypatch, kind):
    if kind == "ollama":
        lines = [json.dumps({"message": {"content": "last words"}, "done": True}) + "\n"]
        iterator = llm_streaming.iter_ollama_chat_stream
    else:
        event = {"choices": [{"delta": {"content": "last words"}}]} if kind == "chat" else {
            "type": "response.output_text.delta", "delta": "last words"}
        lines = ["data: " + json.dumps(event) + "\n", "data: [DONE]\n"]
        iterator = llm_streaming.iter_openai_chat_stream if kind == "chat" else llm_streaming.iter_openai_responses_stream
    response = TerminalStream(lines)
    monkeypatch.setattr(llm_streaming.urllib.request, "urlopen", lambda *args, **kwargs: response)
    assert list(iterator({"base_url": "http://127.0.0.1:9999", "model": "test"}, [])) == ["last words"]
    assert response.closed
