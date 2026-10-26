# Avatar brain phase 1 — verified

Branch codex/avatar-brain-driven-v1 from origin/main ee3de6e. First phase backend complete; only a console debugger in the frontend. Report/schema/config/cost assumptions: docs/avatar-brain-actions.md.

Implemented world state validation and authenticated routes, same-call optional reply plans, bounded proactive timer/events and model timeout, cancellation of stale results, explicit speech/action ACKs into existing memory. Plans are never treated as completed experiences. No tool/system executor. Default disabled; only environment credentials for new calls.

Verification: final scripts/test-local.ps1 passed (865 passed, 3 skipped, 1 warning; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed. All new backend flows use fake models/worlds; HTTP security and temporary-memory-file roundtrip are real local tests. No real model/voice/movement/recording acceptance in phase 1. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/brain-phase1-final.log and brain-phase1-package.log.

Files touched: three avatar brain Python modules; app.py, app_chat_route.py, llm_runtime.py, config.py, memory.py/memory_store.py; debug JS and index include; three test files, Node runner/package check; docs/state. avatarRuntime.js and vrmRenderer.js untouched. Local main 0a06554 and private config hash unchanged.

Limits: daily/hour limits are per process and reset on restart; phase 1 does not execute plans or automatically deliver proactive speech; ACKs trust the authenticated client. See report for costs/closed vocabulary/TTL.

Delivery: push this branch and create/attach a draft PR to main, then stop for user review. GitHub/attached PR state is authoritative if publication already completed; do not create a duplicate. Never merge. Phase 2 requires explicit user notice after #217 merges: adaptive FPS, frontend executor and real 10-minute acceptance.
