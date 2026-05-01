#!/usr/bin/env python3
"""Run the Character Runtime v1.3 quality gate."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run(label: str, command: list[str], root: Path) -> int:
    print(f"\n== {label} ==", flush=True)
    print(" ".join(command), flush=True)
    proc = subprocess.run(command, cwd=str(root), check=False)
    if proc.returncode != 0:
        print(f"{label} failed with exit code {proc.returncode}.")
    return int(proc.returncode)


def main() -> int:
    root = _repo_root()
    checks = [
        ("Python tests", [sys.executable, "-m", "pytest"]),
        ("Frontend runtime metadata checks", ["node", "tests/test_character_runtime_frontend.js"]),
        ("Python syntax", [sys.executable, "scripts/check_python_syntax.py"]),
        ("JavaScript syntax", [sys.executable, "scripts/check_js_syntax.py"]),
        ("Secret scan", [sys.executable, "scripts/check_secrets.py"]),
    ]

    failures: list[str] = []
    for label, command in checks:
        code = _run(label, command, root)
        if code != 0:
            failures.append(label)

    if failures:
        print("\nCharacter Runtime v1.3 quality gate failed:")
        for label in failures:
            print(f" - {label}")
        return 1

    print("\nCharacter Runtime v1.3 quality gate passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
