# Task 125: Follow-up gray trial runbook v1

## Goal

Add a controlled local trial runbook for gray automatic follow-up and expose the same guidance through a read-only DevTools helper.

## Scope

- Add `docs/conversational-followup-gray-trial-runbook.md`.
- Add `grayAutoFollowupTrialRunbook()` to the TTS debug bridge.
- Return preflight, event, session, arm, stop, disarm, reset, readiness, success, and rollback guidance.
- Document the runbook in the design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only helper by default.
- Automatic follow-up remains default-off.
- Arming still requires the exact confirmation phrase.
- Existing cooldown, silence, policy, busy/speaking, window-limit, session-cap, emergency-stop, and disarm guards remain the safety boundary.
- Does not start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
