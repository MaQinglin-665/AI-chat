# Task 116: Follow-up gray mode trial gate v1

## Background

Tasks 111-115 prepared gray automatic follow-up with a default-off gray gate, read-only readiness, read-only dry-run, a compact dry-run event, and a checkpoint before controlled automatic trial work.

## Goal

Add an extra default-off trial gate so automatic scheduler polling cannot start until a local tester explicitly enables both gray automatic follow-up and controlled trial mode.

## Scope

- Add `conversation_mode.gray_auto_trial_enabled=false` to default config, sanitized client config, and example config.
- Add `grayAutoTrialEnabled` to frontend conversation mode state and debug snapshots.
- Gate automatic scheduler polling on five switches:
  - `enabled`
  - `proactive_enabled`
  - `proactive_scheduler_enabled`
  - `gray_auto_enabled`
  - `gray_auto_trial_enabled`
- Surface `gray_auto_trial_disabled` in polling blocked reasons, readiness, dry-run, and the follow-up readiness report.
- Update docs and smoke checklist for the new trial gate.

## Safety posture

- Automatic follow-up remains disabled by default.
- Manual confirmation remains the primary user-facing execution path.
- The new trial gate only affects automatic polling startup.
- Readiness and dry-run helpers remain read-only diagnostics.

## Non-goals

- Do not enable automatic follow-up by default.
- Do not start polling from a new helper.
- Do not call scheduler manual ticks, execute follow-up, request a model reply, play TTS, fetch, or write config.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, new dependencies, or mature-product claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. With the first four gates true and `gray_auto_trial_enabled=false`, confirm automatic polling stays stopped.
2. Confirm polling blocked reasons include `gray_auto_trial_disabled`.
3. Confirm `grayAutoFollowupReadiness()` and `grayAutoFollowupDryRun()` report blocked/default-off without side effects.
4. Confirm the follow-up readiness report and copied config template include `gray_auto_trial_enabled=false`.
5. Confirm manual confirmation controls remain available through the explicit guarded path.
