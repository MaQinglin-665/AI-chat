#!/usr/bin/env bash
set -euo pipefail

echo "=== Harness Initialization ==="

if command -v powershell >/dev/null 2>&1; then
  POWERSHELL_BIN="powershell"
elif command -v pwsh >/dev/null 2>&1; then
  POWERSHELL_BIN="pwsh"
else
  echo "PowerShell was not found. Run the documented targeted commands from AGENTS.md instead."
  exit 1
fi

echo "=== powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1 ==="
"${POWERSHELL_BIN}" -NoProfile -ExecutionPolicy Bypass -File scripts/test-local.ps1

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run verification before claiming done"
