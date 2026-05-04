# Task 055: Proactive scheduler fail-closed runtime smoke

## Background

- Task 054 added the DevTools-only one-shot proactive scheduler poll failure hook.
- This task records the same-session Electron/DevTools runtime smoke result for the previously partial exception fail-closed timeline.

## Scope

- Runtime validation and documentation only.
- No runtime code changes.
- No dependency changes.
- No default config changes.
- No committed local sensitive config.

## Runtime Setup

- Branch: `codex/proactive-scheduler-fail-closed-runtime-smoke`
- Baseline: `origin/main` after PR #79
- Local-only test config:
  - `conversation_mode.enabled=true`
  - `conversation_mode.proactive_enabled=true`
  - `conversation_mode.proactive_scheduler_enabled=true`
  - `conversation_mode.proactive_poll_interval_ms=30000`
- Electron launched with DevTools available.

## Manual DevTools Commands

```js
window.__AI_CHAT_DEBUG_TTS__.injectProactiveSchedulerPollFailureOnce("manual_task_055")
window.__AI_CHAT_DEBUG_TTS__.getProactiveSchedulerFailureInjectionState()
```

After the next polling check:

```js
JSON.stringify(window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler, null, 2)
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30).map(e => ({
  seq: e.seq,
  stage: e.stage,
  result: e.result,
  error: e.error,
  text: e.text
}))
```

## Observed Event Order

| Seq | Stage | Result / Error |
| --- | --- | --- |
| 1 | `proactive_scheduler_poll_start` | `interval_ms:30000` |
| 2-4 | `proactive_scheduler_poll_blocked` | `warmup_active` |
| 5 | `proactive_scheduler_poll_blocked` | `no_pending_followup,empty_topic_hint,no_tts_finished_timestamp` |
| 6 | `proactive_scheduler_poll_failure_injected` | `manual_task_055` |
| 7 | `proactive_scheduler_poll_failure_injection_consumed` | `manual_task_055` |
| 8 | `proactive_scheduler_poll_stop` | `poll_exception_fail_closed` |
| 9 | `proactive_scheduler_poll_failed` | `poll_exception` / `manual_task_055` |

## Observed Snapshot

- `schedulerEnabled=true`
- `conversationEnabled=true`
- `proactiveEnabled=true`
- `pollingEnabled=true`
- `pollIntervalMs=30000`
- `pollTimerActive=false` after fail-closed stop
- `eligibleForSchedulerTick=true`

## Result

Result: pass

The live exception fail-closed event ordering is now captured:

- One-shot injection was active.
- The next polling check consumed the injection.
- The timer stopped with `poll_exception_fail_closed`.
- The failed poll event was recorded as `proactive_scheduler_poll_failed`.
- No assistant reply, screenshot, tool call, shell execution, or file read was triggered by the hook.

## Residual Risk

- None for the specific exception fail-closed event ordering covered by this smoke.
- Broader proactive behavior remains guarded by default-off config and the existing three-switch gate.

## Rollback

- Remove the Task 054 debug bridge hook if needed.
- Disable any proactive scheduler switch:
  - `conversation_mode.enabled=false`
  - `conversation_mode.proactive_enabled=false`
  - `conversation_mode.proactive_scheduler_enabled=false`
