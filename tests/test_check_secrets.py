import importlib.util
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


def _load_check_secrets():
    path = SCRIPTS / "check_secrets.py"
    spec = importlib.util.spec_from_file_location("check_secrets", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


check_secrets = _load_check_secrets()


def test_secret_scan_includes_current_root_python_files_when_git_succeeds(tmp_path, monkeypatch):
    tracked = tmp_path / "tracked.md"
    tracked.write_text("safe", encoding="utf-8")
    untracked_root_py = tmp_path / "scratch_secret.py"
    untracked_root_py.write_text("print('safe scratch')\n", encoding="utf-8")

    def fake_run(*args, **kwargs):
        return subprocess.CompletedProcess(args, 0, stdout="tracked.md\n", stderr="")

    monkeypatch.setattr(check_secrets.subprocess, "run", fake_run)

    scanned = {rel.as_posix() for _, rel in check_secrets._iter_text_files(tmp_path)}

    assert "tracked.md" in scanned
    assert "scratch_secret.py" in scanned


def test_secret_scan_includes_shell_scripts_when_git_succeeds(tmp_path, monkeypatch):
    script = tmp_path / "ensure_gpt_sovits.bat"
    script.write_text("@echo off\necho safe\n", encoding="utf-8")

    def fake_run(args, **kwargs):
        if args[:2] == ["git", "ls-files"] and "--others" in args:
            return subprocess.CompletedProcess(args, 0, stdout="", stderr="")
        if args[:2] == ["git", "ls-files"]:
            return subprocess.CompletedProcess(args, 0, stdout="ensure_gpt_sovits.bat\n", stderr="")
        raise AssertionError(args)

    monkeypatch.setattr(check_secrets.subprocess, "run", fake_run)

    scanned = {rel.as_posix() for _, rel in check_secrets._iter_text_files(tmp_path)}

    assert "ensure_gpt_sovits.bat" in scanned


def test_secret_scan_includes_untracked_non_ignored_text_files_when_git_succeeds(tmp_path, monkeypatch):
    tests_dir = tmp_path / "tests"
    tests_dir.mkdir()
    tracked = tmp_path / "tracked.md"
    tracked.write_text("safe", encoding="utf-8")
    untracked_test = tests_dir / "test_new.py"
    untracked_test.write_text("print('safe test')\n", encoding="utf-8")

    def fake_run(args, **kwargs):
        if args[:2] == ["git", "ls-files"] and "--others" in args:
            return subprocess.CompletedProcess(args, 0, stdout="tests/test_new.py\n", stderr="")
        if args[:2] == ["git", "ls-files"]:
            return subprocess.CompletedProcess(args, 0, stdout="tracked.md\n", stderr="")
        raise AssertionError(args)

    monkeypatch.setattr(check_secrets.subprocess, "run", fake_run)

    scanned = {rel.as_posix() for _, rel in check_secrets._iter_text_files(tmp_path)}

    assert "tracked.md" in scanned
    assert "tests/test_new.py" in scanned


def test_secret_scan_flags_private_windows_user_paths():
    private_path = "C:" + "\\Users\\MQL\\.codex\\skills\\harness-creator\\scripts\\validate-harness.mjs"
    failures = check_secrets._scan_lines(
        Path("progress.md"),
        f"`node {private_path}`",
    )

    assert any("private local Windows user path" in failure for failure in failures)
