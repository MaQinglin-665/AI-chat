"""Read-only local avatar assets. Never expose arbitrary request paths."""
import json
import os
from pathlib import Path
import struct


class AvatarPathError(ValueError):
    pass


def _is_link(path):
    try:
        return path.is_symlink() or bool(getattr(path.lstat(), "st_file_attributes", 0) & 0x400)
    except FileNotFoundError:
        return False


def _clean_path(value):
    raw = str(value or "")
    if not raw or "\x00" in raw or ".." in raw.replace("\\", "/").split("/"):
        raise AvatarPathError("Avatar path is empty or contains traversal.")
    return Path(raw).expanduser()


def resolve_asset(config, root, *, animation=None):
    avatar = config.get("avatar", {})
    if not isinstance(avatar, dict) or avatar.get("kind") != "vrm":
        raise AvatarPathError("VRM is not enabled.")
    raw = animation if animation is not None else avatar.get("path")
    candidate = _clean_path(raw)
    if candidate.suffix.lower() not in ({".vrma"} if animation is not None else {".vrm"}):
        raise AvatarPathError("Only .vrm models and .vrma animations are allowed.")
    root = Path(root).resolve()
    if not candidate.is_absolute():
        candidate = root / candidate
    roots = [root / "models_local"]
    directories = avatar.get("allowed_directories", [])
    if not isinstance(directories, list):
        raise AvatarPathError("avatar.allowed_directories must be a list.")
    for directory in directories:
        item = _clean_path(directory)
        if not item.is_absolute():
            raise AvatarPathError("Allowed avatar directories must be absolute.")
        roots.append(item)
    # Reject links/junctions on every component, including configured roots.
    for item in [candidate, *roots]:
        for component in [item, *item.parents]:
            if _is_link(component):
                raise AvatarPathError("Avatar paths must not contain symbolic links or junctions.")
    resolved = candidate.resolve(strict=True)
    if not any(resolved.is_relative_to(directory.resolve()) for directory in roots):
        raise AvatarPathError("Avatar must be inside models_local or an explicitly allowed directory.")
    if not resolved.is_file():
        raise AvatarPathError("Avatar path must be a file.")
    return resolved


def metadata(path):
    """Read bounded GLB metadata only; never return textures or model content."""
    with Path(path).open("rb") as stream:
        header = stream.read(20)
        if len(header) != 20:
            raise AvatarPathError("Invalid VRM header.")
        magic, version, total, size, kind = struct.unpack("<4sIIII", header)
        if magic != b"glTF" or version != 2 or kind != 0x4E4F534A or size > 16 * 1024 * 1024 or size + 20 > total:
            raise AvatarPathError("Invalid VRM JSON chunk.")
        data = json.loads(stream.read(size).decode("utf-8"))
    if not isinstance(data, dict):
        raise AvatarPathError("VRM metadata must be an object.")
    extensions = data.get("extensions", {})
    if not isinstance(extensions, dict):
        raise AvatarPathError("VRM extensions must be an object.")
    extension = extensions.get("VRMC_vrm", extensions.get("VRM", {}))
    if not isinstance(extension, dict):
        raise AvatarPathError("VRM extension must be an object.")
    meta = extension.get("meta", {})
    if not isinstance(meta, dict):
        meta = {}
    # Preserve standard license fields without inferring permission from absence.
    keys = ("version", "licenseName", "licenseUrl", "otherLicenseUrl", "otherPermissionUrl",
            "allowedUserName", "violentUssageName", "sexualUssageName", "commercialUssageName",
            "avatarPermission", "commercialUsage", "creditNotation", "allowRedistribution",
            "modification", "allowExcessivelyViolentUsage", "allowExcessivelySexualUsage",
            "allowPoliticalOrReligiousUsage", "allowAntisocialOrHateUsage", "thirdPartyLicenses")
    authors = meta.get("authors", [meta.get("author", "")])
    result = {"name": str(meta.get("name", meta.get("title", "Unnamed VRM")))[:512],
              "authors": [str(x)[:512] for x in authors[:16]] if isinstance(authors, list) else [],
              "source": str(meta.get("reference", ""))[:2048],
              "references": meta.get("references", []) if isinstance(meta.get("references", []), list) else [],
              "conditions": {key: meta[key] for key in keys if key in meta}, "readme": ""}
    readme = Path(path).with_name("README.txt")
    if readme.is_file() and not _is_link(readme) and readme.resolve().parent == Path(path).parent:
        with readme.open("rb") as stream:
            result["readme"] = stream.read(32768).decode("utf-8-sig", errors="replace")
    return result


def dispatch(handler, config, root, route):
    avatar = config.get("avatar", {})
    if route == "/api/avatar" and (not isinstance(avatar, dict) or avatar.get("kind") != "vrm"):
        handler._send_json({"kind": "live2d"})
        return
    try:
        path = resolve_asset(config, root)
        if route == "/api/avatar":
            handler._send_json({"kind": "vrm", "path": "/api/avatar/model.vrm", "metadata": metadata(path),
                                "scene": "none" if avatar.get("scene") == "none" else "room",
                                "mapping": avatar.get("mapping", {}) if isinstance(avatar.get("mapping"), dict) else {}})
            return
        # No user-supplied URL filename: only the configured model is served.
        with path.open("rb") as stream:
            handler.send_response(200)
            handler.send_header("Content-Type", "model/gltf-binary")
            handler.send_header("Content-Length", str(os.fstat(stream.fileno()).st_size))
            handler.send_header("X-Content-Type-Options", "nosniff")
            handler.end_headers()
            while chunk := stream.read(65536):
                handler.wfile.write(chunk)
    except (OSError, ValueError, TypeError, struct.error):
        handler._send_json({"kind": "vrm", "error": "VRM unavailable: check the model file and avatar.allowed_directories."}, status=400)
