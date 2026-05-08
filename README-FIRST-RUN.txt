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
    docs\setup.md
    docs\backend-health.md
    docs\startup-failure-examples.md
    docs\release-readiness.md
    docs\troubleshooting.md
    docs\manual-qa.md
