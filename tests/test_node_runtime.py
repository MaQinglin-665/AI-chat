from pathlib import Path

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

