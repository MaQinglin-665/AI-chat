# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-04-27

### Added
- Memory management endpoints:
  - `GET /api/memory`
  - `GET /api/memory/export`
  - `POST /api/memory/toggle`
  - `POST /api/memory/delete`
  - `POST /api/memory/clear`
  - `POST /api/memory/import`
- Config recovery endpoints:
  - `POST /api/config/recovery/reset`
  - `POST /api/config/recovery/export_logs`
- Support export bundle flow for recent logs (with secret masking) under `support_exports/`.
- New memory visualization/control page: `docs/memory.html`.
- `proactive` config block added to defaults and `config.example.json`.

### Changed
- `config.py` now sanitizes/exposes `proactive` runtime fields and maps legacy `observe` auto-chat settings for backward compatibility.
- `web/chat.js` state now includes proactive control fields (`enabled/level/cooldown/idle/night_reminder`).
- Docs config center now includes entry links to memory page and recovery section.
- README docs navigation and usage notes now include memory page workflow.

## [1.1.1] - 2026-04-26

### Added
- Public health endpoints:
  - `GET /healthz` (public probe)
  - `GET /api/health` (token-protected detailed health)
- Startup self-check warnings for risky/missing runtime settings.
- API regression tests for health/token scenarios.
- Quality scripts:
  - `scripts/check_python_syntax.py`
  - `scripts/check_js_syntax.py`
  - `scripts/check_secrets.py`
- Contributor templates:
  - PR template
  - Issue templates
- Dependabot configuration for pip/npm.

### Changed
- CI now includes quality checks and Windows compatibility checks.
- `config.example.json` no longer uses machine-specific absolute paths.

### Security
- Repository no longer tracks local `tts_ref` audio assets by default.
- Added local-only guidance for TTS reference audio management.

## [1.1.0] - 2026-04-26

### Added
- API token protection path and runtime wiring.
- CI pipeline for Python, Node drag tests, and docs checks.
- Docs site refresh and smoke testing flow.

### Security
- CORS/token hardening defaults for public/release builds.
