# 馨语桌宠

<p align="center">
  <img src="docs/assets/og-cover.png" alt="馨语桌宠预览图" width="760">
</p>

<p align="center">
  <a href="https://github.com/MaQinglin-665/AI-chat/releases/tag/v1.4.0-preview"><img alt="version" src="https://img.shields.io/badge/version-v1.4.0--preview-6f5bd5"></a>
  <img alt="status" src="https://img.shields.io/badge/status-MVP%20preview-f59e0b">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows%2010%2F11-2563eb">
  <img alt="python" src="https://img.shields.io/badge/Python-3.10%2B-3776ab">
  <img alt="node" src="https://img.shields.io/badge/Node.js-18%2B-339933">
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-111827"></a>
</p>

开源 Windows 桌面 AI 伙伴 / 桌面 AI VTuber 实验项目。

它把 `Electron + Python 本地服务 + Live2D + LLM 对话 + TTS/ASR + 情绪动作反馈` 组合到桌面上，探索一个能聊天、能说话、能表达情绪、低打扰陪伴的角色体验。

当前项目仍处于 `MVP / 开源孵化` 阶段，不是成熟商业产品，也不是完整免安装 installer。项目可以提到受 AI VTuber 与 Neuro-sama-like 交互方向启发，但它不是任何项目的克隆或复刻。

- 项目网站：[maqinglin-665.github.io/AI-chat](https://maqinglin-665.github.io/AI-chat/)
- 最新预览版：[v1.4.0-preview](https://github.com/MaQinglin-665/AI-chat/releases/tag/v1.4.0-preview)
- 首次安装指南：[docs/first-install.md](docs/first-install.md)
- 模型选择指南：[docs/model-selection.md](docs/model-selection.md)

## 适合谁

- 想体验 Windows 桌面 AI 伙伴 / Live2D AI VTuber 原型的人。
- 想研究 Electron 桌面 UI、Python 本地服务、LLM、TTS/ASR、Live2D 串联方式的开发者。
- 愿意接受源码预览版限制，并反馈首跑、模型兼容、语音链路、角色体验问题的早期测试者。

## 当前能力

- Live2D 桌宠渲染与 Electron 透明桌面窗口。
- 文本对话，支持 OpenAI-compatible、OpenAI、Ollama 等用户自选模型。
- TTS / ASR 语音交互链路，首跑推荐浏览器 TTS。
- 情绪状态、动作映射、角色运行时 cue。
- 低风险主动反馈与状态中心。
- 默认关闭的桌面截图上下文辅助回复，需要用户显式启用。

## 系统要求

- Windows 10/11
- Python 3.10+
- Node.js 18+
- npm
- 一个可用的 LLM provider / model / API key，或本地 Ollama 模型
- Live2D `.model3.json` 模型文件

## 快速开始

### 1. 下载源码

推荐使用当前 `main` 分支源码：

```powershell
git clone https://github.com/MaQinglin-665/AI-chat.git
cd AI-chat
```

如果无法稳定访问 GitHub，也可以下载 `main` 分支 ZIP：

```text
https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip
```

解压后确认根目录至少包含：

```text
electron/
scripts/
tests/
web/
package.json
requirements.txt
requirements-dev.txt
```

如果缺少 `web/`、`electron/` 或 `tests/`，说明下载的不是完整当前源码，请重新下载。

### 2. 引导式一键入口

第一次体验优先双击：

```text
install_and_start.bat
```

或在 PowerShell 中运行：

```powershell
.\install_and_start.bat
```

它会尽量串起完整首跑路径：

1. 检查 Python / Node.js / npm，必要时提示使用 winget 安装。
2. 创建 `.venv` 并安装 Python 依赖。
3. 安装 Electron / Node 依赖。
4. 初始化 `config.json` 和 `.env`。
5. 应用当前预览体验配置。
6. 引导配置你自己的 LLM provider / model / API key。
7. 运行首句 smoke check。
8. 启动 Electron 桌宠。

注意：这不是静默安装器。你仍需要提供自己的模型和 API key。smoke check 会向你配置的模型发送一次很小的测试请求，用来提前发现模型名、API key、base URL 或网关兼容问题。

### 3. 分步首跑路径

如果你更想逐步排查，使用下面的流程：

```powershell
.\prepare_preview_environment.bat
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1 -SoftFail
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
.\start_electron.bat
```

`prepare_preview_environment.bat` 会准备依赖、初始化本地配置，并应用预览体验配置。

`configure-llm.ps1` 会把 provider / base URL / model 写入 `config.local.json`，把 API key 写入 `.env`，不会把真实 Key 写进 JSON 配置。

`first_chat_smoke.ps1` 会检查后端健康状态，并发送一条轻量聊天请求。想避免真实聊天请求时可加 `-SkipChat` 或 `-SkipLlmProbe`。

### 4. 只安装依赖

如果只想做低层依赖 bootstrap，不应用预览配置：

```powershell
.\install_first_run.bat
```

## 常用命令

开发者本地验证：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1
python scripts\first_run_check.py
node scripts/run_node_tests.js
```

清理本地 ignored 运行产物：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\clean-local-artifacts.ps1
```

默认只预览要清理的内容，需要真正删除时加 `-Apply`。本地配置、依赖目录、dist 和 memory 需要额外显式开关才会纳入清理范围。

## 项目结构

```text
electron/      Electron 桌面窗口与进程管理
web/           前端 UI、Live2D 渲染、聊天与配置页面
scripts/       首跑、诊断、测试、打包脚本
docs/          安装、配置、路线图、GitHub Pages 文档站
tests/         Python / Node / 前端行为测试
app.py         Python 本地服务入口
config.py      配置加载与安全默认值
```

## 配置入口

- 首次安装：[docs/first-install.md](docs/first-install.md)
- 安装与运行：[docs/setup.md](docs/setup.md)
- 模型选择：[docs/model-selection.md](docs/model-selection.md)
- 推荐本地配置：[docs/recommended-local-config.md](docs/recommended-local-config.md)
- Live2D / Character Runtime：[docs/character-runtime-live2d-mapping.md](docs/character-runtime-live2d-mapping.md)
- 语音输入 / 输出排障：[docs/voice-troubleshooting.md](docs/voice-troubleshooting.md)
- 常见问题与排障：[docs/troubleshooting.md](docs/troubleshooting.md)
- 后端健康接口：[docs/backend-health.md](docs/backend-health.md)
- 可视化配置中心：[docs/config.html](docs/config.html)

后端启动后可以访问：

- `http://127.0.0.1:8123/healthz`：轻量公开探活
- `http://127.0.0.1:8123/api/health`：详细自检，包含 LLM / TTS / ASR / Live2D / 安全配置摘要

如果启用了 `server.require_api_token`，访问 `/api/health` 需要带 `X-Taffy-Token`。

## 安全默认值

默认建议保持：

- `observe.attach_mode=manual`
- `tools.enabled=false`
- `tools.allow_shell=false`

首次安装脚本不会默认开启桌面观察、截图、用户文件读取、工具调用或 shell 执行。不要把真实 API Key / Token 提交到仓库。

## 第三方资源

仓库中包含用于预览和本地运行的第三方 runtime、Live2D sample model、demo 媒体和项目素材。项目代码的 MIT License 不会自动覆盖这些资源；重新分发、二次打包或替换素材前，请先看 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 路线图

- `v1.2` First Run & Stability
- `v1.3` Character Runtime
- `v1.4` AI VTuber Feeling
- `v1.5` Desktop Awareness
- `v2.0` Productized Release

详细计划见 [docs/ROADMAP.md](docs/ROADMAP.md)。路线图是当前执行方向，不代表所有能力已经成熟可用。

## 参与贡献

- 贡献指南：[CONTRIBUTING.md](CONTRIBUTING.md)
- 更新日志：[CHANGELOG.md](CHANGELOG.md)
- 安全策略：[SECURITY.md](SECURITY.md)
- License：[LICENSE](LICENSE)

反馈首跑问题时，建议使用 GitHub issue 的 `First-Run Help` 模板，并移除 API key、token、原始 prompt、raw history、私有本地路径和私密截图。
