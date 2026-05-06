# Task 119: Follow-up gray trial event summary v1

## Background

Task 118 appended compact gray trial context to existing proactive scheduler polling events. Local testers now need a quick way to summarize recent polling events without manually scanning raw debug history.

## Goal

Add a read-only helper that summarizes recent gray automatic follow-up trial polling events.

## Scope

- Add `grayAutoFollowupTrialEvents(limit)` to the DevTools debug bridge.
- Parse recent `proactive_scheduler_poll_*` event results for:
  - `trial:<status>`
  - `gates:<summary>`
  - `would_poll:<bool>`
  - `would_trigger:<bool>`
- Return event counts, last event, trigger-attempt flags, and sanitized recent entries.
- Add one trial event summary line to the follow-up readiness report.
- Update design notes, smoke checklist, and scheduler guard docs.

## Safety posture

- Read-only observability helper.
- No new debug events.
- No automatic polling start.
- No scheduler tick.
- No follow-up execution.
- No model, TTS, fetch, backend API, config write, desktop observation, screenshot, file access, shell execution, tool call, pending mutation, or new dependency.

## Non-goals

- Do not enable automatic follow-up by default.
- Do not change scheduler gates, cooldowns, window limits, pending state, or event emission timing.
- Do not add mature-product claims.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. Run `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupTrialEvents()` in DevTools.
2. Confirm the result is read-only and includes counts, last event, last trial status, and sanitized recent rows.
3. Confirm calling the helper does not add debug events.
4. Confirm the follow-up readiness report includes a `试运行事件` line.
