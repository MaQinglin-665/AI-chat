# Setup Guide

本指南面向首次运行与开源贡献者，覆盖系统要求、依赖安装、启动方式与核心配置。

## 1. System Requirements

- Windows 10/11
- Python 3.10+
- Node.js 18+
- 可用的 Live2D 模型文件（`.model3.json`）

## 2. Install Dependencies

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

## 3. Place Live2D Model

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

## 4. Configure LLM

### Recommended first run (OpenAI-compatible)

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
    "model": "qwen2.5:7b"
  }
}
```

## 5. Configure TTS / ASR

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
    "wake_words": ["塔菲", "taffy", "tafi"]
  }
}
```

## 6. Run the App

启动前如果不确定配置是否完整，先运行：

```powershell
python scripts\first_run_check.py
```

### Desktop mode (recommended)

- 双击 `一键启动桌宠.vbs`
- 或双击 `start_electron.bat`

`start_electron.bat` 会在启动前自动运行 `python scripts\first_run_check.py`。如果启动失败或双击 VBS 没有明显反应，请直接运行 `start_electron.bat` 查看诊断输出。

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

## 7. First-run Safety Defaults

默认推荐保持：

- `observe.attach_mode=manual`（不自动观察桌面）
- `tools.enabled=false`
- `tools.allow_shell=false`

说明：高风险能力保持关闭，按需显式开启。

## 8. Config Center

可视化配置入口：

- `docs/config.html`

建议流程：

1. 执行连通性检查。
2. 通过后一键应用配置。
3. 必要时使用备份回滚。

## 9. Security Notes

- 不要把真实 API Key / Token 写入仓库文件。
- `config.json` 默认不纳入 git。
- `tts_ref/` 建议仅存放本地参考音频，不提交隐私音频。

## 10. Related Docs

- 排障：`docs/troubleshooting.md`
- 语音输入 / 输出排障：`docs/voice-troubleshooting.md`
- 路线图：`docs/ROADMAP.md`
- 贡献：`CONTRIBUTING.md`
- 安全策略：`SECURITY.md`
