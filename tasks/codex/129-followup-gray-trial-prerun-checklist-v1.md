# Task 129: Follow-up gray trial pre-run checklist v1

## Goal

Show a clear pre-run checklist before any real controlled gray automatic follow-up trial.

## Scope

- Add `grayAutoFollowupTrialPreRunChecklist()` to the TTS debug bridge.
- Add a read-only `灰度试运行前检查` section to the follow-up readiness panel.
- Summarize explicit arm state, polling visibility, session cap, emergency stop, disarm, runtime guards, and manual watch requirements.
- Document the checklist in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only helper and panel section.
- Does not emit events.
- Does not arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
