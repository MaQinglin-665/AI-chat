# Task 134: Follow-up character trial cue preview v1

## Goal

Preview the low-interruption character expression that should match the visible gray automatic follow-up trial state, before wiring any real role behavior.

## Scope

- Add `grayAutoFollowupTrialCharacterCuePreview(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行角色表现预览` section to the follow-up readiness panel.
- Add `复制角色预览` for user-click clipboard export.
- Reuse existing gray trial sign-off, outcome, and character runtime hint preview builders.
- Keep the output as preview data only.
- Document the preview in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Read-only preview.
- Clipboard write happens only after user click.
- Does not call `maybeEmitFollowupCharacterRuntimeHint()`.
- Does not emit events, move Live2D, play TTS, request model output, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
