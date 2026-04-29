# Task 009：Live2D emotion expression bridge

## 任务背景
Task 008 已完成前端 metadata bridge。本任务在不改聊天文本、TTS、后端行为的前提下，将 metadata 中的 `emotion` 接入前端 Live2D 表情层。

## 本次目标
- 监听 `character-runtime:update` 事件。
- 将 `metadata.emotion` 映射为可用的 Live2D 情绪表达。
- Live2D 不可用时安全跳过，不中断聊天流程。

## 约束与边界
- 不改后端 Character Runtime 行为。
- 不改 LLM prompt。
- 不改 TTS。
- 不处理 `action`。
- 不处理 `voice_style`。
- 不新增依赖。

## 允许修改范围
- `web/chat.js`
- `docs/character-runtime-integration-plan.md`（追加 Task 009 落地补充）
- `tasks/codex/009-live2d-emotion-expression-bridge.md`

## 禁止修改范围
- 后端代码与配置
- TTS 逻辑
- 动作系统接入（action）
- 其他无关文件

## 实现说明
- 新增 helper：
  - `normalizeRuntimeEmotionForLive2D(emotion)`
  - `applyCharacterRuntimeEmotionToLive2D(metadata)`
- emotion 映射：
  - `happy -> happy`
  - `sad -> sad`
  - `angry -> angry`
  - `surprised -> surprised`
  - `annoyed -> angry`
  - `neutral/thinking/unknown -> idle`
- 接入方式：
  - 监听 `character-runtime:update`
  - 仅在 `state.model` 可用且 `state.expressionEnabled` 时，更新 `state.speechAnimMood` 和 `state.moodHoldUntil`，并触发轻量 `triggerExpressionPulse`
- 安全性：
  - metadata 非 object 或异常时直接忽略
  - Live2D 未初始化时无报错
  - 失败仅 `console.debug`，不影响聊天

## 验证方式
- 后端回归测试：
  - `python -m pytest tests/test_character_runtime.py -q`
  - `python -m pytest tests/test_character_runtime_integration.py -q`
- 前端测试命令检查：项目当前无独立前端测试/lint 命令（`npm run` 仅 `start:electron`）。
- 手动验证建议：
  1. 无 `character_runtime` metadata 时聊天/TTS行为不变。
  2. 触发 `character-runtime:update` 且 emotion=`happy` 时，模型出现积极表情趋势。
  3. emotion=`unknown` 时回退为 `idle`，不报错。
  4. Live2D 未初始化时事件不导致前端异常。
  5. `action` 与 `voice_style` 不影响当前行为。

## 风险
- 当前模型表情通过参数层驱动而非统一 expression API；不同模型观感存在差异。
- 如后续引入模型级 expression 资源，可在 adapter 内替换实现，不影响上层事件契约。

## 验收标准
- 仅接 emotion -> Live2D expression bridge。
- 不改聊天文本，不改 TTS，不改后端。
- 非法 metadata/未初始化模型均安全跳过。
- 不新增依赖，回归测试通过。
