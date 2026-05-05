# Task 091: Follow-up selected reaction chip hint v1

## Background

Task 090 made the selected follow-up reaction inspectable in DevTools and the readiness report. The next safe UI step is to surface that selected reaction as a lightweight chip hint, so the desktop pet feels like it has a small thought ready without speaking automatically.

## Goal

Expose the selected follow-up reaction through the existing character status chip tooltip and data attributes.

## Scope

- Pass `selectedReaction` into `getFollowupCharacterStateDebugView()`.
- Add `buildFollowupCharacterChipTitle()`.
- Include the selected candidate text and selection metadata in the chip `title` and `aria-label`.
- Add chip dataset fields:
  - `data-selected-tone`
  - `data-selected-index`

## Non-goals

- Do not show the full selected sentence directly in the compact chip text.
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

1. Start the app in chat view.
2. Hover the follow-up character chip.
3. Confirm the tooltip can include the selected reaction when one exists.
4. Inspect the chip and confirm `data-selected-tone` and `data-selected-index` are present.
5. Confirm the chip remains read-only and does not trigger speech or follow-up execution.
