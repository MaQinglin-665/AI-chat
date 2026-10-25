# Session handoff

## Current task — clean dependency validation (2026-10-24)

- Source: codex/developer-readiness-20261023 at 86a93ca; new branch codex/clean-dependency-validation-20261024. User requests a PR to main; no direct main push or merge.
- Fresh Windows 11 x64 / Python 3.12.9 venv and project-local Node 22.23.4; installs, pip check and actual imports pass. Runtime/dev closure constrained to 84 verified versions for this platform only. Node lockfile is unchanged.
- Fixed project-local Node launch, setup JSON BOM, project-venv test selection; bootstrap verifies imports/metadata and uses npm ci while respecting a supplied mirror.
- Final complete local gate passed: 740 Python tests, all Node suites, Python/JS syntax and secret scan. Nine targeted setup regressions pass. Docs publish check and all four Chromium smoke tests passed. Implementation/validation are complete; push this task branch and open its PR to main, then stop without merging. Evidence and platform/manual limits: docs/clean-dependency-validation-20261024.md and progress.md.
- Files touched: requirements.txt, new requirements-win-py312-constraints.txt; scripts/bootstrap-first-run.ps1, apply-preview-experience-config.ps1, test-local.ps1, new start-electron.ps1 and check_python_dependencies.py; start_electron.bat; three setup test modules; README/developer-sharing/handoff/report and state files.
- User subsequently authorized reusing their existing Harness local model connection in ignored configuration. Probe and real first-chat smoke pass. No keys or private data are committed.
- Known remaining frontend blocker: normal mode fails on null syncProactiveSchedulerPolling controller; this is separate from the dependency/install fixes. Next work should address controller loading on its own branch, plus the earlier manual audio/microphone/long-duration acceptance.
- This branch inherits the unmerged readiness/preview.7 work from its requested starting point. PR targets main as requested; its description must disclose the dependency on PR #210. Do not merge automatically.

## Prior release state
Directory: D:/AI/ai_desktop_pet_readiness_20261023.
Branch: codex/developer-readiness-20261023. Main remains unchanged.
Both supplied tasks completed and committed separately: 1ae3b89 timing/transport, be1e9f9 harness merge, cba0fb2 lip-sync bridge.
User subsequently authorized official DeepSeek, feature-branch push, and v1.4.0-preview.7 prerelease. Release commit/push follows this verification record.

## Verification
734 Python tests and all Node suites passed. Syntax, encoding, secrets checks passed. Character gate passed. First-run package smoke and NSIS build passed; release assets verified for hashes, zip integrity, exclusion of private data and official empty-key configuration.
Runtime preflight initially rejected the example model placeholder; an ignored local configuration selects the existing bundled Hiyori sample. Preflight then passed with four environment warnings. Demo advisory passed with three opt-in warnings.
Official DeepSeek synthetic streams: median first delta 2187 ms, 10/36/34 chunks. Key stays in environment; public files contain no key. The new default is deepseek-flash, non-thinking mode.

## Remaining limits
Bluetooth/wired audio, actual minimized Electron playback and gesture feel require human acceptance. No dynamic Qwen emotion instruction enabled. Clean dependency installation not fully verified; installer unsigned. These limitations are in preview.7 notes.
Original D:/AI/ai_desktop_pet remains untouched. Do not merge main or include private config, memories, samples in Git/package.

## Links
- Release notes: docs/release-notes-v1.4.0-preview.7.md
- Audit: docs/readiness-audit-20261023.md
- Setup: docs/developer-sharing.md
- Earlier history: docs/archive/2026-10-23-session-handoff.md
- Workspace move manifest: D:/AI/local-backups/workspace-organize-20261023/move-manifest.json
