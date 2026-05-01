@echo off
setlocal
cd /d %~dp0

if not exist config.json (
  copy /Y config.example.json config.json >nul
  echo Created config.json from config.example.json
)

if not exist scripts\first_run_check.py (
  echo Missing scripts\first_run_check.py.
  echo This folder does not look like a complete project checkout.
  echo Download the current main branch again:
  echo https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip
  pause
  exit /b 1
)

set "PYTHON_CMD=python"
python --version >nul 2>nul
if errorlevel 1 (
  py -3 --version >nul 2>nul
  if errorlevel 1 (
    echo Python 3.10+ was not found.
    echo Install Python first, then run start_electron.bat again.
    pause
    exit /b 1
  )
  set "PYTHON_CMD=py -3"
)

%PYTHON_CMD% scripts\first_run_check.py
if errorlevel 1 (
  echo.
  echo Startup preflight found blockers. Fix the issue above, then run start_electron.bat again.
  pause
  exit /b 1
)

rem Do not kill port 8123 here.
rem Each Electron instance manages its own backend lifecycle, and force-killing
rem the port on re-launch can terminate an already-running healthy backend.

if not exist node_modules\electron\dist\electron.exe (
  echo Installing Electron runtime...
  set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
  npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    echo npm install failed. Check your network, npm mirror, or Node.js version.
    echo You can also run:
    echo   powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
    pause
    exit /b 1
  )
)

node node_modules\electron\cli.js electron\main.js
if errorlevel 1 (
  echo.
  echo Electron exited with an error.
  echo Run this for a fuller local validation:
  echo   powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1
  pause
  exit /b 1
)
