# AGENTS.md

## Project Context

This repository is a Windows desktop AI pet / desktop AI VTuber experiment.

The project combines:

- Electron desktop UI
- Python local service
- Live2D character rendering
- LLM conversation
- TTS / ASR voice interaction
- Emotion and motion feedback
- Low-interruption companionship

The long-term goal is not to build another generic chat window, but to explore an AI character that lives on the user's desktop: it can talk, react, express emotions, and later gain safe desktop-awareness features.

The project is currently in MVP / open-source incubation stage. Keep all documentation honest and avoid claiming the project is already a mature commercial product.

It is acceptable to mention that the project is inspired by AI VTuber directions and Neuro-sama-like interaction patterns, but do not describe the project as a direct clone or replica.

---

## Working Principles

When modifying this repository:

1. Prefer small, focused changes.
2. Avoid unrelated refactors.
3. Do not introduce new dependencies unless the task explicitly asks for them.
4. Do not change security defaults unless the task explicitly asks for it.
5. Do not remove existing important documentation without preserving the information elsewhere.
6. Keep Chinese documentation clear, practical, and friendly to open-source contributors.
7. Keep roadmap language realistic and executable.
8. When editing README, prioritize first impression, quick start clarity, and project positioning.

---

## Startup Workflow

Before writing code:

1. Read this file, `feature_list.json` / `progress.md` if present, and the relevant docs for the current feature.
2. Check `git status --short --branch` and identify unrelated local changes before editing.
3. Pick one active feature from `feature_list.json`; if the task does not match it, update the state files first.
4. Ask clarifying questions one at a time for product/design ambiguity until the goal, scope, and success criteria are clear.
5. Stay in scope: change only files needed for the active feature and its verification.

Use this restartable path when resuming a session:

1. Read `session-handoff.md` if present for blockers, touched files, and the recommended next step.
2. Read the most recent `progress.md` entry if present.
3. Re-run the smallest relevant verification before claiming inherited work is still valid.

---

## State Artifacts

- `feature_list.json`: source of truth for active/backlog feature status, dependencies, and done criteria when present.
- `progress.md`: append-only working log with current state, evidence, and next step when present.
- `session-handoff.md`: restart notes for the next agent/session when present.

Keep state updates brief. Do not rely on chat history as the only record of what is active, blocked, or done.

---

## Scope Rules

- One feature at a time.
- Do not mix role-experience work, release packaging, memory changes, and security/tooling changes in one task unless the user explicitly asks for a combined change.
- Track feature dependencies in `feature_list.json` before expanding scope.
- If a file already has unrelated edits, work around them and do not revert them.
- Security-sensitive defaults are out of scope unless the user explicitly asks to change them and the risk is documented.

---

## Verification Commands

Primary local verification:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-local.ps1
```

Harness entrypoint when present:

```bash
./init.sh
```

Targeted alternatives:

```powershell
python -m pytest -q
node scripts/run_node_tests.js
python scripts/check_python_syntax.py
python scripts/check_js_syntax.py
python scripts/check_secrets.py
```

Required before push:

```powershell
python -m json.tool config.example.json
python -m json.tool package.json
python -m py_compile app.py config.py tts.py memory.py tools.py llm_client.py asr.py emotion.py humanize.py utils.py
```

Record the command and output summary under `progress.md` as Verification Evidence before saying work is done when that file is present.

---

## Definition of Done

A feature is done only when:

1. The behavior or documentation change matches the active feature's done criteria.
2. Relevant tests/checks have been run, or skipped with a concrete reason.
3. `progress.md` records Verification Evidence and remaining risks when present.
4. `feature_list.json` status is updated when present.
5. `session-handoff.md` has a clear next step for restartability when present.
6. No unrelated files are staged or described as part of the feature.

---

## End of Session

Before ending a session:

1. Update `progress.md` with current state, files changed, verification evidence, risks, and next step when present.
2. Update `session-handoff.md` with blockers, Files touched, and Next Session recommendation when present.
3. Keep the handoff clean enough that another agent can restart without reading the full chat.

---

## Security Principles

Be especially careful with changes involving:

- Automatic desktop observation
- Screenshot capture
- Tool calling
- Shell execution
- File system access
- API keys
- User privacy data
- Logs containing secrets
- CORS / local service exposure
- Permission prompts

Default principles:

- Do not automatically observe the desktop by default.
- Do not execute shell commands by default.
- Do not read user files by default.
- Tool calling must be optional and configurable.
- High-risk operations must require user confirmation.
- Documentation must not encourage unsafe usage.

---

## Output Requirements

After completing a task, always summarize:

1. Files changed
2. What changed in each file
3. How to verify the change
4. Any risks or manual checks needed
5. Whether unrelated files were modified
