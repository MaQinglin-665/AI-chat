# 馨语桌宠

开源 Windows 桌面 AI 伙伴 / 桌面 AI VTuber 实验项目。

这个项目受 AI VTuber 与 Neuro-sama 这类项目启发，目标是探索 `Live2D + LLM 对话 + TTS/ASR + 情绪动作 + 低打扰陪伴` 的可用组合。

它目前是持续迭代中的开源可体验版，不是成熟商业产品。

## Project Positioning

- 桌面形态：Electron + Python 本地服务
- 交互核心：Live2D 角色、文本与语音对话、轻量主动陪伴
- 体验目标：低打扰、可长期陪伴、可配置、可扩展

## Current Status & Version

- 当前阶段：`MVP / 开源孵化`
- 当前仓库版本：`1.4.0-preview`（与 `package.json` / `CHANGELOG.md` 对齐）
- 项目网站：[`maqinglin-665.github.io/AI-chat`](https://maqinglin-665.github.io/AI-chat/)
- 最新预览版：[`v1.4.0-preview`](https://github.com/MaQinglin-665/AI-chat/releases/tag/v1.4.0-preview)
- Demo 素材：见 `v1.4.0-preview` Release assets

## Current Capabilities

- Live2D 桌宠渲染与桌面透明窗口联动
- LLM 对话（支持 OpenAI-compatible / Ollama 等）
- TTS / ASR 语音交互链路
- 情绪状态与动作映射
- 默认关闭的可选桌面截图上下文辅助回复（需用户显式启用）

## System Requirements

- Windows 10/11
- Python 3.10+
- Node.js 18+
- Live2D 模型文件（`.model3.json`）

## Download Source For Testing

如果你是开发者或早期测试者，请优先下载 `main` 分支源码，而不是旧 Release 的源码包：

```powershell
git clone https://github.com/MaQinglin-665/AI-chat.git
cd AI-chat
```

如果当前网络无法稳定访问 GitHub，也可以在 GitHub 首页点击 `Code` -> `Download ZIP`，或直接下载：

```text
https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip
```

解压后请先确认源码完整。项目根目录至少应包含：

```text
electron/
scripts/
tests/
web/
package.json
requirements.txt
requirements-dev.txt
```

如果缺少 `tests/`、`web/` 或 `electron/`，说明下载或解压的不是完整的当前源码，请重新下载 `main` 分支 ZIP 或换网络后重新 `git clone`。

## Quick Start

### Fastest 馨语 Preview Path

如果你只是想体验当前 `v1.4.0-preview` 的馨语桌宠 AI VTuber feeling，请走这条最短路径：

```powershell
.\prepare_preview_environment.bat
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
.\start_electron.bat
```

这仍然是源码预览包，不是免安装 installer。你需要本机安装 Python 和 Node.js，并配置一个稳定的 LLM。

如果你下载的是 Release source-test zip，解压后可以先看 `START_HERE.txt`。它只保留体验者需要的最短步骤和安全提醒。

`prepare_preview_environment.bat` 会尽量一键完成环境准备：检查/安装 Python 与 Node.js、创建 `.venv`、安装 Python / Electron 依赖、初始化 `config.json` / `.env`，并应用馨语 preview 体验配置。

`apply-preview-experience-config.ps1` 会把本地体验切到馨语 / Xinyu 英文角色、Character Runtime、动作/语音 cue 和低风险主动插话配置；它不会写入 API Key，也不会开启桌面观察、截图、文件读取、工具调用或 shell。

模型质量和延迟会直接影响角色感。如果 `model_acceptance_probe` 成功率低于 80%，或日常单轮经常超过 15 秒，请先换更快更稳定的模型，再评价馨语的 AI VTuber 体验。

### Recommended First Run

当前 preview 还没有真正的免安装 Windows installer。早期测试者可以先用一键环境准备入口：

```powershell
.\prepare_preview_environment.bat
```

如果需要分步排障，再走这一条主路径：

```powershell
.\install_first_run.bat
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\apply-preview-experience-config.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
.\start_electron.bat
```

`install_first_run.bat` 会创建本地 `.venv`、安装 Python / Node 依赖、初始化 `config.json` / `.env`，并运行首跑预检。结束时会给出 `READY` 或 `ACTION`：

- `READY`：可以继续配置 LLM、跑首句 smoke，然后启动桌宠。
- `ACTION`：依赖设置已经尽力完成，但还需要按输出修复 Live2D 模型、LLM Key / 模型名、Node / Python 环境等阻塞项。

`configure-llm.ps1` 会把 provider / base URL / model 写入 `config.local.json`，把 API Key 写入 `.env`，不会把真实 Key 写进 JSON 配置。

模型由用户自行选择；项目不内置云端模型或 API Key。选择标准见 `docs/model-selection.md`：优先选择诊断通过、成功率 >= 80%、常态单轮 < 15 秒、英文输出稳定的模型。

`apply-preview-experience-config.ps1` 会合并 `config.preview.example.json`，保留你已经配置好的 LLM provider / base URL / model / api_key_env，只应用馨语 preview 的角色、TTS、动作和安全主动插话设置。

`first_chat_smoke.ps1` 会检测或启动后端，检查 `/healthz` / `/api/health`，再进行轻量 LLM probe 和一条短 `/api/chat` 请求。想避免真实聊天请求时可加 `-SkipChat` 或 `-SkipLlmProbe`。

如果 `first_chat_smoke.ps1` 卡在 `/api/llm_probe` 或返回 HTTP 500，先运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1
```

它只输出脱敏摘要，用来判断是本地后端、API token、base URL、模型名、API key、网关兼容性还是模型超时问题。

`start_electron.bat` 会在启动前再次运行首跑预检；如果有阻塞项，会停下来显示原因。也可以双击 `一键启动桌宠.vbs`，但如果双击后没有明显反应，请改用 `start_electron.bat` 查看诊断输出。

### Source Test Package

维护者准备早期测试包时使用：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\package-source-test.ps1
```

生成的 `dist/Taffy-AI-Desktop-Pet-v*-windows-source-test.zip` 仍需要目标电脑安装 Python 和 Node.js。解压后建议先阅读 `START_HERE.txt`；需要更细排障时再看 `README-FIRST-RUN.txt`。

发布前可用临时目录模拟源码测试包首跑入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_first_run_package.ps1
```

### Developer Commands

开发者需要更细的环境诊断或完整本地测试时再使用：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1
python scripts\first_run_check.py
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\clean-local-artifacts.ps1
```

`clean-local-artifacts.ps1` 默认只预览会清理的 ignored 运行产物；需要真正删除时加 `-Apply`。本地配置、依赖目录、dist 和 memory 需要额外显式开关才会纳入清理范围。

后端启动后可用健康接口辅助排障：

- `http://127.0.0.1:8123/healthz`：轻量公开探活
- `http://127.0.0.1:8123/api/health`：详细自检，包含 LLM / TTS / ASR / Live2D / 安全配置摘要；如果启用了 `server.require_api_token`，需要带 `X-Taffy-Token`

### Manual Commands

如果不使用脚本，也可以手动执行：

```powershell
pip install -r requirements.txt
pip install -r requirements-dev.txt
npm install
python -m pytest -q
node tests/test_drag_logic.js
```

## Configuration Guide

README 保留首跑关键入口，详细配置迁移到文档：

- 安装依赖与启动方式：`docs/setup.md`
- 安装与运行、Live2D、LLM、TTS/ASR：`docs/setup.md`
- 模型选择与验收标准：`docs/model-selection.md`
- 外部测试反馈清单：`docs/external-tester-checklist.md`
- 后端健康接口契约：`docs/backend-health.md`
- 启动失败样例库：`docs/startup-failure-examples.md`
- 发布前 go/no-go 门槛：`docs/release-readiness.md`
- 第三方组件与资源说明：`THIRD_PARTY_NOTICES.md`
- Character Runtime demo 启用与验证：`docs/character-runtime-demo.md`
- AI VTuber 长期体验目标：`docs/ai-vtuber-experience-target.md`
- v1.4 AI VTuber Feeling 规格与 demo 场景：`docs/v1.4-ai-vtuber-feeling.md`
- 发布前 / 打包前人工验收清单：`docs/manual-qa.md`
- 推荐本地体验模板：`docs/recommended-local-config.md`
- Character Runtime Live2D 映射：`docs/character-runtime-live2d-mapping.md`
- Character Runtime 验证记录模板：`docs/character-runtime-validation-log.md`
- Character Runtime 主动行为安全边界：`docs/character-runtime-proactive-safety.md`
- 常见问题与排障：`docs/troubleshooting.md`
- 语音输入 / 输出排障：`docs/voice-troubleshooting.md`
- 语音与 Character Runtime 回归清单：`docs/voice-runtime-regression-checklist.md`
- 路线图（v1.2 -> v2.0）：`docs/ROADMAP.md`
- v1.2 发布验收清单：`docs/release-v1.2-checklist.md`
- v1.2 当前缺口：`docs/v1.2-current-gaps.md`
- v1.2 preview 发布说明草稿：`docs/release-notes-v1.2.0-preview.md`
- v1.3 Character Runtime 计划：`docs/v1.3-character-runtime-plan.md`
- v1.3 preview 发布说明草稿：`docs/release-notes-v1.3.0-preview.md`
- v1.3 Character Runtime 检查脚本：`python scripts/check_character_runtime_v1_3.py`
- v1.4 AI VTuber Feeling 检查脚本：`python scripts/check_character_v1_4.py`
- 项目宣传素材与发布文案：`docs/promotion-kit.md`

## LLM / TTS / ASR / Live2D (Where to Configure)

- LLM：见 `docs/setup.md` 的 “Configure LLM”
- TTS / ASR：见 `docs/setup.md` 的 “Configure TTS / ASR”
- Live2D：见 `docs/setup.md` 的 “Place Live2D Model”
- 可视化配置中心：`docs/config.html`

## Security Defaults

默认建议保持：

- `observe.attach_mode=manual`
- `tools.enabled=false`
- `tools.allow_shell=false`

不要把真实 API Key / Token 提交到仓库。

## Third-Party Assets

仓库中包含用于预览和本地运行的第三方 runtime、Live2D sample model、demo 媒体和项目素材。项目代码的 MIT License 不会自动覆盖这些资源；重新分发、二次打包或替换素材前，请先看 `THIRD_PARTY_NOTICES.md`。

## Roadmap Summary

- `v1.2` First Run & Stability
- `v1.3` Character Runtime
- `v1.4` AI VTuber Feeling
- `v1.5` Desktop Awareness
- `v2.0` Productized Release

## Contributing, Changelog, License

- Contributing：`CONTRIBUTING.md`
- Changelog：`CHANGELOG.md`
- Security：`SECURITY.md`
- License：`LICENSE`
