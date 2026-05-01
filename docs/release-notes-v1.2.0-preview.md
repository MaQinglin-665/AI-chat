# v1.2.0-preview Release Notes Draft

> Draft for GitHub Release.
>
> This is a preview release for the open-source MVP. It is intended for early testers and contributors, not as a mature commercial product.

## Summary

`v1.2.0-preview` focuses on first-run clarity, safer defaults, and a repeatable baseline desktop pet experience:

- Electron desktop window with Live2D rendering.
- Text chat through an OpenAI-compatible or Ollama-style local/provider backend.
- Browser TTS as the recommended first-run voice path.
- Manual, opt-in desktop observation.
- Character Runtime demo path kept opt-in for emotion/action metadata testing.
- Release checklist and smoke-test documentation for contributors.

## What Works In This Preview

- Live2D desktop pet window can start and render a configured `.model3.json` model.
- Chat UI can send user messages and display assistant replies when a valid LLM provider is configured.
- Browser TTS can speak assistant replies without requiring GPT-SoVITS.
- Live2D mouth/motion feedback can react during speech.
- Health endpoints and local diagnostics support basic startup checks.
- Character Runtime metadata behavior is covered by tests and can be enabled manually for local demo validation.

## Verified Before Drafting

Automated checks:

- `python -m pytest`
- `python scripts/check_python_syntax.py`
- `python scripts/check_js_syntax.py`
- `python scripts/check_secrets.py`

Manual smoke test on 2026-05-01:

- Electron desktop window starts.
- Live2D displays in the expected position.
- Text chat replies with a working LLM provider.
- Live2D mouth/motion responds while speaking.
- Browser TTS produces audible speech.

## First-Run Notes

Recommended first-run path:

1. Install dependencies:
   - `pip install -r requirements.txt`
   - `npm install`
2. Optional test dependencies:
   - `pip install -r requirements-dev.txt`
3. Place a Live2D model under `web/models/`.
4. Set `model_path` in `config.json`.
5. Configure an LLM provider through environment-variable-based API keys.
6. Keep TTS provider as `browser` for the first run.

Do not commit real API keys, provider tokens, private endpoint screenshots, or local TTS reference audio.

## Security Defaults

The preview keeps conservative defaults:

- `observe.attach_mode=manual`
- `observe.allow_auto_chat=false`
- `tools.enabled=false`
- `tools.allow_shell=false`
- local API binding should remain loopback-only for normal local use

Desktop screenshots, tool calling, shell execution, and file access should remain opt-in and user-confirmed.

## Known Limitations

- First-run setup still requires manual provider and Live2D model configuration.
- LLM availability depends on the user's provider, model name, quota, and channel health.
- GPT-SoVITS and other server TTS providers are advanced opt-in paths and may require separate services.
- Character Runtime is still a demo/validation path, not a finished AI VTuber behavior engine.
- `voice_style` metadata does not yet drive TTS voice/prosody.
- Desktop awareness remains manual and limited by design.
- This preview does not provide a packaged installer or commercial support SLA.

## Suggested Validation

After installing:

- Start with `start_electron.bat` or `npm run start:electron`.
- Confirm Live2D appears.
- Send one text message and verify a reply.
- Confirm browser TTS plays.
- Confirm desktop observation is off by default.
- Run `python -m pytest` if contributing code.

## Upgrade / Rollback Notes

- Keep local secrets in environment variables referenced by `api_key_env`.
- Keep local overrides in `config.local.json` and avoid committing private values.
- If Character Runtime demo causes issues, set `character_runtime.enabled=false`.
- If server TTS fails, switch back to `tts.provider=browser`.
- If desktop observation is unwanted, keep `observe.attach_mode=manual` and leave observation off.

## Public Demo Material Checklist

Before attaching screenshots or videos:

- No API keys or private endpoints visible.
- No private desktop content visible.
- No stack traces, `/api/chat` 500 errors, or red console errors.
- No raw JSON shown in the chat UI.
- No claims that the project is already a complete AI VTuber, full desktop agent, or mature plugin ecosystem.

Suggested public material:

- Startup + Live2D visible.
- One normal chat reply.
- Browser TTS playback.
- Optional Character Runtime demo clip clearly labeled as experimental.
