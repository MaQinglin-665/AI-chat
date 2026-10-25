import copy
import json
import os

import pytest
import agent_actions
import shared_experience
import tools
from external_agent import ExternalAgentManager
from external_agents.file_manifest import snapshot, compare
from external_agents.policy import AgentError
from test_external_agent import setup, PLAN, Immediate, wait_state


def test_manifest_metadata_and_exact_plan(tmp_path):
    (tmp_path / "keep.txt").write_text("private contents", encoding="utf-8")
    (tmp_path / "remove.txt").write_text("private contents", encoding="utf-8")
    before = snapshot(tmp_path)
    (tmp_path / "keep.txt").write_text("changed private contents", encoding="utf-8")
    (tmp_path / "remove.txt").unlink()
    (tmp_path / "new.txt").write_text("new private contents", encoding="utf-8")
    after = snapshot(tmp_path)
    changes = compare(before, after, PLAN)
    assert changes["created"] == ["new.txt"]
    assert changes["out_of_plan"] == {"created": [], "modified": ["keep.txt"], "deleted": ["remove.txt"]}
    assert changes["out_of_plan_count"] == 2
    assert "contents" not in json.dumps([before, after, changes])
    assert set(before["keep.txt"]) == {"size", "mtime_ns", "kind"}
    plan = copy.deepcopy(PLAN)
    plan["files_to_modify"] = ["folder"]
    assert compare({"folder/a": before["keep.txt"]}, {"folder/a": after["keep.txt"]}, plan)["out_of_plan"]["modified"] == ["folder/a"]


def test_inventory_limit_and_symlink(tmp_path):
    (tmp_path / "a").write_text("x", encoding="utf-8")
    with pytest.raises(AgentError, match="上限"):
        snapshot(tmp_path, max_entries=0)
    root = tmp_path / "work"
    root.mkdir()
    try:
        (root / "link").symlink_to(tmp_path, target_is_directory=True)
    except OSError:
        pytest.skip("Creating links requires Windows privilege")
    assert list(snapshot(root)) == ["link"]


@pytest.mark.parametrize("failure", [False, True])
def test_manager_verifies_changes_on_success_and_failure(setup, failure):
    cfg, work = setup
    (work / "untouched.txt").write_text("private contents", encoding="utf-8")
    class Writer(Immediate):
        def run(self, **kw):
            if kw["plan"] is None:
                return copy.deepcopy(PLAN)
            (work / "untouched.txt").write_text("unexpected modification", encoding="utf-8")
            (work / "new.txt").write_text("approved", encoding="utf-8")
            if failure:
                raise AgentError("cancelled", "任务已取消。")
    m = ExternalAgentManager(lambda: cfg, adapter_factory=Writer)
    task = m.create_task("整理", str(work))
    wait_state(m, task["id"], {"awaiting_approval"})
    m.approve(task["id"])
    result = wait_state(m, task["id"], {"cancelled" if failure else "completed"})
    assert result["changes"]["out_of_plan"]["modified"] == ["untouched.txt"]
    audit = json.loads(agent_actions.STATE_PATH.read_text(encoding="utf-8"))
    assert audit["audit"][-1]["result"]["changes"] == result["changes"]
    assert "private contents" not in json.dumps(audit)
    assert "unexpected modification" not in json.dumps(audit)
    assert not result.get("shared_experience_recorded")


def test_shared_experience_summary_only(setup, monkeypatch, tmp_path):
    cfg, work = setup
    cfg["shared_experience_memory"]["enabled"] = True
    monkeypatch.setattr(shared_experience, "SHARED_EXPERIENCE_PATH", tmp_path / "memory.json")
    class ApprovedWriter(Immediate):
        def run(self, **kw):
            if kw["plan"] is not None:
                (work / "new.txt").write_text("synthetic", encoding="utf-8")
            return super().run(**kw)
    m = ExternalAgentManager(lambda: cfg, adapter_factory=ApprovedWriter)
    task = m.create_task("整理测试文件", str(work))
    wait_state(m, task["id"], {"awaiting_approval"})
    m.approve(task["id"])
    result = wait_state(m, task["id"], {"completed"})
    assert result["shared_experience_recorded"]
    saved = json.loads((tmp_path / "memory.json").read_text(encoding="utf-8"))
    assert len(saved["items"]) == 1
    assert saved["items"][0]["text"] == "一起完成了外部任务：整理测试文件"


def test_cleanup_failure_does_not_claim_stable_inventory(setup):
    cfg, work = setup
    class CleanupFailure(Immediate):
        def run(self, **kw):
            if kw["plan"] is None:
                return copy.deepcopy(PLAN)
            raise AgentError("cancel_failed", "清理失败")
    manager = ExternalAgentManager(lambda: cfg, adapter_factory=CleanupFailure)
    task = manager.create_task("取消测试", str(work))
    wait_state(manager, task["id"], {"awaiting_approval"})
    manager.approve(task["id"])
    result = wait_state(manager, task["id"], {"failed"})
    assert "verification_error" in result and "changes" not in result
    assert manager.active == task["id"]


@pytest.mark.parametrize("approve", [True, False])
def test_generic_approval_cannot_consume_external_task(setup, monkeypatch, approve):
    pending = agent_actions.create_pending("external_agent_task", {}, "test", "external")
    monkeypatch.setattr(tools, "execute_work_tool", lambda *a, **k: pytest.fail("legacy execution must not run"))
    result = tools.confirm_agent_action(pending["id"], approve=approve, config={}, llm_cfg={}, http_post_json_fn=None, is_local_url_fn=None)
    assert not result["ok"]
    assert agent_actions.public_state()["pending"] == []
    assert agent_actions.consume_pending(pending["id"])["tool"] == "external_agent_task"


@pytest.mark.parametrize("path", ["a -> b", "*.txt", "a?b", 'a"b', "a|b", "a\nb"])
def test_reject_non_literal_plan_paths(setup, path):
    from external_agent import validate_plan
    _, work = setup
    plan = copy.deepcopy(PLAN)
    plan["files_to_modify"] = [path]
    with pytest.raises(AgentError):
        validate_plan(plan, work, "")
