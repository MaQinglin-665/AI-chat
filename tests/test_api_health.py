import copy
import json
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager

import app


def _request_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            body = resp.read().decode("utf-8")
            return int(resp.status), json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return int(exc.code), json.loads(body or "{}")


def _build_test_config():
    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg.setdefault("server", {})
    cfg["server"]["host"] = "127.0.0.1"
    cfg["server"]["port"] = 0
    cfg["server"]["open_browser"] = False
    cfg["server"]["api_token_env"] = "TAFFY_API_TOKEN_TEST"
    return cfg


@contextmanager
def _run_server_with_config(monkeypatch, cfg):
    monkeypatch.setattr(app, "load_config", lambda: cfg)
    httpd, _, _ = app.build_server()
    thread = threading.Thread(target=httpd.serve_forever, daemon=True, name="test-http-server")
    thread.start()
    host, port = httpd.server_address[:2]
    base_url = f"http://{host}:{int(port)}"
    try:
        yield base_url
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2.0)


def test_healthz_is_public_even_when_api_token_required(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-abc-123")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(f"{base}/healthz")
        assert status == 200
        assert payload.get("ok") is True
        assert "security" not in payload
        assert "character_runtime" not in payload

        status_api, payload_api = _request_json(f"{base}/api/health")
        assert status_api == 401
        assert payload_api.get("error") == "Invalid API token."


def test_api_health_requires_valid_token_when_enabled(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-xyz-456")
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/health",
            headers={"X-Taffy-Token": "token-xyz-456"},
        )
        assert status == 200
        assert payload.get("ok") is True
        assert payload.get("security", {}).get("require_api_token") is True
        assert payload.get("security", {}).get("api_token_configured") is True


def test_api_health_includes_safe_character_runtime_summary(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    cfg["character_runtime"] = {
        "enabled": True,
        "return_metadata": True,
        "demo_stable": True,
        "persona_override": {
            "enabled": True,
            "name": "SecretPersonaName",
            "style": "secret style phrase for prompt only",
        },
    }
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-runtime-789")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/health",
            headers={"X-Taffy-Token": "token-runtime-789"},
        )

    assert status == 200
    runtime = payload.get("character_runtime")
    assert runtime == {
        "enabled": True,
        "return_metadata": True,
        "demo_stable": True,
        "persona_override_enabled": True,
    }
    assert set(runtime.keys()) == {
        "enabled",
        "return_metadata",
        "demo_stable",
        "persona_override_enabled",
    }
    serialized = json.dumps(payload, ensure_ascii=False)
    assert "SecretPersonaName" not in serialized
    assert "secret style phrase" not in serialized


def test_api_health_returns_503_when_token_required_but_missing(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.delenv("TAFFY_API_TOKEN_TEST", raising=False)
    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(f"{base}/api/health")
        assert status == 503
        assert "required but not configured" in str(payload.get("error", ""))


def test_startup_self_check_reports_risks(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    cfg["tools"]["allow_shell"] = True
    cfg["llm"]["provider"] = "openai"
    cfg["llm"]["api_key_env"] = "OPENAI_API_KEY_TEST"

    monkeypatch.delenv("TAFFY_API_TOKEN_TEST", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY_TEST", raising=False)

    findings = app.run_startup_self_check(cfg)
    assert any("require_api_token=true" in line for line in findings)
    assert any("tools.allow_shell=true" in line for line in findings)
    assert any("no API key found" in line for line in findings)


def test_startup_self_check_reports_safe_character_runtime_summary():
    cfg = _build_test_config()
    cfg["character_runtime"] = {
        "enabled": True,
        "return_metadata": False,
        "demo_stable": True,
        "persona_override": {
            "enabled": True,
            "name": "SecretStartupPersona",
            "style": "startup secret style",
        },
    }

    findings = app.run_startup_self_check(cfg)
    summary_lines = [line for line in findings if "character_runtime" in line]
    assert summary_lines == [
        "[startup][info] character_runtime enabled=true return_metadata=false "
        "demo_stable=true persona_override_enabled=true"
    ]
    serialized = "\n".join(findings)
    assert "SecretStartupPersona" not in serialized
    assert "startup secret style" not in serialized
