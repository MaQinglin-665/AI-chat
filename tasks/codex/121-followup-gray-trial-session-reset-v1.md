# Task 121: Follow-up gray trial session reset v1

## Background

Task 120 added an in-memory per-session cap for gray automatic follow-up trial triggers. During local verification, testers may need to inspect or reset that in-memory count without restarting the whole app.

## Goal

Expose DevTools helpers for gray trial session cap inspection and explicit reset.

## Scope

- Add `grayAutoFollowupTrialSession()` to report current count, max, remaining, and cap state.
- Add `resetGrayAutoFollowupTrialSession()` to reset the in-memory renderer counter to zero.
- Record one compact `conversation_followup_gray_auto_trial_session_reset` debug event when reset is explicitly called.
- Document the helper and smoke checks.

## Safety posture

- Reset is explicit DevTools-only action.
- Reset does not restart polling.
- Reset does not enable any gate.
- Reset does not execute follow-up.
- Reset does not call model/TTS/fetch or write config.
- Manual confirmation remains separately guarded.

## Non-goals

- Do not add UI buttons for reset.
- Do not start polling after reset.
- Do not change scheduler gates, cooldowns, window limits, pending state, model/TTS/fetch paths, backend APIs, desktop observation, screenshots, file access, shell execution, tool calls, dependencies, or product maturity claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. Run `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialSession()`.
2. Confirm it returns count, max, remaining, reached, and blocked reason.
3. Run `window.__AI_CHAT_DEBUG_TTS__.resetGrayAutoFollowupTrialSession()`.
4. Confirm it returns `reset=true`, `count=0`, and `pollingRestarted=false`.
5. Confirm exactly one compact reset event is recorded for the explicit reset call.
