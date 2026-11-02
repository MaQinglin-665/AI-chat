"""Replay the twenty synthetic dialogue cases through the incremental room parser."""
import json
from pathlib import Path

import pytest

import app_room_spike as room

CASES = json.loads((Path(__file__).parent / "fixtures/room_dialogue_cases.json").read_text(encoding="utf8"))


@pytest.mark.parametrize("case", CASES, ids=[f"dialogue-{i+1}" for i in range(len(CASES))])
def test_room_dialogue_stream_preserves_utterance(case, monkeypatch):
    import memory
    monkeypatch.setattr(memory, "build_manual_persona_card_block", lambda: "")
    monkeypatch.setattr(memory, "build_persona_memory_block", lambda: "")
    monkeypatch.setattr("avatar_brain_context.build_context", lambda *_: {})
    line = {"emotion": "开心", "text": case["after"]}
    raw = json.dumps({"lines":[line], "action":"idle", "steps":[]},ensure_ascii=False)
    def provider(cfg, messages):
        assert case["question"] in messages[-1]["content"]
        yield from (raw[i:i+5] for i in range(0,len(raw),5))
    monkeypatch.setattr(room, "iter_openai_chat_stream", provider)
    events = []
    result = room.user_turn({}, {"message":case["question"], "world":{"ai":[0,0,0],"user":[0,0,0],"ai_state":"sitting"}}, events.append)
    assert result["reply"] == case["after"]
    assert result["lines"] == [line]
    assert events in ([], [line])


def test_punctuation_and_unknown_emotion_never_enter_audio():
    assert room.room_lines([{"emotion":"untrusted","text":"（旁白）接住了。"}]) == [{"emotion":"平静","text":"接住了。"}]
