"""Shared turn budget and bounded network workers (including DNS and slow bodies).

Time limits, from the user's point of view:

* ``llm.turn_timeout_sec`` (default 30): connecting, waiting for the first
  response bytes, non-streaming requests and HTTP retries all share this one
  budget, so an unreachable service fails within seconds instead of minutes.
* ``llm.stream_idle_timeout_sec`` (default 15): once a stream has started, it
  may run past the turn budget as long as data keeps arriving; a silent gap
  longer than this ends it.
* ``llm.stream_max_sec`` (default 180): absolute cap on one streamed reply, so
  a server that trickles keep-alive bytes cannot hold a turn open forever.

Plain HTTP is accepted for this computer and private/LAN addresses. Any other
remote ``http://`` endpoint is refused before credentials are sent unless the
user explicitly sets ``llm.allow_insecure_http: true``.
"""
import contextlib
import contextvars
import functools
import inspect
import ipaddress
import logging
import queue
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

DEFAULT_TURN_TIMEOUT_SEC = 30
DEFAULT_STREAM_IDLE_TIMEOUT_SEC = 15
DEFAULT_STREAM_MAX_SEC = 180

_deadline = contextvars.ContextVar("llm_deadline", default=None)
_policy = contextvars.ContextVar("llm_transport_policy", default=None)
_slots = threading.BoundedSemaphore(8)
_original_urlopen = urllib.request.urlopen
_warned_insecure_hosts = set()

_TIMEOUT_MESSAGE = "LLM timeout: 网络好像断了，模型服务未在本轮时限内响应。"
_IDLE_MESSAGE = "LLM timeout: 模型输出中断，超过 {seconds:g} 秒没有收到新内容。"
_MAX_MESSAGE = "LLM timeout: 单次回复超过 {seconds:g} 秒上限，已停止接收。"


class LLMTransportError(RuntimeError):
    """Terminal transport failure: never retry through another endpoint."""


class LLMDeadlineError(LLMTransportError):
    pass


def _clamp(value, default, low, high):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return float(default)
    return float(max(low, min(high, number)))


def _as_bool(value):
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def build_policy(llm_cfg):
    """Normalise the transport/timing settings of one ``llm`` config block."""
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    return {
        "allow_insecure_http": _as_bool(cfg.get("allow_insecure_http", False)),
        "stream_idle_timeout_sec": _clamp(
            cfg.get("stream_idle_timeout_sec"), DEFAULT_STREAM_IDLE_TIMEOUT_SEC, 3, 120
        ),
        "stream_max_sec": _clamp(cfg.get("stream_max_sec"), DEFAULT_STREAM_MAX_SEC, 10, 900),
    }


def current_policy():
    return _policy.get() or build_policy({})


@contextlib.contextmanager
def transport_scope(llm_cfg):
    """Apply one llm config's transport policy to calls made inside the block.

    Used by entry points that are not wrapped in ``turn_budget`` (for example
    the settings-page connection probe).  An enclosing scope is never replaced.
    """
    if _policy.get() is not None:
        yield
        return
    token = _policy.set(build_policy(llm_cfg))
    try:
        yield
    finally:
        _policy.reset(token)


def remaining(timeout=DEFAULT_TURN_TIMEOUT_SEC):
    deadline = _deadline.get()
    if deadline is None:
        return float(timeout)
    left = deadline - time.monotonic()
    if left <= 0:
        raise LLMDeadlineError(_TIMEOUT_MESSAGE)
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
        llm_cfg = (cfg or {}).get("llm", {})
        llm_cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
        seconds = _clamp(llm_cfg.get("turn_timeout_sec"), DEFAULT_TURN_TIMEOUT_SEC, 1, 120)
        deadline_token = _deadline.set(time.monotonic() + seconds)
        policy_token = _policy.set(build_policy(llm_cfg)) if _policy.get() is None else None
        return deadline_token, policy_token

    def leave(tokens):
        if tokens is None:
            return
        deadline_token, policy_token = tokens
        if policy_token is not None:
            _policy.reset(policy_token)
        _deadline.reset(deadline_token)

    if inspect.isgeneratorfunction(fn):
        @functools.wraps(fn)
        def stream(*args, **kwargs):
            tokens = enter(args, kwargs)
            try:
                yield from fn(*args, **kwargs)
            finally:
                leave(tokens)
        return stream

    @functools.wraps(fn)
    def call(*args, **kwargs):
        tokens = enter(args, kwargs)
        try:
            return fn(*args, **kwargs)
        finally:
            leave(tokens)
    return call


# Tailscale / carrier-grade NAT range; Python does not mark it private.
_CGNAT = ipaddress.ip_network("100.64.0.0/10")


def is_private_host(host):
    """True for this computer and addresses that only exist on a local network."""
    host = (host or "").strip().lower().rstrip(".")
    if not host:
        return False
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
        return True
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    if getattr(address, "ipv4_mapped", None):
        address = address.ipv4_mapped
    if address.is_unspecified or address.is_multicast:
        return False
    return bool(
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or (address.version == 4 and address in _CGNAT)
    )


def validate_transport(url, allow_insecure_http=None):
    parsed = urllib.parse.urlsplit(url)
    scheme = (parsed.scheme or "").lower()
    if scheme == "https":
        return
    if scheme != "http":
        raise LLMTransportError(f"不支持的 LLM 地址协议：{scheme or '空'}。请使用 https:// 地址。")
    host = (parsed.hostname or "").lower()
    if is_private_host(host):
        return
    if allow_insecure_http is None:
        allow_insecure_http = current_policy()["allow_insecure_http"]
    if allow_insecure_http:
        if host not in _warned_insecure_hosts:
            _warned_insecure_hosts.add(host)
            logger.warning(
                "LLM endpoint %s uses plain HTTP; API key and chat content are sent unencrypted "
                "(llm.allow_insecure_http is enabled).",
                host,
            )
        return
    raise LLMTransportError(
        "远程 LLM 地址使用了不加密的 HTTP，API Key 和聊天内容会明文传输，已拦截。"
        "请向服务商确认 HTTPS 地址；如果确认要继续使用 HTTP，可在配置中设置 llm.allow_insecure_http = true。"
        "本机和局域网地址不受此限制。"
    )


class _SecureRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, allow_insecure_http=False):
        super().__init__()
        self._allow_insecure_http = bool(allow_insecure_http)

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        old = urllib.parse.urlsplit(req.full_url)
        new = urllib.parse.urlsplit(newurl)
        if old.scheme == "https" and new.scheme != "https":
            raise LLMTransportError("LLM redirect from HTTPS to HTTP blocked.")
        validate_transport(newurl, allow_insecure_http=self._allow_insecure_http)
        if old.netloc != new.netloc:
            raise LLMTransportError("LLM cross-host redirect blocked; configure the final HTTPS endpoint.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def network_chunks(opener, request, timeout, stream=False):
    """Only networking runs in workers; abandoned requests cannot run tools or save memory.

    urllib DNS cannot be forcibly cancelled. At most eight daemon workers can
    remain blocked; no new request is started when capacity is exhausted.

    Until the first bytes arrive, the shared turn budget applies.  For streams,
    each later chunk only needs to arrive within the idle timeout, bounded by an
    absolute per-stream cap.
    """
    policy = current_policy()
    validate_transport(request.full_url, allow_insecure_http=policy["allow_insecure_http"])
    effective_timeout = remaining(timeout)
    started = time.monotonic()
    first_data_end = started + effective_timeout
    idle_timeout = policy["stream_idle_timeout_sec"]
    stream_end = started + max(policy["stream_max_sec"], effective_timeout)
    # The socket timeout bounds every single blocking read in the worker.
    socket_timeout = max(effective_timeout, idle_timeout) if stream else effective_timeout
    if opener is _original_urlopen:
        opener = urllib.request.build_opener(_SecureRedirect(policy["allow_insecure_http"])).open
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
            if stop.is_set() or time.monotonic() >= first_data_end:
                return
            with opener(request, timeout=socket_timeout) as response:
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
    received_any = False
    try:
        while True:
            now = time.monotonic()
            if not received_any:
                wait, message = first_data_end - now, _TIMEOUT_MESSAGE
            elif now + idle_timeout <= stream_end:
                wait, message = idle_timeout, _IDLE_MESSAGE.format(seconds=idle_timeout)
            else:
                wait, message = stream_end - now, _MAX_MESSAGE.format(seconds=policy["stream_max_sec"])
            if wait <= 0:
                raise LLMDeadlineError(message)
            try:
                kind, value = events.get(timeout=wait)
            except queue.Empty:
                raise LLMDeadlineError(message) from None
            if kind == "error":
                raise value
            if kind == "done":
                return
            received_any = True
            yield value
    finally:
        stop.set()
