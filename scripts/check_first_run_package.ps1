param(
    [string]$WorkRoot,
    [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($WorkRoot) {
    $TempRoot = Join-Path (Resolve-Path $WorkRoot) ("taffy-first-run-smoke-" + [guid]::NewGuid().ToString("N"))
} else {
    $TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("taffy-first-run-smoke-" + [guid]::NewGuid().ToString("N"))
}

$PackageOut = Join-Path $TempRoot "dist"
$ExtractRoot = Join-Path $TempRoot "extract"

function Write-Ok($Message) {
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-Fail($Message) {
    throw $Message
}

function Invoke-Step {
    param(
        [string]$Title,
        [object[]]$CommandParts,
        [string]$WorkingDirectory = $RepoRoot
    )

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    $exe = [string]$CommandParts[0]
    $args = @($CommandParts | Select-Object -Skip 1)
    & $exe @args
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Title"
    }
}

function Assert-PathExists {
    param(
        [string]$Root,
        [string]$RelativePath
    )

    $path = Join-Path $Root $RelativePath
    if (-not (Test-Path $path)) {
        Write-Fail "Missing expected package path: $RelativePath"
    }
    Write-Ok "Found $RelativePath"
}

function Assert-PathMissing {
    param(
        [string]$Root,
        [string]$RelativePath
    )

    $path = Join-Path $Root $RelativePath
    if (Test-Path $path) {
        Write-Fail "Package should not contain local runtime path: $RelativePath"
    }
    Write-Ok "Excluded $RelativePath"
}

try {
    New-Item -ItemType Directory -Path $PackageOut -Force | Out-Null
    New-Item -ItemType Directory -Path $ExtractRoot -Force | Out-Null

    Invoke-Step "Create source-test package" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        (Join-Path $RepoRoot "scripts\package-source-test.ps1"),
        "-Version",
        "bootstrap-smoke",
        "-OutputDir",
        $PackageOut
    )

    $zip = Get-ChildItem -LiteralPath $PackageOut -Filter "*.zip" | Select-Object -First 1
    if (-not $zip) {
        Write-Fail "Package zip was not created under $PackageOut"
    }
    Write-Ok "Created package zip: $($zip.Name)"

    Expand-Archive -LiteralPath $zip.FullName -DestinationPath $ExtractRoot -Force
    $packageRoot = Get-ChildItem -LiteralPath $ExtractRoot -Directory | Select-Object -First 1
    if (-not $packageRoot) {
        Write-Fail "Package zip did not expand to a folder."
    }
    Write-Ok "Expanded package to $($packageRoot.FullName)"

    $requiredPaths = @(
        "README-FIRST-RUN.txt",
        "README.md",
        "START_HERE.txt",
        "THIRD_PARTY_NOTICES.md",
        ".github\ISSUE_TEMPLATE\preview-feedback.yml",
        "docs\external-tester-checklist.md",
        "docs\assets\demo-overview.mp4",
        "docs\assets\demo-overview-poster.png",
        "docs\assets\preview-chat.png",
        "docs\first-install.md",
        "docs\installer.md",
        "docs\model-selection.md",
        "install_and_start.bat",
        "install_first_run.bat",
        "installer\xinyu-online-installer.nsi",
        "prepare_preview_environment.bat",
        "start_electron.bat",
        "scripts\bootstrap-first-run.ps1",
        "scripts\apply-preview-experience-config.ps1",
        "scripts\build-installer.ps1",
        "scripts\check_installer_smoke.ps1",
        "scripts\clean-local-artifacts.ps1",
        "scripts\prepare-preview-environment.ps1",
        "scripts\configure-llm.ps1",
        "scripts\diagnose-llm-link.ps1",
        "scripts\diagnose_llm_link.py",
        "scripts\first_chat_smoke.ps1",
        "scripts\first_run_check.py",
        "scripts\write-release-assets.ps1",
        "config.example.json",
        "config.preview.example.json",
        "app_health.py",
        "first_run.py",
        "character_brain.py",
        "llm_runtime.py",
        "package.json",
        "package-lock.json",
        "requirements.txt",
        "web"
    )
    foreach ($path in $requiredPaths) {
        Assert-PathExists $packageRoot.FullName $path
    }

    $forbiddenPaths = @(
        ".env",
        ".venv",
        "config.json",
        "config.local.json",
        "node_modules",
        "web\generated_images",
        "server_out.log",
        "server_err.log"
    )
    foreach ($path in $forbiddenPaths) {
        Assert-PathMissing $packageRoot.FullName $path
    }

    $packageMetadataCheck = @'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const rootKey = Object.keys(lock.packages || {}).find((key) => key.length === 0);
const root = rootKey !== undefined ? lock.packages[rootKey] : {};
const mismatches = [];
if (lock.name !== pkg.name) mismatches.push("package-lock.json name does not match package.json");
if (lock.version !== pkg.version) mismatches.push("package-lock.json version does not match package.json");
if (root.version && root.version !== pkg.version) mismatches.push("package-lock.json root package version does not match package.json");
if (mismatches.length) {
  console.error(mismatches.join("\n"));
  process.exit(1);
}
'@
    $packageMetadataCheckPath = Join-Path $TempRoot "check-package-metadata.js"
    Set-Content -LiteralPath $packageMetadataCheckPath -Value $packageMetadataCheck -Encoding UTF8
    Invoke-Step "Check package metadata consistency" @(
        "node",
        $packageMetadataCheckPath
    ) $packageRoot.FullName
    Write-Ok "Package metadata matches package-lock.json"

    Invoke-Step "Run package bootstrap smoke without network installs" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        (Join-Path $packageRoot.FullName "scripts\bootstrap-first-run.ps1"),
        "-SkipPythonDeps",
        "-SkipNodeInstall",
        "-SkipPreflight",
        "-SkipToolInstall"
    ) $packageRoot.FullName

    Assert-PathExists $packageRoot.FullName ".venv\Scripts\python.exe"
    Assert-PathExists $packageRoot.FullName "config.json"
    Assert-PathExists $packageRoot.FullName ".env"

    $envText = Get-Content -Raw -LiteralPath (Join-Path $packageRoot.FullName ".env") -Encoding UTF8
    if ($envText -notmatch "(?m)^\s*TAFFY_API_TOKEN\s*=") {
        Write-Fail "Bootstrap did not create TAFFY_API_TOKEN in .env"
    }
    Write-Ok "Bootstrap generated TAFFY_API_TOKEN"

    $cfg = Get-Content -Raw -LiteralPath (Join-Path $packageRoot.FullName "config.json") -Encoding UTF8 | ConvertFrom-Json
    $runtimeCfg = $cfg.character_runtime
    if ($runtimeCfg.enabled -eq $true) {
        Write-Fail "Packaged first-run config should keep character_runtime.enabled=false"
    }
    if ($runtimeCfg.return_metadata -eq $true) {
        Write-Fail "Packaged first-run config should keep character_runtime.return_metadata=false"
    }
    if ($runtimeCfg.auto_apply_reply_cue -eq $true) {
        Write-Fail "Packaged first-run config should keep character_runtime.auto_apply_reply_cue=false"
    }
    Write-Ok "Packaged Character Runtime defaults are opt-in/off"

    $observeCfg = $cfg.observe
    $observeAttachMode = [string]$observeCfg.attach_mode
    if ($observeAttachMode.Trim().ToLowerInvariant() -eq "auto") {
        Write-Fail "Packaged first-run config should not use automatic desktop observation"
    }
    if ($observeCfg.allow_auto_chat -eq $true -or $observeCfg.auto_chat_enabled -eq $true) {
        Write-Fail "Packaged first-run config should keep auto chat disabled"
    }
    Write-Ok "Packaged desktop observation and auto chat defaults are safe"

    $toolsCfg = $cfg.tools
    if ($toolsCfg.enabled -eq $true) {
        Write-Fail "Packaged first-run config should keep tools.enabled=false"
    }
    if ($toolsCfg.allow_shell -eq $true) {
        Write-Fail "Packaged first-run config should keep tools.allow_shell=false"
    }
    Write-Ok "Packaged tool-calling and shell defaults are off"

    Invoke-Step "Import packaged backend app" @(
        "python",
        "-c",
        "import app; print('import app ok')"
    ) $packageRoot.FullName

    $models = @(Get-ChildItem -LiteralPath (Join-Path $packageRoot.FullName "web\models") -Recurse -Filter "*.model3.json" -File -ErrorAction SilentlyContinue)
    if ($models.Count -eq 1) {
        if ([string]$cfg.model_path -eq "/models/your_model/model3.json") {
            Write-Fail "Bootstrap did not auto-detect the single packaged Live2D model."
        }
        Write-Ok "Bootstrap auto-configured packaged Live2D model_path: $($cfg.model_path)"
    } elseif ($models.Count -eq 0) {
        Write-Host "[WARN] No packaged Live2D model found; first launch will require manual model_path setup." -ForegroundColor Yellow
    } else {
        Write-Host "[WARN] Multiple packaged Live2D models found; first launch will require manual model_path review." -ForegroundColor Yellow
    }

    Invoke-Step "Run LLM configure smoke" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        (Join-Path $packageRoot.FullName "scripts\configure-llm.ps1"),
        "-Provider",
        "openai-compatible",
        "-BaseUrl",
        "http://127.0.0.1:9999/v1",
        "-Model",
        "smoke-model",
        "-ApiKeyEnv",
        "TAFFY_LLM_API_KEY",
        "-ApiKey",
        "smoke-key",
        "-NoPrompt"
    ) $packageRoot.FullName

    Assert-PathExists $packageRoot.FullName "config.local.json"
    $localCfg = Get-Content -Raw -LiteralPath (Join-Path $packageRoot.FullName "config.local.json") -Encoding UTF8 | ConvertFrom-Json
    if ([string]$localCfg.llm.provider -ne "openai-compatible") {
        Write-Fail "LLM configure did not set provider in config.local.json"
    }
    if ([string]$localCfg.llm.api_key_env -ne "TAFFY_LLM_API_KEY") {
        Write-Fail "LLM configure did not set api_key_env in config.local.json"
    }
    $envTextAfterLlm = Get-Content -Raw -LiteralPath (Join-Path $packageRoot.FullName ".env") -Encoding UTF8
    if ($envTextAfterLlm -notmatch "(?m)^\s*TAFFY_LLM_API_KEY\s*=\s*smoke-key\s*$") {
        Write-Fail "LLM configure did not write TAFFY_LLM_API_KEY to .env"
    }
    Write-Ok "LLM configure smoke wrote config.local.json and .env"

    Invoke-Step "Run preview experience config smoke" @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        (Join-Path $packageRoot.FullName "scripts\apply-preview-experience-config.ps1")
    ) $packageRoot.FullName

    $previewCfg = Get-Content -Raw -LiteralPath (Join-Path $packageRoot.FullName "config.local.json") -Encoding UTF8 | ConvertFrom-Json
    if ([string]$previewCfg.llm.provider -ne "openai-compatible") {
        Write-Fail "Preview config should not overwrite existing LLM provider."
    }
    if ([string]$previewCfg.llm.base_url -ne "http://127.0.0.1:9999/v1") {
        Write-Fail "Preview config should not overwrite existing LLM base_url."
    }
    if ([string]$previewCfg.llm.model -ne "smoke-model") {
        Write-Fail "Preview config should not overwrite existing LLM model."
    }
    if ([string]$previewCfg.llm.api_key_env -ne "TAFFY_LLM_API_KEY") {
        Write-Fail "Preview config should not overwrite existing LLM api_key_env."
    }
    if ($previewCfg.character_runtime.enabled -ne $true -or $previewCfg.character_runtime.auto_apply_reply_cue -ne $true) {
        Write-Fail "Preview config should enable the explicit Character Runtime experience layer."
    }
    if ([string]$previewCfg.observe.attach_mode -eq "auto") {
        Write-Fail "Preview config should not enable automatic desktop observation."
    }
    if ($previewCfg.observe.allow_auto_chat -eq $true -or $previewCfg.observe.auto_chat_enabled -eq $true) {
        Write-Fail "Preview config should keep proactive/auto chat disabled by default."
    }
    if ($previewCfg.tools.enabled -eq $true -or $previewCfg.tools.allow_shell -eq $true) {
        Write-Fail "Preview config should keep tools and shell disabled."
    }
    Write-Ok "Preview experience config smoke kept LLM settings and safety defaults"

    Invoke-Step "Parse first-chat smoke script" @(
        "powershell",
        "-NoProfile",
        "-Command",
        "`$script = Get-Content -Raw scripts\first_chat_smoke.ps1; [scriptblock]::Create(`$script) | Out-Null; Write-Host 'first-chat smoke parse ok'"
    ) $packageRoot.FullName

    Write-Host ""
    Write-Ok "First-run package smoke passed."
} finally {
    if (-not $KeepTemp -and (Test-Path $TempRoot)) {
        Remove-Item -LiteralPath $TempRoot -Recurse -Force
    } elseif ($KeepTemp) {
        Write-Host "[INFO] Kept temp folder: $TempRoot" -ForegroundColor Cyan
    }
}
