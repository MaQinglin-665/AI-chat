# Task 124: Follow-up gray trial DevTools disarm status v1

## Goal

Add a DevTools-only disarm helper and show minimal armed/polling status in the follow-up readiness report.

## Scope

- Add `disarmGrayAutoFollowupTrial(reason)` to the TTS debug bridge.
- Close the in-memory gray automatic gates.
- Stop proactive scheduler polling.
- Record `conversation_followup_gray_auto_trial_disarmed`.
- Add compact armed/polling lines to the readiness report.

## Safety posture

- Explicit DevTools-only action.
- In-memory only; no config writes.
- Does not reset session count.
- Does not restart polling.
- Does not execute follow-up, call model/TTS/fetch, mutate pending state, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
