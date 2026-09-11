"""Isolated low-latency Qwen3-TTS service for the desktop pet.

Install this script's optional runtime in a separate environment. It deliberately
exposes the small OpenAI-compatible surface used by the desktop app so the main
ASR/server environment does not inherit PyTorch or Transformers constraints.
"""

import argparse
import io
import logging
import struct
import threading
import time
import wave

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from faster_qwen3_tts import FasterQwen3TTS
from qwen3_tts_delivery import (
    QWEN3_TTS_A2_VOICE,
    QWEN3_TTS_VOICE_MODE_AUTO,
    QWEN3_TTS_VOICE_MODE_CUSTOM,
    QWEN3_TTS_VOICE_MODE_DESIGN,
    STABLE_GENERATION_KWARGS,
    STABLE_GENERATION_SEED,
    SUPPORTED_EMOTIONS,
    SUPPORTED_INTENSITIES,
    _enum,
    build_delivery_instruction,
    build_voice_design_instruction,
    resolve_generation_language,
    resolve_voice_mode,
)


LOGGER = logging.getLogger("qwen3_tts_server")
SUPPORTED_SPEAKERS = {
    "vivian",
    "serena",
    "uncle_fu",
    "dylan",
    "eric",
    "ryan",
    "aiden",
    "ono_anna",
    "sohee",
}

def pcm16_wav_header(sample_rate=24000, channels=1):
    """Return a streaming PCM WAV header whose final length is intentionally open."""
    byte_rate = int(sample_rate) * int(channels) * 2
    block_align = int(channels) * 2
    return struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        0xFFFFFFFF,
        b"WAVE",
        b"fmt ",
        16,
        1,
        int(channels),
        int(sample_rate),
        byte_rate,
        block_align,
        16,
        b"data",
        0xFFFFFFFF,
    )


def float_audio_to_pcm16(audio):
    values = np.asarray(audio, dtype=np.float32).reshape(-1)
    if values.size <= 0:
        return b""
    return (np.clip(values, -1.0, 1.0) * 32767.0).astype("<i2").tobytes()


def complete_wav_bytes(chunks, sample_rate):
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(int(sample_rate))
        for chunk in chunks:
            wav.writeframes(float_audio_to_pcm16(chunk))
    return output.getvalue()


def create_app(
    model,
    *,
    default_speaker="Ono_Anna",
    default_language="Auto",
    chunk_size=4,
    voice_mode=QWEN3_TTS_VOICE_MODE_CUSTOM,
):
    app = FastAPI(title="Xinyu Qwen3-TTS", docs_url=None, redoc_url=None)
    inference_lock = threading.Lock()
    runtime_voice_mode = resolve_voice_mode(voice_mode)
    model_size = str(
        getattr(getattr(getattr(model, "model", None), "model", None), "tts_model_size", "")
        or ""
    ).lower()
    emotion_instruction_supported = (
        runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN
        or "1b7" in model_size
        or "1.7" in model_size
    )

    @app.get("/health")
    def health():
        return {
            "ok": True,
            "provider": "qwen3_tts",
            "model_loaded": model is not None,
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "speaker": (
                QWEN3_TTS_A2_VOICE
                if runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN
                else default_speaker
            ),
            "voice_mode": runtime_voice_mode,
            "voice_design": runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN,
            "streaming": True,
            "emotion_instruction": emotion_instruction_supported,
            "dynamic_emotion_instruction": (
                emotion_instruction_supported
                and runtime_voice_mode == QWEN3_TTS_VOICE_MODE_CUSTOM
            ),
        }

    @app.post("/v1/audio/speech")
    def speech(body: dict, _request: Request):
        text = str(body.get("input") or body.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="input cannot be empty")
        requested_voice = str(body.get("voice") or default_speaker).strip()
        speaker = (
            requested_voice
            if requested_voice.lower() in SUPPORTED_SPEAKERS
            else default_speaker
        )
        language = resolve_generation_language(
            body.get("language") or default_language,
            text,
        )
        speed = body.get("speed", 1.0)
        delivery_instruction_enabled = (
            body.get("delivery_instruction_enabled", True) is not False
        )
        if (
            runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN
            and delivery_instruction_enabled
        ):
            instruct = build_voice_design_instruction(language)
        elif emotion_instruction_supported and delivery_instruction_enabled:
            instruct = build_delivery_instruction(
                emotion=body.get("emotion"),
                intensity=body.get("intensity"),
                voice_style=body.get("voice_style"),
                speed=speed,
            )
        else:
            instruct = None
        response_format = str(body.get("response_format") or "wav").strip().lower()
        if response_format not in {"wav", "pcm"}:
            raise HTTPException(
                status_code=400,
                detail="response_format must be wav or pcm",
            )
        started = time.perf_counter()

        def generate_audio():
            first_audio_at = None
            sample_rate = 24000
            if response_format == "wav":
                yield pcm16_wav_header(sample_rate=sample_rate)
            with inference_lock:
                torch.manual_seed(STABLE_GENERATION_SEED)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed_all(STABLE_GENERATION_SEED)
                generation_kwargs = {
                    "text": text,
                    "language": language,
                    "instruct": instruct,
                    # Keep official full-text conditioning for stable wording and
                    # identity. Decoded PCM is still yielded incrementally.
                    "non_streaming_mode": True,
                    **STABLE_GENERATION_KWARGS,
                    "chunk_size": max(2, min(12, int(chunk_size))),
                }
                if runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN:
                    stream = model.generate_voice_design_streaming(
                        **generation_kwargs,
                    )
                else:
                    stream = model.generate_custom_voice_streaming(
                        speaker=speaker,
                        **generation_kwargs,
                    )
                for audio, sample_rate, _timing in stream:
                    chunk = float_audio_to_pcm16(audio)
                    if not chunk:
                        continue
                    if first_audio_at is None:
                        first_audio_at = time.perf_counter()
                        LOGGER.info(
                            "first_audio_ms=%d text_chars=%d speaker=%s emotion=%s intensity=%s",
                            round((first_audio_at - started) * 1000),
                            len(text),
                            (
                                QWEN3_TTS_A2_VOICE
                                if runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN
                                else speaker
                            ),
                            _enum(body.get("emotion"), SUPPORTED_EMOTIONS, "neutral"),
                            _enum(body.get("intensity"), SUPPORTED_INTENSITIES, "medium"),
                        )
                    yield chunk
            LOGGER.info(
                "request_done_ms=%d text_chars=%d speaker=%s",
                round((time.perf_counter() - started) * 1000),
                len(text),
                (
                    QWEN3_TTS_A2_VOICE
                    if runtime_voice_mode == QWEN3_TTS_VOICE_MODE_DESIGN
                    else speaker
                ),
            )

        return StreamingResponse(
            generate_audio(),
            media_type="audio/wav" if response_format == "wav" else "audio/pcm",
            headers={
                "Cache-Control": "no-store",
                "X-TTS-Provider": "qwen3_tts",
                "X-TTS-Voice-Mode": runtime_voice_mode,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error(_request, exc):
        LOGGER.exception("Qwen3-TTS request failed")
        return JSONResponse(
            {"error": str(exc), "provider": "qwen3_tts"},
            status_code=500,
        )

    return app


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    )
    parser.add_argument(
        "--mode",
        choices=(
            QWEN3_TTS_VOICE_MODE_AUTO,
            QWEN3_TTS_VOICE_MODE_CUSTOM,
            QWEN3_TTS_VOICE_MODE_DESIGN,
        ),
        default=QWEN3_TTS_VOICE_MODE_AUTO,
    )
    parser.add_argument("--speaker", default="Ono_Anna")
    parser.add_argument("--language", default="Auto")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9881)
    parser.add_argument("--chunk-size", type=int, default=4)
    parser.add_argument("--max-seq-len", type=int, default=1024)
    parser.add_argument("--skip-warmup", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] [%(levelname)s] %(message)s",
    )
    if not torch.cuda.is_available():
        raise RuntimeError("Qwen3-TTS low-latency service requires CUDA.")
    LOGGER.info("loading model=%s device=%s", args.model, torch.cuda.get_device_name(0))
    voice_mode = resolve_voice_mode(args.mode, args.model)
    model = FasterQwen3TTS.from_pretrained(
        args.model,
        device="cuda",
        dtype=torch.bfloat16,
        attn_implementation="sdpa",
        max_seq_len=max(512, min(4096, int(args.max_seq_len))),
    )
    if not args.skip_warmup:
        LOGGER.info("warming CUDA graphs")
        model.warmup(prefill_len=100)
    LOGGER.info(
        "ready http://%s:%d/v1/audio/speech voice_mode=%s speaker=%s chunk_size=%d",
        args.host,
        args.port,
        voice_mode,
        args.speaker,
        args.chunk_size,
    )
    app = create_app(
        model,
        default_speaker=args.speaker,
        default_language=args.language,
        chunk_size=args.chunk_size,
        voice_mode=voice_mode,
    )
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
