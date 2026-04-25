@echo off
setlocal
cd /d %~dp0

call "%~dp0ensure_gpt_sovits.bat"

echo Launching Taffy in dual-window desktop mode...
call "%~dp0start_electron.bat"
