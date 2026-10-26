import io
from pathlib import Path

import pytest

import avatar_backdrops as backdrops
from avatar_assets import AvatarPathError


def setup(tmp_path):
    directory = tmp_path / "models_local" / "bedroom"
    directory.mkdir(parents=True)
    cfg = {"avatar": {"kind": "vrm", "backdrop": str(directory)}}
    return directory, cfg


def test_missing_period_and_placeholder(tmp_path):
    directory, cfg = setup(tmp_path)
    placeholder, period = backdrops.select(cfg, tmp_path, "night")
    assert placeholder == tmp_path / "web/assets/painted-placeholder.png"
    assert period == "night"
    (directory / "day.png").write_bytes(b"test")
    assert backdrops.select(cfg, tmp_path, "dusk") == (directory / "day.png", "day")
    (directory / "dusk.png").write_bytes(b"test")
    assert backdrops.select(cfg, tmp_path, "dusk")[1] == "dusk"


@pytest.mark.parametrize("value", ["models_local/../private", "models_local\\..\\private", "https://evil.example/bg", "", "models_local/a\x00b"])
def test_reject_bad_directory(tmp_path, value):
    if not value:  # Unconfigured deliberately uses the public placeholder.
        assert backdrops.resolve_directory({"avatar": {"kind": "vrm"}}, tmp_path) is None
        return
    with pytest.raises((ValueError, OSError)):
        backdrops.resolve_directory({"avatar": {"kind": "vrm", "backdrop": value}}, tmp_path)


def test_allowlist_and_link_components(tmp_path, monkeypatch):
    outside = tmp_path / "outside"
    outside.mkdir()
    cfg = {"avatar": {"kind": "vrm", "backdrop": str(outside)}}
    with pytest.raises(AvatarPathError):
        backdrops.resolve_directory(cfg, tmp_path / "repo")
    cfg["avatar"]["allowed_directories"] = [str(outside)]
    assert backdrops.resolve_directory(cfg, tmp_path / "repo") == outside
    monkeypatch.setattr(backdrops, "_is_link", lambda p: p == outside)
    with pytest.raises(AvatarPathError):
        backdrops.resolve_directory(cfg, tmp_path / "repo")


def test_link_image_and_invalid_period(tmp_path, monkeypatch):
    directory, cfg = setup(tmp_path)
    monkeypatch.setattr(backdrops, "_is_link", lambda p: p == directory / "night.png")
    with pytest.raises(AvatarPathError):
        backdrops.select(cfg, tmp_path, "night")
    for period in ["../night", "day.png", "private", "night?path=secret"]:
        with pytest.raises(AvatarPathError):
            backdrops.select(cfg, tmp_path, period)


class Handler:
    def __init__(self):
        self.headers = {}
        self.wfile = io.BytesIO()

    def send_response(self, status):
        self.status = status

    def send_header(self, key, value):
        self.headers[key] = value

    def end_headers(self):
        pass

    def _send_json(self, data, status=200):
        self.status, self.data = status, data


def test_png_stream_and_bad_content(tmp_path):
    directory, cfg = setup(tmp_path)
    image = Path("web/assets/painted-placeholder.png").read_bytes()
    (directory / "day.png").write_bytes(image)
    handler = Handler()
    backdrops.dispatch(handler, cfg, tmp_path, "/api/avatar/backdrop/dusk.png")
    assert handler.status == 200
    assert handler.headers["X-Backdrop-Period"] == "day"
    assert handler.wfile.getvalue() == image
    (directory / "day.png").write_bytes(b"not a PNG")
    backdrops.dispatch(handler, cfg, tmp_path, "/api/avatar/backdrop/day.png")
    assert handler.status == 400


def test_endpoint_is_behind_existing_auth_checks():
    code = Path("app_get_routes.py").read_text(encoding="utf-8")
    assert code.index("_reject_invalid_api_token") < code.index("avatar_backdrops.dispatch")
    assert code.index("_reject_disallowed_origin") < code.index("avatar_backdrops.dispatch")
