import app
import emotion
import humanize
import inner_thought
import reply_behavior

from companion_dialogue_policy import build_model_direct_dialogue_policy


def _direct_config():
    return {
        "assistant_prompt": "You are Xinyu (馨语), the configured companion.",
        "assistant_reply_language": "en",
        "character_runtime": {"model_direct_reply": True},
        "thinking": {"enabled": True},
        "personality": {"state_inject_prob": 1.0},
    }


def test_model_direct_dialogue_policy_is_honest_bilingual_and_grounded():
    policy = build_model_direct_dialogue_policy(_direct_config())

    assert "AI desktop companion, not a human" in policy
    assert "Chinese or English" in policy
    assert "natural spoken English by default" in policy
    assert "Switch to Chinese only" in policy
    assert "latest message before any aside" in policy
    assert "Ignore stale placeholder names" in policy
    assert "Taffy" not in policy


def test_model_direct_base_prompt_includes_one_canonical_policy(monkeypatch):
    cfg = _direct_config()
    monkeypatch.setattr(app, "get_history_summary_settings", lambda _config: {"keep_recent_messages": 8})
    monkeypatch.setattr(app, "sanitize_history", lambda history, max_items=8: list(history)[-max_items:])
    monkeypatch.setattr(app, "is_lightweight_checkin_message", lambda _message: True)
    monkeypatch.setattr(
        app,
        "build_prompt_with_history_summary",
        lambda *, history, base_prompt, **_kwargs: (base_prompt, history),
    )

    prompt, _history = app._build_base_prompt(cfg, "你好，今天怎么样？", [], {}, "openai")

    assert "You are Xinyu (馨语), the configured companion." in prompt
    assert prompt.count("Model-direct companion dialogue contract:") == 1
    assert "AI desktop companion, not a human" in prompt
    assert "natural spoken English by default" in prompt


def test_model_direct_style_prompt_does_not_call_random_density_or_inner_state(monkeypatch):
    cfg = _direct_config()
    monkeypatch.setattr(
        humanize.random,
        "random",
        lambda: (_ for _ in ()).throw(AssertionError("random density must not run")),
    )
    monkeypatch.setattr(
        emotion.random,
        "random",
        lambda: (_ for _ in ()).throw(AssertionError("random inner state must not run")),
    )

    first = humanize.build_prompt_with_style(cfg, "hello there", [], "base")
    second = humanize.build_prompt_with_style(cfg, "hello there", [], "base")

    assert first == second


def test_model_direct_inner_thought_returns_before_random_or_network_work():
    cfg = _direct_config()

    thought = inner_thought.generate_inner_thought_impl(
        {"provider": "openai"},
        "你好",
        [],
        config=cfg,
        http_post_json_fn=lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("network must not run")),
        random_module=type(
            "NoRandom",
            (),
            {
                "uniform": staticmethod(lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("random must not run"))),
                "random": staticmethod(lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("random must not run"))),
            },
        )(),
        character_runtime_settings_fn=lambda config: config["character_runtime"],
        period_hint_fn=lambda _hour: "day",
    )

    assert thought == ""
    assert emotion.build_inner_state_block(cfg) == ""


def test_model_direct_llm_path_does_not_invoke_hidden_thought_generator(monkeypatch):
    cfg = _direct_config()
    cfg["llm"] = {"provider": "openai", "model": "test"}
    monkeypatch.setattr(app, "should_reply", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(app, "_ensure_llm_auth_ready", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(app, "_build_base_prompt", lambda *_args, **_kwargs: ("base", []))
    monkeypatch.setattr(
        app,
        "generate_inner_thought",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("hidden thought must not run")),
    )
    monkeypatch.setattr(app, "build_prompt_with_style", lambda *_args, **_kwargs: "base")
    monkeypatch.setattr(app, "_build_reply_language_block", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(app, "get_tools_settings", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(app, "should_use_work_tools", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(app, "build_openai_messages", lambda **_kwargs: [{"role": "user", "content": "hi"}])
    monkeypatch.setattr(app, "call_openai_compatible", lambda *_args, **_kwargs: "model-owned reply")
    monkeypatch.setattr(app, "finalize_assistant_reply", lambda *_args, **_kwargs: "model-owned reply")
    monkeypatch.setattr(app, "update_emotion_from_reply", lambda *_args, **_kwargs: None)

    assert app.call_llm("hi", [], config=cfg) == "model-owned reply"


def test_english_policy_and_explicit_chinese_request_support_both_input_languages():
    block = reply_behavior.build_reply_language_block({"assistant_reply_language": "en"})

    assert "MUST be natural English" in block
    assert "用中文回答" in block
    assert humanize.is_explicit_chinese_reply_request("请用中文回答") is True
    assert humanize.is_explicit_chinese_reply_request("Could you reply in Chinese?") is True
    assert humanize.is_explicit_chinese_reply_request("你好，今天怎么样？") is False
