import copy
import json
import logging
import threading

import pytest

from avatar_brain import AvatarBrain, MODE_LIMITS, WORLD_TTL, settings
from avatar_brain_protocol import (CLOSE, OPEN, MAX_WORLD_CHARS, compact, extract_reply,
                                   filter_stream, parse_decision, prompt, sanitize_world, validate_decision)


def world(**changes):
    return {"scene": "room", "position": [0, 0], "activity": "accompany",
            "places": ["accompany", "window", "rest", "desk"],
            "activities": ["window", "rest", "desk"], "gestures": ["nod", "wave"],
            "period": "day", "idle_sec": 600, **changes}


def config(**changes):
    return {"avatar": {"brain": {"enabled": True, "mode": "daily", **changes}},
            "llm": {"provider": "openai", "api_key_env": "TEST_ONLY_ENV"},
            "character_runtime": {"model_direct_reply": True}}


def decision(**changes):
    return {"say": "我去窗边看看。", "emotion": "happy",
            "actions": [{"type": "go_to", "target": "window"},
                        {"type": "activity", "name": "window", "duration_sec": 30}],
            "next_think_after_sec": 60, **changes}


@pytest.fixture
def rig():
    now, today, calls, records = [100.0], ["2026-10-26"], [], []
    cfg = config()
    def model(*args):
        calls.append(args)
        return json.dumps(decision(), ensure_ascii=False)
    service = AvatarBrain(lambda: cfg, model, lambda _cfg, text: records.append(text),
                          clock=lambda: now[0], day=lambda: today[0])
    service.update_world(world())
    return service, cfg, now, today, calls, records


def test_world_closed_vocabulary_and_size(caplog):
    raw = world(path="C:/private/sample.vrm", api_key="private-value", config={"secret": "hidden"},
                places=["window", "../../private", "private-value"],
                events=[{"type": "activity", "name": "window", "stage": "end", "path": "secret"}])
    clean = sanitize_world(raw)
    assert clean["places"] == ["window"]
    assert "private" not in compact(clean) and "secret" not in compact(clean)
    assert len(compact(clean)) <= MAX_WORLD_CHARS
    assert caplog.text == ""
    with pytest.raises(ValueError, match="world_too_large"):
        sanitize_world(world(extra="x" * 4096))
    clean = sanitize_world(world(position=[float("nan"), 999], period=[], activity={}, events=[{"type": "activity", "name": []}]))
    assert clean["position"] == [0, 20] and clean["period"] == "night"
    for scene in ([], {}, "C:/room", None):
        with pytest.raises(ValueError):
            sanitize_world(world(scene=scene))


def test_action_validation_keeps_valid_siblings_logs_counts_only(caplog):
    with caplog.at_level(logging.INFO):
        result = validate_decision(decision(actions=[
            {"type": "go_to", "target": "window"}, {"type": "shell", "command": "secret-value"},
            {"type": "activity", "name": "books", "duration_sec": 30},
            {"type": "gesture", "name": "wave"}, {"type": "go_to", "target": "missing"},
            {"type": "look_at", "target": "user"}, {"type": "sit"}, {"type": "stand"},
            {"type": "wait", "duration_sec": 99}]), sanitize_world(world()))
    assert [a["type"] for a in result["actions"]] == ["go_to", "gesture", "look_at", "sit", "stand"]
    assert "count=4" in caplog.text and "secret-value" not in caplog.text
    bounded = validate_decision(decision(actions=[{"type": "wait", "duration_sec": 10000}] * 20), sanitize_world(world()))
    assert sum(x["duration_sec"] for x in bounded["actions"]) == 300
    assert all(x["duration_sec"] <= 120 for x in bounded["actions"])
    assert not validate_decision({"actions": [{"type": "wait", "duration_sec": float("inf")}, {"type": []}]}, sanitize_world(world()))["actions"]


@pytest.mark.parametrize("text", ["bad JSON", "[]", "null", '{"actions":"oops"}', "x" * 9000])
def test_malformed_model_decision_silent(text):
    assert parse_decision(text, sanitize_world(world()))["actions"] == []


@pytest.mark.parametrize("mode", list(MODE_LIMITS))
def test_mode_interval_and_hourly_budget(rig, mode):
    service, cfg, now, _, calls, _ = rig
    cfg["avatar"]["brain"].update(mode=mode, daily_limit=96)
    interval, cap = MODE_LIMITS[mode]
    for index in range(cap):
        if index:
            now[0] += interval
            service.update_world(world())
        assert service.think()["decision"]
        now[0] += interval - 1
        service.update_world(world())
        assert service.think()["decision"] is None
        now[0] -= interval - 1
    now[0] += interval
    service.update_world(world())
    assert service.think()["decision"] is None
    assert len(calls) == cap
    now[0] += 3600
    service.update_world(world())
    assert service.think()["decision"]


def test_daily_limit_date_rollover_and_model_requested_delay(rig):
    service, cfg, now, today, calls, _ = rig
    cfg["avatar"]["brain"]["daily_limit"] = 1
    assert service.think()["decision"]
    now[0] += 4000
    service.update_world(world())
    assert service.think()["decision"] is None
    today[0] = "2026-10-27"
    assert service.think()["decision"]
    assert len(calls) == 2
    cfg["avatar"]["brain"]["daily_limit"] = 24
    service.model = lambda *args: json.dumps(decision(next_think_after_sec=1800))
    now[0] += 4000
    service.update_world(world())
    assert service.think()["decision"]
    now[0] += 1000
    service.update_world(world())
    assert service.think()["decision"] is None


@pytest.mark.parametrize("change", [{"typing": True}, {"speaking": True}, {"idle_sec": 1}, {"scene": "none"}])
def test_busy_or_absent_world_never_calls_model(rig, change):
    service, _, _, _, calls, _ = rig
    service.update_world(world(**change))
    assert service.think()["decision"] is None and calls == []


def test_disabled_stale_and_chat_busy(rig):
    service, cfg, now, _, calls, _ = rig
    assert settings({})["enabled"] is False
    cfg["avatar"]["brain"]["enabled"] = False
    assert service.think()["decision"] is None
    cfg["avatar"]["brain"]["enabled"] = True
    now[0] += WORLD_TTL + 1
    assert service.think()["decision"] is None
    service.update_world(world())
    with service.chat_turn():
        assert service.think()["decision"] is None
    assert calls == []


@pytest.mark.parametrize("change", [{"typing": True}, {"period": "night"}, {"scene": "handpainted"}])
def test_inflight_exclusive_and_discard_after_change(rig, change):
    service, _, _, _, _, records = rig
    entered, release = threading.Event(), threading.Event()
    def slow(*args):
        entered.set()
        assert release.wait(2)
        return json.dumps(decision())
    service.model = slow
    result = []
    worker = threading.Thread(target=lambda: result.append(service.think()))
    worker.start()
    assert entered.wait(2)
    assert service.think()["decision"] is None
    service.update_world(world(**change))
    release.set()
    worker.join(2)
    assert result == [{"ok": True, "decision": None}] and records == []
    assert service.poll()["plans"] == []


def test_timeout_counts_without_logging_exception_or_remembering(rig, caplog):
    service, _, _, _, _, records = rig
    def fail(*args):
        raise TimeoutError("PRIVATE-PROVIDER-CONTENT")
    service.model = fail
    with caplog.at_level(logging.INFO):
        assert service.think()["decision"] is None
    assert service.daily == 1 and records == []
    assert "PRIVATE-PROVIDER" not in caplog.text


def test_proactive_plan_delivery_memory_idempotent_and_night(rig):
    service, _, now, _, calls, records = rig
    plan = service.think()["decision"]
    assert plan["status"] == "planned" and records == []
    assert calls[0][2] == "idle"
    assert "World:" in calls[0][1]
    assert service.poll()["plans"][0] == plan
    assert service.acknowledge(plan["id"], speech_delivered=True, action_indices=[0, 1, 1, 999])["recorded"] == 3
    assert service.acknowledge(plan["id"], speech_delivered=True, action_indices=[0, 1])["recorded"] == 0
    assert len(records) == 3 and "窗边" in records[1]
    now[0] += 3600
    service.update_world(world(period="night"))
    night = service.think()["decision"]
    assert night["say"] == "" and night["actions"]
    assert calls[-1][2] == "period_changed"
    assert not service.acknowledge(plan["id"], speech_delivered=True)["ok"]


def test_prepare_chat_is_copy_and_ignores_private_key(rig, monkeypatch):
    service, cfg, _, _, _, _ = rig
    cfg["llm"]["api_key"] = "test-private-placeholder"
    before = copy.deepcopy(cfg)
    monkeypatch.delenv("TEST_ONLY_ENV", raising=False)
    assert service.prepare_chat(cfg) == cfg
    monkeypatch.setenv("TEST_ONLY_ENV", "test-environment-placeholder")
    resolved = service.prepare_chat(cfg)
    assert "api_key" not in resolved["llm"] and cfg == before
    assert "_avatar_brain_world" in resolved
    assert "_avatar_brain_world" not in service.prepare_chat({**cfg, "_galgame_context": {"enabled": True}})


def test_reply_suffix_every_chunk_boundary_and_no_action_exactness():
    clean = sanitize_world(world())
    visible = "你好，坐在这里吧。\n"
    text = visible + OPEN + json.dumps(decision()) + CLOSE
    for index in range(len(text) + 1):
        cfg = {"_avatar_brain_world": clean}
        assert "".join(filter_stream([text[:index], text[index:]], cfg)) == visible
        assert cfg["_avatar_brain_result"]["say"] == ""
        assert len(cfg["_avatar_brain_result"]["actions"]) == 2
    for text in ("普通文字\n", "", "[[TAFFY_REPLY]]你好", "a < b", "普通文字<"):
        cfg = {"_avatar_brain_world": clean}
        assert extract_reply(text, cfg) == text
        assert "_avatar_brain_result" not in cfg
    assert extract_reply(visible + OPEN + "broken secret json", {"_avatar_brain_world": clean}) == visible
    assert extract_reply(text, {}) == text


def test_existing_memory_store_respects_opt_out(monkeypatch):
    import memory
    saved = []
    monkeypatch.setattr(memory, "load_memory_items", lambda: [{"user": "old", "assistant": "old"}])
    monkeypatch.setattr(memory, "save_memory_items", lambda items: saved.append(items))
    monkeypatch.setattr(memory, "get_memory_settings", lambda cfg: {"enabled": cfg["enabled"], "max_items": 2})
    memory.remember_avatar_event({"enabled": False}, "已到窗边")
    assert saved == []
    memory.remember_avatar_event({"enabled": True}, "已到窗边")
    assert saved[0][-1]["source"] == "avatar_world_confirmed"
    assert "非用户发言" in saved[0][-1]["user"]


def test_confirmed_event_roundtrips_existing_memory_file(monkeypatch, tmp_path):
    import memory
    path = tmp_path / "test-memory.json"
    monkeypatch.setattr(memory, "MEMORY_PATH", path)
    cfg = {"memory": {"enabled": True}}
    memory.remember_avatar_event(cfg, "3D世界中走到了窗边")
    items = memory.load_memory_items()
    assert len(items) == 1
    assert items[0]["source"] == "avatar_world_confirmed"
    assert items[0]["assistant"] == "3D世界中走到了窗边"
    assert "非用户发言" in items[0]["user"]
    memory.save_memory_items([])
    assert memory.load_memory_items() == []


def test_timer_tick_and_returned_user_keep_limits(rig):
    service, _, now, _, calls, _ = rig
    class StopAfterTick:
        count = 0
        def wait(self, seconds):
            self.count += 1
            return self.count > 1
        def is_set(self):
            return False
    service.stop_event = StopAfterTick()
    service._loop()
    assert len(calls) == 1
    service.update_world(world(idle_sec=0))
    assert service.poll()["plans"] == []  # Old plans must not resurface after typing ends.
    assert service.think()["decision"] is None
    now[0] += 301
    service.update_world(world(idle_sec=31))
    assert service.think()["decision"]
    assert calls[-1][2] == "user_returned"


def test_user_turn_delay_and_completed_plan_not_reoffered(rig):
    service, cfg, now, _, _, records = rig
    resolved = service.prepare_chat(cfg)
    resolved["_avatar_brain_result"] = validate_decision(decision(say="", next_think_after_sec=1800), sanitize_world(world()))
    plan = service.reply_plan(resolved)
    assert service.think()["decision"] is None
    service.acknowledge(plan["id"], action_indices=[0, 1])
    assert service.poll()["plans"] == [] and len(records) == 2
    now[0] += 301
    service.update_world(world())
    assert service.think()["decision"] is None
