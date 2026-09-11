param(
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$ConfigPath = Join-Path $RepoRoot "config.local.json"
$QwenLogPath = Join-Path $RepoRoot "qwen3_tts_out.log"
$QwenErrorLogPath = Join-Path $RepoRoot "qwen3_tts_err.log"

try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
} catch {
    # Older hosts may not allow changing the console encoding.
}

function Write-Step([string]$Message) {
    Write-Host "[START] $Message" -ForegroundColor Cyan
}

function Write-Good([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Notice([string]$Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

function Test-LocalEndpoint([string]$Url) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 1
        return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500
    } catch {
        return $false
    }
}

Set-Location -LiteralPath $RepoRoot
Write-Host ""
Write-Host "Xinyu AI Desktop Pet Launcher" -ForegroundColor Magenta
Write-Host "Project: $RepoRoot"
Write-Host ""

Write-Step "Checking project files and local configuration"
foreach ($required in @("package.json", "electron\main.js", "app.py", "config.json")) {
    $requiredPath = Join-Path $RepoRoot $required
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required file is missing: $requiredPath"
    }
}

if (Test-Path -LiteralPath $ConfigPath -PathType Leaf) {
    $localConfig = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $provider = [string]$localConfig.tts.provider
    $managed = $localConfig.tts.auto_start_local_provider -eq $true
    if ($provider -eq "qwen3_tts" -and $managed) {
        Write-Good "Qwen3-TTS is configured for Electron-managed startup"
    } else {
        Write-Notice "Managed Qwen3-TTS is not enabled; Electron will use the current configuration"
    }
} else {
    Write-Notice "config.local.json was not found; Electron will use shared configuration"
}

. (Join-Path $PSScriptRoot "node-runtime.ps1")
$npmCommand = @(Resolve-ProjectNodeCommand -Tool "npm")
$npmExecutable = [string]$npmCommand[0]
if (-not (Get-Command $npmExecutable -ErrorAction SilentlyContinue)) {
    throw "npm launcher is unavailable: $npmExecutable"
}
Write-Good "Node/Electron launcher is available: $npmExecutable"

if (Test-LocalEndpoint "http://127.0.0.1:8123/healthz") {
    Write-Notice "The desktop-pet backend is already running; an existing app window will be focused"
}
if (Test-LocalEndpoint "http://127.0.0.1:9881/health") {
    Write-Notice "Qwen3-TTS is already running; Electron will reuse it"
}

Write-Host "Qwen output log: $QwenLogPath"
Write-Host "Qwen error log: $QwenErrorLogPath"

if ($CheckOnly) {
    Write-Good "Launcher preflight passed"
    exit 0
}

Write-Step "Starting Electron, the Python backend, and Qwen3-TTS"
Write-Notice "The first local voice-model load may take tens of seconds; keep this window open for logs"
Write-Host ""

try {
    & $npmExecutable run start:electron
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Electron launcher exited with code $exitCode"
    }
    Write-Notice "The desktop pet has closed. This log window will remain open."
} catch {
    Write-Host ""
    Write-Host "[FAILED] $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path -LiteralPath $QwenErrorLogPath -PathType Leaf) {
        Write-Host ""
        Write-Host "Recent Qwen error log:" -ForegroundColor Yellow
        Get-Content -LiteralPath $QwenErrorLogPath -Tail 20 -ErrorAction SilentlyContinue
    }
    throw
}
