# Task 056: Proactive follow-up content polish

## Background

Tasks 040~055 closed the guarded proactive scheduler path and runtime fail-closed checks.
The next safe improvement is to polish the proactive follow-up prompt seed itself, without
expanding scheduler behavior or permissions.

## Goal

1. Keep the existing trigger path unchanged.
2. Make proactive follow-up wording feel more like a gentle character continuation than a system notification.
3. Keep generated follow-up short, optional, and low-pressure.
4. Re-state safety boundaries in the prompt seed:
   - no desktop/screen observation
   - no file or private data access
   - no tool calls

## Scope

- `web/chat.js`
  - Update only `buildConversationFollowupPromptDraft(plan)` wording.
- Documentation
  - Record Task 056 landing notes and smoke expectations.

## Non-goals

1. Do not add timers, listeners, APIs, dependencies, or UI.
2. Do not change config defaults.
3. Do not change scheduler gate, polling lifecycle, kill-switch behavior, or fail-closed hook behavior.
4. Do not add a new `requestAssistantReply` call path.
5. Do not add screenshot, tool-calling, shell execution, or file-reading behavior.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`

## Manual smoke suggestion

In DevTools, construct an eligible follow-up plan and inspect:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup().promptDraft
```

Expected:

1. The draft says this is low-interruption proactive continuation, not a system notification.
2. The draft asks for one short, optional continuation or light follow-up question.
3. The draft discourages pressure, repeated questioning, and long explanations.
4. The draft explicitly forbids desktop/screen/file/private-data access and tool calls.

