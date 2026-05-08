#!/usr/bin/env python3
"""Run the Character Brain / AI VTuber feeling v1.4 quality gate."""

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
        (
            "Python syntax",
            [sys.executable, "-m", "py_compile", "app.py", "character_brain.py", "llm_runtime.py"],
        ),
        (
            "Character Python tests",
            [
                sys.executable,
                "-m",
                "pytest",
                "-q",
                "tests/test_character_brain.py",
                "tests/test_character_experience_profile.py",
                "tests/test_character_runtime.py",
                "tests/test_character_runtime_integration.py",
            ],
        ),
        ("Frontend character runtime checks", ["node", "tests/test_character_runtime_frontend.js"]),
        ("Frontend chat API checks", ["node", "tests/test_chat_api_frontend.js"]),
        ("Frontend speech text checks", ["node", "tests/test_speech_text_frontend.js"]),
        ("Frontend TTS API checks", ["node", "tests/test_tts_api_frontend.js"]),
    ]

    failures: list[str] = []
    for label, command in checks:
        code = _run(label, command, root)
        if code != 0:
            failures.append(label)

    if failures:
        print("\nCharacter v1.4 quality gate failed:")
        for label in failures:
            print(f" - {label}")
        return 1

    print("\nCharacter v1.4 quality gate passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
