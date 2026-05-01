# Character Runtime Validation Log Template

## Scope

Use this template when recording a Character Runtime validation run for a PR, release candidate, demo rehearsal, or regression check.

Keep this log free of secrets and private desktop content. Do not paste API keys, provider tokens, raw private prompts, local absolute model paths, memory contents, or screenshots that expose private files.

## Run Metadata

| Item | Value |
| --- | --- |
| Date |  |
| Tester |  |
| Branch / commit |  |
| OS |  |
| Python version |  |
| Node version |  |
| Electron mode | desktop / browser / not tested |
| LLM provider | OpenAI-compatible / Ollama / other / not tested |
| TTS provider | browser / GPT-SoVITS / other / not tested |
| Live2D model family | public sample / private local / not disclosed |

## Safe Config Summary

Do not paste full config files. Record only safe runtime flags:

| Flag | Value |
| --- | --- |
| `character_runtime.enabled` | true / false |
| `character_runtime.return_metadata` | true / false |
| `character_runtime.demo_stable` | true / false |
| `character_runtime.persona_override.enabled` | true / false |
| `observe.attach_mode` | manual / intent / always / not checked |
| desktop observation active during test | yes / no |
| tool calling active during test | yes / no |
| proactive behavior active during test | yes / no |

Optional diagnostic check:

```text
GET /api/health with a valid local token, then confirm character_runtime only contains safe boolean flags.
```

## Automated Checks

Run from the repository root:

```bash
python scripts/check_character_runtime_v1_3.py
```

Or run the same checks individually:

```bash
python -m pytest
node tests/test_character_runtime_frontend.js
python scripts/check_python_syntax.py
python scripts/check_js_syntax.py
python scripts/check_secrets.py
```

| Command | Result | Notes |
| --- | --- | --- |
| `python -m pytest` | pass / fail / skipped |  |
| `node tests/test_character_runtime_frontend.js` | pass / fail / skipped |  |
| `python scripts/check_python_syntax.py` | pass / fail / skipped |  |
| `python scripts/check_js_syntax.py` | pass / fail / skipped |  |
| `python scripts/check_secrets.py` | pass / fail / skipped |  |

## Manual Runtime Checks

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Runtime disabled baseline | Chat/TTS works without `character_runtime` response dependency |  |  |  |
| Runtime enabled, metadata off | Chat works and no metadata is required by UI |  |  |  |
| Runtime enabled, metadata on | Optional metadata appears and chat text remains readable |  |  |  |
| Bad JSON/plain text reply | Chat text does not show raw broken JSON |  |  |  |
| chatWindow debug bridge | DevTools commands run without crash |  |  |  |
| Cross-window bridge | Metadata reaches `modelWindow` through BroadcastChannel |  |  |  |
| Emotion feedback | `happy`, `surprised`, `annoyed`, `thinking` safely show or degrade |  |  |  |
| Action feedback | `wave`, `shake_head`, `think` safely show or degrade |  |  |  |
| TTS success | Mouth/motion returns to idle smoothly |  |  |  |
| TTS failure/fallback | Visible chat text remains usable |  |  |  |
| Proactive default-off | No surprise proactive message appears in baseline config |  |  |  |
| Proactive rollback | Proactive/debug path can be disabled quickly |  |  |  |
| Rollback | Setting runtime off restores baseline behavior |  |  |  |

## Debug Bridge Commands

Run these in `chatWindow` DevTools only:

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

Record only whether the commands worked. Do not paste private console output.

## Evidence Checklist

Use safe evidence only:

- short clip with no API keys or private desktop content visible
- cropped screenshot of the app only
- command summaries without secrets
- notes about weak/missing motion resources
- link to public issue or PR if applicable

Avoid:

- API keys or provider dashboards
- private desktop screenshots
- full local config files
- personal files, paths, or memory logs
- claims that Character Runtime is a mature AI VTuber engine

## Findings and Follow-Up

| Finding | Severity | Owner | Follow-up issue/PR |
| --- | --- | --- | --- |
|  | low / medium / high |  |  |

## Final Result

Overall result: pass / fail / partial

Short summary:

```text

```
