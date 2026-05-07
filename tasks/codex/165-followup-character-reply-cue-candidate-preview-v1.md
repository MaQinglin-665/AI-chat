# Task 165: Follow-up character reply cue candidate preview v1

## Goal

Generate a read-only character cue candidate after an assistant reply so role-expression can be reviewed before any automatic emission exists.

## Scope

- Build a candidate from assistant reply text, detected mood, and talk style.
- Store the latest candidate in renderer memory.
- Show the candidate in the manual cue status card.
- Expose a debug helper for candidate preview.

## Safety

- Preview only.
- No runtime cue emission.
- No Live2D movement.
- No TTS.
- No scheduler connection.
- No config writes.
- No desktop observation, screenshots, files, shell, or tools.
