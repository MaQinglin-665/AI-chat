# 馨语AI桌宠

一个运行在 Windows 桌面的 AI 桌宠项目：把 `Live2D + 语音对话 + 大模型聊天 + 情绪动作` 合在一起，目标是做“能陪伴、能说话、低打扰”的本地桌面伙伴。

## 这是什么项目

- 形态：Electron 桌面应用 + Python 本地服务
- 交互：Live2D 角色显示、语音输入输出、文本聊天、唤醒词
- 核心定位：偏个人陪伴和轻助手，不是通用办公 Agent

## 核心功能（当前可用）

- Live2D 模型渲染与桌面透明窗口
- 语音输入/语音输出（支持 GPT-SoVITS、Edge TTS、Browser TTS）
- LLM 对话（默认本地 Ollama，也支持 OpenAI 兼容接口）
- 情绪映射与日常提醒指令（如 `/提醒`、`/情绪日报`）
- 可附带桌面截图作为上下文进行回复

## 项目状态（请先看）

- 当前阶段：`MVP / 持续迭代中`，适合体验和共建
- 仓库版本：`package.json` 当前为 `1.0.0`
- 说明：已有可运行主流程，但仍在持续优化“真实陪伴感”和稳定性，不建议直接视为最终商业正式版

## 5 分钟快速体验

1. 准备环境：Windows、Python 3.10+、Node.js、可用的 Live2D 模型
2. 放置模型到 `web/models/`，并在 `config.json` 设置 `model_path`
3. 选择一个 LLM 提供方：默认 OpenAI-compatible（qwen-plus），也可切到本地 Ollama
4. 选择一个 TTS 提供方：默认 browser TTS（首启更稳）
5. 双击 `一键启动桌宠.vbs`（或已创建的桌面快捷方式）

详细配置继续看下方章节：
- Live2D：`## 1) Place Live2D model`
- LLM：`## 2) LLM provider config`
- 语音：`## 3) TTS (voice) config`
- 启动方式：`## 4) Run`

## 需要配置哪些东西

- 首次推荐先打开配置中心中的“首次启动向导”，按步骤完成模式选择、LLM/TTS 测试与保存
- 必配：`model_path`（Live2D 模型路径）
- 至少选一项 LLM：默认 `openai-compatible`（与 `config.example.json` 一致），也可改为 `ollama`
- 至少选一项 TTS：默认 `browser`；`gpt_sovits` 作为高级高质量模式按需开启
- 推荐：把密钥放到环境变量或 `.env`，不要明文写入仓库文件

向导完成后会写入：

```json
{
  "onboarding_completed": true
}
```

该字段用于避免首次向导重复弹出；旧配置文件未包含该字段时会自动兼容，不影响原有使用。

如需重新进入引导流程：打开 `docs/config.html`，在“快速开始”区域点击“重新打开首次启动向导”。

## 正在开发 / 持续优化

- Live2D 说话时更自然的身体联动
- 降低“你问我答”机械感，增强连续陪伴感
- 低打扰的主动对话策略
- 文档与配置中心体验优化

## 安全与隐私

- 默认可走本地链路（本地模型 + 本地语音服务），可减少外发数据
- `config.json` 默认被 `.gitignore` 忽略，敏感信息建议仅放环境变量
- `tts_ref/` 用于本地参考音频，避免提交私人语音样本
- 工具执行默认关闭（`tools.enabled=false`，`tools.allow_shell=false`），按需开启

## 适合谁使用

- 想搭建本地可控 AI 桌宠的开发者 / 折腾玩家
- 想基于 Live2D + 语音 + LLM 做二次开发的项目维护者
- 希望先从 MVP 跑通，再逐步打磨陪伴体验的团队

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

### Release Defaults (aligned with `config.example.json`)

- Default LLM: `openai-compatible` + `qwen-plus` (`https://dashscope.aliyuncs.com/compatible-mode/v1`)
- Default TTS: `browser` (best first-run compatibility)
- GPT-SoVITS is treated as an advanced high-quality mode (opt-in after basic flow is stable)
- First launch flow is aligned with `docs/config.html`: run first-run wizard -> connectivity checks -> one-click apply config

## 2) LLM provider config

### Default (OpenAI-compatible, aligned with `config.example.json`)

```json
{
  "llm": {
    "provider": "openai-compatible",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen-plus",
    "api_key_env": "DASHSCOPE_API_KEY",
    "temperature": 0.42
  }
}
```

Set key in terminal:

```powershell
set DASHSCOPE_API_KEY=your_key_here
```

### Optional local model (Ollama)

```json
{
  "llm": {
    "provider": "ollama",
    "base_url": "http://127.0.0.1:11434",
    "model": "qwen2.5:7b"
  }
}
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

Default is Browser TTS (first-run friendly):

```json
{
  "tts": {
    "provider": "browser",
    "voice": "zh-CN-XiaoxiaoNeural"
  }
}
```

Advanced high-quality mode (GPT-SoVITS):

```json
{
  "tts": {
    "provider": "gpt_sovits",
    "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
    "gpt_sovits_top_k": 8,
    "gpt_sovits_top_p": 0.78,
    "gpt_sovits_temperature": 0.36,
    "gpt_sovits_repetition_penalty": 1.08
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

TTS reference audio is local-only by default:
- put personal/sample reference files under `tts_ref/`
- this folder is ignored by git (except `tts_ref/README.md`)
- avoid committing private voice samples directly to the repository

If you want to use Edge TTS:

```json
{
  "tts": {
    "provider": "edge_tts",
    "voice": "zh-CN-XiaoxiaoNeural"
  }
}
```

If server-side TTS fails, fallback to:

```json
{
  "tts": {
    "provider": "browser"
  }
}
```

## 4) Run

Desktop mode (recommended, transparent window):
- Double-click desktop shortcut: `馨语AI桌宠`
- Or double-click: `一键启动桌宠.vbs`
- First time: double-click `安装快捷方式.bat` to create `馨语AI桌宠` on desktop and Start menu
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
- Work-tool command execution is disabled by default (`tools.enabled=false`, `tools.allow_shell=false`). Enable only when needed.
- CORS allows loopback origins by default (`localhost` / `127.0.0.1`), not arbitrary websites.
- Window position and size are auto-saved in Electron mode and restored on next launch.

## 常见问题排查

以下错误现在会在界面中给出中文诊断（包含“问题原因 / 解决方法 / 对应配置项”），控制台保留脱敏后的详细日志：

1. API Key 未填写  
   - 对应配置项：`llm.api_key_env`
   - 建议：先设置环境变量，再重启桌宠或触发配置重载。
2. LLM 连接失败  
   - 对应配置项：`llm.base_url`
   - 建议：确认模型服务已启动，地址与端口正确。
3. Ollama 未启动  
   - 对应配置项：`llm.base_url`
   - 建议：先启动 Ollama（可执行 `ollama serve`）。
4. 模型名称不存在  
   - 对应配置项：`llm.model`
   - 建议：改为已安装模型，或先执行 `ollama pull <model>`。
5. GPT-SoVITS 服务未启动  
   - 对应配置项：`tts.gpt_sovits_api_url`
   - 建议：确认 GPT-SoVITS 服务与端口可用。
6. TTS 请求超时  
   - 对应配置项：`tts.gpt_sovits_timeout_sec`
   - 建议：提高超时配置，或降低服务负载后再试。
7. Live2D 路径错误  
   - 对应配置项：`model_path`
   - 建议：指向真实的 `.model3.json` 文件，不要保留示例占位路径。
8. `config.json` 格式错误  
   - 对应配置项：`config.json`
   - 建议：检查逗号、引号、括号与 JSON 顶层结构。
9. 端口被占用  
   - 对应配置项：`server.port`
   - 建议：关闭占用进程或改用其他端口后重启。
10. 网络连接失败  
    - 对应配置项：`llm.base_url` / `tts.gpt_sovits_api_url`
    - 建议：检查网络、代理和 DNS 配置。

## 6) Chat Commands

In chat input, you can use:

- `/提醒 10m 喝水` (relative time)
- `/提醒 21:30 准备休息` (today at HH:MM)
- `/提醒 2026-04-11 20:00 开会` (absolute time)
- `/提醒列表`
- `/取消提醒 3`
- `/情绪日报`

Wake-word defaults are in `config.json`:
其中旧唤醒词 `塔菲` / `taffy` / `tafi` 作为“兼容旧版唤醒词”保留。

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
- `http://127.0.0.1:5500/persona.html`

### Persona Card

- Page: `docs/persona.html`
- Editable fields: character name, user alias, personality tags, speaking style, catchphrases, likes, dislikes, initiative level, relationship role.
- Supports JSON import and JSON export.
- Saving writes to `memory_persona_card.json`, and the next chat round reads the updated persona.
- Legacy keys remain compatible (`identity`, `user_preferences`, `user_dislikes`, `common_topics`, `reply_style`, `companionship_style`).

统一发布流程（与首页/配置页文案一致）：
1. 在配置中心执行“配置连通性自检”并处理告警/错误。
2. 执行“一键应用配置”，确认写入、热重载（或重启）链路可用。
3. 在 GitHub 创建新版本 Release，并上传安装包与更新说明。
4. 更新首页下载说明与 README，确保入口指向当前仓库和 Releases。

## 9) Contributing and Changelog

- Contributing guide: `CONTRIBUTING.md`
- Changelog: `CHANGELOG.md`

## 10) Live2D Model License Notice

- This repository includes demo Live2D models under `docs/live2d/models/` (for example `haru_greeter_t03` and `hiyori_pro_t11`) for preview/testing.
- These assets are not authored by this project and remain under their original license terms from Live2D sample/free materials.
- Before redistribution or commercial use, verify compliance with the latest Live2D sample/free material license terms:
  - https://www.live2d.com/en/download/sample-data/
  - https://www.live2d.com/en/terms/live2d-free-material-license-agreement/
- If your usage does not satisfy those terms, replace the model assets with your own licensed files.
