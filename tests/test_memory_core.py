from datetime import datetime

import memory_core


def _normalize_text(value, max_len=220):
    safe = " ".join(str(value or "").split())
    return safe[:max_len]


def _tokenize(value):
    return {part for part in str(value or "").lower().split() if part}


def test_classify_core_memory_text_detects_context_and_recent_events():
    assert memory_core.classify_core_memory_text("这个 Electron TTS 项目正在修复 bug") == (
        "episodic",
        "project_context",
    )
    assert memory_core.classify_core_memory_text("用户喜欢短句和直接建议") == (
        "semantic",
        "user_preference",
    )
    assert memory_core.classify_core_memory_text("昨天已经完成第一版验证") == (
        "episodic",
        "recent_event",
    )


def test_normalize_core_memory_item_clamps_and_filters_fields():
    item = memory_core.normalize_core_memory_item(
        {
            "text": "  用户喜欢短句推进  ",
            "kind": "bad",
            "category": "bad",
            "importance": "2.5",
            "confidence": "-1",
            "tags": ["  开发  ", "", "x" * 40],
            "origin": {"user_preview": "u" * 200, "assistant_preview": "ok"},
        },
        fallback_id="mem_test",
        normalize_text_func=_normalize_text,
        looks_garbled_func=lambda text: False,
        looks_sensitive_func=lambda text: False,
        looks_stagey_func=lambda text: False,
        clamp_int_func=lambda value, default, min_value, max_value: max(min_value, min(max_value, int(value or default))),
        now_func=lambda: datetime(2026, 1, 2, 3, 4, 5),
    )

    assert item["id"] == "mem_test"
    assert item["kind"] == "semantic"
    assert item["category"] == "stable_fact"
    assert item["text"] == "用户喜欢短句推进"
    assert item["importance"] == 1.0
    assert item["confidence"] == 0.0
    assert item["tags"] == ["开发", "x" * 24]
    assert item["created_at"] == "2026-01-02T03:04:05"
    assert item["origin"]["user_preview"] == "u" * 140


def test_load_core_memory_items_filters_archived_and_bad_items(tmp_path):
    path = tmp_path / "memory_core.json"
    memory_core.save_core_memory_items(
        path,
        [
            {"text": "用户喜欢直接推进", "id": "keep"},
            {"text": "删除项", "id": "drop", "status": "deleted"},
            {"text": "bad", "id": "short"},
        ],
        normalize_text_func=_normalize_text,
        looks_garbled_func=lambda text: False,
        looks_sensitive_func=lambda text: False,
        looks_stagey_func=lambda text: False,
        clamp_int_func=lambda value, default, min_value, max_value: max(min_value, min(max_value, int(value or default))),
        now_func=lambda: datetime(2026, 1, 2, 3, 4, 5),
    )

    loaded = memory_core.load_core_memory_items(
        path,
        normalize_text_func=_normalize_text,
        looks_garbled_func=lambda text: False,
        looks_sensitive_func=lambda text: False,
        looks_stagey_func=lambda text: False,
        clamp_int_func=lambda value, default, min_value, max_value: max(min_value, min(max_value, int(value or default))),
        now_func=lambda: datetime(2026, 1, 2, 3, 4, 5),
    )

    assert [item["id"] for item in loaded] == ["keep"]
    assert loaded[0]["text"] == "用户喜欢直接推进"


def test_core_memory_similarity_uses_pattern_and_token_overlap():
    assert memory_core.core_memory_similarity(
        "keep project context",
        "keep project context",
        learning_pattern_key_func=lambda text: str(text).replace(" ", ""),
        tokenize_text_func=_tokenize,
    ) == 1.0
    assert memory_core.core_memory_similarity(
        "project context direct",
        "project context careful",
        learning_pattern_key_func=lambda text: str(text).split()[-1],
        tokenize_text_func=_tokenize,
    ) == 0.6667
