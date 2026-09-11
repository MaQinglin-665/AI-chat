#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ttsPlaybackController = require(path.join(ROOT, "web", "ttsPlaybackController.js"));
const streamTtsQueueController = require(path.join(ROOT, "web", "streamTtsQueueController.js"));

function makeAbortError() {
  const error = new Error("TTS request aborted");
  error.name = "AbortError";
  error.aborted = true;
  error.retriable = false;
  return error;
}

function waitFor(predicate, label) {
  return new Promise((resolve, reject) => {
    let remaining = 80;
    const inspect = () => {
      if (predicate()) {
        resolve();
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        reject(new Error(`Timed out waiting for ${label}`));
        return;
      }
      Promise.resolve().then(inspect);
    };
    inspect();
  });
}

function makeSharedState(overrides = {}) {
  return {
    speakingEnabled: true,
    ttsProvider: "gpt_sovits",
    ttsPlaybackGeneration: 4,
    ttsServerRetryCount: 1,
    ttsServerRetryDelayMs: 60,
    ttsServerRequestTimeoutMs: 14000,
    ttsServerAvailable: true,
    ttsServerFailStreak: 2,
    ttsServerLastError: "",
    ttsServerFallbackFailThreshold: 1,
    serverTTSFallbackToBrowser: true,
    streamSpeakEnabled: true,
    streamSpeakMode: "realtime",
    gptSovitsRealtimeTTS: true,
    streamSpeakSession: 71,
    streamSpeakQueue: [],
    streamSpeakBuffer: "",
    streamSpeakWorking: false,
    streamSpeakWorkingSession: 0,
    streamSpeakLastEnqueueSession: 0,
    streamSpeakPlayedSession: 0,
    perfTtsSeq: 0,
    currentTalkStyle: "neutral",
    ...overrides
  };
}

function makeWindow(browserSpeakCalls) {
  return {
    AbortController,
    setTimeout,
    clearTimeout,
    speechSynthesis: {
      cancel() {},
      getVoices() { return []; },
      speak() { browserSpeakCalls.count += 1; }
    }
  };
}

function makePlaybackController(state, ttsApi, browserSpeakCalls = { count: 0 }, debugEvents = []) {
  return ttsPlaybackController.createController({
    state,
    windowObject: makeWindow(browserSpeakCalls),
    ttsApi,
    isServerTTSProvider: (provider) => provider === "gpt_sovits",
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    sanitizeSpeakText: (value) => String(value || "").trim(),
    recordTTSDebugEvent: (event, payload) => debugEvents.push({ event, payload }),
    setStatus: () => {},
    consoleObject: { warn() {} }
  });
}

async function testDirectCancellationSkipsFailureAndBrowserFallback() {
  const state = makeSharedState();
  const browserSpeakCalls = { count: 0 };
  const debugEvents = [];
  let capturedSignal = null;
  const playback = makePlaybackController(state, {
    requestServerTTSBlobWithRetry: async (_text, _prosody, options) => new Promise((_resolve, reject) => {
      capturedSignal = options.signal;
      options.signal.addEventListener("abort", () => reject(makeAbortError()), { once: true });
    }),
    requestServerTTSBlob: async () => ({ size: 1 })
  }, browserSpeakCalls, debugEvents);

  const request = playback.speak("old reply", {
    sessionId: 71,
    playbackGeneration: 4
  });
  await waitFor(() => capturedSignal, "direct server TTS signal");
  playback.stopAllAudioPlayback();

  assert.strictEqual(capturedSignal.aborted, true, "playback turnover should abort the active direct request");
  assert.strictEqual(await request, false, "a cancelled request should quietly finish as not spoken");
  assert.strictEqual(state.ttsPlaybackGeneration, 5);
  assert.strictEqual(state.ttsServerAvailable, true, "caller cancellation must not mark the provider unavailable");
  assert.strictEqual(state.ttsServerFailStreak, 2, "caller cancellation must not increment the failure streak");
  assert.strictEqual(browserSpeakCalls.count, 0, "caller cancellation must not start browser-TTS fallback");
  assert.strictEqual(state.ttsServerRequestScopes.length, 0, "completed cancellation scopes must be released");
  assert.ok(
    debugEvents.some((entry) => entry.event === "speak_cancelled"),
    "direct cancellation should remain diagnosable without being reported as a provider failure"
  );
}

async function testOldScopeCleanupCannotTouchNewGeneration() {
  const state = makeSharedState({ ttsPlaybackGeneration: 9 });
  const pending = new Map();
  const playback = makePlaybackController(state, {
    requestServerTTSBlobWithRetry: (_text, _prosody, options) => {
      const key = String(_text);
      return new Promise((resolve, reject) => {
        pending.set(key, { options, resolve, reject });
      });
    },
    requestServerTTSBlob: async () => ({ size: 1 })
  });

  const oldRequest = playback.requestServerTTSBlobWithRetry("old", null, {
    sessionId: 71,
    playbackGeneration: 9
  });
  await waitFor(() => pending.has("old"), "old generation request");
  playback.stopAllAudioPlayback();
  assert.strictEqual(pending.get("old").options.signal.aborted, true);

  const newRequest = playback.requestServerTTSBlobWithRetry("new", null, {
    sessionId: 72,
    playbackGeneration: 10
  });
  await waitFor(() => pending.has("new"), "new generation request");
  assert.strictEqual(pending.get("new").options.signal.aborted, false, "a new generation must start with an independent signal");

  pending.get("old").reject(makeAbortError());
  await assert.rejects(() => oldRequest, (error) => error?.name === "AbortError");
  assert.strictEqual(state.ttsServerRequestScopes.length, 1, "late cleanup for the old request must retain the new scope");
  assert.strictEqual(pending.get("new").options.signal.aborted, false, "old cleanup must not cancel the new request");

  pending.get("new").resolve({ size: 8 });
  await newRequest;
  assert.strictEqual(state.ttsServerRequestScopes.length, 0);
}

async function testStreamCancellationSkipsRetryAndDeliveryFailure() {
  const state = makeSharedState({ ttsPlaybackGeneration: 7, streamSpeakSession: 31 });
  const debugEvents = [];
  let playCalls = 0;
  let requestCalls = 0;
  let capturedSignal = null;
  const playback = makePlaybackController(state, {
    requestServerTTSBlob: async (_text, _prosody, options) => new Promise((_resolve, reject) => {
      requestCalls += 1;
      capturedSignal = options.signal;
      options.signal.addEventListener("abort", () => reject(makeAbortError()), { once: true });
    }),
    requestServerTTSBlobWithRetry: async () => ({ size: 1 })
  }, { count: 0 }, debugEvents);
  const queue = streamTtsQueueController.createController({
    state,
    windowObject: { setTimeout, clearTimeout },
    consoleObject: { warn() {} },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "idle",
    buildSpeakProsody: () => null,
    recordTTSDebugEvent: (event, payload) => debugEvents.push({ event, payload }),
    createServerTTSRequestScope: playback.createServerTTSRequestScope,
    requestServerTTSBlob: playback.requestServerTTSBlob,
    playAudioBlob: async () => {
      playCalls += 1;
      return true;
    },
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    splitStreamSpeakSegments: () => ({ segments: [], rest: "" }),
    maybePlayTalkGesture: () => {},
    speak: async () => false
  });
  const parent = new AbortController();
  queue.enqueueStreamSpeakSegment("old queued reply", 31, null, "neutral", { signal: parent.signal });
  const runner = queue.runStreamSpeakQueue();
  await waitFor(() => capturedSignal, "stream server TTS signal");
  parent.abort();
  await runner;

  assert.strictEqual(capturedSignal.aborted, true, "chat cancellation should reach the stream request");
  assert.strictEqual(requestCalls, 1, "an AbortError must not trigger the no-prosody retry");
  assert.strictEqual(playCalls, 0, "cancelled stream audio must never reach playback");
  assert.strictEqual(state.streamSpeakDelivery?.terminalFailureSegmentId || 0, 0, "cancellation must not become a recoverable delivery failure");
  assert.ok(
    debugEvents.some((entry) => entry.event === "stream_request_cancelled"),
    "stream cancellation should be observable separately from provider failure"
  );
  assert.ok(
    !debugEvents.some((entry) => entry.event === "stream_retry_no_prosody"),
    "stream cancellation must not retry without prosody"
  );
}

async function testDiscardCancelsEagerStreamPrefetch() {
  const state = makeSharedState({
    ttsProvider: "custom_server_tts",
    ttsPlaybackGeneration: 12,
    streamSpeakSession: 44
  });
  let capturedSignal = null;
  const playback = makePlaybackController(state, {
    requestServerTTSBlob: async (_text, _prosody, options) => new Promise((_resolve, reject) => {
      capturedSignal = options.signal;
      options.signal.addEventListener("abort", () => reject(makeAbortError()), { once: true });
    }),
    requestServerTTSBlobWithRetry: async () => ({ size: 1 })
  });
  const queue = streamTtsQueueController.createController({
    state,
    windowObject: { setTimeout, clearTimeout },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "idle",
    buildSpeakProsody: () => null,
    createServerTTSRequestScope: playback.createServerTTSRequestScope,
    requestServerTTSBlob: playback.requestServerTTSBlob,
    playAudioBlob: async () => false,
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    splitStreamSpeakSegments: () => ({ segments: [], rest: "" }),
    maybePlayTalkGesture: () => {},
    speak: async () => false
  });

  queue.enqueueStreamSpeakSegment("discard this", 44, null, "neutral");
  await waitFor(() => capturedSignal, "eager stream prefetch signal");
  assert.strictEqual(queue.discardQueuedStreamSpeakItems(44), 1);
  assert.strictEqual(capturedSignal.aborted, true, "discarding an eagerly prefetched item must abort its request");
  await waitFor(() => state.ttsServerRequestScopes.length === 0, "discarded prefetch cleanup");
}

async function main() {
  await testDirectCancellationSkipsFailureAndBrowserFallback();
  await testOldScopeCleanupCannotTouchNewGeneration();
  await testStreamCancellationSkipsRetryAndDeliveryFailure();
  await testDiscardCancelsEagerStreamPrefetch();
  console.log("Server TTS cancellation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
