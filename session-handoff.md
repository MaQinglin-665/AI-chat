# PR #224 accepted merge — 2026-10-26

User approved phase 1 and authorized merge commit after latest main integration, local/package gates and all Linux/Windows CI. Latest origin/main 79ee80f merged with conflicts ONLY in the three state files. Both histories preserved below; this current instruction supersedes their prior next-step text. No phase-2 implementation. Local main/private config must remain unchanged.

Next: finish gates, push/ready #224, wait for all checks, gh pr merge 224 --merge --admin, then stop. Phase 2 starts only after user notification that #217 has merged. Mandatory phase-2 additions are recorded in progress.md: <=300-character last-three-turn summary + 1–2 related memories; persisted local daily counter; explicit environment-key-only documentation.

## Preserved phase-1 record (historical)

# Avatar brain phase 1 — verified

Branch codex/avatar-brain-driven-v1 from origin/main ee3de6e. First phase backend complete; only a console debugger in the frontend. Report/schema/config/cost assumptions: docs/avatar-brain-actions.md.

Implemented world state validation and authenticated routes, same-call optional reply plans, bounded proactive timer/events and model timeout, cancellation of stale results, explicit speech/action ACKs into existing memory. Plans are never treated as completed experiences. No tool/system executor. Default disabled; only environment credentials for new calls.

Verification: final scripts/test-local.ps1 passed (865 passed, 3 skipped, 1 warning; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed. All new backend flows use fake models/worlds; HTTP security and temporary-memory-file roundtrip are real local tests. No real model/voice/movement/recording acceptance in phase 1. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/brain-phase1-final.log and brain-phase1-package.log.

Files touched: three avatar brain Python modules; app.py, app_chat_route.py, llm_runtime.py, config.py, memory.py/memory_store.py; debug JS and index include; three test files, Node runner/package check; docs/state. avatarRuntime.js and vrmRenderer.js untouched. Local main 0a06554 and private config hash unchanged.

Limits: daily/hour limits are per process and reset on restart; phase 1 does not execute plans or automatically deliver proactive speech; ACKs trust the authenticated client. See report for costs/closed vocabulary/TTL.

Delivery: push this branch and create/attach a draft PR to main, then stop for user review. GitHub/attached PR state is authoritative if publication already completed; do not create a duplicate. Never merge. Phase 2 requires explicit user notice after #217 merges: adaptive FPS, frontend executor and real 10-minute acceptance.


## Preserved incoming main record (historical; separate worktree)

# Painted accepted integration — 2026-10-26

Worktree ai_desktop_pet_painted; branch codex/avatar-painted-backdrop-v1. User accepted #221 and authorized main integration, full tests/package, post-merge night screenshot, ready/CI/admin merge, evidence preservation and worktree removal. Main ee3de6e includes #220/#222. Only extra conflict is metrics in vrmRenderer.js; user approved retaining walking plus painted metrics. Camera algorithm untouched. Prior handoffs archived.

Next: run camera/motion/painted tests, full gates, verify natural idle and fixed painted camera. Preserve ignored evidence before removal. Then create codex/backdrop-assets-v1 from latest main, commit authorized backgrounds and add default-off Hiyori background switch. Never read private config or use 8123.

Targeted/full/package gates and merged night capture passed; fixed camera verified across 12s. Next: push integration, mark ready and wait all Linux/Windows CI before authorized admin merge.


Verification Evidence for #224 merge: scripts/test-local.ps1 passed (876 passed, 3 skipped, 1 warning; all Node/syntax/secrets), scripts/check_first_run_package.ps1 passed. Ignored logs: tmp_ui_smoke/avatar-vrm-polish/merge224-local.log and merge224-package.log. Three state-file conflicts resolved by retaining both histories and both feature entries; active task stays avatar-brain-driven-v1. No code conflicts or extra product fixes. Next: normal push, ready, all CI, authorized merge commit, then stop awaiting user notice about #217.
