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

Start the desktop pet
---------------------

Run:

    .\start_electron.bat

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
    docs\troubleshooting.md
