param(
    [int]$Port = 8787,
    [switch]$ConfigOnly,
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DocsRoot = Join-Path $RepoRoot "docs"

if (-not (Test-Path (Join-Path $DocsRoot "index.html"))) {
    throw "docs/index.html was not found. Run this script from the project repository."
}

function Test-PortAvailable {
    param([int]$CandidatePort)

    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Parse("127.0.0.1"),
        $CandidatePort
    )
    try {
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        try {
            $listener.Stop()
        } catch {
        }
    }
}

function Find-FreePort {
    param([int]$StartPort)

    for ($candidate = $StartPort; $candidate -lt ($StartPort + 50); $candidate++) {
        if (Test-PortAvailable $candidate) {
            return $candidate
        }
    }
    throw "No available port found from $StartPort to $($StartPort + 49)."
}

function Resolve-PythonCommand {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @("python")
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @("py", "-3")
    }
    throw "Python 3.10+ was not found. Install Python first, then rerun this script."
}

$SelectedPort = Find-FreePort $Port
$Python = @(Resolve-PythonCommand)
$PythonExe = [string]$Python[0]
$PythonArgs = @($Python | Select-Object -Skip 1) + @(
    "-m",
    "http.server",
    "$SelectedPort",
    "--bind",
    "127.0.0.1"
)

$Process = Start-Process `
    -FilePath $PythonExe `
    -ArgumentList $PythonArgs `
    -WorkingDirectory $DocsRoot `
    -WindowStyle Hidden `
    -PassThru

Start-Sleep -Milliseconds 600

$BaseUrl = "http://127.0.0.1:$SelectedPort"
$HomeUrl = "$BaseUrl/index.html"
$ConfigUrl = "$BaseUrl/config.html"

try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $HomeUrl -TimeoutSec 5
    if ($response.StatusCode -ne 200) {
        throw "Unexpected status code: $($response.StatusCode)"
    }
} catch {
    try {
        Stop-Process -Id $Process.Id -Force
    } catch {
    }
    throw "Docs site failed to start: $($_.Exception.Message)"
}

if (-not $NoOpen) {
    if ($ConfigOnly) {
        Start-Process $ConfigUrl
    } else {
        Start-Process $HomeUrl
        Start-Process $ConfigUrl
    }
}

Write-Host "[OK] Docs site is running." -ForegroundColor Green
Write-Host "Home:   $HomeUrl"
Write-Host "Config: $ConfigUrl"
Write-Host "PID:    $($Process.Id)"
Write-Host ""
Write-Host "Close the hidden python process to stop the site:"
Write-Host "  Stop-Process -Id $($Process.Id)"
