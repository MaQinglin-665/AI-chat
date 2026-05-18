# Release Readiness

本页是发布前 / 打包前的 go/no-go 清单。它不是成熟商业产品认证，而是为了让当前 MVP / 开源孵化阶段的 Windows 在线引导安装器和源码测试包具备可复现、可排障、默认安全的最低体验门槛。

更细的人工步骤见 `docs/manual-qa.md`；干净首跑记录模板见 `docs/first-run-validation.md`；启动失败样例见 `docs/startup-failure-examples.md`；健康接口字段见 `docs/backend-health.md`。

## Release Positioning Gate

发布说明、README 和包内说明必须保持诚实：

- [ ] 明确这是 Windows 桌面 AI pet / AI VTuber 实验项目，不是成熟商业产品。
- [ ] 可以说明受 AI VTuber / Neuro-sama-like 方向启发，但不描述为直接克隆。
- [ ] 不承诺自动桌面代理、成熟插件生态、无人值守自动操作或商业级稳定性。
- [ ] 明确高风险能力保持 opt-in，不作为默认首跑体验。

## Automated Gate

发布前建议先跑完整本地质量门：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_release_readiness.ps1
```

如果只想先跑较快的代码与体验检查，可以临时跳过打包项：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_release_readiness.ps1 -SkipPackage -SkipInstaller
```

完整脚本会串起下面这些检查；需要逐项排查时也可以单独运行：

```powershell
python scripts\check_encoding.py --public
python scripts\check_encoding.py
python scripts\check_python_syntax.py
python scripts\check_js_syntax.py
python scripts\check_secrets.py
node scripts\run_node_tests.js
python -m pytest -q
python scripts\first_run_check.py
python scripts\check_character_v1_4.py
python scripts\check_demo_readiness.py
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_first_run_package.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_installer_smoke.ps1
git diff --check
```

通过标准：

- [ ] 公开文档编码、全仓库编码、Python 语法、JavaScript 语法、secret 扫描通过。
- [ ] Node 前端测试通过。
- [ ] Python 测试通过。
- [ ] 首跑预检无 blocker；warning 必须能解释为本地环境或显式 demo 配置。
- [ ] Character v1.4 质量门通过。
- [ ] Demo readiness 无 blocker；如果使用 GPT-SoVITS，服务必须可达，否则切回 browser TTS 基线。
- [ ] `scripts\check_first_run_package.ps1` 能打包、解压并验证首跑入口。
- [ ] `scripts\check_installer_smoke.ps1` 能生成 installer exe、source zip、`SHA256SUMS.txt` 和 `RELEASE-ASSETS.md`。
- [ ] `git diff --check` 没有冲突标记或尾随空白错误。
- [ ] 如果有 warning，必须能解释来源，例如 Python 版本弃用提醒或 CRLF 提示。

No-go：

- 自动化测试失败。
- `git diff --check` 发现冲突标记。
- 失败原因不清楚但仍准备发布。

## First-Run Gate

普通用户首跑主路径从 release 安装器开始：

```text
Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.6.exe
SHA256SUMS.txt
```

先校验 SHA256；如果 SmartScreen 提醒未知发布者，只有在来源和 SHA256 都可信时才继续。安装器应复制项目文件、创建快捷方式，并启动 `install_and_start.bat`。

开发者 / 早期测试者可从 `scripts\package-source-test.ps1` 生成的干净源码测试包开始。源码包首跑路径是：

```powershell
.\install_and_start.bat
```

`scripts\doctor.ps1`、`scripts\setup-dev.ps1` 仍可作为开发者路径使用，但不再是早期用户首跑的主入口。

通过标准：

- [ ] 项目目录完整：`electron/`、`web/`、`tests/`、`scripts/`、`package.json` 存在。
- [ ] Python 3.10+ 可用。
- [ ] Node.js 18+ 可用，推荐 20/22 LTS。
- [ ] 安装器默认安装到用户目录，不要求管理员权限。
- [ ] 安装器创建开始菜单和桌面快捷方式。
- [ ] `install_and_start.bat` 能完成依赖安装、创建 `.venv`、初始化 `config.json` / `.env`。
- [ ] 应用内首次配置向导或 `configure-llm.ps1` 能把 provider / base URL / model 写入 `config.local.json`，并把 API Key 写入 `.env`。
- [ ] `/api/first_run/status` 不返回密钥，能显示 LLM 完整性、Live2D 状态和安全默认值摘要。
- [ ] `/api/first_run/configure_llm` 需要本地 API token，并且响应只返回脱敏状态。
- [ ] `first_chat_smoke.ps1` 能通过 preflight、`/healthz`、`/api/health`，并在启用真实请求时拿到 LLM probe 与 `/api/chat` 回复。
- [ ] `model_path` 指向真实 `.model3.json` 文件；如果包内只有一个模型，bootstrap 能自动设置。
- [ ] LLM provider、base URL、model 和 API Key 状态清楚，且 Key 不写入 JSON。
- [ ] 本地 Ollama / GPT-SoVITS 作为可选项时，端口状态提示清楚。
- [ ] 验收结果记录到 `docs/first-run-validation.md` 模板或等价发布记录。

Allowed warning：

- Node.js 版本高于推荐 LTS，但 Electron 实测可启动。
- 已有健康后端占用配置端口。
- 可选 ASR / server TTS 依赖缺失，但本次发布声明首跑基线使用文本聊天 + browser TTS。

No-go：

- `first_run_check.py` 有 `[FAIL]` blocker。
- `first_chat_smoke.ps1` 在真实 LLM 配置下无法完成 probe 或第一条 `/api/chat`。
- Live2D 路径仍是占位符。
- 远程 LLM 缺 API Key 且没有本地替代配置。
- 启动脚本要求用户放宽安全默认值才能继续。

## Desktop Experience Gate

在首跑 smoke 通过后，使用 `.\start_electron.bat` 启动。

通过标准：

- [ ] Electron 窗口打开。
- [ ] Live2D 模型显示，不黑屏，不只显示空透明窗口。
- [ ] 文本聊天可发送并收到回复。
- [ ] 连续 2-3 条文本消息不会重复上一条、卡死或暴露异常堆栈。
- [ ] 助手回复不显示原始 JSON、内部 metadata、API Key、Token 或完整私密配置。
- [ ] `/healthz` 可访问。
- [ ] `/api/health` 可访问或在 token 开启时按预期拒绝无 token 请求。
- [ ] `first_chat_smoke.ps1` 的结果与桌面 UI 实测一致：脚本能聊，UI 也能聊。

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

- [ ] `Xinyu-AI-Desktop-Pet-Setup-v{version}.exe`
- [ ] `Xinyu-AI-Desktop-Pet-v{version}-windows-source-test.zip`
- [ ] `SHA256SUMS.txt`
- [ ] `RELEASE-ASSETS.md`
- [ ] `README-FIRST-RUN.txt`
- [ ] `THIRD_PARTY_NOTICES.md`
- [ ] `docs/installer.md`
- [ ] `docs/setup.md`
- [ ] `docs/backend-health.md`
- [ ] `docs/startup-failure-examples.md`
- [ ] `docs/manual-qa.md`
- [ ] `docs/first-run-validation.md`
- [ ] `docs/troubleshooting.md`
- [ ] `docs/voice-troubleshooting.md`

通过标准：

- [ ] 普通新用户知道优先下载 installer exe，而不是 GitHub 自动源码归档。
- [ ] 新用户知道首发安装器未签名，并能找到 SHA256 校验步骤。
- [ ] 新用户知道在应用内首次配置向导里配置 LLM；源码用户也知道可用 `scripts\configure-llm.ps1`。
- [ ] 新用户知道用 `scripts\first_chat_smoke.ps1` 验证第一句对话。
- [ ] 新用户知道最后用 `.\start_electron.bat` 启动桌宠。
- [ ] 常见失败有可执行修复路径。
- [ ] `/healthz` 与 `/api/health` 的区别写清楚。
- [ ] 第三方 runtime、Live2D sample model、demo 媒体和项目素材的边界写清楚。
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
First-chat smoke:
Desktop experience gate:
Voice gate:
Debug gate:
Safety gate:
Documentation gate:

Allowed warnings:
Known issues:
Decision: go / no-go
```
