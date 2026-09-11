#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const startupController = require(path.join(ROOT, "web", "appStartupController.js"));
const motionRuntimeController = require(path.join(ROOT, "web", "motionRuntimeController.js"));

function makeSpeechPacket(overrides = {}) {
  return {
    type: "speech",
    speechBridgeVersion: 2,
    speechSenderId: "chat-renderer-a",
    speechRevision: 1,
    speechSentAtWallMs: 1_700_000_000_000,
    speaking: true,
    assistantAudioActive: true,
    mouthOpen: 0.55,
    mood: "happy",
    speechStyle: "playful",
    audioLevel: 0.42,
    speechExpiresAtEpochMs: 1_700_000_001_000,
    speechStartedAtEpochMs: 1_699_999_999_600,
    animDurationMs: 1800,
    moodHoldExpiresAtEpochMs: 1_700_000_000_700,
    performanceCueExpiresAtEpochMs: 1_700_000_000_800,
    streamSessionId: 41,
    playbackGeneration: 9,
    performanceCue: {
      version: 1,
      emotion: "happy",
      action: "wave",
      intensity: "high"
    },
    ...overrides
  };
}

function makeModelHarness() {
  let perfNow = 90_000;
  let wallNow = 1_700_000_000_000;
  const channels = [];
  const appliedCues = [];
  class FakeBroadcastChannel {
    constructor() { channels.push(this); }
    close() {}
  }
  const state = {
    uiView: "model",
    model: {},
    motionEnabled: true,
    idleMotionEnabled: true,
    speechAnimUntil: 0,
    speechAnimStartedAt: 0,
    speechAnimDurationMs: 0,
    speechAnimStyle: "neutral",
    currentTalkStyle: "neutral",
    moodHoldUntil: 0,
    speechMouthOpen: 0,
    ttsAudioLevel: 0
  };
  const startup = startupController.createController({
    state,
    windowObject: { BroadcastChannel: FakeBroadcastChannel },
    performanceObject: { now: () => perfNow },
    wallNow: () => wallNow,
    applySpeechPerformanceCue: (cue) => {
      appliedCues.push(cue);
      if (!cue) {
        state.speechPerformanceCue = null;
        state.speechPerformanceCueUntil = 0;
        state.speechEmotionPoseUntil = 0;
        return null;
      }
      state.speechPerformanceCue = cue;
      state.speechPerformanceCueUntil = perfNow + 5000;
      state.speechEmotionPoseUntil = perfNow + 5000;
      state.moodHoldUntil = perfNow + 3000;
      return cue;
    },
    tryBuiltInMotion: () => true,
    resolvePerformanceCueMotionPlan: () => ({
      shouldTrigger: true,
      groups: ["Tap"],
      mood: "happy",
      motionCue: "wave",
      motionRole: "accent",
      cooldownMs: 0,
      priority: 3
    })
  });
  startup.startModelSpeechBroadcastListener();
  const motion = motionRuntimeController.createController({
    state,
    windowObject: {},
    performanceObject: { now: () => perfNow },
    requestAnimationFrame: () => 0,
    enqueueActionIntent: () => {}
  });
  return {
    state,
    startup,
    motion,
    appliedCues,
    send(data) { channels[0].onmessage({ data }); },
    setPerf(value) { perfNow = value; },
    setWall(value) { wallNow = value; },
    get perfNow() { return perfNow; },
    get wallNow() { return wallNow; }
  };
}

function testSenderUsesPortableExpiryContract() {
  const posted = [];
  let scheduled = null;
  class FakeBroadcastChannel {
    postMessage(payload) { posted.push(payload); }
    close() {}
  }
  const state = {
    uiView: "chat",
    speechAnimMood: "happy",
    speechAnimStyle: "playful",
    currentTalkStyle: "steady",
    speechAnimUntil: 2000,
    speechAnimStartedAt: 700,
    speechAnimDurationMs: 1600,
    moodHoldUntil: 1800,
    speechPerformanceCueUntil: 1900,
    streamSpeakSession: 8,
    ttsPlaybackGeneration: 3
  };
  const controller = startupController.createController({
    state,
    windowObject: { BroadcastChannel: FakeBroadcastChannel, setTimeout: () => 0, clearTimeout: () => {} },
    performanceObject: { now: () => 1000 },
    wallNow: () => 50_000,
    requestAnimationFrame: (fn) => {
      scheduled = fn;
      return 1;
    },
    isSpeechMotionActive: () => true,
    isSpeakingNow: () => true,
    getSpeechAnimationMouthOpen: () => 0.4
  });
  controller.startChatSpeechBroadcastLoop();

  assert.strictEqual(posted.length, 1);
  const payload = posted[0];
  assert.strictEqual(payload.speechBridgeVersion, 2);
  assert.ok(payload.speechSenderId, "sender must identify its renderer lifetime");
  assert.strictEqual(payload.speechRevision, 1);
  assert.strictEqual(payload.speechExpiresAtEpochMs, 51_000, "sender must publish wall-clock expiry, not a renderer-local deadline");
  assert.strictEqual(payload.moodHoldExpiresAtEpochMs, 50_800);
  assert.strictEqual(payload.speechStartedAtEpochMs, 49_700);
  assert.ok(!Object.hasOwn(payload, "animUntil"), "raw performance.now deadlines must not cross renderer windows");
  assert.strictEqual(payload.streamSessionId, 8);
  assert.strictEqual(payload.playbackGeneration, 3);
  assert.strictEqual(payload.speechStyle, "playful", "active speech must publish the actual speech cadence style");
  assert.ok(typeof scheduled === "function", "active speech should retain a frame-synchronous heartbeat");
  controller.stopChatSpeechBroadcastLoop();
}

function testReceiverTranslatesExpiryAcrossDifferentPerformanceOrigins() {
  const harness = makeModelHarness();
  harness.send(makeSpeechPacket());

  assert.strictEqual(harness.state.speechAnimUntil, 91_000, "receiver must translate a wall-clock deadline into its own performance clock");
  assert.strictEqual(harness.state.speechAnimStartedAt, 89_600, "receiver must reconstruct a local animation start time");
  assert.strictEqual(harness.state.moodHoldUntil, 90_700, "mood hold must use the model renderer's local clock");
  assert.strictEqual(harness.state.speechAnimStyle, "playful", "receiver should mirror valid speech cadence style");
  assert.strictEqual(harness.state.currentTalkStyle, "playful", "receiver should mirror valid body/expression style");
  assert.strictEqual(harness.motion.isSpeechMotionActive(), true);
  assert.strictEqual(harness.motion.shouldSkipIdleMotion(), true, "remote speech should defer idle motion only while it is current");
  assert.strictEqual(harness.appliedCues.length, 1, "first accepted cue should apply once");

  harness.setPerf(90_100);
  harness.setWall(1_700_000_000_100);
  harness.send(makeSpeechPacket({
    speechRevision: 2,
    speechSentAtWallMs: 1_700_000_000_100,
    speechExpiresAtEpochMs: 1_700_000_001_000
  }));
  assert.strictEqual(harness.appliedCues.length, 1, "heartbeat revisions must not repeatedly reapply the same cue");
}

function testStyleBridgeRejectsInvalidAndStaleUpdatesWithoutStartingSpeech() {
  const harness = makeModelHarness();
  harness.send(makeSpeechPacket({ speechStyle: "comfort" }));
  assert.strictEqual(harness.state.speechAnimStyle, "comfort");
  assert.strictEqual(harness.state.currentTalkStyle, "comfort");

  harness.send(makeSpeechPacket({
    speechRevision: 2,
    speechSentAtWallMs: 1_700_000_000_010,
    speechStyle: "not-a-style"
  }));
  assert.strictEqual(harness.state.speechAnimStyle, "comfort", "invalid style must not clear a valid active style");
  assert.strictEqual(harness.state.currentTalkStyle, "comfort");

  harness.send(makeSpeechPacket({
    speechRevision: 1,
    speechSentAtWallMs: 1_700_000_000_005,
    speechStyle: "playful"
  }));
  assert.strictEqual(harness.state.currentTalkStyle, "comfort", "older revision must not overwrite newer style state");

  harness.send(makeSpeechPacket({
    speechRevision: 3,
    speechSentAtWallMs: 1_700_000_000_020,
    speechStyle: "steady",
    speaking: false,
    assistantAudioActive: false,
    mouthOpen: 0,
    audioLevel: 0,
    speechExpiresAtEpochMs: 0,
    moodHoldExpiresAtEpochMs: 0,
    performanceCueExpiresAtEpochMs: 0,
    performanceCue: null
  }));
  assert.strictEqual(harness.state.currentTalkStyle, "steady", "a valid idle packet may update style without reviving speech");
  assert.strictEqual(harness.state.speechAnimUntil, 0);
  assert.strictEqual(harness.motion.isSpeechMotionActive(), false, "style alone must not start mouth or speech motion");

  harness.send(makeSpeechPacket({
    speechRevision: 4,
    speechSentAtWallMs: 1_700_000_000_030,
    speechStyle: "playful",
    speaking: true,
    speechExpiresAtEpochMs: 1_699_999_999_999
  }));
  assert.strictEqual(harness.state.currentTalkStyle, "steady", "expired packets must not revive an old style");
}

function testOutOfOrderAndExpiredPacketsCannotReviveSpeech() {
  const harness = makeModelHarness();
  harness.send(makeSpeechPacket({ speechRevision: 4 }));
  harness.send(makeSpeechPacket({
    speechRevision: 5,
    speechSentAtWallMs: 1_700_000_000_010,
    speaking: false,
    assistantAudioActive: false,
    mouthOpen: 0,
    audioLevel: 0,
    speechExpiresAtEpochMs: 0,
    moodHoldExpiresAtEpochMs: 0,
    performanceCueExpiresAtEpochMs: 0,
    performanceCue: null
  }));
  assert.strictEqual(harness.motion.isSpeechMotionActive(), false);
  assert.strictEqual(harness.state.speechMouthOpen, 0);

  harness.send(makeSpeechPacket({ speechRevision: 4, mouthOpen: 0.8 }));
  assert.strictEqual(harness.state._broadcastSpeechRevision, 5, "older revisions must be ignored");
  assert.strictEqual(harness.state._broadcastSpeaking, false, "an old speaking packet cannot revive a finished turn");
  assert.strictEqual(harness.state.speechMouthOpen, 0);

  harness.send(makeSpeechPacket({
    speechRevision: 6,
    speechSentAtWallMs: 1_700_000_000_020,
    speechExpiresAtEpochMs: 1_699_999_999_999,
    speaking: true,
    mouthOpen: 0.9
  }));
  assert.strictEqual(harness.state._broadcastSpeechRevision, 5, "an already-expired delayed packet must be ignored");
  assert.strictEqual(harness.state._broadcastSpeaking, false);
}

function testStaleProjectionClearsWithoutTouchingLocalFullViewAudio() {
  const harness = makeModelHarness();
  harness.send(makeSpeechPacket({
    speechExpiresAtEpochMs: 1_700_000_000_250,
    performanceCueExpiresAtEpochMs: 1_700_000_000_250
  }));
  harness.setPerf(91_200);
  harness.setWall(1_700_000_001_200);
  assert.strictEqual(harness.motion.isSpeechMotionActive(), false, "a dead sender must not leave the model speaking indefinitely");
  assert.strictEqual(harness.state._broadcastSpeaking, false);
  assert.strictEqual(harness.state._broadcastAssistantAudioActive, false);
  assert.strictEqual(harness.state.speechMouthOpen, 0);
  assert.strictEqual(harness.motion.shouldSkipIdleMotion(), false, "stale mirrored speech must release idle motion");

  const fullState = {
    uiView: "full",
    ttsContextSpeaking: true,
    speechAnimUntil: 0,
    _broadcastSpeechUpdatedAt: 1,
    _broadcastSpeaking: true
  };
  const fullController = motionRuntimeController.createController({
    state: fullState,
    windowObject: { speechSynthesis: { speaking: false } },
    performanceObject: { now: () => 50_000 }
  });
  assert.strictEqual(fullController.isSpeechMotionActive(), true, "single-window local audio must remain authoritative");
  assert.strictEqual(fullState.ttsContextSpeaking, true, "model-only stale cleanup must not touch local full-view audio");
}

function main() {
  testSenderUsesPortableExpiryContract();
  testReceiverTranslatesExpiryAcrossDifferentPerformanceOrigins();
  testStyleBridgeRejectsInvalidAndStaleUpdatesWithoutStartingSpeech();
  testOutOfOrderAndExpiredPacketsCannotReviveSpeech();
  testStaleProjectionClearsWithoutTouchingLocalFullViewAudio();
  console.log("Split-window speech timebase checks passed.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
