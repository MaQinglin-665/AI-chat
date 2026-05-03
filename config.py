import json
import os
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
WEB_DIR = ROOT_DIR / "web"
CONFIG_PATH = ROOT_DIR / "config.json"
LOCAL_CONFIG_PATH = ROOT_DIR / "config.local.json"
EXAMPLE_CONFIG_PATH = ROOT_DIR / "config.example.json"
ENV_PATH = ROOT_DIR / ".env"
MEMORY_PATH = ROOT_DIR / "memory.json"
MEMORY_SUMMARY_PATH = ROOT_DIR / "memory_summary.json"
VOSK_MODEL_ROOT = ROOT_DIR / "models" / "vosk" / "vosk-model-small-cn-0.22"
VOSK_MODEL_LARGE_ROOT = ROOT_DIR / "models" / "vosk" / "vosk-model-cn-0.22"

OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1"
OPENAI_DEFAULT_MODEL = "gpt-4o-mini"
OPENAI_DEFAULT_KEY_ENV = "OPENAI_API_KEY"
API_TOKEN_DEFAULT_ENV = "TAFFY_API_TOKEN"
VOLCENGINE_APP_ID_ENV = "VOLCENGINE_APP_ID"
VOLCENGINE_ACCESS_TOKEN_ENV = "VOLCENGINE_ACCESS_TOKEN"
VOLCENGINE_SECRET_KEY_ENV = "VOLCENGINE_SECRET_KEY"
OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434"
OLLAMA_DEFAULT_MODEL = "qwen2.5:7b"
TTS_DEFAULT_PROVIDER = "browser"
TTS_DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"
TTS_DEFAULT_VOICES = [
    "zh-CN-XiaoxiaoNeural",
    "zh-CN-XiaoyiNeural",
    "zh-CN-YunxiNeural",
    "zh-CN-YunjianNeural",
]
VOLCENGINE_TTS_DEFAULT_API_URL = "https://openspeech.bytedance.com/api/v1/tts"
VOLCENGINE_TTS_DEFAULT_CLUSTER = "volcano_icl"
VOLCENGINE_TTS_DEFAULT_VOICE = "S_uos2AQPX1"
GPT_SOVITS_DEFAULT_API_URL = "http://127.0.0.1:9880/tts"
GPT_SOVITS_DEFAULT_VOICE = "default"
SERVER_TTS_PROVIDERS = {"edge_tts", "volcengine_tts", "volcengine", "gpt_sovits"}
DEFAULT_WORKSPACE_ROOT = str(ROOT_DIR)
DEFAULT_ALLOWED_COMMAND_PREFIXES = [
    "python",
    "py",
    "pip",
    "pip3",
    "pytest",
    "node",
    "npm",
    "npx",
    "pnpm",
    "yarn",
    "git",
    "go",
    "cargo",
    "dotnet",
    "java",
    "javac",
    "where",
    "dir",
    "type",
    "echo",
    "findstr",
    "get-childitem",
    "get-content",
    "select-string",
    "ls",
    "cat",
    "pwd",
    "whoami",
    "tree",
]

RELEASE_MODE_ENV_KEYS = (
    "TAFFY_RELEASE_MODE",
    "TAFFY_PUBLIC_RELEASE",
    "TAFFY_RELEASE",
)


def _env_flag(name, default=False):
    value = os.environ.get(str(name or "").strip())
    if value is None:
        return bool(default)
    text = str(value).strip().lower()
    if not text:
        return bool(default)
    return text in {"1", "true", "yes", "on"}


REQUIRE_API_TOKEN_DEFAULT = any(_env_flag(key, False) for key in RELEASE_MODE_ENV_KEYS)


DEFAULT_CONFIG = {
    "onboarding_completed": False,
    "assistant_name": "馨语AI桌宠",
    "model_path": "/models/your_model/model3.json",
    "model": {
        "scale": 1.0,
        "x_ratio": 0.26,
        "y_ratio": 0.96,
    },
    "server": {
        "host": "127.0.0.1",
        "port": 8123,
        "open_browser": True,
        "cors_allow_loopback": True,
        "cors_allowed_origins": [],
        "require_api_token": REQUIRE_API_TOKEN_DEFAULT,
        "api_token_env": API_TOKEN_DEFAULT_ENV,
    },
    "desktop": {
        "transparent": True,
        "frameless": True,
        "always_on_top": False,
        "resizable": True,
        "width": 520,
        "height": 900,
        "min_width": 420,
        "min_height": 700,
    },
    "llm": {
        "provider": "ollama",
        "base_url": OLLAMA_DEFAULT_BASE_URL,
        "model": OLLAMA_DEFAULT_MODEL,
        "temperature": 0.7,
        "frequency_penalty": 0.55,
        "presence_penalty": 0.35,
        "api_key_env": OPENAI_DEFAULT_KEY_ENV,
    },
    "character_runtime": {
        "enabled": False,
        "return_metadata": False,
        "demo_stable": False,
    },
    "thinking": {
        "enabled": True,
        "max_tokens": 100,
        "timeout_sec": 15,
    },
    "decision": {
        "enabled": True,
        "silence_probability": 0.15,
        "silence_keywords": ["嗯", "哦", "ok", "好的", "知道了"],
        "always_reply_keywords": [
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
    },
    "tts": {
        "provider": TTS_DEFAULT_PROVIDER,
        "voice": TTS_DEFAULT_VOICE,
        "voices": TTS_DEFAULT_VOICES,
        "stream_mode": "realtime",
        "app_id_env": VOLCENGINE_APP_ID_ENV,
        "access_token_env": VOLCENGINE_ACCESS_TOKEN_ENV,
        "secret_key_env": VOLCENGINE_SECRET_KEY_ENV,
        "rate": "+0%",
        "volume": "+0%",
        "pitch": "+0Hz",
        "gpt_sovits_api_url": GPT_SOVITS_DEFAULT_API_URL,
        "gpt_sovits_method": "POST",
        "gpt_sovits_timeout_sec": 60,
        "gpt_sovits_format": "wav",
        "gpt_sovits_media_type": "wav",
        "gpt_sovits_streaming_mode": 0,
        "gpt_sovits_text_split_method": "cut0",
        "gpt_sovits_realtime_tts": False,
        "allow_browser_fallback": False,
        "gpt_sovits_voice": GPT_SOVITS_DEFAULT_VOICE,
        "gpt_sovits_text_lang": "zh",
        "gpt_sovits_prompt_lang": "zh",
        "gpt_sovits_prompt_text": "",
        "gpt_sovits_ref_audio_path": "",
        "gpt_sovits_fallback_ref_audio_path": str(ROOT_DIR / "tts_ref" / "taffy_ref.wav"),
        "gpt_sovits_top_k": 8,
        "gpt_sovits_top_p": 0.78,
        "gpt_sovits_temperature": 0.36,
        "gpt_sovits_speed": 1.02,
        "gpt_sovits_repetition_penalty": 1.08,
        "gpt_sovits_seed": 0,
        "gpt_sovits_normalize_loudness": True,
        "gpt_sovits_target_rms": 900,
        "gpt_sovits_max_loudness_gain": 3.2,
        "gpt_sovits_prefer_clean_prompt": True,
        "gpt_sovits_chunk_max_candidates": 2,
        "gpt_sovits_chunk_split_depth": 1,
        "gpt_sovits_enable_global_retry": False,
        "gpt_sovits_chunk_chars": 120,
        "gpt_sovits_chunk_timeout_sec": 20,
    },
    "assistant_prompt": (
        "你是桌宠 馨语AI桌宠。你在和一位真实人类用户聊天，不要把用户当成设备、程序或系统。"
        "默认短句回复，先给直接答案，再补半句自然交流；避免模板腔、客服腔和重复口头禅。"
        "信息不足先问一个关键点，不要乱猜。"
    ),
    "style": {
        "auto": True,
        "manual": "neutral",
    },
    "humanize": {
        "enabled": True,
        "strip_fillers": True,
        "refine_enabled": True,
        "refine_max_chars": 120,
        "refine_timeout_sec": 12,
        "refine_min_chars": 36,
    },
    "memory": {
        "enabled": True,
        "max_items": 600,
        "inject_recent": 2,
        "inject_relevant": 4,
        "summary_trigger_every": 10,
        "mem0_enabled": True,
        "mem0_top_k": 5,
        "mem0_threshold": 0.35,
        "mem0_user_id": "taffy-user",
        "mem0_collection": "taffy_memory",
        "mem0_qdrant_path": str(ROOT_DIR / ".mem0" / "qdrant"),
        "mem0_history_db_path": str(ROOT_DIR / ".mem0" / "history.db"),
        "mem0_embedding_model": "text-embedding-v3",
        "mem0_embedding_dims": 1024,
    },
    "history_summary": {
        "enabled": True,
        "trigger_messages": 14,
        "keep_recent_messages": 8,
        "max_summary_chars": 900,
    },
    "asr": {
        "show_mic_meter": True,
        "keep_listening": True,
        "transcribe_on_close": True,
        "min_speech_ms": 150,
        "silence_trigger_ms": 380,
        "max_speech_ms": 2200,
        "speech_threshold": 0.0035,
        "processor_buffer_size": 2048,
        "wake_word_enabled": True,
        "wake_words": ["馨语", "馨语ai", "xinyu", "\u5854\u83f2", "taffy", "tafi"],
        "hotword_replacements": {
            "\u5854\u83f2": "馨语AI桌宠",
            "taffy": "馨语AI桌宠",
            "neuro": "Neuro",
            "fifa": "FIFA",
        },
    },
    "observe": {
        "attach_mode": "manual",
        "allow_auto_chat": False,
        "auto_chat_enabled": False,
        "auto_chat_min_ms": 180000,
        "auto_chat_max_ms": 480000,
        "auto_chat_tuning": {
            "trigger_base_threshold": 1.03,
            "short_silence_penalty": 0.35,
            "long_silence_bonus": 0.14,
            "emotion_bonus": 0.12,
            "repeat_reason_penalty": 0.44,
            "repeat_topic_penalty": 0.48,
            "burst_penalty": 0.32,
            "recent_auto_penalty": 0.45,
            "score_jitter": 0.12,
            "repeat_reason_window_ms": 14 * 60 * 1000,
            "repeat_topic_window_ms": 22 * 60 * 1000,
            "burst_reset_window_ms": 18 * 60 * 1000,
            "max_topic_hint_chars": 42,
        },
        "daily_greeting_enabled": False,
        "daily_greeting_hour": 8,
        "daily_greeting_minute": 0,
        "daily_greeting_prompt": (
            "请你像桌宠一样主动向我说早安，简短自然地问好，"
            "再给我一句鼓励今天认真努力的暖心话。控制在两三句内，不要太像模板。"
        ),
    },
    "motion": {
        "enabled": True,
        "cooldown_ms": 1200,
        "speaking_cooldown_ms": 1600,
        "speech_motion_strength": 1.35,
        "intensity": "normal",
        "combo_enabled": True,
        "expression_enabled": True,
        "expression_strength": 1.0,
        "idle_enabled": True,
        "idle_min_ms": 12000,
        "idle_max_ms": 24000,
    },
    "tools": {
        "enabled": False,
        "workspace_root": DEFAULT_WORKSPACE_ROOT,
        "allow_shell": False,
        "allowed_command_prefixes": DEFAULT_ALLOWED_COMMAND_PREFIXES,
        "shell_timeout_sec": 25,
        "max_file_read_chars": 24000,
        "max_command_output_chars": 14000,
        "image_enabled": True,
        "image_model": "gpt-image-1",
        "image_size": "1024x1024",
    },
}


_ENV_LOADED = False


def build_diagnostic_message(reason, solution, config_key):
    reason_text = str(reason or "").strip() or "发生未知错误。"
    solution_text = str(solution or "").strip() or "请检查相关配置后重试。"
    config_item = str(config_key or "").strip() or "未指定"
    return (
        f"问题原因：{reason_text}；"
        f"解决方法：{solution_text}；"
        f"对应配置项：{config_item}"
    )


def mask_secret(value, keep=3):
    secret = str(value or "").strip()
    if not secret:
        return ""
    if len(secret) <= max(keep * 2 + 1, 8):
        return "*" * min(12, max(8, len(secret)))
    return f"{secret[:keep]}***{secret[-keep:]}"


def redact_sensitive_text(text):
    sanitized = str(text or "")
    if not sanitized:
        return ""
    sanitized = re.sub(
        r"(?i)(authorization\s*[:=]\s*bearer\s+)([A-Za-z0-9._\-+/=]+)",
        lambda m: f"{m.group(1)}{mask_secret(m.group(2), keep=2)}",
        sanitized,
    )
    sanitized = re.sub(
        r"(?i)\b(api[_-]?key|access[_-]?token|secret[_-]?key|token)\b"
        r"\s*[:=]\s*([\"']?)([^\"'\s,;]+)\2",
        lambda m: f"{m.group(1)}={mask_secret(m.group(3), keep=2)}",
        sanitized,
    )
    return sanitized


class DiagnosticError(RuntimeError):
    def __init__(self, code, reason, solution, config_key, detail=""):
        self.code = str(code or "diagnostic_error")
        self.reason = str(reason or "").strip()
        self.solution = str(solution or "").strip()
        self.config_key = str(config_key or "").strip()
        self.detail = str(detail or "").strip()
        self.user_message = build_diagnostic_message(
            self.reason,
            self.solution,
            self.config_key,
        )
        super().__init__(self.user_message)

    def to_payload(self):
        payload = {
            "error": self.user_message,
            "code": self.code,
            "reason": self.reason,
            "solution": self.solution,
            "config_key": self.config_key,
        }
        detail = redact_sensitive_text(self.detail)
        if detail:
            payload["detail"] = detail
        return payload


def resolve_live2d_model_path(model_path):
    raw = str(model_path or "").strip()
    if not raw:
        return None
    path_obj = Path(raw)
    if raw.startswith(("/", "\\")):
        path_obj = WEB_DIR / raw.lstrip("/\\")
    elif not path_obj.is_absolute():
        path_obj = WEB_DIR / path_obj
    try:
        return path_obj.resolve()
    except Exception:
        return path_obj


def validate_live2d_model_path(config):
    cfg = config if isinstance(config, dict) else {}
    raw_model_path = str(cfg.get("model_path", "") or "").strip()
    if not raw_model_path:
        raise DiagnosticError(
            code="live2d_path_empty",
            reason="未设置 Live2D 模型路径。",
            solution="请填写 model3.json 文件路径，例如 /models/hiyori_pro_t11/hiyori_pro_t11.model3.json。",
            config_key="model_path",
        )
    normalized = raw_model_path.replace("\\", "/").lower()
    if "your_model" in normalized:
        raise DiagnosticError(
            code="live2d_path_placeholder",
            reason="Live2D 路径仍是示例占位符，尚未替换为真实模型。",
            solution="把模型放到 web/models 下，并把 model_path 改成实际的 model3.json 路径。",
            config_key="model_path",
        )
    resolved = resolve_live2d_model_path(raw_model_path)
    if resolved is None:
        raise DiagnosticError(
            code="live2d_path_invalid",
            reason="Live2D 模型路径为空或格式无效。",
            solution="请填写可访问的 model3.json 文件路径。",
            config_key="model_path",
        )
    if not resolved.exists():
        raise DiagnosticError(
            code="live2d_path_not_found",
            reason=f"Live2D 模型文件不存在：{raw_model_path}",
            solution="请确认文件已放到 web/models，并检查路径拼写是否正确。",
            config_key="model_path",
            detail=str(resolved),
        )
    if resolved.is_dir():
        raise DiagnosticError(
            code="live2d_path_is_dir",
            reason=f"Live2D 路径指向了文件夹而不是模型文件：{raw_model_path}",
            solution="请将 model_path 指向具体的 .model3.json 文件。",
            config_key="model_path",
            detail=str(resolved),
        )
    return resolved


def deep_merge(base, update):
    merged = dict(base)
    for key, value in update.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_local_env_file():
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    _ENV_LOADED = True
    if not ENV_PATH.exists() or not ENV_PATH.is_file():
        return
    try:
        lines = ENV_PATH.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    except Exception:
        return
    for raw in lines:
        line = str(raw or "").strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        k = str(key or "").strip()
        if not k:
            continue
        v = str(value or "").strip().strip("'\"")
        if not k:
            continue
        existing = os.environ.get(k)
        if existing is None or not str(existing).strip():
            os.environ[k] = v


def load_config():
    load_local_env_file()
    config = dict(DEFAULT_CONFIG)
    user_has_onboarding_completed = False
    local_has_onboarding_completed = False
    if EXAMPLE_CONFIG_PATH.exists():
        try:
            example_data = json.loads(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8-sig"))
            config = deep_merge(config, example_data)
        except json.JSONDecodeError:
            pass
    if CONFIG_PATH.exists():
        try:
            user_data = json.loads(CONFIG_PATH.read_text(encoding="utf-8-sig"))
            config = deep_merge(config, user_data)
            if isinstance(user_data, dict):
                user_has_onboarding_completed = "onboarding_completed" in user_data
        except json.JSONDecodeError as exc:
            raise DiagnosticError(
                code="config_json_invalid",
                reason=(
                    f"config.json 第 {exc.lineno} 行第 {exc.colno} 列附近存在 JSON 语法错误。"
                ),
                solution="请检查逗号、引号和括号是否完整，修复后重试。",
                config_key="config.json",
                detail=str(exc),
            ) from exc
    if LOCAL_CONFIG_PATH.exists():
        try:
            local_data = json.loads(LOCAL_CONFIG_PATH.read_text(encoding="utf-8-sig"))
            config = deep_merge(config, local_data)
            if isinstance(local_data, dict):
                local_has_onboarding_completed = "onboarding_completed" in local_data
        except json.JSONDecodeError as exc:
            raise DiagnosticError(
                code="config_local_json_invalid",
                reason=(
                    f"config.local.json 第 {exc.lineno} 行第 {exc.colno} 列附近存在 JSON 语法错误。"
                ),
                solution="请修复 JSON 语法后重试，或暂时移走 config.local.json。",
                config_key="config.local.json",
                detail=str(exc),
            ) from exc
    if CONFIG_PATH.exists() and not user_has_onboarding_completed and not local_has_onboarding_completed:
        # Backward-compat: existing users with old config.json should not be forced into first-run onboarding.
        config["onboarding_completed"] = True
    return config


def sanitize_hotword_replacements(raw):
    pairs = {}
    if isinstance(raw, dict):
        for src, dst in raw.items():
            s = " ".join(str(src or "").split()).strip()
            t = " ".join(str(dst or "").split()).strip()
            if not s or not t:
                continue
            if len(s) > 40 or len(t) > 60:
                continue
            pairs[s] = t
    elif isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            s = " ".join(str(item.get("from", "")).split()).strip()
            t = " ".join(str(item.get("to", "")).split()).strip()
            if not s or not t:
                continue
            if len(s) > 40 or len(t) > 60:
                continue
            pairs[s] = t
    if len(pairs) > 300:
        keys = list(pairs.keys())[:300]
        pairs = {k: pairs[k] for k in keys}
    return pairs


def sanitize_client_config(config):
    tts_cfg = config.get("tts", {})
    provider = str(tts_cfg.get("provider", TTS_DEFAULT_PROVIDER)).strip().lower()
    voices = tts_cfg.get("voices")
    if not isinstance(voices, list):
        if provider in {"volcengine_tts", "volcengine"}:
            voices = [tts_cfg.get("voice", VOLCENGINE_TTS_DEFAULT_VOICE)]
        elif provider == "gpt_sovits":
            voices = [tts_cfg.get("voice", GPT_SOVITS_DEFAULT_VOICE)]
        else:
            voices = TTS_DEFAULT_VOICES
    voices = [str(v).strip() for v in voices if str(v).strip()]
    default_voice = (
        VOLCENGINE_TTS_DEFAULT_VOICE
        if provider in {"volcengine_tts", "volcengine"}
        else GPT_SOVITS_DEFAULT_VOICE
        if provider == "gpt_sovits"
        else TTS_DEFAULT_VOICE
    )
    voice = str(tts_cfg.get("voice", voices[0] if voices else default_voice))
    if not voice and voices:
        voice = voices[0]
    model_cfg = config.get("model", {})

    def _safe_float(value, default):
        try:
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    def _safe_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return int(default)

    model_scale = max(0.1, min(3.0, _safe_float(model_cfg.get("scale", 1.0), 1.0)))
    x_ratio = max(0.0, min(1.0, _safe_float(model_cfg.get("x_ratio", 0.26), 0.26)))
    y_ratio = max(0.0, min(1.0, _safe_float(model_cfg.get("y_ratio", 0.96), 0.96)))

    asr_cfg = config.get("asr", {})
    observe_cfg = config.get("observe", {})
    summary_cfg = config.get("history_summary", {})
    style_cfg = config.get("style", {})
    humanize_cfg = config.get("humanize", {})
    motion_cfg = config.get("motion", {})
    tools_cfg = config.get("tools", {})
    character_runtime_cfg = config.get("character_runtime", {})
    if not isinstance(character_runtime_cfg, dict):
        character_runtime_cfg = {}
    runtime_enabled = bool(character_runtime_cfg.get("enabled", False))
    runtime_return_metadata = bool(character_runtime_cfg.get("return_metadata", False))
    runtime_demo_stable = bool(character_runtime_cfg.get("demo_stable", False))
    persona_override_cfg = character_runtime_cfg.get("persona_override", {})
    if not isinstance(persona_override_cfg, dict):
        persona_override_cfg = {}
    persona_override_name = str(persona_override_cfg.get("name", "") or "").strip()
    if len(persona_override_name) > 80:
        persona_override_name = persona_override_name[:80].strip()
    persona_override_enabled = bool(persona_override_cfg.get("enabled", False) and persona_override_name)
    hotword_replacements = sanitize_hotword_replacements(
        asr_cfg.get("hotword_replacements", {})
    )
    manual_style = str(style_cfg.get("manual", "neutral") or "neutral").strip().lower()
    if manual_style not in {"neutral", "comfort", "clear", "playful", "steady"}:
        manual_style = "neutral"
    intensity = str(motion_cfg.get("intensity", "normal") or "normal").strip().lower()
    if intensity not in {"low", "normal", "high"}:
        intensity = "normal"
    stream_mode = str(tts_cfg.get("stream_mode", "realtime") or "realtime").strip().lower()
    if stream_mode not in {"final_only", "realtime"}:
        stream_mode = "realtime"
    observe_attach_mode_raw = str(
        observe_cfg.get("attach_mode", "manual") or "manual"
    ).strip().lower()
    if observe_attach_mode_raw in {"always", "auto"}:
        observe_attach_mode = "always"
    elif observe_attach_mode_raw in {"manual", "keyword"}:
        observe_attach_mode = "manual"
    else:
        observe_attach_mode = "manual"
    observe_auto_chat_tuning_raw = observe_cfg.get("auto_chat_tuning", {})
    if not isinstance(observe_auto_chat_tuning_raw, dict):
        observe_auto_chat_tuning_raw = {}
    observe_auto_chat_tuning = {
        "trigger_base_threshold": max(
            0.4,
            min(
                3.0,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("trigger_base_threshold", 1.03),
                    1.03,
                ),
            ),
        ),
        "short_silence_penalty": max(
            0.0,
            min(
                1.2,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("short_silence_penalty", 0.35),
                    0.35,
                ),
            ),
        ),
        "long_silence_bonus": max(
            0.0,
            min(
                1.0,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("long_silence_bonus", 0.14),
                    0.14,
                ),
            ),
        ),
        "emotion_bonus": max(
            0.0,
            min(
                0.8,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("emotion_bonus", 0.12),
                    0.12,
                ),
            ),
        ),
        "repeat_reason_penalty": max(
            0.0,
            min(
                1.2,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("repeat_reason_penalty", 0.44),
                    0.44,
                ),
            ),
        ),
        "repeat_topic_penalty": max(
            0.0,
            min(
                1.2,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("repeat_topic_penalty", 0.48),
                    0.48,
                ),
            ),
        ),
        "burst_penalty": max(
            0.0,
            min(
                1.2,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("burst_penalty", 0.32),
                    0.32,
                ),
            ),
        ),
        "recent_auto_penalty": max(
            0.0,
            min(
                1.5,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("recent_auto_penalty", 0.45),
                    0.45,
                ),
            ),
        ),
        "score_jitter": max(
            0.0,
            min(
                0.8,
                _safe_float(
                    observe_auto_chat_tuning_raw.get("score_jitter", 0.12),
                    0.12,
                ),
            ),
        ),
        "repeat_reason_window_ms": max(
            2 * 60 * 1000,
            min(
                120 * 60 * 1000,
                _safe_int(
                    observe_auto_chat_tuning_raw.get(
                        "repeat_reason_window_ms",
                        14 * 60 * 1000,
                    ),
                    14 * 60 * 1000,
                ),
            ),
        ),
        "repeat_topic_window_ms": max(
            2 * 60 * 1000,
            min(
                150 * 60 * 1000,
                _safe_int(
                    observe_auto_chat_tuning_raw.get(
                        "repeat_topic_window_ms",
                        22 * 60 * 1000,
                    ),
                    22 * 60 * 1000,
                ),
            ),
        ),
        "burst_reset_window_ms": max(
            3 * 60 * 1000,
            min(
                150 * 60 * 1000,
                _safe_int(
                    observe_auto_chat_tuning_raw.get(
                        "burst_reset_window_ms",
                        18 * 60 * 1000,
                    ),
                    18 * 60 * 1000,
                ),
            ),
        ),
        "max_topic_hint_chars": max(
            12,
            min(
                120,
                _safe_int(
                    observe_auto_chat_tuning_raw.get("max_topic_hint_chars", 42),
                    42,
                ),
            ),
        ),
    }
    observe_auto_chat_min_ms = max(
        60 * 1000,
        min(
            30 * 60 * 1000,
            _safe_int(observe_cfg.get("auto_chat_min_ms", 180000), 180000),
        ),
    )
    observe_auto_chat_max_ms = max(
        observe_auto_chat_min_ms + 30 * 1000,
        min(
            60 * 60 * 1000,
            _safe_int(observe_cfg.get("auto_chat_max_ms", 480000), 480000),
        ),
    )
    wake_words_raw = asr_cfg.get("wake_words", ["馨语", "馨语ai", "xinyu", "\u5854\u83f2", "taffy", "tafi"])
    wake_words = []
    if isinstance(wake_words_raw, list):
        for item in wake_words_raw:
            w = str(item or "").strip()
            if w:
                wake_words.append(w[:32])
    if not wake_words:
        wake_words = ["馨语", "馨语ai", "xinyu", "\u5854\u83f2", "taffy", "tafi"]

    return {
        "onboarding_completed": bool(config.get("onboarding_completed", False)),
        "assistant_name": config.get("assistant_name", "Mochi"),
        "model_path": config.get("model_path", DEFAULT_CONFIG["model_path"]),
        "model": {
            "scale": model_scale,
            "x_ratio": x_ratio,
            "y_ratio": y_ratio,
        },
        "tts": {
            "provider": provider,
            "voice": voice,
            "voices": voices,
            "stream_mode": stream_mode,
            "gpt_sovits_realtime_tts": bool(
                tts_cfg.get("gpt_sovits_realtime_tts", False)
            ),
            "allow_browser_fallback": bool(
                tts_cfg.get("allow_browser_fallback", False)
            ),
        },
        "asr": {
            "show_mic_meter": bool(asr_cfg.get("show_mic_meter", True)),
            "keep_listening": bool(asr_cfg.get("keep_listening", True)),
            "transcribe_on_close": bool(asr_cfg.get("transcribe_on_close", True)),
            "min_speech_ms": max(80, min(1200, _safe_int(asr_cfg.get("min_speech_ms", 150), 150))),
            "silence_trigger_ms": max(
                180, min(1200, _safe_int(asr_cfg.get("silence_trigger_ms", 380), 380))
            ),
            "max_speech_ms": max(1000, min(6000, _safe_int(asr_cfg.get("max_speech_ms", 2200), 2200))),
            "speech_threshold": max(
                0.0015, min(0.05, _safe_float(asr_cfg.get("speech_threshold", 0.0035), 0.0035))
            ),
            "processor_buffer_size": (
                _safe_int(asr_cfg.get("processor_buffer_size", 2048), 2048)
                if _safe_int(asr_cfg.get("processor_buffer_size", 2048), 2048)
                in {1024, 2048, 4096, 8192}
                else 2048
            ),
            "wake_word_enabled": bool(asr_cfg.get("wake_word_enabled", True)),
            "wake_words": wake_words[:8],
            "hotword_replacements": hotword_replacements,
        },
        "observe": {
            "attach_mode": observe_attach_mode,
            "allow_auto_chat": bool(observe_cfg.get("allow_auto_chat", False)),
            "auto_chat_enabled": bool(observe_cfg.get("auto_chat_enabled", False)),
            "auto_chat_min_ms": observe_auto_chat_min_ms,
            "auto_chat_max_ms": observe_auto_chat_max_ms,
            "auto_chat_tuning": observe_auto_chat_tuning,
            "daily_greeting_enabled": bool(observe_cfg.get("daily_greeting_enabled", False)),
            "daily_greeting_hour": max(
                0, min(23, _safe_int(observe_cfg.get("daily_greeting_hour", 8), 8))
            ),
            "daily_greeting_minute": max(
                0, min(59, _safe_int(observe_cfg.get("daily_greeting_minute", 0), 0))
            ),
            "daily_greeting_prompt": str(
                observe_cfg.get(
                    "daily_greeting_prompt",
                    (
                        "请你像桌宠一样主动向我说早安，简短自然地问好，"
                        "再给我一句鼓励今天认真努力的暖心话。控制在两三句内，不要太像模板。"
                    ),
                )
                or ""
            ).strip()[:240],
        },
        "history_summary": {
            "enabled": bool(summary_cfg.get("enabled", True)),
            "trigger_messages": max(
                8, min(80, _safe_int(summary_cfg.get("trigger_messages", 14), 14))
            ),
            "keep_recent_messages": max(
                4, min(40, _safe_int(summary_cfg.get("keep_recent_messages", 8), 8))
            ),
            "max_summary_chars": max(
                240, min(3000, _safe_int(summary_cfg.get("max_summary_chars", 900), 900))
            ),
        },
        "style": {
            "auto": bool(style_cfg.get("auto", True)),
            "manual": manual_style,
        },
        "humanize": {
            "enabled": bool(humanize_cfg.get("enabled", True)),
            "strip_fillers": bool(humanize_cfg.get("strip_fillers", True)),
            "refine_enabled": bool(humanize_cfg.get("refine_enabled", True)),
            "refine_max_chars": max(
                48, min(220, _safe_int(humanize_cfg.get("refine_max_chars", 120), 120))
            ),
            "refine_timeout_sec": max(
                4, min(25, _safe_int(humanize_cfg.get("refine_timeout_sec", 12), 12))
            ),
            "refine_min_chars": max(
                12, min(120, _safe_int(humanize_cfg.get("refine_min_chars", 36), 36))
            ),
        },
        "motion": {
            "enabled": bool(motion_cfg.get("enabled", True)),
            "cooldown_ms": max(
                250, min(8000, _safe_int(motion_cfg.get("cooldown_ms", 1200), 1200))
            ),
            "speaking_cooldown_ms": max(
                500,
                min(
                    8000,
                    _safe_int(
                        motion_cfg.get("speaking_cooldown_ms", 1600),
                        1600,
                    ),
                ),
            ),
            "speech_motion_strength": max(
                0.6,
                min(
                    2.2,
                    _safe_float(
                        motion_cfg.get(
                            "speech_motion_strength",
                            motion_cfg.get("speech_body_motion_strength", 1.35),
                        ),
                        1.35,
                    ),
                ),
            ),
            "intensity": intensity,
            "combo_enabled": bool(motion_cfg.get("combo_enabled", True)),
            "expression_enabled": bool(motion_cfg.get("expression_enabled", True)),
            "expression_strength": max(
                0.2,
                min(
                    2.0,
                    _safe_float(motion_cfg.get("expression_strength", 1.0), 1.0),
                ),
            ),
            "idle_enabled": bool(motion_cfg.get("idle_enabled", True)),
            "idle_min_ms": max(
                4000,
                min(90000, _safe_int(motion_cfg.get("idle_min_ms", 12000), 12000)),
            ),
            "idle_max_ms": max(
                5000,
                min(150000, _safe_int(motion_cfg.get("idle_max_ms", 24000), 24000)),
            ),
        },
        "tools": {
            "enabled": bool(
                tools_cfg.get("enabled", DEFAULT_CONFIG["tools"]["enabled"])
            ),
            "workspace_root": str(tools_cfg.get("workspace_root", DEFAULT_WORKSPACE_ROOT)),
            "allow_shell": bool(tools_cfg.get("allow_shell", False)),
            "image_enabled": bool(tools_cfg.get("image_enabled", True)),
        },
        "character_runtime": {
            "enabled": runtime_enabled,
            "return_metadata": runtime_return_metadata,
            "demo_stable": runtime_demo_stable,
            "persona_override": {
                "enabled": persona_override_enabled,
                "name": persona_override_name if persona_override_enabled else "",
            },
        },
    }
