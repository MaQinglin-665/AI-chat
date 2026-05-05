# Task 103: Follow-up rehearsal milestone checkpoint

## Background

Tasks 092-102 built a fairly complete local rehearsal/debug surface for proactive follow-up tuning. The project should now stop expanding debug-only copy/export controls and move toward a user-facing manual confirmation experience.

## Goal

Close the rehearsal/debug milestone and document the next stage.

## Completed rehearsal baseline

- DevTools can set and clear temporary pending follow-up rehearsal state.
- The readiness panel can start and clear rehearsal from UI controls.
- The panel supports multiple local rehearsal scenarios.
- The active preview card summarizes scenario, character state, policy, tone/index, selected sentence, blocked reasons, and safety posture.
- Copy/export actions can copy selected sentence, summary, comparison bundle, JSON, and one-line summary.
- The scenario comparison view shows all local rehearsal scenarios without writing pending state.

## Next stage

Move from debug rehearsal to manual confirmation:

- Show the proposed follow-up before execution.
- Explain why follow-up is allowed or blocked.
- Require explicit user approval before execution.
- Allow dismissal/ignore without changing scheduler behavior.
- Reuse existing guards and fail closed when they block execution.

## Proposed task split

- Task 104: Manual confirmation flow design.
- Task 105: Manual confirmation preview card.
- Task 106: Manual confirmation approve/dismiss controls.
- Task 107: Guarded manual confirmation execution.
- Task 108: Manual confirmation lifecycle debug events.
- Task 109: Manual confirmation smoke checklist.
- Task 110: Manual confirmation checkpoint before gray automatic follow-up work.

## Safety posture

- Rehearsal remains local/debug-only.
- No automatic follow-up expansion in this checkpoint.
- No model, fetch, TTS, scheduler, config, desktop observation, screenshot, file, shell, or tool behavior changes.

## Verification

- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Review `docs/conversational-mode-design.md` and confirm the milestone checkpoint lists Tasks 092-102 as the rehearsal baseline.
2. Confirm the next stage is manual confirmation, not automatic follow-up.
3. Confirm the task split keeps manual approval before any execution.
4. Confirm no runtime code is changed by this task.
