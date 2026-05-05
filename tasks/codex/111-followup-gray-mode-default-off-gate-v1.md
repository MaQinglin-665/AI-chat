# Task 111: Follow-up gray mode default-off gate v1

## Background

Task 110 created the checkpoint before gray automatic follow-up work. The next safe step is to add an explicit default-off gray-mode gate so automatic polling cannot start just because the older proactive switches are enabled.

## Goal

Add `conversation_mode.gray_auto_enabled` as an explicit opt-in gate for automatic proactive scheduler polling.

## Scope

- Add `conversation_mode.gray_auto_enabled=false` to default config and example config.
- Sanitize the new config field for frontend use.
- Read the field into frontend `state.conversationMode.grayAutoEnabled`.
- Block automatic proactive scheduler polling when `grayAutoEnabled` is not true.
- Expose `gray_auto_disabled` through polling gate/readiness diagnostics.
- Show gray-mode status in the follow-up readiness report.
- Keep the copied config template default-off with `gray_auto_enabled=false`.
- Update docs and smoke checks for the new four-switch automatic polling gate.

## Safety posture

- Automatic follow-up remains disabled by default.
- The new gate only controls automatic polling startup.
- Manual confirmation and local debug/manual execution paths remain available and do not require gray mode.
- No desktop observation, screenshots, file access, shell execution, tool calls, backend APIs, model calls, speech, config writes, or new dependencies are added.

## Non-goals

- Do not enable automatic follow-up by default.
- Do not add a UI toggle that writes config.
- Do not change manual confirmation execution behavior.
- Do not change policy, cooldown, scheduler tick, pending-state, or window-limit logic beyond the automatic polling startup gate.
- Do not add gray automatic follow-up rollout behavior.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Set `enabled=true`, `proactive_enabled=true`, `proactive_scheduler_enabled=true`, and keep `gray_auto_enabled=false`.
2. Reload and confirm proactive scheduler polling remains stopped with `gray_auto_disabled`.
3. Confirm the readiness panel shows gray automatic follow-up as disabled/default-off.
4. Confirm manual confirmation still works for explicit user-approved follow-up.
5. Set `gray_auto_enabled=true` only in local test config and confirm polling can start only when all four gates are true.
