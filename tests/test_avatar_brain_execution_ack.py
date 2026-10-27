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


def test_renderer_failure_reason_is_preserved_without_raw_details():
    service = AvatarBrain(config, lambda *a: json.dumps(decision()), lambda *a: None)
    service.update_world(world())
    plan = service.think()['decision']
    service.acknowledge(plan['id'], started=True)
    service.acknowledge(plan['id'], outcomes=[{'index': 0, 'status': 'failed', 'reason': 'clock_stalled'},
                                            {'index': 1, 'status': 'failed', 'reason': 'private detail'}])
    terminal = service.plans[plan['id']]['outcomes']
    assert terminal[0]['reason'] == 'clock_stalled'
    assert terminal[1]['reason'] == 'error'


def test_claim_refusals_and_expiry_have_fixed_reasons():
    now = [100.0]
    service = AvatarBrain(config, lambda *a: json.dumps(decision()), lambda *a: None, clock=lambda: now[0])
    service.update_world(world())
    first = service._publish(decision(), 'reply')
    assert service.acknowledge(first['id'], started=True)['ok']
    assert service.acknowledge(first['id'], started=True)['reason'] == 'already_claimed'
    second = service._publish(decision(), 'reply')
    service.update_world(world(typing=True, idle_sec=0))
    assert service.acknowledge(second['id'], started=True)['reason'] == 'superseded_by_input'
    third = service._publish(decision(), 'reply')
    service.update_world(world(scene='live2d'))
    assert service.acknowledge(third['id'], started=True)['reason'] == 'scene_changed'
    fourth = service._publish(decision(), 'reply')
    now[0] += 301
    service.poll()
    assert service.acknowledge(fourth['id'], started=True)['reason'] == 'expired'
    assert len(service.retired) <= 16
