# Session handoff

## Current task: stage feedback / onboarding completed; isolated experience RUNNING

Date: 2026-10-24 (America/Los_Angeles).
Branch: codex/stage-feedback-onboarding-v1, created from origin/codex/external-agent-codex-cli-v1 at f7b06a0. Fetch was unavailable (DNS); this origin ref is the exact head pushed in the preceding task. No push or PR authorized for task 4. User requests local commit and a running browser-only instance.

## Changes

- Narrow conversation rail gets a definite height; fixes zero-height absolute chat grid while preserving lane collapse.
- New stage feedback module/CSS: 600ms no-first-text wait, errors/auth guidance and doctor action, request generation guard, one-time startup warning. API auth logic remains intact. No chat.js/chatReplyController.js edits.
- Onboarding has one primary action, secondary configuration/skip links, first step clears the input area and focuses input; first-run config avoids stacked guide overlays.
- Galgame uses Phosphor book mask; full-stage model reserves header/composer/toolbar space. Narrow opacity .82 is intentional ambience and remains unchanged.
- scripts/isolated_experience.py constructs configuration without loading daily config/.env and checks persistent paths before server startup.

## Verification

- scripts/test-local.ps1 passed: 784 Python tests, 1 Windows symlink-privilege skip, one existing audioop warning; all Node tests, Python/JS syntax and secret scan. New frontend state tests included.
- Real Edge with synthetic API: 774px/516px lanes both 0px before -> 206px after; collapse, states/clear/auth, startup warning and usable input with guide verified.
- Real isolated browser: status idle, no page JS errors, no failure banner. Real DeepSeek lightweight probe succeeded in 1531ms.
- Before/after screenshots are ignored under tmp_ui_smoke/. See docs/stage-feedback-verification.md for names/causes; docs/first-install.md describes the new flow.

## Live instance — leave running

- URL: http://127.0.0.1:8124/?view=full ; health: http://127.0.0.1:8124/healthz (200).
- PID: 37668, listening only 127.0.0.1:8124. No Electron started and daily pet not stopped.
- Data root: D:/AI/.tools/stage4-experience-20261024 (outside repository).
- Workspace: data root/workspace; hello.txt, notes.txt, sales.csv, colors.csv, README.md, ideas.md are six disposable synthetic files.
- Only this instance has require_api_token=false; official DeepSeek environment Key, browser TTS, isolated Codex CLI 0.164.0 and allowed_roots limited to workspace.
- instance.json in data root lists PID/address and verified persistence paths (memory/relationship/learning/audit/emotion/shared experience/desktop state); vault and mem0 also point inside data root.
- Stop command: taskkill /PID 37668 /T /F. Confirm PID still belongs to isolated_experience.py before using it after a long delay.
- Only after user says 体验结束: stop owned process tree, verify it is stopped, then resolve and verify the exact test root remains under D:/AI/.tools before cleanup. Do not touch other test roots or daily data. Do not automatically stop at turn end.

## Next / limitations

Wait for user experience feedback. No push, PR, main update or automatic rebase. Task brief says rebase after #213 merges; that remains a future step, not performed here.
The two accepted external-agent verification improvements remain backlog, unchanged. See feature_list.json. Synthetic browser tests do not prove every TTS provider or Windows packaging case. Screen captures are intentionally untracked.
Earlier handoff preserved at docs/archive/2026-10-24-external-agent-published-handoff.md.
