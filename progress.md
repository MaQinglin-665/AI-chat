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
