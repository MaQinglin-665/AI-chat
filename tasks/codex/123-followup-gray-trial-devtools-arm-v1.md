# Task 123: Follow-up gray trial DevTools arm v1

## Goal

Add an explicit DevTools-only helper to arm local gray automatic follow-up trials without writing config.

## Scope

- Add `armGrayAutoFollowupTrial({ confirm: "ARM_GRAY_AUTO_TRIAL" })`.
- Require exact confirmation phrase.
- Open the five in-memory automatic follow-up gates.
- Reset the in-memory trial session counter.
- Sync existing scheduler polling.
- Record `conversation_followup_gray_auto_trial_armed`.

## Safety posture

- Explicit DevTools-only action.
- In-memory only; no config writes.
- Existing guards remain active: session cap, emergency stop, cooldown, silence, policy, busy/speaking, window limits, and scheduler gates.
- No desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, dependencies, or maturity claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
