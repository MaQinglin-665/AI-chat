param(
    [string]$Version = "installer-smoke",
    [string]$WorkRoot,
    [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($WorkRoot) {
    $TempRoot = Join-Path (Resolve-Path $WorkRoot) ("xinyu-installer-smoke-" + [guid]::NewGuid().ToString("N"))
} else {
    $TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("xinyu-installer-smoke-" + [guid]::NewGuid().ToString("N"))
}
$PackageOut = Join-Path $TempRoot "dist"

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-Fail($Message) {
    throw $Message
}

try {
    New-Item -ItemType Directory -Path $PackageOut -Force | Out-Null

    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\build-installer.ps1") -Version $Version -OutputDir $PackageOut
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Installer build script failed."
    }

    $installer = Join-Path $PackageOut "Xinyu-AI-Desktop-Pet-Setup-v$Version.exe"
    $sourceZip = Join-Path $PackageOut "Xinyu-AI-Desktop-Pet-v$Version-windows-source-test.zip"
    $hashFile = Join-Path $PackageOut "SHA256SUMS.txt"

    foreach ($path in @($installer, $sourceZip, $hashFile)) {
        if (-not (Test-Path $path)) {
            Write-Fail "Missing installer smoke artifact: $path"
        }
        Write-Ok "Found $(Split-Path -Leaf $path)"
    }

    $hashText = Get-Content -Raw -LiteralPath $hashFile -Encoding ASCII
    if ($hashText -notmatch [regex]::Escape((Split-Path -Leaf $installer))) {
        Write-Fail "SHA256SUMS.txt does not include installer exe."
    }
    if ($hashText -notmatch [regex]::Escape((Split-Path -Leaf $sourceZip))) {
        Write-Fail "SHA256SUMS.txt does not include source zip."
    }
    Write-Ok "SHA256SUMS.txt lists installer and source package"

    Write-Host ""
    Write-Ok "Installer smoke passed."
} finally {
    if (-not $KeepTemp -and (Test-Path $TempRoot)) {
        Remove-Item -LiteralPath $TempRoot -Recurse -Force
    } elseif ($KeepTemp) {
        Write-Host "[INFO] Kept temp folder: $TempRoot" -ForegroundColor Cyan
    }
}
