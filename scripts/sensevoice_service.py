"""Persistent loopback-only SenseVoice service for fast Electron restarts."""

from __future__ import annotations

import argparse
import base64
import shutil
import threading
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException
import uvicorn


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from local_asr_provider import (  # noqa: E402
    _extract_sensevoice_result,
    preload_funasr_final_model,
    transcribe_pcm16_with_sensevoice_result,
)


MAX_AUDIO_BYTES = 16_000 * 2 * 35


def create_app(
    *,
    model_name="iic/SenseVoiceSmall-onnx",
    device="auto",
    runtime="onnx",
):
    state = {"status": "starting", "error": ""}
    backend = {"model": None, "runtime": ""}
    inference_lock = threading.Lock()
    pytorch_model_name = (
        "iic/SenseVoiceSmall"
        if str(model_name or "").lower().endswith("-onnx")
        else str(model_name or "iic/SenseVoiceSmall")
    )
    model_config = {
        "provider": "funasr_hybrid",
        "funasr_final_model": pytorch_model_name,
        "funasr_device": str(device or "auto"),
        "funasr_batch_size_s": 12,
        "sensevoice_service_enabled": False,
    }

    def warm_model():
        state.update(status="warming", error="")
        try:
            if str(runtime or "onnx").strip().lower() == "onnx":
                from funasr_onnx import SenseVoiceSmall
                from modelscope.hub.snapshot_download import snapshot_download

                requested_model = str(model_name or "iic/SenseVoiceSmall-onnx")
                onnx_model_dir = Path(
                    requested_model
                    if Path(requested_model).is_dir()
                    else snapshot_download(requested_model)
                )
                tokenizer_name = "chn_jpn_yue_eng_ko_spectok.bpe.model"
                tokenizer_path = onnx_model_dir / tokenizer_name
                if not tokenizer_path.is_file():
                    source_model_name = requested_model.removesuffix("-onnx")
                    source_model_dir = Path(
                        source_model_name
                        if Path(source_model_name).is_dir()
                        else snapshot_download(
                            source_model_name,
                            allow_file_pattern=[tokenizer_name],
                        )
                    )
                    source_tokenizer = source_model_dir / tokenizer_name
                    if not source_tokenizer.is_file():
                        raise FileNotFoundError(
                            f"SenseVoice tokenizer asset is missing: {source_tokenizer}"
                        )
                    shutil.copy2(source_tokenizer, tokenizer_path)
                backend["model"] = SenseVoiceSmall(
                    str(onnx_model_dir),
                    batch_size=1,
                    quantize=True,
                    intra_op_num_threads=2,
                )
                backend["runtime"] = "onnx-int8"
            else:
                preload_funasr_final_model(model_config)
                backend["runtime"] = "pytorch"
        except Exception as exc:
            state.update(
                status="error",
                error=f"{type(exc).__name__}: {str(exc)}"[:240],
            )
            traceback.print_exc()
            return
        state.update(status="ready", error="")

    @asynccontextmanager
    async def lifespan(_app):
        threading.Thread(
            target=warm_model,
            daemon=True,
            name="xinyu-sensevoice-warmup",
        ).start()
        yield

    app = FastAPI(
        title="Xinyu SenseVoice",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )

    @app.get("/health")
    def health():
        return {
            "ok": state["status"] != "error",
            "provider": "sensevoice",
            "status": state["status"],
            "ready": state["status"] == "ready",
            "device": str(device or "auto"),
            "runtime": backend["runtime"] or str(runtime or "onnx"),
            "error": state["error"],
        }

    @app.post("/v1/audio/transcriptions")
    def transcribe(body: dict):
        if state["status"] != "ready":
            raise HTTPException(status_code=503, detail="SenseVoice is warming.")
        encoded = str(body.get("audio_base64", "") or "")
        if not encoded or len(encoded) > ((MAX_AUDIO_BYTES * 4 // 3) + 16):
            raise HTTPException(status_code=400, detail="Audio payload is empty or too large.")
        try:
            pcm16 = base64.b64decode(encoded, validate=True)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid audio payload.") from exc
        if not pcm16 or len(pcm16) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=400, detail="Audio payload is empty or too large.")
        try:
            sample_rate = max(8000, min(48000, int(body.get("sample_rate", 16000))))
        except (TypeError, ValueError):
            sample_rate = 16000
        request_config = dict(model_config)
        request_config["input_language_mode"] = str(
            body.get("input_language_mode", "auto") or "auto"
        )[:12]
        with inference_lock:
            if backend["runtime"] == "onnx-int8":
                import numpy as np

                audio = np.frombuffer(pcm16, dtype="<i2").astype(np.float32) / 32768.0
                language_mode = request_config["input_language_mode"].lower()
                language = (
                    "zh"
                    if language_mode.startswith("zh")
                    else ("en" if language_mode.startswith("en") else "auto")
                )
                raw_result = backend["model"](
                    audio,
                    language=language,
                    textnorm="withitn",
                )
                raw_text = raw_result[0] if raw_result else ""
                extracted = _extract_sensevoice_result(
                    [{"text": raw_text}],
                    pcm16_bytes=pcm16,
                    sample_rate=sample_rate,
                )
                text = extracted["text"]
                result = {
                    "raw_text": text,
                    "detected_language": (
                        "zh-CN"
                        if any("\u4e00" <= ch <= "\u9fff" for ch in text)
                        else ("en-US" if any(ch.isalpha() for ch in text) else "")
                    ),
                    "paralinguistic": extracted["paralinguistic"],
                }
            else:
                result = transcribe_pcm16_with_sensevoice_result(
                    pcm16,
                    sample_rate=sample_rate,
                    asr_config=request_config,
                )
        return {
            "raw_text": str(result.get("raw_text", "") or ""),
            "detected_language": str(result.get("detected_language", "") or ""),
            "provider": "sensevoice",
            "paralinguistic": result.get("paralinguistic"),
        }

    return app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9890)
    parser.add_argument("--model", default="iic/SenseVoiceSmall-onnx")
    parser.add_argument("--runtime", default="onnx", choices=["onnx", "pytorch"])
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    args = parser.parse_args()
    if args.host not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("SenseVoice service may only bind to loopback.")
    uvicorn.run(
        create_app(model_name=args.model, device=args.device, runtime=args.runtime),
        host=args.host,
        port=args.port,
        log_level="warning",
    )


if __name__ == "__main__":
    main()
