# Task 137: Follow-up character cue manual emit recap v1

## Goal

Add a read-only recap for the latest manually emitted gray trial character cue so testers can review what was sent without emitting another cue.

## Scope

- Add `grayAutoFollowupTrialCharacterCueManualEmitRecap(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行角色 cue 试发回看` section to the follow-up readiness panel.
- Add `复制回看` for user-click clipboard export.
- Summarize in-memory manual emit status, latest cue metadata, recent manual emit debug events, summary, and next action.
- Document the recap in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only recap.
- Clipboard write happens only after user click.
- Does not emit another runtime cue.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
