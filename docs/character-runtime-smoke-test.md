# Character Runtime Demo Smoke Test Checklist

## Scope and When to Use
Use this checklist for quick manual verification in these cases:
- before a release cut
- before a public or internal demo
- after Character Runtime related changes

This checklist is not:
- an automated test suite
- a full end-to-end test replacement

For deeper chain validation, also run:
- [Character Runtime End-to-End Validation](./character-runtime-e2e-validation.md)
- [Character Runtime Live2D Mapping](./character-runtime-live2d-mapping.md)
- [Character Runtime Validation Log Template](./character-runtime-validation-log.md)
- [Character Runtime Proactive Safety](./character-runtime-proactive-safety.md)

## Prerequisites
- Backend can start normally.
- Electron/frontend can start normally.
- LLM provider is configured and reachable.
- Live2D model resources are loadable.
- `chatWindow` DevTools can be opened.
- Character Runtime demo enablement follows:
  - [Character Runtime Demo Enablement](./character-runtime-demo.md)
- Safe local override and cleanup workflow follows:
  - [Character Runtime Safe Local Demo Config Guide](./character-runtime-safe-local-config.md)

## Baseline Check (Runtime Disabled)
Use:

```json
{
  "character_runtime": {
    "enabled": false,
    "return_metadata": false
  }
}
```

Verify:
- normal chat works
- response path does not require `character_runtime` metadata
- TTS behavior is unchanged
- Live2D is not triggered by runtime metadata path
- no proactive message appears during normal startup

## Demo Enabled Check
Use:

```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": true
  }
}
```

Verify:
- chat text is shown normally
- backend does not crash when model output is non-JSON or bad JSON
- when `return_metadata=true`, `character_runtime` metadata can be observed
- metadata should not contain `text`
- metadata should cover:
  - `emotion`
  - `action`
  - `intensity`
  - `live2d_hint`
  - `voice_style`

## DevTools Debug Bridge Check (`chatWindow`)
Run:

```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("annoyed")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("shake_head")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({
  emotion: "surprised",
  action: "think"
})
```

## Cross-Window Bridge Check (`chatWindow` -> `modelWindow`)
- Debug bridge is typically exercised in `chatWindow`.
- Runtime metadata should be forwarded via `BroadcastChannel("taffy-character-runtime")`.
- `modelWindow` is responsible for actual Live2D expression/motion feedback.
- If `chatWindow` has metadata but `modelWindow` has no visible feedback, first check:
  - cross-window bridge wiring
  - model window runtime handling
  - Live2D model resources

## Live2D Expression/Motion Expectations
Detailed mapping table: [Character Runtime Live2D Mapping](./character-runtime-live2d-mapping.md)

- `happy`: attempts happy/positive expression
- `annoyed`: attempts angry/annoyed-safe feedback
- `surprised`: attempts surprised expression
- `wave`: attempts mapped motion or pulse fallback
- `shake_head`: attempts mapped motion or pulse fallback
- `unknown`/`none`: safely skipped
- missing motion resources: safe degradation, no crash

## TTS and Chat Text Checks
- TTS behavior should not change because of `voice_style`
- browser TTS should remain the easiest baseline voice path
- GPT-SoVITS/server TTS may be used for local demos, but it should remain optional
- successful TTS playback should return mouth/motion feedback to idle smoothly
- failed TTS playback should not block visible chat text
- chat text should not display raw JSON structure
- chat text should remain normal user-readable reply text
- runtime metadata should not pollute chat UI

## Common Failure Attribution
- `/api/chat` 500:
  - first check LLM provider/config/network
- debug bridge is `undefined`:
  - usually wrong DevTools window
  - or frontend code is stale
- metadata exists but no visible motion:
  - `modelWindow` did not receive event
  - Live2D model not loaded
  - motion resources missing and fallback path engaged
- expression/motion looks weak:
  - mapping/resource limitations are possible
  - not always a runtime chain failure

## Pass/Fail Recording Template
For release candidates or PR evidence, prefer the full template:
- [Character Runtime Validation Log Template](./character-runtime-validation-log.md)

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Runtime disabled baseline | Baseline behavior unchanged |  |  |  |
| Runtime enabled metadata | Optional `character_runtime` metadata available |  |  |  |
| Debug bridge commands | No crash, expected feedback attempts |  |  |  |
| Cross-window forwarding | Metadata reaches `modelWindow` |  |  |  |
| TTS and chat text | No regression in TTS/text UI |  |  |  |
| Proactive default-off | No surprise proactive message |  |  |  |
