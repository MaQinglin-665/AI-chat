"""Windows probe. Pass Godot console executable and an imported disposable godot_room copy."""
import base64
import ctypes
import io
import os
import statistics
import subprocess
import sys
import tempfile
import threading
import time
import zlib
from pathlib import Path

import psutil
from PIL import Image


def measure(executable, project):
    with tempfile.TemporaryDirectory() as directory:
        stop = Path(directory) / "close"
        command = [executable, "--path", project, "--position", "-30000,-30000", "--max-fps", "5", "--audio-driver", "Dummy",
                   "--script", str(Path(__file__).with_name("render.gd").resolve()), "--", str(stop)]
        start = time.perf_counter()
        process = subprocess.Popen(command, stdout=subprocess.PIPE, creationflags=subprocess.CREATE_NO_WINDOW)
        watchdog = threading.Timer(45, lambda: subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True))
        watchdog.start()
        frames, gpu, rss, hashes = [], [], [], set()
        try:
            for line in process.stdout:
                if line.startswith(b"HWND "):
                    window = ctypes.c_void_p(int(line.split()[1]))
                    assert window.value and ctypes.windll.user32.IsWindow(window)
                    ctypes.windll.user32.ShowWindowAsync(window, 0)
                if line.startswith(b"PID "):
                    _, pid, adapter = line.strip().split(b" ", 2)
                    engine = psutil.Process(int(pid))
                if not line.startswith(b"FRAME "):
                    continue
                _, milliseconds, payload = line.split()
                raw = base64.b64decode(payload, validate=True)
                with Image.open(io.BytesIO(raw)) as image:
                    image.load()
                    if ctypes.windll.user32.IsWindowVisible(window):
                        continue
                    assert image.size == (320, 180) and max(b-a for a,b in image.getextrema()) > 10
                frames.append(time.perf_counter())
                gpu.append(float(milliseconds))
                hashes.add(zlib.crc32(raw))
                rss.append(engine.memory_info().rss / 2**20)
                if len(frames) == 5:
                    cpu_start = sum(engine.cpu_times()[:2])
                if len(frames) == 55:
                    cpu = (sum(engine.cpu_times()[:2]) - cpu_start) / (frames[-1]-frames[4]) * 100 / os.cpu_count()
                    closing = time.perf_counter()
                    stop.touch()
                    break
            process.wait(timeout=10)
            assert process.returncode == 0 and len(frames) == 55 and not engine.is_running()
            print(adapter.decode(), dict(first_s=round(frames[0]-start,3), fps=round(50/(frames[-1]-frames[4]),2),
                  cpu_pct=round(cpu,3), rss_mib=round(statistics.mean(rss[5:]),1),
                  gpu_ms=round(statistics.median(gpu[5:]),3), close_s=round(time.perf_counter()-closing,3),
                  unique=len(hashes)), flush=True)
        finally:
            watchdog.cancel()
            stop.touch(exist_ok=True)
            if process.poll() is None:
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True)


if __name__ == "__main__":
    for _ in range(3):
        measure(*sys.argv[1:])
