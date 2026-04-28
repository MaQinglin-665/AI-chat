from character_runtime import CharacterRuntime, emotion_to_live2d_hint, normalize_runtime_payload


def test_runtime_initial_snapshot():
    runtime = CharacterRuntime()
    snap = runtime.snapshot()
    assert snap["phase"] == "idle"
    assert snap["emotion"] == "neutral"
    assert snap["pending_events"] == 0
    assert snap["low_interruption"] is True


def test_normalize_payload_with_plain_text():
    payload = normalize_runtime_payload("hello runtime")
    assert payload["text"] == "hello runtime"
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_normalize_payload_with_json_string():
    payload = normalize_runtime_payload('{"text":"hi","emotion":"happy","voice_style":"warm"}')
    assert payload["text"] == "hi"
    assert payload["emotion"] == "happy"
    assert payload["voice_style"] == "warm"


def test_normalize_payload_with_dict():
    payload = normalize_runtime_payload({"text": "dict input", "emotion": "sad", "voice_style": "soft"})
    assert payload["text"] == "dict input"
    assert payload["emotion"] == "sad"
    assert payload["voice_style"] == "soft"


def test_normalize_payload_fills_missing_fields():
    payload = normalize_runtime_payload({"text": "only text"})
    assert payload["text"] == "only text"
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_unknown_emotion_falls_back_to_neutral():
    payload = normalize_runtime_payload({"text": "x", "emotion": "mysterious"})
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_malformed_json_fallback_is_safe_text():
    payload = normalize_runtime_payload('{"text":"broken"')
    assert payload["text"] == '{"text":"broken"'
    assert payload["emotion"] == "neutral"
    assert payload["voice_style"] == "neutral"


def test_empty_input_fallback_is_safe_defaults():
    payload = normalize_runtime_payload("")
    assert payload == {"text": "", "emotion": "neutral", "voice_style": "neutral"}


def test_emotion_to_live2d_hint_mapping():
    assert emotion_to_live2d_hint("happy") == "smile_soft"
    assert emotion_to_live2d_hint("sad") == "eyes_down"
    assert emotion_to_live2d_hint("unknown") == "idle_relaxed"


def test_user_and_reply_transition_emit_directives():
    runtime = CharacterRuntime()

    runtime.enqueue("user_message", {"text": "hello"}, source="chat")
    directives = runtime.run_once()
    assert directives
    assert directives[0].channel == "motion"
    assert directives[0].name == "listen_ack"
    assert runtime.snapshot()["phase"] == "thinking"

    runtime.enqueue("assistant_reply", {"text": "hi", "emotion": "happy"}, source="llm")
    directives = runtime.run_once()
    assert [d.channel for d in directives] == ["voice", "motion"]
    assert directives[1].payload["live2d_hint"] == "smile_soft"
    snap = runtime.snapshot()
    assert snap["phase"] == "speaking"
    assert snap["emotion"] == "happy"
    assert snap["voice_style"] == "happy"


def test_tts_finished_sets_cooldown():
    now = {"t": 100.0}
    runtime = CharacterRuntime(clock=lambda: now["t"], proactive_cooldown_sec=30.0)

    runtime.enqueue("tts_finished")
    directives = runtime.run_once()
    assert directives and directives[0].name == "return_idle"

    snap = runtime.snapshot()
    assert snap["phase"] == "idle"
    assert snap["last_spoken_at"] == 100.0
    assert snap["next_proactive_at"] == 130.0


def test_low_interruption_blocks_proactive_tick():
    now = {"t": 0.0}
    runtime = CharacterRuntime(clock=lambda: now["t"], low_interruption=True)
    directives = runtime.run_once()
    assert directives == []


def test_proactive_tick_with_cooldown_when_low_interruption_off():
    now = {"t": 10.0}
    runtime = CharacterRuntime(
        clock=lambda: now["t"],
        low_interruption=False,
        proactive_cooldown_sec=20.0,
    )

    directives = runtime.run_once()
    assert len(directives) == 1
    assert directives[0].channel == "initiative"
    assert directives[0].name == "proactive_checkin"

    # Before cooldown elapsed, no repeated proactive trigger.
    now["t"] = 25.0
    assert runtime.run_once() == []

    # After cooldown elapsed, proactive can trigger again.
    now["t"] = 31.0
    directives = runtime.run_once()
    assert len(directives) == 1
    assert directives[0].name == "proactive_checkin"
