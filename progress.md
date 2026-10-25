# Progress

History: [archive](docs/archive/2026-10-23-progress.md).

## 2026-10-23 — Developer readiness
- Baseline: GitHub main 2cf8d34, verified through GitHub connector.
- Eleven-item audit in progress on isolated branch; daily workspace untouched.

## Implementation and verification
- Shared LLM budget, terminal connection failures including tools/Galgame, secure remote transport and bounded network workers.
- Optional diagnostics, per-surface lazy renderer, revalidating static cache, quiet client disconnects and rotating backend logs.
- Extracted GET dispatch; removed unused tracked memory duplicate; archived completed state without discarding history.
- Direct Python dependencies pinned; contributor setup documented. Private configuration not changed.
- All Node suites passed, including lazy-renderer and rotation checks. Required JSON/Python compilation, Python/JavaScript syntax and secret scan passed. Final Python full-suite result follows.
- Remaining: provider HTTPS address needed (unauthenticated TLS handshake failed); clean dependency install unverified after download timeout; real Electron visual/TTS acceptance not run. No push, merge, release or repository visibility change.
- Local-only organization: publisher source moved with compatible launchers; data/secrets remain in parent; 26 moved entries have recovery manifest. One merged empty worktree removed, its branch retained. Shared Git exclude protects all seven original memory backups.

### Final automated evidence
- Full Python suite: **687 passed**, one existing pydub/audioop deprecation warning (89.44 s).
- Full Node suite passed; Python syntax 159 files, JavaScript syntax 185 files, secret scan 682 tracked text files passed. Required JSON parsing and ten-module compilation passed.
- Whitespace check corrected one trailing blank line in the extracted route module.
- Implementation is locally reviewable; task remains open for the HTTPS endpoint, clean-install and real Electron acceptance noted above.

## 2026-10-23 — Supplied LLM timing/transport patch
- Request: execute local CODEX-TASK.md on readiness branch, starting from 863dd16; one local commit, no push.
- git apply --check passed; supplied patch applied without conflict or runtime edits beyond the supplied patch.
- Timing: first-data budget, stream idle timeout and separate maximum stream duration. HTTP: local/private/link-local/CGNAT/.local allowed; other HTTP requires explicit opt-in; downgrade/cross-host redirects blocked. Probe inherits policy; diagnostic messages added.
- Files: llm_deadline.py, llm_probe.py, llm_diagnostics.py, config.example.json, tests/test_llm_deadline.py; docs/developer-sharing.md and three state files updated.
- Focused verification: 48 passed. Both required JSON documents parsed; ten required Python modules compiled; diff whitespace check passed.
- Full gate is running. Doctor warnings: no private config.json in isolated checkout; Node 25 rather than recommended 20/22 LTS. No private files created to suppress warnings.
- Real model long-stream/connection failure and Electron acceptance remain manual. User chooses HTTPS or explicit remote HTTP opt-in; no private configuration was changed.

### Patch final verification
- scripts/test-local.ps1 passed: Python **705 passed**, one existing audioop deprecation warning; all Node suites passed; Python syntax 159 files, JavaScript syntax 185 files, secret scan 682 files passed.
- config.example.json and package.json parsed; required ten Python modules compiled; diff whitespace check passed. Patch-preserved CRLF confirmed for llm_deadline.py, config.example.json and tests/test_llm_deadline.py.
- Only nine task-related files changed. No frontend runtime changes, private configuration changes, original-workspace changes or harness merge. One local commit to follow; no push.

## 2026-10-23 — Motion/voice integration, merge stage
- Task 1 already committed as 1ae3b89; reverse patch check and 48 focused tests reconfirmed it.
- Merging e6b847a with no automatic commit; resolve state files in readiness format and import new harness feature IDs. Preserve readiness LLMTransportError and timing network layer; add harness Ollama terminal-packet handling. Startup auto-merge retains lazy loading and speech cue lifecycle.
- Full gate pending before merge commit. No private configuration or daily workspace edits.

- Merge validation: 727 Python tests and all Node tests passed; syntax 161 Python/190 JavaScript and secret scan 704 files passed. Budget retry test now uses a controlled clock to avoid Windows timer granularity failures.

### Lip-sync bridge
- Applied supplied bridge patch, manually preserving lazy renderer in startup. Dedicated lip-sync test and all Node suites passed. Real Bluetooth/wired playback and minimized-window listening still require device acceptance.

## 2026-10-23 — DeepSeek official / preview.7
- Latest user authorization supersedes earlier no-push instructions: publish feature branch and preview.7, do not merge main.
- Both supplied task stages committed: 1ae3b89, be1e9f9, cba0fb2.
- Default example and config-center preset use official HTTPS DeepSeek Flash; chat, stream, probe and tool requests disable default thinking. Existing provider configurations remain supported. Key only read from environment; ignored local runtime config selects the bundled Hiyori sample and official API. Original daily worktree untouched.
- Final code checks: 734 Python tests, all Node suites, syntax/encoding/secret checks passed. Character quality gate passed (169 targeted Python tests and frontend checks).
- Initial runtime preflight found the intentional public model placeholder; configuring the local bundled sample fixed it. Preflight passed with 4 environment warnings; demo advisory passed with 3 opt-in warnings. No claim of a zero-warning full gate.
- First-run package smoke passed. NSIS installer/source zip built; SHA256, zip integrity, private-file exclusions, official empty-key config, PE header and manifest checked.
- Three synthetic live official streams: first_delta_ms 4062/2109/2187; delta_chunks 10/36/34. Median first visible delta 2187 ms. No personal conversation sent.
- Remaining limitations: real Bluetooth/wired/minimized-window listening acceptance, clean dependency installation, unsigned installer. These are disclosed in release notes.

## 2026-10-24 — External Codex CLI stage 0

- Scope: prerequisite verification only, on `codex/external-agent-codex-cli-v1` from verified unmerged PR #210 head `86a93ca`. No runtime changes, commits or pushes.
- Verification Evidence: `codex --version` reports 0.133.0; exec and resume help succeed and list the requested exec options. Official DeepSeek catalog minimum is 0.144.0. Actual minimal exec with an isolated CODEX_HOME, environment Key, output schema and read-only sandbox exits 1: unknown reasoning effort variant `max` while parsing catalog; no stdout events or final message.
- Stopped at first prerequisite failure as instructed. Sandbox enforcement, JSONL fixtures and cancellation remain unverified, not passed. Temporary-home helper warning also recorded.
- Files: spike report and three state documents. Risks/next: incompatible CLI; user confirmation required before further stages, and stage 0 must pass first. See `docs/external-agent-codex-spike.md`.
- Closeout: diff whitespace and feature JSON checks passed; secret scan passed (709 files). Temporary configuration/catalog/schema removed individually after batch cleanup was policy-blocked; zero files remain in probe directory. No Key persisted. Full application suites not run for documentation-only changes.

### Stage 0 round 2 — isolated CLI installation blocked

- User authorized installing only @openai/codex@0.164.0 into a repository-external prefix, a non-temporary isolated CODEX_HOME, and a full rerun including sandbox-switch resume. No commits/pushes or stage 1 implementation.
- Verification Evidence: npm install with the explicit isolated prefix, no retries and 30-second fetch timeout exited 1: `getaddrinfo ENOTFOUND registry.npmjs.org`. Stopped at this failure per instruction; no DNS/proxy changes or alternative registry attempts.
- No new runtime checks, credentials use, fixtures or sandbox results. Global package version remains 0.133.0. No CLI version qualifies as a fully validated minimum yet.
- Updated spike report and three state documents; awaiting user direction to resolve installation networking before retrying stage 0.

### Stage 0 round 3 — runtime prerequisites pass, event coverage blocks

- Authorized retry installed isolated @openai/codex@0.164.0 successfully; absolute-path --version confirms 0.164.0, global package remains 0.133.0. Only isolated launcher used for model probes, with dedicated non-temp CODEX_HOME and environment-only Key; original official catalog unchanged.
- Verification Evidence: minimal schema response STAGE0_OK exit 0; original helper warning absent. Read-only Set-Content denied (exit 1, no file); workspace inside write succeeds and outside write denied (exit 1, no file). Persistent read-only thread resumed with exec parent --sandbox workspace-write and -C; same thread_id, real RESUME_OK write succeeds.
- Event probe creates file through apply_patch and verifies via shell, but model reports update_plan unavailable and no plan-update event is emitted. Stopped per user instruction; no top-level error/turn.failed sample or cancellation test yet. Six sanitized fixtures contain 55 real events; all lines parse, no absolute paths or actual Key present.
- Non-blocking warnings recorded in spike report. Full stage 0 is not complete; 0.164.0 is a partially validated baseline, not yet an accepted minimum. No stage 1/2 changes, commits or pushes.

### Stage 0 final acceptance — cancellation verified

- User changed plan-update events to optional/non-blocking; plans come from output schema and progress from command_execution/file_change/agent_message. Recorded item.error as warning, top-level error/turn.failed as event-level failure; no dedicated top-level failure injection claimed.
- Removed ignored preferred_auth_method from dedicated repository-external config. Actual cancellation run has no ignored-setting warning; Key remains environment-only.
- Verification Evidence: real CLI/DeepSeek launched 180-second parent+child Python writers. Both counters advanced before cancellation. taskkill on launcher root with /T /F returned 0. Tracked 13 process identities with PID/create time and unique-marker scan. For 15 seconds after termination, zero residuals and zero changes to directory file set/hash/size/mtime; collector finished. Cancellation passed.
- Seven sanitized fixtures / 59 real JSONL events now retained. Stage 0 completed for user-revised scope; minimum verified integration baseline 0.164.0, global 0.133.0 untouched. No application runtime changes, commit, push, or stage 1/2 work.

## 2026-10-24 — External agent stage 1 backend

- User authorized stage 0 commit then backend-only implementation and local commits, no push/PR or stage 2. Stage 0 commit `12fb134` uses the exact requested message; precommit gate passed (734 Python and all Node tests).
- Added explicit task state machine, ephemeral read-only schema planning, approved new execution, private per-run CODEX_HOME and original official model catalog, environment-only key transport, CLI >=0.164.0 gate, Windows taskkill tree cleanup plus kill-on-close job protection, sanitized warning/failure handling, bounded metadata events and audits.
- Added four authenticated task endpoints, configurable approval TTL, external_agent defaults (including codex_home), health/doctor diagnostics and usage documentation. No frontend, speech, memory or character_brain edits.
- Verification Evidence: final scripts/test-local.ps1 passed: 764 Python tests (91.04s; one existing audioop deprecation warning), all Node tests, Python syntax 172 files, JS syntax 191 files, secret scan 721 files. Required JSON parsing and ten-module compilation passed; diff whitespace check passed. Doctor has three non-blocking environment warnings documented in the acceptance report.
- Real final-adapter acceptance: invalid key -> authentication_failed in 3.02s, fixed readable error, no key in outputs/audit/events/disk, zero run directories left. Real planning plus approved organization: 22.06s planning / 59.97s total, two synthetic files moved with content preserved, no preapproval writes, 24 progress events. Fixed synthetic approval plus real CLI execution cancellation: 12 tracked processes, zero residuals or writes for 10s. No voice or frontend claim.
- Risks: Windows unelevated write boundary is not full read isolation; plan-only command scope is prompt-based; no restart persistence; networking remains restricted. See docs/external-agent-backend-verification.md. Original handoff archived; current handoff identifies stage 2 as waiting for user confirmation.

## 2026-10-24 — Review fix: provider-scoped credential resolution

- User authorized a separate fix commit before stage 2. Added external_agent.api_key_env (DEEPSEEK_API_KEY default), dedicated environment value first. LLM credentials are eligible only when parsed base_url hostname equals api.deepseek.com; lookalikes, other providers, missing/invalid URLs cannot fall back.
- Updated example/configuration docs and diagnostics; tests cover dedicated/custom variable precedence, exact-host inline/environment fallback and other-provider exclusion. Full precommit gate follows.
- Verification Evidence: scripts/test-local.ps1 passed: 771 Python tests, all Node suites, Python/JavaScript syntax and secret scan. No global CLI changes, push or PR.

## 2026-10-24 — External agent stage 2 UI and verified results

- User authorized stage 2 following the separate credential fix commit ea32bab; local commits only. Added explicit task form/full approval card, guarded phase speech, actual file-change results and shared-experience summary. Chat delegation only opens the form. Generic tool approval routes cannot consume external tasks.
- Added metadata-only file manifests and exact per-path comparison, out_of_plan and unobserved-plan reporting, relative-path/count audit; cleanup failure cannot claim a stable post-run snapshot. New authenticated GET task list/allowed roots. Invalid nonliteral plan paths are rejected.
- Main frontend work is in new externalAgentController.js/CSS. Minimal chat.js integration; chatReplyController.js unchanged. Real startup required restoring three controller script imports; readiness developer panel remains conditional. Fixed full-card scroll compression. Source-string test failure from CRLF was resolved by preserving chat.js LF line endings.
- Verification Evidence: final scripts/test-local.ps1 passed: 784 Python tests, 1 skipped (Windows symlink creation privilege), one existing audioop deprecation warning; all Node suites; Python syntax 174 files, JS syntax 193 files, secret scan 730 tracked files. Standalone node scripts/run_node_tests.js also passed. Example/package JSON parsing, ten-module compilation and diff whitespace checks passed. Doctor warnings remain private config absent, Node non-LTS and intentionally unchanged old global CLI while disabled.
- Real Electron renderer + real backend + isolated CLI 0.164.0/DeepSeek: explicit chat request did not create task; UI refusal preserved synthetic source files; approved organization took 31s planning/47s execution with 22 events, contents preserved, zero out_of_plan/missing-plan items and shared experience recorded. All four phase speech start/end events observed; user confirmed planning/confirmation speech heard clearly.
- Real UI running cancellation interrupted a 120-second writer: 10 observed process identities, no residuals and no further writes over 10s; status cancelled, only expected heartbeat file created (175 bytes), 8 events. Final page reload starts normally.
- Acceptance scope: isolated Electron launcher, not complete production main/preload or packaged app acceptance. Metadata diff does not hash contents or roll back; Windows sandbox is not full read isolation; voice approval and restart recovery are not implemented. See docs/external-agent-stage2-verification.md. No private key/config/audio samples committed. Next: report local stage 2 commit and stop for review, no push/PR.

## 2026-10-24 — Stage 2 accepted; draft PR preparation

- User approved stage 2 and authorized feature-branch push/draft PR, no merge or main push. Recorded two backlog items in feature_list.json and session-handoff.md: move directory scanning outside the manager lock; recognize newly created ancestors of planned files without broadening unrelated descendant permissions. No runtime changes in this update.
- GitHub connector confirms PR #210 is open/draft/unmerged, head 86a93ca; base for this draft is codex/developer-readiness-20261023. CLI API request failed connectivity; connector metadata succeeded.
- Verification Evidence: check_secrets.py passed (730 files); config.example.json, package.json and feature_list.json parse; required ten Python modules compile; diff whitespace check passed. Prior accepted runtime gate remains 784 Python passes/1 Windows privilege skip, all Node tests/syntax passed. Documentation-only update does not rerun model acceptance.

- Publication outcome: normal feature-branch push failed twice because github.com could not resolve; explicit DNS lookup timed out. No remote write or PR creation confirmed. Local documentation commit 9a597f0 retained; handoff records exact retry scope.

- Publication retry succeeded: feature branch pushed, #210 still unmerged; draft PR #213 created with readiness base using authenticated gh after connector write permission failure. Stage 0–2 real/automated evidence, default-off experimental status and deferred limitations included. Required push checks and secret scan passed again. No merge/main push.

## 2026-10-24 — Task 4 stage feedback and isolated browser experience

- Created codex/stage-feedback-onboarding-v1 from last-pushed origin external-agent head f7b06a0 (fresh fetch DNS unavailable). Implemented narrow grid height, independent 600ms stage feedback/auth/doctor/startup notice, unobstructed single-primary onboarding, Galgame Phosphor icon and composer-aware model fit. Kept intentional narrow opacity .82; no model alpha issue found. No chat.js/chatReplyController.js changes.
- Verification Evidence: scripts/test-local.ps1 complete: 784 passed, 1 skipped (Windows symlink permission), one existing audioop warning, all Node suites, Python syntax 175 files/JS 197 files and secret scan 736 files. Browser regression script passed at 774/516 widths, each lane 0px before and 206px after, collapses/states/input tested. Ignored before/after screenshots in tmp_ui_smoke. See docs/stage-feedback-verification.md.
- Only after full gate passed, started isolated_experience.py hidden/detached, no Electron. PID 37668 serves 127.0.0.1:8124; /healthz and persona/task/first-run endpoints return 200. Real DeepSeek probe ok in 1531ms. Real browser idle, no JS errors. Six synthetic workspace files and all persistent data under repository-external stage4-experience-20261024; no daily private configuration read. Final launcher also validates persistence paths and disables managed ASR; syntax and live startup verified.
- Instance stays running until user says 体验结束. Stop command and exact data paths in session-handoff.md / external instance.json. No push/PR. Prior handoff archived; feature completed and awaiting user experience feedback.


## 2026-10-24 — task 5 visual-polish-v1

- Branch codex/visual-polish-v1 from task 4 cf94872; local commit only, no push/PR.
- Central night-room tokens; single composer and top icon actions; accessible toggle presentation; adaptive control-center cards and cat branding; Chinese labels and window/shortcut/installer naming; matching Galgame controls. Approval layout prioritizes plan details.
- No backend, chat.js/chatReplyController.js or rendering/motion/lipsync changes. Layout module only exports CSS light-anchor coordinates.
- Verification Evidence: scripts/test-local.ps1 passed (784 Python, 1 Windows symlink skip; all Node suites including new presentation/contrast checks; 175 Python/201 JS syntax; secret scan). Two config report assertions translated, none removed.
- Real Edge browser matrix passed at 800x600, 1280x800, 1920x1080: toolbar, state toggles, keyboard focus, provider-specific visibility, grid overflow, Galgame and reduced motion. Final focus-color adjustment verified by the same browser matrix. Muted contrast 7.99:1 / 7.16:1.
- 45 ignored screenshots in tmp_ui_smoke/visual-polish; docs/visual-polish-verification.md indexes the required 30 plus 15 detail captures. Synthetic approval fixture; no real task execution or fresh Electron/audio acceptance claimed.
- Shortcut PowerShell syntax and NSIS Chinese-name template compile passed with minimal synthetic payload; no installation or daily shortcut mutations.
- 8124 isolated instance remains running, PID 37668, healthz 200, loopback only; no daily instance changes. Claude can review on refresh. Existing backend followups remain backlog.


## 2026-10-25 — Task 6 experience fixes

- codex/experience-fixes-v1 from visual-polish 541f881; local commit only, no push/PR. P0 Chinese model-answer preservation, one correction retry, language-following defaults and persistent visible replies; responsive/dark onboarding improvements; move-aware external task results and sanitized failure diagnostics. Modules and screenshot index in docs/experience-fixes-verification.md; no unrelated files changed.
- Verification Evidence: full scripts/test-local.ps1 passed: 789 Python passed, 1 Windows symlink skip, existing audioop warning; all Node suites; Python 179 / JS 203 syntax checks; secret scan 750 files. Existing doctor warnings: missing private config.json, Node 25, old global CLI (isolated runtime uses independent 0.164.0). Updated obsolete fixed-line/default-collapse assertions to reflect task 6; retained metadata, shape, English-mode and security coverage.
- Edge browser matrix at 1024x768 / 774x1208 passed: initial expansion, saved collapse, latest reply visible after 16 seconds, nonoverlapping lanes, dark onboarding, move / failure cards, no JS errors. Synthetic UI messages/errors; no new Electron or audio acceptance. Seven ignored screenshots in tmp_ui_smoke/task6.
- Real DeepSeek Chinese five-turn transcript recorded. Exact historical external-task wording rerun successfully with six moves, two directories, no out_of_plan/missing changes. Historical provider_failed remains unreproduced; original cause unknown because old diagnostics were discarded. Diagnostic gap fixed, original root cause NOT claimed fixed. Metadata inference does not hash contents; earlier lock/parent-directory backlog retained.
- Restarted latest isolated 8124, PID 5620, loopback and healthz 200; daily 8123 untouched. Restored six initial samples byte-for-byte from archived execution files. Preserved workspace-task6-run1/run2 evidence. Keep running for review; stop command in handoff. No keys/private config/screenshots staged.
