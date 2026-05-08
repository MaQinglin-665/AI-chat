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
    assert "Output constraints:" in block
    assert "Expression target:" in block
    assert "voice_style=" in block


def test_character_brain_comfort_priority_beats_next_step_question():
    decision = character_brain.build_character_brain_decision(
        user_message="I feel sad and anxious. What should I do next?",
        history=[],
    )

    assert decision["intent"] == "comfort"
    assert decision["intent_scores"]["comfort"] > decision["intent_scores"]["task_help"]
    assert decision["action"] == "none"
    assert decision["voice_style"] == "soft"
    assert decision["output_constraints"]["allow_followup_question"] is False
    assert decision["output_constraints"]["allow_motion"] is False
    assert decision["output_constraints"]["allow_teasing"] is False


def test_character_brain_english_worn_out_companionship_is_comfort():
    decision = character_brain.build_character_brain_decision(
        user_message="I'm feeling a bit worn out. Stay with me for a second.",
        history=[],
    )

    assert decision["intent"] == "comfort"
    assert decision["emotion"] == "sad"
    assert decision["action"] == "none"
    assert decision["voice_style"] == "soft"
    assert decision["output_constraints"]["allow_followup_question"] is False
    assert decision["output_constraints"]["allow_motion"] is False


def test_character_brain_task_help_allows_only_needed_clarification():
    decision = character_brain.build_character_brain_decision(
        user_message="What should I do next in the roadmap?",
        history=[],
    )
    block = character_brain.build_character_brain_prompt_block(decision)

    assert decision["intent"] == "task_help"
    assert decision["reply_style"] == "clear"
    assert decision["voice_style"] == "serious"
    assert decision["output_constraints"]["allow_followup_question"] is True
    assert decision["output_constraints"]["clarify_only_when_needed"] is True
    assert decision["output_constraints"]["allow_teasing"] is False
    assert "Ask a follow-up only if" in decision["directive"]
    assert "follow_up=clarify-only" in block


def test_character_brain_reminder_and_closing_have_clear_limits():
    reminder = character_brain.build_character_brain_decision(
        user_message="Remind me in 10 minutes to stretch.",
        history=[],
    )
    closing = character_brain.build_character_brain_decision(
        user_message="Goodbye, I am going offline.",
        history=[],
    )

    assert reminder["intent"] == "reminder"
    assert reminder["max_sentences"] <= 2
    assert reminder["voice_style"] == "serious"
    assert reminder["output_constraints"]["allow_followup_question"] is False
    assert reminder["output_constraints"]["allow_teasing"] is False
    assert closing["intent"] == "closing"
    assert closing["max_sentences"] <= 2
    assert closing["voice_style"] == "soft"
    assert closing["output_constraints"]["allow_followup_question"] is False
    assert closing["output_constraints"]["allow_teasing"] is False


def test_character_brain_nice_to_see_you_is_not_closing():
    greeting = character_brain.build_character_brain_decision(
        user_message="Hi Taffy, nice to see you today. Keep it short.",
        history=[],
    )
    closing = character_brain.build_character_brain_decision(
        user_message="Goodbye, see you tomorrow.",
        history=[],
    )

    assert greeting["intent"] == "greeting"
    assert greeting["reply_style"] == "warm_brief"
    assert closing["intent"] == "closing"


def test_character_brain_v14_demo_scenarios_have_stable_cues():
    scenarios = {
        "welcome": character_brain.build_character_brain_decision(user_message="Hi, are you there?"),
        "casual": character_brain.build_character_brain_decision(user_message="That rain sound is nice today."),
        "comfort": character_brain.build_character_brain_decision(user_message="I feel awful and overwhelmed."),
        "reminder": character_brain.build_character_brain_decision(user_message="Remind me in 10 minutes to drink water."),
        "encouragement": character_brain.build_character_brain_decision(user_message="I finished the task and shipped it."),
        "long_tts": character_brain.build_character_brain_decision(
            user_message="Can you say a longer sentence to test whether TTS keeps the ending complete?"
        ),
        "failure": character_brain.build_character_brain_decision(
            user_message="The voice failed again, what should I check?"
        ),
        "closing": character_brain.build_character_brain_decision(user_message="I am going to sleep, goodbye."),
    }

    assert scenarios["welcome"]["intent"] == "greeting"
    assert scenarios["welcome"]["action"] == "wave"
    assert scenarios["welcome"]["output_constraints"]["allow_followup_question"] is False
    assert scenarios["casual"]["intent"] == "casual"
    assert scenarios["casual"]["max_sentences"] <= 2
    assert scenarios["casual"]["output_constraints"]["allow_followup_question"] is False
    assert scenarios["comfort"]["intent"] == "comfort"
    assert scenarios["comfort"]["voice_style"] == "soft"
    assert scenarios["comfort"]["output_constraints"]["allow_motion"] is False
    assert scenarios["reminder"]["intent"] == "reminder"
    assert scenarios["reminder"]["action"] == "nod"
    assert scenarios["reminder"]["output_constraints"]["allow_teasing"] is False
    assert scenarios["encouragement"]["intent"] == "encouragement"
    assert scenarios["encouragement"]["action"] == "happy_idle"
    assert scenarios["encouragement"]["voice_style"] == "cheerful"
    assert scenarios["long_tts"]["intent"] == "task_help"
    assert scenarios["long_tts"]["max_sentences"] >= 3
    assert scenarios["long_tts"]["output_constraints"]["clarify_only_when_needed"] is True
    assert scenarios["failure"]["intent"] == "task_help"
    assert scenarios["failure"]["reply_style"] == "clear"
    assert scenarios["failure"]["voice_style"] == "serious"
    assert scenarios["closing"]["intent"] == "closing"
    assert scenarios["closing"]["voice_style"] == "soft"
    assert scenarios["closing"]["output_constraints"]["allow_followup_question"] is False


def test_character_brain_casual_turn_can_end_without_followup():
    decision = character_brain.build_character_brain_decision(
        user_message="That sounds nice.",
        history=[],
    )

    assert decision["intent"] == "casual"
    assert decision["max_sentences"] <= 2
    assert decision["output_constraints"]["allow_followup_question"] is False
    assert "routine follow-up question" in decision["directive"]


def test_character_brain_auto_checkin_is_low_interruption_by_default():
    decision = character_brain.build_character_brain_decision(
        user_message="automatic quiet check-in",
        history=[],
        is_auto=True,
    )
    snapshot = character_brain.build_character_brain_public_snapshot(decision)

    assert decision["intent"] == "low_interrupt_checkin"
    assert decision["max_sentences"] == 1
    assert decision["action"] == "none"
    assert decision["voice_style"] == "soft"
    assert decision["output_constraints"]["allow_followup_question"] is False
    assert decision["output_constraints"]["allow_motion"] is False
    assert snapshot["intent"] == "low_interrupt_checkin"
    assert snapshot["output_constraints"]["allow_followup_question"] is False
    assert "history_tail" not in snapshot
    assert "directive" not in snapshot


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
    assert snapshot["output_constraints"]["clarify_only_when_needed"] is True
    assert "shorter_replies" in snapshot["feedback_effects"]
    assert "less_generic_tone" in snapshot["feedback_effects"]
    assert "intent_scores" not in snapshot
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


def test_character_brain_overrides_conflicting_comfort_runtime_cues():
    decision = character_brain.build_character_brain_decision(
        user_message="I feel sad and overwhelmed.",
        history=[],
    )
    meta = character_brain.merge_brain_runtime_metadata(
        {
            "emotion": "happy",
            "action": "happy_idle",
            "intensity": "high",
            "voice_style": "cheerful",
            "live2d_hint": "smile_soft",
        },
        decision,
    )

    assert meta["emotion"] == "sad"
    assert meta["action"] == "none"
    assert meta["intensity"] == "low"
    assert meta["voice_style"] == "soft"
    assert meta["live2d_hint"] == "eyes_down"


def test_character_brain_overrides_playful_task_runtime_cues():
    decision = character_brain.build_character_brain_decision(
        user_message="What should I do next?",
        history=[],
    )
    meta = character_brain.merge_brain_runtime_metadata(
        {
            "emotion": "happy",
            "action": "happy_idle",
            "intensity": "high",
            "voice_style": "cheerful",
            "live2d_hint": "smile_soft",
        },
        decision,
    )

    assert meta["emotion"] == "thinking"
    assert meta["action"] == "think"
    assert meta["intensity"] == "low"
    assert meta["voice_style"] == "serious"
    assert meta["live2d_hint"] == "idle_relaxed"


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


def test_character_brain_chinese_continuing_comfort_stays_comfort():
    first = character_brain.build_character_brain_decision(
        user_message="\u6211\u521a\u521a\u88ab\u5426\u5b9a\u4e86\uff0c\u6709\u70b9\u96be\u53d7\u3002",
        history=[],
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=first,
        user_message="\u6211\u521a\u521a\u88ab\u5426\u5b9a\u4e86\uff0c\u6709\u70b9\u96be\u53d7\u3002",
        now_ts=1500,
    )
    second = character_brain.build_character_brain_decision(
        user_message="\u8fd8\u662f\u6709\u70b9\u7f13\u4e0d\u8fc7\u6765\u3002",
        history=[],
        session_state=state,
    )

    assert second["intent"] == "comfort"
    assert second["reply_style"] == "comfort_continuing"
    assert second["output_constraints"]["allow_followup_question"] is False


def test_character_brain_code_encouragement_beats_task_help():
    decision = character_brain.build_character_brain_decision(
        user_message="\u6211\u5199\u4ee3\u7801\u5361\u4f4f\u4e86\uff0c\u7ed9\u6211\u4e00\u70b9\u9f13\u52b1\u3002",
        history=[],
    )

    assert decision["intent"] == "encouragement"
    assert decision["voice_style"] == "cheerful"
    assert decision["output_constraints"]["allow_followup_question"] is False


def test_character_brain_reply_constraints_remove_unallowed_followup_and_trim():
    decision = character_brain.build_character_brain_decision(user_message="Hi, are you there?")
    reply = "Hey there!Glad to see you too!Got anything fun in mind?"

    constrained = character_brain.apply_character_brain_reply_constraints(reply, decision)

    assert constrained == "Hey there! Glad to see you too!"
    assert not constrained.endswith("?")


def test_character_brain_reply_constraints_soften_preference_question_for_next_step():
    decision = character_brain.build_character_brain_decision(user_message="What should I do next?")
    reply = "How about trying one tiny cleanup pass?"

    constrained = character_brain.apply_character_brain_reply_constraints(
        reply,
        decision,
        user_message="What should I do next?",
    )

    assert constrained == "How about trying one tiny cleanup pass."
    assert not constrained.endswith("?")


def test_character_brain_reply_constraints_filter_intent_mismatch():
    comfort = character_brain.build_character_brain_decision(user_message="I feel hurt.")
    closing = character_brain.build_character_brain_decision(user_message="I am going offline, goodbye.")
    next_step = character_brain.build_character_brain_decision(user_message="What should I do next?")

    assert character_brain.apply_character_brain_reply_constraints(
        "Aww, that stinks! Every no brings you closer to yes. Keep going!",
        comfort,
        user_message="I feel hurt.",
    ) == "Aww, that stinks!"
    assert character_brain.apply_character_brain_reply_constraints(
        "Stay strong! Every line of code is progress.",
        closing,
        user_message="I am going offline, goodbye.",
    ) == "Rest up. I'll be here when you come back."
    assert character_brain.apply_character_brain_reply_constraints(
        "Might help clear your head.",
        next_step,
        user_message="What should I do next?",
    ) == "Pick one tiny next step and give it ten quiet minutes."
    chinese_next_step = character_brain.build_character_brain_decision(
        user_message="\u6211\u4eca\u5929\u6709\u70b9\u4e0d\u77e5\u9053\u5148\u505a\u4ec0\u4e48\u3002"
    )
    assert character_brain.apply_character_brain_reply_constraints(
        "I hear you. I'll keep this short and focused.",
        chinese_next_step,
        user_message="\u6211\u4eca\u5929\u6709\u70b9\u4e0d\u77e5\u9053\u5148\u505a\u4ec0\u4e48\u3002",
    ) == "Pick one tiny next step and give it ten quiet minutes."
    assert character_brain.apply_character_brain_reply_constraints(
        "How about starting with something fun. Like watching a short video or checking out some cat memes.",
        chinese_next_step,
        user_message="\u6211\u4eca\u5929\u6709\u70b9\u4e0d\u77e5\u9053\u5148\u505a\u4ec0\u4e48\u3002",
    ) == "Pick one tiny next step and give it ten quiet minutes."


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
