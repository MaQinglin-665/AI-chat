# Task 166: Assistant Reply Cue Candidate Manual Send

## Goal

Move the assistant reply character cue candidate from read-only preview to a manual-only send path.

## Scope

- Add an explicit manual bridge for the latest assistant reply cue candidate.
- Require the exact confirmation phrase `SEND_REPLY_CHARACTER_CUE_CANDIDATE`.
- Run the existing backend entry preview/no-op adapter check before any local runtime cue path.
- Reuse the existing local character runtime metadata path only after confirmation and backend no-op.
- Surface whether the latest reply candidate has been manually emitted in the read-only status cards.

## Safety Boundaries

- Default-off remains unchanged.
- No config writes.
- No scheduler default behavior changes.
- No automatic runtime connection.
- No automatic cue emission from assistant replies.
- No TTS is triggered by this path.
- No desktop observation, screenshots, file reads, shell execution, or tool calls are introduced.

## Acceptance

- Without the confirmation phrase, the candidate send returns `confirmation_required`.
- Without a candidate, the send returns `no_reply_candidate`.
- A confirmed send calls `/api/character_runtime/backend_entry/preview` and requires a no-op adapter preview before local dispatch.
- The send button stays inside the collapsed high-risk local entry group.
- Status cards show `replyCueCandidate=... emitted:true` only for the candidate that was manually sent.

## Verification

- `node --check web\chat.js`
- `node tests\test_character_runtime_frontend.js`
- `python -m pytest tests\test_character_runtime.py tests\test_api_health.py -q`
- `git diff --check`
