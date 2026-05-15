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
        if (Test-PythonCandidate $venvPython @()) {
            return @($venvPython)
        }
        Write-Host "[WARN] .venv\Scripts\python.exe exists but is not runnable; falling back to Python on PATH." -ForegroundColor Yellow
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        if (Test-PythonCandidate "python" @()) {
            return @("python")
        }
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        if (Test-PythonCandidate "py" @("-3")) {
            return @("py", "-3")
        }
    }
    throw "Python 3.10+ was not found. Run install_and_start.bat first."
}

function Test-PythonCandidate {
    param(
        [string]$Exe,
        [string[]]$ArgsPrefix
    )

    try {
        $output = & $Exe @($ArgsPrefix + @("--version")) 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        $detail = (($output | Out-String).Trim())
        if ($detail) {
            Write-Host "[WARN] Python candidate failed: $Exe $($ArgsPrefix -join ' ') ($detail)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[WARN] Python candidate failed: $Exe $($ArgsPrefix -join ' ') ($($_.Exception.Message))" -ForegroundColor Yellow
    }
    return $false
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
