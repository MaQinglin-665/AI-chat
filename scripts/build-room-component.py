"""Build the Windows x64 room component from a clean checkout, independently of the pet installer."""
import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "godot_room"
parser = argparse.ArgumentParser()
parser.add_argument("--godot", default="godot")
parser.add_argument("--out", type=Path, required=True)
args = parser.parse_args()
version = subprocess.check_output([args.godot, "--version"], text=True).strip()
if not version.startswith("4.6.3.stable"):
    parser.error("Use Godot 4.6.3 stable")
args.out.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    build = Path(tmp)
    def run(*opts, env=None):
        subprocess.run([args.godot, "--headless", "--path", str(PROJECT), *opts], check=True, env=env)
    run("--editor", "--import")
    for check in ("check_navigation", "check_player", "check_shared_goals", "check_room_speech",
                  "art/tools/verify", "art/tools/check_interaction_contract"):
        run("--script", "res://" + check + ".gd")
    run("--script", "res://tools/engine_notices.gd", env={**os.environ, "ROOM_ENGINE_NOTICES": str(build / "Godot-LICENSES.txt")})
    run("--export-release", "Windows Desktop", str(build / "Room.exe"))
    artifact = args.out / "xinyu-room-windows-x64.zip"
    with ZipFile(artifact, "w", compression=ZIP_DEFLATED, compresslevel=6) as out:
        for name in ("Room.exe", "Room.pck", "Godot-LICENSES.txt"):
            out.write(build / name, name)
        out.write(ROOT / "THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md")
        for src, name in (("addons/vrm/LICENSE", "godot-vrm"), ("addons/Godot-MToon-Shader/LICENSE", "MToon"),
                          ("animations/LICENSE.txt", "CC0"), ("art/LICENSE-CC0.txt", "bedroom")):
            out.write(PROJECT / src, "licenses/" + name + ".txt")
digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
(args.out / "room-SHA256SUMS.txt").write_text(f"{digest}  {artifact.name}\n", encoding="ascii")
print(f"{artifact.stat().st_size} bytes; SHA256 {digest}")
