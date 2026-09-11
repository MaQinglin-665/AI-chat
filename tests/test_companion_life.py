import tempfile
from pathlib import Path

import companion_life as life


def test_life_state_grows_slowly_and_writes_sparse_visible_journal():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        cfg = {"knowledge_base": {"enabled": True, "vault_path": str(vault)}}
        for _ in range(6):
            life.record_interaction(cfg, "我最近在玩合作游戏和学习天文", "听起来像两个会互相抢注意力的爱好。")
        assert (vault / ".xinyu-life-state.json").exists()
        assert list((vault / "08-内心日记").glob("*.md"))
        assert "长期成长线索" in life.build_life_prompt_block(cfg)


def test_auto_companion_requires_a_real_reason_or_quiet():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = {"knowledge_base": {"enabled": True, "vault_path": str(Path(tmp) / "vault")}}
        assert "保持安静" in life.build_life_prompt_block(cfg, is_auto=True)


def test_auto_companion_gets_choices_not_a_fixed_topic():
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp) / "vault"
        cfg = {"knowledge_base": {"enabled": True, "vault_path": str(vault)}}
        for _ in range(6):
            life.record_interaction(cfg, "我想继续学习天文", "那你先别把星星背成通讯录。")
        prompt = life.build_life_prompt_block(cfg, is_auto=True)
        assert "可选素材" in prompt
        assert "自行决定" in prompt
        assert "可以犹豫、改口" in prompt


def test_normal_life_context_allows_uncertainty_without_ai_meta_language():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = {"knowledge_base": {"enabled": True, "vault_path": str(Path(tmp) / "vault")}}
        life.record_interaction(cfg, "我最近想学天文", "行，但别把星星背成通讯录。")
        prompt = life.build_life_prompt_block(cfg)
        assert "犹豫、修正、保留矛盾" in prompt
        assert "不要把这解释成系统分析" in prompt


def test_proactive_gate_needs_real_local_growth_material():
    with tempfile.TemporaryDirectory() as tmp:
        cfg = {"knowledge_base": {"enabled": True, "vault_path": str(Path(tmp) / "vault")}}
        assert life.get_proactive_material(cfg)["has_material"] is False
        life.record_interaction(cfg, "我最近想学天文", "行，但别把星星背成通讯录。")
        assert life.get_proactive_material(cfg)["has_material"] is True
