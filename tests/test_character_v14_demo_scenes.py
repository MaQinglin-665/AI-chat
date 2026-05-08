import copy
import re

import app
import character_brain


def _demo_config():
    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg["assistant_reply_language"] = "en"
    cfg["character_runtime"] = {
        "enabled": True,
        "return_metadata": True,
        "demo_stable": True,
        "auto_apply_reply_cue": True,
    }
    return cfg


def _run_demo_scene(cfg, message, raw_reply, state=None, history=None):
    safe_history = history or []
    decision = character_brain.build_character_brain_decision(
        config=cfg,
        user_message=message,
        history=safe_history,
        session_state=state,
    )
    cfg["_character_brain_decision"] = decision
    reply, runtime = app._apply_character_runtime_reply(cfg, raw_reply)
    reply = app._apply_character_brain_reply_text(cfg, message, reply)
    state = character_brain.update_brain_session_state(
        state,
        decision=decision,
        user_message=message,
        history=safe_history,
    )
    snapshot = character_brain.build_character_brain_public_snapshot(
        decision,
        session_state=state,
    )
    return reply, runtime, snapshot, state


def test_v14_demo_scenes_keep_english_continuity_and_no_routine_questions():
    cfg = _demo_config()
    state = None
    history = []

    scenes = [
        {
            "label": "welcome",
            "message": "Hi Taffy, nice to see you today. Keep it short.",
            "raw": "Hey there!Glad to see you too!Got anything fun in mind?",
            "reply": "Hey there! Glad to see you too!",
            "intent": "greeting",
            "voice": "cheerful",
            "action": "wave",
        },
        {
            "label": "comfort_1",
            "message": "\u6211\u521a\u521a\u88ab\u5426\u5b9a\u4e86\uff0c\u6709\u70b9\u96be\u53d7\u3002",
            "raw": "Awww, that stinks. \u60f3\u804a\u804a\u5417\uff1f",
            "reply": "Awww, that stinks.",
            "intent": "comfort",
            "voice": "soft",
            "action": "none",
        },
        {
            "label": "comfort_2",
            "message": "\u8fd8\u662f\u6709\u70b9\u7f13\u4e0d\u8fc7\u6765\u3002",
            "raw": "Oh, that's tough! Want to talk about it? Keep going!",
            "reply": "Oh, that's tough!",
            "intent": "comfort",
            "voice": "soft",
            "action": "none",
            "style": "comfort_continuing",
            "same_need_turns": 2,
        },
        {
            "label": "next_step_1",
            "message": "\u4e0b\u4e00\u6b65\u6211\u8be5\u505a\u4ec0\u4e48\uff1f",
            "raw": "How about watching a short video or checking some cat memes?",
            "reply": "Pick one tiny next step and give it ten quiet minutes.",
            "intent": "task_help",
            "voice": "serious",
            "action": "think",
        },
        {
            "label": "next_step_2",
            "message": "\u90a3\u63a5\u4e0b\u6765\u5462\uff1f",
            "raw": "What sounds good to you?",
            "reply": "Pick one tiny next step and give it ten quiet minutes.",
            "intent": "task_help",
            "voice": "serious",
            "action": "think",
            "style": "clear_concise",
        },
        {
            "label": "encouragement",
            "message": "\u6211\u5199\u4ee3\u7801\u5361\u4f4f\u4e86\uff0c\u7ed9\u6211\u4e00\u70b9\u9f13\u52b1\u3002",
            "raw": "Coding can be tough, but you've got this! Think of each bug as a little puzzle just waiting to be solved. What do you want to try?",
            "reply": "Coding can be tough, but you've got this! Think of each bug as a little puzzle just waiting to be solved.",
            "intent": "encouragement",
            "voice": "cheerful",
            "action": "happy_idle",
        },
        {
            "label": "closing",
            "message": "\u6211\u51c6\u5907\u4e0b\u7ebf\u4e86\uff0c\u8ddf\u6211\u8bf4\u53e5\u6536\u5c3e\u7684\u8bdd\u3002",
            "raw": "Stay strong! Every line of code is progress.",
            "reply": "Rest up. I'll be here when you come back.",
            "intent": "closing",
            "voice": "soft",
            "action": "wave",
        },
    ]

    for scene in scenes:
        reply, runtime, snapshot, state = _run_demo_scene(
            cfg,
            scene["message"],
            scene["raw"],
            state=state,
            history=history,
        )
        history.extend(
            [
                {"role": "user", "content": scene["message"]},
                {"role": "assistant", "content": reply},
            ]
        )
        history = history[-10:]

        assert reply == scene["reply"], scene["label"]
        assert not re.search(r"[\u4e00-\u9fff]", reply), scene["label"]
        assert not reply.endswith("?"), scene["label"]
        assert snapshot["intent"] == scene["intent"], scene["label"]
        assert snapshot["reply_style"] == scene.get("style", snapshot["reply_style"])
        assert runtime["brain_intent"] == scene["intent"], scene["label"]
        assert runtime["voice_style"] == scene["voice"], scene["label"]
        assert runtime["action"] == scene["action"], scene["label"]
        assert snapshot["output_constraints"]["max_sentences"] <= snapshot["max_sentences"]
        if "same_need_turns" in scene:
            assert snapshot["continuity"]["same_need_turns"] == scene["same_need_turns"]


def test_v14_demo_scene_snapshot_stays_public_and_safe():
    decision = character_brain.build_character_brain_decision(
        config={"llm": {"api_key": "SECRET"}, "assistant_prompt": "private prompt"},
        user_message="What should I do next?",
        history=[{"role": "user", "content": "raw history api_key=SECRET prompt text"}],
    )
    snapshot = character_brain.build_character_brain_public_snapshot(decision)
    raw = str(snapshot).lower()

    assert snapshot["intent"] == "task_help"
    assert "directive" not in snapshot
    assert "history_tail" not in snapshot
    assert "secret" not in raw
    assert "api_key" not in raw
    assert "private prompt" not in raw
