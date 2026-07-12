from companion_performance_director import infer_model_direct_performance


def test_director_returns_only_fixed_allowlisted_thinking_plan_for_clear_reply():
    assert infer_model_direct_performance("Let me think for a second.") == {
        "emotion": "thinking",
        "action": "think",
        "intensity": "medium",
        "voice_style": "curious",
        "source": "model_director",
    }
    assert infer_model_direct_performance("\u8ba9\u6211\u60f3\u60f3") == {
        "emotion": "thinking",
        "action": "think",
        "intensity": "medium",
        "voice_style": "curious",
        "source": "model_director",
    }


def test_director_prefers_clear_boundary_over_surprise_and_keeps_text_out_of_plan():
    plan = infer_model_direct_performance("No way, I can't do that.")

    assert plan == {
        "emotion": "neutral",
        "action": "shake_head",
        "intensity": "medium",
        "voice_style": "serious",
        "source": "model_director",
    }
    assert "No way" not in repr(plan)


def test_director_handles_punctuation_bounded_surprise_and_celebration():
    assert infer_model_direct_performance("Really?")["emotion"] == "surprised"
    assert infer_model_direct_performance("Really?")["intensity"] == "high"
    assert infer_model_direct_performance("Yes!") == {
        "emotion": "happy",
        "action": "wave",
        "intensity": "high",
        "voice_style": "cheerful",
        "source": "model_director",
    }


def test_director_does_not_turn_ordinary_prose_into_a_performance_plan():
    for text in (
        "I am seriously considering the trade-off.",
        "Hold on to that idea.",
        "The trick is not doing that twice.",
        "Teasing can hurt people.",
        "That works for me.",
    ):
        assert infer_model_direct_performance(text) is None
