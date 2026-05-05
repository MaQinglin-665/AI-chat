# Task 107: Follow-up manual confirmation guarded execution

## Background

Task 106 added UI-only manual confirmation controls. The next step is to wire `确认` to execution while preserving the existing safety posture and guard behavior.

## Goal

Make `确认` execute follow-up only after a fresh guard check, using the existing guarded manual follow-up path.

## Scope

- Re-check follow-up, silence, and scheduler guards immediately when `确认` is clicked.
- Fail closed if guards are no longer passable.
- Call the existing `runConversationFollowupDebug()` path when guards pass.
- Prevent double-click execution while approval is in progress.
- Keep `忽略` and `查看详情` as local UI actions.
- Record local debug events for approved and blocked confirmation attempts.

## Safety posture

- No new execution path is introduced.
- Approval does not bypass policy, silence, scheduler, cooldown, speaking, busy, closed-topic, or window-limit checks.
- Existing pending-state consume/restore behavior remains owned by `runConversationFollowupDebug()`.

## Non-goals

- Do not add automatic follow-up.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not write config.
- Do not add desktop observation, screenshots, file access, shell execution, tool calls, or backend APIs.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Open `更多 -> 续话状态`.
2. Create a pending follow-up candidate that passes follow-up/silence/scheduler guards.
3. Click `确认`.
4. Confirm approval re-checks guards before execution and uses existing manual follow-up execution.
5. Confirm blocked states fail closed and do not execute.
6. Confirm `忽略` and `查看详情` remain local UI actions.
