from app_room_spike import validate


def test_room_targets_require_visible_affordance():
    visible = {"window": ["look"], "chair": ["sit"]}
    assert validate({"action":"sit_on","target":"chair"},visible)["action"] == "sit_on"
    for action,target in [("sit_on","window"),("look_at","missing"),("go_to",[40,0,0]),("shell","chair")]:
        assert validate({"action":action,"target":target},visible) == {"action":"idle"}
