# Task 136: Follow-up character cue manual emit gate v1

## Goal

Allow a watched local tester to manually emit the current gray trial character cue preview once after explicit confirmation.

## Scope

- Add `emitGrayAutoFollowupTrialCharacterCue({ confirm: "EMIT_GRAY_AUTO_TRIAL_CHARACTER_CUE" })` to the TTS debug bridge.
- Add `grayAutoFollowupTrialCharacterCueManualEmitStatus()` to inspect in-memory manual emit count and last emit.
- Add `试发角色cue` to the follow-up readiness panel.
- Require the exact confirmation phrase before any runtime metadata emission.
- Reuse existing `handleCharacterRuntimeMetadata()` so the test follows the same character runtime metadata path.
- Record one compact audit event for successful manual emits.
- Document the gate in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Explicit confirmation required every time.
- Emits only the current preview runtime cue.
- Intended only for watched local testing.
- Does not request model output, play TTS, fetch, arm, disarm, stop, reset, start polling, execute follow-up, mutate pending state, write config, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
