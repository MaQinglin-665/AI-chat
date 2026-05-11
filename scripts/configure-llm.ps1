param(
    [ValidateSet("dashscope", "openai-compatible", "openai", "ollama")]
    [string]$Provider,
    [string]$BaseUrl,
    [string]$Model,
    [string]$ApiKeyEnv,
    [string]$ApiKey,
    [switch]$SkipApiKey,
    [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$LocalConfigPath = Join-Path $RepoRoot "config.local.json"
$EnvPath = Join-Path $RepoRoot ".env"

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-InfoLine($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnLine($Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Read-Value {
    param(
        [string]$Prompt,
        [string]$DefaultValue = ""
    )

    if ($NoPrompt) {
        return $DefaultValue
    }

    if ($DefaultValue) {
        $raw = Read-Host "$Prompt [$DefaultValue]"
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return $DefaultValue
        }
        return $raw.Trim()
    }

    return (Read-Host $Prompt).Trim()
}

function Read-SecretValue {
    param([string]$Prompt)

    if ($NoPrompt) {
        return ""
    }

    $secure = Read-Host $Prompt -AsSecureString
    if (-not $secure -or $secure.Length -eq 0) {
        return ""
    }

    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Resolve-ProviderChoice {
    if ($Provider) {
        return $Provider
    }

    if ($NoPrompt) {
        return "dashscope"
    }

    Write-Host "Choose LLM provider:"
    Write-Host "  1. DashScope / Qwen (OpenAI-compatible)"
    Write-Host "  2. OpenAI-compatible custom endpoint"
    Write-Host "  3. OpenAI"
    Write-Host "  4. Ollama local"
    $choice = (Read-Host "Enter 1-4 [1]").Trim()
    switch ($choice) {
        "2" { return "openai-compatible" }
        "3" { return "openai" }
        "4" { return "ollama" }
        default { return "dashscope" }
    }
}

function Get-ProviderDefaults {
    param([string]$SelectedProvider)

    switch ($SelectedProvider) {
        "dashscope" {
            return [ordered]@{
                provider = "openai-compatible"
                base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"
                model = "qwen-plus"
                api_key_env = "DASHSCOPE_API_KEY"
                needs_key = $true
            }
        }
        "openai" {
            return [ordered]@{
                provider = "openai"
                base_url = "https://api.openai.com/v1"
                model = "gpt-4o-mini"
                api_key_env = "OPENAI_API_KEY"
                needs_key = $true
            }
        }
        "ollama" {
            return [ordered]@{
                provider = "ollama"
                base_url = "http://127.0.0.1:11434"
                model = "qwen2.5:7b"
                api_key_env = ""
                needs_key = $false
            }
        }
        default {
            return [ordered]@{
                provider = "openai-compatible"
                base_url = "http://127.0.0.1:8000/v1"
                model = "gpt-4o-mini"
                api_key_env = "TAFFY_LLM_API_KEY"
                needs_key = $true
            }
        }
    }
}

function Assert-HttpUrl {
    param(
        [string]$Value,
        [string]$Name
    )

    if ($Value -notmatch "^https?://") {
        throw "$Name must start with http:// or https://"
    }
}

function Read-JsonObject {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return [pscustomobject]@{}
    }

    try {
        $raw = Get-Content -Raw -LiteralPath $Path -Encoding UTF8
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return [pscustomobject]@{}
        }
        $parsed = $raw | ConvertFrom-Json
        if ($parsed -isnot [pscustomobject]) {
            throw "Root JSON value must be an object."
        }
        return $parsed
    } catch {
        throw "Could not read config.local.json as JSON. Fix it first or move it aside. Detail: $($_.Exception.Message)"
    }
}

function Ensure-ObjectProperty {
    param(
        [pscustomobject]$Object,
        [string]$Name
    )

    $prop = $Object.PSObject.Properties[$Name]
    if (-not $prop -or $null -eq $prop.Value -or $prop.Value -isnot [pscustomobject]) {
        $Object | Add-Member -Force -MemberType NoteProperty -Name $Name -Value ([pscustomobject]@{})
    }
    return $Object.PSObject.Properties[$Name].Value
}

function Set-JsonProperty {
    param(
        [pscustomobject]$Object,
        [string]$Name,
        [object]$Value
    )

    if ($Object.PSObject.Properties[$Name]) {
        $Object.PSObject.Properties[$Name].Value = $Value
    } else {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
    }
}

function Write-LocalConfig {
    param(
        [string]$ProviderValue,
        [string]$BaseUrlValue,
        [string]$ModelValue,
        [string]$ApiKeyEnvValue
    )

    $config = Read-JsonObject $LocalConfigPath
    $llm = Ensure-ObjectProperty $config "llm"

    Set-JsonProperty $llm "provider" $ProviderValue
    Set-JsonProperty $llm "base_url" $BaseUrlValue
    Set-JsonProperty $llm "model" $ModelValue
    Set-JsonProperty $llm "api_key" ""
    if ($ApiKeyEnvValue) {
        Set-JsonProperty $llm "api_key_env" $ApiKeyEnvValue
    }

    $config | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $LocalConfigPath -Encoding UTF8
    Write-Ok "Wrote LLM settings to config.local.json"
}

function Get-EnvValue {
    param([string]$Name)

    if (-not (Test-Path $EnvPath)) {
        return ""
    }

    $pattern = "^\s*" + [regex]::Escape($Name) + "\s*=\s*(.*?)\s*$"
    foreach ($line in Get-Content -LiteralPath $EnvPath -Encoding UTF8) {
        if ($line -match $pattern) {
            return $Matches[1].Trim().Trim("'`"")
        }
    }
    return ""
}

function Set-EnvValue {
    param(
        [string]$Name,
        [string]$Value
    )

    if (-not $Name) {
        return
    }
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    if (-not (Test-Path $EnvPath)) {
        New-Item -ItemType File -Path $EnvPath -Force | Out-Null
    }

    $lines = @(Get-Content -LiteralPath $EnvPath -Encoding UTF8 -ErrorAction SilentlyContinue)
    $pattern = "^\s*" + [regex]::Escape($Name) + "\s*="
    $updated = $false
    $next = @()
    foreach ($line in $lines) {
        if ($line -match $pattern) {
            $next += "$Name=$Value"
            $updated = $true
        } else {
            $next += $line
        }
    }
    if (-not $updated) {
        $next += "$Name=$Value"
    }
    $next | Set-Content -LiteralPath $EnvPath -Encoding UTF8
    Write-Ok "Stored API key in .env as $Name"
}

$selected = Resolve-ProviderChoice
$defaults = Get-ProviderDefaults $selected

$providerValue = [string]$defaults.provider
$baseUrlValue = if ($BaseUrl) { $BaseUrl.Trim() } else { Read-Value "Base URL" ([string]$defaults.base_url) }
$modelValue = if ($Model) { $Model.Trim() } else { Read-Value "Model" ([string]$defaults.model) }
$apiKeyEnvValue = if ($ApiKeyEnv) { $ApiKeyEnv.Trim() } else { [string]$defaults.api_key_env }

if ($defaults.needs_key -and -not $ApiKeyEnvValue) {
    $apiKeyEnvValue = Read-Value "API key env var name" "TAFFY_LLM_API_KEY"
}

if (-not $modelValue) {
    throw "Model cannot be empty."
}
Assert-HttpUrl $baseUrlValue "Base URL"

$keyToStore = $ApiKey
if ($defaults.needs_key -and -not $SkipApiKey) {
    $existing = Get-EnvValue $apiKeyEnvValue
    if ($existing -and -not $ApiKey) {
        Write-Ok ".env already contains $apiKeyEnvValue; leaving it unchanged."
    } elseif (-not $ApiKey) {
        $keyToStore = Read-SecretValue "API key for $apiKeyEnvValue (press Enter to skip)"
    }
}

Write-LocalConfig $providerValue $baseUrlValue $modelValue $apiKeyEnvValue

if ($defaults.needs_key) {
    if ($keyToStore) {
        Set-EnvValue $apiKeyEnvValue $keyToStore
    } elseif (-not (Get-EnvValue $apiKeyEnvValue)) {
        Write-WarnLine "No API key was stored. Add $apiKeyEnvValue to .env before using this provider."
    }
} else {
    Write-InfoLine "Ollama selected; no API key is required. Make sure Ollama is running before chat."
}

Write-Host ""
Write-Ok "LLM configuration complete."
Write-Host "Model choice is yours; for Xinyu preview, prefer a stable model that passes diagnostics and usually replies in under 15 seconds."
Write-Host "Model selection guide:"
Write-Host "  docs\model-selection.md"
Write-Host "Next checks:"
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\diagnose-llm-link.ps1"
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1"
Write-Host "Then launch:"
Write-Host "  .\start_electron.bat"
