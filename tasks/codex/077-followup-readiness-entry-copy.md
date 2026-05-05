# Task 077: Follow-up readiness entry copy

## Background

Task 075 localized the follow-up readiness panel to Chinese-first copy, but the advanced action
entry button still said `Follow-up`.

## Goal

Make the entry point match the Chinese panel copy.

## Change

```text
Follow-up -> 续话状态
```

## Safety

This is a text-only UI copy change.

It does not:

1. Change JavaScript behavior.
2. Change config.
3. Change scheduler gates.
4. Change follow-up policy.
5. Trigger follow-up.
6. Start polling.
7. Call `requestAssistantReply`.
8. Call LLM, fetch, or TTS.
9. Capture screenshots.
10. Call tools.
11. Execute shell commands.
12. Read files.
13. Add dependencies.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
