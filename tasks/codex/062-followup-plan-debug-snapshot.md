# Task 062: Follow-up plan debug snapshot

## Background

Task 060 exposed follow-up policy fields in `snapshot().followup`. The same snapshot still
did not show whether the current pending follow-up plan was eligible or why it was blocked.
Contributors had to call `conversationFollowup()` separately to answer that.

## Goal

Expose current follow-up plan eligibility in the existing TTS debug snapshot.

## Implementation

- Extend `window.__AI_CHAT_DEBUG_TTS__.snapshot().followup` with:
  - `eligible`
  - `blockedReasons`
- Reuse `buildConversationFollowupDebugPlan(...)`.

## Safety boundaries

1. Read-only snapshot change only.
2. Does not mutate follow-up state.
3. Does not call `requestAssistantReply`.
4. Does not call LLM, fetch, TTS, tools, screenshot capture, shell execution, or file access.
5. Does not change scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, fail-closed behavior, config defaults, APIs, dependencies, or UI.

## Manual smoke

In DevTools:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
```

Expected:

1. Existing fields remain present.
2. New fields are present:
   - `eligible`
   - `blockedReasons`
3. Default-off or non-ready states include readable blocked reasons such as:
   - `conversation_disabled`
   - `proactive_disabled`
   - `no_pending_followup`
   - `empty_topic_hint`
   - `silence_window_not_reached`

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
