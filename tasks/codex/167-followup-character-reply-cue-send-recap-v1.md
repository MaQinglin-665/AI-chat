# Task 167: Reply Cue Manual Send Recap

## Goal

Make the existing manual character cue recap useful for the assistant reply cue candidate send path.

## Scope

- Reuse the existing character cue recap card and copy action.
- Include both preset manual cue sends and assistant reply candidate manual sends.
- Show the send source, candidate sent state, backend preview/no-op state, runtime dispatch, and Live2D apply diagnostics.
- Keep the recap read-only.

## Safety Boundaries

- Default-off remains unchanged.
- No config writes.
- No scheduler default behavior changes.
- No automatic runtime connection.
- No new runtime cue emission from recap.
- No TTS.
- No desktop observation, screenshots, file reads, shell execution, or tool calls.
- No new UI button is added.

## Acceptance

- The recap includes `conversation_followup_character_reply_cue_candidate_manual_emit` events.
- The recap text shows `replyCueCandidate=... sent:true/false`.
- The recap text shows `backendBridge=ok:... backendNoop:... wouldExecute:... dispatched:...`.
- The existing copy-recap path works for both preset manual sends and reply candidate manual sends.

## Verification

- `node --check web\chat.js`
- `node tests\test_character_runtime_frontend.js`
- `python -m pytest tests\test_character_runtime.py tests\test_api_health.py -q`
- `git diff --check`
