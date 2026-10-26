"""Small atomic local usage ledger; contains numbers/dates only, never conversation."""
from contextlib import contextmanager
from datetime import datetime
import json
import logging
import math
import os
from pathlib import Path
import tempfile
import threading
import time

LOG = logging.getLogger(__name__)
MAX_FILE_BYTES = 16384
MAX_CALL_TIMES = 256
LOCK_TIMEOUT = 0.25


def default_usage_path():
    # Same application data root already used by external_agent.codex_home.
    root = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    return root / "XinyuDesktopPet" / "avatar-brain-usage.json"


@contextmanager
def file_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix(".lock").open("a+b") as handle:
        handle.seek(0, 2)
        if handle.tell() == 0:
            handle.write(b"0")
            handle.flush()
        end = time.monotonic() + LOCK_TIMEOUT
        while True:
            try:
                handle.seek(0)
                if os.name == "nt":
                    import msvcrt
                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                if time.monotonic() >= end:
                    raise
                time.sleep(0.01)
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


class UsageBudget:
    def __init__(self, path=None, *, clock=time.time, day=lambda: datetime.now().date().isoformat()):
        self.path = Path(path) if path is not None else None
        self.clock, self.day = clock, day
        self.lock = threading.RLock()
        self.memory_only = path is None
        self.state = {"version": 1, "date": day(), "daily": 0, "calls": [], "last": None, "next": 0}

    def _read(self):
        if not self.path.exists():
            return  # Deletion must not reset live in-memory usage.
        with self.path.open("rb") as handle:
            raw = handle.read(MAX_FILE_BYTES + 1)
        if len(raw) > MAX_FILE_BYTES:
            raise ValueError("oversize")
        data = json.loads(raw)
        if not isinstance(data, dict) or set(data) != set(self.state) or data["version"] != 1:
            raise ValueError("schema")
        datetime.strptime(data["date"], "%Y-%m-%d")
        if type(data["daily"]) is not int or not 0 <= data["daily"] <= 10000:
            raise ValueError("daily")
        if not isinstance(data["calls"], list) or len(data["calls"]) > MAX_CALL_TIMES:
            raise ValueError("calls")
        for value in [*data["calls"], data["next"], *([] if data["last"] is None else [data["last"]])]:
            if type(value) not in (float, int) or not math.isfinite(value) or value < 0:
                raise ValueError("timestamp")
        self.state = data

    def _write(self):
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=self.path.parent,
                                             prefix=self.path.name + ".", suffix=".tmp", delete=False) as handle:
                temporary = Path(handle.name)
                json.dump(self.state, handle, ensure_ascii=True, separators=(",", ":"))
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.path)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    def _operate(self, operation):
        with self.lock:
            if self.memory_only:
                return operation()
            applied = False
            result = None
            try:
                with file_lock(self.path):
                    self._read()
                    before = json.dumps(self.state, sort_keys=True)
                    result = operation()
                    applied = True
                    if before != json.dumps(self.state, sort_keys=True):
                        self._write()
                return result
            except (OSError, ValueError, TypeError, OverflowError, RecursionError):
                # Sticky fallback: never reload stale disk counts over live fallback usage.
                self.memory_only = True
                LOG.info("avatar_brain_usage_memory_fallback")
            return result if applied else operation()

    def reserve(self, *, interval, hourly, daily):
        def apply():
            now = self.clock()
            if self.state["date"] != self.day():
                self.state["date"], self.state["daily"] = self.day(), 0
            # Rolling-hour usage is independent of midnight; do not clear it on day rollover.
            self.state["calls"] = [stamp for stamp in self.state["calls"] if now - stamp < 3600]
            last = self.state["last"]
            if (now < self.state["next"] or last is not None and now - last < interval
                    or len(self.state["calls"]) >= hourly or self.state["daily"] >= daily):
                return False
            self.state["last"] = now
            self.state["calls"].append(now)
            self.state["daily"] += 1
            return True
        return self._operate(apply)

    def defer(self, seconds):
        def apply():
            self.state["next"] = max(self.state["next"], self.clock() + seconds)
        self._operate(apply)
