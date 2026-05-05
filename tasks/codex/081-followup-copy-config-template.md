# Task 081: Follow-up copy config template

## Background

Task 080 explains how to edit `config.local.json`, but users still need to manually type the
`conversation_mode` keys.

## Goal

1. Let users copy a safe starter template.
2. Keep the app from writing local config automatically.
3. Preserve conservative safety boundaries.

## What changed

The follow-up readiness panel now includes:

```text
复制模板
```

The button copies this JSON snippet:

```json
{
  "conversation_mode": {
    "enabled": true,
    "proactive_enabled": true,
    "proactive_scheduler_enabled": true,
    "proactive_cooldown_ms": 600000,
    "proactive_warmup_ms": 120000,
    "proactive_poll_interval_ms": 60000,
    "max_followups_per_window": 1,
    "silence_followup_min_ms": 180000
  }
}
```

## Safety boundaries

The button:

1. Requires an explicit user click.
2. Writes static template text to clipboard only.
3. Does not read clipboard content.
4. Does not write config.
5. Does not read files.
6. Does not observe the desktop.
7. Does not change runtime config.
8. Does not change scheduler gates or follow-up policy.
9. Does not trigger follow-up or start polling.
10. Does not call `requestAssistantReply`.
11. Does not call LLM, fetch, or TTS.
12. Does not capture screenshots.
13. Does not call tools or execute shell commands.
14. Does not add dependencies or backend APIs.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
