from concurrent.futures import ThreadPoolExecutor

from behavior_director import BehaviorDecisionCursor, decide
from companion_events import CompanionEventBus


def test_event_bus_keeps_only_safe_bounded_metadata():
    bus = CompanionEventBus(max_events=16)

    event = bus.publish("user_chat", {"source": "chat", "message": "do not retain this", "interaction_id": "turn-1"}, now_ms=100)

    assert event == {"type": "user_chat", "at_ms": 100, "sequence": 1, "source": "chat", "interaction_id": "turn-1"}
    assert bus.publish("unknown", {}, now_ms=101) is None
    assert bus.snapshot(now_ms=102)["events"] == [event]

    second = bus.publish("assistant_reply", {"source": "chat"}, now_ms=103)
    bus.clear()
    third = bus.publish("voice_turn", {"modality": "voice"}, now_ms=104)
    assert second["sequence"] == 2
    assert third["sequence"] == 3


def test_invalid_event_does_not_consume_sequence():
    bus = CompanionEventBus()
    assert bus.publish("not_allowed", {}, now_ms=100) is None
    assert bus.publish("user_chat", {}, now_ms=101)["sequence"] == 1


def test_sequence_is_thread_safe_and_unique():
    bus = CompanionEventBus(max_events=96)
    with ThreadPoolExecutor(max_workers=8) as pool:
        events = list(pool.map(lambda value: bus.publish("user_chat", {"interaction_id": value}), range(64)))

    assert sorted(event["sequence"] for event in events) == list(range(1, 65))


def test_behavior_director_stays_quiet_while_speaking_then_can_prepare_grounded_followup():
    cfg = {"behavior_director": {"enabled": True, "event_window_ms": 300000, "quiet_after_tts_ms": 8000}}
    bus = CompanionEventBus()
    bus.publish("tts_started", {"source": "frontend"}, now_ms=100)
    assert decide(cfg, bus.snapshot(now_ms=120), now_ms=120)["reason"] == "assistant_speaking"

    bus.clear()
    bus.publish("desktop_observed", {"source": "desktop"}, now_ms=100)
    result = decide(cfg, bus.snapshot(now_ms=120), life_material={"has_material": True, "reasons": ["recurring_interest"]}, now_ms=120)

    assert result["action"] == "prepare_proactive"
    assert result["material_reasons"] == ["recurring_interest"]


def test_behavior_director_never_enables_itself_from_events():
    bus = CompanionEventBus()
    bus.publish("voice_turn", {"modality": "voice"}, now_ms=100)

    assert decide({}, bus.snapshot(now_ms=110), now_ms=110) == {"action": "stay_quiet", "reason": "disabled", "event_count": 0}


def test_behavior_director_holds_immediately_after_tts_finishes():
    cfg = {"behavior_director": {"enabled": True, "quiet_after_tts_ms": 8000}}
    bus = CompanionEventBus()
    bus.publish("tts_finished", {"source": "frontend"}, now_ms=100)

    decision = decide(cfg, bus.snapshot(now_ms=500), now_ms=500)

    assert decision["reason"] == "post_tts_settle"
    assert decision["performance_intent"] == {
        "phase": "settling", "emotion": "neutral", "gesture": "none", "intensity": "low", "hold_ms": 5000,
    }


def test_latest_tts_finish_replaces_old_started_state_after_cooldown():
    cfg = {"behavior_director": {"enabled": True, "quiet_after_tts_ms": 8000}}
    bus = CompanionEventBus()
    bus.publish("tts_started", {}, now_ms=100)
    finished = bus.publish("tts_finished", {}, now_ms=200)

    settling = decide(cfg, bus.snapshot(now_ms=500), now_ms=500)
    after_cooldown = decide(cfg, bus.snapshot(now_ms=9000), now_ms=9000)

    assert settling["reason"] == "post_tts_settle"
    assert settling["trigger_sequence"] == finished["sequence"]
    assert after_cooldown["reason"] == "no_grounded_impulse"


def test_new_voice_after_old_reply_is_unanswered():
    cfg = {"behavior_director": {"enabled": True}}
    bus = CompanionEventBus()
    bus.publish("assistant_reply", {}, now_ms=100)
    voice = bus.publish("voice_turn", {}, now_ms=200)

    decision = decide(cfg, bus.snapshot(now_ms=250), now_ms=250)

    assert decision["action"] == "micro_reaction"
    assert decision["trigger_sequence"] == voice["sequence"]
    assert decision["performance_intent"] == {
        "phase": "listening", "emotion": "thinking", "gesture": "nod", "intensity": "low", "hold_ms": 900,
    }


def test_reply_after_voice_clears_unanswered_voice_state():
    cfg = {"behavior_director": {"enabled": True}}
    bus = CompanionEventBus()
    bus.publish("voice_turn", {}, now_ms=100)
    bus.publish("assistant_reply", {}, now_ms=200)

    assert decide(cfg, bus.snapshot(now_ms=250), now_ms=250)["reason"] == "no_grounded_impulse"


def test_prepare_proactive_trigger_is_consumed_once():
    cfg = {"behavior_director": {"enabled": True}}
    bus = CompanionEventBus()
    trigger = bus.publish("desktop_observed", {}, now_ms=100)
    material = {"has_material": True, "reasons": ["recurring_interest"]}
    cursor = BehaviorDecisionCursor()

    first = cursor.consume(decide(cfg, bus.snapshot(now_ms=200), life_material=material, now_ms=200))
    second = cursor.consume(decide(cfg, bus.snapshot(now_ms=300), life_material=material, now_ms=300))

    assert first["action"] == "prepare_proactive"
    assert first["trigger_sequence"] == trigger["sequence"]
    assert first["performance_intent"] == {
        "phase": "preparing", "emotion": "thinking", "gesture": "think", "intensity": "low", "hold_ms": 1200,
    }
    assert second == {
        "action": "stay_quiet",
        "reason": "trigger_already_consumed",
        "event_count": 1,
        "trigger_sequence": trigger["sequence"],
    }


def test_auto_generated_chat_is_not_a_new_grounded_proactive_trigger():
    cfg = {"behavior_director": {"enabled": True}}
    bus = CompanionEventBus()
    bus.publish("user_chat", {"is_auto": True}, now_ms=100)

    decision = decide(
        cfg,
        bus.snapshot(now_ms=200),
        life_material={"has_material": True, "reasons": ["recurring_interest"]},
        now_ms=200,
    )

    assert decision["reason"] == "no_grounded_impulse"
    assert "performance_intent" not in decision


def test_behavior_intents_are_fixed_allowlisted_data_only():
    cfg = {"behavior_director": {"enabled": True}}
    bus = CompanionEventBus()
    bus.publish("voice_turn", {}, now_ms=100)

    intent = decide(cfg, bus.snapshot(now_ms=200), now_ms=200)["performance_intent"]

    assert set(intent) == {"phase", "emotion", "gesture", "intensity", "hold_ms"}
    assert 200 <= intent["hold_ms"] <= 5000
    assert {"path", "parameter", "motion_group", "expression_file"}.isdisjoint(intent)


def test_disabled_director_does_not_emit_a_performance_intent():
    assert "performance_intent" not in decide({}, {"events": []}, now_ms=100)
