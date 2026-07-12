#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const streamQueue = require(path.join(ROOT, "web", "streamTtsQueueController.js"));
const streamSource = fs.readFileSync(path.join(ROOT, "web", "streamTtsQueueController.js"), "utf8");
const replySource = fs.readFileSync(path.join(ROOT, "web", "chatReplyController.js"), "utf8");
const playbackSource = fs.readFileSync(path.join(ROOT, "web", "ttsPlaybackController.js"), "utf8");

function makeState() {
  return {
    speakingEnabled: true,
    ttsProvider: "gpt_sovits",
    streamSpeakEnabled: true,
    streamSpeakMode: "realtime",
    gptSovitsRealtimeTTS: true,
    streamSpeakSession: 1,
    streamSpeakQueue: [],
    streamSpeakBuffer: "",
    streamSpeakWorking: false,
    streamSpeakWorkingSession: 0,
    streamSpeakLastEnqueueSession: 0,
    streamSpeakPlayedSession: 0,
    perfTtsSeq: 0,
    ttsPlaybackGeneration: 7,
    chatBusy: false,
    currentTalkStyle: "neutral"
  };
}

async function run() {
  assert.ok(
    !/enqueueStreamSpeakSegment\(seg, sessionId, prosody, style\);\s*maybePlayTalkGesture/.test(streamSource),
    "stream text enqueue must not start a talk gesture"
  );
  assert.ok(
    streamSource.includes("onPlaybackStart: (event) => notifyStreamSpeakPlaybackStart(playingItem, event)"),
    "stream queue should connect each audio item to actual playback"
  );
  assert.ok(
    replySource.includes("const handleStreamPlaybackStart")
      && replySource.includes("streamPlaybackTimelineHandler = startStreamSpeechPerformance")
      && replySource.includes("onPlaybackStart: handleStreamPlaybackStart"),
    "reply timeline should wait for stream queue playback rather than text completion"
  );
  assert.ok(
    !replySource.includes('recordPerformanceAuditEvent("tts_start", { mode: "stream" });\n          runTimelineSpeechStart();'),
    "stream reply finalization must not start the speech timeline before audio playback"
  );
  assert.ok(
    playbackSource.includes('onPlaybackStart: typeof opts.onPlaybackStart === "function" ? opts.onPlaybackStart : null'),
    "direct server/browser TTS paths should preserve the actual-playback callback"
  );

  const state = makeState();
  const gestures = [];
  const playbackHooks = [];
  const scheduled = [];
  let capturedPlayOptions = null;
  const controller = streamQueue.createController({
    state,
    windowObject: {
      setTimeout(fn, delay) {
        scheduled.push({ fn, delay });
        return scheduled.length;
      }
    },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "happy",
    buildSpeakProsody: () => ({ speed_ratio: 1 }),
    requestServerTTSBlob: async () => ({ size: 8 }),
    playAudioBlob: async (_blob, options) => {
      capturedPlayOptions = options;
      return true;
    },
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    splitStreamSpeakSegments: () => ({ segments: ["Queued sentence."], rest: "" }),
    maybePlayTalkGesture: (text, style) => gestures.push({ text, style })
  });

  controller.feedStreamSpeakDelta("Queued sentence.", 1, "playful", {
    onPlaybackStart: (event) => playbackHooks.push(event)
  });
  assert.strictEqual(gestures.length, 0, "queued stream text must remain visually silent while synthesis is pending");
  assert.strictEqual(playbackHooks.length, 0, "queued stream text must not announce playback before audio starts");

  await controller.runStreamSpeakQueue();
  assert.ok(capturedPlayOptions, "queue should hand a synthesized blob to the audio player");
  assert.strictEqual(gestures.length, 0, "a ready blob must not start a talk gesture");
  assert.strictEqual(playbackHooks.length, 0, "a ready blob must not start the reply speech timeline");

  capturedPlayOptions.onPlaybackStart({ source: "server_tts", playbackGeneration: 7, sessionId: 1 });
  capturedPlayOptions.onPlaybackStart({ source: "server_tts", playbackGeneration: 7, sessionId: 1 });
  assert.deepStrictEqual(gestures, [{ text: "Queued sentence.", style: "playful" }]);
  assert.strictEqual(playbackHooks.length, 1, "first actual playback should notify the timeline exactly once");
  assert.strictEqual(playbackHooks[0].segmentId, 1);

  const staleState = makeState();
  let staleOptions = null;
  const staleGestures = [];
  const staleHooks = [];
  const staleController = streamQueue.createController({
    state: staleState,
    windowObject: { setTimeout: () => 1 },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "idle",
    buildSpeakProsody: () => null,
    requestServerTTSBlob: async () => ({ size: 4 }),
    playAudioBlob: async (_blob, options) => {
      staleOptions = options;
      return true;
    },
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(staleState.ttsPlaybackGeneration),
    splitStreamSpeakSegments: () => ({ segments: [], rest: "" }),
    maybePlayTalkGesture: (...args) => staleGestures.push(args)
  });
  staleController.enqueueStreamSpeakSegment("Old sentence.", 1, null, "neutral", {
    onPlaybackStart: (event) => staleHooks.push(event)
  });
  await staleController.runStreamSpeakQueue();
  staleState.streamSpeakSession = 2;
  staleOptions.onPlaybackStart({ source: "server_tts", playbackGeneration: 7, sessionId: 1 });
  assert.strictEqual(staleGestures.length, 0, "late stale audio must not start a gesture");
  assert.strictEqual(staleHooks.length, 0, "late stale audio must not start a timeline");

  const failedState = makeState();
  const failedGestures = [];
  let failedPlayCalls = 0;
  const failedController = streamQueue.createController({
    state: failedState,
    windowObject: { setTimeout: () => 1 },
    consoleObject: { warn() {} },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "idle",
    buildSpeakProsody: () => null,
    requestServerTTSBlob: async () => { throw new Error("service unavailable"); },
    playAudioBlob: async () => {
      failedPlayCalls += 1;
      return true;
    },
    isCurrentTTSPlaybackGeneration: () => true,
    splitStreamSpeakSegments: () => ({ segments: [], rest: "" }),
    maybePlayTalkGesture: (...args) => failedGestures.push(args)
  });
  failedController.enqueueStreamSpeakSegment("Failed sentence.", 1, null, "neutral", {
    onPlaybackStart: () => { throw new Error("must not be called"); }
  });
  await failedController.runStreamSpeakQueue();
  assert.strictEqual(failedPlayCalls, 0, "failed synthesis must never reach playback");
  assert.strictEqual(failedGestures.length, 0, "failed synthesis must not start a gesture");

  console.log("Realtime stream TTS performance checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
