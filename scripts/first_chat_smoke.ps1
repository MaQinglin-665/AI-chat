param(
    [string]$BaseUrl,
    [string]$Message = "Please reply with OK only.",
    [int]$StartupTimeoutSec = 45,
    [int]$RequestTimeoutSec = 20,
    [switch]$NoStartServer,
    [switch]$KeepServer,
    [switch]$SkipPreflight,
    [switch]$SkipLlmProbe,
    [switch]$SkipChat
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$script:PythonExe = ""
$script:PythonArgsPrefix = @()
$script:StartedServerProcess = $null
$ServerOutLog = Join-Path $RepoRoot "tmp_first_chat_server_out.log"
$ServerErrLog = Join-Path $RepoRoot "tmp_first_chat_server_err.log"

function Write-Ok($MessageText) {
    Write-Host "[OK]   $MessageText" -ForegroundColor Green
}

function Write-InfoLine($MessageText) {
    Write-Host "[INFO] $MessageText" -ForegroundColor Cyan
}

function Write-WarnLine($MessageText) {
    Write-Host "[WARN] $MessageText" -ForegroundColor Yellow
}

function Write-Fail($MessageText) {
    throw $MessageText
}

function Resolve-PythonCommand {
    $venvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        if (Test-PythonCandidate $venvPython @()) {
            $script:PythonExe = $venvPython
            $script:PythonArgsPrefix = @()
            Write-Ok "Using local Python: .venv\Scripts\python.exe"
            return
        }
        Write-WarnLine ".venv\Scripts\python.exe exists but is not runnable; falling back to Python on PATH."
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        if (Test-PythonCandidate "python" @()) {
            $script:PythonExe = "python"
            $script:PythonArgsPrefix = @()
            Write-WarnLine "Using python on PATH."
            return
        }
    }

    if (Get-Command py -ErrorAction SilentlyContinue) {
        if (Test-PythonCandidate "py" @("-3")) {
            $script:PythonExe = "py"
            $script:PythonArgsPrefix = @("-3")
            Write-WarnLine "Using py -3."
            return
        }
    }

    Write-Fail "Python was not found. Run install_and_start.bat first."
}

function Test-PythonCandidate {
    param(
        [string]$Exe,
        [string[]]$ArgsPrefix
    )

    try {
        $output = & $Exe @($ArgsPrefix + @("--version")) 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        $detail = (($output | Out-String).Trim())
        if ($detail) {
            Write-WarnLine "Python candidate failed: $Exe $($ArgsPrefix -join ' ') ($detail)"
        }
    } catch {
        Write-WarnLine "Python candidate failed: $Exe $($ArgsPrefix -join ' ') ($($_.Exception.Message))"
    }
    return $false
}

function Invoke-ProjectPython {
    param([string[]]$Arguments)

    & $script:PythonExe @($script:PythonArgsPrefix + $Arguments)
    return $LASTEXITCODE
}

function Invoke-ProjectPythonOutput {
    param([string[]]$Arguments)

    $output = & $script:PythonExe @($script:PythonArgsPrefix + $Arguments) 2>&1
    $code = $LASTEXITCODE
    return [pscustomobject]@{
        Code = $code
        Output = @($output)
    }
}

function Get-RuntimeInfo {
    $snippet = @'
import json
import os
import sys
sys.path.insert(0, r"__TAFFY_ROOT__")
from config import API_TOKEN_DEFAULT_ENV, DEFAULT_CONFIG, load_config

cfg = load_config()
server = cfg.get("server", {}) if isinstance(cfg.get("server", {}), dict) else {}
host = str(server.get("host") or DEFAULT_CONFIG["server"]["host"] or "127.0.0.1").strip()
try:
    port = int(server.get("port", DEFAULT_CONFIG["server"]["port"]))
except Exception:
    port = int(DEFAULT_CONFIG["server"]["port"])
token_env = str(server.get("api_token_env") or API_TOKEN_DEFAULT_ENV).strip() or API_TOKEN_DEFAULT_ENV
token = str(server.get("api_token") or os.environ.get(token_env) or os.environ.get(API_TOKEN_DEFAULT_ENV) or "").strip()
print(json.dumps({
    "host": host,
    "port": port,
    "base_url": "http://%s:%s" % (host, port),
    "require_api_token": bool(server.get("require_api_token", False)),
    "api_token_env": token_env,
    "api_token": token,
}, ensure_ascii=True))
'@
    $snippet = $snippet.Replace("__TAFFY_ROOT__", ($RepoRoot -replace "\\", "/"))

    $tempScript = Join-Path ([System.IO.Path]::GetTempPath()) ("taffy-runtime-info-" + [guid]::NewGuid().ToString("N") + ".py")
    try {
        Set-Content -LiteralPath $tempScript -Value $snippet -Encoding UTF8
        $result = Invoke-ProjectPythonOutput @($tempScript)
        if ($result.Code -ne 0) {
            Write-Fail ("Could not load runtime config: " + (($result.Output | Out-String).Trim()))
        }
    } finally {
        if (Test-Path $tempScript) {
            Remove-Item -LiteralPath $tempScript -Force
        }
    }
    $json = ($result.Output | Select-Object -Last 1)
    return $json | ConvertFrom-Json
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [string]$Token = "",
        [int]$TimeoutSec = 20
    )

    $headers = @{
        "Accept" = "application/json"
    }
    if ($Token) {
        $headers["X-Taffy-Token"] = $Token
    }

    $params = @{
        Uri = $Url
        Method = $Method
        Headers = $headers
        TimeoutSec = $TimeoutSec
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 20)
        $params["ContentType"] = "application/json; charset=utf-8"
    }

    try {
        $response = Invoke-WebRequest @params
        $payload = $null
        if ($response.Content) {
            $payload = $response.Content | ConvertFrom-Json
        }
        return [pscustomobject]@{
            Ok = $true
            Status = [int]$response.StatusCode
            Payload = $payload
            Error = ""
        }
    } catch {
        $status = 0
        $detail = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $status = [int]$_.Exception.Response.StatusCode
            } catch {
                $status = 0
            }
        }
        return [pscustomobject]@{
            Ok = $false
            Status = $status
            Payload = $null
            Error = $detail
        }
    }
}

function Test-Healthz {
    param([string]$TargetBaseUrl)

    $result = Invoke-JsonRequest -Method "GET" -Url "$TargetBaseUrl/healthz" -TimeoutSec 3
    return ($result.Ok -and $result.Status -eq 200)
}

function Start-BackendIfNeeded {
    param([string]$TargetBaseUrl)

    if (Test-Healthz $TargetBaseUrl) {
        Write-Ok "Backend is already reachable at $TargetBaseUrl"
        return
    }

    if ($NoStartServer) {
        Write-Fail "Backend is not reachable at $TargetBaseUrl and -NoStartServer was set."
    }

    Write-InfoLine "Starting local backend for smoke test..."
    if (Test-Path $ServerOutLog) {
        Remove-Item -LiteralPath $ServerOutLog -Force
    }
    if (Test-Path $ServerErrLog) {
        Remove-Item -LiteralPath $ServerErrLog -Force
    }

    $args = @($script:PythonArgsPrefix + @("app.py"))
    $script:StartedServerProcess = Start-Process `
        -FilePath $script:PythonExe `
        -ArgumentList $args `
        -WorkingDirectory $RepoRoot `
        -RedirectStandardOutput $ServerOutLog `
        -RedirectStandardError $ServerErrLog `
        -WindowStyle Hidden `
        -PassThru

    $deadline = (Get-Date).AddSeconds([Math]::Max(5, $StartupTimeoutSec))
    while ((Get-Date) -lt $deadline) {
        if ($script:StartedServerProcess.HasExited) {
            $tail = ""
            if (Test-Path $ServerErrLog) {
                $tail = (Get-Content -LiteralPath $ServerErrLog -Tail 20 -ErrorAction SilentlyContinue | Out-String).Trim()
            }
            Write-Fail "Backend exited before becoming healthy. Recent stderr: $tail"
        }
        if (Test-Healthz $TargetBaseUrl) {
            Write-Ok "Backend became healthy at $TargetBaseUrl"
            return
        }
        Start-Sleep -Seconds 1
    }

    Write-Fail "Backend did not become healthy within $StartupTimeoutSec seconds."
}

function Assert-ApiHealth {
    param(
        [string]$TargetBaseUrl,
        [string]$Token
    )

    $result = Invoke-JsonRequest -Method "GET" -Url "$TargetBaseUrl/api/health" -Token $Token -TimeoutSec $RequestTimeoutSec
    if (-not $result.Ok) {
        Write-Fail "GET /api/health failed (HTTP $($result.Status)): $($result.Error)"
    }
    $payload = $result.Payload
    if (-not $payload) {
        Write-Fail "GET /api/health returned empty or non-JSON response."
    }

    $checks = $payload.checks
    foreach ($name in @("config_load", "live2d_model_path", "server", "llm")) {
        $check = $checks.$name
        if (-not $check -or -not [bool]$check.ok) {
            $detail = ""
            if ($check) {
                if ($check.error) {
                    $detail = [string]$check.error
                } elseif ($check.messages) {
                    $detail = (($check.messages | ForEach-Object { [string]$_ }) -join "; ")
                }
            }
            Write-Fail "/api/health check failed: $name $detail"
        }
    }
    Write-Ok "/api/health reports config, Live2D, server, and LLM basics are OK"
}

function Assert-LlmProbe {
    param(
        [string]$TargetBaseUrl,
        [string]$Token
    )

    if ($SkipLlmProbe) {
        Write-WarnLine "Skipping /api/llm_probe."
        return
    }

    $result = Invoke-JsonRequest -Method "POST" -Url "$TargetBaseUrl/api/llm_probe" -Body @{} -Token $Token -TimeoutSec $RequestTimeoutSec
    if (-not $result.Ok) {
        Write-Fail "POST /api/llm_probe failed (HTTP $($result.Status)): $($result.Error)"
    }
    if (-not $result.Payload -or -not [bool]$result.Payload.ok) {
        $detail = ""
        if ($result.Payload) {
            if ($result.Payload.error) {
                $detail = [string]$result.Payload.error
            } elseif ($result.Payload.detail) {
                $detail = [string]$result.Payload.detail
            }
        }
        Write-Fail "LLM probe did not return ok=true. $detail"
    }
    Write-Ok "LLM probe returned text in $($result.Payload.elapsed_ms) ms"
}

function Assert-Chat {
    param(
        [string]$TargetBaseUrl,
        [string]$Token
    )

    if ($SkipChat) {
        Write-WarnLine "Skipping /api/chat."
        return
    }

    $body = @{
        message = $Message
        history = @()
        image_data_url = ""
    }
    $result = Invoke-JsonRequest -Method "POST" -Url "$TargetBaseUrl/api/chat" -Body $body -Token $Token -TimeoutSec ([Math]::Max($RequestTimeoutSec, 45))
    if (-not $result.Ok) {
        Write-Fail "POST /api/chat failed (HTTP $($result.Status)): $($result.Error)"
    }
    $reply = ""
    if ($result.Payload -and $result.Payload.reply) {
        $reply = [string]$result.Payload.reply
    }
    if (-not $reply.Trim()) {
        Write-Fail "POST /api/chat returned an empty reply."
    }
    Write-Ok "/api/chat returned a non-empty reply ($($reply.Length) chars)"
}

try {
    Write-Host "Xinyu Desktop Pet first-chat smoke"
    Write-Host "Root: $RepoRoot"
    Write-Host ""

    Resolve-PythonCommand

    if (-not (Test-Path (Join-Path $RepoRoot "config.json"))) {
        Write-Fail "config.json was not found. Run install_and_start.bat first."
    }
    if (-not (Test-Path (Join-Path $RepoRoot ".env"))) {
        Write-Fail ".env was not found. Run install_and_start.bat first."
    }
    if (-not (Test-Path (Join-Path $RepoRoot "node_modules"))) {
        Write-Fail "node_modules was not found. Run install_and_start.bat first."
    }

    if (-not $SkipPreflight) {
        Write-Host ""
        Write-Host "==> Run first-run preflight" -ForegroundColor Cyan
        $preflight = Invoke-ProjectPythonOutput @("scripts\first_run_check.py")
        foreach ($line in $preflight.Output) {
            Write-Host $line
        }
        if ($preflight.Code -ne 0) {
            Write-Fail "First-run preflight failed. Fix the [FAIL] lines above first."
        }
    }

    $runtime = Get-RuntimeInfo
    $targetBaseUrl = if ($BaseUrl) { $BaseUrl.TrimEnd("/") } else { [string]$runtime.base_url }
    $token = [string]$runtime.api_token
    if ([bool]$runtime.require_api_token -and -not $token) {
        Write-Fail "API token is required but missing. Run install_and_start.bat again."
    }

    Start-BackendIfNeeded $targetBaseUrl
    Assert-ApiHealth -TargetBaseUrl $targetBaseUrl -Token $token
    Assert-LlmProbe -TargetBaseUrl $targetBaseUrl -Token $token
    Assert-Chat -TargetBaseUrl $targetBaseUrl -Token $token

    Write-Host ""
    if ($SkipChat) {
        Write-Ok "First-chat smoke passed for the requested checks."
    } else {
        Write-Ok "First-chat smoke passed. The backend is healthy and can produce a reply."
    }
    Write-Host "Next launch:"
    Write-Host "  .\start_electron.bat"
} finally {
    if ($script:StartedServerProcess -and -not $KeepServer) {
        try {
            if (-not $script:StartedServerProcess.HasExited) {
                Stop-Process -Id $script:StartedServerProcess.Id -Force
                Write-InfoLine "Stopped backend process started by smoke test."
            }
        } catch {
            Write-WarnLine "Could not stop backend process: $($_.Exception.Message)"
        }
    } elseif ($script:StartedServerProcess -and $KeepServer) {
        Write-InfoLine "Backend process kept running: pid=$($script:StartedServerProcess.Id)"
    }
}
