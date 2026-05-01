param(
    [switch]$RuntimeOnly,
    [switch]$Strict
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$script:ErrorCount = 0
$script:WarnCount = 0

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-WarnLine($Message) {
    $script:WarnCount += 1
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail($Message) {
    $script:ErrorCount += 1
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Test-RequiredPath($RelativePath) {
    $path = Join-Path $RepoRoot $RelativePath
    if (Test-Path $path) {
        Write-Ok "Found $RelativePath"
    } else {
        Write-Fail "Missing $RelativePath"
    }
}

function Get-VersionText($Command, $ArgsList) {
    try {
        $output = & $Command @ArgsList 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        return (($output | Out-String).Trim())
    } catch {
        return $null
    }
}

function Test-CommandVersion($Name, $VersionArgs, $Label) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Fail "$Label command not found: $Name"
        return $null
    }

    $version = Get-VersionText $Name $VersionArgs
    if ($version) {
        Write-Ok "$Label detected: $version"
    } else {
        Write-WarnLine "$Label command exists but version check failed: $Name"
    }
    return $version
}

function Get-MajorVersion($VersionText) {
    if (-not $VersionText) {
        return $null
    }
    if ($VersionText -match "(\d+)\.(\d+)\.(\d+)") {
        return [int]$Matches[1]
    }
    return $null
}

Write-Host "Taffy AI Desktop Pet environment doctor"
Write-Host "Root: $RepoRoot"
Write-Host ""

Write-Host "Checking project files..."
$requiredPaths = @(
    "electron",
    "web",
    "scripts",
    "package.json",
    "requirements.txt",
    "config.example.json"
)

if (-not $RuntimeOnly) {
    $requiredPaths += @(
        "tests",
        "requirements-dev.txt"
    )
}

foreach ($requiredPath in $requiredPaths) {
    Test-RequiredPath $requiredPath
}

if (-not (Test-Path (Join-Path $RepoRoot "config.json"))) {
    Write-WarnLine "config.json not found. setup-dev.ps1 can create it from config.example.json."
} else {
    Write-Ok "Found config.json"
}

Write-Host ""
Write-Host "Checking tools..."
$pythonVersion = Test-CommandVersion "python" @("--version") "Python"
if (-not $pythonVersion) {
    $pythonVersion = Test-CommandVersion "py" @("-3", "--version") "Python launcher"
}

$pythonMajor = Get-MajorVersion $pythonVersion
if ($pythonMajor -and $pythonMajor -lt 3) {
    Write-Fail "Python 3.10+ is required."
} elseif ($pythonVersion -and $pythonVersion -notmatch "3\.(10|11|12|13|14|15|16|17|18|19)") {
    Write-WarnLine "Python 3.10+ is recommended. Detected: $pythonVersion"
}

$nodeVersion = Test-CommandVersion "node" @("--version") "Node.js"
$nodeMajor = Get-MajorVersion $nodeVersion
if ($nodeMajor) {
    if ($nodeMajor -lt 18) {
        Write-Fail "Node.js 18+ is required."
    } elseif ($nodeMajor -ge 24) {
        Write-WarnLine "Node.js $nodeMajor detected. Node.js 20 or 22 LTS is recommended for Electron projects."
    }
}

Test-CommandVersion "npm" @("--version") "npm" | Out-Null

$gitVersion = Test-CommandVersion "git" @("--version") "Git"
if (-not $gitVersion) {
    Write-WarnLine "Git is optional if you downloaded the ZIP, but recommended for development."
}

Write-Host ""
if ($script:ErrorCount -eq 0) {
    Write-Ok "Doctor finished with $script:WarnCount warning(s)."
    if ($Strict -and $script:WarnCount -gt 0) {
        exit 1
    }
    exit 0
}

Write-Fail "Doctor found $script:ErrorCount error(s) and $script:WarnCount warning(s)."
Write-Host "If project folders such as tests/, web/, or electron/ are missing, download the main branch ZIP again:"
Write-Host "https://github.com/MaQinglin-665/AI-chat/archive/refs/heads/main.zip"
exit 1
