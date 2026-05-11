param(
    [switch]$Dev,
    [switch]$SkipToolInstall,
    [switch]$SkipPythonDeps,
    [switch]$SkipNodeInstall,
    [switch]$SkipPreflight,
    [switch]$SkipConfigUpdate,
    [switch]$StrictPreflight
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$VenvDir = Join-Path $RepoRoot ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$script:SummaryLines = @()
$script:NpmCommand = "npm"

function Add-SummaryLine {
    param(
        [string]$Status,
        [string]$Message
    )

    $script:SummaryLines += ("[{0}] {1}" -f $Status, $Message)
}

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

function Get-VersionText {
    param([object[]]$CommandParts)

    try {
        $exe = [string]$CommandParts[0]
        $args = @($CommandParts | Select-Object -Skip 1)
        $output = & $exe @args 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        return (($output | Out-String).Trim())
    } catch {
        return $null
    }
}

function Get-MajorMinorVersion {
    param([string]$VersionText)

    if ($VersionText -match "(\d+)\.(\d+)") {
        return @([int]$Matches[1], [int]$Matches[2])
    }
    return $null
}

function Test-PythonCommand {
    param([object[]]$CommandParts)

    $version = Get-VersionText (@($CommandParts) + @("--version"))
    if (-not $version) {
        return $false
    }

    $parsed = Get-MajorMinorVersion $version
    if (-not $parsed) {
        return $false
    }

    $major = [int]$parsed[0]
    $minor = [int]$parsed[1]
    if ($major -gt 3 -or ($major -eq 3 -and $minor -ge 10)) {
        Write-Ok "Python detected: $version"
        return $true
    }

    Write-WarnLine "Python 3.10+ is required. Detected: $version"
    return $false
}

function Resolve-PythonCommand {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $cmd = @("python")
        if (Test-PythonCommand $cmd) {
            return $cmd
        }
    }

    if (Get-Command py -ErrorAction SilentlyContinue) {
        $cmd = @("py", "-3")
        if (Test-PythonCommand $cmd) {
            return $cmd
        }
    }

    return $null
}

function Test-NodeCommand {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        return $false
    }

    $version = Get-VersionText @("node", "--version")
    if (-not $version) {
        return $false
    }

    $parsed = Get-MajorMinorVersion $version
    if (-not $parsed) {
        return $false
    }

    $major = [int]$parsed[0]
    if ($major -ge 18) {
        Write-Ok "Node.js detected: $version"
        if ($major -ge 24) {
            Write-WarnLine "Node.js 20 or 22 LTS is recommended for Electron projects."
        }
        return $true
    }

    Write-WarnLine "Node.js 18+ is required. Detected: $version"
    return $false
}

function Test-NpmCommand {
    $candidates = @()
    if ($env:OS -eq "Windows_NT") {
        $candidates += "npm.cmd"
    }
    $candidates += "npm"

    $command = $null
    foreach ($candidate in $candidates) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            $command = $candidate
            break
        }
    }

    if (-not $command) {
        return $false
    }

    $version = Get-VersionText @($command, "--version")
    if ($version) {
        Write-Ok "npm detected: $version"
        $script:NpmCommand = $command
        return $true
    }
    return $false
}

function Confirm-Install {
    param([string]$Label)

    if ($SkipToolInstall) {
        return $false
    }

    $answer = Read-Host "$Label was not found. Install it with winget now? [y/N]"
    return $answer -match "^(y|yes)$"
}

function Install-WingetPackage {
    param(
        [string]$PackageId,
        [string]$Label
    )

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget was not found. Install $Label manually, then rerun this script."
    }

    Invoke-Step "Install $Label with winget" @(
        "winget",
        "install",
        "--id",
        $PackageId,
        "--exact",
        "--source",
        "winget",
        "--accept-package-agreements",
        "--accept-source-agreements"
    )
}

function Ensure-ConfigJson {
    $configPath = Join-Path $RepoRoot "config.json"
    $examplePath = Join-Path $RepoRoot "config.example.json"

    if (Test-Path $configPath) {
        Write-Ok "config.json already exists; leaving existing values in place."
        Add-SummaryLine "OK" "config.json exists."
        return
    }

    if (-not (Test-Path $examplePath)) {
        throw "config.example.json was not found."
    }

    Copy-Item -LiteralPath $examplePath -Destination $configPath
    Write-Ok "Created config.json from config.example.json"
    Add-SummaryLine "OK" "Created config.json from config.example.json."
}

function Ensure-EnvToken {
    $envPath = Join-Path $RepoRoot ".env"
    $tokenName = "TAFFY_API_TOKEN"

    if (-not (Test-Path $envPath)) {
        New-Item -ItemType File -Path $envPath -Force | Out-Null
        Write-Ok "Created .env"
    }

    $raw = Get-Content -Raw -LiteralPath $envPath -Encoding UTF8
    if ($raw -match "(?m)^\s*TAFFY_API_TOKEN\s*=") {
        Write-Ok ".env already contains TAFFY_API_TOKEN"
        Add-SummaryLine "OK" ".env contains TAFFY_API_TOKEN for the local API."
        return
    }

    $token = (([guid]::NewGuid().ToString("N")) + ([guid]::NewGuid().ToString("N")))
    $line = "$tokenName=$token"
    if ($raw -and -not $raw.EndsWith("`n")) {
        Add-Content -LiteralPath $envPath -Value "" -Encoding UTF8
    }
    Add-Content -LiteralPath $envPath -Value $line -Encoding UTF8
    Write-Ok "Generated local API token in .env"
    Add-SummaryLine "OK" "Generated TAFFY_API_TOKEN in .env."
}

function Update-ModelPathIfObvious {
    if ($SkipConfigUpdate) {
        Write-InfoLine "Skipping config.json model_path auto-detection."
        Add-SummaryLine "SKIP" "Skipped Live2D model_path auto-detection."
        return
    }

    $configPath = Join-Path $RepoRoot "config.json"
    if (-not (Test-Path $configPath)) {
        return
    }

    $config = Get-Content -Raw -LiteralPath $configPath -Encoding UTF8 | ConvertFrom-Json
    $currentModelPath = [string]($config.model_path)
    $isPlaceholder = -not $currentModelPath -or $currentModelPath -eq "/models/your_model/model3.json"
    if (-not $isPlaceholder) {
        Write-Ok "config.json model_path is already set."
        Add-SummaryLine "OK" "Live2D model_path is already set."
        return
    }

    $modelsDir = Join-Path $RepoRoot "web\models"
    if (-not (Test-Path $modelsDir)) {
        New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
    }

    $models = @(Get-ChildItem -LiteralPath $modelsDir -Recurse -Filter "*.model3.json" -File -ErrorAction SilentlyContinue | Sort-Object FullName)
    if ($models.Count -eq 1) {
        $relative = $models[0].FullName.Substring($modelsDir.Length).TrimStart("\", "/").Replace("\", "/")
        $config.model_path = "/models/$relative"
        $config | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $configPath -Encoding UTF8
        Write-Ok "Set model_path to /models/$relative"
        Add-SummaryLine "OK" "Detected one Live2D model and set model_path to /models/$relative."
        return
    }

    if ($models.Count -gt 1) {
        Write-WarnLine "Multiple Live2D models were found under web\models. Set model_path manually in config.json."
        Add-SummaryLine "ACTION" "Multiple Live2D models found. Set model_path manually in config.json."
        return
    }

    Write-WarnLine "No Live2D .model3.json found under web\models. Place a model there before launch."
    Add-SummaryLine "ACTION" "Place a Live2D .model3.json under web\models before launch."
}

function Invoke-Preflight {
    if ($SkipPreflight) {
        Write-InfoLine "Skipping first-run preflight."
        Add-SummaryLine "SKIP" "Skipped first-run preflight."
        return $null
    }

    Write-Host ""
    Write-Host "==> Run first-run preflight" -ForegroundColor Cyan
    $preflightOutput = & $VenvPython "scripts\first_run_check.py" 2>&1
    $code = $LASTEXITCODE
    foreach ($line in $preflightOutput) {
        Write-Host $line
    }
    if ($code -eq 0) {
        Add-SummaryLine "READY" "Preflight passed. You can start the desktop pet."
    } else {
        Add-SummaryLine "ACTION" "Preflight found launch blockers. Fix the [FAIL] lines above, then rerun start_electron.bat."
    }
    return $code
}

function Write-FinalSummary {
    param([object]$PreflightExitCode)

    Write-Host ""
    Write-Host "First-run result" -ForegroundColor Cyan
    foreach ($line in $script:SummaryLines) {
        Write-Host "  $line"
    }

    Write-Host ""
    if ($null -eq $PreflightExitCode) {
        Write-WarnLine "Bootstrap steps completed, but readiness was not checked because preflight was skipped."
        Write-Host "Run this before launch:"
        Write-Host "  .venv\Scripts\python.exe scripts\first_run_check.py"
        return
    }

    if ([int]$PreflightExitCode -eq 0) {
        Write-Ok "Ready to launch."
        Write-Host "Optional verification before launch:"
        Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1"
        Write-Host "Next launch:"
        Write-Host "  .\start_electron.bat"
        return
    }

    Write-WarnLine "Install/bootstrap completed, but the app is not ready to launch yet."
    Write-Host "Most common next actions:"
    Write-Host "  1. Live2D: put a .model3.json model under web\models and set model_path in config.json if auto-detection did not choose it."
    Write-Host "  2. LLM: run powershell -NoProfile -ExecutionPolicy Bypass -File scripts\configure-llm.ps1"
    Write-Host "          to choose a provider and store the API key in .env."
    Write-Host "  3. Node/Electron: if npm or node_modules is missing, install Node.js LTS and rerun this bootstrap."
    Write-Host ""
    Write-Host "After fixing the [FAIL] lines, run:"
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1"
    Write-Host "Then launch:"
    Write-Host "  .\start_electron.bat"
}

Write-Host "Xinyu AI Desktop Pet first-run bootstrap"
Write-Host "Root: $RepoRoot"
Write-Host ""

$python = Resolve-PythonCommand
if (-not $python) {
    if (Confirm-Install "Python 3.12") {
        Install-WingetPackage "Python.Python.3.12" "Python 3.12"
        $python = Resolve-PythonCommand
    }
}
if (-not $python) {
    throw "Python 3.10+ was not found. Install Python 3.10+ and rerun this script."
}
Add-SummaryLine "OK" "Python 3.10+ is available."

$nodeOk = Test-NodeCommand
if (-not $nodeOk) {
    if (Confirm-Install "Node.js LTS") {
        Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS"
    }
    $nodeOk = Test-NodeCommand
}
if (-not $nodeOk) {
    throw "Node.js 18+ was not found. Install Node.js LTS and rerun this script. If winget just installed it, open a new PowerShell window first."
}
Add-SummaryLine "OK" "Node.js 18+ is available."

$npmOk = Test-NpmCommand
if (-not $npmOk -and -not $SkipNodeInstall) {
    if (Confirm-Install "Node.js LTS with npm") {
        Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS"
        $npmOk = Test-NpmCommand
    }
}
if (-not $npmOk) {
    if ($SkipNodeInstall) {
        Write-WarnLine "npm was not found. Skipping Node dependency install because -SkipNodeInstall was set."
        Add-SummaryLine "SKIP" "npm was not found; Node dependency install was skipped."
    } else {
        throw "npm was not found. Reinstall Node.js LTS or open a new PowerShell window, then rerun this script."
    }
} else {
    Add-SummaryLine "OK" "npm is available."
}

if (-not (Test-Path $VenvPython)) {
    Invoke-Step "Create local Python virtual environment" (@($python) + @("-m", "venv", $VenvDir))
} else {
    Write-Ok "Local Python virtual environment already exists."
}

if (-not (Test-Path $VenvPython)) {
    throw "Virtual environment was not created at $VenvPython"
}
Add-SummaryLine "OK" "Local Python environment is .venv."

if (-not $SkipPythonDeps) {
    Invoke-Step "Upgrade pip in .venv" @($VenvPython, "-m", "pip", "install", "--upgrade", "pip")
    Invoke-Step "Install runtime Python dependencies" @($VenvPython, "-m", "pip", "install", "-r", "requirements.txt")
    if ($Dev) {
        Invoke-Step "Install development/test Python dependencies" @($VenvPython, "-m", "pip", "install", "-r", "requirements-dev.txt")
    }
    Add-SummaryLine "OK" "Python dependencies installed into .venv."
} else {
    Write-InfoLine "Skipping Python dependency install."
    Add-SummaryLine "SKIP" "Skipped Python dependency install."
}

if (-not $SkipNodeInstall) {
    $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
    Invoke-Step "Install Node/Electron dependencies" @($script:NpmCommand, "install", "--no-fund", "--no-audit")
    Add-SummaryLine "OK" "Node/Electron dependencies installed."
} else {
    Write-InfoLine "Skipping Node dependency install."
    Add-SummaryLine "SKIP" "Skipped Node/Electron dependency install."
}

Ensure-ConfigJson
Ensure-EnvToken
Update-ModelPathIfObvious

$preflightExitCode = Invoke-Preflight

Write-FinalSummary $preflightExitCode

if ($StrictPreflight -and $null -ne $preflightExitCode -and [int]$preflightExitCode -ne 0) {
    exit ([int]$preflightExitCode)
}
