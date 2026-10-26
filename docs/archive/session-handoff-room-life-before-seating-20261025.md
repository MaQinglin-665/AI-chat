# Session handoff — Room life v1 (2026-10-25)

Branch codex/avatar-room-life-v1, based on origin/main 2356ddb (PR #218 merged). Local main remains 0a06554.
Implementation 0c34e34 and final full tests complete; branch pushed, draft PR #219 targets main. Next: wait for user Windows visual review. Never merge automatically.

Changed: vrmFurniture.js local CC0 subset loader + one toon mesh; vrmWorld.js deterministic activities/routes/poses;
vrmScene.js fallback and layout metadata; vrmRenderer.js locomotion/contact solving/book/follow camera; avatarRuntime.js input/busy/speech signals;
index script tags; Node tests/runner; first-run package asset/license verification; notices/docs/state and narrow vendor-bin gitignore exception.
Only selected KayKit files are bundled. Private VRM/config untouched; no dialogue/memory/Live2D/external execution edits.

Verification: final scripts/test-local.ps1 829 passed / 3 skipped, all Node/syntax/secrets; first-run package passed including byte-for-byte furniture and license.
Pre-push JSON/py_compile passed. Real Electron VRM0 no page exceptions; four activities, walking, input interruption, day/night wide screenshots;
10 room toggles stable 28 geometries / 47 textures. Baseline/new idle GPU 5.32/5.04%, FPS ~20, draws 38/36, CPU 3.28/3.32%.
Ignored evidence tmp_ui_smoke/avatar-vrm-polish/life-*.png/json/log and life-tour.mp4 (35 seconds, no audio, test-selected activities).
Full details and measured boundaries docs/avatar-room-life.md. Real VRM1/live ASR/LLM/TTS not tested; no full-body collision/foot IK; no installer exe built.

## Previous handoff (historical; #218 is now merged)

# Session handoff — VRM room proportions (2026-10-25)

Branch codex/avatar-3d-room-v1, User passed PR #218 visual acceptance and authorized merge commit on 2026-10-25 after fresh local/package gates and all Linux/Windows CI pass. Prior 91102ef introduced the room; user requested metre-scale furniture/depth/daylight corrections. Local main and 0a06554 remain untouched. Prior handoff archived in docs/archive/session-handoff-room-before-metres-20261025.md.

Changed vrmScene.js to metres independent of avatar height: shelf 1.8m, lamp 1.5m with 0.35m shade, window 1.2x1.4m with 0.9m sill. Wall z=-3m, furnishings z=-2/-2.65m, clean head backdrop. Added ceiling/skirting, distant partial pink crowns, moon/mixed-size stars/clouds, warm brighter daytime and procedural floor sunlight patch. Square wall seams prevent sky leaks; avatar-relative fog stays stable in wide inspection views. vrmRenderer only forwards camera depth. No dialogue/memory/external execution/Live2D/private config/model changes.

Verification: scripts/test-local.ps1 passed 829/3, all Node/syntax/secrets. Added metre dimensions, book range, clear backdrop, distance and unscaled-height tests; ten-cycle resource disposal still passes. Actual Electron VRM0 full/wide night/day captures inspected, ignored tmp_ui_smoke/avatar-vrm-polish/metres-{night,day}-{full,wide}.png. Temporary test-only camera pullback; no product camera change. Full idle 19.98 FPS, CPU 4.21%, GPU 5.19%, 38 draws, within baseline budget. Full dimensions and limitations docs/avatar-3d-room.md. First-run package not repeated: no defaults/installer changes; initial room version passed it.

Fresh merge gates passed: 829/3 plus Node/syntax/secrets; first-run package passed. Next: push acceptance notes, ready PR, all CI green, merge with --merge --admin, then test exact latest origin/main detached. Preserve local main/0a06554 and config.local.json. Three visual follow-ups recorded in progress.md are explicitly deferred. No model screenshots uploaded.
