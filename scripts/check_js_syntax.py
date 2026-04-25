#!/usr/bin/env python3
"""Repository-wide JavaScript syntax check using `node --check`."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


CHECK_SUFFIXES = {".js", ".mjs", ".cjs"}
SKIP_DIRS = {
    ".git",
    ".mem0",
    "__pycache__",
    "node_modules",
    "docs/node_modules",
    "docs/test-results",
}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _should_skip(path: Path) -> bool:
    rel = path.as_posix()
    if rel.startswith("docs/node_modules/") or rel.startswith("docs/test-results/"):
        return True
    return any(part in SKIP_DIRS for part in path.parts)


def _iter_js_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in CHECK_SUFFIXES:
            continue
        rel = path.relative_to(root)
        if _should_skip(rel):
            continue
        yield path


def _check_file(path: Path, root: Path) -> str:
    proc = subprocess.run(
        ["node", "--check", str(path)],
        cwd=str(root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if proc.returncode == 0:
        return ""
    detail = (proc.stderr or proc.stdout or "").strip()
    return detail or "node --check failed"


def main() -> int:
    root = _repo_root()
    failures = []
    checked = 0
    for js_file in _iter_js_files(root):
        checked += 1
        err = _check_file(js_file, root)
        if err:
            failures.append((js_file.relative_to(root).as_posix(), err))

    if failures:
        print("JavaScript syntax check failed:")
        for rel, err in failures:
            print(f" - {rel}\n{err}")
        return 1

    print(f"JavaScript syntax check passed ({checked} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
