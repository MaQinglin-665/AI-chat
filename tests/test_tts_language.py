from tts import (
    _detect_text_lang,
    _normalize_gpt_sovits_spoken_text,
    _normalize_wav_loudness,
    _prefer_gpt_sovits_short_english_chunks,
    _replace_en_words_for_tts,
    _wav_amplitude_stats,
)


def _make_constant_wav(sample_value=120, frames=8000):
    import io
    import struct
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"".join(struct.pack("<h", int(sample_value)) for _ in range(frames)))
    return buf.getvalue()


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
    assert (
        _normalize_gpt_sovits_spoken_text("Hey there!I'm more of a night owl.")
        == "Hey there! I am more of a night owl."
    )
    assert _prefer_gpt_sovits_short_english_chunks("Hey. I have got my ways!") is True
    assert _prefer_gpt_sovits_short_english_chunks("This is a plain sentence") is False


def test_gpt_sovits_loudness_normalizer_boosts_quiet_wav():
    audio = _make_constant_wav(sample_value=120)
    boosted, meta = _normalize_wav_loudness(audio, target_rms=1400, max_gain=3.2)

    before = _wav_amplitude_stats(audio)
    after = _wav_amplitude_stats(boosted)

    assert meta is not None
    assert after["rms"] > before["rms"]
    assert after["peak"] <= 26000


def test_gpt_sovits_loudness_normalizer_reports_unchanged_audio():
    audio = _make_constant_wav(sample_value=1600)
    unchanged, meta = _normalize_wav_loudness(audio, target_rms=1400, max_gain=3.2)

    assert unchanged == audio
    assert meta is not None
    assert meta["changed"] is False
    assert meta["rms_before"] == meta["rms_after"]
