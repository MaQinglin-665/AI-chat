# AI Desktop Pet MVP (Live2D + Voice + Chat)

This project supports:
- Live2D model rendering
- Voice input/output
- Emotion motion mapping
- LLM chat via local Ollama (default) or OpenAI-compatible API
- Wake-word listening (e.g. "塔菲")
- Reminder and emotion daily report commands
- Desktop screenshot attach for context-aware replies

## 1) Place Live2D model

Put your model under `web/models/`.

Example:
- `web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json`

Then set `config.json`:
- `"model_path": "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json"`
- Model size/position can be adjusted with:

```json
{
  "model": {
    "scale": 1.0,
    "x_ratio": 0.26,
    "y_ratio": 0.96
  }
}
```

## 2) LLM provider config

### Local model (default, Ollama)

```json
{
  "llm": {
    "provider": "ollama",
    "base_url": "http://127.0.0.1:11434",
    "model": "qwen2.5:7b",
    "temperature": 0.7
  }
}
```

Make sure model exists:

```powershell
ollama list
```

### OpenAI / OpenAI-compatible

```json
{
  "llm": {
    "provider": "openai",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "api_key_env": "OPENAI_API_KEY",
    "temperature": 0.7
  }
}
```

Set key in terminal:

```powershell
set OPENAI_API_KEY=your_key_here
```

For persistent use on Windows:

```powershell
setx OPENAI_API_KEY "your_key_here"
```

Optional (recommended for public/release builds): protect `/api/*` with token:

```powershell
setx TAFFY_API_TOKEN "your_long_random_token"
```

Then set in `config.json`:

```json
{
  "server": {
    "require_api_token": true,
    "api_token_env": "TAFFY_API_TOKEN"
  }
}
```


## 3) TTS (voice) config

Default is local GPT-SoVITS API:

```json
{
  "tts": {
    "provider": "gpt_sovits",
    "voice": "default",
    "voices": ["default"],
    "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
    "gpt_sovits_method": "POST",
    "gpt_sovits_timeout_sec": 60,
    "gpt_sovits_format": "wav"
  }
}
```

Optional: use Volcengine instead:

```powershell
setx VOLCENGINE_APP_ID "your_app_id"
setx VOLCENGINE_ACCESS_TOKEN "your_access_token"
setx VOLCENGINE_SECRET_KEY "your_secret_key"
```

You can also put these keys into `.env` (see `.env.example`).  
The server auto-loads `.env` on startup.

If you want to use Edge TTS:

```json
{
  "tts": {
    "provider": "edge_tts",
    "voice": "zh-CN-XiaoxiaoNeural"
  }
}
```

If server-side TTS fails, set:

```json
{
  "tts": {
    "provider": "browser"
  }
}
```

## 4) Run

Desktop mode (recommended, transparent window):
- Double-click desktop shortcut: `AI桌宠`
- Or double-click: `一键启动桌宠.vbs`
- First time: double-click `安装快捷方式.bat` to create `Taffy桌宠` on desktop and Start menu
- Optional: double-click `开启开机自启.bat` / `关闭开机自启.bat`
- First launch auto-installs Electron runtime
- In desktop mode, drag the model to move the whole pet window

Stop service:
- Double-click: `停止桌宠.bat`

Web debug mode:

```powershell
cd D:\AI\ai_desktop_pet
start.bat
```

Legacy pywebview desktop mode:

```powershell
cd D:\AI\ai_desktop_pet
start_desktop.bat
```

## 5) Notes

- `favicon.ico` 404 can be ignored.
- If model does not show, hard refresh with `Ctrl + F5`.
- Never store real API tokens in `config.json`. Keep secrets in environment variables.
- `config.json` is ignored by `.gitignore` by default.
- Work-tool command execution is disabled by default (`tools.allow_shell=false`). Enable only when needed.
- CORS allows loopback origins by default (`localhost` / `127.0.0.1`), not arbitrary websites.
- Window position and size are auto-saved in Electron mode and restored on next launch.

## 6) Chat Commands

In chat input, you can use:

- `/提醒 10m 喝水` (relative time)
- `/提醒 21:30 准备休息` (today at HH:MM)
- `/提醒 2026-04-11 20:00 开会` (absolute time)
- `/提醒列表`
- `/取消提醒 3`
- `/情绪日报`

Wake-word defaults are in `config.json`:

```json
{
  "asr": {
    "wake_word_enabled": true,
    "wake_words": ["\u5854\u83f2", "taffy", "tafi"]
  }
}
```

## 7) Code structure

- `app.py`: main LLM flow, ASR endpoint, and server bootstrap.
- `config.py`: config defaults, `.env` loading, config sanitize.
- `tts.py`: server-side TTS providers (GPT-SoVITS/Volcengine/Edge).
- `memory.py`: long-term memory read/write and prompt injection.
- `tools.py`: workspace tool execution and image tool.

## 8) 配置中心（docs）与统一发布流程

配置中心页面：
- `docs/config.html`
- 功能：配置校验、差异预览、本地写入并备份、连通性检测、一键应用（校验 → 写入 → 重载，失败可重启）、一键回滚到最近备份

本地预览（HTTP）：

```powershell
cd D:\AI\ai_desktop_pet\docs
python -m http.server 5500
```

然后访问：
- `http://127.0.0.1:5500/config.html`
- `http://127.0.0.1:5500/index.html`

统一发布流程（与首页/配置页文案一致）：
1. 在配置中心执行“配置连通性自检”并处理告警/错误。
2. 执行“一键应用配置”，确认写入、热重载（或重启）链路可用。
3. 在 GitHub 创建新版本 Release，并上传安装包与更新说明。
4. 更新首页下载说明与 README，确保入口指向当前仓库和 Releases。
