import social_cognition as social


def _cfg(vault, event=None):
    cfg = {"knowledge_base": {"enabled": True, "vault_path": str(vault)}}
    if event: cfg["_qq_current_event"] = event
    return cfg


def test_social_graph_learns_person_alias_and_introduced_relation(tmp_path):
    cfg = _cfg(tmp_path, {"sender_id": "123", "chat_type": "private"})
    social.observe_interaction(cfg, "我叫小林，阿明是我的朋友", "知道了", interaction_id="qq:1")
    graph = social.load_graph(cfg)
    assert len(graph["people"]) == 2
    assert graph["relations"][0]["kind"] == "朋友"
    assert "小林" in social.build_prompt_block(cfg)


def test_accounts_are_distinct_until_evidence_links_them(tmp_path):
    social.observe_interaction(_cfg(tmp_path), "你好", "嗯")
    social.observe_interaction(_cfg(tmp_path, {"sender_id": "456"}), "你好", "嗯")
    assert len(social.load_graph(_cfg(tmp_path))["people"]) == 2
    assert social.load_graph(_cfg(tmp_path))["events"][-1]["evidence_preview"] == ""


def test_self_understanding_is_evolving_not_a_fixed_profile(tmp_path):
    cfg = _cfg(tmp_path)
    social.observe_interaction(cfg, "我叫小林", "收到")
    prompt = social.build_prompt_block(cfg)
    assert "对自己的当前理解" in prompt
    assert "持续形成自我" in prompt


def test_same_explicit_alias_can_link_accounts_without_manual_profiles(tmp_path):
    social.observe_interaction(_cfg(tmp_path), "我叫小林", "嗯")
    qq = _cfg(tmp_path, {"sender_id": "789"})
    social.observe_interaction(qq, "我叫小林", "原来如此")
    graph = social.load_graph(qq)
    assert len(graph["people"]) == 1
    assert len(graph["accounts"]) == 2
