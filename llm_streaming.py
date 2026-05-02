import json
import os
import urllib.error
import urllib.request

from config import OPENAI_DEFAULT_BASE_URL, OPENAI_DEFAULT_KEY_ENV, OPENAI_DEFAULT_MODEL
from llm_client import get_llm_user_agent, get_openai_tuning, is_local_url
from llm_response_utils import convert_messages_to_responses_input


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

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": True,
        "max_tokens": tuning["max_output_tokens"],
    }
    req = urllib.request.Request(
        url=f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            for raw_line in resp:
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
                        yield content
                        continue
                    if isinstance(content, list):
                        for part in content:
                            if not isinstance(part, dict):
                                continue
                            text = part.get("text")
                            if isinstance(text, str) and text:
                                yield text
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc


def iter_openai_responses_stream(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)
    headers = _build_stream_headers(llm_cfg, base_url, key_env)

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
        with urllib.request.urlopen(req, timeout=180) as resp:
            for raw_line in resp:
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
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM connection failed: {exc}") from exc
