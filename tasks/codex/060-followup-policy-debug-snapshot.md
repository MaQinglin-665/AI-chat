# Task 060: Follow-up policy debug snapshot

## Background

Task 057 added follow-up policy presets and Task 058 added a read-only preview helper.
However, `window.__AI_CHAT_DEBUG_TTS__.snapshot().followup` still only showed pending state,
reason, topic hint, and age. Contributors had to call a separate helper to inspect the current
pending state's policy.

## Goal

Expose the current pending follow-up policy in the existing debug snapshot.

## Implementation

- Extend `getTTSDebugSnapshot().followup` with:
  - `policy`
  - `policyNote`
  - `policyBlockedReason`
- Reuse the existing deterministic `buildConversationFollowupPolicy(...)` helper.

## Safety boundaries

1. Read-only snapshot change only.
2. Does not mutate follow-up state.
3. Does not call `requestAssistantReply`.
4. Does not call LLM, fetch, TTS, tools, screenshot capture, shell execution, or file access.
5. Does not change scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, fail-closed behavior, config defaults, APIs, dependencies, or UI.

## Manual smoke

In DevTools:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
```

Expected:

1. Existing fields remain present: `pending`, `reason`, `topicHint`, `updatedAgeMs`.
2. New fields are present: `policy`, `policyNote`, `policyBlockedReason`.
3. Closed-topic hints show `policy="do_not_followup"` and `policyBlockedReason="policy_do_not_followup"`.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
