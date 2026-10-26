# Camera and motion — 2026-10-26

Branch codex/avatar-motion-camera-v1 from origin/main 0542d04, with user-authorized #220 b22d4ef included for both presets. Local main 0a06554 unchanged; private config hash unchanged. No private model/media committed. No dialogue, memory, external-execution or Live2D changes.

Implemented root-only critical spring/dead-zone camera, fixed activity targets; safe rounded routes with curvature braking, layered turning, 700ms eased pose transitions, seeded speed/amplitude/pause variation, distance-based gait and measured planted-foot IK. Report: docs/avatar-motion-camera.md.

Verification: full local gate (830 passed, 3 skipped; all Node/syntax/secrets), plus package smoke passed. Final gate rerun after last gait-clearance tuning passed; see ignored motion-full-tests.log. Camera simulation jitter 6.608mm -> 0 at 20 FPS, 0.1mm threshold; all-pairs trajectory max 1.517rad/s < 2.2; synthetic VRM0/1 short/long legs stable. Real Electron VRM0 both presets: fixed 30Hz simulation/10fps capture, four 45s before/after videos, no page errors; stable seated camera sample delta 6.073/6.008mm -> zero. After videos each have 14 walking samples with no unreachable foot targets. Captures/probes in ignored tmp_ui_smoke/avatar-vrm-polish.

CMU 2a: skipped by explicit user instruction after connection-reset retries. Not evaluated. Actual attempted URL and future D:/AI/local-assets/mocap/cmu/ workflow documented; no data integrated.

Files: vrmCamera/vrmLocomotion new; vrmWorld, vrmRenderer, vrmSeating, index wiring; two Node suites/runner; report, room-life link and state. Prior handoff archived at docs/archive/session-handoff-handpainted-20261026.md.

Next: publish feature branch and draft PR to main after final gate, then wait for user visual review. Do not merge; #220 remains a separate draft. Limits: real VRM1 not visually tested, no full-body/clothing collisions, existing desk/window hands still deferred. Recordings are controlled rendering, not a performance benchmark or live speech acceptance.

## Publication blocker
Implementation commit cbdf497 is locally complete and validated. Normal push failed five times, 10 seconds between attempts (GitHub TLS handshake resets and port-443 timeouts). Remote feature branch was not established; draft PR not created. Stop further network retries under the user's rule.
User can run: git -C D:/AI/ai_desktop_pet_readiness_20261023 push -u origin codex/avatar-motion-camera-v1
After push succeeds: create a draft PR to main, explicitly note included unmerged #220, attach it to this task, and stop for user review. Do not merge or change local main/private configuration.
