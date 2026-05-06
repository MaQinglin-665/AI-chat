# Task 130 prep: Follow-up gray trial timeline v1

## Goal

Prepare for the first real controlled gray automatic follow-up trial by showing a compact event timeline.

## Scope

- Add `grayAutoFollowupTrialTimeline(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行时间线` section to the follow-up readiness panel.
- Include gray trial control events, dry-run checks, and proactive scheduler poll events.
- Add `复制时间线` for user-click clipboard export.
- Document the timeline in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only timeline builder.
- Clipboard write happens only after user click.
- Does not emit events, arm, disarm, stop, reset, start polling, execute follow-up, call model/TTS/fetch, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
