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
