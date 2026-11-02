import io
import json
from pathlib import Path

import pytest
import avatar_motions as motions


def test_catalog_and_allowlist(tmp_path):
    d = tmp_path / 'models_local' / 'motions'
    d.mkdir(parents=True)
    for name in ('idle__mine.fbx', 'walk__one.vrma', 'idle__image.png', 'unknown__one.fbx', 'private.json'):
        (d / name).write_bytes(b'; FBX 7.4')
    assert set(motions.resources(tmp_path)) == {'idle__mine.fbx', 'walk__one.vrma'}
    assert not motions.NAME.fullmatch('../idle__mine.fbx')
    assert not motions.NAME.fullmatch('idle__x.fbx?secret')


def test_links_are_excluded(tmp_path, monkeypatch):
    d = tmp_path / 'models_local' / 'motions'
    d.mkdir(parents=True)
    (d / 'idle__mine.fbx').write_bytes(b'; FBX 7.4')
    monkeypatch.setattr(motions, '_is_link', lambda p: p == d)
    assert motions.resources(tmp_path) == {}


def test_external_resources_rejected():
    for malformed in (b'[]', b'{"buffers":[null]}'):
        with pytest.raises(ValueError):
            motions.validate(malformed, '.gltf')
    for uri in ('../private.bin', 'file:///private', 'https://example.invalid/a.bin'):
        with pytest.raises(ValueError):
            motions.validate(json.dumps({'buffers': [{'uri': uri}]}).encode(), '.gltf')
    motions.validate(b'{"buffers":[{"uri":"data:application/octet-stream;base64,AAAA"}]}', '.gltf')
    with pytest.raises(ValueError):
        motions.validate(b'not an FBX', '.fbx')


def test_dispatch_unknown_and_fallback(tmp_path):
    class Handler:
        def _send_json(self, data, status=200):
            self.data, self.status = data, status
    h = Handler()
    motions.dispatch(h, tmp_path, motions.PREFIX)
    assert h.data == {'clips': []}
    motions.dispatch(h, tmp_path, motions.PREFIX + '/../config.local.json')
    assert h.status == 400
