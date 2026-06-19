import memory_text


def test_normalize_memory_text_collapses_spaces_and_truncates_like_legacy():
    assert memory_text.normalize_memory_text("  hello \n world  ", max_len=50) == "hello world"
    assert memory_text.normalize_memory_text("abcdef", max_len=4) == "abc..."


def test_memory_text_filters_bad_or_sensitive_content():
    assert memory_text.looks_garbled_text("浣犲ソ")
    assert memory_text.looks_garbled_text("bad\ufffdtext")
    assert memory_text.looks_stagey_text("我端来一杯茶给你")
    assert memory_text.looks_sensitive_memory_text("my api_key is hidden")
    assert not memory_text.looks_sensitive_memory_text("用户喜欢短句")


def test_lightweight_and_specific_memory_query_detection():
    assert memory_text.is_lightweight_checkin_message("在吗？")
    assert not memory_text.is_specific_memory_query("继续")
    assert memory_text.is_specific_memory_query("你还记得上次那个 Live2D TTS 问题吗")
    assert memory_text.is_specific_memory_query("project context for runtime bridge")
    assert memory_text.has_explicit_memory_intent("recall last time")


def test_tokenize_memory_text_keeps_useful_english_and_chinese_tokens():
    tokens = memory_text.tokenize_memory_text("the Live2D TTS 项目喜欢短句")

    assert "the" not in tokens
    assert "live2d" in tokens
    assert "tts" in tokens
    assert "项目喜欢短句" in tokens
    assert "项目" in tokens
    assert "短句" in tokens
