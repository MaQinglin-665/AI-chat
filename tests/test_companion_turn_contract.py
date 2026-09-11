from companion_turn_contract import build_companion_turn, is_companion_turn_enabled
from config import sanitize_client_config
from humanize import finalize_assistant_reply


def test_companion_turn_is_opt_in_and_independent_from_character_runtime():
    assert is_companion_turn_enabled({"character_runtime": {"enabled": True}}) is False
    assert is_companion_turn_enabled({"companion_turn": {"enabled": True}}) is True
    assert sanitize_client_config({"companion_turn": {"enabled": True}})["companion_turn"] == {"enabled": True}


def test_companion_turn_preserves_text_and_only_exposes_allowed_performance_fields():
    text = "  Let us keep the odd punctuation — exactly.  "
    turn = build_companion_turn(
        {
            "companion_turn": {"enabled": True},
            "character_runtime": {"model_direct_reply": True},
            "_private_prompt": "must not leak",
        },
        text,
        turn_id="chat-123",
        input_modality="voice",
        runtime_metadata={
            "emotion": "annoyed",
            "action": "ponder",
            "intensity": "normal",
            "voice_style": "not-a-style",
            "history": "must not leak",
            "_internal": "must not leak",
        },
        character_brain={"prompt": "must not leak"},
    )

    assert turn["version"] == 1
    assert turn["id"] == "chat-123"
    assert turn["reply_text"] == text
    assert turn["spoken_text"] == text
    assert turn["mode"] == "reply"
    assert turn["input_modality"] == "voice"
    assert turn["performance"] == {
        "emotion": "angry",
        "action": "think",
        "intensity": "medium",
        "voice_style": "neutral",
        "source": "character_runtime",
    }
    assert turn["performance_segments_version"] == 1
    assert len(turn["performance_segments"]) == 1
    assert turn["performance_segments"][0]["performance"]["emotion"] == "angry"
    assert turn["source"] == "model_direct"
    serialized = repr(turn)
    assert "private" not in serialized
    assert "history" not in serialized
    assert "prompt" not in serialized


def test_companion_turn_keeps_legacy_no_text_heuristic_when_model_direct_is_disabled():
    turn = build_companion_turn(
        {"companion_turn": {"enabled": True}},
        "Wow, that was surprising!",
        turn_id="chat-1",
        is_auto=True,
        input_modality="auto",
    )

    assert turn["performance"] is None
    assert turn["mode"] == "auto"
    assert turn["input_modality"] == "auto"


def test_model_direct_companion_turn_adds_a_deterministic_visible_thinking_plan():
    text = "Let me think for a second."
    turn = build_companion_turn(
        {
            "companion_turn": {"enabled": True},
            "character_runtime": {"model_direct_reply": True},
        },
        text,
        turn_id="chat-2",
    )

    assert turn["reply_text"] == text
    assert turn["spoken_text"] == text
    assert turn["performance"] == {
        "emotion": "thinking",
        "action": "think",
        "intensity": "medium",
        "voice_style": "curious",
        "source": "model_director",
    }


def test_model_direct_companion_turn_keeps_ambiguous_reply_unplanned():
    turn = build_companion_turn(
        {
            "companion_turn": {"enabled": True},
            "character_runtime": {"model_direct_reply": True},
        },
        "That works for me.",
        turn_id="chat-3",
    )

    assert turn["performance"] is None
    assert turn["performance_segments"][0]["performance"]["emotion"] == "neutral"


def test_model_direct_companion_turn_exposes_per_sentence_performance_without_changing_text():
    text = "嘿嘿，骗你的。认真说，必须先保存文件。"
    turn = build_companion_turn(
        {
            "companion_turn": {"enabled": True},
            "character_runtime": {"model_direct_reply": True},
        },
        text,
        turn_id="chat-segments",
    )

    assert turn["reply_text"] == text
    assert turn["spoken_text"] == text
    assert [item["performance"]["emotion"] for item in turn["performance_segments"]] == [
        "playful",
        "serious",
    ]


def test_companion_turn_returns_none_when_disabled_or_blank():
    assert build_companion_turn({}, "hello", turn_id="chat-1") is None
    assert build_companion_turn({"companion_turn": {"enabled": True}}, "   ", turn_id="chat-1") is None


def test_model_direct_finalizer_preserves_text_without_language_or_humanize_rewrites():
    raw = "  中文和 English 都保留?!  "
    result = finalize_assistant_reply(
        {
            "assistant_reply_language": "en",
            "humanize": {"enabled": True},
            "character_runtime": {"model_direct_reply": True},
        },
        {},
        "openai",
        "hello",
        [],
        raw,
    )
    assert result == raw
