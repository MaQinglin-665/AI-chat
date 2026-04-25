param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$hookDir = Join-Path $repoRoot ".git/hooks"

if (-not (Test-Path $hookDir)) {
    throw ".git/hooks not found. Run this script from inside the repository."
}

$hookPath = Join-Path $hookDir "pre-commit"
if ((Test-Path $hookPath) -and -not $Force) {
    Write-Host "pre-commit already exists. Use -Force to overwrite."
    exit 0
}

$content = @'
#!/bin/sh
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$REPO_ROOT" || exit 0

if command -v python >/dev/null 2>&1; then
  python scripts/check_encoding.py --staged
  exit $?
fi

if command -v py >/dev/null 2>&1; then
  py -3 scripts/check_encoding.py --staged
  exit $?
fi

echo "[pre-commit] Python not found. Skipping encoding check." >&2
exit 0
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($hookPath, $content, $utf8NoBom)
Write-Host "Installed pre-commit: $hookPath"
