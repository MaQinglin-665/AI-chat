# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added
- Added Turn-taking Director v1 so spontaneous thoughts can queue, defer, or cancel instead of interrupting user/assistant speech.
- Added a Taffy preview experience config and helper script for early testers.
- Added source-test package checks for backend imports and preview config safety.
- Added read-only LLM link diagnostics for first-run `/api/llm_probe` failures.
- Added a model selection guide for user-chosen LLM providers and Taffy preview readiness.
- Added a one-click preview environment preparation entry for early testers.

### Fixed
- Fixed source-test packaging so all tracked root Python backend modules are included.

## [1.4.0-preview] - 2026-05-10

### Added
- Added Character Brain continuity, stage memory callbacks, and public `/braindebug` summaries for AI VTuber-style behavior tuning.
- Added turn-level performance controls for reply shape, spontaneity, question policy, motion, and voice direction.
- Added proactive stage replies, interjection director, thought burst director, and thought burst choreography for short spontaneous character reactions.
- Added v1.4/v1.6 model and dialogue audit scripts for repeatable character-feel checks.

### Changed
- Kept Taffy replies fixed to English for the current character setting.
- Improved anti-generic reply constraints to reduce customer-service phrasing, unwanted follow-up questions, and context drift.
- Improved performance timeline, voice timeline, Live2D action routing, and TTS settle behavior.

### Security
- Desktop observation, screenshots, file reads, shell execution, and tool calls remain disabled by default.
- Public debug surfaces keep raw history, prompts, API keys, private bit guides, and user file paths out of snapshots and reports.

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
