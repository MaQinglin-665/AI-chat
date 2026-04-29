# Character Runtime Demo Enablement

## Scope
This guide explains how to enable Character Runtime for development demo/validation, without changing default behavior.

Out of scope:
- no backend response shape change by default
- no frontend UI change
- no Live2D behavior logic change
- no TTS behavior change

## Config Files and Defaults
- Runtime config is read from merged JSON config (`config.example.json` -> `config.json` -> `config.local.json`).
- Character Runtime default is off:
  - `character_runtime.enabled=false`
  - `character_runtime.return_metadata=false`
- Character Profile file is `config/character_profile.json` and only affects prompt contract when runtime is enabled.

## Enable Demo Mode
Add the following block to `config.json` (or `config.local.json`):

```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": true
  }
}
```

Then restart the backend to apply the config change.

## What Changes After Enabling
When `character_runtime.enabled=true`:
- backend injects a structured JSON output contract into LLM prompt
- Character Profile style constraints are included in that contract

When `character_runtime.return_metadata=true`:
- `/api/chat` and `/api/chat_stream` done payload may include optional `character_runtime` metadata
- metadata is handled in `chatWindow`, then forwarded to `modelWindow` through `BroadcastChannel("taffy-character-runtime")`
- emotion/action metadata can drive existing Live2D expression/motion bridge

## Quick Verification
Detailed E2E checklist: [Character Runtime End-to-End Validation](./character-runtime-e2e-validation.md)

In `chatWindow` DevTools:

```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({
  emotion: "annoyed",
  action: "shake_head"
})
```

## Demo Expected Results
- Reply text is shown normally in chat.
- `happy` attempts a positive/happy expression feedback.
- `wave` attempts mapped motion or lightweight pulse fallback.
- `unknown`/`none` values are safely skipped.
- TTS behavior stays unchanged.
- Chat text behavior stays unchanged.

## Rollback (Back to Default)
Set runtime block back to:

```json
{
  "character_runtime": {
    "enabled": false,
    "return_metadata": false
  }
}
```

Apply config and verify behavior returns to baseline path.

## Troubleshooting
- No visible motion/expression:
  - model motion/expression resources may be missing
  - bridge should degrade safely without crash
- `/api/chat` returns 500:
  - often an LLM provider/config/network issue
  - this is not equivalent to runtime bridge failure
- `window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__` is `undefined`:
  - check you opened DevTools for `chatWindow` (not `modelWindow`)
  - check frontend is updated to latest code
- Broadcast boundary:
  - BroadcastChannel only forwards runtime metadata from `chatWindow` to `modelWindow`
  - it does not execute backend calls or replace LLM/TTS pipeline
