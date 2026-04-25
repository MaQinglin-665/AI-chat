import json
import os
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
TTS_DEFAULT_PROVIDER = "edge_tts"
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


DEFAULT_CONFIG = {
    "assistant_name": "Mochi",
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
        "require_api_token": False,
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
    "thinking": {
        "enabled": True,
        "max_tokens": 100,
        "timeout_sec": 15,
    },
    "decision": {
        "enabled": True,
        "silence_probability": 0.15,
        "silence_keywords": ["嗯", "哦", "ok", "好的", "知道了"],
        "always_reply_keywords": ["塔菲", "taffy", "?", "？", "帮我", "告诉我"],
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
        "gpt_sovits_top_k": 15,
        "gpt_sovits_top_p": 1.0,
        "gpt_sovits_temperature": 1.0,
        "gpt_sovits_speed": 1.0,
    },
    "assistant_prompt": (
        "你是桌宠 Taffy。你在和一位真实人类用户聊天，不要把用户当成设备、程序或系统。"
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
        "min_speech_ms": 180,
        "silence_trigger_ms": 380,
        "max_speech_ms": 2400,
        "speech_threshold": 0.009,
        "processor_buffer_size": 2048,
        "wake_word_enabled": True,
        "wake_words": ["\u5854\u83f2", "taffy", "tafi"],
        "hotword_replacements": {
            "\u5854\u83f2": "Taffy",
            "taffy": "Taffy",
            "neuro": "Neuro",
            "fifa": "FIFA",
        },
    },
    "observe": {
        "attach_mode": "always",
        "allow_auto_chat": False,
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
        "intensity": "normal",
        "combo_enabled": True,
        "expression_enabled": True,
        "expression_strength": 1.0,
        "idle_enabled": True,
        "idle_min_ms": 12000,
        "idle_max_ms": 24000,
    },
    "tools": {
        "enabled": True,
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
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"config.json parse error: {exc}") from exc
    if LOCAL_CONFIG_PATH.exists():
        try:
            local_data = json.loads(LOCAL_CONFIG_PATH.read_text(encoding="utf-8-sig"))
            config = deep_merge(config, local_data)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"config.local.json parse error: {exc}") from exc
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
    observe_attach_mode = str(
        observe_cfg.get("attach_mode", "always") or "always"
    ).strip().lower()
    if observe_attach_mode not in {"keyword", "always"}:
        observe_attach_mode = "always"
    wake_words_raw = asr_cfg.get("wake_words", ["\u5854\u83f2", "taffy", "tafi"])
    wake_words = []
    if isinstance(wake_words_raw, list):
        for item in wake_words_raw:
            w = str(item or "").strip()
            if w:
                wake_words.append(w[:32])
    if not wake_words:
        wake_words = ["\u5854\u83f2", "taffy", "tafi"]

    return {
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
            "min_speech_ms": max(80, min(1200, _safe_int(asr_cfg.get("min_speech_ms", 180), 180))),
            "silence_trigger_ms": max(
                180, min(1200, _safe_int(asr_cfg.get("silence_trigger_ms", 380), 380))
            ),
            "max_speech_ms": max(1000, min(6000, _safe_int(asr_cfg.get("max_speech_ms", 2400), 2400))),
            "speech_threshold": max(
                0.003, min(0.05, _safe_float(asr_cfg.get("speech_threshold", 0.009), 0.009))
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
            "enabled": bool(tools_cfg.get("enabled", True)),
            "workspace_root": str(tools_cfg.get("workspace_root", DEFAULT_WORKSPACE_ROOT)),
            "allow_shell": bool(tools_cfg.get("allow_shell", False)),
            "image_enabled": bool(tools_cfg.get("image_enabled", True)),
        },
    }
