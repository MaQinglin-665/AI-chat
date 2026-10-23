"use strict";
const assert = require("assert");
const directorApi = require("../web/hiyoriPerformanceDirector.js");
const expressionApi = require("../web/live2dExpressionController.js");

function harness() {
  let now = 0;
  const state = {};
  const controller = directorApi.createController({ state, random: () => 0.3, performanceObject: { now: () => now } });
  controller.sample({ now });
  return { state, controller, tick(context = {}, dt = 1000 / 60) {
    now += dt;
    return controller.sample({ now, allowIdle: false, ...context });
  } };
}
function settle(h, context, frames = 120) {
  let sample;
  for (let i = 0; i < frames; i++) sample = h.tick(context);
  return sample;
}
const speaking = { speaking: true, audioActive: true, audioLevel: 0.45, bodyEnergy: 0.65 };

// Same speech signal must preserve distinctions formerly collapsed into happy.
const poses = {};
for (const emotion of ["happy", "playful", "excited", "shy", "sad", "hurt", "anxious", "angry", "surprised", "serious", "thinking"]) {
  const sample = settle(harness(), { ...speaking, emotion });
  assert.strictEqual(sample.delivery, emotion);
  poses[emotion] = sample.parameters;
  for (const [id, value] of Object.entries(sample.parameters)) {
    assert.ok(Number.isFinite(value), `${emotion}/${id} must be finite`);
    assert.ok(Math.abs(value) < 12, `${emotion}/${id} should be a bounded additive offset`);
  }
  assert.ok(!("ParamMouthOpenY" in sample.parameters), "speech delivery must not override lip sync");
}
assert.ok(poses.playful.ParamAngleZ < poses.happy.ParamAngleZ - 3);
assert.ok(poses.excited.ParamBodyAngleY > poses.shy.ParamBodyAngleY + 2);
assert.ok(poses.thinking.ParamAngleZ < poses.serious.ParamAngleZ - 3);
assert.strictEqual(directorApi.normalizeDelivery("untrusted_pose"), "neutral");

// One sustained level is not a metronome. Separated rises earn new accents.
const steady = harness();
const steadyEnd = settle(steady, { ...speaking, audioLevel: 0.8 }, 300);
assert.strictEqual(steadyEnd.speechAccentCount, 1);
const pulses = harness();
let lastCount = 0, lastBeatFrame = -1000, accents = 0;
for (let frame = 0; frame < 360; frame++) {
  const sample = pulses.tick({ ...speaking, audioLevel: frame % 60 < 20 ? 0.8 : 0 });
  if (sample.speechAccentCount > lastCount) {
    assert.ok(frame - lastBeatFrame >= 40, "accent cooldown prevents rapid twitching");
    lastBeatFrame = frame; accents++;
  }
  lastCount = sample.speechAccentCount;
}
assert.ok(accents >= 5 && accents <= 6, "accents should follow separate audio phrases");
settle(pulses, { ...speaking, audioLevel: 0, bodyEnergy: 1 }, 150);
assert.ok(pulses.state.hiyoriDirector.speechDrive < 0.12, "silence settles motion despite synthetic body energy");

// A cue while waiting for TTS cannot fabricate an audible emphasis.
const waiting = harness();
const waitSample = settle(waiting, { ...speaking, audioActive: false, emotion: "excited" });
assert.strictEqual(waitSample.speechAccentCount, 0);
assert.strictEqual(waiting.state.hiyoriDirector.speechDrive, 0);
assert.ok(Object.values(waiting.state.hiyoriDirector.deliveryWeights).every(v => v === 0));

// Interruption/generation changes discard detector history; outputs ease out.
pulses.controller.stopSpeech();
assert.strictEqual(pulses.state.hiyoriDirector.speechRhythm.count, 0);
const stopped = settle(pulses, { speaking: false, audioActive: false, emotion: "neutral" }, 240);
assert.strictEqual(stopped.speechAccent, 0);
assert.ok(Object.values(stopped.parameters).every(v => Math.abs(v) < 0.01));
const generation = harness();
settle(generation, { ...speaking, playbackGeneration: 1 });
const newTurn = generation.tick({ ...speaking, audioLevel: 0, playbackGeneration: 2 });
assert.strictEqual(newTurn.speechAccentCount, 0);
assert.strictEqual(newTurn.speechAccent, 0);

// Existing low/high intensity controls scale only the added delivery here.
const low = settle(harness(), { ...speaking, emotion: "playful", motionIntensity: "low" });
const high = settle(harness(), { ...speaking, emotion: "playful", motionIntensity: "high" });
assert.ok(high.parameters.ParamAngleZ < low.parameters.ParamAngleZ - 2);

// Use the production adapter: authored motion ownership still reduces overlays,
// non-Hiyori rigs are untouched, and cancellation reaches the director.
function adapter(profile, authored) {
  let now = 1000;
  const values = {};
  const state = { modelProfileName: profile, ttsPlaybackGeneration: 2,
    hiyoriAuthoredMotionUntil: authored ? 10000 : 0,
    hiyoriAuthoredMotion: { playbackGeneration: 2 } };
  const controller = expressionApi.createController({ state, hiyoriPerformanceDirector: directorApi, performanceObject: { now: () => now } });
  const core = { addParameterValueById(id, value, weight) { values[id] = value * weight; } };
  for (let i = 0; i < 120; i++) {
    now += 16;
    controller.applyHiyoriPerformanceLayer(core, { ...speaking, now, emotion: "excited" });
  }
  return { values, state, controller };
}
const normal = adapter("hiyori_pro_t11", false);
const authored = adapter("hiyori_pro_t11", true);
assert.ok(Math.abs(authored.values.ParamBodyAngleY) < Math.abs(normal.values.ParamBodyAngleY) * 0.25);
assert.deepStrictEqual(adapter("other-model", false).values, {});
normal.controller.endSpeechAnimation();
assert.strictEqual(normal.state.hiyoriDirector.speechRhythm.count, 0);
console.log("Expressive Live2D semantic delivery, audio accents, ownership and cancellation passed.");
