# Painted backdrop — 2026-10-26

Workspace D:/AI/ai_desktop_pet_painted; branch codex/avatar-painted-backdrop-v1; user-authorized base b22d4ef (PR #220). Other thread's uncommitted motion/camera work excluded.

Implementation: independent vrmPainted.js owns local plates, anchored cover and fixed camera, lighting/crossfade, shadows/reflection and stationary idle. Local PNG routes reuse allowed directory/link rules. Default room and other renderers preserved.
Shared merge surfaces: avatar_assets.py, app_get_routes.py, vrmRenderer.js (independent camera, no follow algorithm edits), avatarRuntime.js (two controls), vrmWorld.js (empty activity points), index.html, stage.css. Full file list in docs/avatar-room-painted.md.

Verification: 841 Python passed / 3 skipped, all Node/syntax/secrets and first-run package gates passed. Two external-agent test fixtures isolate a synthetic protected project for workspace-contained temp files; no policy product changes. Real isolated Electron VRM0: three periods, metre grid, three sizes, settings, room/handpainted/none/pet; no page errors; 40 additional toggles stable GPU resources and bounded batch heap. 30.000s MP4 and all PNGs ignored under tmp_ui_smoke/painted. No real LLM/TTS/VRM1 or long-duration test.

Private models/backgrounds/config remain outside Git. No config.local.json read; test configuration and loopback 8137 are isolated. Screenshots must not be uploaded to PR.

Next: draft PR visual review. Base main; first description line exactly: 依赖 #220，需在 #220 合并后再合并
#220 remains OPEN as of verification. Once merged, merge origin/main into this branch; stop if any conflict outside feature_list.json, progress.md, session-handoff.md. Never force push, push main or merge this PR.

## PR #221 follow-up: integration polish

User accepted calibration/cropping; preserve them. This revision strengthens contact/reflection and period lighting, adds avatar-only 0.75px softness/faint halo and grading. Constants in vrmPainted.js; only shared change is vrmRenderer.js painted render dispatch, no avatarRuntime/camera-follow edits. Updated tests cover multipass state restoration and target disposal.
Full local gate passed: 841 Python / 3 skipped, all Node/syntax/secrets. Isolated real VRM0 before/after three periods, feet/edge closeups in tmp_ui_smoke/painted-polish/after-final-*.png and before-*.png. Final shader/page errors empty; background outer pixels unchanged. Twenty more scene cycles stable 26 geometries / 49 textures; major-GC heap 6677384 / 6835904 bytes. Reflection setting disposal and room/handpainted/none/pet smoke passed. Added MSAA target costs GPU memory; no hardware-wide/long-duration performance claim.
Next: user visual review of draft https://github.com/MaQinglin-665/AI-chat/pull/221. Keep dependency notice and #220 merge constraints above. Screenshots remain local and ignored.
