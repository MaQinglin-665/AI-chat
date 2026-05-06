# Task 127: Follow-up gray trial control panel v1

## Goal

Move controlled gray automatic follow-up trial operations from DevTools-only commands into the existing follow-up readiness panel while preserving explicit confirmation and safe exits.

## Scope

- Add a `试运行` action group to the follow-up readiness panel.
- Add `Arm 试运行`, `Emergency Stop`, `Disarm`, and `Reset Session` controls.
- Require `ARM_GRAY_AUTO_TRIAL` before panel arm.
- Require `RESET_GRAY_AUTO_TRIAL_SESSION` before panel reset.
- Show compact control status beside the existing trial status card.
- Document the controls in the runbook, design notes, scheduler guard notes, and smoke checklist.

## Safety posture

- Automatic follow-up remains default-off.
- Panel arm still uses the existing in-memory guarded arm helper.
- Panel reset does not start polling.
- Emergency stop and disarm are safety收口 actions.
- Does not write config, bypass cooldown/silence/policy/busy/window/session guards, observe desktop, capture screenshots, access files, execute shell, call tools, call backend APIs, or add dependencies.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`
