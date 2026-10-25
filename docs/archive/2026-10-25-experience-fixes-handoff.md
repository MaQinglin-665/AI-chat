# Session handoff

## Task 6 experience fixes — local only

Branch `codex/experience-fixes-v1`, based on task 5 `541f881`. Do not push or create PR. Task 5 handoff archived at docs/archive/2026-10-24-visual-polish-handoff.md.

## Results / touched files

Chinese model replies survive the brain guards; sentence-level removal and one corrected model retry replace stock persona answers. Auto language follows user; explicit English setting remains. Default expanded conversation with persistent manual collapse; independent latest-reply bubble; narrow layout and dark onboarding. Move-aware task cards and metadata verification, sanitized provider diagnostic details, sticky status and one retry button. Full module and test list: docs/experience-fixes-verification.md.

## Evidence and unresolved issue

Final gate evidence is recorded in progress.md and verification report. Real DeepSeek five Chinese turns recorded verbatim. Original failed external-task wording rerun with independent Codex 0.164.0: six moves, two new directories, no out_of_plan or missing operation. Historical provider_failed did NOT reproduce; old logs discarded the details, so original cause remains unknown. Do not claim that root cause was fixed. Diagnostic details now support the next failure investigation.

Browser matrix uses real Edge with synthetic messages/task cards; no new Electron or human audio acceptance. Seven ignored screenshots in tmp_ui_smoke/task6/. Metadata-only move inference is not a content hash. Two previously accepted backend followups remain backlog (scan outside lock; planned parent directory handling).

## Running isolated instance — keep alive

- http://127.0.0.1:8124/?view=full ; /healthz 200, loopback only.
- Latest code restarted, PID 5620. Stop: `taskkill /PID 5620 /T /F` (verify process ownership if PID may be stale).
- Data root D:/AI/.tools/stage4-experience-20261024, persistence stays isolated; daily 8123 untouched.
- workspace restored to hello.txt, notes.txt, sales.csv, colors.csv, README.md, ideas.md, original bytes checked, no child folders.
- Execution evidence archived in sibling workspace-task6-run1 / workspace-task6-run2; no deletion needed.
- Key only from environment, CLI 0.164.0 independent installation; global CLI unchanged.

## Next

Claude/user review the running instance. Do not automatically stop it, push, or claim historical provider root cause resolved. If failure recurs, inspect the sanitized task.error.detail and local debug log. Only clean test roots after user ends the experience.
