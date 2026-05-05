# Task 079: Follow-up readiness copy report

## Background

The follow-up readiness panel is now Chinese-first, but users still need screenshots or manual
copying to share the current readiness state.

## Goal

1. Add a simple way to copy the current readiness report.
2. Keep the panel read-only.
3. Avoid adding new behavior around follow-up or scheduler execution.

## What changed

1. Add a `复制` button to the follow-up readiness panel.
2. Copy the current `buildFollowupReadinessReport()` text when the user clicks the button.
3. Show a short `已复制` button state after success.
4. Localize the close button from `Hide` to `隐藏`.

## Safety boundaries

The copy action:

1. Requires an explicit user click.
2. Writes only the current readiness report text to clipboard.
3. Does not read clipboard content.
4. Does not read files.
5. Does not observe the desktop.
6. Does not change config.
7. Does not change scheduler gates or follow-up policy.
8. Does not trigger follow-up or start polling.
9. Does not call `requestAssistantReply`.
10. Does not call LLM, fetch, or TTS.
11. Does not capture screenshots.
12. Does not call tools or execute shell commands.
13. Does not add dependencies.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
