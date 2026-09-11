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
        return @()
    }

    return @(
        Get-ChildItem -LiteralPath $RepoRoot -File -Filter "*.py" |
            ForEach-Object { $_.Name } |
            Sort-Object -Unique
    )
}

function Get-CurrentRootPythonFiles {
    return @(
        Get-ChildItem -LiteralPath $RepoRoot -File -Filter "*.py" |
            ForEach-Object { $_.Name } |
            Sort-Object -Unique
    )
}

function Get-PackageRootPythonFiles {
    return @(
        @(
            Get-TrackedRootPythonFiles
            Get-CurrentRootPythonFiles
        ) |
            Where-Object { $_ } |
            Sort-Object -Unique
    )
}

function Get-TrackedPackagePathSet {
    $set = @{}
    try {
        $files = git -C $RepoRoot ls-files 2>$null
        if ($LASTEXITCODE -eq 0) {
            foreach ($file in $files) {
                $relative = ([string]$file).Trim().Replace("\", "/")
                if ($relative) {
                    $set[$relative.ToLowerInvariant()] = $true
                }
            }
        }
    } catch {
        return $set
    }
    return $set
}

function Test-IsTrackedOrTrackedAncestorPackagePath {
    param(
        [string]$RelativePath,
        [hashtable]$TrackedPathSet
    )

    $relative = ([string]$RelativePath).Trim().TrimEnd("/").Replace("\", "/")
    if (-not $relative) {
        return $true
    }
    $key = $relative.ToLowerInvariant()
    if ($TrackedPathSet.ContainsKey($key)) {
        return $true
    }
    $prefix = $key + "/"
    foreach ($tracked in $TrackedPathSet.Keys) {
        if (([string]$tracked).StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }
    return $false
}

function Get-StageRelativePath {
    param(
        [string]$PackageRoot,
        [string]$FullPath
    )

    $rootPath = [System.IO.Path]::GetFullPath([string]$PackageRoot).TrimEnd("\")
    $rootPrefix = $rootPath + "\"
    $full = [System.IO.Path]::GetFullPath($FullPath)
    if ($full -eq $rootPath) {
        return ""
    }
    if (-not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Package path is outside staging root: $full"
    }
    return $full.Substring($rootPrefix.Length).Replace("\", "/")
}

function Remove-IgnoredPackagePaths {
    param([string]$PackageRoot)

    $trackedPathSet = Get-TrackedPackagePathSet
    $packageRootPath = [System.IO.Path]::GetFullPath((Resolve-Path $PackageRoot)).TrimEnd("\")
    $packageRootPrefix = $packageRootPath + "\"
    $ignored = @(
        Get-ChildItem -LiteralPath $PackageRoot -Force -Recurse |
            ForEach-Object {
                $relative = Get-StageRelativePath $PackageRoot $_.FullName
                if (-not $relative) {
                    return
                }
                if (Test-IsTrackedOrTrackedAncestorPackagePath $relative $trackedPathSet) {
                    return
                }
                git -C $RepoRoot -c core.quotePath=false check-ignore -q -- $relative 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $relative
                }
            } |
            Sort-Object -Unique
    )
    if ($ignored.Count -eq 0) {
        return
    }

    foreach ($relative in @($ignored | Sort-Object Length -Descending)) {
        $full = [System.IO.Path]::GetFullPath((Join-Path $packageRootPath $relative))
        if ($full -eq $packageRootPath -or -not $full.StartsWith($packageRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove package path outside staging root: $relative"
        }
        if (Test-Path -LiteralPath $full) {
            Remove-Item -LiteralPath $full -Recurse -Force
        }
    }
}

$packageVersion = Get-PackageVersion
$packageName = "Xinyu-AI-Desktop-Pet-v$packageVersion-windows-source-test"
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

$packageRootPythonFiles = @(Get-PackageRootPythonFiles)

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
    "START_HERE.txt",
    "THIRD_PARTY_NOTICES.md",
    "config.example.json",
    "first_run.py",
    "package-lock.json",
    "package.json",
    "prepare_preview_environment.bat",
    "requirements-dev.txt",
    "requirements.txt",
    "install_and_start.bat",
    "install_first_run.bat",
    "start.bat",
    "start_chat_oneclick.bat",
    "start_desktop.bat",
    "start_electron.bat",
    ".github",
    "config",
    "docs",
    "electron",
    "installer",
    "scripts",
    "tests",
    "tts_ref\README.md",
    "web"
)

foreach ($path in @($pathsToCopy + $packageRootPythonFiles)) {
    Copy-PathIfExists $path $stageRoot
}

$runtimeDirs = @(
    ".local-tools",
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

Remove-IgnoredPackagePaths $stageRoot

Compress-Archive -LiteralPath $stageRoot -DestinationPath $zipPath -Force

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath
$hashPath = Join-Path $distRoot "SHA256SUMS.txt"
"$($hash.Hash)  $packageName.zip" | Set-Content -LiteralPath $hashPath -Encoding ASCII
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\write-release-assets.ps1") -Version $packageVersion -OutputDir $distRoot
if ($LASTEXITCODE -ne 0) {
    throw "Release assets manifest generation failed."
}

Write-Host "[OK] Created $zipPath" -ForegroundColor Green
Write-Host "[OK] Wrote $hashPath" -ForegroundColor Green
Write-Host "This is the Xinyu source test package. Older Taffy names may still appear in compatibility env vars and local tokens."
Write-Host "This source package still requires Python and Node.js on the target machine."
