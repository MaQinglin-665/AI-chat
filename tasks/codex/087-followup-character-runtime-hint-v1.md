# Task 087: Follow-up character runtime hint v1

## Background

Tasks 084-086 made follow-up character state visible in the readiness panel and chat header. The next small step toward a more alive desktop pet is to let state changes emit a low-frequency local runtime hint for Live2D/expression handling.

## Goal

Emit a guarded, local-only character runtime metadata hint when the follow-up character status tone changes.

## Scope

- Map chip `data-tone` to safe runtime metadata:
  - `ready`: thinking + think
  - `waiting` / `watching`: thinking + none
  - `cooldown` / `limit` / `quiet` / `idle`: neutral + none
- Emit only when tone changes and at least 30 seconds passed since the previous hint.
- Reuse existing `handleCharacterRuntimeMetadata()` runtime bridge.
- Add DevTools visibility via `followupCharacterRuntimeHint()`.
- Add compact debug event `followup_character_runtime_hint`.

## Non-goals

- Do not trigger follow-up execution.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.
- Do not emit repeated motion hints every refresh tick.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

```js
window.__AI_CHAT_DEBUG_TTS__.followupCharacterRuntimeHint()
window.__AI_CHAT_DEBUG_TTS__.events().filter(e => e.type === "followup_character_runtime_hint")
```

Expected:

- Runtime hint state is visible.
- Events are compact and contain no long prompt or private content.
- No follow-up execution, LLM request, TTS, screenshot, tool call, shell command, or file read is triggered.
