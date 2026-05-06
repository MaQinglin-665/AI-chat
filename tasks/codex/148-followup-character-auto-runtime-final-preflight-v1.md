# Task 148: Follow-up character auto runtime final preflight v1

## Goal

Add a final read-only preflight package that summarizes the full automatic character runtime preparation chain before any separate implementation task is drafted.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeFinalPreflight(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现最终预检` section to the follow-up readiness panel.
- Add `复制预检` for user-click clipboard export.
- Summarize the current state of:
  - explicit switch plan
  - explicit switch review package
  - switch acceptance package
  - switch control
  - switch diagnostics
  - rollback/default-off package
- Report final preflight gates, blocking items, and next action.
- Keep the package read-only and keep automatic runtime disconnected.

## Safety posture

- Read-only preflight.
- Clipboard write happens only after user click.
- Does not change the local switch flag.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
