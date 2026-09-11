"""Windows desktop awareness and bounded interaction helpers.

The module intentionally uses only Windows/.NET facilities already available on
the host.  Observation is pull-based: no screenshot leaves the machine until
the model explicitly calls the observation tool.
"""

from __future__ import annotations

import base64
import json
import re
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

from config import ROOT_DIR


LOCAL_DIR = ROOT_DIR / ".local-tools"
STATE_PATH = LOCAL_DIR / "desktop_awareness.json"
CAPTURE_PATH = LOCAL_DIR / "desktop-observation.jpg"
_LOCK = threading.RLock()

# These checks are deliberately local and happen before any image is captured
# for a cloud vision request. They are a privacy boundary, not a prompt hint.
_SENSITIVE_FOREGROUND_RE = re.compile(
    r"(?:1password|bitwarden|keepass|lastpass|dashlane|password|密码|口令|密钥|"
    r"wallet|metamask|ledger|银行|bank|支付|pay(?:ment)?|财务|证券|trading|"
    r"incognito|inprivate|private browsing|无痕|隐私浏览)",
    re.IGNORECASE,
)


def _powershell(script: str, timeout: int = 12) -> str:
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    proc = subprocess.run(
        [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            encoded,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=max(2, min(30, int(timeout or 12))),
        check=False,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if proc.returncode != 0:
        message = (proc.stderr or proc.stdout or "Windows desktop command failed.").strip()
        raise RuntimeError(message[:800])
    return (proc.stdout or "").strip()


def _load_state() -> dict[str, Any]:
    try:
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_state(state: dict[str, Any]) -> None:
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    safe = {
        "version": 1,
        "updated_at": int(state.get("updated_at") or time.time()),
        "screen": state.get("screen") if isinstance(state.get("screen"), dict) else {},
        "observation": str(state.get("observation") or "")[:5000],
        "scene": state.get("scene") if isinstance(state.get("scene"), dict) else {},
        "last_memory_at": int(state.get("last_memory_at") or 0),
    }
    STATE_PATH.write_text(
        json.dumps(safe, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def capture_cursor_screen(*, max_width: int = 1280, max_height: int = 800) -> dict[str, Any]:
    """Capture only the display containing the current mouse cursor."""
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    output_path = str(CAPTURE_PATH).replace("'", "''")
    max_width = max(640, min(1920, int(max_width or 1280)))
    max_height = max(360, min(1080, int(max_height or 800)))
    script = rf"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$point = [System.Windows.Forms.Cursor]::Position
$screen = [System.Windows.Forms.Screen]::FromPoint($point)
$bounds = $screen.Bounds
$source = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($source)
try {{
  $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size)
}} finally {{
  $graphics.Dispose()
}}
$scale = [Math]::Min(1.0, [Math]::Min({max_width} / [double]$bounds.Width, {max_height} / [double]$bounds.Height))
$targetWidth = [Math]::Max(1, [int][Math]::Round($bounds.Width * $scale))
$targetHeight = [Math]::Max(1, [int][Math]::Round($bounds.Height * $scale))
$target = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$draw = [System.Drawing.Graphics]::FromImage($target)
try {{
  $draw.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $draw.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
}} finally {{
  $draw.Dispose()
  $source.Dispose()
}}
$target.Save('{output_path}', [System.Drawing.Imaging.ImageFormat]::Jpeg)
$target.Dispose()
[ordered]@{{
  display_name = $screen.DeviceName
  primary = $screen.Primary
  x = $bounds.X
  y = $bounds.Y
  width = $bounds.Width
  height = $bounds.Height
  cursor_x = $point.X
  cursor_y = $point.Y
  capture_width = $targetWidth
  capture_height = $targetHeight
}} | ConvertTo-Json -Compress
"""
    raw = _powershell(script, timeout=15)
    try:
        meta = json.loads(raw.splitlines()[-1])
    except Exception as exc:
        raise RuntimeError("Desktop capture returned invalid metadata.") from exc
    image = CAPTURE_PATH.read_bytes()
    if not image:
        raise RuntimeError("Desktop capture returned an empty image.")
    return {
        "data_url": "data:image/jpeg;base64," + base64.b64encode(image).decode("ascii"),
        "screen": meta,
        "size_bytes": len(image),
    }


def get_desktop_context() -> dict[str, Any]:
    script = r"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class XinyuDesktopNative {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
$point = [System.Windows.Forms.Cursor]::Position
$screen = [System.Windows.Forms.Screen]::FromPoint($point)
$foreground = [XinyuDesktopNative]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 512
[void][XinyuDesktopNative]::GetWindowText($foreground, $title, $title.Capacity)
$pidValue = [uint32]0
[void][XinyuDesktopNative]::GetWindowThreadProcessId($foreground, [ref]$pidValue)
$processName = ''
try { $processName = (Get-Process -Id $pidValue -ErrorAction Stop).ProcessName } catch {}
$windows = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 40 | ForEach-Object {
  [ordered]@{ handle = [int64]$_.MainWindowHandle; pid = $_.Id; process = $_.ProcessName; title = $_.MainWindowTitle }
}
[ordered]@{
  foreground = [ordered]@{ handle = [int64]$foreground; pid = [int]$pidValue; process = $processName; title = $title.ToString() }
  cursor = [ordered]@{ x = $point.X; y = $point.Y }
  screen = [ordered]@{ name = $screen.DeviceName; primary = $screen.Primary; x = $screen.Bounds.X; y = $screen.Bounds.Y; width = $screen.Bounds.Width; height = $screen.Bounds.Height }
  windows = @($windows)
} | ConvertTo-Json -Depth 5 -Compress
"""
    raw = _powershell(script)
    try:
        return json.loads(raw.splitlines()[-1])
    except Exception as exc:
        raise RuntimeError("Desktop context returned invalid data.") from exc


def is_sensitive_foreground_context(context: dict[str, Any], config: dict[str, Any] | None = None) -> bool:
    """Locally decide whether the current desktop must never be observed."""
    foreground = context.get("foreground") if isinstance(context, dict) else {}
    foreground = foreground if isinstance(foreground, dict) else {}
    windows = context.get("windows") if isinstance(context, dict) else []
    windows = windows if isinstance(windows, list) else []
    candidates = [foreground, *[item for item in windows[:40] if isinstance(item, dict)]]
    observe_cfg = config.get("observe") if isinstance(config, dict) else {}
    extra = observe_cfg.get("sensitive_app_patterns") if isinstance(observe_cfg, dict) else []
    extra = extra if isinstance(extra, list) else []
    for window in candidates:
        process = str(window.get("process") or "")[:240]
        title = str(window.get("title") or "")[:500]
        source = f"{process}\n{title}"
        if _SENSITIVE_FOREGROUND_RE.search(source):
            return True
        for item in extra[:32]:
            pattern = str(item or "").strip()
            if not pattern or len(pattern) > 120:
                continue
            try:
                if re.search(pattern, source, re.IGNORECASE):
                    return True
            except re.error:
                continue
    return False


def control_window(action: str, handle: int) -> dict[str, Any]:
    action = str(action or "").strip().lower()
    if action not in {"focus", "restore", "minimize", "maximize", "close"}:
        raise RuntimeError("Unsupported window action.")
    try:
        handle = int(handle)
    except (TypeError, ValueError) as exc:
        raise RuntimeError("A valid window handle is required.") from exc
    show_code = {"restore": 9, "minimize": 6, "maximize": 3}.get(action, 9)
    close_line = (
        "[void][XinyuWindowNative]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)"
        if action == "close"
        else f"[void][XinyuWindowNative]::ShowWindow($h, {show_code}); [void][XinyuWindowNative]::SetForegroundWindow($h)"
    )
    script = rf"""
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class XinyuWindowNative {{
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
}}
'@
$h = [IntPtr]{handle}
{close_line}
"""
    _powershell(script)
    return {"ok": True, "action": action, "handle": handle}


def desktop_input(args: dict[str, Any]) -> dict[str, Any]:
    action = str(args.get("action") or "").strip().lower()
    if action == "click":
        x_ratio = max(0.0, min(1.0, float(args.get("x_ratio", 0.5))))
        y_ratio = max(0.0, min(1.0, float(args.get("y_ratio", 0.5))))
        button = str(args.get("button") or "left").strip().lower()
        if button not in {"left", "right"}:
            raise RuntimeError("Unsupported mouse button.")
        down, up = (0x0002, 0x0004) if button == "left" else (0x0008, 0x0010)
        script = rf"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class XinyuInputNative {{
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}}
'@
$point = [System.Windows.Forms.Cursor]::Position
$screen = [System.Windows.Forms.Screen]::FromPoint($point)
$x = $screen.Bounds.X + [int][Math]::Round(($screen.Bounds.Width - 1) * {x_ratio})
$y = $screen.Bounds.Y + [int][Math]::Round(($screen.Bounds.Height - 1) * {y_ratio})
[void][XinyuInputNative]::SetCursorPos($x, $y)
[XinyuInputNative]::mouse_event({down}, 0, 0, 0, [UIntPtr]::Zero)
[XinyuInputNative]::mouse_event({up}, 0, 0, 0, [UIntPtr]::Zero)
[ordered]@{{x=$x;y=$y}} | ConvertTo-Json -Compress
"""
        raw = _powershell(script)
        point = json.loads(raw.splitlines()[-1])
        return {"ok": True, "action": action, "button": button, **point}
    if action == "type_text":
        text = str(args.get("text") or "")
        if not text or len(text) > 1200:
            raise RuntimeError("Text must contain 1-1200 characters.")
        encoded_text = base64.b64encode(text.encode("utf-8")).decode("ascii")
        script = rf"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$text = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded_text}'))
[System.Windows.Forms.Clipboard]::SetText($text)
Start-Sleep -Milliseconds 80
[System.Windows.Forms.SendKeys]::SendWait('^v')
"""
        _powershell(script)
        return {"ok": True, "action": action, "characters": len(text)}
    if action == "key_press":
        key = str(args.get("key") or "").strip().lower()
        mapping = {
            "enter": "{ENTER}",
            "escape": "{ESC}",
            "tab": "{TAB}",
            "space": " ",
            "backspace": "{BACKSPACE}",
            "ctrl+l": "^l",
            "ctrl+f": "^f",
            "ctrl+s": "^s",
        }
        if key not in mapping:
            raise RuntimeError("Unsupported key.")
        escaped = mapping[key].replace("'", "''")
        _powershell(
            f"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{escaped}')"
        )
        return {"ok": True, "action": action, "key": key}
    raise RuntimeError("Unsupported desktop input action.")


def clipboard_action(action: str, text: str = "") -> dict[str, Any]:
    action = str(action or "").strip().lower()
    if action == "read":
        value = _powershell("Get-Clipboard -Raw", timeout=5)
        return {"ok": True, "text": value[:4000], "truncated": len(value) > 4000}
    if action == "write":
        value = str(text or "")
        if len(value) > 8000:
            raise RuntimeError("Clipboard text is too long.")
        encoded = base64.b64encode(value.encode("utf-8")).decode("ascii")
        _powershell(
            "$v=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("
            f"'{encoded}')); Set-Clipboard -Value $v",
            timeout=5,
        )
        return {"ok": True, "characters": len(value)}
    raise RuntimeError("Unsupported clipboard action.")


def record_observation(observation: str, screen: dict[str, Any], scene: dict[str, Any] | None = None) -> dict[str, Any]:
    with _LOCK:
        state = _load_state()
        state.update(
            {
                "updated_at": int(time.time()),
                "screen": screen if isinstance(screen, dict) else {},
                "observation": str(observation or "")[:5000],
                "scene": scene if isinstance(scene, dict) else {},
            }
        )
        _save_state(state)
        return state


def mark_memory_saved() -> None:
    with _LOCK:
        state = _load_state()
        state["last_memory_at"] = int(time.time())
        _save_state(state)


def latest_observation(*, max_age_sec: int = 1800) -> dict[str, Any]:
    with _LOCK:
        state = _load_state()
    age = max(0, int(time.time()) - int(state.get("updated_at") or 0))
    if not state.get("observation") or age > max(60, int(max_age_sec or 1800)):
        return {}
    state["age_sec"] = age
    return state


def build_prompt_block(config: dict[str, Any] | None) -> str:
    cfg = config if isinstance(config, dict) else {}
    observe = cfg.get("observe") if isinstance(cfg.get("observe"), dict) else {}
    tools = cfg.get("tools") if isinstance(cfg.get("tools"), dict) else {}
    if not (observe.get("autonomous_enabled") is True or tools.get("desktop_enabled") is True):
        return ""
    lines = [
        "[Available local capabilities]",
        "These are real, optional capabilities. Use them only when useful; having a capability never requires using it.",
    ]
    if observe.get("autonomous_enabled") is True:
        lines.append(
            "- You may call observe_screen to inspect the display currently containing the mouse. Observation alone does not require speaking."
        )
    if tools.get("desktop_enabled") is True:
        lines.extend(
            [
                "- You may inspect/focus ordinary app windows, open apps or URLs, use the clipboard, and perform bounded mouse/keyboard actions.",
                "- Prefer background/open/focus actions. Use visible mouse or keyboard takeover only when a background method cannot do the job.",
                "- High-risk or irreversible actions require the user's confirmation and can never be self-approved.",
            ]
        )
    recent = latest_observation(max_age_sec=int(observe.get("context_ttl_sec", 1800) or 1800))
    if recent:
        summary = re.sub(r"\s+", " ", str(recent.get("observation") or "")).strip()[:900]
        if summary:
            lines.append(
                f"- Latest screen awareness ({recent.get('age_sec', 0)} seconds old; may be stale): {summary}"
            )
    return "\n".join(lines)
