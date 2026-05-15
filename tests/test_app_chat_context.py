import app
import app_chat_context


def test_app_context_facade_keeps_existing_private_entrypoints():
    payload = {
        "stats": {"total": 1, "good": 1, "bad": 0},
        "style_directives": [" keep it short "],
    }

    assert app._sanitize_character_experience_profile(payload) == (
        app_chat_context.sanitize_character_experience_profile(payload)
    )
    assert app._sanitize_input_modality("speech") == app_chat_context.sanitize_input_modality("speech")
    assert app._detect_barge_in_reply_policy("Wait, say it shorter.") == (
        app_chat_context.detect_barge_in_reply_policy("Wait, say it shorter.")
    )


def test_chat_context_sanitizes_interruptions_without_secret_leaks():
    context = app_chat_context.sanitize_conversation_context(
        {
            "interruption": {
                "reason": "user_speech_start",
                "speech_active": True,
                "turn_id": "12",
                "previous_user_message": "Explain config with api_key=SECRET_VALUE",
                "assistant_partial": "Use sk-1234567890abcdef before continuing.",
                "turn_manager": {
                    "action": "finish_key_sentence",
                    "reason": "key_segment",
                    "protected_key_sentence": True,
                    "segment_index": "2",
                    "segment_role": "key",
                    "reply_move": "answer",
                    "private_prompt": "SHOULD_NOT_LEAK",
                },
            }
        },
        "Wait, say it shorter.",
    )
    block = app_chat_context.build_conversation_context_prompt_block(
        context,
        "Wait, say it shorter.",
    )

    interruption = context["interruption"]
    assert interruption["reason"] == "user_speech_start"
    assert interruption["turn_id"] == 12
    assert interruption["turn_manager"]["segment_index"] == 2
    assert interruption["turn_manager"]["protected_key_sentence"] is True
    assert interruption["reply_policy"]["kind"] == "shorten"
    assert "Barge-in reply policy: kind=shorten" in block
    assert "SHOULD_NOT_LEAK" not in block
    assert "SECRET_VALUE" not in block
    assert "sk-1234567890abcdef" not in block
    assert "[redacted]" in block


def test_chat_context_keeps_asr_confirmation_signal():
    context = app_chat_context.sanitize_conversation_context(
        {
            "asr": {
                "source": "Voice Transcript",
                "raw_text": "um api_key=SECRET_VALUE",
                "final_text": "um",
                "confidence": "0.27",
                "reason": "very short",
                "needs_confirmation": True,
            }
        }
    )
    block = app_chat_context.build_conversation_context_prompt_block(context)

    assert context["asr"]["source"] == "voice_transcript"
    assert context["asr"]["confidence"] == 0.27
    assert context["asr"]["needs_confirmation"] is True
    assert context["asr"]["reason"] == "very_short"
    assert "speech recognition" in block
    assert "needs_confirmation=true" in block
    assert "SECRET_VALUE" not in block
    assert "[redacted]" in block


def test_chat_context_clamps_character_experience_and_thought_burst():
    profile = app_chat_context.sanitize_character_experience_profile(
        {
            "updated_at": "123",
            "stats": {"total": 5000, "good": -3, "bad": 4},
            "style_directives": ["short", "short", "warm"],
            "recent_feedback": [
                {"rating": "bad", "issue": "too_long", "emotion": "thinking"},
                {"rating": "ignored"},
            ],
        }
    )
    burst = app_chat_context.sanitize_auto_thought_burst(
        {
            "thought_type": "unknown",
            "min_sentences": 8,
            "max_sentences": 9,
            "stance": "curious",
        }
    )

    assert profile["updated_at"] == 123
    assert profile["stats"] == {"total": 999, "good": 0, "bad": 4}
    assert profile["style_directives"] == ["short", "warm"]
    assert profile["recent_feedback"][0]["issue"] == "too_long"
    assert burst["thought_type"] == "aside"
    assert burst["min_sentences"] == 4
    assert burst["max_sentences"] == 4
    assert burst["length_budget"] == "4-4 sentences"
