# Hand-painted room preset — 2026-10-26

Branch codex/avatar-room-handpainted-v1 from origin/main 0542d04; local main 0a06554 and private config/model unchanged.
Scope: coexist with default KayKit room and none; shared scene lifecycle, world scheduling/paths, seated contacts and cameras.
Asset license.txt verifies CC BY 4.0, OzerGokmen; copied only geometry/base-color maps/attribution. Original private VRM never included.
Read docs/avatar-room-handpainted.md for scale/cutaway details and verification.
Touched: avatar_assets.py scene enum; avatar renderer/scene/world/seating/furniture integration and new handpainted module; tests/package check and notices/state docs. No dialogue, memory or external-execution changes.
Verification: full gate 830 passed/3 skipped plus all Node/syntax/secrets; first-run package hash checks passed after exact public scene.bin ignore exception. Real Electron both presets/day/night/four activities, ten stable resource cycles and forced-load-failure fallback; no page errors. Ignored handpainted-*.png and handpainted-tour.mp4 (35s). Private config hash unchanged.
Limitations: baked lighting/reflections, cutaway shell and inherited hand-pose issues; real VRM1 not visually tested.
Next: user visual review of draft PR; default room unchanged. Do not merge.
