# Task 096: Follow-up rehearsal copy actions v1

## Background

Task 095 added a compact preview card to the follow-up readiness panel. When tuning character-like follow-up copy, it is useful to copy the selected local reaction sentence or the compact preview summary without selecting text manually.

## Goal

Add safe, user-click-only copy actions to the follow-up rehearsal preview panel.

## Scope

- Add a `复制短句` action that copies the currently selected local follow-up reaction sentence.
- Add a `复制摘要` action that copies the compact preview card text.
- Reuse the existing local clipboard helper used by the readiness report and config template.
- Keep the preview data local and derived from existing debug state.

## Safety posture

- Clipboard writes happen only after an explicit user click.
- The copied content is local UI/debug text already visible in the panel.
- The feature does not write config, persist state, call the backend, or change scheduler state.

## Non-goals

- Do not trigger follow-up execution.
- Do not call `runConversationFollowup()`.
- Do not call `requestAssistantReply`.
- Do not call LLM/fetch/TTS.
- Do not change scheduler gates, polling, cooldown, or window limits.
- Do not add screenshot, desktop observation, tool calls, shell execution, file reads, or config writes.

## Verification

- node --check web/chat.js
- python -m py_compile config.py
- python -m json.tool config.example.json
- git diff --check

## Manual check

1. Open `更多 -> 续话状态`.
2. Click a rehearsal scenario such as `好奇追问` or `温柔接话`.
3. Click `复制短句` and confirm the clipboard contains the selected local candidate text.
4. Click `复制摘要` and confirm the clipboard contains the compact preview card text.
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
