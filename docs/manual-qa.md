# Manual QA Checklist

本清单用于发布前、打包前，或改动启动体验 / 后端自检 / 语音链路后做一轮人工确认。它不是成熟产品认证，只是帮助早期测试者稳定复现 MVP 桌宠体验。发布 go/no-go 汇总见 `docs/release-readiness.md`。

长期 AI VTuber / 桌宠体验目标见 `docs/ai-vtuber-experience-target.md`。

v1.4 角色体验、动作/TTS 一致性和 demo 场景的专项验收见 `docs/v1.4-ai-vtuber-feeling.md`。

## Test Rules

- 使用 PowerShell 从仓库根目录执行命令。
- 不提交 `config.json`、`config.local.json`、`.env`、日志、真实 API Key、Token 或私人桌面截图。
- 保持安全默认值：`observe.attach_mode=manual`、`tools.enabled=false`、`tools.allow_shell=false`。
- 如果要测试 GPT-SoVITS，把它作为高级可选项；首跑基线优先用 `tts.provider=browser`。
- 如果某项依赖本机模型、麦克风或外部服务，请在结果里写清楚“未测 / 环境不可用”，不要把它写成通过。

## Automated Gate

先跑这组轻量检查：

```powershell
python -m py_compile app_health.py scripts\first_run_check.py
C:\Users\MQL\AppData\Local\Programs\Python\Python312\python.exe -m pytest -q -p no:cacheprovider tests/test_api_health.py
git diff --check
```

通过标准：

- Python 编译检查无错误。
- `tests/test_api_health.py` 通过。
- `git diff --check` 无尾随空白或冲突标记。

## First-Run Preflight

- [ ] 运行 `powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1`。
- [ ] 如果缺 `electron/`、`web/`、`tests/` 或 `scripts/`，重新下载 main 分支源码。
- [ ] 运行 `powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1`。
- [ ] 运行 `python scripts\first_run_check.py`。
- [ ] 确认预检能清楚提示 Python / Node / npm / Python 包依赖状态。
- [ ] 确认预检能清楚提示 `model_path` 是否仍是占位符或不存在。
- [ ] 确认 LLM 缺 API Key、模型名为空、Ollama 未启动时有可执行提示。
- [ ] 若选择 GPT-SoVITS，确认 `tts.gpt_sovits_api_url` 地址和本地端口提示清楚。
- [ ] 如果预检失败，对照 `docs/startup-failure-examples.md` 能找到相近样例和处理动作。
- [ ] 确认预检没有建议开启桌面自动观察、工具调用、文件读取或 shell 执行。

## Launch And Health

- [ ] 运行 `.\start_electron.bat`。
- [ ] Electron 桌宠窗口打开；如果启动失败，批处理窗口保留可读错误。
- [ ] 打开 `http://127.0.0.1:8123/healthz`，确认只返回轻量探活结果。
- [ ] 打开 `http://127.0.0.1:8123/api/health`，确认能看到 `checks` 和 `readiness`。
- [ ] 若 `server.require_api_token=true`，确认不带 token 的 `/api/health` 会被拒绝，带 `X-Taffy-Token` 后可访问。
- [ ] 记录 `readiness.blocking_checks` 和 `readiness.warning_checks`；有阻塞项时不要标记发布通过。
- [ ] 如需解释字段含义，对照 `docs/backend-health.md`。

## Desktop Smoke

- [ ] Live2D 模型显示在桌面窗口中。
- [ ] 模型可被拖动或窗口位置可恢复。
- [ ] 空闲状态下没有持续异常抖动、黑屏或透明背景错误。
- [ ] 发送一条短文本，例如 `你好，做一个简短自我介绍`。
- [ ] 助手返回正常文本，不显示原始 JSON、内部 metadata、异常堆栈或 API Key。
- [ ] 连续发送 2-3 条短文本，确认不会卡死或重复上一条回复。

## Voice And Text Surface

- [ ] 使用 `tts.provider=browser` 做首跑语音基线，确认有声音。
- [ ] 发送一条普通短句，确认文本回复不被 TTS 失败阻塞。
- [ ] 发送长句测试：`请用两三句话鼓励我继续完成今天的任务。`
- [ ] 确认长句 TTS 播放完整，末尾不丢句，不出现长时间静音。
- [ ] 若启用 GPT-SoVITS，确认本地服务已启动，且失败时文本聊天仍可用。
- [ ] 打开字幕，确认字幕展示的是用户可见回复，不包含调试字段。
- [ ] 打开翻译，确认翻译作为辅助文本出现，不替换主回复。
- [ ] 关闭字幕 / 翻译后，确认界面状态符合预期。

## Debug Commands

在聊天输入框里逐个输入，确认每个命令能返回可读报告，并且不泄露密钥：

- [ ] `/doctor`：显示后端健康、LLM、TTS、配置和 Character Runtime 相关摘要。
- [ ] `/ttsdebug`：显示当前 TTS provider、队列 / 播放状态、最近错误。
- [ ] `/translatedebug`：显示翻译 provider / 模型 / 最近状态。
- [ ] `/memorydebug`：显示记忆状态摘要，不包含完整私密对话 dump。
- [ ] `/micdebug`：如果测试语音输入，确认麦克风轨道、峰值和阈值信息可读。

## Common Failure Notes

| Area | What To Check | Expected Handling |
| --- | --- | --- |
| Python | `python --version`, requirements | 明确提示安装 Python 3.10+ 或依赖包。 |
| Node / Electron | `node --version`, `npm install` | 明确提示 Node 18+，推荐 20/22 LTS。 |
| Live2D | `model_path` | 占位符、目录、缺文件都有明确提示。 |
| LLM | `llm.provider`, `llm.base_url`, `llm.model`, API Key env | 缺 key / 模型名 / 本地服务未启动时有行动建议。 |
| GPT-SoVITS | `tts.provider`, `tts.gpt_sovits_api_url` | 高级可选项；服务未启动不应破坏文本聊天。 |
| API health | `/healthz` vs `/api/health` | `/healthz` 轻量公开，`/api/health` 详细且遵守 token 设置。 |
| Safety | observe / tools / shell | 默认保持关闭；任何开启都必须是显式本地配置。 |

## Sign-Off Template

```text
Date:
Tester:
Commit / branch:
Config profile:
LLM provider/model:
TTS provider:
ASR tested: yes/no
GPT-SoVITS tested: yes/no

Automated gate:
First-run preflight:
Launch and health:
Desktop smoke:
Voice and long TTS:
Debug commands:
Safety defaults:

Known issues:
Release decision: go / no-go
```
