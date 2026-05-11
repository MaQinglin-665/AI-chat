# Promotion Kit

这份文档用于准备 GitHub Release、README 展示、B 站/小红书/即刻/X 短帖、知乎/V2EX 技术介绍和 demo 视频说明。项目仍处于 `MVP / 开源孵化` 阶段，宣传时请保持诚实：这是一个可体验的 Windows 桌面 AI 伙伴实验，不是成熟商业产品，也不是完整自动直播系统。

## Core Positioning

一句话：

> 馨语桌宠是一个开源 Windows 桌面 AI 伙伴实验，把 Live2D、LLM 对话、TTS/ASR、情绪动作反馈和低打扰陪伴组合到桌面上。

更短版本：

> 一只会聊天、会说话、会用表情动作回应你的开源 AI 桌宠。

面向开发者：

> 一个 `Electron + Python` 的桌面 AI VTuber / AI 桌宠原型，用来探索本地服务、Live2D 渲染、语音交互、角色运行时和安全默认值之间的工程组合。

## Official Links

- Project site: `https://maqinglin-665.github.io/AI-chat/`
- GitHub repo: `https://github.com/MaQinglin-665/AI-chat`
- Latest preview: `https://github.com/MaQinglin-665/AI-chat/releases/tag/v1.4.0-preview`
- Demo assets: `docs/assets/demo-idle.mp4`, `docs/assets/demo-voice.mp4`, `docs/assets/demo-config.mp4`
- Recording plan: `docs/release-demo-capture-plan.md`

## Ready-To-Post Copy

### Short Chinese Post

我在做一个开源 Windows AI 桌宠 / 桌面 AI VTuber 实验：Live2D 角色可以在桌面上聊天、说话、根据情绪做动作，并接入本地 Python 服务和用户自选 LLM。现在是 v1.4.0-preview，仍是 MVP，欢迎早期体验和提 issue。

项目主页：`https://maqinglin-665.github.io/AI-chat/`

### Longer Chinese Post

最近在推进一个开源桌面 AI 伙伴项目：馨语桌宠。

它不是传统聊天窗口，而是尝试让一个 Live2D 角色住在 Windows 桌面上：可以文本/语音聊天，调用 TTS/ASR，带一点记忆、情绪状态和动作反馈。当前 v1.4.0-preview 的重点是提升 “AI VTuber feeling”：让回复、语气、动作和低打扰主动反馈更像一个角色，而不是普通客服机器人。

技术栈大概是 Electron 桌面 UI + Python 本地服务 + Live2D + OpenAI-compatible/Ollama 等用户自选模型。安全默认值会保守处理：不会默认观察桌面，不默认读文件，不默认执行 shell，不默认开启工具调用；涉及桌面上下文的能力都需要显式启用。

目前还是 MVP / 开源孵化阶段，没有免安装 installer，需要本机 Python、Node.js 和可用 LLM 配置。欢迎对 AI 桌宠、桌面 AI VTuber、低打扰陪伴、Live2D 交互感兴趣的人试试，也欢迎贡献文档、测试、模型配置和角色体验反馈。

项目主页：`https://maqinglin-665.github.io/AI-chat/`
GitHub：`https://github.com/MaQinglin-665/AI-chat`

### Video Caption

馨语桌宠 v1.4.0-preview demo：一个开源 Windows AI 桌宠实验。Live2D 角色在桌面上聊天、说话，并用情绪和动作反馈回应你。当前仍是 MVP，需要用户自选 LLM，不默认开启桌面观察或高风险工具能力。

### Bilibili Title Ideas

- 我做了一个开源 AI 桌宠：能聊天、说话、做表情动作
- 把 Live2D、LLM 和 TTS 接到 Windows 桌面上，会像 AI VTuber 一样回应你吗？
- 馨语桌宠 v1.4 预览：桌面 AI 伙伴实验

### English Short Post

Xinyu Desktop Pet is an open-source Windows desktop AI companion experiment. It combines Electron, a local Python service, Live2D, LLM chat, TTS/ASR, and emotion/motion feedback to explore a low-interruption desktop character experience. Current status: MVP / preview, not a polished commercial product.

## What To Show In A Demo

Recommended 30-60 second clip order:

1. Start the Electron app and show the Live2D character appearing on the desktop.
2. Send one natural chat message and show the reply.
3. Let TTS play once, with readable subtitles or chat text.
4. Show one visible emotion/action response if stable.
5. Briefly show the configuration/diagnostics path only if no secrets are visible.

For longer videos:

1. Welcome scene.
2. Short casual chat.
3. Comfort/encouragement scene.
4. Reminder or low-interruption follow-up demo.
5. TTS fallback or diagnostics note for developers.

## Messaging Boundaries

Use these phrases:

- `MVP / 开源孵化`
- `v1.4.0-preview`
- `源码预览包`
- `AI 桌宠 / 桌面 AI 伙伴实验`
- `受 AI VTuber 方向启发`
- `桌面上下文能力默认关闭，需用户显式启用`

Avoid these claims:

- `成熟商业产品`
- `完整自动直播 AI VTuber`
- `Neuro-sama 克隆`
- `免安装正式版`
- `默认观察桌面`
- `自动读取用户文件`
- `自动执行 shell`
- `工具调用默认开启`

## Public Safety Checklist

Before posting screenshots or videos:

- Hide API keys, tokens, private endpoints and local file paths.
- Do not show `config.local.json`, `.env`, raw logs, stack traces or red DevTools errors.
- Do not include private desktop content in frames.
- Run `python scripts/check_demo_readiness.py` before recording v1.4 public demo material.
- Prefer clips that show stable chat, Live2D display, one TTS playback and one visible reaction.
- Keep desktop observation, file access, shell execution and tool calling out of the primary promo unless the clip clearly says they are optional and require confirmation/configuration.

## Suggested Posting Order

1. GitHub README/Release: use the project positioning, current status and quick start.
2. B 站: publish a 30-60 second visual demo first, then a longer technical walkthrough.
3. V2EX/知乎: explain the architecture, safety defaults, current limitations and what feedback is needed.
4. 小红书/即刻/X: use short clips with a direct caption and project link.
5. Follow-up post: summarize early tester feedback and roadmap items from `docs/ROADMAP.md`.

## Useful Tags

`AI桌宠` `Live2D` `AI VTuber` `开源项目` `Electron` `Python` `LLM` `TTS` `ASR` `桌面伙伴`
