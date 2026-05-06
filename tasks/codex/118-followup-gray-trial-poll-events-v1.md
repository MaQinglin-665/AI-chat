# Task 118: Follow-up gray trial poll events v1

## Background

Task 117 added a read-only preflight helper for controlled gray automatic follow-up trials. Before local automatic trials, existing polling events should show enough gray-trial context to explain why polling was blocked, started, ready, or attempted.

## Goal

Append compact gray trial preflight context to existing proactive scheduler polling events.

## Scope

- Add a compact event context builder based on `grayAutoFollowupTrialPreflight()`.
- Append trial status, gate summary, `would_poll`, and `would_trigger` to existing `proactive_scheduler_poll_*` event results.
- Append compact blocked reasons to the existing event error field.
- Document the event context and smoke checks.

## Safety posture

- Observability-only change.
- No new polling events.
- No new scheduler start path.
- No scheduler guard, cooldown, window-limit, pending-state, model, TTS, fetch, backend API, config default, or automatic trigger behavior change.

## Non-goals

- Do not enable automatic follow-up by default.
- Do not start polling from diagnostics.
- Do not execute follow-up.
- Do not call model/TTS/fetch.
- Do not write config.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, dependencies, or mature-product claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. With default-off gray gates, confirm `proactive_scheduler_poll_blocked` includes `trial:gated_off`.
2. Confirm event result includes `gates:` and `would_poll:false`.
3. Confirm event error includes compact disabled reasons only.
4. With all five gates enabled in local test config only, confirm poll start/blocked/ready/trigger events include `gates:pass` and `would_trigger`.
5. Confirm no new polling event type or automatic behavior is introduced.
