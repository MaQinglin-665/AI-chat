import memory_text


def test_memory_text_normalizes_and_truncates():
    assert memory_text.normalize_memory_text("  alpha\n beta\tgamma  ") == "alpha beta gamma"
    assert memory_text.normalize_memory_text("abcdef", max_len=5) == "abcd..."


def test_memory_text_filters_garbled_stagey_and_sensitive_text():
    assert memory_text.looks_garbled_text("浣犲")
    assert memory_text.looks_stagey_text("递给你一杯茶")
    assert memory_text.looks_sensitive_memory_text("Authorization: Bearer abcdefghijklmnop")
    assert not memory_text.looks_sensitive_memory_text("likes concise replies")


def test_memory_text_detects_query_specificity_and_tokens():
    assert memory_text.is_lightweight_checkin_message("在吗？")
    assert memory_text.has_explicit_memory_intent("Do you remember what I said last time?")
    assert memory_text.is_specific_memory_query("Please recall the deployment plan from yesterday")
    assert not memory_text.is_specific_memory_query("ok")
    assert {"deployment", "plan"} <= memory_text.tokenize_memory_text("Deployment plan")


def test_memory_text_extracts_explicit_write_text():
    assert memory_text.has_explicit_memory_write_intent("remember that I prefer short replies")
    assert memory_text.extract_explicit_memory_text("remember that I prefer short replies") == "I prefer short replies"

