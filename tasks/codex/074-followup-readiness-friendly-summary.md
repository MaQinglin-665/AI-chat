# Task 074: Follow-up readiness friendly summary

## Background

Task 072 added a read-only readiness panel and Task 073 confirmed it in the real UI.

The panel was accurate, but the main content was still developer-oriented because it exposed raw
blocked reason keys first.

## Goal

1. Keep raw diagnostic keys visible.
2. Add a short human-readable summary.
3. Translate common blocked reasons into friendlier explanations.
4. Avoid changing any follow-up or scheduler behavior.

## What changed

The panel now adds:

1. `Summary`
2. `followupMeaning=...`
3. silence gate `meaning=...`
4. scheduler gate `meaning=...`

## Examples

| Raw reason | Friendly meaning |
| --- | --- |
| `no_pending_followup` | there is no pending follow-up |
| `empty_topic_hint` | there is no topic to continue |
| `silence_window_not_reached` | the quiet window has not been reached |
| `policy_do_not_followup` | the topic looks closed, so follow-up is blocked |
| `warmup_active` | scheduler warmup is still active |

## Safety boundaries

This task does not:

1. Change config.
2. Change scheduler gates.
3. Change follow-up policy.
4. Trigger follow-up.
5. Start polling.
6. Call `requestAssistantReply`.
7. Call LLM, fetch, or TTS.
8. Capture screenshots.
9. Call tools.
10. Execute shell commands.
11. Read files.
12. Add dependencies.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
