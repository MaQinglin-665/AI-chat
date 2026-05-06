# Task 122: Follow-up gray trial emergency stop v1

## Goal

Add a DevTools emergency stop helper for local gray automatic follow-up trials.

## Scope

- Add `stopGrayAutoFollowupTrial(reason)` to the TTS debug bridge.
- Stop proactive scheduler polling.
- Set the in-memory trial session counter to the configured max.
- Record one compact `conversation_followup_gray_auto_trial_emergency_stop` event.

## Safety posture

- DevTools-only explicit action.
- Does not change config or enable gates.
- Does not restart polling.
- Does not execute follow-up, call model/TTS/fetch, mutate pending state, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
