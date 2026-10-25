from pathlib import Path
import os
import shutil
import subprocess
import sys

import pytest

import scripts.node_runtime as node_runtime


def test_resolve_node_command_prefers_project_local_node(tmp_path, monkeypatch):
    monkeypatch.delenv("TAFFY_NODE_EXE", raising=False)
    monkeypatch.delenv("TAFFY_NODE_HOME", raising=False)
    local_node = tmp_path / ".local-tools" / "node22" / "node.exe"
    local_node.parent.mkdir(parents=True)
    local_node.write_text("", encoding="utf-8")

    command = node_runtime.resolve_node_command("node", root=tmp_path)

    assert command == [str(local_node)]


def test_resolve_node_command_uses_node_home_for_npm(tmp_path, monkeypatch):
    node_home = tmp_path / "portable-node"
    npm_cmd = node_home / "npm.cmd"
    node_home.mkdir()
    npm_cmd.write_text("", encoding="utf-8")
    monkeypatch.delenv("TAFFY_NODE_EXE", raising=False)
    monkeypatch.setenv("TAFFY_NODE_HOME", str(node_home))

    command = node_runtime.resolve_node_command("npm", root=tmp_path)

    assert command == [str(npm_cmd)]


def test_resolve_node_command_falls_back_to_command_name(tmp_path, monkeypatch):
    monkeypatch.delenv("TAFFY_NODE_EXE", raising=False)
    monkeypatch.delenv("TAFFY_NODE_HOME", raising=False)

    assert node_runtime.resolve_node_command("node", root=tmp_path) == ["node"]
    assert node_runtime.resolve_node_command("npm", root=tmp_path) == ["npm"]


@pytest.mark.skipif(os.name != "nt", reason="Windows launch entrypoint")
def test_electron_launcher_runs_with_project_node_and_no_global_node(tmp_path, monkeypatch):
    shell = shutil.which("powershell")
    node = shutil.which(node_runtime.resolve_node_command("node")[0])
    if not shell or not node:
        pytest.skip("PowerShell and Node are required for the launcher integration check")
    root = tmp_path / "fresh checkout with spaces"
    scripts = root / "scripts"
    scripts.mkdir(parents=True)
    repo = Path(__file__).resolve().parents[1]
    for name in ("start-electron.ps1", "node-runtime.ps1"):
        shutil.copy2(repo / "scripts" / name, scripts / name)
    electron = root / "node_modules" / "electron"
    (electron / "dist").mkdir(parents=True)
    (electron / "dist" / "electron.exe").write_text("test sentinel", encoding="utf-8")
    local_node = root / ".local-tools" / "node22" / "node.exe"
    local_node.parent.mkdir(parents=True)
    try:
        os.link(node, local_node)
    except OSError:
        shutil.copy2(node, local_node)
    (electron / "cli.js").write_text(
        "if(process.argv[2]!=='electron\\\\main.js')process.exit(19);"
        "console.log('local-node-launcher-ok');process.exit(7);", encoding="utf-8",
    )
    monkeypatch.delenv("TAFFY_NODE_EXE", raising=False)
    monkeypatch.delenv("TAFFY_NODE_HOME", raising=False)
    monkeypatch.setenv("PATH", str(Path(shell).parent))
    result = subprocess.run(
        [shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(scripts / "start-electron.ps1")],
        capture_output=True, text=True, timeout=30, check=False,
    )
    assert result.returncode == 7, result.stdout + result.stderr
    assert "local-node-launcher-ok" in result.stdout


def _npm_failure_checkout(tmp_path, *, lockfile=True):
    root = tmp_path / "checkout with spaces"
    scripts = root / "scripts"
    scripts.mkdir(parents=True)
    repo = Path(__file__).resolve().parents[1]
    for name in ("start-electron.ps1", "node-runtime.ps1"):
        shutil.copy2(repo / "scripts" / name, scripts / name)
    shutil.copy2(repo / "start_electron.bat", root / "start_electron.bat")
    node_home = root / ".local-tools" / "node22"
    node_home.mkdir(parents=True)
    (node_home / "npm.cmd").write_text(
        '@echo off\n>"%~dp0arguments.txt" echo %*\n'
        '>"%~dp0mirror.txt" echo %ELECTRON_MIRROR%\nexit /b 37\n',
        encoding="ascii",
    )
    if lockfile:
        (root / "package-lock.json").write_text("{}", encoding="utf-8")
    return root, node_home


def _launcher_output(result):
    # Windows PowerShell may inherit either the system code page or UTF-8.
    output = result.stdout + result.stderr
    return "\n".join(output.decode(encoding, errors="replace") for encoding in ("utf-8-sig", "gb18030"))


@pytest.mark.skipif(os.name != "nt", reason="Windows PowerShell launcher")
@pytest.mark.parametrize("lockfile,mode", [(True, "ci"), (False, "install")])
def test_npm_failure_reports_chinese_guidance_preserves_mode_and_mirror(tmp_path, monkeypatch, lockfile, mode):
    shell = shutil.which("powershell")
    if not shell:
        pytest.skip("Windows PowerShell is required")
    root, node_home = _npm_failure_checkout(tmp_path, lockfile=lockfile)
    monkeypatch.delenv("TAFFY_NODE_HOME", raising=False)
    monkeypatch.setenv("ELECTRON_MIRROR", "https://example.test/electron/")
    result = subprocess.run(
        [shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(root / "scripts/start-electron.ps1")],
        capture_output=True, timeout=30, check=False, creationflags=subprocess.CREATE_NO_WINDOW,
    )
    output = _launcher_output(result)
    assert result.returncode == 37, output
    assert "npm 安装失败" in output
    assert "网络连接" in output and "Node.js" in output
    assert "scripts\\setup-dev.ps1" in output
    assert (node_home / "arguments.txt").read_text().strip() == f"{mode} --no-fund --no-audit"
    assert (node_home / "mirror.txt").read_text().strip() == "https://example.test/electron/"


@pytest.mark.skipif(os.name != "nt", reason="Windows batch pause integration")
def test_batch_npm_failure_reaches_pause_and_preserves_exit_code(tmp_path, monkeypatch):
    shell = shutil.which("powershell")
    if not shell:
        pytest.skip("Windows PowerShell is required")
    root, _node_home = _npm_failure_checkout(tmp_path)
    (root / "config.json").write_text("{}", encoding="utf-8")
    (root / "scripts/first_run_check.py").write_text("", encoding="utf-8")
    venv = root / ".venv"
    (venv / "Scripts").mkdir(parents=True)
    shutil.copy2(sys.executable, venv / "Scripts/python.exe")
    (venv / "pyvenv.cfg").write_text(f"home = {sys.base_prefix}\ninclude-system-site-packages = false\n", encoding="utf-8")
    monkeypatch.delenv("TAFFY_NODE_HOME", raising=False)
    monkeypatch.delenv("TAFFY_NODE_EXE", raising=False)
    # Reproduce double-click failure without requiring global Node or installing anything.
    monkeypatch.setenv("PATH", os.pathsep.join([str(Path(shell).parent), str(Path(os.environ["SystemRoot"]) / "System32")]))
    result = subprocess.run(
        [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", str(root / "start_electron.bat")],
        input=b"\n", capture_output=True, timeout=30, check=False, creationflags=subprocess.CREATE_NO_WINDOW,
    )
    output = _launcher_output(result)
    assert result.returncode == 37, output
    assert "npm 安装失败" in output
    assert "Review the error and installation guidance above" in output
    assert "press any key" in output.lower() or "按任意键" in output, output

