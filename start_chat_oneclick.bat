@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "SERVER_URL=http://127.0.0.1:8123"
set "CHAT_URL=%SERVER_URL%/?view=chat"
set "FINAL_URL=%CHAT_URL%"
set "WAIT_OK="

call :probe_health
if defined WAIT_OK goto prepare_url

call :start_backend
call :wait_ready 45
if defined WAIT_OK goto prepare_url

call :restart_backend
call :wait_ready 30

:prepare_url
for /f "usebackq tokens=1,2 delims=|" %%a in (`powershell -NoProfile -Command "$cfgPath = Join-Path '%PROJECT_DIR%' 'config.json'; if (-not (Test-Path -LiteralPath $cfgPath)) { exit 0 }; try { $cfg = Get-Content -Raw -LiteralPath $cfgPath | ConvertFrom-Json } catch { exit 0 }; $server = $cfg.server; if ($null -eq $server) { exit 0 }; $require = [bool]$server.require_api_token; if (-not $require) { exit 0 }; $envName = [string]$server.api_token_env; if ([string]::IsNullOrWhiteSpace($envName)) { $envName = 'TAFFY_API_TOKEN' }; $token = [string][Environment]::GetEnvironmentVariable($envName, 'Process'); if ([string]::IsNullOrWhiteSpace($token)) { $token = [string][Environment]::GetEnvironmentVariable($envName, 'User') }; if ([string]::IsNullOrWhiteSpace($token)) { $token = [string][Environment]::GetEnvironmentVariable($envName, 'Machine') }; if ([string]::IsNullOrWhiteSpace($token)) { Write-Output ('MISSING|' + $envName); exit 0 }; Add-Type -AssemblyName System.Web; $encoded = [System.Web.HttpUtility]::UrlEncode($token); Write-Output ('TOKEN|' + $encoded);"`) do (
  if /I "%%a"=="TOKEN" set "FINAL_URL=%CHAT_URL%&api_token=%%b"
  if /I "%%a"=="MISSING" set "MISSING_TOKEN_ENV=%%b"
)

start "" "%FINAL_URL%"

if defined MISSING_TOKEN_ENV (
  echo [WARN] server.require_api_token=true, but env %MISSING_TOKEN_ENV% is empty.
  echo [WARN] Chat page opened, but API calls may be blocked until token is set.
)

if not defined WAIT_OK (
  echo [WARN] Backend did not report ready in time; page opened anyway.
)

exit /b 0

:start_backend
start "馨语AI桌宠 Backend" /min cmd /c ""%PROJECT_DIR%\start.bat""
timeout /t 1 /nobreak >nul
exit /b 0

:restart_backend
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8123 ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>nul
)
timeout /t 1 /nobreak >nul
call :start_backend
exit /b 0

:probe_health
set "WAIT_OK="
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%SERVER_URL%/healthz' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 set "WAIT_OK=1"
exit /b 0

:wait_ready
set "WAIT_OK="
set "MAX_RETRY=%~1"
if "%MAX_RETRY%"=="" set "MAX_RETRY=30"
for /l %%i in (1,1,%MAX_RETRY%) do (
  call :probe_health
  if defined WAIT_OK exit /b 0
  timeout /t 1 /nobreak >nul
)
exit /b 0
