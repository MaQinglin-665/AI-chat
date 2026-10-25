# Session handoff — VRM scene integration (2026-10-25)

Branch codex/avatar-vrm-basic, PR #216 stays draft. Normal commit/push authorized; do not merge. Previous handoff archived in docs/archive/session-handoff-avatar-vrm-before-room-20261025.md.

Changed vrmRenderer.js: separate LIGHT.room/LIGHT.pet, warm upper-right key, violet environment/pink rim, in-shader room-only desaturation/exposure; 15-degree body turn and head return, asymmetric hip/shoulder stance, relaxed shoulders/arm/fingers; neutral 0.18 smile, deterministic saccades, 27-degree elevated camera. All new tuning is at file top. avatarRuntime passes view and reads existing assistant timestamp, broadcasts a brief preparation expression; no chat-generation/voice/history modifications. Tests/docs and feature state updated.

User authorized closing/restarting the existing Electron instance. Actual VRM0 before/after screenshots: ignored tmp_ui_smoke/avatar-vrm-polish/room-before-full.png, room-after-full.png, room-after-pet.png. Before uses a test-only route serving committed 321fc17 renderer, without reverting source. Never upload model images. Model SHA-256 unchanged. Real VRM1 appearance and live LLM/TTS preparation timing remain unverified.

The user-requested record audit found the selected stored message already has role=user and UI maps it consistently. No matching assistant record or role-flip path found. History does not retain keyboard/ASR provenance, so do not claim which input source generated it. No private chat content/record copied into tracked files or edited.

Verification: targeted pose/finger/camera/room-grading/saccade/smile and one-time preparation broadcast tests pass. Full validation result recorded in progress.md; logs ignored under tmp_ui_smoke/avatar-vrm-polish/room-tests-final.log. Next: keep #216 draft and stop for user visual review after normal push. No main push, no force push, no model/private config changes.
