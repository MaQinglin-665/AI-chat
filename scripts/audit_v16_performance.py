#!/usr/bin/env python3
"""Read-only v1.6 performance-contract audit for Taffy dialogue turns."""

from __future__ import annotations

import argparse
import json
import re
import sys
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


SCENES = [
    {"id": "casual_status", "input": "What are you doing?"},
    {"id": "desk_weird", "input": "This desk feels weird."},
    {"id": "correction", "input": "You were wrong."},
    {"id": "finished", "input": "I finished it."},
    {"id": "comfort", "input": "I feel bad."},
    {"id": "next_step", "input": "What next?"},
    {"id": "closing", "input": "I'm going to sleep."},
]

GENERIC_RE = re.compile(
    r"\b(as an ai|happy to help|let me know|anything else|how can i assist|feel free to|that sounds interesting)\b",
    re.IGNORECASE,
)
CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")
SLOW_TURN_MS = 15000
SAFE_CLAMP_INTENTS = {"comfort", "reminder", "closing", "low_interrupt_checkin"}
HIGH_CHAOS_INTENTS = {"casual", "question", "encouragement", "greeting"}


def build_chat_payload(message: str, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    return {
        "message": str(message or ""),
        "history": history if isinstance(history, list) else [],
        "auto": False,
        "force_tools": False,
    }


def request_chat_direct(*, base_url: str, token: str, message: str, history: list[dict[str, str]], timeout_sec: float) -> dict[str, Any]:
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
        "elapsed_ms": elapsed_ms,
        "character_brain": payload.get("character_brain") if isinstance(payload.get("character_brain"), dict) else {},
        "character_runtime": payload.get("character_runtime") if isinstance(payload.get("character_runtime"), dict) else {},
        "error": redact_report_text(result.get("error") or payload.get("error") or ""),
        "timeout": bool(result.get("timeout")),
    }


def detect_scene_drift(scene_id: str, reply: str) -> bool:
    scene = clean_text(scene_id, 80).lower()
    text = str(reply or "").strip().lower()
    checks = {
        "casual_status": r"\b(want to finish|pick the next|next tiny step|10[- ]?minute|save-and|match your pace|how can i help|what we should do next)\b",
        "desk_weird": r"\b(pointer lag|jitter\w*|tracking|position hiccup|hiccup|input|mouse|trackpad|move it|moving it|try moving|blank spot|click once|click|10[- ]?minutes?|vibe goes normal|quick test|restart|settings|setup)\b",
        "correction": r"\b(unplug|replug|trackpad|mouse|settings|reset reality|10[- ]?minute|save/confirm)\b",
        "finished": r"\b(save|saved|next ten|next 10|close|re-check|check for anything broken|next step|done-done|updated version|make sure you saved|tell me what (you )?(want|wanna) to do next|wanna do next)\b",
        "comfort": r"\b(steps?:|you should|try to|set a timer|10[- ]?minute|next small step|action plan)\b",
        "next_step": r"\b(i hear you|keep this short|what sounds good|maybe|whatever you want|desktop/file tidy|desktop tidy|file tidy|restart|quick test|mouse|cursor|pointer|trackpad|jitter\w*|input|save/confirm|hit save|on-screen|clipboard supervisor|timer|stop on purpose)\b",
        "closing": r"\b(tomorrow|continue|anything else|before you (fully )?(go|sleep|zone out)|before you go|hit save|save if|save/confirm|save whatever|leaving on-screen)\b",
    }
    pattern = checks.get(scene)
    return bool(pattern and re.search(pattern, text))


def analyze_performance_contract(reply: str, brain: dict[str, Any] | None, runtime: dict[str, Any] | None, *, scene_id: str = "", elapsed_ms: int = 0, timeout: bool = False) -> list[str]:
    issues: list[str] = []
    text = str(reply or "").strip()
    brain_data = brain if isinstance(brain, dict) else {}
    runtime_data = runtime if isinstance(runtime, dict) else {}
    intent = clean_text(brain_data.get("intent"), 40)
    opening = clean_text(brain_data.get("opening_move"), 48)
    shape = clean_text(brain_data.get("reply_shape"), 48)
    policy = clean_text(brain_data.get("question_policy"), 48)
    spontaneity = safe_int(brain_data.get("spontaneity"), 0)

    if timeout:
        issues.append("timeout")
    if elapsed_ms > SLOW_TURN_MS:
        issues.append("slow_turn")
    if not text:
        issues.append("empty_text")
    if CHINESE_RE.search(text):
        issues.append("chinese_leak")
    if GENERIC_RE.search(text):
        issues.append("customer_service_phrase")
    if detect_scene_drift(scene_id, text):
        issues.append("scene_drift")
    if not opening or not shape or not policy:
        issues.append("missing_performance_controls")
    if intent in SAFE_CLAMP_INTENTS and spontaneity > 0:
        issues.append("safe_scene_too_chaotic")
    if intent == "task_help" and spontaneity > 1:
        issues.append("task_too_chaotic")
    if intent in SAFE_CLAMP_INTENTS and policy != "none":
        issues.append("safe_scene_asks_question")
    if intent in SAFE_CLAMP_INTENTS and clean_text(runtime_data.get("action"), 32) in {"happy_idle", "surprised", "shake_head"}:
        issues.append("unsafe_motion_for_safe_scene")
    if intent in HIGH_CHAOS_INTENTS and spontaneity <= 0:
        issues.append("flat_chaos_for_play_scene")
    return issues


def build_scene_record(scene: dict[str, str], result: dict[str, Any]) -> dict[str, Any]:
    brain = result.get("character_brain") if isinstance(result.get("character_brain"), dict) else {}
    runtime = result.get("character_runtime") if isinstance(result.get("character_runtime"), dict) else {}
    issues = analyze_performance_contract(
        str(result.get("reply") or ""),
        brain,
        runtime,
        scene_id=clean_text(scene.get("id"), 48),
        elapsed_ms=safe_int(result.get("elapsed_ms"), 0),
        timeout=bool(result.get("timeout")),
    )
    return {
        "id": clean_text(scene.get("id"), 48),
        "status": safe_int(result.get("status"), 0),
        "ok": bool(result.get("ok")) and not issues,
        "elapsed_ms": safe_int(result.get("elapsed_ms"), 0),
        "reply": clean_text(result.get("reply"), 360),
        "intent": clean_text(brain.get("intent"), 40),
        "opening": clean_text(brain.get("opening_move"), 48),
        "shape": clean_text(brain.get("reply_shape"), 48),
        "spontaneity": safe_int(brain.get("spontaneity"), 0),
        "policy": clean_text(brain.get("question_policy"), 48),
        "runtime": {
            "emotion": clean_text(runtime.get("emotion"), 32),
            "action": clean_text(runtime.get("action"), 32),
            "voice_style": clean_text(runtime.get("voice_style"), 32),
        },
        "issues": issues,
    }


def summarize_records(records: list[dict[str, Any]]) -> dict[str, Any]:
    elapsed = [safe_int(item.get("elapsed_ms"), 0) for item in records if safe_int(item.get("elapsed_ms"), 0) > 0]
    issue_counts: dict[str, int] = {}
    for item in records:
        for issue in item.get("issues") or []:
            issue_counts[issue] = issue_counts.get(issue, 0) + 1
    gate_ok = bool(records) and all(item.get("ok") is True for item in records)
    return {
        "kind": "v16_performance_audit",
        "scene_count": len(records),
        "gate_ok": gate_ok,
        "median_elapsed_ms": percentile(elapsed, 0.5),
        "p95_elapsed_ms": percentile(elapsed, 0.95),
        "issue_counts": issue_counts,
        "recommendation": (
            "Performance contract is ready for manual TTS/Live2D timing checks."
            if gate_ok
            else "Fix the listed performance-contract issues before tuning motion or voice."
        ),
        "records": records,
    }


def format_report(summary: dict[str, Any]) -> str:
    lines = [
        "== Taffy v1.6 Performance Contract Audit ==",
        f"scenes: {safe_int(summary.get('scene_count'), 0)}",
        f"median_elapsed_ms: {safe_int(summary.get('median_elapsed_ms'), 0)}",
        f"p95_elapsed_ms: {safe_int(summary.get('p95_elapsed_ms'), 0)}",
        f"gate: {'PASS' if summary.get('gate_ok') else 'FAIL'}",
        f"recommendation: {clean_text(summary.get('recommendation'), 260)}",
        f"issue_counts: {json.dumps(summary.get('issue_counts') or {}, ensure_ascii=False)}",
        "",
        "Scenes:",
    ]
    for item in summary.get("records") or []:
        issues = item.get("issues") or []
        lines.append(
            f"  - {clean_text(item.get('id'), 48)} status={safe_int(item.get('status'), 0)} "
            f"elapsed_ms={safe_int(item.get('elapsed_ms'), 0)} intent={clean_text(item.get('intent'), 40)} "
            f"opening={clean_text(item.get('opening'), 48)} shape={clean_text(item.get('shape'), 48)} "
            f"spontaneity={safe_int(item.get('spontaneity'), 0)}/3 policy={clean_text(item.get('policy'), 48)}"
        )
        lines.append(f"    runtime: {json.dumps(item.get('runtime') or {}, ensure_ascii=False)}")
        lines.append(f"    issues: {', '.join(issues) if issues else 'none'}")
        lines.append(f"    reply: {clean_text(item.get('reply'), 260)}")
    return redact_report_text("\n".join(lines))


def run_audit(*, base_url: str, token: str, timeout_sec: float) -> dict[str, Any]:
    history: list[dict[str, str]] = []
    records: list[dict[str, Any]] = []
    for scene in SCENES:
        result = request_chat_direct(
            base_url=base_url,
            token=token,
            message=scene["input"],
            history=history[-8:],
            timeout_sec=timeout_sec,
        )
        record = build_scene_record(scene, result)
        records.append(record)
        reply = str(result.get("reply") or "").strip()
        if reply:
            history.extend([
                {"role": "user", "content": scene["input"]},
                {"role": "assistant", "content": reply},
            ])
    return summarize_records(records)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only v1.6 performance contract audit for Taffy.")
    parser.add_argument("--base-url", default="", help="Local Taffy service base URL. Default: http://127.0.0.1:8123")
    parser.add_argument("--timeout-sec", type=float, default=45.0, help="Per-scene HTTP timeout.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--soft-fail", action="store_true", help="Always exit 0 after printing the report.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    cfg = load_runtime_config_safely()
    summary = run_audit(
        base_url=normalize_base_url(args.base_url),
        token=resolve_api_token(cfg),
        timeout_sec=max(1.0, float(args.timeout_sec)),
    )
    if args.json:
        print(redact_report_text(json.dumps(summary, ensure_ascii=False, indent=2)))
    else:
        print(format_report(summary))
    return 0 if args.soft_fail or summary.get("gate_ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
