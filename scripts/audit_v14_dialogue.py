#!/usr/bin/env python3
"""Run a read-only v1.4 English dialogue audit through the local chat API."""

from __future__ import annotations

import argparse
import json
import re
import socket
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from runtime_acceptance_common import (  # noqa: E402
    TOKEN_HEADER,
    clean_text,
    decode_json_bytes,
    load_runtime_config_safely,
    normalize_base_url,
    percentile,
    post_json,
    redact_report_text,
    resolve_api_token,
    safe_int,
)


SCENES = [
    {"id": "what_are_you_doing", "input": "What are you doing?"},
    {"id": "desk_weird", "input": "This desk feels weird."},
    {"id": "you_were_wrong", "input": "You were wrong."},
    {"id": "finished", "input": "I finished it."},
    {"id": "comfort", "input": "I feel bad."},
    {"id": "next_step", "input": "What next?"},
    {"id": "closing", "input": "I'm going to sleep."},
]

GENERIC_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bas an ai\b",
        r"\bi'?m here to help\b",
        r"\bhappy to help\b",
        r"\blet me know\b",
        r"\banything else\b",
        r"\bhow can i assist\b",
        r"\bfeel free to\b",
        r"\bthat sounds interesting\b",
        r"\bwould you like\b",
        r"\bwant to talk about it\b",
        r"\bis there anything\b",
    )
]
CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")


def build_chat_payload(message: str, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    return {
        "message": str(message or ""),
        "history": history if isinstance(history, list) else [],
        "auto": False,
        "force_tools": False,
    }


def parse_sse_data_line(line: bytes) -> dict[str, Any] | None:
    text = line.decode("utf-8", errors="replace").strip()
    if not text.startswith("data:"):
        return None
    raw = text[5:].strip()
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return {"type": "error", "error": "Invalid SSE JSON from chat stream."}


def request_chat_stream(
    *,
    base_url: str,
    token: str,
    message: str,
    history: list[dict[str, str]],
    timeout_sec: float,
) -> dict[str, Any]:
    url = f"{normalize_base_url(base_url)}/api/chat_stream"
    body = json.dumps(build_chat_payload(message, history), ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "User-Agent": "TaffyDialogueAudit/1",
    }
    if token:
        headers[TOKEN_HEADER] = token
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    started = time.monotonic()
    reply_parts: list[str] = []
    done_payload: dict[str, Any] = {}
    first_text_ms = 0
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            for line in resp:
                event = parse_sse_data_line(line)
                if not event:
                    continue
                kind = str(event.get("type") or "").strip().lower()
                if kind == "delta":
                    chunk = str(event.get("text") or "")
                    if chunk:
                        if first_text_ms <= 0:
                            first_text_ms = int((time.monotonic() - started) * 1000)
                        reply_parts.append(chunk)
                elif kind == "done":
                    done_payload = event
                    break
                elif kind == "error":
                    return {
                        "ok": False,
                        "status": int(resp.getcode() or 0),
                        "reply": "",
                        "first_text_ms": first_text_ms,
                        "elapsed_ms": int((time.monotonic() - started) * 1000),
                        "error": redact_report_text(event.get("error") or "Chat stream error."),
                        "timeout": False,
                    }
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        payload = decode_json_bytes(raw)
        return {
            "ok": False,
            "status": int(getattr(exc, "code", 0) or 0),
            "reply": "",
            "first_text_ms": 0,
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(payload.get("error") or str(exc)),
            "timeout": False,
        }
    except (TimeoutError, socket.timeout) as exc:
        return {
            "ok": False,
            "status": 0,
            "reply": "",
            "first_text_ms": first_text_ms,
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(exc),
            "timeout": True,
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": 0,
            "reply": "",
            "first_text_ms": first_text_ms,
            "elapsed_ms": int((time.monotonic() - started) * 1000),
            "error": redact_report_text(exc),
            "timeout": False,
        }

    elapsed_ms = int((time.monotonic() - started) * 1000)
    reply = str(done_payload.get("reply") or "".join(reply_parts)).strip()
    return {
        "ok": bool(reply),
        "status": 200,
        "reply": reply,
        "first_text_ms": first_text_ms or (elapsed_ms if reply else 0),
        "elapsed_ms": elapsed_ms,
        "character_brain": done_payload.get("character_brain") if isinstance(done_payload.get("character_brain"), dict) else {},
        "character_runtime": done_payload.get("character_runtime") if isinstance(done_payload.get("character_runtime"), dict) else {},
        "error": "",
        "timeout": False,
    }


def request_chat_direct(
    *,
    base_url: str,
    token: str,
    message: str,
    history: list[dict[str, str]],
    timeout_sec: float,
) -> dict[str, Any]:
    result = post_json(
        base_url,
        "/api/chat",
        build_chat_payload(message, history),
        token=token,
        timeout_sec=timeout_sec,
    )
    payload = result.get("payload") if isinstance(result.get("payload"), dict) else {}
    reply = str(payload.get("reply") or "").strip()
    elapsed_ms = safe_int(result.get("elapsed_ms"), 0)
    return {
        "ok": safe_int(result.get("status"), 0) == 200 and bool(reply) and not result.get("timeout"),
        "status": safe_int(result.get("status"), 0),
        "reply": reply,
        "first_text_ms": elapsed_ms if reply else 0,
        "elapsed_ms": elapsed_ms,
        "character_brain": payload.get("character_brain") if isinstance(payload.get("character_brain"), dict) else {},
        "character_runtime": payload.get("character_runtime") if isinstance(payload.get("character_runtime"), dict) else {},
        "error": redact_report_text(result.get("error") or payload.get("error") or ""),
        "timeout": bool(result.get("timeout")),
    }


def detect_scene_drift(scene_id: str, reply: str) -> str:
    scene = clean_text(scene_id, 80).lower()
    text = str(reply or "").strip().lower()
    if not text:
        return ""
    checks = {
        "what_are_you_doing": r"\b(want to finish|pick the next|next tiny step|10[- ]?minute|save-and|match your pace|how can i help|what we should do next)\b",
        "desk_weird": r"\b(pointer lag|jitter\w*|tracking|position hiccup|hiccup|input|mouse|trackpad|move it|moving it|try moving|blank spot|click once|click|10[- ]?minutes?|vibe goes normal|quick test|restart|settings|setup)\b",
        "you_were_wrong": r"\b(unplug|replug|trackpad|mouse|settings|reset reality|10[- ]?minute|save/confirm)\b",
        "finished": r"\b(save|saved|next ten|next 10|close|re-check|check for anything broken|next step|done-done|updated version|make sure you saved|tell me what (you )?(want|wanna) to do next|wanna do next)\b",
        "comfort": r"\b(steps?:|you should|try to|set a timer|10[- ]?minute|next small step|action plan|save what you have|save what you|on-screen check|quick on-screen|before you drift)\b",
        "next_step": r"\b(i hear you|keep this short|what sounds good|maybe|whatever you want|desktop/file tidy|desktop tidy|file tidy|restart|quick test|mouse|cursor|pointer|trackpad|jitter\w*|input|save/confirm|hit save|on-screen|clipboard supervisor|timer|stop on purpose)\b",
        "closing": r"\b(tomorrow|continue|anything else|before you (fully )?(go|sleep|zone out)|before you go|hit save|save if|save/confirm|save whatever|leaving on-screen)\b",
    }
    pattern = checks.get(scene)
    if pattern and re.search(pattern, text):
        return "scene_drift"
    return ""


def analyze_reply_quality(reply: str, brain: dict[str, Any] | None = None, *, scene_id: str = "", elapsed_ms: int = 0, timeout: bool = False) -> dict[str, Any]:
    text = str(reply or "").strip()
    brain_data = brain if isinstance(brain, dict) else {}
    policy = clean_text(brain_data.get("question_policy"), 48)
    issues: list[str] = []
    question_count = text.count("?")
    customer_service = any(pattern.search(text) for pattern in GENERIC_PATTERNS)
    if timeout:
        issues.append("timeout")
    if not text:
        issues.append("empty_text")
    if CHINESE_RE.search(text):
        issues.append("chinese_leak")
    if customer_service:
        issues.append("customer_service_phrase")
    if question_count > 1 or (policy == "none" and text.endswith("?")):
        issues.append("routine_question")
    if text.count("(") != text.count(")") or text.count("[") != text.count("]"):
        issues.append("unbalanced_punctuation")
    drift = detect_scene_drift(scene_id, text)
    if drift:
        issues.append(drift)
    if elapsed_ms > 15000:
        issues.append("slow_turn")
    return {
        "issues": issues,
        "question_count": question_count,
        "customer_service": customer_service,
        "chinese_leak": bool(CHINESE_RE.search(text)),
        "routine_question": "routine_question" in issues,
    }


def build_scene_record(scene: dict[str, str], result: dict[str, Any]) -> dict[str, Any]:
    brain = result.get("character_brain") if isinstance(result.get("character_brain"), dict) else {}
    runtime = result.get("character_runtime") if isinstance(result.get("character_runtime"), dict) else {}
    reply = redact_report_text(result.get("reply") or "")
    execution_raw = brain.get("performance_execution") if isinstance(brain.get("performance_execution"), dict) else {}
    analysis = analyze_reply_quality(
        reply,
        brain,
        scene_id=clean_text(scene.get("id"), 80),
        elapsed_ms=safe_int(result.get("elapsed_ms"), 0),
        timeout=bool(result.get("timeout")),
    )
    if result.get("error"):
        analysis["issues"].append("api_error")
    return {
        "id": clean_text(scene.get("id"), 80),
        "input": clean_text(scene.get("input"), 160),
        "ok": bool(result.get("ok")) and not analysis["issues"],
        "status": safe_int(result.get("status"), 0),
        "elapsed_ms": safe_int(result.get("elapsed_ms"), 0),
        "first_text_ms": safe_int(result.get("first_text_ms"), 0),
        "reply": clean_text(reply, 500),
        "intent": clean_text(brain.get("intent"), 80),
        "opening_move": clean_text(brain.get("opening_move"), 80),
        "reply_shape": clean_text(brain.get("reply_shape"), 80),
        "spontaneity": safe_int(brain.get("spontaneity"), 0),
        "question_policy": clean_text(brain.get("question_policy"), 80),
        "performance_bit": clean_text(brain.get("performance_bit"), 48),
        "performance_execution": {
            "removed_followup": bool(execution_raw.get("removed_followup")),
            "shortened": bool(execution_raw.get("shortened")),
            "used_bit": bool(execution_raw.get("used_bit")),
            "stage_callback_added": bool(execution_raw.get("stage_callback_added")),
            "stage_callback_bit": clean_text(execution_raw.get("stage_callback_bit"), 48),
        },
        "runtime": {
            "emotion": clean_text(runtime.get("emotion"), 80),
            "action": clean_text(runtime.get("action"), 80),
            "voice_style": clean_text(runtime.get("voice_style"), 80),
        },
        "issues": list(dict.fromkeys(analysis["issues"])),
        "error": clean_text(redact_report_text(result.get("error")), 240),
    }


def _record_spoken_bit(record: dict[str, Any]) -> str:
    execution = record.get("performance_execution") if isinstance(record.get("performance_execution"), dict) else {}
    if execution.get("stage_callback_added") or execution.get("used_bit"):
        return clean_text(execution.get("stage_callback_bit") or record.get("performance_bit"), 48)
    return ""


def mark_repeated_bit_issues(records: list[dict[str, Any]]) -> None:
    last_bit = ""
    for record in records:
        bit = _record_spoken_bit(record)
        if bit and bit == last_bit:
            issues = record.setdefault("issues", [])
            if "bit_repeat" not in issues:
                issues.append("bit_repeat")
            record["ok"] = False
        if bit:
            last_bit = bit


def _public_execution_summary(value: Any) -> dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    return {
        "removed_followup": bool(raw.get("removed_followup")),
        "shortened": bool(raw.get("shortened")),
        "used_bit": bool(raw.get("used_bit")),
        "stage_callback_added": bool(raw.get("stage_callback_added")),
        "stage_callback_bit": clean_text(raw.get("stage_callback_bit"), 48),
    }


def run_dialogue_audit(
    *,
    base_url: str,
    token: str = "",
    timeout_sec: float = 70.0,
    mode: str = "stream",
    scenes: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    use_scenes = scenes if isinstance(scenes, list) and scenes else SCENES
    history: list[dict[str, str]] = []
    records: list[dict[str, Any]] = []
    for scene in use_scenes:
        message = str(scene.get("input") or "")
        if mode == "chat":
            result = request_chat_direct(
                base_url=base_url,
                token=token,
                message=message,
                history=history[-10:],
                timeout_sec=timeout_sec,
            )
        else:
            result = request_chat_stream(
                base_url=base_url,
                token=token,
                message=message,
                history=history[-10:],
                timeout_sec=timeout_sec,
            )
        record = build_scene_record(scene, result)
        records.append(record)
        if record["reply"]:
            history.extend(
                [
                    {"role": "user", "content": message},
                    {"role": "assistant", "content": record["reply"]},
                ]
            )
    mark_repeated_bit_issues(records)
    elapsed = [safe_int(item.get("elapsed_ms"), 0) for item in records if safe_int(item.get("elapsed_ms"), 0) > 0]
    issues: dict[str, int] = {}
    for item in records:
        for issue in item.get("issues") or []:
            issues[issue] = issues.get(issue, 0) + 1
    hard_fail_issues = {
        "timeout",
        "empty_text",
        "chinese_leak",
        "api_error",
        "customer_service_phrase",
        "routine_question",
    }
    gate_ok = not any(name in hard_fail_issues for name in issues)
    if percentile(elapsed, 0.5) > 15000:
        gate_ok = False
        issues["slow_median"] = issues.get("slow_median", 0) + 1
    return {
        "kind": "v14_dialogue_audit",
        "mode": mode,
        "scene_count": len(records),
        "gate_ok": gate_ok,
        "median_elapsed_ms": percentile(elapsed, 0.5),
        "p95_elapsed_ms": percentile(elapsed, 0.95),
        "issue_counts": issues,
        "records": records,
        "recommendation": (
            "Dialogue loop is ready for manual TTS/Live2D feel testing."
            if gate_ok
            else "Review the flagged dialogue turns before tuning TTS or Live2D further."
        ),
    }


def format_audit_report(summary: dict[str, Any]) -> str:
    lines = [
        "== Taffy v1.4 Dialogue Audit ==",
        f"mode: {clean_text(summary.get('mode'), 40)}",
        f"scenes: {safe_int(summary.get('scene_count'), 0)}",
        f"median_elapsed_ms: {safe_int(summary.get('median_elapsed_ms'), 0)}",
        f"p95_elapsed_ms: {safe_int(summary.get('p95_elapsed_ms'), 0)}",
        f"gate: {'PASS' if summary.get('gate_ok') else 'REVIEW'}",
        f"recommendation: {clean_text(summary.get('recommendation'), 220)}",
        f"issue_counts: {json.dumps(summary.get('issue_counts') or {}, ensure_ascii=False, sort_keys=True)}",
        "",
        "Scenes:",
    ]
    for item in summary.get("records") or []:
        issues = ", ".join(item.get("issues") or []) or "none"
        lines.extend(
            [
                (
                    f"  - {clean_text(item.get('id'), 80)} "
                    f"status={safe_int(item.get('status'), 0)} elapsed_ms={safe_int(item.get('elapsed_ms'), 0)} "
                    f"first_text_ms={safe_int(item.get('first_text_ms'), 0)} intent={clean_text(item.get('intent'), 80)} "
                    f"opening={clean_text(item.get('opening_move'), 80)} shape={clean_text(item.get('reply_shape'), 80)} "
                    f"spontaneity={safe_int(item.get('spontaneity'), 0)}/3 policy={clean_text(item.get('question_policy'), 80)}"
                ),
                f"    reply: {clean_text(item.get('reply'), 500)}",
                f"    execution: {json.dumps(_public_execution_summary(item.get('performance_execution')), ensure_ascii=False, sort_keys=True)}",
                f"    runtime: {json.dumps(item.get('runtime') or {}, ensure_ascii=False, sort_keys=True)}",
                f"    issues: {issues}",
            ]
        )
        if item.get("error"):
            lines.append(f"    error: {clean_text(item.get('error'), 240)}")
    return redact_report_text("\n".join(lines))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only v1.4 dialogue audit for Taffy.")
    parser.add_argument("--base-url", default="", help="Local Taffy service base URL. Default: http://127.0.0.1:8123")
    parser.add_argument("--timeout-sec", type=float, default=70.0, help="Per-scene chat timeout.")
    parser.add_argument("--mode", choices=["stream", "chat"], default="stream", help="Use /api/chat_stream or /api/chat.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--soft-fail", action="store_true", help="Always exit 0 after printing the report.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    cfg = load_runtime_config_safely()
    token = resolve_api_token(cfg)
    summary = run_dialogue_audit(
        base_url=normalize_base_url(args.base_url),
        token=token,
        timeout_sec=max(1.0, float(args.timeout_sec)),
        mode=args.mode,
    )
    if args.json:
        print(redact_report_text(json.dumps(summary, ensure_ascii=False, indent=2)))
    else:
        print(format_audit_report(summary))
    return 0 if args.soft_fail or summary.get("gate_ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
