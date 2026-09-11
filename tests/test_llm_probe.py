import llm_probe


def _safe_int_value(value, default):
    try:
        return int(value)
    except Exception:
        return int(default)


def test_resolve_probe_token_budget_keeps_regular_models_tiny():
    budget = llm_probe.resolve_probe_token_budget(
        {"model": "fast-test-model", "base_url": "http://127.0.0.1:9999/v1"}
    )

    assert budget == 8


def test_resolve_probe_token_budget_allows_mimo_reasoning_models():
    by_model = llm_probe.resolve_probe_token_budget(
        {"model": "mimo-v2.5-pro", "base_url": "https://example.test/v1"}
    )
    by_host = llm_probe.resolve_probe_token_budget(
        {"model": "custom-model", "base_url": "https://token-plan-cn.xiaomimimo.com/v1"}
    )

    assert by_model == 256
    assert by_host == 256


def test_resolve_probe_request_timeout_keeps_regular_models_short():
    timeout = llm_probe.resolve_probe_request_timeout(
        {"model": "fast-test-model", "base_url": "http://127.0.0.1:9999/v1", "request_timeout": 120},
        _safe_int_value,
    )

    assert timeout == 12


def test_resolve_probe_request_timeout_allows_mimo_configured_timeout():
    timeout = llm_probe.resolve_probe_request_timeout(
        {"model": "mimo-v2.5-pro", "base_url": "https://token-plan-cn.xiaomimimo.com/v1", "request_timeout": 45},
        _safe_int_value,
    )

    assert timeout == 45


def _run_probe_with_fake_openai(http_post_json_func, llm_cfg):
    return llm_probe.run_lightweight_llm_probe_impl(
        {"llm": llm_cfg},
        load_config_func=lambda: {"llm": llm_cfg},
        build_reply_llm_cfg_func=lambda _cfg, raw: dict(raw),
        resolve_llm_provider_func=lambda _cfg: "openai-compatible",
        ensure_llm_auth_ready_func=lambda _cfg: None,
        resolve_llm_api_key_func=lambda _cfg: ("test-key", "TEST_KEY"),
        http_post_json_func=http_post_json_func,
        is_local_url_func=lambda _url: False,
        normalize_text_content_func=lambda value: value.strip() if isinstance(value, str) else "",
        safe_int_value_func=_safe_int_value,
    )


def test_mimo_probe_retries_empty_visible_content_once():
    calls = []

    def fake_http_post_json(*args, **kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            return {
                "choices": [
                    {
                        "finish_reason": "length",
                        "message": {"content": "", "reasoning_content": "thinking"},
                    }
                ]
            }
        return {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": "OK", "reasoning_content": ""},
                }
            ]
        }

    result = _run_probe_with_fake_openai(
        fake_http_post_json,
        {
            "model": "mimo-v2.5-pro",
            "base_url": "https://token-plan-cn.xiaomimimo.com/v1",
            "request_timeout": 45,
        },
    )

    assert result["ok"] is True
    assert result["reply_chars"] == 2
    assert len(calls) == 2


def test_mimo_probe_uses_http_retry_attempts_for_network_flakes():
    attempts_seen = []

    def fake_http_post_json(*args, **kwargs):
        attempts_seen.append(kwargs.get("attempts"))
        return {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": "OK", "reasoning_content": ""},
                }
            ]
        }

    result = _run_probe_with_fake_openai(
        fake_http_post_json,
        {
            "model": "mimo-v2.5-pro",
            "base_url": "https://token-plan-cn.xiaomimimo.com/v1",
            "request_timeout": 45,
        },
    )

    assert result["ok"] is True
    assert attempts_seen == [2]
