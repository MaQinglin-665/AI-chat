# Task 061: Follow-up policy debug events

## Background

Tasks 057~060 made follow-up policy visible in preview helpers and debug snapshots. During
polling/manual event timeline review, contributors still had to correlate separate snapshot
calls to know which follow-up policy was active when an event was recorded.

## Goal

Add follow-up policy context to existing debug events without changing event names or trigger behavior.

## Implementation

- Add `getConversationFollowupPolicyDebugText(view)`.
- Include policy context in existing event payloads for:
  - `conversation_followup_*`
  - `conversation_silence_followup_*`
  - `proactive_scheduler_poll_blocked`
  - `proactive_scheduler_poll_ready`
  - `proactive_scheduler_poll_trigger_*`
- Use the existing event `error` field for compact diagnostic context so `result` semantics remain unchanged.

## Safety boundaries

1. Does not add new timers, listeners, APIs, config flags, dependencies, UI, or event names.
2. Does not change scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, or fail-closed behavior.
3. Does not call `requestAssistantReply` from a new path.
4. Does not call LLM, fetch, TTS, tools, screenshot capture, shell execution, or file access.
5. Does not mutate follow-up state.

## Manual smoke

In DevTools:

```js
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

Expected:

1. Follow-up related events still use the same event names as before.
2. `result` keeps the original blocked/ready/trigger reason.
3. `error` may include compact policy context such as:
   - `gentle_continue:...`
   - `light_question:...`
   - `soft_checkin:...`
   - `do_not_followup:...`

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
