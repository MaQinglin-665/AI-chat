import copy
import socket

import scripts.first_run_check as first_run


def _base_config():
    return copy.deepcopy(first_run.DEFAULT_CONFIG)


def test_parse_http_endpoint_accepts_defaults_and_explicit_ports():
    ok, host, port, error = first_run._parse_http_endpoint(
        "http://127.0.0.1:11434/api/chat",
        default_port=80,
    )
    assert (ok, host, port, error) == (True, "127.0.0.1", 11434, "")

    ok_https, host_https, port_https, error_https = first_run._parse_http_endpoint(
        "https://example.test/v1",
        default_port=443,
    )
    assert (ok_https, host_https, port_https, error_https) == (
        True,
        "example.test",
        443,
        "",
    )


def test_parse_http_endpoint_rejects_invalid_urls():
    assert first_run._parse_http_endpoint("", default_port=80) == (
        False,
        "",
        0,
        "URL is empty",
    )

    ok, host, port, error = first_run._parse_http_endpoint(
        "ftp://127.0.0.1:21",
        default_port=80,
    )
    assert (ok, host, port) == (False, "", 0)
    assert "http(s)" in error

    ok_bad_port, host_bad_port, port_bad_port, error_bad_port = first_run._parse_http_endpoint(
        "http://127.0.0.1:99999",
        default_port=80,
    )
    assert (ok_bad_port, host_bad_port, port_bad_port) == (False, "", 0)
    assert "port is invalid" in error_bad_port.lower()


def test_loopback_host_detection_is_conservative():
    assert first_run._is_loopback_host("127.0.0.1") is True
    assert first_run._is_loopback_host("127.42.0.9") is True
    assert first_run._is_loopback_host("localhost") is True
    assert first_run._is_loopback_host("::1") is True
    assert first_run._is_loopback_host("example.test") is False


def test_tcp_port_reachable_detects_local_listener():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        listener.settimeout(1)
        port = int(listener.getsockname()[1])

        ok, detail = first_run._tcp_port_reachable("127.0.0.1", port, timeout_sec=1)
        conn, _ = listener.accept()
        conn.close()

    assert ok is True
    assert detail == ""


def test_secret_detection_uses_inline_value_or_named_env(monkeypatch):
    monkeypatch.delenv("FIRST_RUN_TEST_KEY", raising=False)
    cfg = {"api_key": "", "api_key_env": "FIRST_RUN_TEST_KEY"}
    assert first_run._has_env_or_inline_secret(cfg, "api_key", "api_key_env") is False

    cfg["api_key"] = "inline-secret"
    assert first_run._has_env_or_inline_secret(cfg, "api_key", "api_key_env") is True

    cfg["api_key"] = ""
    monkeypatch.setenv("FIRST_RUN_TEST_KEY", "env-secret")
    assert first_run._has_env_or_inline_secret(cfg, "api_key", "api_key_env") is True


def test_check_tools_reports_missing_python_dependency(monkeypatch):
    monkeypatch.setattr(
        first_run,
        "PYTHON_MODULE_CHECKS",
        [("missing_optional_module", "missing-package", "test feature")],
    )
    monkeypatch.setattr(
        first_run,
        "_run_version",
        lambda command: (0, "v22.0.0" if command[0] == "node" else "10.0.0"),
    )
    monkeypatch.setattr(
        first_run.importlib.util,
        "find_spec",
        lambda name: None if name == "missing_optional_module" else object(),
    )

    reporter = first_run.Reporter()
    first_run.check_tools(reporter)

    assert any("missing-package" in warning for warning in reporter.warnings)
    assert not reporter.failures


def test_check_llm_fails_for_remote_openai_compatible_without_key(monkeypatch):
    cfg = _base_config()
    cfg["llm"] = {
        "provider": "openai-compatible",
        "base_url": "https://example.test/v1",
        "model": "qwen-plus",
        "api_key_env": "FIRST_RUN_MISSING_LLM_KEY",
        "api_key": "",
    }
    monkeypatch.delenv("FIRST_RUN_MISSING_LLM_KEY", raising=False)

    reporter = first_run.Reporter()
    first_run.check_llm(reporter, cfg)

    assert any("LLM API key is missing" in failure for failure in reporter.failures)


def test_check_llm_allows_local_openai_compatible_without_key(monkeypatch):
    cfg = _base_config()
    cfg["llm"] = {
        "provider": "openai-compatible",
        "base_url": "http://127.0.0.1:8000/v1",
        "model": "local-model",
        "api_key_env": "FIRST_RUN_LOCAL_LLM_KEY",
        "api_key": "",
    }
    monkeypatch.delenv("FIRST_RUN_LOCAL_LLM_KEY", raising=False)

    reporter = first_run.Reporter()
    first_run.check_llm(reporter, cfg)

    assert not reporter.failures
    assert any("local endpoint without an API key" in warning for warning in reporter.warnings)


def test_check_llm_warns_when_local_ollama_port_is_unreachable(monkeypatch):
    cfg = _base_config()
    cfg["llm"] = {
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434",
        "model": "qwen2.5:7b",
    }
    monkeypatch.setattr(first_run, "_tcp_port_reachable", lambda *_args, **_kwargs: (False, "refused"))

    reporter = first_run.Reporter()
    first_run.check_llm(reporter, cfg)

    assert not reporter.failures
    assert any("Ollama local endpoint is not reachable" in warning for warning in reporter.warnings)


def test_check_tts_reports_invalid_gpt_sovits_url():
    cfg = _base_config()
    cfg["tts"] = {
        "provider": "gpt_sovits",
        "gpt_sovits_api_url": "http://127.0.0.1:99999/tts",
        "allow_browser_fallback": False,
    }

    reporter = first_run.Reporter()
    first_run.check_tts(reporter, cfg)

    assert any("gpt_sovits_api_url is not a valid" in failure for failure in reporter.failures)


def test_check_tts_warns_when_local_gpt_sovits_port_is_unreachable(monkeypatch):
    cfg = _base_config()
    cfg["tts"] = {
        "provider": "gpt_sovits",
        "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
        "allow_browser_fallback": False,
    }
    monkeypatch.setattr(first_run, "_tcp_port_reachable", lambda *_args, **_kwargs: (False, "refused"))

    reporter = first_run.Reporter()
    first_run.check_tts(reporter, cfg)

    assert not reporter.failures
    assert any("GPT-SoVITS local endpoint is not reachable" in warning for warning in reporter.warnings)


def test_check_safety_defaults_passes_conservative_defaults():
    cfg = _base_config()

    reporter = first_run.Reporter()
    first_run.check_safety_defaults(reporter, cfg)

    assert not reporter.failures
    assert not reporter.warnings


def test_check_safety_defaults_flags_risky_opt_ins():
    cfg = _base_config()
    cfg["character_runtime"]["enabled"] = True
    cfg["character_runtime"]["return_metadata"] = True
    cfg["character_runtime"]["auto_apply_reply_cue"] = True
    cfg["observe"]["attach_mode"] = "always"
    cfg["observe"]["auto_chat_enabled"] = True
    cfg["tools"]["enabled"] = True
    cfg["tools"]["allow_shell"] = True

    reporter = first_run.Reporter()
    first_run.check_safety_defaults(reporter, cfg)

    assert any("tools.allow_shell=true" in failure for failure in reporter.failures)
    assert any("observe.attach_mode=always" in warning for warning in reporter.warnings)
    assert any("Auto chat is enabled" in warning for warning in reporter.warnings)
