# Release Demo Recording Checklist

## Scope
Use this checklist for:
- GitHub README showcase materials
- GitHub Release page materials
- social media / short video clips
- internal demo / roadshow clips
- pre-release on-device recording checks

## Recording Preparation
Before recording, review:
- [Character Runtime Safe Local Demo Config Guide](./character-runtime-safe-local-config.md)
- [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)
- [Character Runtime Demo Enablement](./character-runtime-demo.md)
- [Character Runtime Demo Prompt Examples](./character-runtime-demo-prompts.md)

Preparation checklist:
- confirm current branch
- confirm `git status --short` is clean (or only expected local-only overrides)
- do not touch legacy stash entries
- confirm LLM provider is reachable
- confirm Electron app starts
- confirm Live2D model loads
- confirm TTS is available
- confirm demo mode is enabled exactly as safe local config guide describes
- confirm there is a clear rollback plan to baseline after recording

## Recommended Recording Clips

### A. Startup and Desktop Pet Appearance
- Record app startup flow.
- Verify Live2D model appears normally.
- Do not expose sensitive config, terminal secrets, API keys, or tokens.

### B. Baseline Chat (Runtime Disabled)
- Send one normal user question.
- Verify normal assistant reply rendering.
- Verify baseline chat path is healthy.

### C. Character Runtime Demo Chat
- Enable runtime demo and send one prompt that can trigger emotion/action feedback.
- Verify reply text renders normally.
- Verify raw JSON is not shown in chat UI.

### D. Emotion Feedback
- Cover `happy`.
- Cover `surprised`.
- Cover `annoyed` (or angry-safe feedback path).
- If expression strength looks weak, note that model resource limits can cause weaker visuals and this alone does not mean runtime failure.

### E. Action Feedback
- Cover `wave`.
- Cover `shake_head`.
- Cover `think`.
- If motion resource is missing, verify safe degradation or lightweight fallback feedback.

### F. TTS Playback
- Verify TTS plays after assistant reply.
- State clearly in notes/release text: `voice_style` currently does not change TTS behavior.
- Do not imply that voice-style-driven TTS is already supported.

### G. Debug Bridge (Developer-Only Materials)
- DevTools validation clips are allowed for developer-facing materials.
- Do not place DevTools-focused debug clips in user-facing primary promo materials.
- Reference commands:

```js
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testEmotion("happy")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.testAction("wave")
window.__AI_CHAT_DEBUG_CHARACTER_RUNTIME__.emit({ emotion: "surprised", action: "think" })
```

### H. Restore Baseline
- Disable demo config.
- Restart app and verify normal chat path.
- Confirm runtime metadata no longer affects default path.

## Clip Logging Template
| Clip name | Purpose | Config state | Prompt/input | Expected visual result | Expected audio result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |

## Must Not Appear in Public Materials
- API keys, tokens, private endpoints
- private content from `config.local.json`
- stack traces
- `/api/chat` 500 errors
- red DevTools console errors
- obvious freeze/white-screen states
- raw JSON shown in chat UI
- TTS playback failure scenes
- Live2D model loading failure scenes
- claims that demo features are already a complete AI VTuber or complete memory/proactive interaction capability

## Recommended Public Messaging Boundaries
Allowed phrasing:
- "Character Runtime demo"
- "emotion/action feedback experimental pipeline"
- "desktop AI companion"

Avoid these claims:
- "complete AI VTuber"
- "long-term memory is already supported"
- "proactive interaction is already supported"
- "`voice_style` already drives TTS"

## Post-Recording Cleanup
- disable demo config or restore baseline
- restart and verify normal chat path
- run `git status --short` and ensure no accidental local config commit risk
- do not touch legacy stash entries
- store media files without sensitive information in frame
