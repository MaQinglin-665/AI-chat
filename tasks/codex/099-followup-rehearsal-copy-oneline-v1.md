# Task 099: Follow-up rehearsal copy one-line v1

## Background

Task 098 added structured JSON copy for rehearsal snapshots. In many quick review cases (PR comments, changelog notes, commit context), contributors prefer a compact single-line summary.

## Goal

Add a safe, user-click-only `复制一行` action that copies one compact line from current local rehearsal preview data.

## Scope

- Add a `复制一行` button to the follow-up readiness panel actions.
- Build one-line text from existing local preview-card data only:
  - scenario
  - character label/mood
  - policy/tone/selected index
  - blocked reasons
  - selected short sentence
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
3. Click `复制一行`.
4. Confirm clipboard text is a single line containing scenario/state/policy/tone/selected/blocked/line fields.
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
