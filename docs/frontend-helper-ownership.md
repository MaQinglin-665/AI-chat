# Frontend Helper Ownership（Task 027）

## 目的
这份文档用于约束从 `web/chat.js` 抽离出来的前端 helper，明确职责边界和维护规则，防止后续把状态逻辑、跨模块副作用或无关功能再次塞回 helper。

当前覆盖的 helper：
- `web/character-runtime-bridge.js`
- `web/live2d-expression-tuning.js`
- `web/character-runtime-debug-bridge.js`

## 通用规则（所有 helper 适用）

1. 加载顺序必须明确  
- 必须在 `web/index.html` 中显式 `<script src="...">`。  
- 依赖某 helper 的脚本必须在其后加载（当前均在 `chat.js` 之前）。

2. 全局导出命名  
- helper 统一导出到 `window.Taffy...` 命名空间。  
- 避免散落多个匿名全局变量。

3. 可测试性与静态检查  
- helper 建议同时支持 `module.exports`，便于 `node --check` 与后续独立测试。  
- helper 内尽量保持纯函数、纯数据。

4. 依赖与副作用约束  
- 不引入第三方依赖。  
- 默认不做 DOM 操作、不读写运行时 `state`、不直接发事件、不直接开 `BroadcastChannel`。  
- 如任务确实需要副作用，必须在 task 文档里单独说明并做回归验证。

5. 变更策略  
- helper 只做“小步、可回滚”更新。  
- 避免一次改动同时触发多个职责域（例如 expression + speech broadcast + action queue）。

## 1) character-runtime-bridge.js

### 负责什么
- Character Runtime 前端 metadata 的纯桥接规则与纯 helper：
- allowlist 常量：`METADATA_FIELDS`
- 基础校验：`isPlainObject` / `isNormalizedMetadata`
- 字段过滤：`copyAllowedMetadataFields`
- 规范化入口包装：`normalizeMetadataForFrontend(raw, runtimeApi)`
- 消息构造：`createRuntimeUpdateMessage(metadata)`
- 常量：`BROADCAST_CHANNEL`、`UPDATE_EVENT`

### 不负责什么
- 不负责 `handleCharacterRuntimeMetadata` 的流程编排。
- 不负责 `window.dispatchEvent(...)` 触发。
- 不负责实际 `BroadcastChannel` 生命周期管理。
- 不负责 Live2D emotion/action 执行。

### 可以放什么
- metadata shape 与字段白名单规则。
- 不依赖运行态状态的纯函数。
- 与事件名/频道名相关的只读常量。

### 禁止放什么
- 读写 `state`。
- UI、DOM、日志面板、副作用行为。
- chat/model 窗口生命周期逻辑。

### 维护注意点
- `METADATA_FIELDS` 是 Character Runtime frontend metadata allowlist。  
  后续如果 Runtime metadata 扩字段，必须同步更新该常量，否则新字段会在前端桥接层被过滤掉。

### 对应验证
- `node --check web/character-runtime-bridge.js`
- 静态确认：
- `BROADCAST_CHANNEL` 仍为 `taffy-character-runtime`
- `UPDATE_EVENT` 仍为 `character-runtime:update`
- allowlist 变更后必须补充 smoke（runtime metadata 收发）

## 2) live2d-expression-tuning.js

### 负责什么
- Live2D expression tuning 的纯常量与纯 helper：
- `STYLE_EXPRESSION_PROFILE`
- `RUNTIME_EMOTION_EXPRESSION_TUNING`
- `getStyleExpressionProfile(style)`
- `getRuntimeEmotionExpressionTuning(mood)`

### 不负责什么
- 不负责 expression layer 的状态驱动与参数写入。
- 不负责 model/core 操作。
- 不负责 speech/tts/asr 行为。
- 不负责 action queue、micro-motion、broadcast。

### 可以放什么
- 风格映射表、emotion tuning 数值表。
- 仅输入参数->输出配置的纯函数。

### 禁止放什么
- `state`、`model`、`core` 相关访问。
- `applyStyleExpressionLayer()` 这类 stateful 渲染逻辑。  
  该函数应继续留在 `web/chat.js`，除非单独任务明确拆分并验证。

### 维护注意点
- tuning 数值变更属于视觉行为变更，需单独 task 与回归记录。
- fallback 规则必须稳定：
- `getStyleExpressionProfile` fallback -> `neutral`
- `getRuntimeEmotionExpressionTuning` fallback -> `idle`

### 对应验证
- `node --check web/live2d-expression-tuning.js`
- 静态对照常量值是否与 `chat.js` 预期一致
- 手动 smoke（建议）：
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("sad")`
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("surprised")`

## 3) character-runtime-debug-bridge.js

### 负责什么
- Character Runtime debug bridge 的纯数据/纯 helper：
- debug key 常量：`DEBUG_BRIDGE_KEY`
- debug samples：`DEBUG_SAMPLES`
- metadata 构造 helper：
- `createEmotionMetadata(emotion)`
- `createActionMetadata(action)`

### 不负责什么
- 不负责 `installCharacterRuntimeDebugBridge()` 的生命周期装配。
- 不负责 `handleCharacterRuntimeMetadata(...)` 调用。
- 不负责 `BroadcastChannel`、事件分发、任何桥接副作用。

### 可以放什么
- 仅供 DevTools 调试命令复用的样例数据与轻量构造函数。

### 禁止放什么
- 状态管理逻辑。
- runtime 正式收发链路。
- 任何 side effects（包括自动注册全局桥接对象以外的动作）。

### 维护注意点
- 调试命令对外契约必须稳定：
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("...")`
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("...")`
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({...})`
- 若调整 sample 内容，需在任务记录中写明目的与影响。

### 对应验证
- `node --check web/character-runtime-debug-bridge.js`
- 静态确认 `DEBUG_BRIDGE_KEY` 未变
- 手动 smoke（建议）：
- `testEmotion("happy")`
- `testEmotion("surprised")`
- `testAction("wave")`

## 变更检查清单（提交前）

1. `git status --short` 只包含目标文档或目标 helper 文件。  
2. `node --check` 覆盖被改动的 helper / `chat.js`。  
3. 若涉及 allowlist 或 tuning 常量，补充对应手动 smoke。  
4. 确认未把 stateful glue（例如 `install...` / `handle...` / `apply...`) 错放进 helper。  
