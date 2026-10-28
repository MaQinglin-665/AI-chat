# VRM motion naturalization v1 — awaiting author review

Worktree D:/AI/ai_desktop_pet_motion; branch codex/vrm-motion-natural-v1; baseline42ae9ea. Step0 d4a1192 separately committed; implementation committed as e709f8d and pushed. Do not merge/main-push/force-push; do not touch original ai_desktop_pet or private config.

## Evidence
Full test-local with D TEMP/TMP:1109passed/3skipped,85Node suites; first-run package including new files passed. Additional real bundled glTF retarget+Mixer simulation9x60s and all Node suites passed. Mouth isolation, crossfade, additive ownership, interrupted fades, fallback/disposal, path safety covered. Paired private VRM videos tmp_ui_smoke/motion/before.mp4 (~300s), after.mp4 (300s), audio included; controlled browser playback with same local SAPI audio, not live LLM/Electron E2E. Raw performance.json uses #231 method.

## Files / boundaries
VRM renderer/world/natural/clip module; animation-only Standard CC0 glTF/license; local avatar_motions route (app_get_routes4lines); vendor FBX/VRMA loader; index script registration; tests, extraction/build/package checks, pytest collection boundary; docs/notices and3state files. No Live2D/brain/camera changes; no private models or restricted animations staged.

## Next
Draft PR https://github.com/MaQinglin-665/AI-chat/pull/236 is open and attached; not merged. CI started. User reviews local videos and CMU candidate list in docs/avatar-vrm-motion-natural.md. Own test server8141 is stopped at task finish; ignored serve.py/qa.html remain for reproducing acceptance. Prior handoff preserved in docs/history/session-handoff-before-vrm-natural-20261028.md.
