# Task 097: Follow-up rehearsal copy bundle v1

## Background

Task 096 added separate `复制短句` and `复制摘要` actions in the follow-up rehearsal panel. During manual tuning and PR review, contributors often need both pieces together in one paste block.

## Goal

Add a safe, user-click-only `复制对比包` action that copies one local comparison bundle:

- selected follow-up short sentence
- compact rehearsal preview summary

## Scope

- Add a `复制对比包` button to the follow-up readiness panel actions.
- Build local bundle text from existing preview-card data and summary text.
- Reuse existing clipboard helper (`writeTextToClipboard`).
- Keep all data local and read-only from current debug/rehearsal state.

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
3. Click `复制对比包`.
4. Confirm clipboard text includes:
   - one line for selected short sentence
   - one summary block matching the preview card
5. Confirm no assistant request, speech, screenshot, tool call, shell command, file read, config write, or scheduler behavior change occurs.
