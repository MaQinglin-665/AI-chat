#!/usr/bin/env python3
"""Read-only LLM link diagnostics for first-run testers.

The report is intentionally public-safe:
- no API key values
- no raw prompt or chat history
- no Authorization header
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from runtime_acceptance_common import (  # noqa: E402
    TOKEN_HEADER,
    clean_text,
    load_runtime_config_safely,
    normalize_base_url,
    post_json,
    redact_report_text,
    resolve_api_token,
    safe_int,
)


ROOT = Path(__file__).resolve().parents[1]


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _has_secret_value(value: Any) -> bool:
    return bool(str(value or "").strip())


def _url_summary(raw_url: str) -> dict[str, Any]:
    text = clean_text(raw_url, 240)
    out = {
        "configured": bool(text),
        "scheme": "",
        "host": "",
        "port": 0,
        "path": "",
        "is_loopback": False,
        "valid": False,
        "error": "",
    }
    if not text:
        out["error"] = "empty_url"
        return out
    try:
        parsed = urllib.parse.urlsplit(text)
        out["scheme"] = parsed.scheme
        out["host"] = parsed.hostname or ""
        out["port"] = int(parsed.port or (443 if parsed.scheme == "https" else 80))
        out["path"] = parsed.path or ""
        out["is_loopback"] = (out["host"] in {"localhost", "::1"} or str(out["host"]).startswith("127."))
        out["valid"] = parsed.scheme in {"http", "https"} and bool(parsed.hostname)
    except Exception as exc:
        out["error"] = clean_text(exc, 120)
    if not out["valid"] and not out["error"]:
        out["error"] = "url_must_include_http_scheme_and_host"
    return out


def _tcp_check(host: str, port: int, timeout_sec: float = 2.0) -> dict[str, Any]:
    if not host or not port:
        return {"checked": False, "ok": False, "elapsed_ms": 0, "error": "missing_host_or_port"}
    started = time.monotonic()
    try:
        with socket.create_connection((host, int(port)), timeout=max(0.2, float(timeout_sec))):
            return {"checked": True, "ok": True, "elapsed_ms": int((time.monotonic() - started) * 1000), "error": ""}
    except OSError as exc:
        return {
            "checked": True,
            "ok": False,
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(exc),
        }


def _get_json(base_url: str, path: str, *, token: str = "", timeout_sec: float = 6.0) -> dict[str, Any]:
    url = f"{normalize_base_url(base_url)}{path}"
    headers = {"Accept": "application/json", "User-Agent": "TaffyLLMDiagnose/1"}
    if token:
        headers[TOKEN_HEADER] = token
    req = urllib.request.Request(url, headers=headers, method="GET")
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            raw = resp.read()
            try:
                payload = json.loads(raw.decode("utf-8-sig", errors="replace")) if raw else {}
            except json.JSONDecodeError:
                payload = {}
            return {
                "ok": 200 <= int(resp.getcode() or 0) < 300,
                "status": int(resp.getcode() or 0),
                "elapsed_ms": int((time.monotonic() - started) * 1000),
                "payload": payload if isinstance(payload, dict) else {},
                "error": "",
            }
    except Exception as exc:
        status = 0
        if hasattr(exc, "code"):
            try:
                status = int(getattr(exc, "code", 0) or 0)
            except Exception:
                status = 0
        return {
            "ok": False,
            "status": status,
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "payload": {},
            "error": redact_report_text(exc),
        }


def _classify_probe_failure(probe: dict[str, Any], llm_url: dict[str, Any], key_present: bool, provider: str) -> tuple[str, str]:
    payload = _safe_dict(probe.get("payload"))
    detail = clean_text(payload.get("detail") or probe.get("error") or "", 500)
    lower = detail.lower()
    status = safe_int(probe.get("status"), 0)
    if probe.get("timeout"):
        return (
            "local_probe_timeout",
            "The local backend did not finish the probe before the script timeout. Check model latency or lower the model size.",
        )
    if status in {401, 403} or "unauthorized" in lower or "forbidden" in lower or "invalid api key" in lower:
        return (
            "auth_rejected",
            "The provider rejected authentication. Replace the key in .env or confirm the key has access to the configured model.",
        )
    if not key_present and provider in {"openai", "openai-compatible", "openai_compatible"} and not llm_url.get("is_loopback"):
        return (
            "api_key_missing",
            "The provider needs an API key, but no key was found through llm.api_key_env or llm.api_key.",
        )
    if "winerror 10054" in lower or "forcibly closed" in lower or "remote host" in lower:
        return (
            "remote_closed_connection",
            "The upstream gateway closed the socket. Try a different base URL/model or confirm the gateway supports OpenAI-compatible chat completions.",
        )
    if "connection refused" in lower or "actively refused" in lower or "winerror 10061" in lower:
        return (
            "connection_refused",
            "The configured LLM service is not listening at the target host/port.",
        )
    if "timed out" in lower or "timeout" in lower:
        return (
            "provider_timeout",
            "The provider did not respond fast enough. Use a faster model for daily Xinyu tuning or increase request_timeout for manual checks.",
        )
    if "model" in lower and "not found" in lower:
        return (
            "model_not_found",
            "The configured model name is not available on this provider.",
        )
    if status >= 500:
        return (
            "provider_or_backend_500",
            "The local backend or upstream provider returned HTTP 500. Check base URL/model compatibility and backend logs.",
        )
    if status == 404:
        return (
            "route_or_provider_404",
            "The route was not found. Confirm the local backend is current and the provider path is OpenAI-compatible.",
        )
    if status == 200 and safe_int(payload.get("reply_chars"), 0) <= 0:
        return (
            "empty_model_text",
            "The model call returned no visible text. Try another model or reduce reasoning-only output settings.",
        )
    return (
        "probe_failed",
        "The LLM probe failed. Check the provider/base URL/model/key combination.",
    )


def build_diagnosis(*, base_url: str = "", timeout_sec: float = 14.0) -> dict[str, Any]:
    cfg = load_runtime_config_safely()
    llm = _safe_dict(cfg.get("llm"))
    server = _safe_dict(cfg.get("server"))
    provider = clean_text(llm.get("provider") or "unknown", 80).lower()
    key_env = clean_text(llm.get("api_key_env") or "", 120)
    inline_key_present = _has_secret_value(llm.get("api_key"))
    env_key_present = _has_secret_value(os.environ.get(key_env, "")) if key_env else False
    key_present = inline_key_present or env_key_present
    llm_url = _url_summary(str(llm.get("base_url") or ""))
    local_base_url = normalize_base_url(base_url)
    token = resolve_api_token(cfg)
    healthz = _get_json(local_base_url, "/healthz", timeout_sec=4.0)
    api_health = _get_json(local_base_url, "/api/health", token=token, timeout_sec=6.0)
    tcp = _tcp_check(str(llm_url.get("host") or ""), safe_int(llm_url.get("port"), 0), timeout_sec=2.0)
    probe = post_json(
        local_base_url,
        "/api/llm_probe",
        {"probe": "llm_link_diagnostics"},
        token=token,
        timeout_sec=max(1.0, float(timeout_sec)),
    )
    probe_payload = _safe_dict(probe.get("payload"))
    probe_ok = safe_int(probe.get("status"), 0) == 200 and bool(probe_payload.get("ok")) and safe_int(probe_payload.get("reply_chars"), 0) > 0
    issue_code = "ok"
    recommendation = "LLM link is usable."
    if not healthz.get("ok"):
        issue_code = "local_backend_unreachable"
        recommendation = "Start the backend with start_electron.bat or python app.py, then rerun this script."
    elif api_health.get("status") in {401, 403}:
        issue_code = "local_api_token_rejected"
        recommendation = "The local backend requires X-Taffy-Token. Run install_and_start.bat to create .env, then restart."
    elif not llm_url.get("valid"):
        issue_code = "llm_base_url_invalid"
        recommendation = "Fix llm.base_url so it starts with http:// or https:// and includes a host."
    elif llm_url.get("is_loopback") and tcp.get("checked") and not tcp.get("ok"):
        issue_code = "local_llm_service_unreachable"
        recommendation = "Start the local LLM service, or change llm.base_url to the provider you actually use."
    elif not probe_ok:
        issue_code, recommendation = _classify_probe_failure(probe, llm_url, key_present, provider)

    return {
        "kind": "llm_link_diagnostics",
        "gate_ok": bool(probe_ok),
        "issue_code": issue_code,
        "recommendation": recommendation,
        "local_backend": {
            "base_url": local_base_url,
            "healthz_ok": bool(healthz.get("ok")),
            "healthz_status": safe_int(healthz.get("status"), 0),
            "api_health_ok": bool(api_health.get("ok")),
            "api_health_status": safe_int(api_health.get("status"), 0),
            "api_token_required": bool(server.get("require_api_token", False)),
            "api_token_configured": bool(token),
        },
        "llm_config": {
            "provider": provider,
            "model": clean_text(llm.get("model") or "", 160),
            "base_url_scheme": clean_text(llm_url.get("scheme"), 16),
            "base_url_host": clean_text(llm_url.get("host"), 160),
            "base_url_port": safe_int(llm_url.get("port"), 0),
            "base_url_path": clean_text(llm_url.get("path"), 120),
            "base_url_valid": bool(llm_url.get("valid")),
            "base_url_is_loopback": bool(llm_url.get("is_loopback")),
            "request_timeout": safe_int(llm.get("request_timeout"), 0),
            "api_key_env": key_env,
            "api_key_present": bool(key_present),
            "api_key_source": "inline" if inline_key_present else ("env" if env_key_present else "missing"),
        },
        "network": {
            "tcp_checked": bool(tcp.get("checked")),
            "tcp_ok": bool(tcp.get("ok")),
            "tcp_elapsed_ms": safe_int(tcp.get("elapsed_ms"), 0),
            "tcp_error": clean_text(redact_report_text(tcp.get("error")), 220),
        },
        "probe": {
            "status": safe_int(probe.get("status"), 0),
            "ok": bool(probe_ok),
            "elapsed_ms": safe_int(probe.get("elapsed_ms"), 0),
            "timeout": bool(probe.get("timeout")),
            "reply_chars": safe_int(probe_payload.get("reply_chars"), 0),
            "provider": clean_text(probe_payload.get("provider"), 80),
            "model": clean_text(probe_payload.get("model"), 160),
            "detail": clean_text(redact_report_text(probe_payload.get("detail") or probe.get("error")), 360),
        },
    }


def format_report(report: dict[str, Any]) -> str:
    backend = _safe_dict(report.get("local_backend"))
    llm = _safe_dict(report.get("llm_config"))
    network = _safe_dict(report.get("network"))
    probe = _safe_dict(report.get("probe"))
    lines = [
        "== Xinyu LLM Link Diagnostics ==",
        f"gate: {'PASS' if report.get('gate_ok') else 'FAIL'}",
        f"issue: {clean_text(report.get('issue_code'), 80)}",
        f"recommendation: {clean_text(report.get('recommendation'), 360)}",
        "",
        "Local backend:",
        f"  base_url: {clean_text(backend.get('base_url'), 180)}",
        f"  /healthz: {'ok' if backend.get('healthz_ok') else 'fail'} status={safe_int(backend.get('healthz_status'), 0)}",
        f"  /api/health: {'ok' if backend.get('api_health_ok') else 'fail'} status={safe_int(backend.get('api_health_status'), 0)}",
        f"  api_token_required={bool(backend.get('api_token_required'))} api_token_configured={bool(backend.get('api_token_configured'))}",
        "",
        "LLM config:",
        f"  provider={clean_text(llm.get('provider') or 'unknown', 80)} model={clean_text(llm.get('model') or 'unknown', 160)}",
        f"  base_url={clean_text(llm.get('base_url_scheme'), 16)}://{clean_text(llm.get('base_url_host'), 160)}:{safe_int(llm.get('base_url_port'), 0)}{clean_text(llm.get('base_url_path'), 120)}",
        f"  base_url_valid={bool(llm.get('base_url_valid'))} loopback={bool(llm.get('base_url_is_loopback'))} request_timeout={safe_int(llm.get('request_timeout'), 0)}",
        f"  api_key_env={clean_text(llm.get('api_key_env') or 'none', 120)} api_key_present={bool(llm.get('api_key_present'))} source={clean_text(llm.get('api_key_source'), 24)}",
        "",
        "Network:",
        f"  tcp_checked={bool(network.get('tcp_checked'))} tcp_ok={bool(network.get('tcp_ok'))} elapsed_ms={safe_int(network.get('tcp_elapsed_ms'), 0)}",
    ]
    if network.get("tcp_error"):
        lines.append(f"  tcp_error={clean_text(network.get('tcp_error'), 220)}")
    lines.extend([
        "",
        "Probe:",
        f"  status={safe_int(probe.get('status'), 0)} ok={bool(probe.get('ok'))} elapsed_ms={safe_int(probe.get('elapsed_ms'), 0)} timeout={bool(probe.get('timeout'))}",
        f"  provider/model={clean_text(probe.get('provider') or 'unknown', 80)} / {clean_text(probe.get('model') or 'unknown', 160)} reply_chars={safe_int(probe.get('reply_chars'), 0)}",
        f"  detail={clean_text(probe.get('detail'), 360)}",
        "",
        "Privacy:",
        "  This report hides API key values, raw prompts, raw history, Authorization headers, and local private files.",
    ])
    return redact_report_text("\n".join(lines))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Diagnose Xinyu LLM connectivity without leaking secrets.")
    parser.add_argument("--base-url", default="", help="Local Xinyu service base URL. Default: http://127.0.0.1:8123")
    parser.add_argument("--timeout-sec", type=float, default=14.0, help="HTTP timeout for /api/llm_probe.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--soft-fail", action="store_true", help="Always exit 0 after printing the report.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    report = build_diagnosis(base_url=args.base_url, timeout_sec=max(1.0, float(args.timeout_sec)))
    if args.json:
        print(redact_report_text(json.dumps(report, ensure_ascii=False, indent=2)))
    else:
        print(format_report(report))
    return 0 if args.soft_fail or report.get("gate_ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
