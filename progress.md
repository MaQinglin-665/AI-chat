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

## 2026-10-26 — Camera/motion task started, network pause

User authorized inclusion of unmerged #220 into new codex/avatar-motion-camera-v1 branch; origin/main 0542d04 -> b22d4ef, local main unchanged. Both baseline 35s silent recordings captured in ignored tmp_ui_smoke/avatar-vrm-polish/motion-before-{room,handpainted}.mp4. Camera diagnosis: animated avatarRoot and seat corrections feed frame-by-frame camera targets after the old transition completes. Partial root-only damped/dead-zone/activity-lock camera added; not yet acceptance-tested.
Verification Evidence: node --check for camera and renderer, git diff --check passed. Full tests not run. CMU official terms allow commercial-product inclusion but prohibit direct data resale; BVH converter adds no restrictions. Download of local-only walk evaluation failed with connection resets after five attempts 10s apart. Paused under network rule; no motion changes, full gate, after evidence, commit, push or PR.

## 2026-10-26 — Camera stability and procedural motion

User explicitly deferred CMU 2a after failed download; no data evaluated or integrated. Retained user-authorized #220 dependency in codex/avatar-motion-camera-v1, local main/private config unchanged. Camera now consumes logical horizontal root and immutable stature/seat measurements, with analytical critical damping, dead zone and activity lock. Added collision-checked corner arcs/curvature braking, acceleration, layered turns, 700ms eased transitions, seeded variation, distance-based gait and measured planted-foot IK. Real departure testing exposed sideways predicted landings during the initial turn; fixed by using neutral hip width, finishing the initial turn before stepping and predicting along the travel heading. Release knee clearance with the foot constraint while stopping.

Verification Evidence: scripts/test-local.ps1 passed (830 passed, 3 skipped; all Node, syntax and secrets); final rerun after last clearance tuning also passed, same gate log. Package smoke passed including local scene assets/licenses. New tests cover dead zone/activity lock, fixed and moving 20/30Hz results, all-pairs safe curved paths and direction-rate bound, pose/bone continuity, seeded traces, VRM0/1 long/short-leg foot planting and neutral-width regression. Simulated camera max jitter 6.608mm -> 0mm (limit 0.1mm); path max 1.517rad/s < 2.2. Private config hash unchanged.

Real Electron VRM0: both presets, same fixed 30Hz timeline (rest, desk, window, input interruption), four 45s silent before/after videos at 10fps. Replaced uneven wall-clock screenshot capture with native capturePage; these are controlled-render comparisons, not performance measurements. No page exceptions; steady seated camera adjacent 1s sample delta room 6.073mm -> 0, handpainted 6.008mm -> 0. Both after clips have 14 walking samples with reach error zero. Ignored evidence tmp_ui_smoke/avatar-vrm-polish/motion-{before,after}-{room,handpainted}.mp4 and JPG/JSON samples. No media/model in Git.

Limits: real VRM1 not visually verified; procedural gait/full-body clothing collision and inherited hand contacts remain limited. See docs/avatar-motion-camera.md for exact scope, failed CMU URL and local future task. Next: draft PR to main, wait for user; no merge.

Publication result: implementation cbdf497 committed locally. git push -u origin codex/avatar-motion-camera-v1 failed all five attempts (10s spacing): two TLS handshake failures, three port-443 timeouts. No draft PR created and no further retries. Code/tests/captures complete; handoff records the exact user push command and next draft-PR step. Local main remains 0a06554; private config hash unchanged. No force push/main push/merge.
