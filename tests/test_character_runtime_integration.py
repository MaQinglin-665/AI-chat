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


def test_character_runtime_settings_default_demo_stable_off():
    settings = app._get_character_runtime_settings({})
    assert settings.get("enabled") is False
    assert settings.get("return_metadata") is False
    assert settings.get("demo_stable") is False
    override = settings.get("persona_override", {})
    assert isinstance(override, dict)
    assert override.get("enabled") is False
    assert override.get("name") == ""
    assert override.get("style") == ""


def test_character_runtime_settings_demo_stable_requires_runtime_enabled():
    settings = app._get_character_runtime_settings(
        {"character_runtime": {"enabled": False, "demo_stable": True}}
    )
    assert settings.get("enabled") is False
    assert settings.get("demo_stable") is False

    settings = app._get_character_runtime_settings(
        {"character_runtime": {"enabled": True, "demo_stable": True}}
    )
    assert settings.get("enabled") is True
    assert settings.get("demo_stable") is True


def test_character_runtime_settings_persona_override_parsing():
    settings = app._get_character_runtime_settings(
        {
            "character_runtime": {
                "enabled": True,
                "demo_stable": True,
                "persona_override": {"enabled": True, "name": "Local Name", "style": "quick and witty"},
            }
        }
    )
    override = settings.get("persona_override", {})
    assert override.get("enabled") is True
    assert override.get("name") == "Local Name"
    assert override.get("style") == "quick and witty"


def test_reply_llm_cfg_stable_budget_is_at_least_600():
    cfg = _build_test_config()
    cfg["llm"]["max_output_tokens"] = 220
    cfg["character_runtime"] = {"enabled": True, "demo_stable": True}
    tuned = app._build_reply_llm_cfg(cfg, cfg["llm"])
    assert int(tuned.get("max_output_tokens", 0)) >= 600
    assert tuned.get("allow_high_output_tokens") is True
    assert tuned.get("retry_on_length") is True
    assert int(tuned.get("length_retry_max_output_tokens", 0)) >= int(
        tuned.get("max_output_tokens", 0)
    )


def test_reply_llm_cfg_stable_preserves_higher_user_budget():
    cfg = _build_test_config()
    cfg["llm"]["max_output_tokens"] = 900
    cfg["character_runtime"] = {"enabled": True, "demo_stable": True}
    tuned = app._build_reply_llm_cfg(cfg, cfg["llm"])
    assert int(tuned.get("max_output_tokens", 0)) == 900


def test_reply_llm_cfg_non_stable_keeps_original_budget_and_flags():
    cfg = _build_test_config()
    cfg["llm"]["max_output_tokens"] = 220
    cfg["character_runtime"] = {"enabled": True, "demo_stable": False}
    tuned = app._build_reply_llm_cfg(cfg, cfg["llm"])
    assert int(tuned.get("max_output_tokens", 0)) == 220
    assert "allow_high_output_tokens" not in tuned
    assert "retry_on_length" not in tuned
    assert "length_retry_max_output_tokens" not in tuned


def test_call_llm_stable_passes_boosted_budget_to_final_reply(monkeypatch):
    cfg = _build_test_config()
    cfg.setdefault("llm", {})
    cfg["llm"]["provider"] = "openai"
    cfg["llm"]["max_output_tokens"] = 220
    cfg["character_runtime"] = {"enabled": True, "demo_stable": True}
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = False
    captured = {}

    monkeypatch.setattr(app, "should_reply", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(app, "_ensure_llm_auth_ready", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(app, "_build_base_prompt", lambda *_args, **_kwargs: ("base prompt", []))
    monkeypatch.setattr(app, "build_prompt_with_style", lambda *_args, **_kwargs: "BASE_PROMPT")
    monkeypatch.setattr(app, "_build_reply_language_block", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(app, "get_tools_settings", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(app, "should_use_work_tools", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(app, "update_emotion_from_reply", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        app,
        "build_openai_messages",
        lambda **_kwargs: [{"role": "system", "content": "BASE_PROMPT"}, {"role": "user", "content": "hi"}],
    )

    def _fake_call_openai_compatible(local_cfg, _messages):
        captured["llm_cfg"] = dict(local_cfg)
        return "ok"

    monkeypatch.setattr(app, "call_openai_compatible", _fake_call_openai_compatible)
    monkeypatch.setattr(app, "finalize_assistant_reply", lambda *_args, **_kwargs: "ok")

    result = app.call_llm("hi", [], config=cfg)
    assert result == "ok"
    tuned = captured.get("llm_cfg", {})
    assert int(tuned.get("max_output_tokens", 0)) >= 600
    assert tuned.get("allow_high_output_tokens") is True
    assert tuned.get("retry_on_length") is True


def test_call_llm_prompt_unchanged_when_runtime_disabled(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": False}
    captured = _capture_openai_prompt_in_call_llm(monkeypatch, cfg, raw_reply="plain reply")

    result = app.call_llm("hi", [], config=cfg)

    assert result == "plain reply"
    assert captured.get("prompt") == "BASE_PROMPT"
    assert "single JSON object" not in captured.get("prompt", "")


def test_call_llm_demo_stable_persona_override_enabled_injects_identity_rules(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {
            "enabled": True,
            "name": "ConfiguredPersona",
            "style": "playful, cheeky, lightly teasing, reliable",
        },
    }
    captured = _capture_openai_prompt_in_call_llm(monkeypatch, cfg, raw_reply="plain reply")

    result = app.call_llm("who are you?", [], config=cfg)

    assert result == "plain reply"
    prompt = captured.get("prompt", "")
    assert "Your current name is: ConfiguredPersona." in prompt
    assert "When the user asks who you are, introduce yourself using this name." in prompt
    assert "Do not use any other character name." in prompt
    assert "Keep this local persona style: playful, cheeky, lightly teasing, reliable." in prompt
    assert "Even when the user writes in Chinese, answer in English; do not mirror the user's Chinese." in prompt
    assert "Usually keep replies to 2 to 3 short sentences." in prompt
    assert "Do not call yourself ChatGPT." in prompt
    assert "发布演示" not in prompt
    assert "稳定模式" not in prompt
    assert "demo_stable" not in prompt
    assert "内部模式" not in prompt
    assert "系统提示" not in prompt
    assert "nerous-sama" not in prompt.lower()
    assert "neuro-sama" not in prompt.lower()


def test_call_llm_demo_stable_persona_override_disabled_does_not_inject_identity_rules(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {
            "enabled": False,
            "name": "ConfiguredPersona",
            "style": "should not appear",
        },
    }
    captured = _capture_openai_prompt_in_call_llm(monkeypatch, cfg, raw_reply="plain reply")

    result = app.call_llm("who are you?", [], config=cfg)

    assert result == "plain reply"
    prompt = captured.get("prompt", "")
    assert "Your current name is: ConfiguredPersona." not in prompt
    assert "When the user asks who you are, introduce yourself using this name." not in prompt
    assert "Do not use any other character name." not in prompt
    assert "Keep this local persona style: should not appear." not in prompt


def test_generate_inner_thought_demo_stable_skips_random_injection(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "demo_stable": True}
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = True
    captured = {}

    def _fake_http_post_json(_url, payload, headers=None, timeout=60):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "稳定内心独白"}}]}

    monkeypatch.setattr(app, "http_post_json", _fake_http_post_json)
    monkeypatch.setattr(app.random, "choices", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.choices should not be called")))
    monkeypatch.setattr(app.random, "uniform", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.uniform should not be called")))
    monkeypatch.setattr(app.random, "random", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.random should not be called")))

    thought = app.generate_inner_thought(
        llm_cfg={"base_url": "http://127.0.0.1:11434", "model": "test"},
        user_message="今天要录制演示，给我一句状态提醒。",
        safe_history=[],
        emotion_state={"dominant": "neutral", "valence": 0.0, "arousal": 0.5},
        config=cfg,
    )

    assert thought == "稳定内心独白"
    prompt = captured.get("payload", {}).get("messages", [{}])[0].get("content", "")
    assert "Even when the user writes in Chinese, reply primarily in natural spoken English" in prompt
    assert "the main reply should stay English-first" in prompt
    assert "Reply must end with complete sentences, not half sentences." in prompt
    assert "Usually keep it to 2 to 3 short sentences." in prompt
    assert "desktop AI companion / light supervisor vibe" in prompt
    assert "playful, cheeky, lightly teasing, energetic, witty, reliable." in prompt
    assert "Do not call yourself ChatGPT." in prompt
    assert "Do not claim long-term memory, learning pipelines, plugin marketplace, or other unshipped capabilities." in prompt
    assert "clone" not in prompt.lower()
    assert "external vtuber" not in prompt.lower()
    assert "这次你用联想跳跃" not in prompt
    assert "发布演示" not in prompt
    assert "稳定模式" not in prompt
    assert "demo_stable" not in prompt
    assert "内部模式" not in prompt
    assert "系统提示" not in prompt
    assert "prompt" not in prompt.lower()
    assert captured.get("payload", {}).get("temperature") == 0.35
    assert captured.get("payload", {}).get("frequency_penalty") == 0.1
    assert captured.get("payload", {}).get("presence_penalty") == 0.05


def test_generate_inner_thought_demo_stable_persona_override_enabled_injects_name_and_style(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {
            "enabled": True,
            "name": "Local Companion",
            "style": "snappy, playful, lightly teasing",
        },
    }
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = True
    captured = {}

    def _fake_http_post_json(_url, payload, headers=None, timeout=60):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "稳定内心独白"}}]}

    monkeypatch.setattr(app, "http_post_json", _fake_http_post_json)
    monkeypatch.setattr(app.random, "choices", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.choices should not be called")))
    monkeypatch.setattr(app.random, "uniform", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.uniform should not be called")))
    monkeypatch.setattr(app.random, "random", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.random should not be called")))

    thought = app.generate_inner_thought(
        llm_cfg={"base_url": "http://127.0.0.1:11434", "model": "test"},
        user_message="status?",
        safe_history=[],
        emotion_state={"dominant": "neutral", "valence": 0.0, "arousal": 0.5},
        config=cfg,
    )
    assert thought == "稳定内心独白"
    prompt = captured.get("payload", {}).get("messages", [{}])[0].get("content", "")
    assert "Your current name is: Local Companion." in prompt
    assert "When the user asks who you are, introduce yourself using this name." in prompt
    assert "Do not use any other character name." in prompt
    assert "Keep this local persona style: snappy, playful, lightly teasing." in prompt


def test_generate_inner_thought_demo_stable_persona_override_disabled_not_injected(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {
            "enabled": False,
            "name": "Should Not Appear",
            "style": "should not appear",
        },
    }
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = True
    captured = {}

    def _fake_http_post_json(_url, payload, headers=None, timeout=60):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "稳定内心独白"}}]}

    monkeypatch.setattr(app, "http_post_json", _fake_http_post_json)
    monkeypatch.setattr(app.random, "choices", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.choices should not be called")))
    monkeypatch.setattr(app.random, "uniform", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.uniform should not be called")))
    monkeypatch.setattr(app.random, "random", lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("random.random should not be called")))

    thought = app.generate_inner_thought(
        llm_cfg={"base_url": "http://127.0.0.1:11434", "model": "test"},
        user_message="status?",
        safe_history=[],
        emotion_state={"dominant": "neutral", "valence": 0.0, "arousal": 0.5},
        config=cfg,
    )
    assert thought == "稳定内心独白"
    prompt = captured.get("payload", {}).get("messages", [{}])[0].get("content", "")
    assert "Should Not Appear" not in prompt
    assert "Keep this local persona style: should not appear." not in prompt


def test_generate_inner_thought_non_stable_keeps_random_variety_path(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "demo_stable": False}
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = True
    captured = {}

    def _fake_http_post_json(_url, payload, headers=None, timeout=60):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "普通内心独白"}}]}

    monkeypatch.setattr(app, "http_post_json", _fake_http_post_json)
    monkeypatch.setattr(app.random, "uniform", lambda *_args, **_kwargs: 1.0)
    monkeypatch.setattr(app.random, "random", lambda *_args, **_kwargs: 0.5)
    monkeypatch.setattr(app.random, "choices", lambda *_args, **_kwargs: ["随机路径命中"])

    thought = app.generate_inner_thought(
        llm_cfg={"base_url": "http://127.0.0.1:11434", "model": "test"},
        user_message="你在吗",
        safe_history=[],
        emotion_state={"dominant": "neutral", "valence": 0.0, "arousal": 0.5},
        config=cfg,
    )

    assert thought == "普通内心独白"
    prompt = captured.get("payload", {}).get("messages", [{}])[0].get("content", "")
    assert "随机路径命中" in prompt
    assert "English-first reply policy" not in prompt


def test_generate_inner_thought_non_stable_ignores_persona_override(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": False,
        "persona_override": {"enabled": True, "name": "Ignored Name", "style": "ignored style"},
    }
    cfg.setdefault("thinking", {})
    cfg["thinking"]["enabled"] = True
    captured = {}

    def _fake_http_post_json(_url, payload, headers=None, timeout=60):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "普通内心独白"}}]}

    monkeypatch.setattr(app, "http_post_json", _fake_http_post_json)
    monkeypatch.setattr(app.random, "uniform", lambda *_args, **_kwargs: 1.0)
    monkeypatch.setattr(app.random, "random", lambda *_args, **_kwargs: 0.5)
    monkeypatch.setattr(app.random, "choices", lambda *_args, **_kwargs: ["随机路径命中"])

    thought = app.generate_inner_thought(
        llm_cfg={"base_url": "http://127.0.0.1:11434", "model": "test"},
        user_message="你在吗",
        safe_history=[],
        emotion_state={"dominant": "neutral", "valence": 0.0, "arousal": 0.5},
        config=cfg,
    )
    assert thought == "普通内心独白"
    prompt = captured.get("payload", {}).get("messages", [{}])[0].get("content", "")
    assert "Ignored Name" not in prompt
    assert "ignored style" not in prompt


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
            "response_guidelines": ["lead with utility", "keep it compact"],
            "style_boundaries": ["avoid roleplay-heavy tone"],
            "interaction_examples": ["Good: direct answer + light flavor"],
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
    assert "Do not wrap JSON in Markdown code blocks." in prompt
    assert "Select emotion/action/voice_style from the allowed lists above." in prompt
    assert "Name: Test Companion" in prompt
    assert "Persona: Playful and supportive partner." in prompt
    assert "Tone: concise and vivid" in prompt
    assert "Response guidelines: lead with utility | keep it compact" in prompt
    assert "Style boundaries: avoid roleplay-heavy tone" in prompt
    assert "Interaction examples: Good: direct answer + light flavor" in prompt
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
            "response_guidelines": ["useful first"],
            "style_boundaries": ["no over-dramatic wording"],
            "interaction_examples": ["Good: concise help"],
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
    assert "Response guidelines: useful first" in prompt
    assert "Style boundaries: no over-dramatic wording" in prompt
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
    assert profile.get("response_guidelines") == app.DEFAULT_CHARACTER_PROFILE["response_guidelines"]
    assert profile.get("style_boundaries") == app.DEFAULT_CHARACTER_PROFILE["style_boundaries"]
    assert profile.get("interaction_examples") == app.DEFAULT_CHARACTER_PROFILE["interaction_examples"]
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
                    "response_guidelines": "bad",
                    "style_boundaries": [None, 3],
                    "interaction_examples": {"x": "bad"},
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
    assert profile.get("response_guidelines") == app.DEFAULT_CHARACTER_PROFILE["response_guidelines"]
    assert profile.get("style_boundaries") == app.DEFAULT_CHARACTER_PROFILE["style_boundaries"]
    assert profile.get("interaction_examples") == app.DEFAULT_CHARACTER_PROFILE["interaction_examples"]
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
    assert payload.get("reply") == "broken"
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


def test_runtime_enabled_json_like_with_trailing_comma_does_not_leak_raw_json(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "return_metadata": True}
    monkeypatch.setattr(
        app,
        "call_llm",
        lambda *args, **kwargs: '{"text":"normalized hi","emotion":"thinking","action":"think",}',
    )
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("hi"))
    assert status == 200
    assert payload.get("reply") == "normalized hi"
    assert payload.get("reply", "").lstrip().startswith("{") is False
    runtime = payload.get("character_runtime")
    assert isinstance(runtime, dict)
    assert runtime.get("emotion") == "thinking"
    assert runtime.get("action") == "think"


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


def test_chat_stream_done_payload_does_not_leak_json_like_reply(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {"enabled": True, "return_metadata": True}

    def _fake_stream(*_args, **_kwargs):
        yield '{"text":"stream normalized","emotion":"thinking","action":"think",}'

    monkeypatch.setattr(app, "call_llm_stream", _fake_stream)
    monkeypatch.setattr(
        app,
        "finalize_assistant_reply",
        lambda *_args, **_kwargs: '{"text":"stream normalized","emotion":"thinking","action":"think",}',
    )

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, events = _post_stream_events(f"{base}/api/chat_stream", _chat_payload("hi"))
    assert status == 200
    done = next((evt for evt in events if evt.get("type") == "done"), {})
    assert done.get("reply") == "stream normalized"
    assert done.get("reply", "").lstrip().startswith("{") is False
    runtime = done.get("character_runtime")
    assert isinstance(runtime, dict)
    assert runtime.get("emotion") == "thinking"
    assert runtime.get("action") == "think"
def test_translate_route_returns_fallback_payload_when_llm_unavailable(monkeypatch):
    cfg = _build_test_config()
    cfg.setdefault("llm", {})
    cfg["llm"]["provider"] = "openai"
    monkeypatch.setattr(
        app,
        "call_openai_compatible",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            RuntimeError("LLM HTTP 500: convert_request_failed not implemented")
        ),
    )
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/translate", {"text": "hello"})
    assert status == 200
    assert payload.get("translated") == "hello"
    assert payload.get("translated_text") == "hello"
    assert payload.get("degraded") is True
    assert payload.get("fallback") is True
    assert isinstance(payload.get("error"), str)
    assert payload.get("error")


def test_translate_route_success_payload_keeps_non_degraded_flags(monkeypatch):
    cfg = _build_test_config()
    cfg.setdefault("llm", {})
    cfg["llm"]["provider"] = "openai"
    monkeypatch.setattr(app, "call_openai_compatible", lambda *_args, **_kwargs: "你好")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/translate", {"text": "hello"})
    assert status == 200
    assert payload.get("translated") == "你好"
    assert payload.get("translated_text") == "你好"
    assert payload.get("degraded") is False
    assert payload.get("fallback") is False


def test_demo_stable_identity_fallback_applies_for_chat_identity_question(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {"enabled": True, "name": "Neuro-sama"},
    }
    monkeypatch.setattr(app, "call_llm", lambda *_args, **_kwargs: "I am your assistant.")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("你是谁？"))
    assert status == 200
    reply = str(payload.get("reply", ""))
    assert "Neuro-sama" in reply


def test_demo_stable_identity_fallback_skips_non_identity_questions(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {"enabled": True, "name": "Neuro-sama"},
    }
    monkeypatch.setattr(app, "call_llm", lambda *_args, **_kwargs: "I am your assistant.")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(f"{base}/api/chat", _chat_payload("Tell me a short tip."))
    assert status == 200
    assert payload.get("reply") == "I am your assistant."


def test_demo_stable_identity_fallback_applies_for_chat_stream_done_reply(monkeypatch):
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "demo_stable": True,
        "persona_override": {"enabled": True, "name": "Neuro-sama"},
    }

    def _fake_stream(*_args, **_kwargs):
        yield "I can help with that."

    monkeypatch.setattr(app, "call_llm_stream", _fake_stream)
    monkeypatch.setattr(app, "finalize_assistant_reply", lambda *_args, **_kwargs: "I can help with that.")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, events = _post_stream_events(
            f"{base}/api/chat_stream",
            _chat_payload("who are you?"),
        )
    assert status == 200
    done = next((evt for evt in events if evt.get("type") == "done"), {})
    reply = str(done.get("reply", ""))
    assert "Neuro-sama" in reply
