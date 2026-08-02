import tempfile
from pathlib import Path
from unittest.mock import patch

import obsidian_knowledge as knowledge


def _config(vault):
    return {
        "knowledge_base": {
            "enabled": True,
            "vault_path": str(vault),
            "prompt_max_items": 4,
            "prompt_max_chars": 360,
            "background_learning_enabled": False,
        }
    }


def test_vault_sync_and_retrieval_keep_prompt_bounded():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        config = _config(vault)
        knowledge.ensure_vault(config)
        note = vault / "01-关于用户" / "preference.md"
        note.write_text(
            "---\nid: preference_1\nstatus: active\nimportance: 0.9\nconfidence: 0.9\ntags: [\"游戏\", \"偏好\"]\n---\n\n# 游戏偏好\n\n用户偏好合作游戏，也喜欢角色有一点意外感。\n",
            encoding="utf-8",
        )
        assert knowledge.sync_vault(config)["synced"] == 1
        block = knowledge.build_prompt_block(config, "今晚玩合作游戏怎么样", [])
        assert "合作游戏" in block
        assert len(block) <= 500


def test_manual_obsidian_edit_is_refreshed_on_next_retrieval():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        config = _config(vault)
        knowledge.ensure_vault(config)
        note = vault / "04-兴趣与观点" / "idea.md"
        note.write_text("# 初始\n\n她喜欢天文。\n", encoding="utf-8")
        knowledge.sync_vault(config)
        note.write_text("# 手动修改\n\n她喜欢古典音乐。\n", encoding="utf-8")
        assert "古典音乐" in knowledge.build_prompt_block(config, "聊聊古典音乐", [])


def test_external_single_source_is_marked_unverified_and_noted():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        config = _config(vault)
        result = knowledge.save_external_note(
            config,
            title="测试资料",
            text="这是一条来自单一公开来源、尚待更多证据确认的测试资料。",
            source_url="https://example.com/article",
        )
        assert result["ok"] is True
        files = list((vault / "06-待核实").glob("*.md"))
        assert len(files) == 1
        assert "status: \"unverified\"" in files[0].read_text(encoding="utf-8")


def test_migration_copies_distilled_memory_without_touching_legacy_files():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        config = _config(vault)
        core_item = {
            "id": "mem_test", "kind": "semantic", "category": "user_preference", "status": "active",
            "text": "用户喜欢有一点跳脱但仍相关的回复。", "importance": 0.8, "confidence": 0.9,
            "pinned": False, "source": "conversation", "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00", "last_used_at": "", "use_count": 0, "tags": ["偏好"],
        }
        with patch("memory.load_core_memory_items", return_value=[core_item]), patch(
            "relationship_state.load_relationship_state", return_value={"familiarity": 0.4, "preferences": {}}
        ), patch("memory.PROFILE_MEMORY_PATH", Path(tmp) / "missing-profile.json"), patch(
            "memory.RELATIONSHIP_MEMORY_PATH", Path(tmp) / "missing-relation.json"
        ):
            result = knowledge.migrate_existing_memories(config)
        assert result["migrated"] >= 2
        assert list((vault / "01-关于用户").glob("*.md"))
        assert list((vault / "03-关系与成长").glob("*.md"))


def test_migration_is_idempotent_and_does_not_repeat_changelog_noise():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        config = _config(vault)
        with patch("memory.load_core_memory_items", return_value=[]), patch(
            "relationship_state.load_relationship_state", return_value={}
        ), patch("memory.PROFILE_MEMORY_PATH", Path(tmp) / "missing-profile.json"), patch(
            "memory.RELATIONSHIP_MEMORY_PATH", Path(tmp) / "missing-relation.json"
        ):
            assert knowledge.migrate_existing_memories(config)["migrated"] == 1
            assert knowledge.migrate_existing_memories(config)["migrated"] == 0
        changelog = vault / "99-变更日志" / "自动同步.md"
        assert len(changelog.read_text(encoding="utf-8").splitlines()) == 1
