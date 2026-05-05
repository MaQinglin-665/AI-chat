# Task 092: Follow-up pending rehearsal v1

## Background

The follow-up character chip, selected reaction, and idle-motion hints are now visible, but testing them still requires a natural conversation to land in a pending follow-up state. Task 069 has a temporary fixture that restores immediately, which is useful for policy checks but not for observing the UI over time.

## Goal

Add a DevTools-only local rehearsal helper that can keep a pending follow-up state active long enough to inspect the chip, tooltip, selected reaction, and idle-motion context.

## Scope

- Add `rehearseConversationFollowupPending(input)` to the existing debug bridge.
- Add `clearConversationFollowupRehearsal()` to restore the previous pending state.
- Store only in-memory rehearsal state.
- Update the follow-up character chip after setting or clearing rehearsal state.
- Record compact debug events:
  - `conversation_followup_rehearsal_set`
  - `conversation_followup_rehearsal_cleared`
  - `conversation_followup_rehearsal_blocked`

## Safety posture

The helper fails closed if:

- proactive polling is already active
- all automatic scheduler switches are enabled together

## Non-goals

- Do not call `runConversationFollowup()`.
- Do not trigger follow-up execution.
- Do not call `requestAssistantReply`.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.
- Do not persist rehearsal state.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

```js
window.__AI_CHAT_DEBUG_TTS__.rehearseConversationFollowupPending({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Then inspect:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.followupCharacterState()
window.__AI_CHAT_DEBUG_TTS__.followupAwareIdleMotionContext()
window.__AI_CHAT_DEBUG_TTS__.clearConversationFollowupRehearsal()
```

Expected:

- pending follow-up state is visible while rehearsal is active.
- chip/tooltip can be inspected without waiting for a real conversation.
- clearing rehearsal restores the previous pending state.
- no assistant request, speech, screenshot, tool call, shell command, file read, or config write occurs.
