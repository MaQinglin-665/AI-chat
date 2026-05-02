# Troubleshooting

以下问题优先使用配置中心（`docs/config.html`）做连通性检查，再根据提示修复。

语音输入 / 语音输出问题请优先看 `docs/voice-troubleshooting.md`。那里包含麦克风权限、`/micdebug`、Vosk 模型、ASR 错误码、TTS 回退等更细的排查步骤。

## Common Startup / Runtime Issues

### 0) Downloaded source looks incomplete

- 现象：`dir tests` 报错，或找不到 `web/`、`electron/`、`scripts/`
- 原因：下载了旧 Release 源码包、浏览器缓存中的旧 ZIP，或 GitHub 下载/解压不完整
- 建议：重新下载 `main` 分支源码：`https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip`
- 检查项：项目根目录应包含 `electron/`、`web/`、`tests/`、`scripts/`、`package.json`

### 0.1) Not sure what to run first

- 现象：源码已下载，但不确定依赖、测试、启动顺序
- 建议：先运行 `powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1`
- 下一步：诊断通过后运行 `powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1`
- 验证：安装完成后运行 `powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1`
- 启动前：运行 `python scripts\first_run_check.py`，确认配置、Live2D、LLM、TTS 和安全默认值

### 0.2) Double-click start fails or the window closes

- 现象：双击 `start_electron.bat` 后窗口关闭，或 Electron 启动失败
- 建议：在 PowerShell 中运行 `.\start_electron.bat` 查看完整提示
- 检查项：`python scripts\first_run_check.py` 是否通过、`npm install` 是否成功、Node.js 是否为 20/22 LTS
- 备用验证：运行 `powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1`

### 0.3) Double-click VBS has no visible output

- 现象：双击 `一键启动桌宠.vbs` 后没有明显反应
- 原因：VBS 启动入口会隐藏命令行窗口，诊断输出可能不可见
- 建议：改用 `start_electron.bat`，它会自动运行首跑预检并显示阻塞原因
- 手动检查：`python scripts\first_run_check.py`

### 1) API Key missing

- 现象：调用 LLM 时鉴权失败
- 检查项：`llm.api_key_env`
- 建议：先设置环境变量，再重启或重载配置

### 2) LLM connection failed

- 检查项：`llm.base_url`
- 建议：确认服务地址、端口与网络可达

### 3) Ollama not running

- 检查项：`llm.base_url`
- 建议：先启动 `ollama serve`

### 4) Model name not found

- 检查项：`llm.model`
- 建议：改为已安装模型，或先 `ollama pull <model>`

### 5) GPT-SoVITS service unavailable

- 检查项：`tts.gpt_sovits_api_url`
- 建议：确认服务进程和端口
- 语音专项排查：`docs/voice-troubleshooting.md`

### 6) TTS timeout

- 检查项：`tts.gpt_sovits_timeout_sec`
- 建议：提高超时或降低服务负载
- 语音专项排查：`docs/voice-troubleshooting.md`

### 7) Live2D path invalid

- 检查项：`model_path`
- 建议：指向真实 `.model3.json` 文件

### 8) Invalid `config.json`

- 检查项：JSON 语法
- 建议：检查逗号、引号、括号和顶层结构

### 9) Port already in use

- 检查项：`server.port`
- 建议：关闭占用进程或更换端口

### 10) Network/DNS/proxy issue

- 检查项：`llm.base_url`、`tts.gpt_sovits_api_url`
- 建议：检查网络、代理、DNS 设置

## Quick Checks

- `favicon.ico` 404 可忽略。
- 模型不显示时尝试 `Ctrl + F5` 硬刷新。
- Electron 模式窗口位置会自动保存并在下次恢复。
- 开麦、转写、TTS 相关问题见 `docs/voice-troubleshooting.md`。

## Security Reminder

- 默认不要开启 shell 工具执行。
- 默认不要自动观察桌面。
- 不要将真实密钥写入仓库。
