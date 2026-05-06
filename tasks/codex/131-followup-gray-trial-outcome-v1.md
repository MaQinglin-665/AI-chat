# Task 131: Follow-up gray trial outcome v1

## Goal

Classify the visible controlled gray automatic follow-up trial result so testers can quickly understand whether a trial succeeded, was blocked, was stopped, or still has setup gaps.

## Scope

- Add `grayAutoFollowupTrialOutcome(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行结果判定` section to the follow-up readiness panel.
- Use existing preflight, checklist, session, and timeline data.
- Report outcome, severity, summary, root causes, and next action.
- Document the classifier in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only classifier.
- Does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
