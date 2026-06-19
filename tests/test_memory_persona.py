from datetime import datetime

import memory_persona


def _normalize_text(value, max_len=220):
    if isinstance(value, (list, tuple, set)):
        value = ", ".join(str(item).strip() for item in value if str(item).strip())
    return " ".join(str(value or "").split()).strip()[:max_len]


def test_normalize_manual_persona_card_keeps_new_and_legacy_fields():
    card = memory_persona.normalize_manual_persona_card(
        {
            "character_name": " 馨语 ",
            "user_alias": " 小Q ",
            "relationship_role": "一起学习",
            "initiative_level": "low",
            "speaking_style": " 先给重点，再补细节 ",
            "catchphrases": ["我在", "慢慢来"],
            "likes": "短句和开发计划",
        },
        normalize_text_func=_normalize_text,
    )

    assert card["character_name"] == "馨语"
    assert card["user_alias"] == "小Q"
    assert card["relationship_role"] == "学习搭子"
    assert card["initiative_level"] == "低"
    assert "先给重点" in card["reply_style"]
    assert "我在" in card["reply_style"]
    assert card["user_preferences"] == "短句和开发计划"
    assert card["common_topics"] == "短句和开发计划"


def test_normalize_manual_persona_card_drops_regression_placeholders():
    card = memory_persona.normalize_manual_persona_card(
        {
            "character_name": "回归检查-123",
            "identity": "回归检查-123",
            "personality_tags": "主动程度：适中；关系定位：桌面伙伴",
        },
        normalize_text_func=_normalize_text,
    )

    assert card["character_name"] == ""
    assert "回归检查" not in card["identity"]
    assert card["personality_tags"] == ""
    assert card["initiative_level"] == "适中"


def test_load_save_persona_card_uses_normalization_and_timestamp(tmp_path):
    path = tmp_path / "memory_persona_card.json"
    saved = memory_persona.save_manual_persona_card(
        path,
        {"character_name": "  小蓝  ", "initiative_level": "very high"},
        normalize_text_func=_normalize_text,
        now_func=lambda: datetime(2026, 1, 2, 3, 4, 5),
    )

    assert saved["character_name"] == "小蓝"
    assert saved["initiative_level"] == "很高"
    assert saved["updated_at"] == "2026-01-02T03:04:05"
    loaded = memory_persona.load_manual_persona_card(path, normalize_text_func=_normalize_text)
    assert loaded == saved


def test_build_summary_blocks_filter_bad_text(tmp_path):
    profile_path = tmp_path / "memory_profile.json"
    memory_persona.save_json_summary(
        profile_path,
        {"summary": "用户喜欢短句和直接推进。"},
    )

    block = memory_persona.build_summary_block(
        profile_path,
        "关于用户的人设记忆：",
        looks_garbled_func=lambda text: False,
        looks_stagey_func=lambda text: False,
    )
    assert block == "关于用户的人设记忆：用户喜欢短句和直接推进。"

    blocked = memory_persona.build_summary_block(
        profile_path,
        "关于用户的人设记忆：",
        looks_garbled_func=lambda text: True,
        looks_stagey_func=lambda text: False,
    )
    assert blocked == ""


def test_build_dialogue_excerpt_is_bounded():
    items = [
        {"ts": "2026-01-01T00:00:00", "user": "hello " * 40, "assistant": "world " * 40},
        {"ts": "2026-01-02T00:00:00", "user": "继续", "assistant": "收到"},
    ]

    excerpt = memory_persona.build_dialogue_excerpt(
        items,
        limit=1,
        normalize_text_func=_normalize_text,
    )

    assert "2026-01-02" in excerpt
    assert "继续" in excerpt
    assert "2026-01-01" not in excerpt
