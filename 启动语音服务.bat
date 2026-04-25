@echo off
chcp 65001 >nul
echo ========================================
echo   启动 GPT-SoVITS 语音服务
echo ========================================
echo.

cd /d "D:\AI\GPT-SoVITS"

REM Try api_v2.py first, fallback to api.py
if exist "api_v2.py" (
    echo 正在启动 GPT-SoVITS API v2 ...
    python api_v2.py -a 127.0.0.1 -p 9880
) else if exist "api.py" (
    echo 正在启动 GPT-SoVITS API v1 ...
    python api.py -a 127.0.0.1 -p 9880
) else (
    echo 错误: 未找到 GPT-SoVITS API 文件
    pause
    exit /b 1
)

pause
