import copy

import app
import character_brain


def test_character_brain_classifies_comfort_as_soft_low_motion():
    decision = character_brain.build_character_brain_decision(
        user_message="我刚刚被否定了，有点难受。",
        history=[],
    )

    assert decision["intent"] == "comfort"
    assert decision["emotion"] == "sad"
    assert decision["action"] == "none"
    assert decision["intensity"] == "low"
    assert decision["voice_style"] == "soft"
    assert "acknowledge" in decision["directive"].lower()


def test_character_brain_respects_feedback_for_shorter_less_generic_replies():
    decision = character_brain.build_character_brain_decision(
        user_message="你觉得我下一步做什么？",
        experience_profile={
            "style_directives": ["Prefer 1-3 natural short sentences."],
            "avoid_directives": ["Avoid customer-service phrasing."],
            "recent_feedback": [{"rating": "bad", "issue": "reply_too_long"}],
        },
    )

    assert decision["max_sentences"] <= 3
    assert "compact" in decision["directive"]
    assert "generic assistant" in decision["directive"]


def test_character_brain_prompt_block_is_private_guidance():
    decision = character_brain.build_character_brain_decision(user_message="你好")
    block = character_brain.build_character_brain_prompt_block(decision)

    assert "Character brain state" in block
    assert "Do not mention the brain state" in block
    assert "Expression target:" in block
    assert "voice_style=" in block


def test_character_brain_fills_runtime_metadata_fallback():
    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg["character_runtime"] = {"enabled": True, "return_metadata": True}
    cfg["_character_brain_decision"] = character_brain.build_character_brain_decision(
        user_message="我今天有点难受。"
    )

    reply, meta = app._apply_character_runtime_reply(cfg, "嗯，我听到了。")

    assert reply == "嗯，我听到了。"
    assert meta["emotion"] == "sad"
    assert meta["voice_style"] == "soft"
    assert meta["intensity"] == "low"
    assert meta["brain_intent"] == "comfort"
