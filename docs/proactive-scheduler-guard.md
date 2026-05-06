# Proactive Scheduler Guard（设计护栏草案）

本文档用于约束“自动 proactive 开口”在落地前后的安全边界与回滚边界。
当前仓库处于 MVP / 开源孵化阶段，本设计以“默认关闭、低打扰、可回滚、可观测”为优先原则。

## 1. 默认原则（A）

1. 默认关闭：自动 proactive scheduler 必须默认禁用（fail closed）。
2. 双开关门控：仅在 `conversation_mode.enabled=true` 且 `proactive_enabled=true` 时才允许触发。
3. 数据边界：不读取桌面、文件或任何隐私数据。
4. 能力边界：不调用工具、不执行 shell。
5. 不绕过现有 `skipDesktopAttach`。
6. 运行态边界：在 TTS speaking、`chatBusy`、用户输入进行中时不得触发。
7. 反自激边界：不允许连续循环“自说自话”。

## 2. 触发前置条件（B）

自动触发前，以下条件必须同时满足：

1. `followupPending=true`。
2. 存在非空 `topicHint`。
3. silence eligibility 为 `true`。
4. 距离“最近一次用户输入”与“最近一次 TTS 完成”都达到 silence window。
5. 当前非 speaking、非 `chatBusy`。
6. 当前不存在进行中的 follow-up execution（`proactiveInFlight!==true`）。
7. 当前时间已超过冷却截止（满足 cooldown）。

任一条件不满足即阻塞，并记录可读 `blockedReason`。

## 3. 冷却与频率限制建议（C）

1. `proactiveCooldownMs` 默认建议不少于 10 分钟（`>=600000` ms）。
2. 每个窗口内触发次数受 `max_followups_per_window` 限制。
3. 单次成功后应消费 pending（清理 `followupPending`）或进入明确 cooldown，避免重复触发同一 pending。
4. 单次失败后可恢复 pending，但必须进入短 cooldown，避免失败重试循环。
5. 用户一旦有新输入，应重置或延后 proactive 计时。
6. 应用启动后需要 warmup 窗口，warmup 期间不主动说话。

## 4. 状态字段建议（D）

建议在 conversation follow-up/proactive debug state 中新增或保留以下字段：

1. `proactiveLastTriggeredAt`
2. `proactiveLastAttemptAt`
3. `proactiveCooldownUntil`
4. `proactiveWindowStartedAt`
5. `proactiveCountInWindow`
6. `proactiveInFlight`
7. `proactiveLastBlockedReason`
8. `proactiveLastResult`

字段要求：
- 时间字段统一毫秒时间戳（epoch ms）。
- `proactiveLastResult` 应为短枚举（如 `success`/`failed`/`blocked`），避免写入长文本。

## 5. Scheduler 形态建议（E）

1. 第一版仅使用低频 polling 或已有 heartbeat，不引入复杂 scheduler。
2. 不依赖隐藏的 `while(true)` 循环。
3. 每次 tick 只做 eligibility 检查，最多触发一次 follow-up。
4. 触发路径必须复用现有 dry-run/manual execution guard，不复制 `requestAssistantReply` 逻辑。
5. 所有 tick 判定与触发结果都写入 debug events（含 blocked/start/success/failed/cooldown）。

## 6. 配置建议（F）

建议配置字段：

1. `proactive_scheduler_enabled`（如新增，默认 `false`）
2. `proactive_cooldown_ms`
3. `proactive_warmup_ms`
4. `proactive_window_ms`
5. `max_followups_per_window`（复用现有字段）

约束建议：

1. 保守 clamp（示例建议）：
   - `proactive_cooldown_ms`：`600000`~`7200000`
   - `proactive_warmup_ms`：`60000`~`1800000`
   - `proactive_window_ms`：`600000`~`86400000`
   - `max_followups_per_window`：`1`~`3`
2. 布尔配置必须仅 JSON `true` 才启用（字符串 `"true"`、数字 `1` 不视为启用）。

## 7. Debug / Observability（G）

1. debug snapshot 应暴露 scheduler 当前状态（含 cooldown/window/in-flight/lastResult）。
2. debug events 至少包含：
   - `blocked`
   - `start`
   - `success`
   - `failed`
   - `cooldown`
3. `blockedReasons` 必须可读且可归类（如 `cooldown_active`、`silence_not_reached`、`chat_busy`）。
4. 不记录完整长 prompt，不记录隐私内容，不记录潜在敏感上下文原文。

## 8. 回滚策略（H）

1. 关闭 `proactive_enabled` 即完全禁用自动 proactive。
2. 若新增 `proactive_scheduler_enabled`，可与 `proactive_enabled` 分层禁用。
3. 任意异常路径应 fail closed（不触发自动回复）。
4. 不影响现有手动入口：
   - `runConversationFollowup`
   - `dryRunSilenceFollowup`

## 9. 验证计划（I）

最低验证清单：

1. 默认配置下无自动触发。
2. `enabled=false` 时不触发。
3. `proactive_enabled=false` 时不触发。
4. silence 不达标时不触发。
5. speaking/`chatBusy` 时不触发。
6. cooldown 窗口内不触发。
7. 成功后不重复触发同一 pending。
8. 失败后 pending 恢复，但不会紧密重试。
9. 不触发桌面截图、工具调用、文件访问。
10. 手动入口仍可用且行为不变。

## 10. 分阶段实现建议（J）

1. Task 040：scheduler config skeleton（默认关闭）。
2. Task 041：scheduler state + debug snapshot（只读可见性）。
3. Task 042：manual scheduler tick（DevTools-only）。
4. Task 043：disabled-by-default polling skeleton。
5. Task 044：limited auto trigger smoke + docs。

## 11. 落地约束摘要

在 Task 040~044 全阶段中，持续保持以下底线：

1. 不自动越权到桌面/文件/隐私读取。
2. 不引入默认开启的自动开口。
3. 不破坏现有 manual-only 调试入口与 guard。
4. 任意阶段都可通过配置开关快速回退到当前稳定行为。

## 12. Task 040 Landing Notes

- Task 040 已落地 proactive scheduler config skeleton，但仍未启用 scheduler 执行路径。
- 当前仅新增并归一化以下配置字段：
  - `proactive_scheduler_enabled`（默认 `false`，仅 JSON `true` 才启用）
  - `proactive_cooldown_ms`（clamp: `60000`~`3600000`，默认 `600000`）
  - `proactive_warmup_ms`（clamp: `30000`~`1800000`，默认 `120000`）
  - `proactive_window_ms`（clamp: `600000`~`86400000`，默认 `3600000`）
- 前端 debug snapshot 已可读取这些字段，用于后续只读验证。
- Task 040 不引入自动触发：
  - 不新增 timer/listener/scheduler/tick
  - 不新增 `fetch`/`authFetch`/`requestAssistantReply`/`speak` 调用
  - 不改变 desktop capture/tool calling/file access 默认行为

## 13. Task 041 Landing Notes

- Task 041 已新增 proactive scheduler state 字段与只读 debug snapshot 可见性。
- 新增的是“状态观测”而非“状态执行”：
  - 增加 `proactiveSchedulerStartedAt`、`proactiveLastAttemptAt`、`proactiveLastTriggeredAt`、`proactiveCooldownUntil`、`proactiveWindowStartedAt`、`proactiveCountInWindow`、`proactiveInFlight`、`proactiveLastBlockedReason`、`proactiveLastResult`
  - 新增 `buildProactiveSchedulerDebugSnapshot()` 并挂到 `snapshot().proactiveScheduler`
- `eligibleForSchedulerTick` 仅表示 scheduler 自身 gate 是否放行，不等于 silence follow-up eligibility。
- Task 041 仍不引入自动执行：
  - 不新增 timer/listener/scheduler tick
  - 不新增 follow-up 触发
  - 不新增 `fetch`/`authFetch`/`requestAssistantReply`/`speak` 调用

## 14. Task 042 Landing Notes

- Task 042 新增 DevTools-only 手动入口：
  - `window.__AI_CHAT_DEBUG_TTS__.manualProactiveSchedulerTick()`
- 手动 tick 只用于联调路径验证：
  - scheduler gate（`buildProactiveSchedulerDebugSnapshot`）
  - silence eligibility（`runConversationSilenceFollowupDryRun`）
  - manual follow-up guard（`runConversationFollowupDebug`）
- blocked 行为保持严格：
  - 当 scheduler gate 不通过时，直接返回 `scheduler_not_eligible`
  - 不执行 `dryRunSilenceFollowup`，不触发 follow-up
- eligible 行为：
  - 复用现有 `runConversationSilenceFollowupDryRun()`
  - 成功时写入 `lastTriggered/cooldown/windowCount/lastResult`
  - 失败或 blocked 时写入 `lastBlockedReason/lastResult`，并进入短 cooldown
- Task 042 仍不引入自动触发：
  - 不新增 timer/listener/scheduler polling
  - 不新增后端 API、UI、或新的 LLM/TTS 调用链

## 15. Task 043 Landing Notes

- Task 043 新增 disabled-by-default 的 proactive scheduler polling skeleton。
- 配置新增 `proactive_poll_interval_ms`（默认 `60000`，clamp `30000`~`600000`）。
- polling lifecycle 新增 start/stop/sync/check，但默认配置下不会启动。
- 即使启用 polling，本阶段也只做 check：
  - scheduler gate 检查
  - silence/follow-up debug 可见性检查
  - 记录 `proactive_scheduler_poll_start/stop/blocked/ready` 事件
- Task 043 明确不执行 follow-up：
  - 不调用 `runConversationSilenceFollowupDryRun`
  - 不调用 `runConversationFollowupDebug`
  - 不调用 `runProactiveSchedulerManualTick`

## 16. Task 044 Landing Notes

- Task 044 在 polling skeleton 基础上新增 limited auto trigger smoke。
- 自动触发仍保持严格门控：
  - 仅在 `poll_ready`（scheduler gate + silence eligibility 均通过）时尝试触发
  - 复用 `runProactiveSchedulerManualTick()` 既有 guard 路径
  - 不直接调用 `requestAssistantReply`
- 默认仍 fail closed：
  - 三层开关未同时开启时 polling 不可用
  - 任意异常路径仅记录 debug event，并保持不触发主动发言
- 运行边界保持不变：
  - `skipDesktopAttach` 仍由既有 manual follow-up guard 路径保证
  - 不新增桌面截图、工具调用、文件读取默认行为

## 17. Task 045 Landing Notes

- Task 045 增加回滚与紧急停用（kill-switch）smoke 校验，目标是“安全收口”。
- 运行时若任一关键开关关闭（`enabled/proactive_enabled/proactive_scheduler_enabled`），polling 会快速停用：
  - 立即 `stop` timer
  - 标记 `pollLastResult=disabled`
  - 记录可识别 stop/blocked 原因事件
- 异常路径保持 fail closed：
  - 仅记录失败事件
  - 不继续轮询失控重试
  - 不绕过既有 guard 触发不安全行为

## 18. Task 046 Landing Notes

- Task 046 不扩功能，重点是受控联调与验收记录固化。
- 验收记录要求：
  - 可复现：每条结论都带配置条件与操作步骤
  - 可回滚：明确 kill-switch 操作与预期停用行为
  - 可审计：事件名、观察点、结论与残余风险可追溯
- 建议以五类场景形成固定检查面：
  - 默认关闭回归
  - 三层开关联调
  - 运行时 kill-switch
  - 异常 fail-closed
  - 安全边界复核

## 19. Task 053 Landing Notes

- Task 053 仅新增 exception fail-closed 安全测试入口设计文档，不改 JS/Python 运行行为。
- 设计目标是补齐 live event ordering 残余风险：在安全边界内验证 `proactive_scheduler_poll_failed` 与 `poll_exception_fail_closed` 路径。
- 推荐方案为 DevTools-only debug bridge 一次性注入：
  - 仅当前页面内存生效
  - 仅影响下一次 polling check
  - 自动清除，不持久化
  - 不暴露远程 API
- 明确拒绝方案：默认开启、远程可触发、持久化危险状态、绕过 guard、引入截图/工具调用/读文件路径。
- 本任务不新增自动 proactive 行为，默认 fail-closed 与三层开关边界保持不变。

## 20. Task 054 Landing Notes

- Task 054 implements the Task 053 recommended DevTools-only one-shot failure injection hook.
- The hook is exposed only through `window.__AI_CHAT_DEBUG_TTS__`:
  - `injectProactiveSchedulerPollFailureOnce(reason)`
  - `getProactiveSchedulerFailureInjectionState()`
  - `clearProactiveSchedulerFailureInjection()`
- The hook stores state only in current page memory and auto-clears after the next polling check consumes it.
- Injected failure uses the existing polling catch/fail-closed path:
  - `proactive_scheduler_poll_failed`
  - `poll_exception_fail_closed`
- No backend API, config flag, automatic screenshot, tool call, shell execution, file read, or direct `requestAssistantReply` path is added.

## 21. Task 056 Landing Notes

- Task 056 keeps the proactive scheduler guard unchanged and only polishes the content seed used after existing guards pass.
- The prompt seed now frames proactive output as a gentle character continuation instead of a system notification.
- It continues to require short, optional, low-pressure output and explicitly avoids repeated questioning or long explanations.
- The safety wording remains conservative:
  - no desktop/screen observation
  - no file/private-data access
  - no tool calls
- No scheduler gate, polling interval, kill-switch, fail-closed path, config default, backend API, or direct assistant request path is changed.

## 22. Task 057 Landing Notes

- Task 057 adds a deterministic local policy classifier before prompt seed generation.
- Scheduler safety remains unchanged because enforcement still happens through the existing plan eligibility and guard chain.
- The new `do_not_followup` policy is conservative:
  - it detects topic hints that look closed or explicitly ask not to continue
  - it adds `policy_do_not_followup` to `blockedReasons`
  - it leaves `promptDraft` empty
- Other policies only adjust wording inside the existing prompt seed:
  - `gentle_continue`
  - `light_question`
  - `soft_checkin`
- No config default, polling lifecycle, cooldown/window limit, kill-switch, fail-closed hook, backend API, screenshot, tool call, shell execution, file read, or direct assistant request path is changed.

## 23. Task 058 Landing Notes

- Task 058 exposes a read-only DevTools preview for follow-up policy decisions.
- The preview helper simulates the plan fields needed by prompt generation and returns diagnostic output only.
- It does not touch the scheduler timer, polling gate, cooldown/window counters, kill-switch, or fail-closed injection state.
- It does not mutate follow-up pending state and does not call the assistant request path.
- No screenshot, tool call, shell execution, file read, backend API, dependency, config flag, or UI is added.

## 24. Task 069 Landing Notes

- Task 069 adds a DevTools-only pending follow-up fixture for closed-topic policy verification.
- The helper temporarily enables only the in-memory diagnostic gates needed to make a pending follow-up state inspectable, then restores the previous state before returning.
- The scheduler guard remains the enforcement boundary:
  - no scheduler tick is called
  - no polling trigger is called
  - no direct `requestAssistantReply` path is added
- Expected closed-topic result remains fail-closed:
  - `snapshotFollowup.pending=true`
  - `eligible=false`
  - `blockedReasons` includes `policy_do_not_followup`
  - `silence.eligibleForSilenceFollowup=false`
- No config default, backend API, screenshot, tool call, shell execution, file read, TTS/fetch/LLM path, dependency, timer, or listener is added.

## 25. Task 111 Gray-mode Gate Note

- Task 111 adds `conversation_mode.gray_auto_enabled=false` as an explicit gray automatic follow-up opt-in gate.
- Automatic scheduler polling now requires four config gates before it can start:
  - `conversation_mode.enabled=true`
  - `conversation_mode.proactive_enabled=true`
  - `conversation_mode.proactive_scheduler_enabled=true`
  - `conversation_mode.gray_auto_enabled=true`
- When `gray_auto_enabled` is false, polling remains stopped and reports `gray_auto_disabled`.
- The gray-mode gate applies only to automatic polling startup; manual confirmation and DevTools/manual debug paths remain separately guarded by their existing checks.
- This keeps automatic follow-up default-off before any gray rollout and does not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, model calls, speech, config writes, or dependencies.

## 26. Task 116 Gray Trial Gate Note

- Task 116 adds `conversation_mode.gray_auto_trial_enabled=false` as an extra controlled-trial gate.
- Automatic scheduler polling now requires five config gates before it can start:
  - `conversation_mode.enabled=true`
  - `conversation_mode.proactive_enabled=true`
  - `conversation_mode.proactive_scheduler_enabled=true`
  - `conversation_mode.gray_auto_enabled=true`
  - `conversation_mode.gray_auto_trial_enabled=true`
- When `gray_auto_trial_enabled` is false, polling remains stopped and reports `gray_auto_trial_disabled`.
- The trial gate applies only to automatic polling startup; manual confirmation and DevTools/manual debug paths remain separately guarded by their existing checks.
- This keeps controlled automatic follow-up local/test-only, explicit, reversible, and default-off.

## 27. Task 117 Gray Trial Preflight Note

- Task 117 adds `grayAutoFollowupTrialPreflight()` as a read-only DevTools helper.
- The helper summarizes five gate status, gray readiness, dry-run outcome, and compact safety notes.
- It does not call polling start, scheduler manual tick, follow-up execution, model/TTS/fetch, backend APIs, config writes, screenshots, file access, shell execution, or tool calls.
- The follow-up status panel includes a one-line preflight result for local trial observation.
- No scheduler guard, config default, cooldown/window limit, pending mutation, or automatic trigger behavior is changed.

## 28. Task 118 Gray Trial Poll Event Context Note

- Task 118 appends compact gray trial preflight context to existing `proactive_scheduler_poll_*` events.
- Event `result` can include `trial:<status>`, `gates:<summary>`, `would_poll:<bool>`, and `would_trigger:<bool>`.
- Event `error` may include compact blocked reasons, capped to a short string.
- This is observability only: no polling start condition, scheduler guard, cooldown/window limit, pending mutation, model/TTS/fetch path, backend API, config default, or automatic trigger behavior is changed.

## 29. Task 119 Gray Trial Event Summary Note

- Task 119 adds `grayAutoFollowupTrialEvents(limit)` as a read-only DevTools helper.
- The helper summarizes recent `proactive_scheduler_poll_*` events and parses trial status, gate summary, `would_poll`, and `would_trigger`.
- The follow-up status report includes a one-line latest trial event summary.
- This is observability only and does not emit events, start polling, call scheduler ticks, execute follow-up, mutate pending state, call model/TTS/fetch, write config, or change scheduler guards.

## 30. Task 120 Gray Trial Session Cap Note

- Task 120 adds `conversation_mode.gray_auto_trial_max_triggers_per_session` with default `1`.
- The cap is tracked in renderer memory as a current-session counter.
- When automatic polling succeeds and the cap is reached, polling is stopped with `gray_auto_trial_session_limit_reached`.
- A value of `0` blocks controlled automatic trigger execution even if all five gates are enabled.
- Manual confirmation remains separately guarded and is not blocked by this automatic trial cap.

## 31. Task 121 Gray Trial Session Reset Note

- Task 121 exposes `grayAutoFollowupTrialSession()` and `resetGrayAutoFollowupTrialSession()` through the DevTools bridge.
- The read-only helper reports current automatic trial session count, max, remaining, and cap state.
- The reset helper only resets the renderer-memory counter and records `conversation_followup_gray_auto_trial_session_reset`.
- Reset does not restart polling, enable gates, call scheduler ticks, execute follow-up, mutate pending state, call model/TTS/fetch, write config, or change scheduler guards.

## 32. Task 122 Gray Trial Emergency Stop Note

- Task 122 exposes `stopGrayAutoFollowupTrial(reason)` through the DevTools bridge.
- It stops polling and seals the current renderer session by setting the trial counter to the configured max.
- It records `conversation_followup_gray_auto_trial_emergency_stop`.
- It does not change config, enable gates, restart polling, execute follow-up, mutate pending state, or call model/TTS/fetch.

## 33. Task 123 Gray Trial DevTools Arm Note

- Task 123 exposes `armGrayAutoFollowupTrial({ confirm: "ARM_GRAY_AUTO_TRIAL" })`.
- The helper requires the exact confirmation phrase and otherwise returns `confirmation_required`.
- Arming is renderer-memory only: it opens the five gates, resets the session counter, syncs existing polling, and records `conversation_followup_gray_auto_trial_armed`.
- Existing scheduler guards, session cap, and emergency stop remain the safety boundary.
- It does not write config or add desktop/file/tool/shell/backend capabilities.

## 34. Task 124 Gray Trial DevTools Disarm Note

- Task 124 exposes `disarmGrayAutoFollowupTrial(reason)` through the DevTools bridge.
- Disarm closes the in-memory gray automatic gates and stops proactive scheduler polling.
- It records `conversation_followup_gray_auto_trial_disarmed`.
- The readiness report shows compact armed/polling state.
- It does not write config, reset session count, execute follow-up, mutate pending state, or call model/TTS/fetch.

## 35. Task 125 Gray Trial Runbook Note

- Task 125 adds `docs/conversational-followup-gray-trial-runbook.md` as the controlled local trial procedure.
- DevTools exposes `grayAutoFollowupTrialRunbook()` as a read-only command guide.
- The runbook keeps automatic follow-up default-off and requires explicit local arming with the exact confirmation phrase.
- The guide points testers to preflight, event summary, session cap, emergency stop, disarm, reset, and readiness status checks.
- The helper does not arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 36. Task 126 Gray Trial Status Card Note

- Task 126 adds a read-only gray automatic trial status card to the follow-up readiness panel.
- The card reuses existing preflight, session, dry-run, scheduler snapshot, and poll event summary data.
- It displays status, armed/polling state, session count, would-poll/would-trigger hints, blocked reasons, latest event, and next safe step.
- It does not add action buttons or new scheduler entry points.
- It does not arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 37. Task 127 Gray Trial Control Panel Note

- Task 127 adds panel controls for the existing gray trial arm, emergency stop, disarm, and session reset helpers.
- Arm requires `ARM_GRAY_AUTO_TRIAL`; reset requires `RESET_GRAY_AUTO_TRIAL_SESSION`.
- Emergency stop and disarm remain safety收口 actions and stop polling through the existing helpers.
- The panel does not add a new scheduler execution path; it calls the same guarded helpers already exposed for local testing.
- It does not write config, bypass guards, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 38. Task 128 Gray Trial Audit Summary Note

- Task 128 adds `grayAutoFollowupTrialAuditSummary(limit)` as a read-only DevTools helper.
- The readiness panel can copy a compact audit summary for local trial review.
- The audit summary reuses existing preflight, session, dry-run, scheduler snapshot, and poll event summary data.
- It does not emit new trial events, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 39. Task 129 Gray Trial Pre-run Checklist Note

- Task 129 adds `grayAutoFollowupTrialPreRunChecklist()` as a read-only DevTools helper.
- The readiness panel shows a pre-run checklist before a real controlled trial.
- The checklist summarizes explicit arm state, polling visibility, session cap, emergency stop, disarm, runtime guards, and manual watch requirements.
- It does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 40. Task 130 Prep Gray Trial Timeline Note

- Task 130 prep adds `grayAutoFollowupTrialTimeline(limit)` as a read-only DevTools helper.
- The readiness panel renders recent gray trial control, dry-run, and polling events as a compact timeline.
- The panel can copy the timeline after an explicit user click.
- Timeline rendering and copy do not emit new events, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 41. Task 131 Gray Trial Outcome Note

- Task 131 adds `grayAutoFollowupTrialOutcome(limit)` as a read-only DevTools helper.
- The readiness panel renders a compact outcome classification for the visible gray trial.
- The classifier uses existing preflight, checklist, session, and timeline data.
- It can report not started, setup incomplete, armed waiting, blocked, ready observed, trigger blocked, success, stopped, or disarmed.
- It does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 42. Task 132 Gray Trial Go/No-Go Note

- Task 132 adds `grayAutoFollowupTrialGoNoGoDecision(limit)` as a read-only DevTools helper.
- The readiness panel renders a compact Go/No-Go decision package.
- The decision package uses existing checklist, outcome, timeline, and guard data.
- It can report `NO_GO`, `WATCH_ONLY`, `GO_FOR_WATCHED_TRIAL`, or `REVIEW_AFTER_SUCCESS`.
- It does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## 43. Task 133 Gray Trial Sign-off Package Note

- Task 133 adds `grayAutoFollowupTrialSignoffPackage(limit)` as a read-only DevTools helper.
- The readiness panel renders a copyable sign-off template for controlled gray trial review.
- The sign-off package uses existing decision, outcome, checklist, and timeline data.
- It includes manual checklist items and keeps `approvedForNextPhase=false` by default.
- It does not approve next-phase rollout automatically and does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, call model/TTS/fetch, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.
