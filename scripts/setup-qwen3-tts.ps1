param(
    [string]$RuntimeDir = "",
    [string]$Python = "python",
    [string]$Model = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    [switch]$SkipInstall,
    [switch]$PreferModelScope
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $RuntimeDir) {
    $RuntimeDir = Join-Path $env:LOCALAPPDATA "XinyuAI\qwen3-tts"
}
$runtimePath = [System.IO.Path]::GetFullPath($RuntimeDir)
$venvPython = Join-Path $runtimePath ".venv\Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null
if (-not (Test-Path -LiteralPath $venvPython)) {
    & $Python -m venv (Join-Path $runtimePath ".venv")
}

if (-not $SkipInstall) {
    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "Failed to upgrade pip for Qwen3-TTS." }
    & $venvPython -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
    if ($LASTEXITCODE -ne 0) { throw "Failed to install Qwen3-TTS PyTorch runtime." }
    & $venvPython -m pip install "faster-qwen3-tts==0.3.2"
    if ($LASTEXITCODE -ne 0) { throw "Failed to install faster-qwen3-tts." }
}
$downloadExitCode = 1
if (-not $PreferModelScope) {
    & $venvPython -c "from huggingface_hub import snapshot_download; snapshot_download('$Model')"
    $downloadExitCode = $LASTEXITCODE
}
if ($downloadExitCode -ne 0) {
    $modelName = ($Model -split "/")[-1]
    $localModelDir = Join-Path (Split-Path $projectRoot -Parent) (Join-Path "models" $modelName)
    Write-Warning "Hugging Face download failed; retrying with ModelScope at $localModelDir"
    & $venvPython -c "from modelscope import snapshot_download; snapshot_download('$Model', local_dir=r'$localModelDir')"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to download Qwen3-TTS model from both Hugging Face and ModelScope."
    }
}

Write-Output "Qwen3-TTS runtime is ready: $runtimePath"
Write-Output "Start it with:"
Write-Output "powershell -ExecutionPolicy Bypass -File `"$projectRoot\scripts\start-qwen3-tts.ps1`" -RuntimeDir `"$runtimePath`""
