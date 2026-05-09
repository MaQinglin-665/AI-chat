@echo off
setlocal
cd /d %~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap-first-run.ps1
if errorlevel 1 (
  echo.
  echo First-run bootstrap failed. Read the error above, then run install_first_run.bat again.
  pause
  exit /b 1
)

echo.
echo Bootstrap finished. If the summary says READY, run start_electron.bat.
echo If it says ACTION, fix the listed blockers first.
pause
