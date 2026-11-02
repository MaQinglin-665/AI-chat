"""Bounded, read-only animation catalog rooted at models_local/motions.

Names are activity__take.{vrma,fbx,glb,gltf}; no client filesystem paths.
"""
import json
from pathlib import Path
import re
import struct

from avatar_assets import _is_link

PREFIX = "/api/avatar/motions"
ACTIVITIES = {"idle", "walk", "sit", "enter", "exit", "window", "books", "rest", "desk", "stretch", "yawn", "hum"}
NAME = re.compile(r"([a-z]+)__[A-Za-z0-9_-]{1,64}\.(vrma|fbx|glb|gltf)\Z")
MAX_BYTES = 32 * 1024 * 1024


def resources(root):
    directory = Path(root).resolve() / "models_local" / "motions"
    if any(_is_link(p) for p in (directory, *directory.parents)) or not directory.is_dir():
        return {}
    result = {}
    for path in sorted(directory.iterdir())[:256]:
        match = NAME.fullmatch(path.name)
        if (not match or match[1] not in ACTIVITIES or _is_link(path) or not path.is_file()
                or not path.resolve().is_relative_to(directory) or path.stat().st_size > MAX_BYTES):
            continue
        result[path.name] = (path, match[1])
        if len(result) >= 64:
            break
    return result


def validate(data, suffix):
    if suffix in {".vrma", ".glb"}:
        if len(data) < 20 or data[:4] != b"glTF":
            raise ValueError("Invalid animation GLB")
        size = struct.unpack_from("<I", data, 12)[0]
        if size > len(data) - 20:
            raise ValueError("Invalid animation JSON size")
        document = json.loads(data[20:20 + size])
    elif suffix == ".gltf":
        document = json.loads(data)
    else:
        if not data.startswith((b"Kaydara FBX Binary", b"; FBX")):
            raise ValueError("Invalid FBX")
        return
    if not isinstance(document, dict):
        raise ValueError("Expected animation object")
    # External files/URLs could escape the local allowlist through GLTFLoader.
    for item in document.get("buffers", []) + document.get("images", []):
        if not isinstance(item, dict):
            raise ValueError("Invalid animation resource")
        if "uri" in item and not str(item["uri"]).startswith("data:"):
            raise ValueError("Use embedded animation resources")


def dispatch(handler, root, route):
    try:
        entries = resources(root)
        if route == PREFIX:
            handler._send_json({"clips": [{"activity": activity, "url": PREFIX + "/" + name}
                                          for name, (_, activity) in entries.items()]})
            return
        name = route[len(PREFIX) + 1:]
        if not NAME.fullmatch(name) or name not in entries:
            raise ValueError("Unknown animation")
        path, _ = entries[name]
        data = path.read_bytes()
        if len(data) > MAX_BYTES:
            raise ValueError("Animation too large")
        validate(data, path.suffix)
        handler.send_response(200)
        handler.send_header("Content-Type", "application/octet-stream")
        handler.send_header("Content-Length", str(len(data)))
        handler.send_header("X-Content-Type-Options", "nosniff")
        handler.end_headers()
        handler.wfile.write(data)
    except (OSError, ValueError, TypeError, KeyError, struct.error):
        handler._send_json({"error": "Local animation unavailable; bundled fallback remains active."}, status=400)
