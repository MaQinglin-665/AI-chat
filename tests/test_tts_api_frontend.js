#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const TTS_API_JS = path.resolve(__dirname, "..", "web", "ttsApi.js");
const ttsApi = require(TTS_API_JS);

function makeResponse(status, blob, data = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    blob: async () => blob,
    json: async () => data || {}
  };
}

async function testPayloadAndMime() {
  const payload = ttsApi.buildServerTTSPayload("hello", {
    voice: "alice",
    prosody: {
      speed_ratio: "1.05",
      pitch_ratio: 0.98,
      volume_ratio: 1,
      rate: " +5% ",
      pitch: " +1Hz ",
      volume: " +0% "
    }
  });
  assert.deepStrictEqual(payload, {
    text: "hello",
    voice: "alice",
    speed_ratio: 1.05,
    pitch_ratio: 0.98,
    volume_ratio: 1,
    rate: "+5%",
    pitch: "+1Hz",
    volume: "+0%"
  });

  assert.strictEqual(
    ttsApi.inferAudioMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])),
    "audio/wav"
  );
  assert.strictEqual(
    ttsApi.inferAudioMime(new Uint8Array([0x49, 0x44, 0x33])),
    "audio/mpeg"
  );
}

async function testRequestSuccess() {
  const calls = [];
  const wav = new Blob([
    new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
  ], { type: "application/octet-stream" });
  const authFetch = async (url, init) => {
    calls.push({ url, init, payload: JSON.parse(init.body) });
    return makeResponse(200, wav);
  };
  const logs = [];

  const blob = await ttsApi.requestServerTTSBlob(" hello ", null, {
    authFetch,
    sanitizeSpeakText: (value) => String(value || "").trim(),
    perfLog: (...args) => logs.push(args),
    traceId: "trace-1",
    timeoutMs: 2000,
    voice: "alice",
    now: () => 100,
    wallNow: () => 200
  });

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, "/api/tts");
  assert.strictEqual(calls[0].payload.text, "hello");
  assert.strictEqual(calls[0].payload.voice, "alice");
  assert.strictEqual(calls[0].payload._perf_trace_id, "trace-1");
  assert.strictEqual(blob.type, "audio/wav");
  assert.ok(logs.some((entry) => entry[1] === "response_ok"));
}

async function testHttpErrorAndRetry() {
  const err = new Error("timeout happened");
  err.retriable = true;
  assert.strictEqual(ttsApi.isRetriableTTSError(err), true);

  const httpErrResp = makeResponse(503, new Blob(["x"]), { error: "busy" });
  await assert.rejects(
    () => ttsApi.requestServerTTSBlob("hello", null, {
      authFetch: async () => httpErrResp,
      perfLog: () => {},
      sanitizeSpeakText: (value) => value
    }),
    (error) => error.message === "busy" && error.httpStatus === 503 && error.retriable === true
  );

  let attempts = 0;
  const waits = [];
  const result = await ttsApi.requestServerTTSBlobWithRetry("hello", null, {
    authFetch: async () => {
      attempts += 1;
      if (attempts === 1) {
        return makeResponse(503, new Blob(["x"]), { error: "busy" });
      }
      return makeResponse(200, new Blob(["ok"], { type: "audio/mpeg" }));
    },
    sanitizeSpeakText: (value) => value,
    perfLog: () => {},
    retries: 1,
    retryDelayMs: 60,
    wait: async (ms) => waits.push(ms)
  });

  assert.strictEqual(attempts, 2);
  assert.deepStrictEqual(waits, [60]);
  assert.strictEqual(result.type, "audio/mpeg");
}

async function main() {
  await testPayloadAndMime();
  await testRequestSuccess();
  await testHttpErrorAndRetry();
  console.log("TTS API frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
