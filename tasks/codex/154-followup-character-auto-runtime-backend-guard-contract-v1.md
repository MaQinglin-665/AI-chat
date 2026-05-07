# Task 154: Follow-up character auto runtime backend guard contract v1

## Goal

Add a read-only guard contract to the backend-entry skeleton so later implementation work has an explicit checklist before wiring any automatic character runtime behavior.

## Scope

- Extend the backend-entry summary with a `guard_contract` object.
- Keep the contract read-only and fail-closed.
- List required checks before a future runtime entry can execute.
- List disallowed actions that remain blocked in the skeleton stage.
- Surface the contract in the existing frontend readiness panel as status text only.
- Cover the contract through the existing health/backend-entry tests.

## Safety posture

- Default-off.
- Documentation and status only.
- No config writes.
- No automatic runtime connection.
- No scheduler default changes.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No polling start.
- No follow-up execution.

## Acceptance

- `/api/character_runtime/backend_entry` returns a read-only `guard_contract`.
- The contract includes required checks, disallowed actions, operator confirmation, and rollback notes.
- The frontend panel summarizes the contract without adding new controls.
- Existing safety fields still report disconnected/default-off.

## Verification

- `node --check web/chat.js`
- `python -m pytest tests/test_api_health.py -q`
- `git diff --check`
- Open the readiness panel and confirm the backend-entry card shows the guard contract as read-only/fail-closed.
