# Task 152: Follow-up character auto runtime frontend read-only state and debug panel v1

## Goal

Define the frontend-only read-only state linkage and debug panel reinforcement for the backend skeleton.

## Scope

- Extend `web/chat.js` with read-only runtime state display.
- Show safe status, blocked reasons, and the current disconnected/default-off state.
- Read backend-entry state from the explicit `/api/character_runtime/backend_entry` endpoint when available.
- Keep any new helper or panel copy action read-only.
- Keep the debug panel honest about what is not yet connected.
- Avoid adding any action controls that can enable automatic runtime.
- Keep default-visible panel controls compact; collapse copy/report material and do not expose runtime-cue emission as a default-visible button.

## Safety posture

- Frontend visibility only.
- No runtime cue emission.
- No Live2D change.
- No TTS.
- No scheduler behavior change.
- No config writes.
- No hidden trigger path from the panel.
- No default-visible runtime cue action.

## Acceptance

- The panel can explain current runtime readiness without changing it.
- The debug surface stays read-only and easy to inspect.
- The state view matches the backend guard posture.
- The default panel is not crowded with implementation-planning copy buttons, and material/debug actions remain collapsed.

## Verification

- `node --check web/chat.js`
- Read the rendered panel and confirm it still says default-off / disconnected where expected.
- Confirm no default-visible panel button emits a runtime cue, moves Live2D, plays TTS, writes config, or changes scheduler defaults.
