@echo off
setlocal
cd /d %~dp0

call "%~dp0ensure_gpt_sovits.bat"
call "%~dp0start_desktop.bat"
