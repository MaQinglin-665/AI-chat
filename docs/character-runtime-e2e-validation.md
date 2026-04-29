# Character Runtime End-to-End Validation

## Scope
This document verifies the Character Runtime pipeline from LLM output to frontend metadata bridge and Live2D emotion/action feedback.

This validation is development-time only:
- no backend response shape changes
- no frontend UI changes
- no Live2D behavior logic changes
- no TTS behavior changes

## Prerequisites
1. Run backend and Electron app normally.
2. Keep two windows visible:
- `chatWindow` (`?view=chat`)
- `modelWindow` (`?view=model`)
3. Open DevTools in `chatWindow`.

## Config Profiles
Use config values in backend config (`character_runtime`):

### A. Baseline (default-off)
```json
{
  "character_runtime": {
    "enabled": false,
    "return_metadata": false
  }
}
```

### B. Runtime on, metadata off
```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": false
  }
}
```

### C. Runtime on, metadata on
```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": true
  }
}
```

## Validation Checklist

### 1) Runtime default-off compatibility
Goal: runtime disabled should preserve old behavior.

Check:
- Chat text behavior remains unchanged.
- Response shape remains unchanged (no required new field).
- TTS behavior remains unchanged.
- No runtime errors in frontend console.

Expected:
- Same UX as pre-runtime path.

### 2) Runtime enabled prompt contract injection
Goal: only when `enabled=true`, LLM prompt includes structured JSON contract + profile style guidance.

Check (dev logs / instrumentation / test hooks):
- Prompt contains JSON-only contract text.
- Prompt includes profile guidance (persona/tone/style notes/guidelines/boundaries).
- When `enabled=false`, prompt remains old style (no runtime contract).

Expected:
- Injection happens only on enabled path.

### 3) Metadata response opt-in
Goal: metadata appears only when `enabled=true` and `return_metadata=true`.

Check `/api/chat` and `/api/chat_stream` done payload:
- `return_metadata=false` -> no `character_runtime` field.
- `return_metadata=true` -> `character_runtime` present.

Expected:
- `character_runtime` remains optional and backward-compatible.

### 4) chatWindow metadata receive
Goal: chat renderer receives runtime metadata safely.

Check:
- `window.__AI_CHAT_LAST_CHARACTER_RUNTIME__` updates after runtime-enabled reply.
- Invalid metadata (non-object/null/array) is safely ignored.

Expected:
- No crash, no UI regression.

### 5) Cross-window BroadcastChannel bridge
Goal: metadata from chatWindow is forwarded to modelWindow.

Check:
- Channel used: `BroadcastChannel("taffy-character-runtime")`.
- modelWindow receives forwarded metadata and dispatches local `character-runtime:update`.
- No rebroadcast loop from modelWindow.

Expected:
- Metadata reaches model renderer safely.

### 6) Emotion/action bridge in modelWindow
Goal: model renderer consumes metadata and attempts emotion/action feedback.

Check:
- emotion mapping path triggers expected mood feedback.
- action mapping path triggers motion attempt or safe pulse fallback.
- unknown/none values are skipped safely.

Expected:
- No hard crash even if model motion resources are missing.

### 7) Debug bridge manual triggers (chatWindow DevTools)
Run:
```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("annoyed")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({
  emotion: "surprised",
  action: "shake_head"
})
```

Expected:
- `happy`: attempts positive/happy feedback.
- `annoyed`: maps toward angry/annoyed-safe feedback.
- `wave`: attempts motion or lightweight pulse fallback.
- unknown/none inputs: no crash.
- chat text remains unchanged.
- TTS remains unchanged.

### 8) Runtime rollback check
Goal: turning runtime off restores old behavior.

Check:
- switch back to `enabled=false`.
- verify prompt path and response behavior return to baseline.

Expected:
- no residual dependency on runtime metadata.

## Known Limitations
- No dedicated frontend automated test command currently.
- Live2D visible effect depends on model assets and available motions/expressions.
- Missing motion resources should safely degrade to lightweight fallback behavior.
- Provider/network errors that make `/api/chat` fail are backend LLM issues, separate from the runtime frontend bridge.

## Recommended Regression Commands
```bash
python -m pytest tests/test_character_runtime.py -q
python -m pytest tests/test_character_runtime_integration.py -q
```
