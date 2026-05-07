# Task 169: Reply Cue Send Affordance

## Goal

Make the manual assistant reply cue send entry clearer and harder to misuse.

## Scope

- Keep the existing send button inside the collapsed high-risk local entry.
- Disable the button until a concrete assistant reply cue candidate exists.
- Show the candidate `tone`, `mood`, `emotion`, and `action` in the button title when available.
- Keep the explicit confirmation phrase and backend preview/no-op bridge unchanged.

## Safety Boundaries

- Default-off remains unchanged.
- No config writes.
- No scheduler default behavior changes.
- No automatic runtime connection.
- No automatic runtime cue emission.
- No TTS.
- No desktop observation, screenshots, file reads, shell execution, or tool calls.

## Acceptance

- Before an assistant reply candidate exists, the manual send button is disabled and labeled as unavailable.
- After a candidate is generated, the button becomes available and exposes the exact candidate expression summary in its title.
- Sending still requires `SEND_REPLY_CHARACTER_CUE_CANDIDATE`.
- Sending still goes through backend preview/no-op before local runtime dispatch.

## Verification

- `node --check web\chat.js`
- `node tests\test_character_runtime_frontend.js`
- `python -m pytest tests\test_character_runtime.py tests\test_api_health.py -q`
- `git diff --check`
