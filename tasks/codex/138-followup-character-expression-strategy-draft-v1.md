# Task 138: Follow-up character expression strategy draft v1

## Goal

Create a read-only strategy draft that maps gray trial follow-up states to low-interruption character expression candidates before any automatic role behavior is connected.

## Scope

- Add `grayAutoFollowupTrialCharacterExpressionStrategyDraft(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行角色表现策略草案` section to the follow-up readiness panel.
- Add `复制策略` for user-click clipboard export.
- Cover candidate rules for:
  - no-go quiet
  - watch-only observe
  - watched-trial ready
  - post-success cooldown
  - manual emit review
- Include active rule, decision/outcome context, runtime-hint-shaped data, sample lines, risk labels, and next action.
- Keep `readyForAutomaticRuntime=false`.
- Document the draft in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only strategy draft.
- Clipboard write happens only after user click.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
