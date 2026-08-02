import copy
import json

import config


def test_default_asr_values_match_voice_troubleshooting_recommendation():
    asr = config.DEFAULT_CONFIG["asr"]

    assert asr["provider"] == "auto"
    assert asr["streaming_enabled"] is True
    assert asr["final_refine_enabled"] is True
    assert asr["stream_chunk_ms"] == 600
    assert asr["funasr_final_model"] == "iic/SenseVoiceSmall"
    assert asr["funasr_streaming_model"] == "paraformer-zh-streaming"
    assert asr["funasr_batch_size_s"] == 12
    assert asr["sensevoice_service_enabled"] is True
    assert asr["sensevoice_service_managed"] is True
    assert asr["sensevoice_service_url"] == "http://127.0.0.1:9890"
    assert asr["sensevoice_service_runtime"] == "onnx"
    assert asr["sensevoice_service_model"] == "iic/SenseVoiceSmall-onnx"
    assert asr["min_speech_ms"] == 150
    assert asr["silence_trigger_ms"] == 380
    assert asr["max_speech_ms"] == 10000
    assert asr["speech_threshold"] == 0.0035
    assert asr["processor_buffer_size"] == 2048
    assert asr["semantic_correction_enabled"] is True
    assert asr["voice_turn_merge_window_ms"] == 1200
    assert asr["voice_turn_hold_incomplete_enabled"] is True
    assert asr["low_confidence_confirm_enabled"] is True
    assert asr["low_confidence_threshold"] == 0.48
    assert asr["hotword_replacements"]["心语"] == "馨语AI桌宠"
    assert asr["hotword_replacements"]["新语"] == "馨语AI桌宠"


def test_default_asr_language_mode_is_auto_with_optional_local_paths():
    asr = config.DEFAULT_CONFIG["asr"]

    assert asr["input_language_mode"] == "auto"
    assert asr["vosk_model_paths"] == {"zh-CN": "", "en-US": ""}


def test_sanitized_client_config_exposes_only_safe_asr_language_mode_not_model_paths():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["input_language_mode"] = "EN-us"
    cfg["asr"]["vosk_model_paths"] = {"en-US": "D:/private/models/english"}

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["input_language_mode"] == "en"
    assert sanitized["asr"]["sensevoice_service_enabled"] is True
    assert sanitized["asr"]["sensevoice_service_managed"] is True
    assert "vosk_model_paths" not in sanitized["asr"]
    assert "sensevoice_service_url" not in sanitized["asr"]
    assert "sensevoice_service_model" not in sanitized["asr"]
    assert "D:/private/models/english" not in json.dumps(sanitized, ensure_ascii=False)


def test_sanitized_client_config_clamps_invalid_asr_language_mode_to_auto():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["input_language_mode"] = "surprise-language"

    assert config.sanitize_client_config(cfg)["asr"]["input_language_mode"] == "auto"


def test_sanitized_client_config_preserves_low_asr_threshold():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["speech_threshold"] = 0.0017

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["speech_threshold"] == 0.0017


def test_sanitized_client_config_exposes_safe_hybrid_controls_without_model_names():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["provider"] = "funasr_hybrid"
    cfg["asr"]["stream_chunk_ms"] = 20
    cfg["asr"]["funasr_final_model"] = "D:/private/models/final"
    cfg["asr"]["funasr_streaming_model"] = "D:/private/models/streaming"

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["provider"] == "funasr_hybrid"
    assert sanitized["asr"]["streaming_enabled"] is True
    assert sanitized["asr"]["final_refine_enabled"] is True
    assert sanitized["asr"]["stream_chunk_ms"] == 320
    assert "funasr_final_model" not in sanitized["asr"]
    assert "funasr_streaming_model" not in sanitized["asr"]
    assert "D:/private/models" not in json.dumps(sanitized)


def test_sanitized_client_config_exposes_optional_silero_vad_bounds():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["silero_vad_enabled"] = True
    cfg["asr"]["silero_vad_positive_threshold"] = 99
    cfg["asr"]["silero_vad_negative_threshold"] = -1
    cfg["asr"]["silero_vad_redemption_ms"] = 99999

    asr = config.sanitize_client_config(cfg)["asr"]

    assert asr["silero_vad_enabled"] is True
    assert asr["silero_vad_positive_threshold"] == 0.9
    assert asr["silero_vad_negative_threshold"] == 0.05
    assert asr["silero_vad_redemption_ms"] == 1800


def test_sanitized_client_config_clamps_too_low_asr_threshold():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["speech_threshold"] = 0.0001

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["speech_threshold"] == 0.0015


def test_sanitized_client_config_preserves_asr_correction_and_merge_window():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["asr"]["semantic_correction_enabled"] = False
    cfg["asr"]["voice_turn_merge_window_ms"] = 3000
    cfg["asr"]["voice_turn_hold_incomplete_enabled"] = False
    cfg["asr"]["low_confidence_confirm_enabled"] = False
    cfg["asr"]["low_confidence_threshold"] = 1.5

    sanitized = config.sanitize_client_config(cfg)

    assert sanitized["asr"]["semantic_correction_enabled"] is False
    assert sanitized["asr"]["voice_turn_merge_window_ms"] == 2500
    assert sanitized["asr"]["voice_turn_hold_incomplete_enabled"] is False
    assert sanitized["asr"]["low_confidence_confirm_enabled"] is False
    assert sanitized["asr"]["low_confidence_threshold"] == 0.9


def test_default_gpt_sovits_values_favor_stable_voice():
    tts = config.DEFAULT_CONFIG["tts"]

    assert tts["gpt_sovits_top_k"] == 8
    assert tts["gpt_sovits_top_p"] == 0.78
    assert tts["gpt_sovits_temperature"] == 0.36
    assert tts["gpt_sovits_normalize_loudness"] is True
    assert tts["gpt_sovits_target_rms"] == 1400
    assert tts["gpt_sovits_max_rms"] == 5000
    assert tts["gpt_sovits_stream_playback"] is False
    assert tts["stream_first_beat_min_chars"] == 14
    assert tts["stream_inter_segment_pause_ms"] == 95


def test_model_direct_character_brain_guidance_is_explicit_and_default_off():
    runtime = config.DEFAULT_CONFIG["character_runtime"]

    assert runtime["model_direct_reply"] is False
    assert runtime["model_direct_brain_guidance"] is False
    sanitized = config.sanitize_client_config(config.DEFAULT_CONFIG)
    assert sanitized["character_runtime"]["model_direct_brain_guidance"] is False


def test_sanitized_client_config_preserves_safe_tts_timing_fields():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["tts"]["provider"] = "gpt_sovits"
    cfg["tts"]["gpt_sovits_timeout_sec"] = 60
    cfg["tts"]["server_request_timeout_ms"] = 72000
    cfg["tts"]["server_retry_count"] = 3
    cfg["tts"]["server_retry_delay_ms"] = 350
    cfg["tts"]["server_fallback_fail_threshold"] = 2
    cfg["tts"]["server_recovery_probe_interval_ms"] = 24000
    cfg["tts"]["stream_speak_idle_wait_ms"] = 75

    sanitized = config.sanitize_client_config(cfg)
    tts = sanitized["tts"]

    assert tts["gpt_sovits_timeout_sec"] == 60
    assert tts["server_request_timeout_ms"] == 72000
    assert tts["server_retry_count"] == 3
    assert tts["server_retry_delay_ms"] == 350
    assert tts["server_fallback_fail_threshold"] == 2
    assert tts["server_recovery_probe_interval_ms"] == 24000
    assert tts["stream_speak_idle_wait_ms"] == 75


def test_sanitized_tts_prefers_same_voice_retry_by_default():
    tts = config.sanitize_client_config(copy.deepcopy(config.DEFAULT_CONFIG))["tts"]

    assert tts["prefer_voice_consistency"] is True
    assert tts["same_voice_retry_count"] == 2


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


def test_default_conversation_mode_allows_user_speech_interrupt():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)

    assert cfg["conversation_mode"]["interrupt_tts_on_user_speech"] is True
    assert (
        config.sanitize_client_config(cfg)["conversation_mode"][
            "interrupt_tts_on_user_speech"
        ]
        is True
    )


def test_default_conversation_mode_protects_important_speech_briefly():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    conversation = cfg["conversation_mode"]

    assert conversation["protect_important_speech"] is True
    assert conversation["important_speech_min_ms"] == 900
    assert conversation["important_speech_max_hold_ms"] == 4200
    assert conversation["important_speech_force_after_attempts"] == 2
    assert conversation["voice_low_latency_enabled"] is False
    assert conversation["voice_prompt_max_history_messages"] == 4

    conversation["important_speech_min_ms"] = -20
    conversation["important_speech_max_hold_ms"] = 30000
    conversation["important_speech_force_after_attempts"] = 9
    sanitized = config.sanitize_client_config(cfg)["conversation_mode"]

    assert sanitized["protect_important_speech"] is True
    assert sanitized["important_speech_min_ms"] == 0
    assert sanitized["important_speech_max_hold_ms"] == 9000
    assert sanitized["important_speech_force_after_attempts"] == 4
    assert sanitized["voice_low_latency_enabled"] is False
    assert sanitized["voice_prompt_max_history_messages"] == 4


def test_voice_low_latency_config_is_opt_in_and_bounds_recent_history():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["conversation_mode"]["voice_low_latency_enabled"] = True
    cfg["conversation_mode"]["voice_prompt_max_history_messages"] = 99

    sanitized = config.sanitize_client_config(cfg)["conversation_mode"]

    assert sanitized["voice_low_latency_enabled"] is True
    assert sanitized["voice_prompt_max_history_messages"] == 8


def test_default_motion_values_favor_livelier_speech():
    motion = config.DEFAULT_CONFIG["motion"]
    sanitized = config.sanitize_client_config(copy.deepcopy(config.DEFAULT_CONFIG))["motion"]

    assert motion["quiet_speech"] is False
    assert motion["speech_motion_strength"] == 1.48
    assert motion["speaking_cooldown_ms"] == 1100
    assert sanitized["quiet_speech"] is False
    assert sanitized["speech_motion_strength"] == 1.48
    assert sanitized["speaking_cooldown_ms"] == 1100


def test_default_auto_chat_stays_off_but_uses_stage_aside_timing():
    observe = config.DEFAULT_CONFIG["observe"]

    assert observe["auto_chat_enabled"] is False
    assert observe["allow_auto_chat"] is False
    assert observe["auto_chat_min_ms"] == 60000
    assert observe["auto_chat_max_ms"] == 180000
    assert observe["auto_chat_tuning"]["trigger_base_threshold"] == 0.82
    assert observe["auto_chat_tuning"]["short_silence_penalty"] == 0.16
    assert observe["auto_chat_tuning"]["app_interaction_bonus"] == 0.24
    assert observe["auto_chat_tuning"]["app_interaction_window_ms"] == 120000


def test_sanitized_client_config_preserves_stage_aside_auto_chat_defaults():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)

    sanitized = config.sanitize_client_config(cfg)
    observe = sanitized["observe"]

    assert observe["auto_chat_enabled"] is False
    assert observe["allow_auto_chat"] is False
    assert observe["auto_chat_min_ms"] == 60000
    assert observe["auto_chat_max_ms"] == 180000
    assert observe["auto_chat_tuning"]["trigger_base_threshold"] == 0.82
    assert observe["auto_chat_tuning"]["short_silence_penalty"] == 0.16
    assert observe["auto_chat_tuning"]["app_interaction_bonus"] == 0.24
    assert observe["auto_chat_tuning"]["app_interaction_window_ms"] == 120000


def test_sanitized_auto_chat_bounds_app_interaction_signal_tuning():
    cfg = copy.deepcopy(config.DEFAULT_CONFIG)
    cfg["observe"]["auto_chat_tuning"]["app_interaction_bonus"] = 99
    cfg["observe"]["auto_chat_tuning"]["app_interaction_window_ms"] = 1

    tuning = config.sanitize_client_config(cfg)["observe"]["auto_chat_tuning"]

    assert tuning["app_interaction_bonus"] == 0.6
    assert tuning["app_interaction_window_ms"] == 15000
