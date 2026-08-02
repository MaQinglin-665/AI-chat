"""Local, opt-in RVC singing conversion bridge.

This deliberately stays separate from normal text TTS.  The input must be a
user-selected WAV vocal recording and all runtime paths live in private config.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import uuid
import wave
from pathlib import Path


MAX_SOURCE_BYTES = 100 * 1024 * 1024


def _path(value):
    return Path(str(value or "")).expanduser()


def public_status(config):
    cfg = config.get("singing", {}) if isinstance(config, dict) else {}
    enabled = bool(cfg.get("enabled", False))
    checks = {
        "runtime": _path(cfg.get("runtime_root")).is_dir(),
        "python": _path(cfg.get("python_executable")).is_file(),
        "model": _path(cfg.get("model_path")).is_file(),
        "index": _path(cfg.get("index_path")).is_file(),
        "output": bool(str(cfg.get("output_dir", "")).strip()),
    }
    songs = cfg.get("catalog", []) if isinstance(cfg.get("catalog"), list) else []
    catalog = [{"id": str(item.get("id", "")), "title": str(item.get("title", "")), "ready": _path(item.get("source_dir")).is_dir()} for item in songs if isinstance(item, dict)]
    return {"ok": True, "enabled": enabled, "ready": enabled and all(checks.values()), "checks": checks, "catalog": catalog}


def convert_selected_wav(config, source_path):
    cfg = config.get("singing", {}) if isinstance(config, dict) else {}
    status = public_status(config)
    if not status["ready"]:
        raise ValueError("本地唱声转换尚未就绪；请检查私有 singing 配置和外部 RVC 运行时。")
    source = _path(source_path).resolve()
    if source.suffix.lower() != ".wav" or not source.is_file():
        raise ValueError("请选择一个有效的 WAV 清唱人声文件。")
    if source.stat().st_size > int(cfg.get("max_source_bytes", MAX_SOURCE_BYTES)):
        raise ValueError("音频文件过大；当前上限为 100 MB。")
    job_id = uuid.uuid4().hex
    work = _path(cfg.get("working_dir")).resolve() / job_id
    output_dir = _path(cfg.get("output_dir")).resolve()
    work.mkdir(parents=True, exist_ok=False)
    output_dir.mkdir(parents=True, exist_ok=True)
    staged = work / "source.wav"  # ASCII path avoids RVC decoder Windows path issues.
    output = output_dir / f"xinyu-rvc-{job_id}.wav"
    shutil.copy2(source, staged)
    runner = Path(__file__).resolve().parent / "scripts" / "rvc_singing_convert.py"
    command = [
        str(_path(cfg.get("python_executable"))), str(runner),
        "--rvc-root", str(_path(cfg.get("runtime_root")).resolve()),
        "--model-path", str(_path(cfg.get("model_path")).resolve()),
        "--index-path", str(_path(cfg.get("index_path")).resolve()),
        "--source", str(staged), "--output", str(output),
        "--f0-method", str(cfg.get("f0_method", "pm")),
        "--index-rate", str(cfg.get("index_rate", 0.75)),
    ]
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180, check=False)
    if result.returncode != 0 or not output.is_file():
        raise RuntimeError((result.stderr or result.stdout or "RVC conversion failed").strip()[-1200:])
    return {"ok": True, "job_id": job_id, "output_name": output.name, "output_path": str(output), "duration_hint": "转换完成"}


def convert_catalog_song(config, song_id):
    cfg = config.get("singing", {}) if isinstance(config, dict) else {}
    song = next((item for item in cfg.get("catalog", []) if isinstance(item, dict) and str(item.get("id")) == str(song_id)), None)
    if not song:
        raise ValueError("未找到这首已授权歌曲。")
    source_dir = _path(song.get("source_dir")).resolve()
    clips = sorted(source_dir.glob("*.wav"))
    if not clips:
        raise ValueError("这首歌没有可用的 WAV 人声切片。")
    converted = [convert_selected_wav(config, clip) for clip in clips]
    output_dir = _path(cfg.get("output_dir")).resolve()
    output_name = f"xinyu-song-{song['id']}-{uuid.uuid4().hex}.wav"
    output = output_dir / output_name
    with wave.open(str(output), "wb") as target:
        for item in converted:
            with wave.open(item["output_path"], "rb") as source:
                if target.getnframes() == 0:
                    target.setparams(source.getparams())
                elif source.getparams()[:4] != target.getparams()[:4]:
                    raise RuntimeError("歌曲片段格式不一致，无法安全拼接。")
                target.writeframes(source.readframes(source.getnframes()))
    return {"ok": True, "song_id": song["id"], "title": song.get("title", song["id"]), "output_name": output_name, "output_path": str(output), "clip_count": len(converted)}


def read_output(config, output_name):
    if not output_name or Path(output_name).name != output_name or not output_name.startswith("xinyu-rvc-"):
        raise ValueError("无效的唱声结果。")
    output = (_path(config.get("singing", {}).get("output_dir")).resolve() / output_name).resolve()
    root = _path(config.get("singing", {}).get("output_dir")).resolve()
    if root not in output.parents or output.suffix.lower() != ".wav" or not output.is_file():
        raise FileNotFoundError("唱声结果不存在。")
    return output
