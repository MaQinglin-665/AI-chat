import character_brain_text


def test_character_brain_text_normalizes_spacing_and_smart_quotes():
    text = character_brain_text.normalize_reply_text_spacing("“Hi”—there!Are you ok？")

    assert text == '"Hi"-there! Are you ok?'


def test_character_brain_text_splits_and_compacts_sentences():
    sentences = character_brain_text.split_reply_sentences("One. Two? Three!")
    compact = character_brain_text.compact_one_liner(
        "Alpha, beta, gamma, delta, epsilon.",
        max_chars=18,
    )

    assert sentences == ["One.", "Two?", "Three!"]
    assert compact == "Alpha, beta,"


def test_character_brain_text_repairs_unbalanced_punctuation():
    repaired = character_brain_text.repair_unbalanced_reply_punctuation(
        'Wait (that was odd. "Tiny static'
    )

    assert repaired == "Wait that was odd. Tiny static"


def test_character_brain_text_preserves_tool_meta_suffix():
    visible, meta = character_brain_text.split_tool_meta_suffix(
        f"hello{character_brain_text.TOOL_META_MARKER}{{}}"
    )

    assert visible == "hello"
    assert meta == f"{character_brain_text.TOOL_META_MARKER}{{}}"
