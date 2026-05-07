# Task 153: Follow-up character auto runtime validation checklist and rollback v1

## Goal

Add the validation and rollback material for the new skeleton so contributors can verify and back out cleanly.

## Scope

- Update `docs/character-runtime-validation-log.md` with skeleton-era checks.
- Update `docs/conversational-followup-smoke-checklist.md` with explicit backend/frontend smoke steps.
- Update `docs/proactive-scheduler-guard.md` or a dedicated rollback note with default-off recovery steps.
- Validate the explicit `/api/character_runtime/backend_entry` route as the frontend card source.
- Document what can be done, what cannot be done, and how to return to baseline.
- Keep the rollback path simple: disable, disarm, clear in-memory state, restart if needed.

## Safety posture

- Documentation only.
- No config writes.
- No scheduler default changes.
- No runtime cue.
- No Live2D.
- No TTS.
- No automatic runtime enablement.

## Acceptance

- A contributor can validate the skeleton without reading source first.
- The rollback path clearly returns the project to default-off.
- The docs do not imply that automatic runtime is already on.

## Verification

- Review the updated docs for clarity and boundary accuracy.
- `git diff --check`
