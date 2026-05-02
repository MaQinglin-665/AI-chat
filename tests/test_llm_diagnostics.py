from llm_diagnostics import diagnose_llm_exception


def test_diagnose_llm_exception_reports_invalid_api_key_for_401():
    err = diagnose_llm_exception(
        RuntimeError('LLM HTTP 401: {"error":{"message":"invalid token"}}'),
        {
            "provider": "openai-compatible",
            "base_url": "https://example.test/v1",
            "model": "test-model",
            "api_key_env": "TAFFY_LLM_API_KEY",
        },
    )

    assert err.code == "api_key_invalid"
    assert err.config_key == "llm.api_key_env"
    assert "TAFFY_LLM_API_KEY" in err.solution
