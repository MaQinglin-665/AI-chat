$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
. (Join-Path $PSScriptRoot "node-runtime.ps1")

if (-not (Test-Path (Join-Path $RepoRoot "node_modules\electron\dist\electron.exe"))) {
    Write-Host "Installing Electron runtime..."
    if (-not $env:ELECTRON_MIRROR) {
        $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
    }
    $npm = @(Resolve-ProjectNodeCommand -Tool "npm")
    $mode = if (Test-Path (Join-Path $RepoRoot "package-lock.json")) { "ci" } else { "install" }
    & $npm[0] $mode --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$node = @(Resolve-ProjectNodeCommand -Tool "node")
& $node[0] "node_modules\electron\cli.js" "electron\main.js"
exit $LASTEXITCODE
