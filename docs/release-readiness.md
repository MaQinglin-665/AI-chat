# Release Readiness

本页是发布前 / 打包前的 go/no-go 清单。它不是成熟商业产品认证，而是为了让当前 MVP / 开源孵化阶段的源码测试包具备可复现、可排障、默认安全的最低体验门槛。

更细的人工步骤见 `docs/manual-qa.md`；启动失败样例见 `docs/startup-failure-examples.md`；健康接口字段见 `docs/backend-health.md`。

## Release Positioning Gate

发布说明、README 和包内说明必须保持诚实：

- [ ] 明确这是 Windows 桌面 AI pet / AI VTuber 实验项目，不是成熟商业产品。
- [ ] 可以说明受 AI VTuber / Neuro-sama-like 方向启发，但不描述为直接克隆。
- [ ] 不承诺自动桌面代理、成熟插件生态、无人值守自动操作或商业级稳定性。
- [ ] 明确高风险能力保持 opt-in，不作为默认首跑体验。

## Automated Gate

发布前至少跑：

```powershell
python -m py_compile app_health.py scripts\first_run_check.py
C:\Users\MQL\AppData\Local\Programs\Python\Python312\python.exe -m pytest -q -p no:cacheprovider tests/test_api_health.py tests/test_first_run_check.py
git diff --check
```

通过标准：

- [ ] Python 编译检查无错误。
- [ ] `tests/test_api_health.py` 通过。
- [ ] `tests/test_first_run_check.py` 通过。
- [ ] `git diff --check` 没有冲突标记或尾随空白错误。
- [ ] 如果有 warning，必须能解释来源，例如 Python 版本弃用提醒或 CRLF 提示。

No-go：

- 自动化测试失败。
- `git diff --check` 发现冲突标记。
- 失败原因不清楚但仍准备发布。

## First-Run Gate

从干净源码包或清楚记录过本地差异的工作区开始：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
python scripts\first_run_check.py
```

通过标准：

- [ ] 项目目录完整：`electron/`、`web/`、`tests/`、`scripts/`、`package.json` 存在。
- [ ] Python 3.10+ 可用。
- [ ] Node.js 18+ 可用，推荐 20/22 LTS。
- [ ] 依赖安装路径清楚；缺依赖时提示能指导用户修复。
- [ ] `config.json` / `config.local.json` 能加载。
- [ ] `model_path` 指向真实 `.model3.json` 文件。
- [ ] LLM provider、base URL、model 和 API Key 状态清楚。
- [ ] 本地 Ollama / GPT-SoVITS 作为可选项时，端口状态提示清楚。

Allowed warning：

- Node.js 版本高于推荐 LTS，但 Electron 实测可启动。
- 已有健康后端占用配置端口。
- 可选 ASR / server TTS 依赖缺失，但本次发布声明首跑基线使用文本聊天 + browser TTS。

No-go：

- `first_run_check.py` 有 `[FAIL]` blocker。
- Live2D 路径仍是占位符。
- 远程 LLM 缺 API Key 且没有本地替代配置。
- 启动脚本要求用户放宽安全默认值才能继续。

## Desktop Experience Gate

使用 `.\start_electron.bat` 启动。

通过标准：

- [ ] Electron 窗口打开。
- [ ] Live2D 模型显示，不黑屏，不只显示空透明窗口。
- [ ] 文本聊天可发送并收到回复。
- [ ] 连续 2-3 条文本消息不会重复上一条、卡死或暴露异常堆栈。
- [ ] 助手回复不显示原始 JSON、内部 metadata、API Key、Token 或完整私密配置。
- [ ] `/healthz` 可访问。
- [ ] `/api/health` 可访问或在 token 开启时按预期拒绝无 token 请求。

No-go：

- Electron 无法打开且没有可读诊断。
- Live2D 模型完全不可见。
- 文本聊天主流程不可用。
- 错误提示泄露密钥或私人路径中的敏感内容。

## Voice Gate

首跑发布基线优先验证 browser TTS；GPT-SoVITS 是高级可选项。

通过标准：

- [ ] `tts.provider=browser` 时有可听语音，或文档明确说明当前环境未测。
- [ ] TTS 失败不阻塞文本聊天。
- [ ] 长句 TTS 能播完最后一句，不明显丢尾。
- [ ] 字幕显示用户可见回复，不显示内部 metadata。
- [ ] 翻译开启时作为辅助文本出现，不替换主回复。
- [ ] 如果启用 GPT-SoVITS，服务未启动时能给出可理解提示，并可回退到 browser TTS 或纯文本体验。

Allowed warning：

- 当前机器没有麦克风，ASR 未测，但文本 + TTS 基线通过。
- GPT-SoVITS 未测，只作为高级可选项在文档中说明。

No-go：

- 语音失败导致文本聊天不可用。
- TTS 朗读内部 JSON、metadata、token 或异常堆栈。
- 默认配置要求用户先启动 GPT-SoVITS 才能完成基础体验。

## Debug And Diagnostics Gate

聊天输入框中的诊断命令应可帮助新手定位问题：

- [ ] `/doctor`
- [ ] `/ttsdebug`
- [ ] `/translatedebug`
- [ ] `/memorydebug`
- [ ] `/micdebug`（有麦克风时）

通过标准：

- [ ] 输出可读。
- [ ] 不泄露 API Key、Token、Authorization header 或完整 `.env`。
- [ ] 能指向 `docs/backend-health.md`、`docs/startup-failure-examples.md` 或相关排障文档。

No-go：

- 诊断命令直接显示密钥。
- 诊断命令让用户开启 shell、工具调用或自动桌面观察作为默认修复路径。

## Safety Gate

发布前必须确认默认安全边界没有被放宽：

- [ ] `observe.attach_mode=manual`
- [ ] `observe.allow_auto_chat=false`
- [ ] `observe.auto_chat_enabled=false`
- [ ] `tools.enabled=false`
- [ ] `tools.allow_shell=false`
- [ ] 不自动读取用户文件。
- [ ] 不自动执行 shell 命令。
- [ ] 不自动截图或观察桌面。
- [ ] 高风险能力必须是显式本地 opt-in，并且文档说明风险。

No-go：

- 默认启用桌面观察、文件读取、工具调用或 shell 执行。
- 文档鼓励用户为了首跑绕过安全边界。
- 发布包包含真实 API Key、Token、私人日志、私有音频或私人截图。

## Documentation Gate

发布包或 README 至少能把用户导向这些入口：

- [ ] `README-FIRST-RUN.txt`
- [ ] `docs/setup.md`
- [ ] `docs/backend-health.md`
- [ ] `docs/startup-failure-examples.md`
- [ ] `docs/manual-qa.md`
- [ ] `docs/troubleshooting.md`
- [ ] `docs/voice-troubleshooting.md`

通过标准：

- [ ] 新用户知道先跑 `python scripts\first_run_check.py`。
- [ ] 新用户知道用 `.\start_electron.bat` 启动。
- [ ] 常见失败有可执行修复路径。
- [ ] `/healthz` 与 `/api/health` 的区别写清楚。
- [ ] 文档没有把项目描述成已经成熟的商业产品。

## Go / No-Go Summary

可以发布预览包：

- 自动化 gate 通过。
- 首跑 gate 无 blocker。
- Electron + Live2D + 文本聊天主流程通过。
- browser TTS 或明确记录的语音基线通过。
- 安全默认值保持关闭。
- 已知问题写进 release notes 或包内说明。

必须 no-go：

- 文本聊天主流程不可用。
- 启动脚本无可读错误。
- 默认安全边界被放宽。
- 任何输出或文档泄露真实密钥、token 或私人数据。
- 无法解释的自动化测试失败。

## Sign-Off

```text
Date:
Tester:
Commit / branch:
Package/source:
Config profile:

Automated gate:
First-run gate:
Desktop experience gate:
Voice gate:
Debug gate:
Safety gate:
Documentation gate:

Allowed warnings:
Known issues:
Decision: go / no-go
```
