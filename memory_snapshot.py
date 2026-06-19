import json


def _clamp_int(value, default, min_value, max_value):
    try:
        num = int(value)
    except (TypeError, ValueError):
        num = int(default)
    return max(int(min_value), min(int(max_value), num))


def _default_normalize_text(value, max_len=220):
    return " ".join(str(value or "").split()).strip()[:max_len]


def _normalize(normalize_text_func, value, max_len=220):
    func = normalize_text_func or _default_normalize_text
    return func(value, max_len=max_len)


def _compact_ids(values, limit=8):
    if not isinstance(values, list):
        return []
    return [
        str(item_id or "").strip()[:80]
        for item_id in values
        if str(item_id or "").strip()
    ][:limit]


def learning_quick_settings(state):
    raw = state.get("quick_settings", {}) if isinstance(state, dict) else {}
    if not isinstance(raw, dict):
        raw = {}
    try:
        inject_count = int(raw.get("inject_count", 1) or 0)
    except (TypeError, ValueError):
        inject_count = 1
    try:
        promotion_min_support = int(raw.get("promotion_min_support", 1) or 1)
    except (TypeError, ValueError):
        promotion_min_support = 1
    return {
        "inject_count": 1 if inject_count >= 1 else 0,
        "promotion_min_support": 2 if promotion_min_support >= 2 else 1,
    }


def build_learning_review_payload(candidates, samples, state, message=""):
    return {
        "ok": True,
        "message": str(message or "").strip(),
        "candidates": candidates,
        "samples": samples,
        "quick_settings": learning_quick_settings(state),
        "state": {
            "degraded_mode": bool((state or {}).get("degraded_mode", False)),
            "turn_count": int((state or {}).get("turn_count", 0) or 0),
        },
    }


def snapshot_learning_review(candidates, samples, state):
    try:
        safe_candidates = json.loads(json.dumps(candidates, ensure_ascii=False))
        safe_samples = json.loads(json.dumps(samples, ensure_ascii=False))
    except Exception:
        safe_candidates = []
        safe_samples = []
    return {
        "candidates": safe_candidates if isinstance(safe_candidates, list) else [],
        "samples": safe_samples if isinstance(safe_samples, list) else [],
        "quick_settings": learning_quick_settings(state),
        "degraded_mode": bool((state or {}).get("degraded_mode", False)),
    }


def compact_short_term_memory_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "turn_index": _clamp_int(safe.get("turn_index", 0), 0, 0, 999999),
        "stored": _clamp_int(safe.get("stored", 0), 0, 0, 20),
        "merged": _clamp_int(safe.get("merged", 0), 0, 0, 20),
        "expired": _clamp_int(safe.get("expired", 0), 0, 0, 999),
        "memory_ids": _compact_ids(safe.get("memory_ids", [])),
    }


def compact_learning_extraction_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "candidate_id": str(safe.get("candidate_id", "")).strip()[:80],
        "category": str(safe.get("category", "")).strip()[:40],
        "score": safe.get("score", 0),
        "confidence": safe.get("confidence", 0),
        "support_count": safe.get("support_count", 0),
        "action": str(safe.get("action", "")).strip()[:40],
    }


def compact_core_memory_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "action": str(safe.get("action", "")).strip()[:40],
        "stored": _clamp_int(safe.get("stored", 0), 0, 0, 20),
        "merged": _clamp_int(safe.get("merged", 0), 0, 0, 20),
        "source": str(safe.get("source", "")).strip()[:40],
        "memory_ids": _compact_ids(safe.get("memory_ids", [])),
    }


def compact_memory_consolidation_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "action": str(safe.get("action", "")).strip()[:40],
        "scanned": _clamp_int(safe.get("scanned", 0), 0, 0, 999),
        "candidates": _clamp_int(safe.get("candidates", 0), 0, 0, 80),
        "stored": _clamp_int(safe.get("stored", 0), 0, 0, 80),
        "merged": _clamp_int(safe.get("merged", 0), 0, 0, 80),
        "short_ids": _compact_ids(safe.get("short_ids", [])),
        "memory_ids": _compact_ids(safe.get("memory_ids", [])),
    }


def compact_memory_correction_debug(snapshot):
    safe = snapshot if isinstance(snapshot, dict) else {}
    return {
        "at": str(safe.get("at", "")).strip()[:40],
        "status": str(safe.get("status", "")).strip()[:40],
        "reason": str(safe.get("reason", "")).strip()[:80],
        "action": str(safe.get("action", "")).strip()[:40],
        "core_changed": _clamp_int(safe.get("core_changed", 0), 0, 0, 80),
        "short_changed": _clamp_int(safe.get("short_changed", 0), 0, 0, 80),
        "score": safe.get("score", 0),
        "memory_ids": _compact_ids(safe.get("memory_ids", [])),
        "short_ids": _compact_ids(safe.get("short_ids", [])),
    }


def compact_core_memory_prompt_item(item, score=None, normalize_text_func=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": "core_memory",
        "kind": str(safe.get("memory_kind") or safe.get("kind", "")).strip()[:24],
        "category": str(safe.get("category", "")).strip()[:40],
        "text": _normalize(normalize_text_func, safe.get("text", ""), max_len=120),
        "importance": safe.get("importance", 0),
        "confidence": safe.get("confidence", 0),
        "pinned": bool(safe.get("pinned", False)),
        "created_at": str(safe.get("created_at", "")).strip()[:40],
        "updated_at": str(safe.get("updated_at", "")).strip()[:40],
    }
    if score is not None:
        try:
            out["relevance"] = int(score)
        except (TypeError, ValueError):
            out["relevance"] = 0
    return out


def compact_short_term_memory_prompt_item(item, score=None, normalize_text_func=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": "short_term_memory",
        "kind": str(safe.get("kind", "")).strip()[:40],
        "text": _normalize(normalize_text_func, safe.get("text", ""), max_len=120),
        "salience": safe.get("salience", 0),
        "last_seen_turn": safe.get("last_seen_turn", 0),
        "ttl_turns": safe.get("ttl_turns", 0),
        "support_count": safe.get("support_count", 0),
        "consolidated_at": str(safe.get("consolidated_at", "")).strip()[:40],
        "updated_at": str(safe.get("updated_at", "")).strip()[:40],
    }
    if score is not None:
        try:
            out["relevance"] = int(score)
        except (TypeError, ValueError):
            out["relevance"] = 0
    return out


def compact_learning_prompt_item(item, score=None, normalize_text_func=None):
    safe = item if isinstance(item, dict) else {}
    out = {
        "id": str(safe.get("id", "")).strip()[:80],
        "source": "learning_sample",
        "score": safe.get("score", 0),
        "confidence": safe.get("confidence", 0),
        "support_count": safe.get("support_count", 0),
        "user_preview": _normalize(normalize_text_func, safe.get("user_preview", ""), max_len=90),
        "assistant_preview": _normalize(normalize_text_func, safe.get("assistant_preview", ""), max_len=90),
        "compressed_pattern": _normalize(normalize_text_func, safe.get("compressed_pattern", ""), max_len=110),
    }
    if score is not None:
        try:
            out["relevance"] = int(score)
        except (TypeError, ValueError):
            out["relevance"] = 0
    return out


def compact_learning_audit_item(item):
    safe = item if isinstance(item, dict) else {}
    detail = safe.get("detail") if isinstance(safe.get("detail"), dict) else {}
    compact_detail = {}
    for key in ("candidate_ids", "promoted", "skipped", "pool", "ids", "delta", "changed"):
        if key in detail:
            compact_detail[key] = detail.get(key)
    return {
        "id": str(safe.get("id", ""))[:64],
        "ts": str(safe.get("ts", ""))[:40],
        "action": str(safe.get("action", safe.get("event", "")))[:48],
        "event": str(safe.get("event", ""))[:48],
        "detail": compact_detail,
    }


def compact_learning_item(item, normalize_text_func=None):
    safe = item if isinstance(item, dict) else {}
    return {
        "id": str(safe.get("id", "")).strip(),
        "status": str(safe.get("status", "")).strip(),
        "score": safe.get("score", 0),
        "confidence": safe.get("confidence", 0),
        "support_count": safe.get("support_count", 0),
        "assistant_preview": _normalize(normalize_text_func, safe.get("assistant_preview", ""), max_len=90),
        "compressed_pattern": _normalize(normalize_text_func, safe.get("compressed_pattern", ""), max_len=110),
    }


def _compact_learning_health_window(window):
    safe = window if isinstance(window, dict) else {}
    return {
        "window_ended_at": str(safe.get("window_ended_at", "")).strip(),
        "window_size": safe.get("window_size", 0),
        "candidate_in_rate": safe.get("candidate_in_rate", 0),
        "avg_confidence": safe.get("avg_confidence", 0),
        "signal_coverage": safe.get("signal_coverage", 0),
    }


def _compact_learning_event(event):
    safe = event if isinstance(event, dict) else {}
    return {
        "ts": str(safe.get("ts", "")).strip(),
        "event": str(safe.get("event", "")).strip(),
        "reason": str(safe.get("reason", "")).strip(),
        "window_count": safe.get("window_count", 0),
    }


def _avg_numeric_field(items, key):
    values = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        try:
            values.append(float(item.get(key, 0) or 0))
        except (TypeError, ValueError):
            continue
    if not values:
        return 0
    return round(sum(values) / len(values), 4)


def _rate_positive_field(items, key):
    valid = [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []
    if not valid:
        return 0
    positives = 0
    for item in valid:
        try:
            if float(item.get(key, 0) or 0) > 0:
                positives += 1
        except (TypeError, ValueError):
            continue
    return round(positives / len(valid), 4)


def build_learning_diagnostics(
    candidates,
    samples,
    state,
    *,
    normalize_text_func=None,
    learning_text_garbled_func=None,
):
    is_garbled = learning_text_garbled_func or (lambda _item: False)
    candidate_items = [item for item in candidates if isinstance(item, dict)]
    sample_items = [item for item in samples if isinstance(item, dict)]
    all_items = candidate_items + sample_items
    garbled_items = [item for item in all_items if is_garbled(item)]
    events = state.get("events", []) if isinstance(state, dict) else []
    if not isinstance(events, list):
        events = []
    health_windows = state.get("health_windows", []) if isinstance(state, dict) else []
    if not isinstance(health_windows, list):
        health_windows = []
    current_window = state.get("current_window", []) if isinstance(state, dict) else []
    if not isinstance(current_window, list):
        current_window = []

    degraded_events = [
        _compact_learning_event(item)
        for item in events
        if isinstance(item, dict) and str(item.get("event", "")).strip()
    ]
    latest_degraded = degraded_events[-1] if degraded_events else {}
    return {
        "degraded_reason": latest_degraded.get("reason", ""),
        "latest_event": latest_degraded,
        "health_windows": [
            _compact_learning_health_window(item)
            for item in health_windows[-3:]
            if isinstance(item, dict)
        ],
        "current_window_size": len(current_window),
        "current_window_avg_confidence": _avg_numeric_field(current_window, "confidence"),
        "current_window_signal_coverage": _rate_positive_field(current_window, "signal_count"),
        "garbled_count": len(garbled_items),
        "garbled_candidates_count": sum(1 for item in candidate_items if is_garbled(item)),
        "garbled_samples_count": sum(1 for item in sample_items if is_garbled(item)),
        "garbled_examples": [
            compact_learning_item(item, normalize_text_func=normalize_text_func)
            for item in garbled_items[:3]
        ],
    }


def _is_pending_learning_candidate(item):
    if not isinstance(item, dict):
        return False
    status = str(item.get("status", "candidate") or "candidate").strip().lower()
    return status in {"", "candidate"}


def _is_active_learning_sample(item):
    if not isinstance(item, dict):
        return False
    status = str(item.get("status", "active") or "active").strip().lower()
    return status not in {"archived", "deleted", "rejected"}


def build_learning_review_status(
    settings,
    candidates,
    samples,
    state,
    memory_count,
    *,
    learning_sample_prompt_eligible_func=None,
):
    quick = learning_quick_settings(state)
    inject_limit = max(0, int(settings.get("learning_inject_count", 0) or 0))
    quick_injection_enabled = bool(quick.get("inject_count", 1) >= 1)
    samples_enabled = bool(settings.get("enabled", True) and settings.get("learning_samples_enabled", True))
    prompt_injection_enabled = bool(samples_enabled and quick_injection_enabled and inject_limit > 0)
    eligible_func = learning_sample_prompt_eligible_func or (lambda _item, _settings: False)
    prompt_eligible_samples = [
        item for item in samples
        if eligible_func(item, settings)
    ]
    return {
        "enabled": bool(settings.get("enabled", True)),
        "mem0_enabled": bool(settings.get("mem0_enabled", False)),
        "memory_count": int(memory_count or 0),
        "candidates_enabled": bool(settings.get("learning_candidates_enabled", True)),
        "samples_enabled": samples_enabled,
        "quick_injection_enabled": quick_injection_enabled,
        "prompt_injection_enabled": prompt_injection_enabled,
        "prompt_inject_limit": inject_limit,
        "prompt_inject_effective_limit": inject_limit if prompt_injection_enabled else 0,
        "candidate_total": len(candidates),
        "pending_review_count": sum(1 for item in candidates if _is_pending_learning_candidate(item)),
        "sample_total": len(samples),
        "active_sample_count": sum(1 for item in samples if _is_active_learning_sample(item)),
        "prompt_eligible_sample_count": len(prompt_eligible_samples),
        "candidate_max_items": int(settings.get("learning_candidate_max_items", 0) or 0),
        "candidate_min_score": settings.get("learning_candidate_min_score", 0),
        "candidate_min_confidence": settings.get("learning_candidate_min_confidence", 0),
        "sample_min_score": settings.get("learning_min_score", 0),
        "sample_min_confidence": settings.get("learning_min_confidence", 0),
        "candidates_affect_prompt": False,
        "requires_user_promotion": True,
        "sensitive_filter_enabled": True,
        "local_only": True,
        "input_scope": "chat_turn_text_only",
        "degraded_mode": bool((state or {}).get("degraded_mode", False)),
    }


def build_memory_debug_snapshot_payload(
    *,
    settings,
    memory_count,
    short_state,
    short_items,
    core_items,
    last_memory_debug,
    last_learning_extraction_debug,
    last_short_debug,
    last_core_debug,
    last_consolidation_debug,
    last_correction_debug,
    candidates,
    samples,
    learning_state,
    recent_audit,
    recent_shadow,
    normalize_text_func=None,
    learning_sample_prompt_eligible_func=None,
    learning_text_garbled_func=None,
):
    review_status = build_learning_review_status(
        settings,
        candidates,
        samples,
        learning_state,
        memory_count,
        learning_sample_prompt_eligible_func=learning_sample_prompt_eligible_func,
    )
    return {
        "ok": True,
        "memory": {
            "enabled": bool(settings["enabled"]),
            "mem0_enabled": bool(settings["mem0_enabled"]),
            "memory_count": memory_count,
            "last_selection": last_memory_debug if isinstance(last_memory_debug, dict) else {},
        },
        "short_memory": {
            "enabled": bool(settings["short_enabled"]),
            "count": len(short_items),
            "turn_index": int(short_state.get("turn_index", 0) or 0),
            "inject_count": settings["short_inject_count"],
            "ttl_turns": settings["short_ttl_turns"],
            "consolidation_enabled": bool(settings["memory_consolidation_enabled"]),
            "consolidation_min_support": settings["memory_consolidation_min_support"],
            "last_update": compact_short_term_memory_debug(last_short_debug),
            "last_consolidation": compact_memory_consolidation_debug(last_consolidation_debug),
            "recent": [
                compact_short_term_memory_prompt_item(item, normalize_text_func=normalize_text_func)
                for item in short_items[:5]
            ],
        },
        "core_memory": {
            "enabled": bool(settings["core_enabled"]),
            "extraction_enabled": bool(settings["core_extraction_enabled"]),
            "correction_enabled": bool(settings["memory_correction_enabled"]),
            "count": len(core_items),
            "inject_count": settings["core_inject_count"],
            "min_importance": settings["core_min_importance"],
            "min_confidence": settings["core_min_confidence"],
            "last_extraction": compact_core_memory_debug(last_core_debug),
            "last_correction": compact_memory_correction_debug(last_correction_debug),
            "recent": [
                compact_core_memory_prompt_item(item, normalize_text_func=normalize_text_func)
                for item in core_items[-5:]
            ],
        },
        "learning": {
            "candidates_count": len(candidates),
            "samples_count": len(samples),
            "last_extraction": compact_learning_extraction_debug(last_learning_extraction_debug),
            "degraded_mode": bool(learning_state.get("degraded_mode", False)),
            "turn_count": int(learning_state.get("turn_count", 0) or 0),
            "review_status": review_status,
            "diagnostics": build_learning_diagnostics(
                candidates,
                samples,
                learning_state,
                normalize_text_func=normalize_text_func,
                learning_text_garbled_func=learning_text_garbled_func,
            ),
            "recent_candidates": [
                compact_learning_item(item, normalize_text_func=normalize_text_func)
                for item in candidates[-5:]
            ],
            "recent_samples": [
                compact_learning_item(item, normalize_text_func=normalize_text_func)
                for item in samples[-5:]
            ],
            "recent_audit": [compact_learning_audit_item(item) for item in recent_audit],
            "recent_shadow": recent_shadow if isinstance(recent_shadow, list) else [],
        },
    }
