from app_room_spike import validate


def test_room_targets_require_visible_affordance():
    visible = {"window": ["look"], "chair": ["sit"]}
    assert validate({"action":"sit_on","target":"chair"},visible)["action"] == "sit_on"
    for action,target in [("sit_on","window"),("look_at","missing"),("go_to",[40,0,0]),("shell","chair")]:
        assert validate({"action":action,"target":target},visible) == {"action":"idle"}
def test_model_sees_reported_positions_and_cannot_invent_sittable_objects(monkeypatch):
    import app_room_spike as room
    seen = []
    monkeypatch.setattr(room, "call_model", lambda cfg, prompt, why:
                        seen.append(prompt) or '{"action":"sit_on","target":"window"}')
    data = {key:[0,0,1] for key in ("user","ai","user_forward","ai_forward")}
    data.update(event="spoke", objects={"window":{"position":[2,1,0],"affordances":["sit","look"]}},
                history=[{"role":"user","content":"去窗边看看"}])
    assert room.decide({}, data) == {"action":"idle"}
    assert 'object_positions' in seen[0] and '去窗边看看' in seen[0]


def test_room_requires_explicit_enablement_and_token_gate():
    from app_room_spike import dispatch
    class Handler:
        def _send_json(self, body, status):
            return status
        def _get_security_settings(self):
            return {"require_api_token":False}
    assert dispatch(Handler(), {}) == 404
    assert dispatch(Handler(), {"room_spike":{"enabled":True}}) == 403
