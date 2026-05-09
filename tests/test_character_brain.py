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
    assert "Style beat:" in block
    assert "Reaction mode:" in block
    assert "Performance:" in block
    assert "Improv:" in block
    assert "Stage memory:" in block
    assert "Safety clamp:" in block
    assert "slightly odd inner life" in block
    assert "empty helper phrases" in block
    assert decision["style_beat"]
    assert decision["reaction_mode"]
    assert decision["opening_move"]
    assert decision["reply_shape"]
    assert decision["question_policy"]


def test_character_brain_style_beat_rotates_with_continuity():
    first = character_brain.build_character_brain_decision(
        user_message="What should I do next?",
        session_state={"last_intent": "task_help", "recent_user_need": "direction", "same_need_turns": 0},
    )
    second = character_brain.build_character_brain_decision(
        user_message="What should I do next?",
        session_state={
            "last_intent": "task_help",
            "recent_user_need": "direction",
            "same_need_turns": 1,
        },
    )

    assert first["intent"] == "task_help"
    assert second["intent"] == "task_help"
    assert first["style_beat"] in {"one_tiny_step", "clipboard_supervisor", "no_ceremony"}
    assert second["style_beat"] in {"one_tiny_step", "clipboard_supervisor", "no_ceremony"}
    assert first["style_beat"] != second["style_beat"]


def test_character_brain_reaction_modes_keep_safety_by_intent():
    greeting = character_brain.build_character_brain_decision(user_message="Hi Taffy, are you awake?")
    casual = character_brain.build_character_brain_decision(user_message="This desk feels weird today.")
    comfort = character_brain.build_character_brain_decision(user_message="I feel worn out. Stay with me.")
    reminder = character_brain.build_character_brain_decision(user_message="Remind me in 10 minutes to drink water.")
    closing = character_brain.build_character_brain_decision(user_message="I'm going to sleep, bye.")
    task = character_brain.build_character_brain_decision(user_message="What should I do next?")

    assert greeting["reaction_mode"] in {"quick_snap", "deadpan_aside", "playful_pushback", "tangent_spark"}
    assert greeting["banter_level"] >= 1
    assert casual["reaction_mode"] in {"quick_snap", "deadpan_aside", "playful_pushback", "tangent_spark"}
    assert casual["banter_level"] >= 1
    assert comfort["reaction_mode"] == "soft_anchor"
    assert comfort["banter_level"] == 0
    assert reminder["reaction_mode"] == "clean_ping"
    assert reminder["banter_level"] == 0
    assert closing["reaction_mode"] == "fade_out"
    assert closing["banter_level"] == 0
    assert task["reaction_mode"] == "task_snap"
    assert task["banter_level"] == 1


def test_character_brain_performance_controls_by_intent():
    casual = character_brain.build_character_brain_decision(user_message="This desk feels weird today.")
    question = character_brain.build_character_brain_decision(user_message="Do you think AI pets can be funny?")
    task = character_brain.build_character_brain_decision(user_message="Can you help me fix this project?")
    comfort = character_brain.build_character_brain_decision(user_message="I feel worn out. Stay with me.")
    reminder = character_brain.build_character_brain_decision(user_message="Remind me in 10 minutes to drink water.")
    closing = character_brain.build_character_brain_decision(user_message="I'm going to sleep, bye.")

    assert casual["opening_move"] in {"micro_reaction", "deadpan_aside"}
    assert casual["reply_shape"] in {"one_liner", "bit_then_answer", "mini_rant"}
    assert casual["spontaneity"] >= 1
    assert casual["question_policy"] == "none"
    assert question["opening_move"] == "answer_first"
    assert question["reply_shape"] == "answer_then_bit"
    assert question["question_policy"] == "optional_playful"
    assert task["opening_move"] == "answer_first"
    assert task["reply_shape"] == "answer_then_bit"
    assert task["question_policy"] == "clarify_only"
    assert comfort["opening_move"] == "soft_anchor"
    assert comfort["spontaneity"] == 0
    assert comfort["question_policy"] == "none"
    assert reminder["reply_shape"] == "one_liner"
    assert reminder["spontaneity"] == 0
    assert closing["opening_move"] == "no_opening"
    assert closing["question_policy"] == "none"


def test_character_brain_improv_director_high_chaos_only_for_safe_play_scenes():
    casual = character_brain.build_character_brain_decision(user_message="This desk feels weird today.")
    question = character_brain.build_character_brain_decision(user_message="What are you doing?")
    correction = character_brain.build_character_brain_decision(user_message="You were wrong.")
    encouragement = character_brain.build_character_brain_decision(user_message="I finished it.")

    for decision in (casual, question, correction, encouragement):
        assert decision["improv"]["chaos_level"] == 3
        assert decision["safety_clamp"]["level"] == "none"
        assert decision["spontaneity"] == 3
        assert decision["banter_level"] == 3

    assert correction["improv"]["stance"] == "mock_defensive_repair"
    assert correction["improv"]["agenda"] == "repair_the_bit"


def test_character_brain_improv_director_clamps_protected_intents():
    comfort = character_brain.build_character_brain_decision(user_message="I feel bad.")
    reminder = character_brain.build_character_brain_decision(user_message="Remind me in 10 minutes to stretch.")
    closing = character_brain.build_character_brain_decision(user_message="I'm going to sleep.")
    task = character_brain.build_character_brain_decision(user_message="What next?")

    for decision in (comfort, reminder, closing):
        assert decision["improv"]["chaos_level"] == 0
        assert decision["safety_clamp"]["level"] == "safe_scene"
        assert decision["spontaneity"] == 0
        assert decision["question_policy"] == "none"
        assert decision["banter_level"] == 0

    assert comfort["opening_move"] == "soft_anchor"
    assert reminder["reply_shape"] == "one_liner"
    assert closing["opening_move"] == "no_opening"
    assert task["improv"]["chaos_level"] == 1
    assert task["safety_clamp"]["level"] == "task_scene"
    assert task["spontaneity"] <= 1
    assert task["question_policy"] == "clarify_only"


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


def test_character_brain_reply_constraints_replace_bland_character_replies():
    encouragement = character_brain.build_character_brain_decision(user_message="I finished it.")
    comfort = character_brain.build_character_brain_decision(
        user_message="I'm feeling worn out. Stay with me for a second."
    )
    greeting = character_brain.build_character_brain_decision(user_message="Hi Taffy, are you there?")
    voice_test = character_brain.build_character_brain_decision(
        user_message="Say a longer sentence so I can test whether your voice keeps the ending complete."
    )
    casual = character_brain.build_character_brain_decision(user_message="This desk feels weird today.")
    question = character_brain.build_character_brain_decision(user_message="Do you think AI pets can be funny?")
    task = character_brain.build_character_brain_decision(user_message="Can you help me fix this project?")
    assert task["intent"] == "task_help"

    assert character_brain.apply_character_brain_reply_constraints(
        "Great job!",
        encouragement,
        user_message="I finished it.",
    ) == "Look at you, actually finishing the thing. Suspiciously competent."
    assert character_brain.apply_character_brain_reply_constraints(
        "You've got this!",
        encouragement,
        user_message="I'm stuck on this bug, give me a little encouragement.",
    ) == "The bug is acting important. Embarrassing for it, because you're still here."
    assert character_brain.apply_character_brain_reply_constraints(
        "Wow, you did it! Time to celebrate with a virtual high-five.",
        encouragement,
        user_message="I finished it.",
    ) == "Look at you, actually finishing the thing. Suspiciously competent."
    assert character_brain.apply_character_brain_reply_constraints(
        "Hooray! You tackled that one.",
        encouragement,
        user_message="I finished it.",
    ) == "Look at you, actually finishing the thing. Suspiciously competent."
    assert character_brain.apply_character_brain_reply_constraints(
        "Take it easy. Sometimes a short break can do wonders.",
        comfort,
        user_message="I'm feeling worn out. Stay with me for a second.",
    ) == "Yeah, you're on low battery right now. Stay still for a second; I'll keep the room company."
    assert character_brain.apply_character_brain_reply_constraints(
        "Yeah, I can feel the tired vibes. A good old chat about silly things to distract your brain.",
        comfort,
        user_message="I'm feeling worn out. Stay with me for a second.",
    ) == "Yeah, you're on low battery right now. Stay still for a second; I'll keep the room company."
    assert character_brain.apply_character_brain_reply_constraints(
        "Hey there! I'm right here, ready for some chat.",
        greeting,
        user_message="Hi Taffy, are you there?",
    ) == "Oh, you found me. I was doing very important desktop nothing."
    assert character_brain.apply_character_brain_reply_constraints(
        "Sure thing!",
        voice_test,
        user_message="Say a longer sentence so I can test whether your voice keeps the ending complete.",
    ) == "Testing voice endurance now: if I reach the end of this sentence without vanishing, the tiny sound machine gets one reluctant point."
    assert character_brain.apply_character_brain_reply_constraints(
        "Even though the night is young and there's still so much desktop AI magic to discover, let's make sure those ideas stay bright in your mind until morning.",
        voice_test,
        user_message="Say a longer sentence so I can test whether your voice keeps the ending complete.",
    ) == "Testing voice endurance now: if I reach the end of this sentence without vanishing, the tiny sound machine gets one reluctant point."
    assert character_brain.apply_character_brain_reply_constraints(
        "That sounds interesting! Let me know if you want to explore it.",
        casual,
        user_message="This desk feels weird today.",
    ) == "Hm. The desktop air just shifted. Suspicious, but continue."
    assert character_brain.apply_character_brain_reply_constraints(
        "As an AI, I can certainly help with that.",
        question,
        user_message="Do you think AI pets can be funny?",
    ) == "Short answer: probably yes, but I reserve the right to be smug about it."
    assert character_brain.apply_character_brain_reply_constraints(
        "I can help with that. Let me know what you need.",
        task,
        user_message="Can you help me fix this project?",
    ) == "Point me at the messy bit. I'll stare at it with unreasonable confidence."


def test_character_brain_reply_constraints_filter_intent_mismatch():
    comfort = character_brain.build_character_brain_decision(user_message="I feel hurt.")
    closing = character_brain.build_character_brain_decision(user_message="I am going offline, goodbye.")
    next_step = character_brain.build_character_brain_decision(user_message="What should I do next?")

    assert character_brain.apply_character_brain_reply_constraints(
        "Aww, that stinks! Every no brings you closer to yes. Keep going!",
        comfort,
        user_message="I feel hurt.",
    ) == "Yeah, you're on low battery right now. Stay still for a second; I'll keep the room company."
    assert character_brain.apply_character_brain_reply_constraints(
        "Stay strong! Every line of code is progress.",
        closing,
        user_message="I am going offline, goodbye.",
    ) == "Go sleep. I'll keep the pixels under questionable supervision."
    assert character_brain.apply_character_brain_reply_constraints(
        "Might help clear your head.",
        next_step,
        user_message="What should I do next?",
    ) == "One tiny step. Ten minutes. No grand destiny ceremony."
    assert character_brain.apply_character_brain_reply_constraints(
        "Take a quick break if you can. Maybe grab some tea and stare into space for a bit.",
        next_step,
        user_message="What should I do next?",
    ) == "One tiny step. Ten minutes. No grand destiny ceremony."
    assert character_brain.apply_character_brain_reply_constraints(
        "Goodnight! Sweet dreams.",
        closing,
        user_message="I am going offline, goodbye.",
    ) == "Go sleep. I'll keep the pixels under questionable supervision."
    chinese_next_step = character_brain.build_character_brain_decision(
        user_message="\u6211\u4eca\u5929\u6709\u70b9\u4e0d\u77e5\u9053\u5148\u505a\u4ec0\u4e48\u3002"
    )
    assert character_brain.apply_character_brain_reply_constraints(
        "I hear you. I'll keep this short and focused.",
        chinese_next_step,
        user_message="\u6211\u4eca\u5929\u6709\u70b9\u4e0d\u77e5\u9053\u5148\u505a\u4ec0\u4e48\u3002",
    ) == "One tiny step. Ten minutes. No grand destiny ceremony."
    assert character_brain.apply_character_brain_reply_constraints(
        "How about starting with something fun. Like watching a short video or checking out some cat memes.",
        chinese_next_step,
        user_message="\u6211\u4eca\u5929\u6709\u70b9\u4e0d\u77e5\u9053\u5148\u505a\u4ec0\u4e48\u3002",
    ) == "One tiny step. Ten minutes. No grand destiny ceremony."


def test_character_brain_reply_shape_enforces_one_liner_and_execution_summary():
    decision = character_brain.build_character_brain_decision(user_message="Say hi.")
    decision["reply_shape"] = "one_liner"
    decision["question_policy"] = "none"

    reply = character_brain.apply_character_brain_reply_constraints(
        "Tiny status report: I am awake. The keyboard is behaving for now. Let me know if you need anything else.",
        decision,
        user_message="Say hi.",
    )

    assert reply == "Tiny status report: I am awake."
    execution = decision["performance_execution"]
    assert execution["reply_shape"] == "one_liner"
    assert execution["removed_followup"] is True
    assert execution["shortened"] is True
    assert execution["final_sentences"] == 1


def test_character_brain_question_policy_none_removes_generic_followup_without_fallback():
    decision = character_brain.build_character_brain_decision(user_message="This desk feels weird today.")

    reply = character_brain.apply_character_brain_reply_constraints(
        "The desk is giving cursed furniture energy. Let me know if you want me to help with anything else.",
        decision,
        user_message="This desk feels weird today.",
    )

    assert reply == "The desk is giving cursed furniture energy."
    assert decision["performance_execution"]["removed_followup"] is True


def test_character_brain_safe_intents_strip_unsafe_bits_and_task_stays_useful():
    comfort = character_brain.build_character_brain_decision(user_message="I feel bad.")
    task = character_brain.build_character_brain_decision(user_message="What next?")

    comfort_reply = character_brain.apply_character_brain_reply_constraints(
        "The keyboard is judging you. Let me know if you need anything.",
        comfort,
        user_message="I feel bad.",
    )
    task_reply = character_brain.apply_character_brain_reply_constraints(
        "The clipboard is judging the situation.",
        task,
        user_message="What next?",
    )

    assert "keyboard" not in comfort_reply.lower()
    assert comfort["performance_execution"]["removed_unsafe_bit"] is True
    assert task_reply == "One tiny step. Ten minutes. No grand destiny ceremony."


def test_character_brain_repairs_unbalanced_parenthetical_after_shape_trim():
    decision = character_brain.build_character_brain_decision(user_message="What are you doing?")
    decision["reply_shape"] = "answer_then_bit"

    reply = character_brain.apply_character_brain_reply_constraints(
        "Just hanging out. (The keyboard is being dramatic, but fair.",
        decision,
        user_message="What are you doing?",
    )

    assert reply == "Just hanging out. The keyboard is being dramatic, but fair."
    assert "(" not in reply


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


def test_character_brain_stage_memory_tracks_callback_and_decays():
    first = character_brain.build_character_brain_decision(
        user_message="This desk feels weird today.",
        history=[],
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=first,
        user_message="This desk feels weird today.",
        now_ts=5000,
    )
    probe_state = {
        "last_intent": "casual",
        "last_topic": "casual",
        "recent_user_need": "companionship",
        "same_need_turns": 1,
        "stage_turns_since_callback": 0,
    }
    probe = character_brain.build_character_brain_decision(
        user_message="This desk feels weird today.",
        history=[],
        session_state=probe_state,
    )
    repeat_state = {
        **probe_state,
        "stage_current_bit": probe["performance_bit"],
        "stage_recent_callback": probe["performance_bit"],
    }
    second = character_brain.build_character_brain_decision(
        user_message="This desk feels weird today.",
        history=[],
        session_state=repeat_state,
    )
    next_state = character_brain.update_brain_session_state(
        repeat_state,
        decision=second,
        user_message="This desk feels weird today.",
        now_ts=5015,
    )
    softened = character_brain.decay_brain_session_state(
        next_state,
        now_ts=5015 + character_brain.SESSION_SOFT_DECAY_AFTER_SEC + 1,
    )

    assert state["stage_current_bit"]
    assert state["stage_recent_callback"] == state["stage_current_bit"]
    assert second["improv"]["callback_policy"] == "avoid_repeat"
    assert next_state["stage_turns_since_callback"] >= 1
    assert softened["stage_turns_since_callback"] >= next_state["stage_turns_since_callback"]
    if softened["stage_turns_since_callback"] >= 3:
        assert softened["stage_recent_callback"] == ""


def test_character_brain_stage_memory_marks_corrections_temporarily():
    correction = character_brain.build_character_brain_decision(
        user_message="You were wrong.",
        history=[],
    )
    state = character_brain.update_brain_session_state(
        None,
        decision=correction,
        user_message="You were wrong.",
        now_ts=6000,
    )
    next_turn = character_brain.build_character_brain_decision(
        user_message="Anyway, this desk is weird.",
        history=[],
        session_state=state,
    )
    cooled = character_brain.update_brain_session_state(
        state,
        decision=next_turn,
        user_message="Anyway, this desk is weird.",
        now_ts=6015,
    )

    assert correction["improv"]["stance"] == "mock_defensive_repair"
    assert state["stage_correction_state"] == "correcting"
    assert cooled["stage_correction_state"] == "cooling"


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

    assert snapshot["style_beat"]
    assert snapshot["reaction_mode"]
    assert 0 <= snapshot["banter_level"] <= 3
    assert snapshot["opening_move"]
    assert snapshot["reply_shape"]
    assert 0 <= snapshot["spontaneity"] <= 3
    assert snapshot["question_policy"] in {"none", "clarify_only", "optional_playful"}
    assert snapshot["performance_bit"]
    assert snapshot["performance_execution"]["reply_shape"] == snapshot["reply_shape"]
    assert "performance_bit_guide" not in snapshot["performance_execution"]
    assert snapshot["improv"]["stance"]
    assert 0 <= snapshot["improv"]["chaos_level"] <= 3
    assert snapshot["stage_memory"]["agenda"]
    assert snapshot["safety_clamp"]["level"] in {"none", "safe_scene", "task_scene"}
    assert snapshot["continuity"]["recent_user_need"] == "direction"
    assert snapshot["continuity"]["last_topic"] == "planning"
    assert "style_beat_guide" not in snapshot
    assert "reaction_mode_guide" not in snapshot
    assert "performance_bit_guide" not in snapshot
    assert "bit guide" not in raw
    assert "history_tail" not in snapshot
    assert "directive" not in snapshot
    assert "raw history" not in raw
    assert "secret" not in raw
    assert "api_key" not in raw
    assert "prompt text" not in raw
