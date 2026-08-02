#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const root = path.resolve(__dirname, "..");
const playbackModule = require(path.join(root, "web", "ttsPlaybackController.js"));

async function run() {
  const originalUtterance = global.SpeechSynthesisUtterance;
  class FakeUtterance {
    constructor(text) {
      this.text = text;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }
  global.SpeechSynthesisUtterance = FakeUtterance;

  let now = 1000;
  let serverCalls = 0;
  let browserCalls = 0;
  const statuses = [];
  const debugEvents = [];
  const state = {
    speakingEnabled: true,
    ttsReady: true,
    ttsProvider: "gpt_sovits",
    gptSovitsStreamPlayback: false,
    ttsPlaybackGeneration: 4,
    ttsBrowserPlaybackToken: 0,
    ttsServerRetryCount: 0,
    ttsServerRetryDelayMs: 60,
    ttsServerRequestTimeoutMs: 4000,
    ttsServerFallbackFailThreshold: 1,
    ttsServerRecoveryProbeIntervalMs: 15000,
    ttsServerFallbackActive: false,
    ttsServerNextRecoveryProbeAt: 0,
    ttsServerFailStreak: 0,
    ttsServerLastError: "",
    ttsServerAvailable: true,
    serverTTSFallbackToBrowser: true,
    currentTalkStyle: "neutral"
  };
  const windowObject = {
    AbortController,
    setTimeout,
    clearTimeout,
    speechSynthesis: {
      resume() {},
      cancel() {},
      speak(utterance) {
        browserCalls += 1;
        Promise.resolve().then(() => {
          utterance.onstart?.();
          utterance.onend?.();
        });
      }
    }
  };
  const controller = playbackModule.createController({
    state,
    windowObject,
    wallNow: () => now,
    consoleObject: { warn() {} },
    isServerTTSProvider: (provider) => provider === "gpt_sovits",
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    sanitizeSpeakText: (value) => String(value || "").trim(),
    buildVoiceCandidates: () => [null],
    buildSpeakProsody: () => ({ speed_ratio: 1, pitch_ratio: 1, volume_ratio: 1 }),
    setStatus: (value) => statuses.push(String(value)),
    recordTTSDebugEvent: (event, payload) => debugEvents.push({ event, payload }),
    ttsApi: {
      requestServerTTSBlobWithRetry: async () => {
        serverCalls += 1;
        throw new Error("connection failed");
      }
    }
  });

  try {
    const firstResult = await controller.speak("First line", { playbackGeneration: 4 });
    assert.strictEqual(firstResult, true);
    assert.strictEqual(serverCalls, 1, "the first utterance should test the selected provider");
    assert.strictEqual(browserCalls, 1, "a real provider failure should remain audible through browser speech");
    assert.strictEqual(state.ttsServerFallbackActive, true);
    assert.strictEqual(state.ttsServerNextRecoveryProbeAt, 16000);
    assert.ok(statuses.includes("已临时切换到系统语音"));

    assert.strictEqual(await controller.speak("Second line", {
      playbackGeneration: state.ttsPlaybackGeneration,
      preserveTurnPlaybackGeneration: true
    }), true);
    assert.strictEqual(serverCalls, 1, "the open circuit should not block every utterance on the offline service");
    assert.strictEqual(browserCalls, 2);
    assert.ok(debugEvents.some((item) => item.event === "server_tts_recovery_probe_deferred"));

    now = 15999;
    assert.strictEqual(controller.shouldAttemptServerTTS(), false);
    now = 16000;
    assert.strictEqual(controller.shouldAttemptServerTTS(), true, "the provider should be eligible after the bounded interval");

    controller.markServerTTSRecovered();
    assert.strictEqual(state.ttsServerFallbackActive, false);
    assert.strictEqual(state.ttsServerNextRecoveryProbeAt, 0);
    assert.strictEqual(state.ttsServerFailStreak, 0);
    assert.ok(statuses.includes("GPT-SoVITS 语音已恢复"));
    assert.ok(debugEvents.some((item) => item.event === "server_tts_fallback_recovered"));

    let streamRequests = 0;
    const streamState = {
      speakingEnabled: true,
      ttsReady: true,
      ttsProvider: "gpt_sovits",
      gptSovitsStreamPlayback: true,
      preferVoiceConsistency: true,
      sameVoiceRetryCount: 2,
      ttsServerRetryDelayMs: 1,
      ttsServerRequestTimeoutMs: 4000,
      ttsPlaybackGeneration: 9,
      ttsServerRequestScopes: [],
      ttsPlaybackCancelWaiters: [],
      currentTalkStyle: "neutral"
    };
    class FakeAudioContext {}
    const streamWindow = {
      AbortController,
      AudioContext: FakeAudioContext,
      setTimeout: (callback) => {
        callback();
        return 1;
      },
      clearTimeout() {}
    };
    const streamController = playbackModule.createController({
      state: streamState,
      windowObject: streamWindow,
      isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === 9,
      sanitizeSpeakText: (value) => String(value || "").trim(),
      recordTTSDebugEvent: (event, payload) => debugEvents.push({ event, payload }),
      ttsApi: {
        async requestServerTTSStream() {
          streamRequests += 1;
          if (streamRequests < 3) {
            throw new Error("temporary same-voice failure");
          }
          return {
            reader: {},
            signal: null,
            async close() {}
          };
        }
      },
      ttsPcmStream: {
        async playPcmStream(_reader, options) {
          options.onPlaybackStart?.({ source: "pcm" });
          return { ok: true, started: true, cancelled: false };
        }
      }
    });
    const streamed = await streamController.playServerTTSStream("Keep the same voice.", {
      playbackGeneration: 9,
      sessionId: 3
    });
    assert.strictEqual(streamed.ok, true);
    assert.strictEqual(streamRequests, 3, "stream startup should retry the selected voice before fallback");
    assert.strictEqual(
      debugEvents.filter((item) => item.event === "pcm_stream_same_voice_retry").length,
      2
    );
  } finally {
    global.SpeechSynthesisUtterance = originalUtterance;
  }

  console.log("Automatic TTS failover and recovery checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
