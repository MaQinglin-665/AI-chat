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

## Proactive Scheduler Controlled Checkpoint Addendum（Task 046）

Use this addendum when validating Task 044/045 on a controlled branch.
Keep records concise, reproducible, and free of private desktop content.

| Checkpoint Item | Config Conditions | Expected Events | Actual | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| A. 默认关闭回归 | 任一关键开关为 false | `proactive_scheduler_poll_blocked` / disabled stop |  |  |  |
| B. 三层开关联调 | 三层开关均为 true | `poll_start` + `poll_blocked/poll_ready` |  |  |  |
| C. Kill-switch 运行时验证 | polling active 后关闭任一开关 | `poll_stop` + reasoned `poll_blocked` |  |  |  |
| D. 异常 fail-closed | 注入 trigger 异常场景 | `poll_failed`（必要时）+ `poll_stop` |  |  |  |
| E. 安全边界复核 | 全程 | 无不安全新增路径 |  |  |  |

结论模板：

```text
Overall result: pass / fail / partial
Residual risks:
Rollback suggestion:
```

---

# Validation Run - 2026-05-03 v1.3 Preview

## Run Metadata

| Item | Value |
| --- | --- |
| Date | 2026-05-03 |
| Tester | Codex |
| Branch / commit | `codex/memory-learning-audit` / `8d5928d` |
| OS | Windows |
| Python version | 3.11.9 |
| Node version | v25.2.1 |
| Electron mode | desktop |
| LLM provider | OpenAI-compatible |
| TTS provider | GPT-SoVITS configured |
| Live2D model family | private local / not disclosed |

## Safe Config Summary

| Flag | Value |
| --- | --- |
| `character_runtime.enabled` | true |
| `character_runtime.return_metadata` | false |
| `character_runtime.demo_stable` | true |
| `character_runtime.persona_override.enabled` | true |
| `observe.attach_mode` | manual |
| desktop observation active during test | no |
| tool calling active during test | no manual tool call exercised |
| proactive behavior active during test | no |

## Automated Checks

| Command | Result | Notes |
| --- | --- | --- |
| `python scripts/check_character_runtime_v1_3.py` | pass | Quality gate passed. |
| `python -m pytest` | pass | 196 passed, 1 warning. |
| `node tests/test_character_runtime_frontend.js` | pass | Included in quality gate. |
| `node tests/test_api_client_frontend.js` | pass | Included in quality gate. |
| `node tests/test_chat_api_frontend.js` | pass | Included in quality gate. |
| `node tests/test_speech_text_frontend.js` | pass | Included in quality gate. |
| `node tests/test_tts_api_frontend.js` | pass | Included in quality gate. |
| `python scripts/check_python_syntax.py` | pass | 54 files checked. |
| `python scripts/check_js_syntax.py` | pass | 37 files checked. |
| `python scripts/check_secrets.py` | pass | 179 files checked. |

## Local API Smoke Checks

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| `/api/health` | Safe runtime flags returned with local token | Runtime enabled, metadata off, demo stable true | Pass | No secrets recorded. |
| `/api/translate` | Translation does not degrade | `degraded=false`, `fallback=false` | Pass | OpenAI-compatible provider reachable. |
| `/api/memory/debug` | Memory and learning debug loads | `learning.degraded=false`; candidates/samples visible | Pass | Learning recovered from stale scorer state. |
| `/api/learning/reload` | Review data reloads | 11 candidates, 10 samples, degraded false | Pass | Local data files are not tracked. |

## Manual Runtime Checks

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Runtime enabled, metadata off | Chat works and no metadata is required by UI | Stable during local use | Pass | User reported current build feels stable. |
| Chat text / TTS stale guard | No previous reply tail plays on new message | No current repro observed | Pass | Covered by frontend checks. |
| Runtime metadata leak guard | Chat/subtitle/TTS do not show raw JSON fragments | Covered by automated tests | Pass | Metadata suffix and partial fragment regressions covered. |
| Translation degraded guard | Translation does not fall back to source text | Local API smoke passed | Pass | Uses increased translation token budget. |
| Memory selection guard | Low-signal inputs do not inject unrelated memory | Covered by automated tests | Pass | `/memorydebug` available. |
| Learning review recovery | Learning panel/reload path is usable | Local API smoke passed | Pass | Stale degraded recovered. |

## Findings and Follow-Up

| Finding | Severity | Owner | Follow-up issue/PR |
| --- | --- | --- | --- |
| Learning review writes candidates/samples/state as separate files, not a cross-file transaction. | low | future v1.6 | Consider revisioned or transactional persistence if the learning store grows. |
| Live2D expression response is present but subtle in the current private model. | low | future polish | Consider model-specific expression/motion tuning after v1.3 preview. |

## Final Result

Overall result: pass

Short summary:

```text
v1.3 preview quality gate passed. Runtime text/metadata/TTS/translation/memory-learning regressions are covered by automated checks and local API smoke tests. Build is suitable for a demo rehearsal, with one remaining manual visual Live2D check recommended before public recording.
```

---

# Validation Update - 2026-05-03 GPT-SoVITS TTS Stability

## Run Metadata

| Item | Value |
| --- | --- |
| Date | 2026-05-03 |
| Tester | Codex + maintainer listening check |
| Branch / commit | `codex/memory-learning-audit` / `0289b23` |
| OS | Windows |
| Python version | 3.11.9 |
| Node version | v25.2.1 |
| Electron mode | desktop |
| TTS provider | GPT-SoVITS configured |

## Automated Checks

| Command | Result | Notes |
| --- | --- | --- |
| `python scripts/check_character_runtime_v1_3.py` | pass | Quality gate passed with `208 passed`, frontend checks, syntax checks, and secret scan. |
| `python scripts/first_run_check.py` | pass | 4 expected local demo warnings: Node LTS recommendation, existing healthy backend on configured port, GPT-SoVITS service reminder, runtime enabled for demo. |

## TTS Manual Check

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| GPT-SoVITS electric-noise regression | No electric-noise artifact during normal demo speech | Maintainer reported current playback is stable | Pass | Peak limiter now reduces hot transient peaks even when RMS is acceptable. |
| GPT-SoVITS "far away" regression | Voice should not sound overly distant or quiet | Maintainer reported current balance is stable | Pass | `gpt_sovits_max_rms` is now `5000`, avoiding the earlier overly conservative `4200` cap. |

## Live2D Visual Manual Check

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Live2D model render | Character is visible and not blank | Character rendered normally in the desktop app | Pass | Private local model family, no screenshot retained in repo. |
| TTS mouth feedback | Mouth moves during speech | Maintainer reported mouth movement is OK | Pass | Checked after restarting the desktop app. |
| Expression feedback | Expression changes are visible or safely subtle | Maintainer reported expression response exists but is not obvious | Pass | Low-priority polish follow-up, not a release blocker. |
| Speech end / idle return | State and mouth return to idle after speech | Maintainer reported it returned to idle | Pass | Confirms recent TTS changes did not leave speech motion stuck. |

## Source Package Rehearsal

| Check item | Expected result | Actual result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Source test package generation | Release zip and SHA256 summary are created | `Taffy-AI-Desktop-Pet-v1.3.0-preview-windows-source-test.zip` generated | Pass | Package remains a source test package, not an installer. |
| Package sensitive-file check | Local config, env files, logs, memory data, and `node_modules` are not included | Zip scan found no matching sensitive/runtime entries | Pass | `config.example.json` is included as intended. |
| Clean-package preflight | First-run diagnostics report missing user setup clearly | Preflight failed with expected blockers for placeholder Live2D model path and missing LLM API key | Pass | This is expected before a tester configures their own model and provider credentials. |
| Clean-package defaults | Browser TTS and safety defaults remain conservative | Browser TTS default passed; runtime metadata, auto chat, and tool calling were off | Pass | Warnings also noted missing `node_modules`, Node LTS recommendation, and already-running local backend on the developer machine. |

## Final Result

Overall result: pass

Short summary:

```text
GPT-SoVITS demo playback, Live2D speech feedback, and source package generation are stable at the current checkpoint. The clean source package correctly requires tester-provided Live2D and LLM configuration before first launch. Expression response is present but subtle, so model-specific expression tuning remains a low-priority polish follow-up after the v1.3 preview.
```
