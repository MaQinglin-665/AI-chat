# Task 149: Follow-up character auto runtime separate implementation draft v1

## Goal

Turn the current preflight/rollback chain into a concrete read-only implementation skeleton for the later automatic character runtime task. This draft should clearly name the modules that will be touched later, the safety boundaries that must remain intact, and the verification path that must be used when the real implementation task is created.

## Scope

- Add `grayAutoFollowupTrialCharacterAutoRuntimeSeparateImplementationDraft(limit)` to the TTS debug bridge.
- Add a read-only `灰度试运行自动角色表现实现草案` section to the follow-up readiness panel.
- Add `复制草案` for user-click clipboard export.
- Summarize the later implementation touch points:
  - `web/chat.js`
  - `app.py`
  - `character_runtime.py`
  - `config.py`
  - `config.example.json`
- Preserve the current safety boundaries:
  - default-off
  - no config writes
  - no automatic runtime connection
  - no scheduler default changes
  - no runtime cue / Live2D / TTS
- Keep the output honest: this task is only a draft and does not implement the runtime.

## Safety posture

- Read-only draft.
- Clipboard write happens only after user click.
- Does not emit runtime cues.
- Does not move Live2D, request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
