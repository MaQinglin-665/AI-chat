# Task 132: Follow-up gray trial Go/No-Go v1

## Goal

Provide a compact read-only Go/No-Go decision package for controlled gray automatic follow-up trials.

## Scope

- Add `grayAutoFollowupTrialGoNoGoDecision(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行 Go/No-Go` section to the follow-up readiness panel.
- Add `复制决策` for user-click clipboard export.
- Use existing checklist, outcome, timeline, and guard data.
- Report decision, reason, missing required items, root causes, guardrails, and next action.
- Document the decision package in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only decision package.
- Clipboard write happens only after user click.
- Does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
