param(
    [string]$RuntimeDir = "D:\AI\sensevoice_runtime"
)

$ErrorActionPreference = "Stop"
$runtimePath = [System.IO.Path]::GetFullPath($RuntimeDir)
$venvPython = Join-Path $runtimePath ".venv\Scripts\python.exe"
$requirementsPath = Join-Path $PSScriptRoot "..\requirements-asr-service.txt"

if (-not (Test-Path -LiteralPath $venvPython)) {
    python -m venv --system-site-packages (Join-Path $runtimePath ".venv")
}

& $venvPython -m pip install -r $requirementsPath
if ($LASTEXITCODE -ne 0) {
    throw "Failed to install the isolated SenseVoice ONNX runtime."
}

Write-Host "SenseVoice ONNX runtime ready: $venvPython"
