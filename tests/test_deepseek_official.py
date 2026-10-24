import json

import pytest

from llm_client import apply_chat_provider_options
from llm_streaming import iter_openai_chat_stream
from config_switch import LLM_PRESETS, save_config_switch_update


@pytest.mark.parametrize("url", ["https://api.deepseek.com", "https://api.deepseek.com/v1"])
def test_official_requests_disable_default_thinking(url):
    payload = {}
    apply_chat_provider_options(payload, {"base_url": url})
    assert payload == {"thinking": {"type": "disabled"}}


@pytest.mark.parametrize("url", ["https://api.deepseek.com.example.org", "http://localhost:8000", "https://api.openai.com/v1"])
def test_other_providers_keep_their_payload(url):
    payload = {"model": "legacy"}
    apply_chat_provider_options(payload, {"base_url": url})
    assert payload == {"model": "legacy"}


def test_official_stream_payload_and_real_chunk_handling(monkeypatch):
    import llm_streaming
    captured = []

    def chunks(opener, request, timeout, **kwargs):
        captured.append(json.loads(request.data))
        yield b'data: {"choices":[{"delta":{"content":"hello"}}]}\n'
        yield b'data: [DONE]\n'

    monkeypatch.setattr(llm_streaming, "network_chunks", chunks)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-placeholder")
    cfg = LLM_PRESETS["deepseek"]
    assert list(iter_openai_chat_stream(cfg, [{"role": "user", "content": "hi"}])) == ["hello"]
    assert captured[0]["thinking"] == {"type": "disabled"}


def test_deepseek_preset_save_keeps_unrelated_config(tmp_path):
    path = tmp_path / "config.local.json"
    path.write_text(json.dumps({"llm": {"temperature": 0.25}, "tts": {"provider": "browser"}}))
    save_config_switch_update(
        {"llm": {"preset_id": "deepseek"}},
        local_config_path=path, env_path=tmp_path / ".env", web_dir=tmp_path,
    )
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["llm"]["base_url"] == "https://api.deepseek.com"
    assert saved["llm"]["model"] == "deepseek-flash"
    assert saved["llm"]["api_key"] == ""
    assert saved["llm"]["temperature"] == 0.25
    assert saved["tts"]["provider"] == "browser"
