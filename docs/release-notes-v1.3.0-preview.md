# v1.3.0-preview Release Notes

> This is a preview release for early testers and contributors. It is not a finished installer, mature AI VTuber product, or commercial desktop agent.

## Summary

`v1.3.0-preview` focuses on making the Character Runtime safer and more repeatable while improving the first-run source testing path:

- Safer Character Runtime metadata handling and runtime health reporting.
- More explicit Live2D emotion/action mapping documentation.
- Low-interruption proactive behavior gates, still disabled unless configured.
- First-run preflight checks before desktop startup.
- Source test package and local docs helper scripts for contributors.
- Clearer troubleshooting guidance for common startup and packaging issues.
- Safer GPT-SoVITS demo playback with peak limiting for hot generated audio.

## What Changed

### Character Runtime

- Added a focused v1.3 quality gate script:
  - `python scripts/check_character_runtime_v1_3.py`
- Added frontend runtime metadata checks:
  - `tests/test_character_runtime_frontend.js`
- Hardened runtime metadata normalization on the frontend.
- Added safe `/api/health` runtime summary fields without exposing private config or secrets.
- Kept the public `/healthz` endpoint minimal.
- Improved speech animation cleanup so successful TTS completion can release mouth/motion state gracefully.
- Documented Live2D emotion/action mapping expectations:
  - `docs/character-runtime-live2d-mapping.md`
- Added release/regression validation template:
  - `docs/character-runtime-validation-log.md`

### Proactive Behavior Safety

- Proactive behavior remains optional and gated.
- Added explicit safety notes:
  - `docs/character-runtime-proactive-safety.md`
- Preserved low-interruption rules such as:
  - explicit enable flag
  - recent user/assistant activity checks
  - cooldown checks
  - safe block reasons for skipped proactive turns

### First-Run Setup

- Added a read-only first-run preflight:
  - `python scripts/first_run_check.py`
- Updated `start_electron.bat` to run preflight before starting the desktop app.
- Added helper scripts:
  - `scripts/doctor.ps1`
  - `scripts/setup-dev.ps1`
  - `scripts/test-local.ps1`
- Added first-run notes:
  - `README-FIRST-RUN.txt`
- Improved setup and troubleshooting docs:
  - `docs/setup.md`
  - `docs/troubleshooting.md`
  - `CONTRIBUTING.md`

### Voice and TTS Stability

- Kept GPT-SoVITS as an advanced optional TTS path, not the first-run default.
- Added GPT-SoVITS loudness protection for hot generated WAV output:
  - `gpt_sovits_max_rms` now defaults to `5000`
  - generated peaks above the safe peak limit are reduced even when RMS is otherwise acceptable
- Added regression coverage for low-RMS audio with high transient peaks.
- Local manual listening on 2026-05-03 confirmed the current balance avoids the earlier "far away" voice while reducing the electric-noise artifact observed with hotter output.

### Source Package / Docs Tooling

- Added source test package helper:
  - `scripts/package-source-test.ps1`
- Added local docs helper:
  - `scripts/start-docs.ps1`
- Added npm docs scripts.
- Added manual-only GitHub Pages workflow:
  - `.github/workflows/pages.yml`

The Pages workflow is intentionally manual-only. It should not auto-deploy on every push until the project is ready for that publishing behavior.

## Verified Before Drafting

Automated validation on 2026-05-03:

```text
python scripts\check_character_runtime_v1_3.py
```

Result:

- `208 passed`
- frontend runtime metadata checks passed
- frontend API/chat/speech/TTS API checks passed
- Python syntax check passed
- JavaScript syntax check passed
- secret scan passed

First-run preflight:

```text
python scripts\first_run_check.py
```

Result:

- passed with 4 expected local demo warnings
- Node.js 20 or 22 LTS is recommended for Electron projects
- GPT-SoVITS requires its service to be running when selected
- demo/local runtime settings should not be treated as release defaults
- an already-running healthy backend may hold the configured local port during validation

## First-Run Notes

This preview still does not provide a finished Windows installer. For early source-based testing, use either:

- the repository `main` branch after this release is tagged
- the attached source test package if provided:

```text
Taffy-AI-Desktop-Pet-v*-windows-source-test.zip
```

The source test package still requires Python and Node.js on the target machine. It is intended to make early testing clearer, not to behave like a consumer installer.

Recommended first-run path:

1. Read `README-FIRST-RUN.txt`.
2. Run:
   - `powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1`
3. Install dependencies:
   - `powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1`
4. Run local validation:
   - `powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1`
5. Configure Live2D and LLM settings.
6. Run:
   - `python scripts\first_run_check.py`
7. Start:
   - `.\start_electron.bat`

## Security Defaults

The preview keeps conservative defaults:

- desktop observation should remain manual
- automatic chat from desktop observation should remain disabled
- tool calling should remain disabled unless explicitly configured
- shell execution should remain disabled
- API keys should be stored in environment variables or local ignored config
- logs and release material should not include secrets or private endpoints

Do not publish demo configs that enable desktop observation, tool calling, shell access, or proactive behavior as if they were safe defaults.

## Known Limitations

- This is still a source-based preview, not a packaged installer.
- First-run setup still requires local Python, Node.js, a Live2D model, and an LLM provider.
- LLM behavior depends on the configured provider, model name, quota, and network/channel health.
- GPT-SoVITS is an advanced optional TTS path and requires a separate working service.
- Character Runtime metadata improves emotion/action routing, but it is not yet a complete AI VTuber behavior engine.
- `voice_style` metadata still does not guarantee TTS voice/prosody changes.
- Desktop awareness remains manual and limited by design.
- Large files such as `app.py` and `web/chat.js` still need a careful follow-up split.

## Suggested Release Assets

- Source test package generated by:
  - `powershell -ExecutionPolicy Bypass -File scripts\package-source-test.ps1`
- Short demo video showing:
  - app startup
  - Live2D visible
  - one normal chat reply
  - audible TTS
  - optional Character Runtime emotion/action behavior clearly labeled experimental

Before attaching any public material, confirm:

- no API keys are visible
- no private desktop content is visible
- no private provider endpoints are visible
- no raw JSON or stack traces are shown in the chat UI
- no claims imply this is already a mature commercial product

## Suggested Release Checklist

- [ ] Confirm `main` is up to date.
- [ ] Run `python scripts\check_character_runtime_v1_3.py`.
- [ ] Run `python scripts\first_run_check.py`.
- [ ] Generate source test package if attaching release assets.
- [ ] Smoke test `start_electron.bat`.
- [ ] Confirm desktop observation, tools, shell access, and proactive behavior are not presented as default-on features.
- [ ] Create GitHub tag `v1.3.0-preview`.
- [ ] Paste these notes into the GitHub Release page and adjust any date/check output if needed.
