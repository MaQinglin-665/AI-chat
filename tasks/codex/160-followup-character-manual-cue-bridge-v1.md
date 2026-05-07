# Task 160: Follow-up character manual cue bridge v1

## Goal

Move from backend skeleton to the first real role-expression bridge by routing the existing manual character cue button through the backend preview/no-op adapter before local emission.

## Scope

- Keep the cue button inside the collapsed high-risk local action group.
- Require the existing manual confirmation phrase.
- Call `POST /api/character_runtime/backend_entry/preview` before local cue emission.
- Require the backend adapter preview to remain no-op: no backend execution, no dispatch target.
- Reuse the existing local manual cue path only after the backend no-op check is confirmed.

## Safety

- Default-off.
- Manual only.
- No scheduler connection.
- No config writes.
- No automatic runtime connection.
- No TTS.
- No desktop observation, screenshots, files, shell, or tools.
