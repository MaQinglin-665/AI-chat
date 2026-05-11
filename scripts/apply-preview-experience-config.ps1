param(
    [string]$PreviewConfigPath,
    [string]$LocalConfigPath
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

if (-not $PreviewConfigPath) {
    $PreviewConfigPath = Join-Path $RepoRoot "config.preview.example.json"
}
if (-not $LocalConfigPath) {
    $LocalConfigPath = Join-Path $RepoRoot "config.local.json"
}

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-InfoLine($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Read-JsonObject {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return [pscustomobject]@{}
    }

    $raw = Get-Content -Raw -LiteralPath $Path -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return [pscustomobject]@{}
    }

    $parsed = $raw | ConvertFrom-Json
    if ($parsed -isnot [pscustomobject]) {
        throw "$Path must contain a JSON object."
    }
    return $parsed
}

function Test-JsonObject($Value) {
    return $Value -is [pscustomobject]
}

function Ensure-ObjectProperty {
    param(
        [pscustomobject]$Object,
        [string]$Name
    )

    $prop = $Object.PSObject.Properties[$Name]
    if (-not $prop -or $null -eq $prop.Value -or -not (Test-JsonObject $prop.Value)) {
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

function Test-PreserveExistingPath {
    param(
        [string]$Path,
        [object]$ExistingValue
    )

    $preservePaths = @(
        "llm.provider",
        "llm.base_url",
        "llm.model",
        "llm.api_key_env",
        "llm.api_key"
    )
    if ($preservePaths -notcontains $Path) {
        return $false
    }
    return -not [string]::IsNullOrWhiteSpace([string]$ExistingValue)
}

function Merge-PreviewObject {
    param(
        [pscustomobject]$Target,
        [pscustomobject]$Source,
        [string]$Path = ""
    )

    foreach ($prop in $Source.PSObject.Properties) {
        $name = [string]$prop.Name
        $nextPath = if ($Path) { "$Path.$name" } else { $name }
        $sourceValue = $prop.Value
        $existingProp = $Target.PSObject.Properties[$name]
        $existingValue = if ($existingProp) { $existingProp.Value } else { $null }

        if (Test-PreserveExistingPath $nextPath $existingValue) {
            continue
        }

        if (Test-JsonObject $sourceValue) {
            $targetChild = Ensure-ObjectProperty $Target $name
            Merge-PreviewObject $targetChild $sourceValue $nextPath
        } else {
            Set-JsonProperty $Target $name $sourceValue
        }
    }
}

if (-not (Test-Path $PreviewConfigPath)) {
    throw "Preview config was not found: $PreviewConfigPath"
}

$preview = Read-JsonObject $PreviewConfigPath
$local = Read-JsonObject $LocalConfigPath
Merge-PreviewObject $local $preview

$local | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $LocalConfigPath -Encoding UTF8

Write-Ok "Applied Xinyu preview experience settings to config.local.json"
Write-InfoLine "Existing LLM provider/base URL/model/api_key_env were preserved when present."
Write-InfoLine "No API key was written by this script."
Write-InfoLine "Desktop observation, screenshots, tools, and shell remain disabled unless you explicitly change them."
Write-Host ""
Write-Host "Next checks:"
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\first_chat_smoke.ps1"
Write-Host "Then launch:"
Write-Host "  .\start_electron.bat"
