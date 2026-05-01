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
- 最新预览版：[`v1.2.0-preview`](https://github.com/MaQinglin-665/AI-chat/releases/tag/v1.2.0-preview)
- Demo 素材：见 `v1.2.0-preview` Release assets

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

## Quick Start

1. 安装依赖：
   - `pip install -r requirements.txt`
   - 开发/测试依赖：`pip install -r requirements-dev.txt`
   - `npm install`
2. 放置 Live2D 模型到 `web/models/` 并设置 `config.json` 的 `model_path`。
3. 配置 LLM 与 TTS（建议首跑使用 OpenAI-compatible + browser TTS）。
4. 启动桌面模式：`一键启动桌宠.vbs` 或 `start_electron.bat`。

## Configuration Guide

README 保留首跑关键入口，详细配置迁移到文档：

- 安装依赖与启动方式：`docs/setup.md`
- 安装与运行、Live2D、LLM、TTS/ASR：`docs/setup.md`
- Character Runtime demo 启用与验证：`docs/character-runtime-demo.md`
- 常见问题与排障：`docs/troubleshooting.md`
- 路线图（v1.2 -> v2.0）：`docs/ROADMAP.md`
- v1.2 发布验收清单：`docs/release-v1.2-checklist.md`
- v1.2 当前缺口：`docs/v1.2-current-gaps.md`
- v1.2 preview 发布说明草稿：`docs/release-notes-v1.2.0-preview.md`

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
