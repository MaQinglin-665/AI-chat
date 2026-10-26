import json
import logging

import pytest

from avatar_brain import AvatarBrain
from avatar_brain_context import build_context, clean_text, recent_history, summary
from avatar_brain_usage import UsageBudget, default_usage_path
from test_avatar_brain import config, decision, world


def conversation():
    return [item for name in ("旧话题", "樱花", "看月亮", "读书") for item in (
        {"role": "user", "content": "我们聊聊" + name},
        {"role": "assistant", "content": "我也想聊" + name})]


@pytest.mark.parametrize("history", [conversation(), [], None])
def test_fake_model_receives_last_three_rounds_and_relevant_memory(history):
    calls, queries = [], []
    def retrieve(cfg, query, safe_history):
        queries.append((cfg, query, safe_history))
        return [{"text": "用户喜欢从窗边看月亮"}, {"text": "我们聊过樱花"}, {"text": "第三条不应出现"}]
    cfg = config()
    cfg["memory"] = {"enabled": True, "mem0_enabled": True}
    service = AvatarBrain(lambda: cfg, lambda *args: calls.append(args) or json.dumps(decision()), lambda *a: None,
                         context_builder=lambda cfg, h: build_context(cfg, h, retrieve=retrieve))
    service.update_world(world())
    service.observe_history(history, cfg)
    assert service.think()["decision"]
    assert len(calls) == 1  # No summarization/model call in the context path.
    text = calls[0][1]
    if history:
        assert all(topic in text for topic in ("樱花", "看月亮", "读书"))
        assert "旧话题" not in text and "第三条不应出现" not in text
        assert "用户喜欢从窗边看月亮" in text
        assert queries[0][0]["memory"]["mem0_enabled"] is False
        assert cfg["memory"]["mem0_enabled"] is True
    else:
        assert queries == [] and "recent_summary" not in text


@pytest.mark.parametrize("private", [
    "api_key=do-not-send", "我的密码是abc", "Token abc", "private config setting",
    "D:/AI/private/model.vrm", r"C:\private\secret.txt", "/home/me/data", "../private/data",
    r"\\server\share\model", ".env", "config.local.json", '{"private":"value"}',
    "sk-testplaceholder", "gho_testplaceholder", "aVeryLongUnlabelledCredential123456789",
    "普通话" * 30 + " api_key=outside-summary-cutoff",
])
def test_sensitive_history_and_memories_never_enter_context(private, caplog):
    history = [{"role": "user", "content": "月亮很好看"}, {"role": "assistant", "content": private}]
    with caplog.at_level(logging.INFO):
        result = build_context(config(), history, retrieve=lambda *a: [{"text": private}, {"text": "喜欢月亮"}])
    assert private not in result and private not in caplog.text
    assert "喜欢月亮" in result
    assert clean_text(private, 30) == ""


def test_summary_memory_bounds_and_missing_or_broken_memory():
    history = [{"role": role, "content": "看月亮" * 1000} for role in ["user", "assistant"] * 3]
    assert len(summary(history)) <= 300
    output = build_context(config(), history, retrieve=lambda *a: [{"text": "樱花" * 1000}] * 4)
    payload = json.loads(output.split("\n")[-1])
    assert len(payload["recent_summary"]) <= 300
    assert len(payload["relevant_memories"]) <= 2
    assert all(len(text) <= 120 for text in payload["relevant_memories"])
    def broken(*args):
        raise OSError("private-path-and-key")
    assert "月亮" in build_context(config(), conversation(), retrieve=broken)
    assert recent_history([None, {"role": [], "content": "bad"}, {"role": "system", "content": "secret"}]) == []


def test_existing_local_memory_selector_is_used(monkeypatch, tmp_path):
    import memory
    monkeypatch.setattr(memory, "MEMORY_PATH", tmp_path / "memory.json")
    # Avoid any user's actual auxiliary stores while exercising the real ranking function.
    monkeypatch.setattr(memory, "_select_short_term_memories_for_prompt", lambda *a, **k: ([], "none", 0, []))
    monkeypatch.setattr(memory, "_select_core_memories_for_prompt", lambda *a, **k: ([], "none", 0, []))
    monkeypatch.setattr(memory, "_select_learning_samples_for_prompt", lambda *a, **k: ([], "none", 0))
    memory.save_memory_items([{"ts": "2026-10-26", "user": "我喜欢看月亮", "assistant": "下次一起聊月亮"}])
    text = build_context({"memory": {"enabled": True}}, [{"role": "user", "content": "月亮"}])
    assert "下次一起聊月亮" in text


def test_context_updated_only_on_existing_delivery_receipt():
    from test_app_chat_route import RouteRecorder, _handle
    cfg = config()
    service = AvatarBrain(lambda: cfg, lambda *a: "{}", lambda *a: None)
    recorder = RouteRecorder()
    _handle("/api/chat", {"message": "今晚看月亮", "history": conversation(),
                         "client_capabilities": {"delivered_turn_receipt_v1": True}}, recorder,
            avatar_brain_service=service, load_config_func=lambda: cfg,
            call_llm_func=lambda *a, **k: "我也想看月亮")
    assert "今晚" not in summary(service.history)
    recorder.commit_latest_delivery()
    assert "今晚看月亮" in summary(service.history) and "我也想看月亮" in summary(service.history)


def budget(path, now, today):
    return UsageBudget(path, clock=lambda: now[0], day=lambda: today[0])


def test_daily_and_rolling_hour_survive_restart_and_midnight(tmp_path):
    path, now, today = tmp_path / "avatar-brain-usage.json", [10000.0], ["2026-10-26"]
    first = budget(path, now, today)
    assert first.reserve(interval=0, hourly=2, daily=2)
    now[0] += 100
    assert budget(path, now, today).reserve(interval=0, hourly=2, daily=2)
    assert not budget(path, now, today).reserve(interval=0, hourly=2, daily=2)
    today[0] = "2026-10-27"
    midnight = budget(path, now, today)
    assert not midnight.reserve(interval=0, hourly=2, daily=2)
    assert midnight.state["daily"] == 0 and len(midnight.state["calls"]) == 2
    now[0] += 3601
    assert budget(path, now, today).reserve(interval=0, hourly=2, daily=2)
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["daily"] == 1 and len(data["calls"]) == 1
    assert set(data) == {"version", "date", "daily", "calls", "last", "next"}


def test_minimum_interval_and_requested_delay_survive_restart(tmp_path):
    path, now, today = tmp_path / "quota.json", [10000.0], ["2026-10-26"]
    first = budget(path, now, today)
    assert first.reserve(interval=300, hourly=6, daily=24)
    now[0] += 10
    assert not budget(path, now, today).reserve(interval=300, hourly=6, daily=24)
    first.defer(1800)
    now[0] += 300
    assert not budget(path, now, today).reserve(interval=300, hourly=6, daily=24)


@pytest.mark.parametrize("content", [b"broken-private-value", b"{}", b"[1]", b"\xff", b"x" * 17000])
def test_corrupt_file_falls_back_without_leaking(tmp_path, caplog, content):
    path, now, today = tmp_path / "private-name.json", [10000.0], ["2026-10-26"]
    path.write_bytes(content)
    store = budget(path, now, today)
    with caplog.at_level(logging.INFO):
        assert store.reserve(interval=0, hourly=6, daily=1)
        assert not store.reserve(interval=0, hourly=6, daily=1)
    assert store.memory_only and store.state["daily"] == 1
    assert "private-name" not in caplog.text and "broken-private-value" not in caplog.text
    assert path.read_bytes() == content  # Preserve damaged state for user diagnosis.


def test_write_failure_keeps_loaded_count_and_does_not_double_count(tmp_path, monkeypatch):
    path, now, today = tmp_path / "quota.json", [10000.0], ["2026-10-26"]
    assert budget(path, now, today).reserve(interval=0, hourly=6, daily=2)
    restored = budget(path, now, today)
    def fail():
        raise PermissionError("private file path")
    monkeypatch.setattr(restored, "_write", fail)
    assert restored.reserve(interval=0, hourly=6, daily=2)
    assert restored.memory_only and restored.state["daily"] == 2
    assert not restored.reserve(interval=0, hourly=6, daily=2)


def test_unwritable_parent_uses_memory_and_default_directory(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    assert default_usage_path() == tmp_path / "XinyuDesktopPet" / "avatar-brain-usage.json"
    parent = tmp_path / "not-a-directory"
    parent.write_text("file", encoding="utf-8")
    store = UsageBudget(parent / "quota.json")
    assert store.reserve(interval=0, hourly=1, daily=1)
    assert not store.reserve(interval=0, hourly=1, daily=1)


def test_fake_model_restarts_cannot_reset_daily_budget(tmp_path):
    path, now, today = tmp_path / "quota.json", [10000.0], ["2026-10-26"]
    cfg, calls = config(daily_limit=1), []
    def create():
        service = AvatarBrain(lambda: cfg, lambda *a: calls.append(a) or json.dumps(decision()), lambda *a: None,
                              usage=budget(path, now, today))
        service.update_world(world())
        return service
    assert create().think()["decision"]
    now[0] += 4000
    assert create().think()["decision"] is None
    assert len(calls) == 1
    today[0] = "2026-10-27"
    assert create().think()["decision"]
    assert len(calls) == 2
