"""Extract animation/skeleton data only from the official Quaternius Standard GLB.

Usage: python scripts/extract_vrm_builtin_motion.py <UAL1_Standard.glb>
No mesh, material, texture, skin, or paid pack content is copied.
"""
import base64
import copy
import hashlib
import json
from pathlib import Path
import struct
import sys

CLIPS = ("Idle_Loop", "Idle_Talking_Loop", "Walk_Loop", "Walk_Formal_Loop",
         "Sitting_Enter", "Sitting_Exit", "Sitting_Idle_Loop", "Sitting_Talking_Loop", "Interact")


def extract(source, destination):
    raw = Path(source).read_bytes()
    if raw[:4] != b"glTF":
        raise ValueError("Expected GLB")
    size = struct.unpack_from("<I", raw, 12)[0]
    original = json.loads(raw[20:20 + size])
    binary_size = struct.unpack_from("<I", raw, 20 + size)[0]
    binary = raw[28 + size:28 + size + binary_size]
    result = {"asset": {"version": "2.0", "generator": "Quaternius Standard animation-only extraction"},
              "scene": original.get("scene", 0), "scenes": original["scenes"],
              "nodes": [{k: v for k, v in node.items() if k in ("name", "children", "translation", "rotation", "scale", "matrix")}
                        for node in original["nodes"]], "animations": [], "accessors": [], "bufferViews": []}
    output = bytearray()
    indices = {}

    def accessor(index):
        if index in indices:
            return indices[index]
        a = copy.deepcopy(original["accessors"][index])
        view = original["bufferViews"][a["bufferView"]]
        while len(output) % 4:
            output.append(0)
        new_view = {"buffer": 0, "byteOffset": len(output), "byteLength": view["byteLength"]}
        if "byteStride" in view:
            new_view["byteStride"] = view["byteStride"]
        offset = view.get("byteOffset", 0)
        output.extend(binary[offset:offset + view["byteLength"]])
        a["bufferView"] = len(result["bufferViews"])
        result["bufferViews"].append(new_view)
        indices[index] = len(result["accessors"])
        result["accessors"].append(a)
        return indices[index]

    for name in CLIPS:
        animation = copy.deepcopy(next(a for a in original["animations"] if a["name"] == name))
        for sampler in animation["samplers"]:
            sampler["input"] = accessor(sampler["input"])
            sampler["output"] = accessor(sampler["output"])
        result["animations"].append(animation)
    result["buffers"] = [{"byteLength": len(output), "uri": "data:application/octet-stream;base64," + base64.b64encode(output).decode()}]
    result["extras"] = {"source": "https://quaternius.itch.io/universal-animation-library", "license": "CC0-1.0",
                        "sourceSha256": hashlib.sha256(raw).hexdigest(), "edition": "Standard (free)"}
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Extracted {len(CLIPS)} clips, {destination.stat().st_size} bytes; no meshes/images/skins")


if __name__ == "__main__":
    extract(sys.argv[1], Path(__file__).resolve().parents[1] / "web/assets/animations/quaternius-standard.gltf")
