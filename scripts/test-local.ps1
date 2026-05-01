param(
    [switch]$SkipPytest,
    [switch]$SkipNodeDragTest
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
    throw "Python 3.10+ was not found."
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

$python = @(Resolve-PythonCommand)

Invoke-Step "Run environment doctor" @("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "doctor.ps1"))

if (-not $SkipPytest) {
    Invoke-Step "Run Python tests" (@($python) + @("-m", "pytest", "-q"))
}

if (-not $SkipNodeDragTest) {
    Invoke-Step "Run drag logic JavaScript test" @("node", "tests/test_drag_logic.js")
}

Invoke-Step "Check Python syntax" (@($python) + @("scripts/check_python_syntax.py"))
Invoke-Step "Check JavaScript syntax" (@($python) + @("scripts/check_js_syntax.py"))
Invoke-Step "Check committed secrets" (@($python) + @("scripts/check_secrets.py"))

Write-Host ""
Write-Host "[OK] Local validation complete." -ForegroundColor Green
