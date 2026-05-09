#!/usr/bin/env python3
"""Shared helpers for read-only runtime acceptance scripts."""

from __future__ import annotations

import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import API_TOKEN_DEFAULT_ENV, load_config, redact_sensitive_text  # noqa: E402


DEFAULT_BASE_URL = "http://127.0.0.1:8123"
TOKEN_HEADER = "X-Taffy-Token"
SECRET_TOKEN_RE = re.compile(r"\bsk-[A-Za-z0-9._\-]{8,}\b")


def clean_text(value: Any, limit: int = 320) -> str:
    text = " ".join(str(value or "").replace("\r", " ").replace("\n", " ").split())
    if limit > 0 and len(text) > limit:
        return text[: max(0, limit - 3)].rstrip() + "..."
    return text


def redact_report_text(value: Any) -> str:
    text = redact_sensitive_text(str(value or ""))
    text = SECRET_TOKEN_RE.sub("sk-***", text)
    return text


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def percentile(values: list[int], q: float) -> int:
    clean = sorted(int(v) for v in values if isinstance(v, int) and v >= 0)
    if not clean:
        return 0
    if len(clean) == 1:
        return clean[0]
    q = max(0.0, min(1.0, float(q)))
    idx = round((len(clean) - 1) * q)
    return clean[int(idx)]


def load_runtime_config_safely() -> dict[str, Any]:
    try:
        cfg = load_config()
        return cfg if isinstance(cfg, dict) else {}
    except Exception as exc:
        print(f"[WARN] Could not load local config: {redact_report_text(exc)}", file=sys.stderr)
        return {}


def resolve_api_token(cfg: dict[str, Any] | None = None) -> str:
    config = cfg if isinstance(cfg, dict) else load_runtime_config_safely()
    server = config.get("server", {}) if isinstance(config.get("server", {}), dict) else {}
    env_name = clean_text(server.get("api_token_env") or API_TOKEN_DEFAULT_ENV, 80) or API_TOKEN_DEFAULT_ENV
    return str(server.get("api_token") or os.environ.get(env_name) or os.environ.get(API_TOKEN_DEFAULT_ENV) or "").strip()


def normalize_base_url(raw: str | None = None) -> str:
    text = clean_text(raw or os.environ.get("TAFFY_ACCEPTANCE_BASE_URL") or DEFAULT_BASE_URL, 200)
    return text.rstrip("/") or DEFAULT_BASE_URL


def decode_json_bytes(raw: bytes) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw.decode("utf-8-sig", errors="replace"))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def post_json(
    base_url: str,
    path: str,
    payload: dict[str, Any],
    *,
    token: str = "",
    timeout_sec: float = 20.0,
) -> dict[str, Any]:
    url = f"{normalize_base_url(base_url)}{path}"
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "TaffyRuntimeAcceptance/1",
    }
    if token:
        headers[TOKEN_HEADER] = token
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            raw = resp.read()
            return {
                "status": int(resp.getcode() or 0),
                "payload": decode_json_bytes(raw),
                "elapsed_ms": int((time.monotonic() - started) * 1000),
                "error": "",
                "timeout": False,
            }
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        payload_data = decode_json_bytes(raw)
        detail = payload_data.get("error") or payload_data.get("detail") or str(exc)
        return {
            "status": int(getattr(exc, "code", 0) or 0),
            "payload": payload_data,
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(detail),
            "timeout": False,
        }
    except (TimeoutError, socket.timeout) as exc:
        return {
            "status": 0,
            "payload": {},
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(exc),
            "timeout": True,
        }
    except Exception as exc:
        return {
            "status": 0,
            "payload": {},
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(exc),
            "timeout": False,
        }
