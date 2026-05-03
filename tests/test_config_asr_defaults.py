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


def test_default_gpt_sovits_values_favor_stable_voice():
    tts = config.DEFAULT_CONFIG["tts"]

    assert tts["gpt_sovits_top_k"] == 8
    assert tts["gpt_sovits_top_p"] == 0.78
    assert tts["gpt_sovits_temperature"] == 0.36
    assert tts["gpt_sovits_normalize_loudness"] is True
    assert tts["gpt_sovits_target_rms"] == 900
