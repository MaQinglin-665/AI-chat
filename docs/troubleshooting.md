# Troubleshooting

以下问题优先使用配置中心（`docs/config.html`）做连通性检查，再根据提示修复。

## Common Startup / Runtime Issues

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

### 6) TTS timeout

- 检查项：`tts.gpt_sovits_timeout_sec`
- 建议：提高超时或降低服务负载

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

## Security Reminder

- 默认不要开启 shell 工具执行。
- 默认不要自动观察桌面。
- 不要将真实密钥写入仓库。
