"""Launch a loopback-only room session from a dedicated spike checkout."""
import argparse
import json
import os
import secrets
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("godot", help="Godot 4.6.3 executable")
    parser.add_argument("--phase2-tour", action="store_true", help="Run the 305-second live tour and save viewport frames in tmp_ui_smoke")
    parser.add_argument("--phase3-tour", action="store_true", help="Record the bedroom acceptance route")
    args = parser.parse_args()
    if not os.environ.get("DEEPSEEK_API_KEY"):
        parser.error("Set DEEPSEEK_API_KEY in the environment first.")
    sys.path.insert(0, str(ROOT))
    import config

    with tempfile.TemporaryDirectory(prefix="xinyu-room-") as directory:
        local = Path(directory)
        config.CONFIG_PATH = local / "room.settings"
        config.LOCAL_CONFIG_PATH = local / "unused-local-settings"
        config.ENV_PATH = local / "unused-env"
        config.MEMORY_PATH = local / "memory.json"
        config.MEMORY_SUMMARY_PATH = local / "summary.json"
        config.CONFIG_PATH.write_text(json.dumps({
            "room_spike": {"enabled": True},
            "server": {"host":"127.0.0.1","port":18471,"require_api_token":True},
            "llm": {"provider":"openai-compatible","model":"deepseek-flash",
                    "base_url":"https://api.deepseek.com","api_key_env":"DEEPSEEK_API_KEY",
                    "turn_timeout_sec":90,"request_timeout":60,"max_output_tokens":240},
            "character_runtime":{"model_direct_reply":True},"thinking":{"enabled":False},
            "tools":{"enabled":False},"onboarding_completed":True
        }), encoding="utf-8")
        os.environ["TAFFY_API_TOKEN"] = secrets.token_urlsafe(32)
        import app

        # This helper exposes only the two authenticated endpoints used by the room.
        class RoomHandler(app.PetHandler):
            def do_GET(self):
                self.send_error(404)

            def do_POST(self):
                if self.path not in ("/api/room/intent", "/api/room/turn", "/api/tts", "/api/chat", "/api/chat_stream"):
                    self.send_error(404)
                    return
                super().do_POST()

            do_HEAD = do_GET
            do_PUT = do_GET

        with ThreadingHTTPServer(("127.0.0.1",18471), RoomHandler) as server:
            threading.Thread(target=server.serve_forever,daemon=True).start()
            env = {k:v for k,v in os.environ.items() if k.upper() in {
                "PATH","SYSTEMROOT","TEMP","TMP","APPDATA","LOCALAPPDATA","USERPROFILE","TAFFY_API_TOKEN"}}
            try:
                command = [args.godot, "--path", str(PROJECT)]
                if args.phase2_tour or args.phase3_tour:
                    phase = "phase3" if args.phase3_tour else "phase2"
                    output = ROOT / "tmp_ui_smoke"
                    output.mkdir(exist_ok=True)
                    frames = Path(tempfile.mkdtemp(prefix=f"{phase}-frames-", dir=output))
                    env["ROOM_FRAMES"] = str(frames)
                    print(f"Recording Godot viewport frames to {frames}", flush=True)
                    command.extend(["--script", str(PROJECT / "tools" / f"{phase}_tour.gd")])
                return subprocess.call(command, env=env)
            finally:
                server.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
