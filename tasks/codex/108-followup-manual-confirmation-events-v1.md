# Task 108: Follow-up manual confirmation lifecycle events v1

## Background

Task 107 wired the manual confirmation `确认` control to the existing guarded manual follow-up execution path. The next step is to make the manual confirmation experience easier to inspect without expanding debug controls or changing behavior.

## Goal

Record compact lifecycle events for the manual confirmation card and controls through the existing TTS debug event stream.

## Scope

- Record a de-duplicated event when a manual confirmation preview becomes visible for a current key/status.
- Record local events when the user clicks `忽略` or `查看详情`.
- Record approval lifecycle events for approval start, guard-blocked attempts, approved guard pass, and execution success/failure.
- Keep event payloads compact and sanitized: topic/status/policy/guard summary only.
- Avoid logging on every readiness refresh tick.

## Safety posture

- No new execution path is introduced.
- No guard, scheduler, cooldown, pending-state, or config behavior is changed.
- Manual confirmation still fails closed when guards block.
- Existing follow-up request execution remains owned by `runConversationFollowupDebug()`.

## Non-goals

- Do not add automatic follow-up.
- Do not add new debug/copy/export UI controls.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not write config.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, or new dependencies.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Open `more -> follow-up status` and the TTS/debug event panel.
2. Create or wait for a pending follow-up candidate.
3. Confirm `conversation_followup_manual_confirmation_preview_shown` appears once for the current key/status and does not repeat on every refresh.
4. Click `查看详情` and confirm `conversation_followup_manual_confirmation_review_details` appears.
5. Click `忽略` and confirm `conversation_followup_manual_confirmation_dismissed` appears and only local in-memory hiding occurs.
6. Click `确认` on an available candidate and confirm approval start, approved, and execution success/failure events appear.
7. Try a blocked candidate and confirm the blocked event appears without execution.
