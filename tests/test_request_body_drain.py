import io
from email.message import Message
from types import SimpleNamespace

import pytest

import app


def make_handler(lengths=(), body=b"", timeout=None):
    handler = object.__new__(app.PetHandler)
    handler.headers = Message()
    for length in lengths:
        handler.headers.add_header("Content-Length", length)
    handler.rfile = io.BytesIO(body)
    handler.close_connection = False
    connection = SimpleNamespace(timeout=timeout)
    connection.gettimeout = lambda: connection.timeout
    connection.settimeout = lambda value: setattr(connection, "timeout", value)
    handler.connection = connection
    return handler


@pytest.mark.parametrize("length", ["-1", "+1", "garbage", "1048577", "9" * 5000])
def test_invalid_or_oversized_body_is_not_read(length):
    handler = make_handler([length], b"untouched")
    handler._drain_request_body()
    assert handler.close_connection
    assert handler.rfile.tell() == 0


def test_drain_consumes_only_declared_body_and_restores_timeout():
    handler = make_handler(["1048576"], b"x" * 1048576 + b"next request", timeout=0.5)
    handler._drain_request_body()
    assert not handler.close_connection
    assert handler.rfile.read() == b"next request"
    assert handler.connection.timeout == 0.5


@pytest.mark.parametrize("lengths", [[], ["0"]])
def test_empty_body_needs_no_read(lengths):
    handler = make_handler(lengths, b"next request")
    handler._drain_request_body()
    assert not handler.close_connection
    assert handler.rfile.tell() == 0


def test_truncated_body_closes_connection():
    handler = make_handler(["10"], b"short")
    handler._drain_request_body()
    assert handler.close_connection
    assert handler.connection.timeout is None


def test_read_timeout_closes_connection_and_restores_timeout():
    handler = make_handler(["10"])

    def timed_out(size):
        raise TimeoutError("body stalled")

    handler.rfile = SimpleNamespace(read1=timed_out)
    handler._drain_request_body()
    assert handler.close_connection
    assert handler.connection.timeout is None


def test_drain_total_deadline_stops_trickled_body(monkeypatch):
    handler = make_handler(["10"], b"0123456789")
    times = iter([0.0, 2.1])
    monkeypatch.setattr(app.time, "monotonic", lambda: next(times))
    handler._drain_request_body()
    assert handler.close_connection
    assert handler.rfile.tell() == 0
    assert handler.connection.timeout is None


@pytest.mark.parametrize("chunked", [False, True])
def test_ambiguous_framing_is_not_read(chunked):
    handler = make_handler(["5"] if chunked else ["5", "5"], b"12345")
    if chunked:
        handler.headers.add_header("Transfer-Encoding", "chunked")
    handler._drain_request_body()
    assert handler.close_connection
    assert handler.rfile.tell() == 0
