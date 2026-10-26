import copy
import time
import agent_actions
import app
import external_agent
from external_agent import ExternalAgentManager
from external_agents import policy
from test_api_health import _build_test_config, _run_server_with_config, _post_json, _request_json
from test_external_agent import Immediate


def test_routes_auth_origin_disabled_and_flow(monkeypatch, tmp_path):
    work = tmp_path / "work"
    work.mkdir()
    protected_project = tmp_path / "protected-project"
    protected_project.mkdir()
    monkeypatch.setattr(policy, "PROJECT", protected_project)
    monkeypatch.setattr(policy.tempfile, "gettempdir", lambda: str(tmp_path / "system-temp"))
    monkeypatch.setattr(agent_actions, "STATE_PATH", tmp_path / "audit.json")
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "example-token")
    cfg = _build_test_config()
    cfg["shared_experience_memory"] = {"enabled": False}
    cfg["server"]["require_api_token"] = True
    cfg["external_agent"] = {**policy.defaults(), "codex_home": str(tmp_path / "private-home"), "allowed_roots": [str(work)]}
    manager = ExternalAgentManager(lambda: cfg, adapter_factory=Immediate)
    monkeypatch.setattr(external_agent, "_manager", manager)
    headers = {"X-Taffy-Token": "example-token"}
    with _run_server_with_config(monkeypatch, cfg) as base:
        create = base + "/api/agent/task"
        body = {"goal": "整理", "workdir": str(work)}
        assert _post_json(create, body)[0] == 401
        assert _post_json(create, body, {**headers, "Origin": "https://untrusted.example"})[0] == 403
        dummy = "a" * 32
        for suffix in ("", "/" + dummy + "/approve", "/" + dummy + "/cancel"):
            assert _post_json(create + suffix, body, headers)[0] == 403
        assert _request_json(create + "/" + dummy, headers)[0] == 403
        assert _request_json(create, headers)[0] == 403
        cfg["external_agent"]["enabled"] = True
        status, options = _request_json(create, headers)
        assert status == 200 and options["allowed_roots"] == [str(work)]
        status, response = _post_json(create, body, headers)
        assert status == 202
        task_id = response["task"]["id"]
        for _ in range(100):
            status, response = _request_json(create + "/" + task_id, headers)
            if response["task"]["status"] == "awaiting_approval": break
            time.sleep(.01)
        assert response["task"]["status"] == "awaiting_approval"
        assert _post_json(create + "/" + task_id + "/approve", {}, headers)[0] == 202
        for _ in range(100):
            status, response = _request_json(create + "/" + task_id, headers)
            if response["task"]["status"] == "completed": break
            time.sleep(.01)
        assert response["task"]["status"] == "completed"
        assert _post_json(create + "/" + task_id + "/approve", {}, headers)[0] == 409
        assert _post_json(create + "/" + task_id + "/cancel", {}, headers)[0] == 202
