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

## 21. Task 035 Landing Notes

- Task 035 强化了 manual follow-up execution 的 guard 与失败恢复：
  - 执行前保存 pending 快照
  - 请求失败（返回 false 或抛异常）时恢复 pending
  - 请求成功时保持 pending 已消费
- `runConversationFollowup()` 返回对象新增：
  - `restoredPending`
  - `consumedPending`
  - `endedAt`
  - `elapsedMs`
- 增加调试事件阶段：
  - `conversation_followup_not_eligible`
  - `conversation_followup_start`
  - `conversation_followup_success`
  - `conversation_followup_failed`
  - `conversation_followup_restore_pending`
- 该任务仍保持 manual-only，不引入任何自动触发循环。

## 22. Task 036 Landing Notes

- Task 036 新增了 manual follow-up 手测清单文档，用于后续改动时做固定回归。
- 清单文档：
  - `docs/conversational-followup-smoke-checklist.md`
- 覆盖项包括：
  - 默认禁用验证
  - pending/eligible 构造
  - 成功执行与失败恢复
  - 隐私/安全检查（不自动截图、不工具调用）
  - debug events 与回归记录模板

## 23. Task 037 Landing Notes

- Task 037 增加了 silence eligibility 的只读 debug 可见性，用于观察“是否满足沉默窗口触发条件”。
- 新增时间维度观测：
  - 距离上次用户输入
  - 距离上次 assistant 回复
  - 距离上次 TTS 结束
- 在 `__AI_CHAT_DEBUG_TTS__.snapshot()` 与 `conversationFollowup()` 中新增 `silence` 字段，包含：
  - `eligibleForSilenceFollowup`
  - `blockedReasons`
  - 以及对应 age/min-window 字段
- Task 037 不引入自动触发，不调用 LLM/TTS，不新增 timer/listener。

## 24. Task 038 Landing Notes

- Task 038 新增 DevTools-only 手动入口：
  - `window.__AI_CHAT_DEBUG_TTS__.dryRunSilenceFollowup()`
- dry-run 行为：
  - 当 `silence.eligibleForSilenceFollowup !== true` 时，仅返回 blocked 结果，不执行 follow-up
  - 当 silence eligible 时，复用现有 `runConversationFollowupDebug()` 执行
- 事件可见性：
  - `conversation_silence_followup_blocked`
  - `conversation_silence_followup_manual_start`
- Task 038 仍保持 manual-only，不引入自动 proactive 触发循环。

## 25. Task 039 Landing Notes

- Task 039 仅新增 proactive scheduler 设计护栏文档，不改任何 JS/Python 运行行为。
- 护栏文档：
  - `docs/proactive-scheduler-guard.md`
- 本次先明确自动 proactive 触发前的边界与验收口径：
  - 默认关闭、双开关门控、fail-closed
  - 不读取桌面/文件/隐私数据，不调用工具/不执行 shell
  - 不绕过 `skipDesktopAttach`
  - speaking/chatBusy/用户输入中不触发
  - 基于 pending/topicHint/silence/cooldown/in-flight 的全量 eligibility
  - 成功与失败分流冷却，避免连续循环自说自话
  - debug snapshot/events 可观测，且不记录长 prompt 与隐私内容
- 分阶段建议已落地到文档（Task 040~044），用于后续小步推进自动触发能力。

## 26. Task 040 Landing Notes

- Task 040 落地 proactive scheduler 配置骨架与归一化，不引入任何自动触发行为。
- 新增配置字段（默认保守关闭/保守值）：
  - `proactive_scheduler_enabled=false`
  - `proactive_cooldown_ms=600000`
  - `proactive_warmup_ms=120000`
  - `proactive_window_ms=3600000`
- 布尔字段保持严格门控：仅 JSON `true` 才启用。
- 数值字段在前后端均做保守 clamp：
  - cooldown: `60000`~`3600000`
  - warmup: `30000`~`1800000`
  - window: `600000`~`86400000`
- `snapshot().conversationMode` 已可见以上字段，仅用于调试可见性，不参与自动调度执行。
- 本任务未新增 timer/listener/scheduler/tick，未新增后端 API、UI、自动 proactive 调用链路。

## 27. Task 041 Landing Notes

- Task 041 新增 proactive scheduler 的运行态 state 与只读 debug snapshot，可用于后续 scheduler 开发前的可观测性校准。
- `snapshot().proactiveScheduler` 现可读取：
  - `schedulerEnabled`
  - `conversationEnabled`
  - `proactiveEnabled`
  - `startedAgeMs`
  - `warmupRemainingMs`
  - `cooldownRemainingMs`
  - `windowAgeMs`
  - `proactiveCountInWindow`
  - `maxFollowupsPerWindow`
  - `proactiveInFlight`
  - `lastAttemptAgeMs`
  - `lastTriggeredAgeMs`
  - `lastBlockedReason`
  - `lastResult`
  - `blockedReasons`
  - `eligibleForSchedulerTick`
- `eligibleForSchedulerTick` 仅代表 scheduler gate，不包含 silence follow-up 条件，也不会触发任何执行。
- 本任务未新增 timer/listener/scheduler tick、未新增自动 proactive 触发、未修改 manual follow-up 行为。

## 28. Task 042 Landing Notes

- Task 042 新增 DevTools-only 手动入口：`manualProactiveSchedulerTick()`。
- 该入口按顺序复用既有 guard 路径：
  - scheduler gate（`buildProactiveSchedulerDebugSnapshot`）
  - silence dry-run（`runConversationSilenceFollowupDryRun`）
  - manual follow-up 执行（`runConversationFollowupDebug`）
- 当 scheduler blocked 时，直接返回 `scheduler_not_eligible`，不会执行 dry-run/follow-up。
- 当 scheduler eligible 时，才会进入 silence dry-run；成功后写入 `lastTriggered/cooldown/windowCount`，失败时写入 `lastBlockedReason/lastResult` 并设置短 cooldown。
- Task 042 仍是 manual-only：
  - 不新增自动 proactive 触发
  - 不新增 timer/listener/scheduler tick 循环
  - 不新增后端 API 与 UI

## 29. Task 043 Landing Notes

- Task 043 新增 disabled-by-default proactive scheduler polling skeleton。
- 三层开关（`enabled/proactive_enabled/proactive_scheduler_enabled`）未同时开启时，polling timer 保持 inactive。
- 开启后仅执行 polling check：
  - 记录 poll start/stop
  - 记录 poll blocked/ready
  - 更新 `proactivePollLastResult` 与最近 poll 时间
- 本任务仍不执行 follow-up，不自动说话：
  - polling check 不调用 `dryRunSilenceFollowup`
  - polling check 不调用 `runConversationFollowupDebug`
  - polling check 不调用 `manualProactiveSchedulerTick`

## 30. Task 044 Landing Notes

- Task 044 新增 limited auto trigger smoke：
  - 仅当 polling 判定 `poll_ready` 时，才通过 `runProactiveSchedulerManualTick()` 尝试触发
  - 继续复用既有 scheduler/silence/follow-up guard
- 触发链路仍保持安全边界：
  - 不直接调用 `requestAssistantReply`
  - 遇到 blocked/异常时 fail closed，仅记录 debug events
- 默认行为不变：
  - 默认开关关闭时不会启动 polling，也不会主动发言

## 31. Task 045 Landing Notes

- Task 045 强化 polling lifecycle 的 kill-switch 语义：
  - 运行中关闭任一关键开关会快速停用 polling timer
  - stop/blocked 事件包含可诊断原因，便于回滚排查
- 异常路径采用 fail closed：
  - 只记录 `poll_failed` / stop 事件
  - 不进入失控重试
  - 不绕过 scheduler/manual guard 路径

## 32. Task 046 Landing Notes

- Task 046 定位为“受控联调与验收记录 checkpoint”，不扩展新能力。
- 本阶段产出以文档为主，目标是让 Task 044/045 行为验证可重复执行：
  - 输入：明确配置开关与操作步骤
  - 过程：固定事件观察点
  - 输出：通过/未通过结论 + 残余风险 + 回滚建议
- 验收记录应优先覆盖：
  - 默认关闭回归
  - 三层开关路径
  - 运行时 kill-switch
  - 异常 fail-closed
  - 安全边界复核

## 33. Task 053 Landing Notes

- Task 053 明确了 exception fail-closed 的测试入口先做“安全设计”，不先做功能实现。
- 推荐入口是 DevTools-only / local-only / default-off 的一次性注入 hook，用于验证 polling 异常分支事件顺序。
- 该设计强调：
  - 不改正常对话行为
  - 不暴露远程 API
  - 不持久化危险状态
  - 不新增 direct `requestAssistantReply` 路径
  - 不新增截图/工具调用/读文件路径
- 该设计将用于后续把 exception runtime 证据从 `partial` 推进到 `pass`。

## 34. Task 054 Landing Notes

- Task 054 adds the DevTools-only one-shot fail-closed test hook from Task 053.
- The hook is available only through the existing TTS debug bridge and is inactive unless manually called in DevTools.
- The next scheduler polling check consumes the hook and routes through the existing `poll_exception_fail_closed` catch path.
- The hook does not alter normal conversation mode behavior, config defaults, or proactive scheduler eligibility rules.

## 35. Task 056 Landing Notes

- Task 056 only polishes the follow-up prompt seed used by the existing guarded path.
- The updated wording asks the assistant to behave like a gentle character continuation, not a system notification.
- The expected response remains:
  - one short sentence
  - optional and easy to ignore
  - no pressure for the user to reply immediately
  - no repeated questioning or long explanation
- Safety boundaries are restated in the prompt seed:
  - no desktop/screen observation
  - no file or private data access
  - no tool calls
- No scheduler gates, polling lifecycle, config defaults, APIs, dependencies, or request paths are changed.

## 36. Task 057 Landing Notes

- Task 057 adds a small local policy layer for proactive follow-up prompt seeds.
- The policy layer is deterministic and does not call an LLM:
  - `gentle_continue`: default short continuation
  - `light_question`: one light optional follow-up question at most
  - `soft_checkin`: low-pressure "continue if you want" style
  - `do_not_followup`: fail quiet when the topic looks closed
- `buildConversationFollowupDebugPlan()` now exposes:
  - `followupPolicy`
  - `followupPolicyNote`
- `do_not_followup` adds `policy_do_not_followup` to `blockedReasons`, so the existing manual/scheduler guard path remains the enforcement point.
- This task does not add new triggers, config flags, UI, backend APIs, dependencies, screenshot behavior, tool calls, or file reads.

## 37. Task 058 Landing Notes

- Task 058 adds a DevTools-only policy preview helper:
  - `window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy(input)`
- The helper builds a simulated follow-up plan and returns the selected policy, blocked reasons, and prompt draft.
- It is intended for manual smoke checks of Task 057 policy presets without mutating real runtime state.
- It does not execute follow-up, call `requestAssistantReply`, call LLM/fetch/TTS/tools, capture screenshots, read files, or add timers/listeners/config.
- The production scheduler/manual guard path remains unchanged.

## 38. Task 060 Landing Notes

- Task 060 exposes follow-up policy diagnostics in the existing TTS debug snapshot:
  - `snapshot().followup.policy`
  - `snapshot().followup.policyNote`
  - `snapshot().followup.policyBlockedReason`
- The values reuse the same deterministic policy helper as Task 057/058.
- This is a read-only visibility improvement and does not change follow-up execution, scheduler gates, polling, config defaults, request paths, tools, screenshots, file access, or UI.

## 39. Task 061 Landing Notes

- Task 061 adds compact follow-up policy context to existing debug event payloads.
- Event names and `result` semantics stay unchanged; policy context is attached through the existing `error` field.
- Covered event families:
  - `conversation_followup_*`
  - `conversation_silence_followup_*`
  - `proactive_scheduler_poll_*`
- This improves event timeline review without adding triggers, changing scheduler gates, calling new request paths, or expanding permissions.

## 40. Task 062 Landing Notes

- Task 062 exposes follow-up plan readiness in the existing TTS debug snapshot:
  - `snapshot().followup.eligible`
  - `snapshot().followup.blockedReasons`
- The values reuse the existing `buildConversationFollowupDebugPlan(...)` helper.
- This is a read-only visibility improvement and does not change follow-up execution, scheduler gates, polling, config defaults, request paths, tools, screenshots, file access, or UI.

## 41. Task 063 Landing Notes

- Task 063 applies the existing follow-up policy to silence eligibility.
- Closed-topic hints that produce `do_not_followup` now add `policy_do_not_followup` to `silence.blockedReasons`.
- `conversationFollowup().silence` also exposes:
  - `followupPolicy`
  - `followupPolicyNote`
- This is a conservative tightening: it prevents `poll_ready` from appearing for topics that should fail quiet, without adding triggers or expanding permissions.

## 42. Task 065 Landing Notes

- Task 065 is a checkpoint for the follow-up policy line from Task 056 to Task 064.
- Current closed items:
  - prompt wording polish
  - deterministic policy presets
  - DevTools-only policy preview
  - policy and readiness visibility in snapshots/events
  - `do_not_followup` fail-closed behavior in plan and silence eligibility
  - local smoke records for preview and silence policy blocking
- Recommendation: do not expand proactive behavior yet. Prefer one real Electron/DevTools runtime checkpoint before adding new user-facing controls or broader automation.

## 43. Task 069 Landing Notes

- Task 069 adds a DevTools-only pending follow-up fixture:
  - `window.__AI_CHAT_DEBUG_TTS__.checkConversationFollowupPendingFixture(input)`
- The helper is diagnostic-only. It temporarily sets an in-memory pending follow-up state, reads the existing preview/snapshot/conversation diagnostics, records one debug event, and restores the previous state before returning.
- The default fixture topic is the closed-topic phrase `先这样，晚安`, so the expected policy is `do_not_followup`.
- This closes the gap between pure preview evidence and a real pending-state policy check without adding automatic proactive behavior.
- It does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, file access, scheduler tick, or polling trigger paths.
- It does not persist config, add dependencies, expose a backend API, or change default-off settings.

## 44. Task 071 Landing Notes

- Task 071 is a readiness checkpoint for the follow-up policy and proactive scheduler safety line.
- Current status:
  - closed-topic preview policy is verified
  - closed-topic silence eligibility blocking is verified
  - real renderer pending-state fixture result is `pass`
  - default-off and guard-chain boundaries remain unchanged
- Remaining evidence caveat:
  - recent runtime evidence is screenshot-based; future manual checks should prefer copy/pasted JSON.
- Recommended next functional direction:
  - add a small user-facing settings/readiness surface before expanding proactive behavior
  - keep automatic triggers conservative and opt-in
  - do not add desktop observation, file access, tools, or shell execution to follow-up behavior

## 45. Task 072 Landing Notes

- Task 072 adds a read-only follow-up readiness surface.
- Entry points:
  - advanced action button: `Follow-up`
  - local command: `/followupstatus`
  - DevTools bridge: `window.__AI_CHAT_DEBUG_TTS__.followupReadiness()`
- The panel summarizes existing snapshot data:
  - conversation/proactive/scheduler switches
  - pending follow-up state and policy
  - silence gate readiness
  - scheduler gate readiness
  - blocked reasons and timing ages
- This is visibility only. It does not change config, toggle proactive behavior, trigger follow-up,
  start polling, call LLM/fetch/TTS, capture screenshots, call tools, execute shell commands, or
  read files.

## 46. Task 074 Landing Notes

- Task 074 improves the read-only readiness panel wording.
- The panel now includes:
  - a `Summary` section with a short human-readable state
  - `meaning=` lines that explain common blocked reasons such as `warmup_active`,
    `no_pending_followup`, and `policy_do_not_followup`
- Raw blocked reason keys remain visible for debugging.
- This is a presentation-only change:
  - no config changes
  - no scheduler gate changes
  - no policy changes
  - no follow-up trigger changes
  - no LLM/fetch/TTS, screenshot, tool, shell, or file access

## 47. Task 075 Landing Notes

- Task 075 changes the follow-up readiness panel from English-first to Chinese-first copy.
- The panel now uses Chinese labels and explanations for:
  - title
  - summary
  - switch states
  - follow-up state
  - silence gate
  - scheduler gate
  - safety note
- Raw blocked reason keys are still shown under `原始原因` for debugging.
- This is still presentation-only:
  - no config changes
  - no scheduler gate changes
  - no policy changes
  - no follow-up trigger changes
  - no LLM/fetch/TTS, screenshot, tool, shell, or file access

## 48. Task 077 Landing Notes

- Task 077 localizes the advanced action entry button from `Follow-up` to `续话状态`.
- This aligns the entry point with the Chinese-first panel copy from Task 075.
- This is text-only:
  - no JavaScript behavior changes
  - no config changes
  - no scheduler/policy/trigger changes
  - no LLM/fetch/TTS, screenshot, tool, shell, or file access

## 49. Task 079 Landing Notes

- Task 079 adds a `复制` button to the read-only follow-up readiness panel.
- The button copies the current readiness report text so users can paste diagnostics into issues or
  validation notes without screenshots.
- The panel close button is also localized from `Hide` to `隐藏`.
- Safety boundaries:
  - user-click only
  - writes the current panel report to clipboard
  - does not read clipboard content
  - does not read files or collect desktop data
  - does not change config, scheduler gates, policy, polling, or follow-up triggers
  - does not call requestAssistantReply, LLM/fetch/TTS, screenshots, tools, or shell

## 50. Task 080 Landing Notes

- Task 080 upgrades the read-only readiness panel into a small settings guide v1.
- The panel now explains:
  - current conversation/proactive/scheduler switch states
  - what file to edit: `config.local.json`
  - which keys matter under `conversation_mode`
  - that saving config requires app restart
  - that closing any one of the three switches stops automatic follow-up quickly
  - why safety defaults remain conservative
- This is guidance-only:
  - no config writes
  - no file reads
  - no new settings controls
  - no scheduler/policy/trigger behavior changes
  - no LLM/fetch/TTS, screenshot, tool, shell, or desktop observation

## 51. Task 081 Landing Notes

- Task 081 adds a `复制模板` button to the follow-up readiness panel.
- The button copies a minimal `conversation_mode` JSON snippet for `config.local.json`.
- This reduces manual setup friction while keeping the app from writing local config automatically.
- Safety boundaries:
  - user-click only
  - writes template text to clipboard only
  - does not read clipboard content
  - does not write or read files
  - does not change config at runtime
  - does not change scheduler/policy/trigger behavior
  - does not call requestAssistantReply, LLM/fetch/TTS, screenshots, tools, shell, or desktop observation

## 52. Task 082 Landing Notes

- Task 082 adds a local character cue layer for proactive follow-up prompt drafts.
- The cue maps follow-up policy to a Chinese-first, low-interruption desktop-pet tone, plus optional runtime metadata hints such as emotion/action/intensity/voice_style.
- `conversationFollowup()`, `previewConversationFollowupPolicy()`, `snapshot().followup`, and the read-only readiness report can now expose the current cue for debugging.
- This does not change default-off posture, scheduler gates, cooldown, window limits, polling lifecycle, desktop observation, file access, tool calls, or config writes.

## 53. Task 083 Landing Notes

- Task 083 adds a local-only `characterPreview` line for proactive follow-up tuning.
- The preview is derived from current follow-up policy and topic hint, and appears in `conversationFollowup()`, `previewConversationFollowupPolicy()`, `snapshot().followup`, and the read-only readiness report.
- This is diagnostic/UX visibility only: it does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 54. Task 084 Landing Notes

- Task 084 adds a local-only follow-up character state label to explain what the character is doing in user-friendly Chinese.
- The readiness report now shows a state such as `安静陪伴`, `有点想接话`, `冷却中`, or `等你缓一会儿`.
- DevTools can inspect the same local view through `window.__AI_CHAT_DEBUG_TTS__.followupCharacterState()`.
- This is visibility only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 55. Task 085 Landing Notes

- Task 085 adds a local-only follow-up character status chip to the chat header.
- The chip shows the current character state such as `安静陪伴 · idle` or `有点想接话 · thinking` without opening the readiness panel.
- It refreshes from existing local guard/debug state and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 56. Task 086 Landing Notes

- Task 086 adds subtle visual tones to the local follow-up character status chip.
- The chip now maps state labels to stable `data-tone` values for CSS styling, so states like ready/cooldown/quiet/watching are easier to scan.
- This remains read-only UI and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 57. Task 087 Landing Notes

- Task 087 emits a guarded local character runtime hint when the follow-up character status tone changes.
- Hints reuse the existing runtime metadata bridge and are rate-limited to tone changes with a 30 second minimum interval.
- DevTools can inspect `window.__AI_CHAT_DEBUG_TTS__.followupCharacterRuntimeHint()` and compact `followup_character_runtime_hint` events.
- This remains local/low-frequency and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 58. Task 088 Landing Notes

- Task 088 makes the existing idle motion loop follow the local follow-up character state slightly by passing a safe idle motion context into `enqueueActionIntent("idle")`.
- This reuses existing idle timing and skip guards; it does not add a new timer or execute follow-up.
- State mappings are intentionally subtle: ready/watching/waiting states lean toward thinking-style idle motion, while cooldown/quiet states stay steady.
- This remains local motion selection only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 59. Task 089 Landing Notes

- Task 089 adds a local-only reaction candidate pool for follow-up copy tuning.
- `characterPreview` now comes from the first candidate, and the full candidate list is visible through DevTools and the read-only readiness report.
- This is preview/debug content only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 60. Task 090 Landing Notes

- Task 090 adds a local-only selection layer for follow-up reaction candidates.
- `characterPreview` now comes from the selected candidate, and selection metadata is visible through DevTools, snapshot follow-up state, and the read-only readiness report.
- Selection is deterministic and tuneable by policy/reason/silence age; it does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 61. Task 091 Landing Notes

- Task 091 surfaces the selected local follow-up reaction through the existing character status chip tooltip and accessibility label.
- The compact chip text stays short, while `title`, `aria-label`, `data-selected-tone`, and `data-selected-index` expose the selected reaction for manual tuning.
- This is read-only UI/debug visibility only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 62. Task 092 Landing Notes

- Task 092 adds a DevTools-only pending follow-up rehearsal helper for observing chip, tooltip, selected reaction, and idle-motion behavior without waiting for a natural conversation.
- `rehearseConversationFollowupPending(input)` stores a temporary in-memory pending state, and `clearConversationFollowupRehearsal()` restores the previous pending state.
- The helper fails closed when polling is active or all automatic scheduler switches are enabled, and it does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, or add desktop/file/tool access.

## 63. Task 093 Landing Notes

- Task 093 adds manual rehearsal controls to the existing follow-up readiness panel.
- The panel now has `预演` and `清除预演` buttons that reuse the Task 092 local in-memory rehearsal path, plus a report line showing rehearsal active/allowed/blocked status.
- This is manual UI/debug tooling only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 64. Task 094 Landing Notes

- Task 094 upgrades the follow-up readiness panel rehearsal control into three local scenarios: `好奇追问`, `温柔接话`, and `收口安静`.
- The panel records the active rehearsal scenario in memory and shows the scenario label in the readiness report, making chip/tooltip/reaction tuning faster.
- This remains manual UI/debug tooling only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 65. Task 095 Landing Notes

- Task 095 adds a compact preview card above the follow-up readiness report.
- The card summarizes scenario, character state, policy, selected tone/index, selected local reaction, blocked reasons, and safety posture so rehearsal tuning is faster.
- This remains read-only UI/debug display only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 66. Task 096 Landing Notes

- Task 096 adds `复制短句` and `复制摘要` actions to the follow-up rehearsal preview panel.
- `复制短句` copies the currently selected local reaction candidate, while `复制摘要` copies the compact preview card text for quick comparison and review.
- These actions are user-click-only clipboard writes and do not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 67. Task 097 Landing Notes

- Task 097 adds a `copy bundle` action to the follow-up rehearsal preview panel.
- The action copies one local text bundle that includes both the selected follow-up short sentence and the compact preview summary, so manual review notes are faster to prepare.
- This remains user-click-only clipboard write behavior and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.
## 68. Task 098 Landing Notes

- Task 098 adds a `复制JSON` action to the follow-up rehearsal preview panel.
- The action copies a structured local snapshot (scenario, character state, policy/tone/index, selected short sentence, blocked reasons) for easier issue/PR comparison.
- This remains user-click-only clipboard write behavior and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.
## 69. Task 099 Landing Notes

- Task 099 adds a `复制一行` action to the follow-up rehearsal preview panel.
- The action copies a compact single-line summary (scenario/state/policy/tone/index/blocked/selected sentence) for quick issue comments and commit notes.
- This remains user-click-only clipboard write behavior and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 70. Task 100 Landing Notes

- Task 100 reorganizes the follow-up rehearsal panel actions into two compact groups: `预演` and `复制`.
- The title row now stays focused on the panel title and hide action, while scenario controls and copy/export controls wrap cleanly below it.
- This is UI organization only and does not call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 71. Task 101 Landing Notes

- Task 101 adds a local scenario comparison block to the follow-up rehearsal panel.
- The block shows each rehearsal scenario's policy, preferred tone, selected index, and selected local short sentence without requiring repeated scenario clicks.
- The comparison is computed from existing local policy/reaction helpers and does not write pending state, call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 72. Task 102 Landing Notes

- Task 102 upgrades the rehearsal scenario comparison from a plain text block into a structured table-like view.
- Each scenario row now separates label, policy, tone/index, and selected short sentence, and the active rehearsal scenario is marked inline.
- This remains read-only local UI and does not write pending state, call LLM/fetch/TTS, trigger follow-up, change scheduler behavior, write config, or add desktop/file/tool access.

## 73. Task 103 Landing Notes

- Task 103 closes the follow-up rehearsal/debug milestone and redirects the roadmap toward manual confirmation before any automatic follow-up expansion.
- Tasks 092-102 are now treated as a local rehearsal baseline: they make pending follow-up state, scenario selection, selected reaction copy, and scenario comparison inspectable without executing follow-up.
- The next stage should build a user-facing manual confirmation flow: show the proposed follow-up, explain why it is allowed or blocked, and require an explicit user action before any execution.

## 74. Follow-up Rehearsal Milestone Checkpoint

Completed rehearsal/debug baseline:

- DevTools can create and clear temporary pending follow-up rehearsal state.
- The readiness panel can start/clear rehearsal from UI controls.
- The panel supports multiple local rehearsal scenarios.
- The active preview card shows scenario, character state, policy, tone/index, selected sentence, blocked reasons, and safety posture.
- Copy actions can export selected sentence, preview summary, comparison bundle, JSON, and one-line summary.
- The scenario comparison view shows all rehearsal scenarios without writing pending state.

What remains intentionally out of scope for the rehearsal milestone:

- No automatic follow-up execution.
- No model, fetch, or TTS call from rehearsal or comparison UI.
- No scheduler gate, cooldown, polling, or window-limit changes.
- No desktop observation, screenshot capture, file access, shell execution, tool calls, or config writes.

Next stage: manual confirmation experience.

- Task 104: design the manual confirmation flow and UI states.
- Task 105: add a local confirmation preview card that reuses the selected reaction and guard explanation.
- Task 106: add approve/dismiss controls that remain no-op until wired to guarded execution.
- Task 107: integrate approve with existing guarded manual follow-up execution.
- Task 108: add confirmation lifecycle debug events.
- Task 109: document manual confirmation smoke checks.
- Task 110: prepare a checkpoint before gray automatic follow-up work.

## 75. Task 104 Landing Notes

- Task 104 defines the manual confirmation flow that sits between local rehearsal/debug tooling and any future automatic follow-up behavior.
- The flow requires the app to show a proposed follow-up, explain guard/policy state, and wait for explicit user approval before execution.
- This task is design-only and does not change runtime behavior, execute follow-up, call LLM/fetch/TTS, change scheduler behavior, write config, or add desktop/file/tool access.

## 76. Manual Confirmation Flow Design

Goal:

- Let the desktop pet gently surface that it has a possible follow-up.
- Keep the user in control by requiring explicit approval before any follow-up execution.
- Reuse the existing follow-up policy, selected local reaction, and guard diagnostics before wiring execution.

Entry conditions:

- A pending follow-up exists or a rehearsal/debug state provides a candidate.
- Existing guard and policy snapshots are available.
- The UI can show whether the candidate is currently allowed or blocked.

Confirmation card states:

- `hidden`: no pending follow-up or user dismissed the prompt.
- `available`: a candidate exists and guards are currently passable.
- `blocked`: a candidate exists but policy/guard state says it should not execute.
- `approved_pending`: user clicked approve and guarded execution is about to run.
- `dismissed`: user explicitly ignored the prompt for the current pending item.

Card content:

- Proposed short sentence from the selected local follow-up reaction.
- Topic hint or compact reason for why the pet wants to continue.
- Policy label and selected tone/index.
- Friendly guard explanation: allowed, blocked, cooldown, speaking, busy, closed topic, or disabled.
- Safety note that nothing will be spoken until the user approves.

User actions:

- `approve`: only enabled in the `available` state; later tasks wire this to existing guarded manual execution.
- `dismiss`: hides the confirmation for the current pending item without executing follow-up.
- `review details`: opens or focuses the existing readiness panel for deeper diagnostics.

Execution rules:

- Approval must re-check guards immediately before execution.
- If guards fail during approval, fail closed and switch the card to `blocked`.
- Approval must not bypass scheduler, policy, cooldown, speaking, busy, or closed-topic checks.
- Dismissal must not change scheduler gates, cooldown, window limits, or config.

Safety boundaries:

- Default behavior remains no automatic follow-up.
- No approval means no model request and no speech.
- No desktop observation, screenshot capture, file access, shell execution, tool call, or config write.
- The first implementation tasks should build preview and controls before wiring approve to execution.

## 77. Task 105 Landing Notes

- Task 105 adds the first local manual confirmation preview card to the follow-up readiness panel.
- The card shows the proposed short sentence, topic hint, policy, tone/index, guard explanation, raw blocked reasons, and a safety note.
- This is preview-only: it does not add approve/dismiss controls, execute follow-up, call LLM/fetch/TTS, change scheduler behavior, write config, or add desktop/file/tool access.

## 78. Task 106 Landing Notes

- Task 106 adds UI-only `确认 / 忽略 / 查看详情` controls to the follow-up readiness panel manual confirmation preview card.
- `确认` is a no-op placeholder in this task: available state enables the button, blocked state disables it and keeps execution fail-closed.
- `忽略` only hides the current confirmation preview card in local memory using a dismissed key (`topic/policy/candidate`), without mutating scheduler gates, pending state, or config.
- `查看详情` reuses the existing follow-up readiness panel report area by opening/focusing and refreshing current diagnostics.
- This task does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, does not trigger follow-up, does not change scheduler/cooldown/window behavior, and does not add desktop/file/shell/tool/backend API access.

## 79. Task 107 Landing Notes

- Task 107 wires the manual confirmation `确认` button to existing guarded manual follow-up execution.
- Clicking `确认` now re-checks follow-up, silence, and scheduler guards immediately before execution; if any guard blocks, the action fails closed and only updates local UI/status/debug events.
- When all guards pass, `确认` calls the existing `runConversationFollowupDebug()` path instead of introducing a new execution path.
- `忽略` and `查看详情` remain local UI actions, and this task does not add automatic follow-up, desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or config writes.

## 80. Task 108 Landing Notes

- Task 108 adds compact lifecycle debug events for the manual confirmation experience.
- The readiness panel now records preview visibility transitions, dismiss clicks, detail-review clicks, approval start, guard-blocked attempts, and execution success/failure through the existing TTS debug event stream.
- Preview visibility events are de-duplicated by current confirmation key and status so panel refreshes do not spam debug logs.
- Event payloads stay compact and sanitized: topic/status/policy/guard summary only, with no new model calls, speech, scheduler behavior, config writes, backend APIs, desktop observation, screenshots, file access, shell execution, or tool calls.

## 81. Task 109 Landing Notes

- Task 109 documents an end-to-end manual confirmation smoke runbook before any gray automatic follow-up work.
- The runbook connects empty state, local rehearsal candidate, available confirmation, blocked confirmation, dismiss/reopen behavior, guarded execution, lifecycle events, and safety boundaries into one review path.
- This task is documentation-only and does not change runtime behavior, scheduler gates, cooldowns, pending state, config, backend APIs, desktop observation, screenshots, file access, shell execution, tool calls, model calls, or speech.

## 82. Task 110 Landing Notes

- Task 110 closes the manual confirmation phase with a checkpoint before gray automatic follow-up preparation.
- The checkpoint treats Tasks 104-109 as the required manual-confirmation baseline: preview, controls, guarded execution, lifecycle events, and end-to-end smoke coverage.
- Future gray automatic follow-up work must remain default-off, opt-in, policy-gated, cooldown-gated, scheduler-gated, and observable through existing debug surfaces before any user-facing rollout.
- This task is documentation-only and does not enable automatic follow-up, change runtime behavior, scheduler gates, cooldowns, pending state, config, backend APIs, desktop observation, screenshots, file access, shell execution, tool calls, model calls, or speech.

## 83. Gray Automatic Follow-up Preparation Checkpoint

Manual confirmation baseline now includes:

- A local preview card that explains the proposed follow-up and current guard state.
- Explicit `确认 / 忽略 / 查看详情` actions.
- Guarded approval that re-checks follow-up, silence, and scheduler state immediately before execution.
- Fail-closed behavior when guards change or execution cannot proceed.
- Lifecycle debug events for preview visibility, dismiss, detail review, approval start, blocked attempts, approval, and execution result.
- An end-to-end smoke runbook for empty, available, blocked, dismiss, execution, event, and safety paths.

Required sign-off before gray automatic follow-up tasks:

- The manual confirmation smoke runbook has been exercised at least once on a clean app session.
- Blocked candidates cannot trigger model requests, TTS, scheduler ticks, or pending-state consumption.
- Failed guarded execution restores pending state through the existing follow-up path.
- Debug event payloads remain compact and do not include prompts, secrets, screenshots, files, or unrelated private data.
- Automatic proactive follow-up remains disabled by default and is not presented as mature product behavior.

Allowed next-stage work:

- Add a default-off gray mode flag or UI copy that clearly communicates opt-in status.
- Add read-only status surfaces for gray-mode readiness and why it is blocked.
- Add dry-run scheduler checks that reuse existing guards and do not execute follow-up.
- Add additional manual smoke checks for gray mode before any automatic trigger can speak.

Still out of scope:

- Enabling automatic follow-up by default.
- Bypassing manual confirmation, policy, cooldown, scheduler, busy, speaking, closed-topic, or window-limit guards.
- Adding desktop observation, screenshot capture, file access, shell execution, tool calls, backend APIs, config writes, or new dependencies.
- Making commercial or mature-product claims about proactive companionship behavior.

## 84. Task 111 Landing Notes

- Task 111 adds a default-off `conversation_mode.gray_auto_enabled` flag for gray automatic follow-up preparation.
- The frontend treats this flag as an automatic polling gate only: when it is false, proactive scheduler polling stays stopped with `gray_auto_disabled`, even if the older conversation/proactive/scheduler switches are true.
- Manual confirmation and local debug/manual execution paths are not blocked by this gray-mode flag, so the current explicit user-confirmation experience remains usable.
- The follow-up readiness panel now shows gray-mode opt-in status and polling gate reasons, and the copied config template keeps `gray_auto_enabled=false` by default.
- This task does not enable automatic follow-up by default, does not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, model calls, speech, config writes, or new dependencies.

## 85. Task 112 Landing Notes

- Task 112 adds a read-only gray automatic follow-up readiness summary.
- The new helper `grayAutoFollowupReadiness()` reports whether gray automatic follow-up is `default_off`, `blocked`, or `ready`, and separates polling readiness from candidate readiness.
- The follow-up readiness panel now shows gray readiness status, candidate readiness, polling readiness, and compact blocked reasons.
- This task does not start polling, does not execute follow-up, does not call model/TTS/fetch, does not write config, and does not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or dependencies.

## 86. Task 113 Landing Notes

- Task 113 adds a read-only gray automatic follow-up dry-run summary.
- The new helper `grayAutoFollowupDryRun()` reports whether a hypothetical polling check would remain blocked or would attempt a trigger, while returning compact follow-up, silence, scheduler, and readiness snapshots.
- The follow-up readiness panel now shows the dry-run outcome alongside gray readiness.
- This task does not start polling, does not execute follow-up, does not mutate pending state, does not call `runProactiveSchedulerManualTick()`, model/TTS/fetch, does not write config, and does not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or dependencies.

## 87. Task 114 Landing Notes

- Task 114 records a compact debug event when `grayAutoFollowupDryRun()` is explicitly called from DevTools.
- The event is `conversation_followup_gray_auto_dry_run_checked` and includes only topic hint, dry-run status, `would_poll`, `would_trigger`, and compact blocked reasons.
- The pure dry-run builder remains read-only and the follow-up readiness panel does not emit events on refresh.
- This task does not start polling, does not execute follow-up, does not mutate pending state, does not call `runProactiveSchedulerManualTick()`, model/TTS/fetch, does not write config, and does not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or dependencies.

## 88. Task 115 Landing Notes

- Task 115 closes the gray automatic follow-up preparation slice with a checkpoint before any controlled automatic trial.
- The checkpoint treats Tasks 111-114 as the required dry-run baseline: four-gate default-off opt-in, read-only readiness, read-only dry-run, and explicit dry-run audit event.
- Future controlled automatic trial work must remain local/test-only, opt-in, fail-closed, observable, rate-limited, and reversible before any user-facing rollout.
- This task is documentation-only and does not start polling, execute follow-up, mutate pending state, call model/TTS/fetch, write config, or add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or dependencies.

## 89. Gray Automatic Follow-up Dry-run Checkpoint

Completed gray preparation baseline:

- `conversation_mode.gray_auto_enabled=false` keeps automatic polling default-off even when older proactive switches are true.
- `grayAutoFollowupReadiness()` explains `default_off`, `blocked`, or `ready` without starting polling or executing follow-up.
- `grayAutoFollowupDryRun()` explains whether a hypothetical polling check would remain blocked or would attempt a trigger.
- Explicit dry-run calls record `conversation_followup_gray_auto_dry_run_checked`; passive panel refresh remains quiet.
- The readiness panel surfaces gray status, candidate readiness, polling readiness, dry-run outcome, and compact blocked reasons.

Required sign-off before controlled automatic trial tasks:

- Default config keeps `gray_auto_enabled=false`.
- Four gates are required before automatic polling can start: `enabled`, `proactive_enabled`, `proactive_scheduler_enabled`, and `gray_auto_enabled`.
- Reading readiness or dry-run status does not start polling, call scheduler tick, execute follow-up, request a model reply, play TTS, or mutate pending state.
- Dry-run events stay compact and do not include full prompts, secrets, screenshots, files, or unrelated private data.
- Manual confirmation remains the primary user-facing execution path.

Allowed next-stage work:

- Add a local/test-only controlled trial checklist for automatic polling with all four gates enabled.
- Add extra fail-closed instrumentation around automatic polling attempts.
- Add rollback notes for disabling any one of the four gates.
- Keep any automatic trial clearly labeled as experimental, opt-in, and not mature product behavior.

Still out of scope:

- Enabling automatic follow-up by default.
- Bypassing manual confirmation, policy, cooldown, scheduler, busy, speaking, closed-topic, or window-limit guards.
- Adding desktop observation, screenshot capture, file access, shell execution, tool calls, backend APIs, config writes, or new dependencies.
- Presenting proactive companionship as complete or production-ready.

## 90. Task 116 Landing Notes

- Task 116 adds a second default-off gray automatic follow-up gate: `conversation_mode.gray_auto_trial_enabled=false`.
- Automatic scheduler polling now requires five explicit gates before it can start: `enabled`, `proactive_enabled`, `proactive_scheduler_enabled`, `gray_auto_enabled`, and `gray_auto_trial_enabled`.
- When the trial gate is false, polling stays stopped with `gray_auto_trial_disabled`, even if the earlier four gates are true.
- Readiness, dry-run, scheduler debug snapshots, and the follow-up status panel now surface the trial gate so local testers can see whether the controlled automatic trial is intentionally still blocked.
- Manual confirmation remains the primary user-facing execution path; this task does not call scheduler ticks, execute follow-up, request a model reply, play TTS, write config, or add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or dependencies.

## 91. Controlled Gray Trial Gate

The controlled automatic trial is intentionally behind two gray gates:

- `gray_auto_enabled` means the build is allowed to enter gray automatic follow-up preparation.
- `gray_auto_trial_enabled` means a local tester explicitly opted into the automatic polling trial layer.

Default posture:

- Both gray gates remain `false` in default config and example config.
- Turning off any one of the five gates stops automatic polling.
- Readiness and dry-run helpers remain read-only diagnostic surfaces.
- Manual confirmation remains available separately through its existing guarded path.

This keeps the project moving toward automatic follow-up while preserving the open-source safety line: no default-on proactive speech, no hidden observation, and no automatic desktop/file/tool capabilities.

## 92. Task 117 Landing Notes

- Task 117 adds a read-only controlled trial preflight helper: `grayAutoFollowupTrialPreflight()`.
- The helper summarizes the five automatic polling gates, current gray readiness, dry-run outcome, and compact safety posture without starting polling or executing follow-up.
- The follow-up status panel now includes a one-line preflight result so local testers can quickly see whether the trial is still gated off, blocked by runtime guards, or ready for local observation.
- The helper does not emit debug events; explicit dry-run audit remains limited to `grayAutoFollowupDryRun()`.
- This task does not change config defaults, scheduler execution, pending state, model/TTS/fetch behavior, desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, config writes, or dependencies.

## 93. Controlled Trial Preflight

The preflight status is intentionally diagnostic rather than executable:

- `gated_off`: at least one of the five explicit automatic polling gates is false.
- `runtime_guards_blocked`: all five gates are true, but candidate, silence, cooldown, policy, busy, speaking, or window-limit guards still block a trial attempt.
- `ready_for_local_trial`: all five gates and current runtime guards indicate that a polling check would attempt a trigger.

The output remains compact and local:

- Gate entries show config key, pass/fail state, and the matching blocked reason.
- Readiness and dry-run sections reuse existing read-only builders.
- Safety notes explicitly state that manual confirmation is still primary and that preflight does not require desktop observation, file access, tool calls, config writes, model calls, or TTS.

## 94. Task 118 Landing Notes

- Task 118 adds compact gray trial context to existing `proactive_scheduler_poll_*` debug events.
- Poll start, blocked, ready, trigger success/block, stop, and failed events now include a compact `trial:<status>` summary plus gate and dry-run booleans in the existing event payload fields.
- The summary is built from the read-only preflight path and is meant to make local controlled trials easier to audit after the fact.
- This task does not add new polling events, does not start polling, does not change scheduler gates, does not execute follow-up, and does not call model/TTS/fetch.
- No config default, pending state, cooldown/window limit, desktop observation, screenshot, file access, shell execution, tool call, backend API, config write, dependency, or product maturity claim is changed.

## 95. Gray Trial Poll Event Context

Gray trial poll event context is intentionally compact:

- `trial:gated_off`, `trial:runtime_guards_blocked`, or `trial:ready_for_local_trial`
- `gates:pass` or the pipe-separated disabled gate reasons
- `would_poll:true|false`
- `would_trigger:true|false`

Blocked reasons may be appended to the event `error` field, capped to a short string. This keeps DevTools event history useful during local trials without adding prompts, secrets, screenshots, files, or unrelated private data.

## 96. Task 119 Landing Notes

- Task 119 adds a read-only gray trial poll event summary helper: `grayAutoFollowupTrialEvents(limit)`.
- The helper filters recent `proactive_scheduler_poll_*` debug events, parses compact trial context, and returns counts, last event, trigger-attempt flags, and sanitized recent entries.
- The follow-up status report now includes a one-line trial event summary so local testers can see the latest poll stage and trial status without manually scanning the raw event list.
- This task does not emit events, start polling, call scheduler ticks, execute follow-up, call model/TTS/fetch, mutate pending state, write config, or add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or dependencies.

## 97. Gray Trial Event Summary

The event summary is intended for local trial review:

- `totalPollEvents` counts recent scheduler polling events within the requested limit.
- `counts` groups recent events by stage.
- `last` shows the most recent poll event with parsed `trialStatus`, `gates`, `wouldPoll`, and `wouldTrigger`.
- `hasPollStart`, `hasReady`, and `hasTriggerAttempt` make it easier to spot whether a local trial progressed past gated/blocking states.
- `recent` returns sanitized compact rows and does not include full prompts, secrets, screenshots, files, or unrelated private data.

## 98. Task 120 Landing Notes

- Task 120 adds `conversation_mode.gray_auto_trial_max_triggers_per_session` as an extra controlled-trial safety cap.
- The default is `1`, so even after all five gray automatic gates are enabled locally, the renderer session stops automatic polling after the first successful automatic trigger.
- A value of `0` means the local trial is armed but automatic trigger execution is still blocked by `gray_auto_trial_session_limit_reached`.
- The cap is tracked only in current renderer memory and resets on app/page restart; manual confirmation remains separate and is not blocked by this cap.
- This task does not enable automatic follow-up by default, does not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, model/TTS/fetch paths, config writes, dependencies, or mature-product claims.

## 99. Gray Trial Session Cap

The session cap is a safety rail for the first controlled automatic trials:

- `gray_auto_trial_max_triggers_per_session=1` allows at most one successful automatic polling trigger per renderer session.
- After a successful automatic trigger, the session counter increments and polling is stopped with `gray_auto_trial_session_limit_reached` when the limit is reached.
- Readiness, scheduler snapshots, preflight, poll event context, and the follow-up status report surface the current count and max.
- Turning off any one of the five gates still disables automatic polling immediately.

## 100. Task 121 Landing Notes

- Task 121 adds DevTools helpers for the gray trial session cap:
  - `grayAutoFollowupTrialSession()`
  - `resetGrayAutoFollowupTrialSession()`
- The session helper reports current count, max, remaining triggers, and whether `gray_auto_trial_session_limit_reached` is active.
- The reset helper only resets the in-memory renderer session counter and records one compact `conversation_followup_gray_auto_trial_session_reset` event.
- Reset does not restart polling, enable gates, execute follow-up, call model/TTS/fetch, write config, or mutate pending state.
- Manual confirmation remains separately guarded and is not affected by the automatic trial session cap.

## 101. Gray Trial Session Reset

The reset helper exists to speed up local trial verification without restarting the whole app:

- Use it only after an explicit local test decision.
- It resets the renderer-memory count from the previous value to `0`.
- It returns `pollingRestarted=false` to make clear it does not arm or start automatic polling.
- If testers want polling to run again, the normal five gates and existing scheduler lifecycle still control that separately.

## 102. Task 122 Landing Notes

- Task 122 adds `stopGrayAutoFollowupTrial(reason)` as a DevTools emergency stop helper for local gray automatic trials.
- The helper stops proactive scheduler polling, sets the in-memory trial counter to the configured session max, and records `conversation_followup_gray_auto_trial_emergency_stop`.
- After stop, automatic polling remains blocked by `gray_auto_trial_session_limit_reached` until the tester explicitly resets the session counter.
- The helper does not change config, enable gates, execute follow-up, call model/TTS/fetch, mutate pending state, or restart polling.

## 103. Task 123 Landing Notes

- Task 123 adds `armGrayAutoFollowupTrial({ confirm: "ARM_GRAY_AUTO_TRIAL" })` for explicit DevTools-only local trial arming.
- The helper only changes current renderer memory, opens the five automatic follow-up gates, resets the session counter, syncs existing scheduler polling, and records `conversation_followup_gray_auto_trial_armed`.
- The confirmation phrase is required; calls without it return `confirmation_required` and do nothing.
- Trial arming remains guarded by session cap, emergency stop, cooldown, silence, policy, busy/speaking, window limits, and existing scheduler checks.
- It does not write config, add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, dependencies, or product maturity claims.

## 104. Task 124 Landing Notes

- Task 124 adds `disarmGrayAutoFollowupTrial(reason)` as the counterpart to DevTools arming.
- Disarm closes the in-memory gray automatic gates, stops proactive scheduler polling, and records `conversation_followup_gray_auto_trial_disarmed`.
- The follow-up readiness report now shows a compact armed/polling status so local testers can see whether the trial is currently armed.
- Disarm does not write config, reset session count, execute follow-up, call model/TTS/fetch, mutate pending state, or restart polling.

## 105. Task 125 Landing Notes

- Task 125 adds a controlled gray automatic follow-up trial runbook.
- The runbook is available as `docs/conversational-followup-gray-trial-runbook.md`.
- DevTools also exposes `grayAutoFollowupTrialRunbook()` as a read-only command guide.
- The helper does not arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, write config, or mutate pending state.

## 106. Task 126 Landing Notes

- Task 126 adds a gray automatic trial status card to the follow-up readiness panel.
- The card summarizes preflight status, armed/polling state, session count, dry-run intent, blocked reasons, latest poll event, and the next safe step.
- It is panel observability only and refreshes with existing readiness updates.
- The card does not add action buttons and does not arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, write config, or mutate pending state.

## 107. Task 127 Landing Notes

- Task 127 adds a controlled gray trial operation area to the follow-up readiness panel.
- `Arm 试运行` requires the exact `ARM_GRAY_AUTO_TRIAL` phrase before opening the in-memory gray trial gates.
- `Reset Session` requires the exact `RESET_GRAY_AUTO_TRIAL_SESSION` phrase and does not start polling.
- `Emergency Stop` and `Disarm` are safety收口 actions exposed from the panel.
- The panel actions do not write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 108. Task 128 Landing Notes

- Task 128 adds a compact gray trial audit summary for local testing review.
- DevTools exposes `grayAutoFollowupTrialAuditSummary(limit)` as a read-only helper.
- The readiness panel adds `复制审计` for copying status, session count, dry-run hints, blocked reasons, and recent poll events.
- The audit path does not emit new trial events, arm/disarm/stop/reset, start polling, execute follow-up, call model/TTS/fetch, write config, or mutate pending state.

## 109. Task 129 Landing Notes

- Task 129 adds a gray trial pre-run checklist to the follow-up readiness panel.
- DevTools exposes `grayAutoFollowupTrialPreRunChecklist()` as a read-only helper.
- The checklist summarizes explicit arm state, polling visibility, session cap, emergency stop, disarm, runtime guards, and manual watch requirements.
- It is observability only and does not arm, reset, start polling, execute follow-up, call model/TTS/fetch, write config, emit events, or mutate pending state.

## 110. Task 130 Prep Landing Notes

- Task 130 prep adds a gray trial timeline view before the first real controlled trial.
- DevTools exposes `grayAutoFollowupTrialTimeline(limit)` as a read-only helper.
- The readiness panel shows recent gray trial control, dry-run, and polling events, plus a `复制时间线` button.
- The timeline path does not emit new events, arm/disarm/stop/reset, start polling, execute follow-up, call model/TTS/fetch, write config, or mutate pending state.

## 111. Task 131 Landing Notes

- Task 131 adds a read-only gray trial outcome classifier.
- DevTools exposes `grayAutoFollowupTrialOutcome(limit)`.
- The readiness panel shows `灰度试运行结果判定`, including outcome, severity, trigger status, root causes, and next action.
- Outcome values include `not_started`, `setup_incomplete`, `armed_waiting`, `blocked`, `ready_observed`, `trigger_blocked`, `success`, `stopped`, and `disarmed`.
- The classifier reads existing checklist, preflight, session, and timeline data only; it does not emit events, arm/disarm/stop/reset, start polling, execute follow-up, call model/TTS/fetch, write config, or mutate pending state.

## 112. Task 132 Landing Notes

- Task 132 adds a read-only Go/No-Go decision package for controlled gray automatic follow-up trials.
- DevTools exposes `grayAutoFollowupTrialGoNoGoDecision(limit)`.
- The readiness panel shows `灰度试运行 Go/No-Go`, including decision, reason, missing required items, root causes, guardrails, and next action.
- Decision values include `NO_GO`, `WATCH_ONLY`, `GO_FOR_WATCHED_TRIAL`, and `REVIEW_AFTER_SUCCESS`.
- The decision package does not emit events, arm/disarm/stop/reset, start polling, execute follow-up, call model/TTS/fetch, write config, mutate pending state, or change scheduler behavior.

## 113. Task 133 Landing Notes

- Task 133 adds a copyable gray trial sign-off package.
- DevTools exposes `grayAutoFollowupTrialSignoffPackage(limit)`.
- The readiness panel shows `灰度试运行签收包`, including trial id, decision, outcome, stage recommendation, missing required items, root causes, manual sign-off checklist, and notes placeholders.
- The sign-off package is read-only and does not approve the next phase automatically.
- Clipboard export requires a user click and does not emit events, arm/disarm/stop/reset, start polling, execute follow-up, call model/TTS/fetch, write config, mutate pending state, or change scheduler behavior.
