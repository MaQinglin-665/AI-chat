import copy
import json
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager

import app
import config_switch


def _request_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            body = resp.read().decode("utf-8")
            return int(resp.status), json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return int(exc.code), json.loads(body or "{}")


def _post_json(url, payload, headers=None):
    if isinstance(payload, bytes):
        data = payload
    else:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request_headers = {"Content-Type": "application/json"}
    request_headers.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=request_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            body = resp.read().decode("utf-8")
            return int(resp.status), json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return int(exc.code), json.loads(body or "{}")


def _post_raw(url, payload, headers=None):
    if isinstance(payload, bytes):
        data = payload
    else:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request_headers = {"Content-Type": "application/json"}
    request_headers.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=request_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            return int(resp.status), dict(resp.headers), resp.read()
    except urllib.error.HTTPError as exc:
        return int(exc.code), dict(exc.headers), exc.read()


def _build_test_config():
    cfg = copy.deepcopy(app.DEFAULT_CONFIG)
    cfg.setdefault("server", {})
    cfg["server"]["host"] = "127.0.0.1"
    cfg["server"]["port"] = 0
    cfg["server"]["open_browser"] = False
    cfg["server"]["api_token_env"] = "TAFFY_API_TOKEN_TEST"
    return cfg


def _expected_backend_entry_preview(requested_action="none"):
    return {
        "read_only": True,
        "dry_run": True,
        "accepted": False,
        "would_execute": False,
        "request_schema": {
            "read_only": True,
            "fail_closed": True,
            "allowed_fields": ["type", "action"],
            "allowed_types": ["automatic_character_runtime"],
            "allowed_actions": ["none", "emit_runtime_cue"],
            "max_text_length": 80,
            "unknown_fields": "ignored_and_reported",
        },
        "request_type": "automatic_character_runtime",
        "requested_action": requested_action,
        "ignored_fields": [],
        "validation_errors": [],
        "blocked_reasons": [
            "backend_entry_not_wired",
            "automatic_runtime_disconnected",
            "scheduler_default_unchanged",
            "config_write_disabled",
            "runtime_cue_disabled",
        ],
        "guard_entry_ready": False,
        "next_action": "Keep this as a preview-only rejection until a later task wires a real runtime entry.",
    }


def _expected_backend_entry_noop_adapter(requested_action="none"):
    return {
        "read_only": True,
        "noop": True,
        "adapter_name": "character_runtime_noop_adapter",
        "adapter_ready": False,
        "default_off": True,
        "accepted": False,
        "would_execute": False,
        "executed": False,
        "dispatched": False,
        "dispatch_target": "none",
        "request_preview": _expected_backend_entry_preview(requested_action=requested_action),
        "blocked_reasons": [
            "backend_entry_not_wired",
            "automatic_runtime_disconnected",
            "scheduler_default_unchanged",
            "config_write_disabled",
            "runtime_cue_disabled",
        ],
        "side_effects": {
            "config_written": False,
            "automatic_runtime_connected": False,
            "scheduler_default_changed": False,
            "runtime_cue_emitted": False,
            "live2d_moved": False,
            "tts_played": False,
            "polling_started": False,
            "followup_executed": False,
            "desktop_observed": False,
            "screenshot_captured": False,
            "files_read": False,
            "shell_executed": False,
            "tools_called": False,
        },
        "next_action": "Keep this adapter as no-op until a later task adds an explicit manual execution gate.",
    }


@contextmanager
def _run_server_with_config(monkeypatch, cfg):
    load_config_func = cfg if callable(cfg) else (lambda: cfg)
    monkeypatch.setattr(app, "load_config", load_config_func)
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


def test_api_config_switch_post_uses_token_and_writes_local_files(monkeypatch, tmp_path):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    local_config_path = tmp_path / "config.local.json"
    env_path = tmp_path / ".env"
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-switch-123")
    monkeypatch.setattr(config_switch, "LOCAL_CONFIG_PATH", local_config_path)
    monkeypatch.setattr(config_switch, "ENV_PATH", env_path)

    with _run_server_with_config(monkeypatch, cfg) as base:
        status_denied, payload_denied = _post_json(
            f"{base}/api/config/switch",
            {"llm": {"preset_id": "ollama"}, "tts": {"provider": "browser"}},
        )
        status_ok, payload_ok = _post_json(
            f"{base}/api/config/switch",
            {
                "llm": {
                    "preset_id": "openai",
                    "api_key_env": "OPENAI_SWITCH_TEST_KEY",
                    "api_key": "sk-route-secret",
                },
                "tts": {"provider": "browser", "voice": "zh-CN-XiaoxiaoNeural"},
            },
            headers={"X-Taffy-Token": "token-switch-123"},
        )

    assert status_denied == 401
    assert payload_denied.get("error") == "Invalid API token."
    assert status_ok == 200
    assert payload_ok["saved"]["api_key_saved"] is True
    saved = json.loads(local_config_path.read_text(encoding="utf-8"))
    serialized_payload = json.dumps(payload_ok, ensure_ascii=False)
    assert saved["llm"]["provider"] == "openai"
    assert saved["llm"]["api_key"] == ""
    assert env_path.read_text(encoding="utf-8").strip() == "OPENAI_SWITCH_TEST_KEY=sk-route-secret"
    assert "sk-route-secret" not in json.dumps(saved, ensure_ascii=False)
    assert "sk-route-secret" not in serialized_payload


def test_api_config_switch_test_llm_uses_unsaved_draft_without_leaking_key(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = False
    cfg["llm"] = {
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434",
        "model": "saved-model",
        "api_key_env": "",
        "api_key": "",
    }
    captured = {}

    def fake_http_post_json(url, payload, headers=None, **kwargs):
        captured["url"] = url
        captured["payload"] = payload
        captured["headers"] = headers or {}
        captured["kwargs"] = kwargs
        return {"choices": [{"message": {"content": "OK"}}]}

    monkeypatch.setattr(app, "http_post_json", fake_http_post_json)

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(
            f"{base}/api/config/switch/test_llm",
            {
                "llm": {
                    "preset_id": "custom_openai_compatible",
                    "base_url": "https://api.example.test/v1",
                    "model": "draft-model",
                    "api_key_env": "DRAFT_LLM_KEY",
                    "api_key": "sk-draft-route-secret",
                }
            },
        )

    assert status == 200
    assert payload["ok"] is True
    assert payload["provider"] == "openai-compatible"
    assert payload["model"] == "draft-model"
    assert captured["url"] == "https://api.example.test/v1/chat/completions"
    assert captured["payload"]["model"] == "draft-model"
    assert captured["headers"]["Authorization"] == "Bearer sk-draft-route-secret"
    serialized_payload = json.dumps(payload, ensure_ascii=False)
    assert "sk-draft-route-secret" not in serialized_payload


def test_api_config_switch_test_tts_uses_unsaved_draft_config(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = False
    cfg["tts"] = {"provider": "browser", "voice": "saved-voice"}
    captured = {}

    def fake_synthesize_tts_audio(
        text,
        voice_override=None,
        prosody=None,
        perf_trace_id="",
        config_override=None,
    ):
        captured["text"] = text
        captured["voice_override"] = voice_override
        captured["prosody"] = prosody
        captured["perf_trace_id"] = perf_trace_id
        captured["config_override"] = config_override
        return b"ID3draft-audio"

    monkeypatch.setattr(app, "synthesize_tts_audio", fake_synthesize_tts_audio)

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, headers, body = _post_raw(
            f"{base}/api/config/switch/test_tts",
            {
                "tts": {
                    "provider": "gpt_sovits",
                    "voice": "draft-voice",
                    "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
                    "stream_mode": "realtime",
                },
                "text": "draft text",
            },
        )

    assert status == 200
    assert body == b"ID3draft-audio"
    assert headers["Content-Type"].startswith("audio/")
    assert captured["text"] == "draft text"
    assert captured["voice_override"] == "draft-voice"
    assert captured["config_override"]["tts"]["provider"] == "gpt_sovits"
    assert captured["config_override"]["tts"]["voice"] == "draft-voice"
    assert captured["config_override"]["tts"]["gpt_sovits_realtime_tts"] is True


def test_api_config_switch_validate_live2d_reports_reload_hint(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = False

    with _run_server_with_config(monkeypatch, cfg) as base:
        status_ok, payload_ok = _post_json(
            f"{base}/api/config/switch/validate_live2d",
            {"live2d": {"model_path": "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json"}},
        )
        status_bad, payload_bad = _post_json(
            f"{base}/api/config/switch/validate_live2d",
            {"live2d": {"model_path": "../secret.model3.json"}},
        )

    assert status_ok == 200
    assert payload_ok["ok"] is True
    assert payload_ok["reload_required"] is True
    assert payload_ok["live2d"]["model_path"] == "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json"
    assert status_bad == 400
    assert payload_bad["ok"] is False
    assert payload_bad["code"] == "config_switch_live2d_path_escape"


def test_first_run_status_uses_token_and_reports_safe_summary(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    cfg["onboarding_completed"] = False
    cfg["llm"] = {
        "provider": "openai-compatible",
        "base_url": "https://api.example.test/v1",
        "model": "demo-model",
        "api_key_env": "FIRST_RUN_TEST_KEY",
    }
    cfg["observe"]["attach_mode"] = "manual"
    cfg["tools"]["enabled"] = False
    cfg["tools"]["allow_shell"] = False
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-first-run-status")
    monkeypatch.delenv("FIRST_RUN_TEST_KEY", raising=False)

    with _run_server_with_config(monkeypatch, cfg) as base:
        denied_status, denied_payload = _request_json(f"{base}/api/first_run/status")
        ok_status, payload = _request_json(
            f"{base}/api/first_run/status",
            headers={"X-Taffy-Token": "token-first-run-status"},
        )

    assert denied_status == 401
    assert denied_payload.get("error") == "Invalid API token."
    assert ok_status == 200
    assert payload["ok"] is True
    assert payload["first_run"]["needs_first_run"] is True
    assert payload["llm"]["configured"] is False
    assert payload["llm"]["api_key_configured"] is False
    assert payload["llm"]["api_key_returned"] is False
    assert "api_key" not in payload["llm"]
    assert payload["safety"]["observe_attach_mode"] == "manual"
    assert payload["safety"]["tools_enabled"] is False
    assert payload["safety"]["tools_allow_shell"] is False


def test_first_run_configure_llm_writes_local_files_and_masks_secret(monkeypatch, tmp_path):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    local_config_path = tmp_path / "config.local.json"
    env_path = tmp_path / ".env"
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-first-run-config")
    monkeypatch.setattr(config_switch, "LOCAL_CONFIG_PATH", local_config_path)
    monkeypatch.setattr(config_switch, "ENV_PATH", env_path)

    def load_merged_config():
        merged = copy.deepcopy(cfg)
        if local_config_path.exists():
            local_data = json.loads(local_config_path.read_text(encoding="utf-8"))
            merged.update(local_data)
            if isinstance(local_data.get("llm"), dict):
                merged["llm"] = {**merged.get("llm", {}), **local_data["llm"]}
        return merged

    with _run_server_with_config(monkeypatch, load_merged_config) as base:
        denied_status, denied_payload = _post_json(
            f"{base}/api/first_run/configure_llm",
            {
                "provider": "openai-compatible",
                "base_url": "https://api.example.test/v1",
                "model": "demo-model",
                "api_key_env": "TAFFY_LLM_API_KEY",
                "api_key": "sk-first-run-secret",
            },
        )
        ok_status, payload = _post_json(
            f"{base}/api/first_run/configure_llm",
            {
                "provider": "openai-compatible",
                "base_url": "https://api.example.test/v1",
                "model": "demo-model",
                "api_key_env": "TAFFY_LLM_API_KEY",
                "api_key": "sk-first-run-secret",
            },
            headers={"X-Taffy-Token": "token-first-run-config"},
        )
        status_after, payload_after = _request_json(
            f"{base}/api/first_run/status",
            headers={"X-Taffy-Token": "token-first-run-config"},
        )

    assert denied_status == 401
    assert denied_payload.get("error") == "Invalid API token."
    assert ok_status == 200
    assert payload["saved"]["api_key_saved"] is True
    assert payload["saved"]["api_key_returned"] is False
    assert payload["llm"]["configured"] is True
    assert status_after == 200
    assert payload_after["llm"]["configured"] is True
    saved = json.loads(local_config_path.read_text(encoding="utf-8"))
    serialized_payload = json.dumps(payload, ensure_ascii=False)
    assert saved["onboarding_completed"] is True
    assert saved["llm"]["provider"] == "openai-compatible"
    assert saved["llm"]["base_url"] == "https://api.example.test/v1"
    assert saved["llm"]["model"] == "demo-model"
    assert saved["llm"]["api_key_env"] == "TAFFY_LLM_API_KEY"
    assert saved["llm"]["api_key"] == ""
    assert env_path.read_text(encoding="utf-8").strip() == "TAFFY_LLM_API_KEY=sk-first-run-secret"
    assert "sk-first-run-secret" not in json.dumps(saved, ensure_ascii=False)
    assert "sk-first-run-secret" not in serialized_payload


def test_api_health_includes_backend_readiness_checks_without_leaking_secrets(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = False
    cfg["llm"] = {
        "provider": "openai-compatible",
        "base_url": "https://user:pass@example.test/v1?api_key=secret",
        "model": "qwen-plus",
        "api_key_env": "DASHSCOPE_API_KEY_TEST",
        "api_key": "sk-secret-value-123",
    }
    cfg["tts"] = {
        "provider": "gpt_sovits",
        "gpt_sovits_api_url": "http://user:pass@127.0.0.1:9880/tts?token=secret",
        "allow_browser_fallback": False,
    }
    monkeypatch.delenv("DASHSCOPE_API_KEY_TEST", raising=False)

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(f"{base}/api/health")

    assert status == 200
    checks = payload.get("checks", {})
    assert {"server", "llm", "tts", "asr"}.issubset(set(checks.keys()))
    assert checks["llm"]["ok"] is True
    assert checks["llm"]["api_key_configured"] is True
    assert checks["llm"]["base_url_display"] == "https://example.test/v1"
    assert checks["tts"]["provider"] == "gpt_sovits"
    assert checks["tts"]["api_url_display"] == "http://127.0.0.1:9880/tts"
    assert checks["tts"]["network_checked"] is False
    assert payload.get("readiness", {}).get("actions")

    serialized = json.dumps(payload, ensure_ascii=False)
    assert "sk-secret-value" not in serialized
    assert "user:pass" not in serialized
    assert "api_key=secret" not in serialized
    assert "token=secret" not in serialized


def test_api_health_reports_llm_and_tts_readiness_errors(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = False
    cfg["llm"] = {
        "provider": "openai-compatible",
        "base_url": "https://example.test/v1",
        "model": "qwen-plus",
        "api_key_env": "MISSING_LLM_KEY_FOR_HEALTH_TEST",
        "api_key": "",
    }
    cfg["tts"] = {"provider": "not-a-real-provider"}
    monkeypatch.delenv("MISSING_LLM_KEY_FOR_HEALTH_TEST", raising=False)

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(f"{base}/api/health")

    assert status == 200
    checks = payload.get("checks", {})
    assert checks["llm"]["ok"] is False
    assert checks["llm"]["severity"] == "error"
    assert "LLM API key is missing" in checks["llm"]["messages"][0]
    assert checks["tts"]["ok"] is False
    assert checks["tts"]["severity"] == "error"
    assert "Unsupported tts.provider" in checks["tts"]["messages"][0]
    readiness = payload.get("readiness", {})
    assert readiness["ok"] is False
    assert "llm" in readiness["blocking_checks"]
    assert "tts" in readiness["blocking_checks"]


def test_api_health_includes_safe_character_runtime_summary(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    cfg["character_runtime"] = {
        "enabled": True,
        "return_metadata": True,
        "demo_stable": True,
        "auto_apply_reply_cue": True,
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
        "auto_apply_reply_cue": True,
        "persona_override_enabled": True,
    }
    assert set(runtime.keys()) == {
        "enabled",
        "return_metadata",
        "demo_stable",
        "auto_apply_reply_cue",
        "persona_override_enabled",
    }
    serialized = json.dumps(payload, ensure_ascii=False)
    assert "SecretPersonaName" not in serialized
    assert "secret style phrase" not in serialized


def test_api_health_includes_safe_character_runtime_backend_entry_summary(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    cfg["character_runtime"] = {
        "enabled": False,
        "return_metadata": False,
        "demo_stable": False,
        "persona_override": {
            "enabled": False,
            "name": "",
            "style": "",
        },
    }
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-backend-entry-123")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/health",
            headers={"X-Taffy-Token": "token-backend-entry-123"},
        )

    assert status == 200
    backend_entry = payload.get("character_runtime_backend_entry")
    assert backend_entry == {
        "read_only": True,
        "skeleton_only": True,
        "default_off_baseline": True,
        "configured_enabled": False,
        "configured_return_metadata": False,
        "configured_demo_stable": False,
        "configured_persona_override_enabled": False,
        "explicit_enable_required": True,
        "automatic_runtime_connected": False,
        "scheduler_default_changed": False,
        "config_write_enabled": False,
        "runtime_cue_enabled": False,
        "live2d_enabled": False,
        "tts_enabled": False,
        "entry_ready": False,
        "blocked_reasons": [
            "backend_entry_not_wired",
            "automatic_runtime_disconnected",
            "scheduler_default_unchanged",
            "config_write_disabled",
            "runtime_cue_disabled",
        ],
        "guard_contract": {
            "read_only": True,
            "fail_closed": True,
            "required_checks": [
                "explicit_enable_flag",
                "backend_entry_wired",
                "automatic_runtime_connected",
                "scheduler_opt_in_unchanged_by_default",
                "config_write_disabled",
                "runtime_cue_disabled_until_later_task",
                "live2d_disabled_until_later_task",
                "tts_disabled_until_later_task",
            ],
            "disallowed_actions": [
                "write_config",
                "change_scheduler_defaults",
                "connect_automatic_runtime",
                "emit_runtime_cue",
                "move_live2d",
                "play_tts",
                "start_polling",
                "execute_followup",
            ],
            "operator_confirmation": "required_in_later_implementation_task",
            "rollback": [
                "keep_default_off",
                "disconnect_automatic_runtime",
                "leave_scheduler_defaults_unchanged",
                "keep_config_writes_disabled",
            ],
        },
        "guard_runtime_states": {
            "configured_enabled": False,
            "backend_entry_wired": False,
            "automatic_runtime_connected": False,
            "scheduler_default_changed": False,
            "config_write_enabled": False,
            "runtime_cue_enabled": False,
            "live2d_enabled": False,
            "tts_enabled": False,
        },
        "entry_execution_preview": _expected_backend_entry_preview(),
        "entry_adapter_preview": _expected_backend_entry_noop_adapter(),
        "next_action": (
            "Keep this backend entry as a guarded skeleton until the later implementation task wires a real runtime entry point."
        ),
    }
    assert backend_entry["default_off_baseline"] is True
    assert backend_entry["automatic_runtime_connected"] is False
    assert backend_entry["entry_ready"] is False


def test_api_character_runtime_backend_entry_returns_safe_read_only_summary(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-backend-route-456")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _request_json(
            f"{base}/api/character_runtime/backend_entry",
            headers={"X-Taffy-Token": "token-backend-route-456"},
        )

    assert status == 200
    backend_entry = payload.get("character_runtime_backend_entry")
    assert payload.get("ok") is True
    assert backend_entry == {
        "read_only": True,
        "skeleton_only": True,
        "default_off_baseline": True,
        "configured_enabled": False,
        "configured_return_metadata": False,
        "configured_demo_stable": False,
        "configured_persona_override_enabled": False,
        "explicit_enable_required": True,
        "automatic_runtime_connected": False,
        "scheduler_default_changed": False,
        "config_write_enabled": False,
        "runtime_cue_enabled": False,
        "live2d_enabled": False,
        "tts_enabled": False,
        "entry_ready": False,
        "blocked_reasons": [
            "backend_entry_not_wired",
            "automatic_runtime_disconnected",
            "scheduler_default_unchanged",
            "config_write_disabled",
            "runtime_cue_disabled",
        ],
        "guard_contract": {
            "read_only": True,
            "fail_closed": True,
            "required_checks": [
                "explicit_enable_flag",
                "backend_entry_wired",
                "automatic_runtime_connected",
                "scheduler_opt_in_unchanged_by_default",
                "config_write_disabled",
                "runtime_cue_disabled_until_later_task",
                "live2d_disabled_until_later_task",
                "tts_disabled_until_later_task",
            ],
            "disallowed_actions": [
                "write_config",
                "change_scheduler_defaults",
                "connect_automatic_runtime",
                "emit_runtime_cue",
                "move_live2d",
                "play_tts",
                "start_polling",
                "execute_followup",
            ],
            "operator_confirmation": "required_in_later_implementation_task",
            "rollback": [
                "keep_default_off",
                "disconnect_automatic_runtime",
                "leave_scheduler_defaults_unchanged",
                "keep_config_writes_disabled",
            ],
        },
        "guard_runtime_states": {
            "configured_enabled": False,
            "backend_entry_wired": False,
            "automatic_runtime_connected": False,
            "scheduler_default_changed": False,
            "config_write_enabled": False,
            "runtime_cue_enabled": False,
            "live2d_enabled": False,
            "tts_enabled": False,
        },
        "entry_execution_preview": _expected_backend_entry_preview(),
        "entry_adapter_preview": _expected_backend_entry_noop_adapter(),
        "next_action": (
            "Keep this backend entry as a guarded skeleton until the later implementation task wires a real runtime entry point."
        ),
    }


def test_api_character_runtime_backend_entry_preview_post_rejects_dry_run(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-backend-preview-789")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(
            f"{base}/api/character_runtime/backend_entry/preview",
            {"type": "automatic_character_runtime", "action": "emit_runtime_cue"},
            headers={"X-Taffy-Token": "token-backend-preview-789"},
        )

    assert status == 200
    assert payload.get("ok") is True
    preview = payload.get("character_runtime_backend_entry_preview")
    adapter = payload.get("character_runtime_backend_entry_adapter_preview")
    assert preview == _expected_backend_entry_preview(requested_action="emit_runtime_cue")
    assert adapter == _expected_backend_entry_noop_adapter(requested_action="emit_runtime_cue")


def test_api_character_runtime_backend_entry_preview_reports_ignored_fields(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-backend-preview-schema")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(
            f"{base}/api/character_runtime/backend_entry/preview",
            {
                "type": "desktop_observation",
                "action": "read_files",
                "path": "C:/Users",
                "shell": "dir",
            },
            headers={"X-Taffy-Token": "token-backend-preview-schema"},
        )

    assert status == 200
    preview = payload.get("character_runtime_backend_entry_preview")
    assert preview["accepted"] is False
    assert preview["would_execute"] is False
    assert preview["request_schema"]["allowed_fields"] == ["type", "action"]
    assert preview["ignored_fields"] == ["path", "shell"]
    assert preview["validation_errors"] == [
        "unsupported_request_type",
        "unsupported_requested_action",
        "ignored_unknown_fields",
    ]


def test_api_character_runtime_backend_entry_preview_requires_valid_token(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-backend-preview-guard")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(
            f"{base}/api/character_runtime/backend_entry/preview",
            {"type": "automatic_character_runtime"},
        )

    assert status == 401
    assert payload.get("error") == "Invalid API token."


def test_api_character_runtime_backend_entry_preview_rejects_invalid_json(monkeypatch):
    cfg = _build_test_config()
    cfg["server"]["require_api_token"] = True
    monkeypatch.setenv("TAFFY_API_TOKEN_TEST", "token-backend-preview-json")

    with _run_server_with_config(monkeypatch, cfg) as base:
        status, payload = _post_json(
            f"{base}/api/character_runtime/backend_entry/preview",
            b"{not-json",
            headers={"X-Taffy-Token": "token-backend-preview-json"},
        )

    assert status == 400
    assert payload == {"ok": False, "error": "Invalid JSON body."}


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


def test_startup_self_check_reports_openai_compatible_key_missing(monkeypatch):
    cfg = _build_test_config()
    cfg["llm"]["provider"] = "openai-compatible"
    cfg["llm"]["base_url"] = "https://example.test/v1"
    cfg["llm"]["api_key_env"] = "OPENAI_COMPATIBLE_KEY_TEST"

    monkeypatch.delenv("OPENAI_COMPATIBLE_KEY_TEST", raising=False)

    findings = app.run_startup_self_check(cfg)
    assert any("llm provider is openai-compatible" in line for line in findings)
    assert any("OPENAI_COMPATIBLE_KEY_TEST" in line for line in findings)


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
        "demo_stable=true auto_apply_reply_cue=false persona_override_enabled=true"
    ]
    serialized = "\n".join(findings)
    assert "SecretStartupPersona" not in serialized
    assert "startup secret style" not in serialized
