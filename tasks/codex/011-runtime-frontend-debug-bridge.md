# Task 011：Character Runtime frontend debug bridge

## 任务背景
Task 008/009/010 已完成 metadata 接收、emotion 表情桥接与 action 动作桥接。本任务补充开发期 debug bridge，方便在浏览器控制台手动验证前端链路。

## 本次目标
- 在前端挂载安全 debug helper。
- 复用既有 `character-runtime:update` 事件链路，不绕过正式处理逻辑。
- 不改后端、不改 TTS、不改默认聊天 UI。

## 约束与边界
- 不改后端 Character Runtime 行为。
- 不改 LLM prompt。
- 不改 TTS。
- 不改默认聊天 UI。
- 不新增依赖。

## 允许修改范围
- `web/chat.js`
- `docs/character-runtime-integration-plan.md`（追加 Task 011 落地补充）
- `tasks/codex/011-runtime-frontend-debug-bridge.md`

## 禁止修改范围
- 后端代码与配置
- TTS 逻辑
- LLM prompt
- 其他无关文件

## 实现说明
- 新增 `installCharacterRuntimeDebugBridge()`，挂载：
  - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__`
- bridge API：
  - `emit(metadata)`
  - `testEmotion(emotion)`
  - `testAction(action)`
  - `samples`
- `emit()` 内部复用 `handleCharacterRuntimeMetadata(...)`，由其继续派发 `character-runtime:update`，从而走 Task 008/009/010 的正式链路。
- `testEmotion()` 仅构造 emotion，不附加 action。
- `testAction()` 仅构造 action，不处理 voice_style。
- `samples` 仅作为静态样例，不自动执行。

## 手动验证步骤
1. 打开 DevTools Console，确认对象存在：
   - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__`
2. 触发表情验证：
   - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")`
3. 触发未知情绪验证：
   - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("unknown")`
4. 触发动作验证：
   - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")`
5. 触发 none 动作验证：
   - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("none")`
6. 触发组合 metadata：
   - `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({ emotion: "annoyed", action: "shake_head" })`
7. 验证 Live2D 未初始化场景：
   - 在无模型或未完成初始化时调用上述方法，前端应安全跳过、不报错。
8. 验证主链路不受影响：
   - 聊天文本显示不变。
   - TTS 行为不变。

## 测试与验证
- 后端回归测试：
  - `python -m pytest tests/test_character_runtime.py -q`
  - `python -m pytest tests/test_character_runtime_integration.py -q`
- 前端测试命令检查：项目未提供独立前端测试/lint 命令（`npm run` 仅 `start:electron`）。

## 风险
- 该 bridge 为开发调试入口，若被误用可能造成误判；因此仅挂在 window 且默认不自动执行。

## 验收标准
- debug helper 可在 Console 手动调用。
- 事件链路复用 `character-runtime:update`。
- 非法输入安全处理。
- 不改后端/TTS/默认 UI，不新增依赖。
