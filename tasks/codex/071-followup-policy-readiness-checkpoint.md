# Task 071: Follow-up policy readiness checkpoint

## Background

Tasks 056 through 070 moved the conversational follow-up line from prompt wording polish to a
guarded, policy-aware, runtime-checked safety path.

The latest Task 070 evidence confirms that a real pending closed-topic follow-up fixture stays
ineligible and restores state after the check.

## Goal

1. Summarize the current follow-up policy and proactive scheduler safety state.
2. Mark the closed-topic pending path as ready for the next controlled feature step.
3. Preserve remaining evidence caveats honestly.
4. Recommend the next functional direction without expanding automatic behavior.

## Current readiness summary

| Area | Status |
| --- | --- |
| Follow-up prompt wording | pass |
| Deterministic policy layer | pass |
| DevTools-only policy preview | pass |
| Policy diagnostics in snapshot/events | pass |
| Silence eligibility policy block | pass |
| Manual DevTools checklist | pass |
| Real renderer idle screenshot | partial-pass |
| DevTools-only pending fixture | pass |
| Real renderer pending fixture result | pass |
| Default-off posture | pass |
| Scheduler guard boundary | pass |

## Safety assertions

Current follow-up/proactive scheduler work still obeys these boundaries:

1. Default behavior remains conservative and opt-in.
2. Closed-topic hints such as `先这样，晚安` fail quiet.
3. Auto trigger attempts remain behind existing gate and guard paths.
4. No direct `requestAssistantReply` path was added for polling.
5. No desktop screenshot, tool call, shell execution, file read, backend API, or dependency was
   added for follow-up policy validation.

## Remaining caveat

Recent real-runtime evidence is screenshot-based. It is sufficient for the checkpoint, but future
manual runtime captures should prefer pasted JSON text for easier archival review.

## Recommended next feature step

Prefer a small user-facing settings/readiness surface before broadening proactive behavior.

Candidate next task:

```text
Task 072: Follow-up settings readiness panel
```

Suggested scope:

1. Show current conversation/follow-up/proactive scheduler switch states.
2. Show whether the current follow-up state is eligible or blocked.
3. Keep controls conservative and clearly labeled.
4. Do not add new automation, desktop observation, file access, tools, shell execution, or request
   paths.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
