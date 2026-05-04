# Task 059: Proactive follow-up policy preview smoke

## Background

Task 058 added a DevTools-only read-only preview helper for proactive follow-up policy
decisions. Task 059 records a small smoke run for the four Task 057 policy presets.

## Goal

1. Verify `previewConversationFollowupPolicy(input)` produces the expected policy for four representative inputs.
2. Confirm eligible preview cases produce non-empty prompt drafts.
3. Confirm closed-topic input fails quiet with `policy_do_not_followup`.
4. Record the result in `docs/character-runtime-validation-log.md`.

## Smoke method

A local Node script extracted the pure preview block from `web/chat.js` and executed the same
logic as the DevTools helper. Chinese inputs were passed with Unicode escapes to avoid
PowerShell pipeline encoding loss.

## Results

| Case | Input summary | Expected policy | Actual policy | Eligible | Blocked reasons | Prompt draft |
| --- | --- | --- | --- | --- | --- | --- |
| A | question tail: `你觉得这个方向怎么样？` | `light_question` | `light_question` | true | none | non-empty, safety wording present |
| B | keyword hint: `要不要我继续讲这个思路` | `soft_checkin` | `soft_checkin` | true | none | non-empty, safety wording present |
| C | normal pending: `我们刚才聊到主动续话策略` | `gentle_continue` | `gentle_continue` | true | none | non-empty, safety wording present |
| D | closed topic: `先这样，晚安` | `do_not_followup` | `do_not_followup` | false | `policy_do_not_followup` | empty |

## Result

Pass.

## Safety notes

1. This smoke used the read-only preview helper logic only.
2. No `requestAssistantReply` path was called.
3. No LLM, fetch, TTS, screenshot capture, tool call, shell execution, or file access was triggered.
4. No runtime follow-up pending state was mutated.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
