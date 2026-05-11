@echo off
setlocal
cd /d %~dp0

echo Xinyu Desktop Pet - guided first run
echo =====================================
echo.
echo This entry prepares dependencies, applies the preview profile, helps you
echo start the app, then lets the in-app first-run wizard guide LLM setup.
echo.
echo Notes:
echo - You still need to provide your own model/provider/API key.
echo - The first-run wizard opens in the app when LLM is not configured yet.
echo - Desktop observation, screenshots, file reads, tools, and shell execution
echo   remain disabled by default.
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-preview-environment.ps1 -StartApp
if errorlevel 1 (
  echo.
  echo Guided first run stopped before launch. Read the message above, fix the
  echo listed blocker, then run install_and_start.bat again.
  pause
  exit /b 1
)

echo.
echo Guided first run completed.
pause
