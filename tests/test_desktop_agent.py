import json

import agent_actions
import desktop_agent
import llm_client
import obsidian_knowledge
import tools


def _desktop_config(tmp_path):
    return {
        "observe": {
            "autonomous_enabled": True,
            "capture_max_width": 1280,
            "capture_max_height": 800,
            "memory_min_importance": 0.78,
            "memory_min_interval_sec": 3600,
        },
        "tools": {
            "enabled": True,
            "workspace_root": str(tmp_path),
            "desktop_enabled": True,
            "desktop_input_enabled": True,
            "clipboard_enabled": True,
        },
        "knowledge_base": {"enabled": False},
    }


def test_capability_prompt_only_claims_enabled_desktop_features(monkeypatch, tmp_path):
    monkeypatch.setattr(desktop_agent, "STATE_PATH", tmp_path / "awareness.json")
    disabled = desktop_agent.build_prompt_block(
        {"observe": {"autonomous_enabled": False}, "tools": {"desktop_enabled": False}}
    )
    enabled = desktop_agent.build_prompt_block(_desktop_config(tmp_path))

    assert disabled == ""
    assert "observe_screen" in enabled
    assert "mouse" in enabled.lower()
    assert "confirmation" in enabled.lower()


def test_observe_screen_is_model_selected_and_caches_scene(monkeypatch, tmp_path):
    monkeypatch.setattr(desktop_agent, "STATE_PATH", tmp_path / "awareness.json")
    monkeypatch.setattr(
        desktop_agent,
        "capture_cursor_screen",
        lambda **_kwargs: {
            "data_url": "data:image/jpeg;base64,ZmFrZQ==",
            "screen": {"display_name": r"\\.\DISPLAY2", "width": 1920, "height": 1080},
            "size_bytes": 4,
        },
    )
    monkeypatch.setattr(
        llm_client,
        "call_openai_compatible",
        lambda _cfg, messages: json.dumps(
            {
                "scene_summary": "The user is editing the desktop pet project.",
                "active_task": "coding",
                "visible_apps": ["Editor"],
                "salient_details": ["tests are visible"],
                "uncertainty": "",
                "should_speak": False,
                "memory_candidate": "",
                "memory_importance": 0.1,
            }
        ),
    )

    result = tools.tool_observe_screen(
        {"reason": "scene changed", "focus": "general"},
        tools.get_tools_settings(_desktop_config(tmp_path)),
        _desktop_config(tmp_path),
        {"model": "vision-test"},
    )

    assert result["observed"] is True
    assert result["scene"]["should_speak"] is False
    assert result["screen"]["display_name"].endswith("DISPLAY2")
    assert desktop_agent.latest_observation()["observation"].startswith("The user is editing")


def test_desktop_risk_policy_keeps_ordinary_actions_autonomous():
    assert agent_actions.risk_for_action(
        "desktop_input",
        {
            "action": "click",
            "target_kind": "playback",
            "target_description": "pause button",
        },
    )[0] is False
    assert agent_actions.risk_for_action(
        "desktop_input",
        {
            "action": "click",
            "target_kind": "send_message",
            "target_description": "send button",
        },
    )[1] == "desktop_send_message"
    assert agent_actions.risk_for_action(
        "control_window",
        {"action": "close", "handle": 42, "window_title": "Editor"},
    )[1] == "close_external_window"


def test_public_defaults_keep_autonomous_desktop_access_disabled():
    import config

    assert config.DEFAULT_CONFIG["observe"]["autonomous_enabled"] is False
    assert config.DEFAULT_CONFIG["tools"]["desktop_enabled"] is False
    assert config.DEFAULT_CONFIG["tools"]["desktop_input_enabled"] is False
    assert config.DEFAULT_CONFIG["tools"]["clipboard_enabled"] is False


def test_model_selected_desktop_memory_writes_text_only_note(tmp_path):
    cfg = {
        "knowledge_base": {
            "enabled": True,
            "vault_path": str(tmp_path / "vault"),
            "semantic_enabled": False,
        }
    }
    saved = obsidian_knowledge.save_desktop_observation(
        cfg,
        text="The user is steadily developing the Xinyu desktop pet project.",
        importance=0.9,
    )

    assert saved["ok"] is True
    note = next((tmp_path / "vault").rglob("desktop-*.md"))
    content = note.read_text(encoding="utf-8")
    assert "desktop_observation" in content
    assert "data:image" not in content
    assert obsidian_knowledge.save_desktop_observation(
        cfg,
        text="password: definitely-do-not-store",
        importance=1,
    )["error"] == "sensitive_observation"
