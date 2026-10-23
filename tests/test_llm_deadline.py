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


def test_trickling_body_does_not_reset_budget():
    class Response:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def __iter__(self):
            for _ in range(50):
                time.sleep(.01)
                yield b"data: ping"
    started = time.monotonic()
    with pytest.raises(budget.LLMDeadlineError):
        list(budget.network_chunks(lambda *a, **k: Response(), urllib.request.Request("http://localhost/"), .05, True))
    assert time.monotonic() - started < .2


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


@pytest.mark.parametrize("url", ["http://example.com/v1", "http://localhost.evil/v1", "ftp://localhost/"])
def test_reject_remote_plaintext(url):
    with pytest.raises(budget.LLMTransportError): budget.validate_transport(url)


@pytest.mark.parametrize("url", ["http://127.0.0.1:11434", "http://[::1]:11434", "https://example.com/v1"])
def test_supported_transport(url):
    budget.validate_transport(url)


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
