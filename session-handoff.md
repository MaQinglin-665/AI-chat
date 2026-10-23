# Session handoff

## Current state
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
