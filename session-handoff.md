# Avatar brain context and persistent quota

Branch: codex/avatar-brain-context-v1, baseline origin/main 2b67452 (#224 merged).
Implemented backend-only context (last 3 rounds <=300 characters, <=2 local memory excerpts) and persisted daily/hourly quotas, plus env-Key-only documentation. No rendering or action execution changes.

## Verification
- Final full local gate: 908 passed, 3 skipped, 1 warning; all Node/syntax/secrets passed.
- First-run package check passed; targeted 67 passed, new suite 32 passed.
- Ignored evidence: tmp_ui_smoke/avatar-vrm-polish/brain-context-{local,package}.log.
- Fake LLM/temporary state only; no real provider or voice/animation acceptance.

## Files touched
avatar_brain_context.py, avatar_brain_usage.py, avatar_brain.py, app_avatar_brain.py, app_chat_route.py; new Python tests; package presence check, ignore rules, action docs and state files. Previous handoff archived.

## Limits and next step
Conservative filtering may omit technical context; excerpt summary can lose detail. History is repopulated by chat after restart. Unwritable/corrupt quota storage falls back to process memory, so cross-restart/shared limits cannot then be guaranteed.
Publish draft PR, stop for review. Do not merge. Frontend executor/FPS/real 10-minute acceptance await user notice about #217. Local main 0a06554 and private config unchanged; avatarRuntime.js/vrmRenderer.js untouched.

## 2026-10-26 merge authorization
User approved #227. Latest origin/main 2b67452 is already contained; no conflicts. Fresh full/package checks are running. Record the PRIVATE false-positive issue in progress.md only; do not change code. After successful local checks, push the documentation update, mark ready, wait for all CI, then use merge commit with --admin. Stop afterward; frontend phase 2 still requires user notice about #217.

Fresh validation passed: 908 passed, 3 skipped, 1 warning; all Node/syntax/secrets and first-run package smoke passed. Evidence in merge227-local.log / merge227-package.log under ignored tmp_ui_smoke/avatar-vrm-polish. Next: push, ready, await CI, authorized merge, stop.
