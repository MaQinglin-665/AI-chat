# Contributing Guide

Thanks for contributing to AI-chat.

## Development Workflow

1. Create a branch from `main`:
   - `feat/<short-name>` for new features
   - `fix/<short-name>` for bug fixes
   - `chore/<short-name>` for maintenance
2. Keep PRs small and focused.
3. Run checks locally before opening a PR.

## Local Checks

Run the following in repository root:

```powershell
python -m pytest -q
node tests/test_drag_logic.js
python scripts/check_python_syntax.py
python scripts/check_js_syntax.py
python scripts/check_secrets.py
```

If docs changed:

```powershell
cd docs
npm run check:all
```

## Security and Secrets

- Never commit real keys/tokens.
- Keep `.env` local only.
- Use environment variables for runtime secrets (`TAFFY_API_TOKEN`, `OPENAI_API_KEY`, etc.).
- If a key is exposed, rotate it immediately.

## Pull Requests

- Use clear commit messages (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`).
- Fill in the PR template with validation and risk notes.
- Ensure all CI checks pass before merge.
