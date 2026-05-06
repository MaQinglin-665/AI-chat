# Task 135: Follow-up character cue handoff checklist v1

## Goal

Add a safe pre-handoff checklist for deciding whether the gray trial character cue preview is shaped well enough for a later explicit implementation task.

## Scope

- Add `grayAutoFollowupTrialCharacterCueHandoffChecklist(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行角色接入前检查` section to the follow-up readiness panel.
- Add `复制接入检查` for user-click clipboard export.
- Check preview read-only boundaries, runtime metadata shape, Go/No-Go visibility, manual sign-off state, recent runtime hint pressure, and scheduler isolation.
- Keep `readyForRuntimeEmission=false` in this task.
- Document the checklist in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only checklist.
- Clipboard write happens only after user click.
- Does not call `maybeEmitFollowupCharacterRuntimeHint()`.
- Does not emit events, move Live2D, play TTS, request model output, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
