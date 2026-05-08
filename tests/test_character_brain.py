import copy
import json

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


def test_character_brain_public_snapshot_is_safe_and_compact():
    decision = character_brain.build_character_brain_decision(
        user_message="你觉得我下一步做什么？",
        experience_profile={
            "style_directives": ["Prefer 1-3 natural short sentences."],
            "avoid_directives": ["Avoid customer-service phrasing."],
            "recent_feedback": [{"rating": "bad", "issue": "reply_too_long"}],
        },
    )
    snapshot = character_brain.build_character_brain_public_snapshot(
        decision,
        experience_profile={
            "style_directives": ["Prefer 1-3 natural short sentences."],
            "avoid_directives": ["Avoid customer-service phrasing."],
            "recent_feedback": [{"rating": "bad", "issue": "reply_too_long"}],
        },
    )

    assert snapshot["intent"] == "task_help"
    assert snapshot["max_sentences"] <= 3
    assert "shorter_replies" in snapshot["feedback_effects"]
    assert "less_generic_tone" in snapshot["feedback_effects"]
    assert "directive" not in snapshot
    assert "history_tail" not in snapshot


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


def test_character_brain_continuing_comfort_does_not_reset():
    first = character_brain.build_character_brain_decision(
        user_message="I feel really sad today.",
        history=[],
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=first,
        user_message="I feel really sad today.",
        now_ts=1000,
    )
    second = character_brain.build_character_brain_decision(
        user_message="I still feel sad.",
        history=[],
        session_state=state,
    )
    updated = character_brain.update_brain_session_state(
        state,
        decision=second,
        user_message="I still feel sad.",
        now_ts=1015,
    )

    assert second["intent"] == "comfort"
    assert "continuing distress" in second["directive"]
    assert second["reply_style"] == "comfort_continuing"
    assert updated["recent_user_need"] == "reassurance"
    assert updated["same_need_turns"] == 2


def test_character_brain_repeated_next_step_stays_task_help_and_concise():
    first = character_brain.build_character_brain_decision(
        user_message="What should I do next?",
        history=[],
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=first,
        user_message="What should I do next?",
        now_ts=2000,
    )
    second = character_brain.build_character_brain_decision(
        user_message="Next step?",
        history=[],
        session_state=state,
    )

    assert first["intent"] == "task_help"
    assert second["intent"] == "task_help"
    assert second["reply_style"] == "clear_concise"
    assert second["max_sentences"] <= 3
    assert "next-step thread" in second["directive"]


def test_character_brain_session_state_decays_to_neutral_after_idle():
    decision = character_brain.build_character_brain_decision(
        user_message="I feel sad.",
        history=[],
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=decision,
        user_message="I feel sad.",
        now_ts=3000,
    )
    decayed = character_brain.decay_brain_session_state(state, now_ts=3000 + 3600)

    assert decayed["mood_baseline"] == "neutral"
    assert decayed["energy"] == "calm"
    assert decayed["recent_user_need"] == ""
    assert decayed["same_need_turns"] == 0
    assert decayed["decay"] == "reset_after_idle"


def test_character_brain_public_snapshot_continuity_is_safe_and_compact():
    history = [{"role": "user", "content": "raw history with api_key=SECRET and prompt text"}]
    decision = character_brain.build_character_brain_decision(
        user_message="What should I do next?",
        history=history,
        config={"llm": {"api_key": "SECRET"}},
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=decision,
        user_message="What should I do next?",
        now_ts=4000,
    )
    snapshot = character_brain.build_character_brain_public_snapshot(
        decision,
        session_state=state,
    )
    raw = json.dumps(snapshot, ensure_ascii=False).lower()

    assert snapshot["continuity"]["recent_user_need"] == "direction"
    assert snapshot["continuity"]["last_topic"] == "planning"
    assert "history_tail" not in snapshot
    assert "directive" not in snapshot
    assert "raw history" not in raw
    assert "secret" not in raw
    assert "api_key" not in raw
    assert "prompt text" not in raw
