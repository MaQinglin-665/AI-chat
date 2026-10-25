"""Check installed metadata and real imports without contacting model services."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_IMPORTS = (
    "edge_tts", "mem0", "webview", "qdrant_client", "sentence_transformers", "vosk",
)


def check_dependencies(*, dev: bool = False) -> int:
    result = subprocess.run([sys.executable, "-m", "pip", "check"], cwd=ROOT, check=False)
    if result.returncode:
        return result.returncode
    env = os.environ.copy()
    env.update({"HF_HUB_OFFLINE": "1", "HF_HUB_DISABLE_TELEMETRY": "1", "MEM0_TELEMETRY": "false"})
    modules = (*RUNTIME_IMPORTS, *(("pytest",) if dev else ()))
    # Isolate native/DLL loading and bound each import; find_spec alone cannot
    # detect installed packages whose transitive imports fail at startup.
    failed = False
    for module in modules:
        try:
            result = subprocess.run(
                [sys.executable, "-c", f"import {module}"], cwd=ROOT,
                env=env, capture_output=True, text=True, errors="replace",
                timeout=120, check=False,
            )
        except subprocess.TimeoutExpired:
            print(f"[FAIL] Import timed out: {module}", flush=True)
            failed = True
            continue
        if result.returncode:
            print(f"[FAIL] Import failed: {module}", flush=True)
            print((result.stderr or result.stdout).strip(), flush=True)
            failed = True
        else:
            print(f"[OK] Import: {module}", flush=True)
    return int(failed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dev", action="store_true", help="Also import the test runner.")
    raise SystemExit(check_dependencies(dev=parser.parse_args().dev))
