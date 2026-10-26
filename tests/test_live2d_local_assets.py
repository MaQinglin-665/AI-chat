import io
import json

import pytest

import avatar_assets as assets


def fixture(tmp_path):
    folder = tmp_path / "models_local" / "Mao"
    folder.mkdir(parents=True)
    manifest = {"FileReferences": {"Moc": "Mao.moc3", "Textures": ["texture.png"],
                                  "Expressions": [{"Name": "exp_01", "File": "face.exp3.json"}]}}
    (folder / "Mao.model3.json").write_text(json.dumps(manifest))
    for name in ["Mao.moc3", "texture.png", "face.exp3.json", "private.txt"]:
        (folder / name).write_bytes(b"synthetic")
    return {"avatar": {"kind": "live2d", "path": "models_local/Mao/Mao.model3.json",
                       "mapping": "web/avatar/mappings/mao.json"}}, folder, manifest


class Handler:
    def __init__(self):
        self.wfile = io.BytesIO()
        self.status = None
        self.data = None

    def _send_json(self, data, status=200):
        self.data, self.status = data, status

    def send_response(self, status):
        self.status = status

    def send_header(self, *args):
        pass

    def end_headers(self):
        pass


def test_local_manifest_only_serves_declared_resources(tmp_path):
    cfg, folder, _ = fixture(tmp_path)
    manifest, resources = assets.live2d_resources(cfg, tmp_path)
    assert manifest.parent == folder
    assert set(resources) == {"Mao.model3.json", "Mao.moc3", "texture.png", "face.exp3.json"}
    for name, expected in [("Mao.moc3", 200), ("private.txt", 400), ("../private.txt", 400),
                           ("%2e%2e/private.txt", 400), ("face.exp3.json:stream", 400)]:
        handler = Handler()
        assets.dispatch(handler, cfg, tmp_path, assets.LIVE2D_PREFIX + name)
        assert handler.status == expected
    handler = Handler()
    assets.dispatch(handler, cfg, tmp_path, "/api/avatar")
    assert handler.data == {"kind": "live2d", "path": assets.LIVE2D_PREFIX + manifest.name,
                            "mapping": "web/avatar/mappings/mao.json"}
    handler = Handler()
    assets.dispatch(handler, {"model_path": "/models/Hiyori.model3.json"}, tmp_path, "/api/avatar")
    assert handler.data == {"kind": "live2d"}


@pytest.mark.parametrize("name", ["../Mao.moc3", "/Mao.moc3", "a\\Mao.moc3", "https://example.com/x.moc3",
                                  "Mao.moc3?key=x", "Mao.moc3:stream", "Mao.moc3%00", "private.txt"])
def test_manifest_traversal_and_type_rejected(tmp_path, name):
    cfg, folder, manifest = fixture(tmp_path)
    manifest["FileReferences"]["Moc"] = name
    (folder / "Mao.model3.json").write_text(json.dumps(manifest))
    with pytest.raises((ValueError, OSError)):
        assets.live2d_resources(cfg, tmp_path)


def test_links_and_external_manifest_rejected(tmp_path, monkeypatch):
    cfg, folder, _ = fixture(tmp_path)
    original = assets._is_link
    monkeypatch.setattr(assets, "_is_link", lambda p: p.name == "texture.png" or original(p))
    with pytest.raises(ValueError, match="links"):
        assets.live2d_resources(cfg, tmp_path)
    monkeypatch.setattr(assets, "_is_link", original)
    cfg["avatar"]["path"] = str(folder / "Mao.model3.json")
    assert assets.resolve_live2d(cfg, tmp_path) == folder / "Mao.model3.json"
    cfg["avatar"]["path"] = str(tmp_path / "outside.model3.json")
    (tmp_path / "outside.model3.json").write_text("{}")
    with pytest.raises(ValueError, match="outside"):
        assets.resolve_live2d(cfg, tmp_path)


def test_avatar_config_overrides_legacy_placeholder(tmp_path, monkeypatch):
    import config
    cfg, folder, _ = fixture(tmp_path)
    cfg["model_path"] = "/models/YOUR_MODEL.model3.json"
    monkeypatch.setattr(config, "ROOT_DIR", tmp_path)
    assert config.validate_live2d_model_path(cfg) == folder / "Mao.model3.json"
    public = config.sanitize_client_config(cfg)["avatar"]
    assert public == {"kind": "live2d", "mapping": "web/avatar/mappings/mao.json", "browser_lip_sync_delay_ms": 120}
    cfg["avatar"]["browser_lip_sync_delay_ms"] = 9999
    assert config.sanitize_client_config(cfg)["avatar"]["browser_lip_sync_delay_ms"] == 500
    cfg["avatar"]["browser_lip_sync_delay_ms"] = -1
    assert config.sanitize_client_config(cfg)["avatar"]["browser_lip_sync_delay_ms"] == 0
    cfg["avatar"]["path"] = "models_local/Missing.model3.json"
    with pytest.raises(config.DiagnosticError):
        config.validate_live2d_model_path(cfg)
