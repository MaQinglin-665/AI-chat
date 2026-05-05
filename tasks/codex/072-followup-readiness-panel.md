# Task 072: Follow-up readiness panel

## Background

Task 071 recommended moving from internal follow-up safety hardening toward a small user-facing
readiness surface before expanding proactive behavior.

## Goal

1. Make the current follow-up/proactive readiness state visible to users.
2. Explain why follow-up is blocked or eligible using existing diagnostics.
3. Keep the feature read-only and conservative.

## User-facing entry points

1. Advanced action button: `Follow-up`
2. Local command: `/followupstatus`
3. DevTools bridge:
   - `window.__AI_CHAT_DEBUG_TTS__.followupReadiness()`
   - `window.__AI_CHAT_DEBUG_TTS__.showFollowupReadiness()`
   - `window.__AI_CHAT_DEBUG_TTS__.hideFollowupReadiness()`

## Displayed fields

The panel reads from the existing TTS debug snapshot and displays:

1. `conversationMode.enabled`
2. `conversationMode.proactiveEnabled`
3. `conversationMode.proactiveSchedulerEnabled`
4. follow-up pending/topic/policy/eligibility
5. follow-up blocked reasons
6. silence gate eligibility and blocked reasons
7. scheduler gate eligibility, polling state, cooldown, and window count

## Safety boundaries

This task does not:

1. Change config.
2. Toggle proactive behavior.
3. Start scheduler polling.
4. Trigger follow-up.
5. Call `requestAssistantReply`.
6. Call LLM, fetch, or TTS.
7. Capture screenshots.
8. Call tools.
9. Execute shell commands.
10. Read files.
11. Persist new settings.

## Files changed

1. `web/index.html`
2. `web/chat.js`
3. `docs/conversational-mode-design.md`
4. `docs/character-runtime-validation-log.md`
5. `tasks/codex/072-followup-readiness-panel.md`

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
