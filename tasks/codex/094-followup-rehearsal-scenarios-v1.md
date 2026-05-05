# Task 094: Follow-up rehearsal scenarios v1

## Background

Task 093 added a single manual rehearsal button to the follow-up readiness panel. It is useful, but tuning character behavior is faster when common follow-up moods can be compared side by side.

## Goal

Upgrade the follow-up readiness panel rehearsal control from one fixed example into multiple safe local scenarios.

## Scope

- Add local rehearsal scenarios:
  - `好奇追问`
  - `温柔接话`
  - `收口安静`
- Track the active rehearsal scenario id in memory.
- Show the active scenario label in the readiness report.
- Generate one button per scenario in the readiness panel.
- Keep `清除预演` restoring the previous pending state and clearing the scenario id.

## Safety posture

- Rehearsal remains manual and local/in-memory only.
- Rehearsal still reuses the Task 092 fail-closed guard.
- Scenarios do not write config, call the backend, or persist state.

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
2. Click `好奇追问` and confirm policy/selected reaction look like a light question.
3. Click `温柔接话` and confirm the selected tone becomes softer.
4. Click `收口安静` and confirm policy becomes quiet/do-not-follow-up style.
5. Click `清除预演` and confirm the previous local pending state is restored.
6. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
