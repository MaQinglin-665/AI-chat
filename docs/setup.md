# 安装与运行指南 / Setup Guide

本指南面向首次运行与开源贡献者，覆盖系统要求、依赖安装、启动方式与核心配置。

English summary: install the Windows preview, verify SHA256, configure your own model provider, and keep high-risk capabilities opt-in.

## 1. 系统要求 / System Requirements

- Windows 10/11
- Python 3.10+
- Node.js 18+
- 可用的 Live2D 模型文件（`.model3.json`）

## 2. 推荐首跑路径 / Recommended First Run

普通 Windows 用户推荐先下载 release 安装器，而不是直接下载 GitHub 自动生成的源码压缩包：

```text
Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.6.exe
SHA256SUMS.txt
```

校验 SHA256 后运行安装器。首发安装器未签名，SmartScreen 的未知发布者提醒是预期现象；不要关闭系统安全设置，只有在来源和 SHA256 都匹配时继续。

如果你下载的是源码测试包或 clone 仓库，推荐先走引导式入口：

```powershell
.\install_and_start.bat
```

它会串起依赖安装、预览配置和 Electron 启动。LLM 配置放到应用内首次配置向导完成；首句 smoke check 改为高级排查步骤，不再阻塞普通用户首次启动。项目不会附带云模型、托管 endpoint 或 API key。

更详细说明见 `docs/first-install.md`。

如果你想分步排查，使用：

```powershell
.\prepare_preview_environment.bat
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1 -SoftFail
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
.\start_electron.bat
```

## 3. Install Dependencies

如果你下载的是 Release 附件中的 `windows-source-test.zip`，请先阅读根目录的 `README-FIRST-RUN.txt`。它不是免安装包，仍需要本机安装 Python 和 Node.js。

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
```

`doctor.ps1` 会先检查项目目录是否完整、Python / Node.js / npm / Git 是否可用，并提示常见环境问题。

如果你不想使用脚本，也可以手动安装：

```powershell
pip install -r requirements.txt
pip install -r requirements-dev.txt
npm install
```

`requirements-dev.txt` is only needed when you want to run the local test suite.

本地验证建议使用：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1
```

启动前建议再运行首跑预检：

```powershell
python scripts\first_run_check.py
```

它会检查配置能否加载、Live2D 路径是否有效、LLM key 是否已配置、端口是否占用、TTS 是否适合首跑，以及桌面观察/工具调用等安全默认值。
如果选择本地 Ollama 或 GPT-SoVITS，它还会检查对应本地端口是否可连通，但不会调用外部模型接口，也不会打印密钥。

## 4. Place Live2D Model

将模型放到 `web/models/`，例如：

- `web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json`

在 `config.json` 中设置：

```json
{
  "model_path": "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json",
  "model": {
    "scale": 1.0,
    "x_ratio": 0.26,
    "y_ratio": 0.96
  }
}
```

## 5. Configure LLM

### Recommended first run (OpenAI-compatible)

```json
{
  "llm": {
    "provider": "openai-compatible",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "qwen-plus",
    "translate_provider": "",
    "translate_base_url": "",
    "translate_model": "",
    "translate_api_key_env": "",
    "translate_timeout_sec": 45,
    "api_key_env": "DASHSCOPE_API_KEY",
    "temperature": 0.42
  }
}
```

设置环境变量（临时）：

```powershell
$env:DASHSCOPE_API_KEY = "your_key_here"
```

### Optional local model (Ollama)

```json
{
  "llm": {
    "provider": "ollama",
    "base_url": "http://127.0.0.1:11434",
    "model": "qwen2.5:7b",
    "translate_model": "qwen2.5:3b",
    "translate_num_ctx": 512
  }
}
```

`translate_model` 是可选项。如果聊天主模型较大、中文翻译出现较慢，可以把它设为一个已经安装的更小模型，同时保留 `model` 作为主聊天模型。`translate_provider`、`translate_base_url`、`translate_api_key_env` 也是可选项；当聊天模型容易把翻译请求当成普通对话回答时，可以把翻译切到另一个 OpenAI-compatible 服务或本地 Ollama。`translate_num_ctx` 用于让本地 Ollama 的短翻译请求更轻量；如果指定的翻译模型还没安装，Ollama 会返回错误，请先选择本地已有模型，或执行 `ollama pull <model>`。

## 6. Configure TTS / ASR

### Recommended first run TTS

```json
{
  "tts": {
    "provider": "browser",
    "voice": "zh-CN-XiaoxiaoNeural"
  }
}
```

### GPT-SoVITS (advanced opt-in)

```json
{
  "tts": {
    "provider": "gpt_sovits",
    "gpt_sovits_api_url": "http://127.0.0.1:9880/tts"
  }
}
```

### Wake-word / ASR defaults

```json
{
  "asr": {
    "wake_word_enabled": true,
    "wake_words": ["馨语", "馨语ai", "xinyu", "心语", "新语", "星语"]
  }
}
```

## 7. Run the App

启动前如果不确定配置是否完整，先运行：

```powershell
python scripts\first_run_check.py
```

后端启动后可以再看健康接口：

```powershell
curl http://127.0.0.1:8123/healthz
curl http://127.0.0.1:8123/api/health
```

`/healthz` 只适合确认服务是否活着；`/api/health` 会返回配置、Live2D、LLM、TTS、ASR 和安全配置摘要。若配置了 `server.require_api_token=true`，请求 `/api/health` 时需要带 `X-Taffy-Token`。

详细字段和 readiness 判读见 `docs/backend-health.md`。

### Desktop mode (recommended)

- 双击 `一键启动桌宠.vbs`
- 或双击 `start_electron.bat`

`start_electron.bat` 会在启动前自动运行 `python scripts\first_run_check.py`。如果启动失败或双击 VBS 没有明显反应，请直接运行 `start_electron.bat` 查看诊断输出。

如果看到具体报错但不确定怎么处理，先看 `docs/startup-failure-examples.md`。

## 7.1 Recommended Local Experience Templates

如果你想复现当前推荐的本地体验，可以使用：

- 稳定首跑模板：`docs/recommended-local-config.md` 的 Template A
- 本地角色闭环模板：`docs/recommended-local-config.md` 的 Template B

建议把模板复制到 `config.local.json`，不要改成发布默认值。角色闭环模板会显式打开 `character_runtime.auto_apply_reply_cue`，只适合本地验证角色表现。

### Web debug mode

```powershell
cd D:\AI\ai_desktop_pet
start.bat
```

### Legacy pywebview mode

```powershell
cd D:\AI\ai_desktop_pet
start_desktop.bat
```

## 8. 首跑安全默认值 / First-Run Safety Defaults

默认推荐保持：

- `observe.attach_mode=manual`（不自动观察桌面）
- `tools.enabled=false`
- `tools.allow_shell=false`

说明：高风险能力保持关闭，按需显式开启。

## 9. 配置中心 / Config Center

可视化配置入口：

- `docs/config.html`

建议流程：

1. 执行连通性检查。
2. 通过后一键应用配置。
3. 必要时使用备份回滚。

## 10. Security Notes

- 不要把真实 API Key / Token 写入仓库文件。
- `config.json` 默认不纳入 git。
- `tts_ref/` 建议仅存放本地参考音频，不提交隐私音频。

## 11. Related Docs

- 首次安装：`docs/first-install.md`
- 后端健康接口契约：`docs/backend-health.md`
- 启动失败样例库：`docs/startup-failure-examples.md`
- 发布前 go/no-go 门槛：`docs/release-readiness.md`
- 人工验收清单：`docs/manual-qa.md`
- AI VTuber 长期体验目标：`docs/ai-vtuber-experience-target.md`
- v1.4 AI VTuber Feeling 规格与 demo 场景：`docs/v1.4-ai-vtuber-feeling.md`
- 排障：`docs/troubleshooting.md`
- 语音输入 / 输出排障：`docs/voice-troubleshooting.md`
- 推荐本地配置模板：`docs/recommended-local-config.md`
- 路线图：`docs/ROADMAP.md`
- 贡献：`CONTRIBUTING.md`
- 安全策略：`SECURITY.md`
