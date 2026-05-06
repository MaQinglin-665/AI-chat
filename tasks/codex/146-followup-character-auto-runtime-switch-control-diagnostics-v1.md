# Task 146: Follow-up character auto runtime switch control diagnostics v1

## Goal

Add a read-only diagnostics package for the explicit switch control so blockers are easier to understand before any automatic character runtime is connected.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeSwitchControlDiagnostics(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现显式开关诊断` section to the follow-up readiness panel.
- Add `复制诊断` for user-click clipboard export.
- Expand blocked reasons into readable details:
  - key
  - label
  - impact
  - next action
- Include acceptance blockers and an operator checklist.
- Keep diagnostics read-only and do not change the switch flag.
- Document the diagnostics package in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only diagnostics.
- Clipboard write happens only after user click.
- Does not change the local switch flag.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
