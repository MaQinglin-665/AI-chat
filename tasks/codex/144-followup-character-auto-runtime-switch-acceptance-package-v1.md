# Task 144: Follow-up character auto runtime switch acceptance package v1

## Goal

Add a read-only acceptance package for a future explicit automatic character runtime switch implementation task.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeSwitchAcceptancePackage(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现显式开关验收包` section to the follow-up readiness panel.
- Add `复制验收` for user-click clipboard export.
- Summarize acceptance criteria for a later separate implementation task:
  - default-off after restart
  - wrong confirmation phrase is a no-op
  - explicit switch-only path
  - single-session cap retained
  - Emergency Stop / Disarm retained
  - review and acceptance helpers do not mutate scheduler
  - review and acceptance helpers do not write config
  - no privacy-surface expansion
  - runtime emission still not connected in this task
- Keep the package read-only and do not implement the actual switch.
- Document the acceptance package in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only acceptance package.
- Clipboard write happens only after user click.
- Does not implement a switch.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
