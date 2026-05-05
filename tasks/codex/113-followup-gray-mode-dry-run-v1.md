# Task 113: Follow-up gray mode dry-run v1

## Background

Task 112 made gray automatic follow-up readiness inspectable. The next safe step is a dry-run summary that mirrors the outcome of a hypothetical gray polling check without starting polling or executing follow-up.

## Goal

Add a read-only gray automatic follow-up dry-run helper.

## Scope

- Add `buildGrayAutoFollowupDryRunStatus()`.
- Expose the helper through DevTools as `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupDryRun()`.
- Show the dry-run outcome in the follow-up readiness report.
- Return compact follow-up, silence, scheduler, and readiness snapshots.
- Update design notes and smoke checks.

## Safety posture

- Read-only dry-run only.
- The helper does not start scheduler polling.
- The helper does not call `runProactiveSchedulerManualTick()`.
- The helper does not call `runConversationFollowupDebug()`.
- The helper does not consume, restore, or mutate pending state.

## Non-goals

- Do not enable automatic follow-up.
- Do not change config defaults.
- Do not change scheduler polling, cooldown, window limits, pending state, manual confirmation execution, or guard behavior.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, model calls, speech, config writes, or dependencies.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Run `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupDryRun()` in DevTools.
2. Confirm default config returns `dryRun=true`, `wouldPollCheck=false`, and `wouldAttemptTrigger=false`.
3. With all four gates enabled but no pending follow-up, confirm `wouldPollCheck=true` and `wouldAttemptTrigger=false`.
4. Confirm reading the dry-run does not start polling, trigger follow-up, request a model reply, play TTS, or mutate pending state.
