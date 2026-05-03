import asyncio
import base64
import io
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import wave

try:
    import audioop as _audioop
except ImportError:
    _audioop = None  # Python 3.13+ removed audioop; graceful degradation

from config import (
    DiagnosticError,
    GPT_SOVITS_DEFAULT_API_URL,
    GPT_SOVITS_DEFAULT_VOICE,
    ROOT_DIR,
    SERVER_TTS_PROVIDERS,
    TTS_DEFAULT_PROVIDER,
    TTS_DEFAULT_VOICE,
    VOLCENGINE_ACCESS_TOKEN_ENV,
    VOLCENGINE_APP_ID_ENV,
    VOLCENGINE_SECRET_KEY_ENV,
    VOLCENGINE_TTS_DEFAULT_API_URL,
    VOLCENGINE_TTS_DEFAULT_CLUSTER,
    VOLCENGINE_TTS_DEFAULT_VOICE,
    load_config,
)

try:
    import edge_tts
except Exception:
    edge_tts = None


def normalize_tts_text(text):
    safe = " ".join(str(text or "").split())
    if not safe:
        return ""
    return safe[:600]


def _perf_now_ms():
    return int(time.perf_counter() * 1000)


def _sanitize_perf_trace_id(raw):
    safe = re.sub(r"[^a-zA-Z0-9._:-]", "", str(raw or "").strip())[:64]
    return safe or "tts_unknown"


def _log_tts_perf(scope, trace_id, **metrics):
    parts = [f"trace={_sanitize_perf_trace_id(trace_id)}"]
    for key, value in metrics.items():
        k = re.sub(r"[^a-zA-Z0-9_:-]", "", str(key or "").strip().lower())
        if not k:
            continue
        if isinstance(value, bool):
            parts.append(f"{k}={1 if value else 0}")
        elif isinstance(value, (int, float)):
            parts.append(f"{k}={value}")
        else:
            text = str(value or "").strip().replace(" ", "_")
            if len(text) > 120:
                text = text[:120]
            parts.append(f"{k}={text}")
    print(f"[{str(scope or 'TTS').upper()}][PERF] {' | '.join(parts)}", file=sys.stderr)


def _normalize_gpt_sovits_spoken_text(text):
    src = " ".join(str(text or "").replace("`", " ").split()).strip()
    if not src:
        return ""
    src = re.sub(r"([.!?])(?=[A-Z'\"\u2018\u2019])", r"\1 ", src)
    src = re.sub(r"([,;:])(?=[A-Za-z])", r"\1 ", src)

    # Keep English replies intact; only apply aggressive token cleanup for CJK text.
    has_cjk = bool(re.search(r"[\u4e00-\u9fff]", src))

    speak = (
        src.replace("_", " ")
        .replace("/", " ")
        .replace("\\", " ")
    )
    speak = re.sub(r"[\u2600-\u27BF\uE000-\uF8FF\U0001F300-\U0001FAFF]", " ", speak)

    if has_cjk:
        def _replace_ascii_token(match):
            token = match.group(0)
            if re.fullmatch(r"\d+(?:[.:/_-]\d+)*", token):
                return token
            return " "

        speak = re.sub(r"[A-Za-z][A-Za-z0-9_./+-]*", _replace_ascii_token, speak)
        speak = re.sub(r"\s+([\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a,.!?;:])", r"\1", speak)
        speak = re.sub(r"([\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a,.!?;:])\s+", r"\1", speak)
        speak = re.sub(r"\s+", " ", speak).strip()
        speak = re.sub(r"[\u3001\uff0c,]{2,}", "\uff0c", speak)
        speak = re.sub(r"[\u3002.!?\uff01\uff1f]{2,}", "\u3002", speak)
    else:
        speak = re.sub(r"\bI['\u2019]m\b", "I am", speak, flags=re.I)
        speak = re.sub(r"\bI['\u2019]ve\b", "I have", speak, flags=re.I)
        speak = re.sub(r"\bI['\u2019]ll\b", "I will", speak, flags=re.I)
        speak = re.sub(r"\bI['\u2019]d\b", "I would", speak, flags=re.I)
        speak = re.sub(r"\b(can|do|does|did|is|are|was|were|has|have|had|should|could|would|will|won)['\u2019]t\b", r"\1 not", speak, flags=re.I)
        speak = re.sub(r"\b([A-Za-z]+)['\u2019]re\b", r"\1 are", speak)
        speak = re.sub(r"\b([A-Za-z]+)['\u2019]s\b", r"\1 is", speak)
        speak = re.sub(r"\s+([,.!?;:])", r"\1", speak)
        speak = re.sub(r"([,.!?;:])(?=[^\s])", r"\1 ", speak)
        speak = re.sub(r"[,;:]\s+", ". ", speak)
        speak = re.sub(r"\s+", " ", speak).strip()

    return speak[:600]


def _prefer_gpt_sovits_short_english_chunks(text):
    safe = str(text or "").strip()
    if _detect_text_lang(safe) != "en":
        return False
    if len(safe) > 72:
        return False
    return bool(re.search(r"[.!?].+|[,;:]", safe))


async def synthesize_edge_tts_bytes_async(text, voice, rate, volume, pitch):
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate,
        volume=volume,
        pitch=pitch,
    )
    chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            chunks.extend(chunk.get("data", b""))
    return bytes(chunks)


def _safe_float(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _safe_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if value is None:
        return bool(default)
    src = str(value).strip().lower()
    if src in {"1", "true", "yes", "on"}:
        return True
    if src in {"0", "false", "no", "off"}:
        return False
    return bool(default)


def _is_timeout_error_text(message):
    text = str(message or "").strip().lower()
    return "timed out" in text or "timeout" in text


def _is_network_error_text(message):
    text = str(message or "").strip().lower()
    markers = (
        "getaddrinfo",
        "name or service not known",
        "temporary failure in name resolution",
        "no route to host",
        "network is unreachable",
        "nodename nor servname",
        "failed to resolve",
        "dns",
    )
    return any(marker in text for marker in markers)


def _is_connection_refused_text(message):
    text = str(message or "").strip().lower()
    markers = (
        "connection refused",
        "actively refused",
        "winerror 10061",
        "errno 111",
    )
    return any(marker in text for marker in markers)


def _raise_gpt_sovits_connection_diagnostic(exc, api_url):
    detail = str(getattr(exc, "reason", "") or exc).strip()
    lower = detail.lower()
    if _is_timeout_error_text(lower):
        raise DiagnosticError(
            code="tts_timeout",
            reason="TTS 请求超时，GPT-SoVITS 未在限定时间内返回音频。",
            solution="确认 GPT-SoVITS 服务负载正常，或调大超时时间后重试。",
            config_key="tts.gpt_sovits_timeout_sec",
            detail=detail,
        ) from exc
    if _is_connection_refused_text(lower):
        raise DiagnosticError(
            code="gpt_sovits_not_started",
            reason=f"无法连接 GPT-SoVITS 服务：{api_url}",
            solution="请先启动 GPT-SoVITS 服务，再确认地址和端口配置正确。",
            config_key="tts.gpt_sovits_api_url",
            detail=detail,
        ) from exc
    if _is_network_error_text(lower):
        raise DiagnosticError(
            code="network_connection_failed",
            reason=f"网络连接失败，无法访问 GPT-SoVITS 地址：{api_url}",
            solution="请检查网络、代理和 DNS 设置，确认该地址可访问。",
            config_key="tts.gpt_sovits_api_url",
            detail=detail,
        ) from exc
    raise DiagnosticError(
        code="tts_connection_failed",
        reason=f"无法连接 TTS 服务地址：{api_url}",
        solution="请确认服务已启动，且地址与端口填写正确。",
        config_key="tts.gpt_sovits_api_url",
        detail=detail,
    ) from exc


def synthesize_volcengine_tts_bytes(text, tts_cfg, voice_override=None, prosody=None):
    app_id_env = str(tts_cfg.get("app_id_env") or VOLCENGINE_APP_ID_ENV).strip()
    access_token_env = str(
        tts_cfg.get("access_token_env") or VOLCENGINE_ACCESS_TOKEN_ENV
    ).strip()
    secret_key_env = str(tts_cfg.get("secret_key_env") or VOLCENGINE_SECRET_KEY_ENV).strip()

    app_id = str(tts_cfg.get("app_id") or tts_cfg.get("appid") or "").strip()
    access_token = str(tts_cfg.get("access_token") or tts_cfg.get("token") or "").strip()
    secret_key = str(tts_cfg.get("secret_key") or "").strip()

    if not app_id and app_id_env:
        app_id = str(os.environ.get(app_id_env, "")).strip()
    if not access_token and access_token_env:
        access_token = str(os.environ.get(access_token_env, "")).strip()
    if not secret_key and secret_key_env:
        secret_key = str(os.environ.get(secret_key_env, "")).strip()

    cluster = str(tts_cfg.get("cluster", VOLCENGINE_TTS_DEFAULT_CLUSTER)).strip()
    api_url = str(tts_cfg.get("api_url", VOLCENGINE_TTS_DEFAULT_API_URL)).strip()
    voice = str(
        voice_override or tts_cfg.get("voice") or VOLCENGINE_TTS_DEFAULT_VOICE
    ).strip()
    uid = str(tts_cfg.get("uid", "desktop_pet_user")).strip() or "desktop_pet_user"

    if not app_id:
        raise RuntimeError(
            f"Volcengine TTS missing app_id. Set tts.app_id or env {app_id_env}."
        )
    if not access_token:
        raise RuntimeError(
            "Volcengine TTS missing access_token. "
            f"Set tts.access_token or env {access_token_env}."
        )
    if not cluster:
        raise RuntimeError("Volcengine TTS missing cluster.")
    if not voice:
        raise RuntimeError("Volcengine TTS missing voice.")

    prosody = prosody if isinstance(prosody, dict) else {}
    speed_ratio = _safe_float(
        prosody.get("speed_ratio", tts_cfg.get("speed_ratio", 1.0)), 1.0
    )
    volume_ratio = _safe_float(
        prosody.get("volume_ratio", tts_cfg.get("volume_ratio", 1.0)), 1.0
    )
    pitch_ratio = _safe_float(
        prosody.get("pitch_ratio", tts_cfg.get("pitch_ratio", 1.0)), 1.0
    )
    speed_ratio = max(0.65, min(1.35, speed_ratio))
    volume_ratio = max(0.6, min(1.4, volume_ratio))
    pitch_ratio = max(0.7, min(1.3, pitch_ratio))

    payload = {
        "app": {
            "appid": app_id,
            "token": access_token,
            "cluster": cluster,
        },
        "user": {"uid": uid},
        "audio": {
            "voice_type": voice,
            "encoding": str(tts_cfg.get("encoding", "mp3")).strip() or "mp3",
            "speed_ratio": speed_ratio,
            "volume_ratio": volume_ratio,
            "pitch_ratio": pitch_ratio,
        },
        "request": {
            "reqid": str(uuid.uuid4()),
            "text": text,
            "text_type": str(tts_cfg.get("text_type", "plain")).strip() or "plain",
            "operation": "query",
        },
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer; {access_token}",
    }

    req = urllib.request.Request(
        url=api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Volcengine TTS HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Volcengine TTS connection failed: {exc}") from exc

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Volcengine TTS invalid JSON: {body[:300]}") from exc

    code = data.get("code")
    message = str(data.get("message") or data.get("msg") or "").strip()
    raw_audio = data.get("data")

    if isinstance(raw_audio, dict):
        raw_audio = raw_audio.get("audio") or raw_audio.get("data")

    if not raw_audio:
        detail = message or f"code={code}"
        raise RuntimeError(f"Volcengine TTS failed: {detail}")

    if code not in (0, 200, 3000):
        raise RuntimeError(f"Volcengine TTS failed: {message or f'code={code}'}")

    try:
        audio = base64.b64decode(raw_audio)
    except Exception as exc:
        raise RuntimeError("Volcengine TTS audio decode failed.") from exc

    if not audio:
        raise RuntimeError("Volcengine TTS returned empty audio.")
    return audio


def _safe_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _looks_like_audio_bytes(raw):
    if not isinstance(raw, (bytes, bytearray)) or len(raw) < 16:
        return False
    data = bytes(raw)
    head4 = data[:4]
    head3 = data[:3]
    head2 = data[:2]
    if head4 == b"RIFF" and data[8:12] == b"WAVE":
        return True
    if head4 == b"OggS" or head4 == b"fLaC":
        return True
    if head3 == b"ID3":
        return True
    if head2 in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
        return True
    return False


def _try_decode_base64_audio(value):
    raw = str(value or "").strip()
    if not raw:
        return b""
    if raw.startswith("data:") and ";base64," in raw:
        raw = raw.split(";base64,", 1)[1]
    cleaned = "".join(raw.split())
    if len(cleaned) < 32:
        return b""
    try:
        audio = base64.b64decode(cleaned, validate=True)
    except Exception:
        return b""
    return audio if _looks_like_audio_bytes(audio) else b""


def _extract_audio_from_json_payload(payload):
    if isinstance(payload, str):
        return _try_decode_base64_audio(payload)
    if isinstance(payload, list):
        for item in payload:
            audio = _extract_audio_from_json_payload(item)
            if audio:
                return audio
        return b""
    if not isinstance(payload, dict):
        return b""

    for key in ("audio", "audio_base64", "wav", "mp3", "data"):
        if key in payload:
            audio = _extract_audio_from_json_payload(payload.get(key))
            if audio:
                return audio
    for key in ("result", "output", "payload", "response"):
        if key in payload:
            audio = _extract_audio_from_json_payload(payload.get(key))
            if audio:
                return audio
    return b""


def _extract_audio_url_from_json_payload(payload):
    if isinstance(payload, str):
        s = payload.strip()
        return s if s.startswith("http://") or s.startswith("https://") else ""
    if isinstance(payload, list):
        for item in payload:
            link = _extract_audio_url_from_json_payload(item)
            if link:
                return link
        return ""
    if not isinstance(payload, dict):
        return ""

    for key in ("audio_url", "url", "audio_path", "path"):
        raw = str(payload.get(key, "")).strip()
        if raw.startswith("http://") or raw.startswith("https://"):
            return raw
    for key in ("result", "output", "payload", "response", "data"):
        link = _extract_audio_url_from_json_payload(payload.get(key))
        if link:
            return link
    return ""


def _download_audio_bytes(url, timeout=30):
    req = urllib.request.Request(
        url=url,
        headers={"Accept": "audio/*,application/octet-stream"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
    if not data:
        raise RuntimeError("GPT-SoVITS returned empty audio url body.")
    return data


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


def _split_gpt_sovits_text(text, max_len=200):
    """Split text only when it exceeds max_len."""
    src = " ".join(str(text or "").split()).strip()
    if not src:
        return []
    max_len = max(60, int(max_len or 200))
    if len(src) <= max_len:
        return [src]

    strong_breaks = {"\u3002", "\uff01", "\uff1f", "!", "?", ".", "\n"}
    soft_breaks = {"\uff0c", "\u3001", "\uff1b", "\uff1a", ",", ";", ":", " "}

    pieces = []
    current = ""

    def _flush(buf, target):
        s = buf.strip()
        if not s:
            return
        if len(s) <= max_len:
            target.append(s)
            return
        start = 0
        n = len(s)
        while start < n:
            end = min(start + max_len, n)
            if end < n:
                cut = -1
                for i in range(end, start, -1):
                    if s[i - 1] in soft_breaks or s[i - 1] in strong_breaks:
                        cut = i
                        break
                if cut <= start:
                    cut = end
            else:
                cut = end
            part = s[start:cut].strip()
            if part:
                target.append(part)
            start = cut

    for ch in src:
        current += ch
        if ch in strong_breaks and len(current.strip()) >= 8:
            _flush(current, pieces)
            current = ""
        elif len(current) >= max_len * 2:
            _flush(current, pieces)
            current = ""

    if current.strip():
        _flush(current, pieces)

    return pieces if pieces else [src]


def _trim_wav_silence(raw_pcm, sample_width=2, threshold=200):
    """Trim leading and trailing near-silence from raw PCM bytes."""
    if not raw_pcm or len(raw_pcm) < 200 or sample_width not in (1, 2):
        return raw_pcm
    import struct

    fmt = "<h" if sample_width == 2 else "<b"
    n_samples = len(raw_pcm) // sample_width
    # Find first non-silent sample
    start = 0
    for i in range(n_samples):
        val = struct.unpack_from(fmt, raw_pcm, i * sample_width)[0]
        if abs(val) > threshold:
            start = max(0, i - 80)  # keep 80 samples (~2ms) of lead-in
            break
    # Find last non-silent sample
    end = n_samples
    for i in range(n_samples - 1, -1, -1):
        val = struct.unpack_from(fmt, raw_pcm, i * sample_width)[0]
        if abs(val) > threshold:
            end = min(n_samples, i + 80)  # keep 80 samples of tail
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
                # audioop unavailable (Python 3.13+): skip mismatched chunks
                if cur != params:
                    continue
        except Exception:
            # Skip incompatible chunk instead of failing the whole reply.
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


def _looks_too_short_for_text(audio_bytes, text):
    dur = _wav_duration_seconds(audio_bytes)
    if dur is None:
        return False
    chars = len(str(text or "").strip())
    if chars <= 0:
        return False
    expected = max(0.45, min(3.5, chars * 0.06))
    # If generated duration is far below rough expectation, treat as degraded sample.
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
        import array

        arr = array.array("h")
        arr.frombytes(frames)
        if not arr:
            return {"peak": 0, "rms": 0.0}
        if sys.byteorder != "little":
            arr.byteswap()
        peak = max(abs(int(v)) for v in arr)
        energy = 0.0
        for v in arr:
            fv = float(v)
            energy += fv * fv
        rms = (energy / float(len(arr))) ** 0.5
        return {"peak": peak, "rms": rms}
    except Exception:
        return None


def _normalize_wav_loudness(audio_bytes, target_rms=900.0, max_gain=3.2, peak_limit=26000):
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
        desired_gain = safe_target / rms_before
        peak_limited_gain = safe_peak_limit / float(peak_before)
        gain = max(1.0, min(safe_max_gain, desired_gain, peak_limited_gain))
        if gain <= 1.03:
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
        import array

        arr = array.array("h")
        arr.frombytes(frames)
        if not arr:
            return {"windows": 0, "active_windows": 0, "active_ratio": 0.0}
        if sys.byteorder != "little":
            arr.byteswap()
        win_size = max(1, int(sample_rate * max(0.2, float(window_ms) / 1000.0)))
        windows = 0
        active = 0
        for idx in range(0, len(arr), win_size):
            seg = arr[idx : idx + win_size]
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


def _detect_text_lang(text):
    """Detect text language. Use 'auto' for any Chinese+English mix."""
    s = str(text or "").strip()
    if not s:
        return "zh"
    cn_chars = sum(1 for c in s if "\u4e00" <= c <= "\u9fff")
    en_chars = sum(1 for c in s if c.isascii() and c.isalpha())
    if cn_chars == 0 and en_chars > 0:
        return "en"
    if cn_chars > 0 and en_chars > 0:
        return "auto"
    return "zh"


def _should_replace_en_words_for_tts(text):
    lang = _detect_text_lang(text)
    if lang == "en":
        return False
    if lang == "zh":
        return True
    s = str(text or "")
    cn_chars = sum(1 for c in s if "\u4e00" <= c <= "\u9fff")
    en_chars = sum(1 for c in s if c.isascii() and c.isalpha())
    return cn_chars >= en_chars


def synthesize_gpt_sovits_tts_bytes(text, tts_cfg, voice_override=None, prosody=None, perf_trace_id=""):
    trace_id = _sanitize_perf_trace_id(perf_trace_id)
    original_text = str(text or "")
    text = _normalize_gpt_sovits_spoken_text(text)
    if not text:
        raise RuntimeError("GPT-SoVITS text is empty.")
    if original_text != text:
        _log_tts_perf(
            "TTS_GPT_SOVITS",
            trace_id,
            stage="text_normalized",
            original_chars=len(original_text),
            normalized_chars=len(text),
        )
    api_url = str(
        tts_cfg.get("gpt_sovits_api_url")
        or tts_cfg.get("api_url")
        or GPT_SOVITS_DEFAULT_API_URL
    ).strip()
    if not api_url:
        raise DiagnosticError(
            code="gpt_sovits_url_missing",
            reason="GPT-SoVITS 接口地址为空，无法发起语音请求。",
            solution="请填写可访问的 GPT-SoVITS 地址，例如 http://127.0.0.1:9880/tts。",
            config_key="tts.gpt_sovits_api_url",
        )

    method = str(tts_cfg.get("gpt_sovits_method", "POST") or "POST").strip().upper()
    if method not in {"POST", "GET"}:
        method = "POST"
    timeout_sec = max(
        8,
        min(
            180,
            _safe_int(tts_cfg.get("gpt_sovits_timeout_sec", 60), 60),
        ),
    )

    voice = str(
        voice_override
        or tts_cfg.get("voice")
        or tts_cfg.get("gpt_sovits_voice")
        or GPT_SOVITS_DEFAULT_VOICE
    ).strip()
    prosody = prosody if isinstance(prosody, dict) else {}
    speed = _safe_float(
        prosody.get("speed_ratio", tts_cfg.get("gpt_sovits_speed", 1.0)),
        1.0,
    )
    _dominant = str(prosody.get("_dominant", "neutral")).strip().lower()
    _arousal = _safe_float(prosody.get("_arousal", 0.5), 0.5)
    if _dominant == "happy" and _arousal > 0.5:
        speed = min(1.5, speed * 1.12)
    elif _dominant in ("sad", "anxious"):
        speed = max(0.7, speed * 0.9)
    speed = max(0.6, min(1.8, speed))
    stable_top_k = max(1, int(_safe_float(tts_cfg.get("gpt_sovits_top_k", 8), 8)))
    stable_top_p = max(0.5, min(0.98, _safe_float(tts_cfg.get("gpt_sovits_top_p", 0.78), 0.78)))
    stable_temp = max(0.1, min(1.2, _safe_float(tts_cfg.get("gpt_sovits_temperature", 0.36), 0.36)))
    stable_repeat = max(
        1.0,
        min(1.35, _safe_float(tts_cfg.get("gpt_sovits_repetition_penalty", 1.08), 1.08)),
    )
    stable_seed = int(_safe_float(tts_cfg.get("gpt_sovits_seed", 0), 0))
    normalize_loudness = _safe_bool(
        tts_cfg.get("gpt_sovits_normalize_loudness", True), True
    )
    target_rms = _safe_float(tts_cfg.get("gpt_sovits_target_rms", 1400), 1400)
    max_loudness_gain = _safe_float(
        tts_cfg.get("gpt_sovits_max_loudness_gain", 3.2), 3.2
    )
    prefer_clean_prompt = _safe_bool(tts_cfg.get("gpt_sovits_prefer_clean_prompt", True), True)
    chunk_max_candidates = max(
        1, min(4, _safe_int(tts_cfg.get("gpt_sovits_chunk_max_candidates", 2), 2))
    )
    chunk_split_depth = max(
        0, min(2, _safe_int(tts_cfg.get("gpt_sovits_chunk_split_depth", 1), 1))
    )
    enable_global_retry = _safe_bool(
        tts_cfg.get("gpt_sovits_enable_global_retry", False), False
    )
    chunk_timeout_sec = max(
        8, min(timeout_sec, _safe_int(tts_cfg.get("gpt_sovits_chunk_timeout_sec", 20), 20))
    )

    payload = {"text": text}
    if voice:
        payload["voice"] = voice
        payload["speaker"] = voice

    # api_v2 prefers "media_type"; keep "format" for compatibility with other wrappers.
    optional_map = {
        "text_lang": "gpt_sovits_text_lang",
        "prompt_lang": "gpt_sovits_prompt_lang",
        "ref_audio_path": "gpt_sovits_ref_audio_path",
        "top_k": "gpt_sovits_top_k",
        "top_p": "gpt_sovits_top_p",
        "temperature": "gpt_sovits_temperature",
        "media_type": "gpt_sovits_media_type",
        "format": "gpt_sovits_format",
    }
    for out_key, cfg_key in optional_map.items():
        value = tts_cfg.get(cfg_key)
        if value is None:
            continue
        if isinstance(value, str):
            value = value.strip()
            if not value:
                continue
        payload[out_key] = value
    detected_lang = _detect_text_lang(text)
    # Always follow runtime text detection to avoid language mismatch
    # (e.g. config fixed to "en" but current reply is Chinese).
    if detected_lang in {"auto", "en", "zh"}:
        payload["text_lang"] = detected_lang
    if tts_cfg.get("gpt_sovits_use_prompt_text"):
        prompt_text = str(tts_cfg.get("gpt_sovits_prompt_text") or "").strip()
        if prompt_text:
            payload["prompt_text"] = prompt_text
    if "ref_audio_path" in payload:
        ref = str(payload.get("ref_audio_path") or "").strip()
        if ref:
            ref_path = Path(ref)
            if not ref_path.is_absolute():
                ref_path = ROOT_DIR / ref_path
            payload["ref_audio_path"] = str(ref_path.resolve()).replace("\\", "/")
    payload["speed_factor"] = speed
    payload.setdefault("seed", 0)

    # Prefer stable full-file mode for desktop playback:
    # - use media_type=wav
    # - use text_split_method=cut0 (single-pass)
    # - keep streaming_mode disabled to avoid incomplete WAV headers.
    if "media_type" not in payload:
        fallback_media = str(
            tts_cfg.get("gpt_sovits_format")
            or tts_cfg.get("format")
            or "wav"
        ).strip().lower()
        if fallback_media == "mp3":
            fallback_media = "wav"
        if fallback_media in {"wav", "ogg", "aac", "raw"}:
            payload["media_type"] = fallback_media
    if "text_split_method" not in payload:
        split_method = str(tts_cfg.get("gpt_sovits_text_split_method", "cut0") or "cut0").strip()
        payload["text_split_method"] = split_method or "cut0"
    if "return_fragment" not in payload:
        payload["return_fragment"] = False
    if "streaming_mode" not in payload:
        payload["streaming_mode"] = _safe_int(tts_cfg.get("gpt_sovits_streaming_mode", 0), 0)

    api_key = str(tts_cfg.get("gpt_sovits_api_key", "") or "").strip()
    api_key_header = str(
        tts_cfg.get("gpt_sovits_api_key_header", "Authorization") or "Authorization"
    ).strip()
    headers = {
        "Accept": "audio/*,application/octet-stream,application/json",
        "User-Agent": "xinyu-ai-desktop-pet/1.0",
    }
    if api_key:
        token = api_key
        if api_key_header.lower() == "authorization" and not token.lower().startswith(
            "bearer "
        ):
            token = f"Bearer {token}"
        headers[api_key_header] = token

    def _request_once(req_payload, timeout_override=None):
        call_timeout = timeout_sec
        if timeout_override is not None:
            call_timeout = max(8, min(timeout_sec, int(timeout_override)))
        if method == "GET":
            query = urllib.parse.urlencode(req_payload, doseq=True)
            full_url = f"{api_url}{'&' if '?' in api_url else '?'}{query}"
            req = urllib.request.Request(url=full_url, headers=headers, method="GET")
        else:
            req_headers = dict(headers)
            req_headers["Content-Type"] = "application/json"
            req = urllib.request.Request(
                url=api_url,
                data=json.dumps(req_payload, ensure_ascii=False).encode("utf-8"),
                headers=req_headers,
                method="POST",
            )

        try:
            with urllib.request.urlopen(req, timeout=call_timeout) as resp:
                body = resp.read()
                content_type = str(resp.headers.get("Content-Type", "")).lower()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            if int(exc.code) in {408, 504}:
                raise DiagnosticError(
                    code="tts_timeout",
                    reason="TTS 请求超时，GPT-SoVITS 服务响应过慢。",
                    solution="请确认服务负载正常，必要时调大超时时间。",
                    config_key="tts.gpt_sovits_timeout_sec",
                    detail=detail,
                ) from exc
            if int(exc.code) == 404:
                raise DiagnosticError(
                    code="gpt_sovits_endpoint_not_found",
                    reason=f"GPT-SoVITS 地址返回 404：{api_url}",
                    solution="请确认接口路径正确（常见为 /tts），并检查服务版本。",
                    config_key="tts.gpt_sovits_api_url",
                    detail=detail,
                ) from exc
            raise RuntimeError(f"GPT-SoVITS HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            _raise_gpt_sovits_connection_diagnostic(exc, api_url)

        if not body:
            raise RuntimeError("GPT-SoVITS returned empty response.")
        if "audio/" in content_type or "octet-stream" in content_type or _looks_like_audio_bytes(
            body
        ):
            return body

        text_body = body.decode("utf-8", errors="ignore").strip()
        if text_body.startswith("http://") or text_body.startswith("https://"):
            return _download_audio_bytes(text_body, timeout=call_timeout)

        try:
            parsed = json.loads(text_body)
        except Exception as exc:
            preview = text_body[:240]
            raise RuntimeError(f"GPT-SoVITS invalid response: {preview}") from exc

        audio = _extract_audio_from_json_payload(parsed)
        if audio:
            return audio
        audio_url = _extract_audio_url_from_json_payload(parsed)
        if audio_url:
            return _download_audio_bytes(audio_url, timeout=call_timeout)
        raise RuntimeError("GPT-SoVITS response has no audio data.")

    chunk_char_limit = max(
        10, min(300, _safe_int(tts_cfg.get("gpt_sovits_chunk_chars", 200), 200))
    )
    text_chunks = _split_gpt_sovits_text(text, chunk_char_limit)
    fallback_ref = str(
        tts_cfg.get("gpt_sovits_fallback_ref_audio_path")
        or (ROOT_DIR / "tts_ref" / "taffy_ref.wav")
    ).strip()
    if fallback_ref:
        fallback_ref_obj = Path(fallback_ref)
        if not fallback_ref_obj.is_absolute():
            fallback_ref_obj = ROOT_DIR / fallback_ref_obj
        fallback_ref_path = str(fallback_ref_obj.resolve())
    else:
        fallback_ref_path = ""

    def _audio_bad(audio_bytes, chunk_text):
        return (
            _looks_too_short_for_text(audio_bytes, chunk_text)
            or _looks_too_quiet_for_text(audio_bytes, chunk_text)
            or _looks_too_sparse_for_text(audio_bytes, chunk_text)
            or _looks_too_long_for_text(audio_bytes, chunk_text)
        )

    def _audio_score(audio_bytes, chunk_text):
        bad = _audio_bad(audio_bytes, chunk_text)
        dur = float(_wav_duration_seconds(audio_bytes) or 0.0)
        stats = _wav_amplitude_stats(audio_bytes) or {}
        activity = _wav_activity_stats(audio_bytes) or {}
        peak = float(stats.get("peak", 0.0) or 0.0)
        rms = float(stats.get("rms", 0.0) or 0.0)
        active_ratio = float(activity.get("active_ratio", 0.0) or 0.0)
        return (0 if bad else 1, active_ratio, dur, peak, rms)

    def _prepare_chunk_payload(req_payload, prompt_text=None, ref_audio_path=None, speed_factor=None):
        candidate = dict(req_payload)
        candidate["streaming_mode"] = 0
        candidate["return_fragment"] = False
        candidate["text_split_method"] = "cut0"
        candidate["media_type"] = "wav"
        candidate["parallel_infer"] = False
        candidate["split_bucket"] = False
        candidate["batch_size"] = 1
        candidate["top_k"] = stable_top_k
        candidate["top_p"] = stable_top_p
        candidate["temperature"] = stable_temp
        candidate["repetition_penalty"] = stable_repeat
        candidate["seed"] = stable_seed
        candidate["speed_factor"] = _safe_float(
            speed_factor if speed_factor is not None else candidate.get("speed_factor", 1.0),
            1.0,
        )
        if prompt_text is not None:
            candidate["prompt_text"] = prompt_text
        if ref_audio_path is not None:
            candidate["ref_audio_path"] = ref_audio_path
        return candidate

    def _split_chunk_finer(chunk_text):
        safe = " ".join(str(chunk_text or "").split()).strip()
        if len(safe) <= 4:
            return [safe] if safe else []
        finer = _split_gpt_sovits_text(safe, max(6, min(10, len(safe) // 2 + 1)))
        if len(finer) > 1:
            return finer
        punct = {"\u3002", "\uff01", "\uff1f", "!", "?", ".", "\uff0c", "\u3001", "\uff1b", "\uff1a", ",", ";", ":"}
        mid = len(safe) // 2
        split_at = -1
        for radius in range(len(safe)):
            left = mid - radius
            right = mid + radius
            if 0 < left < len(safe) and safe[left - 1] in punct:
                split_at = left
                break
            if 0 < right < len(safe) and safe[right - 1] in punct:
                split_at = right
                break
        if split_at <= 0 or split_at >= len(safe):
            split_at = mid
        left = safe[:split_at].strip()
        right = safe[split_at:].strip()
        return [part for part in (left, right) if part]

    def _request_chunk_stable(chunk_text, req_payload, depth=0):
        safe = " ".join(str(chunk_text or "").split()).strip()
        if not safe:
            return b""

        candidate_payloads = []
        base_prompt = req_payload.get("prompt_text")
        current_ref = str(req_payload.get("ref_audio_path") or "").strip()
        if prefer_clean_prompt:
            candidate_payloads.append(_prepare_chunk_payload(req_payload, prompt_text=""))
        if base_prompt:
            candidate_payloads.append(_prepare_chunk_payload(req_payload, prompt_text=base_prompt))
        if not candidate_payloads:
            candidate_payloads.append(_prepare_chunk_payload(req_payload, prompt_text=""))
        if fallback_ref_path:
            same_ref = current_ref and os.path.abspath(current_ref).lower() == fallback_ref_path.lower()
            if not same_ref and os.path.exists(fallback_ref_path):
                candidate_payloads.append(
                    _prepare_chunk_payload(
                        req_payload,
                        prompt_text="",
                        ref_audio_path=fallback_ref_path.replace("\\", "/"),
                        speed_factor=0.95,
                    )
                )
        candidate_payloads.append(dict(req_payload))
        seen_signatures = set()
        ordered_candidates = []
        for candidate in candidate_payloads:
            signature = (
                str(candidate.get("prompt_text", "")),
                str(candidate.get("ref_audio_path", "")),
                str(candidate.get("speed_factor", "")),
                str(candidate.get("temperature", "")),
                str(candidate.get("top_p", "")),
                str(candidate.get("repetition_penalty", "")),
            )
            if signature in seen_signatures:
                continue
            seen_signatures.add(signature)
            if len(ordered_candidates) >= chunk_max_candidates:
                break
            ordered_candidates.append(candidate)

        if not ordered_candidates:
            ordered_candidates = [dict(req_payload)]

        best_audio = b""
        best_score = None
        for candidate_index, candidate in enumerate(ordered_candidates, start=1):
            current_payload = dict(candidate)
            current_payload["text"] = safe
            try:
                audio_bytes = _request_once(current_payload, timeout_override=chunk_timeout_sec)
            except Exception as exc:
                _log_tts_perf(
                    "TTS_GPT_SOVITS",
                    trace_id,
                    stage="chunk_candidate_fail",
                    depth=depth,
                    candidate=candidate_index,
                    chunk_chars=len(safe),
                    error_type=type(exc).__name__,
                )
                continue
            score = _audio_score(audio_bytes, safe)
            is_bad = _audio_bad(audio_bytes, safe)
            _log_tts_perf(
                "TTS_GPT_SOVITS",
                trace_id,
                stage="chunk_candidate",
                depth=depth,
                candidate=candidate_index,
                chunk_chars=len(safe),
                audio_bytes=len(audio_bytes or b""),
                audio_duration_ms=int(round(float(_wav_duration_seconds(audio_bytes) or 0.0) * 1000)),
                bad=is_bad,
            )
            if best_score is None or score > best_score:
                best_audio = audio_bytes
                best_score = score
            if not is_bad:
                return audio_bytes

        if depth < chunk_split_depth and len(safe) >= 8:
            finer_parts = _split_chunk_finer(safe)
            if len(finer_parts) > 1:
                sub_audios = []
                for finer_text in finer_parts:
                    sub_audio = _request_chunk_stable(finer_text, req_payload, depth + 1)
                    if sub_audio:
                        sub_audios.append(sub_audio)
                if sub_audios:
                    try:
                        combined_audio = _concat_wav_audio_bytes(sub_audios)
                    except Exception:
                        combined_audio = sub_audios[0]
                    combined_score = _audio_score(combined_audio, safe)
                    if best_score is None or combined_score >= best_score:
                        return combined_audio

        return best_audio

    def _request_text_chunks(req_payload, chunks):
        parts = []
        for chunk in chunks:
            chunk_text = str(chunk or "").strip()
            if not chunk_text:
                continue
            chunk_audio = _request_chunk_stable(chunk_text, req_payload, depth=0)
            if chunk_audio:
                parts.append(chunk_audio)
        if not parts:
            return b""
        try:
            return _concat_wav_audio_bytes(parts)
        except Exception:
            return parts[0]

    prefer_chunked = len(text) > chunk_char_limit or _prefer_gpt_sovits_short_english_chunks(text)
    _log_tts_perf(
        "TTS_GPT_SOVITS",
        trace_id,
        stage="plan",
        text_chars=len(text),
        chunks=len(text_chunks or []),
        chunk_char_limit=chunk_char_limit,
        prefer_chunked=prefer_chunked,
        detected_lang=detected_lang,
    )
    if prefer_chunked:
        # For long text, prefer one-shot first. Chunking is a fallback when one-shot output is degraded.
        try:
            one_shot_audio = _request_once(payload)
        except Exception:
            one_shot_audio = b""
        _log_tts_perf(
            "TTS_GPT_SOVITS",
            trace_id,
            stage="one_shot",
            audio_bytes=len(one_shot_audio or b""),
            audio_duration_ms=int(round(float(_wav_duration_seconds(one_shot_audio) or 0.0) * 1000)),
        )
        one_shot_bad = (
            not one_shot_audio
            or _looks_too_short_for_text(one_shot_audio, text)
            or _looks_too_quiet_for_text(one_shot_audio, text)
        )
        if one_shot_bad:
            chunk_audio = _request_text_chunks(payload, text_chunks or [text])
            audio = chunk_audio or one_shot_audio
        else:
            audio = one_shot_audio
    else:
        audio = _request_once(payload)
    degraded = _looks_too_short_for_text(audio, text) or _looks_too_quiet_for_text(audio, text)
    if degraded and enable_global_retry:
        retry_payload = dict(payload)
        retry_payload["streaming_mode"] = 0
        retry_payload["return_fragment"] = False
        retry_payload["text_split_method"] = "cut0"
        retry_payload["media_type"] = "wav"
        retry_payload["speed_factor"] = max(0.9, min(1.02, speed))
        retry_payload["temperature"] = stable_temp
        retry_payload["top_p"] = stable_top_p
        retry_payload["top_k"] = stable_top_k
        retry_payload["repetition_penalty"] = stable_repeat
        retry_payload["seed"] = stable_seed
        retry_audio = (
            _request_text_chunks(retry_payload, text_chunks)
            if prefer_chunked
            else _request_once(retry_payload)
        )
        if retry_audio:
            audio = retry_audio
        still_bad = _looks_too_short_for_text(audio, text) or _looks_too_quiet_for_text(audio, text)
        if still_bad:
            current_ref = str(payload.get("ref_audio_path") or "").strip()
            if fallback_ref:
                fallback_ref_path = os.path.abspath(fallback_ref)
                current_ref_path = os.path.abspath(current_ref) if current_ref else ""
                if (
                    os.path.exists(fallback_ref_path)
                    and fallback_ref_path.lower() != current_ref_path.lower()
                ):
                    retry_payload3 = dict(retry_payload)
                    retry_payload3["ref_audio_path"] = fallback_ref_path.replace("\\", "/")
                    retry_audio3 = (
                        _request_text_chunks(retry_payload3, text_chunks)
                        if prefer_chunked
                        else _request_once(retry_payload3)
                    )
                    if retry_audio3:
                        audio = retry_audio3
    if not audio:
        raise DiagnosticError(
            code="gpt_sovits_not_started",
            reason="GPT-SoVITS 未返回有效音频数据。",
            solution="请确认 GPT-SoVITS 服务已启动并可正常合成语音。",
            config_key="tts.gpt_sovits_api_url",
        )
    _log_tts_perf(
        "TTS_GPT_SOVITS",
        trace_id,
        stage="selected_audio",
        audio_bytes=len(audio or b""),
        audio_duration_ms=int(round(float(_wav_duration_seconds(audio) or 0.0) * 1000)),
    )
    if normalize_loudness:
        audio, loudness_meta = _normalize_wav_loudness(
            audio,
            target_rms=target_rms,
            max_gain=max_loudness_gain,
        )
        if loudness_meta:
            _log_tts_perf(
                "TTS_GPT_SOVITS",
                trace_id,
                stage=(
                    "loudness_normalized"
                    if loudness_meta.get("changed")
                    else "loudness_checked"
                ),
                gain=round(float(loudness_meta.get("gain", 1.0)), 3),
                rms_before=int(round(float(loudness_meta.get("rms_before", 0.0)))),
                rms_after=int(round(float(loudness_meta.get("rms_after", 0.0)))),
                peak_before=int(loudness_meta.get("peak_before", 0) or 0),
                peak_after=int(loudness_meta.get("peak_after", 0) or 0),
                target_rms=int(round(float(target_rms))),
            )
    return audio


_EN_TO_CN_PHONETIC = {
    "ai": "诶爱",
    "ok": "欧凯",
    "emo": "一某",
    "cpu": "西皮优",
    "gpu": "吉皮优",
    "bug": "巴格",
    "app": "艾普",
    "ip": "爱皮",
    "id": "爱迪",
    "pc": "皮西",
    "vip": "微爱皮",
    "diy": "迪爱歪",
    "wifi": "歪发",
    "gpt": "吉皮提",
    "pdf": "皮迪艾弗",
    "url": "优阿尔艾尔",
    "api": "诶皮爱",
    "npc": "恩皮西",
    "rpg": "阿皮吉",
    "fps": "艾弗皮艾斯",
    "bgm": "必吉艾姆",
    "pvp": "皮微皮",
    "pve": "皮微伊",
}


def _replace_en_words_for_tts(text):
    """Replace common short English words with Chinese phonetic equivalents."""
    if not _should_replace_en_words_for_tts(text):
        return str(text or "")
    result = str(text or "")
    for en, cn in _EN_TO_CN_PHONETIC.items():
        pattern = re.compile(r'(?<![a-zA-Z])' + re.escape(en) + r'(?![a-zA-Z])', re.IGNORECASE)
        result = pattern.sub(cn, result)
    return result


def synthesize_tts_audio(text, voice_override=None, prosody=None, perf_trace_id=""):
    perf_trace = _sanitize_perf_trace_id(perf_trace_id)
    total_started_ms = _perf_now_ms()
    config = load_config()
    tts_cfg = config.get("tts", {})
    provider = str(tts_cfg.get("provider", TTS_DEFAULT_PROVIDER)).strip().lower()
    if provider in ("gpt_sovits",):
        text = _replace_en_words_for_tts(text)
    safe_text = normalize_tts_text(text)
    prosody = prosody if isinstance(prosody, dict) else {}
    try:
        from app import load_emotion_state
        _emo = load_emotion_state()
        _dominant = _emo.get("dominant", "neutral") if isinstance(_emo, dict) else "neutral"
        _arousal = float(_emo.get("arousal", 0.5)) if isinstance(_emo, dict) else 0.5
    except Exception:
        _dominant = "neutral"
        _arousal = 0.5
    if not safe_text:
        raise RuntimeError("TTS text is empty.")

    if provider == "browser":
        raise DiagnosticError(
            code="tts_browser_provider",
            reason="当前 TTS provider 为 browser，后端不会生成语音音频。",
            solution="请改用 edge_tts、gpt_sovits 或 volcengine_tts。",
            config_key="tts.provider",
        )

    if provider not in SERVER_TTS_PROVIDERS:
        raise DiagnosticError(
            code="tts_provider_unsupported",
            reason=f"不支持的 TTS provider：{provider}",
            solution="请改为 edge_tts、gpt_sovits、volcengine_tts 或 browser。",
            config_key="tts.provider",
        )

    if provider == "gpt_sovits":
        gpt_started_ms = _perf_now_ms()
        audio = synthesize_gpt_sovits_tts_bytes(
            text=safe_text,
            tts_cfg=tts_cfg,
            voice_override=voice_override,
            prosody={**prosody, "_dominant": _dominant, "_arousal": _arousal},
            perf_trace_id=perf_trace,
        )
        _log_tts_perf(
            "TTS_GPT_SOVITS",
            perf_trace,
            stage="done",
            gpt_sovits_ms=_perf_now_ms() - gpt_started_ms,
            total_ms=_perf_now_ms() - total_started_ms,
            text_chars=len(safe_text),
            audio_bytes=len(audio or b""),
        )
        return audio

    if provider in {"volcengine_tts", "volcengine"}:
        volc_started_ms = _perf_now_ms()
        audio = synthesize_volcengine_tts_bytes(
            text=safe_text,
            tts_cfg=tts_cfg,
            voice_override=voice_override,
            prosody=prosody,
        )
        _log_tts_perf(
            "TTS_VOLCENGINE",
            perf_trace,
            stage="done",
            provider_ms=_perf_now_ms() - volc_started_ms,
            total_ms=_perf_now_ms() - total_started_ms,
            text_chars=len(safe_text),
            audio_bytes=len(audio or b""),
        )
        return audio

    if edge_tts is None:
        raise DiagnosticError(
            code="edge_tts_missing_dependency",
            reason="未安装 edge-tts 依赖，无法使用 edge_tts 语音。",
            solution="请执行 pip install edge-tts 后重试。",
            config_key="tts.provider",
        )

    voice = str(voice_override or tts_cfg.get("voice") or TTS_DEFAULT_VOICE)
    # prosody already normalized above
    rate = str(prosody.get("rate", tts_cfg.get("rate", "+0%")))
    _rate_match = re.match(r"^\s*([+-]?\d+(?:\.\d+)?)%?\s*$", rate)
    _rate_percent = _safe_float(_rate_match.group(1), 0.0) if _rate_match else 0.0
    _rate_factor = 1.0 + (_rate_percent / 100.0)
    if _dominant == "happy" and _arousal > 0.5:
        _rate_factor = min(1.5, _rate_factor * 1.12)
    elif _dominant in ("sad", "anxious"):
        _rate_factor = max(0.7, _rate_factor * 0.9)
    rate = f"{int(round((_rate_factor - 1.0) * 100.0)):+d}%"
    volume = str(prosody.get("volume", tts_cfg.get("volume", "+0%")))
    pitch = str(prosody.get("pitch", tts_cfg.get("pitch", "+0Hz")))

    try:
        audio = asyncio.run(
            synthesize_edge_tts_bytes_async(
                text=safe_text,
                voice=voice,
                rate=rate,
                volume=volume,
                pitch=pitch,
            )
        )
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            audio = loop.run_until_complete(
                synthesize_edge_tts_bytes_async(
                    text=safe_text,
                    voice=voice,
                    rate=rate,
                    volume=volume,
                    pitch=pitch,
                )
            )
        finally:
            loop.close()

    if not audio:
        raise RuntimeError("TTS returned empty audio.")
    _log_tts_perf(
        "TTS_EDGE",
        perf_trace,
        stage="done",
        total_ms=_perf_now_ms() - total_started_ms,
        text_chars=len(safe_text),
        audio_bytes=len(audio or b""),
    )
    return audio
