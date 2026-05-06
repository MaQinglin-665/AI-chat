# Task 147: Follow-up character auto runtime explicit switch rollback package v1

## Goal

Add a local-only rollback/default-restore package for the explicit switch so operators can return to default-off safely without touching scheduler, config, or automatic runtime.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeSwitchRollbackPackage(limit)` to the TTS debug bridge.
- Add `rollbackGrayAutoFollowupTrialCharacterAutoRuntimeSwitch(reason)` for a local-only reset to default-off.
- Add a read-only `灰度试运行自动角色表现显式开关回滚包` section to the follow-up readiness panel.
- Add `复制回滚` and `回到默认关闭` in the panel.
- Keep rollback local-only and renderer-memory only:
  - clear the local explicit switch flag
  - record rollback time/reason in memory
  - no config writes
  - no scheduler changes
  - no runtime emission
- Document the rollback package in the design notes, smoke checklist, runbook, and scheduler guard notes.

## Safety posture

- Local-only reset.
- Clipboard write happens only after user click.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
