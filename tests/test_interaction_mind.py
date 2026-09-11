import json

import interaction_mind
import app


def _config(**mind):
    return {
        "observe": {"auto_chat_enabled": True},
        "interaction_mind": mind,
    }


def test_active_companionship_enables_unified_mind_and_prompt_stays_bounded():
    config = _config(enabled=False)
    settings = interaction_mind.get_settings(config)
    prompt = interaction_mind.build_prompt(
        {
            "source": "interaction_pulse",
            "latest_user": "我觉得这里还没聊完。" * 80,
            "candidate_reasons": ["open_loop", "emotion_signal", "extra"] * 4,
            "user_speaking": True,
        },
        {"interruption_aversion": 4},
    )

    assert settings["enabled"] is True
    assert "private unified interaction mind" in prompt
    assert "hidden reasoning" in prompt
    assert '"user_speaking":true' in prompt
    assert len(prompt) < 2600


def test_decision_parser_enforces_confidence_and_interrupt_preference():
    config = _config(min_confidence=0.58, interrupt_confidence=0.82)
    low = interaction_mind.parse_decision(
        json.dumps({"action": "speak", "confidence": 0.4, "reason_code": "playful_impulse"}),
        config,
        preference={"interruption_aversion": 0},
    )
    blocked_interrupt = interaction_mind.parse_decision(
        json.dumps({"action": "interrupt", "confidence": 0.85, "reason_code": "useful_followup"}),
        config,
        preference={"interruption_aversion": 4},
    )
    accepted = interaction_mind.parse_decision(
        "```json\n" + json.dumps({
            "action": "ask_followup",
            "confidence": 0.9,
            "interaction_open": True,
            "reason_code": "unfinished_meaning",
            "topic_anchor": " 当前话题 ",
            "utterance_intent": "追问真正的原因",
            "wait_ms": 9000,
        }, ensure_ascii=False) + "\n```",
        config,
        preference={"interruption_aversion": 0},
    )

    assert low["action"] == "wait"
    assert blocked_interrupt["action"] == "wait"
    assert accepted["action"] == "ask_followup"
    assert accepted["topic_anchor"] == "当前话题"
    assert accepted["utterance_intent"] == "追问真正的原因"


def test_explicit_turn_taking_feedback_persists_only_compact_preference(tmp_path, monkeypatch):
    monkeypatch.setattr(interaction_mind, "get_knowledge_settings", lambda _config: {"vault_path": str(tmp_path)})
    monkeypatch.setattr(interaction_mind, "ensure_vault", lambda _config: tmp_path)

    unchanged = interaction_mind.record_feedback({}, "今天我们聊点什么？")
    quieter = interaction_mind.record_feedback({}, "先别打断我，让我说完。")
    permissive = interaction_mind.record_feedback({}, "你可以随时插话。")
    stored = json.loads((tmp_path / interaction_mind.STATE_FILE).read_text(encoding="utf-8"))

    assert unchanged["interruption_aversion"] == 0
    assert quieter["interruption_aversion"] == 2
    assert permissive["interruption_aversion"] == 1
    assert set(stored) == {"interruption_aversion", "last_feedback", "updated_at"}
    assert "让我说完" not in json.dumps(stored, ensure_ascii=False)


def test_app_private_mind_call_uses_direct_json_path_without_tools(monkeypatch):
    config = {
        "observe": {"auto_chat_enabled": True},
        "interaction_mind": {"enabled": True},
        "llm": {"provider": "openai", "model": "test", "max_tokens": 999},
    }
    captured = {}
    monkeypatch.setattr(app, "load_interaction_mind_state", lambda _config: {"interruption_aversion": 0})
    monkeypatch.setattr(app, "_build_reply_llm_cfg", lambda _config, raw: dict(raw))
    monkeypatch.setattr(app, "_ensure_llm_auth_ready", lambda _cfg: None)
    monkeypatch.setattr(
        app,
        "call_openai_compatible",
        lambda cfg, messages: captured.update({"cfg": cfg, "messages": messages}) or json.dumps({
            "action": "wait",
            "confidence": 0.8,
            "interaction_open": True,
            "reason_code": "natural_pause",
            "wait_ms": 7000,
        }),
    )

    result = app._run_interaction_mind(config, {"latest_user": "继续说吧"})

    assert result["decision"]["action"] == "wait"
    assert captured["cfg"]["max_tokens"] == 320
    assert captured["messages"][0]["role"] == "system"
    assert "single JSON" not in captured["messages"][-1]["content"]
