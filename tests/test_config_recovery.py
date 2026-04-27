import copy
import json
import threading
import urllib.error
import urllib.request
import zipfile
from contextlib import contextmanager
from pathlib import Path

import app


def _request_json(url, method="GET", payload=None, headers=None):
    data = None
    request_headers = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(
        url,
        data=data,
        headers=request_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
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
    cfg["server"]["require_api_token"] = False
    return cfg


@contextmanager
def _run_server_with_config(monkeypatch, cfg):
    monkeypatch.setattr(app, "load_config", lambda: cfg)
    httpd, _, _ = app.build_server()
    thread = threading.Thread(target=httpd.serve_forever, daemon=True, name="test-recovery-http")
    thread.start()
    host, port = httpd.server_address[:2]
    base_url = f"http://{host}:{int(port)}"
    try:
        yield base_url
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2.0)


def test_recovery_reset_rebuilds_config_and_keeps_user_files(monkeypatch, tmp_path):
    cfg = _build_test_config()
    config_path = tmp_path / "config.json"
    example_path = tmp_path / "config.example.json"
    memory_path = tmp_path / "memory.json"
    model_file = tmp_path / "models" / "demo" / "demo.model3.json"
    model_file.parent.mkdir(parents=True, exist_ok=True)

    old_config = {
        "onboarding_completed": True,
        "assistant_name": "broken-user-config",
        "llm": {"provider": "broken-provider"},
    }
    example_config = {
        "onboarding_completed": True,
        "assistant_name": "reset-from-example",
        "llm": {"provider": "openai-compatible"},
    }
    config_path.write_text(json.dumps(old_config, ensure_ascii=False), encoding="utf-8")
    example_path.write_text(json.dumps(example_config, ensure_ascii=False), encoding="utf-8")
    memory_path.write_text('{"entries":[{"role":"user","content":"hello"}]}', encoding="utf-8")
    model_file.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(app, "CONFIG_PATH", config_path)
    monkeypatch.setattr(app, "EXAMPLE_CONFIG_PATH", example_path)
    monkeypatch.setattr(app, "ROOT_DIR", tmp_path)
    monkeypatch.setattr(app, "RECOVERY_EXPORT_DIR", tmp_path / "support_exports")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/config/recovery/reset",
            method="POST",
            payload={"confirmed": True},
        )

    assert status == 200
    assert payload.get("ok") is True
    assert payload.get("onboarding_completed") is False
    assert str(payload.get("config_path", "")).endswith("config.json")
    backup_path = Path(str(payload.get("backup_path", "")))
    assert backup_path.exists()

    backup_content = json.loads(backup_path.read_text(encoding="utf-8-sig"))
    assert backup_content.get("assistant_name") == "broken-user-config"

    new_config = json.loads(config_path.read_text(encoding="utf-8-sig"))
    assert new_config.get("assistant_name") == "reset-from-example"
    assert new_config.get("onboarding_completed") is False

    assert memory_path.exists()
    assert model_file.exists()


def test_recovery_reset_requires_confirmation(monkeypatch, tmp_path):
    cfg = _build_test_config()
    config_path = tmp_path / "config.json"
    example_path = tmp_path / "config.example.json"
    config_path.write_text("{}", encoding="utf-8")
    example_path.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(app, "CONFIG_PATH", config_path)
    monkeypatch.setattr(app, "EXAMPLE_CONFIG_PATH", example_path)
    monkeypatch.setattr(app, "ROOT_DIR", tmp_path)
    monkeypatch.setattr(app, "RECOVERY_EXPORT_DIR", tmp_path / "support_exports")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/config/recovery/reset",
            method="POST",
            payload={"confirmed": False},
        )

    assert status == 400
    assert "二次确认" in str(payload.get("error", ""))


def test_recovery_export_logs_masks_secrets(monkeypatch, tmp_path):
    cfg = _build_test_config()
    config_path = tmp_path / "config.json"
    example_path = tmp_path / "config.example.json"
    log_file = tmp_path / "server_test.log"
    nested_log = tmp_path / "runtime" / "diagnostics" / "engine_trace.txt"
    nested_log.parent.mkdir(parents=True, exist_ok=True)
    log_file.write_text(
        "\n".join(
            [
                "api_key=sk-abcdef1234567890",
                "Authorization: Bearer bearer-secret-xyz",
                '{"token":"token-secret-value","secret":"plain-secret-value"}',
                "sessionCredential=my-session-credential-value-123456",
                "jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGFmZnkiLCJyb2xlIjoiYWRtaW4ifQ.signaturepart123456",
                "GET /api?token=url-token-123&api_key=url-key-456",
            ]
        ),
        encoding="utf-8",
    )
    nested_log.write_text("diagnostics-secret=runtime-credential-abcdef", encoding="utf-8")
    config_path.write_text("{}", encoding="utf-8")
    example_path.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(app, "CONFIG_PATH", config_path)
    monkeypatch.setattr(app, "EXAMPLE_CONFIG_PATH", example_path)
    monkeypatch.setattr(app, "ROOT_DIR", tmp_path)
    monkeypatch.setattr(app, "RECOVERY_EXPORT_DIR", tmp_path / "support_exports")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/config/recovery/export_logs",
            method="POST",
            payload={},
        )

    assert status == 200
    assert payload.get("ok") is True
    assert payload.get("masked") is True
    assert int(payload.get("file_count", 0)) >= 1

    export_path = Path(str(payload.get("export_path", "")))
    assert export_path.exists()

    with zipfile.ZipFile(export_path, mode="r") as archive:
        names = archive.namelist()
        assert "manifest.json" in names
        exported_logs = [name for name in names if name.startswith("logs/")]
        assert exported_logs
        assert any("runtime/diagnostics/engine_trace.txt" in name for name in exported_logs)
        merged_logs = "\n".join(
            archive.read(name).decode("utf-8", errors="replace")
            for name in exported_logs
        )

    assert "sk-abcdef1234567890" not in merged_logs
    assert "bearer-secret-xyz" not in merged_logs
    assert "token-secret-value" not in merged_logs
    assert "plain-secret-value" not in merged_logs
    assert "my-session-credential-value-123456" not in merged_logs
    assert "diagnostics-secret=runtime-credential-abcdef" not in merged_logs
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGFmZnkiLCJyb2xlIjoiYWRtaW4ifQ.signaturepart123456" not in merged_logs
    assert "url-token-123" not in merged_logs
    assert "url-key-456" not in merged_logs
