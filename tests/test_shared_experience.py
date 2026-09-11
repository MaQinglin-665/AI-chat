import shared_experience


def _configure_path(monkeypatch, tmp_path):
    monkeypatch.setattr(
        shared_experience,
        "SHARED_EXPERIENCE_PATH",
        tmp_path / "memory_shared_experiences.json",
    )


def _config(**overrides):
    settings = {
        "enabled": True,
        "inject_count": 1,
        "proactive_recall_cooldown_hours": 24,
    }
    settings.update(overrides)
    return {"shared_experience_memory": settings}


def test_shared_experience_keeps_only_episodic_shared_milestones(monkeypatch, tmp_path):
    _configure_path(monkeypatch, tmp_path)
    config = _config()

    stored = shared_experience.record_from_core_candidates(
        config,
        [
            {
                "kind": "episodic",
                "category": "project_context",
                "text": "这次我们一起修复了语音转写启动后的空白结果。",
            },
            {
                "kind": "semantic",
                "category": "user_preference",
                "text": "用户喜欢可爱的界面。",
            },
        ],
    )

    assert stored == 1
    state = shared_experience._load()
    assert [item["text"] for item in state["items"]] == [
        "这次我们一起修复了语音转写启动后的空白结果。"
    ]


def test_shared_experience_recall_is_relevant_or_cooldown_limited(monkeypatch, tmp_path):
    _configure_path(monkeypatch, tmp_path)
    config = _config()
    shared_experience.record_from_core_candidates(
        config,
        [
            {
                "kind": "episodic",
                "category": "project_context",
                "text": "我们一起完成了语音转写延迟的排查。",
            }
        ],
    )

    relevant = shared_experience.build_prompt_block(config, "转写现在还慢吗？")
    assert "一起完成了语音转写延迟的排查" in relevant
    assert "never present it as a reminder" in relevant
    assert shared_experience.build_prompt_block(config, "今天天气不错") == ""

    proactive = shared_experience.build_prompt_block(config, "", is_auto=True)
    assert "Shared experiences" in proactive
    assert shared_experience.build_prompt_block(config, "", is_auto=True) == ""


def test_shared_experience_never_persists_sensitive_or_stagey_candidate(monkeypatch, tmp_path):
    _configure_path(monkeypatch, tmp_path)
    stored = shared_experience.record_from_core_candidates(
        _config(),
        [
            {
                "kind": "episodic",
                "category": "relationship",
                "text": "我们一起保存 token: definitely-not-safe。",
            },
            {
                "kind": "episodic",
                "category": "recent_event",
                "text": "我们一起做完了 <motion:happy>。",
            },
        ],
    )

    assert stored == 0
    assert shared_experience._load()["items"] == []
