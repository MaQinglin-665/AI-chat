import json
import os
import time
import socket
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
from utils import _clamp_int
from utils import _clamp_float

DEFAULT_LLM_HTTP_USER_AGENT = "curl/8.6.0"


def get_llm_user_agent(llm_cfg=None):
    cfg = llm_cfg if isinstance(llm_cfg, dict) else {}
    value = (
        str(cfg.get("http_user_agent", "")).strip()
        or os.environ.get("LLM_HTTP_USER_AGENT", "").strip()
        or DEFAULT_LLM_HTTP_USER_AGENT
    )
    return value[:256]


def is_local_url(url):
    lowered = url.lower()
    return lowered.startswith("http://127.0.0.1") or lowered.startswith("http://localhost")

def http_post_json(url, payload, headers=None, timeout=60):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    if not str(req_headers.get("User-Agent", "")).strip():
        req_headers["User-Agent"] = get_llm_user_agent()

    # Retry transient upstream/network failures to reduce visible chat errors.
    # This is especially useful for proxy relays that occasionally close sockets.
    attempts = 3
    body = ""
    last_exc = None
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            headers=req_headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
                last_exc = None
                break
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            retryable = exc.code in {408, 409, 425, 429} or 500 <= int(exc.code) < 600
            if retryable and attempt < attempts:
                time.sleep(0.8 * attempt)
                continue
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
            last_exc = exc
            if attempt < attempts:
                time.sleep(0.8 * attempt)
                continue
            raise RuntimeError(f"LLM connection failed: {exc}") from exc

    if last_exc is not None:
        raise RuntimeError(f"LLM connection failed: {last_exc}")

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON response from model server: {body[:300]}") from exc
    return data

def get_openai_tuning(llm_cfg):
    max_output_tokens = llm_cfg.get("max_output_tokens", llm_cfg.get("max_tokens", 120))
    try:
        max_output_tokens = int(max_output_tokens)
    except (TypeError, ValueError):
        max_output_tokens = 120
    max_cap = 2048 if bool(llm_cfg.get("allow_high_output_tokens", False)) else 256
    max_output_tokens = max(32, min(max_cap, max_output_tokens))

    verbosity = str(llm_cfg.get("verbosity", "low")).strip().lower()
    if verbosity not in {"low", "medium", "high"}:
        verbosity = "low"

    reasoning_effort = str(llm_cfg.get("reasoning_effort", "")).strip().lower()
    if reasoning_effort in {"none", "off", "disable", "disabled", "zero"}:
        reasoning_effort = "minimal"
    elif reasoning_effort not in {"minimal", "low", "medium", "high"}:
        reasoning_effort = ""

    frequency_penalty = _clamp_float(
        llm_cfg.get("frequency_penalty", 0.0), 0.0, -2.0, 2.0
    )
    presence_penalty = _clamp_float(
        llm_cfg.get("presence_penalty", 0.0), 0.0, -2.0, 2.0
    )

    return {
        "max_output_tokens": max_output_tokens,
        "verbosity": verbosity,
        "reasoning_effort": reasoning_effort,
        "frequency_penalty": frequency_penalty,
        "presence_penalty": presence_penalty,
    }

def call_openai_compatible(llm_cfg, messages):
    base_url = str(llm_cfg.get("base_url", OPENAI_DEFAULT_BASE_URL)).rstrip("/")
    model = llm_cfg.get("model", OPENAI_DEFAULT_MODEL)
    key_env = llm_cfg.get("api_key_env", OPENAI_DEFAULT_KEY_ENV)
    temperature = float(llm_cfg.get("temperature", 0.7))
    tuning = get_openai_tuning(llm_cfg)
    timeout = _clamp_int(llm_cfg.get("request_timeout", 60), 60, 4, 180)

    headers = {}
    api_key = str(llm_cfg.get("api_key", "")).strip() or os.environ.get(key_env, "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif not is_local_url(base_url):
        raise RuntimeError(
            f"Missing API key. Please set environment variable: {key_env}."
        )

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "frequency_penalty": tuning["frequency_penalty"],
        "presence_penalty": tuning["presence_penalty"],
        "stream": False,
        "max_tokens": tuning["max_output_tokens"],
    }

    try:
        data = http_post_json(
            f"{base_url}/chat/completions", payload, headers=headers, timeout=timeout
        )
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message", {})
            content = normalize_text_content(message.get("content", ""))
            finish_reason = str(choices[0].get("finish_reason", "") or "").strip().lower()
            if content and finish_reason != "length":
                return content

            # Stable demo fallback: if reply is clipped by token budget, retry once with a larger budget.
            if content and finish_reason == "length" and bool(llm_cfg.get("retry_on_length", False)):
                retry_payload = dict(payload)
                try:
                    current_max = int(retry_payload.get("max_tokens", tuning["max_output_tokens"]))
                except (TypeError, ValueError):
                    current_max = int(tuning["max_output_tokens"])
                desired = llm_cfg.get("length_retry_max_output_tokens", llm_cfg.get("max_output_tokens", current_max))
                try:
                    desired_max = int(desired)
                except (TypeError, ValueError):
                    desired_max = current_max
                retry_cap = 2048 if bool(llm_cfg.get("allow_high_output_tokens", False)) else 512
                retry_max = max(current_max + 64, desired_max, current_max * 2)
                retry_payload["max_tokens"] = max(64, min(retry_cap, retry_max))

                retry_data = http_post_json(
                    f"{base_url}/chat/completions", retry_payload, headers=headers, timeout=timeout
                )
                retry_choices = retry_data.get("choices") or []
                if retry_choices:
                    retry_message = retry_choices[0].get("message", {})
                    retry_content = normalize_text_content(retry_message.get("content", ""))
                    if retry_content:
                        return retry_content
    except RuntimeError:
        # Some relays do not return standard chat-completions JSON.
        pass

    # Fallback: OpenAI Responses API compatibility path.
    # Not all providers support this endpoint (e.g. DashScope), so catch errors.
    try:
        responses_payload = {
            "model": model,
            "input": convert_messages_to_responses_input(messages),
            "temperature": temperature,
            "frequency_penalty": tuning["frequency_penalty"],
            "presence_penalty": tuning["presence_penalty"],
            "max_output_tokens": tuning["max_output_tokens"],
            "text": {
                "format": {"type": "text"},
                "verbosity": tuning["verbosity"],
            },
        }
        if tuning["reasoning_effort"]:
            responses_payload["reasoning"] = {"effort": tuning["reasoning_effort"]}
        responses_data = http_post_json(
            f"{base_url}/responses", responses_payload, headers=headers, timeout=timeout
        )
        content = extract_response_output_text(responses_data)
        if content:
            return content
    except Exception:
        # Provider does not support /responses endpoint — raise to signal failure.
        raise RuntimeError(
            f"LLM provider at {base_url} returned no usable response from either "
            "/chat/completions or /responses."
        )

    raise RuntimeError(f"LLM provider at {base_url} returned an empty response.")

def call_ollama(llm_cfg, messages, model_override=None):
    base_url = str(llm_cfg.get("base_url", OLLAMA_DEFAULT_BASE_URL)).rstrip("/")
    model = model_override or llm_cfg.get("model", OLLAMA_DEFAULT_MODEL)
    temperature = float(llm_cfg.get("temperature", 0.7))
    max_tokens = int(llm_cfg.get("max_tokens", 96))
    num_ctx = int(llm_cfg.get("num_ctx", 2048))
    timeout = _clamp_int(llm_cfg.get("request_timeout", 150), 150, 4, 240)
    max_tokens = max(32, min(256, max_tokens))
    num_ctx = max(1024, min(4096, num_ctx))

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": num_ctx,
        },
    }
    data = http_post_json(f"{base_url}/api/chat", payload, timeout=timeout)

    if isinstance(data.get("error"), str) and data["error"].strip():
        raise RuntimeError(f"Ollama error: {data['error']}")

    message = data.get("message") or {}
    content = normalize_text_content(message.get("content", ""))
    if not content:
        content = normalize_text_content(data.get("response", ""))
    return content or "I am here with you."

def normalize_text_content(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return " ".join(parts).strip()
    return ""

def extract_response_output_text(data):
    direct = data.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    outputs = data.get("output")
    if not isinstance(outputs, list):
        return ""
    parts = []
    for item in outputs:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
    return "\n".join(parts).strip()

def convert_messages_to_responses_input(messages):
    converted = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = str(msg.get("role", "user")).strip() or "user"
        raw_content = msg.get("content", "")
        parts = []
        if isinstance(raw_content, str):
            if raw_content.strip():
                parts.append({"type": "input_text", "text": raw_content.strip()})
        elif isinstance(raw_content, list):
            for part in raw_content:
                if not isinstance(part, dict):
                    continue
                ptype = part.get("type")
                if ptype == "text":
                    text = part.get("text")
                    if isinstance(text, str) and text.strip():
                        parts.append({"type": "input_text", "text": text.strip()})
                elif ptype == "image_url":
                    image_url = part.get("image_url")
                    if isinstance(image_url, dict):
                        image_url = image_url.get("url")
                    if isinstance(image_url, str) and image_url.strip():
                        parts.append({"type": "input_image", "image_url": image_url.strip()})
        if parts:
            converted.append({"role": role, "content": parts})
    return converted
