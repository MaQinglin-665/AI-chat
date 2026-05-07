# Task 156: Follow-up character auto runtime entry preview rejection v1

## Goal

Add a preview-only backend-entry request rejection summary so future runtime execution has a visible fail-closed precheck before any real entry is wired.

## Scope

- Add `preview_backend_entry_request()` to `character_runtime.py`.
- Keep the preview read-only and dry-run only.
- Return `accepted=false` and `would_execute=false` in the skeleton stage.
- Surface the preview in `/api/character_runtime/backend_entry`.
- Show the preview in the frontend backend-entry card as status text only.
- Cover the preview with unit/API tests.

## Safety posture

- Default-off.
- Preview-only rejection.
- No POST execution route.
- No config writes.
- No automatic runtime connection.
- No scheduler default changes.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No polling start.
- No follow-up execution.

## Acceptance

- Backend preview returns dry-run rejection.
- API summary includes `entry_execution_preview`.
- Frontend displays preview status without adding controls.
- All existing guard fields remain false/default-off.

## Verification

- `python -m pytest tests/test_character_runtime.py tests/test_api_health.py -q`
- `node --check web/chat.js`
- `git diff --check`
- Open the readiness panel and confirm execution preview says dry-run / would_execute=no.
