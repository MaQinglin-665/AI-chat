# Task 067: Follow-up policy manual DevTools checklist

## Background

Task 066 confirmed Electron/backend startup but could not capture renderer
`window.__AI_CHAT_DEBUG_TTS__` output from terminal automation because no CDP remote debugging
port is exposed by default.

Task 067 provides a copy/paste checklist for the remaining manual DevTools evidence.

## Goal

1. Make the manual DevTools step short and hard to mess up.
2. Capture the exact fields needed to close the Task 066 `partial` result.
3. Avoid changing runtime code or configuration.

## Preconditions

1. Start Electron locally.
2. Open the chat window DevTools Console.
3. Do not enable screenshot/tool/file access for this check.
4. Do not commit local config files.

## Copy/paste command

Paste this in the chat window DevTools Console:

```js
(() => {
  const debug = window.__AI_CHAT_DEBUG_TTS__;
  if (!debug) {
    return { ok: false, reason: "debug_bridge_missing" };
  }
  const preview = debug.previewConversationFollowupPolicy({
    reason: "followup_pending",
    topicHint: "先这样，晚安"
  });
  const snapshotFollowup = debug.snapshot().followup;
  const conversationFollowup = debug.conversationFollowup();
  const recentEvents = debug.events().slice(-30).map((event) => ({
    type: event.type,
    text: event.text,
    result: event.result,
    error: event.error
  }));
  return {
    ok: true,
    preview: {
      followupPolicy: preview.followupPolicy,
      eligible: preview.eligible,
      blockedReasons: preview.blockedReasons,
      promptDraftEmpty: !String(preview.promptDraft || "").trim()
    },
    snapshotFollowup: {
      pending: snapshotFollowup.pending,
      eligible: snapshotFollowup.eligible,
      blockedReasons: snapshotFollowup.blockedReasons,
      policy: snapshotFollowup.policy,
      policyBlockedReason: snapshotFollowup.policyBlockedReason
    },
    conversationFollowup: {
      eligible: conversationFollowup.eligible,
      blockedReasons: conversationFollowup.blockedReasons,
      followupPolicy: conversationFollowup.followupPolicy,
      promptDraftEmpty: !String(conversationFollowup.promptDraft || "").trim(),
      silence: {
        eligibleForSilenceFollowup: conversationFollowup.silence?.eligibleForSilenceFollowup,
        blockedReasons: conversationFollowup.silence?.blockedReasons,
        followupPolicy: conversationFollowup.silence?.followupPolicy
      }
    },
    recentEvents
  };
})()
```

## Expected closed-topic evidence

The `preview` block should show:

```text
followupPolicy=do_not_followup
eligible=false
blockedReasons includes policy_do_not_followup
promptDraftEmpty=true
```

The `conversationFollowup.silence` block should show:

```text
eligibleForSilenceFollowup=false
blockedReasons includes policy_do_not_followup
followupPolicy=do_not_followup
```

The `recentEvents` block should not contain a new `proactive_scheduler_poll_ready` for this
closed-topic case.

## Record template

````md
Date:
Branch / commit:
Electron launched: yes/no
DevTools command result:

```json
PASTE_RESULT_HERE
```

Conclusion: pass / partial / fail
Residual risk:
````

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
