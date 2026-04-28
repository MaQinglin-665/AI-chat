# Task 008：Frontend Character Runtime metadata bridge

## 任务背景
Task 006 已支持后端 `character_runtime` metadata opt-in 返回，Task 007 已增强 runtime enabled 时的结构化 LLM 输出。本任务在不改变现有前端行为的前提下，建立 metadata 接收桥接层。

## 本次目标
- 前端安全接收 `/api/chat` 与 `/api/chat_stream` done payload 中可选的 `character_runtime`。
- 不改变聊天文本展示，不驱动 Live2D，不改变 TTS。
- 为后续 Task 009 的 emotion -> Live2D 映射预留事件入口。

## 默认兼容策略
- 响应没有 `character_runtime`：行为完全不变。
- `character_runtime` 非法（null/string/number/array）：忽略并保持无副作用。
- metadata bridge 失败不抛错，不影响聊天主链路。

## 允许修改范围
- `web/chat.js`
- `docs/character-runtime-integration-plan.md`（追加 Task 008 落地补充）
- `tasks/codex/008-frontend-runtime-metadata-bridge.md`

## 禁止修改范围
- 后端 Character Runtime 行为
- LLM prompt
- TTS 行为
- Live2D 动作/表情驱动逻辑
- 其他无关文件

## 实现说明
- 新增前端 helper：
  - `normalizeCharacterRuntimeMetadataForFrontend(raw)`
  - `handleCharacterRuntimeMetadata(raw)`
- helper 行为：
  - 仅接受 object，过滤并提取 `emotion/action/intensity/live2d_hint/voice_style`
  - 更新 `window.__AI_CHAT_LAST_CHARACTER_RUNTIME__`
  - 分发 `character-runtime:update` 事件（`CustomEvent.detail` 为规范化 metadata）
- 接入点：
  - `/api/chat` 非流式响应路径
  - `/api/chat_stream` done 事件路径

## 测试与验证
- 后端回归测试：
  - `python -m pytest tests/test_character_runtime.py -q`
  - `python -m pytest tests/test_character_runtime_integration.py -q`
- 前端测试命令检查：项目未提供独立前端测试/lint 命令（`package.json` 仅含 `start:electron`）。
- 手动验证建议：
  1. 响应无 `character_runtime` 时，聊天与语音行为与原来一致。
  2. 响应带 `character_runtime` 时，聊天文本展示不变。
  3. 控制台可读取 `window.__AI_CHAT_LAST_CHARACTER_RUNTIME__` 被更新。
  4. 监听 `character-runtime:update` 可收到事件。
  5. 注入异常 metadata 不导致前端报错。

## 风险
- 若后端字段未来扩展，前端当前桥接仅保守处理已知字段；未知字段不会影响现有行为。

## 验收标准
- 不改后端行为，不改 LLM prompt，不改 TTS，不驱动 Live2D。
- 不改变默认聊天 UI 与兼容性。
- metadata bridge 仅在有合法 metadata 时生效。
- 无新增依赖。
