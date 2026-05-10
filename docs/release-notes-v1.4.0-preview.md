# v1.4.0-preview Release Notes

> This is a preview release for early testers and contributors. It is not a finished installer, mature AI VTuber product, or commercial desktop agent.

## Summary

`v1.4.0-preview` focuses on the original AI VTuber feeling: Taffy can keep a light stage memory, react with Character Brain performance controls, produce low-interruption spontaneous thoughts, and expose readable debug summaries for tuning.

This release is inspired by AI VTuber interaction patterns, including the sense of immediacy found in Neuro-sama-like experiences, but it is not a clone and does not copy existing VTuber lines, lore, or proprietary bits.

## What Changed

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
- Added an interjection director that decides whether Taffy should hold back, callback, or interject.
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

- This is still a source-based preview, not a packaged consumer installer.
- The character feel depends heavily on the configured model latency and output quality.
- Spontaneous thought bursts are still early and may need manual tuning for each TTS/Live2D setup.
- TTS and Live2D timing still need manual smoke testing on each machine.
- A slow or unstable OpenAI-compatible gateway can make Taffy feel broken even when the local app code is healthy.
- Desktop awareness remains manual and intentionally conservative.

## Suggested Release Assets

- Source test package generated by:
  - `powershell -ExecutionPolicy Bypass -File scripts\package-source-test.ps1`
- SHA256 checksum generated beside the source test package:
  - `dist/SHA256SUMS.txt`
- Short demo video showing:
  - app startup
  - Live2D visible
  - text chat
  - TTS playback
  - one thought burst
  - `/braindebug` public summary

## Suggested Release Checklist

- [ ] Confirm `main` is up to date.
- [ ] Run the automated validation commands above.
- [ ] Run Electron UI smoke or manual UI smoke.
- [ ] Confirm no release material shows secrets, private desktop content, or private provider endpoints.
- [ ] Confirm release copy says this is an MVP / preview, not a mature product.
- [ ] Create GitHub tag `v1.4.0-preview`.
- [ ] Paste these notes into the GitHub Release page and adjust validation output if needed.
