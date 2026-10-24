"use strict";

// Lip-sync robustness: hidden-window bridge scheduling, analyser window size
// and output-latency compensation.
const assert = require("assert");
const startupApi = require("../web/appStartupController.js");
const expressionApi = require("../web/live2dExpressionController.js");

// ---------------------------------------------------------------------------
// 1. Desktop-pet mode minimizes the chat window while it keeps playing the
//    voice. The speech bridge must not depend on animation frames there.
// ---------------------------------------------------------------------------
class FakeBroadcastChannel {
  constructor() { this.sent = []; }
  postMessage(message) { this.sent.push(message); }
  close() {}
}

function startBridge({ surfaceActive }) {
  const timers = [];
  const frames = [];
  const state = {
    uiView: "full",
    rendererSurfaceActive: surfaceActive,
    speechAnimUntil: 0,
    ttsAudioLevel: 0.4
  };
  const controller = startupApi.createController({
    state,
    windowObject: { BroadcastChannel: FakeBroadcastChannel },
    performanceObject: { now: () => 1000 },
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    cancelAnimationFrame: () => {},
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; },
    clearTimeout: () => {},
    isSpeechMotionActive: () => true,
    isSpeakingNow: () => true,
    getSpeechAnimationMouthOpen: () => 0.6
  });
  controller.startChatSpeechBroadcastLoop();
  return { state, controller, timers, frames };
}

{
  const hidden = startBridge({ surfaceActive: false });
  assert.strictEqual(hidden.state._speechBroadcastScheduleKind, "hidden_speech",
    "a hidden chat window must keep publishing mouth levels on a timer");
  assert.strictEqual(hidden.frames.length, 0, "hidden speech must not wait for animation frames");
  assert.strictEqual(hidden.timers.length, 1);
  assert.ok(hidden.timers[0].delay <= 20, "hidden speech bridge should stay near 60 Hz");
  const sent = hidden.state._speechBroadcast.sent;
  assert.ok(sent.length >= 1 && sent[sent.length - 1].mouthOpen === 0.6, "mouth level is still published");

  // Restoring the window returns to animation-frame pacing on the next tick.
  hidden.state.rendererSurfaceActive = true;
  hidden.timers[0].fn();
  assert.strictEqual(hidden.state._speechBroadcastScheduleKind, "animation");
  assert.strictEqual(hidden.frames.length, 1);
  hidden.controller.stopChatSpeechBroadcastLoop();
}

{
  const visible = startBridge({ surfaceActive: true });
  assert.strictEqual(visible.state._speechBroadcastScheduleKind, "animation",
    "a visible window keeps animation-frame pacing");
  assert.strictEqual(visible.timers.length, 0);
  visible.controller.stopChatSpeechBroadcastLoop();
}

{
  // Older shells never report surface state (undefined): keep animation frames.
  const legacy = startBridge({ surfaceActive: undefined });
  assert.strictEqual(legacy.state._speechBroadcastScheduleKind, "animation");
  legacy.controller.stopChatSpeechBroadcastLoop();
}

// ---------------------------------------------------------------------------
// 2./3. Analyser window and output-latency compensation.
// ---------------------------------------------------------------------------
function createAudioHarness({ outputLatency = 0, baseLatency = 0 } = {}) {
  let now = 0;
  let amplitude = 0;
  const reads = [];
  class FakeAnalyser {
    constructor(context) { this.context = context; this.fftSize = 2048; this.smoothingTimeConstant = 0.8; }
    get frequencyBinCount() { return this.fftSize / 2; }
    connect() {}
    getByteTimeDomainData(data) {
      reads.push({ length: data.length, fftSize: this.fftSize });
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.round(128 + amplitude * 127 * (i % 2 ? 1 : -1));
      }
    }
  }
  class FakeAudioContext {
    constructor() { this.outputLatency = outputLatency; this.baseLatency = baseLatency; this.destination = {}; }
    createMediaElementSource() { return { connect() {} }; }
    createAnalyser() { return new FakeAnalyser(this); }
  }
  // Mirrors chatState.js defaults for the audio-level fields.
  const state = { ttsAudioLevel: 0, ttsAudioRawLevel: 0, ttsAudioRms: 0 };
  const controller = expressionApi.createController({
    state,
    windowObject: { AudioContext: FakeAudioContext, setTimeout, clearTimeout },
    performanceObject: { now: () => now }
  });
  assert.ok(controller.ensureTTSAudioAnalyser({}), "analyser should attach to the audio element");
  return {
    state,
    controller,
    reads,
    setAmplitude(value) { amplitude = value; },
    advance(ms) { now += ms; return controller.sampleTTSAudioLevel(); }
  };
}

{
  const audio = createAudioHarness();
  assert.strictEqual(audio.state.ttsAudioAnalyser.fftSize, 1024);
  audio.setAmplitude(0.5);
  audio.advance(16);
  assert.strictEqual(audio.reads[0].length, 1024,
    "the time-domain read must cover the whole fftSize window, not frequencyBinCount");
  assert.ok(audio.state.ttsAudioRawLevel > 0.5, "without device latency the level is immediate");
  assert.strictEqual(audio.state.ttsAudioOutputLatencyMs, 0);
}

{
  // 200 ms of output latency (typical Bluetooth): the mouth waits for the audible sound.
  const audio = createAudioHarness({ outputLatency: 0.2 });
  audio.setAmplitude(0.5);
  for (let t = 0; t < 180; t += 16) {
    audio.advance(16);
  }
  assert.strictEqual(audio.state.ttsAudioRawLevel, 0, "level must not lead the audible output");
  assert.ok(audio.state.ttsAudioLevel < 0.05, "smoothed mouth level stays closed before the sound is heard");
  for (let t = 0; t < 64; t += 16) {
    audio.advance(16);
  }
  assert.ok(audio.state.ttsAudioRawLevel > 0.5, "level follows once the delayed sound becomes audible");
  assert.strictEqual(audio.state.ttsAudioOutputLatencyMs, 200);

  // Silence is also delayed, so the mouth does not close while the tail is still audible.
  audio.setAmplitude(0);
  audio.advance(16);
  assert.ok(audio.state.ttsAudioRawLevel > 0.5, "audible tail keeps the mouth moving");
  for (let t = 0; t < 240; t += 16) {
    audio.advance(16);
  }
  assert.strictEqual(audio.state.ttsAudioRawLevel, 0);
  assert.ok(audio.state.ttsAudioLevelHistory.length < 30, "history stays bounded to the latency window");

  // A finished utterance must not leak its delayed levels into the next one.
  audio.controller.finishSpeechAnimation();
  assert.deepStrictEqual(audio.state.ttsAudioLevelHistory, []);
}

{
  // Implausible values are capped; tiny values (wired output) are ignored.
  const capped = createAudioHarness({ outputLatency: 2 });
  capped.setAmplitude(0.5);
  capped.advance(16);
  assert.strictEqual(capped.state.ttsAudioOutputLatencyMs, 350);
  const wired = createAudioHarness({ outputLatency: 0.01 });
  wired.setAmplitude(0.5);
  wired.advance(16);
  assert.strictEqual(wired.state.ttsAudioOutputLatencyMs, 0);
  assert.ok(wired.state.ttsAudioRawLevel > 0.5);
  const baseOnly = createAudioHarness({ outputLatency: 0, baseLatency: 0.05 });
  baseOnly.setAmplitude(0.5);
  baseOnly.advance(16);
  assert.strictEqual(baseOnly.state.ttsAudioOutputLatencyMs, 50, "baseLatency is the fallback estimate");
}

console.log("[OK] Lip-sync bridge frontend checks passed.");
