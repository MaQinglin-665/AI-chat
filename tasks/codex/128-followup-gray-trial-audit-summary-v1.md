# Task 128: Follow-up gray trial audit summary v1

## Goal

Give local testers a compact read-only audit summary for reviewing gray automatic follow-up trial state and recent poll events.

## Scope

- Add `grayAutoFollowupTrialAuditSummary(limit)` to the TTS debug bridge.
- Build a compact audit summary from preflight, session, dry-run, scheduler snapshot, and recent poll events.
- Add `复制审计` to the readiness panel.
- Document the helper in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only helper.
- Clipboard write happens only after user click.
- Does not emit new trial events, arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
