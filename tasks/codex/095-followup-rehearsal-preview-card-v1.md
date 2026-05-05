# Task 095: Follow-up rehearsal preview card v1

## Background

Task 094 added multiple local rehearsal scenarios to the follow-up readiness panel. The panel still requires reading the full debug report to compare scenario output. A compact preview card makes tuning faster.

## Goal

Add a compact follow-up rehearsal preview card above the full readiness report.

## Scope

- Add a dedicated preview card node to the follow-up readiness panel.
- Show compact scenario/status information:
  - active scenario label
  - character state and mood
  - policy and selected tone/index
  - selected local reaction text
  - blocked reasons and safety note
- Refresh the card with the same panel refresh loop as the full report.
- Keep the full read-only report below the card.

## Safety posture

- The card is read-only display only.
- It reads existing local debug state already available in the panel.
- It does not write config, call the backend, or persist state.

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
2. Confirm a compact card appears above the full report.
3. Click each rehearsal scenario and confirm the card updates scenario, policy, tone, and selected sentence.
4. Click `清除预演` and confirm the card returns to the non-rehearsal state.
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
