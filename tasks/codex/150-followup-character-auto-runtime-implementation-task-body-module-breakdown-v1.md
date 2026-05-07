# Task 150: Follow-up character auto runtime implementation task body and module breakdown v1

## Goal

Turn the current final preflight + separate implementation draft into a concrete implementation task brief that future work can execute directly. This task should spell out the modules to touch, the boundaries that must stay intact, the acceptance criteria, and the rollback posture for the later automatic character runtime implementation.

## Scope

- Consolidate the implementation plan into one executable brief.
- Name the likely touch points:
  - `web/chat.js`
  - `app.py`
  - `character_runtime.py`
  - `config.py`
  - `config.example.json`
  - validation / rollback docs
- Split future work into clear slices:
  - backend runtime entry skeleton
  - frontend read-only state linkage
  - validation checklist and rollback notes
  - later runtime wiring only after the skeleton is reviewed
- Keep the required safety boundaries explicit:
  - default-off
  - no config writes
  - no automatic runtime connection
  - no scheduler default changes
  - no runtime cue
  - no Live2D change
  - no TTS
- Keep out of scope:
  - desktop observation
  - screenshots
  - file access
  - shell execution
  - tool calls
  - backend API side effects
  - any hidden auto-trigger path

## Safety posture

- Planning-only task.
- Does not change runtime behavior.
- Does not enable automatic runtime.
- Does not emit runtime cues, move Live2D, play TTS, start polling, execute follow-up, or write config.

## Acceptance

- The future implementation can be handed off from this brief without reopening the design thread.
- Every required boundary is listed plainly enough for code review.
- The next tasks can be written as direct follow-ons instead of new planning passes.

## Verification

- Human review of the task brief.
- `git diff --check` if edited alongside other docs.
