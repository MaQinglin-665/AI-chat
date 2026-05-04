# Conversational Mode Design（低打扰流动对话）

## 1. 目标与边界

### 目标
在不牺牲“低打扰、安全默认”的前提下，把当前偏单轮的问答体验，逐步演进为更自然的桌面陪伴式流动对话：
- 更短、更自然的回应节奏
- 可控的追问与续话
- 沉默后轻量接话（非强打断）
- 更自然的语音陪伴感

### 非目标（本阶段）
- 不修改当前后端、TTS、ASR、Live2D 运行行为
- 不引入桌面自动观察/文件读取/工具调用
- 不把产品描述为某现有 AI VTuber 的克隆或复刻

## 2. 当前链路现状（简化）

当前主链路偏“一问一答”：
1. 用户输入文本或语音转文本
2. 发起模型请求并等待完整回复
3. 回复进入 TTS 播放
4. 播放结束后回到空闲

Live2D 主要承担“说话期间的表情/动作反馈”，而不是“对话节奏管理器”。

## 3. 当前体验限制

1. 对话节奏离散  
- 每轮像“请求-响应事务”，缺少自然过渡和轻量续接。

2. 回复长度波动大  
- 容易出现一次性长段输出，语音陪伴时尤其容易“自说自话”。

3. 追问能力弱  
- 缺少针对“开放话题未收口”的轻量 follow-up 机制。

4. 沉默处理粗糙  
- 沉默后通常不说话，或后续若做主动发言风险较高（容易打扰）。

5. 语音打断策略不明确  
- 用户插话时，缺少统一的降级/停止规则设计。

## 4. 目标体验（产品行为描述）

1. 持续对话（Flow）  
- 不是强制多轮，而是允许“短接续”自然发生。

2. 短回应优先  
- 默认优先短句和要点，降低语音负担。

3. 轻追问  
- 仅在开放话题、且满足低打扰条件下，发出简短追问。

4. 低打扰主动发言  
- 低频、有冷却、可关闭、可回退。

5. 语音可打断  
- 用户说话时支持停止或降级当前 TTS，避免抢话。

## 5. 对话状态机设计

状态集合：
- `idle`：无活跃会话动作
- `listening`：等待用户输入/麦克风活动
- `thinking`：模型生成中
- `speaking`：TTS 播放中
- `followup_pending`：具备续话资格，等待触发窗口
- `ambient_ready`：可低打扰主动接话（但尚未触发）
- `cooldown`：主动发言或追问后冷却期

建议的高层转移（示例）：
- `idle -> listening`：用户开始输入/说话
- `listening -> thinking`：收到 `user_message`
- `thinking -> speaking`：收到 `assistant_reply` 且语音开启
- `thinking -> followup_pending`：回复结束但存在开放话题
- `speaking -> followup_pending`：`tts_finished` 且开放话题仍成立
- `followup_pending -> ambient_ready`：达到沉默时长且未超策略限制
- `ambient_ready -> speaking`：触发低打扰主动续话
- `ambient_ready -> cooldown`：放弃主动续话或被用户输入打断
- `cooldown -> idle`：冷却结束

## 6. 事件来源定义

- `user_message`：用户文本或语音转文本输入
- `assistant_reply`：模型回复完成
- `tts_started`：TTS 开始播放
- `tts_finished`：TTS 播放结束
- `silence_tick`：无输入静默时钟事件
- `open_loop_detected`：检测到“话题未闭环/可追问”信号
- `emotion_signal`：情绪侧信号（可来自已有 runtime hint）

说明：`emotion_signal` 只作为“语气/时机参考”，不直接触发高频主动发言。

## 7. 主动发言策略（低打扰优先）

必须约束：
1. 必须低频  
- 任意时间窗口内有上限（例如每 10 分钟最多 N 次）。

2. 必须可关闭  
- `proactive_enabled=false` 时完全禁用。

3. 必须有 cooldown  
- 每次主动发言后进入 `cooldown`，禁止连发。

4. 默认不读取隐私数据  
- 不默认读取桌面、文件、剪贴板、外部工具数据。

5. 优先轻量句式  
- 主动发言应短、软、可忽略，不形成压力。

## 8. 语音模式策略

1. 短回应 / backchannel  
- 支持“嗯嗯/收到/我在”等短回应设计，用于维持陪伴感。
- backchannel 必须受频率门控，避免噪声化。

2. 用户打断策略  
- 当检测到用户说话：
- 若 `interrupt_tts_on_user_speech=true`，停止当前 TTS；
- 否则降级音量或尽快收束句尾。

3. 防止长篇自说自话  
- 限制连续主动输出轮数与总时长。
- 若无用户反馈，快速回到 `idle` 或 `cooldown`。

## 9. Live2D 联动边界（仅设计）

建议联动关系（后续实现阶段再落地）：
- `listening`：偏“在听”的微动作
- `thinking`：偏“思考”的轻动作
- `speaking`：口型+说话态表达
- `followup_pending/ambient_ready`：更克制的待机状态
- `cooldown`：回归平稳 idle

本任务不改现有 expression/action bridge，不改当前参数映射与触发时机。

## 10. 配置建议（提案）

建议增加配置骨架（默认保守）：
- `conversation_mode.enabled`：是否启用对话模式状态机
- `proactive_enabled`：是否允许主动发言
- `max_followups_per_window`：窗口内最大 follow-up 次数
- `silence_followup_min_ms`：沉默触发最小时长
- `interrupt_tts_on_user_speech`：用户说话时是否打断 TTS

建议默认值方向：
- 默认 `conversation_mode.enabled=false`（先灰度）
- 默认 `proactive_enabled=false`（先保证低打扰）

## 11. 分阶段落地路线

### Phase 1：文档与配置骨架
- 输出状态机定义、事件定义、配置字段和默认值。
- 不改变运行行为。

### Phase 2：最小 follow-up / open-loop 续话
- 仅实现保守的 `followup_pending -> ambient_ready` 判定。
- 仅文本层轻量续话，不引入复杂语音打断。

### Phase 3：语音 backchannel 与打断
- 引入短回应策略与用户打断 TTS 规则。
- 增加语音场景回归测试与限频门控。

### Phase 4：更丰富角色状态
- 细化情绪与角色状态到对话节奏的映射。
- 保持“可关闭、可回退、低打扰”三原则。

## 12. 验证方式（后续实现任务参考）

1. 状态机验证  
- 关键事件是否触发正确状态迁移。

2. 低打扰验证  
- 主动发言频率是否满足窗口限制和冷却规则。

3. 可控性验证  
- 开关关闭后是否完全退回单轮问答行为。

4. 语音验证  
- 用户打断时 TTS 是否按配置停止/降级。

5. 安全边界验证  
- 默认配置下不读取桌面/文件/隐私数据，不触发工具调用。

## 13. 风险与注意事项

1. 过度主动风险  
- 若阈值过低，会造成“被打扰感”。

2. 语音冲突风险  
- 打断策略不一致会导致抢话或残留播报。

3. 状态复杂度风险  
- 状态过多但无清晰事件边界，会引入维护负担。

4. 人设漂移风险  
- 追求“流动对话”时，需避免偏离“陪伴、克制、可靠”的核心定位。

## 14. 设计原则（总结）

- 默认保守：先不主动，再可控主动
- 小步迭代：一阶段一目标，一次只加一类能力
- 明确边界：对话节奏层不越权到隐私数据层
- 可回退：任何阶段都能回退到当前稳定单轮模式

## 15. Task 029 Landing Notes

- Task 029 只落地了 `conversation_mode` 配置骨架与读取归一化。
- 当前版本未接入任何新行为触发：
  - 未实现 follow-up
  - 未实现 proactive speech
  - 未实现 silence tick 驱动
  - 未实现 backchannel
  - 未实现用户语音打断 TTS 的实际逻辑
- 默认值保持保守关闭：
  - `conversation_mode.enabled=false`
  - `conversation_mode.proactive_enabled=false`
  - `conversation_mode.max_followups_per_window=1`
  - `conversation_mode.silence_followup_min_ms=180000`
  - `conversation_mode.interrupt_tts_on_user_speech=false`

## 16. Task 030 Landing Notes

- Task 030 只增加了开发期 debug 可见性，用于确认 `conversation_mode` 是否已被前端正确读取。
- 复用了现有 debug/diagnostics 路径，在前端 `snapshot` 输出中新增 `conversationMode` 只读字段：
  - `enabled`
  - `proactiveEnabled`
  - `maxFollowupsPerWindow`
  - `silenceFollowupMinMs`
  - `interruptTtsOnUserSpeech`
- Task 030 未引入任何行为变更：
  - 未实现 follow-up
  - 未实现 proactive speech
  - 未实现 silence tick
  - 未实现 backchannel
  - 未实现 TTS interrupt 运行逻辑

## 17. Task 031 Landing Notes

- Task 031 仅落地了 open-loop follow-up planner skeleton，用于判定并记录“是否存在待续话信号”。
- 判定触发条件保持保守最小：
  - assistant 最后句问号收尾（`?` / `？`）
  - 或命中明确追问提示词（如“你觉得呢”“要不要”“要不要我继续”）
- 记录仅进入前端状态与 debug snapshot（`pending/reason/topicHint/updatedAgeMs`），未接入主动行为。
- 仅当 `conversation_mode.enabled=true` 时才会记录 pending；默认配置（`enabled=false`）下保持非 pending。
- Task 031 未引入：
  - proactive speech
  - silence tick
  - backchannel
  - TTS interrupt 运行逻辑
  - 主动 LLM 请求

## 18. Task 032 Landing Notes

- Task 032 增加了 DevTools-only 手动 debug helper：`window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()`。
- helper 仅做“当前 follow-up 是否具备触发资格”的只读判定，返回 plan 对象（含 `eligible`、`blockedReasons` 等）。
- 判定条件使用保守门控：`conversation enabled`、`proactive enabled`、`followup pending`、`topicHint` 非空、非 speaking/chatBusy、并满足 silence 窗口。
- Task 032 不会触发主动行为：
  - 不发起 LLM 请求
  - 不调用 speak/TTS
  - 不 dispatch event
  - 不启动 timer

## 19. Task 033 Landing Notes

- Task 033 在 `conversationFollowup()` 返回对象中新增 `promptDraft`，用于手动调试“若可续话时的 prompt seed 草稿”。
- `promptDraft` 仅基于本地 planner state 生成，不调用 LLM，不接入 `requestAssistantReply`。
- 仅当 `eligible=true` 时返回非空 draft；否则返回空字符串。
- draft 文本保持克制，明确低打扰续话边界：
  - 只要求一句短回应/轻追问
  - 不读取桌面/文件/隐私数据
  - 不调用工具
  - 不做长篇解释

## 20. Task 034 Landing Notes

- Task 034 增加了 DevTools manual-only 执行入口：`window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()`。
- 该入口仅在 `eligible=true` 且 `promptDraft` 非空时，复用现有 `requestAssistantReply` 发起一次 follow-up；否则返回 `not_eligible`。
- 执行输入明确标记为 debug/manual follow-up，不作为真实用户输入展示或记忆。
- 执行前会消费当前 follow-up pending，避免同一条被重复手动触发。
- Task 034 仍不是自动 proactive：
  - 不基于 silence tick 自动触发
  - 不新增 timer/listener
  - 不新增后端接口
