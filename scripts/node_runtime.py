"""Resolve project-local Node.js tools without changing the global PATH."""

from __future__ import annotations

import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_NODE_DIR = ".local-tools/node22"


def _existing_file(path: Path) -> str | None:
    return str(path) if path.is_file() else None


def _node_home_tool(node_home: str, tool: str) -> str | None:
    if not node_home:
        return None
    base = Path(node_home)
    candidates = [base / f"{tool}.exe", base / tool]
    if tool == "npm":
        candidates.insert(0, base / "npm.cmd")
    for candidate in candidates:
        found = _existing_file(candidate)
        if found:
            return found
    return None


def resolve_node_command(tool: str = "node", *, root: Path | str | None = None) -> list[str]:
    safe_tool = str(tool or "node").strip().lower()
    if safe_tool not in {"node", "npm"}:
        raise ValueError(f"Unsupported Node tool: {tool}")

    if safe_tool == "node":
        env_node = _existing_file(Path(os.environ.get("TAFFY_NODE_EXE", "")))
        if env_node:
            return [env_node]

    env_home = _node_home_tool(os.environ.get("TAFFY_NODE_HOME", ""), safe_tool)
    if env_home:
        return [env_home]

    repo_root = Path(root) if root is not None else ROOT
    local_home = repo_root / PROJECT_NODE_DIR
    local_tool = _node_home_tool(str(local_home), safe_tool)
    if local_tool:
        return [local_tool]

    return [safe_tool]
