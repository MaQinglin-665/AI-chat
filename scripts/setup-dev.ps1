param(
    [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Resolve-PythonCommand {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @("python")
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @("py", "-3")
    }
    throw "Python 3.10+ was not found. Install Python first, then rerun this script."
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

Write-Host "Setting up Taffy AI Desktop Pet for local development"
Write-Host "Root: $RepoRoot"

Invoke-Step "Run environment doctor" @("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "doctor.ps1"))

$python = @(Resolve-PythonCommand)
Invoke-Step "Upgrade pip" (@($python) + @("-m", "pip", "install", "--upgrade", "pip"))
Invoke-Step "Install runtime Python dependencies" (@($python) + @("-m", "pip", "install", "-r", "requirements.txt"))
Invoke-Step "Install development/test Python dependencies" (@($python) + @("-m", "pip", "install", "-r", "requirements-dev.txt"))

if (-not $SkipNpmInstall) {
    Invoke-Step "Install Node dependencies" @("npm", "install")
}

if (-not (Test-Path (Join-Path $RepoRoot "config.json"))) {
    Copy-Item -LiteralPath (Join-Path $RepoRoot "config.example.json") -Destination (Join-Path $RepoRoot "config.json")
    Write-Host ""
    Write-Host "[OK] Created config.json from config.example.json" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[OK] config.json already exists; leaving it unchanged." -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete. Next steps:"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\test-local.ps1"
Write-Host "  python scripts\first_run_check.py"
Write-Host "  .\start_electron.bat"
