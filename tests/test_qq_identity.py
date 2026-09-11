import json

from qq_identity import (
    QQBridgeRuntime,
    QQIdentityStore,
    build_qq_identity_prompt_block,
    get_qq_identity_config,
    is_authorized_qq_event,
    parse_explicit_desktop_qq_send,
    sanitize_qq_identity_config,
    save_qq_identity_config,
)


def test_qq_identity_sanitizes_urls_and_keeps_text_tools_safe():
    settings = sanitize_qq_identity_config(
        {
            "enabled": True,
            "qq_number": " 1234567 ",
            "cloud_bridge_url": "https://user:secret@bridge.example/qq?token=secret",
            "reply_mode": "voice",
            "tools_allowed": True,
            "allowed_contacts": ["123456", "bad", "123456"],
        }
    )

    assert settings["enabled"] is True
    assert settings["qq_number"] == "1234567"
    assert settings["cloud_bridge_url"] == ""
    assert settings["allowed_contacts"] == ["123456"]
    assert settings["reply_mode"] == "text"
    assert settings["tools_allowed"] is False


def test_tailnet_auth_mode_does_not_require_a_local_bridge_token(tmp_path, monkeypatch):
    state_path = tmp_path / "qq_identity_state.json"
    event = {"event_id": "event-1", "umo": "aiocqhttp:FriendMessage:1234567", "chat_type": "private", "sender_id": "1234567", "text": "hi"}
    store = QQIdentityStore(state_path)
    store.record_turn(event, "hello")
    config = {"qq_identity": {"enabled": True, "qq_number": "7654321", "cloud_bridge_url": "https://bridge.example/plugin", "bridge_auth_mode": "tailnet", "allowed_contacts": ["1234567"]}}
    runtime = QQBridgeRuntime(load_config=lambda: config, process_event=lambda _event, _history: None, state_path=state_path)
    requests = []
    runtime._request_json = lambda url, token, **kwargs: requests.append((url, token, kwargs)) or {"ok": True}

    result = runtime.send_explicit_desktop_text("private", "1234567", "hello")

    assert result["ok"] is True
    assert requests[0][1] == ""


def test_save_identity_never_persists_bridge_token(tmp_path):
    config_path = tmp_path / "config.local.json"
    config_path.write_text(json.dumps({"assistant_name": "Taffy"}), encoding="utf-8")

    saved = save_qq_identity_config(
        {
            "identity": {
                "enabled": True,
                "qq_number": "1234567",
                "bridge_token": "not-allowed-to-save",
                "bridge_token_env": "TAFFY_TEST_QQ_TOKEN",
            }
        },
        local_config_path=config_path,
    )
    serialized = config_path.read_text(encoding="utf-8")

    assert saved["identity"]["bridge_token_env"] == "TAFFY_TEST_QQ_TOKEN"
    assert "not-allowed-to-save" not in serialized
    assert json.loads(serialized)["assistant_name"] == "Taffy"


def test_identity_prompt_makes_qq_ownership_and_tool_boundary_explicit():
    prompt = build_qq_identity_prompt_block(
        {
            "qq_identity": {
                "enabled": True,
                "display_name": "Taffy",
                "qq_number": "1234567",
                "allowed_contacts": ["7654321"],
            },
            "_qq_current_event": {"chat_type": "private", "sender_id": "7654321"},
        }
    )

    assert "own QQ account" in prompt
    assert "QQ 1234567" in prompt
    assert "tool use" in prompt


def test_explicit_desktop_qq_command_parser_requires_clear_send_instruction():
    parsed = parse_explicit_desktop_qq_send("给 QQ 1234567 发消息：晚上好")

    assert parsed == {"target_type": "private", "target_id": "1234567", "text": "晚上好"}
    assert parse_explicit_desktop_qq_send("要不要给 QQ 1234567 发消息") is None


def test_store_routes_allowlisted_event_and_explicit_send(tmp_path, monkeypatch):
    state_path = tmp_path / "qq_identity_state.json"
    event = {
        "event_id": "event-1",
        "umo": "aiocqhttp:FriendMessage:1234567",
        "chat_type": "private",
        "sender_id": "1234567",
        "text": "你好",
    }
    store = QQIdentityStore(state_path)
    store.record_turn(event, "你好呀")
    assert store.route_for_target("private", "1234567") == event["umo"]
    assert is_authorized_qq_event(event, {"allowed_contacts": ["1234567"], "allowed_groups": []})

    config = {
        "qq_identity": {
            "enabled": True,
            "qq_number": "7654321",
                "cloud_bridge_url": "https://bridge.example/plugin",
                "bridge_token_env": "TEST_QQ_BRIDGE_TOKEN",
                "astrbot_api_key_env": "TEST_ASTRBOT_QQ_API_KEY",
                "allowed_contacts": ["1234567"],
        }
    }
    monkeypatch.setenv("TEST_QQ_BRIDGE_TOKEN", "test-token")
    monkeypatch.setenv("TEST_ASTRBOT_QQ_API_KEY", "test-astrbot-api-key")
    runtime = QQBridgeRuntime(load_config=lambda: config, process_event=lambda _event, _history: None, state_path=state_path)
    requests = []
    runtime._request_json = lambda url, token, **kwargs: requests.append((url, token, kwargs)) or {"ok": True}

    result = runtime.send_explicit_desktop_text("private", "1234567", "收到")

    assert result["ok"] is True
    assert requests[0][0].endswith("/send")
    assert requests[0][2]["body"]["umo"] == event["umo"]
    assert store.audit()[-1]["outgoing_text"] == "收到"
    assert runtime.send_explicit_desktop_text("private", "9999999", "no") ["ok"] is False


def test_default_identity_is_disabled():
    assert get_qq_identity_config({})["enabled"] is False
