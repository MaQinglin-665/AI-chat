@echo off
setlocal
cd /d %~dp0

if not exist config.json (
  copy /Y config.example.json config.json >nul
  echo Created config.json from config.example.json
)

set "LLM_PROVIDER="
for /f "usebackq delims=" %%p in (`python -c "import json,pathlib; p=pathlib.Path('config.json'); d=json.loads(p.read_text(encoding='utf-8')); print(str(d.get('llm',{}).get('provider','openai')).lower())"`) do set "LLM_PROVIDER=%%p"
if "%LLM_PROVIDER%"=="" set "LLM_PROVIDER=openai"

if /I not "%LLM_PROVIDER%"=="ollama" if "%OPENAI_API_KEY%"=="" (
  echo OPENAI_API_KEY is not set.
  echo Set it in this terminal first:
  echo   set OPENAI_API_KEY=your_key_here
  echo.
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8123 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>nul
)

python app.py
