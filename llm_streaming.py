import json
import os
import socket
import time
import http.client
import urllib.error
import urllib.request

from config import (
    OLLAMA_DEFAULT_BASE_URL,
    OLLAMA_DEFAULT_MODEL,
    OPENAI_DEFAULT_BASE_URL,
    OPENAI_DEFAULT_KEY_ENV,
    OPENAI_DEFAULT_MODEL,
)
from llm_client import (
    apply_chat_completion_token_limit,
    get_llm_user_agent,
    get_openai_tuning,
    is_local_url,
)
from llm_response_utils import convert_messages_to_responses_input
from utils import _clamp_int


def _resolve_stream_timeout(llm_cfg):
    # Keep this separate from legacy llm.timeout_sec: existing configs use that
    # value too aggressively for slow first tokens, so streaming has its own key.
    raw = (llm_cfg or {}).get("stream_timeout_sec", (llm_cfg or {}).get("request_timeout", 45))
    return _clamp_int(raw, 45, 8, 120)


def _raise_if_no_stream_delta(started_at, timeout, yielded_any):
    if yielded_any:
        return
    if time.monotonic() - started_at > timeout:
        raise TimeoutError(f"LLM stream produced no text within {timeout}s")


def _build_stream_headers(llm_cfg, base_url, key_env):
    headers = {
        "Content-Type": "application/json",
        "User-Agent": get_llm_user_agent(llm_cfg),
    }
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )
    return headers


def iter_openai_chat_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)
    headers = _build_stream_headers(llm_cfg, base_url, key_env)
    timeout = _resolve_stream_timeout(llm_cfg)

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
    }
    apply_chat_completion_token_limit(payload, llm_cfg, tuning)
    req = urllib.request.Request(
        url=f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        started_at = time.monotonic()
        yielded_any = False
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for raw_line in resp:
                _raise_if_no_stream_delta(started_at, timeout, yielded_any)
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    data = json.loads(data_str)
                except Exception:
                    continue
                choices = data.get("choices") or []
                for choice in choices:
                    delta = choice.get("delta") or {}
                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        yielded_any = True
                        yield content
                        continue
                    if isinstance(content, list):
                        for part in content:
                            if not isinstance(part, dict):
                                continue
                            text = part.get("text")
                            if isinstance(text, str) and text:
                                yielded_any = True
                                yield text
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except (
        urllib.error.URLError,
        TimeoutError,
        socket.timeout,
        http.client.RemoteDisconnected,
        ConnectionResetError,
        BrokenPipeError,
        OSError,
    ) as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc


def iter_openai_responses_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)
    headers = _build_stream_headers(llm_cfg, base_url, key_env)
    timeout = _resolve_stream_timeout(llm_cfg)

    payload = {
        "model": model,
        "input": convert_messages_to_responses_input(messages),
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
        "max_output_tokens": tuning["max_output_tokens"],
        "text": {
            "format": {"type": "text"},
            "verbosity": tuning["verbosity"],
        },
    }
    if tuning["reasoning_effort"]:
        payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
    req = urllib.request.Request(
        url=f"{base_url}/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        started_at = time.monotonic()
        yielded_any = False
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for raw_line in resp:
                _raise_if_no_stream_delta(started_at, timeout, yielded_any)
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    evt = json.loads(data_str)
                except Exception:
                    continue

                evt_type = str(evt.get("type") or "")
                if evt_type == "response.output_text.delta":
                    delta = evt.get("delta")
                    if isinstance(delta, str) and delta:
                        yielded_any = True
                        yield delta
                    continue

                if evt_type == "response.completed":
                    return

                if evt_type in {"response.failed", "response.incomplete"}:
                    detail = evt.get("response") or evt
                    raise RuntimeError(f"Responses stream failed: {detail}")

                if evt_type in {"error", "response.error"}:
                    detail = evt.get("error") or evt.get("message") or str(evt)
                    raise RuntimeError(f"Responses stream error: {detail}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except (
        urllib.error.URLError,
        TimeoutError,
        socket.timeout,
        http.client.RemoteDisconnected,
        ConnectionResetError,
        BrokenPipeError,
        OSError,
    ) as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc


def iter_ollama_chat_stream(llm_cfg, messages, model_override=None):
    base_url = str((llm_cfg or {}).get("base_url", OLLAMA_DEFAULT_BASE_URL)).rstrip("/")
    model = model_override or (llm_cfg or {}).get("model", OLLAMA_DEFAULT_MODEL)
    temperature = float((llm_cfg or {}).get("temperature", 0.7))
    max_tokens = int((llm_cfg or {}).get("max_tokens", 96))
    num_ctx = int((llm_cfg or {}).get("num_ctx", 2048))
    min_num_ctx = _clamp_int((llm_cfg or {}).get("min_num_ctx", 1024), 1024, 256, 1024)
    max_tokens = max(32, min(256, max_tokens))
    num_ctx = max(min_num_ctx, min(4096, num_ctx))
    timeout = _resolve_stream_timeout(llm_cfg)

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": num_ctx,
        },
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": get_llm_user_agent(llm_cfg),
    }
    req = urllib.request.Request(
        url=f"{base_url}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        started_at = time.monotonic()
        yielded_any = False
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            for raw_line in resp:
                _raise_if_no_stream_delta(started_at, timeout, yielded_any)
                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except Exception:
                    continue
                if isinstance(data.get("error"), str) and data["error"].strip():
                    raise RuntimeError(f"Ollama error: {data['error']}")
                message = data.get("message") or {}
                content = message.get("content")
                if isinstance(content, str) and content:
                    yielded_any = True
                    yield content
                    continue
                response = data.get("response")
                if isinstance(response, str) and response:
                    yielded_any = True
                    yield response
                if data.get("done") is True:
                    return
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except (
        urllib.error.URLError,
        TimeoutError,
        socket.timeout,
        http.client.RemoteDisconnected,
        ConnectionResetError,
        BrokenPipeError,
        OSError,
    ) as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc
