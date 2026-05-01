# v1.2 Release Checklist

> 目标：把当前 MVP 收口成一个可公开体验、可复现验证、默认安全的开源预览版本。
>
> 本清单用于 `v1.2.0-preview` 和后续 `v1.2.0` 发布前检查。它不表示所有项目已经完成。

## Release Positioning

- [x] README 明确说明项目处于 `MVP / 开源孵化` 阶段。
- [x] 发布说明不承诺商业级稳定性、自动桌面代理能力或成熟插件生态。
- [x] 项目描述聚焦 `Live2D + LLM + TTS/ASR + 情绪动作 + 低打扰陪伴`。
- [x] 可以提到受 AI VTuber / Neuro-sama-like 方向启发，但不描述为复刻或克隆。

## Version Consistency

- [x] `package.json` 版本与 README 当前版本一致。
- [x] `CHANGELOG.md` 包含本次版本条目。
- [x] README 的 Current Status & Version 与 `CHANGELOG.md` 对齐。
- [ ] GitHub Release tag 与发布说明版本一致。

## First Run

- [ ] 新用户能按 README 和 `docs/setup.md` 完成依赖安装。
- [x] `requirements.txt` 与 `requirements-dev.txt` 用途区分清楚。
- [ ] `npm install` 后 Electron 启动入口可用。
- [ ] Live2D 模型放置路径和 `model_path` 配置说明清楚。
- [ ] 首跑推荐配置使用 OpenAI-compatible / Ollama 与 browser TTS 的低门槛组合。
- [ ] 缺少 LLM key、模型路径错误、TTS 服务不可用时，有明确提示或排障文档入口。

## Core Experience

- [x] Electron 桌面窗口可启动。
- [x] Live2D 模型可加载、拖动和显示。
- [x] 文本聊天链路可用。
- [x] browser TTS 可作为默认语音体验工作。
- [ ] Server TTS 失败时不会阻断聊天主流程。
- [ ] ASR 相关功能不影响无麦克风用户的基础体验。
- [x] Character Runtime 默认关闭时，聊天返回结构和旧行为保持兼容。

## Character Runtime Demo

- [x] `character_runtime.enabled=false` 是默认配置。
- [x] 本地 demo 可通过 `character_runtime.enabled=true` 和 `return_metadata=true` 手动开启。
- [x] `/api/chat` 和 `/api/chat_stream` 在 opt-in 时可返回 `character_runtime` metadata。
- [x] metadata 不把内部 JSON 泄漏到普通聊天文本中。
- [ ] 前端能接收 metadata 并通过 `BroadcastChannel("taffy-character-runtime")` 转发到模型窗口。
- [ ] emotion/action bridge 失败时安全降级，不影响聊天和 TTS。
- [x] `docs/character-runtime-smoke-test.md` 可用于手动验收。

## Security Defaults

- [x] `observe.attach_mode=manual`。
- [x] `observe.allow_auto_chat=false`。
- [x] `tools.enabled=false`。
- [x] `tools.allow_shell=false`。
- [x] 本地 API 默认绑定 loopback 地址。
- [x] 公开配置不包含真实 API key、token、私有路径或 TTS 参考音频。
- [x] 高风险能力的文档说明保持 opt-in，并提醒用户确认权限。

## Quality Gates

- [x] `python -m pytest` 通过。
- [x] `python scripts/check_python_syntax.py` 通过。
- [x] `python scripts/check_js_syntax.py` 通过。
- [x] `python scripts/check_secrets.py` 通过。
- [ ] 关键手动 smoke test 结果记录在 release notes 或 issue 中。

## Demo Readiness

- [ ] 准备一个基础 demo：启动桌宠、文本对话、browser TTS。
- [ ] 准备一个 Character Runtime demo：手动开启 metadata，展示表情/动作反馈。
- [ ] 录制素材不展示真实 API key、私人桌面内容、敏感日志或失败状态细节。
- [ ] demo 文案不夸大桌面观察、工具调用、长期记忆或插件生态能力。

## Release Notes

- [ ] 写明新增内容、变更内容、安全默认值和已知限制。
- [ ] 写明从上个版本升级是否需要改配置。
- [ ] 写明如何验证安装和如何反馈问题。
- [ ] 对桌面观察、工具调用、shell 执行、文件访问保持明确安全边界。

## Rollback / Recovery

- [ ] 用户可以关闭 Character Runtime 恢复旧行为。
- [ ] 用户可以关闭桌面观察和主动聊天。
- [ ] 配置文件损坏时有默认值兜底或排障路径。
- [ ] TTS 服务不可用时可以回退到 browser TTS 或文本聊天。
- [ ] 发布后发现严重问题时，可以在 GitHub Release 中标注 known issue 或撤回预览版本。

## Go / No-Go

发布前至少满足：

- [x] 版本信息一致。
- [x] 安全默认值未放宽。
- [x] 核心文本聊天 + Live2D + browser TTS 可跑通。
- [x] 自动化质量检查通过。
- [ ] README 与 setup 文档能指导新用户完成首跑。
- [ ] 已知限制写清楚，没有成熟产品式过度承诺。
