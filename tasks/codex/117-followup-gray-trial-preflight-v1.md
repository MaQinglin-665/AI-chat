# Task 117: Follow-up gray trial preflight v1

## Background

Task 116 added a fifth default-off gate for controlled automatic follow-up trials. Before any live trial, local testers need a compact way to inspect whether the system is gated off, blocked by runtime guards, or ready for observation.

## Goal

Add a read-only preflight helper for controlled gray automatic follow-up trials.

## Scope

- Add `grayAutoFollowupTrialPreflight()` to the DevTools debug bridge.
- Summarize all five automatic polling gates:
  - `conversation_mode.enabled`
  - `conversation_mode.proactive_enabled`
  - `conversation_mode.proactive_scheduler_enabled`
  - `conversation_mode.gray_auto_enabled`
  - `conversation_mode.gray_auto_trial_enabled`
- Reuse existing readiness and dry-run builders without emitting events.
- Surface a one-line preflight result in the follow-up readiness report.
- Update design notes, smoke checklist, and scheduler guard docs.

## Safety posture

- Read-only diagnostic helper.
- No automatic polling start.
- No scheduler manual tick.
- No follow-up execution.
- No model, TTS, fetch, backend API, config write, desktop observation, screenshot, file access, shell execution, tool call, pending mutation, or new dependency.

## Non-goals

- Do not enable automatic follow-up by default.
- Do not add new config.
- Do not change scheduler guard behavior, cooldown/window limits, pending state, manual confirmation execution, or dry-run event behavior.
- Do not make commercial or mature-product claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. Run `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialPreflight()` with default config.
2. Confirm it returns `preflight=true`, `readOnly=true`, `ok=false`, and `status="gated_off"`.
3. Confirm the `gates` list includes all five config keys.
4. Confirm calling preflight does not emit `conversation_followup_gray_auto_dry_run_checked`.
5. Confirm the follow-up readiness report includes a `试运行 preflight` line.
