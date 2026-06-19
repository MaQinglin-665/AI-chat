import importlib
import importlib.util


def _normalize_text(value, max_len=220):
    return " ".join(str(value or "").split())[:max_len]


def _eligible(item, _settings):
    return str(item.get("status", "")).strip().lower() == "active"


def test_memory_snapshot_module_builds_debug_payload_without_memory_io():
    assert importlib.util.find_spec("memory_snapshot") is not None
    memory_snapshot = importlib.import_module("memory_snapshot")

    payload = memory_snapshot.build_memory_debug_snapshot_payload(
        settings={
            "enabled": True,
            "mem0_enabled": False,
            "short_enabled": True,
            "short_inject_count": 4,
            "short_ttl_turns": 16,
            "memory_consolidation_enabled": True,
            "memory_consolidation_min_support": 2,
            "core_enabled": True,
            "core_extraction_enabled": True,
            "memory_correction_enabled": True,
            "core_inject_count": 3,
            "core_min_importance": 0.45,
            "core_min_confidence": 0.55,
            "learning_inject_count": 2,
            "learning_candidates_enabled": True,
            "learning_samples_enabled": True,
            "learning_candidate_max_items": 200,
            "learning_candidate_min_score": 0.45,
            "learning_candidate_min_confidence": 0.45,
            "learning_min_score": 0.55,
            "learning_min_confidence": 0.45,
        },
        memory_count=7,
        short_state={"turn_index": 5},
        short_items=[
            {
                "id": "short_1",
                "kind": "current_task",
                "text": "  finish   memory split  ",
                "salience": 0.8,
                "last_seen_turn": 5,
                "ttl_turns": 16,
                "support_count": 2,
                "updated_at": "2026-06-19T10:00:00",
            }
        ],
        core_items=[
            {
                "id": "core_1",
                "kind": "semantic",
                "category": "project_context",
                "text": "AI desktop pet architecture cleanup",
                "importance": 0.7,
                "confidence": 0.8,
                "pinned": True,
                "updated_at": "2026-06-19T10:01:00",
            }
        ],
        last_memory_debug={"reason": "selected", "selected": [{"user": "old"}]},
        last_learning_extraction_debug={"status": "stored", "candidate_id": "cand_1"},
        last_short_debug={"status": "stored", "memory_ids": ["short_1", "extra"]},
        last_core_debug={"status": "stored", "source": "explicit_user", "memory_ids": ["core_1"]},
        last_consolidation_debug={"status": "stored", "short_ids": ["short_1"], "memory_ids": ["core_1"]},
        last_correction_debug={"status": "updated", "score": 0.9, "memory_ids": ["core_1"]},
        candidates=[
            {
                "id": "cand_1",
                "status": "candidate",
                "score": 0.9,
                "confidence": 0.8,
                "support_count": 2,
                "assistant_preview": "ok",
                "compressed_pattern": "prefer concise answers",
            }
        ],
        samples=[
            {
                "id": "sample_1",
                "status": "active",
                "score": 0.92,
                "confidence": 0.86,
                "support_count": 3,
                "assistant_preview": "sure",
                "compressed_pattern": "reply with concise answers",
            }
        ],
        learning_state={
            "degraded_mode": True,
            "turn_count": 4,
            "quick_settings": {"inject_count": 1, "promotion_min_support": 2},
            "events": [{"event": "SCORER_DEGRADED", "reason": "low_confidence"}],
            "health_windows": [{"window_size": 4, "avg_confidence": 0.42}],
            "current_window": [{"confidence": 0.6, "signal_count": 1}, {"confidence": 0.4, "signal_count": 0}],
        },
        recent_audit=[
            {
                "id": "audit_1",
                "ts": "2026-06-19T10:02:00",
                "action": "weight",
                "detail": {"ids": ["cand_1"], "changed": 1, "secret": "drop"},
            }
        ],
        recent_shadow=[{"type": "learning_observation"}],
        normalize_text_func=_normalize_text,
        learning_sample_prompt_eligible_func=_eligible,
    )

    assert payload["ok"] is True
    assert payload["memory"]["memory_count"] == 7
    assert payload["short_memory"]["recent"][0]["text"] == "finish memory split"
    assert payload["core_memory"]["last_extraction"]["source"] == "explicit_user"
    assert payload["learning"]["review_status"]["pending_review_count"] == 1
    assert payload["learning"]["review_status"]["active_sample_count"] == 1
    assert payload["learning"]["review_status"]["prompt_eligible_sample_count"] == 1
    assert payload["learning"]["diagnostics"]["degraded_reason"] == "low_confidence"
    assert payload["learning"]["diagnostics"]["current_window_avg_confidence"] == 0.5
    assert payload["learning"]["recent_audit"][0]["detail"] == {"ids": ["cand_1"], "changed": 1}


def test_memory_snapshot_quick_settings_are_clamped():
    assert importlib.util.find_spec("memory_snapshot") is not None
    memory_snapshot = importlib.import_module("memory_snapshot")

    assert memory_snapshot.learning_quick_settings(
        {"quick_settings": {"inject_count": 0, "promotion_min_support": 0}}
    ) == {"inject_count": 0, "promotion_min_support": 1}
    assert memory_snapshot.learning_quick_settings(
        {"quick_settings": {"inject_count": 99, "promotion_min_support": 99}}
    ) == {"inject_count": 1, "promotion_min_support": 2}
