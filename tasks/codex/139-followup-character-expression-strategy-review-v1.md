# Task 139: Follow-up character expression strategy review v1

## Goal

Create a read-only review package that summarizes whether the gray trial character expression strategy is ready for a separate implementation task, without enabling automatic runtime behavior.

## Scope

- Add `grayAutoFollowupTrialCharacterExpressionStrategyReviewPackage(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行角色表现策略评审包` section to the follow-up readiness panel.
- Add `复制评审` for user-click clipboard export.
- Summarize:
  - Go/No-Go
  - active expression rule
  - rule count
  - manual emit recap state
  - handoff checklist state
  - missing review items
  - next action
- Keep `readyForAutomaticRuntime=false`.
- Document the review package in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only review package.
- Clipboard write happens only after user click.
- Does not approve automatic runtime directly.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
