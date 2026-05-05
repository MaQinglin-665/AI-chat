# Task 084: Follow-up character state v1

## Background

The readiness panel now exposes follow-up gates, character cues, and local preview copy. To make the desktop-pet behavior easier to understand, the UI should also summarize what the character is "doing" in human terms.

## Goal

Add a local-only follow-up character state label for the readiness panel and DevTools diagnostics.

## Scope

- Add `buildFollowupCharacterState()`.
- Show character state in the read-only follow-up readiness report.
- Expose `window.__AI_CHAT_DEBUG_TTS__.followupCharacterState()`.
- Keep labels Chinese-first and user-friendly.

## State examples

- `安静陪伴`: no pending follow-up.
- `识趣闭麦`: topic looks closed.
- `有点想接话`: all follow-up/silence/scheduler gates are ready.
- `冷却中`: scheduler cooldown is active.
- `今天先收一收`: current window limit reached.
- `等你缓一会儿`: silence window is not ready.
- `观察气氛`: pending exists but some guard is not ready.

## Non-goals

- Do not trigger follow-up execution.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

```js
window.__AI_CHAT_DEBUG_TTS__.followupCharacterState()
```

Expected:

- Returns `{ label, mood, description }`.
- Does not trigger follow-up or mutate scheduler state.
