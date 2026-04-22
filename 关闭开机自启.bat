@echo off
setlocal
chcp 65001 >nul
cd /d %~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage_shortcuts.ps1" -Action disable_autostart
if errorlevel 1 (
  echo.
  echo 关闭开机自启失败，请把错误信息发给我。
  pause
  exit /b 1
)

echo.
echo 已关闭开机自启。
timeout /t 2 >nul
