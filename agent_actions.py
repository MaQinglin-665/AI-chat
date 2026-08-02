"""Local approval and audit state for desktop-agent tool actions.

The LLM may propose an action but it can never self-approve it: an approval is
created before a destructive/system-sensitive operation and must be redeemed by
the authenticated local UI through the backend route.
"""

from __future__ import annotations

import hashlib
import json
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone

from config import ROOT_DIR


STATE_PATH = ROOT_DIR / "agent_actions.json"
LOCK = threading.RLock()
PENDING_TTL_MINUTES = 15
MAX_PENDING = 24
MAX_AUDIT = 120


def _now():
    return datetime.now(timezone.utc).astimezone()


def _now_iso():
    return _now().isoformat(timespec="seconds")


def _load():
    try:
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save(state):
    safe = {
        "version": 1,
        "pending": list(state.get("pending", []))[-MAX_PENDING:],
        "audit": list(state.get("audit", []))[-MAX_AUDIT:],
    }
    STATE_PATH.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding="utf-8")


def _safe_text(value, max_len=500):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:max_len]


def _safe_args(args):
    # JSON serialization both bounds the payload and prevents arbitrary objects
    # from crossing the persisted approval boundary.
    try:
        text = json.dumps(args if isinstance(args, dict) else {}, ensure_ascii=False)
        if len(text) > 12_000:
            return {}
        return json.loads(text)
    except Exception:
        return {}


def risk_for_action(name, args):
    """Return (requires_confirmation, reason, user-facing summary)."""
    tool = _safe_text(name, 80)
    safe_args = _safe_args(args)
    if tool == "delete_path":
        return True, "delete_or_overwrite", f"删除路径：{_safe_text(safe_args.get('path'), 260)}"
    if tool == "write_file":
        mode = _safe_text(safe_args.get("mode", "overwrite"), 20).lower()
        if mode == "overwrite":
            return True, "file_overwrite", f"覆盖文件：{_safe_text(safe_args.get('path'), 260)}"
    if tool == "run_command":
        command = _safe_text(safe_args.get("command"), 800)
        danger = re.search(
            r"(?i)(?:\b(?:rm|del|erase|rmdir|rd|format|shutdown|reboot|poweroff)\b|"
            r"remove-item\b|set-executionpolicy\b|reg(?:\.exe)?\s+(?:add|delete)\b|"
            r"diskpart\b|bcdedit\b|net\s+user\b|sc\s+(?:create|delete|config)\b)",
            command,
        )
        if danger:
            return True, "high_risk_system_command", f"执行高风险系统命令：{command}"
    if tool == "control_window":
        action = _safe_text(safe_args.get("action"), 24).lower()
        if action == "close":
            title = _safe_text(safe_args.get("window_title"), 160) or str(
                safe_args.get("handle") or ""
            )
            return True, "close_external_window", f"关闭外部窗口：{title}"
    if tool == "desktop_input":
        action = _safe_text(safe_args.get("action"), 24).lower()
        target_kind = _safe_text(safe_args.get("target_kind"), 40).lower() or "unknown"
        target = _safe_text(safe_args.get("target_description"), 220) or target_kind
        if target_kind in {
            "submit",
            "send_message",
            "login",
            "payment",
            "install",
            "delete",
            "unknown",
        }:
            return True, f"desktop_{target_kind}", f"桌面操作：{action}；目标：{target}"
        if (
            action == "key_press"
            and _safe_text(safe_args.get("key"), 24).lower() == "enter"
            and target_kind not in {"search", "navigation", "draft_editing"}
        ):
            return True, "desktop_submit_key", f"按下回车键；目标：{target}"
    # Account login/payment/submission tools are intentionally absent from this
    # first local adapter. If a future adapter adds one, it must declare one of
    # these action names and will automatically require confirmation.
    if tool in {"browser_login", "browser_submit", "payment", "send_message"}:
        return True, "external_account_or_submission", f"外部账号或提交操作：{tool}"
    return False, "", ""


def create_pending(name, args, reason, summary):
    now = _now()
    record = {
        "id": secrets.token_urlsafe(18),
        "tool": _safe_text(name, 80),
        "args": _safe_args(args),
        "reason": _safe_text(reason, 80),
        "summary": _safe_text(summary, 500),
        "created_at": now.isoformat(timespec="seconds"),
        "expires_at": (now + timedelta(minutes=PENDING_TTL_MINUTES)).isoformat(timespec="seconds"),
    }
    with LOCK:
        state = _load()
        pending = state.get("pending", []) if isinstance(state.get("pending"), list) else []
        pending = [row for row in pending if isinstance(row, dict) and row.get("expires_at", "") > _now_iso()]
        pending.append(record)
        state["pending"] = pending[-MAX_PENDING:]
        _save(state)
    return record


def consume_pending(confirmation_id):
    key = _safe_text(confirmation_id, 120)
    if not key:
        return None
    with LOCK:
        state = _load()
        pending = state.get("pending", []) if isinstance(state.get("pending"), list) else []
        chosen = None
        kept = []
        now = _now_iso()
        for row in pending:
            if not isinstance(row, dict) or row.get("expires_at", "") <= now:
                continue
            if row.get("id") == key and chosen is None:
                chosen = row
            else:
                kept.append(row)
        state["pending"] = kept
        _save(state)
    return chosen


def cancel_pending(confirmation_id):
    row = consume_pending(confirmation_id)
    if row:
        append_audit(row, status="cancelled")
    return row


def append_audit(record, *, status, result=None, error=""):
    safe = record if isinstance(record, dict) else {}
    digest = hashlib.sha256(
        json.dumps(safe.get("args", {}), ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:16]
    event = {
        "at": _now_iso(),
        "tool": _safe_text(safe.get("tool"), 80),
        "reason": _safe_text(safe.get("reason"), 80),
        "summary": _safe_text(safe.get("summary"), 500),
        "args_digest": digest,
        "status": _safe_text(status, 30),
        "error": _safe_text(error, 300),
        "result": result if isinstance(result, dict) else {},
    }
    with LOCK:
        state = _load()
        audit = state.get("audit", []) if isinstance(state.get("audit"), list) else []
        audit.append(event)
        state["audit"] = audit[-MAX_AUDIT:]
        _save(state)
    return event


def public_state():
    with LOCK:
        state = _load()
    pending = []
    now = _now_iso()
    for row in state.get("pending", []) if isinstance(state.get("pending"), list) else []:
        if not isinstance(row, dict) or row.get("expires_at", "") <= now:
            continue
        pending.append({key: row.get(key, "") for key in ("id", "tool", "reason", "summary", "created_at", "expires_at")})
    return {"ok": True, "pending": pending, "audit": state.get("audit", [])[-20:]}
