#!/usr/bin/env python3
"""Basic secret leak guard for tracked text files."""

from __future__ import annotations

import re
import sys
from pathlib import Path


TEXT_SUFFIXES = {
    ".py",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".html",
    ".css",
    ".md",
    ".txt",
    ".toml",
    ".ini",
    ".yml",
    ".yaml",
    ".env",
    ".example",
}

SKIP_DIRS = {
    ".git",
    ".mem0",
    "__pycache__",
    "node_modules",
    "models",
    "tts_ref",
    "docs/assets",
    "docs/test-results",
}

GENERIC_SECRET_PATTERNS = [
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bAIza[0-9A-Za-z\-_]{20,}\b"),
]

ENV_ASSIGNMENT_PATTERNS = [
    re.compile(r"^\s*(OPENAI_API_KEY|DASHSCOPE_API_KEY|TAFFY_API_TOKEN)\s*=\s*(.+?)\s*$"),
    re.compile(r"^\s*(VOLCENGINE_ACCESS_TOKEN|VOLCENGINE_SECRET_KEY)\s*=\s*(.+?)\s*$"),
]

JSON_ASSIGNMENT_PATTERNS = [
    re.compile(r'"api_key"\s*:\s*"([^"]+)"'),
    re.compile(r'"apiToken"\s*:\s*"([^"]+)"'),
    re.compile(r'"api_token"\s*:\s*"([^"]+)"'),
]

SAFE_VALUE_FRAGMENTS = (
    "",
    "your_",
    "YOUR_",
    "example",
    "placeholder",
    "replace",
    "<",
    "null",
    "none",
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _should_skip(rel: Path) -> bool:
    rel_text = rel.as_posix()
    if rel_text.startswith("docs/assets/") or rel_text.startswith("docs/test-results/"):
        return True
    return any(part in SKIP_DIRS for part in rel.parts)


def _iter_text_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if _should_skip(rel):
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {".env", ".env.example"}:
            continue
        yield path, rel


def _looks_like_real_secret(value: str) -> bool:
    cleaned = str(value or "").strip().strip("'\"")
    low = cleaned.lower()
    if len(cleaned) < 12:
        return False
    return not any(fragment in low for fragment in SAFE_VALUE_FRAGMENTS)


def _scan_lines(rel: Path, text: str):
    failures = []
    for idx, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        for pat in GENERIC_SECRET_PATTERNS:
            if pat.search(raw_line):
                failures.append(f"{rel.as_posix()}:{idx} suspicious token pattern")
                break

        for pat in ENV_ASSIGNMENT_PATTERNS:
            m = pat.match(raw_line)
            if not m:
                continue
            _, value = m.groups()
            if _looks_like_real_secret(value):
                failures.append(f"{rel.as_posix()}:{idx} looks like committed secret value")

        for pat in JSON_ASSIGNMENT_PATTERNS:
            m = pat.search(raw_line)
            if not m:
                continue
            value = m.group(1)
            if _looks_like_real_secret(value):
                failures.append(f"{rel.as_posix()}:{idx} looks like committed API key/token")
    return failures


def main() -> int:
    root = _repo_root()
    failures = []
    checked = 0
    for path, rel in _iter_text_files(root):
        checked += 1
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            failures.append(f"{rel.as_posix()}: cannot read file ({exc})")
            continue
        failures.extend(_scan_lines(rel, text))

    if failures:
        print("Secret scan failed:")
        for line in failures:
            print(f" - {line}")
        return 1

    print(f"Secret scan passed ({checked} file(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
