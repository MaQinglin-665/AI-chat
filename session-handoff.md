# Session handoff

## Current task: external agent stage 1 completed

Date: 2026-10-24 (America/Los_Angeles).
Repository: readiness checkout; branch `codex/external-agent-codex-cli-v1`, based on `86a93ca`.
Stage 0 is committed separately as `12fb134` with the user-requested message.
Stage 1 backend is complete and locally validated. Final backend commit follows this record. No push, PR, merge or stage 2.

## Implementation

- Single active task: planning -> awaiting_approval -> executing -> completed/failed/cancelled/expired.
- Independent CLI >=0.164.0, dedicated application-data codex_home, per-run config/catalog, environment Key only, Windows unelevated sandbox and never approval policy.
- Ephemeral read-only schema planning means approved execution uses a new exec with the approved plan. Plan events are optional. item.error is warning; top-level error/turn.failed fails the task. Process/timeout/output failures are separate lifecycle failures.
- Four task endpoints behind existing origin/token checks; disabled by default. Approval TTL, metadata-only events/audit, health and doctor added.
- Cancellation uses taskkill /T /F with Windows kill-on-close job protection. Release the task slot after cleanup.

## Evidence

- Full scripts/test-local.ps1 passed: 764 Python tests; all Node tests; Python/JS syntax and secret scan passed. JSON and ten-module compilation checks passed.
- Real CLI/DeepSeek invalid key -> authentication_failed in 3.02s; no credential in outputs/audit/events/disk.
- Real planning/approval/execution: two synthetic files organized without preapproval writes or content changes; 59.97s total, 24 progress events.
- Cancellation with a fixed synthetic approved plan and real CLI execution: 12 observed processes; zero residuals and directory writes over 10s.
- Details: docs/external-agent-backend-verification.md; usage: docs/external-agent.md; stage 0: docs/external-agent-codex-spike.md.

## Boundaries and next session

STOP after reporting local commits. User must authorize stage 2 before any frontend/voice work. Do not push or open a PR.
Windows unelevated does not provide full read isolation, and approved-command scope remains prompt-based. Only trusted disposable directories should be enabled. Task state is in memory, no restart recovery; other devices/CLI versions require revalidation.
Global CLI remains 0.133.0, intentionally untouched. Real checks use repository-external isolated 0.164.0; no real key or private runtime config was committed.
Doctor warnings: missing private config.json, Node 25 rather than LTS, old global CLI while feature disabled.
Files: external_agent.py; external_agents/; app_external_agent.py and small app routing edits; config/approval/event/health/doctor integration; two test modules and fake CLI; docs/state. No web, voice, memory.py or character_brain.py changes.
Earlier handoff is preserved at docs/archive/2026-10-24-external-agent-stage0-handoff.md.
