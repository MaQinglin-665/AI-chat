@echo off
setlocal
cd /d %~dp0

set "GPT_SOVITS_DIR=D:\AI\GPT-SoVITS"
set "GPT_SOVITS_PORT=9880"
set "CONDA_EXE=C:\Users\MQL\miniconda3\Scripts\conda.exe"
set "CONDA_ENV=GPTSoVits"
set "ENV_PYTHON="
for %%p in (
  "D:\mini\envs\GPTSoVits\python.exe"
  "%USERPROFILE%\miniconda3\envs\GPTSoVits\python.exe"
  "%GPT_SOVITS_DIR%\runtime\python.exe"
) do (
  if not defined ENV_PYTHON if exist %%~p set "ENV_PYTHON=%%~p"
)

set "GPT_RUNNING="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :%GPT_SOVITS_PORT% ^| findstr LISTENING') do (
  set "GPT_RUNNING=1"
)

if defined GPT_RUNNING (
  echo GPT-SoVITS already running on port %GPT_SOVITS_PORT%.
  exit /b 0
)

if not exist "%GPT_SOVITS_DIR%\api_v2.py" (
  echo Warning: api_v2.py not found in %GPT_SOVITS_DIR%
  exit /b 0
)

if defined ENV_PYTHON (
  echo Starting local GPT-SoVITS API on port %GPT_SOVITS_PORT% using %ENV_PYTHON%...
  start "" /min cmd /c "cd /d ""%GPT_SOVITS_DIR%"" && ""%ENV_PYTHON%"" api_v2.py -a 127.0.0.1 -p %GPT_SOVITS_PORT% -c GPT_SoVITS/configs/tts_infer.yaml 1>>api_out.log 2>>api_err.log"
) else (
  if not exist "%CONDA_EXE%" (
    echo Warning: Python for %CONDA_ENV% not found and conda not found at %CONDA_EXE%
    exit /b 0
  )
  echo Starting local GPT-SoVITS API on port %GPT_SOVITS_PORT% via conda...
  start "" /min "%CONDA_EXE%" run --no-capture-output -n %CONDA_ENV% python "%GPT_SOVITS_DIR%\api_v2.py" -a 127.0.0.1 -p %GPT_SOVITS_PORT% -c "%GPT_SOVITS_DIR%\GPT_SoVITS\configs\tts_infer.yaml"
)

echo Waiting for GPT-SoVITS to initialize...
set "RETRY=0"
:wait_loop
set /a RETRY+=1
netstat -ano | findstr :%GPT_SOVITS_PORT% | findstr LISTENING >nul 2>nul
if not errorlevel 1 (
  echo GPT-SoVITS is ready.
  exit /b 0
)
if %RETRY% GEQ 30 (
  echo Warning: GPT-SoVITS did not start in time. Taffy will retry voice requests later.
  exit /b 0
)
timeout /t 2 /nobreak >nul
goto :wait_loop
