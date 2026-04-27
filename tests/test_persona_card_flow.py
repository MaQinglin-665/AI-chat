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

    normalized = memory._normalize_manual_persona_card({"reply_style": "简洁直接"})
    assert normalized["speaking_style"] == "简洁直接"
    assert normalized["initiative_level"] == "适中"
    assert normalized["relationship_role"] == "桌面伙伴"

    saved = memory.save_manual_persona_card(
        {
            "character_name": "塔菲",
            "api_key": "SECRET_VALUE_SHOULD_NOT_BE_SAVED",
        }
    )
    assert saved["character_name"] == "塔菲"
    assert "api_key" not in saved
    raw = card_path.read_text(encoding="utf-8")
    assert "SECRET_VALUE_SHOULD_NOT_BE_SAVED" not in raw


def test_saved_persona_affects_next_prompt_round(monkeypatch, tmp_path):
    card_path = tmp_path / "memory_persona_card.json"
    monkeypatch.setattr(memory, "MANUAL_PERSONA_CARD_PATH", card_path)

    memory.save_manual_persona_card(
        {
            "character_name": "露米",
            "speaking_style": "像熟悉朋友一样短句回复，直给重点",
            "relationship_role": "桌面伙伴",
            "initiative_level": "适中",
        }
    )

    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    prompt, _ = app._build_base_prompt(
        config=cfg,
        user_message="今天先做什么？",
        history=[],
        llm_cfg=cfg.get("llm", {}),
        provider=str(cfg.get("llm", {}).get("provider", "ollama")),
    )
    assert "角色名: 露米" in prompt
    assert "说话风格: 像熟悉朋友一样短句回复，直给重点" in prompt


def test_persona_card_api_read_write_cycle(monkeypatch, tmp_path):
    card_path = tmp_path / "memory_persona_card.json"
    monkeypatch.setattr(memory, "MANUAL_PERSONA_CARD_PATH", card_path)
    cfg = _build_test_config()

    with _run_server_with_config(monkeypatch, cfg) as base:
        status_get, payload_get = _request_json(f"{base}/api/persona_card")
        assert status_get == 200
        assert payload_get.get("initiative_level") == "适中"
        assert payload_get.get("relationship_role") == "桌面伙伴"

        new_card = {
            "character_name": "露米",
            "speaking_style": "温柔但不拖沓",
            "initiative_level": "高",
            "relationship_role": "工作助手",
        }
        status_post, payload_post = _request_json(
            f"{base}/api/persona_card",
            method="POST",
            payload=new_card,
        )
        assert status_post == 200
        assert payload_post.get("character_name") == "露米"
        assert payload_post.get("speaking_style") == "温柔但不拖沓"
        assert payload_post.get("initiative_level") == "高"
        assert payload_post.get("relationship_role") == "工作助手"

        status_reload, payload_reload = _request_json(f"{base}/api/persona_card")
        assert status_reload == 200
        assert payload_reload.get("character_name") == "露米"
        assert payload_reload.get("speaking_style") == "温柔但不拖沓"
