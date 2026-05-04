# web/chat.js 前端边界审计（Task 023）

## 1. 审计范围与结论摘要
- 审计对象：`web/chat.js`（当前主文件约 12k+ 行，包含 UI、语音、Live2D、runtime bridge、提醒和学习复盘等多域逻辑）。
- 结论：该文件功能可用，但边界不清晰，已出现“表情调优改动影响语音同步路径”的耦合信号；后续应按低风险阶段化拆分，先抽纯常量和纯 helper，再抽桥接层，最后处理高动态模块。

## 2. 主要责任区划分（按当前源码入口）

### 2.1 UI binding / chat flow
- `bindUI`：UI 事件注册与主交互编排。
- 入口：`function bindUI()` [web/chat.js:12450](/D:/AI/ai_desktop_pet/web/chat.js:12450)
- 特征：
  - 负责大量按钮、面板、输入框、快捷键、子模块触发。
  - 与提醒、persona、学习复盘、语音控制有交叉调用。

### 2.2 TTS / ASR / speech animation
- TTS 初始化：`initTTS` [web/chat.js:9513](/D:/AI/ai_desktop_pet/web/chat.js:9513)
- ASR 初始化：`setupSpeechRecognition` [web/chat.js:11924](/D:/AI/ai_desktop_pet/web/chat.js:11924)
- 语音动画生命周期：
  - `beginSpeechAnimation` [web/chat.js:7384](/D:/AI/ai_desktop_pet/web/chat.js:7384)
  - `endSpeechAnimation` [web/chat.js:7405](/D:/AI/ai_desktop_pet/web/chat.js:7405)
  - `finishSpeechAnimation` [web/chat.js:7420](/D:/AI/ai_desktop_pet/web/chat.js:7420)
  - `getSpeechAnimationMouthOpen` [web/chat.js:8112](/D:/AI/ai_desktop_pet/web/chat.js:8112)
- 特征：
  - 语音口型、mood、持续时间在多个函数中读写。
  - 与 Live2D expression 和 BroadcastChannel 同步强耦合。

### 2.3 Live2D init / expression layer / micro-motion / action queue
- Live2D 运行时与模型初始化：
  - `ensureLive2DRuntime` [web/chat.js:9580](/D:/AI/ai_desktop_pet/web/chat.js:9580)
  - `initLive2D` [web/chat.js:9854](/D:/AI/ai_desktop_pet/web/chat.js:9854)
- 表情与微动作：
  - `updateMicroMotionLayer` [web/chat.js:7599](/D:/AI/ai_desktop_pet/web/chat.js:7599)
  - `applyStyleExpressionLayer` [web/chat.js:8236](/D:/AI/ai_desktop_pet/web/chat.js:8236)
  - `scheduleIdleMotionLoop` [web/chat.js:10777](/D:/AI/ai_desktop_pet/web/chat.js:10777)
- 特征：
  - 同时依赖 `state.model`、`motionEnabled`、`expressionEnabled` 和语音状态。
  - 属于高频帧更新路径，任何状态改动都可能放大回归面。

### 2.4 Character Runtime metadata bridge
- runtime emotion/action 接入：
  - `applyCharacterRuntimeEmotionToLive2D` [web/chat.js:5543](/D:/AI/ai_desktop_pet/web/chat.js:5543)
  - `applyCharacterRuntimeActionToLive2D` [web/chat.js:5572](/D:/AI/ai_desktop_pet/web/chat.js:5572)
- runtime metadata 汇总与分发：
  - `handleCharacterRuntimeMetadata` [web/chat.js:5629](/D:/AI/ai_desktop_pet/web/chat.js:5629)
  - `installCharacterRuntimeWindowBridge` [web/chat.js:5641](/D:/AI/ai_desktop_pet/web/chat.js:5641)
  - `installCharacterRuntimeDebugBridge` [web/chat.js:5663](/D:/AI/ai_desktop_pet/web/chat.js:5663)
  - 事件监听：`character-runtime:update` [web/chat.js:13084](/D:/AI/ai_desktop_pet/web/chat.js:13084)
- 特征：
  - 逻辑上应属于“前端桥接层”，但当前与 expression 状态写入直接耦合。

### 2.5 cross-window BroadcastChannel sync
- `taffy-speech` model 侧接收：
  - `new BroadcastChannel("taffy-speech")` 与 `onmessage` [web/chat.js:13124](/D:/AI/ai_desktop_pet/web/chat.js:13124)
- `taffy-speech` chat 侧发送：
  - `state._speechBroadcast = new BroadcastChannel("taffy-speech")` [web/chat.js:13150](/D:/AI/ai_desktop_pet/web/chat.js:13150)
- 特征：
  - 通过 `mood`、`mouthOpen`、`animUntil`、`moodHoldUntil` 同步说话态。
  - 与 runtime emotion 表情权重窗口存在潜在覆盖竞争。

### 2.6 memory / learning review / reminders
- 学习复盘渲染：`renderLearningReviewList` [web/chat.js:2811](/D:/AI/ai_desktop_pet/web/chat.js:2811)
- 自动聊天上下文分析：`analyzeAutoChatContext` [web/chat.js:4996](/D:/AI/ai_desktop_pet/web/chat.js:4996)
- 提醒检查与循环：
  - `runReminderCheck` [web/chat.js:3460](/D:/AI/ai_desktop_pet/web/chat.js:3460)
  - `startReminderLoop` [web/chat.js:3554](/D:/AI/ai_desktop_pet/web/chat.js:3554)
- 特征：
  - 与 UI 主循环绑定紧密，集中在同一文件导致认知负担高。

## 3. 高耦合共享状态清单（重点）

以下状态同时被多个责任区读写，属于边界风险高发点：

1. `speechAnimMood`
- 定义：`state.speechAnimMood` [web/chat.js:97](/D:/AI/ai_desktop_pet/web/chat.js:97)
- 典型写入：
  - runtime emotion 写入 [web/chat.js:5554](/D:/AI/ai_desktop_pet/web/chat.js:5554)
  - speech animation 写入 [web/chat.js:7402](/D:/AI/ai_desktop_pet/web/chat.js:7402)
  - cross-window 接收写入 [web/chat.js:13130](/D:/AI/ai_desktop_pet/web/chat.js:13130)
- 风险：runtime emotion 与 normal speech mood 共用同一字段，容易串扰。

2. `moodHoldUntil`
- 定义：`state.moodHoldUntil` [web/chat.js:113](/D:/AI/ai_desktop_pet/web/chat.js:113)
- 典型写入：runtime emotion、speech 结束阶段、broadcast 接收。
- 参考：[web/chat.js:5555](/D:/AI/ai_desktop_pet/web/chat.js:5555), [web/chat.js:7417](/D:/AI/ai_desktop_pet/web/chat.js:7417), [web/chat.js:13134](/D:/AI/ai_desktop_pet/web/chat.js:13134)
- 风险：多个来源修改同一 hold 窗口，时序问题难排查。

3. `moodExpression*`
- 定义：
  - `moodExpressionSmoothed` [web/chat.js:111](/D:/AI/ai_desktop_pet/web/chat.js:111)
  - `moodExpressionWeight` [web/chat.js:114](/D:/AI/ai_desktop_pet/web/chat.js:114)
  - `moodExpressionWeightUntil` [web/chat.js:115](/D:/AI/ai_desktop_pet/web/chat.js:115)
  - `moodExpressionWeightMood` [web/chat.js:116](/D:/AI/ai_desktop_pet/web/chat.js:116)
- 主要消费：`getSmoothedMoodExpression`、`applyStyleExpressionLayer`。
- 参考：[web/chat.js:7503](/D:/AI/ai_desktop_pet/web/chat.js:7503), [web/chat.js:8236](/D:/AI/ai_desktop_pet/web/chat.js:8236)
- 风险：权重、平滑、runtime 标记交叉，调参容易外溢。

4. `speechMouthOpen` / `speechAnimUntil`
- 定义：`speechMouthOpen` [web/chat.js:98](/D:/AI/ai_desktop_pet/web/chat.js:98), `speechAnimUntil` [web/chat.js:89](/D:/AI/ai_desktop_pet/web/chat.js:89)
- 典型读写：
  - speech animation 读写口型与时长。
  - expression layer 使用口型目标。
  - cross-window 广播发送/接收同步。
- 参考：[web/chat.js:8112](/D:/AI/ai_desktop_pet/web/chat.js:8112), [web/chat.js:8290](/D:/AI/ai_desktop_pet/web/chat.js:8290), [web/chat.js:13129](/D:/AI/ai_desktop_pet/web/chat.js:13129), [web/chat.js:13160](/D:/AI/ai_desktop_pet/web/chat.js:13160)

5. `state.model` / `expressionEnabled` / `motionEnabled`
- 定义：
  - `model` [web/chat.js:3](/D:/AI/ai_desktop_pet/web/chat.js:3)
  - `motionEnabled` [web/chat.js:167](/D:/AI/ai_desktop_pet/web/chat.js:167)
  - `expressionEnabled` [web/chat.js:187](/D:/AI/ai_desktop_pet/web/chat.js:187)
- 兜底门禁：
  - runtime emotion 早退 [web/chat.js:5547](/D:/AI/ai_desktop_pet/web/chat.js:5547)
  - micro-motion 早退 [web/chat.js:7600](/D:/AI/ai_desktop_pet/web/chat.js:7600)
  - expression layer 早退 [web/chat.js:8237](/D:/AI/ai_desktop_pet/web/chat.js:8237)
- 风险：门禁一致性依赖人工约定，后续拆分时需保持行为等价。

## 4. Task 022 暴露的边界问题

1. expression tuning 容易误触 speech broadcast / micro-motion
- 原因：`speechAnimMood`、`moodHoldUntil`、`speechMouthOpen` 在 expression、speech、broadcast 三条链路共享。
- 现象：一次“表情可见性调优”会自然触及同步策略与帧驱动路径。

2. runtime emotion 与 normal speech mood 共用状态
- 原因：runtime mood 与 normal speech mood 都落在 `speechAnimMood`。
- 影响：runtime 保护窗口内，normal speech mood 同步可能被覆盖或延迟。

3. expression 参数调优缺少独立所有权
- 原因：expression 参数同时受 style、pulse、moodWeight、speech mouth 驱动。
- 影响：单点调参数（如 sad/surprised）常变成多参数叠加效应，回归面超预期。

## 5. 低风险拆分路线（仅路线，不在本任务实施）

### 阶段 1：抽纯常量 / 纯 helper
- 目标：
  - 抽离不依赖 DOM/全局可变状态的常量与纯函数（例如枚举映射、clamp/detect/normalizer 类 helper）。
  - 保持输入输出一致，禁止改变时序和状态写入点。
- 验证方式：
  - 启动后 smoke：chat 可发、TTS 可播、Live2D 可载入。
  - DevTools 无新增错误。
  - `git diff` 仅应表现为“定义位置迁移”，无行为改动。
- 禁止事项：
  - 不改任何状态字段名。
  - 不改默认配置值。
  - 不改触发顺序。

### 阶段 2：抽 Character Runtime frontend bridge
- 目标：
  - 把 runtime metadata 解析、本地 dispatch、跨窗口桥接、debug bridge 收敛到独立模块。
  - 保持事件名和 payload 契约不变。
- 验证方式：
  - `character-runtime:update` 本地触发仍能驱动 emotion/action。
  - `taffy-character-runtime` 跨窗口转发仍可达 model 端。
  - expression disabled/model unavailable 兜底保持一致。
- 禁止事项：
  - 不改 metadata schema。
  - 不改 backend 接口与开关语义。

### 阶段 3：抽 Live2D expression tuning / expression layer
- 目标：
  - 把 `getSmoothedMoodExpression`、`applyStyleExpressionLayer`、mood tuning 常量收敛到 expression 子模块。
  - 明确“谁拥有 expression 参数最终写入权”。
- 验证方式：
  - 对 `happy/sad/angry/surprised/idle` 做手动表情回归。
  - 校验 mouth 与 brow 参数在说话与静默态都无异常跳变。
  - 确认 runtime emotion 与 normal speech mood 的边界逻辑未回退。
- 禁止事项：
  - 不改 Live2D 模型资源。
  - 不改 motion/action 触发策略。

### 阶段 4：再考虑 speech broadcast 与 action/micro-motion
- 目标：
  - 在前三阶段稳定后，再拆分高动态路径：`taffy-speech` 同步、action queue、micro-motion。
  - 将 broadcast 状态机与渲染状态机解耦，减少共享可变状态。
- 验证方式：
  - 双窗口联动回归：chatWindow 与 modelWindow mood/mouth 同步。
  - 连续 TTS 播放下 micro-motion 不抖动、不漂移。
  - 动作桥与普通聊天行为保持一致。
- 禁止事项：
  - 不一次性合并多个高风险拆分。
  - 不在无回归记录的情况下叠加参数调优。

## 6. 每阶段统一验证清单
- 启动链路：Electron + Python 服务可正常启动。
- 功能链路：普通聊天、TTS 播放、ASR 输入、Live2D 展示。
- 桥接链路：runtime metadata、`taffy-speech` 同步、debug bridge 命令。
- 稳定性：DevTools 无新增 error，关键日志无新增异常栈。

## 7. 本文档限制
- 本文档为审计与路线建议，不代表已实施代码拆分。
- 任何拆分阶段都应单独建 task，逐阶段提交与回归，避免“边拆边调参”的复合风险。

## 8. 延伸阅读
- Frontend helper 职责边界与维护规则：`docs/frontend-helper-ownership.md`
