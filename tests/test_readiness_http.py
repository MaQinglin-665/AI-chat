from unittest.mock import Mock
import app


def headers_for(path, monkeypatch, dev=False):
    handler = object.__new__(app.PetHandler)
    handler.path = path
    handler._allow_origin_value = lambda: ""
    captured = []
    handler.send_header = lambda k,v: captured.append((k,v))
    monkeypatch.setattr(app.SimpleHTTPRequestHandler, "end_headers", lambda self: None)
    monkeypatch.setenv("TAFFY_DEV_NO_CACHE", "1" if dev else "0")
    handler.end_headers()
    return dict(captured)


def test_static_revalidates_and_api_never_caches(monkeypatch):
    assert headers_for("/chat.js", monkeypatch)["Cache-Control"] == "private, no-cache"
    for path in ["/api/chat", "/config.json", "/api/private.js", "/"]:
        assert headers_for(path, monkeypatch)["Cache-Control"] == "no-store"
    assert headers_for("/chat.js", monkeypatch, True)["Cache-Control"] == "no-store"


def test_client_abort_is_quiet(monkeypatch):
    for error in [ConnectionAbortedError, ConnectionResetError, BrokenPipeError]:
        handler = object.__new__(app.PetHandler)
        handler._do_GET = Mock(side_effect=error())
        handler.do_GET()
        assert handler.close_connection is True
