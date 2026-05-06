# Task 133: Follow-up gray trial sign-off package v1

## Goal

Provide a copyable manual sign-off package for controlled gray automatic follow-up trial review.

## Scope

- Add `grayAutoFollowupTrialSignoffPackage(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行签收包` section to the follow-up readiness panel.
- Add `复制签收` for user-click clipboard export.
- Include trial id, Go/No-Go decision, outcome, stage recommendation, missing required items, root causes, manual sign-off checklist, and notes placeholders.
- Keep `approvedForNextPhase=false` by default.
- Document the package in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only package.
- Clipboard write happens only after user click.
- Does not approve the next phase automatically.
- Does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
