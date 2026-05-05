# Task 098: Follow-up rehearsal copy JSON v1

## Background

Task 097 added a one-click copy bundle for short sentence + summary. For issue reports and review comments, contributors also need a stable structured snapshot that is easy to diff and parse.

## Goal

Add a safe, user-click-only `复制JSON` action that copies a structured local rehearsal snapshot.

## Scope

- Add a `复制JSON` button to the follow-up readiness panel actions.
- Build JSON from existing local preview-card data only:
  - scenario
  - character label/mood
  - policy/tone/selected index/candidate text
  - blocked reasons
- Reuse existing clipboard helper (`writeTextToClipboard`).

## Safety posture

- Clipboard write happens only after explicit user click.
- Copied content is local UI/debug text already visible in the panel.
- No config writes, no persistent state changes, no backend requests.

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
3. Click `复制JSON`.
4. Confirm clipboard text is valid JSON and includes scenario/character/followup/safety fields.
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
