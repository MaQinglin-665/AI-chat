# Task 145: Follow-up character auto runtime explicit switch control skeleton v1

## Goal

Add a local-only explicit switch control skeleton that can show and toggle the switch state without connecting automatic character runtime.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeSwitchControl(limit)` to the TTS debug bridge.
- Add `enableGrayAutoFollowupTrialCharacterAutoRuntimeSwitch(input)` and `disableGrayAutoFollowupTrialCharacterAutoRuntimeSwitch(reason)` as local control helpers.
- Add a read-only `灰度试运行自动角色表现显式开关控制` section to the follow-up readiness panel.
- Add `启用开关`, `关闭开关`, and `复制状态` controls.
- Keep the switch as a local in-memory flag only.
- Keep automatic runtime disconnected.
- Keep default-off behavior.
- Keep the control blocked until the acceptance package is ready.
- Document the control skeleton in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Local in-memory flag only.
- Requires explicit confirmation phrase to enable.
- Disable path is local-only and does not write config.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
