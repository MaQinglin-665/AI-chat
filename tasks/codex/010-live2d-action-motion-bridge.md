# Task 010：Live2D action motion bridge

## 任务背景
Task 008 已建立 metadata bridge，Task 009 已接入 emotion -> Live2D expression。本任务继续在前端接入 action -> Live2D motion/feedback，保持默认链路安全。

## 本次目标
- 复用 `character-runtime:update` 事件。
- 仅处理 `metadata.action`，触发安全动作或轻量反馈。
- 不影响聊天文本、TTS、后端行为、LLM prompt。

## 约束与边界
- 不改后端 Character Runtime 行为。
- 不改 LLM prompt。
- 不改 TTS。
- 不处理 `voice_style`。
- 不新增依赖。

## 允许修改范围
- `web/chat.js`
- `docs/character-runtime-integration-plan.md`（追加 Task 010 落地补充）
- `tasks/codex/010-live2d-action-motion-bridge.md`

## 禁止修改范围
- 后端代码与配置
- TTS 行为
- LLM prompt
- 其他无关文件

## 实现说明
- 新增 helper：
  - `normalizeRuntimeActionForLive2D(action)`
  - `getLive2DMotionForAction(action)`
  - `applyCharacterRuntimeActionToLive2D(metadata)`
- action 映射：
  - `none` -> skip
  - `wave` -> `Tap/FlickUp/Idle`
  - `nod` -> `FlickDown/Idle`
  - `shake_head` -> `Flick@Body/Flick/Idle`
  - `think` -> `FlickDown/Idle`
  - `happy_idle` -> `Idle/Tap`
  - `surprised` -> `FlickUp/Tap/Idle`
  - unknown -> `none`
- 执行策略：
  - 优先尝试 `tryBuiltInMotion(...)`
  - motion 不可用或失败时，降级为 `triggerExpressionPulse(...)`
- 安全策略：
  - action 非字符串/null/unknown 安全跳过
  - `action=none` 不触发动作
  - Live2D 未初始化或 motion 关闭时跳过
  - 异常仅 `console.debug`，不影响聊天主流程

## 测试与验证
- 后端回归测试：
  - `python -m pytest tests/test_character_runtime.py -q`
  - `python -m pytest tests/test_character_runtime_integration.py -q`
- 前端测试命令检查：项目未提供独立前端测试/lint 命令（`npm run` 仅 `start:electron`）。
- 手动验证建议：
  1. 无 metadata 时聊天正常。
  2. `action=none` 时无动作触发。
  3. `action=wave` 时尝试动作或轻量 pulse。
  4. `action=unknown` 时安全跳过。
  5. Live2D 未初始化时不报错。
  6. emotion 表情桥接仍正常。
  7. TTS 与聊天文本显示不变。
  8. `voice_style` 不参与处理。

## 风险
- 不同模型动作组可用性差异较大；当前实现使用保守动作组并提供降级 pulse。
- 后续可在不改事件契约前提下替换更精细 action -> motion 映射。

## 验收标准
- 仅接入 action bridge。
- `none/unknown` 安全跳过。
- motion 失败可降级、不中断聊天。
- 不改后端/TTS/LLM prompt，不处理 voice_style。
- 不新增依赖，回归测试通过。
