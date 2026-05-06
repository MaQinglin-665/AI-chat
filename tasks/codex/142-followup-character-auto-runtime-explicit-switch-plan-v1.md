# Task 142: Follow-up character auto runtime explicit switch plan v1

## Goal

Add a read-only explicit switch plan that describes the future gate required before automatic character runtime can ever be enabled.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeExplicitSwitchPlan(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现显式开关计划` section to the follow-up readiness panel.
- Add `复制开关计划` for user-click clipboard export.
- Summarize:
  - proposed switch key and default-off baseline
  - explicit config gate requirement
  - separate runtime implementation task requirement
  - review-package readiness
  - dry-run rule selection status
  - single-session cap expectation
  - emergency stop / disarm availability
  - next action
- Keep automatic runtime disabled and avoid any actual switch implementation.
- Document the switch plan in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only plan.
- Clipboard write happens only after user click.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
