import copy

import config


def test_default_asr_values_match_voice_troubleshooting_recommendation():
    asr = config.DEFAULT_CONFIG["asr"]

    assert asr["min_speech_ms"] == 150
    assert asr["silence_trigger_ms"] == 380
    assert asr["max_speech_ms"] == 2200
    assert asr["speech_threshold"] == 0.0035
    assert asr["processor_buffer_size"] == 2048


def test_sanitized_client_config_preserves_low_asr_threshold():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["speech_threshold"] = 0.0017

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["speech_threshold"] == 0.0017


def test_sanitized_client_config_clamps_too_low_asr_threshold():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["speech_threshold"] = 0.0001

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["speech_threshold"] == 0.0015
