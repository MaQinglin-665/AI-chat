import io
import struct
import wave

from tts_audio import (
    _concat_wav_audio_bytes,
    _looks_too_long_for_text,
    _looks_too_quiet_for_text,
    _looks_too_short_for_text,
    _normalize_wav_loudness,
    _trim_wav_audio_bytes,
    _wav_activity_stats,
    _wav_amplitude_stats,
    _wav_duration_seconds,
)


def _wav_from_samples(samples, sample_rate=16000):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"".join(struct.pack("<h", int(sample)) for sample in samples))
    return buf.getvalue()


def test_wav_duration_returns_none_for_non_wav_bytes():
    assert _wav_duration_seconds(b"not audio") is None


def test_trim_wav_audio_bytes_removes_outer_silence():
    samples = [0] * 2000 + [2600] * 800 + [0] * 2000
    audio = _wav_from_samples(samples)
    trimmed = _trim_wav_audio_bytes(audio, threshold=200)

    assert trimmed.startswith(b"RIFF")
    assert len(trimmed) < len(audio)
    assert _wav_duration_seconds(trimmed) < _wav_duration_seconds(audio)


def test_concat_wav_audio_bytes_joins_compatible_chunks():
    first = _wav_from_samples([1000] * 1600)
    second = _wav_from_samples([1200] * 1600)
    joined = _concat_wav_audio_bytes([first, second])

    assert joined.startswith(b"RIFF")
    assert _wav_duration_seconds(joined) > _wav_duration_seconds(first)


def test_audio_quality_heuristics_detect_common_bad_outputs():
    very_short = _wav_from_samples([2000] * 400)
    quiet = _wav_from_samples([100] * 16000)
    sparse = _wav_from_samples(([0] * 32000) + ([3000] * 500) + ([0] * 64000))
    long_audio = _wav_from_samples([2000] * (16000 * 10))

    assert _looks_too_short_for_text(very_short, "this should be longer")
    assert _looks_too_quiet_for_text(quiet, "quiet text")
    assert _wav_activity_stats(sparse)["active_ratio"] < 0.20
    assert _looks_too_long_for_text(long_audio, "short")


def test_normalize_wav_loudness_returns_metadata_for_valid_audio():
    audio = _wav_from_samples([120] * 16000)
    boosted, meta = _normalize_wav_loudness(audio, target_rms=1400, max_gain=3.2)

    before = _wav_amplitude_stats(audio)
    after = _wav_amplitude_stats(boosted)

    assert meta is not None
    assert after["rms"] >= before["rms"]
