param(
    [switch]$SkipPackage,
    [switch]$SkipInstaller,
    [switch]$SkipDemoReadiness,
    [switch]$RequireDemoReadiness,
    [switch]$WithFirstChatSmoke
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
. (Join-Path $PSScriptRoot "node-runtime.ps1")

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Invoke-ReadinessStep {
    param(
        [string]$Title,
        [object[]]$CommandParts
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    $exe = [string]$CommandParts[0]
    $args = @($CommandParts | Select-Object -Skip 1)
    & $exe @args
    $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    if ($code -ne 0) {
        throw "Release readiness step failed: $Title (exit code $code)"
    }
    Write-Ok "$Title passed"
}

function Invoke-AdvisoryStep {
    param(
        [string]$Title,
        [object[]]$CommandParts
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    $exe = [string]$CommandParts[0]
    $args = @($CommandParts | Select-Object -Skip 1)
    & $exe @args
    $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    if ($code -ne 0) {
        Write-Host "[WARN] $Title reported blockers (exit code $code). Release validation continues; rerun with -RequireDemoReadiness before recording a public demo." -ForegroundColor Yellow
        return $false
    }
    Write-Ok "$Title passed"
    return $true
}

Write-Host "Xinyu Desktop Pet release readiness gate"
Write-Host "Root: $RepoRoot"

Invoke-ReadinessStep "Public encoding check" @("python", "scripts\check_encoding.py", "--public")
Invoke-ReadinessStep "Repository encoding check" @("python", "scripts\check_encoding.py")
Invoke-ReadinessStep "Python syntax check" @("python", "scripts\check_python_syntax.py")
Invoke-ReadinessStep "JavaScript syntax check" @("python", "scripts\check_js_syntax.py")
Invoke-ReadinessStep "Secret scan" @("python", "scripts\check_secrets.py")
Invoke-ReadinessStep "Node frontend tests" (@(Resolve-ProjectNodeCommand -Tool "node") + @("scripts/run_node_tests.js"))
Invoke-ReadinessStep "Python tests" @("python", "-m", "pytest", "-q")
Invoke-ReadinessStep "First-run preflight" @("python", "scripts\first_run_check.py")
Invoke-ReadinessStep "Character v1.4 quality gate" @("python", "scripts\check_character_v1_4.py")

if (-not $SkipDemoReadiness) {
    if ($RequireDemoReadiness) {
        Invoke-ReadinessStep "Demo readiness (strict)" @("python", "scripts\check_demo_readiness.py")
    } else {
        $null = Invoke-AdvisoryStep "Demo readiness advisory" @("python", "scripts\check_demo_readiness.py")
    }
} else {
    Write-Host ""
    Write-Host "[SKIP] Demo readiness advisory" -ForegroundColor Yellow
}

if (-not $SkipPackage) {
    Invoke-ReadinessStep "First-run package smoke" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\check_first_run_package.ps1"
    )
} else {
    Write-Host ""
    Write-Host "[SKIP] First-run package smoke" -ForegroundColor Yellow
}

if (-not $SkipInstaller) {
    Invoke-ReadinessStep "Installer smoke" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\check_installer_smoke.ps1"
    )
} else {
    Write-Host ""
    Write-Host "[SKIP] Installer smoke" -ForegroundColor Yellow
}

if ($WithFirstChatSmoke) {
    Invoke-ReadinessStep "First-chat smoke" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\first_chat_smoke.ps1"
    )
} else {
    Write-Host ""
    Write-Host "[SKIP] First-chat smoke (pass -WithFirstChatSmoke to include real LLM probe and chat)" -ForegroundColor Yellow
}

Invoke-ReadinessStep "Git diff whitespace check" @("git", "diff", "--check")

Write-Host ""
Write-Ok "Release readiness gate passed."
