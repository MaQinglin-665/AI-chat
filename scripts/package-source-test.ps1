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

function Get-TrackedRootPythonFiles {
    try {
        $files = git -C $RepoRoot ls-files "*.py" 2>$null
        if ($LASTEXITCODE -eq 0 -and $files) {
            return @(
                $files |
                    Where-Object {
                        $_ -and
                        $_.EndsWith(".py") -and
                        -not $_.Contains("/") -and
                        -not $_.Contains("\")
                    } |
                    Sort-Object -Unique
            )
        }
    } catch {
        # Fall back below when git is unavailable.
    }

    return @(
        Get-ChildItem -LiteralPath $RepoRoot -File -Filter "*.py" |
            ForEach-Object { $_.Name } |
            Sort-Object -Unique
    )
}

$packageVersion = Get-PackageVersion
$packageName = "Taffy-AI-Desktop-Pet-v$packageVersion-windows-source-test"
if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    $distRoot = $OutputDir
} else {
    $distRoot = Join-Path $RepoRoot $OutputDir
}
$stageRoot = Join-Path $distRoot $packageName
$zipPath = Join-Path $distRoot "$packageName.zip"

if (Test-Path $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$trackedRootPythonFiles = @(Get-TrackedRootPythonFiles)

$pathsToCopy = @(
    ".env.example",
    "AGENTS.md",
    "CHANGELOG.md",
    "config.preview.example.json",
    "CONTRIBUTING.md",
    "LICENSE",
    "README-FIRST-RUN.txt",
    "README.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "config.example.json",
    "package-lock.json",
    "package.json",
    "requirements-dev.txt",
    "requirements.txt",
    "install_first_run.bat",
    "start.bat",
    "start_chat_oneclick.bat",
    "start_desktop.bat",
    "start_electron.bat",
    ".github",
    "config",
    "docs",
    "electron",
    "scripts",
    "tests",
    "tts_ref\README.md",
    "web"
)

foreach ($path in @($pathsToCopy + $trackedRootPythonFiles)) {
    Copy-PathIfExists $path $stageRoot
}

$runtimeDirs = @(
    ".venv",
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

$runtimeFiles = @(
    ".env",
    "config.json",
    "config.local.json",
    "server_out.log",
    "server_err.log",
    "desktop_run.log"
)

foreach ($file in $runtimeFiles) {
    $fullPath = Join-Path $stageRoot $file
    if (Test-Path $fullPath) {
        Remove-Item -LiteralPath $fullPath -Force
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
