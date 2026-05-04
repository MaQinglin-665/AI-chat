# Task 041: Proactive scheduler state + debug snapshot

## 背景
- Task 040 已完成 proactive scheduler 配置骨架（默认关闭）与归一化。
- 当前仍未实现 scheduler/tick/自动 proactive 触发。
- 在进入执行层前，需要先补齐 scheduler 运行态字段与 debug 可见性。

## 目标
1. 新增 proactive scheduler 的 state 字段。
2. 新增只读 scheduler debug snapshot（`snapshot().proactiveScheduler`）。
3. 保持行为零变更：不触发 follow-up、不调用 LLM/TTS。

## 实施范围
- `web/chat.js`
  - 新增 state 字段：
    - `proactiveSchedulerStartedAt`
    - `proactiveLastAttemptAt`
    - `proactiveLastTriggeredAt`
    - `proactiveCooldownUntil`
    - `proactiveWindowStartedAt`
    - `proactiveCountInWindow`
    - `proactiveInFlight`
    - `proactiveLastBlockedReason`
    - `proactiveLastResult`
  - 新增 helper：
    - `buildProactiveSchedulerDebugSnapshot(nowMs = Date.now())`
  - 在 `getTTSDebugSnapshot()` 中新增：
    - `proactiveScheduler: buildProactiveSchedulerDebugSnapshot(Date.now())`
  - 在 `loadConfig()` 成功后，若 `proactiveSchedulerStartedAt` 未设置则初始化为 `Date.now()`（仅用于 warmup 可观测）。
- 文档：
  - `docs/proactive-scheduler-guard.md` 追加 Task 041 landing notes
  - `docs/conversational-mode-design.md` 追加 Task 041 landing notes

## Debug 字段（建议与实现）
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

blockedReasons 覆盖：
- `conversation_disabled`
- `proactive_disabled`
- `scheduler_disabled`
- `warmup_active`
- `cooldown_active`
- `in_flight`
- `window_limit_reached`

## 非目标
- 不新增自动 proactive 触发
- 不新增 `setTimeout` / `setInterval` / listener
- 不新增 scheduler tick 函数
- 不新增 UI、后端 API
- 不新增 `fetch` / `authFetch` / `requestAssistantReply` / `speak` 调用
- 不改变 desktop capture / tool calling / file access 默认行为
- 不改变现有 manual follow-up 行为

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 无新增 timer/listener/tick 自动执行路径
   - 无新增 `requestAssistantReply`/`speak`/`fetch`/`authFetch` 调用
   - `snapshot().proactiveScheduler` 可见新增字段
   - 默认配置下 `schedulerEnabled=false`，`eligibleForSchedulerTick=false`，`blockedReasons` 含 `scheduler_disabled` 或 `proactive_disabled`
   - 开启相关配置后 warmup 内 `blockedReasons` 含 `warmup_active`
