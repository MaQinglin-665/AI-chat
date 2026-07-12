param(
    [string]$Version = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$LocalToolsRoot = Join-Path $RepoRoot ".local-tools"
$TargetDir = Join-Path $LocalToolsRoot "node22"
$IndexUrl = "https://nodejs.org/dist/index.json"

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-InfoLine($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Resolve-Node22Version {
    param([string]$RequestedVersion)

    if ($RequestedVersion) {
        $safe = $RequestedVersion.Trim()
        if (-not $safe.StartsWith("v")) {
            $safe = "v$safe"
        }
        if ($safe -notmatch "^v22\.\d+\.\d+$") {
            throw "Version must be a Node 22 release such as v22.22.3."
        }
        return $safe
    }

    $index = Invoke-RestMethod -Uri $IndexUrl -UseBasicParsing
    $entry = $index |
        Where-Object { $_.version -match "^v22\." -and $_.files -contains "win-x64-zip" } |
        Select-Object -First 1
    if (-not $entry) {
        throw "No Node 22 win-x64 zip entry found in $IndexUrl."
    }
    return [string]$entry.version
}

$localToolsFull = [System.IO.Path]::GetFullPath([string]$LocalToolsRoot)
$targetFull = [System.IO.Path]::GetFullPath([string]$TargetDir)
if (-not $targetFull.StartsWith($localToolsFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to install outside project .local-tools: $targetFull"
}

$resolvedVersion = Resolve-Node22Version -RequestedVersion $Version
$zipName = "node-$resolvedVersion-win-x64.zip"
$downloadUrl = "https://nodejs.org/dist/$resolvedVersion/$zipName"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("taffy-node22-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot $zipName
$extractRoot = Join-Path $tempRoot "extract"

try {
    if ((Test-Path -LiteralPath (Join-Path $TargetDir "node.exe") -PathType Leaf) -and -not $Force) {
        $existingVersion = & (Join-Path $TargetDir "node.exe") --version
        Write-Ok "Project-local Node already exists: $existingVersion"
        Write-Host "Path: $TargetDir"
        exit 0
    }

    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $LocalToolsRoot -Force | Out-Null

    Write-InfoLine "Downloading $downloadUrl"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

    Write-InfoLine "Extracting Node.js $resolvedVersion"
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force
    $expanded = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
    if (-not $expanded) {
        throw "Downloaded archive did not contain a Node.js folder."
    }

    if (Test-Path -LiteralPath $TargetDir) {
        Remove-Item -LiteralPath $TargetDir -Recurse -Force
    }
    Move-Item -LiteralPath $expanded.FullName -Destination $TargetDir

    $nodeVersion = & (Join-Path $TargetDir "node.exe") --version
    $npmVersion = & (Join-Path $TargetDir "npm.cmd") --version
    Write-Ok "Installed project-local Node.js: $nodeVersion"
    Write-Ok "Installed project-local npm: $npmVersion"
    Write-Host "Path: $TargetDir"
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}

