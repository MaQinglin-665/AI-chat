import ctypes
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import app


TRANSPARENCY_KEY_RGB = (255, 0, 255)
TRANSPARENCY_KEY_HEX = "#FF00FF"
BRIDGE_WINDOW = None


def wait_server_ready(base_url, timeout_sec=15):
    probe_url = f"{base_url}/config.json"
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(probe_url, timeout=2) as resp:
                if int(resp.status) == 200:
                    return True
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.25)
            continue
        except Exception:
            time.sleep(0.25)
            continue
    return False


def _as_bool(value, default):
    if value is None:
        return bool(default)
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    return bool(default)


def _as_int(value, default, min_value=100, max_value=4000):
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = int(default)
    return max(min_value, min(max_value, number))


def load_desktop_options():
    config = app.load_config()
    desktop_cfg = config.get("desktop", {})

    transparent = _as_bool(desktop_cfg.get("transparent", True), True)
    frameless = _as_bool(desktop_cfg.get("frameless", transparent), transparent)

    return {
        "transparent": transparent,
        "frameless": frameless,
        "always_on_top": _as_bool(desktop_cfg.get("always_on_top", False), False),
        "resizable": _as_bool(desktop_cfg.get("resizable", True), True),
        "width": _as_int(desktop_cfg.get("width", 520), 520),
        "height": _as_int(desktop_cfg.get("height", 900), 900),
        "min_width": _as_int(desktop_cfg.get("min_width", 420), 420),
        "min_height": _as_int(desktop_cfg.get("min_height", 700), 700),
    }


def append_query(url, **params):
    parts = urlsplit(url)
    current = dict(parse_qsl(parts.query, keep_blank_values=True))
    for key, value in params.items():
        current[str(key)] = str(value)
    query = urlencode(current)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


class DesktopBridge:
    def bind_window(self, window):
        global BRIDGE_WINDOW
        BRIDGE_WINDOW = window

    def drag_window(self, dx, dy):
        window = BRIDGE_WINDOW
        if window is None or getattr(window, "native", None) is None:
            return False
        try:
            ndx = int(float(dx))
            ndy = int(float(dy))
        except (TypeError, ValueError):
            return False
        if ndx == 0 and ndy == 0:
            return False
        try:
            loc = window.native.Location
            window.move(int(loc.X) + ndx, int(loc.Y) + ndy)
            return True
        except Exception:
            return False


def apply_windows_transparency_key(window, options):
    if not options.get("transparent"):
        return
    try:
        # WinForms transparency key makes the host background fully transparent.
        from System.Drawing import Color
    except Exception:
        return

    try:
        native = window.native
        key = Color.FromArgb(255, *TRANSPARENCY_KEY_RGB)
        native.BackColor = key
        native.TransparencyKey = key
        native.AllowTransparency = True

        # Force layered colorkey on Windows for WebView host background.
        hwnd = int(native.Handle.ToInt64())
        GWL_EXSTYLE = -20
        WS_EX_LAYERED = 0x00080000
        LWA_COLORKEY = 0x00000001
        colorref = (
            TRANSPARENCY_KEY_RGB[0]
            | (TRANSPARENCY_KEY_RGB[1] << 8)
            | (TRANSPARENCY_KEY_RGB[2] << 16)
        )
        user32 = ctypes.windll.user32
        style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED)
        user32.SetLayeredWindowAttributes(hwnd, colorref, 0, LWA_COLORKEY)
    except Exception as exc:
        print(f"Transparency key setup skipped: {exc}")


def main():
    try:
        httpd, url, _ = app.build_server()
    except OSError as exc:
        print(f"Failed to bind server port: {exc}")
        return 1

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    if not wait_server_ready(url):
        print("Server startup timed out.")
        httpd.shutdown()
        httpd.server_close()
        return 1

    print(f"Desktop pet ready at {url}")
    options = load_desktop_options()
    window_url = append_query(
        url,
        desktop="1",
        transparent="1" if options["transparent"] else "0",
        alpha_mode="truealpha" if options["transparent"] else "none",
    )
    bridge = DesktopBridge()

    try:
        import webview
    except Exception:
        print("pywebview is not available. Falling back to browser mode.")
        webbrowser.open(url)
        try:
            while server_thread.is_alive():
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            httpd.shutdown()
            httpd.server_close()
        return 0

    main_window = webview.create_window(
        title="馨语Ai桌宠",
        url=window_url,
        js_api=bridge,
        width=options["width"],
        height=options["height"],
        min_size=(options["min_width"], options["min_height"]),
        resizable=options["resizable"],
        on_top=options["always_on_top"],
        frameless=options["frameless"],
        easy_drag=False,
        transparent=options["transparent"],
        shadow=not options["transparent"],
        background_color=TRANSPARENCY_KEY_HEX if options["transparent"] else "#FFFFFF",
        confirm_close=False,
    )
    bridge.bind_window(main_window)

    try:
        webview.start(
            func=apply_windows_transparency_key,
            args=(main_window, options),
            debug=False,
        )
    finally:
        httpd.shutdown()
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
