# Session handoff — VRM edge/presence polish (2026-10-25)

Branch: codex/avatar-vrm-basic. PR #216 is open and draft; user authorizes normal push, never automatic merge. Earlier stage notes preserved in docs/archive/session-handoff-avatar-vrm-before-edge-20261025.md.

Current changes: vrmRenderer.js MSAA, explicit premultiplied alpha, DPR floor 1.0, cutout alpha-to-coverage, reduced key/ambient light. avatarRuntime/live2dRuntimeController mark successful load readiness. index.html label is 馨语; visualPolish.css removes model-view decorations for both engines and fades bottom-left status 3 seconds after readiness. Tests cover quality/material boundaries and readiness; the old Live2D mock now supplies document.body.

Verification: scripts/test-local.ps1 passed (825 passed, 3 skipped; all Node/syntax/secrets passed), required JSON/py_compile checks passed. Real Electron VRM and Hiyori decoration/status checks passed. Desktop idle 20.16 -> 19.93 FPS; GPU 2.97% -> 0.86%, with decoration removal contributing to savings. Model hash unchanged. docs/avatar-vrm-performance.md contains measurements and limitations; docs/avatar-vrm-basic.md reflects current quality policy.

Private screenshots/scripts/logs are only in ignored tmp_ui_smoke/avatar-vrm-polish: edge-before-edge.png, edge-final-edge.png (edge and lighting comparison), edge-before-pet.png, edge-final-pet.png, hiyori-clean.png, vrm-clean.png, edge-tests-final.log. Never commit or upload model images, model files, private configs or credentials. No dialogue/memory/external-execution/voice changes. Real VRM1 visual review remains pending; larger canvases exceed the soft pixel budget to maintain DPR >=1; MSAA is hardware-dependent.

Next: normal push and update draft #216 description, then stop for user's Windows visual review. DNS failures: 10-second intervals, maximum five attempts. Do not merge or change main.
