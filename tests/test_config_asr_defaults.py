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
    assert tts["gpt_sovits_target_rms"] == 1400
    assert tts["gpt_sovits_max_rms"] == 5000


def test_sanitized_client_config_preserves_safe_tts_timing_fields():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["tts"]["provider"] = "gpt_sovits"
    cfg["tts"]["gpt_sovits_timeout_sec"] = 60
    cfg["tts"]["server_request_timeout_ms"] = 72000
    cfg["tts"]["server_retry_count"] = 3
    cfg["tts"]["server_retry_delay_ms"] = 350
    cfg["tts"]["server_fallback_fail_threshold"] = 2
    cfg["tts"]["stream_speak_idle_wait_ms"] = 75

    sanitized = config.sanitize_client_config(cfg)
    tts = sanitized["tts"]

    assert tts["gpt_sovits_timeout_sec"] == 60
    assert tts["server_request_timeout_ms"] == 72000
    assert tts["server_retry_count"] == 3
    assert tts["server_retry_delay_ms"] == 350
    assert tts["server_fallback_fail_threshold"] == 2
    assert tts["stream_speak_idle_wait_ms"] == 75


def test_sanitized_client_config_derives_tts_request_timeout_from_gpt_sovits_timeout():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["tts"]["provider"] = "gpt_sovits"
    cfg["tts"].pop("server_request_timeout_ms", None)
    cfg["tts"]["gpt_sovits_timeout_sec"] = 60

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["tts"]["server_request_timeout_ms"] == 60000


def test_sanitized_client_config_preserves_chat_stream_switch():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)

    assert config.sanitize_client_config(cfg)["conversation_mode"]["chat_stream_enabled"] is True

    cfg["conversation_mode"]["chat_stream_enabled"] = False
    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["conversation_mode"]["chat_stream_enabled"] is False
