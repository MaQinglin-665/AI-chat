# Task 101: Follow-up rehearsal scenario compare v1

## Background

The follow-up rehearsal panel can preview and copy one active scenario at a time. After the action groups from Task 100, the next useful step is reducing click-heavy comparison work when tuning the local follow-up copy.

## Goal

Show all local rehearsal scenarios in one read-only comparison block.

## Scope

- Add a scenario comparison block below the active preview card.
- Show each scenario's:
  - label
  - policy
  - preferred tone
  - selected index
  - selected local short sentence
- Compute comparison data from existing local policy/reaction helpers.
- Refresh the comparison with the existing readiness panel refresh loop.

## Safety posture

- This is read-only local preview UI.
- The comparison does not write pending follow-up state.
- The comparison does not execute follow-up, speak, fetch, call the model, or change scheduler state.

## Non-goals

- Do not trigger follow-up execution.
- Do not call `runConversationFollowup()`.
- Do not call `requestAssistantReply`.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Open `更多 -> 续话状态`.
2. Confirm the scenario comparison block appears below the active preview card.
3. Confirm all rehearsal scenarios appear with policy/tone/index/short sentence.
4. Click each rehearsal scenario and confirm the comparison remains read-only and visible.
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, pending-state write, or scheduler behavior change occurs from the comparison block itself.
