from behavior_director import decide
from companion_events import CompanionEventBus


def test_event_bus_keeps_only_safe_bounded_metadata():
    bus = CompanionEventBus(max_events=16)

    event = bus.publish("user_chat", {"source": "chat", "message": "do not retain this", "interaction_id": "turn-1"}, now_ms=100)

    assert event == {"type": "user_chat", "at_ms": 100, "source": "chat", "interaction_id": "turn-1"}
    assert bus.publish("unknown", {}, now_ms=101) is None
    assert bus.snapshot(now_ms=102)["events"] == [event]


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

    assert decide(cfg, bus.snapshot(now_ms=500), now_ms=500)["reason"] == "post_tts_settle"
