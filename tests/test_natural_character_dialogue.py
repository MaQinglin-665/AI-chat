import re

import app
import emotion
import humanize
import inner_thought
import llm_runtime
import reply_behavior

from companion_dialogue_policy import build_model_direct_dialogue_policy
from config import DEFAULT_CONFIG


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
    assert "natural spoken English by default" in policy
    assert "complete useful beat early" in policy
    assert "habitual closing question" in policy
    assert "switch to Chinese only" in policy
    assert "Answer the latest message" in policy
    assert "ignore stale placeholder names" in policy
    assert "hard-to-predict edge" in policy
    assert "not empty surrealism or unrelated randomness" in policy
    assert "self-initiated thought" in policy
    assert "understated and practical" in policy
    assert "Taffy" not in policy


def test_default_character_prompt_prefers_meaningful_surprise_over_randomness():
    prompt = DEFAULT_CONFIG["assistant_prompt"]

    assert "有意义的观察、想法或小见闻" in prompt
    assert "可理解的来处、含义或可继续聊的价值" in prompt
    assert "凭空堆抽象句子" in prompt
    assert "完全无关的东西" not in prompt


def test_compact_voice_dialogue_policy_keeps_identity_and_fast_first_beat():
    full = build_model_direct_dialogue_policy(_direct_config())
    compact = build_model_direct_dialogue_policy(_direct_config(), compact=True)

    assert "Fast voice companion contract" in compact
    assert "complete speakable beat early" in compact
    assert "Never invent human senses" in compact
    assert "without using a fixed joke" in compact
    assert len(compact) < len(full) * 0.6


def test_model_direct_dialogue_policy_keeps_configured_language_compatibility():
    zh_cfg = _direct_config()
    zh_cfg["assistant_reply_language"] = "zh"
    auto_cfg = _direct_config()
    auto_cfg.pop("assistant_reply_language")

    assert "natural Simplified Chinese" in build_model_direct_dialogue_policy(zh_cfg)
    assert "Understand Chinese or English" in build_model_direct_dialogue_policy(auto_cfg)


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
    assert "[Character brain state]" not in prompt


def test_model_direct_brain_guidance_adds_private_turn_direction_without_json_contract(monkeypatch):
    cfg = _direct_config()
    cfg["character_runtime"]["model_direct_brain_guidance"] = True
    monkeypatch.setattr(app, "get_history_summary_settings", lambda _config: {"keep_recent_messages": 8})
    monkeypatch.setattr(app, "sanitize_history", lambda history, max_items=8: list(history)[-max_items:])
    monkeypatch.setattr(app, "is_lightweight_checkin_message", lambda _message: True)
    monkeypatch.setattr(
        app,
        "build_prompt_with_history_summary",
        lambda *, history, base_prompt, **_kwargs: (base_prompt, history),
    )

    prompt, _history = app._build_base_prompt(cfg, "This desk feels weird today.", [], {}, "openai")

    assert prompt.count("Model-direct companion dialogue contract:") == 1
    assert prompt.count("[Compact character direction]") == 1
    assert "Improv: stance=" in prompt
    assert "Move=" in prompt
    assert "safety=" in prompt
    assert "Grounding:" in prompt
    assert "single JSON object" not in prompt
    assert isinstance(cfg.get("_character_brain_decision"), dict)


def test_voice_low_latency_prompt_uses_compact_policy_brain_and_recent_history(monkeypatch):
    cfg = _direct_config()
    cfg["_input_modality"] = "voice"
    cfg["character_runtime"]["model_direct_brain_guidance"] = True
    cfg["conversation_mode"] = {
        "voice_low_latency_enabled": True,
        "voice_prompt_max_history_messages": 4,
    }
    history = [
        {"role": "user" if index % 2 == 0 else "assistant", "content": f"turn {index}"}
        for index in range(10)
    ]
    monkeypatch.setattr(
        app,
        "get_history_summary_settings",
        lambda _config: {
            "enabled": False,
            "trigger_messages": 14,
            "keep_recent_messages": 8,
            "max_summary_chars": 900,
            "sync_summarize_on_chat": False,
        },
    )
    monkeypatch.setattr(app, "is_lightweight_checkin_message", lambda _message: True)

    prompt, safe_history = app._build_base_prompt(
        cfg,
        "Say something quickly.",
        history,
        {},
        "openai",
    )

    assert "Fast voice companion contract:" in prompt
    assert "[Compact character direction]" in prompt
    assert "Model-direct companion dialogue contract:" not in prompt
    assert "[Character brain state]" not in prompt
    assert len(safe_history) == 4
    assert safe_history[0]["content"] == "turn 6"


def test_model_direct_prompt_has_one_language_rule_and_bounded_structural_budget(monkeypatch):
    cfg = _direct_config()
    cfg["character_runtime"]["model_direct_brain_guidance"] = True
    monkeypatch.setattr(app, "get_history_summary_settings", lambda _config: {"keep_recent_messages": 8})
    monkeypatch.setattr(app, "sanitize_history", lambda history, max_items=8: list(history)[-max_items:])
    monkeypatch.setattr(app, "is_lightweight_checkin_message", lambda _message: True)
    monkeypatch.setattr(
        app,
        "build_prompt_with_history_summary",
        lambda *, history, base_prompt, **_kwargs: (base_prompt, history),
    )

    base_prompt, safe_history = app._build_base_prompt(
        cfg,
        "I fixed a ridiculous bug.",
        [],
        {},
        "openai",
    )
    prompt = llm_runtime.build_reply_prompt(
        config=cfg,
        user_message="I fixed a ridiculous bug.",
        safe_history=safe_history,
        base_prompt=base_prompt,
        is_auto=False,
        build_prompt_with_style_fn=humanize.build_prompt_with_style,
        build_reply_language_block_fn=reply_behavior.build_reply_language_block,
        merge_prompt_with_memory_fn=app.merge_prompt_with_memory,
        build_demo_stable_reply_behavior_block_fn=lambda _config: "",
        apply_character_runtime_prompt_contract_fn=lambda _config, value: value,
    )

    assert prompt.count("natural spoken English by default") == 1
    assert prompt.count("[Compact character direction]") == 1
    assert prompt.count("[Turn direction]") == 1
    assert "1 to 3 sentences" not in prompt
    assert "one to three sentences" not in prompt
    assert len(prompt) < 3600
    estimated_token_units = len(
        re.findall(r"[\u3400-\u9fff]|[A-Za-z0-9_]+|[^\s]", prompt)
    )
    assert estimated_token_units < 700


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


def test_model_direct_thought_burst_keeps_low_interruption_turn_direction():
    cfg = _direct_config()
    cfg["_character_auto_kind"] = "thought_burst"

    prompt = humanize.build_prompt_with_style(
        cfg,
        "",
        [],
        "base",
        is_auto=True,
    )

    assert "unprompted thought" in prompt
    assert "never a notification or demand" in prompt


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
