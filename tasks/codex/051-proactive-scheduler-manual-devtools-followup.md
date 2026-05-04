# Task 051: Proactive scheduler manual DevTools follow-up

## Background

- Task 049 and Task 050 launched Electron successfully but could not directly drive the chat DevTools Console from the terminal-only automation context.
- The remaining evidence gap was the same-session runtime event timeline, especially kill-switch stop behavior.

## Scope

- No feature expansion.
- No dependency changes.
- No default security setting changes.
- No committed local sensitive config.
- Record manually observed DevTools runtime evidence.

## Runtime Evidence Captured

### Default-off

- `schedulerEnabled=false`
- `conversationEnabled=false`
- `proactiveEnabled=false`
- `pollingEnabled=false`
- `pollTimerActive=false`
- `pollLastResult=disabled`
- `blockedReasons` included:
  - `conversation_disabled`
  - `proactive_disabled`
  - `scheduler_disabled`
- Event observed:
  - `proactive_scheduler_poll_blocked`

Result: pass

### Three-switch polling startup

Local-only `config.local.json` override enabled:

- `conversation_mode.enabled=true`
- `conversation_mode.proactive_enabled=true`
- `conversation_mode.proactive_scheduler_enabled=true`

Observed:

- `proactive_scheduler_poll_start`
- `result=interval_ms:60000`
- `pollingEnabled=true`
- `pollTimerActive=true`

Follow-up polling checks then blocked on expected readiness reasons:

- `warmup_active`
- `no_pending_followup`
- `empty_topic_hint`
- `no_tts_finished_timestamp`

Result: pass

### Kill-switch runtime timeline

Procedure:

1. Start with polling active.
2. Change local-only `config.local.json` to `proactive_scheduler_enabled=false`.
3. Call backend reload with `X-Taffy-Token`.
4. Call `await loadConfig()` in chat DevTools Console to sync frontend state.
5. Inspect scheduler snapshot and recent debug events.

Observed event order:

1. `proactive_scheduler_poll_start` / `interval_ms:60000`
2. `proactive_scheduler_poll_blocked` / readiness reasons
3. `proactive_scheduler_poll_stop` / `sync_disabled:scheduler_disabled`
4. `proactive_scheduler_poll_blocked` / `scheduler_disabled`

Result: pass

## Remaining Partial Item

Exception fail-closed runtime timeline remains partial:

- No safe DevTools-only exception injection hook is currently exposed.
- No unsafe monkey patch, source edit, or test-only bypass was used.
- Prior static review still confirms `poll_exception_fail_closed`, but live `poll_failed` event ordering remains uncollected.

## Overall Result

Overall result: partial

Improvement from Task 050:

- Default-off runtime evidence is captured.
- Three-switch polling startup is captured.
- Kill-switch runtime stop timeline is captured.

Remaining residual risk:

- Exception fail-closed live event timeline remains uncollected.

## Rollback Suggestion

Disable any key switch to stop polling:

- `conversation_mode.enabled=false`
- `conversation_mode.proactive_enabled=false`
- `conversation_mode.proactive_scheduler_enabled=false`

For same-session validation, backend config reload must be followed by frontend config sync (`await loadConfig()`) or a page reload.
