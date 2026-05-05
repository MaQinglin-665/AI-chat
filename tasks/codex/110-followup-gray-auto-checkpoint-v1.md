# Task 110: Follow-up gray automatic checkpoint v1

## Background

Tasks 104-109 moved the follow-up work from rehearsal/debug tools into a manual confirmation experience. Before preparing gray automatic follow-up, the project needs an explicit checkpoint that keeps automatic behavior default-off and defines the allowed next-stage surface area.

## Goal

Document the checkpoint between manual confirmation and gray automatic follow-up preparation.

## Scope

- Add Task 110 landing notes to the conversational mode design doc.
- Add a gray automatic follow-up preparation checkpoint section to the design doc.
- Add a matching smoke checklist section for review/sign-off.
- Define what is complete, what must be verified, what next-stage work is allowed, and what remains out of scope.

## Safety posture

- Documentation-only.
- Automatic follow-up remains disabled by default.
- Future gray-mode work must be opt-in, default-off, policy-gated, cooldown-gated, scheduler-gated, and observable before rollout.
- Manual confirmation remains the current user-facing execution path.

## Non-goals

- Do not enable automatic follow-up.
- Do not change runtime behavior or UI.
- Do not change scheduler gates, polling, cooldown, window limits, pending state, config, or backend APIs.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, model calls, speech, or new dependencies.
- Do not make mature commercial-product claims.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Review the new checkpoint sections in both docs.
2. Confirm they preserve default-off automatic follow-up.
3. Confirm allowed next-stage work is limited to opt-in gray-mode preparation, read-only status, dry-run checks, and smoke coverage.
4. Confirm unsafe desktop/file/tool/shell/screenshot/config/backend expansions remain out of scope.
