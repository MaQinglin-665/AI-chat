#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ttsPlaybackController = require(path.join(ROOT, "web", "ttsPlaybackController.js"));

async function flushMicrotasks(count = 5) {
  for (let i = 0; i < count; i += 1) {
    await Promise.resolve();
  }
}

async function testAudioContextStartFailureDoesNotAnnouncePlayback() {
  const debugEvents = [];
  let playbackStarts = 0;
  let stopCalls = 0;
  const source = {
    connect() {},
    disconnect() {},
    start() {
      throw new Error("AudioContext start failed");
    },
    stop() {
      stopCalls += 1;
    }
  };
  class FailingAudioContext {
    constructor() {
      this.state = "running";
      this.destination = {};
    }
    async decodeAudioData() {
      return { duration: 1 };
    }
    createBufferSource() {
      return source;
    }
    createGain() {
      return { gain: { value: 0 }, connect() {} };
    }
    createAnalyser() {
      return {
        context: this,
        frequencyBinCount: 8,
        connect() {}
      };
    }
  }

  const state = {
    ttsPlaybackGeneration: 3,
    ttsDebugAudioStartedAt: 0,
    ttsDebugAudioEndedAt: 0,
    streamSpeakPlayedSession: 0,
    ttsContextSpeaking: false
  };
  const controller = ttsPlaybackController.createController({
    state,
    windowObject: {
      AudioContext: FailingAudioContext,
      setTimeout: () => 1,
      clearTimeout() {}
    },
    performanceObject: { now: () => 999 },
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    recordTTSDebugEvent: (event, payload) => debugEvents.push({ event, payload })
  });

  const ok = await controller.playAudioByContext({
    size: 4,
    arrayBuffer: async () => new ArrayBuffer(4)
  }, {
    sessionId: 31,
    playbackGeneration: 3,
    text: "will not start"
  }, () => {
    playbackStarts += 1;
  });

  assert.strictEqual(ok, false, "a failed AudioContext start must report playback failure");
  assert.strictEqual(playbackStarts, 0, "a failed AudioContext start must not announce playback");
  assert.strictEqual(state.ttsDebugAudioStartedAt, 0, "a failed AudioContext start must not mark audio as started");
  assert.strictEqual(state.streamSpeakPlayedSession, 0, "a failed AudioContext start must not satisfy the stream watchdog");
  assert.notStrictEqual(state.ttsContextSpeaking, true, "a failed AudioContext start must not leave the character marked as speaking");
  assert.strictEqual(state.ttsContextBufferSource, null, "a failed AudioContext start must release the buffer source");
  assert.ok(stopCalls >= 1, "a failed AudioContext start should clean up the attempted source");
  assert.ok(
    !debugEvents.some((item) => item.event === "context_play_start"),
    "the context start audit must be written only after source.start succeeds"
  );
  assert.ok(
    debugEvents.some((item) => item.event === "context_play_fail"),
    "the failed context start should remain diagnosable"
  );
}

async function withFakeBrowserSpeech(run) {
  const originalUtterance = global.SpeechSynthesisUtterance;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  class FakeSpeechSynthesisUtterance {
    constructor(text) {
      this.text = String(text || "");
      this.lang = "";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }
  global.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
  global.setTimeout = () => 0;
  global.clearTimeout = () => {};
  try {
    return await run();
  } finally {
    global.SpeechSynthesisUtterance = originalUtterance;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
}

function createBrowserSpeechController({
  autoEnd = true,
  utterances = [],
  cancelCounter = { count: 0 },
  playbackStarts = []
} = {}) {
  const state = {
    ttsPlaybackGeneration: 7,
    ttsBrowserPlaybackToken: 0,
    speakingEnabled: true,
    ttsReady: true,
    ttsProvider: "browser",
    currentTalkStyle: "neutral",
    streamSpeakPlayedSession: 0
  };
  const windowObject = {
    speechSynthesis: {
      resume() {},
      cancel() {
        cancelCounter.count += 1;
      },
      speak(utterance) {
        utterances.push(utterance);
        if (autoEnd) {
          Promise.resolve().then(() => {
            utterance.onstart?.();
            utterance.onend?.();
          });
        }
      }
    },
    setTimeout: () => 0,
    clearTimeout() {}
  };
  const controller = ttsPlaybackController.createController({
    state,
    windowObject,
    performanceObject: { now: () => 1234 },
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    buildVoiceCandidates: () => [null],
    buildSpeakProsody: () => ({
      speed_ratio: 1,
      pitch_ratio: 1,
      volume_ratio: 1
    }),
    beginSpeechPerformance: () => {},
    finishSpeechAnimation: () => {},
    endSpeechAnimation: () => {},
    showSubtitleText: () => {},
    hideSubtitleText: () => {},
    setStatus: () => {}
  });
  return { controller, state, utterances, cancelCounter, playbackStarts };
}

async function testBrowserPreserveTurnGenerationKeepsSameTurnCallbacksCurrent() {
  await withFakeBrowserSpeech(async () => {
    const starts = [];
    const { controller, state } = createBrowserSpeechController();
    const first = await controller.speak("one", {
      force: true,
      playbackGeneration: 7,
      preserveTurnPlaybackGeneration: true,
      onPlaybackStart: (event) => starts.push(event)
    });
    const second = await controller.speak("two", {
      force: true,
      playbackGeneration: 7,
      preserveTurnPlaybackGeneration: true,
      onPlaybackStart: (event) => starts.push(event)
    });

    assert.strictEqual(first, true);
    assert.strictEqual(second, true);
    assert.strictEqual(state.ttsPlaybackGeneration, 7, "same-turn browser speech must not advance the global playback generation");
    assert.strictEqual(starts.length, 2);
    assert.deepStrictEqual(starts.map((event) => event.playbackGeneration), [7, 7]);
    assert.notStrictEqual(
      starts[0].browserPlaybackToken,
      starts[1].browserPlaybackToken,
      "browser callbacks should still get per-utterance tokens inside one turn"
    );

    const defaultStarts = [];
    const defaultOk = await controller.speak("three", {
      force: true,
      playbackGeneration: 7,
      onPlaybackStart: (event) => defaultStarts.push(event)
    });
    assert.strictEqual(defaultOk, true);
    assert.strictEqual(state.ttsPlaybackGeneration, 8, "default browser speech keeps the historical interrupt behavior");
    assert.strictEqual(defaultStarts[0].playbackGeneration, 8);
  });
}

async function testStaleBrowserCallbacksCannotCancelNewerSpeech() {
  await withFakeBrowserSpeech(async () => {
    const utterances = [];
    const cancelCounter = { count: 0 };
    const starts = [];
    const { controller, state } = createBrowserSpeechController({
      autoEnd: false,
      utterances,
      cancelCounter
    });

    const stalePromise = controller.speak("old voice", {
      force: true,
      playbackGeneration: 7,
      preserveTurnPlaybackGeneration: true,
      onPlaybackStart: (event) => starts.push(event)
    });
    await Promise.resolve();
    assert.strictEqual(utterances.length, 1);

    controller.stopAllAudioPlayback();
    const cancelCountAfterStop = cancelCounter.count;
    const currentPromise = controller.speak("new voice", {
      force: true,
      playbackGeneration: state.ttsPlaybackGeneration,
      preserveTurnPlaybackGeneration: true,
      onPlaybackStart: (event) => starts.push(event)
    });
    await Promise.resolve();
    assert.strictEqual(utterances.length, 2);

    utterances[1].onstart?.();
    utterances[0].onstart?.();
    utterances[0].onend?.();
    utterances[1].onend?.();

    assert.strictEqual(await stalePromise, false, "stale browser callbacks should settle as obsolete");
    assert.strictEqual(await currentPromise, true, "the newer utterance should keep playing normally");
    assert.strictEqual(
      cancelCounter.count,
      cancelCountAfterStop,
      "a stale onstart must not call speechSynthesis.cancel and kill newer speech"
    );
    assert.strictEqual(starts.length, 1, "only the current utterance should announce actual playback");
    assert.strictEqual(starts[0].playbackGeneration, state.ttsPlaybackGeneration);
  });
}

async function testCancelledHtmlAudioPlaybackSettlesPromptly() {
  const originalAudio = global.Audio;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;
  let pauseCalls = 0;
  class HangingAudio {
    constructor() {
      this.preload = "";
      this.muted = false;
      this.volume = 1;
      this.currentTime = 0;
      this.duration = 12;
      this.ended = false;
      this.paused = true;
      this.src = "";
    }
    play() {
      this.paused = false;
      return new Promise(() => {});
    }
    pause() {
      pauseCalls += 1;
      this.paused = true;
    }
  }
  global.Audio = HangingAudio;
  global.URL.createObjectURL = () => "blob:cancelled-html-audio";
  global.URL.revokeObjectURL = () => {};
  try {
    const state = {
      ttsPlaybackGeneration: 11,
      ttsAudioPlaybackToken: 0,
      streamSpeakPlayedSession: 0,
      speakingEnabled: true
    };
    const controller = ttsPlaybackController.createController({
      state,
      windowObject: {
        setTimeout: () => 1,
        clearTimeout() {},
        setInterval: () => 2,
        clearInterval() {}
      },
      performanceObject: { now: () => 2000 },
      isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
      ensureTTSAudioAnalyser: () => false,
      sanitizeSpeakText: (text) => String(text || "").trim(),
      detectMood: () => "idle",
      normalizeTalkStyle: () => "neutral"
    });

    const playback = controller.playAudioBlob({ size: 8 }, {
      playbackGeneration: 11,
      sessionId: 41,
      text: "cancelled html audio"
    });
    await flushMicrotasks();
    controller.stopAllAudioPlayback();
    assert.strictEqual(await playback, false, "cancelled HTML audio playback must settle immediately");
    assert.ok(pauseCalls >= 1, "cancelling HTML audio should still pause the native audio element");
    assert.deepStrictEqual(state.ttsPlaybackCancelWaiters, [], "cancelled HTML audio should unregister its waiter");
  } finally {
    global.Audio = originalAudio;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  }
}

async function testCancelledAudioContextPlaybackSettlesPromptly() {
  let source = null;
  class HangingAudioContext {
    constructor() {
      this.state = "running";
      this.destination = {};
    }
    async decodeAudioData() {
      return { duration: 10 };
    }
    createBufferSource() {
      source = {
        buffer: null,
        onended: null,
        connect() {},
        disconnect() {},
        start() {},
        stop() {}
      };
      return source;
    }
    createGain() {
      return { gain: { value: 0 }, connect() {} };
    }
    createAnalyser() {
      return {
        context: this,
        frequencyBinCount: 8,
        connect() {}
      };
    }
  }
  const state = {
    ttsPlaybackGeneration: 17,
    ttsContextSpeaking: false,
    ttsContextBufferSource: null
  };
  const controller = ttsPlaybackController.createController({
    state,
    windowObject: {
      AudioContext: HangingAudioContext,
      setTimeout: () => 1,
      clearTimeout() {}
    },
    performanceObject: { now: () => 3000 },
    isCurrentTTSPlaybackGeneration: (generation) => Number(generation) === Number(state.ttsPlaybackGeneration),
    recordTTSDebugEvent: () => {},
    sanitizeSpeakText: (text) => String(text || "").trim(),
    beginSpeechAnimation: () => {},
    endSpeechAnimation: () => {},
    finishSpeechAnimation: () => {}
  });

  const playback = controller.playAudioByContext({
    size: 4,
    arrayBuffer: async () => new ArrayBuffer(4)
  }, {
    sessionId: 51,
    playbackGeneration: 17,
    text: "cancelled context audio"
  });
  await flushMicrotasks();
  assert.ok(source, "the fake AudioContext source should have been created before cancellation");
  controller.stopAllAudioPlayback();
  assert.strictEqual(await playback, false, "cancelled AudioContext playback must settle immediately");
  assert.strictEqual(state.ttsContextBufferSource, null);
  assert.deepStrictEqual(state.ttsPlaybackCancelWaiters, [], "cancelled AudioContext playback should unregister its waiter");
}

async function main() {
  await testAudioContextStartFailureDoesNotAnnouncePlayback();
  await testBrowserPreserveTurnGenerationKeepsSameTurnCallbacksCurrent();
  await testStaleBrowserCallbacksCannotCancelNewerSpeech();
  await testCancelledHtmlAudioPlaybackSettlesPromptly();
  await testCancelledAudioContextPlaybackSettlesPromptly();

  console.log("TTS actual-start guard checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
