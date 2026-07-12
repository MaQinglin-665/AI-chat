import struct
import warnings

import tts_audio


def _pcm16(*samples):
    return b"".join(struct.pack("<h", int(sample)) for sample in samples)


def test_tts_audio_pcm16_peak_rms_and_gain():
    pcm = _pcm16(-1000, 1000, -2000, 2000)

    assert tts_audio.pcm_max(pcm, 2) == 2000
    assert 1580 < tts_audio.pcm_rms(pcm, 2) < 1582

    scaled = tts_audio.pcm_mul(pcm, 2, 2.0)
    assert tts_audio.pcm_max(scaled, 2) == 4000


def test_tts_audio_converts_mono_to_stereo_and_back():
    mono = _pcm16(1000, -1000)
    stereo = tts_audio.pcm_tostereo(mono, 2, 1.0, 1.0)
    assert stereo == _pcm16(1000, 1000, -1000, -1000)

    folded = tts_audio.pcm_tomono(stereo, 2, 0.5, 0.5)
    assert folded == mono


def test_tts_module_import_does_not_emit_audioop_deprecation_warning():
    with warnings.catch_warnings():
        warnings.filterwarnings("error", category=DeprecationWarning, message=".*audioop.*")
        __import__("tts")
