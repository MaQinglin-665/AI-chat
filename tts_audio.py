import array
import io
import struct
import sys
import wave

try:
    import audioop as _audioop
except ImportError:
    _audioop = None  # Python 3.13+ removed audioop; graceful degradation


def _wav_duration_seconds(audio_bytes):
    if not isinstance(audio_bytes, (bytes, bytearray)) or len(audio_bytes) < 44:
        return None
    data = bytes(audio_bytes)
    if not (data[:4] == b"RIFF" and data[8:12] == b"WAVE"):
        return None
    try:
        with wave.open(io.BytesIO(data), "rb") as wf:
            sr = wf.getframerate()
            frames = wf.getnframes()
            if sr <= 0 or frames <= 0:
                return 0.0
            return float(frames) / float(sr)
    except Exception:
        return None


def _trim_wav_silence(raw_pcm, sample_width=2, threshold=200):
    """Trim leading and trailing near-silence from raw PCM bytes."""
    if not raw_pcm or len(raw_pcm) < 200 or sample_width not in (1, 2):
        return raw_pcm

    fmt = "<h" if sample_width == 2 else "<b"
    n_samples = len(raw_pcm) // sample_width
    start = 0
    for i in range(n_samples):
        val = struct.unpack_from(fmt, raw_pcm, i * sample_width)[0]
        if abs(val) > threshold:
            start = max(0, i - 80)
            break
    end = n_samples
    for i in range(n_samples - 1, -1, -1):
        val = struct.unpack_from(fmt, raw_pcm, i * sample_width)[0]
        if abs(val) > threshold:
            end = min(n_samples, i + 80)
            break
    if start >= end:
        return raw_pcm
    return raw_pcm[start * sample_width : end * sample_width]


def _concat_wav_audio_bytes(chunks):
    valid = [bytes(item) for item in chunks if isinstance(item, (bytes, bytearray)) and item]
    if not valid:
        return b""
    if len(valid) == 1:
        return valid[0]

    params = None
    parts = []
    for raw in valid:
        with wave.open(io.BytesIO(raw), "rb") as wf:
            cur = (
                wf.getnchannels(),
                wf.getsampwidth(),
                wf.getframerate(),
                wf.getcomptype(),
                wf.getcompname(),
            )
            sample_width = wf.getsampwidth()
            frames = wf.readframes(wf.getnframes())
            frames = _trim_wav_silence(frames, sample_width)
        if params is None:
            params = cur
        parts.append((cur, frames))

    target_ch, target_sw, target_sr, target_comp, target_comp_name = params
    frame_parts = []
    for cur, frames in parts:
        ch, sw, sr, _comp, _comp_name = cur
        pcm = frames
        try:
            if _audioop is not None:
                if sw != target_sw:
                    pcm = _audioop.lin2lin(pcm, sw, target_sw)
                    sw = target_sw
                if ch != target_ch:
                    if ch == 2 and target_ch == 1:
                        pcm = _audioop.tomono(pcm, sw, 0.5, 0.5)
                    elif ch == 1 and target_ch == 2:
                        pcm = _audioop.tostereo(pcm, sw, 1.0, 1.0)
                    else:
                        raise RuntimeError("Unsupported channel conversion")
                    ch = target_ch
                if sr != target_sr:
                    pcm, _ = _audioop.ratecv(pcm, sw, ch, sr, target_sr, None)
            else:
                if cur != params:
                    continue
        except Exception:
            if cur != params:
                continue
        frame_parts.append(pcm)

    if not frame_parts:
        return valid[0]

    out = io.BytesIO()
    with wave.open(out, "wb") as wf_out:
        wf_out.setnchannels(target_ch)
        wf_out.setsampwidth(target_sw)
        wf_out.setframerate(target_sr)
        wf_out.setcomptype(target_comp, target_comp_name)
        for frames in frame_parts:
            wf_out.writeframes(frames)
    return out.getvalue()


def _trim_wav_audio_bytes(audio_bytes, threshold=200):
    if not isinstance(audio_bytes, (bytes, bytearray)) or not audio_bytes:
        return audio_bytes
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            params = (
                wf.getnchannels(),
                wf.getsampwidth(),
                wf.getframerate(),
                wf.getcomptype(),
                wf.getcompname(),
            )
            frames = wf.readframes(wf.getnframes())
            trimmed = _trim_wav_silence(frames, wf.getsampwidth(), threshold=threshold)
        if not trimmed or len(trimmed) >= len(frames):
            return bytes(audio_bytes)
        out = io.BytesIO()
        with wave.open(out, "wb") as wf_out:
            wf_out.setnchannels(params[0])
            wf_out.setsampwidth(params[1])
            wf_out.setframerate(params[2])
            wf_out.setcomptype(params[3], params[4])
            wf_out.writeframes(trimmed)
        return out.getvalue()
    except Exception:
        return bytes(audio_bytes)


def _looks_too_short_for_text(audio_bytes, text):
    dur = _wav_duration_seconds(audio_bytes)
    if dur is None:
        return False
    chars = len(str(text or "").strip())
    if chars <= 0:
        return False
    expected = max(0.45, min(3.5, chars * 0.06))
    return dur < expected * 0.35


def _wav_amplitude_stats(audio_bytes):
    if not isinstance(audio_bytes, (bytes, bytearray)) or len(audio_bytes) < 44:
        return None
    data = bytes(audio_bytes)
    if not (data[:4] == b"RIFF" and data[8:12] == b"WAVE"):
        return None
    try:
        with wave.open(io.BytesIO(data), "rb") as wf:
            sw = wf.getsampwidth()
            frames = wf.readframes(wf.getnframes())
        if sw != 2 or not frames:
            return None

        samples = array.array("h")
        samples.frombytes(frames)
        if not samples:
            return {"peak": 0, "rms": 0.0}
        if sys.byteorder != "little":
            samples.byteswap()
        peak = max(abs(int(v)) for v in samples)
        energy = 0.0
        for v in samples:
            fv = float(v)
            energy += fv * fv
        rms = (energy / float(len(samples))) ** 0.5
        return {"peak": peak, "rms": rms}
    except Exception:
        return None


def _normalize_wav_loudness(
    audio_bytes,
    target_rms=900.0,
    max_gain=3.2,
    peak_limit=26000,
    max_rms=4200.0,
):
    if _audioop is None:
        return audio_bytes, None
    if not isinstance(audio_bytes, (bytes, bytearray)) or len(audio_bytes) < 44:
        return audio_bytes, None
    data = bytes(audio_bytes)
    if not (data[:4] == b"RIFF" and data[8:12] == b"WAVE"):
        return audio_bytes, None
    try:
        with wave.open(io.BytesIO(data), "rb") as wf:
            params = wf.getparams()
            sample_width = wf.getsampwidth()
            frames = wf.readframes(wf.getnframes())
        if sample_width != 2 or not frames:
            return audio_bytes, None

        peak_before = int(_audioop.max(frames, sample_width) or 0)
        rms_before = float(_audioop.rms(frames, sample_width) or 0.0)
        if peak_before <= 0 or rms_before <= 0:
            return audio_bytes, {
                "changed": False,
                "gain": 1.0,
                "peak_before": peak_before,
                "rms_before": rms_before,
                "peak_after": peak_before,
                "rms_after": rms_before,
            }

        safe_target = max(120.0, min(2400.0, float(target_rms)))
        safe_max_gain = max(1.0, min(8.0, float(max_gain)))
        safe_peak_limit = max(4000.0, min(32000.0, float(peak_limit)))
        safe_max_rms = max(safe_target, min(9000.0, float(max_rms)))
        gain = 1.0
        if rms_before > safe_max_rms:
            gain = min(gain, safe_max_rms / rms_before)
        desired_gain = safe_target / rms_before
        peak_limited_gain = safe_peak_limit / float(peak_before)
        if peak_before > safe_peak_limit:
            gain = min(gain, peak_limited_gain)
        if gain >= 1.0:
            gain = max(1.0, min(safe_max_gain, desired_gain, peak_limited_gain))
        if 0.97 <= gain <= 1.03:
            return audio_bytes, {
                "changed": False,
                "gain": 1.0,
                "peak_before": peak_before,
                "rms_before": rms_before,
                "peak_after": peak_before,
                "rms_after": rms_before,
            }

        boosted = _audioop.mul(frames, sample_width, gain)
        peak_after = int(_audioop.max(boosted, sample_width) or 0)
        rms_after = float(_audioop.rms(boosted, sample_width) or 0.0)
        out = io.BytesIO()
        with wave.open(out, "wb") as wf_out:
            wf_out.setparams(params)
            wf_out.writeframes(boosted)
        return out.getvalue(), {
            "changed": True,
            "gain": gain,
            "peak_before": peak_before,
            "rms_before": rms_before,
            "peak_after": peak_after,
            "rms_after": rms_after,
        }
    except Exception:
        return audio_bytes, None


def _looks_too_quiet_for_text(audio_bytes, text):
    stats = _wav_amplitude_stats(audio_bytes)
    if not stats:
        return False
    chars = len(str(text or "").strip())
    if chars <= 0:
        return False
    peak = float(stats.get("peak", 0.0) or 0.0)
    rms = float(stats.get("rms", 0.0) or 0.0)
    if chars >= 6 and peak < 700:
        return True
    if chars >= 8 and rms < 160:
        return True
    if chars >= 16 and rms < 240:
        return True
    return False


def _wav_activity_stats(audio_bytes, window_ms=500):
    if not isinstance(audio_bytes, (bytes, bytearray)) or len(audio_bytes) < 44:
        return None
    data = bytes(audio_bytes)
    if not (data[:4] == b"RIFF" and data[8:12] == b"WAVE"):
        return None
    try:
        with wave.open(io.BytesIO(data), "rb") as wf:
            if wf.getsampwidth() != 2 or wf.getnchannels() != 1:
                return None
            sample_rate = wf.getframerate()
            frames = wf.readframes(wf.getnframes())
        if sample_rate <= 0 or not frames:
            return None

        samples = array.array("h")
        samples.frombytes(frames)
        if not samples:
            return {"windows": 0, "active_windows": 0, "active_ratio": 0.0}
        if sys.byteorder != "little":
            samples.byteswap()
        win_size = max(1, int(sample_rate * max(0.2, float(window_ms) / 1000.0)))
        windows = 0
        active = 0
        for idx in range(0, len(samples), win_size):
            seg = samples[idx : idx + win_size]
            if not seg:
                continue
            windows += 1
            peak = max(abs(int(v)) for v in seg)
            energy = 0.0
            for v in seg:
                fv = float(v)
                energy += fv * fv
            rms = (energy / float(len(seg))) ** 0.5
            if peak >= 1800 or rms >= 220:
                active += 1
        ratio = (float(active) / float(windows)) if windows else 0.0
        return {"windows": windows, "active_windows": active, "active_ratio": ratio}
    except Exception:
        return None


def _looks_too_sparse_for_text(audio_bytes, text):
    activity = _wav_activity_stats(audio_bytes)
    if not activity:
        return False
    chars = len(str(text or "").strip())
    if chars <= 0:
        return False
    windows = int(activity.get("windows", 0) or 0)
    active_windows = int(activity.get("active_windows", 0) or 0)
    active_ratio = float(activity.get("active_ratio", 0.0) or 0.0)
    dur = float(_wav_duration_seconds(audio_bytes) or 0.0)
    if windows >= 8 and active_windows <= 1:
        return True
    if windows >= 8 and active_ratio < 0.20:
        return True
    if chars >= 10 and dur >= 7.5 and active_ratio < 0.30:
        return True
    return False


def _looks_too_long_for_text(audio_bytes, text):
    dur = _wav_duration_seconds(audio_bytes)
    if dur is None:
        return False
    chars = len(str(text or "").strip())
    if chars <= 0:
        return False
    upper = max(3.0, min(18.0, chars * 0.75 + 1.8))
    return dur > upper
