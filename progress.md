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
