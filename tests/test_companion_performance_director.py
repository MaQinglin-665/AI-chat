from companion_performance_director import (
    infer_model_direct_performance,
    infer_segment_performance,
    split_performance_segments,
)


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


def test_segment_director_distinguishes_anime_companion_delivery_states():
    cases = {
        "好耶！我们做到了！": ("excited", "happy_idle", "high", "cheerful"),
        "嘿嘿，我只是逗你的。": ("playful", "none", "medium", "teasing"),
        "别这么看我啦，有点害羞。": ("shy", "none", "medium", "soft"),
        "你居然把我忘了，有点委屈。": ("hurt", "none", "low", "soft"),
        "认真说，重点是先保存文件。": ("serious", "none", "medium", "serious"),
    }
    for text, expected in cases.items():
        plan = infer_segment_performance(text)
        assert (
            plan["emotion"],
            plan["action"],
            plan["intensity"],
            plan["voice_style"],
        ) == expected


def test_segment_director_prefers_visible_sentence_over_turn_baseline():
    baseline = {
        "emotion": "playful",
        "voice_style": "teasing",
    }
    assert infer_segment_performance("说正经的，必须先停下来。", baseline)["emotion"] == "serious"
    assert infer_segment_performance("普通的补充说明。", baseline)["emotion"] == "playful"


def test_split_performance_segments_preserves_offsets_and_local_emotion():
    text = "嘿嘿，骗你的。认真说，先保存文件！不会吧？"
    segments = split_performance_segments(text)

    assert [item["text"] for item in segments] == [
        "嘿嘿，骗你的。",
        "认真说，先保存文件！",
        "不会吧？",
    ]
    assert [item["performance"]["emotion"] for item in segments] == [
        "playful",
        "serious",
        "surprised",
    ]
    for item in segments:
        assert text[item["start"] : item["end"]] == item["text"]
