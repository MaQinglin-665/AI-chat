from app_room_spike import validate


def test_room_targets_require_visible_affordance():
    visible = {"window": ["look"], "chair": ["sit"]}
    assert validate({"action":"sit_on","target":"chair"},visible)["action"] == "sit_on"
    for action,target in [("sit_on","window"),("look_at","missing"),("go_to",[40,0,0]),("shell","chair")]:
        assert validate({"action":action,"target":target},visible) == {"action":"idle"}
def test_model_sees_reported_positions_and_cannot_invent_sittable_objects(monkeypatch):
    import app_room_spike as room
    import pytest
    seen = []
    monkeypatch.setattr(room, "call_model", lambda cfg, prompt, why:
                        seen.append(prompt) or '{"action":{"action":"sit_on","target":"window"}}')
    data = {"user":[0,0,1],"ai":[0,0,0],"event":"spoke","message":"去窗边看看",
            "objects":{"window":{"position":[2,1,0],"affordances":["sit","look"]}}}
    with pytest.raises(ValueError):
        room.decide({}, data)
    assert seen[0]["user_request"] == "去窗边看看"
    assert seen[0]["state"]["objects"]["window"] == ["look"]


def test_room_requires_explicit_enablement_and_token_gate():
    from app_room_spike import dispatch
    class Handler:
        def _send_json(self, body, status):
            return status
        def _get_security_settings(self):
            return {"require_api_token":False}
    assert dispatch(Handler(), {}) == 404
    assert dispatch(Handler(), {"room_spike":{"enabled":True}}) == 403

def test_room_deltas_and_ordered_goal(monkeypatch):
    import app_room_spike as room
    import pytest
    full = {"user":[0,0,1], "ai":[0,0,0], "objects":["chair"], "needs":{"energy":.4}}
    packet = {"session":"test","base":0,"changes":full,"event":"idle"}
    _, version = room.unpack(packet)
    world, _ = room.unpack({**packet,"base":version,"changes":{"last_move_sec":35}})
    assert world["objects"] == ["chair"] and world["last_move_sec"] == 35
    with pytest.raises(LookupError):
        room.unpack({**packet,"base":version})
    monkeypatch.setattr(room,"call_model",lambda *_:'{"action":{"action":"go_to","target":"chair"},"goal":[{"action":"sit_on","target":"chair"}],"say":"好呀"}')
    plan = room.decide({},world)
    assert plan["action"]["action"] == "go_to" and plan["goal"][0]["action"] == "sit_on" and plan["say"] == "好呀"
def test_compact_action_syntax_still_uses_whitelist():
    import pytest
    from app_room_spike import step
    visible = {"window":["look"]}
    assert step("gesture:wave",visible) == {"action":"gesture","name":"wave"}
    assert step("look_at(window)",visible) == {"action":"look_at","target":"window"}
    for raw in ("go_to(missing)","gesture:exec","shell(cmd)",{"action":"sit_on","target":"window"}):
        with pytest.raises(ValueError):
            step(raw,visible)


def test_room_context_is_request_local_and_opt_in():
    from app_chat_route import _build_chat_config
    world={"user":[0,0,0],"ai":[1,0,1],"objects":["chair"],"goal":{"status":"running","action":"sit_on","target":"chair"}}
    def resolve(enabled, body):
        return _build_chat_config(body,{"room_spike":{"enabled":enabled}},"你好",
            sanitize_input_modality_func=lambda *a,**kw:"text",clean_experience_text_func=lambda a,b:str(a)[:b],
            sanitize_character_experience_profile_func=lambda _:None,
            sanitize_auto_thought_burst_func=lambda _:None,sanitize_conversation_context_func=lambda *a:None)
    assert "_room_context" not in resolve(False,{"room":world})
    assert "_room_context" not in resolve(True,{})
    assert "chair" in resolve(True,{"room":world})["_room_context"]


def test_bedroom_marker_capabilities_and_current_posture():
    from app_room_spike import snapshot, chat_context, validate
    world = {"ai":[0,0,0],"user":[0,0,0],"ai_state":"sitting","ai_near":"sofa",
             "objects":{"bed":["look"],"sofa":["look","sit"],"rug":["look"]},
             "recent_destinations":["bed","missing"],"speech_balance":50}
    state = snapshot(world)
    assert validate({"action":"sit_on","target":"bed"}, state["objects"]) == {"action":"idle"}
    assert state["recent_destinations"] == ["bed"] and state["speech_balance"] == 5
    assert "sitting" in chat_context(world) and "sofa" in chat_context(world)


def test_room_speech_omits_stage_directions():
    from app_room_spike import spoken
    assert spoken("（坐下）晚安。(挥手)") == "晚安。"
    assert spoken("（走过去）") == ""
    assert spoken("") == ""


def test_user_turn_is_one_request_and_uses_current_state(monkeypatch):
    import memory
    import app_room_spike as room
    calls = []
    monkeypatch.setattr(memory, "build_manual_persona_card_block", lambda:"温柔")
    monkeypatch.setattr(memory, "build_persona_memory_block", lambda:"喜欢看书")
    monkeypatch.setattr(memory, "select_memory_items_for_prompt", lambda *_:[{"text":"喜欢窗边"}])
    def provider(cfg, messages):
        calls.append(messages)
        yield '{"reply":"（走过去）好呀，我这就过去。","action":"go_to(sofa)","steps":["sit_on(sofa)"],"goal":"坐在旁边"}'
    monkeypatch.setattr(room, "iter_openai_chat_stream", provider)
    world={"ai":[1,0,0],"user":[0,0,0],"objects":{"sofa":["sit"]},"ai_state":"walking","user_near":"sofa"}
    result=room.user_turn({}, {"world":world,"message":"来坐","history":[]})
    assert len(calls)==1 and "walking" in calls[0][-1]["content"] and "喜欢窗边" in calls[0][-1]["content"]
    assert result=={"reply":"好呀，我这就过去。","action":{"action":"go_to","target":"sofa"},
                    "steps":[{"action":"sit_on","target":"sofa"}],"goal":"坐在旁边"}


def test_invalid_user_plan_cannot_leave_a_spoken_promise():
    import pytest
    from app_room_spike import parse_turn
    result=parse_turn('{"reply":"我这就去","action":"sit_on(bed)"}',{"bed":["look"]})
    assert result["action"]["action"]=="idle" and result["steps"]==[] and "这就去" not in result["reply"]
    with pytest.raises(ValueError):
        parse_turn('{"reply":"（走过去）","action":"idle"}',{})

def test_room_goal_description_is_bounded_and_visible():
    from app_room_spike import snapshot
    state = snapshot({"user":[0,0,0], "ai":[0,0,0], "goal":{"description":"一起到窗边看月亮"*15}})
    assert 0 < len(state["goal"]["description"]) <= 48


def test_room_conversation_removes_unsupported_past_trip(monkeypatch):
    import app_room_spike as room
    import memory
    monkeypatch.setattr(memory, "build_manual_persona_card_block", lambda:"")
    monkeypatch.setattr(memory, "build_persona_memory_block", lambda:"")
    monkeypatch.setattr(memory, "select_memory_items_for_prompt", lambda *_:[])
    monkeypatch.setattr(room, "iter_openai_chat_stream", lambda *_:iter(['{"reply":"我刚从窗边回来。","action":"idle","steps":[]}']))
    turn=room.user_turn({},{"message":"窗外有什么？","world":{"user":[0,0,0],"ai":[0,0,0],"period":"night"}})
    assert "回来" not in turn["reply"] and "月亮" in turn["reply"]

def test_room_recap_only_uses_known_events_and_keeps_speakers_distinct():
    from app_room_spike import recent_room_recap, ground_recap
    facts=recent_room_recap({"user_sat":False,"steps":["走到书架","坐到沙发","执行命令"]},"刚才我们做了什么")
    assert facts["steps"]==["走到书架","坐到沙发"]
    assert recent_room_recap([], "刚才呢") is None
    assert recent_room_recap(facts,"我刚才说的是哪个编程语言？") is None
    assert ground_recap("我去沙发坐了坐。你翻书。",facts)=="我去沙发坐了坐。"
    assert ground_recap("嗯，我去沙发坐了坐。",facts)=="嗯，我去沙发坐了坐。"
    assert ground_recap("刚才我在沙发坐了坐，挺放松的。",facts)=="刚才我在沙发坐了坐，挺放松的。"
    assert "窗边坐" not in ground_recap("我去了窗边坐一会儿。",facts)
    assert ground_recap("你好",None)=="你好"


def test_bed_edge_is_an_explicit_visible_seat():
    from app_room_spike import validate
    assert validate({"action":"sit_on","target":"bed_edge_seat"},{"bed_edge_seat":["sit"]})["action"]=="sit_on"
    assert validate({"action":"sit_on","target":"bed_edge_seat"},{})["action"]=="idle"
