# Task 093: Follow-up rehearsal panel controls v1

## Background

Task 092 added a DevTools-only rehearsal helper for holding a local pending follow-up state. That improves testing, but it still requires Console commands. The next practical step is to expose the same safe rehearsal path in the existing follow-up readiness panel.

## Goal

Add manual rehearsal controls to the follow-up readiness panel so character follow-up UI can be tested quickly without DevTools commands.

## Scope

- Add a `预演` button to the follow-up readiness panel.
- Add a `清除预演` button to restore the previous local pending state.
- Reuse the Task 092 rehearsal helper path.
- Show rehearsal status in the read-only readiness report:
  - active/inactive
  - whether rehearsal is currently allowed
  - blocked reason when fail-closed
- Keep the compact panel workflow useful for tuning chip, tooltip, selected reaction, and idle-motion behavior.

## Safety posture

- Rehearsal remains local/in-memory only.
- Rehearsal fails closed if polling is active or all automatic scheduler switches are enabled together.
- Buttons do not write config and do not persist state.

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

1. Open the chat view.
2. Click `续话状态`.
3. Click `预演`.
4. Confirm the panel reports rehearsal active and the chip/tooltip reflects the selected local reaction.
5. Click `清除预演`.
6. Confirm the previous local pending state is restored.
7. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
