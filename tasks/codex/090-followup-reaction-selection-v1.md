# Task 090: Follow-up reaction selection v1

## Background

Task 089 added a local-only follow-up reaction candidate pool. The next useful step is to make the preview choose a candidate through an explicit, inspectable selection policy instead of always showing the first candidate.

## Goal

Add a read-only local selection layer for follow-up reaction candidates.

## Scope

- Add `selectConversationFollowupReactionCandidate()`.
- Keep `characterPreview` derived from the selected candidate.
- Expose the selected candidate and selection metadata through:
  - `conversationFollowup()`
  - `previewConversationFollowupPolicy()`
  - `previewConversationFollowupReactions()`
  - `snapshot().followup`
  - the read-only follow-up readiness report
- Keep the selection simple, deterministic, and easy to tune.

## Selection policy v1

- `do_not_followup` prefers `quiet`.
- `light_question` or a question-like reason prefers `curious`.
- `soft_checkin` prefers `soft`.
- long silence, currently 10 minutes or more, softens to `soft`.
- otherwise prefer `gentle`.
- if no preferred tone exists, fall back to the first candidate and expose the fallback reason.

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

- `selected.reason` is visible.
- `selected.preferredTone` is visible.
- `preview` matches `selected.candidate.text`.
- The helper does not execute follow-up or call the LLM.
