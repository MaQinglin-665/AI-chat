# Task 115: Follow-up gray mode dry-run checkpoint

## Background

Tasks 111-114 prepared gray automatic follow-up without enabling automatic behavior: default-off gate, read-only readiness, read-only dry-run, and explicit dry-run audit event.

## Goal

Document the checkpoint before any controlled automatic trial work.

## Scope

- Add Task 115 landing notes to the conversational mode design doc.
- Add a gray automatic follow-up dry-run checkpoint section to the design doc.
- Add a matching smoke checklist checkpoint.
- Define completed baseline, required sign-off, allowed next-stage work, and out-of-scope behavior.

## Safety posture

- Documentation-only.
- Automatic follow-up remains disabled by default.
- Manual confirmation remains the primary user-facing execution path.
- Next-stage automatic trial work must be local/test-only, opt-in, fail-closed, observable, rate-limited, and reversible.

## Non-goals

- Do not enable automatic follow-up.
- Do not change runtime behavior or UI.
- Do not change scheduler polling, cooldown, window limits, pending state, config, or backend APIs.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, model calls, speech, config writes, or dependencies.
- Do not make mature commercial-product claims.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Review the new checkpoint sections in both docs.
2. Confirm they preserve default-off automatic follow-up.
3. Confirm they require four gates before automatic polling can start.
4. Confirm they keep controlled automatic trial work local/test-only, opt-in, fail-closed, observable, rate-limited, and reversible.
