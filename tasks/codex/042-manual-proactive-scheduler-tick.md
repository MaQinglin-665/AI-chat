# Task 042: Manual proactive scheduler tick

## 背景
- Task 040 已落地 proactive scheduler 配置骨架（默认关闭）。
- Task 041 已落地 scheduler state + debug snapshot 可见性。
- 当前仍无自动 scheduler/timer/listener。

## 目标
1. 新增 DevTools-only 手动 scheduler tick 入口。
2. 验证 scheduler gate -> silence eligibility -> manual follow-up guard 链路。
3. blocked 时仅返回 blocked，不执行 follow-up。
4. 保持 manual-only，不引入自动触发。

## 实施范围
- `web/chat.js`
  - 新增：
    - `runProactiveSchedulerManualTick()`
    - debug bridge 导出 `manualProactiveSchedulerTick`
  - 手动 tick 逻辑：
    1. 记录 `startedAt`，构建 `scheduler` 快照
    2. 写入 `state.proactiveLastAttemptAt`
    3. scheduler blocked：
       - 写 `lastBlockedReason` / `lastResult=blocked`
       - 记录 `proactive_scheduler_manual_blocked`
       - 直接返回 `ok=false, reason=scheduler_not_eligible`
       - 不调用 `runConversationSilenceFollowupDryRun`
    4. scheduler eligible：
       - 记录 `proactive_scheduler_manual_start`
       - 调用 `runConversationSilenceFollowupDryRun()`
       - 成功：写 `lastTriggered/cooldown/windowCount/lastResult=success`
       - 失败或 blocked：写 `lastBlockedReason/lastResult`，并设置短 cooldown
       - 记录 success/failed 事件
- 文档
  - `docs/proactive-scheduler-guard.md` 追加 Task 042 landing notes
  - `docs/conversational-mode-design.md` 追加 Task 042 landing notes
- 可选手测文档
  - `docs/conversational-followup-smoke-checklist.md` 增补 manual scheduler tick 步骤

## 非目标
- 不新增自动 proactive 触发
- 不新增 `setTimeout` / `setInterval` / listener
- 不新增 scheduler polling/tick 循环
- 不新增 UI / 后端 API
- 不直接调用 `requestAssistantReply`
- 不新增 `fetch` / `authFetch` / `speak`
- 不修改 desktop capture / tool calling / file access 默认行为

## 验证
1. `node --check web/chat.js`
2. `git diff --check`
3. 静态确认：
   - 新增入口仅 `manualProactiveSchedulerTick`
   - 无新增 timer/listener
   - 无直接 `requestAssistantReply`/`speak`/`fetch`/`authFetch`
   - scheduler blocked 不调用 `runConversationSilenceFollowupDryRun`
   - scheduler eligible 才调用 `runConversationSilenceFollowupDryRun`
   - 成功后写 `lastTriggered/cooldown/window count`
   - 失败/blocked 后写 `lastBlockedReason/lastResult`
4. 手测建议：
   - 默认配置下 `manualProactiveSchedulerTick()` 返回 `scheduler_not_eligible`
   - warmup 期可见 `warmup_active`
   - 构造 silence eligible 后返回 `schedulerManualTick=true`
   - 无自动重复触发、无自动截图
