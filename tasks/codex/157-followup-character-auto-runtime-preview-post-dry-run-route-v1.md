# Task 157: Follow-up character auto runtime preview POST dry-run route v1

## Goal

Add a preview-only POST route for backend-entry requests so future automatic character runtime calls can be rehearsed through the guard path before any execution route exists.

## Scope

- Add `POST /api/character_runtime/backend_entry/preview`.
- Parse a JSON request body and pass safe object input into `preview_backend_entry_request()`.
- Return a dry-run rejection payload under `character_runtime_backend_entry_preview`.
- Keep the route protected by the existing `/api/*` token guard.
- Cover valid request, missing token, and invalid JSON behavior with API tests.

## Safety posture

- Default-off.
- Preview-only rejection.
- No execution route.
- No config writes.
- No automatic runtime connection.
- No scheduler default changes.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No polling start.
- No follow-up execution.

## Acceptance

- Valid preview POST returns `ok=true`.
- Preview returns `read_only=true`, `dry_run=true`, `accepted=false`, and `would_execute=false`.
- Preview preserves request `type` and `action` for review only.
- Missing or invalid API token is rejected before preview handling.
- Invalid JSON returns HTTP 400.

## Verification

- `python -m pytest tests/test_character_runtime.py tests/test_api_health.py -q`
- `node --check web/chat.js`
- `git diff --check`
- Request `POST /api/character_runtime/backend_entry/preview` with a valid local token and confirm the result is rejected dry-run only.
