# Task 112: Follow-up gray mode readiness v1

## Background

Task 111 added a default-off gray automatic follow-up gate. The next safe step is to make gray automatic follow-up readiness inspectable without starting polling or executing follow-up.

## Goal

Add a read-only readiness summary that explains whether gray automatic follow-up is default-off, blocked, or ready.

## Scope

- Add `buildGrayAutoFollowupReadinessStatus()`.
- Expose the helper through DevTools as `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupReadiness()`.
- Show gray readiness status in the follow-up readiness report.
- Separate polling readiness from candidate readiness.
- Surface compact blocked reasons using existing readiness labels.
- Update design notes and smoke checks.

## Safety posture

- Read-only status only.
- No polling is started by the helper.
- No follow-up execution path is called by the helper.
- Manual confirmation remains the explicit user-confirmed execution path.

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

1. Run `window.__AI_CHAT_DEBUG_TTS__.grayAutoFollowupReadiness()` in DevTools.
2. Confirm default config returns `status="default_off"` and includes `gray_auto_disabled`.
3. Open `more -> follow-up status` and confirm the report shows gray readiness, candidate readiness, polling readiness, and blocked reasons.
4. Confirm no model request, TTS, polling start, scheduler tick, or follow-up execution occurs from reading readiness.
