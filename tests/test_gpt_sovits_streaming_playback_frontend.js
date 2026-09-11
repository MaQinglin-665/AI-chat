"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pcm = require(path.join(root, "web", "ttsPcmStream.js"));
const ttsApi = require(path.join(root, "web", "ttsApi.js"));

function makeStreamingWav(sampleRate = 16000, samples = [0, 16384, -16384, 32767]) {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36, 4);
  out.write("WAVEfmt ", 8, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(0, 40);
  samples.forEach((sample, index) => out.writeInt16LE(sample, 44 + index * 2));
  return new Uint8Array(out);
}

async function testHeaderAndPcmDecode() {
  const wav = makeStreamingWav();
  assert.strictEqual(pcm.parseStreamingWavHeader(wav.slice(0, 30)), null);
  const header = pcm.parseStreamingWavHeader(wav);
  assert.deepStrictEqual(header, {
    audioFormat: 1,
    channels: 1,
    sampleRate: 16000,
    bitsPerSample: 16,
    dataOffset: 44
  });
  const decoded = pcm.decodePcm16Channels(wav.slice(44), 1);
  assert.strictEqual(decoded.frames, 4);
  assert.ok(Math.abs(decoded.channels[0][1] - 0.5) < 0.0001);
  assert.ok(Math.abs(decoded.channels[0][2] + 0.5) < 0.0001);
}

async function testIncrementalPlaybackStartsOnce() {
  const wav = makeStreamingWav();
  const parts = [wav.slice(0, 18), wav.slice(18, 46), wav.slice(46)];
  let index = 0;
  const reader = {
    async read() {
      if (index >= parts.length) return { done: true };
      return { done: false, value: parts[index++] };
    }
  };
  const starts = [];
  const progress = [];
  const scheduled = [];
  const connectedTargets = [];
  const outputNode = { kind: "analyser" };
  const context = {
    currentTime: 10,
    destination: {},
    async resume() {},
    createBuffer(channels, frames, sampleRate) {
      const values = Array.from({ length: channels }, () => new Float32Array(frames));
      return { getChannelData: (channel) => values[channel], frames, sampleRate };
    },
    createBufferSource() {
      const source = {
        connect(target) { connectedTargets.push(target); },
        start(at) {
          scheduled.push(at);
          queueMicrotask(() => source.onended?.());
        },
        stop() { queueMicrotask(() => source.onended?.()); }
      };
      return source;
    }
  };
  const result = await pcm.playPcmStream(reader, {
    audioContext: context,
    outputNode,
    source: "qwen3_tts_pcm_stream",
    onPlaybackStart: (event) => starts.push(event),
    onPlaybackProgress: (event) => progress.push(event)
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.started, true);
  assert.strictEqual(starts.length, 1);
  assert.ok(progress.length >= 1, "PCM playback should expose its AudioContext scheduling clock");
  assert.strictEqual(progress.at(-1).final, true);
  assert.ok(progress.at(-1).durationMs > 0);
  assert.ok(scheduled.length >= 1);
  assert.ok(connectedTargets.length >= 1);
  assert.ok(connectedTargets.every((target) => target === outputNode), "PCM buffers should route through the supplied analyser node");
  assert.strictEqual(starts[0].source, "qwen3_tts_pcm_stream");
}

async function testStreamRequestUsesDedicatedRoute() {
  const reader = { read: async () => ({ done: true }), cancel: async () => {} };
  const calls = [];
  const response = {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
    headers: { get: (key) => key === "Content-Type" ? "audio/wav" : "trace-stream" }
  };
  const stream = await ttsApi.requestServerTTSStream("hello", null, {
    authFetch: async (url, init) => {
      calls.push({ url, payload: JSON.parse(init.body) });
      return response;
    },
    sanitizeSpeakText: (value) => value,
    traceId: "trace-stream",
    timeoutMs: 2000
  });
  assert.strictEqual(calls[0].url, "/api/tts_stream");
  assert.strictEqual(calls[0].payload._perf_trace_id, "trace-stream");
  assert.strictEqual(typeof stream.reader.read, "function");
  assert.deepStrictEqual(await stream.reader.read(), { done: true });
  await stream.close(false);
}

async function main() {
  await testHeaderAndPcmDecode();
  await testIncrementalPlaybackStartsOnce();
  await testStreamRequestUsesDedicatedRoute();
  const playbackSource = fs.readFileSync(path.join(root, "web", "ttsPlaybackController.js"), "utf8");
  const queueSource = fs.readFileSync(path.join(root, "web", "streamTtsQueueController.js"), "utf8");
  const configSource = fs.readFileSync(path.join(root, "config.py"), "utf8");
  assert.ok(playbackSource.includes("Never replay an utterance after any streaming audio may have been heard"));
  assert.ok(playbackSource.includes("opts.onPlaybackProgress?.({"));
  assert.ok(queueSource.includes("pcm_stream_queue_buffered_fallback"));
  assert.ok(configSource.includes('"gpt_sovits_stream_playback": False'));
  console.log("GPT-SoVITS streaming playback frontend checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
