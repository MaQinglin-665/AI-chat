# Avatar brain executor handoff

Worktree: D:/AI/ai_desktop_pet_brain_exec; branch codex/avatar-brain-executor-v1, baseline 9d09edc (#217 merged). Local main remains 0a06554. Never read/change config.local.json or the original ai_desktop_pet checkout.

VRM cadence is a separate commit 5125627. Front-end queue/world polling, existing-world execution, speech bridge and terminal ACK are in 1ebd5ea; companion-point completion gets a follow-up fix. See docs/avatar-brain-executor.md and docs/avatar-brain-actions.md.

935 Python passed / 3 skipped, all Node/syntax/secrets; first-run package, installer, docs publish and 4 browser checks passed. Final test/CI status is in PR. No npm ci; dependencies copied. The guide wait fix only changes the docs browser test.

Real DeepSeek daily acceptance: complete 600-second run in 612.56-second local-only silent WebM; 5 requests / 4550 tokens, 8 completed actions, 1 interrupted action, no queue timeout or browser exception. Two initial user replies displayed empty-model-content errors; third reply and its actions succeeded. Active speech was not chosen by the proactive model. Do not overstate this as flawless voice/LLM acceptance. Room tested live; other scene restrictions tested automatically.

Private evidence: tmp_ui_smoke/brain-executor/acceptance.json and video/page@cdaf0c9269238c004d33ea5a04a27d95.webm. Never upload these model-bearing images/videos to the PR. Earlier trial folders are failed/discarded evidence, not final acceptance.

Draft PR only, do not merge. Author visual review and follow-up diagnosis of empty model replies remain. Preserve inherited pending PRIVATE-regex false-positive follow-up; do not expand scope into that change here.
