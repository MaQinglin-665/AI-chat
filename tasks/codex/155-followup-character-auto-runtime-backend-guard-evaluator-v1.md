# Task 155: Follow-up character auto runtime backend guard evaluator v1

## Goal

Move the backend-entry guard contract into the character runtime module as a reusable read-only evaluator, without wiring any automatic runtime execution.

## Scope

- Add `build_backend_entry_guard_contract()` to `character_runtime.py`.
- Add `evaluate_backend_entry_guard()` to `character_runtime.py`.
- Keep the evaluator fail-closed and skeleton-only.
- Reuse the evaluator from `app_health.py` for `/api/character_runtime/backend_entry`.
- Cover the evaluator with focused unit tests.

## Safety posture

- Default-off.
- Evaluator only.
- No config writes.
- No automatic runtime connection.
- No scheduler default changes.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No polling start.
- No follow-up execution.

## Acceptance

- The backend-entry API still reports skeleton-only/default-off/disconnected.
- The evaluator returns `entry_ready=false`.
- Blocked reasons remain explicit and fail-closed.
- The guard contract remains read-only and visible.

## Verification

- `python -m pytest tests/test_character_runtime.py tests/test_api_health.py -q`
- `node --check web/chat.js`
- `git diff --check`
