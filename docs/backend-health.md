# Backend Health Contract

本页说明 Python 本地服务的健康检查接口。它面向首次运行、排障、打包前验收和后续维护者。

这些接口只做低风险自检，不会默认观察桌面、读取用户文件、调用工具、执行 shell，也不会主动调用外部 LLM/TTS 服务。

## Endpoints

### `GET /healthz`

轻量公开探活接口，用来确认本地后端进程是否还活着。

特点：

- 不需要 API token。
- 即使 `server.require_api_token=true` 也应可访问。
- 返回最小信息，不包含详细配置、密钥状态、模型路径细节或 Character Runtime 摘要。
- 适合启动脚本、端口占用判断和“服务是否已经跑起来”的快速检查。

典型返回：

```json
{
  "ok": true,
  "status": "ok",
  "server_time": "2026-05-08T12:34:56"
}
```

### `GET /api/health`

详细自检接口，用来查看配置加载、Live2D、LLM、TTS、ASR、安全设置和 readiness 摘要。

特点：

- 属于 `/api/` 路由；如果 `server.require_api_token=true`，请求需要带 `X-Taffy-Token`。
- 不打印或返回真实 API Key、Token、Authorization header、完整私密配置或 persona override 文本。
- 不向外部 LLM 发起聊天请求。
- 不向 TTS 服务发起真实合成请求。
- 不加载麦克风音频，也不跑真实 ASR 转写。
- 适合定位“配置是否明显错误”，不等同于完整端到端体验测试。

PowerShell 示例：

```powershell
curl http://127.0.0.1:8123/api/health
```

如果启用了本地 API token：

```powershell
curl http://127.0.0.1:8123/api/health -H "X-Taffy-Token: <your-token>"
```

### `GET /api/first_run/status`

首跑向导使用的脱敏状态接口。若启用了 `server.require_api_token`，需要 `X-Taffy-Token`。

返回摘要包含：

- `first_run.onboarding_completed`
- `first_run.needs_first_run`
- `llm.configured`
- `llm.provider`
- `llm.base_url`
- `llm.model`
- `llm.api_key_env`
- `llm.api_key_configured`
- `live2d.ok`
- `safety.observe_attach_mode`
- `safety.tools_enabled`
- `safety.tools_allow_shell`

不会返回真实 API key。

### `POST /api/first_run/configure_llm`

首跑向导保存 LLM 配置时使用。该接口需要本地 API token。

请求字段：

```json
{
  "provider": "openai-compatible",
  "base_url": "https://api.example.com/v1",
  "model": "model-name",
  "api_key_env": "TAFFY_LLM_API_KEY",
  "api_key": "..."
}
```

保存行为：

- provider / base URL / model / API key env 写入 `config.local.json`
- 真实 API key 写入 `.env`
- `config.local.json` 中的 `llm.api_key` 保持为空字符串
- 响应只返回脱敏状态

## Response Shape

`/api/health` 的顶层字段：

| Field | Meaning |
| --- | --- |
| `ok` | 配置加载是否成功。 |
| `status` | 基础状态；配置加载失败时通常为 `degraded`。 |
| `server_time` | 后端生成响应的本地时间。 |
| `checks` | 各子系统的只读检查摘要。 |
| `readiness` | 根据 `checks` 汇总出的启动就绪判断。 |
| `security` | 本地 API token 和 CORS 安全摘要，不含真实 token。 |
| `character_runtime` | Character Runtime 安全布尔摘要，不含 persona 文本。 |
| `character_runtime_backend_entry` | 自动 runtime 后端入口的只读/no-op 安全摘要。 |

## Checks

### `checks.config_load`

确认配置是否能被加载和合并。

常见问题：

- `config.json` JSON 语法错误。
- `config.local.json` JSON 语法错误。
- 配置文件里出现类型不符合预期的值。

### `checks.live2d_model_path`

确认 `model_path` 是否指向真实 `.model3.json` 文件。

常见问题：

- `model_path` 为空。
- 仍是 `/models/your_model/model3.json` 占位符。
- 指向目录而不是文件。
- 文件不存在或模型没有放到 `web/models/` 下。

### `checks.server`

确认本地服务配置是否合理。

关注字段：

- `host`
- `port`
- `require_api_token`
- `api_token_configured`
- `messages`
- `actions`

常见问题：

- `server.port` 不是合法端口。
- `server.require_api_token=true` 但没有配置 token。

### `checks.llm`

确认 LLM 配置是否明显可用。

关注字段：

- `provider`
- `model`
- `base_url_configured`
- `base_url_display`
- `api_key_env`
- `api_key_configured`
- `network_checked`
- `messages`
- `actions`

重要限制：

- `network_checked=false` 表示 `/api/health` 没有真的请求 LLM 服务。
- 对远程 OpenAI-compatible provider，缺 API Key 会成为 blocker。
- 对本地 loopback OpenAI-compatible 服务，允许无 API Key，但仍需要实际聊天验证。

常见问题：

- `llm.provider` 不支持。
- `llm.model` 为空或填错。
- `llm.base_url` 不是合法 HTTP(S) URL。
- 远程 provider 缺少 `llm.api_key_env` 对应环境变量。
- Ollama 未启动或模型未 `ollama pull`，这通常由 `python scripts\first_run_check.py` 或实际聊天暴露。

### `checks.tts`

确认 TTS 配置是否明显可用。

关注字段：

- `provider`
- `server_tts_provider`
- `browser_fallback_enabled`
- `network_checked`
- `api_url_display`
- `edge_tts_installed`
- `messages`
- `actions`

重要限制：

- `network_checked=false` 表示 `/api/health` 没有真的调用 GPT-SoVITS、Edge TTS 或火山 TTS。
- 首跑推荐 `tts.provider=browser`，这是最少依赖的路径。
- GPT-SoVITS 是高级可选项，服务未启动不应破坏文本聊天主流程。

常见问题：

- `tts.provider` 拼错或不支持。
- `edge_tts` provider 需要安装 `edge-tts`。
- `gpt_sovits_api_url` 缺失或不是合法 HTTP(S) URL。
- 火山 TTS 缺 `app_id` 或 `access_token`。

### `checks.asr`

确认本地 ASR 依赖和 Vosk 模型路径状态。

关注字段：

- `vosk_installed`
- `vosk_model_found`
- `vosk_model_path`
- `wake_word_enabled`
- `wake_word_count`
- `messages`
- `actions`

重要限制：

- `/api/health` 不会打开麦克风。
- `/api/health` 不会做真实转写。
- 麦克风权限、输入设备和阈值问题需要用 `/micdebug` 和人工语音测试确认。

常见问题：

- 未安装 `vosk`。
- Vosk 模型目录不存在或只下载了 ZIP 没有解压。
- `VOSK_MODEL_PATH` 指向错误目录。

## Readiness

`readiness` 是对 `checks` 的汇总，用来帮助新手判断“能不能继续启动 / 测试”。

字段：

| Field | Meaning |
| --- | --- |
| `ok` | 没有 blocking checks 时为 `true`。 |
| `status` | `ok`、`warning` 或 `degraded`。 |
| `blocking_checks` | 需要先修复的检查项，例如 `llm`、`tts`、`live2d_model_path`。 |
| `warning_checks` | 可以继续测试但需要注意的检查项，例如 ASR 可选依赖缺失。 |
| `actions` | 汇总后的下一步建议。 |

推荐判断：

- `status=ok`：可以继续做 Electron / Live2D / 文本 / 语音人工验收。
- `status=warning`：基础体验可能可用，但某些可选能力需要人工确认。
- `status=degraded`：先修复 `blocking_checks`，再继续首跑或发布验收。

## Common Examples

### Missing Remote LLM API Key

现象：

- `checks.llm.ok=false`
- `checks.llm.messages` 包含 `LLM API key is missing`
- `readiness.blocking_checks` 包含 `llm`

处理：

- 确认 `llm.api_key_env` 的环境变量名。
- 在 PowerShell 中设置对应环境变量。
- 重新启动后端或运行配置重载。

### Live2D Path Still Placeholder

现象：

- `checks.live2d_model_path.ok=false`
- `error` 指向 `model_path`

处理：

- 把 Live2D 模型放到 `web/models/<model-name>/`。
- 将 `model_path` 改为类似 `/models/hiyori_pro_t11/hiyori_pro_t11.model3.json`。
- 重新运行 `python scripts\first_run_check.py`。

### GPT-SoVITS Not Started

现象：

- `/api/health` 可能只显示 GPT-SoVITS URL 配置摘要。
- `python scripts\first_run_check.py` 会提示本地端口不可达。
- 实际 `/api/tts` 请求失败。

处理：

- 启动 GPT-SoVITS 服务。
- 确认 `tts.gpt_sovits_api_url` 通常类似 `http://127.0.0.1:9880/tts`。
- 首跑阶段可以先改回 `tts.provider=browser`。

### ASR Dependency Missing

现象：

- `checks.asr.vosk_installed=false`
- `checks.asr.messages` 提示安装 `vosk`

处理：

- 运行 `python -m pip install -r requirements.txt`。
- 确认 Vosk 模型目录存在。
- 用 `/micdebug` 和实际开麦测试确认麦克风链路。

## Related Checks

- 首跑预检：`python scripts\first_run_check.py`
- 启动失败样例：`docs/startup-failure-examples.md`
- 手工验收：`docs/manual-qa.md`
- 发布门槛：`docs/release-readiness.md`
- 启动与配置：`docs/setup.md`
- 常见问题：`docs/troubleshooting.md`
- 语音专项：`docs/voice-troubleshooting.md`
