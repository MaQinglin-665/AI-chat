"use strict";
const assert = require("node:assert/strict");
const playbackApi = require("../web/ttsPlaybackController.js");
const expressionApi = require("../web/live2dExpressionController.js");
const startupApi = require("../web/appStartupController.js");
const runtime = require("../web/avatar/avatarRuntime.js");
const sync = require("../web/avatar/browserLipSync.js");
function harness(kind = "hiyori") {
  let now = 1000, sequence = 0;
  const utterances = [], timers = new Map(), listeners = new Map(), posted = [];
  const state = { uiView: "chat", config: { avatar: { kind: kind === "vrm" ? "vrm" : "live2d" }, tts: { browser_lip_sync_delay_ms: 120 } },
    ttsPlaybackGeneration: 1, speakingEnabled: true, speechMouthOpen: 0, ttsAudioLevel: 0 };
  const synth = { speaking: false, paused: false, resume() {}, cancel() { this.speaking = false; },
    speak(utterance) { utterances.push(utterance); this.speaking = true; } };
  const host = { speechSynthesis: synth, setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }, Event: class { constructor(type) { this.type = type; } },
    addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
    BroadcastChannel: class { postMessage(packet) { posted.push(packet); } close() {} } };
  const performance = { now: () => now };
  const mouth = expressionApi.createController({ state, windowObject: host, performanceObject: performance,
    isSpeakingNow: () => synth.speaking, isSpeechMotionActive: () => synth.speaking });
  const controller = playbackApi.createController({ state, windowObject: host, performanceObject: performance,
    isCurrentTTSPlaybackGeneration: generation => generation === state.ttsPlaybackGeneration,
    buildSpeakProsody: () => ({}), beginSpeechAnimation: (text, mood, style) => mouth.beginSpeechAnimation(text, mood, style, { durationMs: 800 }),
    finishSpeechAnimation: mouth.finishSpeechAnimation, endSpeechAnimation: mouth.endSpeechAnimation });
  const startup = startupApi.createController({ state, windowObject: host, performanceObject: performance, wallNow: () => 1700000000000 + now,
    requestAnimationFrame: fn => host.setTimeout(fn, 16), cancelAnimationFrame: id => host.clearTimeout(id),
    isSpeechMotionActive: () => synth.speaking, isSpeakingNow: () => synth.speaking, getSpeechAnimationMouthOpen: mouth.getSpeechAnimationMouthOpen });
  return { state, synth, utterances, timers, listeners, posted, mouth, controller, startup,
    setNow(value) { now = value; }, sample(value) { now = value; return mouth.getSpeechAnimationMouthOpen(); },
    start() { return controller.speakOnceWithVoice("Long actual speech, short old estimated animation.", null, { force: true, playbackGeneration: state.ttsPlaybackGeneration }); } };
}
(async () => {
  const original = global.SpeechSynthesisUtterance;
  global.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  try {
    for (const kind of ["hiyori", "mao", "vrm"]) {
    const h = harness(kind); h.startup.startChatSpeechBroadcastLoop();
    const pending = h.start(), utterance = h.utterances[0];
    assert.equal(h.synth.speaking, true);
    assert.equal(h.sample(1100), 0, "pending engine state cannot open mouth before onstart");
    h.state.avatarIntentOverrides = { mouth: { open: .73, vowel: "i" } };
    assert.equal(h.sample(1100), .73, "explicit intent retains main's precedence over browser timing");
    delete h.state.avatarIntentOverrides;
    h.setNow(2000); utterance.onstart();
    assert.ok(h.posted.length > 1, "playback events must wake idle250ms speech bridge immediately");
    assert.equal(h.sample(2119), 0, "respect bounded device-start delay");
    assert.ok(h.sample(2190) > .05);
    const values = Array.from({ length: 90 }, (_, i) => h.sample(30000 + i * 16));
    assert.ok(Math.max(...values) - Math.min(...values) > .3, "mouth keeps moving long after old800ms estimate");
    h.sample(32050); h.state._speechBroadcastTick();
    const tail = h.posted.at(-1);
    assert.ok(tail.speechExpiresAtEpochMs > tail.speechSentAtWallMs,
      "actual long speech renews lease instead of sending expired estimated-duration packets");
    let receiver;
    const remoteState = { uiView: "model", motionEnabled: false, speechMouthOpen: 0 };
    const remote = startupApi.createController({ state: remoteState,
      performanceObject: { now: () => 90000 }, wallNow: () => tail.speechSentAtWallMs,
      windowObject: { BroadcastChannel: class { constructor() { receiver = this; } close() {} } } });
    remote.startModelSpeechBroadcastListener(); receiver.onmessage({ data: tail });
    assert.equal(remoteState.ttsBrowserMouthActive, true);
    assert.equal(runtime.frameFromState(remoteState, 90000).mouth.open, tail.mouthOpen,
      "detached model with a different performance clock accepts long-speech tail");
    h.setNow(33000); utterance.onpause(); assert.equal(h.sample(33500), 0);
    h.setNow(34000); utterance.onresume(); assert.ok(h.sample(34040) > 0);
    h.setNow(35000); utterance.onboundary({ charIndex: 10, elapsedTime: 33 });
    assert.equal(h.state.avatarBrowserSpeech.boundaryIndex, 10);
    utterance.onboundary({ charIndex: 2 }); assert.equal(h.state.avatarBrowserSpeech.boundaryIndex, 10);
    h.synth.speaking = false; utterance.onend();
    assert.equal(await pending, true); assert.equal(h.sample(35100), 0, "onend closes immediately regardless of estimated release");
    assert.equal(h.posted.at(-1).mouthOpen, 0);
    h.startup.stopChatSpeechBroadcastLoop(); assert.equal(h.listeners.size, 0, "wake listener disposed");

    const fallback = harness(), fallbackPending = fallback.start();
    const probe = [...fallback.timers.values()].find(t => t.delay === 40);
    fallback.setNow(1040); probe.fn();
    assert.equal(fallback.sample(1200), 0, "missing-event fallback needs a longer start guard");
    assert.ok(fallback.sample(1440) > .05);
    fallback.setNow(1600); fallback.utterances[0].onstart();
    assert.equal(fallback.sample(1650), 0, "late real start supersedes fallback exactly once");
    fallback.setNow(1750); fallback.utterances[0].onstart();
    assert.equal(fallback.state.avatarBrowserSpeech.startedAt, 1600, "duplicate start cannot restart lip clock");
    fallback.controller.stopAllAudioPlayback(); assert.equal(await fallbackPending, false);
    assert.equal(fallback.sample(1800), 0);
    const next = fallback.start(), nextUtterance = fallback.utterances[1];
    fallback.setNow(2000); nextUtterance.onstart();
    fallback.utterances[0].onend(); fallback.utterances[0].onpause();
    assert.equal(fallback.state.avatarBrowserSpeech.phase, "playing", "obsolete callbacks cannot stop newer speech");
    fallback.synth.speaking = false; nextUtterance.onerror(); assert.equal(await next, false);
    assert.equal(fallback.sample(3000), 0);

    const staleAnalyser = harness(kind), stalePending = staleAnalyser.start();
    staleAnalyser.state.ttsAudioAnalyser = {}; staleAnalyser.state.ttsAudioLevel = .9;
    assert.equal(staleAnalyser.sample(1100), 0, "old server analyser cannot open queued browser mouth");
    assert.equal(runtime.frameFromState(staleAnalyser.state, 1100).mouth.open, 0);
    staleAnalyser.controller.stopAllAudioPlayback(); await stalePending;

    const server = harness(kind), browserPending = server.start();
    server.controller.stopAllAudioPlayback(); await browserPending;
    assert.equal(sync.sample(server.state, 1800), null, "cancelled token cannot own subsequent server speech");
    }
    const hiyori = { ttsBrowserPlaybackToken: 1, ttsPlaybackGeneration: 1 };
    sync.begin(hiyori, { token: 1, generation: 1 }, 1000); assert.equal(sync.sample(hiyori, 1200), 0, "Hiyori shares pending gate");
    const modelState = { ttsBrowserMouthActive: true, uiView: "model", _broadcastSpeechUpdatedAt: 1000, speechMouthOpen: .5 };
    assert.equal(runtime.frameFromState(modelState, 1100).mouth.open, .5);
    assert.equal(runtime.frameFromState(modelState, 2000).mouth.open, 0, "stale remote still closes");
    modelState.ttsBrowserMouthActive = false; modelState.ttsAudioLevel = .4;
    assert.equal(runtime.frameFromState(modelState, 1100).mouth.open, .4, "analysed remote retains original envelope");
    modelState.ttsAudioLevel = 0; modelState.speechMouthOpen = .9;
    assert.equal(runtime.frameFromState(modelState, 1100).mouth.open, 0, "analysed silence must not inherit browser fallback");
    modelState.ttsBrowserMouthActive = "true";
    assert.equal(runtime.frameFromState(modelState, 1100).mouth.open, 0, "only an explicit validated browser flag owns remote mouth");
    modelState.ttsAudioLevel = .7; modelState.ttsVowel = "i";
    assert.equal(runtime.frameFromState(modelState, 1100).mouth.vowel, "i", "main analysed vowel path stays available");
    modelState.ttsBrowserMouthActive = true;
    assert.equal(runtime.frameFromState(modelState, 1100).mouth.vowel, null, "browser speech cannot inherit an old analysed vowel");
    const switched = { ttsBrowserPlaybackToken: 1, ttsPlaybackGeneration: 1, ttsAudioLevel: .9, ttsVowel: "o" };
    sync.begin(switched, { token: 1, generation: 1, delayMs: 120 }, 1000); sync.start(switched, 1, 1250);
    assert.ok(runtime.frameFromState(switched, 1500).mouth.open > .01);
    assert.equal(runtime.frameFromState(switched, 1500).mouth.vowel, null, "local shared frame clears stale server vowel after provider change");
    for (const delayMs of [-50, 0, 120, 500, 900]) {
      const state = { ttsBrowserPlaybackToken: 1, ttsPlaybackGeneration: 1 };
      sync.begin(state, { token: 1, generation: 1, delayMs }, 0); sync.start(state, 1, 250);
      const delay = Math.min(500, Math.max(0, delayMs));
      assert.equal(sync.sample(state, 250 + delay), 0);
      assert.ok(sync.sample(state, 250 + delay + 90) > .05);
      state.ttsPlaybackGeneration++;
      assert.equal(sync.sample(state, 2000), null, "stale generation cannot own audio envelope");
    }
    console.log("[OK] Shared Hiyori/Mao/VRM browser real-event onset, device delay, long tail, pause/resume/boundary, end/cancel/stale callbacks and immediate shared speech bridge");
  } finally { global.SpeechSynthesisUtterance = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
