# Task 080: Follow-up settings guide v1

## Background

The follow-up readiness panel is now Chinese-first and can copy its report. The next useful step is
to make it more actionable without turning it into a settings editor.

## Goal

1. Show users what the three follow-up switches mean.
2. Explain where to change them.
3. Keep the UI read-only and safe.

## What changed

The readiness report now includes:

1. Current switch summary:
   - conversation mode
   - proactive follow-up
   - scheduler
2. A short guide for editing `config.local.json`.
3. The relevant `conversation_mode` keys:
   - `enabled`
   - `proactive_enabled`
   - `proactive_scheduler_enabled`
4. A reminder to restart the app after saving config.
5. A kill-switch note: closing any one of the three switches stops automatic follow-up quickly.
6. Conservative safety default wording.

## Safety boundaries

This task does not:

1. Write config.
2. Read files.
3. Add settings controls.
4. Change scheduler gates.
5. Change follow-up policy.
6. Trigger follow-up.
7. Start polling.
8. Call `requestAssistantReply`.
9. Call LLM, fetch, or TTS.
10. Capture screenshots.
11. Call tools.
12. Execute shell commands.
13. Observe the desktop.
14. Add dependencies or backend APIs.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
