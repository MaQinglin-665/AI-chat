# Task 064: Follow-up policy silence smoke

## Background

Task 063 applied `do_not_followup` policy to silence eligibility. Task 064 records a small
local smoke run to confirm closed-topic hints fail closed before polling can report ready.

## Goal

1. Verify closed-topic hints block `buildConversationSilenceDebugSnapshot(...)`.
2. Confirm the same closed-topic hint blocks `buildConversationFollowupDebugPlan(...)`.
3. Record the result in `docs/character-runtime-validation-log.md`.

## Smoke setup

The local Node smoke extracted the relevant pure helper block from `web/chat.js` and supplied
mock state:

```text
conversation_mode.enabled=true
conversation_mode.proactive_enabled=true
conversation_mode.proactive_scheduler_enabled=true
followupPending=true
followupReason=followup_pending
followupTopicHint=先这样，晚安
silenceFollowupMinMs=30000
lastUserAgeMs=60000
lastTtsFinishedAgeMs=60000
chatBusy=false
speaking=false
```

## Observed result

| Check | Observed |
| --- | --- |
| `silence.silenceWindowReached` | `true` |
| `silence.followupPolicy` | `do_not_followup` |
| `silence.eligibleForSilenceFollowup` | `false` |
| `silence.blockedReasons` | `policy_do_not_followup` |
| `plan.followupPolicy` | `do_not_followup` |
| `plan.eligible` | `false` |
| `plan.blockedReasons` | `policy_do_not_followup` |

## Result

Pass.

## Safety notes

1. The smoke used local helper execution only.
2. No `requestAssistantReply` path was called.
3. No LLM, fetch, TTS, screenshot capture, tool call, shell execution, or file access was triggered.
4. No runtime follow-up pending state was mutated.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
