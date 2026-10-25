# Session handoff

## 2026-10-24 — External Codex CLI stage 0 (current task)

- FINAL CURRENT STATE: stage 0 completed under user-revised acceptance scope. Plan-update events optional/non-blocking; schema provides plans, commands/files/messages provide progress. Minimum verified integration CLI version 0.164.0; global 0.133.0 unchanged.
- Cancellation passed with two active Python writers under real DeepSeek/Codex: taskkill root /T /F exit 0, 13 observed process identities; 15 seconds of checks found no residual task processes or directory writes. Seven sanitized fixtures / 59 events. Dedicated config preferred_auth_method deleted; real cancellation logs confirm ignored-setting warning absent.
- Event contract: item.error warning; top-level error or turn.failed indicates event-level task failure. Dedicated top-level fault injection not performed. Cancellation is its own lifecycle outcome.
- STOP HERE: no commit/push, no stage 1/2. Report results and wait for new implementation authorization. Earlier blockers below are historical and superseded.

- Current (round 3, supersedes retry blocker below): independent npm install succeeded, absolute-path CLI is 0.164.0; global remains 0.133.0. Dedicated non-temp CODEX_HOME helper warning resolved. Official catalog and environment Key minimum/schema task passed.
- Real read-only deny, workspace inside-write/outside-deny, and persistent read-only session resumed as workspace-write all passed. Resume takes exec --sandbox and -C before the resume subcommand; ephemeral planning is not validated as resumable.
- Stopped at incomplete event coverage: model reported update_plan unavailable and emitted no plan update. Six sanitized fixtures / 55 real events saved, including commands/files/messages/item.error; top-level error and cancellation checks remain pending. Do not equate missing event with proven universal CLI tool absence.
- Additional files: tests/fixtures/codex_exec/*.jsonl. No commit/push or stage 1/2. Await user confirmation before investigating plan-tool availability and continuing; independent install/config and synthetic workspace retained outside repository without saved Key.

- Latest retry: user authorized isolated `@openai/codex@0.164.0` only, non-temporary isolated CODEX_HOME, complete stage 0 including read-only-to-workspace-write resume; stop on any failure, no commit/push.
- Isolated npm installation exited 1 with `ENOTFOUND registry.npmjs.org`. Stopped immediately; no network settings or download source changes, no new Key use/configuration or runtime probes. Global package remains 0.133.0. Version 0.164.0 is only the requested candidate, not a verified minimum. Await user direction before resolving networking and retrying.

- Current branch: `codex/external-agent-codex-cli-v1`, based on verified PR #210 head `86a93ca`; PR #210 remains unmerged. The readiness checkout was clean before switching branches.
- Blocked: installed CLI 0.133.0 cannot parse the official DeepSeek model catalog's `max` reasoning effort. Minimum task exits 1 before inference. Independent temporary CODEX_HOME used; existing Key passed only by environment.
- Requested flags appear in help; runtime functionality, Windows sandbox enforcement, JSONL fixtures and process-tree cancellation are not validated. Stopped at first failed prerequisite per supplied task.
- Files touched: `docs/external-agent-codex-spike.md`, `feature_list.json`, `progress.md`, this handoff. No runtime implementation, commit or push.
- Next: report to user and wait. Resolve CLI compatibility and temporary-home helper warning before rerunning stage 0. Do not start stages 1/2 without explicit user confirmation and passing prerequisites.
- Earlier readiness/release context below is historical; its branch and validation claims do not describe this spike.

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
