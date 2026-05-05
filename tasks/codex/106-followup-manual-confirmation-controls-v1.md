# Task 106: Follow-up manual confirmation controls v1

## Background

Task 105 introduced a manual confirmation preview card in the follow-up readiness panel, but it remained preview-only with no direct controls.

## Goal

Add UI-only controls to the existing manual confirmation preview card:

- `确认`
- `忽略`
- `查看详情`

## Scope

1. Add a local `确认` button placeholder:
   - Enabled only when confirmation state is `available`.
   - Disabled (or explicitly not confirmable) when state is `blocked`.
   - Must not execute follow-up in this task.
2. Add a local `忽略` button:
   - Hide only the current confirmation preview card in local memory.
   - Track dismissed item by a key composed from `topic/policy/candidate`.
   - Dismissed state is in-memory only (no persistence).
3. Add a `查看详情` button:
   - Open/focus/refresh the existing follow-up readiness panel full report area.
4. Reuse Task 105 confirmation preview data for status and copy.

## Strict Non-goals

- Do not call `runConversationFollowup()`.
- Do not call `requestAssistantReply`.
- Do not call LLM/fetch/TTS.
- Do not trigger follow-up execution.
- Do not modify scheduler gates/polling/cooldown/window limits.
- Do not write config.
- Do not add desktop/screenshot/file/shell/tool access.
- Do not add backend APIs.

## Safety posture

- Controls are UI-only and fail-closed.
- `确认` is intentionally a no-op placeholder.
- `忽略` is local-memory-only and does not mutate pending/scheduler/config behavior.

## Verification

- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

## Manual check

1. Open `more -> follow-up status`.
2. Confirm `确认/忽略/查看详情` controls are visible when a pending follow-up candidate exists.
3. Confirm `确认` is enabled in available state and disabled in blocked state.
4. Confirm clicking `确认` only updates local UI/status and does not execute follow-up.
5. Confirm `忽略` hides the current confirmation preview card locally for the same key.
6. Confirm `查看详情` focuses or refreshes the readiness full report area.
