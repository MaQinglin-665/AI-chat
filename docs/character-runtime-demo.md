# Character Runtime Demo Enablement

## Scope
This guide explains how to enable Character Runtime for development demo/validation, without changing default behavior.

Out of scope:
- no backend response shape change by default
- no automatic frontend runtime cue application by default
- no Live2D behavior logic change unless explicit local runtime switches are enabled
- no TTS prosody change unless explicit local runtime switches are enabled

## Config Files and Defaults
- Runtime config is read from merged JSON config (`config.example.json` -> `config.json` -> `config.local.json`).
- Character Runtime default is off:
  - `character_runtime.enabled=false`
  - `character_runtime.return_metadata=false`
  - `character_runtime.auto_apply_reply_cue=false`
- Character Profile file is `config/character_profile.json` and only affects prompt contract when runtime is enabled.

## Enable Demo Mode
Add the following block to `config.json` (or `config.local.json`):

```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": true,
    "auto_apply_reply_cue": false
  }
}
```

Then restart the backend to apply the config change.

For local-only closed-loop validation, set `auto_apply_reply_cue=true` as an additional explicit opt-in. Keep it off for baseline demos.

## What Changes After Enabling
When `character_runtime.enabled=true`:
- backend injects a structured JSON output contract into LLM prompt
- Character Profile style constraints are included in that contract

When `character_runtime.return_metadata=true`:
- `/api/chat` and `/api/chat_stream` done payload may include optional `character_runtime` metadata
- metadata is handled in `chatWindow`, then forwarded to `modelWindow` through `BroadcastChannel("taffy-character-runtime")`
- emotion/action metadata can drive existing Live2D expression/motion bridge

When `character_runtime.auto_apply_reply_cue=true`:
- frontend assistant reply cue candidates may be applied to the local runtime bridge without the manual send button
- `voice_style` can influence TTS prosody through the existing talk-style/prosody path
- this remains local, explicit opt-in behavior; it does not enable desktop observation, tools, shell execution, or config writes

## Quick Verification
Detailed E2E checklist: [Character Runtime End-to-End Validation](./character-runtime-e2e-validation.md)
Quick smoke checklist: [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)
Safe local config guide: [Character Runtime Safe Local Demo Config Guide](./character-runtime-safe-local-config.md)
Supported Live2D mapping reference: [Character Runtime Live2D Mapping](./character-runtime-live2d-mapping.md)
Validation log template: [Character Runtime Validation Log Template](./character-runtime-validation-log.md)

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
- TTS behavior stays unchanged unless `auto_apply_reply_cue=true`.
- Chat text behavior stays unchanged.

## TTS Notes
- Browser TTS remains the recommended first-run path because it has the lowest setup cost.
- GPT-SoVITS can be used for local demos or recordings when you already have the service configured.
- Character Runtime `voice_style` can affect prosody only when `character_runtime.auto_apply_reply_cue=true`; it still does not automatically select a GPT-SoVITS voice or prompt.
- TTS failure should not block text chat. If server TTS fails, switch back to browser TTS for baseline verification.

## Rollback (Back to Default)
Set runtime block back to:

```json
{
  "character_runtime": {
    "enabled": false,
    "return_metadata": false,
    "auto_apply_reply_cue": false
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
