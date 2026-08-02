#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRECTOR_PATH = path.join(ROOT, "web", "hiyoriPerformanceDirector.js");
const EXPRESSION_PATH = path.join(ROOT, "web", "live2dExpressionController.js");
const CHAT_PATH = path.join(ROOT, "web", "chat.js");
const INDEX_PATH = path.join(ROOT, "web", "index.html");
const directorApi = require(DIRECTOR_PATH);

assert.deepStrictEqual(directorApi.MODES, ["idle", "listen", "think", "speak"]);
assert.deepStrictEqual(directorApi.EMOTIONS, ["happy", "sad", "angry", "surprised", "thinking"]);
const DAILY_ACTIONS = [
  "nod",
  "nod_double",
  "shake",
  "attentive_tilt",
  "thoughtful_glance",
  "thought_resolve",
  "lean_forward",
  "lean_back",
  "care_lean",
  "shy_glance",
  "speak_emphasis",
  "sentence_release",
  "happy_bounce"
];
for (const action of DAILY_ACTIONS) {
  assert.ok(directorApi.ACTION_SPECS[action], `missing semantic action: ${action}`);
  assert.ok(directorApi.ACTION_SPECS[action].durationMs >= 1600, `${action} should keep native-motion pacing`);
  assert.ok(directorApi.ACTION_SPECS[action].attackMs >= 300, `${action} should ease in instead of snapping`);
  assert.ok(directorApi.ACTION_SPECS[action].releaseMs >= 480, `${action} should release like a Cubism motion`);
}
assert.strictEqual(directorApi.normalizeAction("tiny_nod"), "nod");
assert.strictEqual(directorApi.normalizeAction("head-shake"), "shake");
assert.strictEqual(directorApi.normalizeAction("shake_head"), "shake");
assert.strictEqual(directorApi.normalizeAction("think"), "thoughtful_glance");
assert.strictEqual(directorApi.normalizeAction("head_tilt"), "attentive_tilt");
assert.strictEqual(directorApi.normalizeAction("thinking_nod"), "thought_resolve");
assert.strictEqual(directorApi.normalizeAction("expressive_speech_start"), "speak_emphasis");
assert.strictEqual(directorApi.normalizeAction("settle_idle"), "sentence_release");
assert.strictEqual(directorApi.normalizeAction("embarrassed_recovery"), "shy_glance");
assert.strictEqual(directorApi.normalizeAction("happy_idle"), "happy_bounce");
assert.strictEqual(directorApi.normalizeAction("wave"), "", "unsupported arm gestures should remain on Cubism's built-in motion channel");

function createHarness(randomValues = [0.13, 0.72, 0.34, 0.91, 0.22, 0.58]) {
  const state = {};
  let now = 1000;
  let randomIndex = 0;
  const controller = directorApi.createController({
    state,
    performanceObject: { now: () => now },
    random: () => randomValues[(randomIndex++) % randomValues.length]
  });
  return {
    state,
    controller,
    get now() { return now; },
    set now(value) { now = value; },
    advance(ms) { now += ms; return now; }
  };
}

function advanceWithSamples(harness, durationMs, context = {}) {
  let remaining = Math.max(0, Number(durationMs) || 0);
  let sample = harness.controller.sample({ now: harness.now, ...context });
  while (remaining > 0) {
    const step = Math.min(16, remaining);
    harness.advance(step);
    remaining -= step;
    sample = harness.controller.sample({ now: harness.now, ...context });
  }
  return sample;
}

{
  for (const action of DAILY_ACTIONS) {
    const spec = directorApi.ACTION_SPECS[action];
    const frames = [];
    for (let at = 0; at <= spec.durationMs; at += 1000 / 60) {
      frames.push(directorApi.sampleAction(action, at / spec.durationMs, directorApi.actionEnvelope(spec, at)));
    }
    for (const channel of ["ParamAngleX", "ParamAngleY", "ParamAngleZ", "ParamBodyAngleX", "ParamBodyAngleY", "ParamBodyAngleZ"]) {
      const values = frames.map((frame) => Number(frame[channel] || 0));
      for (let index = 1; index < values.length; index += 1) {
        assert.ok(
          Math.abs(values[index] - values[index - 1]) < 1.45,
          `${action} ${channel} should remain frame-continuous at 60fps`
        );
      }
      for (let index = 2; index < values.length; index += 1) {
        const acceleration = Math.abs(values[index] - 2 * values[index - 1] + values[index - 2]);
        assert.ok(acceleration < 0.24, `${action} ${channel} should not contain a visible velocity corner`);
      }
      assert.ok(Math.abs(values[0]) < 0.0001, `${action} ${channel} should start at rest`);
      assert.ok(Math.abs(values[values.length - 1]) < 0.03, `${action} ${channel} should return to rest`);
    }
  }
}

{
  const forwardLead = directorApi.sampleAction("lean_forward", 0.12, 1);
  assert.ok(
    forwardLead.ParamBodyAngleY > Math.abs(forwardLead.ParamAngleY) * 6,
    "forward lean should begin in the torso before the head follows"
  );
  const nodLead = directorApi.sampleAction("nod", 0.22, 1);
  assert.ok(
    Math.abs(nodLead.ParamAngleY) > Math.abs(nodLead.ParamBodyAngleY) * 6,
    "nod should communicate through the head before the torso follows"
  );
  const shakeLead = directorApi.sampleAction("shake", 0.22, 1);
  assert.ok(
    Math.abs(shakeLead.ParamAngleX) > Math.abs(shakeLead.ParamBodyAngleX) * 12,
    "head shake should not rotate the head and torso in mechanical lockstep"
  );
  const bounceLead = directorApi.sampleAction("happy_bounce", 0.22, 1);
  assert.ok(
    bounceLead.ParamBodyAngleY > Math.abs(bounceLead.ParamAngleY) * 4,
    "happy bounce should let the torso lift before the head catches up"
  );
}

{
  const h = createHarness();
  h.controller.sample({ now: h.now });
  h.controller.requestMode("listen", { now: h.now, holdMs: 1600 });
  h.advance(16);
  const listen = h.controller.sample({ now: h.now, listeningBlend: 0.8 });
  assert.strictEqual(listen.mode, "listen");
  assert.ok(listen.parameters.ParamEyeLOpen > 0, "listen should open the eyes attentively");
  assert.ok(listen.parameters.ParamShoulder > 0, "listen should shift the shoulders");
  assert.ok(h.state.hiyoriDirector.modeWeights.listen > 0 && h.state.hiyoriDirector.modeWeights.listen < 1, "listen should fade in instead of snapping");

  h.advance(80);
  const think = h.controller.sample({ now: h.now, thinking: true, emotion: "thinking" });
  assert.strictEqual(think.mode, "think");
  assert.ok(think.parameters.ParamAngleZ < 0, "think should use a readable head tilt");
  assert.ok(think.parameters.ParamArmLA > 0, "think should involve the left arm pose");

  const quietHarness = createHarness();
  const strongHarness = createHarness();
  quietHarness.controller.sample({ now: quietHarness.now });
  strongHarness.controller.sample({ now: strongHarness.now });
  quietHarness.advance(240);
  strongHarness.advance(240);
  const speakQuiet = quietHarness.controller.sample({ now: quietHarness.now, speaking: true, audioLevel: 0.05, bodyEnergy: 0.08 });
  const speakStrong = strongHarness.controller.sample({ now: strongHarness.now, speaking: true, audioLevel: 0.9, bodyEnergy: 1.0 });
  assert.strictEqual(speakStrong.mode, "speak");
  assert.ok(Math.abs(speakStrong.parameters.ParamAngleZ) > Math.abs(speakQuiet.parameters.ParamAngleZ), "speech head linkage should grow with audible energy");
  assert.ok(speakStrong.parameters.ParamShoulder > speakQuiet.parameters.ParamShoulder, "speech shoulder linkage should grow with audible energy");
  assert.ok(speakStrong.parameters.ParamBodyAngleY > speakQuiet.parameters.ParamBodyAngleY, "speech body linkage should grow with audible energy");

  const rampHarness = createHarness();
  rampHarness.controller.sample({ now: rampHarness.now });
  rampHarness.advance(16);
  rampHarness.controller.sample({ now: rampHarness.now, speaking: true, audioLevel: 1, bodyEnergy: 1.1 });
  const firstDrive = rampHarness.state.hiyoriDirector.speechDrive;
  for (let i = 0; i < 10; i += 1) {
    rampHarness.advance(16);
    rampHarness.controller.sample({ now: rampHarness.now, speaking: true, audioLevel: 1, bodyEnergy: 1.1 });
  }
  const settledDrive = rampHarness.state.hiyoriDirector.speechDrive;
  assert.ok(firstDrive > 0 && firstDrive < settledDrive, "speech energy should ramp into the body instead of snapping to full amplitude");
  rampHarness.advance(16);
  rampHarness.controller.sample({ now: rampHarness.now, speaking: false });
  assert.ok(
    rampHarness.state.hiyoriDirector.speechDrive > 0 && rampHarness.state.hiyoriDirector.speechDrive < settledDrive,
    "speech energy should release progressively after playback ends"
  );

  const duplicateHarness = createHarness();
  duplicateHarness.controller.sample({ now: duplicateHarness.now });
  duplicateHarness.controller.requestMode("speak", { now: duplicateHarness.now, holdMs: 1200 });
  duplicateHarness.advance(16);
  const firstDuplicateSample = duplicateHarness.controller.sample({
    now: duplicateHarness.now,
    speaking: true,
    audioLevel: 0.76,
    bodyEnergy: 0.84
  });
  const duplicateWeights = { ...duplicateHarness.state.hiyoriDirector.modeWeights };
  const duplicateDrive = duplicateHarness.state.hiyoriDirector.speechDrive;
  const secondDuplicateSample = duplicateHarness.controller.sample({
    now: duplicateHarness.now,
    speaking: true,
    audioLevel: 0.76,
    bodyEnergy: 0.84
  });
  assert.deepStrictEqual(
    duplicateHarness.state.hiyoriDirector.modeWeights,
    duplicateWeights,
    "a duplicate sample at the same timestamp must not advance mode blending"
  );
  assert.strictEqual(
    duplicateHarness.state.hiyoriDirector.speechDrive,
    duplicateDrive,
    "a duplicate sample at the same timestamp must not accelerate speech drive"
  );
  assert.deepStrictEqual(
    secondDuplicateSample.parameters,
    firstDuplicateSample.parameters,
    "a duplicate sample at the same timestamp must not advance transition channel inertia"
  );

  function sampleOneSecond(stepMs) {
    const harness = createHarness();
    harness.controller.sample({ now: harness.now });
    const frames = Math.round(1000 / stepMs);
    for (let index = 0; index < frames; index += 1) {
      harness.advance(stepMs);
      harness.controller.sample({
        now: harness.now,
        speaking: true,
        audioLevel: 0.68,
        bodyEnergy: 0.78
      });
    }
    return harness.state.hiyoriDirector;
  }
  const sixtyHz = sampleOneSecond(1000 / 60);
  const oneTwentyHz = sampleOneSecond(1000 / 120);
  assert.ok(
    Math.abs(sixtyHz.modeWeights.speak - oneTwentyHz.modeWeights.speak) < 0.002,
    "mode blending should follow elapsed time instead of refresh rate"
  );
  assert.ok(
    Math.abs(sixtyHz.speechDrive - oneTwentyHz.speechDrive) < 0.002,
    "speech energy smoothing should remain refresh-rate independent"
  );
  for (const channel of ["ParamAngleY", "ParamAngleZ", "ParamBodyAngleY", "ParamBodyAngleZ", "ParamShoulder"]) {
    assert.ok(
      Math.abs(Number(sixtyHz.channelStates[channel]?.value || 0) - Number(oneTwentyHz.channelStates[channel]?.value || 0)) < 0.035,
      `${channel} transition inertia should converge at 60 Hz and 120 Hz`
    );
  }

  const continuous = createHarness();
  continuous.controller.sample({ now: continuous.now });
  const speechFrames = [];
  for (let i = 0; i < 36; i += 1) {
    continuous.advance(16);
    speechFrames.push(continuous.controller.sample({
      now: continuous.now,
      speaking: true,
      audioLevel: 0.72,
      bodyEnergy: 0.82
    }).parameters);
  }
  const headFrames = speechFrames.map((frame) => Number(frame.ParamAngleZ || 0).toFixed(4));
  const bodyFrames = speechFrames.map((frame) => Number(frame.ParamBodyAngleZ || 0).toFixed(4));
  assert.ok(new Set(headFrames).size >= 24, "speech head linkage should evolve continuously across frames");
  assert.ok(new Set(bodyFrames).size >= 24, "speech body linkage should evolve continuously across frames");
  for (let i = 1; i < speechFrames.length; i += 1) {
    assert.ok(Math.abs(speechFrames[i].ParamAngleZ - speechFrames[i - 1].ParamAngleZ) < 0.45, "speech head linkage should stay frame-continuous");
    assert.ok(Math.abs(speechFrames[i].ParamBodyAngleZ - speechFrames[i - 1].ParamBodyAngleZ) < 0.45, "speech body linkage should stay frame-continuous");
  }
}

{
  const h = createHarness();
  h.controller.sample({ now: h.now });
  const contexts = [
    { listeningBlend: 0.9 },
    { thinking: true, emotion: "thinking" },
    { speaking: true, audioLevel: 0.72, bodyEnergy: 0.82 },
    {}
  ];
  const frames = [];
  for (const context of contexts) {
    for (let index = 0; index < 30; index += 1) {
      h.advance(16);
      frames.push(h.controller.sample({ now: h.now, ...context }).parameters);
    }
  }
  for (const channel of ["ParamAngleY", "ParamAngleZ", "ParamBodyAngleY", "ParamBodyAngleZ", "ParamShoulder"]) {
    for (let index = 1; index < frames.length; index += 1) {
      const delta = Math.abs(Number(frames[index][channel] || 0) - Number(frames[index - 1][channel] || 0));
      const limit = channel === "ParamShoulder" ? 0.045 : 0.48;
      assert.ok(delta < limit, `${channel} should remain continuous through listen/think/speak/idle hand-offs`);
    }
  }
  assert.ok(
    Object.keys(h.state.hiyoriDirector.channelStates).length > 0,
    "transition mixer should retain bounded channel inertia while a pose releases"
  );
}

{
  const h = createHarness();
  h.controller.sample({ now: h.now });
  const speaking = advanceWithSamples(h, 520, { speaking: true, audioLevel: 0.78, bodyEnergy: 0.88 });
  h.advance(16);
  const firstIdle = h.controller.sample({ now: h.now });
  assert.ok(
    Math.abs(Number(firstIdle.parameters.ParamBodyAngleY || 0) - Number(speaking.parameters.ParamBodyAngleY || 0)) < 0.35,
    "speech should keep momentum on the first idle frame instead of dropping its torso pose"
  );
  const settled = advanceWithSamples(h, 1800, {});
  assert.ok(
    Math.abs(Number(settled.parameters.ParamBodyAngleY || 0)) < Math.abs(Number(firstIdle.parameters.ParamBodyAngleY || 0)),
    "speech momentum should decay naturally after returning to idle"
  );
}

{
  const expressionSource = fs.readFileSync(EXPRESSION_PATH, "utf8");
  assert.ok(
    expressionSource.includes("hiyoriLegacyBodyMixSmoothed"),
    "Hiyori should smoothly reduce the legacy body layer instead of stacking full amplitudes"
  );
  assert.ok(
    expressionSource.includes("hiyoriActionActive ? 0.16"),
    "semantic gestures should receive clear ownership of Hiyori body channels"
  );
  const restoreAt = expressionSource.indexOf("state.hiyoriLegacyBodyMix = 1;");
  const directorAt = expressionSource.indexOf("applyHiyoriPerformanceLayer(core, {", restoreAt);
  assert.ok(
    restoreAt >= 0 && directorAt > restoreAt,
    "the Hiyori director must run at full gain after the compatibility layer is reduced"
  );
}

{
  const signatures = {};
  for (const mode of ["listen", "think", "speak"]) {
    const h = createHarness();
    h.controller.sample({ now: h.now });
    for (let i = 0; i < 12; i += 1) {
      h.advance(24);
      signatures[mode] = h.controller.sample({
        now: h.now,
        listeningBlend: mode === "listen" ? 0.9 : 0,
        thinking: mode === "think",
        speaking: mode === "speak",
        audioLevel: mode === "speak" ? 0.58 : 0,
        bodyEnergy: mode === "speak" ? 0.65 : 0
      }).parameters;
    }
  }
  assert.ok(signatures.listen.ParamEyeLOpen > 0 && signatures.listen.ParamAngleZ > 0, "listen should read as attentive and tilted");
  assert.ok(signatures.think.ParamArmLA > 0 && signatures.think.ParamAngleZ < 0, "think should use the dedicated arm-and-head pose");
  assert.ok(signatures.speak.ParamShoulder > 0 && signatures.speak.ParamBodyAngleY > 0, "speak should energize shoulder and body");
  assert.strictEqual(new Set(Object.values(signatures).map((pose) => JSON.stringify(pose))).size, 3, "listen, think, and speak should remain parameter-distinct");
}

{
  const signatures = {};
  for (const emotion of directorApi.EMOTIONS) {
    const h = createHarness();
    h.controller.sample({ now: h.now });
    for (let i = 0; i < 8; i += 1) {
      h.advance(34);
      signatures[emotion] = h.controller.sample({ now: h.now, emotion }).parameters;
    }
  }
  assert.ok(signatures.happy.ParamMouthForm > 0, "happy should smile");
  assert.ok(signatures.sad.ParamMouthForm < 0 && signatures.sad.ParamShoulder < 0, "sad should lower mouth and shoulders");
  assert.ok(signatures.angry.ParamBrowLY < 0 && signatures.angry.ParamShoulder > 0, "angry should lower brows and tense shoulders");
  assert.ok((signatures.surprised.ParamEyeLOpen || 0) > (signatures.happy.ParamEyeLOpen || 0), "surprised should open eyes more than happy");
  assert.ok(signatures.thinking.ParamEyeBallX < 0 && signatures.thinking.ParamAngleZ < 0, "thinking should glance aside and tilt");
  const serialized = directorApi.EMOTIONS.map((emotion) => JSON.stringify(signatures[emotion]));
  assert.strictEqual(new Set(serialized).size, directorApi.EMOTIONS.length, "all five emotion performances should be parameter-distinct");
}

{
  const probes = {
    nod: { progress: 0.41, check: (pose) => Math.abs(pose.ParamAngleY || 0) > 1 },
    nod_double: { progress: 0.31, check: (pose) => Math.abs(pose.ParamAngleY || 0) > 0.7 },
    shake: { progress: 0.44, check: (pose) => Math.abs(pose.ParamAngleX || 0) > 1 },
    attentive_tilt: { progress: 0.5, check: (pose) => pose.ParamAngleZ > 1 && pose.ParamEyeLOpen > 0 },
    thoughtful_glance: { progress: 0.5, check: (pose) => pose.ParamEyeBallX < -0.1 && pose.ParamAngleZ < -0.7 },
    thought_resolve: { progress: 0.5, check: (pose) => pose.ParamMouthForm > 0 && pose.ParamBodyAngleY > 0.5 },
    lean_forward: { progress: 0.5, check: (pose) => pose.ParamBodyAngleY > 4 },
    lean_back: { progress: 0.5, check: (pose) => pose.ParamBodyAngleY < -4 },
    care_lean: { progress: 0.5, check: (pose) => pose.ParamBodyAngleY > 2 && pose.ParamShoulder < 0 },
    shy_glance: { progress: 0.5, check: (pose) => pose.ParamCheek > 0.08 && pose.ParamEyeBallX > 0.1 },
    speak_emphasis: { progress: 0.5, check: (pose) => pose.ParamBodyAngleY > 1.5 },
    sentence_release: { progress: 0.5, check: (pose) => pose.ParamShoulder < -0.04 && pose.ParamBreath > 0.05 },
    happy_bounce: { progress: 0.35, check: (pose) => pose.ParamBodyAngleY > 1 && pose.ParamEyeLSmile > 0 }
  };
  for (const [action, probe] of Object.entries(probes)) {
    const pose = directorApi.sampleAction(action, probe.progress, 1);
    assert.ok(probe.check(pose), `${action} should have a readable semantic direction at its performance peak`);
  }
}

{
  const h = createHarness();
  assert.strictEqual(h.controller.triggerAction("nod", { now: h.now, priority: 3 }), true);
  assert.strictEqual(h.controller.triggerAction("lean_forward", { now: h.now + 20, priority: 2 }), false, "lower-priority actions must not interrupt a stronger gesture");
  assert.strictEqual(
    h.controller.triggerAction("nod", { now: h.now + directorApi.ACTION_SPECS.nod.cooldownMs + 10, priority: 3 }),
    false,
    "the same action must not restart while its previous performance is still active"
  );
  const nod = advanceWithSamples(h, Math.round(directorApi.ACTION_SPECS.nod.durationMs * 0.41));
  assert.strictEqual(nod.action, "nod");
  assert.ok(Math.abs(nod.parameters.ParamAngleY) > 0.4, "nod should drive head Y");
  assert.strictEqual(h.controller.triggerAction("happy_bounce", { now: h.now, priority: 4 }), true, "higher-priority happy bounce should preempt nod");
  const crossfade = h.controller.sample({ now: h.now });
  assert.strictEqual(crossfade.action, "happy_bounce");
  assert.strictEqual(crossfade.outgoingAction, "nod", "preempted action should crossfade instead of disappearing in one frame");
  assert.ok(Math.abs(crossfade.parameters.ParamAngleY) > 0.4, "outgoing nod pose should remain visible at the interruption boundary");
  const bounce = advanceWithSamples(
    h,
    Math.round(directorApi.ACTION_SPECS.happy_bounce.durationMs * 0.36),
    { emotion: "happy" }
  );
  assert.strictEqual(bounce.action, "happy_bounce");
  assert.strictEqual(bounce.outgoingAction, "", "interrupted action should finish its bounded crossfade");
  assert.ok(bounce.parameters.ParamBodyAngleY > 1, "happy bounce should visibly lift the body");
  assert.strictEqual(h.controller.triggerAction("happy_bounce", { now: h.now + 10 }), false, "semantic action cooldown should reject immediate repeats");
  const settled = advanceWithSamples(
    h,
    Math.round(directorApi.ACTION_SPECS.happy_bounce.durationMs * 0.64) + 20
  );
  assert.strictEqual(settled.action, "", "semantic actions should release instead of sticking");
  assert.strictEqual(
    h.controller.triggerAction("happy_bounce", { now: h.now + 10 }),
    false,
    "cooldown should continue after the action has naturally released"
  );
  h.now = h.state.hiyoriDirector.cooldowns.happy_bounce + 1;
  assert.strictEqual(
    h.controller.triggerAction("happy_bounce", { now: h.now }),
    true,
    "the same action should become available after its release cooldown"
  );
}

{
  const h = createHarness();
  assert.strictEqual(h.controller.triggerAction("nod", { now: h.now, priority: 3 }), true);
  h.advance(directorApi.ACTION_SPECS.nod.durationMs - 10);
  assert.strictEqual(
    h.controller.triggerAction("happy_bounce", { now: h.now, priority: 4 }),
    true,
    "a stronger action should still preempt near the end of the old action"
  );
  let sample = h.controller.sample({ now: h.now });
  assert.strictEqual(sample.outgoingAction, "nod");
  h.advance(180);
  sample = h.controller.sample({ now: h.now });
  assert.strictEqual(sample.outgoingAction, "nod", "the old action should retain its independent 190ms crossfade near its original end");
  h.advance(11);
  sample = h.controller.sample({ now: h.now });
  assert.strictEqual(sample.outgoingAction, "", "the old action should clear after the bounded crossfade window");
}

{
  const h = createHarness();
  const seen = [];
  for (let i = 0; i < 18; i += 1) {
    const director = h.controller.ensureState(h.now);
    h.now = Math.max(h.now + 1, director.idleNextAt + 1);
    let sample = h.controller.sample({ now: h.now, allowIdle: true });
    assert.ok(sample.idle, "idle scheduler should start a bounded variant");
    seen.push(sample.idle);
    const duration = h.state.hiyoriDirector.idleActive.durationMs;
    h.advance(duration + 2);
    sample = h.controller.sample({ now: h.now, allowIdle: true });
    assert.strictEqual(sample.idle, "", "idle variant should return to neutral after its envelope");
  }
  for (let i = 1; i < seen.length; i += 1) {
    assert.notStrictEqual(seen[i], seen[i - 1], "long-running idle should never immediately repeat a variant");
  }
  assert.strictEqual(new Set(seen).size, directorApi.IDLE_VARIANTS.length, "18 idle cycles should cover all eight shuffled variants");
}

{
  for (const action of Object.keys(directorApi.ACTION_SPECS)) {
    const spec = directorApi.ACTION_SPECS[action];
    for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.95, 1]) {
      const age = progress * spec.durationMs;
      const envelope = directorApi.actionEnvelope(spec, age);
      const pose = directorApi.sampleAction(action, progress, envelope);
      for (const value of Object.values(pose)) {
        assert.ok(Number.isFinite(value), `${action} should only emit finite values`);
        assert.ok(Math.abs(value) <= 12, `${action} should remain inside a bounded parameter amplitude`);
      }
    }
  }
}

{
  const index = fs.readFileSync(INDEX_PATH, "utf8");
  const expression = fs.readFileSync(EXPRESSION_PATH, "utf8");
  const chat = fs.readFileSync(CHAT_PATH, "utf8");
  assert.ok(index.includes('<script src="./hiyoriPerformanceDirector.js"></script>'), "stage should load the Hiyori performance director");
  assert.ok(index.indexOf("hiyoriPerformanceDirector.js") < index.indexOf("live2dExpressionController.js"), "director must load before the expression controller");
  assert.ok(expression.includes("applyHiyoriPerformanceLayer(core"), "expression loop should apply the continuous Hiyori layer");
  assert.ok(expression.includes("outgoingAction: sample.outgoingAction"), "runtime diagnostics should expose semantic crossfades");
  assert.ok(expression.includes("hiyoriPerformanceDebugSampledAt") && expression.includes("channels,"), "runtime diagnostics should expose throttled head/shoulder/body output evidence");
  assert.ok(expression.includes("triggerSemanticAction(semanticCandidate"), "speech cues should trigger semantic actions");
  assert.ok(chat.includes("requestLive2DPerformanceMode"), "action intents should expose listen/think/speak mode requests");
  assert.ok(chat.includes("triggerLive2DSemanticAction"), "performance cues should expose semantic action triggering");
  assert.ok(chat.includes("hiyoriSemanticOnly"), "recognized Hiyori semantic actions should not compete with built-in motions");
  assert.ok(chat.includes('opts.motionCue || ""'), "Hiyori timeline micro-cues should route through the semantic director");
  assert.ok(chat.includes("timeline:${String(opts.motionCue || semanticName)}"), "timeline gestures should retain a diagnostic source");
}

console.log("[OK] Hiyori continuous performance director frontend tests passed.");
