$ErrorActionPreference = "Stop"
# An English Windows host can otherwise replace Chinese with '?' in captured
# output. Keep interactive console settings intact; only use UTF-8 for pipes.
if ([Console]::IsOutputRedirected) {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
}
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
. (Join-Path $PSScriptRoot "node-runtime.ps1")

function Show-NpmInstallFailure {
    param([string]$Details = "")
    Write-Host ""
    Write-Host "npm 安装失败。请检查网络连接、npm 镜像地址和 Node.js 版本。" -ForegroundColor Red
    if ($Details) { Write-Host $Details }
    Write-Host "可在项目目录运行以下命令修复依赖："
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1"
}

if (-not (Test-Path (Join-Path $RepoRoot "node_modules\electron\dist\electron.exe"))) {
    Write-Host "Installing Electron runtime..."
    if (-not $env:ELECTRON_MIRROR) {
        $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
    }
    try {
        $npm = @(Resolve-ProjectNodeCommand -Tool "npm")
        $mode = if (Test-Path (Join-Path $RepoRoot "package-lock.json")) { "ci" } else { "install" }
        & $npm[0] $mode --no-fund --no-audit
        $installExitCode = $LASTEXITCODE
        if ($installExitCode -ne 0) {
            Show-NpmInstallFailure
            exit $installExitCode
        }
    } catch {
        Show-NpmInstallFailure -Details $_.Exception.Message
        exit 1
    }
}

$node = @(Resolve-ProjectNodeCommand -Tool "node")
& $node[0] "node_modules\electron\cli.js" "electron\main.js"
exit $LASTEXITCODE
