@echo off
setlocal
chcp 65001 >nul
cd /d %~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage_shortcuts.ps1" -Action install
if errorlevel 1 (
  echo.
  echo 创建快捷方式失败，请把错误信息发给我。
  pause
  exit /b 1
)

echo.
echo 快捷方式已创建完成。
timeout /t 2 >nul
