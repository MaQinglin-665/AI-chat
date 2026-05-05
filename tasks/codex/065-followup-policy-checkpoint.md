# Task 065: Follow-up policy checkpoint

## Background

Tasks 056~064 advanced the proactive follow-up content and policy layer after the guarded
proactive scheduler path was merged.

This checkpoint records what is now closed, what remains intentionally conservative, and what
should come next.

## Current state

| Area | Status | Notes |
| --- | --- | --- |
| Prompt wording | Closed | Task 056 made proactive follow-up short, optional, low-pressure, and explicitly safe. |
| Policy presets | Closed | Task 057 added deterministic `gentle_continue`, `light_question`, `soft_checkin`, and `do_not_followup`. |
| Preview helper | Closed | Task 058 added read-only DevTools preview without mutating runtime state. |
| Policy preview smoke | Closed | Task 059 recorded four policy preset checks. |
| Debug snapshot policy visibility | Closed | Task 060 exposed policy fields in `snapshot().followup`. |
| Debug event policy visibility | Closed | Task 061 added policy context to existing event payloads. |
| Follow-up plan readiness visibility | Closed | Task 062 exposed `eligible` and `blockedReasons` in `snapshot().followup`. |
| Silence eligibility policy block | Closed | Task 063 makes `do_not_followup` fail closed before silence can report ready. |
| Silence policy smoke | Closed | Task 064 verified closed-topic silence blocking with local helper smoke. |

## Safety posture

The current follow-up policy line remains conservative:

1. Defaults remain off unless configured.
2. No automatic desktop observation is added.
3. No screenshot capture is added.
4. No tool call, shell execution, or file read path is added.
5. No new backend API or dependency is added.
6. No new direct `requestAssistantReply` path is added.
7. `do_not_followup` is a fail-closed policy and now blocks both plan readiness and silence eligibility.

## Operational debugging surface

Contributors can inspect the current state with:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

Expected useful fields:

1. `snapshot().followup.eligible`
2. `snapshot().followup.blockedReasons`
3. `snapshot().followup.policy`
4. `snapshot().followup.policyBlockedReason`
5. `conversationFollowup().silence.eligibleForSilenceFollowup`
6. `conversationFollowup().silence.blockedReasons`
7. policy context in follow-up / scheduler debug events

## Recommended next steps

1. Task 066: live DevTools checkpoint for the follow-up policy path.
   - Goal: run Electron and capture actual `snapshot()` / `conversationFollowup()` / `events()` output for a closed-topic case.
   - Scope: validation only, no feature expansion.
2. Task 067: optional user-facing docs for proactive follow-up configuration.
   - Goal: explain what the switches do and how to keep the feature off/safe.
   - Scope: docs only.
3. Task 068: consider a minimal UI/debug panel display only if manual DevTools friction becomes too high.
   - Goal: visibility, not behavior expansion.

## Recommendation

Do not expand proactive behavior yet. The next safest step is a real Electron/DevTools runtime
checkpoint for the closed-topic fail-closed path, then decide whether the feature is ready for
broader manual testing.
