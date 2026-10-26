# Session handoff — VRM room proportions (2026-10-25)

Branch codex/avatar-3d-room-v1, PR #218 must stay draft for user visual review. Prior 91102ef introduced the room; user requested metre-scale furniture/depth/daylight corrections. Local main and 0a06554 remain untouched. Prior handoff archived in docs/archive/session-handoff-room-before-metres-20261025.md.

Changed vrmScene.js to metres independent of avatar height: shelf 1.8m, lamp 1.5m with 0.35m shade, window 1.2x1.4m with 0.9m sill. Wall z=-3m, furnishings z=-2/-2.65m, clean head backdrop. Added ceiling/skirting, distant partial pink crowns, moon/mixed-size stars/clouds, warm brighter daytime and procedural floor sunlight patch. Square wall seams prevent sky leaks; avatar-relative fog stays stable in wide inspection views. vrmRenderer only forwards camera depth. No dialogue/memory/external execution/Live2D/private config/model changes.

Verification: scripts/test-local.ps1 passed 829/3, all Node/syntax/secrets. Added metre dimensions, book range, clear backdrop, distance and unscaled-height tests; ten-cycle resource disposal still passes. Actual Electron VRM0 full/wide night/day captures inspected, ignored tmp_ui_smoke/avatar-vrm-polish/metres-{night,day}-{full,wide}.png. Temporary test-only camera pullback; no product camera change. Full idle 19.98 FPS, CPU 4.21%, GPU 5.19%, 38 draws, within baseline budget. Full dimensions and limitations docs/avatar-3d-room.md. First-run package not repeated: no defaults/installer changes; initial room version passed it.

Next: commit/push (10-second network retry up to five attempts), update PR #218 description, keep draft and wait for user. No model screenshots uploaded, no merge authorization.
