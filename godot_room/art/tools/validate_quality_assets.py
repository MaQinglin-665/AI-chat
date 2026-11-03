"""Offline receipt, maximum texture-size and art-scope checks (Pillow for dev QA)."""
from pathlib import Path
import hashlib, json
from PIL import Image
art=Path(__file__).resolve().parents[1];repo=art.parents[1]
manifest=json.loads((art/"assets/sources.json").read_text(encoding="utf8"))
for asset in manifest["assets"]:
 assert asset["license"]=="CC0-1.0" and asset["source"].startswith("https://polyhaven.com/a/")
for item in manifest["files"]:
 path=repo/item["path"]
 assert path.resolve().is_relative_to((art/"assets").resolve())
 assert hashlib.sha256(path.read_bytes()).hexdigest()==item["sha256"],str(path)
textures=list((art/"assets").rglob("*.jpg"))
for path in textures:
 with Image.open(path) as image:assert max(image.size)<=2048,str(path)
for path in art.rglob("*"):
 if not path.is_file():continue
 assert path.suffix.lower() not in {".vrm",".pck",".exe",".mp4",".env"},str(path)
 assert not (path.name.startswith("config") and path.suffix==".json"),str(path)
print(f"QUALITY_ASSETS {len(manifest['files'])} official hashes, {len(textures)} textures <=2K; CC0, no private/export assets")
