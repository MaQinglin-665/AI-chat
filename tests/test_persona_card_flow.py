import copy
import json
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager

import app
import memory


def _request_json(url, method="GET", payload=None, headers=None):
    data = None
    request_headers = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(
        url,
        data=data,
        headers=request_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            body = resp.read().decode("utf-8")
            return int(resp.status), json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return int(exc.code), json.loads(body or "{}")


def _build_test_config():
    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg.setdefault("server", {})
    cfg["server"]["host"] = "127.0.0.1"
    cfg["server"]["port"] = 0
    cfg["server"]["open_browser"] = False
    cfg["server"]["require_api_token"] = False
    return cfg


@contextmanager
def _run_server_with_config(monkeypatch, cfg):
    monkeypatch.setattr(app, "load_config", lambda: cfg)
    httpd, _, _ = app.build_server()
    thread = threading.Thread(target=httpd.serve_forever, daemon=True, name="test-persona-http")
    thread.start()
    host, port = httpd.server_address[:2]
    base_url = f"http://{host}:{int(port)}"
    try:
        yield base_url
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2.0)


def test_manual_persona_defaults_and_unknown_field_sanitization(monkeypatch, tmp_path):
    card_path = tmp_path / "memory_persona_card.json"
    monkeypatch.setattr(memory, "MANUAL_PERSONA_CARD_PATH", card_path)

    saved_legacy = memory.save_manual_persona_card({"reply_style": "brief-direct"})
    assert saved_legacy["speaking_style"] == "brief-direct"
    assert saved_legacy["initiative_level"] == memory.PERSONA_INITIATIVE_LEVELS[1]
    assert saved_legacy["relationship_role"] == memory.PERSONA_RELATIONSHIP_ROLES[1]

    saved = memory.save_manual_persona_card(
        {
            "character_name": "Taffy",
            "api_key": "SECRET_VALUE_SHOULD_NOT_BE_SAVED",
        }
    )
    assert saved["character_name"] == "Taffy"
    assert "api_key" not in saved
    raw = card_path.read_text(encoding="utf-8")
    assert "SECRET_VALUE_SHOULD_NOT_BE_SAVED" not in raw


def test_explicit_empty_relationship_role_is_preserved(monkeypatch, tmp_path):
    card_path = tmp_path / "memory_persona_card.json"
    monkeypatch.setattr(memory, "MANUAL_PERSONA_CARD_PATH", card_path)

    saved = memory.save_manual_persona_card(
        {
            "character_name": "Taffy",
            "relationship_role": "",
            "initiative_level": memory.PERSONA_INITIATIVE_LEVELS[2],
        }
    )
    assert saved["relationship_role"] == ""
    assert saved["initiative_level"] == memory.PERSONA_INITIATIVE_LEVELS[2]


def test_saved_persona_affects_next_prompt_round(monkeypatch, tmp_path):
    card_path = tmp_path / "memory_persona_card.json"
    monkeypatch.setattr(memory, "MANUAL_PERSONA_CARD_PATH", card_path)

    memory.save_manual_persona_card(
        {
            "character_name": "Lumi",
            "speaking_style": "brief-direct",
            "relationship_role": memory.PERSONA_RELATIONSHIP_ROLES[1],
            "initiative_level": memory.PERSONA_INITIATIVE_LEVELS[1],
        }
    )

    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = False
    cfg.setdefault("llm", {})
    cfg["llm"]["provider"] = "ollama"

    captured = {}

    def _fake_call_ollama(llm_cfg, messages, model_override=None):
        captured["messages"] = messages
        return "stub-reply"

    monkeypatch.setattr(app, "call_ollama", _fake_call_ollama)
    monkeypatch.setattr(app, "update_emotion_from_reply", lambda *_args, **_kwargs: None)

    reply = app.call_llm("what should I do next?", history=[], config=cfg, is_auto=False)
    assert isinstance(reply, str) and reply
    system_prompt = str(captured.get("messages", [{}])[0].get("content", ""))
    assert "Lumi" in system_prompt
    assert "brief-direct" in system_prompt


def test_persona_card_api_read_write_cycle(monkeypatch, tmp_path):
    card_path = tmp_path / "memory_persona_card.json"
    monkeypatch.setattr(memory, "MANUAL_PERSONA_CARD_PATH", card_path)
    cfg = _build_test_config()

    with _run_server_with_config(monkeypatch, cfg) as base:
        status_get, payload_get = _request_json(f"{base}/api/persona_card")
        assert status_get == 200
        assert payload_get.get("initiative_level") == memory.PERSONA_INITIATIVE_LEVELS[1]
        assert payload_get.get("relationship_role") == memory.PERSONA_RELATIONSHIP_ROLES[1]

        new_card = {
            "character_name": "Lumi",
            "speaking_style": "warm and concise",
            "initiative_level": memory.PERSONA_INITIATIVE_LEVELS[2],
            "relationship_role": memory.PERSONA_RELATIONSHIP_ROLES[3],
        }
        status_post, payload_post = _request_json(
            f"{base}/api/persona_card",
            method="POST",
            payload=new_card,
        )
        assert status_post == 200
        assert payload_post.get("character_name") == "Lumi"
        assert payload_post.get("speaking_style") == "warm and concise"
        assert payload_post.get("initiative_level") == memory.PERSONA_INITIATIVE_LEVELS[2]
        assert payload_post.get("relationship_role") == memory.PERSONA_RELATIONSHIP_ROLES[3]

        status_reload, payload_reload = _request_json(f"{base}/api/persona_card")
        assert status_reload == 200
        assert payload_reload.get("character_name") == "Lumi"
        assert payload_reload.get("speaking_style") == "warm and concise"
