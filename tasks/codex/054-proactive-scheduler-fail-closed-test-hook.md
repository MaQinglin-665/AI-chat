# Task 054: Proactive scheduler fail-closed test hook

## Background

- Task 053 documented a safe design for exception fail-closed runtime validation.
- The remaining validation gap was live event ordering for `proactive_scheduler_poll_failed` and `poll_exception_fail_closed`.

## Scope

- Implement a DevTools/debug-bridge-only one-shot failure injection hook.
- Do not add backend APIs.
- Do not add config flags.
- Do not change default behavior.
- Do not call `requestAssistantReply`.
- Do not add screenshot, tool-calling, shell, or file-reading paths.

## Implementation

Added debug bridge methods under `window.__AI_CHAT_DEBUG_TTS__`:

- `injectProactiveSchedulerPollFailureOnce(reason)`
- `getProactiveSchedulerFailureInjectionState()`
- `clearProactiveSchedulerFailureInjection()`

Behavior:

1. Injection is stored only in the current page memory.
2. The next `runProactiveSchedulerPollingCheck()` consumes the injection before normal polling work.
3. The injected failure throws into the existing polling `catch` block.
4. Existing fail-closed behavior handles the failure:
   - `proactivePollLastResult=failed`
   - `stopProactiveSchedulerPolling("poll_exception_fail_closed")` if the timer is active
   - `proactive_scheduler_poll_failed`
5. The injection clears automatically after one consumption.

Additional debug events:

- `proactive_scheduler_poll_failure_injected`
- `proactive_scheduler_poll_failure_injection_consumed`
- `proactive_scheduler_poll_failure_injection_cleared`

## Expected Manual Validation

From chat DevTools Console:

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

- `proactive_scheduler_poll_failure_injection_consumed`
- `proactive_scheduler_poll_stop` with `poll_exception_fail_closed` if timer was active
- `proactive_scheduler_poll_failed`
- injection state becomes inactive

## Safety Notes

- Default behavior is unchanged unless the debug bridge method is manually called.
- The hook is not exposed as a remote API.
- The hook is not persisted in config.
- Page reload clears any pending injection.
- The hook does not trigger assistant replies, screenshots, tool calls, shell commands, or file reads.

## Rollback

- Remove the debug bridge methods and helper functions.
- Close the debug bridge or close any proactive switch to stop polling.
