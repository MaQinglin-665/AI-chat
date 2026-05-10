Taffy AI Desktop Pet - First Run
================================

This is an early tester/developer package, not a finished installer.

Before running
--------------

Install:

1. Windows 10/11
2. Python 3.10+ (Python 3.11 or 3.12 recommended)
3. Node.js 18+ (Node.js 20 or 22 LTS recommended)

First checks
------------

Open PowerShell in this folder and run:

    powershell -ExecutionPolicy Bypass -File scripts\doctor.ps1

If it says tests/, web/, or electron/ is missing, this is not a complete
source package. Download the current main branch again:

    https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip

Recommended first-run bootstrap
-------------------------------

For the easiest first run, double-click:

    install_first_run.bat

Or run:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap-first-run.ps1

The bootstrap creates a local .venv, installs Python runtime dependencies,
installs Node/Electron dependencies, creates config.json if needed, generates a
local TAFFY_API_TOKEN in .env, and runs the same read-only preflight used before
launch.

If the bootstrap finishes with READY, run start_electron.bat. If it finishes
with ACTION, the dependency setup completed but launch still needs the listed
[FAIL] items fixed, most often Live2D model_path or LLM API key/model settings.

If the remaining blocker is LLM configuration, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1

The LLM helper writes provider/model settings to config.local.json and stores
API keys in .env. It does not write API keys into config JSON.

To try the current Taffy AI VTuber preview profile, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\apply-preview-experience-config.ps1

This keeps your LLM provider/base URL/model/api_key_env, switches the local
character profile to English Taffy, enables Character Runtime cues, and keeps
desktop observation, screenshots, tools, and shell disabled.

After LLM configuration, you can verify the first chat path before opening the
desktop windows:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1

The smoke check runs preflight, starts or detects the backend, checks /healthz
and /api/health, then sends a lightweight LLM probe and one short /api/chat
request. Use -SkipLlmProbe or -SkipChat if you want to avoid that request.

If the smoke check fails at /api/llm_probe or returns HTTP 500, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1

The diagnostic report is read-only and hides API keys, raw prompts, raw
history, Authorization headers, and private local files.

If Python or Node.js is missing, the script can ask whether to install it with
winget. If winget changes PATH, open a new PowerShell window and rerun the
bootstrap.

Developer setup
---------------

Run:

    powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
    powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1

Preflight before launch
-----------------------

After placing a Live2D model and setting model_path, run:

    python scripts\first_run_check.py

This read-only preflight checks config loading, Live2D path, Python and Node
dependencies, server port, LLM key/model settings, optional local Ollama or
GPT-SoVITS ports, and safety defaults.

Start the desktop pet
---------------------

Run:

    .\start_electron.bat

start_electron.bat runs the same preflight before Electron starts. If it stops,
read the [FAIL] lines first. Common blockers are missing Python/Node/Electron
dependencies, a placeholder Live2D model_path, missing LLM API key, wrong model
name, or a GPT-SoVITS URL that points to a service that is not running.

Health checks
-------------

After the backend starts:

    http://127.0.0.1:8123/healthz
    http://127.0.0.1:8123/api/health

/healthz is a lightweight public liveness check. /api/health is the detailed
self-check for config, Live2D, LLM, TTS, ASR, and readiness. If
server.require_api_token is enabled, /api/health requires X-Taffy-Token.

Live2D and LLM notes
--------------------

- Put a Live2D .model3.json model under web\models\.
- Set model_path in config.json.
- Keep TTS provider as browser for the first run.
- Keep API keys in environment variables, not in committed files.
- Desktop observation and shell tools are opt-in and should stay disabled by default.

If you only want to inspect the project, read:

    README.md
    THIRD_PARTY_NOTICES.md
    docs\setup.md
    docs\backend-health.md
    docs\startup-failure-examples.md
    docs\release-readiness.md
    docs\troubleshooting.md
    docs\manual-qa.md
