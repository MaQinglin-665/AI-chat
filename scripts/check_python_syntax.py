#!/usr/bin/env python3
"""Repository-wide Python syntax check."""

from __future__ import annotations

import py_compile
import sys
from pathlib import Path


SKIP_DIRS = {
    ".git",
    ".mem0",
    ".pytest_cache",
    "__pycache__",
    "node_modules",
    "dist",
    "models",
    "tts_ref",
    "memory_backups",
}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _iter_python_files(root: Path):
    for path in root.rglob("*.py"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def main() -> int:
    root = _repo_root()
    failures = []
    checked = 0
    for file_path in _iter_python_files(root):
        checked += 1
        try:
            py_compile.compile(str(file_path), doraise=True)
        except Exception as exc:  # pragma: no cover - error path
            failures.append((file_path.relative_to(root).as_posix(), str(exc)))

    if failures:
        print("Python syntax check failed:")
        for rel, err in failures:
            print(f" - {rel}: {err}")
        return 1

    print(f"Python syntax check passed ({checked} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
