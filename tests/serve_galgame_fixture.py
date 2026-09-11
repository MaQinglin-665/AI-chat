"""Serve only public web assets and the deterministic Galgame test fixture."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "web"), **kwargs)

    def do_GET(self):
        fixtures = {"/__galgame_check.html": "galgame-browser-fixture.html",
                    "/__galgame_check.js": "galgame-browser-fixture.js"}
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
    ThreadingHTTPServer(("127.0.0.1", 8769), Handler).serve_forever()
