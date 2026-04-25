#!/usr/bin/env python3
"""UTF-8 / mojibake guard for this repository.

Usage:
  python scripts/check_encoding.py --staged <file1> <file2> ...
  python scripts/check_encoding.py <file1> <file2> ...
  python scripts/check_encoding.py
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


TEXT_SUFFIXES = {
    ".py",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".json",
    ".html",
    ".css",
    ".md",
    ".txt",
    ".toml",
    ".ini",
    ".yml",
    ".yaml",
}

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".mem0",
    "__pycache__",
    "tts_ref",
    "models",
}

# Common mojibake fragments seen when UTF-8 text is decoded/saved through GBK.
SUSPICIOUS_FRAGMENTS = (
    "鑷姩",
    "妗岄潰",
    "瑙傚療",
    "瀛︿範",
    "鎿嶄綔",
    "鍏抽棴",
    "璇峰厛",
    "宸叉挙閿",
    "澶辫触",
    "涓嶅彲鐢",
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _is_text_candidate(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.suffix.lower() not in TEXT_SUFFIXES:
        return False
    parts = set(path.parts)
    if parts & SKIP_DIRS:
        return False
    return True


def _iter_repo_files(root: Path):
    for p in root.rglob("*"):
        if not _is_text_candidate(p):
            continue
        yield p


def _normalize_paths(root: Path, raw_paths: list[str]) -> list[Path]:
    out: list[Path] = []
    seen: set[Path] = set()
    for raw in raw_paths:
        p = (root / raw).resolve() if not Path(raw).is_absolute() else Path(raw).resolve()
        try:
            rel = p.relative_to(root.resolve())
        except Exception:
            continue
        candidate = root / rel
        if candidate in seen:
            continue
        seen.add(candidate)
        out.append(candidate)
    return out


def _git_staged_added_lines(root: Path, rel_path: str) -> list[str]:
    cmd = ["git", "diff", "--cached", "--unified=0", "--", rel_path]
    proc = subprocess.run(
        cmd,
        cwd=str(root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if proc.returncode not in (0, 1):
        return []
    lines: list[str] = []
    for row in proc.stdout.splitlines():
        if not row.startswith("+"):
            continue
        if row.startswith("+++"):
            continue
        lines.append(row[1:])
    return lines


def _git_staged_files(root: Path) -> list[str]:
    cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]
    proc = subprocess.run(
        cmd,
        cwd=str(root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if proc.returncode not in (0, 1):
        return []
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def _contains_suspicious_text(text: str) -> bool:
    if "\ufffd" in text:
        return True
    return any(fragment in text for fragment in SUSPICIOUS_FRAGMENTS)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check UTF-8 encoding / mojibake.")
    parser.add_argument("--staged", action="store_true", help="Only check added staged lines for mojibake.")
    parser.add_argument("paths", nargs="*", help="Optional file paths to check.")
    args = parser.parse_args()

    root = _repo_root()
    if args.staged and not args.paths:
        staged = _git_staged_files(root)
        candidates = [p for p in _normalize_paths(root, staged) if _is_text_candidate(p)]
    elif args.paths:
        candidates = [p for p in _normalize_paths(root, args.paths) if _is_text_candidate(p)]
    else:
        candidates = list(_iter_repo_files(root))

    if not candidates:
        return 0

    failures: list[str] = []

    for path in candidates:
        rel = path.relative_to(root).as_posix()
        is_guard_script = rel == "scripts/check_encoding.py"
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            failures.append(f"[encoding] {rel}: not valid UTF-8 ({exc})")
            continue
        except Exception as exc:
            failures.append(f"[read] {rel}: {exc}")
            continue

        if "\ufffd" in content:
            failures.append(f"[replacement-char] {rel}: contains U+FFFD replacement character")

        if args.staged:
            added_lines = _git_staged_added_lines(root, rel)
            for idx, line in enumerate(added_lines, start=1):
                if is_guard_script:
                    continue
                if _contains_suspicious_text(line):
                    preview = line.strip()
                    if len(preview) > 100:
                        preview = preview[:97] + "..."
                    failures.append(f"[mojibake-added] {rel} (+line#{idx}): {preview}")
        else:
            if is_guard_script:
                continue
            if _contains_suspicious_text(content):
                failures.append(f"[mojibake] {rel}: contains suspicious mojibake fragments")

    if failures:
        print("Encoding check failed:")
        for line in failures:
            print(" -", line)
        return 1

    print(f"Encoding check passed ({len(candidates)} file(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
