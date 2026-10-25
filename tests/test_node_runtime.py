from pathlib import Path
import os
import shutil
import subprocess

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

