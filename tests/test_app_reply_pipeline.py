import app_reply_pipeline


def test_runtime_reply_strips_metadata_only_fragment_and_returns_metadata():
    cfg = {
        "character_runtime": {"enabled": True, "return_metadata": True},
        "_character_brain_decision": {
            "intent": "comfort",
            "emotion": "sad",
            "voice_style": "soft",
            "intensity": "low",
        },
    }
    raw = '"emotion": "happy", "action": "wave", "intensity": "normal", "voice_style": "cheerful"'

    reply, meta = app_reply_pipeline.apply_character_runtime_reply(
        cfg,
        raw,
        get_character_runtime_settings_func=lambda config: config["character_runtime"],
        log_backend_exception_func=lambda *_args, **_kwargs: None,
    )

    assert reply == ""
    assert "emotion" not in reply
    assert meta["emotion"] == "sad"
    assert meta["voice_style"] == "soft"
    assert meta["intensity"] == "low"
    assert meta["brain_intent"] == "comfort"


def test_runtime_reply_returns_raw_when_runtime_disabled():
    reply, meta = app_reply_pipeline.apply_character_runtime_reply(
        {"character_runtime": {"enabled": False}},
        {"text": "raw dict"},
        get_character_runtime_settings_func=lambda _config: {"enabled": False},
        log_backend_exception_func=lambda *_args, **_kwargs: None,
    )

    assert reply == {"text": "raw dict"}
    assert meta is None


def test_model_direct_reply_bypasses_runtime_normalization_and_metadata():
    reply, meta = app_reply_pipeline.apply_character_runtime_reply(
        {
            "character_runtime": {
                "enabled": True,
                "return_metadata": True,
                "model_direct_reply": True,
            },
            "_character_brain_decision": {"intent": "comfort"},
        },
        {"text": "keep raw"},
        get_character_runtime_settings_func=lambda config: config["character_runtime"],
        log_backend_exception_func=lambda *_args, **_kwargs: None,
    )

    assert reply == {"text": "keep raw"}
    assert meta is None


def test_brain_reply_text_reapplies_constraints_after_language_guard():
    calls = []

    def constrain(reply, decision, *, user_message):
        calls.append((reply, decision, user_message))
        return f"{reply}|constrained"

    def enforce(_config, _user_message, reply):
        return f"{reply}|language"

    result = app_reply_pipeline.apply_character_brain_reply_text(
        {"_character_brain_decision": {"intent": "task_help"}},
        "hello",
        "answer",
        apply_character_brain_reply_constraints_func=constrain,
        enforce_reply_language_func=enforce,
    )

    assert result == "answer|constrained|language|constrained"
    assert calls == [
        ("answer", {"intent": "task_help"}, "hello"),
        ("answer|constrained|language", {"intent": "task_help"}, "hello"),
    ]


def test_model_direct_reply_text_bypasses_brain_constraints_and_language_guard():
    calls = []

    def constrain(reply, decision, *, user_message):
        calls.append(("constrain", reply, decision, user_message))
        return "template"

    def enforce(_config, _user_message, reply):
        calls.append(("enforce", reply))
        return "language"

    result = app_reply_pipeline.apply_character_brain_reply_text(
        {
            "character_runtime": {"model_direct_reply": True},
            "_character_brain_decision": {"intent": "task_help"},
        },
        "hello",
        "model answer",
        apply_character_brain_reply_constraints_func=constrain,
        enforce_reply_language_func=enforce,
    )

    assert result == "model answer"
    assert calls == []
