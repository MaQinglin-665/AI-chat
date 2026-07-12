#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const startupController = require(path.join(ROOT, "web", "appStartupController.js"));

function makePhasePacket(overrides = {}) {
  return {
    type: "speech",
    speechBridgeVersion: 2,
    speechSenderId: "chat-renderer-phase-a",
    speechRevision: 1,
    speechSentAtWallMs: 50_000,
    speaking: false,
    assistantAudioActive: false,
    mouthOpen: 0,
    mood: "idle",
    audioLevel: 0,
    speechExpiresAtEpochMs: 0,
    moodHoldExpiresAtEpochMs: 0,
    performanceCueExpiresAtEpochMs: 0,
    performanceCue: null,
    performancePhaseSenderId: "chat-renderer-phase-a",
    performancePhaseRevision: 1,
    performancePhaseSentAtWallMs: 50_000,
    performancePhaseExpiresAtEpochMs: 50_900,
    performancePhase: {
      version: 1,
      phase: "pre_reaction",
      turnId: 12,
      actionIntent: "thinking",
      actionStyle: "steady",
      actionMood: "thinking",
      pulseStyle: "steady",
      pulseBoost: 0.36,
      pulseDurationMs: 240,
      motionCue: "thinking_nod",
      motionRole: "pre_reaction",
      motionTags: ["thinking", "head"],
      combo: false,
      beats: 1,
      emphasis: 0.2,
      priority: 2,
      cooldownMs: 300
    },
    ...overrides
  };
}

function makeModelHarness() {
  let perfNow = 10_000;
  let wallNow = 50_000;
  const channels = [];
  const actions = [];
  const pulses = [];
  class FakeBroadcastChannel {
    constructor() { channels.push(this); }
    close() {}
  }
  const state = {
    uiView: "model",
    model: {},
    motionEnabled: true,
    speechAnimUntil: 0,
    speechAnimStartedAt: 0,
    speechAnimDurationMs: 0,
    speechMouthOpen: 0,
    ttsAudioLevel: 0
  };
  const controller = startupController.createController({
    state,
    windowObject: { BroadcastChannel: FakeBroadcastChannel },
    performanceObject: { now: () => perfNow },
    wallNow: () => wallNow,
    enqueueActionIntent: (intent, context) => actions.push({ intent, context }),
    triggerExpressionPulse: (style, boost, durationMs) => pulses.push({ style, boost, durationMs })
  });
  controller.startModelSpeechBroadcastListener();
  return {
    state,
    actions,
    pulses,
    send(data) { channels[0].onmessage({ data }); },
    setPerf(value) { perfNow = value; },
    setWall(value) { wallNow = value; }
  };
}

function testReceiverRunsOnePreReactionWithoutSpeechState() {
  const harness = makeModelHarness();
  harness.send(makePhasePacket());

  assert.strictEqual(harness.actions.length, 1, "a detached model should receive one eligible pre-reaction action before speech starts");
  assert.strictEqual(harness.actions[0].intent, "thinking");
  assert.strictEqual(harness.actions[0].context.motionRole, "pre_reaction");
  assert.strictEqual(harness.pulses.length, 1, "the detached model should receive the compact expression pulse");
  assert.deepStrictEqual(harness.pulses[0], { style: "steady", boost: 0.36, durationMs: 240 });
  assert.strictEqual(harness.state.speechAnimUntil, 0, "a non-speech performance phase must not start speech animation");
  assert.strictEqual(harness.state.speechMouthOpen, 0, "a non-speech performance phase must not open the mouth");

  harness.send(makePhasePacket({
    speechRevision: 2,
    speechSentAtWallMs: 50_120,
    performancePhaseSentAtWallMs: 50_120,
    performancePhaseHeartbeat: 1
  }));
  assert.strictEqual(harness.actions.length, 1, "phase heartbeats must not replay the same detached motion");
  assert.strictEqual(harness.pulses.length, 1, "phase heartbeats must not replay the same detached pulse");

  harness.send(makePhasePacket({
    speechRevision: 3,
    speechSentAtWallMs: 50_240,
    performancePhaseRevision: 2,
    performancePhaseSentAtWallMs: 50_240,
    performancePhase: {
      phase: "thinking_wait",
      turnId: 12,
      actionIntent: "thinking",
      actionStyle: "steady",
      actionMood: "thinking",
      pulseBoost: 0,
      pulseDurationMs: 0,
      motionCue: "thinking_nod",
      motionRole: "thinking_wait",
      motionTags: ["thinking"],
      combo: false,
      beats: 1,
      emphasis: 0.2,
      priority: 2,
      cooldownMs: 1200
    }
  }));
  assert.strictEqual(harness.actions.length, 2, "a bounded thinking-wait phase should remain visible while the reply is still pending");
  assert.strictEqual(harness.actions[1].context.motionRole, "thinking_wait");
  assert.strictEqual(harness.state.speechAnimUntil, 0, "thinking-wait must remain a non-speech phase");
}

function testClearAndExpiredPhasesCannotReviveOldReaction() {
  const harness = makeModelHarness();
  harness.send(makePhasePacket());
  harness.send(makePhasePacket({
    speechRevision: 2,
    speechSentAtWallMs: 50_120,
    performancePhaseRevision: 2,
    performancePhaseSentAtWallMs: 50_120,
    performancePhaseExpiresAtEpochMs: 0,
    performancePhase: null
  }));
  assert.strictEqual(harness.state._broadcastPerformancePhase, null, "a newer phase-clear packet should release the mirrored phase state");

  harness.send(makePhasePacket({
    speechRevision: 3,
    speechSentAtWallMs: 50_240,
    performancePhaseRevision: 1,
    performancePhaseSentAtWallMs: 50_000
  }));
  assert.strictEqual(harness.actions.length, 1, "an older phase revision must not revive a cleared reaction");

  harness.send(makePhasePacket({
    speechRevision: 4,
    speechSentAtWallMs: 50_300,
    performancePhaseRevision: 3,
    performancePhaseSentAtWallMs: 50_300,
    performancePhaseExpiresAtEpochMs: 49_999
  }));
  assert.strictEqual(harness.actions.length, 1, "an expired phase must never dispatch after a delayed delivery");

  harness.send(makePhasePacket({
    speechRevision: 5,
    speechSentAtWallMs: 50_420,
    performancePhaseRevision: 2,
    performancePhaseSentAtWallMs: 50_120
  }));
  assert.strictEqual(harness.actions.length, 1, "an expired newer revision should fence off all older performance phases");
}

function testChatSenderIsCompactAndFullViewStaysLocal() {
  const posted = [];
  let pendingTimer = null;
  class FakeBroadcastChannel {
    postMessage(payload) { posted.push(payload); }
    close() {}
  }
  const chat = startupController.createController({
    state: { uiView: "chat", speechAnimUntil: 0, speechAnimMood: "idle" },
    windowObject: { BroadcastChannel: FakeBroadcastChannel, setTimeout: () => 1, clearTimeout: () => {} },
    performanceObject: { now: () => 1000 },
    wallNow: () => 50_000,
    setTimeout(fn) { pendingTimer = fn; return 2; },
    clearTimeout: () => {},
    isSpeechMotionActive: () => false,
    getSpeechAnimationMouthOpen: () => 0
  });
  chat.startChatSpeechBroadcastLoop();
  assert.ok(typeof pendingTimer === "function", "idle chat bridge should keep a low-frequency loop ready for future phases");

  assert.strictEqual(chat.publishPerformancePhase({
    turnId: 44,
    phase: "pre_reaction",
    text: "private user transcript must not cross the bridge",
    phasePlan: {
      actionIntent: "listen",
      actionStyle: "neutral",
      actionMood: "idle",
      pulseStyle: "neutral",
      pulseBoost: 0.24,
      pulseDurationMs: 180,
      motionCue: "side_eye",
      motionRole: "pre_reaction"
    }
  }), true);
  const phasePayload = posted.at(-1);
  assert.strictEqual(phasePayload.performancePhase.phase, "pre_reaction");
  assert.strictEqual(phasePayload.performancePhase.actionIntent, "listen");
  assert.ok(phasePayload.performancePhaseExpiresAtEpochMs > 50_000, "the bridge must send a wall-clock phase expiry");
  assert.ok(!JSON.stringify(phasePayload).includes("private user transcript"), "the compact phase bridge must never carry user text");
  assert.ok(!Object.hasOwn(phasePayload.performancePhase, "text"), "the compact phase payload must not expose a text field");

  const full = startupController.createController({ state: { uiView: "full" } });
  assert.strictEqual(full.publishPerformancePhase({ phase: "pre_reaction", actionIntent: "listen", pulseBoost: 0.2, pulseDurationMs: 180 }), false, "full view must keep its reaction local instead of opening a duplicate bridge phase");
  chat.stopChatSpeechBroadcastLoop();
}

function main() {
  testReceiverRunsOnePreReactionWithoutSpeechState();
  testClearAndExpiredPhasesCannotReviveOldReaction();
  testChatSenderIsCompactAndFullViewStaysLocal();
  console.log("[OK] Split-window performance phase bridge frontend checks passed.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
