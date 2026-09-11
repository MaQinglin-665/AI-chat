param(
    [string]$RuntimeDir = "",
    [string]$Model = "",
    [string]$Speaker = "Ono_Anna",
    [string]$Language = "Auto",
    [ValidateSet("auto", "custom_voice", "voice_design")]
    [string]$Mode = "auto",
    [int]$Port = 9881,
    [int]$ChunkSize = 4
)

$ErrorActionPreference = "Stop"
if (-not $RuntimeDir) {
    $workspaceRuntime = "D:\AI\qwen3_tts_runtime"
    $RuntimeDir = if (Test-Path -LiteralPath $workspaceRuntime) {
        $workspaceRuntime
    } else {
        Join-Path $env:LOCALAPPDATA "XinyuAI\qwen3-tts"
    }
}
$runtimePath = [System.IO.Path]::GetFullPath($RuntimeDir)
$venvPython = Join-Path $runtimePath ".venv\Scripts\python.exe"
$serverScript = (Resolve-Path (Join-Path $PSScriptRoot "qwen3_tts_server.py")).Path
if (-not $Model) {
    $workspaceModel = "D:\AI\models\Qwen3-TTS-12Hz-1.7B-VoiceDesign"
    $Model = if (Test-Path -LiteralPath $workspaceModel) {
        $workspaceModel
    } else {
        "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
    }
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    throw "Qwen3-TTS runtime is missing: $venvPython. Run scripts\setup-qwen3-tts.ps1 first."
}

& $venvPython $serverScript `
    --model $Model `
    --mode $Mode `
    --speaker $Speaker `
    --language $Language `
    --port $Port `
    --chunk-size $ChunkSize
