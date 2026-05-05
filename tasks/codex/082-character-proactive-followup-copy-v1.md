# Task 082: Character proactive follow-up copy v1

## Background

The follow-up scheduler is now guarded, default-off, and visible from the Chinese readiness panel. The next useful step is to make proactive follow-up feel more like a desktop character instead of a generic system message.

## Goal

Add a small local character cue layer for proactive follow-up prompt drafts.

The cue should help the model produce one short, low-interruption Chinese follow-up line with a warmer desktop-pet tone.

## Scope

- Add a local helper that maps follow-up policy to character tone hints.
- Include character cue information in follow-up debug views and TTS debug snapshot.
- Add prompt draft instructions for Chinese-first, short, natural follow-up copy.
- Add optional character runtime metadata hints.
- Surface the current cue in the read-only follow-up readiness report.

## Non-goals

- Do not enable proactive follow-up by default.
- Do not change scheduler gates, cooldown, window limits, or polling lifecycle.
- Do not add screenshot, desktop observation, tool calls, shell execution, or file reads.
- Do not add dependencies.
- Do not write to config.local.json automatically.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

In DevTools, inspect:

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "question_tail",
  topicHint: "我们刚才聊到桌宠主动续话"
})
```

Expected:

- `characterCue` exists.
- `promptDraft` asks for one short, low-interruption Chinese follow-up.
- Prompt keeps the existing safety boundaries: no desktop guessing, no file access, no tool calls.
