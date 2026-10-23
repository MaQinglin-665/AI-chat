"""Shared turn budget and bounded network workers (including DNS and slow bodies)."""
import contextvars
import functools
import inspect
import queue
import threading
import time
import urllib.parse
import urllib.request
import ipaddress

_deadline = contextvars.ContextVar("llm_deadline", default=None)
_slots = threading.BoundedSemaphore(8)
_original_urlopen = urllib.request.urlopen

class _SecureRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_transport(newurl)
        if urllib.parse.urlsplit(req.full_url).netloc != urllib.parse.urlsplit(newurl).netloc:
            raise LLMTransportError("LLM cross-host redirect blocked; configure the final HTTPS endpoint.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class LLMTransportError(RuntimeError):
    """Terminal transport failure: never retry through another endpoint."""

class LLMDeadlineError(LLMTransportError):
    pass

def remaining(timeout=30):
    deadline = _deadline.get()
    if deadline is None:
        return float(timeout)
    left = deadline - time.monotonic()
    if left <= 0:
        raise LLMDeadlineError("LLM timeout: 网络好像断了，模型服务未在本轮时限内响应。")
    return min(float(timeout), left)

def turn_budget(fn):
    signature = inspect.signature(fn)
    def enter(args, kwargs):
        if _deadline.get() is not None:
            remaining()
            return None
        bound = signature.bind(*args, **kwargs)
        cfg = bound.arguments.get("config")
        if not isinstance(cfg, dict):
            loader = bound.arguments.get("load_config_fn")
            cfg = loader() if loader else {}
        try:
            seconds = float((cfg or {}).get("llm", {}).get("turn_timeout_sec", 30))
        except (TypeError, ValueError):
            seconds = 30
        seconds = max(1, min(120, seconds))
        return _deadline.set(time.monotonic() + seconds)
    if inspect.isgeneratorfunction(fn):
        @functools.wraps(fn)
        def stream(*args, **kwargs):
            token = enter(args, kwargs)
            try:
                yield from fn(*args, **kwargs)
            finally:
                if token is not None:
                    _deadline.reset(token)
        return stream
    @functools.wraps(fn)
    def call(*args, **kwargs):
        token = enter(args, kwargs)
        try:
            return fn(*args, **kwargs)
        finally:
            if token is not None:
                _deadline.reset(token)
    return call

def validate_transport(url):
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or "").lower()
    local = host == "localhost"
    try:
        local = local or ipaddress.ip_address(host).is_loopback
    except ValueError:
        pass
    if parsed.scheme != "https" and not (parsed.scheme == "http" and local):
        raise LLMTransportError("远程 LLM 必须使用 HTTPS；请向服务商确认 HTTPS 地址，本机服务可使用 HTTP。")

def network_chunks(opener, request, timeout, stream=False):
    """Only networking runs in workers; abandoned requests cannot run tools or save memory.

    urllib DNS cannot be forcibly cancelled. At most eight daemon workers can
    remain blocked; no new request is started when capacity is exhausted.
    """
    validate_transport(request.full_url)
    effective_timeout = remaining(timeout)
    end = time.monotonic() + effective_timeout
    if opener is _original_urlopen:
        opener = urllib.request.build_opener(_SecureRedirect()).open
    if not _slots.acquire(blocking=False):
        raise LLMTransportError("网络请求仍在退出，请稍后重试。")
    events = queue.Queue(maxsize=8)
    stop = threading.Event()
    def put(item):
        while not stop.is_set():
            try:
                events.put(item, timeout=0.05)
                return
            except queue.Full:
                pass
    def run():
        try:
            if stop.is_set() or time.monotonic() >= end:
                return
            with opener(request, timeout=effective_timeout) as response:
                if stop.is_set():
                    return
                if stream:
                    for line in response:
                        if stop.is_set():
                            break
                        put(("data", line))
                else:
                    put(("data", response.read()))
            put(("done", None))
        except Exception as exc:
            if isinstance(exc, urllib.error.HTTPError):
                exc.close()
            put(("error", exc))
        finally:
            _slots.release()
    threading.Thread(target=run, daemon=True, name="llm-network").start()
    try:
        while True:
            wait = end - time.monotonic()
            if wait <= 0:
                raise LLMDeadlineError("LLM timeout: 网络好像断了，模型服务未在本轮时限内响应。")
            try:
                kind, value = events.get(timeout=wait)
            except queue.Empty:
                raise LLMDeadlineError("LLM timeout: 网络好像断了，模型服务未在本轮时限内响应。") from None
            if kind == "error":
                raise value
            if kind == "done":
                return
            yield value
    finally:
        stop.set()
