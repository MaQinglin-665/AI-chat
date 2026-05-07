# Task 168: Reply Cue Expression Map

## Goal

Make assistant reply cue candidates carry clearer character expression metadata before they are manually sent.

## Scope

- Add a deterministic reply cue expression mapper.
- Map reply mood/style/text punctuation into allowlisted runtime metadata:
  - `emotion`
  - `action`
  - `intensity`
  - `voice_style`
  - `live2d_hint`
- Show candidate `emotion` and `action` in the existing status/recap surfaces.
- Keep the candidate path preview/manual-only.

## Safety Boundaries

- Default-off remains unchanged.
- No config writes.
- No scheduler default behavior changes.
- No automatic runtime connection.
- No automatic runtime cue emission from assistant replies.
- No TTS.
- No desktop observation, screenshots, file reads, shell execution, or tool calls.
- No Live2D movement unless the existing manual confirmation send path is used.

## Acceptance

- Happy/playful replies map to a warm idle expression.
- Questions/surprised replies map to a thinking expression.
- Sad/anxious replies map to low-intensity quiet expressions.
- The runtime hint remains normalized through the existing character runtime allowlist.
- Status/recap text includes candidate `emotion` and `action`.

## Verification

- `node --check web\chat.js`
- `node tests\test_character_runtime_frontend.js`
- `python -m pytest tests\test_character_runtime.py tests\test_api_health.py -q`
- `git diff --check`
