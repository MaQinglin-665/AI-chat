# Task 069: Follow-up policy DevTools pending fixture

## Background

Task 068 confirmed the closed-topic policy preview in a real renderer, but the live follow-up
state was idle at capture time.

This left one evidence gap: confirm that a real pending closed-topic follow-up state also fails
closed before it can become silence-eligible or scheduler-ready.

## Goal

1. Add a DevTools-only diagnostic helper for a pending closed-topic follow-up fixture.
2. Temporarily create the exact pending state needed for inspection.
3. Restore previous runtime state before returning.
4. Avoid adding any automatic execution behavior.

## New DevTools helper

```js
window.__AI_CHAT_DEBUG_TTS__.checkConversationFollowupPendingFixture(input)
```

Recommended manual command:

```js
window.__AI_CHAT_DEBUG_TTS__.checkConversationFollowupPendingFixture({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
```

## Expected result

1. `ok=true`
2. `preview.followupPolicy="do_not_followup"`
3. `preview.eligible=false`
4. `preview.blockedReasons` includes `policy_do_not_followup`
5. `preview.promptDraftEmpty=true`
6. `snapshotFollowup.pending=true`
7. `snapshotFollowup.eligible=false`
8. `snapshotFollowup.blockedReasons` includes `policy_do_not_followup`
9. `conversationFollowup.eligible=false`
10. `conversationFollowup.blockedReasons` includes `policy_do_not_followup`
11. `conversationFollowup.silence.eligibleForSilenceFollowup=false`
12. `conversationFollowup.silence.blockedReasons` includes `policy_do_not_followup`
13. `conversationFollowup.promptDraftEmpty=true`
14. `restored=true`
15. `afterRestore.pending` matches the pre-check state, usually `false` in a clean idle session.
16. `afterRestore.conversationEnabled`, `afterRestore.proactiveEnabled`, and
    `afterRestore.proactiveSchedulerEnabled` match the pre-check config state.
17. `recentEvents` includes `conversation_followup_pending_fixture_checked`

## Safety boundaries

The helper:

1. Is exposed only through `window.__AI_CHAT_DEBUG_TTS__`.
2. Is inactive unless manually called in DevTools.
3. Mutates current-page memory only during a synchronous diagnostic check.
4. Restores previous follow-up/conversation-mode timing state before returning.
5. Does not call `runConversationFollowup`, `manualProactiveSchedulerTick`, `requestAssistantReply`,
   LLM, fetch, TTS, screenshots, tools, shell, or file access.
6. Does not persist config.
7. Does not add timers, listeners, backend APIs, dependencies, or UI controls.

## Files changed

1. `web/chat.js`
2. `docs/conversational-followup-smoke-checklist.md`
3. `docs/proactive-scheduler-guard.md`
4. `docs/conversational-mode-design.md`
5. `docs/character-runtime-validation-log.md`
6. `tasks/codex/069-followup-policy-devtools-pending-fixture.md`

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
