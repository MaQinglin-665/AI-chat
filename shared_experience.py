"""Small, local, user-controllable shared-experience memory.

This is deliberately separate from transcript memory: it stores only a few
validated episodic core-memory summaries, never raw chat logs.  The prompt
block is soft context, so a model may use a recalled moment only when it gives
the current turn a genuine conversational opening.
"""

from __future__ import annotations

import hashlib
import re
import threading
from datetime import datetime, timedelta, timezone

from config import MEMORY_PATH
from memory_store import safe_load_json_file, safe_save_json_file
from memory_text import (
    looks_garbled_text,
    looks_sensitive_memory_text,
    looks_stagey_text,
    normalize_memory_text,
    tokenize_memory_text,
)


SHARED_EXPERIENCE_PATH = MEMORY_PATH.parent / "memory_shared_experiences.json"
LOCK = threading.RLock()
SCHEMA_VERSION = 1
MAX_ITEMS = 36
MAX_TEXT_LEN = 140
_UNSAFE_TEXT_RE = re.compile(
    r"(?i)(?:\b(?:api[_ -]?key|secret|password|passwd|token)\s*[:=]|"
    r"\b(?:bearer|sk-|ghp_|github_pat_)|<[^>]{1,80}>)"
)


def _now():
    return datetime.now(timezone.utc).astimezone()


def _now_iso():
    return _now().isoformat(timespec="seconds")


def _settings(config):
    raw = config.get("shared_experience_memory", {}) if isinstance(config, dict) else {}
    raw = raw if isinstance(raw, dict) else {}
    try:
        inject_count = int(raw.get("inject_count", 1))
    except (TypeError, ValueError):
        inject_count = 1
    try:
        cooldown_hours = int(raw.get("proactive_recall_cooldown_hours", 24))
    except (TypeError, ValueError):
        cooldown_hours = 24
    return {
        "enabled": bool(raw.get("enabled", True)),
        "inject_count": max(0, min(2, inject_count)),
        "proactive_recall_cooldown_hours": max(1, min(24 * 30, cooldown_hours)),
    }


def _empty():
    return {"schema_version": SCHEMA_VERSION, "items": []}


def _clean_item(raw):
    if not isinstance(raw, dict):
        return None
    text = normalize_memory_text(raw.get("text", ""), max_len=MAX_TEXT_LEN)
    if (
        len(text) < 6
        or looks_garbled_text(text)
        or looks_sensitive_memory_text(text)
        or looks_stagey_text(text)
        or _UNSAFE_TEXT_RE.search(text)
    ):
        return None
    item_id = str(raw.get("id", "")).strip().lower()
    if not re.fullmatch(r"[a-f0-9]{16,64}", item_id):
        item_id = hashlib.sha256(("taffy-shared-experience-v1:" + text).encode("utf-8")).hexdigest()
    return {
        "id": item_id,
        "text": text,
        "created_at": normalize_memory_text(raw.get("created_at", ""), max_len=48),
        "updated_at": normalize_memory_text(raw.get("updated_at", ""), max_len=48),
        "last_recalled_at": normalize_memory_text(raw.get("last_recalled_at", ""), max_len=48),
        "support_count": max(1, min(99, int(raw.get("support_count", 1) or 1))),
    }


def _load():
    raw = safe_load_json_file(SHARED_EXPERIENCE_PATH, _empty())
    items = []
    seen = set()
    for value in raw.get("items", []) if isinstance(raw, dict) else []:
        item = _clean_item(value)
        if item and item["id"] not in seen:
            items.append(item)
            seen.add(item["id"])
    return {"schema_version": SCHEMA_VERSION, "items": items[-MAX_ITEMS:]}


def _save(state):
    safe_save_json_file(SHARED_EXPERIENCE_PATH, state)


def _is_shared_episodic_candidate(candidate):
    safe = candidate if isinstance(candidate, dict) else {}
    text = normalize_memory_text(safe.get("text", ""), max_len=MAX_TEXT_LEN)
    category = str(safe.get("category", "")).strip().lower()
    kind = str(safe.get("kind", "")).strip().lower()
    if kind != "episodic" or category not in {"project_context", "recent_event", "relationship"}:
        return False
    # Keep only moments with a real shared action, a concrete milestone, or a
    # clearly relationship-relevant event. This avoids turning ordinary chat
    # into a diary.
    return bool(re.search(r"(我们|一起|共同|这次|终于|完成|修复|决定|约定|开始|推进|做完|合作|shared|together|finished|fixed|decided)", text, re.I))


def record_from_core_candidates(config, candidates):
    """Persist eligible core summaries without making an additional LLM call."""
    if not _settings(config)["enabled"]:
        return 0
    eligible = []
    for candidate in candidates if isinstance(candidates, list) else []:
        if _is_shared_episodic_candidate(candidate):
            item = _clean_item({"text": candidate.get("text", "")})
            if item and item["text"] not in [row["text"] for row in eligible]:
                eligible.append(item)
    if not eligible:
        return 0
    now = _now_iso()
    stored = 0
    with LOCK:
        state = _load()
        for item in eligible[:2]:
            existing = next((row for row in state["items"] if row["id"] == item["id"]), None)
            if existing:
                existing["support_count"] = min(99, existing["support_count"] + 1)
                existing["updated_at"] = now
            else:
                item["created_at"] = now
                item["updated_at"] = now
                state["items"].append(item)
                stored += 1
        state["items"] = state["items"][-MAX_ITEMS:]
        _save(state)
    return stored


def _parse_time(value):
    try:
        return datetime.fromisoformat(str(value or ""))
    except (TypeError, ValueError):
        return None


def build_prompt_block(config, user_message, *, is_auto=False):
    settings = _settings(config)
    if not settings["enabled"] or settings["inject_count"] <= 0:
        return ""
    query_tokens = tokenize_memory_text(user_message)
    with LOCK:
        state = _load()
        candidates = list(state["items"])
        if not candidates:
            return ""
        if is_auto:
            cutoff = _now() - timedelta(hours=settings["proactive_recall_cooldown_hours"])
            candidates = [
                row for row in candidates
                if not (stamp := _parse_time(row.get("last_recalled_at"))) or stamp <= cutoff
            ]
            candidates.sort(key=lambda row: (row.get("updated_at", ""), row.get("support_count", 0)), reverse=True)
        else:
            scored = []
            for row in candidates:
                overlap = len(query_tokens & tokenize_memory_text(row["text"]))
                if overlap:
                    scored.append((overlap, row))
            scored.sort(key=lambda pair: (pair[0], pair[1].get("updated_at", "")), reverse=True)
            candidates = [row for _score, row in scored]
        chosen = candidates[: settings["inject_count"]]
        if not chosen:
            return ""
        if is_auto:
            now = _now_iso()
            chosen_ids = {row["id"] for row in chosen}
            for row in state["items"]:
                if row["id"] in chosen_ids:
                    row["last_recalled_at"] = now
            _save(state)

    lines = [
        "[Shared experiences — local, selective, and user-editable]",
        "These are concise records of things you and the user actually worked through together. Use one only when it makes the current reply warmer or more relevant.",
        "For a proactive check-in, mention it only with a natural reason or current connection; never present it as a reminder, checklist, or proof of closeness. Do not invent details beyond the record.",
    ]
    lines.extend(f"- {row['text']}" for row in chosen)
    return "\n".join(lines)
