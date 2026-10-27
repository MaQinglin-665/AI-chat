import json
from avatar_brain import AvatarBrain
from test_avatar_brain import config, world, decision


def test_terminal_acks_only_remember_completed_actions():
    records = []
    service = AvatarBrain(config, lambda *a: json.dumps(decision()), lambda *a: records.append(a))
    service.update_world(world())
    plan = service.think()['decision']
    assert service.acknowledge(plan['id'], started=True)['ok']
    assert not service.acknowledge(plan['id'], started=True)['ok']
    service.update_world(world(speaking=True))
    assert service.plans[plan['id']]['plan']['status'] == 'executing'
    result = service.acknowledge(plan['id'], outcomes=[{'index':0,'status':'skipped','reason':'unsupported'},
                                                       {'index':1,'status':'completed','reason':'done'}])
    assert result['recorded'] == 1 and len(records) == 1
    assert service.acknowledge(plan['id'], outcomes=[{'index':1,'status':'completed','reason':'done'}])['recorded'] == 0
    service.update_world(world(typing=True))
    assert service.acknowledge(plan['id'], outcomes=[{'index':-1,'status':'interrupted','reason':'user_input'}])['ok']
    assert len(records) == 1


def test_non_moving_scenes_accept_safe_worlds():
    from avatar_brain_protocol import sanitize_world
    for scene in ['painted','live2d']:
        assert sanitize_world(world(scene=scene))['scene'] == scene


def test_reply_survives_busy_heartbeats_and_runs_with_its_speech():
    service = AvatarBrain(config, lambda *a: '', lambda *a: None)
    service.update_world(world(typing=True, idle_sec=0))
    with service.chat_turn():
        prepared = service.prepare_chat(config())
        service.update_world(world(typing=True, speaking=True, idle_sec=0))
        service.update_world(world(speaking=True, idle_sec=2))
        prepared['_avatar_brain_result'] = decision(say='')
        plan = service.reply_plan(prepared)
        assert plan is not None
    assert service.poll()['plans'][0]['id'] == plan['id']
    service.update_world(world(speaking=False, idle_sec=3))
    service.update_world(world(speaking=True, idle_sec=4))
    assert service.poll()['plans'][0]['id'] == plan['id']
    service.update_world(world(typing=True, idle_sec=0))
    assert service.poll()['plans'] == []
