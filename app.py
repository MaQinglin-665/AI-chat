import json
import os
import sys
import base64
import random
import re
import secrets
import threading
import time
from datetime import datetime
import urllib.error
import urllib.parse
import urllib.request
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
    OLLAMA_DEFAULT_MODEL,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
    OPENAI_DEFAULT_MODEL,
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
from utils import _truncate_text
from memory import (
    build_memory_prompt_block,
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
    WORK_TOOL_DEFS,
    _openai_auth_headers,
    execute_work_tool,
    get_tools_settings,
    should_use_work_tools,
)

from llm_client import (
    call_ollama,
    call_openai_compatible,
    get_llm_user_agent,
    get_openai_tuning,
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
from character_runtime import emotion_to_live2d_hint, normalize_runtime_payload
from app_health import (
    build_character_runtime_health_summary as _build_character_runtime_health_summary,
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
from tool_calling_helpers import (
    build_chat_completions_tool_defs as _build_chat_completions_tool_defs_impl,
    build_responses_tool_defs as _build_responses_tool_defs_impl,
    build_tool_meta_payload,
    inject_tool_intro as _inject_tool_intro_impl,
    parse_tool_args as _parse_tool_args,
)





_SUMMARY_CACHE_LOCK = threading.Lock()
_HISTORY_SUMMARY_CACHE = {"key": "", "summary": ""}
TOOL_META_MARKER = "[[TAFFY_TOOL_META]]"
_TOOL_INTRO = (
    "When user asks for file/code/command/image tasks, use tools. "
    "For regular chat, reply directly without tools. "
    "Always explain briefly what you changed after tool actions."
)
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
        reply_text = normalized_text if normalized_text else fallback_text
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


def apply_hotword_replacements(text, replacements):
    safe = str(text or "")
    if not safe or not isinstance(replacements, dict) or not replacements:
        return safe
    # Replace longer sources first to avoid partial replacement conflicts.
    ordered = sorted(replacements.items(), key=lambda kv: len(str(kv[0])), reverse=True)
    out = safe
    for src, dst in ordered:
        s = str(src or "")
        d = str(dst or "")
        if not s or not d:
            continue
        pattern = re.compile(re.escape(s), flags=re.IGNORECASE)
        out = pattern.sub(d, out)
    return out




def summarize_older_history(llm_cfg, provider, older_history, max_summary_chars=900):
    return _summarize_older_history_impl(
        llm_cfg,
        provider,
        older_history,
        max_summary_chars=max_summary_chars,
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










def _hour_to_period_hint(hour: int) -> str:
    if 5 <= hour < 9:
        return f"现在是早上{hour}点，清晨时段。"
    elif 9 <= hour < 12:
        return f"现在是上午{hour}点。"
    elif 12 <= hour < 14:
        return f"现在是中午{hour}点。"
    elif 14 <= hour < 18:
        return f"现在是下午{hour}点。"
    elif 18 <= hour < 22:
        return f"现在是晚上{hour}点。"
    else:
        return f"现在是深夜{hour}点，这么晚了。"


def build_time_awareness_block() -> str:
    """根据当前时刻返回时段描述，注入 system prompt 让模型有时间感。"""
    hour = datetime.now().hour
    if 5 <= hour < 9:
        period, hint = "清晨", "用户刚起床不久，语气轻柔，别太亢奋。"
    elif 9 <= hour < 12:
        period, hint = "上午", "工作/学习时间，用户可能在忙，回复可以高效简短。"
    elif 12 <= hour < 14:
        period, hint = "午间", "午休时间，语气可以轻松随意。"
    elif 14 <= hour < 18:
        period, hint = "下午", "下午，用户可能有点犯困或在专注做事。"
    elif 18 <= hour < 21:
        period, hint = "傍晚", "下班放学时间，可以温和关心一些。"
    elif 21 <= hour < 24:
        period, hint = "晚上", "夜晚休闲时间，可以随意聊。"
    else:
        period, hint = "深夜", "深夜了，语气轻柔，别太吵。"
    return f"【当前时段】现在是{period}（{hour}点）。{hint}"
# ─────────────────────────────────────────────────────────────────────────────




def generate_inner_thought(llm_cfg, user_message, safe_history,
                           persona_summary="", emotion_state=None,
                           config=None):
    """Generate a brief inner thought before replying."""
    thinking_cfg = (config or {}).get("thinking", {})
    if not thinking_cfg.get("enabled", True):
        return ""

    emotion_hint = ""
    if emotion_state and isinstance(emotion_state, dict):
        dominant = emotion_state.get("dominant", "neutral")
        valence = float(emotion_state.get("valence", 0))
        arousal = float(emotion_state.get("arousal", 0.5))

        if dominant == "happy" or (valence > 0.3 and arousal > 0.5):
            emotion_hint = "你现在状态不错，说话可以跳脱一点，句子短，不用解释，想到哪说到哪。"
        elif dominant in ("sad", "anxious") or valence < -0.2:
            emotion_hint = "你有点低落，能少说就少说，句子可以不完整，不想认真回答就敷衍过去。"
        elif arousal > 0.7:
            emotion_hint = "你现在有点亢奋，说话停不下来，可能会连说几句不给对方插嘴机会，语气偏强烈。"
        elif arousal < 0.3:
            emotion_hint = "你现在很平静，有点懒，能一个字回就不用两个字，不想多想。"
        elif valence > 0.1:
            emotion_hint = "你对这个人还算有好感，偶尔可以露出来，但嘴上不承认。"
        else:
            emotion_hint = "你情绪平平，就正常聊，没什么特别的感觉。"

    runtime_settings = _get_character_runtime_settings(config if isinstance(config, dict) else {})
    demo_stable = bool(runtime_settings.get("enabled", False) and runtime_settings.get("demo_stable", False))

    if demo_stable:
        persona_override = runtime_settings.get("persona_override", {})
        override_enabled = bool(isinstance(persona_override, dict) and persona_override.get("enabled", False))
        override_name = ""
        override_style = ""
        if override_enabled and isinstance(persona_override, dict):
            override_name = str(persona_override.get("name", "") or "").strip()
            override_style = str(persona_override.get("style", "") or "").strip()

        override_hint_parts = []
        if override_name:
            override_hint_parts.extend(
                [
                    f"Your current name is: {override_name}.",
                    "When the user asks who you are, introduce yourself using this name.",
                    "Do not use any other character name.",
                ]
            )
        if override_style:
            override_hint_parts.append(f"Keep this local persona style: {override_style}.")
        override_hint = (" " + " ".join(override_hint_parts)) if override_hint_parts else ""

        variety_hint = (
            "English-first reply policy: Even when the user writes in Chinese, reply primarily in natural spoken English; "
            "the Chinese translation layer may explain it separately, so the main reply should stay English-first. "
            "Reply must end with complete sentences, not half sentences. Usually keep it to 2 to 3 short sentences. "
            "Keep an original desktop AI companion / light supervisor vibe: playful, cheeky, lightly teasing, energetic, witty, reliable. "
            "You may lightly tease or nudge the user, but do not attack the user. "
            "Do not claim long-term memory, learning pipelines, plugin marketplace, or other unshipped capabilities. "
            "Do not call yourself ChatGPT."
        ) + override_hint
    else:
        variety_prompts = [
            "这次你决定用极短的回复，最多一句话，甚至几个字。",
            "这次你心情不错，想多说一点，可以展开聊两三句。",
            "这次你决定完全不问对方问题，说完就收尾。",
            "这次你故意跑题——对方说的东西让你想到了一个完全不相关的事，聊那个。",
            "这次你懒得认真回答，敷衍一句就算了。",
            "这次你突然很认真，想说一句有点分量的话。",
            "这次你想吐槽对方说的话里某个细节。",
            "这次你自言自语，好像在跟自己对话而不是对方。",
            "这次你注意到你们聊天的某个模式，评论一下这个对话本身。",
            "这次你说出一个很强烈的观点，不管对不对，反正你觉得你是对的。",
            "这次你用联想跳跃：对方的话 → 联想到A → 再联想到B → 说B。",
            "这次你假装对方说的话让你很震惊，夸张一点。",
            "这次你想起对方之前说过的某件事，把它翻出来说。",
            "这次你对对方说的话表示完全不关心，转移话题。",
            "这次你回答前先反问自己：我为什么要回答这个问题？",
            "这次你说一句让对方摸不着头脑的话，但你自己觉得很有道理。",
            "这次你的回复开头不是回应对方，而是先说你刚才在想的别的事。",
            "这次你突然收敛，变得很安静，只说一两个字。",
            "这次你想挑战对方说的某个假设，即使你其实不确定。",
            "这次你决定说完全相反的话——如果你之前在某件事上表现得很冷漠，这次热情一点。",
        ]
        # Analyze recent conversation patterns to build weights
        weights = [1.0] * len(variety_prompts)

        if safe_history:
            recent_turns = safe_history[-4:]
            recent_replies = [
                str(t.get("content", "")).strip()
                for t in recent_turns
                if str(t.get("role", "")).strip().lower() == "assistant"
                and str(t.get("content", "")).strip()
            ]

            # Count long replies (>60 chars) in recent history
            long_count = sum(1 for r in recent_replies if len(r) > 60)
            # Count replies ending with question mark
            question_count = sum(1 for r in recent_replies if r.rstrip().endswith(("？", "?")))
            # Count short replies (<15 chars)
            short_count = sum(1 for r in recent_replies if len(r) < 15)

            # If recent replies are mostly long -> boost short/quiet directives
            if long_count >= 2:
                for i, p in enumerate(variety_prompts):
                    if any(k in p for k in ["极短", "一两个字", "安静", "收敛", "敷衍"]):
                        weights[i] *= 2.4

            # If recent replies frequently end with questions -> boost no-question directives
            if question_count >= 2:
                for i, p in enumerate(variety_prompts):
                    if any(k in p for k in ["不问", "收尾", "陈述", "不寻常", "转移"]):
                        weights[i] *= 2.4

            # If recent replies are all short -> boost expansive directives
            if short_count >= 3:
                for i, p in enumerate(variety_prompts):
                    if any(k in p for k in ["展开", "多说", "认真", "分量", "联想跳跃"]):
                        weights[i] *= 2.0

        # Add controlled randomness so directives do not lock into a stable pattern.
        weights = [max(0.05, float(w) * random.uniform(0.9, 1.15)) for w in weights]
        if random.random() < 0.06 and len(variety_prompts) >= 20:
            extreme_indices = [0, 7, 17]
            variety_hint = variety_prompts[random.choice(extreme_indices)]
        else:
            variety_hint = random.choices(variety_prompts, weights=weights, k=1)[0]

    # Build a compact history snippet for context
    history_snippet = ""
    if safe_history:
        recent = safe_history[-4:]
        lines = []
        for turn in recent:
            role = str(turn.get("role", "")).strip().lower()
            content = str(turn.get("content", "")).strip()[:60]
            if not content:
                continue
            if role == "user":
                lines.append(f"用户：{content}")
            elif role == "assistant":
                lines.append(f"你：{content}")
        history_snippet = "\n".join(lines)

    from datetime import datetime as _dt
    _now = _dt.now()
    _hour = _now.hour
    time_hint = _hour_to_period_hint(_hour)

    if demo_stable:
        thinking_prompt = (
            "你是 馨语AI桌宠 的内心独白生成器。"
            "目标是让回复短、稳、有角色感。\n\n"
            f"【本轮行为指令】{variety_hint}\n\n"
            f"【最近对话】\n{history_snippet}\n\n"
            f"【对方这句话】{user_message[:200]}\n\n"
            f"【当前情绪】{emotion_hint}\n\n"
            f"【当前时间】{time_hint}\n\n"
            "按以下结构思考（用1-3句话，不超过80字）：\n"
            "① 对方意图是什么，给出最直接回应方向\n"
            "② 保持桌宠角色感：可爱但嘴硬、轻微监督，不攻击\n"
            "③ 控制节奏：短句收尾，不长篇解释，不承诺未完成能力\n\n"
            "直接输出内心独白，不要加任何前缀标签。"
        )
    else:
        thinking_prompt = (
            "你是 馨语AI桌宠 的内心独白生成器。你的任务是产生一段真实的、有行动指令的内心想法，"
            "用来决定 馨语AI桌宠 这次回复的方向、长度和态度。\n\n"
            f"【本轮行为指令】{variety_hint}\n\n"
            f"【最近对话】\n{history_snippet}\n\n"
            f"【对方这句话】{user_message[:200]}\n\n"
            f"【当前情绪】{emotion_hint}\n\n"
            f"【当前时间】{time_hint}\n\n"
            "按以下结构思考（用1-4句话，不超过100字）：\n"
            "① 对方这句话的字面意思是什么？真实意图或隐含挑战是什么？（两者可能不同）\n"
            "② 根据行为指令，我决定用什么方式、什么长度回复\n"
            "③ 这次回复里有一个'不寻常之处'——具体是什么\n"
            "④ 这次用什么句式和语气说——例如：碎片句/一个词/反问/陈述收尾/突然转移/自言自语\n\n"
            "直接输出内心独白，不要加任何前缀标签。"
        )

    messages = [
        {"role": "system", "content": thinking_prompt},
        {"role": "user", "content": user_message[:200]},
    ]

    try:
        base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
        model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
        key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
        api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        max_tokens = int(thinking_cfg.get("max_tokens", 150))
        timeout = int(thinking_cfg.get("timeout_sec", 15))

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        }
        if demo_stable:
            payload["temperature"] = 0.35
            payload["frequency_penalty"] = 0.1
            payload["presence_penalty"] = 0.05
        else:
            payload["temperature"] = 0.9
            payload["frequency_penalty"] = 0.35
            payload["presence_penalty"] = 0.25
        data = http_post_json(
            f"{base_url}/chat/completions", payload,
            headers=headers, timeout=timeout
        )
        thought = str(
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        ).strip()
        if not thought:
            return ""
        if len(thought) < 4:
            return ""
        return thought[:200]
    except Exception:
        return ""


def should_reply(user_message, config=None, is_auto=False):
    """Decide whether the pet should reply to this message."""
    if not isinstance(config, dict):
        config = load_config()
    decision_cfg = config.get("decision", {})
    if not decision_cfg.get("enabled", True):
        return True

    msg = str(user_message or "").strip().lower()

    # Always reply to direct address or questions
    always_keywords = decision_cfg.get(
        "always_reply_keywords",
        [
            "\u99a8\u8bed",
            "\u99a8\u8bedai",
            "xinyu",
            "\u5854\u83f2",
            "taffy",
            "?",
            "\uff1f",
            "\u5e2e\u6211",
            "\u544a\u8bc9\u6211",
        ],
    )
    for kw in always_keywords:
        if kw.lower() in msg:
            return True

    # In non-auto mode (user explicitly typed), always reply
    if not is_auto:
        return True

    # In auto mode, sometimes stay silent
    silence_keywords = decision_cfg.get("silence_keywords",
        ["嗯", "哦", "ok", "好的", "知道了"])
    for kw in silence_keywords:
        if msg == kw:
            return False

    # Random silence based on probability
    prob = float(decision_cfg.get("silence_probability", 0.15))
    if random.random() < prob:
        return False

    return True


def _build_base_prompt(config, user_message, history, llm_cfg, provider):
    history_settings = get_history_summary_settings(config)
    keep_recent = max(12, int(history_settings.get("keep_recent_messages", 8)))
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
    if not isinstance(config, dict):
        config = load_config()
    if not should_reply(user_message, config=config, is_auto=is_auto):
        return ""
    llm_cfg_raw = config.get("llm", {})
    llm_cfg = _build_reply_llm_cfg(config, llm_cfg_raw)
    provider = str(llm_cfg_raw.get("provider", "")).strip().lower()
    base_url = str(llm_cfg_raw.get("base_url", "")).strip().lower()
    if not provider:
        provider = "ollama" if "11434" in base_url or "ollama" in base_url else "openai"
    _ensure_llm_auth_ready(llm_cfg)

    base_prompt, safe_history = _build_base_prompt(
        config, user_message, history, llm_cfg_raw, provider
    )
    # Thinking layer
    thought = ""
    thinking_cfg = config.get("thinking", {})
    if thinking_cfg.get("enabled", True) and not is_auto:
        thought = generate_inner_thought(
            llm_cfg, user_message, safe_history,
            persona_summary=base_prompt[:200],
            emotion_state=load_emotion_state(),
            config=config,
        )
    if thought:
        from datetime import datetime as _dt
        _now = _dt.now()
        _hour = _now.hour
        time_hint = _hour_to_period_hint(_hour)
        thought_prefix = (
            f"[Inner thought for this turn]: {thought}\n"
            f"[Current local time]: {time_hint}\n"
            "Use this as soft guidance for direction, tone, length, and opening.\n"
            "Do not expose the inner thought directly, and keep the reply coherent.\n"
            "Avoid ending with a question unless it is genuinely needed.\n\n"
        )
    prompt = build_prompt_with_style(
        config,
        user_message,
        safe_history,
        base_prompt,
        is_auto=is_auto,
    )
    lang_block = _build_reply_language_block(config)
    if lang_block:
        prompt = merge_prompt_with_memory(prompt, lang_block)
    stable_behavior_block = _build_demo_stable_reply_behavior_block(config)
    if stable_behavior_block:
        prompt = merge_prompt_with_memory(prompt, stable_behavior_block)
    prompt = _apply_character_runtime_prompt_contract(config, prompt)
    effective_user_message = thought_prefix + user_message if thought else user_message


    tools_settings = get_tools_settings(config)

    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        messages = build_openai_messages(
            prompt=prompt,
            safe_history=safe_history,
            user_message=effective_user_message,
            image_data_url=image_data_url,
        )
        try:
            if force_tools or should_use_work_tools(user_message, tools_settings, image_data_url=image_data_url):
                raw_reply = call_openai_compatible_with_tools(llm_cfg, config, messages)
            else:
                raw_reply = call_openai_compatible(llm_cfg, messages)
            final = finalize_assistant_reply(
                config,
                llm_cfg,
                provider,
                user_message,
                safe_history,
                raw_reply,
                is_auto=is_auto,
            )
            if final and not is_auto:
                update_emotion_from_reply(user_message, final)
            return final
        except Exception as exc:
            if image_data_url:
                wrapped = wrap_vision_error(exc)
                if wrapped is not exc:
                    raise wrapped from exc
            raise _diagnose_llm_exception(exc, llm_cfg) from exc

    if provider == "ollama":
        vision_model = str(
            llm_cfg.get("vision_model")
            or llm_cfg.get("model")
            or OLLAMA_DEFAULT_MODEL
        ).strip()
        text_model = str(
            llm_cfg.get("text_model")
            or llm_cfg.get("model")
            or OLLAMA_DEFAULT_MODEL
        ).strip()
        selected_model = vision_model if image_data_url else text_model

        if image_data_url and not is_likely_ollama_vision_model(selected_model):
            raise RuntimeError(
                "Current Ollama model is text-only. Please switch to a vision model (for example: qwen2.5vl:7b)."
            )
        image_base64 = extract_base64_from_data_url(image_data_url)
        messages = build_ollama_messages(
            prompt=prompt,
            safe_history=safe_history,
            user_message=effective_user_message,
            image_base64=image_base64,
        )
        try:
            raw_reply = call_ollama(llm_cfg, messages, model_override=selected_model)
            final = finalize_assistant_reply(
                config,
                llm_cfg,
                provider,
                user_message,
                safe_history,
                raw_reply,
                is_auto=is_auto,
            )
            if final and not is_auto:
                update_emotion_from_reply(user_message, final)
            return final
        except Exception as exc:
            if image_data_url:
                wrapped = wrap_vision_error(exc)
                if wrapped is not exc:
                    raise wrapped from exc
            raise _diagnose_llm_exception(exc, llm_cfg) from exc

    raise RuntimeError(
        f"Unsupported llm.provider: {provider}. Use 'openai' or 'ollama'."
    )


def call_llm_stream(user_message, history, image_data_url=None, is_auto=False, force_tools=False, config=None):
    if not isinstance(config, dict):
        config = load_config()
    llm_cfg_raw = config.get("llm", {})
    llm_cfg = _build_reply_llm_cfg(config, llm_cfg_raw)
    provider = str(llm_cfg_raw.get("provider", "")).strip().lower()
    base_url = str(llm_cfg_raw.get("base_url", "")).strip().lower()
    if not provider:
        provider = "ollama" if "11434" in base_url or "ollama" in base_url else "openai"
    _ensure_llm_auth_ready(llm_cfg)

    base_prompt, safe_history = _build_base_prompt(
        config, user_message, history, llm_cfg_raw, provider
    )
    merged_prompt = build_prompt_with_style(
        config,
        user_message,
        safe_history,
        base_prompt,
        is_auto=is_auto,
    )
    lang_block = _build_reply_language_block(config)
    if lang_block:
        merged_prompt = merge_prompt_with_memory(merged_prompt, lang_block)
    stable_behavior_block = _build_demo_stable_reply_behavior_block(config)
    if stable_behavior_block:
        merged_prompt = merge_prompt_with_memory(merged_prompt, stable_behavior_block)
    merged_prompt = _apply_character_runtime_prompt_contract(config, merged_prompt)

    tools_settings = get_tools_settings(config)

    if (
        provider in {"openai", "openai-compatible", "openai_compatible"}
        and (force_tools or should_use_work_tools(user_message, tools_settings, image_data_url=image_data_url))
    ):
        # Tool workflow is step-based; return chunked final text for SSE compatibility.
        reply = call_llm(
            user_message,
            history,
            image_data_url=image_data_url,
            is_auto=is_auto,
            force_tools=force_tools,
            config=config,
        )
        for chunk in split_text_for_stream(reply):
            yield chunk
        return

    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        messages = build_openai_messages(
            prompt=merged_prompt,
            safe_history=safe_history,
            user_message=user_message,
            image_data_url=image_data_url,
        )
        streamed = False

        # Try Chat Completions stream first for lower time-to-first-token on many relays.
        try:
            for chunk in iter_openai_chat_stream(llm_cfg, messages):
                if isinstance(chunk, str) and chunk:
                    streamed = True
                    yield chunk
        except Exception:
            streamed = False
        if streamed:
            return

        # Fallback to Responses API stream for relay compatibility.
        try:
            for chunk in iter_openai_responses_stream(llm_cfg, messages):
                if isinstance(chunk, str) and chunk:
                    streamed = True
                    yield chunk
        except Exception:
            # Fallback to non-stream call below.
            streamed = False
        if streamed:
            return

    # Fallback path: fetch full answer then chunk locally.
    # call_llm already runs finalize_assistant_reply internally, so mark it as pre-finalized.
    reply = call_llm(
        user_message,
        history,
        image_data_url=image_data_url,
        is_auto=is_auto,
        force_tools=force_tools,
        config=config,
    )
    # Yield a sentinel so the SSE handler knows not to re-finalize.
    yield "\x00PRE_FINALIZED\x00"
    for chunk in split_text_for_stream(reply):
        yield chunk


def normalize_text_content(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return " ".join(parts).strip()
    return ""


def extract_response_output_text(data):
    direct = data.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    outputs = data.get("output")
    if not isinstance(outputs, list):
        return ""
    parts = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
    return "\n".join(parts).strip()


def convert_messages_to_responses_input(messages):
    converted = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = str(msg.get("role", "user")).strip() or "user"
        raw_content = msg.get("content", "")
        parts = []
        if isinstance(raw_content, str):
            if raw_content.strip():
                parts.append({"type": "input_text", "text": raw_content.strip()})
        elif isinstance(raw_content, list):
            for part in raw_content:
                if not isinstance(part, dict):
                    continue
                ptype = part.get("type")
                if ptype == "text":
                    text = part.get("text")
                    if isinstance(text, str) and text.strip():
                        parts.append({"type": "input_text", "text": text.strip()})
                elif ptype == "image_url":
                    image_url = part.get("image_url")
                    if isinstance(image_url, dict):
                        image_url = image_url.get("url")
                    if isinstance(image_url, str) and image_url.strip():
                        parts.append({"type": "input_image", "image_url": image_url.strip()})
        if parts:
            converted.append({"role": role, "content": parts})
    return converted








def render_tool_execution_summary(tool_payloads, max_chars=1800):
    if not isinstance(tool_payloads, list) or not tool_payloads:
        return ""
    lines = ["我已经帮你执行了这次工具任务。"]
    for idx, payload in enumerate(tool_payloads[:4], start=1):
        if not isinstance(payload, dict):
            continue
        tool_name = str(payload.get("tool", "")).strip() or "unknown_tool"
        if payload.get("ok"):
            result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
            if tool_name == "write_file":
                lines.append(f"{idx}. 已写入文件：{result.get('path', '')}")
            elif tool_name == "replace_in_file":
                lines.append(
                    f"{idx}. 已修改文件：{result.get('path', '')}，替换 {int(result.get('replacements', 0) or 0)} 处。"
                )
            elif tool_name == "read_file":
                lines.append(f"{idx}. 已读取文件：{result.get('path', '')}")
            elif tool_name == "list_files":
                lines.append(f"{idx}. 已列出文件，共 {int(result.get('count', 0) or 0)} 项。")
            elif tool_name == "search_text":
                lines.append(f"{idx}. 已完成文本搜索，命中 {int(result.get('count', 0) or 0)} 条。")
            elif tool_name == "run_command":
                lines.append(
                    f"{idx}. 已执行命令，退出码 {int(result.get('exit_code', 0) or 0)}。"
                )
            elif tool_name == "generate_image":
                lines.append("{}. 已生成图片。".format(idx))
            else:
                result_text = json.dumps(result, ensure_ascii=False)
                lines.append(f"{idx}. {tool_name} 成功：{result_text[:220]}")
        else:
            err = str(payload.get("error", "unknown error"))
            lines.append(f"{idx}. {tool_name} 失败：{err[:260]}")
    text = "\n".join(lines)
    safe_text = _truncate_text(text, max_chars)
    meta = build_tool_meta_payload(tool_payloads)
    if not meta.get("items"):
        return safe_text
    return f"{safe_text}\n{TOOL_META_MARKER}{json.dumps(meta, ensure_ascii=False, separators=(',', ':'))}"


def build_responses_tool_defs():
    return _build_responses_tool_defs_impl(WORK_TOOL_DEFS)


def build_chat_completions_tool_defs():
    return _build_chat_completions_tool_defs_impl(WORK_TOOL_DEFS)


def _inject_tool_intro(messages: list) -> list:
    return _inject_tool_intro_impl(messages, _TOOL_INTRO)


def call_openai_chat_completions_with_tools(llm_cfg, config, messages):
    tools_settings = get_tools_settings(config)
    if not tools_settings.get("enabled", False):
        return call_openai_compatible(llm_cfg, messages)

    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    headers = {}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    convo = _inject_tool_intro(messages)

    chat_tools = build_chat_completions_tool_defs()
    if not chat_tools:
        return call_openai_compatible(llm_cfg, messages)

    executed_payloads = []
    for _ in range(8):
        payload = {
            "model": model,
            "messages": convo,
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "stream": False,
            "max_tokens": tuning["max_output_tokens"],
            "tools": chat_tools,
            "tool_choice": "required" if not executed_payloads else "auto",
        }
        data = http_post_json(
            f"{base_url}/chat/completions", payload, headers=headers, timeout=90
        )
        choices = data.get("choices") or []
        if not choices:
            break
        message = choices[0].get("message", {}) or {}
        content = normalize_text_content(message.get("content", ""))
        tool_calls = message.get("tool_calls") or []

        if not tool_calls:
            if content:
                return content
            break

        assistant_msg = {"role": "assistant", "tool_calls": tool_calls}
        if content:
            assistant_msg["content"] = content
        convo.append(assistant_msg)

        tool_outputs_added = 0
        for tc in tool_calls:
            if not isinstance(tc, dict):
                continue
            call_id = str(tc.get("id", "")).strip()
            fn = tc.get("function") if isinstance(tc.get("function"), dict) else {}
            fn_name = str(fn.get("name", "")).strip()
            fn_args = _parse_tool_args(fn.get("arguments"))
            if not call_id or not fn_name:
                continue
            try:
                result = execute_work_tool(
                    fn_name,
                    fn_args,
                    config,
                    llm_cfg,
                    http_post_json_fn=http_post_json,
                    is_local_url_fn=is_local_url,
                )
                tool_payload = {
                    "ok": True,
                    "tool": fn_name,
                    "args": fn_args,
                    "result": result,
                }
            except Exception as exc:
                tool_payload = {
                    "ok": False,
                    "tool": fn_name,
                    "args": fn_args,
                    "error": str(exc),
                }
            executed_payloads.append(tool_payload)
            convo.append(
                {
                    "role": "tool",
                    "tool_call_id": call_id,
                    "content": json.dumps(tool_payload, ensure_ascii=False),
                }
            )
            tool_outputs_added += 1
        if not tool_outputs_added:
            break

    if executed_payloads:
        return render_tool_execution_summary(
            executed_payloads,
            max_chars=tools_settings.get("max_command_output_chars", 14000),
        )

    return call_openai_compatible(llm_cfg, messages)


def call_openai_compatible_with_tools(llm_cfg, config, messages):
    try:
        return call_openai_chat_completions_with_tools(llm_cfg, config, messages)
    except Exception:
        pass

    tools_settings = get_tools_settings(config)
    if not tools_settings.get("enabled", False):
        return call_openai_compatible(llm_cfg, messages)

    base_url, headers = _openai_auth_headers(llm_cfg, is_local_url)
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    convo = _inject_tool_intro(messages)

    responses_tools = build_responses_tool_defs()
    if not responses_tools:
        return call_openai_compatible(llm_cfg, messages)

    next_input = convert_messages_to_responses_input(convo)
    previous_response_id = None
    executed_payloads = []

    for _ in range(8):
        payload = {
            "model": model,
            "input": next_input,
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "max_output_tokens": tuning["max_output_tokens"],
            "tools": responses_tools,
            "tool_choice": "required" if not executed_payloads else "auto",
            "text": {
                "format": {"type": "text"},
                "verbosity": tuning["verbosity"],
            },
        }
        if tuning["reasoning_effort"]:
            payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
        if previous_response_id:
            payload["previous_response_id"] = previous_response_id
        try:
            data = http_post_json(
                f"{base_url}/responses", payload, headers=headers, timeout=150
            )
        except Exception:
            if executed_payloads:
                return render_tool_execution_summary(
                    executed_payloads,
                    max_chars=tools_settings.get("max_command_output_chars", 14000),
                )
            return call_openai_compatible(llm_cfg, messages)
        resp_id = str(data.get("id", "")).strip()
        if resp_id:
            previous_response_id = resp_id

        outputs = data.get("output") if isinstance(data, dict) else []
        tool_calls = []
        if isinstance(outputs, list):
            for item in outputs:
                if not isinstance(item, dict):
                    continue
                if str(item.get("type", "")).strip() == "function_call":
                    tool_calls.append(item)

        if not tool_calls:
            content = extract_response_output_text(data) if isinstance(data, dict) else ""
            if content:
                return content
            break

        next_input = []
        for tc in tool_calls:
            call_id = str(tc.get("call_id", "")).strip()
            fn_name = str(tc.get("name", "")).strip()
            fn_args = _parse_tool_args(tc.get("arguments"))
            try:
                result = execute_work_tool(
                    fn_name,
                    fn_args,
                    config,
                    llm_cfg,
                    http_post_json_fn=http_post_json,
                    is_local_url_fn=is_local_url,
                )
                tool_payload = {
                    "ok": True,
                    "tool": fn_name,
                    "args": fn_args,
                    "result": result,
                }
            except Exception as exc:
                tool_payload = {
                    "ok": False,
                    "tool": fn_name,
                    "args": fn_args,
                    "error": str(exc),
                }
            if not call_id:
                continue
            executed_payloads.append(tool_payload)
            next_input.append(
                {
                    "type": "function_call_output",
                    "call_id": call_id,
                    "output": json.dumps(tool_payload, ensure_ascii=False),
                }
            )
        if not next_input:
            break

    if executed_payloads:
        return render_tool_execution_summary(
            executed_payloads,
            max_chars=tools_settings.get("max_command_output_chars", 14000),
        )

    return call_openai_compatible(llm_cfg, messages)


def split_text_for_stream(text, chunk_size=14):
    safe = str(text or "")
    if not safe:
        return
    step = max(1, int(chunk_size))
    for i in range(0, len(safe), step):
        yield safe[i : i + step]


def iter_openai_chat_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    headers = {
        "Content-Type": "application/json",
        "User-Agent": get_llm_user_agent(llm_cfg),
    }
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
        "max_tokens": tuning["max_output_tokens"],
    }
    req = urllib.request.Request(
        url=f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    data = json.loads(data_str)
                except Exception:
                    continue
                choices = data.get("choices") or []
                for choice in choices:
                    delta = choice.get("delta") or {}
                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        yield content
                        continue
                    if isinstance(content, list):
                        for part in content:
                            if not isinstance(part, dict):
                                continue
                            text = part.get("text")
                            if isinstance(text, str) and text:
                                yield text
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc


def iter_openai_responses_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)

    headers = {
        "Content-Type": "application/json",
        "User-Agent": get_llm_user_agent(llm_cfg),
    }
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    payload = {
        "model": model,
        "input": convert_messages_to_responses_input(messages),
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
        "max_output_tokens": tuning["max_output_tokens"],
        "text": {
            "format": {"type": "text"},
            "verbosity": tuning["verbosity"],
        },
    }
    if tuning["reasoning_effort"]:
        payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
    req = urllib.request.Request(
        url=f"{base_url}/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    evt = json.loads(data_str)
                except Exception:
                    continue

                evt_type = str(evt.get("type") or "")
                if evt_type == "response.output_text.delta":
                    delta = evt.get("delta")
                    if isinstance(delta, str) and delta:
                        yield delta
                    continue

                if evt_type == "response.completed":
                    return

                if evt_type in {"response.failed", "response.incomplete"}:
                    detail = evt.get("response") or evt
                    raise RuntimeError(f"Responses stream failed: {detail}")

                if evt_type in {"error", "response.error"}:
                    detail = evt.get("error") or evt.get("message") or str(evt)
                    raise RuntimeError(f"Responses stream error: {detail}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc
















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
            text = str(body.get("text", "")).strip()
            voice = body.get("voice")
            prosody = {}
            for key in (
                "speed_ratio",
                "pitch_ratio",
                "volume_ratio",
                "rate",
                "pitch",
                "volume",
            ):
                if key in body:
                    prosody[key] = body.get(key)
            _log_backend_perf(
                "TTS",
                perf_trace_id,
                stage="request_received",
                client_to_server_ms=client_to_server_ms,
                text_chars=len(text),
                has_voice=bool(str(voice or "").strip()),
                prosody_keys=len(prosody),
            )
            if not text:
                self._send_json(
                    {"error": "text cannot be empty."},
                    status=HTTPStatus.BAD_REQUEST,
                    extra_headers=perf_headers,
                )
                return
            try:
                tts_synth_started_ms = _perf_now_ms()
                audio = synthesize_tts_audio(
                    text,
                    voice_override=voice,
                    prosody=prosody,
                    perf_trace_id=perf_trace_id,
                )
                tts_synth_ms = _perf_now_ms() - tts_synth_started_ms
                if not audio:
                    self._send_json(
                        {"error": "TTS 返回空音频，请检查语音服务是否正常运行。"},
                        status=HTTPStatus.SERVICE_UNAVAILABLE,
                        extra_headers=perf_headers,
                    )
                    return
                self._send_audio(
                    audio,
                    content_type=guess_audio_content_type(audio),
                    extra_headers=perf_headers,
                )
                _log_backend_perf(
                    "TTS",
                    perf_trace_id,
                    stage="response_sent",
                    synth_ms=tts_synth_ms,
                    total_ms=_perf_now_ms() - perf_started_ms,
                    audio_bytes=len(audio),
                )
            except Exception as exc:
                _log_backend_perf(
                    "TTS",
                    perf_trace_id,
                    stage="fail",
                    total_ms=_perf_now_ms() - perf_started_ms,
                    error_type=type(exc).__name__,
                )
                _log_backend_exception(
                    "TTS",
                    exc,
                    extra=(
                        f"/api/tts failed | voice={voice!r} | "
                        f"text_len={len(text)} | prosody={list(prosody.keys())}"
                    ),
                )
                self._send_json(
                    _diagnostic_payload(exc),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                    extra_headers=perf_headers,
                )
            return

        if path_only == "/api/translate":
            text = str(body.get("text", "")).strip()
            if not text:
                self._send_json({"error": "text is empty"})
                return
            try:
                cfg = load_config()
                llm_cfg = cfg.get("llm", {})
                translate_cfg = dict(llm_cfg)
                translate_cfg["max_output_tokens"] = 120
                translate_cfg["temperature"] = 0.2
                messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are a translator. Translate the user's text to "
                            "Simplified Chinese. Output ONLY the translation — "
                            "no explanation, no quotation marks."
                        ),
                    },
                    {"role": "user", "content": text},
                ]
                provider = str(llm_cfg.get("provider", "ollama")).lower()
                if provider == "ollama":
                    result = call_ollama(translate_cfg, messages)
                else:
                    result = call_openai_compatible(translate_cfg, messages)
                translated = str(result or "").strip() or text
                self._send_json(
                    {
                        "translated": translated,
                        "translated_text": translated,
                        "degraded": False,
                        "fallback": False,
                    }
                )
            except Exception as exc:
                diagnosed = _diagnose_llm_exception(exc, llm_cfg if "llm_cfg" in locals() else {})
                _log_backend_notice(
                    "TRANSLATE",
                    diagnosed,
                    extra="/api/translate degraded to passthrough",
                )
                safe_error = str(_diagnostic_payload(diagnosed).get("error", "") or "").strip()
                self._send_json(
                    {
                        "translated": text,
                        "translated_text": text,
                        "degraded": True,
                        "fallback": True,
                        "error": safe_error or "translate unavailable",
                    }
                )
            return

        if path_only == "/api/asr_pcm":
            audio_base64 = str(body.get("audio_base64", "")).strip()
            sample_rate = body.get("sample_rate", 16000)
            if not audio_base64:
                self._send_json(
                    {"error": "audio_base64 cannot be empty."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                pcm_data = base64.b64decode(audio_base64, validate=True)
            except Exception:
                self._send_json(
                    {"error": "audio_base64 decode failed."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                raw_text = transcribe_pcm16_with_vosk(
                    pcm_data,
                    sample_rate=sample_rate,
                )
                cfg = load_config()
                asr_cfg = cfg.get("asr", {}) if isinstance(cfg, dict) else {}
                replacements = sanitize_hotword_replacements(
                    asr_cfg.get("hotword_replacements", {})
                )
                text = apply_hotword_replacements(raw_text, replacements)
                self._send_json({"text": text, "raw_text": raw_text})
            except Exception as exc:
                _log_backend_exception("ASR", exc, extra="/api/asr_pcm failed")
                self._send_json(
                    _diagnostic_payload(exc),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
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
                        sanitize_history(history, max_items=max(12, int(get_history_summary_settings(chat_config).get("keep_recent_messages", 8)))),
                        final_reply,
                        is_auto=is_auto,
                    )
                final_reply = _apply_demo_stable_identity_fallback(
                    chat_config, user_message, final_reply
                )
                finalize_ms = _perf_now_ms() - finalize_started_ms
                runtime_started_ms = _perf_now_ms()
                if final_reply:
                    final_reply, runtime_meta = _apply_character_runtime_reply(
                        chat_config,
                        final_reply,
                    )
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
            payload = {"reply": reply}
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
