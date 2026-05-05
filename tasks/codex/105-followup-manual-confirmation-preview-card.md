# Task 105: Follow-up manual confirmation preview card

## Background

Task 104 defined the manual confirmation flow. The first implementation step is a preview-only confirmation card that shows what would be confirmed later, without adding approve/dismiss execution controls yet.

## Goal

Add a local manual confirmation preview card to the follow-up readiness panel.

## Scope

- Show the card only when a pending follow-up candidate exists.
- Show:
  - proposed short sentence
  - topic hint
  - policy
  - selected tone/index
  - friendly guard explanation
  - raw blocked reasons
  - safety note
- Hide the card when there is no pending candidate.
- Keep the card preview-only.

## Safety posture

- No approve/dismiss controls in this task.
- No follow-up execution.
- No model, fetch, TTS, scheduler, config, desktop observation, screenshot, file, shell, or tool behavior changes.

## Non-goals

- Do not call `runConversationFollowup()`.
- Do not call `requestAssistantReply`.
- Do not add automatic follow-up.
- Do not change cooldown, polling, scheduler gates, or window limits.
- Do not write pending state from the confirmation card itself.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Open `更多 -> 续话状态`.
2. Confirm the confirmation preview card is hidden without a pending candidate.
3. Start a local rehearsal scenario.
4. Confirm the card appears and shows candidate text, topic, policy, tone/index, guard explanation, blocked reasons, and safety note.
5. Confirm no approval/execution controls exist yet.
6. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, pending-state write, or scheduler behavior change occurs from the card itself.
