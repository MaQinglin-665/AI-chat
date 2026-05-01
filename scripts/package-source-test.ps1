param(
    [string]$Version,
    [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Get-PackageVersion {
    if ($Version) {
        return $Version
    }

    try {
        $pkg = Get-Content -Raw "package.json" | ConvertFrom-Json
        if ($pkg.version) {
            return [string]$pkg.version
        }
    } catch {
        # Fall through to preview label.
    }

    return "preview"
}

function Copy-PathIfExists($RelativePath, $DestinationRoot) {
    $source = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path $source)) {
        Write-Host "[WARN] Skipping missing path: $RelativePath" -ForegroundColor Yellow
        return
    }

    $destination = Join-Path $DestinationRoot $RelativePath
    $parent = Split-Path -Parent $destination
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
}

$packageVersion = Get-PackageVersion
$packageName = "Taffy-AI-Desktop-Pet-v$packageVersion-windows-source-test"
$distRoot = Join-Path $RepoRoot $OutputDir
$stageRoot = Join-Path $distRoot $packageName
$zipPath = Join-Path $distRoot "$packageName.zip"

if (Test-Path $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$pathsToCopy = @(
    ".env.example",
    "AGENTS.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README-FIRST-RUN.txt",
    "README.md",
    "SECURITY.md",
    "app.py",
    "asr.py",
    "character_runtime.py",
    "config.example.json",
    "config.py",
    "desktop_app.py",
    "emotion.py",
    "humanize.py",
    "llm_client.py",
    "memory.py",
    "package-lock.json",
    "package.json",
    "requirements-dev.txt",
    "requirements.txt",
    "start.bat",
    "start_chat_oneclick.bat",
    "start_desktop.bat",
    "start_electron.bat",
    "tools.py",
    "tts.py",
    "utils.py",
    ".github",
    "config",
    "docs",
    "electron",
    "scripts",
    "tests",
    "tts_ref\README.md",
    "web"
)

foreach ($path in $pathsToCopy) {
    Copy-PathIfExists $path $stageRoot
}

$runtimeDirs = @(
    ".pytest_cache",
    "docs\node_modules",
    "docs\test-results",
    "node_modules",
    "web\generated_images"
)

foreach ($dir in $runtimeDirs) {
    $fullPath = Join-Path $stageRoot $dir
    if (Test-Path $fullPath) {
        Remove-Item -LiteralPath $fullPath -Recurse -Force
    }
}

Get-ChildItem -LiteralPath $stageRoot -Directory -Recurse -Force |
    Where-Object { $_.Name -eq "__pycache__" } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

Compress-Archive -LiteralPath $stageRoot -DestinationPath $zipPath -Force

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath
$hashPath = Join-Path $distRoot "SHA256SUMS.txt"
"$($hash.Hash)  $packageName.zip" | Set-Content -LiteralPath $hashPath -Encoding ASCII

Write-Host "[OK] Created $zipPath" -ForegroundColor Green
Write-Host "[OK] Wrote $hashPath" -ForegroundColor Green
Write-Host "This is a source test package. It still requires Python and Node.js on the target machine."
