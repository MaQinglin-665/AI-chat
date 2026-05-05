# Task 063: Follow-up policy silence eligibility

## Background

Task 057 added `do_not_followup` as a conservative policy for closed-topic hints. The manual
follow-up plan already blocks this policy, but the silence eligibility snapshot did not include
the same policy block. That could make a closed-topic follow-up appear silence-ready before
being blocked later by the manual follow-up guard.

## Goal

Make silence eligibility fail closed for `do_not_followup` policy.

## Implementation

- Reuse `buildConversationFollowupPolicy(...)` inside `buildConversationSilenceDebugSnapshot(...)`.
- Add `policy_do_not_followup` to `silence.blockedReasons` when the topic hint looks closed.
- Expose `followupPolicy` and `followupPolicyNote` in the silence debug snapshot.

## Safety boundaries

1. This only tightens eligibility; it does not make proactive behavior more permissive.
2. Does not add timers, listeners, APIs, config flags, dependencies, or UI.
3. Does not call `requestAssistantReply` from a new path.
4. Does not call LLM, fetch, TTS, tools, screenshot capture, shell execution, or file access.
5. Does not change scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, or fail-closed behavior.

## Manual smoke

In DevTools, construct a closed-topic pending state and inspect:

```js
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup().silence
```

Expected:

1. `eligibleForSilenceFollowup=false`
2. `blockedReasons` includes `policy_do_not_followup`
3. `followupPolicy="do_not_followup"`

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
