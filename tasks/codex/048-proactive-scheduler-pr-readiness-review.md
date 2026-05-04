# Task 048: Proactive scheduler PR readiness review

## Scope Reviewed

- Branch: `codex/proactive-scheduler-polling-skeleton`
- Baseline commit: `4092aa9`
- Reviewed commit chain (Task 040~047):
  - `ac250b8` Task 040
  - `66dec6b` Task 041
  - `2c2fea4` Task 042
  - `e027604` Task 043
  - `c7e25db` Task 044
  - `00da099` Task 045
  - `f2d741b` Task 046
  - `4092aa9` Task 047

## Safety Assertions

1. Default-off posture remains intact:
   - `conversation_mode.enabled=false`
   - `proactive_enabled=false`
   - `proactive_scheduler_enabled=false`
2. Auto trigger remains gated:
   - Polling only runs when three switches are all true.
   - Trigger attempt only happens after `poll_ready`.
   - Trigger path reuses `runProactiveSchedulerManualTick()` guard chain.
3. Guarded follow-up path remains intact:
   - `skipDesktopAttach: true` remains present in guarded follow-up request options.
4. No unsafe capability expansion detected:
   - No new automatic screenshot path.
   - No new tool-calling path.
   - No new file-reading path.
   - No new direct `requestAssistantReply` call site outside existing guarded path.

## Verification Commands

Run from repo root:

```bash
git status --short --branch
node --check web/chat.js
python -m py_compile config.py
python -m json.tool config.example.json
git diff --check
```

## Known Residual Risk

- Task 047 conclusion is `partial`, not `pass`.
- Remaining gap is runtime Electron/DevTools event timeline capture for live kill-switch and exception timing (C/D scenarios), which still needs manual controlled replay evidence on the same machine/session.

## Rollback Suggestion

If any regression appears during PR review or staging:

1. Immediate kill-switch:
   - Set any of:
     - `conversation_mode.enabled=false`
     - `conversation_mode.proactive_enabled=false`
     - `conversation_mode.proactive_scheduler_enabled=false`
2. If needed, revert this feature line to pre-Task-044 behavior:
   - fallback target: Task 043 (`e027604`) polling skeleton without limited auto trigger.
3. Keep fail-closed as the default safety posture throughout rollback.

## PR Description Draft

### Summary
- Add proactive scheduler groundwork from Task 040 to Task 047, including:
  - config skeleton and normalization
  - scheduler state and debug snapshot visibility
  - manual scheduler tick guard path
  - disabled-by-default polling skeleton
  - limited auto trigger smoke via guarded manual tick path
  - kill-switch stop/blocked diagnostics and fail-closed exception handling
  - controlled integration checkpoint documentation and run record

### Safety / Default-off Posture
- Default remains fail-closed.
- Polling requires all three switches enabled:
  - `conversation_mode.enabled=true`
  - `proactive_enabled=true`
  - `proactive_scheduler_enabled=true`
- Auto trigger attempts only after `poll_ready`.
- Trigger path reuses existing guarded manual tick/follow-up flow and does not add a direct unsafe execution path.
- No new automatic screenshot/tool-calling/file-reading behavior.

### Verification
- `git status --short --branch`
- `node --check web/chat.js`
- `python -m py_compile config.py`
- `python -m json.tool config.example.json`
- `git diff --check`

### Residual Risk / Follow-up
- Current controlled integration record is `partial` due to missing live Electron/DevTools runtime timeline evidence for kill-switch and injected exception timing scenarios.
- Follow-up: run one full manual controlled replay and append concrete event timelines to validation log.

### Rollback
- Immediate rollback by turning off any key switch (`enabled` / `proactive_enabled` / `proactive_scheduler_enabled`) to stop polling quickly.
- If broader rollback is needed, revert the proactive auto-trigger line back to Task 043 polling-only behavior.
