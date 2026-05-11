# v1.4.0-preview Release Notes

> This is a preview release for early testers and contributors. It includes an unsigned Windows online guided installer, but it is still not a mature AI VTuber product or commercial desktop agent.

## Summary

`v1.4.0-preview` focuses on the original AI VTuber feeling and first public usability: Xinyu can keep a light stage memory, react with Character Brain performance controls, produce low-interruption spontaneous thoughts, and guide first-time users through installer-first setup.

This release is inspired by AI VTuber interaction patterns, including the sense of immediacy found in Neuro-sama-like experiences, but it is not a clone and does not copy existing VTuber lines, lore, or proprietary bits.

The preview does not include a cloud model, hosted endpoint, or API key. Testers choose their own model provider; see `docs/model-selection.md` for compatibility and latency expectations.

Recommended release assets:

- `Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe`
- `Xinyu-AI-Desktop-Pet-v1.4.0-preview-windows-source-test.zip`
- `SHA256SUMS.txt`
- these release notes

## What Changed

### First Public Install Path

- Added an NSIS Windows online guided installer that installs under the current user directory, creates Start Menu / desktop shortcuts, and launches `install_and_start.bat`.
- Added source package alignment so `install_and_start.bat`, installer docs, and installer build scripts are included in the source test zip.
- Renamed release package artifacts from older Taffy package names to Xinyu package names. Some compatibility environment variables, such as `TAFFY_API_TOKEN` and `TAFFY_LLM_API_KEY`, are intentionally retained.
- Added SHA256 generation for installer and source zip. The first installer is unsigned, so SmartScreen warnings are expected unless/until code signing is added.

### First-Run LLM Wizard

- Added `/api/first_run/status` for a safe first-run summary: onboarding state, LLM completeness, Live2D availability, and safety default summary. It does not return API keys.
- Added `/api/first_run/configure_llm`, protected by the local API token, to write non-secret LLM settings to `config.local.json` and the real API key to `.env`.
- Added an in-app first-run model setup wizard for provider type, base URL, model, API key env name, and API key.
- The default provider is `openai-compatible`; the default key env name is `TAFFY_LLM_API_KEY`.
- After saving, the UI calls the existing lightweight LLM probe and shows a readable success or failure reason.

### Character Brain and Stage Continuity

- Added lightweight session continuity for intent, topic, mood baseline, energy, relationship tone, and recent user need.
- Added short-term stage memory for small callbacks without writing long-term memory.
- Added safety clamps so comfort, reminder, task, diagnostic, and closing scenes stay controlled.
- Added `/braindebug` public summaries for intent, performance, motion, voice, timeline, stage memory, and safety state.

### AI VTuber Performance Layer

- Added turn-level performance controls:
  - opening move
  - reply shape
  - spontaneity
  - question policy
  - motion director
  - voice director
- Added performance timeline planning for:
  - pre-reaction
  - speech start
  - speech beats
  - post-settle
- Added voice timeline segmentation so short rants and thought bursts can speak in beats instead of one flat block.

### Spontaneous Thought Bursts

- Added proactive stage replies and turn-based interjections.
- Added an interjection director that decides whether Xinyu should hold back, callback, or interject.
- Added thought burst types such as:
  - mutter
  - aside
  - tiny rant
  - callback
  - mock defense
  - celebration
  - topic spark
- Added thought burst choreography so each type maps to safer Live2D motion and voice pacing.

### Dialogue Quality and Audits

- Added model acceptance and v1.4/v1.6 dialogue audit scripts.
- Improved reply constraints to reduce:
  - customer-service closers
  - unwanted follow-up questions
  - Chinese leakage in the fixed-English character mode
  - context drift from earlier tasks
  - turning casual stage comments into troubleshooting steps

## Validation Guidance

Before publishing or sharing a source test package, run:

```text
node scripts/run_node_tests.js
python -m py_compile app.py character_brain.py llm_runtime.py llm_client.py
python scripts/check_encoding.py
python scripts/check_secrets.py
python -m pytest -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_first_run_package.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check_installer_smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1 --soft-fail
python scripts/model_acceptance_probe.py --attempts 5 --timeout-sec 14 --soft-fail
python scripts/audit_v14_dialogue.py --mode chat --timeout-sec 45 --soft-fail
python scripts/audit_v16_performance.py --soft-fail
```

Expected code/package baseline:

- Node frontend tests pass.
- Python test suite passes.
- Encoding and secret scans pass.
- The generated source test package can import the backend app from the extracted package.
- The package excludes `.env`, `config.local.json`, local logs, private memory, API keys, and other local runtime artifacts.

Model-dependent checks must be interpreted with the local configuration in mind:

- If the model probe success rate is below 80%, do not use that run to judge the character experience.
- If normal turns often exceed 15 seconds, switch to a faster stable model for daily tuning and compare larger models later.
- v1.4/v1.6 dialogue audits are useful only when the configured model returns non-empty English replies.
- If `/api/llm_probe` returns HTTP 500, run `scripts\diagnose-llm-link.ps1` and fix the reported provider/base URL/model/key/gateway issue before tuning character behavior.

## Manual Smoke Checklist

Before recording or sharing a public demo, verify:

- Text chat sends and receives replies.
- Live2D model is visible.
- Long TTS lines finish without losing the tail.
- Mouth movement and post-idle release work.
- Thought burst motion/voice feels connected to the reply.
- `/doctor` is readable and does not leak secrets.
- `/braindebug` is read-only and does not trigger TTS, motion, desktop observation, tools, or shell.
- Spontaneous replies are visible but not noisy.
- Comfort, task, reminder, diagnostic, and closing scenes stay restrained.

## Security Defaults

This preview keeps conservative defaults:

- Desktop observation is not enabled by default.
- Screenshots are not captured by default.
- User files are not read by default.
- Tool calling is optional and disabled unless configured.
- Shell execution is disabled unless explicitly configured.
- Debug reports must not expose API keys, raw prompts, raw history, private bit guides, or sensitive local paths.

## Known Limitations

- The Windows installer is an unsigned online guided installer; it does not bundle Python/Node runtimes or a model provider.
- The character feel depends heavily on the configured model latency and output quality.
- Spontaneous thought bursts are still early and may need manual tuning for each TTS/Live2D setup.
- TTS and Live2D timing still need manual smoke testing on each machine.
- A slow or unstable OpenAI-compatible gateway can make Xinyu feel broken even when the local app code is healthy.
- Desktop awareness remains manual and intentionally conservative.

## Download and First Run

Recommended download for normal Windows users:

- `Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe`
- `SHA256SUMS.txt`

Verify SHA256 before running. If SmartScreen warns about an unknown publisher,
continue only when the file came from this repository release and the SHA256
matches.

Recommended download for developers / early testers:

- `Xinyu-AI-Desktop-Pet-v1.4.0-preview-windows-source-test.zip`
- `SHA256SUMS.txt`

GitHub's automatic `Source code` archives are plain repository snapshots and do
not run the first-run package checks.

Recommended source-package first-run path after extracting the zip:

```powershell
.\install_and_start.bat
```

The installer and the source-package guided path both prepare dependencies,
apply the Xinyu preview profile, and launch Electron. The user's own model
provider/model/key is configured in the in-app first-run wizard. The first-chat
smoke check remains available as an advanced diagnostic step. The preview does
not ship a cloud model, endpoint, or API key.
