# Task 109: Follow-up manual confirmation smoke docs v1

## Background

Tasks 104-108 built the manual confirmation flow in small safe steps: design, preview card, controls, guarded execution, and lifecycle debug events. Before moving toward gray automatic follow-up preparation, the manual confirmation experience needs one end-to-end smoke path.

## Goal

Document a practical manual confirmation smoke runbook that reviewers can follow from empty state through candidate preview, approval, blocked behavior, dismissal, lifecycle events, and safety sign-off.

## Scope

- Add a Task 109 landing note to the conversational mode design doc.
- Add an end-to-end manual confirmation smoke runbook to the follow-up smoke checklist.
- Cover happy path, blocked path, dismiss path, lifecycle event checks, and safety boundaries.
- Keep the runbook executable for open-source contributors without requiring new tooling.

## Safety posture

- Documentation-only.
- Manual confirmation remains explicit-user-action based.
- Automatic follow-up remains out of scope and default-off.
- No runtime behavior, scheduler gate, cooldown, pending-state, config, backend API, or permission behavior is changed.

## Non-goals

- Do not add automatic follow-up.
- Do not change UI or runtime code.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not write config.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, model calls, speech, or new dependencies.

## Verification

- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Review `docs/conversational-followup-smoke-checklist.md`.
2. Confirm the new runbook covers empty, available, blocked, dismiss, execution, event, and safety paths.
3. Confirm the runbook does not suggest enabling automatic follow-up or unsafe desktop/file/tool/shell behavior.
