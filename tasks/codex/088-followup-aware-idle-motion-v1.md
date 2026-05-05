# Task 088: Follow-up-aware idle motion v1

## Background

The follow-up character chip and runtime hint now make the character state visible. The next step is to let existing idle motion feel slightly more connected to that state while preserving the safe, low-interruption posture.

## Goal

Make the existing idle motion loop choose a subtle motion context based on the local follow-up character state.

## Scope

- Allow idle action plans to accept safe local `idleIntent` and `idleMood` context.
- Add `buildFollowupAwareIdleMotionContext()`.
- Use that context in the existing `scheduleIdleMotionLoop()` idle enqueue path.
- Keep all existing skip conditions: no motion while busy, speaking, dragging, or when motion/idle is disabled.

## State mapping

- `有点想接话`: thinking-leaning idle motion.
- `观察气氛` / `等你缓一会儿`: softer thinking-leaning idle motion.
- `识趣闭麦` / `冷却中` / `今天先收一收`: steadier idle motion.
- Fallback: normal idle motion.

## Non-goals

- Do not trigger follow-up execution.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.
- Do not add a new motion timer; reuse the existing idle motion loop.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

```js
window.__AI_CHAT_DEBUG_TTS__.followupAwareIdleMotionContext()
```

1. Start the app with Live2D enabled.
2. Confirm idle motion still respects existing idle interval settings.
3. Confirm chat busy/speaking/dragging still skips idle motion.
4. Confirm no automatic follow-up, LLM request, TTS, screenshot, tool call, shell command, or file read is triggered.
