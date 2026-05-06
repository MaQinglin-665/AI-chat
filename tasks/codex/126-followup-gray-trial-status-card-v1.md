# Task 126: Follow-up gray trial status card v1

## Goal

Surface the controlled gray automatic follow-up trial state inside the existing follow-up readiness panel, so testers do not need to rely only on DevTools command output.

## Scope

- Add a read-only gray automatic trial status card to the follow-up readiness panel.
- Show preflight status, armed/polling state, session count, dry-run would-poll/would-trigger flags, blocked reasons, latest poll event, and next safe step.
- Refresh the card with the existing readiness panel interval.
- Document the card in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Observability only.
- No action buttons are added.
- Automatic follow-up remains default-off.
- Does not arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
