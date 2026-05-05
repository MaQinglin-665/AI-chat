# Task 083: Follow-up character preview v1

## Background

Task 082 added character cues for proactive follow-up prompt drafts. To make the behavior easier to tune without waiting for an actual scheduler trigger or LLM response, the readiness/debug surface should show a local example line.

## Goal

Expose a local-only follow-up character preview line derived from the current follow-up policy and topic hint.

## Scope

- Add `buildConversationFollowupCharacterPreview()`.
- Include `characterPreview` in:
  - `conversationFollowup()` debug view
  - `previewConversationFollowupPolicy()`
  - `snapshot().followup`
  - the read-only follow-up readiness report
- Keep the preview short, Chinese-first, low-pressure, and desktop-pet flavored.

## Non-goals

- Do not call the LLM.
- Do not trigger follow-up execution.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, fetch, TTS, or config writes.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected:

- `characterPreview` is a short Chinese line.
- `characterCue` remains present.
- Preview does not execute follow-up or call the LLM.
