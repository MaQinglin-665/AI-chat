@echo off
setlocal

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8123 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>nul
)
taskkill /F /IM electron.exe >nul 2>nul

echo Desktop pet stopped (port 8123 released).
timeout /t 1 >nul
