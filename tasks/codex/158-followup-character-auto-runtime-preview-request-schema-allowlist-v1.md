# Task 158: Follow-up character auto runtime preview request schema allowlist v1

## Goal

Constrain the backend-entry preview request shape before any automatic character runtime adapter is introduced.

## Scope

- Add a read-only preview request schema helper in `character_runtime.py`.
- Allow only `type` and `action` in the preview request.
- Report unknown fields as ignored instead of passing them into later runtime paths.
- Report unsupported `type` or `action` values as validation errors.
- Keep preview behavior rejected and dry-run only.
- Cover helper and API behavior with tests.

## Safety posture

- Default-off.
- Schema-only validation.
- Preview-only rejection.
- No config writes.
- No automatic runtime connection.
- No scheduler default changes.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No polling start.
- No follow-up execution.
- Unknown/high-risk fields are ignored and reported, not executed.

## Acceptance

- `build_backend_entry_preview_request_schema()` returns a read-only fail-closed schema.
- `preview_backend_entry_request()` includes `request_schema`, `ignored_fields`, and `validation_errors`.
- Unknown fields such as file paths, shell hints, or tool-call-like data are listed in `ignored_fields`.
- Unsupported request type/action values are listed in `validation_errors`.
- `accepted=false` and `would_execute=false` remain unchanged.

## Verification

- `python -m pytest tests/test_character_runtime.py tests/test_api_health.py -q`
- `node --check web/chat.js`
- `git diff --check`
- Request `POST /api/character_runtime/backend_entry/preview` with unknown fields and confirm they are reported as ignored.
