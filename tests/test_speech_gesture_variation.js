"use strict";

const assert = require("assert");
const directorApi = require("../web/hiyoriPerformanceDirector.js");
const expressionApi = require("../web/live2dExpressionController.js");

const VOICE = {
  speaking: true, audioActive: true, audioLevel: 0.85,
  bodyEnergy: 0.8, emotion: "neutral", playbackGeneration: 1
};

function harness() {
  let now = 1000;
  const state = {};
  const controller = directorApi.createController({
    state, random: () => 0.3, performanceObject: { now: () => now }
  });
  let sample = controller.sample({ now, allowIdle: false });
  return {
    state, controller,
    get now() { return now; },
    get sample() { return sample; },
    tick(context = {}, elapsed = 16) {
      now += elapsed;
      sample = controller.sample({ now, allowIdle: false, ...context });
      return sample;
    },
    run(duration, context = {}) {
      let remaining = duration;
      while (remaining > 0) {
        const step = Math.min(16, remaining);
        this.tick(context, step);
        remaining -= step;
      }
      return sample;
    }
  };
}

function beginVoice(h, context = {}) {
  return h.run(180, { ...VOICE, ...context });
}

function quietVoice(h, duration, context = {}) {
  return h.run(duration, { ...VOICE, ...context, audioLevel: 0 });
}

function collectGestures(h, context, duration = 18000, cycle = 900) {
  const observed = [];
  let previousCount = Number(h.sample.speechGestureCount) || 0;
  for (let elapsed = 0; elapsed < duration; elapsed += 16) {
    const sample = h.tick({
      ...VOICE, ...context, audioLevel: elapsed % cycle < 180 ? 0.85 : 0
    });
    assert.ok(Number.isInteger(sample.speechGestureCount), "gesture count must be observable");
    if (sample.speechGestureCount > previousCount) {
      assert.ok(sample.speechGesture, "a displayed gesture must identify its variant");
      observed.push({ name: sample.speechGesture, at: h.now });
      previousCount = sample.speechGestureCount;
    }
  }
  return observed;
}

function deltaPose(normal, suppressed) {
  const result = {};
  for (const key of new Set([
    ...Object.keys(normal.parameters), ...Object.keys(suppressed.parameters)
  ])) {
    result[key] = (Number(normal.parameters[key]) || 0)
      - (Number(suppressed.parameters[key]) || 0);
  }
  return result;
}

const cases = [
  ["question, comfort and excited deliveries select distinct readable gesture families", () => {
    const groups = {
      thinking: new Set(["question_tilt", "small_nod", "open_explain"]),
      sad: new Set(["soft_lean", "small_nod"]),
      excited: new Set(["light_lift", "open_explain", "nod"])
    };
    const seen = {};
    for (const [emotion, allowed] of Object.entries(groups)) {
      seen[emotion] = collectGestures(harness(), { emotion }, 12000, 2400);
      assert.ok(seen[emotion].length >= 4, `${emotion} must retain phrase accents`);
      for (const gesture of seen[emotion]) {
        assert.ok(allowed.has(gesture.name), `${emotion} must choose a matching gesture family`);
      }
      assert.ok(new Set(seen[emotion].map(value => value.name)).size >= 2,
        `${emotion} must not always perform one pose`);
    }
    assert.ok(seen.thinking.some(value => value.name === "question_tilt"));
    assert.ok(seen.sad.some(value => value.name === "soft_lean"));
    assert.ok(seen.excited.some(value => value.name === "light_lift"));
  }],
  ["a sustained loud voice triggers once and leaves the short gesture at rest", () => {
    const sample = harness().run(6000, VOICE);
    assert.strictEqual(sample.speechAccentCount, 1, "the legacy detector must keep rise semantics");
    assert.strictEqual(sample.speechGestureCount, 1, "constant loudness must not become a gesture metronome");
    assert.strictEqual(sample.speechGesture, "", "a short gesture must finish while the sentence continues");
  }],
  ["the rest window suppresses some rapid rises without changing detector counts", () => {
    const h = harness();
    const gestures = collectGestures(h, {}, 18000, 900);
    assert.ok(gestures.length >= 5, "later phrases must still receive expression");
    assert.ok(h.sample.speechAccentCount > h.sample.speechGestureCount,
      "a detectable rise during rest must not produce another body gesture");
    for (let index = 1; index < gestures.length; index += 1) {
      assert.ok(gestures[index].at - gestures[index - 1].at >= 1500,
        "successive gestures need a visible rest interval");
    }
  }],
  ["same-delivery accents avoid the two most recent variants when alternatives exist", () => {
    const gestures = collectGestures(harness(), { emotion: "playful" }, 18000, 2400);
    assert.ok(gestures.length >= 6);
    for (let index = 1; index < gestures.length; index += 1) {
      assert.notStrictEqual(gestures[index].name, gestures[index - 1].name,
        "immediate repeat makes phrase accents look mechanical");
      if (index >= 2) assert.notStrictEqual(gestures[index].name, gestures[index - 2].name,
        "three available variants should avoid the recent pair");
    }
  }],
  ["short sentence cancellation and a new generation cannot bypass the rest window", () => {
    const h = harness();
    beginVoice(h);
    const firstCount = h.sample.speechGestureCount;
    const firstRestUntil = h.sample.speechGestureRestUntil;
    const firstHistory = [...h.sample.speechGestureHistory];
    h.controller.stopSpeech();
    h.tick({ ...VOICE, playbackGeneration: 2, audioLevel: 0 });
    const next = beginVoice(h, { playbackGeneration: 2 });
    assert.strictEqual(next.speechAccentCount, 1, "new playback still detects its own voice rise");
    assert.strictEqual(next.speechGestureCount, firstCount, "rest must survive a sentence boundary");
    assert.strictEqual(next.speechGestureRestUntil, firstRestUntil);
    assert.deepStrictEqual(next.speechGestureHistory, firstHistory);
    assert.strictEqual(next.speechGesture, "");
  }],
  ["a fresh rise after the rest window resumes with a different recent variant", () => {
    const h = harness();
    const first = beginVoice(h);
    const firstName = first.speechGesture;
    quietVoice(h, Math.max(900, first.speechGestureRestUntil - h.now + 20));
    const next = beginVoice(h);
    assert.strictEqual(next.speechGestureCount, first.speechGestureCount + 1);
    assert.ok(next.speechGesture);
    assert.notStrictEqual(next.speechGesture, firstName);
  }],
  ["comforting speech leaves a longer interval between gestures", () => {
    const h = harness();
    const gestures = collectGestures(h, { emotion: "sad" }, 18000, 900);
    assert.ok(gestures.length >= 4);
    for (let index = 1; index < gestures.length; index += 1) {
      assert.ok(gestures[index].at - gestures[index - 1].at >= 1900,
        "comforting delivery should not lift and nod with every fast phrase");
    }
  }],
  ["generation changes immediately cancel the active variant while retaining recent history", () => {
    const h = harness();
    const first = beginVoice(h, { emotion: "excited" });
    assert.ok(first.speechGesture);
    const next = h.tick({ ...VOICE, emotion: "excited", playbackGeneration: 2, audioLevel: 0 });
    assert.strictEqual(next.speechGesture, "");
    assert.strictEqual(next.speechAccent, 0);
    assert.strictEqual(next.speechGestureCount, first.speechGestureCount);
    assert.deepStrictEqual(next.speechGestureHistory, first.speechGestureHistory);
  }],
  ["normal completion and explicit interruption both clear only the short active variant", () => {
    for (const explicit of [false, true]) {
      const h = harness();
      const first = beginVoice(h);
      assert.ok(first.speechGesture);
      if (explicit) h.controller.stopSpeech();
      const stopped = h.tick({ speaking: false, audioActive: false, playbackGeneration: 1 });
      assert.strictEqual(stopped.speechGesture, "");
      assert.strictEqual(stopped.speechGestureCount, first.speechGestureCount);
      assert.deepStrictEqual(stopped.speechGestureHistory, first.speechGestureHistory);
    }
  }],
  ["a waiting cue cannot fabricate a gesture before audible playback begins", () => {
    const sample = harness().run(3000, { ...VOICE, audioActive: false, emotion: "excited" });
    assert.strictEqual(sample.speechGesture, "");
    assert.strictEqual(sample.speechGestureCount, 0);
    assert.deepStrictEqual(sample.speechGestureHistory, []);
  }],
  ["authored motion owns the body and a skipped rise is not replayed after it releases", () => {
    const h = harness();
    const owned = beginVoice(h, { authoredMotionActive: true });
    assert.strictEqual(owned.speechAccentCount, 1);
    assert.strictEqual(owned.speechGestureCount, 0);
    assert.strictEqual(owned.speechGesture, "");
    const released = h.run(2000, { ...VOICE, authoredMotionActive: false });
    assert.strictEqual(released.speechGestureCount, 0,
      "releasing a clip must not play an old buffered accent");
    quietVoice(h, 1000);
    assert.strictEqual(beginVoice(h).speechGestureCount, 1, "a new phrase after release may gesture");
  }],
  ["semantic and outgoing actions suppress competing short accents", () => {
    const active = harness();
    assert.strictEqual(active.controller.triggerAction("nod", { source: "user_click" }), true);
    assert.strictEqual(beginVoice(active).speechGestureCount, 0);

    const outgoing = harness();
    outgoing.controller.triggerAction("nod", { source: "user_click" });
    outgoing.run(300, {});
    outgoing.controller.triggerAction("happy_bounce", { source: "speech_cue", force: true });
    outgoing.controller.stopSpeech();
    assert.ok(outgoing.state.hiyoriDirector.outgoingAction,
      "the independent user gesture must retain its outgoing release");
    assert.strictEqual(beginVoice(outgoing).speechGestureCount, 0,
      "the outgoing release still owns the body at the voice rise");
    assert.strictEqual(outgoing.run(2000, VOICE).speechGestureCount, 0,
      "the skipped rise must not be replayed when the release ends");
  }],
  ["a newly acquired authored or semantic owner cancels an already active short gesture", () => {
    for (const authored of [false, true]) {
      const h = harness();
      const first = beginVoice(h);
      assert.ok(first.speechGesture);
      if (!authored) h.controller.triggerAction("lean_forward", { source: "user_click" });
      const owned = h.tick({ ...VOICE, authoredMotionActive: authored });
      assert.strictEqual(owned.speechGesture, "",
        "new explicit ownership must release the short overlay immediately");
      assert.strictEqual(owned.speechGestureCount, first.speechGestureCount);
      assert.deepStrictEqual(owned.speechGestureHistory, first.speechGestureHistory,
        "ownership changes must retain recent variation memory");
    }
  }],
  ["duplicate sampling does not select another variant or advance channel motion", () => {
    const h = harness();
    const first = beginVoice(h);
    const second = h.controller.sample({ now: h.now, allowIdle: false, ...VOICE });
    assert.strictEqual(second.speechGestureCount, first.speechGestureCount);
    assert.strictEqual(second.speechGesture, first.speechGesture);
    assert.deepStrictEqual(second.speechGestureHistory, first.speechGestureHistory);
    assert.deepStrictEqual(second.parameters, first.parameters);
  }],
  ["gesture history diagnostics are snapshots and cannot mutate scheduler state", () => {
    const h = harness();
    const sample = beginVoice(h);
    const expected = [...sample.speechGestureHistory];
    sample.speechGestureHistory.push("untrusted_external_variant");
    const next = h.tick(VOICE);
    assert.deepStrictEqual(next.speechGestureHistory, expected,
      "debug consumers must not modify the director's recent variant memory");
  }],
  ["added gesture channels are finite, bounded and leave lips and eyelids to their owners", () => {
    for (const emotion of ["neutral", "happy", "playful", "excited", "shy", "hurt", "sad", "anxious", "angry", "surprised", "serious", "thinking"]) {
      const visible = harness();
      const suppressed = harness();
      let moved = false;
      for (let elapsed = 0; elapsed < 14000; elapsed += 16) {
        const context = { ...VOICE, emotion, audioLevel: elapsed % 2400 < 180 ? 0.85 : 0 };
        const normal = visible.tick(context);
        const owned = suppressed.tick({ ...context, authoredMotionActive: true });
        for (const [key, value] of Object.entries(normal.parameters)) {
          assert.ok(Number.isFinite(value), `${emotion}/${key} must be finite`);
          assert.ok(Math.abs(value) < 12, `${emotion}/${key} must remain a bounded offset`);
        }
        const delta = deltaPose(normal, owned);
        assert.ok(Math.abs(delta.ParamMouthOpenY || 0) < 1e-10, "gesture must not drive lip openness");
        assert.ok(Math.abs(delta.ParamEyeLOpen || 0) < 1e-10, "gesture must not drive left eyelid openness");
        assert.ok(Math.abs(delta.ParamEyeROpen || 0) < 1e-10, "gesture must not drive right eyelid openness");
        if (Object.values(delta).some(value => Math.abs(value) > 0.05)) moved = true;
      }
      assert.ok(moved, `${emotion} must produce an actual body gesture`);
    }
  }],
  ["existing low and high motion intensity scale the same short gesture monotonically", () => {
    const peak = {};
    const names = {};
    for (const motionIntensity of ["low", "high"]) {
      const visible = harness();
      const suppressed = harness();
      peak[motionIntensity] = 0;
      for (let elapsed = 0; elapsed < 600; elapsed += 16) {
        const context = { ...VOICE, emotion: "excited", motionIntensity };
        const normal = visible.tick(context);
        const owned = suppressed.tick({ ...context, authoredMotionActive: true });
        if (normal.speechGesture) names[motionIntensity] = normal.speechGesture;
        peak[motionIntensity] = Math.max(peak[motionIntensity],
          ...Object.values(deltaPose(normal, owned)).map(Math.abs));
      }
    }
    assert.ok(names.low);
    assert.strictEqual(names.high, names.low, "intensity must not change the selected phrase variant");
    assert.ok(peak.low > 0.05);
    assert.ok(peak.high > peak.low * 2, "high motion must visibly scale the added gesture");
  }],
  ["the production adapter passes current authored ownership and ignores other rigs", () => {
    let now = 1000;
    const state = {
      modelProfileName: "hiyori_pro_t11", ttsPlaybackGeneration: 3,
      hiyoriAuthoredMotionUntil: 5000,
      hiyoriAuthoredMotion: { playbackGeneration: 3 }
    };
    const expression = expressionApi.createController({
      state, hiyoriPerformanceDirector: directorApi, performanceObject: { now: () => now }
    });
    const core = { addParameterValueById() {} };
    let sample;
    expression.applyHiyoriPerformanceLayer(core, { now, allowIdle: false });
    for (let elapsed = 0; elapsed < 180; elapsed += 16) {
      now += 16;
      sample = expression.applyHiyoriPerformanceLayer(core, { ...VOICE, now, playbackGeneration: 3 });
    }
    assert.strictEqual(sample.speechGestureCount, 0,
      "normal production rendering must suppress gestures while the authored clip owns the rig");
    assert.strictEqual(state.hiyoriPerformanceDebug.speechGestureCount, 0,
      "production diagnostics must expose the actual gesture decision");
    state.modelProfileName = "other-model";
    assert.strictEqual(expression.applyHiyoriPerformanceLayer(core, { ...VOICE, now }), null);
  }],
  ["stale authored ownership and a disabled motion switch are respected by the adapter", () => {
    for (const disabled of [false, true]) {
      let now = 1000;
      const state = {
        modelProfileName: "hiyori_pro_t11", ttsPlaybackGeneration: 4,
        motionEnabled: !disabled,
        hiyoriAuthoredMotionUntil: 5000,
        hiyoriAuthoredMotion: { playbackGeneration: 3 }
      };
      const expression = expressionApi.createController({
        state, hiyoriPerformanceDirector: directorApi, performanceObject: { now: () => now }
      });
      const core = { addParameterValueById() {} };
      let sample;
      expression.applyHiyoriPerformanceLayer(core, { now, allowIdle: false });
      for (let elapsed = 0; elapsed < 180; elapsed += 16) {
        now += 16;
        sample = expression.applyHiyoriPerformanceLayer(core, { ...VOICE, now, playbackGeneration: 4 });
      }
      assert.strictEqual(sample.speechGestureCount, disabled ? 0 : 1,
        disabled ? "disabling motion must suppress the new phrase gesture"
          : "an old playback generation must not suppress the new sentence's gesture");
    }
  }]
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log(`[OK] ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`[FAIL] ${name}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
else console.log(`Speech gesture variation tests passed (${cases.length} behavior cases).`);
