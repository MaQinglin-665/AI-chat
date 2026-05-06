# Task 141: Follow-up character auto runtime dry-run v1

## Goal

Add a read-only dry-run that shows what automatic character runtime would select without emitting any runtime cue.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeDryRun(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现 dry-run` section to the follow-up readiness panel.
- Add `复制 dry-run` for user-click clipboard export.
- Summarize:
  - selected strategy rule
  - runtime-hint-shaped data
  - safety plan status
  - Go/No-Go
  - blockers
  - next action
- Always keep `wouldEmit=false`.
- Document the dry-run in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only dry-run.
- Clipboard write happens only after user click.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
