param(
    [ValidateSet("auto", "cpu", "cuda")]
    [string]$Device = "auto"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $Root ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Project virtual environment not found. Run install_first_run.bat first."
}

Write-Host "Installing the optional local ASR runtime..."
& $Python -m pip install --upgrade torch torchaudio --index-url https://download.pytorch.org/whl/cu128
& $Python -m pip install --upgrade -r (Join-Path $Root "requirements-asr.txt")

Write-Host "Downloading and validating the private local ASR models..."
& $Python (Join-Path $Root "scripts\preload_local_asr_models.py") --device $Device

Write-Host "Local Paraformer + SenseVoice ASR setup completed."
