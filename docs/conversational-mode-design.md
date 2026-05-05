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
