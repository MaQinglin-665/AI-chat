"""Configured local PNG backgrounds; never accept a filesystem path from HTTP."""
import os
from pathlib import Path
import struct

from avatar_assets import AvatarPathError, _clean_path, _is_link

PERIODS = ("night", "dusk", "day")
ROUTES = {f"/api/avatar/backdrop/{period}.png": period for period in PERIODS}
MAX_BYTES = 64 * 1024 * 1024
MAX_PIXELS = 64 * 1024 * 1024


def resolve_directory(config, root):
    avatar = config.get("avatar", {})
    if not isinstance(avatar, dict) or avatar.get("kind") != "vrm":
        raise AvatarPathError("VRM is not enabled.")
    if not avatar.get("backdrop"):
        return None
    root = Path(root).resolve()
    candidate = _clean_path(avatar["backdrop"])
    if not candidate.is_absolute():
        candidate = root / candidate
    directories = avatar.get("allowed_directories", [])
    if not isinstance(directories, list):
        raise AvatarPathError("Allowed directories must be a list.")
    roots = [root / "models_local"]
    for value in directories:
        item = _clean_path(value)
        if not item.is_absolute():
            raise AvatarPathError("Allowed directories must be absolute.")
        roots.append(item)
    for item in [candidate, *roots]:
        if any(_is_link(part) for part in [item, *item.parents]):
            raise AvatarPathError("Backdrop paths must not contain links or junctions.")
    resolved = candidate.resolve()
    if not any(resolved.is_relative_to(item.resolve()) for item in roots):
        raise AvatarPathError("Backdrop must be in an explicitly allowed directory.")
    if resolved.exists() and not resolved.is_dir():
        raise AvatarPathError("Backdrop must be a directory.")
    return resolved


def select(config, root, period):
    if period not in PERIODS:
        raise AvatarPathError("Unknown backdrop period.")
    directory = resolve_directory(config, root)
    if directory:
        for name in [period, *[p for p in PERIODS if p != period]]:
            candidate = directory / (name + ".png")
            if _is_link(candidate):
                raise AvatarPathError("Backdrop images must not be links.")
            if candidate.is_file():
                return candidate, name
    # Bundled files are fixed application assets, never an HTTP-supplied path.
    bundled = Path(root) / "web/assets/backgrounds/bedroom"
    for name in [period, *[p for p in PERIODS if p != period]]:
        candidate = bundled / (name + ".png")
        if any(_is_link(part) for part in [candidate, *candidate.parents]):
            raise AvatarPathError("Bundled backdrop must not contain links.")
        if candidate.is_file():
            return candidate, name
    return Path(root) / "web/assets/painted-placeholder.png", period


def dispatch(handler, config, root, route):
    try:
        path, period = select(config, root, ROUTES[route])
        with path.open("rb") as stream:
            size = os.fstat(stream.fileno()).st_size
            header = stream.read(24)
            if size > MAX_BYTES or len(header) < 24 or header[:16] != b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR":
                raise AvatarPathError("Invalid or oversized backdrop PNG.")
            width, height = struct.unpack(">II", header[16:24])
            if not width or not height or width * height > MAX_PIXELS:
                raise AvatarPathError("Invalid backdrop dimensions.")
            stream.seek(0)
            handler.send_response(200)
            for key, value in (("Content-Type", "image/png"), ("Content-Length", str(size)),
                               ("X-Content-Type-Options", "nosniff"), ("Cache-Control", "no-store"),
                               ("X-Backdrop-Period", period)):
                handler.send_header(key, value)
            handler.end_headers()
            while chunk := stream.read(65536):
                handler.wfile.write(chunk)
    except (OSError, ValueError, TypeError, KeyError, struct.error):
        handler._send_json({"error": "Backdrop unavailable: check PNG files and allowed directories."}, status=400)
