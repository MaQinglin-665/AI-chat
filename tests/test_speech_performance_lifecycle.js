#!/usr/bin/env node
"use strict";

const assert = require("assert");
const expressionApi = require("../web/live2dExpressionController.js");
const playbackApi = require("../web/ttsPlaybackController.js");
const directorApi = require("../web/hiyoriPerformanceDirector.js");
const cueApi = require("../web/performanceCueController.js");
const startupApi = require("../web/appStartupController.js");
const motionApi = require("../web/motionRuntimeController.js");

function harness() {
  let now = 1000;
  let audible = false;
  let stopCalls = 0;
  const state = {
    expressionEnabled: true,
    modelProfileName: "hiyori_pro_t11",
    ttsPlaybackGeneration: 11,
    model: {
      expression() { return true; },
      internalModel: {
        coreModel: {},
        motionManager: { _stopAllMotions() { stopCalls += 1; } }
      }
    }
  };
  const expression = expressionApi.createController({
    state,
    performanceObject: { now: () => now },
    hiyoriPerformanceDirector: directorApi,
    resolveHiyoriAuthoredMotion: cueApi.resolveHiyoriAuthoredMotion,
    isSpeakingNow: () => audible,
    isSpeechMotionActive: () => audible
  });
  const playback = playbackApi.createController({
    state,
    windowObject: {},
    endSpeechAnimation: (...args) => expression.endSpeechAnimation(...args)
  });
  const startShake = () => expression.beginSpeechAnimation("不行，这里还得重新想一想。", "idle", "neutral", {
    performanceCue: cueApi.buildPerformanceCue({
      performancePlan: { emotion: "neutral", action: "shake_head", intensity: "medium" }
    })
  });
  return {
    state, expression, playback, startShake,
    get now() { return now; },
    get audible() { return audible; },
    get stopCalls() { return stopCalls; },
    advance(ms) { now += ms; },
    setAudible(value) { audible = value; }
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function motionHarness() {
  const h = harness();
  const old = deferred();
  const played = [];
  h.state.motionEnabled = true;
  h.state.motionCooldownUntil = 0;
  h.state.motionDefinitions = { EmotionAngry: [{}], EmotionHappy: [{}], Tap: [{}] };
  h.state.model.motion = (group) => {
    played.push(group);
    return group === "EmotionAngry" ? old.promise : Promise.resolve(true);
  };
  const motion = motionApi.createController({
    state: h.state, windowObject: {}, performanceObject: { now: () => h.now }
  });
  const speechOptions = (emotion, generation) => {
    const authoredMotion = cueApi.resolveHiyoriAuthoredMotion(emotion, "none", "high");
    return {
      source: "performance_cue", groups: [authoredMotion.group, "Tap"],
      preserveGroupOrder: true, force: true, allowFallback: false,
      authoredMotion, playbackGeneration: generation
    };
  };
  return { h, motion, old, played, speechOptions };
}

function receiverHarness() {
  const h = harness();
  h.state.uiView = "model";
  h.state.motionEnabled = true;
  h.state.motionDefinitions = { EmotionAngry: [{}], Tap: [{}] };
  h.state.model.motion = async () => true;
  const motion = motionApi.createController({
    state: h.state, windowObject: {}, performanceObject: { now: () => h.now }
  });
  let channel;
  let revision = 0;
  let appliedCues = 0;
  class FakeBroadcastChannel {
    constructor() { channel = this; }
    close() {}
  }
  const receiver = startupApi.createController({
    state: h.state,
    windowObject: { BroadcastChannel: FakeBroadcastChannel },
    performanceObject: { now: () => h.now },
    wallNow: () => 50_000 + h.now,
    applySpeechPerformanceCue: (cue) => {
      if (cue) appliedCues += 1;
      return h.expression.applySpeechPerformanceCue(cue);
    },
    resolvePerformanceCueMotionPlan: cueApi.resolvePerformanceCueMotionPlan,
    tryBuiltInMotion: (...args) => motion.tryBuiltInMotion(...args)
  });
  receiver.startModelSpeechBroadcastListener();
  return {
    h,
    get appliedCues() { return appliedCues; },
    send(cue) {
      const wallNow = 50_000 + h.now;
      channel.onmessage({ data: {
        type: "speech", speechBridgeVersion: 2, speechSenderId: "lifecycle-chat",
        speechRevision: ++revision, speechSentAtWallMs: wallNow,
        speaking: !!cue, assistantAudioActive: !!cue,
        speechExpiresAtEpochMs: cue ? wallNow + 900 : 0,
        speechStartedAtEpochMs: 51_000, animDurationMs: 15_000,
        performanceCueExpiresAtEpochMs: cue ? wallNow + 900 : 0,
        streamSessionId: 41, playbackGeneration: 11,
        mood: cue?.live2dMood || "idle", speechStyle: "playful", performanceCue: cue
      } });
    }
  };
}

const cases = [
  ["turn cancellation stops the previous generation's owned authored clip", () => {
    const h = harness();
    h.state.hiyoriAuthoredMotion = { group: "EmotionAngry", playbackGeneration: 11 };
    h.state.hiyoriAuthoredMotionUntil = 9000;
    // Exercise the real public stop path, including its generation advance.
    h.playback.stopAllAudioPlayback();
    assert.strictEqual(h.state.ttsPlaybackGeneration, 12);
    assert.strictEqual(h.stopCalls, 1, "advancing the audio generation must still stop the cancelled clip");
    assert.strictEqual(h.state.hiyoriAuthoredMotion, null);
  }],
  ["cancelled speech gestures stop instead of completing over the next turn", () => {
    const h = harness();
    h.startShake();
    assert.strictEqual(h.state.hiyoriDirector.action.source, "speech_cue");
    h.advance(250);
    h.playback.stopAllAudioPlayback();
    h.advance(400);
    const sample = h.expression.applyHiyoriPerformanceLayer({}, {
      now: h.now, speaking: false, audioActive: false, emotion: "neutral", allowIdle: false,
      playbackGeneration: h.state.ttsPlaybackGeneration
    });
    assert.strictEqual(sample.action, "", "the cancelled shake must not continue its original active gesture");
    assert.strictEqual(sample.outgoingAction, "", "any brief interruption blend must have settled");
  }],
  ["cancelling speech preserves an independent user reaction", () => {
    const h = harness();
    h.expression.triggerSemanticAction("nod", { now: h.now, source: "user_click", priority: 4 });
    const independent = h.state.hiyoriDirector.action;
    h.playback.stopAllAudioPlayback();
    assert.strictEqual(h.state.hiyoriDirector.action, independent,
      "audio cleanup must not erase a separately requested user reaction");
  }],
  ["a new generation can perform the same cue after the old cue is cancelled", () => {
    const h = harness();
    h.startShake();
    h.advance(250);
    h.playback.stopAllAudioPlayback();
    h.advance(40);
    h.startShake();
    assert.strictEqual(h.state.hiyoriDirector.action?.name, "shake");
    assert.strictEqual(h.state.hiyoriDirector.action.startedAt, h.now,
      "the old signature and gesture cooldown must not suppress the new sentence");
    assert.strictEqual(h.state.hiyoriDirector.action.source, "speech_cue");
  }],
  ["a long audible sentence keeps its delivery cue until actual completion", () => {
    const h = harness();
    h.setAudible(true);
    h.expression.beginSpeechAnimation("哼哼，这句话还没有讲完，可别这么快让我收起笑容。", "happy", "playful", {
      durationMs: 1000,
      performanceCue: cueApi.buildPerformanceCue({
        performancePlan: { emotion: "playful", action: "none", intensity: "medium" }
      })
    });
    h.advance(3000);
    h.expression.applyStyleExpressionLayer();
    assert.strictEqual(h.state.speechPerformanceCue?.emotion, "playful",
      "audible speech must not lose its precise delivery when a fixed hold or duration estimate expires");
    h.setAudible(false);
    h.expression.finishSpeechAnimation();
    h.advance(400);
    h.expression.applyStyleExpressionLayer();
    assert.strictEqual(h.state.speechPerformanceCue, null,
      "actual completion must still release the expression within its bounded tail");
  }],
  ["an unowned direct cue cannot borrow another playback's audible state", () => {
    const h = harness();
    h.setAudible(true);
    h.expression.applySpeechPerformanceCue(cueApi.buildPerformanceCue({
      performancePlan: { emotion: "playful", action: "none", intensity: "medium" }
    }));
    h.advance(3000);
    h.expression.applyStyleExpressionLayer();
    assert.strictEqual(h.state.speechPerformanceCue, null,
      "a display-only cue must expire even while unrelated audio is audible");
  }],
  ["a model window cannot renew a remote cue from a stale audible broadcast", () => {
    const h = harness();
    h.state.uiView = "model";
    h.setAudible(true);
    h.expression.beginSpeechAnimation("远端窗口正在播放。", "happy", "playful", {
      performanceCue: cueApi.buildPerformanceCue({
        performancePlan: { emotion: "playful", action: "none", intensity: "medium" }
      })
    });
    h.state._broadcastSpeechCueOwned = true;
    h.state._broadcastSpeechCueExpiresAt = h.now + 900;
    h.advance(3000);
    h.expression.applyStyleExpressionLayer();
    assert.strictEqual(h.state.speechPerformanceCue, null,
      "the model window must honor the sender's lease expiry");
    assert.strictEqual(h.state._broadcastSpeechCueOwned, false);
  }],
  ["the model-free chat sender renews and then releases the real playback cue", () => {
    const h = harness();
    delete h.state.model;
    h.state.uiView = "chat";
    h.setAudible(true);
    h.expression.beginSpeechAnimation("这是一句持续播放的俏皮台词。", "happy", "playful", {
      durationMs: 1000,
      performanceCue: cueApi.buildPerformanceCue({
        performancePlan: { emotion: "playful", action: "none", intensity: "medium" }
      })
    });
    const posted = [];
    let nextFrame;
    class FakeBroadcastChannel {
      postMessage(payload) { posted.push(payload); }
      close() {}
    }
    const sender = startupApi.createController({
      state: h.state,
      windowObject: { BroadcastChannel: FakeBroadcastChannel, setTimeout: () => 0, clearTimeout() {} },
      performanceObject: { now: () => h.now },
      wallNow: () => 50_000 + h.now,
      requestAnimationFrame: (callback) => { nextFrame = callback; return 1; },
      cancelAnimationFrame() {},
      isSpeechMotionActive: () => h.audible || Number(h.state.speechAnimUntil || 0) > h.now,
      isSpeakingNow: () => h.audible,
      getActiveSpeechPerformanceCue: (at) => h.expression.getActiveSpeechPerformanceCue?.(at),
      getSpeechAnimationMouthOpen: () => 0.4
    });
    sender.startChatSpeechBroadcastLoop();
    h.advance(3000);
    nextFrame();
    assert.strictEqual(posted.at(-1).performanceCue?.emotion, "playful",
      "the real sender ticker must publish a fresh cue even without a model render loop");
    assert.ok(posted.at(-1).performanceCueExpiresAtEpochMs > 50_000 + h.now,
      "the sender must publish the renewed portable expiry");
    h.setAudible(false);
    h.expression.finishSpeechAnimation();
    h.advance(400);
    nextFrame();
    assert.strictEqual(posted.at(-1).performanceCue, null,
      "the sender must stop broadcasting the cue after actual playback completes");
    sender.stopChatSpeechBroadcastLoop();
  }],
  ["fresh model heartbeats keep the same cue alive for ten seconds without replaying it", () => {
    const r = receiverHarness();
    const cue = cueApi.buildPerformanceCue({
      performancePlan: { emotion: "playful", action: "none", intensity: "medium" }
    });
    for (let elapsed = 0; elapsed <= 10_000; elapsed += 200) {
      if (elapsed) r.h.advance(200);
      r.send(cue);
      r.h.expression.applyStyleExpressionLayer();
      assert.strictEqual(r.h.state.speechPerformanceCue?.emotion, "playful",
        `the sender's fresh lease must retain the same cue at ${elapsed}ms`);
    }
    assert.strictEqual(r.appliedCues, 1, "a heartbeat must not replay the cue's gesture or expression pulse");
    r.h.advance(901);
    r.h.expression.applyStyleExpressionLayer();
    assert.strictEqual(r.h.state.speechPerformanceCue, null, "a stopped sender must not leave a remote cue alive");
    assert.strictEqual(r.h.state._broadcastSpeechCueOwned, false);
  }],
  ["a remote null cue stops the model's owned authored speech motion", async () => {
    const r = receiverHarness();
    r.send(cueApi.buildPerformanceCue({
      performancePlan: { emotion: "angry", action: "none", intensity: "high" }
    }));
    await flushMicrotasks();
    assert.strictEqual(r.h.state.hiyoriAuthoredMotion?.group, "EmotionAngry");
    r.h.advance(200);
    r.send(null);
    assert.strictEqual(r.h.stopCalls, 1, "the model receiver must stop its authored clip when the sender clears speech");
    assert.strictEqual(r.h.state.hiyoriAuthoredMotion, null);
    assert.strictEqual(r.h.state.speechPerformanceCue, null);
  }],
  ["a remote null cue clears the model's speech gesture", () => {
    const r = receiverHarness();
    r.send(cueApi.buildPerformanceCue({
      performancePlan: { emotion: "neutral", action: "shake_head", intensity: "medium" }
    }));
    assert.strictEqual(r.h.state.hiyoriDirector.action?.source, "speech_cue");
    r.h.advance(200);
    r.send(null);
    r.h.advance(400);
    const sample = r.h.expression.applyHiyoriPerformanceLayer({}, {
      now: r.h.now, speaking: false, audioActive: false, emotion: "neutral", allowIdle: false
    });
    assert.strictEqual(sample.action, "", "remote cancellation must not keep the old speech gesture running");
    assert.strictEqual(sample.outgoingAction, "");
  }],
  ["a pending authored motion cannot register ownership after its speech is cancelled", async () => {
    const m = motionHarness();
    const pending = m.motion.tryBuiltInMotion("angry", m.speechOptions("angry", 11));
    assert.deepStrictEqual(m.played, ["EmotionAngry"]);
    m.h.playback.stopAllAudioPlayback();
    m.old.resolve(true);
    assert.strictEqual(await pending, false, "a fulfilled stale motion request must report cancellation");
    assert.strictEqual(m.h.state.hiyoriAuthoredMotion ?? null, null,
      "an old async callback cannot restore cleared ownership");
    assert.deepStrictEqual(m.played, ["EmotionAngry"]);
  }],
  ["a rejected pending motion cannot fall through to another group after cancellation", async () => {
    const m = motionHarness();
    const pending = m.motion.tryBuiltInMotion("angry", m.speechOptions("angry", 11));
    m.h.playback.stopAllAudioPlayback();
    m.old.reject(new Error("motion asset load failed"));
    assert.strictEqual(await pending, false);
    assert.deepStrictEqual(m.played, ["EmotionAngry"],
      "cancelled speech must not try a fallback group after the old asset rejects");
  }],
  ["cancelling an authored gesture frees the same group for the next sentence", async () => {
    const m = motionHarness();
    const keyed = generation => ({
      ...m.speechOptions("angry", generation),
      cooldownMs: 5000, motionCooldownKey: "hiyori:EmotionAngry"
    });
    const first = m.motion.tryBuiltInMotion("angry", keyed(11));
    m.old.resolve(true);
    assert.strictEqual(await first, true);
    assert.ok(m.h.state.motionKeyedCooldowns["hiyori:EmotionAngry"] > m.h.now);
    m.h.advance(250);
    m.h.playback.stopAllAudioPlayback();
    assert.strictEqual(await m.motion.tryBuiltInMotion("angry", keyed(12)), true,
      "the cancelled sentence's group cooldown must not suppress the next sentence");
    assert.deepStrictEqual(m.played, ["EmotionAngry", "EmotionAngry"]);
    assert.strictEqual(m.h.state.hiyoriAuthoredMotion?.playbackGeneration, 12);
  }],
  ["an old motion callback cannot replace or stop a newer generation's authored motion", async () => {
    const m = motionHarness();
    const pending = m.motion.tryBuiltInMotion("angry", m.speechOptions("angry", 11));
    m.h.playback.stopAllAudioPlayback();
    assert.strictEqual(await m.motion.tryBuiltInMotion("happy", m.speechOptions("happy", 12)), true);
    const newer = m.h.state.hiyoriAuthoredMotion;
    const stopsBeforeOldReturn = m.h.stopCalls;
    m.old.resolve(true);
    assert.strictEqual(await pending, false);
    assert.strictEqual(m.h.state.hiyoriAuthoredMotion, newer, "stale completion must preserve the new clip's ownership");
    assert.strictEqual(m.h.state.lastMotionGroup, "EmotionHappy");
    assert.strictEqual(m.h.stopCalls, stopsBeforeOldReturn, "stale cleanup must not stop the new clip");
  }],
  ["an old speech callback cannot replace or stop a later user-click motion", async () => {
    const m = motionHarness();
    const pending = m.motion.tryBuiltInMotion("angry", m.speechOptions("angry", 11));
    m.h.playback.stopAllAudioPlayback();
    assert.strictEqual(await m.motion.tryBuiltInMotion("happy", {
      source: "user_click", groups: ["Tap"], force: true, allowFallback: false
    }), true);
    const stopsBeforeOldReturn = m.h.stopCalls;
    m.old.resolve(true);
    assert.strictEqual(await pending, false);
    assert.strictEqual(m.h.state.hiyoriAuthoredMotion ?? null, null,
      "a stale speech callback cannot claim ownership of an independent user action");
    assert.strictEqual(m.h.state.lastMotionGroup, "Tap");
    assert.strictEqual(m.h.stopCalls, stopsBeforeOldReturn, "stale cleanup must not stop the user's motion");
  }]
];

for (const failureMode of ["false", "throw"]) {
  cases.push([`a failed authored request (${failureMode}) releases pending ownership without stopping an unknown clip`, async () => {
    const h = harness();
    h.state.motionEnabled = true;
    h.state.motionDefinitions = { EmotionAngry: [{}, {}], Tap: [{}] };
    const attempts = [];
    h.state.model.motion = async group => {
      attempts.push(group);
      if (failureMode === "throw") throw new Error("motion did not acquire the model");
      return false;
    };
    const motion = motionApi.createController({
      state: h.state, windowObject: {}, performanceObject: { now: () => h.now }
    });
    assert.strictEqual(await motion.tryBuiltInMotion("angry", {
      source: "performance_cue", groups: ["EmotionAngry", "Tap"],
      preserveGroupOrder: true, force: true, allowFallback: false,
      authoredMotion: cueApi.resolveHiyoriAuthoredMotion("angry", "none", "high"),
      playbackGeneration: 11
    }), false);
    assert.deepStrictEqual(attempts, ["EmotionAngry", "EmotionAngry", "Tap"]);
    assert.strictEqual(h.state.hiyoriAuthoredMotion, null, "failed attempts must release their pending motion record");
    assert.strictEqual(h.state.hiyoriAuthoredMotionModel, null);
    assert.strictEqual(h.state.hiyoriAuthoredMotionUntil, 0);
    h.expression.clearSpeechPerformanceCue();
    assert.strictEqual(h.stopCalls, 0, "failed ownership must not authorize stopping another model clip");
  }]);
  cases.push([`a failed independent user motion (${failureMode}) preserves the prior speech clip's cancellable ownership`, async () => {
    const h = harness();
    h.state.motionEnabled = true;
    h.state.motionDefinitions = { EmotionAngry: [{}], Tap: [{}] };
    h.state.model.motion = async group => {
      if (group === "EmotionAngry") return true;
      if (failureMode === "throw") throw new Error("user motion could not start");
      return false;
    };
    const motion = motionApi.createController({
      state: h.state, windowObject: {}, performanceObject: { now: () => h.now }
    });
    assert.strictEqual(await motion.tryBuiltInMotion("angry", {
      source: "performance_cue", groups: ["EmotionAngry"], force: true, allowFallback: false,
      authoredMotion: cueApi.resolveHiyoriAuthoredMotion("angry", "none", "high"),
      playbackGeneration: 11
    }), true);
    const speechClip = h.state.hiyoriAuthoredMotion;
    const speechModel = h.state.hiyoriAuthoredMotionModel;
    assert.strictEqual(await motion.tryBuiltInMotion("happy", {
      source: "user_click", groups: ["Tap"], force: true, allowFallback: false
    }), false);
    assert.strictEqual(h.state.hiyoriAuthoredMotion, speechClip,
      "a user action that never started must not revoke the old speech clip's ownership");
    assert.strictEqual(h.state.hiyoriAuthoredMotionModel, speechModel);
    assert.strictEqual(h.stopCalls, 0);
    h.expression.clearSpeechPerformanceCue();
    assert.strictEqual(h.stopCalls, 1, "clearing speech must still stop the clip left running after the failed user action");
    assert.strictEqual(h.state.hiyoriAuthoredMotion, null);
  }]);
}

async function main() {
  let failed = 0;
  for (const [name, run] of cases) {
    try {
      await run();
      console.log(`[OK] ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`[FAIL] ${name}: ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log("Speech performance lifecycle tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
