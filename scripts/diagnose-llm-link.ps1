param(
    [string]$BaseUrl,
    [int]$TimeoutSec = 14,
    [switch]$Json,
    [switch]$SoftFail
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Resolve-PythonCommand {
    $venvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        return @($venvPython)
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @("python")
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @("py", "-3")
    }
    throw "Python 3.10+ was not found. Run install_and_start.bat first."
}

$python = @(Resolve-PythonCommand)
$argsList = @("scripts\diagnose_llm_link.py", "--timeout-sec", [string]$TimeoutSec)
if ($BaseUrl) {
    $argsList += @("--base-url", $BaseUrl)
}
if ($Json) {
    $argsList += "--json"
}
if ($SoftFail) {
    $argsList += "--soft-fail"
}

& $python[0] @($python | Select-Object -Skip 1) @argsList
exit $LASTEXITCODE
