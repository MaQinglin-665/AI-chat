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
2. 仅开启 `conversation_mode.enabled/proactive_enabled/proactive_scheduler_enabled` 且保持 `gray_auto_enabled=false` 时，reload 页面后 `pollTimerActive=false`，`pollingBlockedReasons` 包含 `gray_auto_disabled`。
3. 显式开启 `conversation_mode.gray_auto_enabled=true` 后，reload 页面，`pollTimerActive=true`。
4. `events()` 可见：
   - `proactive_scheduler_poll_start`
   - `proactive_scheduler_poll_blocked` 或 `proactive_scheduler_poll_ready`
5. polling 仅做检查，不自动截图、不自动工具调用、不读取用户文件；是否触发 follow-up 仍受后续 guard 保护。

## 12. Limited Auto Trigger Smoke（Task 044）

执行前置（仅本地测试）：
1. 开启四层开关：
   - `conversation_mode.enabled=true`
   - `conversation_mode.proactive_enabled=true`
   - `conversation_mode.proactive_scheduler_enabled=true`
   - `conversation_mode.gray_auto_enabled=true`
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
1. 先开启四层开关并确认 polling 已 active。
2. 确认 `events()` 已出现 `proactive_scheduler_poll_start`。

操作与期望：
1. 运行中关闭任一开关（例如 `proactive_scheduler_enabled=false`）并 reload 配置后：
   - `snapshot().proactiveScheduler.pollTimerActive=false`
   - `pollLastResult=disabled`
   - `events()` 可见 `proactive_scheduler_poll_stop` 与带原因的 `proactive_scheduler_poll_blocked`
2. 重新开启四层开关后可恢复 polling（仍受既有 guard）。
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
- conversation_mode.gray_auto_enabled:
- conversation_mode.proactive_poll_interval_ms:
- conversation_mode.proactive_cooldown_ms:
- conversation_mode.proactive_warmup_ms:
- conversation_mode.proactive_window_ms:

执行结果：
A. 默认关闭回归（通过/未通过）：
- 观察：pollTimerActive / pollLastResult / events
- 事件：proactive_scheduler_poll_blocked 或 disabled 相关 stop
- 备注：

B. 四层开关联调（通过/未通过）：
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

## 26. DevTools Pending Follow-up Fixture (Task 069)

Purpose:

1. Confirm a real pending closed-topic follow-up state still fails closed.
2. Avoid needing a natural conversation to land in the exact pending state.
3. Keep the check DevTools-only and diagnostic-only.

Command:

```js
window.__AI_CHAT_DEBUG_TTS__.checkConversationFollowupPendingFixture({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
```

Expected:

1. `ok=true`
2. `preview.followupPolicy="do_not_followup"`
3. `snapshotFollowup.pending=true`
4. `snapshotFollowup.eligible=false`
5. `snapshotFollowup.blockedReasons` includes `policy_do_not_followup`
6. `conversationFollowup.eligible=false`
7. `conversationFollowup.blockedReasons` includes `policy_do_not_followup`
8. `conversationFollowup.silence.eligibleForSilenceFollowup=false`
9. `conversationFollowup.silence.blockedReasons` includes `policy_do_not_followup`
10. `conversationFollowup.promptDraftEmpty=true`
11. `restored=true`
12. `afterRestore.pending` matches the pre-check state, usually `false` in a clean idle session.
13. `afterRestore.conversationEnabled`, `afterRestore.proactiveEnabled`, and `afterRestore.proactiveSchedulerEnabled` match the pre-check config state.
14. `recentEvents` contains `conversation_followup_pending_fixture_checked`
15. `recentEvents` does not contain a new `conversation_followup_start`, `conversation_followup_success`, or `proactive_scheduler_poll_ready` caused by this check.

Regression checks:

1. The helper is exposed only through `window.__AI_CHAT_DEBUG_TTS__`.
2. It temporarily mutates in-memory follow-up state only during the synchronous diagnostic call and restores state before returning.
3. It does not call `runConversationFollowup`, `manualProactiveSchedulerTick`, `requestAssistantReply`, LLM, fetch, TTS, screenshots, tools, shell, or file access.
4. It does not persist config, add timers, or change default-off behavior.

## 30. Character Proactive Follow-up Copy v1

Purpose: confirm proactive follow-up prompt drafts feel more like a desktop character while staying low-interruption and safe.

DevTools preview:

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected checks:

1. The result includes `characterCue`.
2. `promptDraft` asks for one short Chinese follow-up, not a long explanation.
3. The prompt uses low-pressure desktop-pet wording rather than system-notification wording.
4. The prompt still forbids desktop/screen/file/privacy guessing and tool calls.
5. No scheduler, polling, or follow-up execution is triggered by preview alone.

## 31. Follow-up Character Preview v1

Purpose: confirm the local preview line helps tune proactive follow-up copy without triggering the LLM or scheduler.

DevTools preview:

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected checks:

1. The result includes `characterPreview`.
2. `characterPreview` is short, Chinese-first, and low-pressure.
3. `characterCue` remains present.
4. Preview does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. Preview does not mutate pending follow-up state or scheduler state.

## 32. Follow-up Character State v1

Purpose: confirm the readiness panel can explain the current follow-up state as a character-like status without triggering behavior.

DevTools check:

```js
window.__AI_CHAT_DEBUG_TTS__.followupCharacterState()
```

Expected checks:

1. The result includes `label`, `mood`, and `description`.
2. Labels are Chinese-first and understandable without reading raw guard keys.
3. The helper does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
4. The helper does not mutate pending follow-up state or scheduler state.
5. The readiness panel shows the same kind of character state summary.

## 33. Follow-up Character Status Chip v1

Purpose: confirm the main chat header can show a small local character state chip without triggering any proactive behavior.

Manual checks:

1. Start the app in chat view.
2. Confirm the header shows a chip like `安静陪伴 · idle`.
3. Open `更多 -> 续话状态` and confirm the chip remains visible and read-only.
4. Confirm the chip does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. Confirm the chip does not mutate pending follow-up state or scheduler state.

## 34. Follow-up Character Chip Visual State v1

Purpose: confirm the main chat header chip uses subtle visual tones while remaining read-only.

Manual checks:

1. Start the app in chat view.
2. Confirm the chip still shows a label like `安静陪伴 · idle`.
3. Inspect the chip and confirm `data-tone` is present.
4. Confirm visual tone changes are CSS-only.
5. Confirm the chip does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.

## 35. Follow-up Character Runtime Hint v1

Purpose: confirm follow-up character status changes can emit a low-frequency local runtime hint without triggering proactive behavior.

DevTools checks:

```js
window.__AI_CHAT_DEBUG_TTS__.followupCharacterRuntimeHint()
window.__AI_CHAT_DEBUG_TTS__.events().filter(e => e.type === "followup_character_runtime_hint")
```

Expected checks:

1. Runtime hint state is visible.
2. Hints only emit on tone changes and are rate-limited.
3. Events are compact and do not include long prompt/private content.
4. The feature does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. The feature does not mutate pending follow-up state or scheduler state.

## 36. Follow-up-aware Idle Motion v1

Purpose: confirm existing idle motion can lightly reflect follow-up character state without adding proactive behavior.

Manual checks:

```js
window.__AI_CHAT_DEBUG_TTS__.followupAwareIdleMotionContext()
```

1. Start the app with Live2D enabled.
2. Confirm idle motion still uses the existing idle motion interval.
3. Confirm busy/speaking/dragging states still skip idle motion.
4. Confirm the feature does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. Confirm the feature does not mutate pending follow-up state or scheduler state.

## 37. Follow-up Reaction Candidates v1

Purpose: confirm local follow-up reaction candidates are useful for tuning character copy without speaking automatically.

DevTools check:

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupReactions({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected checks:

1. The result includes several short Chinese candidates.
2. `characterPreview` remains aligned with the first candidate.
3. The readiness panel shows a compact candidate summary.
4. The helper does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. The helper does not mutate pending follow-up state or scheduler state.

## 38. Follow-up Reaction Selection v1

Purpose: confirm local follow-up reaction selection is inspectable and still does not speak automatically.

DevTools check:

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupReactions({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected checks:

1. The result includes `selected.reason`, `selected.preferredTone`, and `selected.index`.
2. `preview` matches `selected.candidate.text`.
3. The readiness panel shows the selected strategy line.
4. The helper does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. The helper does not mutate pending follow-up state or scheduler state.

## 39. Follow-up Selected Reaction Chip Hint v1

Purpose: confirm the header chip can reveal the selected local follow-up reaction without speaking automatically.

Manual checks:

1. Start the app in chat view.
2. Hover the follow-up character chip and confirm the tooltip can include the selected reaction when one exists.
3. Inspect the chip and confirm `data-selected-tone` and `data-selected-index` are present.
4. Confirm the compact chip text remains short and does not show a long sentence inline.
5. Confirm the chip does not call `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
6. Confirm the chip does not mutate pending follow-up state or scheduler state.

## 40. Follow-up Pending Rehearsal v1

Purpose: confirm DevTools can hold a local pending follow-up rehearsal state long enough to inspect character UI without speaking automatically.

DevTools check:

```js
window.__AI_CHAT_DEBUG_TTS__.rehearseConversationFollowupPending({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.followupCharacterState()
window.__AI_CHAT_DEBUG_TTS__.clearConversationFollowupRehearsal()
```

Expected checks:

1. Rehearsal sets pending state in memory and updates the character chip.
2. Clearing rehearsal restores the previous pending state.
3. If polling is active or all scheduler switches are enabled together, rehearsal returns a blocked result.
4. The helper does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. The helper does not change scheduler gates, polling, cooldown, window limits, config, or backend APIs.

## 41. Follow-up Rehearsal Panel Controls v1

Purpose: confirm the follow-up readiness panel can start and clear a local rehearsal state without DevTools commands or automatic speech.

Manual checks:

1. Start the app in chat view.
2. Open `更多 -> 续话状态`.
3. Click `预演` and confirm the panel reports rehearsal active.
4. Confirm the chip/tooltip and selected reaction update for the rehearsal topic.
5. Click `清除预演` and confirm the previous local pending state is restored.
6. If polling is active or all scheduler switches are enabled together, confirm `预演` is blocked fail-closed.
7. Confirm the buttons do not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
8. Confirm the buttons do not change scheduler gates, polling, cooldown, window limits, config, or backend APIs.

## 42. Follow-up Rehearsal Scenarios v1

Purpose: confirm the follow-up readiness panel can compare multiple local rehearsal moods quickly while staying safe.

Manual checks:

1. Start the app in chat view.
2. Open `更多 -> 续话状态`.
3. Click `好奇追问`, `温柔接话`, and `收口安静` one by one.
4. Confirm the panel shows the active scenario label.
5. Confirm chip/tooltip/selected reaction update for each scenario.
6. Confirm `清除预演` restores the previous local pending state and clears the scenario label.
7. Confirm scenario buttons do not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
8. Confirm scenario buttons do not change scheduler gates, polling, cooldown, window limits, config, or backend APIs.

## 43. Follow-up Rehearsal Preview Card v1

Purpose: confirm the follow-up readiness panel exposes a compact rehearsal preview card for faster character tuning.

Manual checks:

1. Start the app in chat view.
2. Open `更多 -> 续话状态`.
3. Confirm a compact preview card appears above the full report.
4. Click `好奇追问`, `温柔接话`, and `收口安静`; confirm the card updates scenario, policy, tone/index, and selected sentence.
5. Click `清除预演` and confirm the card returns to the non-rehearsal state.
6. Confirm the card does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
7. Confirm the card does not change scheduler gates, polling, cooldown, window limits, config, or backend APIs.

## 44. Follow-up Rehearsal Copy Actions v1

Purpose: confirm the follow-up readiness panel can copy local rehearsal text without speaking automatically or changing scheduler state.

Manual checks:

1. Start the app in chat view.
2. Open `更多 -> 续话状态`.
3. Click a rehearsal scenario such as `好奇追问` or `温柔接话`.
4. Click `复制短句` and confirm the clipboard contains the selected local follow-up candidate sentence.
5. Click `复制摘要` and confirm the clipboard contains the compact preview card summary.
6. Confirm copy buttons are user-click-only and do not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
7. Confirm copy buttons do not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 45. Follow-up Rehearsal Copy Bundle v1

Purpose: confirm the follow-up readiness panel can copy one local rehearsal comparison bundle (short sentence + summary) without speaking automatically or changing scheduler state.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Click a rehearsal scenario such as `curious follow-up` or `gentle continue`.
4. Click `copy bundle` and confirm the clipboard text includes both:
   - the selected local follow-up short sentence
   - the compact preview summary block
5. Confirm the copy action is user-click-only and does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
6. Confirm the copy action does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 46. Follow-up Rehearsal Copy JSON v1

Purpose: confirm the follow-up readiness panel can copy a local structured JSON snapshot for rehearsal tuning without speaking automatically or changing scheduler state.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Click a rehearsal scenario such as `curious follow-up` or `gentle continue`.
4. Click `copy JSON` and confirm the clipboard contains JSON with:
   - `scenario`
   - `character.label` and `character.mood`
   - `followup.policy`, `followup.tone`, `followup.selectedIndex`, `followup.candidateText`
   - `followup.blockedReasons`
5. Confirm the copy action is user-click-only and does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
6. Confirm the copy action does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 47. Follow-up Rehearsal Copy One-Line v1

Purpose: confirm the follow-up readiness panel can copy a compact single-line rehearsal summary without speaking automatically or changing scheduler state.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Click a rehearsal scenario such as `curious follow-up` or `gentle continue`.
4. Click `copy one-line` and confirm clipboard text contains one line with:
   - `scenario=...`
   - `state=...`
   - `policy=...`
   - `tone=...`
   - `selected=...`
   - `blocked=...`
   - `line=...`
5. Confirm the copy action is user-click-only and does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
6. Confirm the copy action does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 48. Follow-up Rehearsal Panel Organization v1

Purpose: confirm the follow-up readiness panel action area is easier to scan without changing rehearsal or scheduler behavior.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Confirm the title row only contains the panel title and hide action.
4. Confirm rehearsal scenario controls appear under a `preview` group.
5. Confirm copy/export controls appear under a `copy` group and wrap cleanly on narrow windows.
6. Click each rehearsal scenario and confirm the existing local preview behavior still works.
7. Click each copy/export action and confirm it still writes only visible/local debug text to the clipboard.
8. Confirm the UI organization does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
9. Confirm the UI organization does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 49. Follow-up Rehearsal Scenario Compare v1

Purpose: confirm the follow-up readiness panel can compare all local rehearsal scenarios at once without mutating pending follow-up state.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Confirm a scenario comparison block appears below the active preview card.
4. Confirm each rehearsal scenario appears with policy, tone, selected index, and selected local short sentence.
5. Click each rehearsal scenario and confirm the comparison block remains visible and does not require repeated clicks to compare all scenarios.
6. Confirm the comparison block does not write pending state, call `runConversationFollowup`, call `requestAssistantReply`, trigger LLM/fetch/TTS, screenshots, tools, shell, or file access.
7. Confirm the comparison block does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 50. Follow-up Rehearsal Compare Table v1

Purpose: confirm the rehearsal scenario comparison is easier to scan while staying read-only and local.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Confirm the comparison block renders as separated rows rather than one dense text paragraph.
4. Confirm each row separates scenario label, policy, tone/index, and selected local short sentence.
5. Click each rehearsal scenario and confirm the active scenario is marked inline in the comparison.
6. Confirm the comparison table does not write pending state, call `runConversationFollowup`, call `requestAssistantReply`, trigger LLM/fetch/TTS, screenshots, tools, shell, or file access.
7. Confirm the comparison table does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 51. Follow-up Rehearsal Milestone Checkpoint

Purpose: confirm the rehearsal/debug stage is stable enough to stop expanding debug controls and move toward a manual confirmation experience.

Review checks:

1. Confirm Tasks 092-102 are documented as local rehearsal/debug capabilities.
2. Confirm rehearsal helpers and panel controls remain explicit user or DevTools actions.
3. Confirm scenario comparison and copy/export actions do not write pending state except when the user clicks a rehearsal scenario.
4. Confirm rehearsal and comparison UI do not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
5. Confirm the next documented stage is manual confirmation before any automatic follow-up expansion.
6. Confirm automatic follow-up remains default-off and guarded by existing policy, cooldown, scheduler, and window-limit checks.

## 52. Manual Confirmation Flow Design

Purpose: confirm the next follow-up stage requires user approval before execution and keeps automatic behavior out of scope.

Review checks:

1. Confirm the design defines `hidden`, `available`, `blocked`, `approved_pending`, and `dismissed` card states.
2. Confirm the card content includes proposed short sentence, topic/reason, policy, tone/index, guard explanation, and a safety note.
3. Confirm `approve` requires a fresh guard check immediately before execution.
4. Confirm `dismiss` hides the prompt without changing scheduler gates, cooldown, window limits, or config.
5. Confirm `review details` routes users toward existing readiness diagnostics.
6. Confirm no approval means no model request, no TTS, and no follow-up execution.
7. Confirm the design does not add automatic desktop observation, screenshots, tools, shell execution, file access, or config writes.

## 53. Manual Confirmation Preview Card v1

Purpose: confirm the readiness panel can show a local manual confirmation preview without adding execution controls.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Confirm no confirmation preview card appears when there is no pending follow-up candidate.
4. Start a local rehearsal scenario and confirm the confirmation preview card appears.
5. Confirm the card shows proposed short sentence, topic, policy, tone/index, guard explanation, raw blocked reasons, and safety note.
6. Confirm blocked scenarios show `temporarily unavailable` style state rather than an executable approval.
7. Confirm the card does not add approve/dismiss controls yet.
8. Confirm the card does not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, or file access.
9. Confirm the card does not change scheduler gates, polling, cooldown, window limits, config, backend APIs, or pending rehearsal safety gates.

## 54. Manual Confirmation Controls v1

Purpose: confirm manual confirmation preview controls stay UI-only and local before guarded execution wiring.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Ensure there is a pending follow-up candidate (natural pending state or local rehearsal state).
4. Confirm the manual confirmation action group shows `确认`, `忽略`, and `查看详情`.
5. When guard state is passable (`available`), confirm `确认` is enabled; click it and confirm only UI/status feedback appears (no follow-up execution).
6. When guard state is blocked (`blocked`), confirm `确认` is disabled or shown as not confirmable.
7. Click `忽略` and confirm the current confirmation preview card hides locally for the same `topic/policy/candidate` item.
8. Confirm `忽略` does not mutate scheduler gates, polling, cooldown, window limits, pending state, or config.
9. Click `查看详情` and confirm the existing readiness full report area opens/focuses/refreshes.
10. Confirm these controls do not call `runConversationFollowup`, `requestAssistantReply`, LLM/fetch/TTS, screenshots, tools, shell, file access, or backend APIs.

## 55. Manual Confirmation Guarded Execution v1

Purpose: confirm manual confirmation approval executes only through existing guarded follow-up execution and fails closed when guards change.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`.
3. Ensure there is a pending follow-up candidate that passes follow-up, silence, and scheduler guards.
4. Click `确认` and confirm the status enters an executing state.
5. Confirm the execution uses the existing guarded manual follow-up path and does not create a new request path.
6. Confirm pending follow-up is consumed only when execution succeeds; if request execution fails, pending state is restored by the existing path.
7. Create or wait for a blocked state, then click/attempt `确认` and confirm it fails closed with a guard explanation.
8. Confirm `确认` records local debug events for approved or blocked confirmation attempts.
9. Confirm `忽略` and `查看详情` still do not mutate scheduler gates, polling, cooldown, window limits, pending state, or config.
10. Confirm this task does not add automatic follow-up, screenshots, tools, shell, file access, backend APIs, desktop observation, or config writes.

## 56. Manual Confirmation Lifecycle Events v1

Purpose: confirm manual confirmation lifecycle events make the experience inspectable without changing execution behavior.

Manual checks:

1. Start the app in chat view.
2. Open `more -> follow-up status`, then open the TTS/debug event panel.
3. Ensure there is a pending follow-up candidate and confirm one `conversation_followup_manual_confirmation_preview_shown` event appears for the current key/status.
4. Let the readiness panel refresh and confirm preview events do not repeat on every refresh tick.
5. Click `查看详情` and confirm `conversation_followup_manual_confirmation_review_details` appears without changing pending state or scheduler gates.
6. Click `忽略` and confirm `conversation_followup_manual_confirmation_dismissed` appears and the card hides only in local memory for the current item.
7. For an available candidate, click `确认` and confirm `conversation_followup_manual_confirmation_approval_started`, `conversation_followup_manual_confirmation_approved`, and an execution success/failure event appear in order.
8. For a blocked candidate or changed guard state, confirm `conversation_followup_manual_confirmation_blocked` appears and execution fails closed.
9. Confirm event payloads remain compact: topic/status/policy/guard summary only, not full prompts or unrelated private data.
10. Confirm this task does not add automatic follow-up, screenshots, tools, shell, file access, backend APIs, desktop observation, config writes, or new dependencies.

## 57. Manual Confirmation End-to-End Smoke Runbook

Purpose: provide one practical acceptance path for the whole manual confirmation experience before gray automatic follow-up preparation begins.

Preconditions:

1. Start from a clean app session in chat view.
2. Keep automatic proactive follow-up disabled unless a specific later task says otherwise.
3. Keep desktop observation, screenshots, tools, shell execution, file access, and config writes out of scope.
4. Open `more -> follow-up status`; open the TTS/debug event panel when checking lifecycle events.

Happy path:

1. Confirm no manual confirmation card appears when there is no pending follow-up candidate.
2. Start a local rehearsal scenario or create a natural pending candidate.
3. Confirm the manual confirmation card shows the proposed short sentence, topic/reason, policy, tone/index, guard explanation, raw blocked reasons, and safety note.
4. Confirm the action group shows `确认`, `忽略`, and `查看详情`.
5. Confirm `conversation_followup_manual_confirmation_preview_shown` appears once for the current key/status and does not repeat on every panel refresh.
6. When the candidate is available, click `查看详情` and confirm the readiness report opens/focuses without changing pending state.
7. Click `确认` and confirm the UI enters an executing state.
8. Confirm approval re-checks follow-up, silence, and scheduler guards immediately before execution.
9. Confirm execution uses the existing `runConversationFollowupDebug()` path and does not create a new request path.
10. Confirm debug events appear in order: approval started, approved, then execution succeeded or execution failed.

Blocked path:

1. Select or wait for a candidate whose guards are blocked.
2. Confirm `确认` is disabled or shown as not confirmable.
3. Attempt confirmation if the UI allows it and confirm execution fails closed.
4. Confirm `conversation_followup_manual_confirmation_blocked` appears with a compact guard summary.
5. Confirm no automatic model request, TTS, scheduler tick, or pending-state consumption happens from the blocked attempt.

Dismiss path:

1. With a visible confirmation card, click `忽略`.
2. Confirm `conversation_followup_manual_confirmation_dismissed` appears.
3. Confirm the card hides only for the current `topic/policy/candidate` key in local memory.
4. Confirm scheduler gates, polling, cooldown, window limits, pending state, config, and backend APIs are unchanged.
5. Confirm a different pending candidate can show a new confirmation card.

Safety sign-off:

1. Confirm no step adds automatic follow-up.
2. Confirm no step adds desktop observation, screenshots, tool calls, shell execution, file access, config writes, backend APIs, or new dependencies.
3. Confirm event payloads stay compact and do not include full prompts, secrets, user files, screenshots, or unrelated private data.
4. Confirm failed execution restores pending state through the existing guarded follow-up path.
5. Confirm the manual confirmation experience is ready for a checkpoint before gray automatic follow-up work.

## 58. Gray Automatic Follow-up Preparation Checkpoint

Purpose: confirm the project is ready to plan default-off gray automatic follow-up work without enabling automatic behavior yet.

Review checks:

1. Confirm Tasks 104-109 are present in the design notes, smoke checklist, and task docs.
2. Confirm the manual confirmation baseline includes preview, explicit actions, guarded execution, lifecycle events, and an end-to-end smoke runbook.
3. Confirm the manual confirmation smoke runbook has been exercised or is ready to be exercised on a clean app session.
4. Confirm automatic proactive follow-up is still disabled by default.
5. Confirm no automatic trigger can bypass manual confirmation, policy, cooldown, scheduler, busy, speaking, closed-topic, or window-limit guards.
6. Confirm blocked candidates cannot trigger model requests, TTS, scheduler ticks, or pending-state consumption.
7. Confirm failed guarded execution restores pending state through the existing follow-up path.
8. Confirm debug event payloads remain compact and do not include full prompts, secrets, screenshots, files, or unrelated private data.
9. Confirm next-stage work is limited to default-off gray-mode flags, read-only status surfaces, dry-run scheduler checks, and additional smoke checks.
10. Confirm next-stage work does not add desktop observation, screenshots, tool calls, shell execution, file access, config writes, backend APIs, new dependencies, or mature-product claims.

## 59. Gray Automatic Follow-up Default-off Gate v1

Purpose: confirm `conversation_mode.gray_auto_enabled` gates automatic polling while preserving manual confirmation.

Manual checks:

1. Confirm `config.example.json` contains `conversation_mode.gray_auto_enabled=false`.
2. Start with `enabled=true`, `proactive_enabled=true`, `proactive_scheduler_enabled=true`, and `gray_auto_enabled=false`.
3. Reload the app and confirm `window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler.pollTimerActive=false`.
4. Confirm `window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler.pollingBlockedReasons` includes `gray_auto_disabled`.
5. Open `more -> follow-up status` and confirm the readiness report shows gray automatic follow-up as disabled/default-off.
6. Confirm manual confirmation preview, `确认`, `忽略`, and `查看详情` remain usable for explicit user-confirmed follow-up.
7. Copy the config template and confirm it includes `gray_auto_enabled=false`.
8. Set `gray_auto_enabled=true` only in a local test config, reload, and confirm polling can start only if the other three switches are also true.
9. Confirm turning any one of the four switches off stops automatic polling.
10. Confirm this task does not add desktop observation, screenshots, tool calls, shell execution, file access, config writes, backend APIs, model calls, speech, or new dependencies.
