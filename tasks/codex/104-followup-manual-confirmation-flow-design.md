# Task 104: Follow-up manual confirmation flow design

## Background

Task 103 closed the follow-up rehearsal/debug milestone. The next stage should move toward a user-facing manual confirmation experience before any automatic follow-up expansion.

## Goal

Define the manual confirmation flow, UI states, user actions, guard behavior, and safety boundaries.

## Flow summary

The app may show that the desktop pet has a possible follow-up, but it must wait for explicit user approval before any execution.

## Confirmation states

- `hidden`: no pending follow-up or the user dismissed the prompt.
- `available`: a candidate exists and current guards allow execution.
- `blocked`: a candidate exists but policy/guard state blocks execution.
- `approved_pending`: user approved and guarded execution is about to run.
- `dismissed`: user ignored the current pending item.

## Card content

- Proposed short sentence from the selected local follow-up reaction.
- Topic hint or compact reason.
- Policy label.
- Selected tone/index.
- Friendly guard explanation.
- Safety note: nothing is spoken until the user approves.

## User actions

- `approve`: only enabled when current guard state is passable.
- `dismiss`: hides the prompt for the current pending item.
- `review details`: opens or focuses the existing follow-up readiness panel.

## Execution rules

- Approval must re-check guards immediately before execution.
- If guards fail during approval, fail closed and show blocked state.
- Approval must not bypass scheduler, policy, cooldown, speaking, busy, or closed-topic checks.
- Dismissal must not change scheduler gates, cooldown, window limits, or config.

## Safety posture

- This task is design-only.
- No runtime behavior changes.
- No model, fetch, TTS, scheduler, config, desktop observation, screenshot, file, shell, or tool behavior changes.

## Proposed implementation sequence

- Task 105: local manual confirmation preview card.
- Task 106: approve/dismiss/review controls as UI-only actions.
- Task 107: guarded approve execution integration.
- Task 108: confirmation lifecycle debug events.
- Task 109: manual confirmation smoke checklist.
- Task 110: checkpoint before gray automatic follow-up work.

## Verification

- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Review the flow design in `docs/conversational-mode-design.md`.
2. Confirm explicit user approval is required before execution.
3. Confirm approval re-checks guards and fails closed.
4. Confirm dismissal is non-executing and does not change scheduler/config behavior.
