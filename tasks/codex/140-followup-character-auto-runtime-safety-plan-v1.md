# Task 140: Follow-up character auto runtime safety plan v1

## Goal

Create a read-only safety plan for future automatic character runtime behavior before any implementation task connects automatic role-expression cues.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeSafetyPlan(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现接入计划` section to the follow-up readiness panel.
- Add `复制计划` for user-click clipboard export.
- Summarize:
  - default-off gates
  - explicit enable requirements
  - review-package dependency
  - manual validation dependency
  - safety stop requirement
  - rollout stages
  - blocking items
  - next action
- Keep `readyForAutomaticRuntime=false`.
- Document the plan in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only safety plan.
- Clipboard write happens only after user click.
- Does not implement automatic runtime behavior.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
