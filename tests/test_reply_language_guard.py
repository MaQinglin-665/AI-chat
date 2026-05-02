import humanize
import reply_behavior


def test_english_reply_language_block_is_strict_about_chinese_input():
    block = reply_behavior.build_reply_language_block({"assistant_reply_language": "en"})

    assert "MUST be natural English" in block
    assert "do NOT mirror the user's Chinese" in block
    assert "UI translation layer handles Chinese separately" in block


def test_english_mode_skips_chinese_refine_rewrite(monkeypatch):
    called = {"openai": 0, "ollama": 0}
    monkeypatch.setattr(
        humanize,
        "should_refine_assistant_reply",
        lambda *_args, **_kwargs: True,
    )
    monkeypatch.setattr(
        humanize,
        "call_openai_compatible",
        lambda *_args, **_kwargs: called.update({"openai": called["openai"] + 1}) or "中文改写",
    )
    monkeypatch.setattr(
        humanize,
        "call_ollama",
        lambda *_args, **_kwargs: called.update({"ollama": called["ollama"] + 1}) or "中文改写",
    )

    out = humanize.maybe_refine_assistant_reply(
        {"assistant_reply_language": "en"},
        {"provider": "openai"},
        "openai",
        "你好",
        [],
        "Sure, I can help with that.",
    )

    assert out == "Sure, I can help with that."
    assert called == {"openai": 0, "ollama": 0}


def test_finalize_english_mode_replaces_obvious_chinese_reply():
    out = humanize.finalize_assistant_reply(
        {"assistant_reply_language": "en", "humanize": {"enabled": False}},
        {},
        "ollama",
        "你好，介绍一下自己",
        [],
        "当然可以，我是你的桌面伙伴。",
    )

    assert out.startswith("I got you.")
    assert "English" in out


def test_finalize_english_mode_allows_explicit_chinese_request():
    out = humanize.finalize_assistant_reply(
        {"assistant_reply_language": "en", "humanize": {"enabled": False}},
        {},
        "ollama",
        "请用中文回答",
        [],
        "当然可以，我会用中文回答。",
    )

    assert out == "当然可以，我会用中文回答。"
