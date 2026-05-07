# Task 161: Follow-up character manual cue visible feedback v1

## Goal

Make the manual character cue bridge visibly inspectable after a watched local trigger.

## Scope

- Record the latest normalized runtime metadata dispatch result.
- Record whether metadata was locally dispatched and broadcast toward the model window.
- Record Live2D apply diagnostics from the existing `character-runtime:update` listener.
- Show dispatch/apply diagnostics in the manual cue status and recap text.

## Safety

- Manual cue only.
- No scheduler connection.
- No automatic runtime connection.
- No config writes.
- No TTS.
- No desktop observation, screenshots, files, shell, or tools.
- No new Live2D behavior; this only records the existing apply path result.
