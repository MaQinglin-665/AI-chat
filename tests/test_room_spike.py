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
