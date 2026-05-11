param(
    [switch]$SkipToolInstall,
    [switch]$SkipPythonDeps,
    [switch]$SkipNodeInstall,
    [switch]$SkipPreflight,
    [switch]$SkipPreviewConfig,
    [switch]$RunLlmConfigure,
    [switch]$RunSmoke,
    [switch]$StartApp
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-InfoLine($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnLine($Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Invoke-Step {
    param(
        [string]$Title,
        [object[]]$CommandParts
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    $exe = [string]$CommandParts[0]
    $args = @($CommandParts | Select-Object -Skip 1)
    & $exe @args
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Title"
    }
}

function Resolve-PythonForCheck {
    $venvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        return $venvPython
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return "python"
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return "py"
    }
    return ""
}

function Test-LlmLooksConfigured {
    $python = Resolve-PythonForCheck
    if (-not $python) {
        return $false
    }

    $snippet = @'
import os
import sys
sys.path.insert(0, r"__TAFFY_ROOT__")
from config import load_config

cfg = load_config()
llm = cfg.get("llm", {}) if isinstance(cfg.get("llm", {}), dict) else {}
provider = str(llm.get("provider", "") or "").strip().lower()
model = str(llm.get("model", "") or "").strip()
base_url = str(llm.get("base_url", "") or "").strip()
api_key_env = str(llm.get("api_key_env", "") or "").strip()
api_key = str(llm.get("api_key", "") or "").strip()
has_key = bool(api_key or (api_key_env and os.environ.get(api_key_env, "").strip()))
needs_key = provider in {"openai", "openai-compatible", "openai_compatible"} and not base_url.startswith(("http://127.0.0.1", "http://localhost"))
print("yes" if provider and model and base_url and (has_key or not needs_key) else "no")
'@
    $tempScript = Join-Path ([System.IO.Path]::GetTempPath()) ("taffy-llm-config-check-" + [guid]::NewGuid().ToString("N") + ".py")
    try {
        Set-Content -LiteralPath $tempScript -Value ($snippet.Replace("__TAFFY_ROOT__", ($RepoRoot -replace "\\", "/"))) -Encoding UTF8
        if ($python -eq "py") {
            $output = & py -3 $tempScript 2>$null
        } else {
            $output = & $python $tempScript 2>$null
        }
        return (($output | Select-Object -Last 1) -eq "yes")
    } catch {
        return $false
    } finally {
        if (Test-Path $tempScript) {
            Remove-Item -LiteralPath $tempScript -Force
        }
    }
}

Write-Host "Xinyu preview environment setup"
Write-Host "Root: $RepoRoot"
Write-Host ""
Write-InfoLine "This script prepares Python/Node dependencies and the Xinyu preview profile."
Write-InfoLine "It does not choose a cloud model or write an API key unless you explicitly run configure-llm."

$bootstrapArgs = @(
    "scripts\bootstrap-first-run.ps1"
)
if ($SkipToolInstall) { $bootstrapArgs += "-SkipToolInstall" }
if ($SkipPythonDeps) { $bootstrapArgs += "-SkipPythonDeps" }
if ($SkipNodeInstall) { $bootstrapArgs += "-SkipNodeInstall" }
if ($SkipPreflight) { $bootstrapArgs += "-SkipPreflight" }

$bootstrapCommand = @(
    "powershell",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File"
) + $bootstrapArgs
Invoke-Step "Install/check local runtime dependencies" $bootstrapCommand

if (-not $SkipPreviewConfig) {
    Invoke-Step "Apply Xinyu preview experience profile" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\apply-preview-experience-config.ps1"
    )
} else {
    Write-WarnLine "Skipped preview profile application."
}

if ($RunLlmConfigure) {
    Invoke-Step "Configure user-selected LLM" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\configure-llm.ps1"
    )
}

$llmConfigured = Test-LlmLooksConfigured
Write-Host ""
if ($llmConfigured) {
    Write-Ok "LLM configuration appears present."
    Write-Host "Recommended validation:"
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1"
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1"
} else {
    Write-WarnLine "LLM is not fully configured yet."
    Write-Host "Choose your own provider/model/key with:"
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1"
    Write-Host "Model selection guide:"
    Write-Host "  docs\model-selection.md"
}

if ($RunSmoke) {
    Invoke-Step "Run first chat smoke" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\first_chat_smoke.ps1"
    )
}

if ($StartApp) {
    Invoke-Step "Start Xinyu desktop app" @("cmd", "/c", "start_electron.bat")
}

Write-Host ""
Write-Ok "Preview environment setup complete."
Write-Host "Launch when ready:"
Write-Host "  .\start_electron.bat"
