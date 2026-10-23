"""Serve public web assets, fixtures and optional three fixed-line test WAVs."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Handler(SimpleHTTPRequestHandler):
    speech_dir = None
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "web"), **kwargs)

    def do_GET(self):
        speech_files = {"/__speech_question.wav": "question.wav",
                        "/__speech_comfort.wav": "comfort.wav",
                        "/__speech_excited.wav": "excited.wav"}
        if self.path in speech_files:
            path = self.speech_dir / speech_files[self.path] if self.speech_dir else None
            if not path or not path.is_file():
                self.send_error(404, "Fixed-line WAV not supplied")
                return
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        fixtures = {"/__galgame_check.html": "galgame-browser-fixture.html",
                    "/__galgame_check.js": "galgame-browser-fixture.js",
                    "/__live2d_expressive.html": "live2d-expressive-fixture.html",
                    "/__live2d_expressive.js": "live2d-expressive-fixture.js"}
        if self.path in fixtures:
            data = (ROOT / "tests" / fixtures[self.path]).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8" if self.path.endswith("html") else "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--speech-dir", type=Path, help="Directory containing only the three named test WAVs to expose")
    args = parser.parse_args()
    Handler.speech_dir = args.speech_dir.resolve() if args.speech_dir else None
    ThreadingHTTPServer(("127.0.0.1", 8769), Handler).serve_forever()
