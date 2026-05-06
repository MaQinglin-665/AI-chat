# Task 143: Follow-up character auto runtime explicit switch review package v1

## Goal

Add a read-only review package for the explicit switch plan so the next separate implementation task can be judged without enabling automatic character runtime.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeExplicitSwitchReviewPackage(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现显式开关评审包` section to the follow-up readiness panel.
- Add `复制评审` for user-click clipboard export.
- Summarize:
  - explicit switch plan status
  - Go/No-Go for a separate switch task
  - default-off baseline
  - strategy review readiness
  - dry-run rule selection status
  - safety plan readiness
  - required gates and blockers
  - next action
- Keep the review package read-only and do not implement the actual automatic switch.
- Document the review package in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only review package.
- Clipboard write happens only after user click.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
