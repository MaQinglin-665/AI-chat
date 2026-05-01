# Changelog

All notable changes to this project are documented in this file.

## [1.1.2] - 2026-05-01

### Changed
- Aligned README version metadata with `package.json`.
- Documented development test dependency installation.
- Ignored local TTS/API smoke-test artifacts generated during diagnostics.
- Fixed PowerShell environment variable setup guidance.

### Security
- Local API keys should be stored through environment variables referenced by `api_key_env`, not inline in local config files.

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
