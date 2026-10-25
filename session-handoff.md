# Session handoff

## Current task — Live2D stage 1: launcher recovery; official Core pending (2026-10-25)
- Branch friend/avatar-live2d-adapter now based on main 5b20358. AGENTS.md and docs/avatar-intent-interface.md v1 read. Prior preparation records preserved via stash 9bd2080 plus an external patch; only own entries restored onto current state.
- User scope: stage 1 has two independent commits (launcher guidance, then official Core compatibility), then stop for confirmation. No stage 2/3 yet. Pause large-file splitting. No main push/force push/self-merge; no dialogue/memory/external-agent implementation edits.
- Launcher investigation: #211 delegates npm to scripts/start-electron.ps1; batch failure pause still exists, but npm-specific guidance was lost. Restore friendly Chinese failure guidance and batch exit handling without reverting local Node, npm ci or mirror support.
- Core/Mao archives not present in C:/Users/Feng2/Documents/Codex/Live2D-downloads. User must personally accept official SDK license and download. Do not use third-party Core. Core redistribution must be checked from supplied SDK license materials before commit.
- Existing Hiyori baseline screenshots/version/hash evidence remain outside Git under outputs/avatar-live2d-stage1; four relevant hashes match after main update. Competition process screenshots are under outputs/比赛材料/04_创作过程截图, never committed.
- Launcher implementation and verification complete: scripts/start-electron.ps1 restores Chinese npm guidance; start_electron.bat preserves pause and the original failure status; tests/test_node_runtime.py adds isolated Windows regression coverage. Verification Evidence: targeted 7 passed; full scripts/test-local.ps1 passed with 812 Python passed/2 skipped, Node suites, Python/JavaScript syntax and secret scan (764 files) passed. Full log remains outside Git at work/avatar-stage1-launcher-full-tests.log.
- User supplied D:/app/Live2D Cubism 5.3/CubismEditor5.exe; file metadata confirms Cubism Editor 5.3, and the install directory has no matching Web Core/SDK files. This is not the required SDK archive. Independent local launcher commit complete. Next: await user-provided official SDK for Web ZIP and inspect license/RedistributableFiles before any Core replacement. Stage 1 remains incomplete; no stage 2, push or PR.

## Prior handoff preserved from updated main

## API rejection body drain (2026-10-25)

Branch: codex/fix-api-reject-drain-body, based on main b9d9354c237b43e353d066a97ef7309e2434267f. PR #214 merged with all Linux and Windows checks green. Earlier integration handoff preserved in docs/archive/2026-10-25-before-api-drain-handoff.md.

User authorizes a bounded request-body drain before token/origin denial, tests, push and a PR, then merge commit only after all CI passes. No force push, direct main push, branch deletion, tags, releases or private configuration changes. Stop on unexpected test/CI failure. DNS push failures: retry at 10-second intervals, at most five attempts.

Files touched: app.py, tests/test_api_health.py, tests/test_request_body_drain.py and these state records. Drain is limited to 1 MiB and a two-second deadline; invalid/oversized/ambiguous framing closes the connection without reading. No authorization defaults changed. Targeted tests: 38 passed, including 30 unauthorized 64-KiB POSTs and 30 disallowed-origin POSTs with complete JSON responses.

Verification Evidence: full scripts/test-local.ps1 passed: 809 Python passed, 2 skipped; Node suites, Python/JavaScript syntax and secret scan passed. Required JSON and py_compile checks passed. Log: ignored tmp_ui_smoke/task6/drain-body-full-tests.log.

Next: submit PR to main, require all CI then --merge --admin. Fetch merged main and rerun scripts/test-local.ps1. Final report must include both merge hashes and final main hash.

Limitations: malformed, oversized or stalled clients may still see connection closure; stable JSON delivery regression covers complete bounded bodies. Prior external-agent metadata verification followups and blocked isolated-directory cleanup remain unchanged.
