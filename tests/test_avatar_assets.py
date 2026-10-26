import json
from pathlib import Path
import struct
import os
import subprocess

import pytest

import avatar_assets as assets


def config(path, directories=()):
    return {"avatar": {"kind": "vrm", "path": str(path), "allowed_directories": list(map(str, directories))}}


def test_only_local_model_or_explicit_directory(tmp_path):
    root = tmp_path / "repo"
    model = root / "models_local" / "fake.vrm"
    model.parent.mkdir(parents=True)
    model.write_bytes(b"fake")
    assert assets.resolve_asset(config(model), root) == model
    external = tmp_path / "external" / "fake.vrm"
    external.parent.mkdir()
    external.write_bytes(b"fake")
    with pytest.raises(assets.AvatarPathError):
        assets.resolve_asset(config(external), root)
    assert assets.resolve_asset(config(external, [external.parent]), root) == external


@pytest.mark.parametrize("value", ["models_local/../fake.vrm", "models_local\\..\\fake.vrm", "models_local/a.txt", "models_local/a.vrm.exe", "models_local/a.vrm:stream", "https://example.com/a.vrm"])
def test_invalid_paths_are_rejected(tmp_path, value):
    with pytest.raises((ValueError, OSError)):
        assets.resolve_asset(config(value), tmp_path)


def test_vrma_reserved_path_policy(tmp_path):
    model_dir = tmp_path / "models_local"
    model_dir.mkdir()
    animation = model_dir / "fake.vrma"
    animation.write_bytes(b"fake")
    cfg = config(model_dir / "fake.vrm")
    assert assets.resolve_asset(cfg, tmp_path, animation=animation) == animation
    with pytest.raises(assets.AvatarPathError):
        assets.resolve_asset(config(animation), tmp_path)


def test_link_component_is_rejected(tmp_path, monkeypatch):
    model = tmp_path / "models_local" / "fake.vrm"
    model.parent.mkdir()
    model.write_bytes(b"fake")
    original = assets._is_link
    monkeypatch.setattr(assets, "_is_link", lambda p: p == model.parent or original(p))
    with pytest.raises(assets.AvatarPathError, match="links"):
        assets.resolve_asset(config(model), tmp_path)


def test_real_symlink_escape(tmp_path):
    external = tmp_path / "external.vrm"
    external.write_bytes(b"fake")
    local = tmp_path / "models_local"
    local.mkdir()
    link = local / "link.vrm"
    try:
        link.symlink_to(external)
    except OSError:
        pytest.skip("Windows symlink privilege unavailable; link policy tested separately")
    with pytest.raises(assets.AvatarPathError):
        assets.resolve_asset(config(link), tmp_path)


@pytest.mark.skipif(os.name != "nt", reason="Windows junction regression")
def test_windows_junction_escape(tmp_path):
    external = tmp_path / "external"
    external.mkdir()
    (external / "fake.vrm").write_bytes(b"synthetic")
    local = tmp_path / "models_local"
    local.mkdir()
    junction = local / "escape"
    subprocess.run(["cmd", "/c", "mklink", "/J", str(junction), str(external)], check=True, capture_output=True)
    try:
        with pytest.raises(assets.AvatarPathError, match="junctions"):
            assets.resolve_asset(config(junction / "fake.vrm"), tmp_path)
    finally:
        # rmdir removes the junction itself, never its destination contents.
        junction.rmdir()
    assert (external / "fake.vrm").is_file()


@pytest.mark.parametrize("vrm1", [False, True])
def test_metadata_from_synthetic_glb(tmp_path, vrm1):
    meta = {"name": "Synthetic avatar", "authors": ["Test author"], "creditNotation": "required"} if vrm1 else {
        "title": "Synthetic avatar", "author": "Test author", "licenseName": "Redistribution_Prohibited"}
    data = json.dumps({"extensions": {"VRMC_vrm" if vrm1 else "VRM": {"meta": meta}}}).encode()
    data += b" " * (-len(data) % 4)
    model = tmp_path / "synthetic.vrm"
    model.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20 + len(data), len(data), 0x4E4F534A) + data)
    model.with_name("README.txt").write_text("Synthetic terms only", encoding="utf-8")
    result = assets.metadata(model)
    assert result["name"] == "Synthetic avatar"
    assert result["authors"] == ["Test author"]
    assert result["readme"] == "Synthetic terms only"
    assert result["conditions"]


def test_unconfigured_avatar_preserves_live2d():
    class Handler:
        def _send_json(self, result):
            self.result = result
    handler = Handler()
    assets.dispatch(handler, {"model_path": "/models/hiyori/model.model3.json"}, Path.cwd(), "/api/avatar")
    assert handler.result == {"kind": "live2d"}


@pytest.mark.parametrize("setting, expected", [(None, "room"), ("room", "room"), ("none", "none"), ("handpainted", "handpainted"), ("painted", "painted"), ("invalid", "room")])
def test_scene_setting_is_bounded(tmp_path, monkeypatch, setting, expected):
    class Handler:
        def _send_json(self, result):
            self.result = result
    monkeypatch.setattr(assets, "resolve_asset", lambda *args: tmp_path / "synthetic.vrm")
    monkeypatch.setattr(assets, "metadata", lambda *args: {})
    handler = Handler()
    assets.dispatch(handler, {"avatar": {"kind": "vrm", "scene": setting}}, tmp_path, "/api/avatar")
    assert handler.result["scene"] == expected


@pytest.mark.parametrize("payload", [[], {"extensions": []}, {"extensions": {"VRM": []}}])
def test_malformed_metadata_is_rejected(tmp_path, payload):
    data = json.dumps(payload).encode()
    model = tmp_path / "synthetic.vrm"
    model.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20 + len(data), len(data), 0x4E4F534A) + data)
    with pytest.raises(assets.AvatarPathError):
        assets.metadata(model)
