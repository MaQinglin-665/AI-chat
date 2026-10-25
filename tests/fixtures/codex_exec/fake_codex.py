"""Test-only CLI emulator: replays captured events; never contacts a provider."""
import json
import os
from pathlib import Path
import sys
import time

if "--version" in sys.argv:
    print("codex-cli " + os.environ.get("FAKE_VERSION", "0.164.0"))
    raise SystemExit(0)
sys.stdin.read()
mode = os.environ.get("FAKE_MODE", "replay")
if mode == "hang":
    import subprocess
    subprocess.Popen([sys.executable, "-c", "import time; from pathlib import Path\nfor i in range(1200):\n Path('fake-child-heartbeat.txt').write_text(str(i)); time.sleep(.05)"])
    while True:
        Path("fake-heartbeat.txt").write_text(str(time.time()))
        time.sleep(.05)
if mode in {"error", "turn.failed"}:
    print(json.dumps({"type": mode, "error": {"message": "401 Unauthorized " + os.environ.get("XINYU_DEEPSEEK_API_KEY", "")}}))
    raise SystemExit(1)
fixture = os.environ.get("FAKE_FIXTURE", "v0.164.0-minimal.jsonl")
print(Path(__file__).with_name(fixture).read_text(encoding="utf-8"), end="")
if "-o" in sys.argv:
    plan = dict(summary="整理测试文件", steps=["创建目录"], files_to_create=["sorted"],
                files_to_modify=[], files_to_delete=[], commands=[], risk="low", needs_network=False)
    Path(sys.argv[sys.argv.index("-o")+1]).write_text(json.dumps(plan), encoding="utf-8")
