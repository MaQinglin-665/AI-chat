"""Local, user-editable relationship continuity for the desktop companion.

This module intentionally keeps relationship growth small and explainable.  It
does not retain transcripts, infer intimacy, or grant capabilities.  The only
automatic signal is the number of valid manual turns; interaction preferences
are changed only by an explicit user statement or by an edit in the UI.
"""

from __future__ import annotations

import hashlib
import re
import threading
from datetime import datetime, timezone

from config import MEMORY_PATH
from memory_store import safe_load_json_file, safe_save_json_file
from memory_text import (
    looks_garbled_text,
    looks_sensitive_memory_text,
    looks_stagey_text,
    normalize_memory_text,
)
from memory_correction import has_memory_forget_intent


RELATIONSHIP_STATE_PATH = MEMORY_PATH.parent / "relationship_state.json"
RELATIONSHIP_STATE_LOCK = threading.RLock()
RELATIONSHIP_STATE_SCHEMA_VERSION = 1
FAMILIARITY_KNOWN_TURNS = 6
FAMILIARITY_FAMILIAR_TURNS = 30
MAX_FAMILIARITY_TURNS = 1_000_000
MAX_RECENT_INTERACTION_FINGERPRINTS = 64
INTERACTION_FINGERPRINT_PREFIX = "taffy-relationship-turn-v1:"

PREFERENCE_ORDER = ("address", "reply_length", "advice_style", "teasing")
PREFERENCE_META = {
    "address": {
        "kind": "address",
        "label": "Address the user as",
    },
    "reply_length": {
        "kind": "interaction_style",
        "label": "Preferred reply length",
        "values": {
            "concise": "concise unless more detail is useful",
            "balanced": "balanced and natural",
            "detailed": "more detailed when the topic benefits from it",
        },
    },
    "advice_style": {
        "kind": "interaction_style",
        "label": "Preferred advice style",
        "values": {
            "ask_first": "ask whether advice is wanted before giving it",
            "direct": "give clear, direct advice when advice is requested",
            "comfort_first": "acknowledge feelings before moving to advice",
        },
    },
    "teasing": {
        "kind": "boundary",
        "label": "Playful teasing boundary",
        "values": {
            "none": "do not tease the user",
            "gentle": "occasional gentle teasing is welcome when it fits",
            "playful": "playful teasing is welcome when it fits the moment",
        },
    },
}
ALLOWED_ENTRY_SOURCES = {"manual", "explicit_user"}
ALLOWED_ENTRY_STATUSES = {"active", "pinned"}
ADDRESS_RE = re.compile(r"^[A-Za-z0-9\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff '\-]{0,39}$")


def _now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _safe_int(value, fallback=0, *, minimum=0, maximum=MAX_FAMILIARITY_TURNS):
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(maximum, number))


def _safe_timestamp(value):
    text = normalize_memory_text(value, max_len=48)
    return text if text and not looks_garbled_text(text) else ""


def _coerce_bool(value, fallback=True):
    return value if isinstance(value, bool) else fallback


def _familiarity_level(turns):
    if turns >= FAMILIARITY_FAMILIAR_TURNS:
        return "familiar"
    if turns >= FAMILIARITY_KNOWN_TURNS:
        return "known"
    return "new"


def _empty_state():
    return {
        "schema_version": RELATIONSHIP_STATE_SCHEMA_VERSION,
        "revision": 0,
        "enabled": True,
        "updated_at": "",
        "familiarity": {
            "level": "new",
            "eligible_turns": 0,
        },
        "recent_interaction_fingerprints": [],
        "entries": [],
    }


def _normalize_address(value):
    text = normalize_memory_text(value, max_len=40)
    if not text or looks_garbled_text(text) or looks_sensitive_memory_text(text):
        return ""
    if not ADDRESS_RE.fullmatch(text):
        return ""
    return text


def _normalize_preference_value(key, value):
    key = str(key or "").strip().lower()
    if key not in PREFERENCE_META:
        return ""
    if key == "address":
        return _normalize_address(value)
    candidate = str(value or "").strip().lower()
    return candidate if candidate in PREFERENCE_META[key]["values"] else ""


def _normalize_entry(raw, *, fallback_key=""):
    if not isinstance(raw, dict):
        return None
    key = str(raw.get("key", fallback_key) or "").strip().lower()
    value = _normalize_preference_value(key, raw.get("value", ""))
    if not key or not value:
        return None
    source = str(raw.get("source", "explicit_user") or "").strip().lower()
    if source not in ALLOWED_ENTRY_SOURCES:
        source = "explicit_user"
    status = str(raw.get("status", "active") or "").strip().lower()
    if status not in ALLOWED_ENTRY_STATUSES:
        status = "pinned" if source == "manual" else "active"
    return {
        "key": key,
        "kind": PREFERENCE_META[key]["kind"],
        "value": value,
        "source": source,
        "status": status,
        "evidence_count": _safe_int(raw.get("evidence_count", 1), 1, minimum=1, maximum=99),
        "created_at": _safe_timestamp(raw.get("created_at", "")),
        "updated_at": _safe_timestamp(raw.get("updated_at", "")),
    }


def _normalize_interaction_fingerprints(raw):
    values = raw if isinstance(raw, list) else []
    normalized = []
    for value in values:
        fingerprint = str(value or "").strip().lower()
        if not re.fullmatch(r"[a-f0-9]{64}", fingerprint) or fingerprint in normalized:
            continue
        normalized.append(fingerprint)
    return normalized[-MAX_RECENT_INTERACTION_FINGERPRINTS:]


def _interaction_fingerprint(interaction_id):
    safe = normalize_memory_text(interaction_id, max_len=160)
    if not safe:
        return ""
    return hashlib.sha256(
        f"{INTERACTION_FINGERPRINT_PREFIX}{safe}".encode("utf-8")
    ).hexdigest()


def normalize_relationship_state(raw):
    """Return the only schema accepted for relationship persistence/prompting."""
    src = raw if isinstance(raw, dict) else {}
    normalized = _empty_state()
    normalized["revision"] = _safe_int(src.get("revision", 0), 0, maximum=9_999_999)
    normalized["enabled"] = _coerce_bool(src.get("enabled"), True)
    normalized["updated_at"] = _safe_timestamp(src.get("updated_at", ""))

    familiarity = src.get("familiarity", {})
    if not isinstance(familiarity, dict):
        familiarity = {}
    eligible_turns = _safe_int(familiarity.get("eligible_turns", 0), 0)
    normalized["familiarity"] = {
        "level": _familiarity_level(eligible_turns),
        "eligible_turns": eligible_turns,
    }
    normalized["recent_interaction_fingerprints"] = _normalize_interaction_fingerprints(
        src.get("recent_interaction_fingerprints", [])
    )

    by_key = {}
    entries = src.get("entries", [])
    if isinstance(entries, list):
        for raw_entry in entries:
            entry = _normalize_entry(raw_entry)
            if entry:
                by_key[entry["key"]] = entry
    normalized["entries"] = [by_key[key] for key in PREFERENCE_ORDER if key in by_key]
    return normalized


def load_relationship_state():
    return normalize_relationship_state(safe_load_json_file(RELATIONSHIP_STATE_PATH, {}))


def _save_relationship_state(state):
    safe_save_json_file(RELATIONSHIP_STATE_PATH, normalize_relationship_state(state))


def is_relationship_state_feature_enabled(config):
    cfg = config.get("relationship_state", {}) if isinstance(config, dict) else {}
    return bool(cfg.get("enabled", False)) if isinstance(cfg, dict) else False


def _public_state(state):
    normalized = normalize_relationship_state(state)
    return {
        "schema_version": normalized["schema_version"],
        "revision": normalized["revision"],
        "enabled": normalized["enabled"],
        "updated_at": normalized["updated_at"],
        "familiarity": dict(normalized["familiarity"]),
        "entries": [dict(entry) for entry in normalized["entries"]],
    }


def get_relationship_state_for_client(config):
    with RELATIONSHIP_STATE_LOCK:
        state = load_relationship_state()
    return {
        "ok": True,
        "available": is_relationship_state_feature_enabled(config),
        "state": _public_state(state),
    }


def _entry_map(state):
    return {entry["key"]: dict(entry) for entry in state.get("entries", []) if isinstance(entry, dict)}


def _store_entry(entry_map, key, value, *, source, status, now, evidence_count=None):
    existing = entry_map.get(key, {})
    entry_map[key] = {
        "key": key,
        "kind": PREFERENCE_META[key]["kind"],
        "value": value,
        "source": source,
        "status": status,
        "evidence_count": _safe_int(
            evidence_count if evidence_count is not None else existing.get("evidence_count", 1),
            1,
            minimum=1,
            maximum=99,
        ),
        "created_at": _safe_timestamp(existing.get("created_at", "")) or now,
        "updated_at": now,
    }


def _finalize_state(state, *, now):
    state["schema_version"] = RELATIONSHIP_STATE_SCHEMA_VERSION
    state["revision"] = _safe_int(state.get("revision", 0), 0, maximum=9_999_999) + 1
    state["updated_at"] = now
    state["familiarity"] = {
        "eligible_turns": _safe_int(state.get("familiarity", {}).get("eligible_turns", 0), 0),
        "level": _familiarity_level(
            _safe_int(state.get("familiarity", {}).get("eligible_turns", 0), 0)
        ),
    }
    entry_map = _entry_map(state)
    state["entries"] = [entry_map[key] for key in PREFERENCE_ORDER if key in entry_map]
    return normalize_relationship_state(state)


def _error_payload(config, message):
    with RELATIONSHIP_STATE_LOCK:
        state = load_relationship_state()
    return {
        "ok": False,
        "available": is_relationship_state_feature_enabled(config),
        "error": message,
        "state": _public_state(state),
    }


def _parse_upsert_entries(entries):
    if not isinstance(entries, list):
        return None, "entries must be a list."
    updates = {}
    for raw in entries:
        if not isinstance(raw, dict):
            return None, "Each relationship entry must be an object."
        key = str(raw.get("key", "") or "").strip().lower()
        if key not in PREFERENCE_META:
            return None, "This relationship preference is not supported."
        if key in updates:
            return None, "Each relationship preference can only be supplied once."
        raw_value = raw.get("value", "")
        if raw_value is None or not str(raw_value).strip():
            updates[key] = ""
            continue
        value = _normalize_preference_value(key, raw_value)
        if not value:
            return None, "The relationship preference value is invalid."
        updates[key] = value
    return updates, ""


def _parse_delete_keys(entries):
    if not isinstance(entries, list):
        return None, "entries must be a list."
    keys = []
    for raw in entries:
        key = raw.get("key", "") if isinstance(raw, dict) else raw
        key = str(key or "").strip().lower()
        if key not in PREFERENCE_META:
            return None, "This relationship preference is not supported."
        if key not in keys:
            keys.append(key)
    return keys, ""


def update_relationship_state(config, *, action, entries=None, enabled=None):
    """Apply a bounded UI mutation and return a public, transcript-free payload."""
    if not is_relationship_state_feature_enabled(config):
        return _error_payload(config, "Relationship continuity is disabled in this configuration.")

    action = str(action or "").strip().lower()
    if action not in {"upsert", "delete", "reset", "set_enabled"}:
        return _error_payload(config, "Unsupported relationship state action.")
    if action in {"upsert", "set_enabled"} and enabled is not None and not isinstance(enabled, bool):
        return _error_payload(config, "enabled must be a boolean.")

    updates = {}
    if action == "upsert":
        updates, error = _parse_upsert_entries(entries if entries is not None else [])
        if error:
            return _error_payload(config, error)
        if not updates and enabled is None:
            return _error_payload(config, "Choose a relationship preference to update.")
    elif action == "delete":
        updates, error = _parse_delete_keys(entries if entries is not None else [])
        if error:
            return _error_payload(config, error)
        if not updates:
            return _error_payload(config, "Choose a relationship preference to remove.")
    elif action == "set_enabled" and not isinstance(enabled, bool):
        return _error_payload(config, "enabled must be a boolean.")

    now = _now_iso()
    with RELATIONSHIP_STATE_LOCK:
        state = load_relationship_state()
        if action == "reset":
            previous_revision = state["revision"]
            state = _empty_state()
            state["revision"] = previous_revision
            state["enabled"] = True
        elif action == "set_enabled":
            state["enabled"] = enabled
        elif action == "delete":
            entry_map = _entry_map(state)
            for key in updates:
                entry_map.pop(key, None)
            state["entries"] = [entry_map[key] for key in PREFERENCE_ORDER if key in entry_map]
        else:
            entry_map = _entry_map(state)
            for key, value in updates.items():
                if value:
                    _store_entry(
                        entry_map,
                        key,
                        value,
                        source="manual",
                        status="pinned",
                        now=now,
                        evidence_count=1,
                    )
                else:
                    entry_map.pop(key, None)
            if enabled is not None:
                state["enabled"] = enabled
            state["entries"] = [entry_map[key] for key in PREFERENCE_ORDER if key in entry_map]
        state = _finalize_state(state, now=now)
        _save_relationship_state(state)

    return {
        "ok": True,
        "available": True,
        "state": _public_state(state),
    }


def _is_plausible_address(value):
    address = _normalize_address(value)
    if not address:
        return ""
    lower = address.casefold()
    words = re.findall(r"[a-z]+", lower)
    if len(words) > 4:
        return ""
    rejected_words = {
        "a", "an", "the", "after", "before", "back", "because", "if",
        "later", "liar", "ready", "then", "when", "where", "why", "you",
    }
    if any(word in rejected_words for word in words):
        return ""
    if lower in {"me", "you", "someone", "something"}:
        return ""
    return address


def _extract_explicit_address_preference(text):
    if re.search(r"[?？]", text):
        return ""
    patterns = (
        r"^(?:please\s+)?(?:(?:you\s+)?(?:can|may)\s+)?(?:call|address)\s+me(?:\s+as)?\s+(.+?)$",
        r"^my\s+name\s+is\s+(.+?)$",
        r"^(?:请|以后|可以)?(?:叫我|称呼我)(?:为|作)?\s*(.+?)$",
        r"^我的名字是\s*(.+?)$",
    )
    for raw_clause in re.split(r"[.!。！？;；]+", text):
        clause = raw_clause.strip()
        if not clause:
            continue
        for pattern in patterns:
            match = re.fullmatch(pattern, clause, flags=re.IGNORECASE)
            if match:
                address = _is_plausible_address(match.group(1).strip())
                if address:
                    return address
    return ""


def extract_explicit_relationship_preferences(user_message):
    """Extract only clear, low-risk preference corrections from the current turn."""
    text = normalize_memory_text(user_message, max_len=240)
    if not text or looks_garbled_text(text) or looks_sensitive_memory_text(text):
        return {}
    if extract_explicit_relationship_forget_keys(text):
        return {}
    lower = text.casefold()
    found = {}

    address = _extract_explicit_address_preference(text)
    if address:
        found["address"] = address

    if re.search(r"(?:不要|别|先别).{0,8}(?:直接给|直接说|建议)|ask\s+(?:me\s+)?(?:first|before).{0,24}(?:advice|suggest)", lower):
        found["advice_style"] = "ask_first"
    elif re.search(r"(?:先安慰|先共情|安慰我再|comfort\s+(?:me\s+)?first|empathy\s+first)", lower):
        found["advice_style"] = "comfort_first"
    elif re.search(r"(?:直接说|直说|直接给(?:我)?建议|be\s+direct|just\s+(?:tell|say))", lower):
        found["advice_style"] = "direct"

    if re.search(r"(?:别|不要).{0,6}(?:吐槽|调侃)|(?:don'?t|no)\s+(?:tease|teasing)", lower):
        found["teasing"] = "none"
    elif re.search(r"(?:轻微|轻轻|温和).{0,4}(?:吐槽|调侃)|gentle\s+teas", lower):
        found["teasing"] = "gentle"
    elif re.search(r"(?:可以|欢迎).{0,5}(?:吐槽|调侃)|(?:you\s+can|please)\s+tease\s+me", lower):
        found["teasing"] = "playful"

    if re.search(r"(?:回复|回答|说话).{0,10}(?:简短|短一点|简洁|精简)|(?:不要|别).{0,8}(?:太长|长篇)|(?:keep\s+(?:it\s+)?)?(?:shorter|brief|concise)|(?:reply|answer).{0,16}(?:short|brief|concise)", lower):
        found["reply_length"] = "concise"
    elif re.search(r"(?:详细一点|多说一点|展开说|讲细一点)|(?:more\s+detail|more\s+detailed|longer\s+(?:reply|answer))", lower):
        found["reply_length"] = "detailed"

    return {key: found[key] for key in PREFERENCE_ORDER if key in found}


def extract_explicit_relationship_forget_keys(user_message):
    """Return only allowlisted relationship preferences explicitly targeted for forgetting."""
    text = normalize_memory_text(user_message, max_len=240)
    if not text or looks_garbled_text(text) or looks_sensitive_memory_text(text):
        return []
    if not has_memory_forget_intent(text):
        return []
    lower = text.casefold()
    keys = []
    address_match = re.search(
        r"(?:call|address)\s+me(?:\s+as)?\s+(.+?)(?:[.!?]|$)",
        text,
        flags=re.IGNORECASE,
    )
    chinese_address_match = re.search(r"(?:叫我|称呼我)(?:为|作)?\s*(.+?)(?:[。！？]|$)", text)
    address_forget = bool(
        re.search(r"(?:forget|delete|remove|clear).{0,24}(?:my\s+)?(?:address|name)", lower)
        or re.search(r"(?:忘掉|忘记|删除|清除).{0,16}(?:称呼|名字)", text)
    )
    if address_match and _is_plausible_address(address_match.group(1).strip()):
        address_forget = True
    if chinese_address_match and _is_plausible_address(chinese_address_match.group(1).strip()):
        address_forget = True
    if address_forget:
        keys.append("address")
    if re.search(r"(?:tease|teasing)|\u5410\u69fd|\u8c03\u4f83", lower, flags=re.IGNORECASE):
        keys.append("teasing")
    if re.search(r"(?:reply|answer).{0,16}(?:short|brief|concise|detail|long)|\u56de\u590d|\u56de\u7b54", lower, flags=re.IGNORECASE):
        keys.append("reply_length")
    if re.search(r"(?:advice|suggest)|\u5efa\u8bae", lower, flags=re.IGNORECASE):
        keys.append("advice_style")
    return [key for key in PREFERENCE_ORDER if key in keys]


def record_relationship_interaction(
    config,
    user_message,
    assistant_reply,
    *,
    is_auto=False,
    interaction_id="",
):
    """Advance familiarity and retain only explicit, safe preference corrections."""
    if is_auto or not is_relationship_state_feature_enabled(config):
        return False
    user = normalize_memory_text(user_message, max_len=240)
    assistant = normalize_memory_text(assistant_reply, max_len=280)
    if len(user) < 2 or len(assistant) < 2:
        return False
    if looks_garbled_text(user) or looks_garbled_text(assistant) or looks_stagey_text(assistant):
        return False

    forget_keys = extract_explicit_relationship_forget_keys(user)
    explicit_preferences = {} if forget_keys else extract_explicit_relationship_preferences(user)
    interaction_fingerprint = _interaction_fingerprint(interaction_id)
    now = _now_iso()
    with RELATIONSHIP_STATE_LOCK:
        state = load_relationship_state()
        if not state["enabled"]:
            return False
        if interaction_fingerprint and interaction_fingerprint in state["recent_interaction_fingerprints"]:
            return False
        familiarity = state["familiarity"]
        familiarity["eligible_turns"] = _safe_int(familiarity.get("eligible_turns", 0), 0) + 1
        entry_map = _entry_map(state)
        for key in forget_keys:
            entry_map.pop(key, None)
        for key, value in explicit_preferences.items():
            existing = entry_map.get(key, {})
            same_value = existing.get("value") == value
            evidence_count = _safe_int(existing.get("evidence_count", 0), 0, minimum=0, maximum=98) + 1 if same_value else 1
            _store_entry(
                entry_map,
                key,
                value,
                source="explicit_user",
                status="active",
                now=now,
                evidence_count=evidence_count,
            )
        state["entries"] = [entry_map[key] for key in PREFERENCE_ORDER if key in entry_map]
        if interaction_fingerprint:
            state["recent_interaction_fingerprints"] = [
                *state["recent_interaction_fingerprints"],
                interaction_fingerprint,
            ][-MAX_RECENT_INTERACTION_FINGERPRINTS:]
        state = _finalize_state(state, now=now)
        _save_relationship_state(state)
    return True


def build_relationship_state_prompt_block(config):
    """Build a small structured prompt snapshot with no raw conversation content."""
    if not is_relationship_state_feature_enabled(config):
        return ""
    with RELATIONSHIP_STATE_LOCK:
        state = load_relationship_state()
    if not state["enabled"]:
        return ""

    familiarity = state["familiarity"]
    lines = [
        "[Relationship continuity — local and user-editable]",
        (
            f"- Familiarity: {familiarity['level']} after "
            f"{familiarity['eligible_turns']} valid manual turns. This only signals conversation continuity; "
            "it is not human feeling, dependency, consent, relationship escalation, or extra permission."
        ),
        "- The current user message and any explicit correction always override this snapshot.",
        "- Treat these as soft interaction preferences. Do not invent memories, private access, or capabilities.",
    ]
    for entry in state["entries"][: len(PREFERENCE_ORDER)]:
        key = entry["key"]
        if key == "address":
            value = f"use '{entry['value']}' when a name fits naturally"
        else:
            value = PREFERENCE_META[key]["values"].get(entry["value"], "")
        if value:
            lines.append(f"- {PREFERENCE_META[key]['label']}: {value}.")
    return "\n".join(lines)
