import re
import secrets
import sys
import time
import traceback

from config import DiagnosticError, redact_sensitive_text


def diagnostic_payload(exc):
    if isinstance(exc, DiagnosticError):
        return exc.to_payload()
    safe_error = redact_sensitive_text(str(exc or "").strip()) or "服务发生未知错误。"
    return {"error": safe_error}


def log_backend_exception(scope, exc, extra=""):
    safe_scope = str(scope or "runtime").strip().upper()
    safe_extra = str(extra or "").strip()
    detail = redact_sensitive_text(str(exc or "").strip())
    header = f"[{safe_scope}][ERROR] {detail}"
    if safe_extra:
        header = f"{header} | {redact_sensitive_text(safe_extra)}"
    print(header, file=sys.stderr)
    trace = traceback.format_exc()
    if trace and trace.strip() and trace.strip() != "NoneType: None":
        print(redact_sensitive_text(trace), file=sys.stderr)


def log_backend_notice(scope, message, extra=""):
    safe_scope = str(scope or "runtime").strip().upper()
    safe_message = redact_sensitive_text(str(message or "").strip()) or "runtime notice"
    safe_extra = str(extra or "").strip()
    header = f"[{safe_scope}][WARN] {safe_message}"
    if safe_extra:
        header = f"{header} | {redact_sensitive_text(safe_extra)}"
    print(header, file=sys.stderr)


def perf_now_ms():
    return int(time.perf_counter() * 1000)


def wall_now_ms():
    return int(time.time() * 1000)


def safe_int_value(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def sanitize_trace_id(raw, default_prefix="req"):
    source = str(raw or "").strip()
    if source:
        source = re.sub(r"[^a-zA-Z0-9._:-]", "", source)[:64]
    if source:
        return source
    return f"{default_prefix}_{secrets.token_hex(4)}"


def resolve_perf_trace_id(body, default_prefix="req"):
    if not isinstance(body, dict):
        return sanitize_trace_id("", default_prefix=default_prefix)
    return sanitize_trace_id(body.get("_perf_trace_id", ""), default_prefix=default_prefix)


def log_backend_perf(scope, trace_id, **metrics):
    safe_scope = str(scope or "perf").strip().upper()
    safe_trace = sanitize_trace_id(trace_id, default_prefix="req")
    parts = [f"trace={safe_trace}"]
    for key, value in metrics.items():
        k = re.sub(r"[^a-zA-Z0-9_:-]", "", str(key or "").strip().lower())
        if not k:
            continue
        if isinstance(value, bool):
            parts.append(f"{k}={1 if value else 0}")
            continue
        if isinstance(value, (int, float)):
            parts.append(f"{k}={value}")
            continue
        safe_value = redact_sensitive_text(str(value or "").strip()).replace(" ", "_")
        if len(safe_value) > 120:
            safe_value = safe_value[:120]
        parts.append(f"{k}={safe_value}")
    print(f"[{safe_scope}][PERF] {' | '.join(parts)}", file=sys.stderr)
