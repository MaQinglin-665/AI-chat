# Task 058: Proactive follow-up policy preview

## Background

Task 057 added deterministic follow-up policy presets. Manual validation currently requires
mutating runtime follow-up state in DevTools, which is more error-prone than necessary.

## Goal

1. Add a DevTools-only preview helper for follow-up policy decisions.
2. Let contributors inspect policy, blocked reasons, and prompt draft without changing runtime state.
3. Keep the helper read-only and non-executing.

## Implementation

- Add `previewConversationFollowupPolicy(input)` in `web/chat.js`.
- Expose it through `window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy(input)`.
- The helper returns:
  - `eligible`
  - `reason`
  - `topicHint`
  - `followupPolicy`
  - `followupPolicyNote`
  - `blockedReasons`
  - `promptDraft`

## Safety boundaries

1. Does not mutate `state`.
2. Does not call `requestAssistantReply`.
3. Does not call LLM, fetch, TTS, tools, screenshot capture, shell execution, or file access.
4. Does not add timers, listeners, APIs, config flags, dependencies, or UI.
5. Does not change scheduler gate, polling lifecycle, cooldown/window limit, kill-switch, or fail-closed behavior.

## Manual smoke commands

```js
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "question_tail",
  topicHint: "你觉得这个方向怎么样？"
})

window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "keyword_hint",
  topicHint: "要不要我继续讲这个思路"
})

window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "我们刚才聊到主动续话策略"
})

window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
```

Expected:

1. The first command returns `light_question`.
2. The second command returns `soft_checkin`.
3. The third command returns `gentle_continue`.
4. The fourth command returns `do_not_followup`, includes `policy_do_not_followup`, and has `promptDraft=""`.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
