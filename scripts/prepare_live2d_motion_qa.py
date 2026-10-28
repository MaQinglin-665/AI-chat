"""Create local Windows SAPI audio/RMS inputs for the isolated Live2D review.

No application configuration, microphone, network service or model is accessed.
All generated inputs go to the explicitly supplied directory outside Git.
"""

import argparse
import array
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import wave

SENTENCES = [
    "你好，我是馨语，今天我们一起看看桌宠怎样自然地陪伴你。",
    "说话时，我会随着整句话轻轻调整姿态，而不是每一个字都点一次头。",
    "停下来听你讲话的时候，我也会呼吸、眨眼，偶尔看看周围。",
    "接下来请看几个连续的小手势，结束以后，我会慢慢回到放松的待机状态。",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if sys.platform != "win32":
        parser.error("Local Windows SAPI is required; this optional media tool is not a CI dependency.")
    output = args.output.resolve()
    repo = Path(__file__).resolve().parents[1]
    if output == repo or repo in output.parents:
        parser.error("Choose an output directory outside the repository; audio must never become Git assets.")
    output.mkdir(parents=True, exist_ok=True)
    (output / "sentences.json").write_text(json.dumps(SENTENCES, ensure_ascii=False), encoding="utf-8")
    command = r"""
$ErrorActionPreference = 'Stop'
$out = $env:LIVE2D_QA_AUDIO_OUTPUT
$texts = Get-Content -LiteralPath (Join-Path $out 'sentences.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$voice = New-Object -ComObject SAPI.SpVoice
$voice.Rate = -1
$voice.Volume = 100
foreach ($v in $voice.GetVoices()) {
    if ($v.GetDescription() -match 'Huihui|Xiaoxiao|Chinese') { $voice.Voice = $v; break }
}
for ($i = 0; $i -lt $texts.Count; $i++) {
    $stream = New-Object -ComObject SAPI.SpFileStream
    $stream.Format.Type = 22
    $stream.Open((Join-Path $out ("speech-$i.wav")), 3, $false)
    try { $voice.AudioOutputStream = $stream; [void]$voice.Speak($texts[$i]) }
    finally { $stream.Close() }
}
"""
    environment = dict(os.environ, LIVE2D_QA_AUDIO_OUTPUT=str(output))
    subprocess.run(["powershell", "-NoProfile", "-Command", command], env=environment, check=True)
    clips, rate = [], None
    for index in range(4):
        with wave.open(str(output / f"speech-{index}.wav"), "rb") as source:
            if source.getsampwidth() != 2 or source.getnchannels() != 1:
                raise ValueError("Expected SAPI PCM16 mono")
            current_rate = source.getframerate()
            if rate is not None and rate != current_rate:
                raise ValueError("Inconsistent SAPI sample rates")
            rate = current_rate
            samples = array.array("h", source.readframes(source.getnframes()))
            if sys.byteorder != "little":
                samples.byteswap()
            clips.append(samples)
    audio = array.array("h", [0]) * (rate * 120)
    cursor, sentences = 30.0, []
    for text, samples in zip(SENTENCES, clips):
        start = round(cursor * rate)
        if start + len(samples) >= 79 * rate:
            raise ValueError("Selected voice is too slow for the 120-second review; use a faster SAPI rate")
        audio[start:start + len(samples)] = samples
        sentences.append({"text": text, "startMs": cursor * 1000, "durationMs": len(samples) / rate * 1000})
        cursor += len(samples) / rate + 1
    levels = []
    for index in range(6000):
        block = audio[round(index * .02 * rate):round((index + 1) * .02 * rate)]
        rms = math.sqrt(sum(value * value for value in block) / len(block)) / 32768
        levels.append(min(.9, max(0, (rms - .005) * 8)))
    with wave.open(str(output / "reference-120s.wav"), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(rate)
        if sys.byteorder != "little":
            audio.byteswap()
        target.writeframes(audio.tobytes())
    timeline = {"sentences": sentences, "speechEndMs": (cursor - 1) * 1000, "levels": levels,
                "audio": "reference-120s.wav", "rate": rate,
                "source": "local Windows SAPI; same 20ms RMS samples for all four videos"}
    (output / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"output": str(output), "speech_end_seconds": cursor - 1, "duration_seconds": 120}))


if __name__ == "__main__":
    main()
