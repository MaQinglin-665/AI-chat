# Task 120: Follow-up gray trial session cap v1

## Background

Tasks 116-119 added a default-off trial gate, read-only preflight, polling event context, and event summaries. The next safety step before controlled automatic trials is limiting how many successful automatic triggers can happen in a single renderer session.

## Goal

Add a per-session cap for gray automatic follow-up trial triggers.

## Scope

- Add `conversation_mode.gray_auto_trial_max_triggers_per_session` with default `1`.
- Sanitize the client config value to `0..4`.
- Track successful automatic polling triggers in current renderer memory.
- Block automatic polling with `gray_auto_trial_session_limit_reached` once the cap is reached.
- Stop polling immediately after a successful automatic trigger reaches the cap.
- Surface count/max in snapshots, readiness, preflight, poll event context, and the follow-up status report.
- Update docs and smoke checklist.

## Safety posture

- Automatic follow-up remains default-off.
- The cap only affects automatic polling execution.
- Manual confirmation remains available through its explicit guarded path.
- The cap is in-memory only and resets on app/page restart.

## Non-goals

- Do not enable automatic follow-up by default.
- Do not add new scheduler start paths.
- Do not call model/TTS/fetch outside existing automatic success path.
- Do not write config.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, dependencies, or mature-product claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. Confirm default gray gates remain false.
2. Confirm `gray_auto_trial_max_triggers_per_session=1` is visible in example config and copied config template.
3. With all five gates enabled in local test config, confirm one automatic trigger reaches the session cap and stops polling.
4. Confirm `gray_auto_trial_session_limit_reached` appears in blocked reasons after the cap is reached.
5. Confirm manual confirmation controls remain separate.
