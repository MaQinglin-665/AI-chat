# Task 066: Follow-up policy runtime checkpoint

## Background

Task 065 recommended a real Electron/DevTools runtime checkpoint before expanding proactive
behavior further.

## Goal

1. Start Electron from the local workspace.
2. Confirm the backend and renderer assets load.
3. Determine whether this terminal automation context can collect `window.__AI_CHAT_DEBUG_TTS__`
   output directly.
4. Record evidence boundaries honestly.

## Runtime attempt

Command shape:

```powershell
$env:TAFFY_OPEN_DEVTOOLS='1'
node node_modules/electron/cli.js electron/main.js
```

Observed process evidence:

```text
Electron processes: present
Node launcher process: present
Python backend process: present
Backend listener: 127.0.0.1:8123
```

Observed server log evidence:

```text
GET /config.json 200
GET /?desktop=1&transparent=1&engine=electron&alpha_mode=truealpha&view=model 200
GET /?desktop=1&engine=electron&view=chat 200
GET /chat.js 200
GET /app.js 200
GET /api/persona_card 200
GET /models/hiyori_pro_t11/... 200
```

## DevTools automation boundary

`TAFFY_OPEN_DEVTOOLS=1` opens DevTools windows, but the app does not expose a Chrome DevTools
Protocol remote debugging port by default.

Checked endpoints:

```text
http://127.0.0.1:9222/json/version -> unavailable
http://127.0.0.1:9223/json/version -> unavailable
http://127.0.0.1:8315/json/version -> unavailable
http://127.0.0.1:8123/json/version -> 404
```

Result: terminal automation can confirm Electron/backend startup, but cannot directly read
renderer `window.__AI_CHAT_DEBUG_TTS__` output in this run.

## Result

Partial.

Startup/runtime loading evidence: pass.

Renderer DevTools policy output capture: pending manual DevTools copy.

## Manual follow-up needed

In the chat window DevTools Console, run:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

Expected closed-topic result:

1. `snapshot().followup.policy="do_not_followup"`
2. `snapshot().followup.eligible=false`
3. `conversationFollowup().silence.eligibleForSilenceFollowup=false`
4. `conversationFollowup().silence.blockedReasons` includes `policy_do_not_followup`
5. No `poll_ready` event for the closed-topic case.

## Safety notes

1. No config file was modified.
2. `config.local.json` was observed but not committed or changed.
3. No screenshot, tool call, shell execution from the app, or file read behavior was added.
4. No proactive behavior was expanded.

## Verification

1. `node --check web/chat.js`
2. `python -m py_compile config.py`
3. `python -m json.tool config.example.json`
4. `git diff --check`
