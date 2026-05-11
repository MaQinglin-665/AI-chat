@echo off
setlocal
cd /d %~dp0

echo Xinyu Desktop Pet - guided first run
echo =====================================
echo.
echo This entry prepares dependencies, applies the preview profile, helps you
echo configure your own LLM, runs a first-chat smoke check, then starts the app.
echo.
echo Notes:
echo - You still need to provide your own model/provider/API key.
echo - The smoke check sends a small test request to your configured model.
echo - Desktop observation, screenshots, file reads, tools, and shell execution
echo   remain disabled by default.
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prepare-preview-environment.ps1 -RunLlmConfigure -RunSmoke -StartApp
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
