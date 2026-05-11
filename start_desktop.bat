@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "LAUNCHER_LOG=%~dp0launcher_desktop.log"
set "ELECTRON_LOG=%~dp0launcher_electron.log"
>>"%LAUNCHER_LOG%" echo.
>>"%LAUNCHER_LOG%" echo ==== start_desktop %DATE% %TIME% ====

set "GPT_WAIT_MODE=%~1"
if /I "%GPT_WAIT_MODE%"=="--wait-gpt" (
  >>"%LAUNCHER_LOG%" echo Starting GPT-SoVITS with wait mode...
  call "%~dp0ensure_gpt_sovits.bat"
) else (
  >>"%LAUNCHER_LOG%" echo Starting GPT-SoVITS in background...
  call "%~dp0ensure_gpt_sovits.bat" --no-wait
)
set "GPT_EXIT=%ERRORLEVEL%"
>>"%LAUNCHER_LOG%" echo GPT-SoVITS launcher exit code: %GPT_EXIT%

>>"%LAUNCHER_LOG%" echo Starting Electron desktop app in a separate process...
start "Taffy Desktop Pet" /min "%ComSpec%" /d /c "call ""%~dp0start_electron.bat"" >> ""%ELECTRON_LOG%"" 2>&1"
if errorlevel 1 (
  >>"%LAUNCHER_LOG%" echo Failed to spawn Electron startup command.
  exit /b 1
)

>>"%LAUNCHER_LOG%" echo Electron startup command spawned. See launcher_electron.log for details.
exit /b 0
