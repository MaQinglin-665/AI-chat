import os

from config import (
    DiagnosticError,
    OLLAMA_DEFAULT_MODEL,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
)


def looks_like_timeout_error(message):
    text = str(message or "").strip().lower()
    return "timed out" in text or "timeout" in text


def looks_like_network_error(message):
    text = str(message or "").strip().lower()
    markers = (
        "getaddrinfo",
        "name or service not known",
        "temporary failure in name resolution",
        "no route to host",
        "network is unreachable",
        "nodename nor servname",
        "failed to resolve",
        "dns",
    )
    return any(marker in text for marker in markers)


def looks_like_connection_refused(message):
    text = str(message or "").strip().lower()
    markers = (
        "connection refused",
        "actively refused",
        "winerror 10061",
        "errno 111",
    )
    return any(marker in text for marker in markers)


def resolve_llm_provider(llm_cfg):
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    provider = str(cfg.get("provider", "") or "").strip().lower()
    if provider:
        return provider
    base_url = str(cfg.get("base_url", "") or "").strip().lower()
    return "ollama" if "11434" in base_url or "ollama" in base_url else "openai"


def resolve_llm_api_key(llm_cfg):
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    key_env = (
        str(cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV) or OPENAI_DEFAULT_KEY_ENV).strip()
        or OPENAI_DEFAULT_KEY_ENV
    )
    key_value = str(cfg.get("api_key", "") or "").strip() or str(
        os.environ.get(key_env, "") or ""
    ).strip()
    return key_value, key_env


def ensure_llm_auth_ready(llm_cfg, *, is_local_url_func):
    provider = resolve_llm_provider(llm_cfg)
    if provider not in {"openai", "openai-compatible", "openai_compatible"}:
        return
    base_url = str((llm_cfg or {}).get("base_url", OPENAI_DEFAULT_BASE_URL) or "").strip()
    api_key, key_env = resolve_llm_api_key(llm_cfg)
    if api_key or is_local_url_func(base_url):
        return
    raise DiagnosticError(
        code="api_key_missing",
        reason="当前 LLM 提供方需要 API Key，但未读取到密钥。",
        solution=f"请先在环境变量中设置 {key_env}，或切换为本地 Ollama。",
        config_key="llm.api_key_env",
    )


def diagnose_llm_exception(exc, llm_cfg):
    if isinstance(exc, DiagnosticError):
        return exc
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    raw = str(exc or "").strip()
    lower = raw.lower()
    provider = resolve_llm_provider(cfg)
    base_url = str(cfg.get("base_url", "") or "").strip()
    model = str(cfg.get("model", "") or "").strip() or OLLAMA_DEFAULT_MODEL
    _, key_env = resolve_llm_api_key(cfg)

    if "missing api key" in lower:
        return DiagnosticError(
            code="api_key_missing",
            reason="当前 LLM 提供方需要 API Key，但未读取到密钥。",
            solution=f"请先设置环境变量 {key_env}，再重试。",
            config_key="llm.api_key_env",
            detail=raw,
        )

    if provider == "ollama" and "model" in lower and "not found" in lower:
        return DiagnosticError(
            code="model_not_found",
            reason=f"Ollama 中不存在模型：{model}",
            solution=f"请先执行 `ollama pull {model}`，或改为已安装模型。",
            config_key="llm.model",
            detail=raw,
        )

    if "model" in lower and "not found" in lower:
        return DiagnosticError(
            code="model_not_found",
            reason=f"模型名称不可用：{model}",
            solution="请确认模型名称拼写正确，并且该模型已在服务端可用。",
            config_key="llm.model",
            detail=raw,
        )

    if looks_like_timeout_error(lower):
        return DiagnosticError(
            code="llm_connection_timeout",
            reason="连接 LLM 服务超时。",
            solution="请检查服务负载与网络状况，必要时增大 llm.request_timeout。",
            config_key="llm.request_timeout",
            detail=raw,
        )

    if looks_like_network_error(lower):
        return DiagnosticError(
            code="network_connection_failed",
            reason="网络连接失败，无法访问 LLM 服务地址。",
            solution="请检查网络、代理和 DNS 设置，确认地址可访问。",
            config_key="llm.base_url",
            detail=raw,
        )

    if "connection failed" in lower or "failed to connect" in lower:
        if provider == "ollama" and looks_like_connection_refused(lower):
            return DiagnosticError(
                code="ollama_not_started",
                reason=f"无法连接 Ollama 服务：{base_url or OLLAMA_DEFAULT_BASE_URL}",
                solution="请先启动 Ollama（或执行 `ollama serve`），再重试。",
                config_key="llm.base_url",
                detail=raw,
            )
        return DiagnosticError(
            code="llm_connection_failed",
            reason=f"无法连接 LLM 服务地址：{base_url or '(未设置)'}",
            solution="请确认服务已启动，且 llm.base_url 地址与端口填写正确。",
            config_key="llm.base_url",
            detail=raw,
        )

    if "llm http" in lower:
        return DiagnosticError(
            code="llm_connection_failed",
            reason="LLM 服务返回异常状态码。",
            solution="请检查 llm.base_url、llm.model 与鉴权配置是否正确。",
            config_key="llm.base_url",
            detail=raw,
        )

    return DiagnosticError(
        code="llm_call_failed",
        reason="LLM 调用失败。",
        solution="请检查 LLM 地址、模型名和鉴权配置，并查看控制台日志。",
        config_key="llm",
        detail=raw,
    )
