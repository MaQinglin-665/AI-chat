# Task 075: Follow-up readiness Chinese copy

## Background

Task 072 added a read-only follow-up readiness panel, and Task 074 added a friendly English
summary. The panel was useful for developers but still hard for Chinese users to understand.

## Goal

1. Make the panel Chinese-first.
2. Keep raw diagnostic keys visible for debugging.
3. Avoid changing any readiness, policy, scheduler, or trigger behavior.

## What changed

The panel now uses Chinese copy for:

1. Panel title: `续话状态`
2. Summary title: `摘要`
3. State summary sentences
4. Switch labels
5. Follow-up status labels
6. Silence gate labels
7. Scheduler gate labels
8. Safety note

Raw blocked reason keys remain visible under `原始原因`.

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
