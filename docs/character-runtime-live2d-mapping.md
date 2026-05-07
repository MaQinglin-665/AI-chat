# Character Runtime Live2D Mapping

## Scope

This document describes the current Character Runtime emotion/action values that can reach the Live2D frontend bridge.

It is a development and demo reference, not a promise that every Live2D model will show every motion strongly. Final visual quality depends on the model's available expression and motion resources.

## Runtime Metadata Fields

When `character_runtime.enabled=true` and `character_runtime.return_metadata=true`, `/api/chat` and `/api/chat_stream` may include optional metadata:

```json
{
  "character_runtime": {
    "emotion": "happy",
    "action": "wave",
    "intensity": "normal",
    "voice_style": "warm",
    "live2d_hint": "smile_soft"
  }
}
```

Notes:

- `text` is intentionally removed from returned metadata.
- Unknown or malformed values are normalized before use.
- Metadata is optional. Chat and TTS must keep working without it.
- `voice_style` can nudge TTS prosody only when `character_runtime.auto_apply_reply_cue=true`; it does not select a TTS voice/model.

## Supported Emotions

Backend normalization accepts these emotion values:

| Runtime emotion | Backend Live2D hint | Frontend mood behavior | Fallback behavior |
| --- | --- | --- | --- |
| `neutral` | `idle_relaxed` | idle mood | no special motion required |
| `happy` | `smile_soft` | happy mood | subtle expression pulse |
| `playful` | `smile_grin` | idle mood today | subtle expression pulse |
| `sad` | `eyes_down` | sad mood | subtle expression pulse |
| `anxious` | `brow_worried` | idle mood today | subtle expression pulse |
| `angry` | `brow_tense` | angry mood | subtle expression pulse |
| `surprised` | `eyes_wide` | surprised mood | subtle expression pulse |
| `annoyed` | `brow_tense` | angry-safe mood | subtle expression pulse |
| `thinking` | `idle_relaxed` | idle mood | subtle expression pulse |

Unknown emotion values fall back to `neutral`.

## Supported Actions

Frontend action handling is best-effort. It tries the listed motion groups in order and falls back to a lightweight expression pulse when motion playback fails or resources are missing.

| Runtime action | Aliases | Frontend mood | Motion groups attempted | Fallback behavior |
| --- | --- | --- | --- | --- |
| `none` | none | none | none | safely skipped |
| `wave` | none | happy | `Tap`, `FlickUp`, `Idle` | happy pulse |
| `nod` | none | idle | `FlickDown`, `Idle` | idle pulse |
| `shake_head` | `shake-head` | angry-safe | `Flick@Body`, `Flick`, `Idle` | angry-safe pulse |
| `think` | `thinking`, `ponder`, `pondering` | idle | `FlickDown`, `Idle` | idle pulse |
| `happy_idle` | none | happy | `Idle`, `Tap` | happy pulse |
| `surprised` | none | surprised | `FlickUp`, `Tap`, `Idle` | surprised pulse |

Unknown action values fall back to `none`.

## Intensity

Supported values:

| Runtime intensity | Current behavior |
| --- | --- |
| `low` | accepted and forwarded |
| `normal` | accepted and forwarded |
| `high` | accepted and forwarded |

Unknown intensity values fall back to `normal`.

The current frontend bridge does not yet use `intensity` as a strong visual multiplier. Treat it as a stable metadata field for future tuning.

## Failure Behavior

The bridge should remain non-blocking:

- If metadata is missing, chat and TTS continue normally.
- If metadata is malformed, unsupported values are normalized or ignored.
- If `BroadcastChannel` is unavailable, metadata is not forwarded to the model window.
- If the Live2D model is not loaded, emotion/action feedback is skipped.
- If a motion group is missing or playback fails, the frontend attempts a subtle expression pulse fallback.
- If expression feedback also fails, the error is contained and chat continues.

## Manual Debug Commands

Open DevTools for `chatWindow` and run:

```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("surprised")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("shake_head")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({
  emotion: "thinking",
  action: "think",
  intensity: "normal"
})
```

Expected result:

- no crash
- no raw JSON visible in chat text
- visible feedback when model resources support it
- safe skip or subtle fallback when resources are limited

## Verification

Run automated checks:

```bash
python -m pytest
node tests/test_character_runtime_frontend.js
python scripts/check_js_syntax.py
python scripts/check_secrets.py
```

Then run the manual smoke checklist:

- [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)
- [Character Runtime End-to-End Validation](./character-runtime-e2e-validation.md)
