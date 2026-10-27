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


## 2026-10-25 — Final onboarding/message polish and publication preparation

- First user message completes the single-step greeting guide and persists seen state; previous button hidden. Moved technical steps to docs/config.html. Fixed timestamp flow/grid placement, hover/focus-only feedback/heart and keyboard focus on assistant messages. Copied avatar-intent-interface.md exactly as requested; no avatar runtime implementation.
- Verification Evidence: full scripts/test-local.ps1 passed, 789 Python / 1 skip, all Node tests, Python179/JS203 syntax and secret scan751. Updated onboarding unit test covers first-message dismissal/persistence/no reopen. Browser regression now uses actual message-row renderer, checks timestamp bounding boxes and hover/focus at both viewport sizes, and invokes actual message append for guide dismissal. Browser result recorded below after completion.
- Authorized three feature branch pushes and experience draft PR against external-agent branch; no main/merge. GitHub DNS preflight failed; actual push still pending. Cleanup scope explicitly restricted to workspace and its two run archives, not isolated configuration/history or screenshots.
- Browser matrix passed in real Edge at 1024x768 and 774x1208: actual rendered message timestamp below content; feedback and heart hidden by default, revealed on hover/focus; first appended user message closes guide and marks seen; no previous button. Synthetic messages/task endpoints; no fresh model/audio acceptance.

- Final outcome: local repair commit 38e1da3. Two normal pushes failed with github.com DNS resolution error; no remote success or PR claimed. Prepared PR body retained locally. Owned 8124 process tree stopped (5620/48768); no listener remains. Automatic approval review rejected the combined recursive cleanup command with blocked by policy before execution; all three authorized cleanup targets remain, configuration/history/screenshots untouched. Publication and cleanup remain pending; no workaround deletion attempted.

- Publication retry: required JSON/compile checks and secrets752 passed; all three specified feature branches pushed normally. Connector PR creation returned403; authenticated gh created draft #214 against codex/external-agent-codex-cli-v1, attached to task. No merge/main push. 8124 remains stopped. Resolved and checked the three cleanup paths (no reparse links); explicit literal-path removal was still rejected by automatic policy. Directories retained; cleanup remains the only pending requested action.

## 2026-10-24 — Clean dependency validation (started)
- User selected handoff task 1; new branch codex/clean-dependency-validation-20261024 from 86a93ca on codex/developer-readiness-20261023. Fresh checkout has no unrelated changes.
- Read AGENTS.md, session-handoff.md, docs/handoff/README.md, feature_list.json and current progress before implementation.
- Validate README setup with an empty local venv and fresh Node dependencies; no existing desktop configuration, credentials, memories or voice samples copied. Main is not checked out or pushed.

### Implementation and initial evidence
- Original six runtime pins plus pytest installed successfully in a new isolated CPython 3.12.9 venv on Windows 11 x64; pip 26.2.2. All six runtime modules and pytest import successfully; pip check passes. Project-local Node 22.23.4/npm 10.9.9 and Electron 39.8.10 installed. Wheel cache was reused; no system site packages inherited.
- Fixed missing local-Node support in the batch launch path, BOM JSON written by Windows PowerShell 5.1 setup, validation using global Python, and unlocked npm install. Added dependency consistency/import gate and 84 platform-scoped version constraints. Empty-environment dry resolution exactly matches all 84 installed versions. No new third-party dependency.
- First full local gate: 738 Python tests (one Hugging Face symlink cache warning), every Node suite, Python/JS syntax and secret scan passed. Nine targeted setup tests pass, including the two subsequently added encoding regressions. Required JSON and ten-module compilation pass. Final full gate pending after final source changes.
- Actual fresh Electron/configuration wizard and backend observed. Setup-generated JSON now passes Node JSON.parse. The user explicitly authorized reusing their existing Harness local connection only after initial no-key installation validation; ignored local config/.env now point to that service. Model probe and first_chat_smoke.ps1 -NoStartServer passed; /api/chat returned a two-character reply. No credentials or private runtime files staged.
- Existing plain frontend controller-loading failure (syncProactiveSchedulerPolling on null) reproduced from the selected source branch; recorded as a separate follow-up in the report. Bluetooth/wired/minimized-window listening, microphone and long-duration acceptance remain untested.

### Final local Verification Evidence
- scripts/test-local.ps1: **740 passed** (67.05 s), every Node suite passed, Python syntax 165 files, JavaScript syntax 191 files, secret scan 714 tracked text files passed; doctor reports zero warnings. First baseline run had one Hugging Face symlink-cache warning; no cold-cache claim.
- PowerShell setup replay writes both generated configurations without BOM; actual Node JSON.parse succeeds. pip check remains clean, and all 84 package versions exactly match the --ignore-installed resolution.
- Both required JSON documents parsed and the ten required Python modules compiled; git diff --check passed. New local model configuration and all runtime/log/venv/tool directories confirmed ignored. Documentation browser gate pending a project-local Chromium download.

### Documentation gate and completion
- Contributor-required docs/check:all passed: publish check and 4 Chromium smoke tests (9.4 s). The first attempt correctly exposed an absent Playwright browser; installed Chromium headless into ignored project-local tools and reran successfully. Node emitted only the existing NO_COLOR/FORCE_COLOR warning.
- All 18 staged files belong to this task; no unrelated source changes, secrets, local model settings, logs, environment packages or generated artifacts included. Parent readiness task now records clean dependencies as verified for Windows x64/Python 3.12, while frontend and manual device acceptance remain separate.
- Feature complete; one focused commit and authorized feature-branch push/PR to main follow. No direct main update, force push, merge or release. The PR must state it inherits open draft #210 from the requested starting branch.


## 2026-10-24 — Reminder reliability (started)
- User requested a complete project capability review before optimization, then explicitly selected reminder reliability after seeing concrete reproductions.
- Independent branch codex/reminder-reliability-20261024 starts at b62f759; initial tree clean. Existing dependency PR remains unchanged.
- Indexed 709 first-party tracked text files (204337 lines; excludes vendor/model assets); inspected backend/frontend module interfaces, route and command wiring, state, docs and tests. This is structural coverage plus focused source review, not a claim of line-by-line semantic review of every historical file.
- Reproduced full-date command rejection, invalid clock/calendar acceptance, literal question-mark save status and immediate repeat attempts in both installed and cloned code. Isolated Chromium confirms the installed page reaches idle and saves a schedule with the broken status; clone normal startup has the separately documented controller-loading blocker.
- Scope: reminder date parsing, user-visible status, bounded persisted retry and manual recovery. No new model, learning feature, security defaults or private data changes.

### Reminder Verification Evidence and delivery
- Focused reminder behavioral regressions pass: strict dates, full-date/spaced-unit commands, save status, 30s/120s retry delays and 3-attempt budget, persisted pause/deadline, manual recovery, single-flight, sync failure, removal, tool pause and daily catch-up. Existing button/free-chat/control-center regressions pass.
- Final scripts/test-local.ps1 completed: 740 Python tests passed in 84.52 s; all 56 Node suites passed; syntax 165 Python / 194 JavaScript files; secret scan 716 files; doctor zero warnings. The first sandboxed run failed due to restricted temporary-directory/socket access; rerun with normal local permissions passed. Required JSON, ten Python compilations and diff checks passed.
- Contributor docs check:all passed: publish check and 4 Chromium smoke tests in 7.1 s; existing NO_COLOR/FORCE_COLOR warnings only.
- Real isolated Chromium checked source with an explicitly declared installed startup-manifest fixture, then actual installed files after synchronization: readable save status, paused-state reload, manual retry and no extra requests during repeated polling ticks. Simulated 503 interfaces only; no real LLM calls. Screenshots/JSON stay outside Git in outputs.
- Seven reviewed frontend files synchronized to D:/app/DesktopPet after normalized baseline comparison and original byte backups under outputs/backups/reminder-reliability-20261024-181229; hashes verified. No private config, token, memory or startup-manifest changes. No running installed pet window was found; changes apply when next opened.
- User selected only reminder reliability. Source startup blocker, learning/focus features and real microphone/audio/long-duration acceptance remain separate. All fourteen task files are scoped to implementation, tests, docs and required state. Commit/feature-branch push and PR follow; no main update or merge.

## 2026-10-25 — Ordered integration, PR #213

- User authorizes merge commits in order #210/#211/#212/#213/#214. First three merged after passing checks. Merge origin/main 2be017b into external-agent branch; only feature_list.json, progress.md and session-handoff.md conflicted. Union feature IDs; retain main's completed clean dependency evidence using three-way comparison, both progress blocks, and both archived handoffs. Runtime files merged automatically. Full local gate pending; stop on failure.

- PR #213 integration verification: full scripts/test-local.ps1 passed, all Node suites plus Python/JS syntax and secret scan passed; raw log tmp_ui_smoke/task6/merge-213-tests.log (ignored). Normal merge commit/push next; CI remains required before PR merge.

## 2026-10-25 — Ordered integration, PR #214

- #213 merged as 3611e5747b2e33a53b5013249c475d5243099a9b after all Linux/Windows checks passed. Test-only encoding fix 2c13028: cp1252 simulation 49 passed/2 skipped, full local gate 790 passed/2 skipped; no product changes for CI fixes.
- Merge origin/main into experience-fixes-v1: only progress.md and session-handoff.md conflicted. Both progress blocks retained; both handoffs archived; feature_list.json merged automatically and JSON verified. Full local gate pending; stop on any failure.

### Preserved pre-integration handoff: experience

<details>
<summary>Historical record; current merge authorization takes precedence</summary>

# Session handoff

## Final experience polish and publication

User now authorizes pushing exactly codex/stage-feedback-onboarding-v1, codex/visual-polish-v1 and codex/experience-fixes-v1, then a draft PR from experience-fixes-v1 to codex/external-agent-codex-cli-v1. No main push or merge.

- Single greeting-only onboarding ends and persists completion on the first user message; no previous button. Technical steps moved to docs/config.html.
- Message timestamp participates in layout; optional feedback and decorative heart appear on hover/focus. Assistant rows are keyboard-focusable.
- Copied requested docs/avatar-intent-interface.md byte-identically (SHA256 7ABB45D3E2FB868D2969CC53E7189763231F7AB4A2BC3296B9A626A0B8FC6DAF); design document only, no avatar implementation added.
- Tests and acceptance details in progress.md. Task 6 evidence remains docs/experience-fixes-verification.md; historical provider_failed remains unreproduced.

## Publication and cleanup outcome (retry succeeded for publication)

- Repair commit: 38e1da3. All tests passed; final secret scan 752 files. Browser matrix passed with actual message renderer and actual user-message append (synthetic content; no new model/audio acceptance).
- Retry: all three specified branches pushed successfully. Draft PR #214 created via authenticated gh after connector returned 403; attached to this task. URL https://github.com/MaQinglin-665/AI-chat/pull/214 ; head codex/experience-fixes-v1, base codex/external-agent-codex-cli-v1. No main push, force push or merge.
- Owned 8124 process tree stopped successfully (5620 and child 48768); no listener remains. Daily 8123 untouched.
- Cleanup command was rejected by automatic approval review with `blocked by policy` (no more specific reason). All three directories remain: D:/AI/.tools/stage4-experience-20261024/workspace, workspace-task6-run1, workspace-task6-run2. User authorized deleting ONLY those; isolated configuration/chat history, screenshots and other backups must stay. Do not claim cleanup completed or try to bypass the policy via another shell/tool.

## Next

Draft #214 awaits review. The three test directories still need cleanup once the automatic policy restriction is resolved; a retry with separately verified literal paths was again rejected, so all three remain. Do not bypass the restriction or delete the parent data root. Historical provider_failed root cause remains unknown. Previous handoff archived at docs/archive/2026-10-25-experience-fixes-handoff.md; two backend followups stay backlog.

</details>

### Preserved pre-integration handoff: main-external-agent

<details>
<summary>Historical record; current merge authorization takes precedence</summary>

# Session handoff

## Ordered merge integration — PR #213

User authorizes merge commits via gh --merge --admin, no squash/rebase/force push/branch deletion/tag/release. main protection enforce_admins=false verified. #210 merged 71c9ebb; #211 merged 256eff8; #212 merged 2be017b, each after all PR checks passed. #213 base changed to main; integrating origin/main into codex/external-agent-codex-cli-v1.

Only feature_list.json, progress.md and this handoff conflicted. Feature IDs unioned; main's completed dependency validation retained by three-way comparison; both progress blocks retained. Prior handoffs archived at docs/archive/2026-10-25-integration-external-agent-handoff.md and docs/archive/2026-10-25-integration-main-reminders-handoff.md. Historical no-merge directions are superseded by this user request.

Full scripts/test-local.ps1 passed (log tmp_ui_smoke/task6/merge-213-tests.log). Next: commit merge, required pre-push checks and secret scan, normal push; ready #213, wait for ALL CI checks, then merge commit. Then repeat for experience PR #214 and test latest main. Stop on any non-state code conflict or test/CI failure. No unrelated implementation changes. Earlier external-agent verification improvements remain backlog.

</details>

- Authorized flaky-test check: ten isolated runs all passed (10/10). Full gate retry pending. Manual conflict-resolution edits are limited to progress.md and session-handoff.md; original handoff records retained above rather than adding archive files.

- Authorized #214 gate passed: repeated flaky case 10/10; full scripts/test-local.ps1 795 passed/2 skipped, all Node suites, Python180/JS204 syntax and secrets762 passed. No runtime changes for this merge; submit merge and require CI before #214 merge. Connection rejection/body-drain repair is authorized only on a new branch after #214.


## 2026-10-25 — API rejection body drain

#214 merged as b9d9354 after all Linux/Windows CI passed. New branch codex/fix-api-reject-drain-body starts from that main. Added bounded drain before origin/token rejection; 1 MiB maximum, two-second deadline and fail-closed framing checks. No private settings or authorization changes.

Verification Evidence: targeted pytest tests/test_request_body_drain.py tests/test_api_health.py: 38 passed. Includes 30 large unauthorized POSTs, 30 disallowed-origin POSTs, missing configured token, byte limit, invalid length, duplicate/chunked framing, truncation and timeout coverage. Full gate pending.

Verification Evidence: full scripts/test-local.ps1 passed (809 Python passed, 2 skipped; Node suites, Python/JavaScript syntax and secret scan passed). Required config.example.json/package.json parsing and py_compile passed. Ignored log: tmp_ui_smoke/task6/drain-body-full-tests.log. Next: push scoped fix, open PR and require all CI before merge; rerun full gate on final main. Remaining risk: invalid, oversized or stalled clients are closed rather than guaranteed a complete rejection response.



## Preserved Live2D collaborator progress
## 2026-10-25 — Avatar Live2D stage 1 preparation
- User requests official Core/Mao sources, staged independent commits and explicit waits; no main push/force push/merge, no dialogue/memory/external-agent changes, large-file splitting paused.
- Refreshed main to 3611e57 and created friend/avatar-live2d-adapter. Single-branch clone required explicit main fetch/local tracking setup. Required avatar-intent-interface.md absent from main and targeted local D:/AI search; requested branch/path before implementation.
- git log -p identifies b62f759 (#211) moving npm work into start-electron.ps1. Batch failure pause is still present; npm-specific friendly guidance was lost at the delegated helper boundary. No runtime modifications yet.
- Verification Evidence: actual bundled Hiyori rendered in isolated Chromium using existing fixture and simulated audio; no page errors. Core=67239938, latest moc=4, Pixi=6.5.8, pixi-live2d-display=0.4.0. Saved idle/playful/thinking/sad screenshots plus version/source hashes and two official-page screenshots outside Git at outputs/avatar-live2d-stage1.
- Official SDK and Mao pages opened for user handoff; SDK download disabled pending personal license acceptance. No acceptance, download, Core execution/replacement, model resources, commit or push. Prepared C:/Users/Feng2/Documents/Codex/Live2D-downloads for user-supplied archives.
- Only state artifacts updated pending required document and official resources. Full tests are not claimed; run before each implementation commit.

### Required interface available; launcher recovery started
- User identifies merged #214/main 5b20358. Saved own three state changes as stash 9bd2080, fast-forwarded the feature branch, then restored only the own preparation entry/log against latest state (preparation patch remains outside Git). Upstream history/state preserved.
- Read interface v1 completely. Stage 1 only; no renderer/mapping, dialogue, memory or external-agent edits. User-supplied official SDK/Core remains absent, so independent launcher repair proceeds first.
- Hiyori/Core/director/expression baseline hashes all match after main update. Launcher recovery must retain portable Node, npm ci/install selection and supplied mirror, report npm failure in Chinese and keep batch failure pause/exit status.

### Stage 1 / change 1 — launcher failure recovery
- Restored npm-specific Chinese repair guidance in the delegated helper, including command-resolution failures. Helper is UTF-8 with BOM so Windows PowerShell 5.1 reads Chinese correctly. Existing project-local Node resolution, npm ci/install selection and supplied/default mirror behavior stay intact.
- start_electron.bat captures the helper exit code, handles all nonzero exits, retains pause after guidance and propagates the original status. History showed the previous positive-failure pause was already present, so this is verified preservation rather than claiming a missing pause was found.
- Targeted tests/test_node_runtime.py: 7 passed in 2.01 s. Actual isolated npm.cmd failures verify Chinese text, lockfile ci versus install, preserved mirror; actual cmd.exe batch execution reaches pause and returns 37. Existing project-local Node/no global Node check passes. No real npm install or app launch.
- No Core replacement or Live2D parameter changes. Full local gate pending before the independent launcher commit.

### Stage 1 / change 1 — full verification complete
- Verification Evidence: scripts/test-local.ps1 completed successfully: 812 Python passed, 2 skipped in 102.97 s; Node suites, Python syntax (180 files), JavaScript syntax (204 files), secret scan (764 files) all passed. Log is outside Git at work/avatar-stage1-launcher-full-tests.log. No runtime edits after this gate.
- User supplied CubismEditor5.exe under D:/app/Live2D Cubism 5.3. Metadata confirms Editor 5.3; targeted directory search found no Web Core/SDK archive. Core work remains blocked on the official SDK for Web ZIP personally downloaded with license acceptance. No Editor launch, third-party Core download or model asset changes.
- Independent local launcher commit completed on friend/avatar-live2d-adapter; stage 1 remains in progress until official Core compatibility is validated and committed separately. Stop before stage 2; no push or PR.

### Official SDK acquired; Core compatibility and publication checkpoint
- User confirmed both SDK agreements at action time. Downloaded official cubism.live2d.com/sdk-web/bin/CubismSdkForWeb-5-r.5.zip to C:/Users/Feng2/Documents/Codex/Live2D-downloads; 20708681 bytes, SHA256 67064a7fb1812cf502f5c4a03bfe12cc638c75a621bb4acf06bb28763df06ba0. Saved download-success screenshot outside Git. No mirror source.
- SDK Core/RedistributableFiles.txt explicitly lists live2dcubismcore.min.js, but redistribution remains conditional on its proprietary agreement. Current official publication pages separately require approval for Expandable Applications, including importing model data; applicability/permission for this project is not established. Per user's explicit rule, ask whether author has relevant publication permission or official written confirmation before committing Core. No agreement application or message sent.
- Verification Evidence: isolated Chromium probe (external work/avatar-stage1-core-compat.cjs) completed diagnostic assertions. Old Core 67239938/display 0.4.0 renders Hiyori; SDK Core 100663297 (06.00.0001, moc6) with the same display throws Cannot read properties of undefined (reading '0') in doDrawModel and shows a blank model. Thus display 0.4.0 is incompatible; do not replace Core alone. Official SDK manual notes the drawing-order API change in Cubism 5.3.
- New Core independently decodes the SDK's included Mao moc5 (132 parameters, 262 drawables); old Core rejects it. No adapter/config/model integration. Hiyori Core-only evaluation across three fixed parameter inputs compared 17544 scalars, max absolute difference 0.0000012069940567016602. This diagnostic is not full rendering acceptance. JSON evidence, before/failure screenshots and logs remain outside Git.
- Repository Core/display/director/expression files unchanged; only these three state records updated after launcher commit 6adf36b. Stage 1 incomplete; second commit/full gate pending compatibility fix and license clarification. No stage 2, push or PR. Previous 812-pass full gate remains valid for launcher commit only.
- User answered: no permission known; keep Core local for now. Recorded the restriction and stopped Core repository work. No pending permission question; no Core commit, library replacement or stage 2 work. Creation-process screenshots explicitly label the new-Core blank result as an unresolved compatibility fault rather than a finished upgrade.

### Stage 1 resumed — minimal display compatibility
- User requests continuation while keeping new Core local. Initial candidate outside Git fixes only the embedded Framework render-order getter. Real browser probe now renders Hiyori with old/new Core and the SDK's Mao with new Core, without page errors; no adapter, vowel/gesture mapping or model config added. PixiJS 8 migration is avoided to preserve stage 1 scope.
- Implement a reproducible project-maintained display 0.4.0 compatibility build with a legacy-first getter, Core 6 fallback and an explicit unsupported-offscreen-effect error. Add actual UMD-bundle Node regression coverage and document source/version/license boundaries. New Core/model assets stay outside Git. Full local validation pending.

### Stage 1 display compatibility — verification complete
- Files: web/vendor/cubism4.min.js becomes local compatibility build 0.4.0+ai-chat.core6.1; scripts/patch_live2d_display_core6.py reproduces the minimal patch from the pinned upstream SHA256 and validates already-patched input; tests/test_live2d_core_compatibility.js tests the actual exported UMD implementation and is registered in scripts/run_node_tests.js. THIRD_PARTY_NOTICES.md records original/source versions, licenses, patch and unsupported offscreen effects. No new npm dependencies/Pixi migration.
- Verification Evidence: actual-bundle Node regression passed (Core 4 legacy priority, Core 6 fallback, live typed-array updates, offscreen rejection). Rebuilding from original bytes matches shipped bytes exactly; repeated invocation changes nothing; an altered bundle is rejected. Initial build-script temporary-directory probe hit sandbox temp ACL restrictions; the same verification passed in a checked, workspace-contained temporary directory with no product change.
- Real Chromium validation on actual final bundle: upstream+Core4, patched+Core4, patched+Core6 each render existing Hiyori without page errors. Patched+Core6 also loads/renders the official SDK Mao moc5 with 132 parameters, 262 drawables, zero offscreens. No Mao adapter/config/vowels/gestures. Three fixed-input old-Core Hiyori pixel snapshots are byte-identical to upstream. Core-only old/new geometry differs by at most 0.0000012069940567016602 over 17544 scalars. An intermediate screenshot harness accidentally removed a control referenced by the fixture; corrected the local harness, then reran the complete browser probe successfully.
- Full scripts/test-local.ps1 passed: 812 Python passed/2 skipped in 80.71 s, all Node suites including new compatibility regression, Python syntax (181 files), JavaScript syntax (205 files), secrets (766 files). Required JSON/py_compile checks passed. Full log: work/avatar-stage1-display-full-tests.log outside Git. Browser script/log and outputs/avatar-live2d-stage1/core-patched-compatibility-evidence.json remain local.
- New official Core and sample resources remain outside Git per user decision; both repository Core copies and Hiyori director/expression code are unchanged. Only display compatibility is committed as the second independent change. Stop at stage 1 checkpoint, report the Core-local exception and wait for confirmation before stage 2. No push, PR, main edit, dialogue/memory/external-agent implementation change.

### Stage 1 published at user's request — draft PR #217
- User explicitly requested upload to GitHub. Pushed friend/avatar-live2d-adapter without force or main mutation; two independent implementation commits 6adf36b and 2f3500b reached origin. Created and attached draft PR https://github.com/MaQinglin-665/AI-chat/pull/217, head friend/avatar-live2d-adapter, base main. First push succeeded; no DNS retry needed.
- Verification Evidence: before push, required JSON/py_compile checks and the actual display UMD regression passed again; no runtime change since the full 812 passed/2 skipped, 60 Node-suite gate. Reviewed the complete branch diff: launcher/display patch, focused tests, reproduction script, third-party notice and state only. New Core, model/texture/moc3, screenshots, local config, logs and credentials excluded.
- This state-only publication checkpoint records the new authorization and PR for restartability. It does not start stage 2 or change the new-Core-local decision. Remain draft awaiting review/explicit next-stage approval; no ready-for-review, merge, force push or direct main push.

### PR #217 Windows CI diagnosis (2026-10-26)
- User asks to check the published PR. Both Windows workflows fail in the three added launcher tests: output contains question marks instead of Chinese; exit 37/pause behavior passes. Other CI job categories pass; no reviews/comments, PR remains draft and unmerged. Full job log saved outside Git at work/avatar-pr217-windows-ci.log.
- Source UTF-8 BOM is insufficient when Windows PowerShell writes redirected text using an English code page. Extend real helper/batch tests across CP437, CP936 and UTF-8, then fix only redirected helper output. No Live2D, dialogue/memory/external-agent changes or stage 2 work.
- Repair: set Console.OutputEncoding to BOM-free UTF-8 only when stdout is redirected. Interactive console settings are untouched. Test harness sets each code page explicitly, preserves -Command exit status and exercises the real batch from a checkout containing spaces.
- Verification Evidence: before repair, all three CP437 cases fail with question marks; afterward all 13 tests/test_node_runtime.py cases pass (CP437/936/65001, ci/install, actual batch pause/exit 37). Full scripts/test-local.ps1 passes: 818 Python passed/2 skipped; 60 Node suites, Python181/JS205 syntax, secrets766. JSON/py_compile and PS1 BOM checks pass. Logs outside Git at work/avatar-launcher-cp437-before.log and work/avatar-pr217-encoding-full-tests.log.
- Publish the narrow launcher repair on the same draft PR #217 with a normal branch push and verify the new GitHub checks; consult the live PR rather than assuming local success means CI passed. No Core/model/config/screenshots added and no merge/stage 2 work.



## 2026-10-25 — VRM basic renderer

Based on fetched origin/main 5b20358; local main divergence preserved. Added restricted read-only avatar API, pinned local three.js/three-vrm vendor, independent intent renderer/runtime, attribution UI and synthetic tests. Private model remains outside repo, screenshots only in ignored tmp_ui_smoke/avatar-vrm.

Verification Evidence: Node fake VRM mapping/actions/fallback passed; Python path/meta tests 13 passed, 1 symlink privilege skip, including real Windows junction rejection. Isolated Electron 39.8.10 VRM0 render/alpha/actions/amplitude/metadata verified, Hiyori regression rendered. Performance and limitations in docs/avatar-vrm-basic.md. Full gate and packaging checks pending. No dialogue/memory/external-agent changes; no private configuration accessed. Draft PR only.

Final Verification Evidence: scripts/test-local.ps1 passed: 825 passed/3 skipped, all Node suites, Python/JS syntax, secret scan. scripts/check_first_run_package.ps1 passed, including preview defaults and source package smoke. JSON/py_compile pre-push checks passed. Final test logs and all model captures only in ignored tmp_ui_smoke/avatar-vrm. Next: draft PR and user Windows review; no merge authorization.


## 2026-10-25 — VRM performance and deterministic motion

Diagnosed real full/pet Electron windows before editing. Pet full-mesh hit testing averaged 101.75ms, consuming almost the entire renderer thread; replaced with projected bone capsules (~0.012ms). Added 900k pixel budget, 20/30 FPS cadence, inactive suspension and runtime cleanup. Added 72-degree standing arms, deterministic seeded idle/speech/small motions, action recovery, height-based framing and key/fill lighting. No model/private config/dialogue/memory/external-execution changes.

Verification Evidence: actual full-window idle GPU 15.99% to 6.97%; pet idle 6.27 to 20.20 FPS and simulated speech 6.46 to 29.97 FPS. Memory essentially unchanged; pet GPU increased with restored frame rate. Read-only texture inspection: 36, max 2048x2048, no resizing needed. Full report docs/avatar-vrm-performance.md. Private before/after/speaking/small-motion captures only in ignored tmp_ui_smoke/avatar-vrm-polish. First full gate passed 825/3; runtime lifecycle test subsequently registered in Node runner, final gate pending. PR #216 must remain draft; user visual review next.

Final follow-up verification: scripts/test-local.ps1 passed (825 passed, 3 skipped; registered runtime lifecycle suite and all Node tests passed, syntax/secrets passed). Required JSON/py_compile checks passed. Evidence: ignored tmp_ui_smoke/avatar-vrm-polish/full-tests-final.log. GitHub API connection failed five attempts, with 10-second retry intervals; stopped network operations. Changes committed locally; push/PR description update remains pending. Do not mark PR ready or merge. Resume with normal push of codex/avatar-vrm-basic and verify #216 is still draft.


## 2026-10-25 — VRM edges and detached pet presentation

Smoothed VRM cutout/outline edges using MSAA, explicit premultiplied transparent output and DPR >=1; retained authored MToon outline/color. Reduced key/ambient lights. Located missed decorations in index.html/kawaii-stage-decor: full/chat already hide them, model did not. visualPolish.css now hides the same layer in both VRM/Hiyori pet views, positions the Chinese status label at bottom-left, and fades it three seconds after readiness. Model files and private configs untouched; model SHA-256 unchanged.

Verification Evidence: real Electron at 1708x1068, idle 20.16 -> 19.93 FPS, GPU 2.97% -> 0.86%, including removed animation/compositor cost. Both VRM and Hiyori real windows: decoration display none, label 馨语, left 12px, ready opacity 1 -> 0 after 3.6s. Local-only before/after edge+lighting captures and measurements in ignored tmp_ui_smoke/avatar-vrm-polish. Full report docs/avatar-vrm-performance.md. First full test run exposed missing document.body in the old fake Live2D test; fixture corrected and readiness assertion added. Final scripts/test-local.ps1 passed: 825 passed/3 skipped, all Node, syntax, secret scan; required JSON/py_compile passed. PR #216 verified open/draft; normal push authorized, no merge.


## 2026-10-25 — VRM room integration and relaxed stance

Added separate room/transparent-pet light presets, room-only shader brightness/saturation grading, 15-degree body turn with head return and asymmetric relaxed posture/fingers, idle smile/deterministic saccades/reply preparation, and elevated 27-degree framing. New tuning in vrmRenderer.js constants. avatarRuntime reads existing reply timestamps and uses its existing channel; no dialogue/voice/history changes. Audited the user-selected stored record: role=user matches the rendered label; source provenance is unavailable, so no speculative history migration or role fix performed. Private content not copied into tracked artifacts.

Verification Evidence: final scripts/test-local.ps1 passed (825 Python passed, 3 skipped; all Node, syntax and secret checks passed). New tests cover framing projection, finger/pose recovery, material isolation, smile/saccades and one-shot reply preparation broadcast. Real Electron VRM0 full before/after and neutral-pet captures inspected in ignored tmp_ui_smoke/avatar-vrm-polish/room-*.png. Baseline renderer served from 321fc17 only by test interception. Model hash unchanged. Required JSON/py_compile checks passed. No new real VRM1 or live LLM/TTS acceptance claimed. PR #216 remains draft for user review.


## 2026-10-25 — PR #216 accepted, merge preparation

User passed visual review and explicitly authorized --merge --admin after required gates, superseding draft-only restriction. Fetched origin successfully on fourth attempt after TLS errors. Latest origin/main 5b20358 already contained in avatar branch; git merge reported up-to-date, no conflicts. Verification Evidence: scripts/test-local.ps1 passed (825 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed. Logs in ignored tmp_ui_smoke/avatar-vrm-polish/merge-local-tests.log and merge-package-check.log. Acceptance-only state update; no runtime changes. Next: ready PR, all current-head Linux/Windows CI green, merge commit, then final exact origin/main gate. Preserve unrelated local main commit 0a06554; no reset or private config modification.


## 2026-10-25 — Procedural VRM room v1

Fetched origin/main and verified PR #216 merge a08e0c4 ancestor; created codex/avatar-3d-room-v1. User explicitly asked to preserve local main/0a06554; remote architecture branch is exactly that commit, no edits. Added independent seeded room data/build/disposal, five instanced Toon batches, generated sky/ramp/contact shadow, bounded room/none API field, existing stageRoom day/night transition. Full VRM hides painted stage only with room active; transparent pet and Hiyori retain old paths. No dialogue/memory/external execution/Live2D renderer/private model/config changes.

Verification Evidence: Node deterministic layout/bounds/day-night/no-request checks, real Three no-WebGL ten-cycle resource disposal and fake renderer gating. Actual Electron VRM0: 20.00 -> 19.97 FPS, CPU 4.45 -> 3.85%, GPU 4.93 -> 4.92%, draw calls 28 -> 34. Ten room/none cycles return geometry/textures to 20/45, no sustained post-GC JS heap growth. Six requested captures plus baseline saved only in ignored tmp_ui_smoke/avatar-vrm-polish; Hiyori stays live2d with original background. Report docs/avatar-3d-room.md. Initial full gate 829 passed/3 skipped, Node/syntax/secrets passed; first-run package passed. Final gate after shared-material restoration test passed: 829 passed/3 skipped, all Node/syntax/secrets. Required JSON/py_compile pre-push checks passed. Draft PR only; user Windows appearance review next.


## 2026-10-25 — Room metre scale, depth and daylight

User reviewed #218 and requested physical proportions/composition. Removed avatar-height scaling, explicit furniture dimensions in metres, wall 3m behind avatar and side furnishings 2–2.65m behind. Added clean head backdrop, square wall joins/ceiling/skirting, partial distant pink crowns, moon/star sizes/clouds, brighter warm daytime with non-shadow-mapped sun patch. No private/model/Live2D/dialogue/memory/external execution changes.

Verification Evidence: scripts/test-local.ps1 passed 829/3, all Node/syntax/secrets; dimensions/book range/backdrop/depth/unscaled-height tests added and ten-cycle disposal passes. Actual full and pulled-back Electron VRM0 night/day captures inspected, only in ignored tmp_ui_smoke/avatar-vrm-polish/metres-*.png. Full idle 19.98 FPS, CPU 4.21%, GPU 5.19%, 38 draw calls, within 1.5x original GPU budget. Required pre-push JSON/py_compile passed. Dimensions and limitations docs/avatar-3d-room.md. Draft #218 only, user appearance acceptance next.


## 2026-10-25 — PR #218 visual acceptance and merge preparation

User passed visual acceptance and explicitly authorized merge commit (--merge --admin) after local/package gates and all Linux/Windows CI pass. Fetched origin; latest origin/main already contained, no merge conflicts. Local main and private config remain untouched.

### Follow-up backlog (explicitly deferred, not fixed in this merge)

- 房间偏空：后续考虑增加书桌、床、墙面装饰。
- 夜晚人物脸部补光。
- 将落地灯从窗前移到窗户一侧。

Verification Evidence: fresh scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed. Required JSON/py_compile checks passed. Logs ignored under tmp_ui_smoke/avatar-vrm-polish/merge218-*.log. After CI, merge PR #218 then test exact latest origin/main in detached HEAD, preserving local main.

## 2026-10-26 — Live2D stage 2 merge, baseline and required proposal
- User confirms stage 1 passed author review and authorizes phase 2. Fetch completed; merged origin/main 2356ddb as 97ceb92. Conflicts only in THIRD_PARTY_NOTICES.md and feature_list/progress/session-handoff. Unioned both complete feature sets; retained both append-only progress histories and full original handoffs. three.js 0.180.0/three-vrm 3.4.4 and Live2D notices retained. Conflict originals backed up outside Git at work/avatar-stage2-merge-backup.
- Verification Evidence: targeted test_avatar_runtime.js, test_avatar_vrm.js, test_avatar_scene.js and test_live2d_core_compatibility.js all pass after merge. Read avatar-vrm-basic, avatar-3d-room, intent interface and actual avatarRuntime. No other conflict or manual runtime-code merge repair.
- The entry currently hardcodes VRM creation, QUALITY/EXPRESSION and optional interaction methods; only VRM enters it from initLive2D. Live2D owns a separate Pixi ticker/Core pre-update pipeline. A direct second update loop would risk double writes and ordering changes. Per explicit user condition, stopped implementation and wrote docs/avatar-live2d-stage2-plan.md for author review, specifying one factory/frame/events path, narrow clock/lifecycle ownership and exact mapping snapshots. No adapter, mapping or runtime rewrite implemented.
- Core 6 baseline: original Core4 and temporary SDK Core6 each pass all 63 existing Node files; finally restored original bytes. Actual browser load/render and emotion samples pass for both. Fixed-input raw Core snapshots are not bit-identical: 49/13/6 visible pixels differ out of 369360, max RGB delta 5; 17544 geometry/parameter scalars max delta 0.0000012069940567016602. This does not prove full Electron visual equality; no Core committed. Report docs/avatar-live2d-core6-comparison.md records methods and limits; evidence/captures outside Git in outputs/avatar-live2d-stage2.
- Full post-merge scripts/test-local.ps1 passes: 838 Python passed/3 skipped in 73.05 s, 63 Node files, Python183/JS213 syntax, secrets788. Docs check:all passes (4 browser cases). Publish only a proposal/report/state checkpoint for author review, then stop as instructed. No implementation PR completion claimed, no model/private assets or dialogue/memory/external-agent edits; no main push/force push/PR merge.

## 2026-10-26 — Author-approved implementation and independent Core6 upgrade
- Author approves the shared factory/frame/event plan with renderer-owned clocks, original Pixi ordering and optional hitTest/isAnimating. Same-Core complete parameter-write sequence equality is mandatory; stop if any mismatch cannot be resolved without changing behavior.
- Author now approves committing only web/vendor/live2dcubismcore.min.js from official SDK Web 5-r.5 (Core06.00.0001, SHA2568741f739779b5d5210872bd3d7d99f0f1e56e6c87409e7d26d6bb4b80aa1ef47). Both docs/live2d/vendor Core and display hashes verified unchanged. THIRD_PARTY_NOTICES records versions, hashes, official source, retained header and SDK redistribution designation/conditions. No model assets included.
- Verification Evidence: full scripts/test-local.ps1 passes under Core6 (838 Python passed/3 skipped, all 63 Node files, Python183/JS213 syntax and secrets788). Log outside Git: work/avatar-stage2-core6-full-tests.log. Mapping work has not begun. Save unchanged-controller Core6 baseline after this independent commit; keep PR217 draft and stop for Windows review after completion.


## 2026-10-26 — Stage 2 implementation and strict Core6 evidence
- Core6 upgrade committed independently as b39ab99 before mapping. Documentation Core/display remain byte-identical; third-party redistribution notice retained, no model assets included.
- Added six-method Live2D renderer and hiyori.json with parameter/part aliases, poses, capabilities and channel classification. Both controllers read mappings; preserve numerical algorithms and insertion/write order. One avatarRuntime entry owns source/frame/events; Live2D keeps original Pixi HIGH ticker/pre-Core hook and pointers, VRM owns its unchanged RAF cadence. Lifecycle cleanups release transient and persistent listeners, ticker and Pixi resources.
- Verification Evidence: pinned exact Git blobs from b39ab99 (not reimplemented expected algorithms); Node actual Core6 WASM/CubismModel with old/new runtime callbacks strictly matches all 394224 calls and every parameter/part snapshot across 5280 frames/42 scenarios. Real Pixi browser strictly matches 167741 calls and snapshots across 1030 frames/10 scenarios including authored Cubism motion; four paired canvas PNG hashes identical, no page errors, ten real-model reloads dispose old resources. Unknown/custom/missing mappings, direct/shared intents, 100 completed drags and active-drag disposal pass. Strict comparisons use no tolerance.
- Full scripts/test-local.ps1 passed 838 Python/3 skipped, all 65 Node suites, Python183/JS221 syntax and secrets800 before final listener cleanup; targeted final cleanup checks pass. Repeating complete gate before publication. Docs check:all passes four browser cases using existing local Chromium; required JSON/py_compile and unchanged docs-vendor hashes pass. Evidence/logs/screenshots remain outside Git; four new genuine creation-process captures added to local competition folder (13 total).
- Report docs/avatar-live2d-stage2-verification.md and reproducible scripts/qa_live2d_adapter.cjs. Keep #217 draft after normal branch push; stop for Windows appearance/interaction review. No stage3, model/private files, dialogue/memory/external-agent edits, main/force push or merge.

- Final Verification Evidence: complete scripts/test-local.ps1 after final mapping/interface/listener review passes: 838 Python passed/3 skipped, all 65 Node files, Python183/JS221 syntax, secrets800. Final log work/avatar-stage2-final-full-tests.log. Required JSON/py_compile, docs check:all four cases and docs-vendor byte/hash checks pass. Ready to commit and publish to #217 as draft; author Windows review remains the next stop.


## 2026-10-26 — Stage 2 draft publication checkpoint
- Published separate Core6 b39ab99 and implementation 94a9fca546d4ecbb2e5e390ad1f62a20f24ff173 by normal push to friend/avatar-live2d-adapter. Updated existing https://github.com/MaQinglin-665/AI-chat/pull/217 title/body around implemented stage2 and strict results; verified open/draft/unmerged, base main. Attached PR to this task.
- Verification Evidence: implementation-head GitHub Node Frontend Tests, Docs Publish and Smoke, Quality Checks succeeded; Python Tests and Windows Compatibility were in progress when checked. Complete local gate and exact sequence evidence recorded above. This checkpoint changes only state records; no new implementation requiring a repeated full local run.
- Next: keep draft and wait for author Windows appearance, drag, clickthrough and model-window review. No stage3, main/force push or PR merge; no unrelated/private/model/screenshot changes.


## 2026-10-26 — Stage3 explicitly authorized
User confirms replacing the local Hiyori character with Mao and authorizes original stage3 scope, local install update, push and PR217 ready status. Existing working tree clean at e0a7c8e. Read AGENTS/interface/current state; official SDK/Mao files found. Begin license/rig inspection and safe model-resource bridge; keep local assets/config private and Hiyori exact regression.


## 2026-10-26 — Stage3 Mao implementation and local installation
- Implemented Mao through the shared avatarRuntime, original Pixi clock/pre-Core hook and mapping-driven model layer. Added authenticated read-only local manifest whitelist and Blob prefetch (private model settings URL workaround); preserve existing API token/origin gates. Added conservative spectrum vowels with silence/ambiguity fallback and output latency, validated existing split-window audio bridge, official expression/motion mappings and three A-arm gestures, UI credit and setup report. No vendor/Core change in this phase.
- Verification Evidence: complete scripts/test-local.ps1 passed849 Python/3 skipped,66 Node suites,Python184/JS226 syntax,secrets807; final documentation-inclusive secret scan808. SameCore Hiyori remains strict: Node5280frames/394224calls; browser1030frames/167741calls, all snapshots and four paired PNG hashes identical, ten reload disposals. Actual Mao5vowels/8faces/3gestures captured,8 native motions awaited and played,21 authenticated resources and unauth401, zero page errors. docs check:all four cases, required JSON/py_compile pass. Full logs outside Git: work/avatar-stage3-full-tests.log, avatar-stage3-hiyori-browser.log, avatar-mao-browser.log.
- Updated actual D:/app/DesktopPet through13 minimal avatar files, local official model and only avatar config override; all other config keys and private files preserved. Fixed old installed page's missing local blob CSP entry, restarted desktop app; real installed backend model page verifies ready/Mao/Core6/132 parameters/no script errors with normal authentication. Rollback copies and evidence outside Git at outputs/installed-avatar-mao-update. Main/chat/external-agent code retained; browser proof is not a native desktop screenshot.
- Creation-process material now30 genuine local screenshots, updated labels/hashes:16 Mao checks plus actual installed page added. Official art ©Live2D Inc.; do not describe as team-original character art. Real speech vowel accuracy and original Windows interaction/appearance remain manual author checks. Next normal push #217 and ready-for-review; never merge/main/force push.


## 2026-10-26 — Stage3 publication and review handoff
- Implementation9657a30de1083ef060a0b87429349253d7a21320 pushed normally to existing friend/avatar-live2d-adapter. Updated #217 with full implementation, strict evidence, local model setup and honest capability/manual-review limits; GraphQL ready-for-review succeeded. Verified open/non-draft/unmerged/base main. No merge/main/force push.
- Verification Evidence: GitHub implementation-head Python Tests, Node Frontend Tests, Docs Publish and Smoke, Quality Checks succeeded; Windows Compatibility still running when checked. Local full849/3 +66Node and exact Core6/Mao/browser evidence above already passed. This checkpoint is state-only; no new product change requiring repeated full tests. Model/private assets not staged, repo code scope unchanged. Stop for author Windows review.


## 2026-10-26 — Browser speech synthesis fallback follow-up
- Final local inspection found that browser TTS has no analyser and the common frame used only audioLevel, so Mao could keep its mouth closed despite the existing synthetic mouth envelope. Corrected only mapped Live2D: sample that envelope without an analyser, bridge analysis availability and use the envelope only in the no-analysis case. Analysed silence and stale remote envelopes stay closed; Hiyori/VRM behavior unchanged.
- Verification Evidence: full scripts/test-local.ps1 again passes849 Python/3 skipped,66Node,Python184/JS226 syntax,secrets808; docs4 and required JSON/py_compile pass. Real Mao browser asserts ParamA=.6 without analysis and0 during analysed silence, all16 captures/8 native motions/auth checks pass. Real Hiyori again matches1030frames/167741calls and all snapshots/four PNG hashes strictly; Node5280/394224 remains passing in full suite. Logs work/avatar-stage3-fallback-full-tests.log, avatar-stage3-fallback-hiyori.log and avatar-mao-fallback-browser.log. Updated/restarted installed app and actual model page ready/Mao/Core6/132/no errors reverified. Commit/push follow-up normally to same ready PR; author Windows review remains next.


## 2026-10-26 — Mao mouth synchronization follow-up authorized
- User reports mouth starts before audible speech and stops before sentence finishes. Begin bounded browser-playback/mouth timing fix on clean1a3885a. Read current state/AGENTS and actual playback/expression/bridge paths. Verification Evidence: inherited local speech-timebase test and same-Core Node5280frames/394224calls strict regression pass. Need reproduce pending/onstart and long-speech clamped curve; preserve model/core/private files and dialogue/memory/external execution.


## 2026-10-26 — Mao actual browser playback/mouth timing correction
- Reproduction before fix using actual controllers: pending before-onstart mouth0.0122708; tail variation0 even while synthesis.speaking=true. Root causes: global speaking state can animate before utterance callback, and sentence-duration-normalized curve clamps to a constant at1.3. New mapped-Live2D helper owns mouth from actual utterance lifecycle, continues throughout long playback, closes on pause/end/error/cancel and ignores obsolete callbacks. Word/sentence boundaries re-anchor rhythm when available. Initial120ms start compensation exposed as bounded0..500ms avatar preference; not claimed as measured device latency. Analysed audio/Hiyori path retained.
- Shared bridge now wakes immediately on playback events and removes wake listener on disposal, avoiding idle250ms polling. No new renderer clock, duplicate voice playback or dialogue/memory/external execution changes.
- Verification Evidence: full scripts/test-local.ps1 passed849Python/3skipped,67Node,Python184/JS228 syntax,secrets810. New production tests cover pending/event/fallback/late-event/long-tail/pause/resume/boundary/end/error/cancel/stale callbacks and bridge cleanup. Actual Core6/Mao simulation before native calculation: pending/guard/pause/end0;long tail variation0.6621486134827137;16 captures,8native motions,21 authenticated resources,unauth401,zero page errors. SameCore Hiyori Node5280/394224 and browser1030/167741 strict calls/snapshots/four PNG pairs unchanged. Docs4 and required JSON/py_compile pass. Logs/evidence outside Git: work/avatar-mouth-sync-*.log and outputs/avatar-mouth-sync/mao-evidence.json.
- Installed6 bounded files after backup, restarted actual desktop app, private config/env/data/model assets preserved;5served asset hashes match, actual page ready/Mao/Core6/132/no errors, delay120ms. Backup outputs/installed-mouth-sync. Asked user to listen to a long sentence; no perceptual/device alignment claimed before their feedback. Next normal push still-open ready PR217; author/user review, no merge/main/force push.

- Publication Evidence: implementation50ef8c9 pushed normally to existing #217; PR description updated with root cause, actual lifecycle/120ms calibration and full verification, and open/ready/unmerged status verified. User listening feedback remains pending; no claim of measured or perfect audible alignment. This following publication checkpoint only changes state records.


## 2026-10-26 — Actual listening feedback confirmed
- User listened to the updated local application and explicitly reports “基本对齐，结尾也跟上了”. Keep the current120ms browser-mouth compensation; no further code, configuration or model changes. This closes the listening feedback item, while remaining author Windows interaction/appearance/PR review is separate. Qualitative confirmation does not imply measured exact latency. Verification: state JSON parses; state-only update requires no repeated product tests.

## Integrated latest main progress (#220/#221/#222)
## 2026-10-25 — VRM basic renderer

Based on fetched origin/main 5b20358; local main divergence preserved. Added restricted read-only avatar API, pinned local three.js/three-vrm vendor, independent intent renderer/runtime, attribution UI and synthetic tests. Private model remains outside repo, screenshots only in ignored tmp_ui_smoke/avatar-vrm.

Verification Evidence: Node fake VRM mapping/actions/fallback passed; Python path/meta tests 13 passed, 1 symlink privilege skip, including real Windows junction rejection. Isolated Electron 39.8.10 VRM0 render/alpha/actions/amplitude/metadata verified, Hiyori regression rendered. Performance and limitations in docs/avatar-vrm-basic.md. Full gate and packaging checks pending. No dialogue/memory/external-agent changes; no private configuration accessed. Draft PR only.

Final Verification Evidence: scripts/test-local.ps1 passed: 825 passed/3 skipped, all Node suites, Python/JS syntax, secret scan. scripts/check_first_run_package.ps1 passed, including preview defaults and source package smoke. JSON/py_compile pre-push checks passed. Final test logs and all model captures only in ignored tmp_ui_smoke/avatar-vrm. Next: draft PR and user Windows review; no merge authorization.


## 2026-10-25 — VRM performance and deterministic motion

Diagnosed real full/pet Electron windows before editing. Pet full-mesh hit testing averaged 101.75ms, consuming almost the entire renderer thread; replaced with projected bone capsules (~0.012ms). Added 900k pixel budget, 20/30 FPS cadence, inactive suspension and runtime cleanup. Added 72-degree standing arms, deterministic seeded idle/speech/small motions, action recovery, height-based framing and key/fill lighting. No model/private config/dialogue/memory/external-execution changes.

Verification Evidence: actual full-window idle GPU 15.99% to 6.97%; pet idle 6.27 to 20.20 FPS and simulated speech 6.46 to 29.97 FPS. Memory essentially unchanged; pet GPU increased with restored frame rate. Read-only texture inspection: 36, max 2048x2048, no resizing needed. Full report docs/avatar-vrm-performance.md. Private before/after/speaking/small-motion captures only in ignored tmp_ui_smoke/avatar-vrm-polish. First full gate passed 825/3; runtime lifecycle test subsequently registered in Node runner, final gate pending. PR #216 must remain draft; user visual review next.

Final follow-up verification: scripts/test-local.ps1 passed (825 passed, 3 skipped; registered runtime lifecycle suite and all Node tests passed, syntax/secrets passed). Required JSON/py_compile checks passed. Evidence: ignored tmp_ui_smoke/avatar-vrm-polish/full-tests-final.log. GitHub API connection failed five attempts, with 10-second retry intervals; stopped network operations. Changes committed locally; push/PR description update remains pending. Do not mark PR ready or merge. Resume with normal push of codex/avatar-vrm-basic and verify #216 is still draft.


## 2026-10-25 — VRM edges and detached pet presentation

Smoothed VRM cutout/outline edges using MSAA, explicit premultiplied transparent output and DPR >=1; retained authored MToon outline/color. Reduced key/ambient lights. Located missed decorations in index.html/kawaii-stage-decor: full/chat already hide them, model did not. visualPolish.css now hides the same layer in both VRM/Hiyori pet views, positions the Chinese status label at bottom-left, and fades it three seconds after readiness. Model files and private configs untouched; model SHA-256 unchanged.

Verification Evidence: real Electron at 1708x1068, idle 20.16 -> 19.93 FPS, GPU 2.97% -> 0.86%, including removed animation/compositor cost. Both VRM and Hiyori real windows: decoration display none, label 馨语, left 12px, ready opacity 1 -> 0 after 3.6s. Local-only before/after edge+lighting captures and measurements in ignored tmp_ui_smoke/avatar-vrm-polish. Full report docs/avatar-vrm-performance.md. First full test run exposed missing document.body in the old fake Live2D test; fixture corrected and readiness assertion added. Final scripts/test-local.ps1 passed: 825 passed/3 skipped, all Node, syntax, secret scan; required JSON/py_compile passed. PR #216 verified open/draft; normal push authorized, no merge.


## 2026-10-25 — VRM room integration and relaxed stance

Added separate room/transparent-pet light presets, room-only shader brightness/saturation grading, 15-degree body turn with head return and asymmetric relaxed posture/fingers, idle smile/deterministic saccades/reply preparation, and elevated 27-degree framing. New tuning in vrmRenderer.js constants. avatarRuntime reads existing reply timestamps and uses its existing channel; no dialogue/voice/history changes. Audited the user-selected stored record: role=user matches the rendered label; source provenance is unavailable, so no speculative history migration or role fix performed. Private content not copied into tracked artifacts.

Verification Evidence: final scripts/test-local.ps1 passed (825 Python passed, 3 skipped; all Node, syntax and secret checks passed). New tests cover framing projection, finger/pose recovery, material isolation, smile/saccades and one-shot reply preparation broadcast. Real Electron VRM0 full before/after and neutral-pet captures inspected in ignored tmp_ui_smoke/avatar-vrm-polish/room-*.png. Baseline renderer served from 321fc17 only by test interception. Model hash unchanged. Required JSON/py_compile checks passed. No new real VRM1 or live LLM/TTS acceptance claimed. PR #216 remains draft for user review.


## 2026-10-25 — PR #216 accepted, merge preparation

User passed visual review and explicitly authorized --merge --admin after required gates, superseding draft-only restriction. Fetched origin successfully on fourth attempt after TLS errors. Latest origin/main 5b20358 already contained in avatar branch; git merge reported up-to-date, no conflicts. Verification Evidence: scripts/test-local.ps1 passed (825 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed. Logs in ignored tmp_ui_smoke/avatar-vrm-polish/merge-local-tests.log and merge-package-check.log. Acceptance-only state update; no runtime changes. Next: ready PR, all current-head Linux/Windows CI green, merge commit, then final exact origin/main gate. Preserve unrelated local main commit 0a06554; no reset or private config modification.


## 2026-10-25 — Procedural VRM room v1

Fetched origin/main and verified PR #216 merge a08e0c4 ancestor; created codex/avatar-3d-room-v1. User explicitly asked to preserve local main/0a06554; remote architecture branch is exactly that commit, no edits. Added independent seeded room data/build/disposal, five instanced Toon batches, generated sky/ramp/contact shadow, bounded room/none API field, existing stageRoom day/night transition. Full VRM hides painted stage only with room active; transparent pet and Hiyori retain old paths. No dialogue/memory/external execution/Live2D renderer/private model/config changes.

Verification Evidence: Node deterministic layout/bounds/day-night/no-request checks, real Three no-WebGL ten-cycle resource disposal and fake renderer gating. Actual Electron VRM0: 20.00 -> 19.97 FPS, CPU 4.45 -> 3.85%, GPU 4.93 -> 4.92%, draw calls 28 -> 34. Ten room/none cycles return geometry/textures to 20/45, no sustained post-GC JS heap growth. Six requested captures plus baseline saved only in ignored tmp_ui_smoke/avatar-vrm-polish; Hiyori stays live2d with original background. Report docs/avatar-3d-room.md. Initial full gate 829 passed/3 skipped, Node/syntax/secrets passed; first-run package passed. Final gate after shared-material restoration test passed: 829 passed/3 skipped, all Node/syntax/secrets. Required JSON/py_compile pre-push checks passed. Draft PR only; user Windows appearance review next.


## 2026-10-25 — Room metre scale, depth and daylight

User reviewed #218 and requested physical proportions/composition. Removed avatar-height scaling, explicit furniture dimensions in metres, wall 3m behind avatar and side furnishings 2–2.65m behind. Added clean head backdrop, square wall joins/ceiling/skirting, partial distant pink crowns, moon/star sizes/clouds, brighter warm daytime with non-shadow-mapped sun patch. No private/model/Live2D/dialogue/memory/external execution changes.

Verification Evidence: scripts/test-local.ps1 passed 829/3, all Node/syntax/secrets; dimensions/book range/backdrop/depth/unscaled-height tests added and ten-cycle disposal passes. Actual full and pulled-back Electron VRM0 night/day captures inspected, only in ignored tmp_ui_smoke/avatar-vrm-polish/metres-*.png. Full idle 19.98 FPS, CPU 4.21%, GPU 5.19%, 38 draw calls, within 1.5x original GPU budget. Required pre-push JSON/py_compile passed. Dimensions and limitations docs/avatar-3d-room.md. Draft #218 only, user appearance acceptance next.


## 2026-10-25 — PR #218 visual acceptance and merge preparation

User passed visual acceptance and explicitly authorized merge commit (--merge --admin) after local/package gates and all Linux/Windows CI pass. Fetched origin; latest origin/main already contained, no merge conflicts. Local main and private config remain untouched.

### Follow-up backlog (explicitly deferred, not fixed in this merge)

- 房间偏空：后续考虑增加书桌、床、墙面装饰。
- 夜晚人物脸部补光。
- 将落地灯从窗前移到窗户一侧。

Verification Evidence: fresh scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed. Required JSON/py_compile checks passed. Logs ignored under tmp_ui_smoke/avatar-vrm-polish/merge218-*.log. After CI, merge PR #218 then test exact latest origin/main in detached HEAD, preserving local main.


## 2026-10-25 — Room life v1

Created codex/avatar-room-life-v1 from origin/main 2356ddb (merged #218), preserving local main 0a06554.
Verified local KayKit Furniture Bits 1.0 FREE original CC0 1.0 license; selected 10 glTF + matching bin + shared atlas + license only.
Added metre-scale toon-batched furniture with allowlisted local loading/procedural fallback, desk/chair/sofa/decor; four-layer shelves avoid oversized books.
Added deterministic 60–180s day/night-weighted activities, radius-inflated visibility-graph paths, walk/sit/hand contacts/book prop, smooth camera follow,
input/send/hearing/busy interruption and 20–40s resume. Avatar-only integration; no dialogue, memory, external execution, Live2D or private-config edits.

Verification Evidence: final scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node/syntax/secrets).
New Node checks: all-pairs paths, free activity points, determinism, interruption/resume, smooth standing, local dependency allowlist,
failed/cancelled loads, merged toon assets and resource cleanup; runtime signals/listener disposal covered.
scripts/check_first_run_package.ps1 passed, verifies all selected furniture and license bytes in the install source package.
Required pre-push JSON/py_compile checks passed. Actual Electron VRM0 four activities, walking, input interruption, day/night wide captures:
ignored tmp_ui_smoke/avatar-vrm-polish/life-*.png; 35s silent life-tour.mp4, test-only accelerated activity selection.
No page exceptions. Ten room toggles stable at 28 geometries / 47 textures. Idle baseline→new: FPS 19.99→19.98,
CPU 3.28→3.32%, GPU 5.32→5.04%, draws 38→36, working set 959→970 MiB. Evidence/report docs/avatar-room-life.md.
Limitations: real VRM1 and live ASR/LLM/TTS not exercised; procedural poses lack foot IK/full-body collisions, unusual outfits/heights may need tuning;
no installer exe built. Existing night face-fill follow-up remains deferred. Only draft PR, user appearance review next; do not merge.

Published implementation 0c34e34 on codex/avatar-room-life-v1; draft PR #219 targets main. Final package recheck passed. Private config hash unchanged. Waiting for user visual review; no merge.

## 2026-10-25 — PR #219 seated contact and camera revision

Measured sofa/chair surfaces (0.310/0.342m), measured leg lengths and constrained hip/ankle contacts replace the old height-only seating. Lap hands and desk elbow/chin support, 1.8s activity cameras, bounded back-facing glances and runtime purple furniture tint added. Procedural fallback seats match the same surfaces; source assets unchanged.
Verification Evidence: final scripts/test-local.ps1 passed: 829 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed. New synthetic VRM0/1 short/long-leg tests preserve bone lengths and seat/floor contacts; real Electron VRM0 contacts <1mm, desk elbow 0.7645m vs 0.765m target. No page exceptions; ten room toggles stable. Sofa/desk front and side, four activity views and 35s silent seated-tour.mp4 are ignored under tmp_ui_smoke/avatar-vrm-polish. Capture-only active-surface override avoids existing background pause.
Limitations: no real VRM1 model acceptance or arbitrary outfit collision guarantee; extreme unreachable desk proportions are reported. Updated draft #219 awaits user visual review; no merge. Local main and private config/model untouched.

## 2026-10-26 — PR #219 visual acceptance and merge gate

User accepted the visuals and authorized merge commit after local/package and Linux/Windows CI gates. Fetched origin/main 2356ddb; already contained by this branch, no merge conflicts. Local main remains 0a06554; private config unchanged.

Deferred TODO (explicitly not fixed this round):
- 书桌前平放在桌上的那只手太僵。
- 窗边伸手时手部悬空。

Verification Evidence: scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed); scripts/check_first_run_package.ps1 passed. Required JSON/ten-module compilation, secrets and diff checks passed. Next: push, mark #219 ready, wait for all CI, merge with --merge --admin, and test latest origin/main without moving local main.

## 2026-10-26 — Optional hand-painted room preset

Branch codex/avatar-room-handpainted-v1 from origin/main 0542d04; local main/private config unchanged. Read both room documents and original asset license.txt (CC BY 4.0, OzerGokmen). Added attributed local base-color assets, measured 0.014m/source-unit scale, runtime cutaway/coffee-table removal, preset layout and KayKit chair. Shared room lifecycle, day/night, scheduler, seat solver and camera pipeline; room remains default.
Verification Evidence: targeted Node layout/path/local-only/fallback/async-disposal and synthetic seated-contact tests pass. Final scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed). scripts/check_first_run_package.ps1 passed, including every new asset/license/change-notice hash. Initial package check exposed the global *.bin ignore: added an exact scene.bin exception and rechecked successfully.
Real Electron VRM0: same-camera room/handpainted, day/night panoramas, four activities, forced missing-scene fallback and ten room/none/handpainted cycles; no page exceptions. Stable resources: room 28 geometries/47 textures; handpainted 41/60. Draws 36 vs 42 at companion view, activity views 38–47. No fresh CPU/GPU timing benchmark claimed. Ignored evidence: tmp_ui_smoke/avatar-vrm-polish/handpainted-*.png, handpainted-acceptance.json, handpainted-tour.mp4 (35s silent). Original scene.bin and 15 base-color images hash-identical to download; private config hash unchanged.
Limitations: fixed painted shadows/reflections, visible cutaway boundaries, inherited stiff/airborne hand contacts, no arbitrary outfit collisions or real VRM1 visual check. Default room unchanged. Await user visual review via draft PR only; no merge.

## 2026-10-26 — Painted backdrop implementation

User authorized b22d4ef (PR #220) prerequisite. Fast-forwarded only this committed head; other thread motion/camera changes excluded. Work exclusively in ai_desktop_pet_painted with copied dependencies. Draft PR must target main and begin with dependency notice. Merge origin/main after #220 only; stop on conflicts outside three state files.

Verification Evidence: final scripts/test-local.ps1 passed: 841 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed. scripts/check_first_run_package.ps1 passed again with explicit painted code/placeholder presence and placeholder hash. Initial 19 unrelated test failures came from disposable work/home paths inside the checkout; fixed only two test fixtures by giving them a sibling synthetic protected-project, preserving security assertions and product policy.
Actual isolated Electron VRM0 on loopback 8137 with a separate ignored test-config.json, no config.local.json/LLM: night/dusk/day, metre grid, 1920x1080/1280x800/480x800, 30.000s MP4, setting-driven reflection disposal and room/handpainted/none/pet regression. No page errors. Captures/video/config/logs remain ignored in tmp_ui_smoke/painted. All supplied PNGs currently 2560x1440; no source asset/model copied into tracked paths.
Lifecycle: ten initial scene cycles and further four batches of ten. GPU counts stable at 25 geometries / 48 textures; four major-GC heap samples 7197120, 6709132, 6818676, 6967892 bytes (6.40–6.86 MiB), final below first. Short-run evidence only, not an absolute long-term leak guarantee. Reflection off releases its target.
Shared integration files: avatar_assets.py, app_get_routes.py, web/avatar/vrmRenderer.js, web/avatar/avatarRuntime.js, web/avatar/vrmWorld.js, web/index.html, web/stage.css. Camera-follow block unchanged; dedicated paintedCamera object. Full 21-file list and calibration limitations in docs/avatar-room-painted.md. No dialogue/memory/external-execution product code or Live2D renderer modified.
Remote fetch recovered; #220 is OPEN at b22d4ef, origin/main remains 0542d04. Draft PR to main must start with dependency notice. After #220 merges, merge origin/main only if conflicts limited to three state files; never auto-merge this PR.

## 2026-10-26 — PR #221 integration polish

User accepted perspective/scale/crop; requested stronger contact/reflection, directional period lighting, avatar-only softness/glow/grading and before/after/detail captures. Same branch/worktree; do not alter camera calibration. Baseline 7aeb26b; #220 still open.
Implementation: stronger two-foot contact cores and directional soft shadows; reflection opacity night/dusk/day 0.20/0.24/0.19, softened and floor-tinted with downward fade. Corrected window/lamp screen directions, period grading, 0.75 CSS px avatar-only softness and faint halo. Accepted fixed camera/crop unchanged. Only shared code change this revision is vrmRenderer.js painted render dispatch; avatarRuntime and camera-follow untouched.
Verification Evidence: scripts/test-local.ps1 passed (841 Python passed, 3 skipped; all Node, syntax and secrets checks). Actual isolated Electron VRM0: same-pose 1920x1080 before/after for all periods and 3x feet/edge crops, final shader/page errors empty. Outer background columns 0:700 unchanged pixel-for-pixel in all periods. Twenty additional scene cycles: stable 26 geometries / 49 textures; two major-GC samples 6677384 and 6835904 bytes. Settings disable releases reflection target; room/handpainted/none/pet smoke passed. Actual painted frame has 50 draws across reflection/avatar/composite passes (16+28+6), not only the final pass count of 6.
Evidence remains ignored under tmp_ui_smoke/painted-polish (after-final-*.png, before-*.png, acceptance.json, test-local.log). Extra full-resolution MSAA avatar buffer increases GPU memory/render cost; no hardware-wide performance or long-run leak guarantee. No private assets/config committed. PR #221 remains draft pending visual review; prerequisite #220 merge condition unchanged.
## 2026-10-26 — Camera/motion task started, network pause

User authorized inclusion of unmerged #220 into new codex/avatar-motion-camera-v1 branch; origin/main 0542d04 -> b22d4ef, local main unchanged. Both baseline 35s silent recordings captured in ignored tmp_ui_smoke/avatar-vrm-polish/motion-before-{room,handpainted}.mp4. Camera diagnosis: animated avatarRoot and seat corrections feed frame-by-frame camera targets after the old transition completes. Partial root-only damped/dead-zone/activity-lock camera added; not yet acceptance-tested.
Verification Evidence: node --check for camera and renderer, git diff --check passed. Full tests not run. CMU official terms allow commercial-product inclusion but prohibit direct data resale; BVH converter adds no restrictions. Download of local-only walk evaluation failed with connection resets after five attempts 10s apart. Paused under network rule; no motion changes, full gate, after evidence, commit, push or PR.

## 2026-10-26 — Camera stability and procedural motion

User explicitly deferred CMU 2a after failed download; no data evaluated or integrated. Retained user-authorized #220 dependency in codex/avatar-motion-camera-v1, local main/private config unchanged. Camera now consumes logical horizontal root and immutable stature/seat measurements, with analytical critical damping, dead zone and activity lock. Added collision-checked corner arcs/curvature braking, acceleration, layered turns, 700ms eased transitions, seeded variation, distance-based gait and measured planted-foot IK. Real departure testing exposed sideways predicted landings during the initial turn; fixed by using neutral hip width, finishing the initial turn before stepping and predicting along the travel heading. Release knee clearance with the foot constraint while stopping.

Verification Evidence: scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node, syntax and secrets); final rerun after last clearance tuning also passed, same gate log. Package smoke passed including local scene assets/licenses. New tests cover dead zone/activity lock, fixed and moving 20/30Hz results, all-pairs safe curved paths and direction-rate bound, pose/bone continuity, seeded traces, VRM0/1 long/short-leg foot planting and neutral-width regression. Simulated camera max jitter 6.608mm -> 0mm (limit 0.1mm); path max 1.517rad/s < 2.2. Private config hash unchanged.

Real Electron VRM0: both presets, same fixed 30Hz timeline (rest, desk, window, input interruption), four 45s silent before/after videos at 10fps. Replaced uneven wall-clock screenshot capture with native capturePage; these are controlled-render comparisons, not performance measurements. No page exceptions; steady seated camera adjacent 1s sample delta room 6.073mm -> 0, handpainted 6.008mm -> 0. Both after clips have 14 walking samples with reach error zero. Ignored evidence tmp_ui_smoke/avatar-vrm-polish/motion-{before,after}-{room,handpainted}.mp4 and JPG/JSON samples. No media/model in Git.

Limits: real VRM1 not visually verified; procedural gait/full-body clothing collision and inherited hand contacts remain limited. See docs/avatar-motion-camera.md for exact scope, failed CMU URL and local future task. Next: draft PR to main, wait for user; no merge.

Publication result: implementation cbdf497 committed locally. git push -u origin codex/avatar-motion-camera-v1 failed all five attempts (10s spacing): two TLS handshake failures, three port-443 timeouts. No draft PR created and no further retries. Code/tests/captures complete; handoff records the exact user push command and next draft-PR step. Local main remains 0a06554; private config hash unchanged. No force push/main push/merge.

Publication resumed: user confirmed successful push. Verified remote branch and PR head daa5971; created draft PR #222 to main via local gh after connector creation permission 403. https://github.com/MaQinglin-665/AI-chat/pull/222 . Attached to the task. State changed from publish_blocked to awaiting_visual_review; prior implementation/test evidence unchanged. No merge, main push, private-config edit or media upload. Await user appearance review.

## 2026-10-26 — Accepted #220 / #222 sequential merge

User accepted #222 and authorized merge commits in order, without modifying local main/private config. #220 already contained latest origin/main 0542d04; no conflicts. Verification Evidence: fresh scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed; gh pr checks 220 all green including Python Tests and Windows Compatibility. Marked ready, merged with --merge --admin: a0bdce4fcb8d85dd784438a88b96736c705a1bda.

Fetched and merged origin/main containing #220 into codex/avatar-motion-camera-v1; no conflicts. Now validating #222 with both local gates, then normal push/ready/all CI/merge commit, then full local test on latest origin/main with detached HEAD. Local main remains 0a06554. No product-code changes this task.

Deferred TODO, explicitly not fixed this task:
- 镜头切换时画面卡顿。
- 动作仍偏机械。

#222 local Verification Evidence: scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed; required JSON/compilation and diff checks passed. Only the three state files changed after the conflict-free merge. Proceed to normal push, ready, all CI and merge gate.

Merge publication blocked: #222 push failed all five attempts, with 10s spacing (TLS handshake failures and port-443 timeouts). Local merge a05c690 and gate record 44b3a01 retained; no conflicts. #222 was not marked ready or merged; final latest-origin/main test is pending its merge. #220 merge a0bdce4 is complete. User push command: git -C D:/AI/ai_desktop_pet_readiness_20261023 push origin codex/avatar-motion-camera-v1 . After success resume ready/check all CI/merge #222, then detached origin/main final test. No further network attempts.


## 2026-10-26 — PR #221 accepted integration

User accepted visuals and authorized merge after local/package/CI checks. Integrating origin/main ee3de6e (#220/#222 merged). User explicitly approved the sole non-state conflict: retain walking and painted metrics in vrmRenderer.js; camera algorithm unchanged.

待办（另开任务）：
- 高清背景到位后拉近陪伴视角，让人物更大。
- 加强黄昏时的逆光轮廓。

Verification Evidence: camera/motion/locomotion/painted targeted Node tests pass. Full test-local passed (841 passed, 3 skipped; all Node/syntax/secrets), with PYTEST_ADDOPTS=--ignore=tmp_ui_smoke to avoid collecting old ignored test fixtures. First-run package smoke passed. Merged real VRM0 night capture: natural lowered-arm idle, fixed painted camera across 12s sampled updates; no page/shader errors. Evidence tmp_ui_smoke/painted-polish/merged-night.png and merged.json. No camera algorithm edits.

CI repair: Node painted test duplicated pytest invocation, but Linux Node job intentionally has no pytest dependency. Removed only that nested invocation; unchanged test_avatar_backdrops.py remains in Python/Windows/full gates. Targeted Node and Python backdrop suites rechecked.


## 2026-10-26 — PR217 prioritized; shared lipsync separated
- Explicitly fetched main because origin refspec omitted it; merged79ee80f (#221 plus ee3de6e/#222) as8d514b7, retaining painted controls, VRM input/world/camera and renderer-owned clocks. Resolved8 conflicts preserving both notices/state histories; no force/main push/merge of PR.
- User requires mouth fixes in a separate main-based PR. Applied normal product-only inverse patches for50ef8c9 and1a3885a, retaining all history and installed120ms/user listening result locally. Saved exact prototypes outsideGit at outputs/lipsync-separated. New#217 baseline contains adapter/Core/Mao model integration, not browser timing/fallback changes. Pending strict/full/package checks and dedicated Hiyori video; LLM phase2 still prohibited before#217 merge.


## 2026-10-26 — PR217 latest-main closeout verified
- Changes: normal inverse patches isolate previous browser mouth timing from adapter/Core/Mao work; optional QA recording produces a dedicated Hiyori inspection video. VRM painted controls now register only for VRM, preserving upstream functions without touching Hiyori's ticker/write ordering.
- Verification Evidence: merged main79ee80f (#221/#222) via8d514b7; exact Node5280frames/394224calls/42scenes and actual browser1030frames/167741calls, full ordered writes and parameter/part snapshots strictly identical, four identical PNG pairs, ten reload cleanups. Final browser rerun after painted guard also passes.
- Complete scripts/test-local.ps1 passes861Python/3skipped,72Node,syntax186/239,secrets834. Docs check:all4 and scripts/check_first_run_package.ps1 pass; required JSON and py_compile pass. Logs outsideGit work/pr217-closeout-*.log. Initial full gate caught painted controls on Live2D mock; fixed renderer guard and reran full gate successfully.
- Local evidence: outputs/pr217-closeout/Hiyori-PR217检查录像.mp4,38.4s/960frames/25fps, reviewed visible Hiyori. Silent controlled realPixi/Core browser fixture, not native Windows/live speech or a performance measurement. No media/model/private data committed. Original installed120ms mouth fix preserved while separate main-based PR is prepared.
- Next: normal push existing branch, update #217 to ready, deliver dedicated video; author reviews/merges. Then separate shared lipsync branch directly from latest main. No main/force push/PR merge; LLM task phase2 waits for author merge.


## Incoming main #224 history
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


## 2026-10-25 — Final onboarding/message polish and publication preparation

- First user message completes the single-step greeting guide and persists seen state; previous button hidden. Moved technical steps to docs/config.html. Fixed timestamp flow/grid placement, hover/focus-only feedback/heart and keyboard focus on assistant messages. Copied avatar-intent-interface.md exactly as requested; no avatar runtime implementation.
- Verification Evidence: full scripts/test-local.ps1 passed, 789 Python / 1 skip, all Node tests, Python179/JS203 syntax and secret scan751. Updated onboarding unit test covers first-message dismissal/persistence/no reopen. Browser regression now uses actual message-row renderer, checks timestamp bounding boxes and hover/focus at both viewport sizes, and invokes actual message append for guide dismissal. Browser result recorded below after completion.
- Authorized three feature branch pushes and experience draft PR against external-agent branch; no main/merge. GitHub DNS preflight failed; actual push still pending. Cleanup scope explicitly restricted to workspace and its two run archives, not isolated configuration/history or screenshots.
- Browser matrix passed in real Edge at 1024x768 and 774x1208: actual rendered message timestamp below content; feedback and heart hidden by default, revealed on hover/focus; first appended user message closes guide and marks seen; no previous button. Synthetic messages/task endpoints; no fresh model/audio acceptance.

- Final outcome: local repair commit 38e1da3. Two normal pushes failed with github.com DNS resolution error; no remote success or PR claimed. Prepared PR body retained locally. Owned 8124 process tree stopped (5620/48768); no listener remains. Automatic approval review rejected the combined recursive cleanup command with blocked by policy before execution; all three authorized cleanup targets remain, configuration/history/screenshots untouched. Publication and cleanup remain pending; no workaround deletion attempted.

- Publication retry: required JSON/compile checks and secrets752 passed; all three specified feature branches pushed normally. Connector PR creation returned403; authenticated gh created draft #214 against codex/external-agent-codex-cli-v1, attached to task. No merge/main push. 8124 remains stopped. Resolved and checked the three cleanup paths (no reparse links); explicit literal-path removal was still rejected by automatic policy. Directories retained; cleanup remains the only pending requested action.

## 2026-10-24 — Clean dependency validation (started)
- User selected handoff task 1; new branch codex/clean-dependency-validation-20261024 from 86a93ca on codex/developer-readiness-20261023. Fresh checkout has no unrelated changes.
- Read AGENTS.md, session-handoff.md, docs/handoff/README.md, feature_list.json and current progress before implementation.
- Validate README setup with an empty local venv and fresh Node dependencies; no existing desktop configuration, credentials, memories or voice samples copied. Main is not checked out or pushed.

### Implementation and initial evidence
- Original six runtime pins plus pytest installed successfully in a new isolated CPython 3.12.9 venv on Windows 11 x64; pip 26.2.2. All six runtime modules and pytest import successfully; pip check passes. Project-local Node 22.23.4/npm 10.9.9 and Electron 39.8.10 installed. Wheel cache was reused; no system site packages inherited.
- Fixed missing local-Node support in the batch launch path, BOM JSON written by Windows PowerShell 5.1 setup, validation using global Python, and unlocked npm install. Added dependency consistency/import gate and 84 platform-scoped version constraints. Empty-environment dry resolution exactly matches all 84 installed versions. No new third-party dependency.
- First full local gate: 738 Python tests (one Hugging Face symlink cache warning), every Node suite, Python/JS syntax and secret scan passed. Nine targeted setup tests pass, including the two subsequently added encoding regressions. Required JSON and ten-module compilation pass. Final full gate pending after final source changes.
- Actual fresh Electron/configuration wizard and backend observed. Setup-generated JSON now passes Node JSON.parse. The user explicitly authorized reusing their existing Harness local connection only after initial no-key installation validation; ignored local config/.env now point to that service. Model probe and first_chat_smoke.ps1 -NoStartServer passed; /api/chat returned a two-character reply. No credentials or private runtime files staged.
- Existing plain frontend controller-loading failure (syncProactiveSchedulerPolling on null) reproduced from the selected source branch; recorded as a separate follow-up in the report. Bluetooth/wired/minimized-window listening, microphone and long-duration acceptance remain untested.

### Final local Verification Evidence
- scripts/test-local.ps1: **740 passed** (67.05 s), every Node suite passed, Python syntax 165 files, JavaScript syntax 191 files, secret scan 714 tracked text files passed; doctor reports zero warnings. First baseline run had one Hugging Face symlink-cache warning; no cold-cache claim.
- PowerShell setup replay writes both generated configurations without BOM; actual Node JSON.parse succeeds. pip check remains clean, and all 84 package versions exactly match the --ignore-installed resolution.
- Both required JSON documents parsed and the ten required Python modules compiled; git diff --check passed. New local model configuration and all runtime/log/venv/tool directories confirmed ignored. Documentation browser gate pending a project-local Chromium download.

### Documentation gate and completion
- Contributor-required docs/check:all passed: publish check and 4 Chromium smoke tests (9.4 s). The first attempt correctly exposed an absent Playwright browser; installed Chromium headless into ignored project-local tools and reran successfully. Node emitted only the existing NO_COLOR/FORCE_COLOR warning.
- All 18 staged files belong to this task; no unrelated source changes, secrets, local model settings, logs, environment packages or generated artifacts included. Parent readiness task now records clean dependencies as verified for Windows x64/Python 3.12, while frontend and manual device acceptance remain separate.
- Feature complete; one focused commit and authorized feature-branch push/PR to main follow. No direct main update, force push, merge or release. The PR must state it inherits open draft #210 from the requested starting branch.


## 2026-10-24 — Reminder reliability (started)
- User requested a complete project capability review before optimization, then explicitly selected reminder reliability after seeing concrete reproductions.
- Independent branch codex/reminder-reliability-20261024 starts at b62f759; initial tree clean. Existing dependency PR remains unchanged.
- Indexed 709 first-party tracked text files (204337 lines; excludes vendor/model assets); inspected backend/frontend module interfaces, route and command wiring, state, docs and tests. This is structural coverage plus focused source review, not a claim of line-by-line semantic review of every historical file.
- Reproduced full-date command rejection, invalid clock/calendar acceptance, literal question-mark save status and immediate repeat attempts in both installed and cloned code. Isolated Chromium confirms the installed page reaches idle and saves a schedule with the broken status; clone normal startup has the separately documented controller-loading blocker.
- Scope: reminder date parsing, user-visible status, bounded persisted retry and manual recovery. No new model, learning feature, security defaults or private data changes.

### Reminder Verification Evidence and delivery
- Focused reminder behavioral regressions pass: strict dates, full-date/spaced-unit commands, save status, 30s/120s retry delays and 3-attempt budget, persisted pause/deadline, manual recovery, single-flight, sync failure, removal, tool pause and daily catch-up. Existing button/free-chat/control-center regressions pass.
- Final scripts/test-local.ps1 completed: 740 Python tests passed in 84.52 s; all 56 Node suites passed; syntax 165 Python / 194 JavaScript files; secret scan 716 files; doctor zero warnings. The first sandboxed run failed due to restricted temporary-directory/socket access; rerun with normal local permissions passed. Required JSON, ten Python compilations and diff checks passed.
- Contributor docs check:all passed: publish check and 4 Chromium smoke tests in 7.1 s; existing NO_COLOR/FORCE_COLOR warnings only.
- Real isolated Chromium checked source with an explicitly declared installed startup-manifest fixture, then actual installed files after synchronization: readable save status, paused-state reload, manual retry and no extra requests during repeated polling ticks. Simulated 503 interfaces only; no real LLM calls. Screenshots/JSON stay outside Git in outputs.
- Seven reviewed frontend files synchronized to D:/app/DesktopPet after normalized baseline comparison and original byte backups under outputs/backups/reminder-reliability-20261024-181229; hashes verified. No private config, token, memory or startup-manifest changes. No running installed pet window was found; changes apply when next opened.
- User selected only reminder reliability. Source startup blocker, learning/focus features and real microphone/audio/long-duration acceptance remain separate. All fourteen task files are scoped to implementation, tests, docs and required state. Commit/feature-branch push and PR follow; no main update or merge.

## 2026-10-25 — Ordered integration, PR #213

- User authorizes merge commits in order #210/#211/#212/#213/#214. First three merged after passing checks. Merge origin/main 2be017b into external-agent branch; only feature_list.json, progress.md and session-handoff.md conflicted. Union feature IDs; retain main's completed clean dependency evidence using three-way comparison, both progress blocks, and both archived handoffs. Runtime files merged automatically. Full local gate pending; stop on failure.

- PR #213 integration verification: full scripts/test-local.ps1 passed, all Node suites plus Python/JS syntax and secret scan passed; raw log tmp_ui_smoke/task6/merge-213-tests.log (ignored). Normal merge commit/push next; CI remains required before PR merge.

## 2026-10-25 — Ordered integration, PR #214

- #213 merged as 3611e5747b2e33a53b5013249c475d5243099a9b after all Linux/Windows checks passed. Test-only encoding fix 2c13028: cp1252 simulation 49 passed/2 skipped, full local gate 790 passed/2 skipped; no product changes for CI fixes.
- Merge origin/main into experience-fixes-v1: only progress.md and session-handoff.md conflicted. Both progress blocks retained; both handoffs archived; feature_list.json merged automatically and JSON verified. Full local gate pending; stop on any failure.

### Preserved pre-integration handoff: experience

<details>
<summary>Historical record; current merge authorization takes precedence</summary>

# Session handoff

## Final experience polish and publication

User now authorizes pushing exactly codex/stage-feedback-onboarding-v1, codex/visual-polish-v1 and codex/experience-fixes-v1, then a draft PR from experience-fixes-v1 to codex/external-agent-codex-cli-v1. No main push or merge.

- Single greeting-only onboarding ends and persists completion on the first user message; no previous button. Technical steps moved to docs/config.html.
- Message timestamp participates in layout; optional feedback and decorative heart appear on hover/focus. Assistant rows are keyboard-focusable.
- Copied requested docs/avatar-intent-interface.md byte-identically (SHA256 7ABB45D3E2FB868D2969CC53E7189763231F7AB4A2BC3296B9A626A0B8FC6DAF); design document only, no avatar implementation added.
- Tests and acceptance details in progress.md. Task 6 evidence remains docs/experience-fixes-verification.md; historical provider_failed remains unreproduced.

## Publication and cleanup outcome (retry succeeded for publication)

- Repair commit: 38e1da3. All tests passed; final secret scan 752 files. Browser matrix passed with actual message renderer and actual user-message append (synthetic content; no new model/audio acceptance).
- Retry: all three specified branches pushed successfully. Draft PR #214 created via authenticated gh after connector returned 403; attached to this task. URL https://github.com/MaQinglin-665/AI-chat/pull/214 ; head codex/experience-fixes-v1, base codex/external-agent-codex-cli-v1. No main push, force push or merge.
- Owned 8124 process tree stopped successfully (5620 and child 48768); no listener remains. Daily 8123 untouched.
- Cleanup command was rejected by automatic approval review with `blocked by policy` (no more specific reason). All three directories remain: D:/AI/.tools/stage4-experience-20261024/workspace, workspace-task6-run1, workspace-task6-run2. User authorized deleting ONLY those; isolated configuration/chat history, screenshots and other backups must stay. Do not claim cleanup completed or try to bypass the policy via another shell/tool.

## Next

Draft #214 awaits review. The three test directories still need cleanup once the automatic policy restriction is resolved; a retry with separately verified literal paths was again rejected, so all three remain. Do not bypass the restriction or delete the parent data root. Historical provider_failed root cause remains unknown. Previous handoff archived at docs/archive/2026-10-25-experience-fixes-handoff.md; two backend followups stay backlog.

</details>

### Preserved pre-integration handoff: main-external-agent

<details>
<summary>Historical record; current merge authorization takes precedence</summary>

# Session handoff

## Ordered merge integration — PR #213

User authorizes merge commits via gh --merge --admin, no squash/rebase/force push/branch deletion/tag/release. main protection enforce_admins=false verified. #210 merged 71c9ebb; #211 merged 256eff8; #212 merged 2be017b, each after all PR checks passed. #213 base changed to main; integrating origin/main into codex/external-agent-codex-cli-v1.

Only feature_list.json, progress.md and this handoff conflicted. Feature IDs unioned; main's completed dependency validation retained by three-way comparison; both progress blocks retained. Prior handoffs archived at docs/archive/2026-10-25-integration-external-agent-handoff.md and docs/archive/2026-10-25-integration-main-reminders-handoff.md. Historical no-merge directions are superseded by this user request.

Full scripts/test-local.ps1 passed (log tmp_ui_smoke/task6/merge-213-tests.log). Next: commit merge, required pre-push checks and secret scan, normal push; ready #213, wait for ALL CI checks, then merge commit. Then repeat for experience PR #214 and test latest main. Stop on any non-state code conflict or test/CI failure. No unrelated implementation changes. Earlier external-agent verification improvements remain backlog.

</details>

- Authorized flaky-test check: ten isolated runs all passed (10/10). Full gate retry pending. Manual conflict-resolution edits are limited to progress.md and session-handoff.md; original handoff records retained above rather than adding archive files.

- Authorized #214 gate passed: repeated flaky case 10/10; full scripts/test-local.ps1 795 passed/2 skipped, all Node suites, Python180/JS204 syntax and secrets762 passed. No runtime changes for this merge; submit merge and require CI before #214 merge. Connection rejection/body-drain repair is authorized only on a new branch after #214.


## 2026-10-25 — API rejection body drain

#214 merged as b9d9354 after all Linux/Windows CI passed. New branch codex/fix-api-reject-drain-body starts from that main. Added bounded drain before origin/token rejection; 1 MiB maximum, two-second deadline and fail-closed framing checks. No private settings or authorization changes.

Verification Evidence: targeted pytest tests/test_request_body_drain.py tests/test_api_health.py: 38 passed. Includes 30 large unauthorized POSTs, 30 disallowed-origin POSTs, missing configured token, byte limit, invalid length, duplicate/chunked framing, truncation and timeout coverage. Full gate pending.

Verification Evidence: full scripts/test-local.ps1 passed (809 Python passed, 2 skipped; Node suites, Python/JavaScript syntax and secret scan passed). Required config.example.json/package.json parsing and py_compile passed. Ignored log: tmp_ui_smoke/task6/drain-body-full-tests.log. Next: push scoped fix, open PR and require all CI before merge; rerun full gate on final main. Remaining risk: invalid, oversized or stalled clients are closed rather than guaranteed a complete rejection response.


## 2026-10-25 — VRM basic renderer

Based on fetched origin/main 5b20358; local main divergence preserved. Added restricted read-only avatar API, pinned local three.js/three-vrm vendor, independent intent renderer/runtime, attribution UI and synthetic tests. Private model remains outside repo, screenshots only in ignored tmp_ui_smoke/avatar-vrm.

Verification Evidence: Node fake VRM mapping/actions/fallback passed; Python path/meta tests 13 passed, 1 symlink privilege skip, including real Windows junction rejection. Isolated Electron 39.8.10 VRM0 render/alpha/actions/amplitude/metadata verified, Hiyori regression rendered. Performance and limitations in docs/avatar-vrm-basic.md. Full gate and packaging checks pending. No dialogue/memory/external-agent changes; no private configuration accessed. Draft PR only.

Final Verification Evidence: scripts/test-local.ps1 passed: 825 passed/3 skipped, all Node suites, Python/JS syntax, secret scan. scripts/check_first_run_package.ps1 passed, including preview defaults and source package smoke. JSON/py_compile pre-push checks passed. Final test logs and all model captures only in ignored tmp_ui_smoke/avatar-vrm. Next: draft PR and user Windows review; no merge authorization.


## 2026-10-25 — VRM performance and deterministic motion

Diagnosed real full/pet Electron windows before editing. Pet full-mesh hit testing averaged 101.75ms, consuming almost the entire renderer thread; replaced with projected bone capsules (~0.012ms). Added 900k pixel budget, 20/30 FPS cadence, inactive suspension and runtime cleanup. Added 72-degree standing arms, deterministic seeded idle/speech/small motions, action recovery, height-based framing and key/fill lighting. No model/private config/dialogue/memory/external-execution changes.

Verification Evidence: actual full-window idle GPU 15.99% to 6.97%; pet idle 6.27 to 20.20 FPS and simulated speech 6.46 to 29.97 FPS. Memory essentially unchanged; pet GPU increased with restored frame rate. Read-only texture inspection: 36, max 2048x2048, no resizing needed. Full report docs/avatar-vrm-performance.md. Private before/after/speaking/small-motion captures only in ignored tmp_ui_smoke/avatar-vrm-polish. First full gate passed 825/3; runtime lifecycle test subsequently registered in Node runner, final gate pending. PR #216 must remain draft; user visual review next.

Final follow-up verification: scripts/test-local.ps1 passed (825 passed, 3 skipped; registered runtime lifecycle suite and all Node tests passed, syntax/secrets passed). Required JSON/py_compile checks passed. Evidence: ignored tmp_ui_smoke/avatar-vrm-polish/full-tests-final.log. GitHub API connection failed five attempts, with 10-second retry intervals; stopped network operations. Changes committed locally; push/PR description update remains pending. Do not mark PR ready or merge. Resume with normal push of codex/avatar-vrm-basic and verify #216 is still draft.


## 2026-10-25 — VRM edges and detached pet presentation

Smoothed VRM cutout/outline edges using MSAA, explicit premultiplied transparent output and DPR >=1; retained authored MToon outline/color. Reduced key/ambient lights. Located missed decorations in index.html/kawaii-stage-decor: full/chat already hide them, model did not. visualPolish.css now hides the same layer in both VRM/Hiyori pet views, positions the Chinese status label at bottom-left, and fades it three seconds after readiness. Model files and private configs untouched; model SHA-256 unchanged.

Verification Evidence: real Electron at 1708x1068, idle 20.16 -> 19.93 FPS, GPU 2.97% -> 0.86%, including removed animation/compositor cost. Both VRM and Hiyori real windows: decoration display none, label 馨语, left 12px, ready opacity 1 -> 0 after 3.6s. Local-only before/after edge+lighting captures and measurements in ignored tmp_ui_smoke/avatar-vrm-polish. Full report docs/avatar-vrm-performance.md. First full test run exposed missing document.body in the old fake Live2D test; fixture corrected and readiness assertion added. Final scripts/test-local.ps1 passed: 825 passed/3 skipped, all Node, syntax, secret scan; required JSON/py_compile passed. PR #216 verified open/draft; normal push authorized, no merge.


## 2026-10-25 — VRM room integration and relaxed stance

Added separate room/transparent-pet light presets, room-only shader brightness/saturation grading, 15-degree body turn with head return and asymmetric relaxed posture/fingers, idle smile/deterministic saccades/reply preparation, and elevated 27-degree framing. New tuning in vrmRenderer.js constants. avatarRuntime reads existing reply timestamps and uses its existing channel; no dialogue/voice/history changes. Audited the user-selected stored record: role=user matches the rendered label; source provenance is unavailable, so no speculative history migration or role fix performed. Private content not copied into tracked artifacts.

Verification Evidence: final scripts/test-local.ps1 passed (825 Python passed, 3 skipped; all Node, syntax and secret checks passed). New tests cover framing projection, finger/pose recovery, material isolation, smile/saccades and one-shot reply preparation broadcast. Real Electron VRM0 full before/after and neutral-pet captures inspected in ignored tmp_ui_smoke/avatar-vrm-polish/room-*.png. Baseline renderer served from 321fc17 only by test interception. Model hash unchanged. Required JSON/py_compile checks passed. No new real VRM1 or live LLM/TTS acceptance claimed. PR #216 remains draft for user review.


## 2026-10-25 — PR #216 accepted, merge preparation

User passed visual review and explicitly authorized --merge --admin after required gates, superseding draft-only restriction. Fetched origin successfully on fourth attempt after TLS errors. Latest origin/main 5b20358 already contained in avatar branch; git merge reported up-to-date, no conflicts. Verification Evidence: scripts/test-local.ps1 passed (825 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed. Logs in ignored tmp_ui_smoke/avatar-vrm-polish/merge-local-tests.log and merge-package-check.log. Acceptance-only state update; no runtime changes. Next: ready PR, all current-head Linux/Windows CI green, merge commit, then final exact origin/main gate. Preserve unrelated local main commit 0a06554; no reset or private config modification.


## 2026-10-25 — Procedural VRM room v1

Fetched origin/main and verified PR #216 merge a08e0c4 ancestor; created codex/avatar-3d-room-v1. User explicitly asked to preserve local main/0a06554; remote architecture branch is exactly that commit, no edits. Added independent seeded room data/build/disposal, five instanced Toon batches, generated sky/ramp/contact shadow, bounded room/none API field, existing stageRoom day/night transition. Full VRM hides painted stage only with room active; transparent pet and Hiyori retain old paths. No dialogue/memory/external execution/Live2D renderer/private model/config changes.

Verification Evidence: Node deterministic layout/bounds/day-night/no-request checks, real Three no-WebGL ten-cycle resource disposal and fake renderer gating. Actual Electron VRM0: 20.00 -> 19.97 FPS, CPU 4.45 -> 3.85%, GPU 4.93 -> 4.92%, draw calls 28 -> 34. Ten room/none cycles return geometry/textures to 20/45, no sustained post-GC JS heap growth. Six requested captures plus baseline saved only in ignored tmp_ui_smoke/avatar-vrm-polish; Hiyori stays live2d with original background. Report docs/avatar-3d-room.md. Initial full gate 829 passed/3 skipped, Node/syntax/secrets passed; first-run package passed. Final gate after shared-material restoration test passed: 829 passed/3 skipped, all Node/syntax/secrets. Required JSON/py_compile pre-push checks passed. Draft PR only; user Windows appearance review next.


## 2026-10-25 — Room metre scale, depth and daylight

User reviewed #218 and requested physical proportions/composition. Removed avatar-height scaling, explicit furniture dimensions in metres, wall 3m behind avatar and side furnishings 2–2.65m behind. Added clean head backdrop, square wall joins/ceiling/skirting, partial distant pink crowns, moon/star sizes/clouds, brighter warm daytime with non-shadow-mapped sun patch. No private/model/Live2D/dialogue/memory/external execution changes.

Verification Evidence: scripts/test-local.ps1 passed 829/3, all Node/syntax/secrets; dimensions/book range/backdrop/depth/unscaled-height tests added and ten-cycle disposal passes. Actual full and pulled-back Electron VRM0 night/day captures inspected, only in ignored tmp_ui_smoke/avatar-vrm-polish/metres-*.png. Full idle 19.98 FPS, CPU 4.21%, GPU 5.19%, 38 draw calls, within 1.5x original GPU budget. Required pre-push JSON/py_compile passed. Dimensions and limitations docs/avatar-3d-room.md. Draft #218 only, user appearance acceptance next.


## 2026-10-25 — PR #218 visual acceptance and merge preparation

User passed visual acceptance and explicitly authorized merge commit (--merge --admin) after local/package gates and all Linux/Windows CI pass. Fetched origin; latest origin/main already contained, no merge conflicts. Local main and private config remain untouched.

### Follow-up backlog (explicitly deferred, not fixed in this merge)

- 房间偏空：后续考虑增加书桌、床、墙面装饰。
- 夜晚人物脸部补光。
- 将落地灯从窗前移到窗户一侧。

Verification Evidence: fresh scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed. Required JSON/py_compile checks passed. Logs ignored under tmp_ui_smoke/avatar-vrm-polish/merge218-*.log. After CI, merge PR #218 then test exact latest origin/main in detached HEAD, preserving local main.


## 2026-10-25 — Room life v1

Created codex/avatar-room-life-v1 from origin/main 2356ddb (merged #218), preserving local main 0a06554.
Verified local KayKit Furniture Bits 1.0 FREE original CC0 1.0 license; selected 10 glTF + matching bin + shared atlas + license only.
Added metre-scale toon-batched furniture with allowlisted local loading/procedural fallback, desk/chair/sofa/decor; four-layer shelves avoid oversized books.
Added deterministic 60–180s day/night-weighted activities, radius-inflated visibility-graph paths, walk/sit/hand contacts/book prop, smooth camera follow,
input/send/hearing/busy interruption and 20–40s resume. Avatar-only integration; no dialogue, memory, external execution, Live2D or private-config edits.

Verification Evidence: final scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node/syntax/secrets).
New Node checks: all-pairs paths, free activity points, determinism, interruption/resume, smooth standing, local dependency allowlist,
failed/cancelled loads, merged toon assets and resource cleanup; runtime signals/listener disposal covered.
scripts/check_first_run_package.ps1 passed, verifies all selected furniture and license bytes in the install source package.
Required pre-push JSON/py_compile checks passed. Actual Electron VRM0 four activities, walking, input interruption, day/night wide captures:
ignored tmp_ui_smoke/avatar-vrm-polish/life-*.png; 35s silent life-tour.mp4, test-only accelerated activity selection.
No page exceptions. Ten room toggles stable at 28 geometries / 47 textures. Idle baseline→new: FPS 19.99→19.98,
CPU 3.28→3.32%, GPU 5.32→5.04%, draws 38→36, working set 959→970 MiB. Evidence/report docs/avatar-room-life.md.
Limitations: real VRM1 and live ASR/LLM/TTS not exercised; procedural poses lack foot IK/full-body collisions, unusual outfits/heights may need tuning;
no installer exe built. Existing night face-fill follow-up remains deferred. Only draft PR, user appearance review next; do not merge.

Published implementation 0c34e34 on codex/avatar-room-life-v1; draft PR #219 targets main. Final package recheck passed. Private config hash unchanged. Waiting for user visual review; no merge.

## 2026-10-25 — PR #219 seated contact and camera revision

Measured sofa/chair surfaces (0.310/0.342m), measured leg lengths and constrained hip/ankle contacts replace the old height-only seating. Lap hands and desk elbow/chin support, 1.8s activity cameras, bounded back-facing glances and runtime purple furniture tint added. Procedural fallback seats match the same surfaces; source assets unchanged.
Verification Evidence: final scripts/test-local.ps1 passed: 829 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed. New synthetic VRM0/1 short/long-leg tests preserve bone lengths and seat/floor contacts; real Electron VRM0 contacts <1mm, desk elbow 0.7645m vs 0.765m target. No page exceptions; ten room toggles stable. Sofa/desk front and side, four activity views and 35s silent seated-tour.mp4 are ignored under tmp_ui_smoke/avatar-vrm-polish. Capture-only active-surface override avoids existing background pause.
Limitations: no real VRM1 model acceptance or arbitrary outfit collision guarantee; extreme unreachable desk proportions are reported. Updated draft #219 awaits user visual review; no merge. Local main and private config/model untouched.

## 2026-10-26 — PR #219 visual acceptance and merge gate

User accepted the visuals and authorized merge commit after local/package and Linux/Windows CI gates. Fetched origin/main 2356ddb; already contained by this branch, no merge conflicts. Local main remains 0a06554; private config unchanged.

Deferred TODO (explicitly not fixed this round):
- 书桌前平放在桌上的那只手太僵。
- 窗边伸手时手部悬空。

Verification Evidence: scripts/test-local.ps1 passed (829 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed); scripts/check_first_run_package.ps1 passed. Required JSON/ten-module compilation, secrets and diff checks passed. Next: push, mark #219 ready, wait for all CI, merge with --merge --admin, and test latest origin/main without moving local main.

## 2026-10-26 — Optional hand-painted room preset

Branch codex/avatar-room-handpainted-v1 from origin/main 0542d04; local main/private config unchanged. Read both room documents and original asset license.txt (CC BY 4.0, OzerGokmen). Added attributed local base-color assets, measured 0.014m/source-unit scale, runtime cutaway/coffee-table removal, preset layout and KayKit chair. Shared room lifecycle, day/night, scheduler, seat solver and camera pipeline; room remains default.
Verification Evidence: targeted Node layout/path/local-only/fallback/async-disposal and synthetic seated-contact tests pass. Final scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed). scripts/check_first_run_package.ps1 passed, including every new asset/license/change-notice hash. Initial package check exposed the global *.bin ignore: added an exact scene.bin exception and rechecked successfully.
Real Electron VRM0: same-camera room/handpainted, day/night panoramas, four activities, forced missing-scene fallback and ten room/none/handpainted cycles; no page exceptions. Stable resources: room 28 geometries/47 textures; handpainted 41/60. Draws 36 vs 42 at companion view, activity views 38–47. No fresh CPU/GPU timing benchmark claimed. Ignored evidence: tmp_ui_smoke/avatar-vrm-polish/handpainted-*.png, handpainted-acceptance.json, handpainted-tour.mp4 (35s silent). Original scene.bin and 15 base-color images hash-identical to download; private config hash unchanged.
Limitations: fixed painted shadows/reflections, visible cutaway boundaries, inherited stiff/airborne hand contacts, no arbitrary outfit collisions or real VRM1 visual check. Default room unchanged. Await user visual review via draft PR only; no merge.

## 2026-10-26 — Painted backdrop implementation

User authorized b22d4ef (PR #220) prerequisite. Fast-forwarded only this committed head; other thread motion/camera changes excluded. Work exclusively in ai_desktop_pet_painted with copied dependencies. Draft PR must target main and begin with dependency notice. Merge origin/main after #220 only; stop on conflicts outside three state files.

Verification Evidence: final scripts/test-local.ps1 passed: 841 passed, 3 skipped; all Node suites, Python/JS syntax and secrets passed. scripts/check_first_run_package.ps1 passed again with explicit painted code/placeholder presence and placeholder hash. Initial 19 unrelated test failures came from disposable work/home paths inside the checkout; fixed only two test fixtures by giving them a sibling synthetic protected-project, preserving security assertions and product policy.
Actual isolated Electron VRM0 on loopback 8137 with a separate ignored test-config.json, no config.local.json/LLM: night/dusk/day, metre grid, 1920x1080/1280x800/480x800, 30.000s MP4, setting-driven reflection disposal and room/handpainted/none/pet regression. No page errors. Captures/video/config/logs remain ignored in tmp_ui_smoke/painted. All supplied PNGs currently 2560x1440; no source asset/model copied into tracked paths.
Lifecycle: ten initial scene cycles and further four batches of ten. GPU counts stable at 25 geometries / 48 textures; four major-GC heap samples 7197120, 6709132, 6818676, 6967892 bytes (6.40–6.86 MiB), final below first. Short-run evidence only, not an absolute long-term leak guarantee. Reflection off releases its target.
Shared integration files: avatar_assets.py, app_get_routes.py, web/avatar/vrmRenderer.js, web/avatar/avatarRuntime.js, web/avatar/vrmWorld.js, web/index.html, web/stage.css. Camera-follow block unchanged; dedicated paintedCamera object. Full 21-file list and calibration limitations in docs/avatar-room-painted.md. No dialogue/memory/external-execution product code or Live2D renderer modified.
Remote fetch recovered; #220 is OPEN at b22d4ef, origin/main remains 0542d04. Draft PR to main must start with dependency notice. After #220 merges, merge origin/main only if conflicts limited to three state files; never auto-merge this PR.

## 2026-10-26 — PR #221 integration polish

User accepted perspective/scale/crop; requested stronger contact/reflection, directional period lighting, avatar-only softness/glow/grading and before/after/detail captures. Same branch/worktree; do not alter camera calibration. Baseline 7aeb26b; #220 still open.
Implementation: stronger two-foot contact cores and directional soft shadows; reflection opacity night/dusk/day 0.20/0.24/0.19, softened and floor-tinted with downward fade. Corrected window/lamp screen directions, period grading, 0.75 CSS px avatar-only softness and faint halo. Accepted fixed camera/crop unchanged. Only shared code change this revision is vrmRenderer.js painted render dispatch; avatarRuntime and camera-follow untouched.
Verification Evidence: scripts/test-local.ps1 passed (841 Python passed, 3 skipped; all Node, syntax and secrets checks). Actual isolated Electron VRM0: same-pose 1920x1080 before/after for all periods and 3x feet/edge crops, final shader/page errors empty. Outer background columns 0:700 unchanged pixel-for-pixel in all periods. Twenty additional scene cycles: stable 26 geometries / 49 textures; two major-GC samples 6677384 and 6835904 bytes. Settings disable releases reflection target; room/handpainted/none/pet smoke passed. Actual painted frame has 50 draws across reflection/avatar/composite passes (16+28+6), not only the final pass count of 6.
Evidence remains ignored under tmp_ui_smoke/painted-polish (after-final-*.png, before-*.png, acceptance.json, test-local.log). Extra full-resolution MSAA avatar buffer increases GPU memory/render cost; no hardware-wide performance or long-run leak guarantee. No private assets/config committed. PR #221 remains draft pending visual review; prerequisite #220 merge condition unchanged.
## 2026-10-26 — Camera/motion task started, network pause

User authorized inclusion of unmerged #220 into new codex/avatar-motion-camera-v1 branch; origin/main 0542d04 -> b22d4ef, local main unchanged. Both baseline 35s silent recordings captured in ignored tmp_ui_smoke/avatar-vrm-polish/motion-before-{room,handpainted}.mp4. Camera diagnosis: animated avatarRoot and seat corrections feed frame-by-frame camera targets after the old transition completes. Partial root-only damped/dead-zone/activity-lock camera added; not yet acceptance-tested.
Verification Evidence: node --check for camera and renderer, git diff --check passed. Full tests not run. CMU official terms allow commercial-product inclusion but prohibit direct data resale; BVH converter adds no restrictions. Download of local-only walk evaluation failed with connection resets after five attempts 10s apart. Paused under network rule; no motion changes, full gate, after evidence, commit, push or PR.

## 2026-10-26 — Camera stability and procedural motion

User explicitly deferred CMU 2a after failed download; no data evaluated or integrated. Retained user-authorized #220 dependency in codex/avatar-motion-camera-v1, local main/private config unchanged. Camera now consumes logical horizontal root and immutable stature/seat measurements, with analytical critical damping, dead zone and activity lock. Added collision-checked corner arcs/curvature braking, acceleration, layered turns, 700ms eased transitions, seeded variation, distance-based gait and measured planted-foot IK. Real departure testing exposed sideways predicted landings during the initial turn; fixed by using neutral hip width, finishing the initial turn before stepping and predicting along the travel heading. Release knee clearance with the foot constraint while stopping.

Verification Evidence: scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node, syntax and secrets); final rerun after last clearance tuning also passed, same gate log. Package smoke passed including local scene assets/licenses. New tests cover dead zone/activity lock, fixed and moving 20/30Hz results, all-pairs safe curved paths and direction-rate bound, pose/bone continuity, seeded traces, VRM0/1 long/short-leg foot planting and neutral-width regression. Simulated camera max jitter 6.608mm -> 0mm (limit 0.1mm); path max 1.517rad/s < 2.2. Private config hash unchanged.

Real Electron VRM0: both presets, same fixed 30Hz timeline (rest, desk, window, input interruption), four 45s silent before/after videos at 10fps. Replaced uneven wall-clock screenshot capture with native capturePage; these are controlled-render comparisons, not performance measurements. No page exceptions; steady seated camera adjacent 1s sample delta room 6.073mm -> 0, handpainted 6.008mm -> 0. Both after clips have 14 walking samples with reach error zero. Ignored evidence tmp_ui_smoke/avatar-vrm-polish/motion-{before,after}-{room,handpainted}.mp4 and JPG/JSON samples. No media/model in Git.

Limits: real VRM1 not visually verified; procedural gait/full-body clothing collision and inherited hand contacts remain limited. See docs/avatar-motion-camera.md for exact scope, failed CMU URL and local future task. Next: draft PR to main, wait for user; no merge.

Publication result: implementation cbdf497 committed locally. git push -u origin codex/avatar-motion-camera-v1 failed all five attempts (10s spacing): two TLS handshake failures, three port-443 timeouts. No draft PR created and no further retries. Code/tests/captures complete; handoff records the exact user push command and next draft-PR step. Local main remains 0a06554; private config hash unchanged. No force push/main push/merge.

Publication resumed: user confirmed successful push. Verified remote branch and PR head daa5971; created draft PR #222 to main via local gh after connector creation permission 403. https://github.com/MaQinglin-665/AI-chat/pull/222 . Attached to the task. State changed from publish_blocked to awaiting_visual_review; prior implementation/test evidence unchanged. No merge, main push, private-config edit or media upload. Await user appearance review.

## 2026-10-26 — Accepted #220 / #222 sequential merge

User accepted #222 and authorized merge commits in order, without modifying local main/private config. #220 already contained latest origin/main 0542d04; no conflicts. Verification Evidence: fresh scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed; gh pr checks 220 all green including Python Tests and Windows Compatibility. Marked ready, merged with --merge --admin: a0bdce4fcb8d85dd784438a88b96736c705a1bda.

Fetched and merged origin/main containing #220 into codex/avatar-motion-camera-v1; no conflicts. Now validating #222 with both local gates, then normal push/ready/all CI/merge commit, then full local test on latest origin/main with detached HEAD. Local main remains 0a06554. No product-code changes this task.

Deferred TODO, explicitly not fixed this task:
- 镜头切换时画面卡顿。
- 动作仍偏机械。

#222 local Verification Evidence: scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed; required JSON/compilation and diff checks passed. Only the three state files changed after the conflict-free merge. Proceed to normal push, ready, all CI and merge gate.

Merge publication blocked: #222 push failed all five attempts, with 10s spacing (TLS handshake failures and port-443 timeouts). Local merge a05c690 and gate record 44b3a01 retained; no conflicts. #222 was not marked ready or merged; final latest-origin/main test is pending its merge. #220 merge a0bdce4 is complete. User push command: git -C D:/AI/ai_desktop_pet_readiness_20261023 push origin codex/avatar-motion-camera-v1 . After success resume ready/check all CI/merge #222, then detached origin/main final test. No further network attempts.


## 2026-10-26 — Avatar brain phase 1 started

User explicitly authorizes backend dialogue integration; phase 2 deferred until #217. Branch from ee3de6e, local main/private config unchanged. Scope: bounded world state, action whitelist, same-call reply actions, proactive frequency limits, confirmed existing memory, fake-model tests and console-only debug entry. No avatarRuntime/vrmRenderer edits. Git fetch succeeded with command-local system proxy; global configuration unchanged.


## 2026-10-26 — Avatar brain phase 1 verification

Implemented authenticated bounded world/think/poll/ACK routes, closed 3D action schema, same-call reply suffix filtering, environment-key-only proactive calls, timer/event triggers with interval/hour/day limits, stale/inflight/input/scene/period cancellation, and explicit confirmation in the existing memory store. Debugger only sends/logs; never executes or ACKs. Original random activity/rendering unchanged. Two protected renderer files untouched; local main remains 0a06554; private config hash matches prior baseline.

Verification Evidence: final scripts/test-local.ps1 passed (865 passed, 3 skipped, 1 warning; all Node, Python/JS syntax and secret scan passed); final scripts/check_first_run_package.ps1 passed, including new module/debugger package presence. Added 35 fake-model Python cases including real local authenticated HTTP, provider/runtime/reply routing and temporary-file memory roundtrip; Node debugger opt-in/no-execution check passed. Required JSON/ten-module compile and diff checks passed. Logs ignored under tmp_ui_smoke/avatar-vrm-polish/brain-phase1-{final,package}.log.

No real DeepSeek/TTS/ASR/renderer execution or 10-minute video; these are phase 2 after #217. Offline prompt 2429 chars/world302, estimated 700–1000 input +100–250 output tokens (cap480), daily default0–24 calls/~$0.0079–0.0144 at official peak uncached Flash rates. Not measured billing. Process-local limits reset on backend restart; receipts trust the authenticated local client; no frontend delivery/executor yet. See docs/avatar-brain-actions.md. Publish feature branch as draft only; no merge/main push.
## 2026-10-26 — PR #221 accepted integration

User accepted visuals and authorized merge after local/package/CI checks. Integrating origin/main ee3de6e (#220/#222 merged). User explicitly approved the sole non-state conflict: retain walking and painted metrics in vrmRenderer.js; camera algorithm unchanged.

待办（另开任务）：
- 高清背景到位后拉近陪伴视角，让人物更大。
- 加强黄昏时的逆光轮廓。

Verification Evidence: camera/motion/locomotion/painted targeted Node tests pass. Full test-local passed (841 passed, 3 skipped; all Node/syntax/secrets), with PYTEST_ADDOPTS=--ignore=tmp_ui_smoke to avoid collecting old ignored test fixtures. First-run package smoke passed. Merged real VRM0 night capture: natural lowered-arm idle, fixed painted camera across 12s sampled updates; no page/shader errors. Evidence tmp_ui_smoke/painted-polish/merged-night.png and merged.json. No camera algorithm edits.

CI repair: Node painted test duplicated pytest invocation, but Linux Node job intentionally has no pytest dependency. Removed only that nested invocation; unchanged test_avatar_backdrops.py remains in Python/Windows/full gates. Targeted Node and Python backdrop suites rechecked.

## 2026-10-26 — Backdrop assets v2 replacing #223

User rejected original 29MB PNG history for main. Fresh branch codex/backdrop-assets-v2 from origin/main 79ee80f; copied v1 text/code changes with git restore (no cherry-pick/ancestry), only quality-90 WebP assets to be committed. Original #223 branch unchanged, no force push. PNG files stay in local-assets and ignored visual evidence. Add CSS-only period grading and contact shadow using existing layout output; default-off bedroom switch remains inside model/voice control center, never stage. User authorized replacement PR comment and closure of #223 after new draft opens.

Verification Evidence: scripts/test-local.ps1 passed (845 passed, 3 skipped; all Node/syntax/secrets); scripts/check_first_run_package.ps1 passed with byte-identical WebP/manifest/source note. Mandatory JSON/Python compile checks before push. Images: night 597636, dusk 572028, day 617396 bytes; total 1787060 bytes versus originals 28976220, quality 90 at unchanged 2560x1440. Same-pose screenshot comparison at 1280x800 and same-position crops showed no noticeable normal-size difference; mean channel absolute differences on 0–255 scale 1.585/1.466/1.537, not lossless.
Isolated real Hiyori + production layout module/control-center markup/CSS on 8138, frozen after animation initialization: three periods before/after, PNG/WebP pairs, control center, narrow; no page errors. Footer inset 3% tracks existing model position/size including canvas CSS scale, resize and movement; disable restores original drop-shadow filter and removes contact shadow; pet excluded. All evidence ignored under tmp_ui_smoke/backdrop-v2. No private config/LLM. Fixture-only, not live-dialogue acceptance.
Scope: WebP resources/manifest/source notice, backend fixed bundled WebP response while preserving local PNG validation, independent backdrop CSS/controller, minimal layout-to-CSS hook, control-center label, tests/package checks/docs/state. No Live2D runtime/render algorithm or VRM camera edits. Remaining: user visual review; generic models may need foot inset tuning, global CSS tint is not directional per-pixel relighting. Original #223 branch untouched.

## 2026-10-26 — #225 color and contact revision

User approved asset size/settings, requested preserved Hiyori colors, stronger sunset warmth and visible soft contact. Replaced hue rotation/sepia/desaturation with brightness/saturation plus alpha-preserving sRGB diagonal matrix; smooth 2600ms interpolation cancels cleanly. Enlarged/deepened shadow with closest-side gradient to avoid a hard oval edge. Private real-Hiyori screenshots and 3x face/clothes/feet crops in tmp_ui_smoke/backdrop-color; no renderer/layout/camera or image asset changes.

Verification Evidence: full scripts/test-local.ps1 passed (845 passed / 3 skipped; all Node/syntax/secrets). New tests assert saturation floor, night brightness range, RGB direction, alpha preservation, intermediate/interrupted tint continuity and timer cleanup. Actual isolated 8138 Hiyori: three period full frames plus 3x face/clothes and feet crops, zero page errors. Visually retained brown hair, cream cardigan and blue ribbon; warm dusk and soft visible contact core reviewed. No image assets or branch ancestry changes; #225 remains draft.

## 2026-10-26 — #224 审核通过，准备合并

按用户授权合入最新 origin/main 79ee80f；仅 feature_list.json、progress.md、session-handoff.md 冲突。两边记录全部保留，功能列表合并为合法 JSON，active_task 保持 avatar-brain-driven-v1。没有代码冲突，也不额外修改从 main 合入的产品代码。本地 main 和私人配置不动。两项本地门禁和最新提交的 Linux/Windows CI 通过后，用 merge commit 合并 #224。

### 第二期必做项（本次只记录，不实现）

- 主动思考的提示词加入最近 3 轮对话的简短摘要（约 300 字以内）和 1～2 条相关记忆，让主动话语接上之前聊的内容。
- 每日调用计数持久化到本地状态文件；该文件不进仓库，重启后不清零。
- 文档明确写明：主动思考只使用环境变量里的 Key；Key 只写在配置文件里时，主动思考不会启用。

合并后停止，必须等待用户通知 #217 已合并，再开始第二期。


Verification Evidence for #224 merge: scripts/test-local.ps1 passed (876 passed, 3 skipped, 1 warning; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/merge224-local.log and merge224-package.log. Three state-file conflicts resolved by retaining both histories and both feature entries; active task stays avatar-brain-driven-v1. No code conflicts or extra product fixes. Next: normal push, ready, all CI, authorized merge commit, then stop awaiting user notice about #217.


## 2026-10-26 — PR217 also synchronized with newly merged #224
- Main advanced to2b67452 during closeout. Retained incoming backend unchanged, both state histories and the new Node debugger test; no brain phase2 implemented. Rerunning complete gate and exact Core6 comparison before normal push.


### 收尾期间新合入 #224 的补检
main 在收尾期间前进到 `2b67452`，已通过 `38f0497` 补入 #217；上游脑控第一期代码原样保留，没有开始第二期。最终完整门禁 **896 Python 通过 / 3 跳过，73 Node 测试文件，语法191/241，秘密扫描843**；首次运行打包检查通过。同 Core6 Node5280/394224/42场景及浏览器1030/167741完整序列再次严格一致，四组PNG哈希及十次重载检查通过。原38.4秒录像仍对应相同 Hiyori 渲染代码（新上游未修改渲染器）。


## 2026-10-26 — Author requests latest PR217 revalidation, later work gated
- Author viewed02–04 and confirms clear improvement. Their visual estimate~0.5s is qualitative, previous controlled1370ms reference/370ms early measurement retained as distinct fixture data. Resent standalone01Hiyori38.4s link in chat; no direct recipient channel, do not claim external delivery.
- Read AGENTS/state; cleanfriend/avatar-live2d-adapter0c08c3d. Explicit mainfetch updated2b67452->1ab5d38 (#227 merged); #225 API stillopen/draft. #217open/ready/unmerged, #226open/ready/unmerged. Reopen closeout: merge latestmain, preserve upstreamVRM/scene behavior, strict tests+allVRM/room/camera/backdrop/full/package then normalpush/allCI; ambiguous conflicts need author decision.
- #226sync/tests/ready and separateMao stage3 only after author merging217. No model/defaultVRM/config/key commits; no selfmerge/main/forcepush. Networkpush failures retry10s/max5.


## Preserved incoming main #227 progress


## 2026-10-26 — Backend context/quota task started

User explicitly authorized these backend-only phase-2 items before #217. New branch codex/avatar-brain-context-v1 from 2b67452. Reuse existing chat history/delivery and memory retrieval, sanitize before prompt; durable local daily/hourly quota with graceful storage fallback. No renderer changes, no private configuration changes, no real model needed.

### 2026-10-26 — avatar-brain-context-v1 Verification Evidence
- Implemented bounded last-three-turn extractive context and up to two local relevant memories; explicit recall query uses existing selector. Confirmed delivery updates context; no extra model call.
- Daily and rolling-hour counters plus cooldown persist atomically in user app data; restart/day rollover/corrupt/unwritable fallback tested. Files and locks ignored; no private content stored.
- Targeted: 67 passed; new suite: 32 passed. Final scripts/test-local.ps1: 908 passed, 3 skipped, 1 audioop deprecation warning; all Node, syntax and secret checks passed. First-run package smoke passed including both new modules. Initial fake Windows user-path fixture triggered secret scan; changed fixture to generic test path and reran full gate successfully.
- Logs (ignored): tmp_ui_smoke/avatar-vrm-polish/brain-context-local.log and brain-context-package.log. Required JSON/compile checks passed. No real API calls or frontend acceptance.
- Risks: conservative filtering drops technical topics; summaries are excerpts, not semantic summaries; restart awaits chat history delivery. Disk fallback only preserves in-process quotas. Env-Key-only behavior documented.
- Local main remains 0a0655464b2fe31ab648f58902af7114a16a2393; private config hash unchanged; renderer files untouched. Push feature branch and draft PR only; no merge, wait for #217 before remaining phase 2.

### 2026-10-26 — PR #227 merge preparation and deferred TODO
- User approved #227 for merge after fresh local/package and Linux/Windows CI gates. Fetched origin/main 2b67452; already contained, no conflicts. Local main and private configuration remain untouched.
- TODO（本次不修）：avatar_brain_context.py 的 PRIVATE 正则过于保守；`[a-z]:`、`\.[a-z]...`、`配置`、`路径` 等模式会误伤日常聊天（如“电脑配置”、英文“note:”），导致摘要为空。以后改为只遮盖命中的片段，或只匹配真正像 Key、路径的格式，并补充误伤用例测试。
- After merge, stop and wait for the user's notice that #217 has merged before frontend phase 2.
- Verification Evidence: fresh scripts/test-local.ps1 passed (908 passed, 3 skipped, 1 warning; all Node/syntax/secrets passed); scripts/check_first_run_package.ps1 passed. Required JSON and compile checks passed. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/merge227-local.log and merge227-package.log. No product code changed. Ready for normal push and CI-gated authorized merge.


### 作者新一轮同步与验收（main #227）
2026-10-26：显式fetch最新main `1ab5d38`（含#221/#224/#227），合并为 `f73125f`。#225截至本轮获取仍open/draft，尚不在main，未提前带入。仅三个状态文件冲突，全部保留双方记录；产品代码无冲突，无需取舍任何VRM/场景行为。

- `test_live2d_avatar_adapter.js` 和 `test_live2d_mapping_sequence.js` 通过：Core6同输入 **5,280帧 / 394,224次完整调用 / 42场景**严格一致。实际Pixi浏览器 **1,030帧 / 167,741次调用**严格一致，四组PNG相同、十次重载清理通过。
- main既有VRM/场景专项9个Node文件全部通过；`test_avatar_assets.py` / `test_avatar_backdrops.py` **32通过/1跳过**。VRM renderer仅含已批准的渲染器时钟归属/清理平移；剔除这几段明确平移后其余源码与main逐字节相同，另外8个VRM房间/镜头/背景模块逐字节相同，未改数值或逻辑。本地证据 `outputs/pr217-main227/vrm-main-parity.json`。
- 完整 `scripts/test-local.ps1`：**928 Python通过 / 3跳过，73 Node文件，语法Python194 / JS241，秘密扫描847**；`scripts/check_first_run_package.ps1`、必需JSON/py_compile通过。环境doctor有一项既有低版本可选CodexCLI提示，外部代理未启用；全部门禁通过，本轮不改外部执行配置。
- 01 Hiyori录像（约38.4秒，无声）已在聊天单独补发，用户明确“我来转发”。不声称作者已收到或观看；它仍是作者合并前必看项。02–04作者已看过，用户确认改进明显。录像/模型/私密配置未提交。

本检查点随后正常push/ready并等待该提交的Linux与Windows全部CI通过，再在PR评论中通知作者；远端结果以GitHub及仓库外ci-final.json为准。任何PR均不自行合并。#226同步及后续Mao分支工作等作者合并#217；官方CC0Sendagaya仅本地，不作为本次默认角色变更。


## 2026-10-27 — PR217 latest-main conflict follow-up
- User reports21727301c0greenCIbutCONFLICTING aftermain1012e13/#225. ReadAGENTS/currentstate, confirmedcleancorrectbranch, fetched1ab5d38->1012e13. Mainaddsbedroomassets/Hiyori backdropcontroller/layout hook/docs/tests/package; no privateconfigread/installedappchanges.
- Reopen217closeout only: merge/preserve mainVRM/scene behavior, stop on ambiguousconflicts, strict+allVRM/backdrop/full/package thennormalpush/allCI/authornotification. #226/Mao remain gated on author merging217. No force/mainpush/selfmerge/model/privateconfig/key commits; networkpush10s/max5.


## Preserved incoming main #225 progress
## 2026-10-26 — #225 accepted merge

User accepted #225 and authorized merge after fresh local/package and all Linux/Windows CI. Integrated origin/main 1ab5d38 (#224/#227); only three state files conflicted, both feature records/log histories preserved. No product code conflict or extra implementation change. After merge preserve ignored screenshots in original readiness tmp_ui_smoke, remove only backdrop worktree if clean, stop on policy rejection and end this task.

Verification Evidence: fresh scripts/test-local.ps1 passed (912 passed, 3 skipped; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed including WebP hashes. Ignored logs: tmp_ui_smoke/backdrop-color/merge225-local.log and merge225-package.log. State conflicts only; no extra product changes. Proceed to push, ready, all CI, authorized merge and evidence/worktree cleanup.


### 2026-10-27 — 消除 #225 合入后产生的最新 main 冲突
上轮27301c0的绿色CI覆盖的是main1ab5d38；随后#225合并为main `1012e13`，旧分支因此再次落后并显示CONFLICTING。已正常merge最新main，合并提交 `82ea405`。仅feature_list.json、progress.md、session-handoff.md冲突；保留Git已自动合并的中间日志和双方结尾/功能条目，active_task明确指向本轮217。产品代码无冲突，未取舍任何上游背景行为。

- 最新main祖先检查返回**0**。Core6严格适配/映射测试：**5280帧/394224完整调用/42场景**逐项相同；真实Pixi浏览器**1030帧/167741调用**及四组PNG相同，10次重载清理通过。
- main新增Hiyori背景与VRM/房间/镜头/绘景专项**10个Node文件**通过；资源/背景Python**36通过/1跳过**。默认关闭、三时段、异步取消/释放、透明桌宠与VRM隔离、阴影坐标、颜色过渡均沿用main测试。
- main卧室controller/CSS/API/WebP/manifest/README共8个文件逐字节相同，layout里的原函数及3个调用点完整保留；8个VRM场景模块逐字节相同，VRM renderer剔除已批准时钟归属平移后逐字节相同。证据在仓库外outputs/pr217-main225/。
- 完整scripts/test-local.ps1：**932Python通过/3跳过，74Node文件，语法Python194/JS243，秘密扫描853**；scripts/check_first_run_package.ps1、必需JSON/py_compile通过。没有读取私人配置或覆盖本机安装。

本检查点随后正常push/ready，等待新提交全部Linux+WindowsCI，并核对GitHub不再CONFLICTING及远端main未再次前进后通知作者。01已单独交用户转发，作者仍需观看后决定合并；不自行合并。#226和Mao后续仍等作者合并217，Sendagaya仅本地models_local。没有提交模型/录像/私密配置/Key，无force/mainpush；本次WebP是已经合入main的项目背景资源。


## 2026-10-27 — 独立 Mao 验收开始
#217 已由作者合并为 main9d09edc。#226已同步该main并推送8723067，全部10项Linux/Windows CI成功且无冲突，已通知用户实际试听，未自行合并。当前新分支friend/avatar-live2d-mao直接从最新origin/main建立，没有fork，也不包含未合并的226。基础Mao适配已随217进入main，本任务只补实际五元音、8表情、3手势、动作和配置切换验收，修复复现问题；保存本地证据后独立PR。模型/私密配置/媒体/Key不提交，不改对话/记忆/外部执行，不覆盖本机安装。


## 2026-10-27 — 新 main 上的独立 Mao 验收

`friend/avatar-live2d-mao` 直接从作者合入 #217 后的 `origin/main 9d09edc` 建立。此前没有独立 Mao 分支或 fork；基础适配已在 main，本次仅补验收和复现问题修复，不包含未合并的 #226 共享口型改动。

- **发现并修复加载取消结果错误**：`load()` 等待映射期间调用 `dispose()`，原实现返回 `undefined`，而公共 runtime 仅把 `false` 视为加载失败；等待模型资源时取消，也会在资源到达后创建驱动并返回成功。现在在两次映射等待及模型资源等待后检查取消状态，明确返回 `false`；迟到资源只释放一次，不创建驱动。新增三个确定性回归，修复前可复现失败。正常 Pixi tick、pre-Core 更新顺序和参数数值不改。
- **真实模型验收加强**：五元音逐通道断言；无可靠元音/非法元音回退 A、静音五通道清零；8 个官方表情逐条核对实际 Core 调用的参数 ID、Blend 和值，并确认参数存在；3 个手势各取 0/.25/.5/.75/1 五个阶段，检查实际六个臂参数存在、在模型范围内、峰值移动、起落归位，解释/轻抬幅度不同。另验证 `wave` 一次性动作自然到期和 `stopAction` 归位，以及 8 个官方动作实际加载播放。
- **真实配置切换**：明确 `avatar` Mao 与旧 `model_path` Hiyori 连续往返两轮，检查映射/能力正确、旧模型和 Pixi 实例销毁、通道和意图监听各只剩一个。Mao 的 20 个 Blob 在切回 Hiyori 时归零；最后清理后模型、Blob、通道、resize/intent/unload 监听全部归零。配置只在独立测试页内存中构造，未读写私人配置。
- **本地证据**：20 张截图（5 元音、8 表情、3 手势、4 切换）与 `mao-evidence.json` 位于仓库外 `outputs/mao-acceptance/`，已查看画面。隔离测试页使用真实本地官方模型、Pixi/Core；资源预读采用测试页鉴权头，63 次授权请求成功、1 次未授权请求返回 401，零页面脚本异常。该头仅用于独立验收服务器，不能代替应用 API 的鉴权安全测试；后者由已有 Python 回归覆盖。
- **Verification Evidence**：`scripts/test-local.ps1` 全部通过：932 Python / 3 跳过、74 个 Node 文件，Python194 / JS243 语法、853 文件密钥扫描通过；`scripts/check_first_run_package.ps1`、必需 JSON/py_compile 通过。继承 main 的 Hiyori 严格测试随全量门禁通过（5280 帧/394224 调用/42 场景），未修改任何严格对照快照或基线。Python 资源路径、配置优先级测试已随全量执行；初次受限环境定向执行因临时目录权限失败，完整正常权限门禁中通过。

重跑真实模型验收前，须本地有官方 Mao 完整资源和原 Hiyori 示例（`web/models/hiyori_pro_t11/`）。执行 `node scripts/qa_live2d_mao.cjs`，或用 `AVATAR_QA_OUTPUT` 指定仓库外证据目录。模型均由使用者自行取得，不随 PR、测试或截图包分发。截图页保留 Live2D 署名；Mao 手势受模型绑定约束，是小幅摆臂。受控输入验收不代表真实人声元音识别率，也不是 Windows 原生拖拽/穿透/真实语音试听；这些仍由作者在 Windows 上检查，#226 另行试听合并。

修改仅为 `live2dRenderer.js` 取消检查、`test_live2d_mao.js` 回归、`qa_live2d_mao.cjs` 验收断言及本报告/三份状态记录。未改映射、Core、VRM/场景、对话、记忆、外部执行或本机安装；未提交模型、媒体、私密配置或 Key。正常推送独立 PR，由作者审查合并，不自行合并。


## 发布检查点 — PR #228
已正常推送 friend/avatar-live2d-mao 并创建可审查 PR：https://github.com/MaQinglin-665/AI-chat/pull/228 （base main9d09edc）。仅7个预期文件；本地工作区干净，未提交模型/配置/媒体。最终真实QA输出20截图/4切换/63授权/1拒绝/0页面异常，截图包仅本地。Linux/Windows CI 的最终状态以 PR 当前提交检查和仓库外 outputs/mao-acceptance/ci-final.json 为准；需要全部成功且无冲突才报告可实机检查，不自行合并。#226 的8723067已全部CI成功，用户试听待定。


## 2026-10-27 — Live2D 长线任务
阶段0复核main仍9d09edc，#2268723067包含main且10项CI全成功，无冲突，已通知。阶段1在现有#228补纯映射手臂效果、同Core完整写序列严格对照、缺模型回归与有声40s场景录像。随后从228分支建立动作词表分支，先文档Draft PR再实现；最后从其分支建立新模型模板/校验CI独立PR。允许前一PR开出后继续，不自行合并；每PR记录堆叠依赖、共享代码改动、测试/录像/限制并等Linux与WindowsCI。无配置/Key/模型/媒体提交，无VRM/房间/后端brain改动，不读取私人配置。


## 长线阶段1补齐 — 2026-10-27
- 手臂部件选择与摆动从 driver 的专用名字判断迁到 `mao.json` 的 `speechGestureEffects`，driver 只解释通用 parts/partParameters/oscillations。未改数值和调用顺序。
- 冻结 main9d09edc 的 driver/mapping 原字节及 SHA256；同组1440帧完整序列/全部参数与部件快照严格一致：CI协议25850调用，本机真实Core6/Mao181030调用，无容差。CI不下载Mao，本机模型存在才加跑真实模型；两类证据分开报告。旧Hiyori严格基线不变。
- 缺目录、清单、moc3、贴图、表情五种条件回归；前端在本地模型描述失败或资源加载失败时显示 models_local/清单/资源/avatar.path/刷新指引，返回null、保留聊天，不吞VRM错误。共享代码仅live2dRuntimeController的本地Live2D失败提示/短路，未改路由/ws或其他渲染器。
- 40秒/800帧/20fps本机真实Pixi/Core录像：idle/listen/think、五元音（放大口型）、3手势、8表情、真实指针拖拽/松手恢复。带本机SAPI场景/元音音轨；这是受控映射展示，不是原生Windows TTS延迟测量。画面含场景名和Live2D署名；没有模型/媒体进git。
- 全量scripts/test-local.ps1：937Python通过/3跳过，76Node文件，语法194/246，secrets859；首次运行包和必需JSON/py_compile通过。第一次全量发生一次无关external_agent HTTP本机连接中止，未改其代码；完整重跑通过。20截图/4切换/63授权/1拒绝/0页面错误及拖拽移动断言通过。
- 录像已作为原仓库的**草稿验收附件**保存，需作者登录并有仓库写权限查看；不发布产品release。链接：https://github.com/MaQinglin-665/AI-chat/releases/tag/untagged-d2ff791d304d9886571a
- 已知限制：合成频谱/受控元音不能证明真实人声识别率；Mao手势受原模型绑定约束；原生Windows穿透与真实语音仍由作者检查。#226独立且CI已绿，不混入本分支。


## 长线阶段2 — 先行接口 Draft
从阶段1 friend/avatar-live2d-mao9406ea4建立friend/live2d-action-vocab，PR base使用前一分支以便独立审阅，#228先合并后再切换base/syncmain。先提交docs/live2d-action-vocabulary.md的接口/词表/结果/打断/坐标约定并开Draft，随后才实现。此检查点不宣称功能完成。未改VRM/场景/后端brain，后续共享runtime仅增加可选转发/原事件字段，PR单独说明。


## 阶段2实现检查点 — #229
先以2aac49f发布接口文档Draft229，再实现live2dGestures及两模型10词映射。Promise区分completed/interrupted/unsupported/failed，最新支持调用替换、取消/停止/卸载/超时均结束；lookAt支持user/方向/reset/CSS屏幕坐标，参数写入只走原pre-Core。没有手势时严格Hiyori5280/394224、Mao1440/181030保持。共享avatarRuntime仅加可选转发/原事件gesture/look_at字段；无VRM/房间/brain/ws/路由改动。
Verification Evidence：完整937Python/3skip/77Node，语法194/248，secrets862；首次运行包、必需JSON/compile通过，新增原事件转发断言另行通过。真实Hiyori/Mao各10词全部Promise完成，各311帧15.55秒有声录像，Core前每词口型范围至少0.545592/0.502619；截图已看，口型特写位置已校正。录像已上传原仓库草稿附件（非产品发布，作者登录写权限可见），文件Hiyori-vocabulary-final-20261027.mp4、Mao-vocabulary-final-20261027.mp4。模型/媒体/配置/Key未入git。
下一步正常push229并等当前提交Linux/WindowsCI；保留Draft供作者接口审阅，依赖228先合并。然后从当前分支建立独立新模型模板/校验CI PR，仍不自行合并。


## 长线阶段3开始
从已推送的friend/live2d-action-vocab da948e7建立friend/live2d-model-template，base依赖229（229依赖228）。只做接入文档/映射模板/校验脚本/CI及测试，不修改渲染器/VRM/房间/brain。校验明确区分无模型的结构检查与实际moc参数、manifest动作组检查，不下载模型或读取私密配置。前两阶段已发布，CI分别独立核对，作者按序合并。


## 长线阶段3完成检查点 — 模板与CI校验
新增docs/live2d-new-model-guide.md、mappings/template.json、scripts/validate_live2d_mapping.js及错误引用回归；Linux质量门禁、Windows兼容门禁和test-local都运行--all。无运行时/VRM/房间/后端brain/路由/ws改动。
校验1MiB JSON结构/别名/姿态/词表时长与口型所有权；显式模型或本地可用模型时用已有Core读取实际moc参数/部件，并检查清单表达式/动作组/下标/完整资源及路径边界。无本地模型时明确STRUCTURE_ONLY/modelChecked:false，不下载模型、不读取私人配置、不作许可判断。模板只是四词示例，未支持词省略后unsupported。
Verification Evidence：本机真实Hiyori/Mao引用全部通过；模板配真实Hiyori通过；故意不存在的Mao参数与动作组均按预期exit1。错误JSON/参数别名/组/下标/表情/部件/嘴型/路径/缺资源回归通过。完整test-local937Python/3skip/78Node，语法194/250，secrets866；首次运行包/必需JSON/py_compile通过，后增metadata错误断言单独通过。模板无模型只结构通过，明确未作模型检查。参考代码/模型资源/私密配置不新增提交。
阶段1 #2289406ea4、阶段2 #229da948e7当前Linux/WindowsCI均全成功，均未合并；229保留Draft给作者接口审阅。阶段3从229分支独立堆叠PR，按228→229→本PR顺序合并，父分支合并后同步main/调整base。录像复用前两阶段草稿审查附件（本PR无视觉变更），不声称新录制。下一步推送/创建PR/全CI后停下，作者验收合并，不force/mainpush。
