@echo off
setlocal
cd /d %~dp0

set "GPT_WAIT_MODE=%~1"
if /I "%GPT_WAIT_MODE%"=="--wait-gpt" (
  call "%~dp0ensure_gpt_sovits.bat"
) else (
  call "%~dp0ensure_gpt_sovits.bat" --no-wait
)

echo Launching Taffy AI desktop pet in dual-window desktop mode...
call "%~dp0start_electron.bat"
