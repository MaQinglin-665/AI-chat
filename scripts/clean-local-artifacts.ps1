param(
    [switch]$Apply,
    [switch]$IncludeBuildOutput,
    [switch]$IncludeDependencies,
    [switch]$IncludeLocalState,
    [switch]$IncludeMemory
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RepoRootPath = [System.IO.Path]::GetFullPath([string]$RepoRoot).TrimEnd("\")
$RepoRootPrefix = $RepoRootPath + "\"

function Convert-ToRepoRelativePath {
    param([string]$FullPath)

    $full = [System.IO.Path]::GetFullPath($FullPath)
    if ($full -eq $RepoRootPath) {
        return "."
    }
    if (-not $full.StartsWith($RepoRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside the repository: $full"
    }
    return $full.Substring($RepoRootPrefix.Length)
}

function Resolve-InRepoPath {
    param([string]$RelativePath)

    $full = [System.IO.Path]::GetFullPath((Join-Path $RepoRootPath $RelativePath))
    if ($full -eq $RepoRootPath -or -not $full.StartsWith($RepoRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to touch path outside repository: $RelativePath"
    }
    return $full
}

function Test-IsUnderPath {
    param(
        [string]$FullPath,
        [string]$ParentPath
    )

    $full = [System.IO.Path]::GetFullPath($FullPath)
    $parent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd("\") + "\"
    return $full.StartsWith($parent, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-IsUnderExcludedTraversalRoot {
    param([string]$FullPath)

    $excludedRoots = @(
        ".git",
        ".venv",
        "node_modules",
        "docs\node_modules",
        "dist"
    )
    foreach ($relativeRoot in $excludedRoots) {
        $root = [System.IO.Path]::GetFullPath((Join-Path $RepoRootPath $relativeRoot))
        if (Test-IsUnderPath $FullPath $root) {
            return $true
        }
    }
    return $false
}

function Get-TrackedPathSet {
    $set = @{}
    try {
        $tracked = git -C $RepoRootPath ls-files
        if ($LASTEXITCODE -eq 0) {
            foreach ($path in $tracked) {
                if (-not $path) {
                    continue
                }
                $normalized = $path.Replace("/", "\")
                $set[$normalized.ToLowerInvariant()] = $true
            }
        }
    } catch {
        Write-Host "[WARN] Could not query tracked files; cleanup will be conservative." -ForegroundColor Yellow
    }
    return $set
}

$TrackedPaths = Get-TrackedPathSet
$Candidates = @{}

function Test-IsTrackedPath {
    param([string]$RelativePath)

    $key = $RelativePath.Replace("/", "\").TrimStart("\").ToLowerInvariant()
    return $TrackedPaths.ContainsKey($key)
}

function Test-IsIgnoredPath {
    param([string]$RelativePath)

    git -C $RepoRootPath check-ignore -q -- $RelativePath 2>$null
    return $LASTEXITCODE -eq 0
}

function Add-CandidatePath {
    param(
        [string]$RelativePath,
        [string]$Category
    )

    $full = Resolve-InRepoPath $RelativePath
    if (-not (Test-Path -LiteralPath $full)) {
        return
    }

    $relative = Convert-ToRepoRelativePath $full
    if (Test-IsTrackedPath $relative) {
        return
    }
    if (-not (Test-IsIgnoredPath $relative)) {
        return
    }

    $key = $full.ToLowerInvariant()
    if (-not $Candidates.ContainsKey($key)) {
        $item = Get-Item -LiteralPath $full -Force
        $Candidates[$key] = [PSCustomObject]@{
            Path = $full
            RelativePath = $relative
            Category = $Category
            Kind = if ($item.PSIsContainer) { "Directory" } else { "File" }
        }
    }
}

function Add-RootFilePattern {
    param(
        [string]$Pattern,
        [string]$Category
    )

    Get-ChildItem -LiteralPath $RepoRootPath -File -Force -Filter $Pattern -ErrorAction SilentlyContinue |
        ForEach-Object { Add-CandidatePath (Convert-ToRepoRelativePath $_.FullName) $Category }
}

function Add-RecursiveFilePattern {
    param(
        [string]$Pattern,
        [string]$Category
    )

    Get-ChildItem -LiteralPath $RepoRootPath -File -Force -Recurse -Filter $Pattern -ErrorAction SilentlyContinue |
        Where-Object { -not (Test-IsUnderExcludedTraversalRoot $_.FullName) } |
        ForEach-Object { Add-CandidatePath (Convert-ToRepoRelativePath $_.FullName) $Category }
}

function Add-RecursiveDirectoryName {
    param(
        [string]$Name,
        [string]$Category
    )

    Get-ChildItem -LiteralPath $RepoRootPath -Directory -Force -Recurse -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -eq $Name -and
            -not (Test-IsUnderExcludedTraversalRoot $_.FullName)
        } |
        ForEach-Object { Add-CandidatePath (Convert-ToRepoRelativePath $_.FullName) $Category }
}

$defaultDirs = @(
    ".pytest_cache",
    "tmp_browsercheck",
    "tmp_npm",
    "tmp_voice_preview",
    "tmp_ui_smoke",
    "docs\test-results"
)
foreach ($dir in $defaultDirs) {
    Add-CandidatePath $dir "cache/tmp"
}

Add-RecursiveDirectoryName "__pycache__" "python-cache"
Add-RecursiveFilePattern "*.pyc" "python-cache"

$defaultRootFilePatterns = @(
    "*.log",
    "server_*.log",
    "api_tts_*.txt",
    "api_tts_*.json",
    "api_tts_*.wav",
    "direct_tts_*.txt",
    "direct_tts_*.json",
    "direct_tts_*.wav",
    "health_headers_*.txt",
    "tmp_*.wav",
    "debug_*.wav",
    "__tts_*.wav",
    "__tts_*.bin",
    "__tts_*.bin"
)
foreach ($pattern in $defaultRootFilePatterns) {
    Add-RootFilePattern $pattern "runtime-artifact"
}

Get-ChildItem -LiteralPath (Join-Path $RepoRootPath "tts_ref") -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "README.md" } |
    ForEach-Object { Add-CandidatePath (Convert-ToRepoRelativePath $_.FullName) "tts-reference-artifact" }

if ($IncludeBuildOutput) {
    foreach ($path in @("dist", "unpackage")) {
        Add-CandidatePath $path "build-output"
    }
}

if ($IncludeDependencies) {
    foreach ($path in @(".venv", "node_modules", "docs\node_modules")) {
        Add-CandidatePath $path "dependencies"
    }
}

if ($IncludeLocalState) {
    foreach ($path in @(".env", "config.json", "config.local.json", "emotion_state.json")) {
        Add-CandidatePath $path "local-state"
    }
}

if ($IncludeMemory) {
    foreach ($path in @(
        ".mem0",
        "memory.json",
        "memory.bak",
        "memory_backups",
        "memory_persona_card.json",
        "memory_profile.json",
        "memory_relationship.json",
        "memory_summary.json",
        "learning_audit_log.jsonl",
        "learning_shadow_log.jsonl",
        "learning_state.json",
        "learning_candidates.json",
        "learning_samples.json"
    )) {
        Add-CandidatePath $path "memory"
    }
}

$candidateValues = @($Candidates.Values)
$directoryRoots = @(
    $candidateValues |
        Where-Object { $_.Kind -eq "Directory" } |
        ForEach-Object { [System.IO.Path]::GetFullPath($_.Path).TrimEnd("\") + "\" }
)
$items = @(
    $candidateValues |
        Where-Object {
            if ($_.Kind -eq "Directory") {
                return $true
            }
            $full = [System.IO.Path]::GetFullPath($_.Path)
            foreach ($dirRoot in $directoryRoots) {
                if ($full.StartsWith($dirRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                    return $false
                }
            }
            return $true
        } |
        Sort-Object Category, RelativePath
)
if ($items.Count -eq 0) {
    Write-Host "[OK] No ignored local artifacts matched the selected cleanup scope." -ForegroundColor Green
    return
}

if (-not $Apply) {
    Write-Host "[DRY-RUN] The following ignored local artifacts would be removed:" -ForegroundColor Cyan
} else {
    Write-Host "[APPLY] Removing ignored local artifacts:" -ForegroundColor Yellow
}

foreach ($item in $items) {
    Write-Host ("  [{0}] {1}: {2}" -f $item.Category, $item.Kind, $item.RelativePath)
    if ($Apply) {
        $full = Resolve-InRepoPath $item.RelativePath
        Remove-Item -LiteralPath $full -Recurse -Force
    }
}

Write-Host ""
if ($Apply) {
    Write-Host ("[OK] Removed {0} ignored local artifact(s)." -f $items.Count) -ForegroundColor Green
} else {
    Write-Host ("[OK] Dry run complete. Re-run with -Apply to remove {0} item(s)." -f $items.Count) -ForegroundColor Green
    Write-Host "Optional scopes: -IncludeBuildOutput, -IncludeDependencies, -IncludeLocalState, -IncludeMemory"
}
