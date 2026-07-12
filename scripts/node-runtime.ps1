$script:NodeRuntimeRepoRoot = if ($RepoRoot) {
    [string]$RepoRoot
} else {
    [string](Resolve-Path (Join-Path $PSScriptRoot ".."))
}

function Resolve-ProjectNodeToolPath {
    param(
        [ValidateSet("node", "npm")]
        [string]$Tool = "node",
        [string]$NodeHome = ""
    )

    if (-not $NodeHome) {
        return $null
    }

    $candidates = @()
    if ($Tool -eq "npm") {
        $candidates += (Join-Path $NodeHome "npm.cmd")
    }
    $candidates += (Join-Path $NodeHome "$Tool.exe")
    $candidates += (Join-Path $NodeHome $Tool)

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return $candidate
        }
    }
    return $null
}

function Resolve-ProjectNodeCommand {
    param(
        [ValidateSet("node", "npm")]
        [string]$Tool = "node"
    )

    if ($Tool -eq "node" -and $env:TAFFY_NODE_EXE) {
        if (Test-Path -LiteralPath $env:TAFFY_NODE_EXE -PathType Leaf) {
            return @($env:TAFFY_NODE_EXE)
        }
    }

    foreach ($nodeHome in @($env:TAFFY_NODE_HOME, (Join-Path $script:NodeRuntimeRepoRoot ".local-tools\node22"))) {
        $toolPath = Resolve-ProjectNodeToolPath -Tool $Tool -NodeHome $nodeHome
        if ($toolPath) {
            return @($toolPath)
        }
    }

    if ($Tool -eq "npm" -and $env:OS -eq "Windows_NT") {
        if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) {
            return @("npm.cmd")
        }
    }

    return @($Tool)
}

