# Character Runtime Safe Local Demo Config Guide

## Scope
Use this guide for stable and repeatable local demo setup in these cases:
- local demo sessions
- on-device live demonstrations
- pre-release material recording
- pre-release smoke test runs
- manual verification after runtime-related changes

## Safety Principles
- Keep default behavior off unless you are explicitly validating demo/runtime path.
- Treat demo enablement as local-only verification setup.
- Do not accidentally commit private local config changes.
- Do not treat demo-enabled config as release default.
- After recording/demo, restore baseline config and verify normal path.

## Real Config Source and Override Order
Runtime config is loaded in this order:
1. `config.example.json` (reference/default layer)
2. `config.json` (local primary config)
3. `config.local.json` (local override layer)

Later files override earlier files.

In this repository, `.gitignore` includes `config.local.json`, so it is the recommended place for temporary demo overrides. Even so, always run `git status --short` before commit/push.

## Minimal Demo Override
Put this in local config (prefer `config.local.json`):

```json
{
  "character_runtime": {
    "enabled": true,
    "return_metadata": true
  }
}
```

Notes:
- `enabled=true` is required for runtime structured prompt contract injection.
- `return_metadata=true` is required for optional `character_runtime` metadata in response payloads.
- `character_runtime` metadata should not include `text`.
- `voice_style` currently does not change TTS behavior.
- This is demo/validation config, not a release default.

## Restore Baseline (Default-Off)
Set:

```json
{
  "character_runtime": {
    "enabled": false,
    "return_metadata": false
  }
}
```

After disabling:
- normal chat path should return to baseline
- response shape should not require `character_runtime` metadata
- Live2D should not be triggered by runtime metadata path
- TTS behavior should remain unchanged

## Before Recording Materials
- confirm current branch
- confirm `git status --short` is clean, or only expected local config changes
- confirm LLM provider is reachable
- confirm Electron/Live2D starts correctly
- confirm `chatWindow` DevTools debug bridge is available
- for public release material workflow, run:
  - [Release Demo Recording Checklist](./release-demo-recording-checklist.md)
- run smoke checklist:
  - [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)

## After Recording Cleanup
- disable demo override or restore baseline block
- restart and verify normal chat behavior
- run `git status --short` to avoid committing local-only config
- do not touch unrelated legacy stash entries

## Common Risks and Misreads
- Demo-enabled config accidentally committed.
- Assuming `voice_style` already drives TTS behavior.
- Assuming weak motion visibility always means runtime failure.
- Assuming `/api/chat` 500 is runtime-bridge failure (often provider/config/network).
- Checking debug bridge in `modelWindow` instead of `chatWindow`.

## Related Docs
- [Character Runtime Demo Enablement](./character-runtime-demo.md)
- [Character Runtime Demo Smoke Test Checklist](./character-runtime-smoke-test.md)
- [Release Demo Recording Checklist](./release-demo-recording-checklist.md)
- [Character Runtime End-to-End Validation](./character-runtime-e2e-validation.md)
