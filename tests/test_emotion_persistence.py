import json

import emotion


def test_emotion_state_recovers_from_backup(monkeypatch, tmp_path):
    state_path = tmp_path / "emotion_state.json"
    state_path.write_text("{corrupt", encoding="utf-8")
    state_path.with_suffix(".bak").write_text(
        json.dumps({"valence": 0.7, "arousal": 0.4, "dominant": "happy", "history": []}),
        encoding="utf-8",
    )
    monkeypatch.setattr(emotion, "EMOTION_STATE_PATH", state_path)

    state = emotion.load_emotion_state()

    assert state["valence"] == 0.7
    assert state["dominant"] == "happy"


def test_emotion_state_save_is_atomic_and_keeps_previous_version(monkeypatch, tmp_path):
    state_path = tmp_path / "emotion_state.json"
    previous = {"valence": -0.2, "arousal": 0.3, "dominant": "anxious", "history": []}
    state_path.write_text(json.dumps(previous), encoding="utf-8")
    monkeypatch.setattr(emotion, "EMOTION_STATE_PATH", state_path)

    emotion.save_emotion_state({"valence": 0.4, "arousal": 0.6, "dominant": "happy", "history": []})

    current = json.loads(state_path.read_text(encoding="utf-8"))
    backup = json.loads(state_path.with_suffix(".bak").read_text(encoding="utf-8"))
    assert current["valence"] == 0.4
    assert "last_updated" in current
    assert backup == previous
