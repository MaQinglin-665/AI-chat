# Startup Failure Examples

本页收集首次运行和启动排障中最常见的失败样例。它面向早期测试者和开源贡献者，目标是让用户看到提示后能知道下一步该做什么。

使用顺序建议：

1. 先运行 `python scripts\first_run_check.py`。
2. 如果仍无法启动，再运行 `.\start_electron.bat` 查看完整输出。
3. 后端已启动但体验异常时，再看 `/healthz`、`/api/health` 和 `docs/backend-health.md`。
4. 发布前用 `docs/release-readiness.md` 判断 go/no-go。

不要把真实 API Key、Token、`.env`、私人日志或桌面截图直接贴到公开 issue。

## Python Not Found

可能看到：

```text
Python 3.10+ was not found.
Install Python first, then run start_electron.bat again.
```

常见原因：

- 没有安装 Python。
- 安装了 Python，但没有加入 `PATH`。
- 使用了不兼容的旧版本。

处理：

- 安装 Python 3.10+，推荐 Python 3.11 或 3.12。
- 重新打开 PowerShell。
- 运行 `python --version` 或 `py -3 --version`。

## Python Dependencies Missing

可能看到：

```text
Python dependency missing for server-side Edge TTS: edge-tts.
Python dependency missing for local ASR: vosk.
pytest is not installed.
```

常见原因：

- 没有运行依赖安装。
- 当前 PowerShell 使用的 Python 不是你安装依赖的 Python。

处理：

```powershell
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt
```

如果只想运行桌宠，不跑测试，`requirements-dev.txt` 不是必须项。

## Node Or Npm Missing

可能看到：

```text
Node.js command not found. Install Node.js 18+.
npm command not found. npm install cannot run without it.
```

常见原因：

- 没有安装 Node.js。
- 安装后没有重新打开终端。
- 使用了过旧版本。

处理：

- 安装 Node.js 18+，推荐 20 或 22 LTS。
- 重新打开 PowerShell。
- 运行：

```powershell
node --version
npm --version
```

## Electron Runtime Missing Or Install Failed

可能看到：

```text
Installing Electron runtime...
npm install failed. Check your network, npm mirror, or Node.js version.
```

常见原因：

- `node_modules` 不存在。
- 网络无法下载 Electron。
- npm 镜像或代理配置异常。
- Node 版本过新或过旧导致 Electron 安装失败。

处理：

```powershell
npm install
```

如果网络不稳定，可先检查代理、npm registry 或换到 Node.js 20/22 LTS 后重试。

## Incomplete Source Package

可能看到：

```text
Missing scripts\first_run_check.py.
This folder does not look like a complete project checkout.
```

或：

```text
Missing tests. Download the current main branch source again.
Missing web. Download the current main branch source again.
```

常见原因：

- 下载了旧 Release 源码包。
- ZIP 解压不完整。
- 当前目录不是项目根目录。

处理：

- 确认根目录包含 `electron/`、`web/`、`tests/`、`scripts/`、`package.json`。
- 重新下载 main 分支源码：

```text
https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip
```

## Invalid `config.json`

可能看到：

```text
config.json line ... column ... JSON syntax error
```

常见原因：

- 少了逗号。
- 多了逗号。
- 字符串缺引号。
- 复制配置片段时嵌套层级错了。

处理：

- 用编辑器检查 JSON 语法。
- 如果不确定哪里坏了，先临时移走 `config.local.json`。
- 从 `config.example.json` 重新复制一份最小配置，再逐项加回本地设置。

注意：

- 不要把真实 API Key 写进要提交的配置文件。
- 私人覆盖建议放在 `config.local.json` 或环境变量中。

## Live2D Model Path Placeholder

可能看到：

```text
Live2D path is still a placeholder.
model_path
```

或：

```text
Live2D model file does not exist
```

常见原因：

- `model_path` 仍是 `/models/your_model/model3.json`。
- 模型没有放到 `web/models/`。
- `model_path` 指向目录而不是 `.model3.json` 文件。

处理：

1. 把 Live2D 模型放到类似：

```text
web/models/hiyori_pro_t11/hiyori_pro_t11.model3.json
```

2. 在配置中设置：

```json
{
  "model_path": "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json"
}
```

3. 重新运行：

```powershell
python scripts\first_run_check.py
```

## Server Port Already In Use

可能看到：

```text
Configured server port is already in use
```

如果后面显示：

```text
but http://127.0.0.1:8123/healthz is healthy
```

通常说明已有一个健康的后端或桌宠实例正在运行。

处理：

- 如果你本来就在运行桌宠，可以继续使用现有实例。
- 如果不是预期实例，关闭旧窗口或相关 Python 进程后重试。
- 也可以临时改 `server.port`。

如果 health check 失败，则说明端口被其他程序占用，建议关闭占用程序或换端口。

## Remote LLM API Key Missing

可能看到：

```text
LLM API key is missing. Set env DASHSCOPE_API_KEY or configure a local-only key.
```

或 `/api/health` 中：

```text
LLM API key is missing for the configured remote provider.
```

常见原因：

- `llm.provider` 是 `openai-compatible`，但没有设置 `llm.api_key_env` 对应环境变量。
- 环境变量设置在旧 PowerShell 窗口里，重启后丢失。
- API Key 写在了另一个 Python 环境或系统用户下。

处理：

```powershell
$env:DASHSCOPE_API_KEY = "your_key_here"
python scripts\first_run_check.py
```

长期使用建议设置系统环境变量，或者使用不会提交到仓库的本地覆盖文件。

## LLM Model Name Not Found

可能看到：

```text
model not found
```

常见原因：

- 远程服务没有该模型权限。
- 模型名拼错。
- Ollama 本地模型没有 pull。

处理：

- 远程 OpenAI-compatible：确认服务商文档中的模型名和 key 权限。
- Ollama：

```powershell
ollama pull qwen2.5:7b
```

然后确认 `llm.model` 与已安装模型一致。

## Ollama Not Started

可能看到：

```text
Ollama local endpoint is not reachable at 127.0.0.1:11434.
Start Ollama or run `ollama serve`.
```

常见原因：

- 没启动 Ollama。
- Ollama 监听端口不是 `11434`。
- 防火墙或代理干扰本地连接。

处理：

```powershell
ollama serve
```

然后重新运行：

```powershell
python scripts\first_run_check.py
```

## GPT-SoVITS Service Unavailable

可能看到：

```text
GPT-SoVITS local endpoint is not reachable at 127.0.0.1:9880.
Start GPT-SoVITS before using voice output, or switch tts.provider to browser.
```

常见原因：

- GPT-SoVITS 服务没启动。
- `tts.gpt_sovits_api_url` 端口或路径写错。
- 服务启动了，但不是 `/tts` 接口。

处理：

- 确认 GPT-SoVITS 服务已运行。
- 常见地址：

```text
http://127.0.0.1:9880/tts
```

- 首跑阶段可以先改回：

```json
{
  "tts": {
    "provider": "browser"
  }
}
```

文本聊天不应依赖 GPT-SoVITS 才能工作。

## Vosk Or ASR Model Missing

可能看到：

```text
vosk is not installed
Vosk model directory was not found
Vosk model not found
```

常见原因：

- 没安装 `vosk`。
- Vosk 模型只下载了 ZIP，没有解压。
- `VOSK_MODEL_PATH` 指错。

处理：

```powershell
python -m pip install -r requirements.txt
```

确认模型目录类似：

```text
models/vosk/vosk-model-small-cn-0.22
```

语音输入仍需人工检查麦克风权限和 `/micdebug`。

## `/healthz` OK But `/api/health` Degraded

可能看到：

```json
{
  "ok": true,
  "readiness": {
    "status": "degraded",
    "blocking_checks": ["llm"]
  }
}
```

含义：

- `/healthz` 只证明后端进程活着。
- `/api/health` 发现某些配置或依赖不适合继续完整体验。

处理：

- 看 `readiness.blocking_checks`。
- 看 `checks.<name>.messages` 和 `checks.<name>.actions`。
- 对照 `docs/backend-health.md` 理解字段含义。

## API Token Required

可能看到：

```text
Invalid API token.
```

或：

```text
server.require_api_token=true but token is missing
```

常见原因：

- `server.require_api_token=true`。
- 没有设置 `server.api_token_env` 对应环境变量。
- 前端缓存了旧 token。

处理：

- 设置对应环境变量。
- 重启 Electron。
- 如果只是本地开发临时验证，可明确知道风险后再调整 token 配置；不要为了方便放宽公开发布默认值。

## When To Report An Issue

报告问题前建议收集：

- `python scripts\first_run_check.py` 输出。
- `/healthz` 是否可访问。
- `/api/health` 的 `readiness` 和相关 `checks`，但不要包含 token 或 key。
- `server_err.log` 中相关时间段的错误摘要。
- Python / Node / npm 版本。
- 你使用的是 browser TTS、GPT-SoVITS 还是其他 TTS provider。

不要公开粘贴：

- API Key 或 Token。
- `.env` 全文。
- 私人桌面截图。
- 包含个人隐私的完整聊天记录。
