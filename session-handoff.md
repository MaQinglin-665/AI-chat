# Session handoff

## Ordered integration — PR #214

User authorizes merge commits only, after full local tests and ALL CI checks. No squash/rebase/force push/main push/branch deletion/tag/release. #210 merged 71c9ebb, #211 256eff8, #212 2be017b, #213 3611e57. #213 Linux/Windows CI passed after test-only platform and UTF-8 fixes; product code not modified to bypass platform refusal.

#214 base is main. Integrating origin/main 3611e57 into codex/experience-fixes-v1. Only progress.md and session-handoff.md conflicted; both histories preserved. Feature JSON auto-merged and parses with unique IDs. Both prior handoffs are preserved in progress.md under Preserved pre-integration handoff; no extra archive files added for this merge. Runtime files auto-merged without conflict.

Full gate passed: 795 Python passed/2 skipped and all remaining checks; formerly flaky API case passed 10/10. Next: commit merge, pre-push checks/secrets and normal push, ready #214, wait for ALL CI then gh pr merge 214 --merge --admin. Final full gate on latest origin/main. Stop on any test/CI failure or non-state conflict. Prior no-merge instructions in archives are superseded by explicit user authorization.

Existing limitations: historical provider_failed cause unknown; metadata-only change verification; lock scope and new parent directory handling remain backlog. 8124 stopped; three test directories remain due automatic deletion-policy rejection. No cleanup workaround authorized.

After #214 merges, user authorizes codex/fix-api-reject-drain-body from latest main: bounded request-body drain before origin/token denial, 30 large unauthorized POST regression, complete tests and reviewed green CI before merge commit. Then full tests on latest main. Only the known API case may receive one CI rerun under this authorization.
