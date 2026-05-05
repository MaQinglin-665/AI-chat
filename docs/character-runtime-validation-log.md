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

---

# Proactive Scheduler DevTools Event Timeline Capture - 2026-05-04 (Task 050)

## Run Metadata

| Item | Value |
| --- | --- |
| Date | 2026-05-04 |
| Tester | Codex |
| Branch / commit | `codex/proactive-scheduler-polling-skeleton` / `21a0b2a` |
| OS | Windows |
| Python version | 3.11.9 |
| Node version | v25.2.1 |
| Electron mode | desktop started |
| DevTools timeline capture | blocked in current terminal-only automation context |

## A. Baseline Checks

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` | pass | Clean branch state before Task 050 changes. |
| `git log --oneline -n 5` | pass | Baseline commit chain matches task input. |
| `node --check web/chat.js` | pass | JS syntax valid. |
| `python -m py_compile config.py` | pass | Python syntax valid. |
| `python -m json.tool config.example.json` | pass | JSON structure valid. |
| `git diff --check` | pass | No whitespace/conflict format issues. |

## B. Electron Startup

| Step | Observation | Result |
| --- | --- | --- |
| Run `npm run start:electron` | Command returned successfully and launched app process tree | pass |
| Run `Get-Process -Name electron` | Multiple `electron` processes observed | pass |

## C. DevTools Capture

Planned commands:
- `window.__AI_CHAT_DEBUG_TTS__.snapshot().proactiveScheduler`
- `window.__AI_CHAT_DEBUG_TTS__.events()`

Actual:
- Electron could be started, but this terminal-only automation context cannot directly operate desktop DevTools Console input/output.
- No new dependency or unsafe bypass was introduced to force collection.
- Runtime timeline data is therefore not recorded in this run.

Result: partial

## D. Kill-switch Runtime Timeline

Expected evidence:
- Snapshot fields: `pollTimerActive`, `pollLastResult`, `pollingEnabled`, `blockedReasons`
- Events: `proactive_scheduler_poll_stop`, `proactive_scheduler_poll_blocked`

Actual:
- Blocked by item C (no direct DevTools interaction channel).
- Runtime timeline remains uncollected in this run.

Result: partial

## E. Exception Fail-closed Timeline

Expected evidence:
- Events: `proactive_scheduler_poll_failed` and (if present) `proactive_scheduler_poll_stop`
- Confirmation: no uncontrolled retry, no guard bypass, no auto screenshot/tool-calling/file-reading path

Actual:
- Blocked by item C (no direct DevTools interaction channel).
- Runtime timeline remains uncollected in this run.

Result: partial

## Overall Result

Overall result: partial

- Task 049 residual risk is not closed in this run.
- Improvement from this run: verified real Electron startup again under current baseline.

## Residual Risks

- Missing same-session DevTools runtime event timeline for kill-switch and exception fail-closed scenarios.

## Rollback Suggestion

```text
If runtime anomalies appear, disable any key switch (`conversation_mode.enabled` / `proactive_enabled` / `proactive_scheduler_enabled`) to stop polling quickly. If broader rollback is needed, revert to Task 043 polling-only behavior and keep fail-closed defaults.
```

## Manual Next-step Procedure

1. Open chat window DevTools Console on the same machine/session.
2. Run snapshot/events commands and save concise timeline notes.
3. Reproduce kill-switch runtime stop sequence and capture event order.
4. Inject safe temporary exception in DevTools only, capture fail-closed events.
5. Update this validation log with concrete event timestamps/order and re-evaluate pass/partial.

---

# Proactive Scheduler Manual DevTools Follow-up - 2026-05-04 (Task 051)

## Run Metadata

| Item | Value |
| --- | --- |
| Date | 2026-05-04 |
| Tester | User + Codex-assisted notes |
| Branch / commit | `codex/proactive-scheduler-polling-skeleton` / `b2dec14` |
| Environment | Windows Electron chat window DevTools |
| Config source | Local-only `config.local.json` override, not tracked by git |

## A. Default-off Runtime Evidence

| Observation | Result |
| --- | --- |
| `schedulerEnabled=false`, `conversationEnabled=false`, `proactiveEnabled=false` | pass |
| `pollingEnabled=false`, `pollTimerActive=false`, `pollLastResult=disabled` | pass |
| `blockedReasons` included `conversation_disabled`, `proactive_disabled`, `scheduler_disabled` | pass |
| Event observed: `proactive_scheduler_poll_blocked` with default-off reasons | pass |

## B. Three-switch Polling Runtime Evidence

Local-only test override enabled:
- `conversation_mode.enabled=true`
- `conversation_mode.proactive_enabled=true`
- `conversation_mode.proactive_scheduler_enabled=true`

Observed:

| Event / Snapshot | Result |
| --- | --- |
| `proactive_scheduler_poll_start` with `interval_ms:60000` | pass |
| `pollingEnabled=true`, `pollTimerActive=true`, `pollLastResult=started` | pass |
| Later blocked reasons included `warmup_active`, then `no_pending_followup`, `empty_topic_hint`, `no_tts_finished_timestamp` | expected |

## C. Kill-switch Runtime Timeline

Procedure:
1. Start with all three switches enabled and polling active.
2. Change local-only `config.local.json` so `conversation_mode.proactive_scheduler_enabled=false`.
3. Call backend reload with `X-Taffy-Token`.
4. Call frontend `await loadConfig()` from chat DevTools Console to sync the live page state.
5. Inspect `snapshot().proactiveScheduler` and `events()`.

Observed event order:

| Seq | Stage | Result |
| --- | --- | --- |
| 1 | `proactive_scheduler_poll_start` | `interval_ms:60000` |
| 2-7 | `proactive_scheduler_poll_blocked` | `warmup_active` / `no_pending_followup,empty_topic_hint,no_tts_finished_timestamp` |
| 8 | `proactive_scheduler_poll_stop` | `sync_disabled:scheduler_disabled` |
| 9 | `proactive_scheduler_poll_blocked` | `scheduler_disabled` |

Result: pass

Notes:
- Backend `/api/config/reload` alone refreshed backend config but did not update the already-loaded frontend state.
- Same-session frontend sync was completed by calling `await loadConfig()` from DevTools.
- This confirms the runtime kill-switch once the frontend receives the updated config.

## D. Exception Fail-closed Timeline

Result: partial

Notes:
- No safe DevTools-only exception injection hook is currently exposed.
- No unsafe monkey patch, source edit, or test-only bypass was used.
- Static review from prior tasks still confirms the `poll_exception_fail_closed` branch, but live `poll_failed` event ordering remains uncollected.

## Overall Result

Overall result: partial

Improvement:
- Default-off runtime evidence, three-switch polling startup, and kill-switch runtime stop timeline are now manually captured.

Remaining residual risk:
- Exception fail-closed live event timeline remains partial because no safe DevTools-only injection hook is exposed.

Rollback suggestion:

```text
Disable any key switch (`conversation_mode.enabled` / `proactive_enabled` / `proactive_scheduler_enabled`) to stop polling. For live-page kill-switch validation, backend reload must be followed by frontend config sync (`await loadConfig()`) or page reload.
```

---

# Proactive Scheduler Residual Risk Follow-up Note - 2026-05-04 (Task 053)

## Purpose

- Keep the remaining exception fail-closed runtime risk explicit until a safe injection hook is implemented and validated.
- Avoid unsafe temporary approaches (source edits in-place, remote trigger API, persistent debug flags).

## Current Status

- Default-off runtime posture: covered.
- Three-switch polling runtime behavior: covered.
- Kill-switch runtime stop timeline: covered.
- Exception fail-closed live event ordering: still pending (`partial`).

## Design Decision (Task 053)

- Preferred future test hook: DevTools-only, local-only, default-off, one-shot failure injection in frontend debug bridge.
- Safety constraints:
  - No remote API trigger
  - No persistent dangerous state
  - No direct `requestAssistantReply` path addition
  - No screenshot/tool-calling/file-reading side effects

## Exit Criteria to Close This Residual Risk

1. Implement the approved one-shot DevTools injection hook.
2. Capture live event ordering for exception path in same-session Electron/DevTools run.
3. Confirm `proactive_scheduler_poll_failed` + fail-closed stop behavior and no uncontrolled retry.
4. Re-run smoke checks and update this log from `partial` to `pass` for exception timeline evidence.

---

# Proactive Scheduler Fail-closed Hook Implementation Note - 2026-05-04 (Task 054)

Task 054 implements the Task 053 recommended DevTools-only one-shot hook.

Implementation summary:

```text
window.__AI_CHAT_DEBUG_TTS__.injectProactiveSchedulerPollFailureOnce(reason)
window.__AI_CHAT_DEBUG_TTS__.getProactiveSchedulerFailureInjectionState()
window.__AI_CHAT_DEBUG_TTS__.clearProactiveSchedulerFailureInjection()
```

Expected runtime evidence to collect:

| Step | Expected Event / State |
| --- | --- |
| Inject once | `proactive_scheduler_poll_failure_injected` |
| Next polling check | `proactive_scheduler_poll_failure_injection_consumed` |
| Fail-closed catch path | `proactive_scheduler_poll_failed` |
| Timer active | `proactive_scheduler_poll_stop` with `poll_exception_fail_closed` |
| After consumption | injection state inactive |

Current result: implementation ready for manual DevTools smoke.

---

# Proactive Scheduler Fail-closed Runtime Smoke - 2026-05-04 (Task 055)

Task 055 validates the Task 054 DevTools-only one-shot failure hook in a same-session Electron/DevTools run.

Runtime setup:

```text
conversation_mode.enabled=true
conversation_mode.proactive_enabled=true
conversation_mode.proactive_scheduler_enabled=true
conversation_mode.proactive_poll_interval_ms=30000
```

Observed event order:

| Seq | Stage | Result / Error |
| --- | --- | --- |
| 1 | `proactive_scheduler_poll_start` | `interval_ms:30000` |
| 2-4 | `proactive_scheduler_poll_blocked` | `warmup_active` |
| 5 | `proactive_scheduler_poll_blocked` | `no_pending_followup,empty_topic_hint,no_tts_finished_timestamp` |
| 6 | `proactive_scheduler_poll_failure_injected` | `manual_task_055` |
| 7 | `proactive_scheduler_poll_failure_injection_consumed` | `manual_task_055` |
| 8 | `proactive_scheduler_poll_stop` | `poll_exception_fail_closed` |
| 9 | `proactive_scheduler_poll_failed` | `poll_exception` / `manual_task_055` |

Observed snapshot after fail-closed stop:

```text
schedulerEnabled=true
conversationEnabled=true
proactiveEnabled=true
pollingEnabled=true
pollIntervalMs=30000
pollTimerActive=false
eligibleForSchedulerTick=true
```

Result: pass

Conclusion:

```text
The exception fail-closed live event ordering is now captured. The one-shot hook was injected, consumed on the next polling check, stopped polling with poll_exception_fail_closed, and recorded proactive_scheduler_poll_failed. No unsafe assistant reply, screenshot, tool call, shell execution, or file read path was triggered.
```

---

# Proactive Follow-up Policy Preview Smoke - 2026-05-04 (Task 059)

Task 059 validates the Task 058 read-only policy preview helper against the four Task 057 policy presets.

Method:

```text
Extracted the pure preview block from web/chat.js and executed it with Node.
Chinese sample strings were passed with Unicode escapes to avoid PowerShell pipeline encoding loss.
No runtime follow-up state was mutated.
```

Observed results:

| Case | Input summary | Expected Policy | Actual Policy | Eligible | Blocked Reasons | Prompt Draft |
| --- | --- | --- | --- | --- | --- | --- |
| A | `question_tail` / `你觉得这个方向怎么样？` | `light_question` | `light_question` | true | none | non-empty; safety wording present |
| B | `keyword_hint` / `要不要我继续讲这个思路` | `soft_checkin` | `soft_checkin` | true | none | non-empty; safety wording present |
| C | `followup_pending` / `我们刚才聊到主动续话策略` | `gentle_continue` | `gentle_continue` | true | none | non-empty; safety wording present |
| D | `followup_pending` / `先这样，晚安` | `do_not_followup` | `do_not_followup` | false | `policy_do_not_followup` | empty |

Result: pass

Safety confirmation:

```text
The preview path returned diagnostics only. It did not call requestAssistantReply, LLM, fetch, TTS, screenshot capture, tools, shell execution, or file access. Closed-topic input failed quiet with policy_do_not_followup and an empty promptDraft.
```

---

# Follow-up Policy Silence Smoke - 2026-05-05 (Task 064)

Task 064 validates that Task 063 blocks closed-topic hints at the silence eligibility layer.

Method:

```text
Extracted the relevant pure helper block from web/chat.js and executed it with Node.
Mock state had all switches enabled, pending follow-up present, silence window reached, and topicHint="先这样，晚安".
No runtime follow-up state was mutated.
```

Observed results:

| Check | Observed |
| --- | --- |
| `silence.silenceWindowReached` | `true` |
| `silence.followupPolicy` | `do_not_followup` |
| `silence.eligibleForSilenceFollowup` | `false` |
| `silence.blockedReasons` | `policy_do_not_followup` |
| `plan.followupPolicy` | `do_not_followup` |
| `plan.eligible` | `false` |
| `plan.blockedReasons` | `policy_do_not_followup` |

Result: pass

Safety confirmation:

```text
The local smoke executed helper logic only. It did not call requestAssistantReply, LLM, fetch, TTS, screenshot capture, tools, shell execution, or file access. Closed-topic input now fails closed before silence eligibility can report ready.
```

---

# Follow-up Policy Runtime Checkpoint - 2026-05-05 (Task 066)

Task 066 attempts a real Electron runtime checkpoint for the follow-up policy path.

Runtime command shape:

```powershell
$env:TAFFY_OPEN_DEVTOOLS='1'
node node_modules/electron/cli.js electron/main.js
```

Observed runtime evidence:

| Evidence | Result |
| --- | --- |
| Electron processes | present |
| Node launcher process | present |
| Python backend process | present |
| Backend listener | `127.0.0.1:8123` |
| `/config.json` | 200 |
| model window URL | 200 |
| chat window URL | 200 |
| `/chat.js` and `/app.js` | 200 |
| persona/model assets | 200 |

DevTools automation boundary:

```text
TAFFY_OPEN_DEVTOOLS=1 can open DevTools windows, but this runtime does not expose a CDP remote debugging port by default.
Checked /json/version on 9222, 9223, and 8315: unavailable.
Checked /json/version on 8123: 404.
```

Result: partial

```text
Electron/backend startup and renderer asset loading are confirmed. Direct terminal capture of window.__AI_CHAT_DEBUG_TTS__ output is not available in this run, so closed-topic policy fields still need one manual DevTools copy/paste checkpoint.
```

Manual DevTools commands still needed:

```js
window.__AI_CHAT_DEBUG_TTS__.snapshot().followup
window.__AI_CHAT_DEBUG_TTS__.conversationFollowup()
window.__AI_CHAT_DEBUG_TTS__.previewConversationFollowupPolicy({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
window.__AI_CHAT_DEBUG_TTS__.events().slice(-30)
```

Safety confirmation:

```text
No config file was modified. config.local.json was observed but not committed or changed. No app screenshot, tool call, shell execution, file read path, or broader proactive behavior was added.
```

Manual DevTools result template for follow-up:

````md
Date:
Branch / commit:
Electron launched: yes/no

DevTools command result:

```json
PASTE_RESULT_HERE
```

Conclusion: pass / partial / fail
Residual risk:
````

---

# Follow-up Policy DevTools Screenshot Record - 2026-05-05 (Task 068)

Task 068 records the first real chat-window DevTools observation for the Task 067 manual
checklist.

Evidence source:

```text
Manual DevTools Console screenshot provided in the project thread.
The screenshot shows the returned object from the Task 067 copy/paste command, with expanded
preview, snapshotFollowup, conversationFollowup, and recentEvents fields.
```

Observed fields from the screenshot:

| Area | Field | Observed |
| --- | --- | --- |
| top-level | `ok` | `true` |
| `preview` | `followupPolicy` | `do_not_followup` |
| `preview` | `eligible` | `false` |
| `preview` | `blockedReasons` | includes `policy_do_not_followup` |
| `preview` | `promptDraftEmpty` | `true` |
| `snapshotFollowup` | `pending` | `false` |
| `snapshotFollowup` | `eligible` | `false` |
| `snapshotFollowup` | `blockedReasons` | `no_pending_followup`, `empty_topic_hint`, `silence_window_not_reached` |
| `snapshotFollowup` | `policy` | `gentle_continue` |
| `conversationFollowup` | `eligible` | `false` |
| `conversationFollowup` | `blockedReasons` | `no_pending_followup`, `empty_topic_hint`, `silence_window_not_reached` |
| `conversationFollowup` | `followupPolicy` | `gentle_continue` |
| `conversationFollowup` | `promptDraftEmpty` | `true` |
| `conversationFollowup.silence` | `eligibleForSilenceFollowup` | `false` |
| `conversationFollowup.silence` | `blockedReasons` | 3 blocked reasons visible |
| `conversationFollowup.silence` | `followupPolicy` | `gentle_continue` |
| `recentEvents` | length | 3 |
| `recentEvents` | results | `interval_ms:30000`, `warmup_active`, `warmup_active` |

Interpretation:

```text
The closed-topic preview path is confirmed in a real DevTools session:
preview.followupPolicy=do_not_followup, preview.eligible=false, and preview.promptDraftEmpty=true.

The live follow-up snapshot was not in a pending closed-topic state at capture time, so
snapshotFollowup/conversationFollowup reflect the current idle runtime state rather than a
pending "good night" follow-up. This is still safe: the runtime remained ineligible and did not
show a ready/trigger event in the visible recentEvents list.
```

Result: partial-pass

```text
Pass for the pure closed-topic preview evidence in the real renderer.
Partial for the full Task 067 runtime checklist, because the screenshot is not a pasted JSON
payload and the live follow-up state was idle rather than pending the closed-topic hint.
```

Residual risk:

```text
To fully close the runtime evidence gap, capture the Task 067 command output as text/JSON after
creating a real pending closed-topic follow-up state, or add a narrowly scoped debug-only fixture
in a future task. Do not expand automatic follow-up behavior for this purpose.
```

Safety confirmation:

```text
No runtime code, config file, scheduler behavior, screenshot capture path, tool call path, shell
execution path, file-read path, TTS path, fetch path, or LLM request path was changed for this
record.
```

---

# Follow-up Policy Pending Fixture Added - 2026-05-05 (Task 069)

Task 069 adds a DevTools-only fixture to close the remaining evidence gap from Task 068.

New manual command:

```js
window.__AI_CHAT_DEBUG_TTS__.checkConversationFollowupPendingFixture({
  reason: "followup_pending",
  topicHint: "先这样，晚安"
})
```

Expected result:

| Area | Expected |
| --- | --- |
| top-level | `ok=true` |
| `preview` | `followupPolicy=do_not_followup`, `eligible=false`, `promptDraftEmpty=true` |
| `snapshotFollowup` | `pending=true`, `eligible=false`, `blockedReasons` includes `policy_do_not_followup` |
| `conversationFollowup` | `eligible=false`, `blockedReasons` includes `policy_do_not_followup`, `promptDraftEmpty=true` |
| `conversationFollowup.silence` | `eligibleForSilenceFollowup=false`, `blockedReasons` includes `policy_do_not_followup` |
| restore | `restored=true` |

Result:

```text
pending real-renderer capture still needed after merge.
```

Safety confirmation:

```text
The helper is exposed only through the existing DevTools TTS debug bridge. It temporarily mutates
current-page memory for a synchronous diagnostic read and restores the previous state before
returning. It does not call scheduler tick, polling trigger, requestAssistantReply, LLM, fetch,
TTS, screenshot capture, tools, shell execution, file access, backend APIs, or persistent config.
```
