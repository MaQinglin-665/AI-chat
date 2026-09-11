#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const bridgeApi = require(path.join(__dirname, "..", "web", "behaviorPerformanceBridge.js"));

let now = 100;
const calls = { modes: [], actions: [], pulses: [], broadcasts: [] };
let speaking = false;
let listening = false;
const state = {};
const bridge = bridgeApi.createController({
  state,
  performanceObject: { now: () => now },
  requestPerformanceMode: (mode, options) => calls.modes.push({ mode, options }),
  triggerSemanticAction: (gesture, options) => calls.actions.push({ gesture, options }),
  triggerExpressionPulse: (...args) => calls.pulses.push(args),
  publishPerformancePhase: (input) => calls.broadcasts.push(input),
  isSpeakingNow: () => speaking,
  isSpeechMotionActive: () => speaking,
  isUserListening: () => listening
});

const micro = {
  reason: "unanswered_voice_presence", trigger_sequence: 8,
  performance_intent: { phase: "listening", emotion: "thinking", gesture: "nod", intensity: "low", hold_ms: 900 }
};
assert.strictEqual(bridge.apply(micro), true, "a valid micro reaction should apply once");
assert.strictEqual(calls.actions.length, 1);
assert.strictEqual(calls.actions[0].gesture, "nod");
assert.strictEqual(calls.broadcasts.length, 1, "the chat window should publish one safe split-window phase");
assert.strictEqual(bridge.apply(micro), false, "the same sequence must not replay");
assert.strictEqual(bridge.apply({ ...micro, trigger_sequence: 7 }), false, "older sequences must be ignored");

speaking = true;
now += 10;
assert.strictEqual(bridge.apply({ ...micro, trigger_sequence: 9 }), false, "actual TTS/reply performance owns the stage");
assert.strictEqual(calls.actions.length, 1);
speaking = false;
listening = true;
assert.strictEqual(bridge.apply({
  reason: "grounded_life_material", trigger_sequence: 10,
  performance_intent: { phase: "preparing", emotion: "thinking", gesture: "think", intensity: "low", hold_ms: 1200 }
}), false, "preparing must not displace real user listening");
listening = false;
assert.strictEqual(bridge.apply({
  trigger_sequence: 11,
  performance_intent: { phase: "settling", emotion: "neutral", gesture: "none", intensity: "low", hold_ms: 5000 }
}), true, "settling should only request an idle handoff");
assert.strictEqual(calls.actions.length, 1, "settling must not trigger a large action");
assert.strictEqual(bridge.apply({ trigger_sequence: 12, performance_intent: { phase: "oops", emotion: "thinking", gesture: "nod", intensity: "low", hold_ms: 900 } }), false);
assert.strictEqual(bridgeApi.normalizeIntent({ phase: "listening", emotion: "thinking", gesture: "nod", intensity: "low", hold_ms: 100 }).hold_ms, 200);
assert.strictEqual(bridgeApi.normalizeIntent({ phase: "listening", emotion: "thinking", gesture: "ParamMouthOpenY", intensity: "low", hold_ms: 900 }), null);
assert.ok(!require("fs").readFileSync(path.join(__dirname, "..", "web", "behaviorPerformanceBridge.js"), "utf8").includes("coreModel"), "bridge must only call existing public controllers");
console.log("Behavior performance bridge checks passed.");
