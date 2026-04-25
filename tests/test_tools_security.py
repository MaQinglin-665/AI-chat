import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools import (
    _has_unsafe_shell_syntax,
    _is_command_allowed_by_prefix,
    _is_dangerous_command,
    _resolve_in_workspace,
)


class TestHasUnsafeShellSyntax:
    @pytest.mark.parametrize(
        "command",
        [
            "python app.py | grep error",
            "echo hello; rm -rf /",
            "cat `whoami`",
            "python app.py > output.txt",
            "python app.py < input.txt",
            "echo hello & echo world",
            "line1\nline2",
            "",
        ],
    )
    def test_blocks_unsafe_shell_syntax(self, command):
        assert _has_unsafe_shell_syntax(command) is True

    @pytest.mark.parametrize(
        "command",
        [
            "python app.py",
            "git status",
            "npm install express",
            "python -c \"print('hello')\"",
            "pip install requests==2.31.0",
        ],
    )
    def test_allows_safe_shell_syntax(self, command):
        assert _has_unsafe_shell_syntax(command) is False


class TestIsCommandAllowedByPrefix:
    allowed_prefixes = ["python", "git", "npm", "pip", "node"]

    @pytest.mark.parametrize(
        "command",
        [
            "python app.py",
            "git status",
            "npm install",
            "pip install requests",
            "node server.js",
            "Python app.py",
            "python.exe app.py",
        ],
    )
    def test_allows_allowed_prefixes(self, command):
        assert _is_command_allowed_by_prefix(command, self.allowed_prefixes) is True

    @pytest.mark.parametrize(
        "command",
        [
            "cmd /c dir",
            "powershell Get-Process",
            "bash -c 'echo hi'",
            "sh script.sh",
            "curl https://example.com",
            "wget https://example.com",
            "",
        ],
    )
    def test_blocks_disallowed_or_wrapper_prefixes(self, command):
        assert _is_command_allowed_by_prefix(command, self.allowed_prefixes) is False


class TestIsDangerousCommand:
    @pytest.mark.parametrize(
        "command",
        [
            "rm -rf /",
            "rm -rf /home",
            "del /f /s /q C:\\*",
            "format C:",
            "shutdown /s",
            "reboot",
            "erase file.txt",
            "rmdir /s folder",
            "Remove-Item -Recurse folder",
            "",
        ],
    )
    def test_blocks_dangerous_commands(self, command):
        assert _is_dangerous_command(command) is True

    @pytest.mark.parametrize(
        "command",
        [
            "python app.py",
            "git commit -m 'test'",
            "npm run build",
            "pip install requests",
            "echo hello world",
        ],
    )
    def test_allows_non_dangerous_commands(self, command):
        assert _is_dangerous_command(command) is False


class TestResolveInWorkspace:
    @pytest.mark.parametrize(
        "raw_path",
        [
            "../../etc/passwd",
            "../../../Windows/System32/config",
            "/etc/shadow",
            "C:\\Windows\\System32",
        ],
    )
    def test_raises_for_path_traversal_or_absolute_outside_workspace(self, tmp_path, raw_path):
        with pytest.raises(RuntimeError):
            _resolve_in_workspace(tmp_path, raw_path)

    @pytest.mark.parametrize(
        "raw_path, expected",
        [
            ("src/app.py", "src/app.py"),
            (".", "."),
            ("", "."),
            ("subdir/nested/file.txt", "subdir/nested/file.txt"),
        ],
    )
    def test_resolves_paths_inside_workspace(self, tmp_path, raw_path, expected):
        resolved = _resolve_in_workspace(tmp_path, raw_path)
        assert resolved == (tmp_path / expected).resolve()
