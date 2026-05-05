# Task 086: Follow-up character chip visual state v1

## Background

Task 085 added a local-only character status chip to the chat header. The chip is useful, but all states currently look the same. A subtle color tone makes the pet state easier to read at a glance.

## Goal

Add visual tones to the follow-up character status chip.

## Scope

- Map the local character state label to a stable `data-tone` value.
- Style chip tones:
  - `ready`: soft green
  - `cooldown` / `limit` / `waiting`: soft yellow
  - `quiet`: soft gray
  - `watching`: soft blue-violet
  - `idle`: default blue
- Keep all behavior read-only and fail-quiet.

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

1. Start the app in chat view.
2. Confirm the chip still shows a label like `安静陪伴 · idle`.
3. Inspect the chip and confirm it has `data-tone`.
4. Confirm the chip remains read-only and does not trigger any proactive behavior.
