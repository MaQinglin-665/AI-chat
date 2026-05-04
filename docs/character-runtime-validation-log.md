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

---

# Proactive Scheduler Controlled Integration Run - 2026-05-04 (Task 047)

## Run Metadata

| Item | Value |
| --- | --- |
| Date | 2026-05-04 |
| Tester | Codex |
| Branch / commit | `codex/proactive-scheduler-polling-skeleton` / `f2d741b` |
| OS | Windows |
| Python version | 3.11.9 |
| Node version | v25.2.1 |
| Electron mode | 未启动（本次以静态联调审计为主） |

## Safe Config Snapshot

| Flag | Value |
| --- | --- |
| `conversation_mode.enabled` | 默认 false |
| `conversation_mode.proactive_enabled` | 默认 false |
| `conversation_mode.proactive_scheduler_enabled` | 默认 false |
| `conversation_mode.proactive_poll_interval_ms` | 60000（clamp: 30000..600000） |
| `conversation_mode.proactive_cooldown_ms` | 600000 |
| `conversation_mode.proactive_warmup_ms` | 120000 |
| `conversation_mode.proactive_window_ms` | 3600000 |

## A~E Controlled Checkpoint

| Checkpoint Item | Operation (简要) | Observed Key Events / Evidence | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| A. 默认关闭回归 | 静态检查默认配置与 gate 条件 | 默认三层开关均为 false；polling gate 需三层全开才可用 | 默认 fail-closed | Pass | 本轮未启动 Electron，未采集运行态 events。 |
| B. 三层开关联调 | 静态检查 polling 触发链路 | `poll_start/poll_blocked/poll_ready/poll_trigger_*` 事件定义存在；仅 `poll_ready` 后触发 `runProactiveSchedulerManualTick()` | 触发路径符合设计 | Pass | 事件名与调用顺序可审计。 |
| C. Kill-switch 运行时验证 | 静态检查 runtime gate-off 与 stop 分支 | `runtime_gate_off:*`、`poll_stop`、`poll_blocked` 原因事件路径存在 | 逻辑具备快速停用能力 | Pass | 运行态时序建议人工桌面复测补录。 |
| D. 异常 fail-closed 验证 | 静态检查 polling check 异常分支 | `proactive_scheduler_poll_failed` + `poll_exception_fail_closed` stop 路径存在 | 异常不继续失控重试 | Pass | 需人工注入异常复核事件顺序。 |
| E. 安全边界复核 | 静态审计关键调用点 | 新增 trigger 复用 `runProactiveSchedulerManualTick -> runConversationSilenceFollowupDryRun -> runConversationFollowupDebug`；manual follow-up 含 `skipDesktopAttach: true`；未新增 direct `requestAssistantReply` 调用点 | 边界保持 | Pass | 未发现自动截图/工具调用/读文件新增路径。 |

## Automated Commands

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` | pass | 当前分支与工作区可见。 |
| `node --check web/chat.js` | pass | JS 语法通过。 |
| `python -m py_compile config.py` | pass | Python 语法通过。 |
| `python -m json.tool config.example.json` | pass | JSON 结构有效。 |
| `git diff --check` | pass | 无格式错误。 |

## Final Result

Overall result: partial

Residual risks:

```text
本次完成了可审计的静态联调检查与结果落库；但 Electron/DevTools 运行态事件序列（尤其 C/D 场景）尚未做一轮人工实机补录。建议在同一机器按 Task 046 模板跑一次桌面联调并补充实际事件时间线，以消除运行时时序风险。
```

Rollback suggestion:

```text
若发现运行态异常，优先关闭任一关键开关（conversation_mode.enabled / proactive_enabled / proactive_scheduler_enabled）快速停用 polling；必要时整体回退到 Task 043/044 前状态，保持默认 fail-closed。
```

---

# Proactive Scheduler Runtime Event Capture - 2026-05-04 (Task 049)

## Run Metadata

| Item | Value |
| --- | --- |
| Date | 2026-05-04 |
| Tester | Codex |
| Branch / commit | `codex/proactive-scheduler-polling-skeleton` / `2cf51bd` |
| OS | Windows |
| Python version | 3.11.9 |
| Node version | v25.2.1 |
| Electron mode | desktop (process started), DevTools timeline capture blocked in current terminal-only run |

## Safe Config Snapshot

| Flag | Value |
| --- | --- |
| `conversation_mode.enabled` | default false |
| `conversation_mode.proactive_enabled` | default false |
| `conversation_mode.proactive_scheduler_enabled` | default false |
| `conversation_mode.proactive_poll_interval_ms` | 60000 (clamp 30000..600000) |
| `conversation_mode.proactive_cooldown_ms` | 600000 |
| `conversation_mode.proactive_warmup_ms` | 120000 |
| `conversation_mode.proactive_window_ms` | 3600000 |

## Runtime Capture Scope (Task 049)

| Checkpoint Item | Operation (brief) | Observed Key Events / Evidence | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| B. Electron startup | Run `npm run start:electron`, then verify process list | Electron main command returned successfully; multiple `electron` processes observed | Electron launched | Pass | Confirms real app startup, not mock. |
| C. DevTools event capture | Planned to read `snapshot().proactiveScheduler` and `events()` in chatWindow DevTools | DevTools interactive console could not be driven from current terminal-only automation context | Runtime timeline not captured | Partial | No new dependencies were added; no fabricated event log was recorded. |
| D. Kill-switch runtime timeline | Planned: enable all three switches, confirm polling active, then disable one switch and record stop/blocked events | Runtime interaction step blocked by C | Missing live event sequence (`poll_stop`, reasoned `poll_blocked`) | Partial | Static path remains audited in Task 047/048. |
| E. Exception fail-closed timeline | Planned: safe debug-path exception injection and record `poll_failed` / `poll_stop` | Runtime interaction step blocked by C | Missing live event sequence for exception path | Partial | Static fail-closed branch remains audited. |

## Automated Command Checks

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` | pass | Working tree clean on target branch. |
| `git log --oneline -n 5` | pass | Commit chain matches Task 049 baseline expectation. |
| `node --check web/chat.js` | pass | JS syntax valid. |
| `python -m py_compile config.py` | pass | Python syntax valid. |
| `python -m json.tool config.example.json` | pass | JSON structure valid. |
| `git diff --check` | pass | No whitespace/conflict format issues. |

## Final Result

Overall result: partial

Short summary:

```text
Task 049 completed real Electron startup verification and all baseline command checks, but did not complete live DevTools event timeline capture for kill-switch and exception fail-closed scenarios in this terminal-only run. No unsafe capability expansion was introduced, and no runtime evidence was fabricated. Manual same-session DevTools replay is still required to close the remaining risk.
```

## Residual Risks

- Live event ordering evidence for runtime kill-switch and injected exception path is still pending.

## Rollback Suggestion

```text
If any runtime instability appears, immediately disable one of the key switches (conversation_mode.enabled / proactive_enabled / proactive_scheduler_enabled) to stop polling. If broader rollback is needed, revert to Task 043 polling-only behavior and keep fail-closed defaults.
```
