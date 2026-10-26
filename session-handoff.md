# Session handoff — procedural VRM room (2026-10-25)

Branch codex/avatar-3d-room-v1 created from origin/main a08e0c4 after verifying PR #216 merge is contained. Local main and its 0a06554 commit untouched; 0a06554 is exactly origin/codex/architecture-hygiene-performance, a 31-file architecture split. Previous handoff archived in docs/archive/session-handoff-avatar-vrm-before-3d-20261025.md.

Scope: new vrmScene.js seeded layout/instanced Toon furniture, generated sky/ramp/contact shadow, window/strip/lamp lighting, existing stageRoom day/night with 2.5s transition, complete resource disposal. vrmRenderer delegates creation/disposal; avatar_assets returns bounded scene room/none; index/CSS only connect the room. No Live2D renderer, dialogue, memory, external execution, model or private config edits.

Evidence: docs/avatar-3d-room.md. Actual Electron full/pet VRM0 and Hiyori captures remain ignored under tmp_ui_smoke/avatar-vrm-polish/3d-*.png. Before/after idle 20.00/19.97 FPS, CPU 4.45/3.85%, GPU 4.93/4.92%, draw calls 28/34. Ten actual WebGL toggles: geometry/textures stable on 25/46, off 20/45; post-GC JS heap fluctuates without sustained growth. No live LLM/TTS or real VRM1 appearance claimed. Private config and model hashes unchanged.

Tests: initial full local gate 829 passed/3 skipped, all Node/syntax/secrets; package smoke passed. Final gate also passed (829/3, all Node/syntax/secrets) after shared-material restore regression test. Next: explicit file staging/secret scan, commit/push with 10-second network retry up to five attempts, draft PR to main. Stop for user visual acceptance; do not mark ready or merge. No images/models/private files in commits or PR.
