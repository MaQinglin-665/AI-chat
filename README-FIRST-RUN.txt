Xinyu Desktop Pet - First Run
=============================

This is an MVP preview. It is meant to be usable for first public testing, but
it is not a mature commercial desktop product.

Normal Windows users
--------------------

Download from the GitHub release:

    Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe
    SHA256SUMS.txt

Verify the installer before running:

    Get-FileHash .\Xinyu-AI-Desktop-Pet-Setup-v1.4.0-preview.exe -Algorithm SHA256
    Get-Content .\SHA256SUMS.txt

The first public installer is unsigned. SmartScreen may show an unknown
publisher warning. Continue only if the file came from this repository release
and the SHA256 matches.

What the installer does
-----------------------

- Installs under the current user folder.
- Creates Start Menu and desktop shortcuts.
- Runs install_and_start.bat after copying files.
- Checks Python / Node.js / npm.
- Prompts to install missing runtime dependencies through winget when needed.
- Does not include a cloud model, hosted endpoint, or API key.
- Does not enable desktop observation, screenshots, file reads, tool calling,
  or shell execution by default.

First model setup
-----------------

On first launch, the chat window opens a model setup wizard if the LLM is not
complete. Fill:

    provider type
    base URL
    model
    API key env name
    API key

The default provider is openai-compatible. The default API key env name is
TAFFY_LLM_API_KEY.

The real API key is stored in local .env. Non-secret LLM settings are stored in
config.local.json. The app does not return or display the real key after saving.
After saving, it runs /api/llm_probe and shows a readable success/failure
reason.

Developer / source package path
-------------------------------

If you downloaded the source test zip or cloned the repository, run:

    install_and_start.bat

For lower-level bootstrap only:

    install_first_run.bat

Manual path:

    prepare_preview_environment.bat
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1 -SoftFail
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
    start_electron.bat

Health checks
-------------

After the backend starts:

    http://127.0.0.1:8123/healthz
    http://127.0.0.1:8123/api/health
    http://127.0.0.1:8123/api/first_run/status

/healthz is a lightweight public liveness check. /api/health and
/api/first_run/status are detailed local API summaries and obey the local API
token setting.

Live2D and voice notes
----------------------

- Put a Live2D .model3.json model under web\models\ if the packaged model is
  missing or you want to replace it.
- Keep TTS provider as browser for the first run.
- GPT-SoVITS, ASR, Ollama, and local advanced voice paths are optional.

Feedback
--------

Use the GitHub First-Run Help issue template. Remove API keys, tokens,
Authorization headers, raw prompts, raw history, private paths, and private
desktop screenshots before sharing logs.
