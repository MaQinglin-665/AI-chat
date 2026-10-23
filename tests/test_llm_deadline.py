import time
import urllib.request
import urllib.error
import pytest
import llm_deadline as budget
import llm_client


def test_slow_dns_returns_within_budget():
    def slow_open(*args, **kwargs):
        time.sleep(0.15)
        raise OSError("offline")
    started = time.monotonic()
    with pytest.raises(budget.LLMDeadlineError):
        list(budget.network_chunks(slow_open, urllib.request.Request("http://localhost/"), .03))
    assert time.monotonic() - started < .12


class _Trickle:
    """Fake streaming response yielding ``count`` lines, ``gap`` seconds apart."""
    def __init__(self, count, gap, first_delay=0.0):
        self.count, self.gap, self.first_delay = count, gap, first_delay
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def __iter__(self):
        time.sleep(self.first_delay)
        for index in range(self.count):
            if index:
                time.sleep(self.gap)
            yield b"data: ping"


def _stream(response, timeout, policy=None):
    # Inject sub-second limits directly; build_policy() clamps real config values.
    token = budget._policy.set({"allow_insecure_http": False, **(policy or {})})
    try:
        return list(budget.network_chunks(
            lambda *a, **k: response, urllib.request.Request("http://localhost/"), timeout, True))
    finally:
        budget._policy.reset(token)


def test_trickling_body_is_still_capped_by_stream_max():
    # A server that keeps sending keep-alive bytes cannot hold the turn open forever.
    started = time.monotonic()
    with pytest.raises(budget.LLMDeadlineError):
        _stream(_Trickle(50, .01), .05, {"stream_max_sec": .08, "stream_idle_timeout_sec": .05})
    assert time.monotonic() - started < .2


def test_active_stream_may_outlive_turn_budget():
    # Long replies keep flowing past the first-response budget while data arrives.
    lines = _stream(_Trickle(12, .01), .03, {"stream_max_sec": 1, "stream_idle_timeout_sec": .05})
    assert len(lines) == 12


def test_stalled_stream_hits_idle_timeout():
    started = time.monotonic()
    with pytest.raises(budget.LLMDeadlineError, match="模型输出中断"):
        _stream(_Trickle(3, .3), .05, {"stream_max_sec": 5, "stream_idle_timeout_sec": .05})
    assert time.monotonic() - started < .25


def test_first_bytes_still_use_turn_budget():
    started = time.monotonic()
    with pytest.raises(budget.LLMDeadlineError, match="本轮时限"):
        _stream(_Trickle(3, .01, first_delay=.3), .05, {"stream_max_sec": 5, "stream_idle_timeout_sec": 5})
    assert time.monotonic() - started < .2


def test_policy_defaults_and_bounds():
    assert budget.build_policy({}) == {
        "allow_insecure_http": False, "stream_idle_timeout_sec": 15.0, "stream_max_sec": 180.0}
    bounded = budget.build_policy({"stream_idle_timeout_sec": 0, "stream_max_sec": 99999, "allow_insecure_http": "true"})
    assert bounded == {"allow_insecure_http": True, "stream_idle_timeout_sec": 3.0, "stream_max_sec": 900.0}


def test_connection_failure_has_one_attempt(monkeypatch):
    calls = []
    def offline(*args, **kwargs):
        calls.append(1)
        raise urllib.error.URLError("offline")
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", offline)
    with pytest.raises(budget.LLMTransportError):
        llm_client.call_openai_compatible({"base_url":"http://localhost/v1"}, [])
    assert calls == [1]


def test_nested_budget_is_not_restarted():
    @budget.turn_budget
    def nested(config):
        return budget._deadline.get()
    @budget.turn_budget
    def outer(config):
        original = budget._deadline.get()
        assert nested(config) == original
    outer({"llm":{"turn_timeout_sec":1}})
    assert budget._deadline.get() is None


@pytest.mark.parametrize("url", [
    "http://example.com/v1", "http://localhost.evil/v1", "ftp://localhost/",
    "http://8.8.8.8:3333/v1", "http://0.0.0.0:11434", "http://[::ffff:8.8.8.8]/v1",
])
def test_reject_remote_plaintext(url):
    with pytest.raises(budget.LLMTransportError): budget.validate_transport(url)


@pytest.mark.parametrize("url", [
    "http://127.0.0.1:11434", "http://[::1]:11434", "https://example.com/v1",
    "http://192.168.1.20:11434", "http://10.0.0.5:8000/v1", "http://172.16.3.4/v1",
    "http://100.101.102.103:11434", "http://nas.local:11434", "http://[fe80::1]:11434",
])
def test_supported_transport(url):
    budget.validate_transport(url)


def test_remote_http_requires_explicit_opt_in():
    with pytest.raises(budget.LLMTransportError, match="allow_insecure_http"):
        budget.validate_transport("http://relay.example.com:3333/v1")
    budget.validate_transport("http://relay.example.com:3333/v1", allow_insecure_http=True)
    with budget.transport_scope({"allow_insecure_http": True}):
        budget.validate_transport("http://relay.example.com:3333/v1")
    with pytest.raises(budget.LLMTransportError):
        budget.validate_transport("http://relay.example.com:3333/v1")


def test_turn_budget_applies_config_policy():
    @budget.turn_budget
    def call(config):
        budget.validate_transport("http://relay.example.com:3333/v1")
        return budget.current_policy()
    policy = call({"llm": {"allow_insecure_http": True, "stream_idle_timeout_sec": 20}})
    assert policy["allow_insecure_http"] is True and policy["stream_idle_timeout_sec"] == 20
    assert budget._policy.get() is None


def test_https_redirect_cannot_downgrade_even_when_http_allowed():
    redirect = budget._SecureRedirect(allow_insecure_http=True)
    request = urllib.request.Request("https://example.com/v1", headers={"Authorization": "Bearer example"})
    with pytest.raises(budget.LLMTransportError):
        redirect.redirect_request(request, None, 302, "found", {}, "http://example.com/v1")


def test_http_retries_share_remaining_budget(monkeypatch):
    calls = []
    def unavailable(request, timeout):
        calls.append(timeout)
        raise urllib.error.HTTPError(request.full_url, 503, "busy", {}, None)
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", unavailable)
    token = budget._deadline.set(time.monotonic() + .04)
    started = time.monotonic()
    try:
        with pytest.raises(budget.LLMDeadlineError):
            llm_client.http_post_json("http://localhost/v1", {}, timeout=180, attempts=3)
    finally:
        budget._deadline.reset(token)
    assert len(calls) == 1
    assert time.monotonic() - started < .2


def test_redirect_cannot_downgrade_or_forward_key():
    redirect = budget._SecureRedirect()
    request = urllib.request.Request("https://example.com/v1", headers={"Authorization":"Bearer example"})
    for destination in ["http://example.com/v1", "https://other.example/v1"]:
        with pytest.raises(budget.LLMTransportError):
            redirect.redirect_request(request, None, 302, "found", {}, destination)


def test_probe_requests_use_config_transport_policy():
    import llm_probe
    seen = []
    def post(*args, **kwargs):
        seen.append(budget.current_policy()["allow_insecure_http"])
        return {}
    llm_probe._scoped_http_post(post, {"allow_insecure_http": True})("http://relay.example.com/v1", {})
    llm_probe._scoped_http_post(post, {})("http://relay.example.com/v1", {})
    assert seen == [True, False]


def test_diagnostics_explain_blocked_http_and_stalled_stream():
    from llm_diagnostics import diagnose_llm_exception
    blocked = budget.LLMTransportError("")
    try:
        budget.validate_transport("http://relay.example.com/v1")
    except budget.LLMTransportError as exc:
        blocked = exc
    assert diagnose_llm_exception(blocked, {"provider": "openai-compatible"}).code == "llm_insecure_http_blocked"
    stalled = budget.LLMDeadlineError(budget._IDLE_MESSAGE.format(seconds=15))
    assert diagnose_llm_exception(stalled, {"provider": "openai-compatible"}).code == "llm_stream_stalled"
