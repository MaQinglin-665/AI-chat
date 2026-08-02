import agent_actions
import tools


def _config(tmp_path):
    return {
        "tools": {
            "enabled": True,
            "workspace_root": str(tmp_path),
            "allow_shell": True,
            "allowed_command_prefixes": ["python", "echo"],
        }
    }


def _execute(name, args, config):
    return tools.execute_work_tool(
        name,
        args,
        config,
        {},
        http_post_json_fn=lambda *_args, **_kwargs: {},
        is_local_url_fn=lambda _value: True,
    )


def test_agent_risk_policy_matches_user_confirmation_boundary():
    assert agent_actions.risk_for_action("delete_path", {"path": "old.txt"})[0] is True
    assert agent_actions.risk_for_action("write_file", {"path": "notes.txt", "mode": "overwrite"})[1] == "file_overwrite"
    assert agent_actions.risk_for_action("run_command", {"command": "shutdown /s"})[1] == "high_risk_system_command"
    assert agent_actions.risk_for_action("run_command", {"command": "python -V"})[0] is False
    assert agent_actions.risk_for_action("open_url", {"url": "https://example.com"})[0] is False


def test_overwrite_is_pending_until_explicit_confirmation(monkeypatch, tmp_path):
    monkeypatch.setattr(agent_actions, "STATE_PATH", tmp_path / "agent_actions.json")
    cfg = _config(tmp_path)
    (tmp_path / "notes.txt").write_text("old", encoding="utf-8")

    pending = _execute("write_file", {"path": "notes.txt", "content": "new", "mode": "overwrite"}, cfg)

    assert pending["pending_confirmation"] is True
    assert (tmp_path / "notes.txt").read_text(encoding="utf-8") == "old"

    completed = tools.confirm_agent_action(
        pending["confirmation_id"],
        approve=True,
        config=cfg,
        llm_cfg={},
        http_post_json_fn=lambda *_args, **_kwargs: {},
        is_local_url_fn=lambda _value: True,
    )

    assert completed["ok"] is True
    assert (tmp_path / "notes.txt").read_text(encoding="utf-8") == "new"
    assert agent_actions.public_state()["pending"] == []


def test_cancelled_action_cannot_be_redeemed(monkeypatch, tmp_path):
    monkeypatch.setattr(agent_actions, "STATE_PATH", tmp_path / "agent_actions.json")
    cfg = _config(tmp_path)
    pending = _execute("delete_path", {"path": "missing.txt"}, cfg)

    assert tools.confirm_agent_action(
        pending["confirmation_id"],
        approve=False,
        config=cfg,
        llm_cfg={},
        http_post_json_fn=lambda *_args, **_kwargs: {},
        is_local_url_fn=lambda _value: True,
    )["status"] == "cancelled"
    assert tools.confirm_agent_action(
        pending["confirmation_id"],
        approve=True,
        config=cfg,
        llm_cfg={},
        http_post_json_fn=lambda *_args, **_kwargs: {},
        is_local_url_fn=lambda _value: True,
    )["ok"] is False
