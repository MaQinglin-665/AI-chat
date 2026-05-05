# Task 114: Follow-up gray mode dry-run events v1

## Background

Task 113 added a read-only gray automatic follow-up dry-run helper. The next safe step is to make explicit dry-run checks auditable without making the readiness panel noisy.

## Goal

Record a compact debug event when a user explicitly calls `grayAutoFollowupDryRun()` from DevTools.

## Scope

- Keep `buildGrayAutoFollowupDryRunStatus()` pure and read-only.
- Add `runGrayAutoFollowupDryRunDebug()` as the DevTools bridge wrapper.
- Record `conversation_followup_gray_auto_dry_run_checked` only for explicit DevTools dry-run calls.
- Include compact status fields: status, `would_poll`, `would_trigger`, and blocked reason summary.
- Update design notes and smoke checks.

## Safety posture

- The readiness panel does not emit dry-run events on refresh.
- The event payload does not include full prompts, secrets, screenshots, files, or unrelated private data.
- The helper does not start scheduler polling.
- The helper does not call `runProactiveSchedulerManualTick()` or `runConversationFollowupDebug()`.
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

1. Open the follow-up readiness panel and confirm refresh does not spam dry-run events.
2. Run `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupDryRun()` in DevTools.
3. Confirm `conversation_followup_gray_auto_dry_run_checked` appears once for the explicit call.
4. Confirm no polling, scheduler tick, follow-up execution, model request, TTS, fetch, or pending mutation occurs.
