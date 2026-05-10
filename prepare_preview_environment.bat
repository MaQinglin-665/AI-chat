@echo off
setlocal
cd /d %~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-preview-environment.ps1
if errorlevel 1 (
  echo.
  echo Preview environment setup failed. Read the error above, then run this file again.
  pause
  exit /b 1
)

echo.
echo Preview environment setup finished.
echo If LLM is not configured yet, run:
echo   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1
echo Then run:
echo   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1
echo   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1
echo   start_electron.bat
pause
