"""Small PCM helpers used by TTS without relying on deprecated audioop."""

from __future__ import annotations

import math
import struct


def _sample_bounds(sample_width):
    if int(sample_width) == 1:
        return -128, 127
    if int(sample_width) == 2:
        return -32768, 32767
    raise ValueError(f"Unsupported sample width: {sample_width}")


def _iter_samples(fragment, sample_width):
    data = bytes(fragment or b"")
    sample_width = int(sample_width)
    if sample_width == 1:
        for raw in data:
            yield int(raw) - 128
        return
    if sample_width == 2:
        count = len(data) // 2
        for idx in range(count):
            yield struct.unpack_from("<h", data, idx * 2)[0]
        return
    raise ValueError(f"Unsupported sample width: {sample_width}")


def _pack_samples(samples, sample_width):
    sample_width = int(sample_width)
    low, high = _sample_bounds(sample_width)
    if sample_width == 1:
        return bytes(max(0, min(255, int(round(value)) + 128)) for value in samples)
    if sample_width == 2:
        out = bytearray()
        for value in samples:
            clipped = max(low, min(high, int(round(value))))
            out.extend(struct.pack("<h", clipped))
        return bytes(out)
    raise ValueError(f"Unsupported sample width: {sample_width}")


def pcm_max(fragment, sample_width):
    values = [abs(value) for value in _iter_samples(fragment, sample_width)]
    return max(values) if values else 0


def pcm_rms(fragment, sample_width):
    values = list(_iter_samples(fragment, sample_width))
    if not values:
        return 0
    energy = sum(float(value) * float(value) for value in values)
    return math.sqrt(energy / float(len(values)))


def pcm_mul(fragment, sample_width, factor):
    gain = float(factor)
    return _pack_samples((value * gain for value in _iter_samples(fragment, sample_width)), sample_width)


def pcm_lin2lin(fragment, sample_width, target_sample_width):
    sample_width = int(sample_width)
    target_sample_width = int(target_sample_width)
    if sample_width == target_sample_width:
        return bytes(fragment or b"")
    samples = list(_iter_samples(fragment, sample_width))
    if sample_width == 1 and target_sample_width == 2:
        samples = [value << 8 for value in samples]
    elif sample_width == 2 and target_sample_width == 1:
        samples = [value >> 8 for value in samples]
    return _pack_samples(samples, target_sample_width)


def pcm_tomono(fragment, sample_width, left_factor, right_factor):
    values = list(_iter_samples(fragment, sample_width))
    left_factor = float(left_factor)
    right_factor = float(right_factor)
    mono = []
    for idx in range(0, len(values) - 1, 2):
        mono.append(values[idx] * left_factor + values[idx + 1] * right_factor)
    return _pack_samples(mono, sample_width)


def pcm_tostereo(fragment, sample_width, left_factor, right_factor):
    left_factor = float(left_factor)
    right_factor = float(right_factor)
    stereo = []
    for value in _iter_samples(fragment, sample_width):
        stereo.append(value * left_factor)
        stereo.append(value * right_factor)
    return _pack_samples(stereo, sample_width)


def pcm_ratecv(fragment, sample_width, channels, in_rate, out_rate):
    channels = max(1, int(channels))
    in_rate = int(in_rate)
    out_rate = int(out_rate)
    values = list(_iter_samples(fragment, sample_width))
    if not values or in_rate <= 0 or out_rate <= 0 or in_rate == out_rate:
        return bytes(fragment or b"")
    frame_count = len(values) // channels
    if frame_count <= 0:
        return b""
    out_frame_count = max(1, int(round(frame_count * (float(out_rate) / float(in_rate)))))
    output = []
    for out_idx in range(out_frame_count):
        src_pos = min(frame_count - 1, int(round(out_idx * float(in_rate) / float(out_rate))))
        start = src_pos * channels
        output.extend(values[start : start + channels])
    return _pack_samples(output, sample_width)
