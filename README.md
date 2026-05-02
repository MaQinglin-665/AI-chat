# Taffy AI Desktop Pet

开源 Windows 桌面 AI 伙伴 / 桌面 AI VTuber 实验项目。

这个项目受 AI VTuber 与 Neuro-sama 这类项目启发，目标是探索 `Live2D + LLM 对话 + TTS/ASR + 情绪动作 + 低打扰陪伴` 的可用组合。

它目前是持续迭代中的开源可体验版，不是成熟商业产品。

## Project Positioning

- 桌面形态：Electron + Python 本地服务
- 交互核心：Live2D 角色、文本与语音对话、轻量主动陪伴
- 体验目标：低打扰、可长期陪伴、可配置、可扩展

## Current Status & Version

- 当前阶段：`MVP / 开源孵化`
- 当前仓库版本：`1.1.2`（与 `package.json` / `CHANGELOG.md` 对齐）
- 项目网站：[`maqinglin-665.github.io/AI-chat`](https://maqinglin-665.github.io/AI-chat/)
- 最新预览版：[`v1.3.0-preview`](https://github.com/MaQinglin-665/AI-chat/releases/tag/v1.3.0-preview)
- Demo 素材：见 `v1.3.0-preview` Release assets

## Current Capabilities

- Live2D 桌宠渲染与桌面透明窗口联动
- LLM 对话（支持 OpenAI-compatible / Ollama 等）
- TTS / ASR 语音交互链路
- 情绪状态与动作映射
- 可选的桌面截图上下文辅助回复

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

### Early Tester Package

当前 preview 还没有真正的免安装 Windows installer。面向早期测试者的发布包应使用源码测试包：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\package-source-test.ps1
```

生成的 `dist/Taffy-AI-Desktop-Pet-v*-windows-source-test.zip` 仍需要目标电脑安装 Python 和 Node.js。解压后先阅读 `README-FIRST-RUN.txt`。

### Developer / Tester Path

下载源码后，建议先运行环境诊断：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1
```

然后一键安装开发依赖：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
```

本地验证：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1
```

最后放置 Live2D 模型到 `web/models/`，设置 `config.json` 的 `model_path`，再运行首跑预检：

```powershell
python scripts\first_run_check.py
```

预检通过后启动桌面模式：

```powershell
.\start_electron.bat
```

`start_electron.bat` 会在启动前自动运行首跑预检；如果有阻塞项，会停下来显示原因。

也可以双击：`一键启动桌宠.vbs`。如果双击后没有明显反应，请改用 `start_electron.bat` 查看诊断输出。

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
- Character Runtime demo 启用与验证：`docs/character-runtime-demo.md`
- Character Runtime Live2D 映射：`docs/character-runtime-live2d-mapping.md`
- Character Runtime 验证记录模板：`docs/character-runtime-validation-log.md`
- Character Runtime 主动行为安全边界：`docs/character-runtime-proactive-safety.md`
- 常见问题与排障：`docs/troubleshooting.md`
- 语音输入 / 输出排障：`docs/voice-troubleshooting.md`
- 路线图（v1.2 -> v2.0）：`docs/ROADMAP.md`
- v1.2 发布验收清单：`docs/release-v1.2-checklist.md`
- v1.2 当前缺口：`docs/v1.2-current-gaps.md`
- v1.2 preview 发布说明草稿：`docs/release-notes-v1.2.0-preview.md`
- v1.3 Character Runtime 计划：`docs/v1.3-character-runtime-plan.md`
- v1.3 preview 发布说明草稿：`docs/release-notes-v1.3.0-preview.md`
- v1.3 Character Runtime 检查脚本：`python scripts/check_character_runtime_v1_3.py`

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
