from natural_conversation import (
    build_natural_conversation_prompt_block,
    is_natural_conversation_enabled,
    parse_natural_conversation_output,
    public_natural_conversation_decision,
)
from config import DEFAULT_CONFIG, sanitize_client_config


def _config(**overrides):
    settings = {
        "enabled": True,
        "voice_only": True,
        "allow_silence": True,
        "allow_micro_reaction": True,
        "allow_defer": True,
        "quick_delay_ms": 600,
        "normal_delay_ms": 1200,
        "deep_delay_ms": 2400,
    }
    settings.update(overrides)
    return {
        "_input_modality": "voice",
        "natural_conversation": settings,
    }


def test_missing_setting_preserves_legacy_reply_behavior():
    config = {"_input_modality": "voice"}
    assert is_natural_conversation_enabled(config) is False
    decision = parse_natural_conversation_output("[[TAFFY_SILENCE]]", config)
    assert decision["mode"] == "reply"
    assert decision["reply_text"] == "[[TAFFY_SILENCE]]"
    assert public_natural_conversation_decision(decision) is None


def test_voice_only_contract_does_not_change_typed_chat():
    config = _config()
    config["_input_modality"] = "text"
    assert build_natural_conversation_prompt_block(config) == ""


def test_opted_in_auto_awareness_can_use_natural_participation_contract():
    config = _config()
    config["_input_modality"] = "auto"
    config["_natural_participation"] = True

    assert is_natural_conversation_enabled(config) is True
    assert "[[TAFFY_SILENCE]]" in build_natural_conversation_prompt_block(config)


def test_reply_control_is_stripped_and_depth_selects_delay():
    decision = parse_natural_conversation_output(
        "[[TAFFY_REPLY:deep]]\n我想了一下，这件事可以慢慢来。",
        _config(),
    )
    assert decision["mode"] == "reply"
    assert decision["reply_text"] == "我想了一下，这件事可以慢慢来。"
    assert decision["thinking_level"] == "deep"
    assert decision["thinking_delay_ms"] == 2400
    assert decision["controlled"] is True


def test_silence_micro_reaction_and_defer_never_leak_control_text():
    silence = parse_natural_conversation_output("[[TAFFY_SILENCE]]", _config())
    reaction = parse_natural_conversation_output(
        "[[TAFFY_REACT:concerned]]",
        _config(),
    )
    deferred = parse_natural_conversation_output("[[TAFFY_DEFER]]", _config())

    assert silence["mode"] == "silence"
    assert silence["reply_text"] == ""
    assert reaction["mode"] == "micro_reaction"
    assert reaction["reaction"] == "concerned"
    assert reaction["reply_text"] == ""
    assert deferred["mode"] == "defer"
    assert deferred["reply_text"] == ""


def test_malformed_or_empty_reply_control_degrades_to_visible_reply():
    malformed = parse_natural_conversation_output(
        "[[TAFFY_UNKNOWN]] hello",
        _config(),
    )
    empty_reply = parse_natural_conversation_output(
        "[[TAFFY_REPLY:quick]]",
        _config(),
    )
    assert malformed["mode"] == "reply"
    assert malformed["reply_text"] == "[[TAFFY_UNKNOWN]] hello"
    assert empty_reply["mode"] == "reply"
    assert empty_reply["reply_text"] == "[[TAFFY_REPLY:quick]]"


def test_prompt_requires_reply_for_direct_requests_and_allows_quiet_presence():
    prompt = build_natural_conversation_prompt_block(_config())
    assert "[[TAFFY_SILENCE]]" in prompt
    assert "[[TAFFY_REACT:" in prompt
    assert "direct question" in prompt
    assert "continuous companionship" in prompt


def test_public_default_is_off_and_client_config_is_bounded():
    assert DEFAULT_CONFIG["natural_conversation"]["enabled"] is False
    client = sanitize_client_config(
        {
            "natural_conversation": {
                "enabled": True,
                "ambient_context_ttl_ms": 9999999,
                "quick_delay_ms": -1,
                "normal_delay_ms": 99999,
                "deep_delay_ms": 99999,
            }
        }
    )
    natural = client["natural_conversation"]
    assert natural["enabled"] is True
    assert natural["ambient_context_ttl_ms"] == 900000
    assert natural["quick_delay_ms"] == 200
    assert natural["normal_delay_ms"] == 3000
    assert natural["deep_delay_ms"] == 5000
