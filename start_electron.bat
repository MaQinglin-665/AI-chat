@echo off
setlocal
cd /d %~dp0

if not exist config.json (
  copy /Y config.example.json config.json >nul
  echo Created config.json from config.example.json
)

rem Do not kill port 8123 here.
rem Each Electron instance manages its own backend lifecycle, and force-killing
rem the port on re-launch can terminate an already-running healthy backend.

if not exist node_modules\electron\dist\electron.exe (
  echo Installing Electron runtime...
  set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
  npm install --no-fund --no-audit
)

node node_modules\electron\cli.js electron\main.js
