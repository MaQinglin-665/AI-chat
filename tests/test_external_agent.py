import copy
import json
import os
from pathlib import Path
import threading
import time

import pytest
import agent_actions
import external_agent
from external_agent import ExternalAgentManager, validate_plan
from external_agents import policy
from external_agents.codex_cli import CodexCLI, health, parse_event
from companion_events import CompanionEventBus

FIXTURES = Path(__file__).parent / "fixtures/codex_exec"
PLAN = dict(summary="整理文件", steps=["检查文件"], files_to_create=["new.txt"], files_to_modify=[],
            files_to_delete=[], commands=[], risk="low", needs_network=False)


@pytest.fixture
def setup(tmp_path, monkeypatch):
    work = tmp_path / "work"
    work.mkdir()
    # Tests may use pytest's disposable directory as a private home; production may not.
    monkeypatch.setattr(policy.tempfile, "gettempdir", lambda: str(tmp_path / "system-temp"))
    monkeypatch.setattr(agent_actions, "STATE_PATH", tmp_path / "audit.json")
    monkeypatch.setenv("EXTERNAL_TEST_CREDENTIAL", "example-secret-never-log")
    cfg = {"external_agent": {**policy.defaults(), "enabled": True,
           "api_key_env": "EXTERNAL_TEST_CREDENTIAL",
           "codex_home": str(tmp_path / "private-home"), "codex_path": str(FIXTURES / "fake_codex.py"),
           "allowed_roots": [str(work)], "max_minutes": 1},
           "llm": {"api_key_env": "EXTERNAL_TEST_CREDENTIAL"}}
    return cfg, work


def wait_state(manager, task_id, states, timeout=8):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        result = manager.get_task(task_id)
        if result["status"] in states:
            return result
        time.sleep(.02)
    raise AssertionError(manager.get_task(task_id))


class Immediate:
    def __init__(self, config):
        pass
    def run(self, **kw):
        kw["emit"]({"kind": "progress", "event_type": "agent_message"})
        kw["emit"]({"kind": "warning", "code": "item_warning"})
        return copy.deepcopy(PLAN) if kw["plan"] is None else None


def test_approval_flow_and_metadata_only(setup):
    cfg, work = setup
    bus = CompanionEventBus()
    m = ExternalAgentManager(lambda: cfg, adapter_factory=Immediate, bus=bus)
    task = m.create_task("整理文件", str(work))
    awaiting = wait_state(m, task["id"], {"awaiting_approval"})
    assert awaiting["plan"] == PLAN and awaiting["warning_count"] == 1
    assert agent_actions.public_state()["pending"][0]["tool"] == "external_agent_task"
    with pytest.raises(policy.AgentError, match="已有任务"):
        m.create_task("第二个任务", str(work))
    m.approve(task["id"])
    result = wait_state(m, task["id"], {"completed"})
    assert result["progress_count"] == 2 and agent_actions.public_state()["pending"] == []
    with pytest.raises(policy.AgentError):
        m.approve(task["id"])
    state = json.loads(agent_actions.STATE_PATH.read_text())
    assert [v["status"] for v in state["audit"]] == ["planning", "awaiting_approval", "executing", "completed"]
    raw = json.dumps(bus.snapshot())
    assert "整理" not in raw and "secret" not in raw and "new.txt" not in raw
    assert {e["type"] for e in bus.snapshot()["events"]} >= {"agent_task_planned", "agent_task_completed"}


def test_reject_and_expire(setup):
    cfg, work = setup
    clock = [100.0]
    m = ExternalAgentManager(lambda: cfg, adapter_factory=Immediate, clock=lambda: clock[0])
    task = m.create_task("整理", str(work))
    wait_state(m, task["id"], {"awaiting_approval"})
    assert m.cancel(task["id"])["status"] == "cancelled"
    with pytest.raises(policy.AgentError): m.approve(task["id"])
    task = m.create_task("整理", str(work))
    wait_state(m, task["id"], {"awaiting_approval"})
    clock[0] += 901
    assert m.get_task(task["id"])["status"] == "expired"
    with pytest.raises(policy.AgentError): m.approve(task["id"])


@pytest.mark.parametrize("mode", ["error", "turn.failed"])
def test_top_level_failure_and_no_key_leak(setup, monkeypatch, caplog, mode):
    cfg, work = setup
    monkeypatch.setenv("FAKE_MODE", mode)
    m = ExternalAgentManager(lambda: cfg)
    task = m.create_task("整理", str(work))
    result = wait_state(m, task["id"], {"failed"})
    assert result["error"]["code"] == "authentication_failed"
    combined = json.dumps([result, m.bus.snapshot(), agent_actions.public_state()]) + caplog.text
    assert "example-secret-never-log" not in combined
    assert not list(Path(cfg["external_agent"]["codex_home"]).glob("run-*"))


@pytest.mark.parametrize("fixture", sorted(p.name for p in FIXTURES.glob("*.jsonl")))
def test_real_fixture_replay_through_fake_executable(setup, monkeypatch, fixture):
    cfg, work = setup
    monkeypatch.setenv("FAKE_FIXTURE", fixture)
    emitted = []
    adapter = CodexCLI(cfg)
    if "cancellation" in fixture:
        with pytest.raises(policy.AgentError) as exc:
            adapter.run(goal="test", workdir=work, cancel=threading.Event(), emit=emitted.append)
        assert exc.value.code == "incomplete_output"
    else:
        assert adapter.run(goal="test", workdir=work, cancel=threading.Event(), emit=emitted.append)["summary"]
        assert any(e["kind"] == "warning" for e in emitted)
    assert "command" not in json.dumps(emitted).replace("command_execution", "")


@pytest.mark.parametrize("cancel", [True, False])
def test_running_cancel_and_timeout(setup, monkeypatch, cancel):
    cfg, work = setup
    monkeypatch.setenv("FAKE_MODE", "hang")
    cfg["external_agent"]["max_minutes"] = 0.03 if not cancel else 1
    m = ExternalAgentManager(lambda: cfg)
    task = m.create_task("等待", str(work))
    deadline = time.monotonic() + 5
    while not (work / "fake-child-heartbeat.txt").exists() and time.monotonic() < deadline: time.sleep(.02)
    assert (work / "fake-heartbeat.txt").exists()
    if cancel:
        m.cancel(task["id"])
        with pytest.raises(policy.AgentError): m.create_task("不能并发", str(work))
    result = wait_state(m, task["id"], {"cancelled" if cancel else "failed"})
    assert result["error"]["code"] == ("cancelled" if cancel else "timeout")
    stamp = (work / "fake-heartbeat.txt").stat().st_mtime_ns
    time.sleep(.2)
    assert (work / "fake-heartbeat.txt").stat().st_mtime_ns == stamp
    child_stamp = (work / "fake-child-heartbeat.txt").stat().st_mtime_ns
    time.sleep(.2)
    assert (work / "fake-child-heartbeat.txt").stat().st_mtime_ns == child_stamp


@pytest.mark.parametrize("line,kind", [('{"type":"future"}', "ignored"), ('garbage', "warning"),
    ('[]', "warning"), ('{"type":"item.completed","item":{"type":"error","message":"bad"}}', "warning"),
    ('{"type":"error"}', "failure"), ('{"type":"turn.failed"}', "failure")])
def test_event_classification(line, kind):
    assert parse_event(line)["kind"] == kind


def test_path_rejections(setup):
    cfg, work = setup
    c = policy.settings(cfg)
    for bad in (str(work / ".." / "work"), str(work.parent), str(policy.PROJECT), str(Path.home()), str(Path(work.anchor)), "relative"):
        with pytest.raises(policy.AgentError): policy.validate_workdir(bad, c)
    for root in ([], [str(policy.PROJECT)], [str(Path.home())], [str(Path(work.anchor))]):
        with pytest.raises(policy.AgentError): policy.validate_workdir(str(work), {**c, "allowed_roots": root})
    for home in (str(work), str(policy.PROJECT / "home"), str(Path.home() / ".codex"), str(work.parent / "system-temp" / "home")):
        with pytest.raises(policy.AgentError): policy.validate_workdir(str(work), {**c, "codex_home": home})


def test_symlink_escape(setup, tmp_path):
    cfg, work = setup
    outside = tmp_path / "outside"
    outside.mkdir()
    link = work / "escape"
    try:
        link.symlink_to(outside, target_is_directory=True)
    except OSError:
        if os.name != "nt": raise
        import subprocess
        subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(outside)], check=True, capture_output=True)
    with pytest.raises(policy.AgentError): policy.validate_workdir(str(link), policy.settings(cfg))
    with pytest.raises(policy.AgentError): validate_plan({**PLAN, "files_to_create": ["escape/new.txt"]}, work, "")


@pytest.mark.parametrize("patch", [{"risk": "unknown"}, {"needs_network": "yes"}, {"steps": "bad"},
    {"files_to_delete": ["../outside"]}, {"files_to_create": ["C:/outside"]}, {"summary": ""}])
def test_plan_validation(setup, patch):
    _, work = setup
    with pytest.raises(policy.AgentError): validate_plan({**PLAN, **patch}, work, "")


def test_health_versions_and_disabled_default(setup, monkeypatch):
    cfg, _ = setup
    assert health(cfg)["ok"]
    monkeypatch.setenv("FAKE_VERSION", "0.133.0")
    result = health(cfg)
    assert not result["ok"] and "0.164.0" in str(result["messages"])
    cfg["external_agent"]["enabled"] = False
    assert health(cfg)["ok"]  # Optional feature must not break normal app startup.
    cfg["external_agent"]["codex_path"] = "Z:/missing-cli.exe"
    assert not health(cfg)["installed"]
    assert policy.defaults()["enabled"] is False


def test_disabled_all_methods(setup):
    cfg, work = setup
    cfg["external_agent"]["enabled"] = False
    m = ExternalAgentManager(lambda: cfg)
    for call in (lambda: m.create_task("x", str(work)), lambda: m.get_task("id"), lambda: m.approve("id"), lambda: m.cancel("id"), m.list_tasks):
        with pytest.raises(policy.AgentError) as exc: call()
        assert exc.value.code == "disabled"


@pytest.mark.parametrize("url", ["https://api.openai.com/v1", "https://api.deepseek.com.evil.example", "https://evil.example/api.deepseek.com", "https://api.deepseek.com@evil.example", "", "http://[invalid"])
def test_other_provider_credential_never_reused(monkeypatch, url):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setenv("OTHER_PROVIDER_CREDENTIAL", "example-other-provider")
    cfg = {"llm": {"base_url": url, "api_key": "example-inline-other", "api_key_env": "OTHER_PROVIDER_CREDENTIAL"}}
    assert policy.key_from_config(cfg) == ""
    cfg["llm"].pop("api_key")
    assert policy.key_from_config(cfg) == ""


def test_dedicated_key_precedence_and_exact_deepseek_fallback(monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setenv("CHAT_CREDENTIAL", "example-chat")
    cfg = {"llm": {"base_url": "https://api.deepseek.com/v1", "api_key_env": "CHAT_CREDENTIAL"}}
    assert policy.key_from_config(cfg) == "example-chat"
    cfg["llm"]["api_key"] = "example-inline"
    assert policy.key_from_config(cfg) == "example-inline"
    monkeypatch.setenv("DEEPSEEK_API_KEY", "example-dedicated")
    assert policy.key_from_config(cfg) == "example-dedicated"
    cfg["external_agent"] = {"api_key_env": "CUSTOM_AGENT_CREDENTIAL"}
    monkeypatch.setenv("CUSTOM_AGENT_CREDENTIAL", "example-custom")
    cfg["llm"]["base_url"] = "https://other.example"
    assert policy.key_from_config(cfg) == "example-custom"
