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
    currentTalkStyle: "neutral",
    streamInterSegmentPauseMs: 95
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
  const playbackProgressHooks = [];
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

  assert.ok(
    controller.resolveStreamSegmentPauseMs({ text: "Wait, really?", style: "neutral" })
      > controller.resolveStreamSegmentPauseMs({ text: "Yes!", style: "playful" }),
    "a question beat should breathe longer than a playful exclamation"
  );
  assert.ok(
    controller.resolveStreamSegmentPauseMs({ text: "I am here.", style: "comfort" })
      > controller.resolveStreamSegmentPauseMs({ text: "I am here.", style: "playful" }),
    "comfort delivery should use a longer inter-segment pause than playful delivery"
  );
  const circuitState = makeState();
  circuitState.ttsServerFallbackActive = true;
  const circuitController = streamQueue.createController({
    state: circuitState,
    isServerTTSProvider: () => true,
    shouldAttemptServerTTS: () => false
  });
  assert.strictEqual(
    circuitController.shouldUseStreamSpeak(),
    false,
    "an open fallback circuit should route the turn through final browser speech instead of realtime server segments"
  );
  assert.ok(
    replySource.includes("Math.min(180, Number(voiceTimeline.inter_segment_pause_ms)"),
    "prefetched voice playback should preserve meaningful director pauses beyond 40ms"
  );

  controller.feedStreamSpeakDelta("Queued sentence.", 1, "playful", {
    onPlaybackStart: (event) => playbackHooks.push(event),
    onPlaybackProgress: (event) => playbackProgressHooks.push(event)
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
  capturedPlayOptions.onPlaybackProgress({ elapsedMs: 350, durationMs: 1000 });
  assert.strictEqual(playbackProgressHooks.length, 1, "audio-clock progress should survive stream queue handoff");

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

  const pcmState = makeState();
  pcmState.gptSovitsStreamPlayback = true;
  let pcmCalls = 0;
  let pcmBlobCalls = 0;
  const pcmHooks = [];
  const pcmController = streamQueue.createController({
    state: pcmState,
    windowObject: { setTimeout: () => 1 },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "happy",
    buildSpeakProsody: () => ({ speed_ratio: 1 }),
    requestServerTTSBlob: async () => {
      pcmBlobCalls += 1;
      return { size: 4 };
    },
    playAudioBlob: async () => true,
    playServerTTSStream: async (_text, options) => {
      pcmCalls += 1;
      options.onPlaybackStart({ source: "gpt_sovits_pcm_stream", playbackGeneration: 7, sessionId: 1 });
      return { ok: true, started: true, cancelled: false };
    },
    isCurrentTTSPlaybackGeneration: () => true,
    splitStreamSpeakSegments: () => ({ segments: [], rest: "" }),
    maybePlayTalkGesture: () => {}
  });
  pcmController.enqueueStreamSpeakSegment("Streamed sentence.", 1, null, "playful", {
    onPlaybackStart: (event) => pcmHooks.push(event)
  });
  await pcmController.runStreamSpeakQueue();
  assert.strictEqual(pcmCalls, 1, "enabled GPT-SoVITS transport should use incremental PCM playback");
  assert.strictEqual(pcmBlobCalls, 0, "successful incremental playback must not start a buffered request");
  assert.strictEqual(pcmHooks.length, 1, "incremental playback should preserve one actual-start callback");
  assert.ok(
    replySource.includes("const leadMs = 350")
      && replySource.includes("waitOrderedContinuationBreath")
      && replySource.includes("onPlaybackProgress: revealOrderedContinuationProgress"),
    "ordered continuations should use a short adaptive breath and audio-clock-led text reveal"
  );
  assert.ok(
    replySource.includes("requestServerTTSBlobWithRetry(prewarm.text, prewarm.prosody"),
    "Qwen companion prewarm should retain the selected restrained prosody"
  );
  assert.ok(
    replySource.includes("performanceSignature")
      && replySource.includes("performanceCueForText: performanceCueForStreamText"),
    "prewarm reuse and final playback should stay bound to the canonical segment emotion"
  );

  const semanticState = makeState();
  let semanticProsody = null;
  let semanticPlaybackOptions = null;
  const semanticGestures = [];
  const semanticController = streamQueue.createController({
    state: semanticState,
    windowObject: { setTimeout: () => 1 },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    detectMood: () => "happy",
    buildSpeakProsody: () => ({ speed_ratio: 1.04 }),
    requestServerTTSBlob: async (_text, prosody) => {
      semanticProsody = prosody;
      return { size: 8 };
    },
    playAudioBlob: async (_blob, options) => {
      semanticPlaybackOptions = options;
      return true;
    },
    isCurrentTTSPlaybackGeneration: () => true,
    splitStreamSpeakSegments: () => ({ segments: ["Got you!"], rest: "" }),
    maybePlayTalkGesture: (...args) => semanticGestures.push(args)
  });
  const playfulCue = {
    emotion: "playful",
    intensity: "high",
    voiceStyle: "teasing",
    talkStyle: "playful"
  };
  semanticController.enqueueStreamSpeakSegment("Got you!", 1, { speed_ratio: 1.04 }, "playful", {
    performanceCueForText: () => playfulCue
  });
  await semanticController.runStreamSpeakQueue();
  assert.deepStrictEqual(semanticProsody, {
    speed_ratio: 1.04,
    emotion: "playful",
    intensity: "high",
    voice_style: "teasing"
  });
  assert.strictEqual(semanticPlaybackOptions.performanceCue, playfulCue);
  semanticPlaybackOptions.onPlaybackStart({
    source: "server_tts",
    playbackGeneration: 7,
    sessionId: 1
  });
  assert.strictEqual(
    semanticGestures.length,
    0,
    "a semantic performance cue should own the body gesture instead of starting a duplicate generic gesture"
  );

  console.log("Realtime stream TTS performance checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
