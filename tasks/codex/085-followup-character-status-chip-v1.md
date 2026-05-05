# Task 085: Follow-up character status chip v1

## Background

Task 084 made the follow-up character state visible in the readiness panel and DevTools. The main chat UI should also show a tiny, always-visible status chip so the desktop pet feels more alive without opening debug panels.

## Goal

Add a local-only follow-up character status chip to the chat header.

## Scope

- Add `#followup-character-chip` to the chat header.
- Style it as a lightweight status capsule.
- Refresh it from `followupCharacterState()` data every 2 seconds.
- Update it when the readiness panel is toggled.

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

1. Start the chat UI.
2. Confirm the header shows a chip like `安静陪伴 · idle`.
3. Open `更多 -> 续话状态` and confirm the chip remains read-only.
4. Confirm no automatic follow-up, LLM request, TTS, screenshot, or tool call is triggered by the chip.
