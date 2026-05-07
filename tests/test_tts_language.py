from tts import (
    _detect_text_lang,
    _normalize_gpt_sovits_spoken_text,
    _normalize_wav_loudness,
    _prefer_gpt_sovits_short_english_chunks,
    _replace_en_words_for_tts,
    _wav_amplitude_stats,
    synthesize_gpt_sovits_tts_bytes,
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


def _make_spiky_wav(base_sample=1800, spike_sample=30000, frames=8000, every=400):
    import io
    import struct
    import wave

    samples = []
    for idx in range(frames):
        samples.append(spike_sample if idx % every == 0 else base_sample)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"".join(struct.pack("<h", int(sample)) for sample in samples))
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


def test_gpt_sovits_loudness_normalizer_reduces_overly_loud_wav():
    audio = _make_constant_wav(sample_value=6200)
    reduced, meta = _normalize_wav_loudness(
        audio,
        target_rms=1400,
        max_gain=3.2,
        max_rms=4200,
    )

    before = _wav_amplitude_stats(audio)
    after = _wav_amplitude_stats(reduced)

    assert meta is not None
    assert meta["changed"] is True
    assert after["rms"] < before["rms"]
    assert after["rms"] <= 4200


def test_gpt_sovits_loudness_normalizer_limits_hot_peaks_without_high_rms():
    audio = _make_spiky_wav(base_sample=1800, spike_sample=30000)
    reduced, meta = _normalize_wav_loudness(
        audio,
        target_rms=1400,
        max_gain=3.2,
        peak_limit=26000,
        max_rms=5000,
    )

    before = _wav_amplitude_stats(audio)
    after = _wav_amplitude_stats(reduced)

    assert meta is not None
    assert meta["changed"] is True
    assert after["peak"] < before["peak"]
    assert after["peak"] <= 26000


def test_gpt_sovits_long_text_prefers_chunk_requests(monkeypatch):
    import json

    calls = []

    class FakeHeaders:
        def get(self, key, default=None):
            if str(key).lower() == "content-type":
                return "audio/wav"
            return default

    class FakeResponse:
        headers = FakeHeaders()

        def __init__(self, body):
            self._body = body

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return self._body

    def fake_urlopen(req, timeout=0):
        payload = json.loads(req.data.decode("utf-8"))
        chunk_text = str(payload.get("text") or "")
        calls.append(chunk_text)
        frames = max(12000, len(chunk_text) * 1200)
        return FakeResponse(_make_constant_wav(sample_value=1600, frames=frames))

    monkeypatch.setattr("tts.urllib.request.urlopen", fake_urlopen)

    text = (
        "Long replies should still speak clearly. "
        "The TTS service works better when the paragraph is divided into smaller spoken chunks. "
        "After that, the chunks can be joined back into one wav for playback."
    )
    audio = synthesize_gpt_sovits_tts_bytes(
        text,
        {
            "gpt_sovits_api_url": "http://127.0.0.1:9880/tts",
            "gpt_sovits_method": "POST",
            "gpt_sovits_timeout_sec": 60,
            "gpt_sovits_text_lang": "en",
            "gpt_sovits_prompt_lang": "en",
            "gpt_sovits_ref_audio_path": "ref.wav",
            "gpt_sovits_text_split_method": "cut0",
            "gpt_sovits_chunk_chars": 70,
            "gpt_sovits_chunk_max_candidates": 1,
            "gpt_sovits_chunk_split_depth": 0,
            "gpt_sovits_enable_global_retry": False,
            "gpt_sovits_normalize_loudness": False,
        },
    )

    assert audio.startswith(b"RIFF")
    assert len(calls) >= 2
    assert calls[0] != text
    assert all(len(call) <= 90 for call in calls)
