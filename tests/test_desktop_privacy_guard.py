import desktop_agent
import pytest
import tools


def test_sensitive_foreground_windows_are_blocked_before_capture():
    assert desktop_agent.is_sensitive_foreground_context(
        {"foreground": {"process": "Bitwarden", "title": "My vault"}}
    ) is True
    assert desktop_agent.is_sensitive_foreground_context(
        {"foreground": {"process": "chrome", "title": "银行卡登录 - 银行"}}
    ) is True
    assert desktop_agent.is_sensitive_foreground_context(
        {"foreground": {"process": "msedge", "title": "InPrivate browsing"}}
    ) is True
    assert desktop_agent.is_sensitive_foreground_context(
        {
            "foreground": {"process": "code", "title": "project"},
            "windows": [{"process": "Bitwarden", "title": "My vault"}],
        }
    ) is True


def test_custom_sensitive_pattern_is_local_and_optional():
    context = {"foreground": {"process": "AcmeClient", "title": "Quarterly report"}}
    assert desktop_agent.is_sensitive_foreground_context(context) is False
    assert desktop_agent.is_sensitive_foreground_context(
        context,
        {"observe": {"sensitive_app_patterns": ["AcmeClient|Quarterly report"]}},
    ) is True


def test_observation_stops_before_capture_for_sensitive_foreground(monkeypatch):
    monkeypatch.setattr(
        tools.desktop_agent,
        "get_desktop_context",
        lambda: {"foreground": {"process": "KeePass", "title": "Vault"}},
    )
    monkeypatch.setattr(
        tools.desktop_agent,
        "capture_cursor_screen",
        lambda **_kwargs: (_ for _ in ()).throw(AssertionError("must not capture")),
    )

    with pytest.raises(RuntimeError, match="sensitive window"):
        tools.tool_observe_screen(
            {},
            {"desktop_enabled": True},
            {"observe": {"autonomous_enabled": True}},
            {},
        )
