"""Optional Windows review helper: WASAPI output loopback, never microphone."""
import json
import sys
import time
import wave
from pathlib import Path

if len(sys.argv) > 2:
    sys.path.insert(0, str(Path(sys.argv[2]).resolve()))
import pyaudiowpatch as audio


def main():
    with audio.PyAudio() as device:
        spec = device.get_default_wasapi_loopback()
        chunks = []

        def callback(data, count, info, status):
            chunks.append(data)
            return None, audio.paContinue

        stream = device.open(format=audio.paInt16, channels=spec["maxInputChannels"],
                             rate=int(spec["defaultSampleRate"]), input=True,
                             input_device_index=spec["index"], frames_per_buffer=480,
                             stream_callback=callback, start=False)
        started = time.time()
        stream.start_stream()
        print(json.dumps({"startedAt": started * 1000}), flush=True)
        input()
        stream.stop_stream()
        stream.close()
        with wave.open(sys.argv[1], "wb") as output:
            output.setnchannels(spec["maxInputChannels"])
            output.setsampwidth(2)
            output.setframerate(int(spec["defaultSampleRate"]))
            output.writeframes(b"".join(chunks))


if __name__ == "__main__":
    main()
