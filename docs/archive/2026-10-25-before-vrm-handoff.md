# Session handoff

## API rejection body drain (2026-10-25)

Branch: codex/fix-api-reject-drain-body, based on main b9d9354c237b43e353d066a97ef7309e2434267f. PR #214 merged with all Linux and Windows checks green. Earlier integration handoff preserved in docs/archive/2026-10-25-before-api-drain-handoff.md.

User authorizes a bounded request-body drain before token/origin denial, tests, push and a PR, then merge commit only after all CI passes. No force push, direct main push, branch deletion, tags, releases or private configuration changes. Stop on unexpected test/CI failure. DNS push failures: retry at 10-second intervals, at most five attempts.

Files touched: app.py, tests/test_api_health.py, tests/test_request_body_drain.py and these state records. Drain is limited to 1 MiB and a two-second deadline; invalid/oversized/ambiguous framing closes the connection without reading. No authorization defaults changed. Targeted tests: 38 passed, including 30 unauthorized 64-KiB POSTs and 30 disallowed-origin POSTs with complete JSON responses.

Verification Evidence: full scripts/test-local.ps1 passed: 809 Python passed, 2 skipped; Node suites, Python/JavaScript syntax and secret scan passed. Required JSON and py_compile checks passed. Log: ignored tmp_ui_smoke/task6/drain-body-full-tests.log.

Next: submit PR to main, require all CI then --merge --admin. Fetch merged main and rerun scripts/test-local.ps1. Final report must include both merge hashes and final main hash.

Limitations: malformed, oversized or stalled clients may still see connection closure; stable JSON delivery regression covers complete bounded bodies. Prior external-agent metadata verification followups and blocked isolated-directory cleanup remain unchanged.
