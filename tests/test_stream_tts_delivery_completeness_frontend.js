#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STREAM_QUEUE_PATH = path.join(ROOT, "web", "streamTtsQueueController.js");
const streamQueue = require(STREAM_QUEUE_PATH);
const source = fs.readFileSync(STREAM_QUEUE_PATH, "utf8");

function makeState() {
  return {
    speakingEnabled: true,
    ttsProvider: "gpt_sovits",
    streamSpeakEnabled: true,
    streamSpeakMode: "realtime",
    gptSovitsRealtimeTTS: true,
    streamSpeakSession: 41,
    streamSpeakQueue: [],
    streamSpeakBuffer: "",
    streamSpeakWorking: false,
    streamSpeakWorkingSession: 0,
    streamSpeakLastEnqueueSession: 0,
    streamSpeakPlayedSession: 0,
    streamSpeakDelivery: null,
    perfTtsSeq: 0,
    ttsPlaybackGeneration: 9,
    chatBusy: false,
    currentTalkStyle: "neutral"
  };
}

function makeHarness({ requestBlob, playBlob }) {
  const state = makeState();
  const timers = [];
  const spoken = [];
  const controller = streamQueue.createController({
    state,
    windowObject: {
      setTimeout(fn, delay) {
        timers.push({ fn, delay });
        return timers.length;
      }
    },
    consoleObject: { warn() {} },
    isServerTTSProvider: () => true,
    buildSpeechDeliveryText: (text) => String(text || "").trim(),
    buildStableSpeakText: (text) => String(text || "").replace(/\s+/g, " ").trim(),
    sanitizeSpeakText: (text) => String(text || "").replace(/\s+/g, " ").trim(),
    detectMood: () => "idle",
    buildSpeakProsody: () => null,
    requestServerTTSBlob: requestBlob,
    playAudioBlob: playBlob,
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    splitStreamSpeakSegments: () => ({ segments: [], rest: "" }),
    maybePlayTalkGesture: () => {},
    speak: async (text, options) => {
      spoken.push({ text, options });
      return true;
    }
  });
  return { state, timers, spoken, controller };
}

function enqueue(controller, state, ...texts) {
  for (const text of texts) {
    controller.enqueueStreamSpeakSegment(text, state.streamSpeakSession, null, "neutral");
  }
}

async function runWatchdog(harness) {
  harness.controller.scheduleFinalSpeechWatchdog({
    sessionId: harness.state.streamSpeakSession,
    text: "First sentence. Tail sentence.",
    mood: "idle",
    style: "neutral",
    traceId: "delivery-test"
  });
  const first = harness.timers.find((timer) => timer.delay === 2600);
  assert.ok(first, "finalized stream delivery should schedule a bounded completion watchdog");
  await first.fn();
}

async function run() {
  assert.ok(source.includes("streamSpeakDelivery"), "stream queue should keep a per-session delivery ledger");
  assert.ok(source.includes("terminalFailureSegmentId"), "delivery ledger should retain the first unrecoverable segment boundary");
  assert.ok(source.includes("stream_delivery_recovery"), "tail recovery should be explicitly audit-visible");
  assert.ok(
    !source.includes("|| state.streamSpeakPlayedSession === safeSession"),
    "final watchdog must not treat first playback as proof that the complete reply was delivered"
  );

  {
    const harness = makeHarness({
      requestBlob: async (text) => {
        if (text === "First sentence.") return { size: 8 };
        throw new Error("tail synthesis unavailable");
      },
      playBlob: async (_blob, options) => {
        options.onPlaybackStart({ source: "server_tts", playbackGeneration: 9, sessionId: 41 });
        return true;
      }
    });
    enqueue(harness.controller, harness.state, "First sentence.", "Tail sentence.");
    await harness.controller.runStreamSpeakQueue();
    assert.strictEqual(harness.state.streamSpeakDelivery.segments[0].playbackStarted, true, "first segment should be recorded only after actual playback starts");
    assert.strictEqual(harness.state.streamSpeakDelivery.segments[1].status, "failed_before_start", "failed tail synthesis should stay recoverable");
    await runWatchdog(harness);
    assert.deepStrictEqual(
      harness.spoken.map((item) => item.text),
      ["Tail sentence."],
      "a tail failure after first playback must recover only the unheard suffix"
    );
    assert.strictEqual(harness.state.streamSpeakDelivery.recoveryStarted, true, "tail fallback should acquire an idempotent recovery fence before speaking");
  }

  {
    let plays = 0;
    const harness = makeHarness({
      requestBlob: async () => ({ size: 8 }),
      playBlob: async (_blob, options) => {
        plays += 1;
        if (plays === 1) {
          options.onPlaybackStart({ source: "server_tts", playbackGeneration: 9, sessionId: 41 });
          return true;
        }
        return false;
      }
    });
    enqueue(harness.controller, harness.state, "First sentence.", "Tail sentence.");
    await harness.controller.runStreamSpeakQueue();
    await runWatchdog(harness);
    assert.deepStrictEqual(
      harness.spoken.map((item) => item.text),
      ["Tail sentence."],
      "a tail playback failure before actual start must recover the tail and never replay the first segment"
    );
  }

  {
    let plays = 0;
    const harness = makeHarness({
      requestBlob: async () => ({ size: 8 }),
      playBlob: async (_blob, options) => {
        plays += 1;
        options.onPlaybackStart({ source: "server_tts", playbackGeneration: 9, sessionId: 41 });
        return plays === 1;
      }
    });
    enqueue(harness.controller, harness.state, "First sentence.", "Tail sentence.");
    await harness.controller.runStreamSpeakQueue();
    await runWatchdog(harness);
    assert.strictEqual(
      harness.spoken.length,
      0,
      "a segment that actually started and then failed must never be replayed by the tail watchdog"
    );
    assert.strictEqual(harness.state.streamSpeakDelivery.segments[1].status, "failed_after_start", "the ledger should distinguish audible failures from safe-to-recover failures");
  }

  {
    const harness = makeHarness({
      requestBlob: async (text) => {
        if (text === "First sentence.") return { size: 8 };
        throw new Error("tail synthesis unavailable");
      },
      playBlob: async (_blob, options) => {
        options.onPlaybackStart({ source: "server_tts", playbackGeneration: 9, sessionId: 41 });
        return true;
      }
    });
    enqueue(harness.controller, harness.state, "First sentence.", "Tail sentence.");
    await harness.controller.runStreamSpeakQueue();
    const settlement = harness.controller.scheduleFinalSpeechWatchdog({
      sessionId: 41,
      text: "First sentence. Tail sentence.",
      traceId: "stale-delivery-test"
    });
    harness.state.streamSpeakSession = 42;
    const timer = harness.timers.find((item) => item.delay === 2600);
    await timer.fn();
    assert.strictEqual(harness.spoken.length, 0, "a stale session must never speak a queued tail recovery into a new turn");
    assert.strictEqual((await settlement).status, "cancelled", "a stale stream session must release its own pending delivery waiter");
  }

  {
    let resolveTail;
    const pendingTail = new Promise((resolve) => {
      resolveTail = resolve;
    });
    let plays = 0;
    const harness = makeHarness({
      requestBlob: async (text) => {
        if (text === "First sentence.") return { size: 8 };
        return pendingTail;
      },
      playBlob: async (_blob, options) => {
        plays += 1;
        options.onPlaybackStart({ source: "server_tts", playbackGeneration: 9, sessionId: 41 });
        return true;
      }
    });
    enqueue(harness.controller, harness.state, "First sentence.", "Tail sentence.");
    const runPromise = harness.controller.runStreamSpeakQueue();
    for (
      let index = 0;
      index < 20 && harness.state.streamSpeakDelivery?.segments?.[1]?.status !== "requesting";
      index += 1
    ) {
      await Promise.resolve();
    }
    assert.strictEqual(plays, 1, "the first segment should be actually delivered before tail-stall recovery is evaluated");
    assert.strictEqual(harness.state.streamSpeakDelivery?.segments?.[1]?.status, "requesting", "the second segment should be visibly pending when the delivery watchdog starts its grace period");
    harness.controller.scheduleFinalSpeechWatchdog({
      sessionId: 41,
      text: "First sentence. Tail sentence.",
      traceId: "slow-tail-test"
    });
    const firstWatchdog = harness.timers.find((item) => item.delay === 2600);
    await firstWatchdog.fn();
    const delayedWatchdog = harness.timers.find((item) => item.delay === 2200);
    assert.ok(delayedWatchdog, "a still-requesting tail should receive one bounded grace period before recovery");
    await delayedWatchdog.fn();
    assert.deepStrictEqual(harness.spoken.map((item) => item.text), ["Tail sentence."], "a stalled tail should recover exactly once after its bounded wait");
    resolveTail({ size: 8 });
    await runPromise;
    assert.strictEqual(plays, 1, "the old in-flight tail must be fenced out after fallback recovery begins");
  }

  {
    let resolvePlayback;
    const audibleTail = new Promise((resolve) => {
      resolvePlayback = resolve;
    });
    const harness = makeHarness({
      requestBlob: async () => ({ size: 8 }),
      playBlob: async (_blob, options) => {
        options.onPlaybackStart({ source: "server_tts", playbackGeneration: 9, sessionId: 41 });
        return await audibleTail;
      }
    });
    enqueue(harness.controller, harness.state, "Still audible.");
    const runPromise = harness.controller.runStreamSpeakQueue();
    for (
      let index = 0;
      index < 20 && harness.state.streamSpeakDelivery?.segments?.[0]?.status !== "started";
      index += 1
    ) {
      await Promise.resolve();
    }
    const settlement = harness.controller.scheduleFinalSpeechWatchdog({
      sessionId: 41,
      text: "Still audible.",
      traceId: "audible-tail-settlement-test"
    });
    let settled = false;
    settlement.then(() => {
      settled = true;
    });
    await Promise.resolve();
    assert.strictEqual(settled, false, "a playback-start callback must not settle realtime delivery before the audible segment ends");
    resolvePlayback(true);
    await runPromise;
    assert.strictEqual((await settlement).status, "completed", "the stream delivery waiter should settle after the queued audible tail completes");
  }

  console.log("Stream TTS delivery completeness checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
