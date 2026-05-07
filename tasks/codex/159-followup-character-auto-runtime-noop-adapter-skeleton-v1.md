# Task 159: Follow-up character auto runtime no-op adapter skeleton v1

## Goal

Add a backend no-op adapter skeleton so the future automatic character runtime has an explicit adapter boundary before any real dispatch is enabled.

## Scope

- Add `preview_backend_entry_noop_adapter()` in `character_runtime.py`.
- Consume the same backend-entry request preview and guard state.
- Return an adapter preview with `adapter_ready=false`, `executed=false`, and `dispatched=false`.
- Report all side effects as false.
- Surface the adapter preview in the backend-entry summary and preview POST route.
- Cover helper and API response shape with tests.

## Safety posture

- Default-off.
- No-op adapter only.
- No execution route.
- No config writes.
- No automatic runtime connection.
- No scheduler default changes.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No polling start.
- No follow-up execution.
- No desktop observation, screenshots, file reads, shell execution, or tool calls.

## Acceptance

- Adapter preview returns `noop=true`.
- Adapter preview returns `adapter_ready=false`.
- Adapter preview returns `accepted=false`, `would_execute=false`, `executed=false`, and `dispatched=false`.
- Adapter preview reports `dispatch_target="none"`.
- Adapter preview reports all side-effect flags as false.

## Verification

- `python -m pytest tests/test_character_runtime.py tests/test_api_health.py -q`
- `node --check web/chat.js`
- `git diff --check`
- Request `POST /api/character_runtime/backend_entry/preview` and confirm adapter preview remains no-op.
