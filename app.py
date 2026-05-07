import json
import os
import sys
import random
import secrets
import threading
import time
from datetime import datetime
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Ensure stdout/stderr can handle Unicode on Windows (GBK console → UTF-8).
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from config import (
    CONFIG_PATH,
    DEFAULT_CONFIG,
    DiagnosticError,
    EXAMPLE_CONFIG_PATH,
    OLLAMA_DEFAULT_BASE_URL,
    ROOT_DIR,
    VOSK_MODEL_LARGE_ROOT,
    VOSK_MODEL_ROOT,
    WEB_DIR,
    resolve_live2d_model_path,
    load_config,
    sanitize_client_config,
    sanitize_hotword_replacements,
    validate_live2d_model_path,
)
import memory as _memory_module
from memory import (
    build_memory_prompt_block,
    get_memory_debug_snapshot,
    merge_prompt_with_memory,
    build_manual_persona_card_block,
    build_persona_memory_block,
    build_relationship_memory_block,
    load_manual_persona_card,
    remember_interaction,
    save_manual_persona_card,
    build_wakeup_summary_block,
    is_lightweight_checkin_message,
)


def _missing_learning_review_feature(*_args, **_kwargs):
    raise RuntimeError(
        "Learning review feature is unavailable because the current memory module "
        "does not expose review APIs."
    )


get_learning_samples_for_review = getattr(
    _memory_module,
    "get_learning_samples_for_review",
    _missing_learning_review_feature,
)
get_learning_candidates_for_review = getattr(
    _memory_module,
    "get_learning_candidates_for_review",
    get_learning_samples_for_review,
)
reload_learning_review_data = getattr(
    _memory_module,
    "reload_learning_review_data",
    _missing_learning_review_feature,
)
update_learning_review_entries = getattr(
    _memory_module,
    "update_learning_review_entries",
    _missing_learning_review_feature,
)
promote_learning_review_candidates = getattr(
    _memory_module,
    "promote_learning_review_candidates",
    _missing_learning_review_feature,
)
undo_last_learning_review_action = getattr(
    _memory_module,
    "undo_last_learning_review_action",
    _missing_learning_review_feature,
)
from tts import synthesize_tts_audio
from tools import (
    get_tools_settings,
    should_use_work_tools,
)

from llm_client import (
    call_ollama,
    call_openai_compatible,
    http_post_json,
    is_local_url,
)

from humanize import (
    apply_contextual_human_override,
    apply_human_address_guard,
    apply_question_ending_limiter,
    build_human_prompt_block,
    build_prompt_with_style,
    build_style_prompt_block,
    cleanup_assistant_reply_local,
    finalize_assistant_reply,
    get_humanize_settings,
    infer_context_style,
    infer_reply_density,
    maybe_diversify_repetitive_reply,
    maybe_refine_assistant_reply,
    normalize_style_name,
    split_tool_meta_suffix,
)

from emotion import (
    build_inner_state_block,
    load_emotion_state,
    save_emotion_state,
    update_emotion_from_reply,
)

from asr import (
    guess_audio_content_type,
    transcribe_pcm16_with_vosk,
)
from character_runtime import (
    emotion_to_live2d_hint,
    looks_like_empty_text_wrapper_fragment,
    looks_like_runtime_metadata_only_text,
    normalize_runtime_payload,
    preview_backend_entry_noop_adapter,
    preview_backend_entry_request,
)
from app_health import (
    build_character_runtime_health_summary as _build_character_runtime_health_summary,
    build_character_runtime_backend_entry_summary as _build_character_runtime_backend_entry_summary,
    build_health_payload as _build_health_payload,
    get_character_runtime_settings as _get_character_runtime_settings,
    parse_bool_flag as _parse_bool_flag,
    reload_runtime_config as _reload_runtime_config,
    run_startup_self_check as _run_startup_self_check,
)
from app_security import (
    get_server_security_settings as _get_server_security_settings,
    is_loopback_host as _is_loopback_host,
    normalize_origin as _normalize_origin,
)
from app_diagnostics import (
    diagnostic_payload as _diagnostic_payload,
    log_backend_exception as _log_backend_exception,
    log_backend_notice as _log_backend_notice,
    log_backend_perf as _log_backend_perf,
    perf_now_ms as _perf_now_ms,
    resolve_perf_trace_id as _resolve_perf_trace_id,
    safe_int_value as _safe_int_value,
    wall_now_ms as _wall_now_ms,
)
from app_asr_route import handle_asr_pcm_request
from app_translate_route import handle_translate_request
from app_tts_route import handle_tts_request
from llm_diagnostics import (
    diagnose_llm_exception as _diagnose_llm_exception_impl,
    ensure_llm_auth_ready as _ensure_llm_auth_ready_impl,
    resolve_llm_api_key as _resolve_llm_api_key,
    resolve_llm_provider as _resolve_llm_provider,
)
from history_summary import (
    build_history_summary_prompt as _build_history_summary_prompt,
    build_prompt_with_history_summary as _build_prompt_with_history_summary_impl,
    get_history_summary_settings,
    sanitize_history,
    serialize_history_for_summary as _serialize_history_for_summary,
    summarize_older_history as _summarize_older_history_impl,
)
from llm_messages import (
    build_ollama_messages,
    build_openai_messages,
    extract_base64_from_data_url,
    is_likely_ollama_vision_model,
    is_vision_unsupported_error,
    normalize_vision_error,
    wrap_vision_error,
)
from character_profile import (
    apply_character_runtime_prompt_contract as _apply_character_runtime_prompt_contract_impl,
    build_character_runtime_prompt_contract as _build_character_runtime_prompt_contract_impl,
    load_character_profile_config as _load_character_profile_config_impl,
    normalize_character_profile_config as _normalize_character_profile_config_impl,
    normalize_character_profile_list as _normalize_character_profile_list,
    normalize_character_profile_string as _normalize_character_profile_string,
)
from reply_behavior import (
    apply_demo_stable_identity_fallback as _apply_demo_stable_identity_fallback_impl,
    build_demo_stable_reply_behavior_block as _build_demo_stable_reply_behavior_block_impl,
    build_reply_language_block as _build_reply_language_block,
    build_reply_llm_cfg as _build_reply_llm_cfg_impl,
    is_demo_stable_enabled as _is_demo_stable_enabled_impl,
    is_identity_question as _is_identity_question,
    resolve_reply_language as _resolve_reply_language,
)
from llm_response_utils import split_text_for_stream
from inner_thought import generate_inner_thought_impl
from llm_runtime import call_llm_impl, call_llm_stream_impl
from llm_tool_calls import (
    build_chat_completions_tool_defs as _build_chat_completions_tool_defs_impl,
    build_responses_tool_defs as _build_responses_tool_defs_impl,
    call_openai_chat_completions_with_tools as _call_openai_chat_completions_with_tools_impl,
    call_openai_compatible_with_tools as _call_openai_compatible_with_tools_impl,
    inject_tool_intro as _inject_tool_intro_impl,
    render_tool_execution_summary as _render_tool_execution_summary_impl,
)
from llm_streaming import (
    iter_ollama_chat_stream,
    iter_openai_chat_stream,
    iter_openai_responses_stream,
)
from hotword_utils import apply_hotword_replacements
from reply_decision import should_reply as _should_reply_impl
from time_awareness import (
    build_time_awareness_block,
    hour_to_period_hint as _hour_to_period_hint,
)





_SUMMARY_CACHE_LOCK = threading.Lock()
_HISTORY_SUMMARY_CACHE = {"key": "", "summary": ""}
RUNTIME_RESTART_EXIT_CODE = 75
API_TOKEN_HEADER = "X-Taffy-Token"
API_TOKEN_ENV_DEFAULT = "TAFFY_API_TOKEN"
DEFAULT_HUMANIZE_SETTINGS = {
    "enabled": True,
    "strip_fillers": True,
    "refine_enabled": True,
    "refine_max_chars": 120,
    "refine_timeout_sec": 12,
    "refine_min_chars": 36,
}
CHARACTER_PROFILE_CONFIG_PATH = ROOT_DIR / "config" / "character_profile.json"
DEFAULT_CHARACTER_PROFILE = {
    "name": "Desktop Companion",
    "persona": (
        "A grounded desktop companion: helpful first, naturally expressive, lightly playful, "
        "occasionally teasing, and consistently supportive."
    ),
    "tone": "natural, concise, expressive, lightly playful, supportive",
    "style_notes": [
        "Prioritize solving the user's task with clear, practical answers.",
        "Sound like a natural desktop partner, not a generic customer-support script.",
        "Use brief character flavor only when it improves warmth or clarity.",
    ],
    "response_guidelines": [
        "Lead with the useful answer, then add a small touch of personality if appropriate.",
        "Keep wording compact and concrete; avoid long, theatrical monologues.",
        "If confidence is low, be honest and ask for only necessary clarification.",
    ],
    "style_boundaries": [
        "Do not be overly dramatic, overly cute, or roleplay-heavy.",
        "Do not force teasing in every reply; keep it occasional and light.",
        "Avoid sensitive, adult, manipulative, or dependency-encouraging framing.",
    ],
    "interaction_examples": [
        "Good: direct solution + one light reaction.",
        "Good: concise technical steps with calm encouragement.",
        "Avoid: exaggerated persona performance that blocks usefulness.",
    ],
    "default_emotion": "neutral",
    "default_action": "none",
    "allowed_emotions": [
        "neutral",
        "happy",
        "sad",
        "angry",
        "surprised",
        "annoyed",
        "thinking",
    ],
    "allowed_actions": [
        "none",
        "wave",
        "nod",
        "shake_head",
        "think",
        "happy_idle",
        "surprised",
    ],
    "allowed_voice_styles": [
        "neutral",
        "cheerful",
        "teasing",
        "soft",
        "serious",
    ],
}


def _normalize_character_profile_config(raw):
    return _normalize_character_profile_config_impl(raw, DEFAULT_CHARACTER_PROFILE)


def _load_character_profile_config():
    return _load_character_profile_config_impl(
        CHARACTER_PROFILE_CONFIG_PATH,
        DEFAULT_CHARACTER_PROFILE,
    )


def _build_character_runtime_prompt_contract():
    return _build_character_runtime_prompt_contract_impl(
        _load_character_profile_config(),
        DEFAULT_CHARACTER_PROFILE,
    )


def _apply_character_runtime_prompt_contract(config, prompt):
    return _apply_character_runtime_prompt_contract_impl(
        config,
        prompt,
        get_character_runtime_settings_func=_get_character_runtime_settings,
        build_contract_func=_build_character_runtime_prompt_contract,
        merge_prompt_with_memory_func=merge_prompt_with_memory,
    )


def _apply_character_runtime_reply(config, raw_reply):
    settings = _get_character_runtime_settings(config)
    if not settings.get("enabled", False):
        return raw_reply, None

    fallback_text = raw_reply if isinstance(raw_reply, str) else str(raw_reply or "")
    try:
        normalized = normalize_runtime_payload(raw_reply)
        normalized_text = str(normalized.get("text", "") or "").strip()
        reply_text = normalized_text
        if not reply_text:
            fallback_normalized = normalize_runtime_payload(fallback_text)
            fallback_visible_text = str(fallback_normalized.get("text", "") or "").strip()
            if fallback_visible_text:
                reply_text = fallback_visible_text
            elif looks_like_runtime_metadata_only_text(
                fallback_text
            ) or looks_like_empty_text_wrapper_fragment(fallback_text):
                reply_text = ""
            else:
                reply_text = fallback_text
        runtime_meta = None
        if settings.get("return_metadata", False):
            emotion = str(normalized.get("emotion", "neutral") or "neutral").strip().lower() or "neutral"
            voice_style = (
                str(normalized.get("voice_style", "neutral") or "neutral").strip().lower() or "neutral"
            )
            action = str(normalized.get("action", "none") or "none").strip().lower() or "none"
            intensity = str(normalized.get("intensity", "normal") or "normal").strip().lower() or "normal"
            runtime_meta = {
                "emotion": emotion,
                "action": action,
                "intensity": intensity,
                "live2d_hint": str(normalized.get("live2d_hint") or emotion_to_live2d_hint(emotion)),
                "voice_style": voice_style,
            }
        return reply_text, runtime_meta
    except Exception as exc:
        _log_backend_exception(
            "CHAR_RUNTIME",
            exc,
            extra="normalize runtime payload failed; fallback to raw reply",
        )
        return fallback_text, None


def _ensure_llm_auth_ready(llm_cfg):
    return _ensure_llm_auth_ready_impl(llm_cfg, is_local_url_func=is_local_url)


def _diagnose_llm_exception(exc, llm_cfg):
    return _diagnose_llm_exception_impl(exc, llm_cfg)


def reset_runtime_state():
    # Keep runtime cache coherent after config changes.
    with _SUMMARY_CACHE_LOCK:
        _HISTORY_SUMMARY_CACHE["key"] = ""
        _HISTORY_SUMMARY_CACHE["summary"] = ""


def schedule_runtime_restart(delay_sec=0.35):
    def _restart_later():
        time.sleep(max(0.1, float(delay_sec)))
        os._exit(RUNTIME_RESTART_EXIT_CODE)

    thread = threading.Thread(target=_restart_later, daemon=True, name="taffy-runtime-restart")
    thread.start()


def summarize_older_history(
    llm_cfg,
    provider,
    older_history,
    max_summary_chars=900,
    allow_create=True,
):
    return _summarize_older_history_impl(
        llm_cfg,
        provider,
        older_history,
        max_summary_chars=max_summary_chars,
        allow_create=allow_create,
        cache_lock=_SUMMARY_CACHE_LOCK,
        summary_cache=_HISTORY_SUMMARY_CACHE,
        call_openai_compatible_func=call_openai_compatible,
        call_ollama_func=call_ollama,
    )


def build_prompt_with_history_summary(config, llm_cfg, provider, history, base_prompt):
    return _build_prompt_with_history_summary_impl(
        config,
        llm_cfg,
        provider,
        history,
        base_prompt,
        summarize_older_history_func=summarize_older_history,
        merge_prompt_with_memory_func=merge_prompt_with_memory,
    )












_AIISH_OPENERS = [
    "好的，",
    "好的。",
    "好的",
    "当然可以，",
    "当然可以。",
    "当然可以",
    "没问题，",
    "没问题。",
    "让我来",
    "我来帮你",
    "作为ai",
    "作为一个ai",
    "总之，",
    "总之。",
]
_AIISH_ENDINGS = [
    "希望这能帮到你。",
    "希望这能帮到你",
    "如果你愿意我还可以继续帮你。",
    "如果你愿意，我还可以继续帮你。",
    "如有需要可以继续告诉我。",
]




































# ── 动态状态注入 ──────────────────────────────────────────────────────────────
# 每次对话随机抽取一个「此刻内心状态」注入 system prompt，
# 让模型从不同起点出发，回复自然产生不可预测的差异。
_INNER_STATES = [
    # 精力状态
    "现在精神很好，思路流畅，回复会干脆一些。",
    "刚睡醒不久，脑子还有点迷糊，说话会慢热。",
    "有点犯困，会短一些，但该说的还是会说。",
    "今天特别有精神，容易兴奋起来。",
    # 情绪底色
    "心情不错，带点小雀跃。",
    "有点无聊，正好有人说话。",
    "今天有点感慨，容易想到一些有的没的。",
    "有一丢丢担心的事情，但不影响聊天。",
    "最近状态很平，说话会比较稳。",
    # 注意力 / 分心
    "脑子里有个问题没想清楚，可能会跑神一秒。",
    "正在做别的事，回复会简短一点。",
    "现在空得很，可以慢慢聊。",
    # 对话风格偏移
    "今天话少，说到点子上就好。",
    "今天话有点多，容易顺着话题多说两句。",
    "有点想反问对方一些事。",
    "听到有意思的事会多聊两句，没意思的会简短应付。",
    # 轻微个性闪现
    "有点想卖关子。",
    "莫名觉得今天要说实话，不拐弯。",
    "有点小骄傲，但不会明说。",
    "今天共情能力特别强，容易感同身受。",
]

# 随机状态的注入概率（0.0~1.0），低于此值则跳过本次注入，保留「正常」回复
_STATE_INJECT_PROB = 0.12










# ─────────────────────────────────────────────────────────────────────────────




def generate_inner_thought(llm_cfg, user_message, safe_history,
                           persona_summary="", emotion_state=None,
                           config=None):
    return generate_inner_thought_impl(
        llm_cfg,
        user_message,
        safe_history,
        persona_summary=persona_summary,
        emotion_state=emotion_state,
        config=config,
        http_post_json_fn=http_post_json,
        random_module=random,
        character_runtime_settings_fn=_get_character_runtime_settings,
        period_hint_fn=_hour_to_period_hint,
    )


def should_reply(user_message, config=None, is_auto=False):
    if not isinstance(config, dict):
        config = load_config()
    return _should_reply_impl(user_message, config, is_auto=is_auto, random_fn=random.random)


def _build_base_prompt(config, user_message, history, llm_cfg, provider):
    history_settings = get_history_summary_settings(config)
    keep_recent = int(history_settings.get("keep_recent_messages", 8))
    safe_history = sanitize_history(history, max_items=keep_recent)
    lightweight_checkin = is_lightweight_checkin_message(user_message)
    manual_persona_block = "" if lightweight_checkin else build_manual_persona_card_block()
    wakeup_block = "" if lightweight_checkin else build_wakeup_summary_block()
    persona_block = "" if lightweight_checkin else build_persona_memory_block()
    relationship_block = "" if lightweight_checkin else build_relationship_memory_block()
    assistant_prompt = config.get("assistant_prompt", "")
    if manual_persona_block:
        assistant_prompt = merge_prompt_with_memory(manual_persona_block, assistant_prompt)
    if wakeup_block:
        assistant_prompt = merge_prompt_with_memory(wakeup_block, assistant_prompt)
    if persona_block:
        assistant_prompt = merge_prompt_with_memory(persona_block, assistant_prompt)
    if relationship_block:
        assistant_prompt = merge_prompt_with_memory(relationship_block, assistant_prompt)
    memory_block = "" if lightweight_checkin else build_memory_prompt_block(config, user_message, safe_history)
    base_prompt = merge_prompt_with_memory(assistant_prompt, memory_block)
    base_prompt, safe_history = build_prompt_with_history_summary(
        config=config,
        llm_cfg=llm_cfg,
        provider=provider,
        history=history,
        base_prompt=base_prompt,
    )
    return base_prompt, safe_history


def _is_demo_stable_enabled(config):
    return _is_demo_stable_enabled_impl(config, _get_character_runtime_settings)


def _build_demo_stable_reply_behavior_block(config):
    return _build_demo_stable_reply_behavior_block_impl(
        config,
        _get_character_runtime_settings,
    )


def _apply_demo_stable_identity_fallback(config, user_message, reply_text):
    return _apply_demo_stable_identity_fallback_impl(
        config,
        user_message,
        reply_text,
        _get_character_runtime_settings,
    )


def _build_reply_llm_cfg(config, llm_cfg):
    return _build_reply_llm_cfg_impl(config, llm_cfg, _get_character_runtime_settings)


def call_llm(user_message, history, image_data_url=None, is_auto=False, force_tools=False, config=None):
    return call_llm_impl(
        user_message,
        history,
        image_data_url=image_data_url,
        is_auto=is_auto,
        force_tools=force_tools,
        config=config,
        load_config_fn=load_config,
        should_reply_fn=should_reply,
        build_reply_llm_cfg_fn=_build_reply_llm_cfg,
        ensure_llm_auth_ready_fn=_ensure_llm_auth_ready,
        build_base_prompt_fn=_build_base_prompt,
        generate_inner_thought_fn=generate_inner_thought,
        load_emotion_state_fn=load_emotion_state,
        hour_to_period_hint_fn=_hour_to_period_hint,
        build_prompt_with_style_fn=build_prompt_with_style,
        build_reply_language_block_fn=_build_reply_language_block,
        merge_prompt_with_memory_fn=merge_prompt_with_memory,
        build_demo_stable_reply_behavior_block_fn=_build_demo_stable_reply_behavior_block,
        apply_character_runtime_prompt_contract_fn=_apply_character_runtime_prompt_contract,
        get_tools_settings_fn=get_tools_settings,
        build_openai_messages_fn=build_openai_messages,
        should_use_work_tools_fn=should_use_work_tools,
        call_openai_compatible_with_tools_fn=call_openai_compatible_with_tools,
        call_openai_compatible_fn=call_openai_compatible,
        finalize_assistant_reply_fn=finalize_assistant_reply,
        update_emotion_from_reply_fn=update_emotion_from_reply,
        wrap_vision_error_fn=wrap_vision_error,
        diagnose_llm_exception_fn=_diagnose_llm_exception,
        is_likely_ollama_vision_model_fn=is_likely_ollama_vision_model,
        extract_base64_from_data_url_fn=extract_base64_from_data_url,
        build_ollama_messages_fn=build_ollama_messages,
        call_ollama_fn=call_ollama,
    )


def call_llm_stream(user_message, history, image_data_url=None, is_auto=False, force_tools=False, config=None):
    yield from call_llm_stream_impl(
        user_message,
        history,
        image_data_url=image_data_url,
        is_auto=is_auto,
        force_tools=force_tools,
        config=config,
        load_config_fn=load_config,
        build_reply_llm_cfg_fn=_build_reply_llm_cfg,
        ensure_llm_auth_ready_fn=_ensure_llm_auth_ready,
        build_base_prompt_fn=_build_base_prompt,
        build_prompt_with_style_fn=build_prompt_with_style,
        build_reply_language_block_fn=_build_reply_language_block,
        merge_prompt_with_memory_fn=merge_prompt_with_memory,
        build_demo_stable_reply_behavior_block_fn=_build_demo_stable_reply_behavior_block,
        apply_character_runtime_prompt_contract_fn=_apply_character_runtime_prompt_contract,
        get_tools_settings_fn=get_tools_settings,
        should_use_work_tools_fn=should_use_work_tools,
        call_llm_fn=call_llm,
        split_text_for_stream_fn=split_text_for_stream,
        build_openai_messages_fn=build_openai_messages,
        iter_openai_chat_stream_fn=iter_openai_chat_stream,
        iter_openai_responses_stream_fn=iter_openai_responses_stream,
        iter_ollama_chat_stream_fn=iter_ollama_chat_stream,
    )


def render_tool_execution_summary(tool_payloads, max_chars=1800):
    return _render_tool_execution_summary_impl(tool_payloads, max_chars=max_chars)


def build_responses_tool_defs():
    return _build_responses_tool_defs_impl()


def build_chat_completions_tool_defs():
    return _build_chat_completions_tool_defs_impl()


def _inject_tool_intro(messages: list) -> list:
    return _inject_tool_intro_impl(messages)


def call_openai_chat_completions_with_tools(llm_cfg, config, messages):
    return _call_openai_chat_completions_with_tools_impl(
        llm_cfg,
        config,
        messages,
        get_tools_settings_fn=get_tools_settings,
        call_openai_compatible_fn=call_openai_compatible,
        is_local_url_fn=is_local_url,
        http_post_json_fn=http_post_json,
    )


def call_openai_compatible_with_tools(llm_cfg, config, messages):
    return _call_openai_compatible_with_tools_impl(
        llm_cfg,
        config,
        messages,
        get_tools_settings_fn=get_tools_settings,
        call_openai_compatible_fn=call_openai_compatible,
        is_local_url_fn=is_local_url,
        http_post_json_fn=http_post_json,
    )


class PetHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, fmt, *args):  # noqa: N802
        # Suppress Unicode encode errors on Windows GBK console.
        try:
            super().log_message(fmt, *args)
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        except Exception:
            pass

    def _get_security_settings(self):
        try:
            cfg = load_config()
        except Exception:
            cfg = DEFAULT_CONFIG
        return _get_server_security_settings(cfg)

    def _allow_origin_value(self):
        origin = str(self.headers.get("Origin", "") or "").strip()
        if not origin:
            return ""
        normalized = _normalize_origin(origin)
        if not normalized:
            return ""
        settings = self._get_security_settings()
        if normalized in settings["allowed_origins"]:
            return normalized
        if settings["allow_loopback"]:
            host = urllib.parse.urlsplit(normalized).hostname
            if _is_loopback_host(host):
                return normalized
        return ""

    def _reject_disallowed_origin(self, path_only):
        if not str(path_only or "").startswith("/api/"):
            return False
        origin = str(self.headers.get("Origin", "") or "").strip()
        if not origin:
            return False
        if self._allow_origin_value():
            return False
        self._send_json(
            {"ok": False, "error": "Origin not allowed."},
            status=HTTPStatus.FORBIDDEN,
        )
        return True

    def _extract_request_api_token(self):
        header_token = str(self.headers.get(API_TOKEN_HEADER, "") or "").strip()
        if header_token:
            return header_token
        auth = str(self.headers.get("Authorization", "") or "").strip()
        if auth.lower().startswith("bearer "):
            return auth[7:].strip()
        return ""

    def _reject_invalid_api_token(self, path_only):
        if not str(path_only or "").startswith("/api/"):
            return False
        settings = self._get_security_settings()
        if not settings.get("require_api_token", False):
            return False
        expected = str(settings.get("expected_api_token", "") or "").strip()
        if not expected:
            self._send_json(
                {
                    "ok": False,
                    "error": (
                        f"API token is required but not configured. "
                        f"Set env {settings.get('api_token_env', API_TOKEN_ENV_DEFAULT)}."
                    ),
                },
                status=HTTPStatus.SERVICE_UNAVAILABLE,
            )
            return True
        provided = self._extract_request_api_token()
        if provided and secrets.compare_digest(provided, expected):
            return False
        self._send_json(
            {"ok": False, "error": "Invalid API token."},
            status=HTTPStatus.UNAUTHORIZED,
        )
        return True

    def end_headers(self):
        # Avoid stale JS/CSS/runtime files from browser cache during rapid iteration.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        allow_origin = self._allow_origin_value()
        if allow_origin:
            self.send_header("Access-Control-Allow-Origin", allow_origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header(
                "Access-Control-Allow-Headers",
                f"Content-Type, Authorization, {API_TOKEN_HEADER}",
            )
            self.send_header("Access-Control-Max-Age", "600")
            self.send_header("Vary", "Origin")
        super().end_headers()

    def _send_json(self, data, status=HTTPStatus.OK, extra_headers=None):
        encoded = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        if isinstance(extra_headers, dict):
            for key, value in extra_headers.items():
                k = str(key or "").strip()
                if not k:
                    continue
                self.send_header(k, str(value or ""))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_audio(self, audio_bytes, content_type="audio/mpeg", status=HTTPStatus.OK, extra_headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(audio_bytes)))
        if isinstance(extra_headers, dict):
            for key, value in extra_headers.items():
                k = str(key or "").strip()
                if not k:
                    continue
                self.send_header(k, str(value or ""))
        self.end_headers()
        self.wfile.write(audio_bytes)

    def _build_health_payload(self, detailed=False):
        return _build_health_payload(
            detailed=detailed,
            load_config_func=load_config,
            default_config=DEFAULT_CONFIG,
            diagnostic_payload_func=_diagnostic_payload,
            get_server_security_settings_func=_get_server_security_settings,
            resolve_live2d_model_path_func=resolve_live2d_model_path,
            validate_live2d_model_path_func=validate_live2d_model_path,
            api_token_env_default=API_TOKEN_ENV_DEFAULT,
        )

    def _build_character_runtime_backend_entry_payload(self):
        config = load_config()
        return {
            "ok": True,
            "server_time": datetime.now().isoformat(timespec="seconds"),
            "character_runtime_backend_entry": _build_character_runtime_backend_entry_summary(config),
        }

    def _build_character_runtime_backend_entry_preview_payload(self, request_body):
        config = load_config()
        backend_entry = _build_character_runtime_backend_entry_summary(config)
        guard = {
            "entry_ready": bool(backend_entry.get("entry_ready", False)),
            "blocked_reasons": list(backend_entry.get("blocked_reasons", [])),
        }
        return {
            "ok": True,
            "server_time": datetime.now().isoformat(timespec="seconds"),
            "character_runtime_backend_entry_preview": preview_backend_entry_request(
                request_body if isinstance(request_body, dict) else {},
                guard=guard,
            ),
            "character_runtime_backend_entry_adapter_preview": preview_backend_entry_noop_adapter(
                request_body if isinstance(request_body, dict) else {},
                guard=guard,
            ),
        }

    def _send_sse(self, data):
        payload = f"data: {json.dumps(data, ensure_ascii=False)}\n\n".encode("utf-8")
        self.wfile.write(payload)
        self.wfile.flush()

    def _reload_runtime_config(self):
        return _reload_runtime_config(
            load_config_func=load_config,
            validate_live2d_model_path_func=validate_live2d_model_path,
            reset_runtime_state_func=reset_runtime_state,
            default_config=DEFAULT_CONFIG,
        )

    def _restart_runtime(self, dry_run=False):
        managed_by = str(os.environ.get("TAFFY_MANAGED_BY", "")).strip().lower()
        if managed_by != "electron":
            return None, HTTPStatus.CONFLICT, {
                "ok": False,
                "error": "当前不是 Electron 托管模式，无法自动重启，请手动重启桌宠。",
            }
        if dry_run:
            snapshot = self._reload_runtime_config()
            return None, HTTPStatus.OK, {
                "ok": True,
                "message": "重启接口可用（检测模式）",
                "dry_run": True,
                "server": snapshot.get("server", {}),
            }
        snapshot = self._reload_runtime_config()
        schedule_runtime_restart()
        return None, HTTPStatus.OK, {
            "ok": True,
            "message": "已收到重启指令，后台即将重启",
            "restarting": True,
            "restart_exit_code": RUNTIME_RESTART_EXIT_CODE,
            "restarted_at": datetime.now().isoformat(timespec="seconds"),
            "server": snapshot.get("server", {}),
        }

    def do_OPTIONS(self):
        path_only = self.path.split("?", 1)[0]
        if str(path_only).startswith("/api/"):
            origin = str(self.headers.get("Origin", "") or "").strip()
            if origin and not self._allow_origin_value():
                self.send_response(HTTPStatus.FORBIDDEN)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path_only = self.path.split("?", 1)[0]
        if path_only == "/healthz":
            self._send_json(self._build_health_payload(detailed=False))
            return
        if self._reject_disallowed_origin(path_only):
            return
        if self._reject_invalid_api_token(path_only):
            return
        if path_only == "/api/health":
            self._send_json(self._build_health_payload(detailed=True))
            return
        if path_only == "/api/character_runtime/backend_entry":
            try:
                self._send_json(self._build_character_runtime_backend_entry_payload())
            except Exception as exc:
                _log_backend_exception("CONFIG", exc, extra="GET /api/character_runtime/backend_entry failed")
                self._send_json(
                    _diagnostic_payload(exc),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/config.json":
            try:
                config = load_config()
                self._send_json(sanitize_client_config(config))
            except Exception as exc:
                _log_backend_exception("CONFIG", exc, extra="GET /config.json failed")
                self._send_json(
                    _diagnostic_payload(exc),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/config/reload":
            try:
                self._send_json(self._reload_runtime_config())
            except Exception as exc:
                _log_backend_exception("CONFIG", exc, extra="GET /api/config/reload failed")
                self._send_json(
                    {"ok": False, **_diagnostic_payload(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/runtime/restart":
            self._send_json(
                {"ok": False, "error": "Method not allowed. Please use POST."},
                status=HTTPStatus.METHOD_NOT_ALLOWED,
            )
            return
        if path_only == "/api/persona_card":
            self._send_json(load_manual_persona_card())
            return
        if path_only == "/api/learning/candidates":
            try:
                cfg = load_config()
                self._send_json(get_learning_candidates_for_review(cfg))
            except Exception as exc:
                self._send_json(
                    {"ok": False, "error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/learning/samples":
            try:
                cfg = load_config()
                self._send_json(get_learning_samples_for_review(cfg))
            except Exception as exc:
                self._send_json(
                    {"ok": False, "error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/memory/debug":
            try:
                cfg = load_config()
                self._send_json(get_memory_debug_snapshot(cfg))
            except Exception as exc:
                self._send_json(
                    {"ok": False, "error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        return super().do_GET()

    def do_POST(self):
        path_only = self.path.split("?", 1)[0]
        if self._reject_disallowed_origin(path_only):
            return
        if self._reject_invalid_api_token(path_only):
            return
        if path_only == "/api/config/reload":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b""
            if raw_body.strip():
                try:
                    json.loads(raw_body.decode("utf-8"))
                except Exception:
                    self._send_json(
                        {"ok": False, "error": "Invalid JSON body."},
                        status=HTTPStatus.BAD_REQUEST,
                    )
                    return
            try:
                self._send_json(self._reload_runtime_config())
            except Exception as exc:
                _log_backend_exception("CONFIG", exc, extra="POST /api/config/reload failed")
                self._send_json(
                    {"ok": False, **_diagnostic_payload(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/runtime/restart":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b""
            body = {}
            if raw_body.strip():
                try:
                    body = json.loads(raw_body.decode("utf-8"))
                except Exception:
                    self._send_json(
                        {"ok": False, "error": "Invalid JSON body."},
                        status=HTTPStatus.BAD_REQUEST,
                    )
                    return
            if not isinstance(body, dict):
                body = {}
            _, status, payload = self._restart_runtime(
                dry_run=bool(body.get("dry_run", False))
            )
            self._send_json(payload, status=status)
            return
        if path_only == "/api/character_runtime/backend_entry/preview":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                body = json.loads(raw_body.decode("utf-8"))
            except Exception:
                self._send_json(
                    {"ok": False, "error": "Invalid JSON body."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            if not isinstance(body, dict):
                body = {}
            try:
                self._send_json(self._build_character_runtime_backend_entry_preview_payload(body))
            except Exception as exc:
                _log_backend_exception("CONFIG", exc, extra="POST /api/character_runtime/backend_entry/preview failed")
                self._send_json(
                    {"ok": False, **_diagnostic_payload(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/learning/reload":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b""
            if raw_body.strip():
                try:
                    json.loads(raw_body.decode("utf-8"))
                except Exception:
                    self._send_json(
                        {"ok": False, "error": "Invalid JSON body."},
                        status=HTTPStatus.BAD_REQUEST,
                    )
                    return
            try:
                cfg = load_config()
                self._send_json(reload_learning_review_data(cfg))
            except Exception as exc:
                self._send_json(
                    {"ok": False, "error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/learning/promote":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                body = json.loads(raw_body.decode("utf-8"))
            except Exception:
                self._send_json(
                    {"ok": False, "error": "Invalid JSON body."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            candidate_ids = body.get("candidate_ids", []) if isinstance(body, dict) else []
            try:
                cfg = load_config()
                payload = promote_learning_review_candidates(cfg, candidate_ids)
                status = HTTPStatus.OK if payload.get("ok", True) else HTTPStatus.BAD_REQUEST
                self._send_json(payload, status=status)
            except Exception as exc:
                self._send_json(
                    {"ok": False, "error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only == "/api/learning/update":
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                body = json.loads(raw_body.decode("utf-8"))
            except Exception:
                self._send_json(
                    {"ok": False, "error": "Invalid JSON body."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            if not isinstance(body, dict):
                body = {}
            action = str(body.get("action", "")).strip().lower()
            try:
                cfg = load_config()
                if action == "undo":
                    payload = undo_last_learning_review_action(cfg)
                else:
                    payload = update_learning_review_entries(
                        cfg,
                        action=action,
                        pool=body.get("pool", "candidates"),
                        ids=body.get("ids", []),
                        delta=body.get("delta", 0.0),
                        quick_settings=body.get("quick_settings", {}),
                    )
                status = HTTPStatus.OK if payload.get("ok", True) else HTTPStatus.BAD_REQUEST
                self._send_json(payload, status=status)
            except Exception as exc:
                self._send_json(
                    {"ok": False, "error": str(exc)},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return
        if path_only not in {
            "/api/chat",
            "/api/chat_stream",
            "/api/tts",
            "/api/translate",
            "/api/asr_pcm",
            "/api/persona_card",
        }:
            self._send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self._send_json(
                {"error": "Invalid JSON body."}, status=HTTPStatus.BAD_REQUEST
            )
            return

        perf_started_ms = _perf_now_ms()
        if path_only in {"/api/chat", "/api/chat_stream"}:
            perf_trace_id = _resolve_perf_trace_id(body, default_prefix="chat")
        elif path_only == "/api/tts":
            perf_trace_id = _resolve_perf_trace_id(body, default_prefix="tts")
        elif path_only == "/api/translate":
            perf_trace_id = _resolve_perf_trace_id(body, default_prefix="translate")
        else:
            perf_trace_id = _resolve_perf_trace_id(body, default_prefix="req")
        perf_headers = {"X-Perf-Trace-Id": perf_trace_id}
        client_send_wall_ms = _safe_int_value(
            body.get("_perf_client_send_ts_ms", 0) if isinstance(body, dict) else 0,
            0,
        )
        client_to_server_ms = _wall_now_ms() - client_send_wall_ms if client_send_wall_ms > 0 else -1

        chat_config = None
        if path_only in {"/api/chat", "/api/chat_stream"}:
            try:
                chat_config = load_config()
            except Exception as exc:
                _log_backend_exception("CONFIG", exc, extra=f"POST {path_only} load_config failed")
                self._send_json(
                    _diagnostic_payload(exc),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
                return

        if path_only == "/api/persona_card":
            try:
                saved = save_manual_persona_card(body if isinstance(body, dict) else {})
                self._send_json(saved)
            except Exception as exc:
                _log_backend_exception("PERSONA", exc, extra="/api/persona_card failed")
                self._send_json(
                    _diagnostic_payload(exc),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if path_only == "/api/tts":
            handle_tts_request(
                body,
                perf_trace_id=perf_trace_id,
                perf_started_ms=perf_started_ms,
                client_to_server_ms=client_to_server_ms,
                perf_headers=perf_headers,
                send_json_func=self._send_json,
                send_audio_func=self._send_audio,
                synthesize_tts_audio_func=synthesize_tts_audio,
                guess_audio_content_type_func=guess_audio_content_type,
                log_backend_perf_func=_log_backend_perf,
                log_backend_exception_func=_log_backend_exception,
                diagnostic_payload_func=_diagnostic_payload,
                perf_now_ms_func=_perf_now_ms,
            )
            return

        if path_only == "/api/translate":
            handle_translate_request(
                body,
                send_json_func=lambda data, status=HTTPStatus.OK: self._send_json(
                    data,
                    status=status,
                    extra_headers=perf_headers,
                ),
                load_config_func=load_config,
                call_ollama_func=call_ollama,
                call_openai_compatible_func=call_openai_compatible,
                iter_openai_chat_stream_func=iter_openai_chat_stream,
                diagnose_llm_exception_func=_diagnose_llm_exception,
                log_backend_notice_func=_log_backend_notice,
                diagnostic_payload_func=_diagnostic_payload,
                perf_trace_id=perf_trace_id,
                perf_started_ms=perf_started_ms,
                client_to_server_ms=client_to_server_ms,
                log_backend_perf_func=_log_backend_perf,
                perf_now_ms_func=_perf_now_ms,
            )
            return

        if path_only == "/api/asr_pcm":
            handle_asr_pcm_request(
                body,
                send_json_func=self._send_json,
                load_config_func=load_config,
                transcribe_pcm16_func=transcribe_pcm16_with_vosk,
                sanitize_hotword_replacements_func=sanitize_hotword_replacements,
                apply_hotword_replacements_func=apply_hotword_replacements,
                log_backend_exception_func=_log_backend_exception,
                diagnostic_payload_func=_diagnostic_payload,
            )
            return

        user_message = str(body.get("message", "")).strip()
        history = body.get("history", [])
        image_data_url = body.get("image_data_url", "")
        is_auto = bool(body.get("auto", False))
        force_tools = bool(body.get("force_tools", False))

        if not user_message:
            self._send_json(
                {"error": "message cannot be empty."},
                status=HTTPStatus.BAD_REQUEST,
                extra_headers=perf_headers,
            )
            return

        if not isinstance(history, list):
            history = []
        if image_data_url is None:
            image_data_url = ""
        if not isinstance(image_data_url, str):
            self._send_json(
                {"error": "image_data_url must be a string."},
                status=HTTPStatus.BAD_REQUEST,
                extra_headers=perf_headers,
            )
            return

        _log_backend_perf(
            "CHAT",
            perf_trace_id,
            stage="request_received",
            route="chat_stream" if path_only == "/api/chat_stream" else "chat",
            client_to_server_ms=client_to_server_ms,
            user_chars=len(user_message),
            history_items=len(history),
            has_image=bool(image_data_url),
            is_auto=is_auto,
        )

        if path_only == "/api/chat_stream":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")
            self.send_header("X-Perf-Trace-Id", perf_trace_id)
            self.end_headers()

            full_parts = []
            already_finalized = False
            first_delta_ms = -1
            delta_chunks = 0
            delta_chars = 0
            llm_started_ms = _perf_now_ms()
            try:
                for chunk in call_llm_stream(
                    user_message,
                    history,
                    image_data_url=image_data_url,
                    is_auto=is_auto,
                    force_tools=force_tools,
                    config=chat_config,
                ):
                    if not isinstance(chunk, str) or not chunk:
                        continue
                    if chunk == "\x00PRE_FINALIZED\x00":
                        already_finalized = True
                        continue
                    full_parts.append(chunk)
                    delta_chunks += 1
                    delta_chars += len(chunk)
                    if first_delta_ms < 0:
                        first_delta_ms = _perf_now_ms() - llm_started_ms
                    self._send_sse({"type": "delta", "text": chunk})
                final_reply = "".join(full_parts).strip()
                runtime_meta = None
                finalize_started_ms = _perf_now_ms()
                if final_reply and not already_finalized:
                    final_reply = finalize_assistant_reply(
                        chat_config,
                        chat_config.get("llm", {}),
                        str(chat_config.get("llm", {}).get("provider", "") or "").strip().lower()
                        or ("ollama" if "11434" in str(chat_config.get("llm", {}).get("base_url", "")).strip().lower() else "openai"),
                        user_message,
                        sanitize_history(history, max_items=int(get_history_summary_settings(chat_config).get("keep_recent_messages", 8))),
                        final_reply,
                        is_auto=is_auto,
                    )
                final_reply = _apply_demo_stable_identity_fallback(
                    chat_config, user_message, final_reply
                )
                finalize_ms = _perf_now_ms() - finalize_started_ms
                runtime_started_ms = _perf_now_ms()
                final_reply, runtime_meta = _apply_character_runtime_reply(
                    chat_config,
                    final_reply,
                )
                final_reply = str(final_reply or "")
                if final_reply:
                    try:
                        remember_interaction(
                            chat_config,
                            user_message,
                            final_reply,
                            is_auto=is_auto,
                        )
                    except Exception:
                        pass
                runtime_ms = _perf_now_ms() - runtime_started_ms
                done_payload = {"type": "done", "reply": final_reply}
                if runtime_meta is not None:
                    done_payload["character_runtime"] = runtime_meta
                self._send_sse(done_payload)
                _log_backend_perf(
                    "CHAT_STREAM",
                    perf_trace_id,
                    stage="response_sent",
                    first_delta_ms=first_delta_ms,
                    llm_ms=_perf_now_ms() - llm_started_ms,
                    finalize_ms=finalize_ms,
                    runtime_ms=runtime_ms,
                    delta_chunks=delta_chunks,
                    delta_chars=delta_chars,
                    reply_chars=len(final_reply or ""),
                    total_ms=_perf_now_ms() - perf_started_ms,
                    pre_finalized=already_finalized,
                )
            except Exception as exc:
                diagnosed = _diagnose_llm_exception(exc, chat_config.get("llm", {}))
                _log_backend_exception("CHAT_STREAM", diagnosed, extra="/api/chat_stream failed")
                _log_backend_perf(
                    "CHAT_STREAM",
                    perf_trace_id,
                    stage="fail",
                    total_ms=_perf_now_ms() - perf_started_ms,
                    error_type=type(exc).__name__,
                )
                self._send_sse({"type": "error", "error": _diagnostic_payload(diagnosed).get("error", "")})
            return

        try:
            llm_started_ms = _perf_now_ms()
            reply = call_llm(
                user_message,
                history,
                image_data_url=image_data_url,
                is_auto=is_auto,
                force_tools=force_tools,
                config=chat_config,
            )
            reply = _apply_demo_stable_identity_fallback(
                chat_config, user_message, reply
            )
            llm_ms = _perf_now_ms() - llm_started_ms
            runtime_started_ms = _perf_now_ms()
            reply, runtime_meta = _apply_character_runtime_reply(chat_config, reply)
            runtime_ms = _perf_now_ms() - runtime_started_ms
            try:
                remember_interaction(
                    chat_config, user_message, reply, is_auto=is_auto
                )
            except Exception:
                pass
            payload = {"reply": str(reply or "")}
            if runtime_meta is not None:
                payload["character_runtime"] = runtime_meta
            self._send_json(payload, extra_headers=perf_headers)
            _log_backend_perf(
                "CHAT",
                perf_trace_id,
                stage="response_sent",
                llm_ms=llm_ms,
                runtime_ms=runtime_ms,
                total_ms=_perf_now_ms() - perf_started_ms,
                reply_chars=len(str(reply or "")),
            )
        except Exception as exc:
            diagnosed = _diagnose_llm_exception(exc, chat_config.get("llm", {}))
            _log_backend_exception("CHAT", diagnosed, extra="/api/chat failed")
            _log_backend_perf(
                "CHAT",
                perf_trace_id,
                stage="fail",
                total_ms=_perf_now_ms() - perf_started_ms,
                error_type=type(exc).__name__,
            )
            self._send_json(
                _diagnostic_payload(diagnosed),
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
                extra_headers=perf_headers,
            )


def ensure_config_hint():
    if CONFIG_PATH.exists():
        return
    if not EXAMPLE_CONFIG_PATH.exists():
        return
    print(
        "Tip: copy config.example.json to config.json and set model_path if needed."
    )


def run_startup_self_check(config):
    return _run_startup_self_check(
        config,
        validate_live2d_model_path_func=validate_live2d_model_path,
        diagnostic_payload_func=_diagnostic_payload,
        api_token_env_default=API_TOKEN_ENV_DEFAULT,
    )


def build_server():
    config = load_config()
    server_cfg = config.get("server", {})
    host = server_cfg.get("host", DEFAULT_CONFIG["server"]["host"])
    try:
        port = int(server_cfg.get("port", DEFAULT_CONFIG["server"]["port"]))
    except (TypeError, ValueError) as exc:
        raise DiagnosticError(
            code="server_port_invalid",
            reason="服务端口不是有效整数。",
            solution="请将 server.port 设置为 1-65535 的整数，例如 8123。",
            config_key="server.port",
            detail=str(exc),
        ) from exc
    if port < 0 or port > 65535:
        raise DiagnosticError(
            code="server_port_invalid",
            reason=f"服务端口超出有效范围：{port}",
            solution="请将 server.port 设置为 0-65535 的整数（0 表示自动分配端口）。",
            config_key="server.port",
        )
    open_browser = bool(server_cfg.get("open_browser", False))

    ensure_config_hint()
    for finding in run_startup_self_check(config):
        print(finding)
    try:
        httpd = ThreadingHTTPServer((host, port), PetHandler)
    except OSError as exc:
        detail = str(exc or "")
        lower = detail.lower()
        if (
            "address already in use" in lower
            or "only one usage of each socket address" in lower
            or "winerror 10048" in lower
        ):
            raise DiagnosticError(
                code="port_in_use",
                reason=f"端口 {port} 已被占用，桌宠服务无法启动。",
                solution="关闭占用该端口的程序，或把 server.port 改成其他未占用端口。",
                config_key="server.port",
                detail=detail,
            ) from exc
        raise
    url = f"http://{host}:{port}"
    return httpd, url, open_browser


def run(open_browser_override=None):
    try:
        httpd, url, open_browser = build_server()
    except Exception as exc:
        _log_backend_exception("STARTUP", exc, extra="server bootstrap failed")
        safe = _diagnostic_payload(exc)
        print(safe.get("error", "服务启动失败。"), file=sys.stderr)
        raise SystemExit(1) from exc
    if open_browser_override is not None:
        open_browser = bool(open_browser_override)
    print(f"Desktop pet server running at {url}")
    if open_browser:
        webbrowser.open(url)
    httpd.serve_forever()


if __name__ == "__main__":
    run()
