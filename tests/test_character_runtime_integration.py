import copy
import json
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager

import app


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
    monkeypatch.setattr(app, "remember_interaction", lambda *args, **kwargs: None)
    httpd, _, _ = app.build_server()
    thread = threading.Thread(target=httpd.serve_forever, daemon=True, name="test-http-server")
    thread.start()
    host, port = httpd.server_address[:2]
    base_url = f"http://{host}:{int(port)}"
    try:
        yield base_url
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2.0)


def _post_json(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            body = resp.read().decode("utf-8")
            return int(resp.status), json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return int(exc.code), json.loads(body or "{}")


def _chat_payload(message="hello"):
    return {"message": message, "history": []}


def _post_stream_events(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=6) as resp:
        events = []
        for raw_line in resp:
            safe = raw_line.decode("utf-8", errors="replace").strip()
            if not safe.startswith("data:"):
                continue
            raw = safe[5:].strip()
            if not raw or raw == "[DONE]":
                continue
            try:
                evt = json.loads(raw)
                events.append(evt)
                if evt.get("type") == "done":
                    break
            except Exception:
                continue
        return int(resp.status), events


def test_default_runtime_off_keeps_original_reply(monkeypatch):
    cfg = _build_test_config()
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: "plain reply")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "plain reply"
    assert "character_runtime" not in payload


def test_missing_character_runtime_config_returns_no_metadata(monkeypatch):
    cfg = _build_test_config()
    cfg.pop("character_runtime", None)
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: "plain reply")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "plain reply"
    assert "character_runtime" not in payload


def test_enabled_false_never_returns_metadata(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": False, "return_metadata": True}
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: "plain reply")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "plain reply"
    assert "character_runtime" not in payload


def test_runtime_enabled_plain_text_remains_plain_text(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True}
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: "hello runtime")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "hello runtime"
    assert isinstance(payload.get("reply"), str)
    assert "character_runtime" not in payload


def test_runtime_enabled_json_string_returns_normalized_text(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True}
    monkeypatch.setattr(
        app,
        "call_llm",
        lambda *args, **kwargs: '{"text":"normalized hi","emotion":"happy","voice_style":"warm"}',
    )
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "normalized hi"
    assert isinstance(payload.get("reply"), str)
    assert "character_runtime" not in payload


def test_runtime_enabled_bad_json_fallback_does_not_crash(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True}
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: '{"text":"broken"')
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == '{"text":"broken"'
    assert isinstance(payload.get("reply"), str)


def test_runtime_enabled_dict_reply_is_converted_to_text(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True}
    monkeypatch.setattr(
        app,
        "call_llm",
        lambda *args, **kwargs: {"text": "dict text", "emotion": "sad", "voice_style": "soft"},
    )
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "dict text"
    assert isinstance(payload.get("reply"), str)


def test_runtime_metadata_is_not_returned_by_default(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "return_metadata": False}
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: '{"text":"ok","emotion":"happy"}')
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "ok"
    assert "character_runtime" not in payload


def test_runtime_metadata_returns_only_when_both_flags_enabled(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "return_metadata": True}
    monkeypatch.setattr(
        app,
        "call_llm",
        lambda *args, **kwargs: '{"text":"ok","emotion":"happy","voice_style":"warm"}',
    )
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "ok"
    runtime = payload.get("character_runtime")
    assert isinstance(runtime, dict)
    assert runtime.get("emotion") == "happy"
    assert runtime.get("voice_style") == "warm"
    assert "text" not in runtime
    assert runtime.get("action") == "none"
    assert runtime.get("intensity") == "normal"
    assert runtime.get("live2d_hint") == "smile_soft"


def test_runtime_metadata_handles_malformed_config_as_disabled(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = "broken"
    monkeypatch.setattr(app, "call_llm", lambda *args, **kwargs: '{"text":"ok","emotion":"happy"}')
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == '{"text":"ok","emotion":"happy"}'
    assert "character_runtime" not in payload


def test_chat_stream_done_payload_returns_character_runtime_when_opt_in(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "return_metadata": True}

    def _fake_stream(*_args, **_kwargs):
        yield '{"text":"stream hi","emotion":"happy","voice_style":"warm"}'

    monkeypatch.setattr(app, "call_llm_stream", _fake_stream)
    monkeypatch.setattr(
        app,
        "finalize_assistant_reply",
        lambda *_args, **_kwargs: '{"text":"stream hi","emotion":"happy","voice_style":"warm"}',
    )

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, events = _post_stream_events(f"{base}/api/chat_stream", _chat_payload("hi"))
    assert status == 200
    done = next((evt for evt in events if evt.get("type") == "done"), {})
    assert done.get("reply") == "stream hi"
    runtime = done.get("character_runtime")
    assert isinstance(runtime, dict)
    assert runtime.get("emotion") == "happy"
    assert runtime.get("live2d_hint") == "smile_soft"
    assert runtime.get("voice_style") == "warm"
    assert "text" not in runtime
