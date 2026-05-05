# Task 089: Follow-up reaction candidates v1

## Background

The follow-up character state, preview, chip, runtime hints, and idle motion context now make the desktop pet feel more present. The next safe step is to provide a local reaction candidate pool for tuning character-style follow-up copy without automatically speaking.

## Goal

Add local-only short reaction candidates for follow-up preview and debugging.

## Scope

- Add `buildConversationFollowupReactionCandidates()`.
- Keep `characterPreview` derived from the first candidate.
- Expose candidates through:
  - `conversationFollowup()`
  - `previewConversationFollowupPolicy()`
  - `snapshot().followup`
  - `previewConversationFollowupReactions()`
  - the read-only follow-up readiness report
- Keep candidates short, Chinese-first, low-pressure, and desktop-pet flavored.

## Non-goals

- Do not trigger follow-up execution.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.
- Do not automatically speak candidate text.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupReactions({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected:

- Returns several short Chinese candidates.
- Does not execute follow-up or call the LLM.
