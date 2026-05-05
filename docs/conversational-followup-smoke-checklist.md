# Conversational Follow-up Manual Smoke Checklist

适用范围：Task 031~035 之后的 manual follow-up 链路回归。
目标：验证 planner/debug/manual execution/guard 在不引入自动 proactive 的前提下可用且安全。

## 1. 前置条件

1. 工作区干净：`git status --short` 无未提交代码改动（文档草稿除外）。
2. 应用可启动，chatWindow 可打开 DevTools Console。
3. 明确当前测试模式：manual-only，不应存在自动 follow-up 循环。
4. 测试配置建议：
   - 默认回归先测 `conversation_mode.enabled=false`、`proactive_enabled=false`
   - 再切换到可触发配置（见第 3 节）
5. 安全注意：
   - manual follow-up 不应自动截图
   - 不应自动循环连续触发

## 2. 默认禁用验证

在 DevTools Console 执行：

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()
```

期望：
1. `conversationFollowup()`：`eligible=false`
2. `runConversationFollowup()`：`ok=false`、`reason="not_eligible"`
3. `blockedReasons` 包含禁用类原因（通常含 `conversation_disabled`、`proactive_disabled`）

## 3. 构造 pending / eligible

优先方式（推荐）：
1. 通过自然对话让 assistant 输出未收口问句（question-tail / open-loop）
2. 再执行 `conversationFollowup()` 查看：
   - `pending` 相关状态成立
   - `topicHint` 非空
   - `promptDraft` 非空（若 eligible）

可选方式（仅调试）：
```js
state.conversationMode.enabled = true
state.conversationMode.proactiveEnabled = true
state.followupPending = true
state.followupReason = "question_tail"
state.followupTopicHint = "测试话题"
state.followupUpdatedAt = Date.now() - state.conversationMode.silenceFollowupMinMs - 1000
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
```

期望：
1. `eligible=true`
2. `blockedReasons=[]`
3. `promptDraft` 为短、克制、可忽略的续话 seed

## 4. 成功执行验证

执行：

```js
await window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()
```

期望：
1. `ok=true`
2. `consumedPending=true`
3. `restoredPending=false`
4. 返回包含 `startedAt`、`endedAt`、`elapsedMs`
5. 再次执行不应重复触发同一条 pending（通常会变为 `not_eligible`）

## 5. 失败恢复验证

可通过临时断网/后端不可用/使请求失败来验证。

执行：

```js
await window.__AI_CHAT_DEBUG_TTS__.runConversationFollowup()
```

期望：
1. `ok=false`
2. `reason` 为失败类（如 `request_failed` / `request_exception`）
3. `restoredPending=true`
4. pending 状态恢复（含原 `updatedAt`）

## 6. 隐私与安全验证

检查点：
1. 即使 `promptDraft` 包含“桌面/屏幕/截图”等词，manual follow-up 也不应触发 desktop capture。
2. 不应出现额外工具调用、文件读取、shell 执行。
3. 不应引入自动 proactive 循环。

## 7. Debug Events 验证

执行：

```js
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

检查是否出现：
1. `conversation_followup_not_eligible`
2. `conversation_followup_start`
3. `conversation_followup_success`
4. `conversation_followup_failed`
5. `conversation_followup_restore_pending`
6. `conversation_silence_followup_blocked`（Task 038）
7. `conversation_silence_followup_manual_start`（Task 038）

说明：事件里不应塞入完整长 prompt，重点看 reason/topicHint 摘要与阶段是否正确。

## 8. Silence Dry-Run 验证（Task 038）

执行：

```js
await window.__AI_CHAT_DEBUG_TTS__.dryRunSilenceFollowup()
```

期望：
1. 默认配置下返回 `ok=false`、`reason="silence_not_eligible"`。
2. 当 `silence window` 未达成时，仍为 blocked，且 `events()` 中出现 `conversation_silence_followup_blocked`。
3. 当 silence eligible 达成后，dry-run 会复用现有 manual follow-up 执行路径，返回结果包含：
   - `silenceDryRun=true`
   - `silenceEligibleAtStart=true`
   - `silenceStartedAt`
4. 不应自动重复触发，不应自动截图。

## 9. 回归记录模板

```md
日期：
分支：
Commit：
测试配置：
- conversation_mode.enabled:
- conversation_mode.proactive_enabled:
- 其他关键开关：

测试结果：
1. 默认禁用验证：
2. eligible 构造：
3. 成功执行：
4. 失败恢复：
5. 安全检查（不截图/不工具调用）：
6. debug events：

异常备注：
```

## 10. Manual Proactive Scheduler Tick（Task 042）

执行：

```js
await window.__AI_CHAT_DEBUG_TTS__.manualProactiveSchedulerTick()
```

期望：
1. 默认配置下返回 `ok=false`、`reason="scheduler_not_eligible"`。
2. `snapshot().proactiveScheduler.lastResult` 更新为 `blocked`。
3. 开启 `conversation_mode.enabled/proactive_enabled/proactive_scheduler_enabled` 后，warmup 内 `blockedReasons` 包含 `warmup_active`。
4. 仅当 scheduler gate eligible 时才进入 `dryRunSilenceFollowup` 路径；blocked 时不应执行 follow-up。
5. 不应自动重复触发，不应自动截图。

## 11. Proactive Scheduler Polling Skeleton（Task 043）

执行：

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler
```

期望：
1. 默认配置下 `pollTimerActive=false`，且 `schedulerEnabled=false`（或被上层开关阻塞）。
2. 开启 `conversation_mode.enabled/proactive_enabled/proactive_scheduler_enabled` 后，reload 页面，`pollTimerActive=true`。
3. `events()` 可见：
   - `proactive_scheduler_poll_start`
   - `proactive_scheduler_poll_blocked` 或 `proactive_scheduler_poll_ready`
4. polling 仅做检查，不自动触发 follow-up，不自动说话，不自动截图。

## 12. Limited Auto Trigger Smoke（Task 044）

执行前置（仅本地测试）：
1. 开启三层开关：
   - `conversation_mode.enabled=true`
   - `conversation_mode.proactive_enabled=true`
   - `conversation_mode.proactive_scheduler_enabled=true`
2. 构造可通过 scheduler gate 与 silence eligibility 的场景。

观察点：
1. `events()` 中先出现 `proactive_scheduler_poll_ready`。
2. 随后出现：
   - `proactive_scheduler_poll_trigger_success` 或
   - `proactive_scheduler_poll_trigger_blocked`。
3. 任意 blocked/异常都不应绕过 guard，不应直接触发不安全行为。
4. 不应自动截图，不应自动工具调用，不应读取用户文件。

## 13. Kill-Switch Smoke（Task 045）

执行前置：
1. 先开启三层开关并确认 polling 已 active。
2. 确认 `events()` 已出现 `proactive_scheduler_poll_start`。

操作与期望：
1. 运行中关闭任一开关（例如 `proactive_scheduler_enabled=false`）并 reload 配置后：
   - `snapshot().proactiveScheduler.pollTimerActive=false`
   - `pollLastResult=disabled`
   - `events()` 可见 `proactive_scheduler_poll_stop` 与带原因的 `proactive_scheduler_poll_blocked`
2. 重新开启三层开关后可恢复 polling（仍受既有 guard）。
3. 异常场景下仅记录 `proactive_scheduler_poll_failed`/stop 事件，不应出现不安全自动行为。

## 14. Controlled Integration Checkpoint（Task 046）

目的：
1. 固化 Task 044/045 的受控联调步骤，形成可复用验收记录。
2. 明确每一步的配置条件、事件名、预期与实际结果。

记录模板：

```md
日期：
分支：
Commit：
测试人：

配置快照（仅安全字段）：
- conversation_mode.enabled:
- conversation_mode.proactive_enabled:
- conversation_mode.proactive_scheduler_enabled:
- conversation_mode.proactive_poll_interval_ms:
- conversation_mode.proactive_cooldown_ms:
- conversation_mode.proactive_warmup_ms:
- conversation_mode.proactive_window_ms:

执行结果：
A. 默认关闭回归（通过/未通过）：
- 观察：pollTimerActive / pollLastResult / events
- 事件：proactive_scheduler_poll_blocked 或 disabled 相关 stop
- 备注：

B. 三层开关联调（通过/未通过）：
- 观察：poll_start -> poll_blocked/poll_ready
- 事件：proactive_scheduler_poll_start, proactive_scheduler_poll_blocked, proactive_scheduler_poll_ready
- 备注：

C. Kill-switch 运行时验证（通过/未通过）：
- 观察：运行中关开关后 timer 停止、pollLastResult=disabled
- 事件：proactive_scheduler_poll_stop + 带原因 proactive_scheduler_poll_blocked
- 备注：

D. 异常 fail-closed 验证（通过/未通过）：
- 观察：仅失败/stop 事件，无失控重试
- 事件：proactive_scheduler_poll_failed（必要时）+ proactive_scheduler_poll_stop
- 备注：

E. 安全边界复核（通过/未通过）：
- skipDesktopAttach 路径仍生效
- 无 direct requestAssistantReply 新增调用点
- 无自动截图/工具调用/读文件新增路径
- 备注：

最终结论（通过/未通过/部分通过）：
残余风险：
回滚建议：
```

事件最小观察集：
1. `proactive_scheduler_poll_start`
2. `proactive_scheduler_poll_blocked`
3. `proactive_scheduler_poll_ready`
4. `proactive_scheduler_poll_trigger_success`
5. `proactive_scheduler_poll_trigger_blocked`
6. `proactive_scheduler_poll_failed`
7. `proactive_scheduler_poll_stop`

## 15. Exception Fail-closed Hook Design Review (Task 053)

目的：
1. 在实现前先评审“异常注入入口”是否满足安全边界。
2. 防止为追求测试便利而引入高风险调试后门。

必查项：
1. 入口默认关闭，且仅 DevTools/debug bridge 可用。
2. 注入仅影响下一次 polling check，消费后自动清除。
3. 页面 reload 后注入状态失效（不持久化到配置/后端）。
4. 不暴露远程 API，不允许 HTTP 直接触发。
5. 异常路径只产生 fail-closed 事件，不触发自动截图/工具调用/读文件。
6. 不新增 direct `requestAssistantReply` 调用点。

不可接受实现：
1. `config` 持久化 debug fail flag 且默认可被误启用。
2. query/env 隐式入口无法审计，或会跨会话遗留。
3. 可绕过 scheduler/manual guard 链的异常触发路径。

## 17. Exception Fail-closed Hook Runtime Smoke (Task 054)

Preconditions:

1. Run only from local DevTools Console.
2. Enable the three proactive scheduler switches and confirm polling is active.

Commands:

```js
window.__AI_CHAT_DEBUG_TTS__.injectProactiveSchedulerPollFailureOnce("manual_task_054")
window.__AI_CHAT_DEBUG_TTS__.getProactiveSchedulerFailureInjectionState()
```

After the next polling check:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

Expected:

1. `proactive_scheduler_poll_failure_injected` appears.
2. `proactive_scheduler_poll_failure_injection_consumed` appears on the next poll.
3. `proactive_scheduler_poll_failed` appears.
4. If the timer was active, `proactive_scheduler_poll_stop` appears with `poll_exception_fail_closed`.
5. Injection state becomes inactive.
6. No automatic screenshot, tool call, file read, or direct assistant reply behavior occurs.

## 18. Proactive Follow-up Content Polish (Task 056)

Purpose:

1. Confirm the follow-up prompt seed stays gentle, optional, and character-like.
2. Confirm content polish did not expand scheduler behavior or permissions.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup().promptDraft
```

Expected prompt draft traits:

1. Describes the follow-up as low-interruption proactive continuation, not a system notification.
2. Requests only one short natural continuation or light follow-up question.
3. Tells the assistant not to pressure the user, not to repeatedly ask, and not to explain at length.
4. Explicitly forbids desktop/screen/file/private-data access and tool calls.
5. Keeps `续话原因` and `话题线索` as diagnostic context only.

Regression checks:

1. No new timer/listener/API/dependency is added.
2. No config default changes.
3. No new direct `requestAssistantReply` call path.
4. No automatic screenshot, tool call, shell execution, or file read behavior.

## 19. Proactive Follow-up Policy Presets (Task 057)

Purpose:

1. Confirm the local policy helper selects conservative follow-up styles.
2. Confirm closed topics fail quiet instead of triggering proactive speech.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
```

Expected policy behavior:

1. `question_tail` plans include `followupPolicy="light_question"`.
2. `keyword_hint` plans include `followupPolicy="soft_checkin"`.
3. Other eligible plans default to `followupPolicy="gentle_continue"`.
4. Topic hints like `不用`, `算了`, `先这样`, `晚安`, or `不用回` produce `followupPolicy="do_not_followup"`.
5. `do_not_followup` plans include `policy_do_not_followup` in `blockedReasons` and keep `promptDraft=""`.

Regression checks:

1. No new LLM classifier is introduced.
2. No new timer/listener/API/UI/dependency is added.
3. No config default changes.
4. No scheduler gate, cooldown, window limit, kill-switch, or fail-closed behavior changes.
5. No automatic screenshot, tool call, shell execution, file read, or direct assistant request path is added.

## 20. Proactive Follow-up Policy Preview (Task 058)

Purpose:

1. Validate Task 057 policy decisions without mutating runtime follow-up state.
2. Confirm preview remains read-only and non-executing.

Commands:

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "question_tail",
  topicHint: "你觉得这个方向怎么样？"
})

window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "keyword_hint",
  topicHint: "要不要我继续讲这个思路"
})

window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "我们刚才聊到主动续话策略"
})

window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
```

Expected:

1. `question_tail` returns `followupPolicy="light_question"` and a non-empty `promptDraft`.
2. `keyword_hint` returns `followupPolicy="soft_checkin"` and a non-empty `promptDraft`.
3. `followup_pending` returns `followupPolicy="gentle_continue"` and a non-empty `promptDraft`.
4. Closed-topic input returns `followupPolicy="do_not_followup"`, includes `policy_do_not_followup`, and keeps `promptDraft=""`.

Regression checks:

1. Preview does not call `runConversationFollowup()`.
2. Preview does not call `requestAssistantReply`.
3. Preview does not mutate pending follow-up state.
4. Preview does not trigger screenshots, tools, shell execution, file reads, TTS, fetch, or LLM calls.

## 21. Follow-up Policy Debug Snapshot (Task 060)

Purpose:

1. Confirm the current pending follow-up policy is visible in the existing debug snapshot.
2. Avoid requiring a separate preview call for normal state inspection.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
```

Expected:

1. Existing fields remain available:
   - `pending`
   - `reason`
   - `topicHint`
   - `updatedAgeMs`
2. New fields are available:
   - `policy`
   - `policyNote`
   - `policyBlockedReason`
3. Closed-topic pending hints report `policy="do_not_followup"` and `policyBlockedReason="policy_do_not_followup"`.

Regression checks:

1. Snapshot remains read-only.
2. No follow-up execution is triggered.
3. No scheduler, polling, request, screenshot, tool, shell, file, TTS, fetch, LLM, config, API, dependency, or UI behavior changes.

## 22. Follow-up Policy Debug Events (Task 061)

Purpose:

1. Confirm follow-up policy context is visible in existing debug event timelines.
2. Confirm event names and `result` semantics remain unchanged.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

Expected:

1. Existing follow-up and proactive scheduler event names remain unchanged.
2. `result` still carries blocked/ready/trigger status.
3. `error` may include compact policy context:
   - `gentle_continue:...`
   - `light_question:...`
   - `soft_checkin:...`
   - `do_not_followup:...`
4. No new automatic follow-up execution path is introduced.

Regression checks:

1. No scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, or fail-closed behavior changes.
2. No screenshot, tool, shell, file, TTS, fetch, LLM, config, API, dependency, or UI behavior changes.

## 23. Follow-up Plan Debug Snapshot (Task 062)

Purpose:

1. Confirm current follow-up plan eligibility is visible in the existing debug snapshot.
2. Reduce the need to call `conversationFollowup()` only to inspect blocked reasons.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
```

Expected:

1. Existing fields remain available.
2. New fields are available:
   - `eligible`
   - `blockedReasons`
3. Default-off or not-ready states include readable blocked reasons such as:
   - `conversation_disabled`
   - `proactive_disabled`
   - `no_pending_followup`
   - `empty_topic_hint`
   - `silence_window_not_reached`

Regression checks:

1. Snapshot remains read-only.
2. No follow-up execution is triggered.
3. No scheduler, polling, request, screenshot, tool, shell, file, TTS, fetch, LLM, config, API, dependency, or UI behavior changes.

## 24. Follow-up Policy Silence Eligibility (Task 063)

Purpose:

1. Confirm closed-topic policy blocks silence eligibility before polling can report ready.
2. Confirm the policy block is fail-closed and does not expand proactive behavior.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup().silence
```

Expected for closed-topic pending hints such as `先这样，晚安`:

1. `eligibleForSilenceFollowup=false`
2. `blockedReasons` includes `policy_do_not_followup`
3. `followupPolicy="do_not_followup"`
4. Polling should remain blocked/not ready instead of reporting `poll_ready`.

Regression checks:

1. Normal non-closed pending hints keep existing silence eligibility behavior.
2. No scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, request, screenshot, tool, shell, file, TTS, fetch, LLM, config, API, dependency, or UI behavior changes.

## 25. Manual DevTools Runtime Capture (Task 067)

Purpose:

1. Close the remaining Task 066 runtime evidence gap.
2. Capture policy/silence/event fields from the real chat window DevTools Console.

Preconditions:

1. Start Electron locally.
2. Open chat window DevTools Console.
3. Do not enable screenshot/tool/file access for this check.

Command:

```js
(() => {
  const debug = window.__AI_CHAT_DEBUG_TTS__;
  if (!debug) return { ok: false, reason: "debug_bridge_missing" };
  const preview = debug.previewConversationFollowupPolicy({
    reason: "followup_pending",
    topicHint: "先这样，晚安"
  });
  const snapshotFollowup = debug.snapshot().followup;
  const conversationFollowup = debug.conversationFollowup();
  return {
    ok: true,
    preview: {
      followupPolicy: preview.followupPolicy,
      eligible: preview.eligible,
      blockedReasons: preview.blockedReasons,
      promptDraftEmpty: !String(preview.promptDraft || "").trim()
    },
    snapshotFollowup: {
      pending: snapshotFollowup.pending,
      eligible: snapshotFollowup.eligible,
      blockedReasons: snapshotFollowup.blockedReasons,
      policy: snapshotFollowup.policy,
      policyBlockedReason: snapshotFollowup.policyBlockedReason
    },
    conversationFollowup: {
      eligible: conversationFollowup.eligible,
      blockedReasons: conversationFollowup.blockedReasons,
      followupPolicy: conversationFollowup.followupPolicy,
      promptDraftEmpty: !String(conversationFollowup.promptDraft || "").trim(),
      silence: {
        eligibleForSilenceFollowup: conversationFollowup.silence?.eligibleForSilenceFollowup,
        blockedReasons: conversationFollowup.silence?.blockedReasons,
        followupPolicy: conversationFollowup.silence?.followupPolicy
      }
    },
    recentEvents: debug.events().slice(-30).map((event) => ({
      type: event.type,
      text: event.text,
      result: event.result,
      error: event.error
    }))
  };
})()
```

Expected:

1. `preview.followupPolicy="do_not_followup"`
2. `preview.eligible=false`
3. `preview.blockedReasons` includes `policy_do_not_followup`
4. `preview.promptDraftEmpty=true`
5. `conversationFollowup.silence.eligibleForSilenceFollowup=false`
6. `conversationFollowup.silence.blockedReasons` includes `policy_do_not_followup`
7. No new `proactive_scheduler_poll_ready` event for the closed-topic case.
