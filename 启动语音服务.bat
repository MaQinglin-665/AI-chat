@echo off
chcp 65001 >nul
echo ========================================
echo   启动 GPT-SoVITS 语音服务
echo ========================================
echo.

cd /d "D:\AI\GPT-SoVITS"

set "PY_EXE="
if exist "D:\mini\envs\GPTSoVits\python.exe" set "PY_EXE=D:\mini\envs\GPTSoVits\python.exe"
if not defined PY_EXE if exist "%USERPROFILE%\miniconda3\envs\GPTSoVits\python.exe" set "PY_EXE=%USERPROFILE%\miniconda3\envs\GPTSoVits\python.exe"
if not defined PY_EXE if exist "D:\AI\GPT-SoVITS\runtime\python.exe" set "PY_EXE=D:\AI\GPT-SoVITS\runtime\python.exe"
if not defined PY_EXE set "PY_EXE=python"

echo 使用 Python: %PY_EXE%

REM Try api_v2.py first, fallback to api.py
if exist "api_v2.py" (
    echo 正在启动 GPT-SoVITS API v2 ...
    "%PY_EXE%" api_v2.py -a 127.0.0.1 -p 9880
) else if exist "api.py" (
    echo 正在启动 GPT-SoVITS API v1 ...
    "%PY_EXE%" api.py -a 127.0.0.1 -p 9880
) else (
    echo 错误: 未找到 GPT-SoVITS API 文件
    pause
    exit /b 1
)

pause
