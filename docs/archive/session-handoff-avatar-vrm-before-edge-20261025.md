# Session handoff

## VRM renderer basic (2026-10-25)

Branch codex/avatar-vrm-basic, based on origin/main 5b20358 (PR #215 merged and final main gate passed 809/2). Local main had an unrelated 0a06554 commit; preserved it and created this branch from fetched origin/main instead of resetting/merging that history. User authorizes push and draft PR only; NEVER merge this PR without new user approval.

Scope: independent avatar asset reader and renderer, local pinned vendor bundle, minimal GET dispatcher/Live2D initializer hooks, attribution panel, tests and docs. No dialogue, memory, external execution or private config changes. New config is documented only, no config*.json files touched. Model data remains outside repository; screenshots and validation harness in ignored tmp_ui_smoke/avatar-vrm. Do not commit these or copy the model into repo/packages.

Evidence so far: synthetic path/meta tests 13 passed, 1 Windows symlink-privilege skip (real Windows junction regression passed); Node fake VRM tests passed. Isolated Electron 39.8.10 real VRM0 render, transparency, wave/nod, amplitude bridge and attribution checked. Hiyori without avatar config rendered. CPU/GPU evidence and limits in docs/avatar-vrm-basic.md. Real VRM1 and full desktop LLM/TTS remain manual verification; no private config used. Existing model-window unload learning-panel exception also reproduces with Hiyori and is not changed.

Final local verification: scripts/test-local.ps1 passed (825 passed, 3 skipped; Node/syntax/secrets passed); scripts/check_first_run_package.ps1 passed. Required pre-push JSON and py_compile passed. Final logs are ignored tmp_ui_smoke/avatar-vrm/full-tests-final.log and package-check-final.log.

Next: push this branch and open draft PR to main. Stop for user visual review. Network failures retry every 10 seconds, up to five attempts. Ask user before any dialogue/memory/external-execution change or private config/key access.


## VRM performance/motion follow-up (2026-10-25)

PR #216 already exists and is a draft. User now authorizes fixing performance and natural motion, committing and pushing this same branch, but NOT merging. Earlier basic-stage notes above are historical.

Current implementation replaces expensive desktop raycast with 12 projected bone capsules, adds dynamic pixel budget/20 FPS idle/30 FPS speech, runtime restart cleanup and inactive suspension. Deterministic seeded standing/idle/speech/actions, height-based camera and two-light setup are in vrmRenderer.js; amplitudes at top. Scope excludes dialogue, memory, external execution and private configuration. Private model unchanged.

Real full Electron before/after results and limitations: docs/avatar-vrm-performance.md. All captures/scripts/raw measurements in ignored tmp_ui_smoke/avatar-vrm-polish; NEVER commit or publish model images. Before/after pet screenshots, after-speaking.png, after-small-motion.png, visual-full.png. GPU/CPU samples use simulated amplitude, not actual TTS. Existing learning-panel unload error remains outside scope. Runtime tests registered in scripts/run_node_tests.js; final full gate and network status to be recorded below.

Final follow-up verification: scripts/test-local.ps1 passed (825 passed, 3 skipped; registered runtime lifecycle suite and all Node tests passed, syntax/secrets passed). Required JSON/py_compile checks passed. Evidence: ignored tmp_ui_smoke/avatar-vrm-polish/full-tests-final.log. GitHub API connection failed five attempts, with 10-second retry intervals; stopped network operations. Changes committed locally; push/PR description update remains pending. Do not mark PR ready or merge. Resume with normal push of codex/avatar-vrm-basic and verify #216 is still draft.
