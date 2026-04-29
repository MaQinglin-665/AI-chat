import copy
import json
import tempfile
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager
from pathlib import Path

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


def _capture_openai_prompt_in_call_llm(monkeypatch, cfg, raw_reply="plain reply"):
    captured = {}
    cfg.setdefault("llm", {})
    cfg["llm"]["provider"] = "openai"
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = False

    monkeypatch.setattr(app, "should_reply", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(app, "_ensure_llm_auth_ready", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(app, "_build_base_prompt", lambda *_args, **_kwargs: ("base prompt", []))
    monkeypatch.setattr(app, "build_prompt_with_style", lambda *_args, **_kwargs: "BASE_PROMPT")
    monkeypatch.setattr(app, "_build_reply_language_block", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(app, "get_tools_settings", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(app, "should_use_work_tools", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(app, "update_emotion_from_reply", lambda *_args, **_kwargs: None)

    def _fake_build_openai_messages(prompt, safe_history, user_message, image_data_url=None):
        captured["prompt"] = prompt
        captured["user_message"] = user_message
        return [{"role": "system", "content": prompt}, {"role": "user", "content": user_message}]

    monkeypatch.setattr(app, "build_openai_messages", _fake_build_openai_messages)
    monkeypatch.setattr(app, "call_openai_compatible", lambda *_args, **_kwargs: raw_reply)
    monkeypatch.setattr(
        app,
        "finalize_assistant_reply",
        lambda *_args, **_kwargs: raw_reply,
    )
    return captured


def _capture_openai_prompt_in_call_llm_stream(monkeypatch, cfg):
    captured = {}
    cfg.setdefault("llm", {})
    cfg["llm"]["provider"] = "openai"

    monkeypatch.setattr(app, "_ensure_llm_auth_ready", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(app, "_build_base_prompt", lambda *_args, **_kwargs: ("base prompt", []))
    monkeypatch.setattr(app, "build_prompt_with_style", lambda *_args, **_kwargs: "BASE_STREAM_PROMPT")
    monkeypatch.setattr(app, "_build_reply_language_block", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(app, "get_tools_settings", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(app, "should_use_work_tools", lambda *_args, **_kwargs: False)

    def _fake_build_openai_messages(prompt, safe_history, user_message, image_data_url=None):
        captured["prompt"] = prompt
        captured["user_message"] = user_message
        return [{"role": "system", "content": prompt}, {"role": "user", "content": user_message}]

    monkeypatch.setattr(app, "build_openai_messages", _fake_build_openai_messages)
    monkeypatch.setattr(app, "iter_openai_chat_stream", lambda *_args, **_kwargs: iter(["chunk-1"]))
    monkeypatch.setattr(app, "iter_openai_responses_stream", lambda *_args, **_kwargs: iter([]))
    return captured


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


def test_call_llm_prompt_unchanged_when_runtime_disabled(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": False}
    captured = _capture_openai_prompt_in_call_llm(monkeypatch, cfg, raw_reply="plain reply")

    result = app.call_llm("hi", [], config=cfg)

    assert result == "plain reply"
    assert captured.get("prompt") == "BASE_PROMPT"
    assert "single JSON object" not in captured.get("prompt", "")


def test_call_llm_prompt_disabled_does_not_load_profile(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": False}
    captured = _capture_openai_prompt_in_call_llm(monkeypatch, cfg, raw_reply="plain reply")
    monkeypatch.setattr(
        app,
        "_load_character_profile_config",
        lambda: (_ for _ in ()).throw(RuntimeError("profile loader should not be called")),
    )

    result = app.call_llm("hi", [], config=cfg)

    assert result == "plain reply"
    assert captured.get("prompt") == "BASE_PROMPT"


def test_call_llm_prompt_contract_added_when_runtime_enabled(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True}
    monkeypatch.setattr(
        app,
        "_load_character_profile_config",
        lambda: {
            "name": "Test Companion",
            "persona": "Playful and supportive partner.",
            "tone": "concise and vivid",
            "style_notes": ["stay in character", "be practical"],
            "default_emotion": "neutral",
            "default_action": "none",
            "allowed_emotions": ["neutral", "happy", "thinking"],
            "allowed_actions": ["none", "wave", "think"],
            "allowed_voice_styles": ["neutral", "cheerful"],
        },
    )
    captured = _capture_openai_prompt_in_call_llm(
        monkeypatch,
        cfg,
        raw_reply='{"text":"ok","emotion":"happy","action":"wave","intensity":"normal","voice_style":"cheerful"}',
    )

    result = app.call_llm("hi", [], config=cfg)

    assert isinstance(result, str)
    prompt = captured.get("prompt", "")
    assert prompt.startswith("BASE_PROMPT")
    assert "single JSON object only" in prompt
    assert "Name: Test Companion" in prompt
    assert "Persona: Playful and supportive partner." in prompt
    assert "Tone: concise and vivid" in prompt
    assert '"text": "final user-facing reply"' in prompt
    assert '"emotion": "neutral|happy|thinking"' in prompt
    assert '"action": "none|wave|think"' in prompt
    assert '"voice_style": "neutral|cheerful"' in prompt


def test_call_llm_stream_prompt_contract_added_when_runtime_enabled(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True}
    monkeypatch.setattr(
        app,
        "_load_character_profile_config",
        lambda: {
            "name": "Stream Companion",
            "persona": "Stream-safe persona.",
            "tone": "calm and clear",
            "style_notes": ["brief"],
            "default_emotion": "neutral",
            "default_action": "none",
            "allowed_emotions": ["neutral", "surprised"],
            "allowed_actions": ["none", "surprised"],
            "allowed_voice_styles": ["neutral", "soft"],
        },
    )
    captured = _capture_openai_prompt_in_call_llm_stream(monkeypatch, cfg)

    chunks = list(app.call_llm_stream("hi", [], config=cfg))

    assert chunks == ["chunk-1"]
    prompt = captured.get("prompt", "")
    assert prompt.startswith("BASE_STREAM_PROMPT")
    assert "single JSON object only" in prompt
    assert "Name: Stream Companion" in prompt
    assert '"emotion": "neutral|surprised"' in prompt
    assert '"action": "none|surprised"' in prompt


def test_character_profile_missing_file_falls_back_to_default(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        missing = Path(tmp) / "missing_character_profile.json"
        monkeypatch.setattr(app, "CHARACTER_PROFILE_CONFIG_PATH", missing)
        profile = app._load_character_profile_config()
    assert profile.get("name") == app.DEFAULT_CHARACTER_PROFILE["name"]
    assert profile.get("persona") == app.DEFAULT_CHARACTER_PROFILE["persona"]


def test_character_profile_bad_json_falls_back_to_default(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "character_profile.json"
        path.write_text("{bad", encoding="utf-8")
        monkeypatch.setattr(app, "CHARACTER_PROFILE_CONFIG_PATH", path)
        profile = app._load_character_profile_config()
    assert profile.get("name") == app.DEFAULT_CHARACTER_PROFILE["name"]
    assert profile.get("allowed_actions") == app.DEFAULT_CHARACTER_PROFILE["allowed_actions"]


def test_character_profile_missing_fields_gets_default_values(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "character_profile.json"
        path.write_text(json.dumps({"name": "Only Name"}, ensure_ascii=False), encoding="utf-8")
        monkeypatch.setattr(app, "CHARACTER_PROFILE_CONFIG_PATH", path)
        profile = app._load_character_profile_config()
    assert profile.get("name") == "Only Name"
    assert profile.get("persona") == app.DEFAULT_CHARACTER_PROFILE["persona"]
    assert profile.get("tone") == app.DEFAULT_CHARACTER_PROFILE["tone"]
    assert profile.get("allowed_voice_styles") == app.DEFAULT_CHARACTER_PROFILE["allowed_voice_styles"]


def test_character_profile_type_anomalies_fall_back_to_default(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "character_profile.json"
        path.write_text(
            json.dumps(
                {
                    "name": 123,
                    "persona": None,
                    "tone": {"bad": True},
                    "style_notes": "bad",
                    "allowed_emotions": [1, "happy", None],
                    "allowed_actions": "wave",
                    "allowed_voice_styles": [None, 8],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        monkeypatch.setattr(app, "CHARACTER_PROFILE_CONFIG_PATH", path)
        profile = app._load_character_profile_config()
    assert profile.get("name") == app.DEFAULT_CHARACTER_PROFILE["name"]
    assert profile.get("persona") == app.DEFAULT_CHARACTER_PROFILE["persona"]
    assert profile.get("tone") == app.DEFAULT_CHARACTER_PROFILE["tone"]
    assert profile.get("style_notes") == app.DEFAULT_CHARACTER_PROFILE["style_notes"]
    assert profile.get("allowed_actions") == app.DEFAULT_CHARACTER_PROFILE["allowed_actions"]
    assert profile.get("allowed_voice_styles") == app.DEFAULT_CHARACTER_PROFILE["allowed_voice_styles"]


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
