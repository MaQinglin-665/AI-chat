# Task 102: Follow-up rehearsal compare table v1

## Background

Task 101 added a read-only scenario comparison block to the follow-up rehearsal panel. The plain text output is useful, but still dense when comparing policy, tone, selected index, and copy across scenarios.

## Goal

Upgrade the scenario comparison block into a more scannable table-like local UI.

## Scope

- Reuse the scenario comparison data from existing local policy/reaction helpers.
- Render one row per rehearsal scenario.
- Separate scenario label, policy, tone/index, and selected short sentence into columns.
- Mark the currently active rehearsal scenario inline.
- Keep the comparison block read-only.

## Safety posture

- This is read-only local UI.
- The comparison table does not write pending follow-up state.
- The comparison table does not execute follow-up, speak, fetch, call the model, or change scheduler state.

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
2. Confirm the comparison area shows separated rows/columns.
3. Confirm all rehearsal scenarios appear with policy/tone/index/short sentence.
4. Click each rehearsal scenario and confirm the active scenario is marked inline.
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, pending-state write, or scheduler behavior change occurs from the comparison table itself.
