#!/usr/bin/env python3
"""Probe local chat model stability through the read-only /api/llm_probe route."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from runtime_acceptance_common import (  # noqa: E402
    clean_text,
    load_runtime_config_safely,
    normalize_base_url,
    percentile,
    post_json,
    redact_report_text,
    resolve_api_token,
    safe_int,
)


DEFAULT_ATTEMPTS = 5
DEFAULT_TIMEOUT_SEC = 18.0
MIN_SUCCESS_RATE = 0.8
SLOW_TURN_MS = 15000


def build_probe_record(index: int, result: dict[str, Any]) -> dict[str, Any]:
    payload = result.get("payload") if isinstance(result.get("payload"), dict) else {}
    elapsed_ms = safe_int(result.get("elapsed_ms"), 0)
    reply_chars = safe_int(payload.get("reply_chars"), 0)
    status = safe_int(result.get("status"), 0)
    timeout = bool(result.get("timeout"))
    ok = status == 200 and bool(payload.get("ok")) and reply_chars > 0 and not timeout
    no_text = status == 200 and not timeout and reply_chars <= 0
    detail = clean_text(payload.get("detail") or result.get("error") or "", 220)
    return {
        "index": int(index),
        "ok": ok,
        "status": status,
        "elapsed_ms": elapsed_ms,
        "first_text_ms": elapsed_ms if reply_chars > 0 else 0,
        "reply_chars": reply_chars,
        "timeout": timeout,
        "no_text": no_text,
        "provider": clean_text(payload.get("provider"), 80),
        "model": clean_text(payload.get("model"), 120),
        "detail": redact_report_text(detail),
    }


def summarize_probe_records(records: list[dict[str, Any]]) -> dict[str, Any]:
    attempts = len(records)
    success_count = sum(1 for item in records if item.get("ok") is True)
    timeout_count = sum(1 for item in records if item.get("timeout") is True)
    empty_text_count = sum(1 for item in records if item.get("no_text") is True)
    elapsed = [safe_int(item.get("elapsed_ms"), 0) for item in records if safe_int(item.get("elapsed_ms"), 0) > 0]
    first_text = [safe_int(item.get("first_text_ms"), 0) for item in records if safe_int(item.get("first_text_ms"), 0) > 0]
    success_elapsed = [safe_int(item.get("elapsed_ms"), 0) for item in records if item.get("ok") is True]
    success_rate = (success_count / attempts) if attempts else 0.0
    median_success_ms = percentile(success_elapsed, 0.5)
    median_elapsed_ms = percentile(elapsed, 0.5)
    slow_normal_turn = bool(median_success_ms and median_success_ms > SLOW_TURN_MS)
    gate_ok = success_rate >= MIN_SUCCESS_RATE and not slow_normal_turn
    provider = next((item.get("provider") for item in records if item.get("provider")), "")
    model = next((item.get("model") for item in records if item.get("model")), "")
    return {
        "kind": "llm_acceptance_probe",
        "attempts": attempts,
        "success_count": success_count,
        "success_rate": round(success_rate, 3),
        "timeout_count": timeout_count,
        "empty_text_count": empty_text_count,
        "failure_count": max(0, attempts - success_count),
        "median_elapsed_ms": median_elapsed_ms,
        "median_first_text_ms": percentile(first_text, 0.5),
        "median_success_ms": median_success_ms,
        "p95_elapsed_ms": percentile(elapsed, 0.95),
        "slow_turn_threshold_ms": SLOW_TURN_MS,
        "min_success_rate": MIN_SUCCESS_RATE,
        "gate_ok": gate_ok,
        "provider": clean_text(provider, 80),
        "model": clean_text(model, 120),
        "recommendation": (
            "Model link is stable enough for character tuning."
            if gate_ok
            else "Model link is not suitable for character tuning yet. Switch to a faster stable model for daily dialogue checks, then compare the larger model later."
        ),
        "records": records,
    }


def run_probe_series(
    *,
    base_url: str,
    attempts: int = DEFAULT_ATTEMPTS,
    timeout_sec: float = DEFAULT_TIMEOUT_SEC,
    token: str = "",
    sleep_sec: float = 0.2,
) -> dict[str, Any]:
    count = max(1, min(20, int(attempts or DEFAULT_ATTEMPTS)))
    records: list[dict[str, Any]] = []
    for idx in range(1, count + 1):
        result = post_json(
            base_url,
            "/api/llm_probe",
            {"probe": "llm_acceptance"},
            token=token,
            timeout_sec=timeout_sec,
        )
        records.append(build_probe_record(idx, result))
        if idx < count and sleep_sec > 0:
            time.sleep(min(3.0, float(sleep_sec)))
    return summarize_probe_records(records)


def format_probe_report(summary: dict[str, Any]) -> str:
    lines = [
        "== Taffy LLM Acceptance Probe ==",
        f"attempts: {safe_int(summary.get('attempts'), 0)}",
        f"provider/model: {clean_text(summary.get('provider') or 'unknown', 80)} / {clean_text(summary.get('model') or 'unknown', 120)}",
        f"success_rate: {float(summary.get('success_rate') or 0.0) * 100:.1f}%",
        f"median_success_ms: {safe_int(summary.get('median_success_ms'), 0)}",
        f"median_first_text_ms: {safe_int(summary.get('median_first_text_ms'), 0)}",
        f"median_elapsed_ms: {safe_int(summary.get('median_elapsed_ms'), 0)}",
        f"p95_elapsed_ms: {safe_int(summary.get('p95_elapsed_ms'), 0)}",
        f"empty_text_count: {safe_int(summary.get('empty_text_count'), 0)}",
        f"timeout_count: {safe_int(summary.get('timeout_count'), 0)}",
        f"gate: {'PASS' if summary.get('gate_ok') else 'FAIL'}",
        f"recommendation: {clean_text(summary.get('recommendation'), 260)}",
        "",
        "Attempts:",
    ]
    for item in summary.get("records") or []:
        state = "PASS" if item.get("ok") else "FAIL"
        markers = []
        if item.get("timeout"):
            markers.append("timeout")
        if item.get("no_text"):
            markers.append("empty_text")
        marker_text = f" ({', '.join(markers)})" if markers else ""
        lines.append(
            f"  {safe_int(item.get('index'), 0)}. {state}{marker_text} "
            f"status={safe_int(item.get('status'), 0)} first_text_ms={safe_int(item.get('first_text_ms'), 0)} "
            f"elapsed_ms={safe_int(item.get('elapsed_ms'), 0)} "
            f"reply_chars={safe_int(item.get('reply_chars'), 0)} detail={clean_text(item.get('detail'), 180)}"
        )
    return redact_report_text("\n".join(lines))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only model acceptance probe for Taffy.")
    parser.add_argument("--base-url", default="", help="Local Taffy service base URL. Default: http://127.0.0.1:8123")
    parser.add_argument("--attempts", type=int, default=DEFAULT_ATTEMPTS, help="Probe attempts. Default: 5")
    parser.add_argument("--timeout-sec", type=float, default=DEFAULT_TIMEOUT_SEC, help="Per-attempt HTTP timeout.")
    parser.add_argument("--sleep-sec", type=float, default=0.2, help="Pause between attempts.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--soft-fail", action="store_true", help="Always exit 0 after printing the report.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    cfg = load_runtime_config_safely()
    token = resolve_api_token(cfg)
    summary = run_probe_series(
        base_url=normalize_base_url(args.base_url),
        attempts=args.attempts,
        timeout_sec=max(1.0, float(args.timeout_sec)),
        token=token,
        sleep_sec=max(0.0, float(args.sleep_sec)),
    )
    if args.json:
        print(redact_report_text(json.dumps(summary, ensure_ascii=False, indent=2)))
    else:
        print(format_probe_report(summary))
    return 0 if args.soft_fail or summary.get("gate_ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
