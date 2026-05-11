param(
    [string]$Version,
    [string]$OutputDir = "dist",
    [string]$MakensisPath
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

function Resolve-Makensis {
    if ($MakensisPath) {
        if (Test-Path $MakensisPath) {
            return (Resolve-Path $MakensisPath).Path
        }
        throw "makensis was not found at: $MakensisPath"
    }

    $command = Get-Command makensis -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
        "$env:ProgramFiles\NSIS\makensis.exe"
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    throw "NSIS makensis.exe was not found. Install NSIS, then rerun scripts\build-installer.ps1."
}

function Write-HashFile {
    param([string]$DistRoot)

    $hashPath = Join-Path $DistRoot "SHA256SUMS.txt"
    $artifacts = @(
        Get-ChildItem -LiteralPath $DistRoot -File |
            Where-Object { $_.Extension -in @(".zip", ".exe") } |
            Sort-Object Name
    )
    if (-not $artifacts.Count) {
        throw "No release artifacts were found under $DistRoot"
    }

    $lines = foreach ($artifact in $artifacts) {
        $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $artifact.FullName
        "$($hash.Hash)  $($artifact.Name)"
    }
    $lines | Set-Content -LiteralPath $hashPath -Encoding ASCII
    return $hashPath
}

$packageVersion = Get-PackageVersion
if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    $distRoot = $OutputDir
} else {
    $distRoot = Join-Path $RepoRoot $OutputDir
}
New-Item -ItemType Directory -Path $distRoot -Force | Out-Null

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\package-source-test.ps1") -Version $packageVersion -OutputDir $distRoot
if ($LASTEXITCODE -ne 0) {
    throw "Source package build failed."
}

$packageName = "Xinyu-AI-Desktop-Pet-v$packageVersion-windows-source-test"
$stageRoot = Join-Path $distRoot $packageName
$sourceZip = Join-Path $distRoot "$packageName.zip"
if (-not (Test-Path $stageRoot)) {
    throw "Source package staging folder was not found: $stageRoot"
}
if (-not (Test-Path $sourceZip)) {
    throw "Source package zip was not found: $sourceZip"
}

$makensis = Resolve-Makensis
$installerPath = Join-Path $distRoot "Xinyu-AI-Desktop-Pet-Setup-v$packageVersion.exe"
$nsiPath = Join-Path $RepoRoot "installer\xinyu-online-installer.nsi"

Write-Host "==> Build NSIS online guided installer" -ForegroundColor Cyan
& $makensis `
    "/DAPP_VERSION=$packageVersion" `
    "/DPAYLOAD_ROOT=$stageRoot" `
    "/DOUT_FILE=$installerPath" `
    $nsiPath
if ($LASTEXITCODE -ne 0) {
    throw "NSIS installer build failed."
}
if (-not (Test-Path $installerPath)) {
    throw "Installer exe was not created: $installerPath"
}

$hashPath = Write-HashFile -DistRoot $distRoot

Write-Host "[OK] Created $installerPath" -ForegroundColor Green
Write-Host "[OK] Source zip: $sourceZip" -ForegroundColor Green
Write-Host "[OK] Wrote $hashPath" -ForegroundColor Green
Write-Host "Release assets: installer exe, source test zip, SHA256SUMS.txt, and release notes."
