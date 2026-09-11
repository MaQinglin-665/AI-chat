"""Lightweight LLM readiness probes used by health and first-chat checks."""

from __future__ import annotations

import time

from config import OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODEL


def is_mimo_probe_target(llm_cfg):
    model = str((llm_cfg or {}).get("model", "") or "").strip().lower()
    base_url = str((llm_cfg or {}).get("base_url", "") or "").strip().lower()
    return model.startswith("mimo-") or "xiaomimimo.com" in base_url


def resolve_probe_token_budget(llm_cfg):
    return 256 if is_mimo_probe_target(llm_cfg) else 8


def resolve_probe_request_timeout(llm_cfg, safe_int_value_func):
    if is_mimo_probe_target(llm_cfg):
        configured = max(4, safe_int_value_func((llm_cfg or {}).get("request_timeout", 45), 45))
        return min(60, configured)
    configured = max(4, safe_int_value_func((llm_cfg or {}).get("request_timeout", 12), 12))
    return min(12, configured)


def resolve_probe_http_attempts(llm_cfg):
    return 2 if is_mimo_probe_target(llm_cfg) else 1


def resolve_empty_content_probe_attempts(llm_cfg):
    return 2 if is_mimo_probe_target(llm_cfg) else 1


def run_lightweight_llm_probe_impl(
    config,
    *,
    load_config_func,
    build_reply_llm_cfg_func,
    resolve_llm_provider_func,
    ensure_llm_auth_ready_func,
    resolve_llm_api_key_func,
    http_post_json_func,
    is_local_url_func,
    normalize_text_content_func,
    safe_int_value_func,
):
    cfg = config if isinstance(config, dict) else load_config_func()
    raw_llm_cfg = cfg.get("llm", {}) if isinstance(cfg.get("llm", {}), dict) else {}
    llm_cfg = dict(build_reply_llm_cfg_func(cfg, raw_llm_cfg))
    llm_cfg["temperature"] = 0
    model = str(llm_cfg.get("model", "") or "").strip()
    probe_token_budget = resolve_probe_token_budget(llm_cfg)
    llm_cfg["max_tokens"] = probe_token_budget
    llm_cfg["max_output_tokens"] = probe_token_budget
    llm_cfg["request_timeout"] = resolve_probe_request_timeout(llm_cfg, safe_int_value_func)
    provider = resolve_llm_provider_func(llm_cfg)
    started = time.monotonic()
    messages = [
        {
            "role": "system",
            "content": "Reply with exactly OK. No punctuation, no extra words.",
        },
        {"role": "user", "content": "Ping."},
    ]
    if provider in {"openai", "openai-compatible", "openai_compatible"}:
        ensure_llm_auth_ready_func(llm_cfg)
        base_url = str(llm_cfg.get("base_url", "") or "").strip().rstrip("/")
        key, key_env = resolve_llm_api_key_func(llm_cfg)
        headers = {}
        if key:
            headers["Authorization"] = f"Bearer {key}"
        elif not is_local_url_func(base_url):
            raise RuntimeError(f"Missing API key. Please set environment variable: {key_env}.")
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0,
            "max_tokens": probe_token_budget,
            "stream": False,
        }
        reply = ""
        empty_attempts = resolve_empty_content_probe_attempts(llm_cfg)
        for attempt_idx in range(empty_attempts):
            data = http_post_json_func(
                f"{base_url}/chat/completions",
                payload,
                headers=headers,
                timeout=llm_cfg["request_timeout"],
                attempts=resolve_probe_http_attempts(llm_cfg),
            )
            choices = data.get("choices") or []
            if choices:
                reply = normalize_text_content_func((choices[0].get("message") or {}).get("content", ""))
            if reply or attempt_idx >= empty_attempts - 1:
                break
            time.sleep(0.5)
    elif provider == "ollama":
        base_url = str(llm_cfg.get("base_url", OLLAMA_DEFAULT_BASE_URL) or OLLAMA_DEFAULT_BASE_URL).strip().rstrip("/")
        payload = {
            "model": model or OLLAMA_DEFAULT_MODEL,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0, "num_predict": 8},
        }
        data = http_post_json_func(
            f"{base_url}/api/chat",
            payload,
            timeout=llm_cfg["request_timeout"],
            attempts=1,
        )
        if isinstance(data.get("error"), str) and data["error"].strip():
            raise RuntimeError(f"Ollama error: {data['error']}")
        reply = normalize_text_content_func((data.get("message") or {}).get("content", "")) or normalize_text_content_func(data.get("response", ""))
    else:
        raise RuntimeError(f"Unsupported llm.provider: {provider}.")

    elapsed_ms = int((time.monotonic() - started) * 1000)
    return {
        "ok": bool(reply),
        "provider": provider,
        "model": model,
        "elapsed_ms": elapsed_ms,
        "reply_chars": len(reply or ""),
        "detail": "Lightweight model probe returned text." if reply else "Lightweight model probe returned no text after retry.",
    }
