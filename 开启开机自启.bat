@echo off
setlocal
chcp 65001 >nul
cd /d %~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage_shortcuts.ps1" -Action enable_autostart
if errorlevel 1 (
  echo.
  echo 开启开机自启失败，请把错误信息发给我。
  pause
  exit /b 1
)

echo.
echo 已开启开机自启。
timeout /t 2 >nul
