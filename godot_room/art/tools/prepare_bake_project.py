"""Prepare an isolated Godot editor project; no actor/model/backend import."""
from pathlib import Path
import argparse, subprocess
parser=argparse.ArgumentParser();parser.add_argument("destination",type=Path);args=parser.parse_args()
dest=args.destination.resolve();dest.mkdir(parents=True,exist_ok=True)
art=Path(__file__).resolve().parents[1]
link=dest/"art"
if not link.exists():subprocess.run(["cmd","/c","mklink","/J",str(link),str(art)],check=True,capture_output=True)
(dest/"project.godot").write_text('''config_version=5
[application]
config/name="Xinyu offline bedroom baker"
[rendering]
renderer/rendering_method="forward_plus"
lightmapping/bake_quality/medium_quality_ray_count=128
[editor_plugins]
enabled=PackedStringArray("res://addons/baker/plugin.cfg")
[navigation]
3d/default_cell_size=0.125
3d/default_cell_height=0.1
''',encoding="utf8")
p=dest/"addons/baker";p.mkdir(parents=True,exist_ok=True)
(p/"plugin.cfg").write_text('[plugin]\nname="Bedroom bake"\ndescription=""\nauthor="Xinyu"\nversion="1"\nscript="plugin.gd"\n',encoding="utf8")
(p/"plugin.gd").write_text('@tool\nextends "res://art/tools/bake_quality_plugin.gd"\n',encoding="utf8")
print(dest)
