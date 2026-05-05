# Task 100: Follow-up rehearsal panel organization v1

## Background

Tasks 093 through 098 added useful rehearsal and copy actions to the follow-up readiness panel. The controls now work, but the title row has become crowded and harder to scan.

## Goal

Reorganize the follow-up rehearsal panel actions into clearer groups without changing behavior.

## Scope

- Keep the title row focused on the panel title and hide action.
- Move rehearsal scenario controls into a `预演` action group.
- Move copy/export controls into a `复制` action group.
- Allow grouped actions to wrap cleanly inside the existing panel width.

## Safety posture

- This is UI organization only.
- Existing buttons keep their explicit user-click behavior.
- No config writes, no persistent state changes, no backend requests.

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
2. Confirm the title row contains only the panel title and hide action.
3. Confirm rehearsal scenario buttons are grouped under `预演`.
4. Confirm copy/export buttons are grouped under `复制`.
5. Confirm rehearsal and copy actions still behave as before.
6. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
