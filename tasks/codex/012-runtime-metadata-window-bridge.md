# Task 012 - Character Runtime Metadata Cross-Window Bridge

## 任务背景

当前 Electron 架构中，`chatWindow` 与 `modelWindow` 是两个独立 `BrowserWindow`，虽然都加载 `web/index.html`，但 renderer 上下文彼此隔离。

Task 008/009/010 已在前端建立了 metadata 接收和 emotion/action 桥接能力，但早期 `character-runtime:update` 仅是单窗口内的 `window` 事件，无法天然跨窗口传递。

## 本次目标

在不修改后端 Character Runtime、不修改 LLM prompt、不修改 TTS、不修改默认 UI 的前提下，建立最小跨窗口桥：

- chatWindow 收到 `character_runtime` metadata 后可广播给 modelWindow。
- modelWindow 收到后在本地触发既有 `character-runtime:update` 链路。
- 让 Task 009/010 的 emotion/action 逻辑真正触达持有 Live2D model 的 renderer。

## 约束与非目标

- 不改后端 Character Runtime 行为。
- 不改 LLM prompt。
- 不改 TTS。
- 不改正式聊天 UI。
- 不新增依赖。
- 不处理 voice_style（保留字段但不驱动行为）。
- Character Profile 工作顺延到 Task 013。

## 实现说明

实现位置：`web/chat.js`

1. 新增 BroadcastChannel bridge：
- channel 名：`taffy-character-runtime`
- helper：
  - `getCharacterRuntimeBroadcastChannel()`
  - `dispatchCharacterRuntimeMetadataLocally(normalized)`
  - `broadcastCharacterRuntimeMetadataToModel(normalized)`
  - `installCharacterRuntimeWindowBridge()`

2. chatWindow 路径：
- `handleCharacterRuntimeMetadata(raw)` 完成 normalize 后：
  - 继续本地暂存 `window.__AI_CHAT_LAST_CHARACTER_RUNTIME__`
  - 继续本地派发 `character-runtime:update`
  - 新增向 BroadcastChannel 广播 `{ type: "character-runtime:update", metadata }`

3. modelWindow 路径：
- `installCharacterRuntimeWindowBridge()` 仅在 `state.uiView === "model"` 安装监听。
- 收到广播后调用 `handleCharacterRuntimeMetadata(data.metadata, { broadcast: false })`，只做本地派发，不回传，避免循环。

4. 安全性：
- metadata 仍通过 `normalizeCharacterRuntimeMetadataForFrontend`，非法值（null/string/number/array）安全忽略。
- BroadcastChannel 不可用时直接跳过，不影响聊天主流程。

## 手动验证步骤

1. 启动应用，确保 chatWindow 与 modelWindow 都在运行。
2. 在 chatWindow DevTools 执行：
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")`
3. 观察 modelWindow 是否出现 happy 表情反馈（Task 009 链路）。
4. 执行：
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")`
5. 观察 modelWindow 是否触发 motion 或轻量 pulse（Task 010 链路）。
6. 执行：
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({ emotion: "annoyed", action: "shake_head" })`
7. 确认聊天文本显示不变。
8. 确认 TTS 行为不变。
9. 确认控制台无报错。
10. 在不支持 BroadcastChannel 的环境下，聊天仍可正常使用（仅跨窗桥接退化）。

## 测试说明

后端回归：

- `python -m pytest tests/test_character_runtime.py -q`
- `python -m pytest tests/test_character_runtime_integration.py -q`

前端：当前仓库未发现可直接运行的现成前端单测命令，采用手动验证步骤进行确认。

## 风险与注意

- 跨窗口广播属于 best-effort；Bridge 失败不应影响聊天主链路。
- 仅传递安全裁剪后的 metadata 字段，避免无关负载进入 modelWindow。

## 验收标准

- chatWindow metadata 能跨窗到 modelWindow。
- modelWindow 收到后触发既有 `character-runtime:update` 链路。
- 不引入广播循环。
- 不改后端、不改 TTS、不改 LLM prompt、不改默认 UI。
- 不新增依赖。
