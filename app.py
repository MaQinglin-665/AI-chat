import json
import os
import sys
import base64
import random
import re
import ipaddress
import hashlib
import secrets
import threading
import time
import traceback
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
    redact_sensitive_text,
    resolve_live2d_model_path,
    load_config,
    sanitize_client_config,
    sanitize_hotword_replacements,
    validate_live2d_model_path,
)
import memory as _memory_module
from utils import _clamp_int, _clamp_float, _truncate_text
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


def _parse_bool_flag(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value or "").strip().lower()
    if not text:
        return bool(default)
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    return bool(default)


def _get_character_runtime_settings(config):
    default_settings = {
        "enabled": False,
        "return_metadata": False,
        "demo_stable": False,
        "persona_override": {"enabled": False, "name": "", "style": ""},
    }
    try:
        if not isinstance(config, dict):
            return dict(default_settings)
        raw = config.get("character_runtime", {})
        if not isinstance(raw, dict):
            return dict(default_settings)
        enabled = _parse_bool_flag(raw.get("enabled", False), False)
        return_metadata = _parse_bool_flag(raw.get("return_metadata", False), False)
        demo_stable = _parse_bool_flag(raw.get("demo_stable", False), False)
        override_raw = raw.get("persona_override", {})
        override_enabled = False
        override_name = ""
        override_style = ""
        if isinstance(override_raw, dict):
            override_enabled = _parse_bool_flag(override_raw.get("enabled", False), False)
            override_name = str(override_raw.get("name", "") or "").strip()
            override_style = str(override_raw.get("style", "") or "").strip()
            if len(override_name) > 80:
                override_name = override_name[:80].strip()
            if len(override_style) > 280:
                override_style = override_style[:280].strip()
            if not override_name and not override_style:
                override_enabled = False
        if not enabled:
            return dict(default_settings)
        return {
            "enabled": True,
            "return_metadata": return_metadata,
            "demo_stable": demo_stable,
            "persona_override": {
                "enabled": bool(override_enabled),
                "name": override_name,
                "style": override_style,
            },
        }
    except Exception:
        return dict(default_settings)


def _normalize_character_profile_string(value, fallback):
    if isinstance(value, str):
        text = value.strip()
        if text:
            return text
    return str(fallback or "").strip()


def _normalize_character_profile_list(value, fallback):
    fallback_items = [str(x or "").strip() for x in (fallback or []) if isinstance(x, str) and str(x or "").strip()]
    if not isinstance(value, list):
        return fallback_items
    out = []
    for item in value:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if not text:
            continue
        out.append(text)
    return out or fallback_items


def _normalize_character_profile_config(raw):
    safe = raw if isinstance(raw, dict) else {}
    defaults = DEFAULT_CHARACTER_PROFILE
    return {
        "name": _normalize_character_profile_string(safe.get("name"), defaults["name"]),
        "persona": _normalize_character_profile_string(safe.get("persona"), defaults["persona"]),
        "tone": _normalize_character_profile_string(safe.get("tone"), defaults["tone"]),
        "style_notes": _normalize_character_profile_list(safe.get("style_notes"), defaults["style_notes"]),
        "response_guidelines": _normalize_character_profile_list(
            safe.get("response_guidelines"), defaults["response_guidelines"]
        ),
        "style_boundaries": _normalize_character_profile_list(
            safe.get("style_boundaries"), defaults["style_boundaries"]
        ),
        "interaction_examples": _normalize_character_profile_list(
            safe.get("interaction_examples"), defaults["interaction_examples"]
        ),
        "default_emotion": _normalize_character_profile_string(
            safe.get("default_emotion"), defaults["default_emotion"]
        ),
        "default_action": _normalize_character_profile_string(safe.get("default_action"), defaults["default_action"]),
        "allowed_emotions": _normalize_character_profile_list(
            safe.get("allowed_emotions"), defaults["allowed_emotions"]
        ),
        "allowed_actions": _normalize_character_profile_list(
            safe.get("allowed_actions"), defaults["allowed_actions"]
        ),
        "allowed_voice_styles": _normalize_character_profile_list(
            safe.get("allowed_voice_styles"), defaults["allowed_voice_styles"]
        ),
    }


def _load_character_profile_config():
    safe_default = _normalize_character_profile_config(DEFAULT_CHARACTER_PROFILE)
    try:
        path = CHARACTER_PROFILE_CONFIG_PATH
        if not path.exists():
            return safe_default
        parsed = json.loads(path.read_text(encoding="utf-8"))
        return _normalize_character_profile_config(parsed)
    except Exception:
        return safe_default


def _build_character_runtime_prompt_contract():
    profile = _load_character_profile_config()
    profile_name = str(
        profile.get("name", DEFAULT_CHARACTER_PROFILE["name"]) or DEFAULT_CHARACTER_PROFILE["name"]
    ).strip()
    persona = str(
        profile.get("persona", DEFAULT_CHARACTER_PROFILE["persona"]) or DEFAULT_CHARACTER_PROFILE["persona"]
    ).strip()
    tone = str(profile.get("tone", DEFAULT_CHARACTER_PROFILE["tone"]) or DEFAULT_CHARACTER_PROFILE["tone"]).strip()
    style_notes = _normalize_character_profile_list(
        profile.get("style_notes"), DEFAULT_CHARACTER_PROFILE["style_notes"]
    )
    response_guidelines = _normalize_character_profile_list(
        profile.get("response_guidelines"), DEFAULT_CHARACTER_PROFILE["response_guidelines"]
    )
    style_boundaries = _normalize_character_profile_list(
        profile.get("style_boundaries"), DEFAULT_CHARACTER_PROFILE["style_boundaries"]
    )
    interaction_examples = _normalize_character_profile_list(
        profile.get("interaction_examples"), DEFAULT_CHARACTER_PROFILE["interaction_examples"]
    )
    style_notes_text = " | ".join(style_notes[:3])
    response_guidelines_text = " | ".join(response_guidelines[:3])
    style_boundaries_text = " | ".join(style_boundaries[:3])
    interaction_examples_text = " | ".join(interaction_examples[:3])
    allowed_emotions = profile.get("allowed_emotions", DEFAULT_CHARACTER_PROFILE["allowed_emotions"])
    allowed_actions = profile.get("allowed_actions", DEFAULT_CHARACTER_PROFILE["allowed_actions"])
    allowed_voice_styles = profile.get(
        "allowed_voice_styles", DEFAULT_CHARACTER_PROFILE["allowed_voice_styles"]
    )
    emotion_schema = "|".join([str(x or "").strip() for x in allowed_emotions if str(x or "").strip()])
    action_schema = "|".join([str(x or "").strip() for x in allowed_actions if str(x or "").strip()])
    voice_schema = "|".join([str(x or "").strip() for x in allowed_voice_styles if str(x or "").strip()])
    emotion_schema = emotion_schema or "|".join(DEFAULT_CHARACTER_PROFILE["allowed_emotions"])
    action_schema = action_schema or "|".join(DEFAULT_CHARACTER_PROFILE["allowed_actions"])
    voice_schema = voice_schema or "|".join(DEFAULT_CHARACTER_PROFILE["allowed_voice_styles"])
    return (
        "Character profile:\n"
        f"- Name: {profile_name}\n"
        f"- Persona: {persona}\n"
        f"- Tone: {tone}\n"
        f"- Style notes: {style_notes_text}\n"
        f"- Response guidelines: {response_guidelines_text}\n"
        f"- Style boundaries: {style_boundaries_text}\n"
        f"- Interaction examples: {interaction_examples_text}\n"
        f"- Allowed emotions: {emotion_schema}\n"
        f"- Allowed actions: {action_schema}\n"
        f"- Allowed voice styles: {voice_schema}\n"
        "Character Runtime output contract:\n"
        "- Respond with a single JSON object only.\n"
        "- Do not wrap JSON in Markdown code blocks.\n"
        "- Do not add explanations outside JSON.\n"
        "- Keep the reply natural, concise, expressive, and task-useful.\n"
        "- Use light playful/teasing flavor only when appropriate; do not force it every reply.\n"
        "- Avoid generic-assistant phrasing, but also avoid overly dramatic/cute or roleplay-heavy phrasing.\n"
        "- Select emotion/action/voice_style from the allowed lists above.\n"
        "- If uncertain, use emotion=neutral, action=none, voice_style=neutral.\n"
        "Schema:\n"
        "{\n"
        '  "text": "final user-facing reply",\n'
        f'  "emotion": "{emotion_schema}",\n'
        f'  "action": "{action_schema}",\n'
        '  "intensity": "low|normal|high",\n'
        f'  "voice_style": "{voice_schema}"\n'
        "}\n"
        'The "text" field is the only text shown to the user.'
    )


def _apply_character_runtime_prompt_contract(config, prompt):
    settings = _get_character_runtime_settings(config)
    if not settings.get("enabled", False):
        return prompt
    contract = _build_character_runtime_prompt_contract()
    safe_prompt = str(prompt or "")
    if not safe_prompt:
        return contract
    return merge_prompt_with_memory(safe_prompt, contract)


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


def _diagnostic_payload(exc):
    if isinstance(exc, DiagnosticError):
        return exc.to_payload()
    safe_error = redact_sensitive_text(str(exc or "").strip()) or "服务发生未知错误。"
    return {"error": safe_error}


def _log_backend_exception(scope, exc, extra=""):
    safe_scope = str(scope or "runtime").strip().upper()
    safe_extra = str(extra or "").strip()
    detail = redact_sensitive_text(str(exc or "").strip())
    header = f"[{safe_scope}][ERROR] {detail}"
    if safe_extra:
        header = f"{header} | {redact_sensitive_text(safe_extra)}"
    print(header, file=sys.stderr)
    trace = traceback.format_exc()
    if trace and trace.strip() and trace.strip() != "NoneType: None":
        print(redact_sensitive_text(trace), file=sys.stderr)


def _looks_like_timeout_error(message):
    text = str(message or "").strip().lower()
    return "timed out" in text or "timeout" in text


def _looks_like_network_error(message):
    text = str(message or "").strip().lower()
    markers = (
        "getaddrinfo",
        "name or service not known",
        "temporary failure in name resolution",
        "no route to host",
        "network is unreachable",
        "nodename nor servname",
        "failed to resolve",
        "dns",
    )
    return any(marker in text for marker in markers)


def _looks_like_connection_refused(message):
    text = str(message or "").strip().lower()
    markers = (
        "connection refused",
        "actively refused",
        "winerror 10061",
        "errno 111",
    )
    return any(marker in text for marker in markers)


def _resolve_llm_provider(llm_cfg):
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    provider = str(cfg.get("provider", "") or "").strip().lower()
    if provider:
        return provider
    base_url = str(cfg.get("base_url", "") or "").strip().lower()
    return "ollama" if "11434" in base_url or "ollama" in base_url else "openai"


def _resolve_llm_api_key(llm_cfg):
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    key_env = (
        str(cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV) or OPENAI_DEFAULT_KEY_ENV).strip()
        or OPENAI_DEFAULT_KEY_ENV
    )
    key_value = str(cfg.get("api_key", "") or "").strip() or str(
        os.environ.get(key_env, "") or ""
    ).strip()
    return key_value, key_env


def _ensure_llm_auth_ready(llm_cfg):
    provider = _resolve_llm_provider(llm_cfg)
    if provider not in {"openai", "openai-compatible", "openai_compatible"}:
        return
    base_url = str((llm_cfg or {}).get("base_url", OPENAI_DEFAULT_BASE_URL) or "").strip()
    api_key, key_env = _resolve_llm_api_key(llm_cfg)
    if api_key or is_local_url(base_url):
        return
    raise DiagnosticError(
        code="api_key_missing",
        reason="当前 LLM 提供方需要 API Key，但未读取到密钥。",
        solution=f"请先在环境变量中设置 {key_env}，或切换为本地 Ollama。",
        config_key="llm.api_key_env",
    )


def _diagnose_llm_exception(exc, llm_cfg):
    if isinstance(exc, DiagnosticError):
        return exc
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    raw = str(exc or "").strip()
    lower = raw.lower()
    provider = _resolve_llm_provider(cfg)
    base_url = str(cfg.get("base_url", "") or "").strip()
    model = str(cfg.get("model", "") or "").strip() or OLLAMA_DEFAULT_MODEL
    _, key_env = _resolve_llm_api_key(cfg)

    if "missing api key" in lower:
        return DiagnosticError(
            code="api_key_missing",
            reason="当前 LLM 提供方需要 API Key，但未读取到密钥。",
            solution=f"请先设置环境变量 {key_env}，再重试。",
            config_key="llm.api_key_env",
            detail=raw,
        )

    if provider == "ollama" and "model" in lower and "not found" in lower:
        return DiagnosticError(
            code="model_not_found",
            reason=f"Ollama 中不存在模型：{model}",
            solution=f"请先执行 `ollama pull {model}`，或改为已安装模型。",
            config_key="llm.model",
            detail=raw,
        )

    if "model" in lower and "not found" in lower:
        return DiagnosticError(
            code="model_not_found",
            reason=f"模型名称不可用：{model}",
            solution="请确认模型名称拼写正确，并且该模型已在服务端可用。",
            config_key="llm.model",
            detail=raw,
        )

    if _looks_like_timeout_error(lower):
        return DiagnosticError(
            code="llm_connection_timeout",
            reason="连接 LLM 服务超时。",
            solution="请检查服务负载与网络状况，必要时增大 llm.request_timeout。",
            config_key="llm.request_timeout",
            detail=raw,
        )

    if _looks_like_network_error(lower):
        return DiagnosticError(
            code="network_connection_failed",
            reason="网络连接失败，无法访问 LLM 服务地址。",
            solution="请检查网络、代理和 DNS 设置，确认地址可访问。",
            config_key="llm.base_url",
            detail=raw,
        )

    if "connection failed" in lower or "failed to connect" in lower:
        if provider == "ollama" and _looks_like_connection_refused(lower):
            return DiagnosticError(
                code="ollama_not_started",
                reason=f"无法连接 Ollama 服务：{base_url or OLLAMA_DEFAULT_BASE_URL}",
                solution="请先启动 Ollama（或执行 `ollama serve`），再重试。",
                config_key="llm.base_url",
                detail=raw,
            )
        return DiagnosticError(
            code="llm_connection_failed",
            reason=f"无法连接 LLM 服务地址：{base_url or '(未设置)'}",
            solution="请确认服务已启动，且 llm.base_url 地址与端口填写正确。",
            config_key="llm.base_url",
            detail=raw,
        )

    if "llm http" in lower:
        return DiagnosticError(
            code="llm_connection_failed",
            reason="LLM 服务返回异常状态码。",
            solution="请检查 llm.base_url、llm.model 与鉴权配置是否正确。",
            config_key="llm.base_url",
            detail=raw,
        )

    return DiagnosticError(
        code="llm_call_failed",
        reason="LLM 调用失败。",
        solution="请检查 LLM 地址、模型名和鉴权配置，并查看控制台日志。",
        config_key="llm",
        detail=raw,
    )


def reset_runtime_state():
    # Keep runtime cache coherent after config changes.
    with _SUMMARY_CACHE_LOCK:
        _HISTORY_SUMMARY_CACHE["key"] = ""
        _HISTORY_SUMMARY_CACHE["summary"] = ""


def _normalize_origin(origin):
    raw = str(origin or "").strip()
    if not raw:
        return ""
    try:
        parsed = urllib.parse.urlsplit(raw)
    except Exception:
        return ""
    scheme = str(parsed.scheme or "").lower()
    host = str(parsed.hostname or "").strip().lower()
    if scheme not in {"http", "https"} or not host:
        return ""
    port = parsed.port
    default_port = 80 if scheme == "http" else 443
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    if port and port != default_port:
        return f"{scheme}://{host}:{int(port)}"
    return f"{scheme}://{host}"


def _is_loopback_host(hostname):
    host = str(hostname or "").strip().lower()
    if not host:
        return False
    if host.startswith("[") and host.endswith("]"):
        host = host[1:-1]
    if host == "localhost":
        return True
    try:
        return bool(ipaddress.ip_address(host).is_loopback)
    except Exception:
        return False


def _get_server_security_settings(config):
    server_cfg = config.get("server", {}) if isinstance(config, dict) else {}
    allow_loopback = bool(server_cfg.get("cors_allow_loopback", True))
    raw_allow = server_cfg.get("cors_allowed_origins", [])
    if isinstance(raw_allow, str):
        raw_allow = [raw_allow]
    allowed_origins = set()
    if isinstance(raw_allow, list):
        for item in raw_allow[:64]:
            norm = _normalize_origin(item)
            if norm:
                allowed_origins.add(norm)
    token_env = str(server_cfg.get("api_token_env", API_TOKEN_ENV_DEFAULT) or API_TOKEN_ENV_DEFAULT).strip()
    token_env = token_env or API_TOKEN_ENV_DEFAULT
    expected_token = str(server_cfg.get("api_token", "") or "").strip()
    if not expected_token:
        expected_token = str(os.environ.get(token_env, "") or "").strip()
    require_token = bool(server_cfg.get("require_api_token", False))
    return {
        "allow_loopback": allow_loopback,
        "allowed_origins": allowed_origins,
        "api_token_env": token_env,
        "expected_api_token": expected_token,
        "require_api_token": require_token,
    }


def schedule_runtime_restart(delay_sec=0.35):
    def _restart_later():
        time.sleep(max(0.1, float(delay_sec)))
        os._exit(RUNTIME_RESTART_EXIT_CODE)

    thread = threading.Thread(target=_restart_later, daemon=True, name="taffy-runtime-restart")
    thread.start()


def sanitize_history(history, max_items=12):
    safe_history = []
    keep = max(1, int(max_items))
    for item in (history or [])[-keep:]:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            safe_history.append({"role": role, "content": content.strip()})
    return safe_history


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




def get_history_summary_settings(config):
    raw = config.get("history_summary", {}) if isinstance(config, dict) else {}
    enabled = bool(raw.get("enabled", True))
    trigger_messages = _clamp_int(raw.get("trigger_messages", 14), 14, 8, 80)
    keep_recent_messages = _clamp_int(raw.get("keep_recent_messages", 8), 8, 4, 40)
    max_summary_chars = _clamp_int(raw.get("max_summary_chars", 900), 900, 240, 3000)
    return {
        "enabled": enabled,
        "trigger_messages": trigger_messages,
        "keep_recent_messages": keep_recent_messages,
        "max_summary_chars": max_summary_chars,
    }


def _serialize_history_for_summary(history_items, max_messages=80):
    lines = []
    for item in (history_items or [])[-max_messages:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        if role not in {"user", "assistant"}:
            continue
        content = " ".join(str(item.get("content", "")).split()).strip()
        if not content:
            continue
        content = content[:260]
        label = "用户" if role == "user" else "馨语AI桌宠"
        lines.append(f"{label}: {content}")
    return "\n".join(lines).strip()


def _build_history_summary_prompt(raw_dialogue, max_summary_chars=900):
    limit = max(240, min(3000, int(max_summary_chars)))
    return (
        "请将以下较早的多轮对话压缩成可供后续继续聊天使用的摘要。\n"
        "要求：\n"
        "1) 中文输出，简洁自然；\n"
        "2) 只保留事实、偏好、未完成事项、用户当前目标；\n"
        "3) 不要编造，不要加入建议；\n"
        f"4) 总长度不超过 {limit} 个中文字符。\n\n"
        "对话：\n"
        f"{raw_dialogue}"
    )


def summarize_older_history(llm_cfg, provider, older_history, max_summary_chars=900):
    raw_dialogue = _serialize_history_for_summary(older_history, max_messages=96)
    if not raw_dialogue:
        return ""

    cache_key = hashlib.sha1(raw_dialogue.encode("utf-8", errors="ignore")).hexdigest()
    with _SUMMARY_CACHE_LOCK:
        if _HISTORY_SUMMARY_CACHE.get("key") == cache_key:
            return str(_HISTORY_SUMMARY_CACHE.get("summary", ""))

    prompt = _build_history_summary_prompt(raw_dialogue, max_summary_chars=max_summary_chars)
    messages = [
        {
            "role": "system",
            "content": (
                "You summarize conversation history for memory compression. "
                "Be accurate, concise, and avoid adding new facts."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    summary = ""
    try:
        if provider in {"openai", "openai-compatible", "openai_compatible"}:
            summary = call_openai_compatible(llm_cfg, messages)
        elif provider == "ollama":
            summary = call_ollama(llm_cfg, messages)
    except Exception:
        summary = ""

    safe = " ".join(str(summary or "").split()).strip()
    if not safe:
        safe = _truncate_text(raw_dialogue, max_summary_chars).replace("\n", " | ")
    safe = safe[: max(240, min(3000, int(max_summary_chars)))]

    with _SUMMARY_CACHE_LOCK:
        _HISTORY_SUMMARY_CACHE["key"] = cache_key
        _HISTORY_SUMMARY_CACHE["summary"] = safe
    return safe


def build_prompt_with_history_summary(config, llm_cfg, provider, history, base_prompt):
    settings = get_history_summary_settings(config)
    keep_recent = max(12, int(settings["keep_recent_messages"]))
    safe_history = sanitize_history(history, max_items=keep_recent)

    if not settings["enabled"]:
        return base_prompt, safe_history

    raw_items = [x for x in (history or []) if isinstance(x, dict)]
    if len(raw_items) <= settings["trigger_messages"]:
        return base_prompt, safe_history

    older_history = raw_items[:-keep_recent]
    summary = summarize_older_history(
        llm_cfg=llm_cfg,
        provider=provider,
        older_history=older_history,
        max_summary_chars=settings["max_summary_chars"],
    )
    if not summary:
        return base_prompt, safe_history
    summary_block = (
        "以下是更早对话的压缩摘要，请把它当作长期上下文使用，不要逐条复述：\n"
        + summary
    )
    return merge_prompt_with_memory(base_prompt, summary_block), safe_history












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




def build_openai_messages(prompt, safe_history, user_message, image_data_url=None):
    messages = [{"role": "system", "content": prompt}]
    messages.extend(safe_history)
    if image_data_url:
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_message},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        )
    else:
        messages.append({"role": "user", "content": user_message})
    return messages


def build_ollama_messages(prompt, safe_history, user_message, image_base64=None):
    messages = [{"role": "system", "content": prompt}]
    messages.extend(safe_history)
    user_item = {"role": "user", "content": user_message}
    if image_base64:
        user_item["images"] = [image_base64]
    messages.append(user_item)
    return messages


def extract_base64_from_data_url(image_data_url):
    if not image_data_url:
        return None
    if not isinstance(image_data_url, str):
        raise RuntimeError("image_data_url must be a string.")
    raw = image_data_url.strip()
    if not raw:
        return None
    if not raw.startswith("data:image/") or ";base64," not in raw:
        raise RuntimeError("image_data_url must be a valid image data URL.")
    header, b64_data = raw.split(",", 1)
    if not header.endswith(";base64"):
        raise RuntimeError("image_data_url must use base64 encoding.")
    cleaned = "".join(str(b64_data).split())
    if not cleaned:
        raise RuntimeError("image_data_url cannot be empty.")
    if len(cleaned) > 8_500_000:
        raise RuntimeError("image_data_url is too large.")
    try:
        base64.b64decode(cleaned, validate=True)
    except Exception as exc:
        raise RuntimeError("image_data_url base64 decode failed.") from exc
    return cleaned


def is_vision_unsupported_error(message):
    s = str(message or "").lower()
    keywords = [
        "vision",
        "image",
        "multimodal",
        "does not support",
        "not support",
        "projector",
        "unknown field",
        "unsupported",
    ]
    return any(k in s for k in keywords)


def normalize_vision_error(_exc):
    return RuntimeError(
        "Current model does not support image understanding. Please switch to a vision-capable model."
    )


def is_likely_ollama_vision_model(model_name):
    model = str(model_name or "").strip().lower()
    if not model:
        return False
    keywords = [
        "qwen2.5vl",
        "qwen2.5-vl",
        "qwen-vl",
        "llava",
        "bakllava",
        "minicpm-v",
        "moondream",
        "phi3v",
        "phi-3-vision",
        "llama3.2-vision",
        "internvl",
        "vision",
    ]
    return any(k in model for k in keywords)


def wrap_vision_error(exc):
    if is_vision_unsupported_error(str(exc)):
        return normalize_vision_error(exc)
    return exc


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


def _resolve_reply_language(config):
    raw = str(
        config.get("assistant_reply_language", "")
        or config.get("reply_language", "")
        or ""
    ).strip().lower()
    if raw in {"en", "english"}:
        return "en"
    if raw in {"zh", "zh-cn", "zh_cn", "chinese"}:
        return "zh"
    return "auto"


def _build_reply_language_block(config):
    lang = _resolve_reply_language(config if isinstance(config, dict) else {})
    if lang == "en":
        return (
            "Reply language rule:\n"
            "- Respond in natural English.\n"
            "- Even if the user writes in Chinese, keep your reply in English by default.\n"
            "- Switch to Chinese only if the user explicitly asks you to use Chinese."
        )
    if lang == "zh":
        return (
            "回复语言规则：\n"
            "- 默认使用简体中文自然回复。\n"
            "- 仅在用户明确要求英文时再切换英文。"
        )
    return ""


def _is_demo_stable_enabled(config):
    settings = _get_character_runtime_settings(config if isinstance(config, dict) else {})
    return bool(settings.get("enabled", False) and settings.get("demo_stable", False))


def _build_demo_stable_reply_behavior_block(config):
    settings = _get_character_runtime_settings(config if isinstance(config, dict) else {})
    if not bool(settings.get("enabled", False) and settings.get("demo_stable", False)):
        return ""

    rules = [
        "Keep the main reply English-first in natural spoken English.",
        "Even when the user writes in Chinese, reply primarily in natural spoken English.",
        "The Chinese translation layer may explain it separately; the main reply should stay English-first.",
        "Use complete sentences only, and never end with a cut-off half sentence.",
        "Usually keep replies to 2 to 3 short sentences.",
        "Keep an original desktop companion / light supervisor vibe: playful, cheeky, lightly teasing, energetic, witty, reliable.",
        "You may lightly tease or nudge the user, but do not attack the user.",
        "Do not call yourself ChatGPT.",
        "Do not claim long-term memory, learning pipelines, plugin marketplace, or other unshipped capabilities.",
    ]

    persona_override = settings.get("persona_override", {})
    if isinstance(persona_override, dict) and persona_override.get("enabled", False):
        override_name = str(persona_override.get("name", "") or "").strip()
        override_style = str(persona_override.get("style", "") or "").strip()
        if override_name:
            rules.extend(
                [
                    f"Your current name is: {override_name}.",
                    "When the user asks who you are, introduce yourself using this name.",
                    "Do not use any other character name.",
                ]
            )
        if override_style:
            rules.append(f"Keep this local persona style: {override_style}.")

    return "Reply behavior rules:\n" + "\n".join(f"- {rule}" for rule in rules)


def _build_reply_llm_cfg(config, llm_cfg):
    safe_cfg = dict(llm_cfg or {})
    if not _is_demo_stable_enabled(config):
        return safe_cfg

    raw_budget = safe_cfg.get("max_output_tokens", safe_cfg.get("max_tokens", 120))
    try:
        base_budget = int(raw_budget)
    except (TypeError, ValueError):
        base_budget = 120
    boosted_budget = max(600, base_budget)

    safe_cfg["max_output_tokens"] = boosted_budget
    safe_cfg["allow_high_output_tokens"] = True
    safe_cfg["retry_on_length"] = True
    safe_cfg["length_retry_max_output_tokens"] = max(boosted_budget, 900)
    return safe_cfg


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








def _parse_tool_args(raw):
    if isinstance(raw, dict):
        return raw
    text = str(raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def build_tool_meta_payload(tool_payloads):
    items = []
    for payload in (tool_payloads or [])[:6]:
        if not isinstance(payload, dict):
            continue
        tool_name = str(payload.get("tool", "")).strip() or "unknown_tool"
        args = payload.get("args") if isinstance(payload.get("args"), dict) else {}
        result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
        item = {
            "tool": tool_name,
            "ok": bool(payload.get("ok")),
        }
        if args:
            item["args"] = args
        if item["ok"]:
            if tool_name in {"write_file", "replace_in_file", "read_file"}:
                path = str(result.get("path", "")).strip()
                if path:
                    item["path"] = path
            if tool_name == "list_files":
                item["count"] = int(result.get("count", 0) or 0)
                entries = result.get("entries") if isinstance(result.get("entries"), list) else []
                item["entries"] = entries[:6]
            elif tool_name == "search_text":
                item["count"] = int(result.get("count", 0) or 0)
                matches = result.get("results") if isinstance(result.get("results"), list) else []
                item["results"] = matches[:4]
            elif tool_name == "read_file":
                item["content_preview"] = _truncate_text(result.get("content", ""), 380)
            elif tool_name == "write_file":
                item["chars_written"] = int(result.get("chars_written", 0) or 0)
                item["mode"] = str(result.get("mode", "")).strip()
            elif tool_name == "replace_in_file":
                item["replacements"] = int(result.get("replacements", 0) or 0)
            elif tool_name == "run_command":
                item["cwd"] = str(result.get("cwd", "")).strip()
                item["exit_code"] = int(result.get("exit_code", 0) or 0)
                item["stdout_preview"] = _truncate_text(result.get("stdout", ""), 280)
                item["stderr_preview"] = _truncate_text(result.get("stderr", ""), 180)
            elif tool_name == "generate_image":
                item["image_url"] = str(result.get("image_url", "")).strip()
                item["saved_path"] = str(result.get("saved_path", "")).strip()
                item["size_bytes"] = int(result.get("size_bytes", 0) or 0)
        else:
            item["error"] = str(payload.get("error", "")).strip()[:320]
        items.append(item)
    return {"items": items}


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
    tools = []
    for item in WORK_TOOL_DEFS:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name", "")).strip()
        if not name:
            continue
        tools.append(
            {
                "type": "function",
                "name": name,
                "description": str(fn.get("description", "")).strip(),
                "parameters": fn.get("parameters", {"type": "object"}),
            }
        )
    return tools


def build_chat_completions_tool_defs():
    tools = []
    for item in WORK_TOOL_DEFS:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if not isinstance(fn, dict):
            continue
        name = str(fn.get("name", "")).strip()
        if not name:
            continue
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": str(fn.get("description", "")).strip(),
                    "parameters": fn.get("parameters", {"type": "object"}),
                },
            }
        )
    return tools


def _inject_tool_intro(messages: list) -> list:
    convo = list(messages)
    if convo and isinstance(convo[0], dict) and convo[0].get("role") == "system":
        first = dict(convo[0])
        first_content = str(first.get("content", "")).strip()
        first["content"] = f"{first_content}\n\n{_TOOL_INTRO}".strip()
        convo[0] = first
    else:
        convo.insert(0, {"role": "system", "content": _TOOL_INTRO})
    return convo


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

    headers = {"Content-Type": "application/json"}
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

    headers = {"Content-Type": "application/json"}
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

    def _send_json(self, data, status=HTTPStatus.OK):
        encoded = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_audio(self, audio_bytes, content_type="audio/mpeg", status=HTTPStatus.OK):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(audio_bytes)))
        self.end_headers()
        self.wfile.write(audio_bytes)

    def _build_health_payload(self, detailed=False):
        config_ok = True
        config_error = ""
        try:
            cfg = load_config()
        except Exception as exc:
            cfg = DEFAULT_CONFIG
            config_ok = False
            config_error = _diagnostic_payload(exc).get("error", "")

        payload = {
            "ok": config_ok,
            "status": "ok" if config_ok else "degraded",
            "server_time": datetime.now().isoformat(timespec="seconds"),
        }
        if not detailed:
            return payload

        security = _get_server_security_settings(cfg)
        live2d_ok = True
        live2d_error = ""
        live2d_resolved = ""
        try:
            model_path_value = str((cfg or {}).get("model_path", "") or "").strip()
            resolved = resolve_live2d_model_path(model_path_value)
            live2d_resolved = str(resolved) if resolved else ""
            validate_live2d_model_path(cfg)
        except Exception as exc:
            live2d_ok = False
            live2d_error = _diagnostic_payload(exc).get("error", "")

        payload["checks"] = {
            "config_load": {
                "ok": config_ok,
                "error": config_error if not config_ok else "",
            },
            "live2d_model_path": {
                "ok": live2d_ok,
                "error": live2d_error if not live2d_ok else "",
                "resolved_path": live2d_resolved,
            },
        }
        payload["security"] = {
            "require_api_token": bool(security.get("require_api_token", False)),
            "api_token_env": str(security.get("api_token_env", API_TOKEN_ENV_DEFAULT) or API_TOKEN_ENV_DEFAULT),
            "api_token_configured": bool(str(security.get("expected_api_token", "") or "").strip()),
            "cors_allow_loopback": bool(security.get("allow_loopback", True)),
            "cors_allowed_origins": sorted(security.get("allowed_origins", set())),
        }
        return payload

    def _send_sse(self, data):
        payload = f"data: {json.dumps(data, ensure_ascii=False)}\n\n".encode("utf-8")
        self.wfile.write(payload)
        self.wfile.flush()

    def _reload_runtime_config(self):
        config = load_config()
        validate_live2d_model_path(config)
        reset_runtime_state()
        server_cfg = config.get("server", {}) if isinstance(config, dict) else {}
        host = str(server_cfg.get("host", DEFAULT_CONFIG["server"]["host"])).strip()
        try:
            port = int(server_cfg.get("port", DEFAULT_CONFIG["server"]["port"]))
        except (TypeError, ValueError):
            port = int(DEFAULT_CONFIG["server"]["port"])
        return {
            "ok": True,
            "message": "配置已重载",
            "reloaded_at": datetime.now().isoformat(timespec="seconds"),
            "server": {"host": host, "port": port},
        }

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
            if not text:
                self._send_json(
                    {"error": "text cannot be empty."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                audio = synthesize_tts_audio(
                    text,
                    voice_override=voice,
                    prosody=prosody,
                )
                if not audio:
                    self._send_json(
                        {"error": "TTS 返回空音频，请检查语音服务是否正常运行。"},
                        status=HTTPStatus.SERVICE_UNAVAILABLE,
                    )
                    return
                self._send_audio(audio, content_type=guess_audio_content_type(audio))
            except Exception as exc:
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
                self._send_json({"translated": result.strip()})
            except Exception as exc:
                diagnosed = _diagnose_llm_exception(exc, llm_cfg if "llm_cfg" in locals() else {})
                _log_backend_exception("TRANSLATE", diagnosed, extra="/api/translate failed")
                self._send_json(
                    _diagnostic_payload(diagnosed),
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
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
            )
            return

        if path_only == "/api/chat_stream":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            full_parts = []
            already_finalized = False
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
                    self._send_sse({"type": "delta", "text": chunk})
                final_reply = "".join(full_parts).strip()
                runtime_meta = None
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
                done_payload = {"type": "done", "reply": final_reply}
                if runtime_meta is not None:
                    done_payload["character_runtime"] = runtime_meta
                self._send_sse(done_payload)
            except Exception as exc:
                diagnosed = _diagnose_llm_exception(exc, chat_config.get("llm", {}))
                _log_backend_exception("CHAT_STREAM", diagnosed, extra="/api/chat_stream failed")
                self._send_sse({"type": "error", "error": _diagnostic_payload(diagnosed).get("error", "")})
            return

        try:
            reply = call_llm(
                user_message,
                history,
                image_data_url=image_data_url,
                is_auto=is_auto,
                force_tools=force_tools,
                config=chat_config,
            )
            reply, runtime_meta = _apply_character_runtime_reply(chat_config, reply)
            try:
                remember_interaction(
                    chat_config, user_message, reply, is_auto=is_auto
                )
            except Exception:
                pass
            payload = {"reply": reply}
            if runtime_meta is not None:
                payload["character_runtime"] = runtime_meta
            self._send_json(payload)
        except Exception as exc:
            diagnosed = _diagnose_llm_exception(exc, chat_config.get("llm", {}))
            _log_backend_exception("CHAT", diagnosed, extra="/api/chat failed")
            self._send_json(
                _diagnostic_payload(diagnosed),
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
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
    findings = []
    safe_cfg = config if isinstance(config, dict) else {}
    server_cfg = safe_cfg.get("server", {}) if isinstance(safe_cfg.get("server", {}), dict) else {}
    tools_cfg = safe_cfg.get("tools", {}) if isinstance(safe_cfg.get("tools", {}), dict) else {}
    llm_cfg = safe_cfg.get("llm", {}) if isinstance(safe_cfg.get("llm", {}), dict) else {}

    require_token = bool(server_cfg.get("require_api_token", False))
    token_env = str(server_cfg.get("api_token_env", API_TOKEN_ENV_DEFAULT) or API_TOKEN_ENV_DEFAULT).strip() or API_TOKEN_ENV_DEFAULT
    configured_token = str(server_cfg.get("api_token", "") or "").strip() or str(os.environ.get(token_env, "") or "").strip()
    if require_token and not configured_token:
        findings.append(
            f"[startup][warn] server.require_api_token=true but token is empty. Set env {token_env}."
        )

    if bool(tools_cfg.get("allow_shell", False)):
        findings.append(
            "[startup][warn] tools.allow_shell=true. Consider disabling it for production/public releases."
        )

    llm_provider = str(llm_cfg.get("provider", "") or "").strip().lower()
    if llm_provider in {"openai", "openai_compatible"}:
        key_env = str(llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV) or OPENAI_DEFAULT_KEY_ENV).strip() or OPENAI_DEFAULT_KEY_ENV
        key_value = str(llm_cfg.get("api_key", "") or "").strip() or str(os.environ.get(key_env, "") or "").strip()
        if not key_value:
            findings.append(
                f"[startup][warn] llm provider is {llm_provider} but no API key found in env {key_env}."
            )
    try:
        validate_live2d_model_path(safe_cfg)
    except Exception as exc:
        findings.append(f"[startup][warn] {_diagnostic_payload(exc).get('error', '')}")
    return findings


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
