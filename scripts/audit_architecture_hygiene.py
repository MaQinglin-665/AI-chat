#!/usr/bin/env python3
"""Read-only architecture and local hygiene audit for the desktop pet repo."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


SOURCE_SUFFIXES = {".py", ".js", ".css", ".html", ".md", ".json"}
CODE_SUFFIXES = {".py", ".js", ".css", ".html"}
EXCLUDED_DIR_NAMES = {
    ".git",
    ".venv",
    ".mem0",
    "__pycache__",
    "node_modules",
    "dist",
    "unpackage",
    "models",
    "web/generated_images",
}
SENSITIVE_TRACKED_NAMES = {
    ".env",
    "config.json",
    "config.local.json",
    "memory.json",
    "memory_core.json",
    "memory_persona_card.json",
    "memory_profile.json",
    "memory_relationship.json",
    "memory_session.json",
    "memory_summary.json",
    "emotion_state.json",
}
SENSITIVE_PREFIXES = (
    "memory_backups/",
    "tts_ref/",
    ".mem0/",
    "models/",
)
SENSITIVE_SUFFIXES = (
    ".key",
    ".pem",
    ".p12",
    ".pfx",
)


@dataclass(frozen=True)
class SourceFileStat:
    path: str
    lines: int
    bytes: int
    suffix: str


def _repo_relative(path: Path, repo_root: Path) -> str:
    return path.relative_to(repo_root).as_posix()


def _is_under_excluded_dir(path: Path, repo_root: Path) -> bool:
    rel_parts = _repo_relative(path, repo_root).split("/")
    for idx, part in enumerate(rel_parts):
        if part in EXCLUDED_DIR_NAMES:
            return True
        joined = "/".join(rel_parts[: idx + 1])
        if joined in EXCLUDED_DIR_NAMES:
            return True
    return False


def iter_source_files(repo_root: Path) -> Iterable[Path]:
    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue
        if _is_under_excluded_dir(path, repo_root):
            continue
        if path.suffix.lower() not in SOURCE_SUFFIXES:
            continue
        yield path


def count_lines(path: Path) -> int:
    try:
        with path.open("rb") as handle:
            return sum(1 for _line in handle)
    except OSError:
        return 0


def collect_source_file_stats(repo_root: Path) -> list[SourceFileStat]:
    stats = []
    for path in iter_source_files(repo_root):
        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        stats.append(
            SourceFileStat(
                path=_repo_relative(path, repo_root),
                lines=count_lines(path),
                bytes=size,
                suffix=path.suffix.lower(),
            )
        )
    return sorted(stats, key=lambda item: (-item.lines, item.path))


def run_git(repo_root: Path, args: list[str]) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo_root), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        return ""
    return result.stdout


def collect_tracked_paths(repo_root: Path) -> list[str]:
    output = run_git(repo_root, ["ls-files"])
    return [line.strip().replace("\\", "/") for line in output.splitlines() if line.strip()]


def is_sensitive_tracked_path(path: str) -> bool:
    normalized = path.strip().replace("\\", "/").lstrip("./")
    lower = normalized.lower()
    if lower in SENSITIVE_TRACKED_NAMES:
        return True
    if lower.startswith(SENSITIVE_PREFIXES):
        return lower != "tts_ref/readme.md"
    return lower.endswith(SENSITIVE_SUFFIXES)


def find_sensitive_tracked_paths(tracked_paths: Iterable[str]) -> list[str]:
    return sorted(path for path in tracked_paths if is_sensitive_tracked_path(path))


def collect_ignored_paths(repo_root: Path, limit: int) -> list[str]:
    output = run_git(repo_root, ["status", "--ignored", "--short", "-z"])
    if not output:
        return []
    ignored = []
    for item in output.split("\0"):
        if not item.startswith("!! "):
            continue
        rel = item[3:].strip().replace("\\", "/")
        if rel:
            ignored.append(rel)
        if len(ignored) >= limit:
            break
    return ignored


def parse_worktree_porcelain(output: str) -> list[dict[str, str]]:
    worktrees = []
    current: dict[str, str] = {}
    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            if current:
                worktrees.append(current)
                current = {}
            continue
        key, _, value = line.partition(" ")
        if key == "worktree":
            if current:
                worktrees.append(current)
            current = {"path": value}
        elif key in {"HEAD", "branch"}:
            current[key.lower()] = value
    if current:
        worktrees.append(current)
    return worktrees


def collect_worktrees(repo_root: Path) -> list[dict[str, str]]:
    output = run_git(repo_root, ["worktree", "list", "--porcelain"])
    worktrees = parse_worktree_porcelain(output)
    for item in worktrees:
        item["role"] = "current" if Path(item.get("path", "")).resolve() == repo_root else "sibling"
    return worktrees


def build_report(repo_root: Path, *, top: int, ignored_limit: int, include_siblings: bool) -> dict:
    source_stats = collect_source_file_stats(repo_root)
    tracked_paths = collect_tracked_paths(repo_root)
    code_stats = [item for item in source_stats if item.suffix in CODE_SUFFIXES]
    total_code_lines = sum(item.lines for item in code_stats)
    report = {
        "repo_root": str(repo_root),
        "source_file_count": len(source_stats),
        "code_file_count": len(code_stats),
        "total_code_lines": total_code_lines,
        "largest_files": [item.__dict__ for item in source_stats[:top]],
        "largest_code_files": [item.__dict__ for item in code_stats[:top]],
        "sensitive_tracked_paths": find_sensitive_tracked_paths(tracked_paths),
        "ignored_local_artifacts_sample": collect_ignored_paths(repo_root, ignored_limit),
    }
    if include_siblings:
        report["worktrees"] = collect_worktrees(repo_root)
    return report


def print_text_report(report: dict) -> None:
    print("[ARCH] Source files:", report["source_file_count"])
    print("[ARCH] Code files:", report["code_file_count"])
    print("[ARCH] Total code lines:", report["total_code_lines"])
    print("[ARCH] Largest code files:")
    for item in report["largest_code_files"]:
        print(f"  {item['lines']:>5} lines  {item['path']}")

    sensitive = report["sensitive_tracked_paths"]
    if sensitive:
        print("[HIGH] Sensitive tracked paths:")
        for path in sensitive:
            print(f"  {path}")
    else:
        print("[OK] No sensitive tracked paths matched the audit patterns.")

    ignored = report["ignored_local_artifacts_sample"]
    if ignored:
        print("[INFO] Ignored local artifacts sample:")
        for path in ignored:
            print(f"  {path}")
    else:
        print("[OK] No ignored local artifacts reported by git status.")

    if "worktrees" in report:
        print("[ARCH] Worktrees:")
        for item in report["worktrees"]:
            branch = item.get("branch", "(detached)")
            print(f"  {item.get('role', 'unknown')}: {branch} @ {item.get('path', '')}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=os.getcwd())
    parser.add_argument("--top", type=int, default=12)
    parser.add_argument("--ignored-limit", type=int, default=20)
    parser.add_argument("--include-siblings", action="store_true")
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("--fail-on-sensitive", action="store_true")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    report = build_report(
        repo_root,
        top=max(1, args.top),
        ignored_limit=max(0, args.ignored_limit),
        include_siblings=args.include_siblings,
    )
    if args.as_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_text_report(report)

    if args.fail_on_sensitive and report["sensitive_tracked_paths"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
