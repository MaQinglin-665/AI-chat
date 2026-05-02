from tts import (
    _detect_text_lang,
    _normalize_gpt_sovits_spoken_text,
    _prefer_gpt_sovits_short_english_chunks,
    _replace_en_words_for_tts,
)


def test_gpt_sovits_language_detection_keeps_english_role_lines():
    assert _detect_text_lang("Hey, API and AI are not the same thing.") == "en"
    assert (
        _replace_en_words_for_tts("Hey, API and AI are not the same thing.")
        == "Hey, API and AI are not the same thing."
    )


def test_gpt_sovits_phonetic_replacement_still_applies_to_chinese_lines():
    converted = _replace_en_words_for_tts("\u8fd9\u4e2a API \u53ef\u4ee5\u7528\uff0cOK")
    assert "API" not in converted
    assert "OK" not in converted


def test_gpt_sovits_normalizes_short_english_contractions_for_stability():
    assert (
        _normalize_gpt_sovits_spoken_text("Hey, I've got my ways!")
        == "Hey. I have got my ways!"
    )
    assert _prefer_gpt_sovits_short_english_chunks("Hey. I have got my ways!") is True
    assert _prefer_gpt_sovits_short_english_chunks("This is a plain sentence") is False
