"use strict";
const assert = require("node:assert/strict");
const naturalApi = require("../web/avatar/live2dMotionNatural.js");
const expressionApi = require("../web/live2dExpressionController.js");
const directorApi = require("../web/hiyoriPerformanceDirector.js");
const driverApi = require("../web/avatar/live2dModelDriver.js");
const gestureApi = require("../web/avatar/live2dGestures.js");
const { validateMapping } = require("../scripts/validate_live2d_mapping.js");
const seed = value => () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
function rig(mapping) {
  const values = new Map(), parts = new Map(), writes = [];
  const defaults = () => { values.clear(); for (const id of Object.values(mapping.params).flatMap(v => typeof v === "string" ? [v] : Object.values(v))) values.set(id, /Eye[LR]Open/.test(id) ? 1 : 0); };
  defaults();
  const core = { getParameterValueById: id => values.get(id) || 0,
    setParameterValueById(id, v, w = 1) { writes.push(["set", id, v, w]); values.set(id, (values.get(id) || 0) * (1 - w) + v * w); },
    addParameterValueById(id, v, w = 1) { writes.push(["add", id, v, w]); values.set(id, (values.get(id) || 0) + v * w); },
    multiplyParameterValueById(id, v) { values.set(id, (values.get(id) || 0) * v); },
    getPartOpacityById: id => parts.get(id) ?? 1, setPartOpacityById(id, v) { writes.push(["part", id, v]); parts.set(id, v); } };
  const model = { internalModel: { coreModel: core, motionManager: { stopAllMotions() {} } } };
  return { core, model, values, parts, writes, defaults };
}
function signalAmplitude(samples, hz, fps = 60) {
  let real = 0, imag = 0;
  const mean = samples.reduce((a, b) => a + b) / samples.length;
  samples.forEach((v, i) => { const angle = 2 * Math.PI * hz * i / fps; real += (v - mean) * Math.cos(angle); imag += (v - mean) * Math.sin(angle); });
  return Math.hypot(real, imag) * 2 / samples.length;
}
function speech(mapping, on, withPauses = false) {
  const r = rig(mapping); let now = 1000;
  const state = { model: r.model, modelProfileName: mapping.id === "hiyori" ? "hiyori_pro_t11" : "mao", avatarMapping: mapping,
    expressionEnabled: true, motionEnabled: true, live2dNaturalMotionEnabled: on, ttsPlaybackGeneration: 1,
    currentTalkStyle: "neutral", uiView: "full", speechMouthOpen: 0, ttsAudioLevel: 0 };
  const controller = expressionApi.createController({ state, mapping, hiyoriPerformanceDirector: directorApi,
    performanceObject: { now: () => now }, isSpeakingNow: () => true, isSpeechMotionActive: () => true });
  const driver = driverApi.create({ mapping, model: r.model, now: () => now });
  const natural = naturalApi.create({ mapping, state, model: r.model, random: seed(9281) });
  const body = [], mouths = [], beforeFinalMouth = [], levels = [];
  for (let i = 0; i < 1800; i++) {
    now = 1000 + i * 1000 / 60; r.defaults(); r.writes.length = 0;
    const speaking = !withPauses || i % 600 < 480;
    const open = speaking && i % 15 < 7 ? .85 : 0;
    state.ttsAudioLevel = open; state.speechMouthOpen = open;
    const frame = { mode: speaking ? "speak" : "idle", mouth: { open, vowel: "a" } };
    state.avatarIntentFrame = frame; state.avatarIntentOverrides = frame;
    natural.prepare(now, frame);
    if (mapping.driver === "mapped") driver.update(frame);
    else { controller.applyStyleExpressionLayer(); controller.updateMicroMotionLayer(); }
    const mouthId = mapping.params.mouthOpen || mapping.params.mouthOpenY;
    beforeFinalMouth.push(r.values.get(mouthId));
    const mouthWrites = r.writes.filter(x => x[1] === mouthId).length;
    natural.apply();
    assert.equal(r.writes.filter(x => x[1] === mouthId).length, mouthWrites, "natural layer never writes the mouth");
    mouths.push(r.values.get(mouthId)); body.push(r.values.get(mapping.params.angleY) || 0);
    if (on) levels.push(state.live2dNaturalContext.envelope);
  }
  assert.deepEqual(mouths, beforeFinalMouth, "final smoothing leaves exact mouth values untouched");
  return { body, mouths, history: natural.history, levels };
}
(async () => {
  for (const name of ["hiyori", "mao"]) {
    const mapping = require(`../web/avatar/mappings/${name}.json`);
    const seededSpeech = on => { const original = Math.random; Math.random = seed(8673); try { return speech(mapping, on); } finally { Math.random = original; } };
    const before = seededSpeech(false), after = seededSpeech(true);
    const originalRandom = Math.random;
    let pausedBefore, pausedAfter;
    try { Math.random = seed(8673); pausedBefore = speech(mapping, false, true); Math.random = seed(8673); pausedAfter = speech(mapping, true, true); }
    finally { Math.random = originalRandom; }
    assert.deepEqual(pausedAfter.mouths, pausedBefore.mouths, "body attack/release never changes mouth at sentence/idle boundaries");
    assert.equal(pausedAfter.history.sentences.length, 1, "without timestamped punctuation, even a long pause cannot reset the utterance budget");
    assert.ok(pausedAfter.history.nods.length <= 2);
    assert.deepEqual(after.mouths, before.mouths, `${name}: mouth sequence unchanged`);
    assert.equal(after.history.sentences.length, 1, "4Hz gaps never become sentence boundaries");
    assert.ok(after.history.nods.length <= 2, "maximum two nods per continuous sentence");
    assert.ok(Math.max(...after.levels.slice(600)) - Math.min(...after.levels.slice(600)) < 1e-9, "4Hz pulses become a sustained body envelope");
    const old4 = signalAmplitude(before.body.slice(600), 4), new4 = signalAmplitude(after.body.slice(600), 4);
    if (name === "hiyori") assert.ok(new4 < old4 * .2, `actual Hiyori path rejects 4Hz: ${new4}/${old4}`);
    else assert.ok(new4 < .03, "Mao has no 4Hz head vibration introduced");
    console.log(`${name}: 4Hz head amplitude before=${old4.toFixed(6)} after=${new4.toFixed(6)}; mouth exact; nods=${after.history.nods.length}`);

    const idleRun = seedValue => {
      const r = rig(mapping), state = {}, natural = naturalApi.create({ mapping, state, model: r.model, random: seed(seedValue) });
      const tail = [];
      for (let i = 0; i <= 18000; i++) {
        const now = 1000 + i * 1000 / 30; r.defaults(); natural.prepare(now, { mode: "idle", mouth: { open: 0 } }); natural.apply();
        if (i > 17000) tail.push(r.values.get(mapping.params.angleX));
      }
      assert.ok(Math.max(...tail) - Math.min(...tail) > .1, "still alive after ten minutes");
      return natural.history;
    };
    const idle = idleRun(122), again = idleRun(122), other = idleRun(451);
    assert.deepEqual(idle, again, "injected seed gives reproducible long-idle regression");
    assert.notDeepEqual(idle, other, "different seed never repeats the same idle sequence");
    assert.ok(idle.idleGestures.length >= 12 && idle.idleGestures.length <= 45, "gentle gestures are infrequent");
    for (const key of ["blinks", "idleGestures"]) {
      const entries = idle[key], gaps = entries.slice(1).map((x, i) => Math.round(x.at - entries[i].at));
      assert.ok(new Set(gaps).size > 8, `${name}: ${key} intervals are not a fixed timer`);
      if (key === "idleGestures") assert.ok(gaps.every(v => v >= 14000));
    }
    assert.ok(new Set(idle.breathPeriods.map(Math.round)).size > 8, "breathing period changes");
    assert.deepEqual(validateMapping(mapping).errors, []);
    for (const mutate of [m => { m.naturalMotion.idleIntervalMs = [100, 100]; },
      m => { m.naturalMotion.bodyChannels.push(m.params.mouthOpen ? "mouthOpen" : "mouthOpenY"); },
      m => { m.naturalMotion.nodPose.absent = 1; }, m => { m.naturalMotion.idleGestures = ["missing"]; }]) {
      const invalid = JSON.parse(JSON.stringify(mapping)); mutate(invalid);
      assert.ok(validateMapping(invalid).errors.length, "invalid naturalization mapping rejected");
    }

    const r = rig(mapping), state = {}, natural = naturalApi.create({ mapping, state, model: r.model, random: seed(331) });
    let now = 1000;
    const host = { performance: { now: () => now }, setTimeout: () => 1, clearTimeout() {} };
    const gestures = gestureApi.create({ mapping, state, host });
    function tick(dt, authored = 0) {
      now += dt; r.defaults();
      natural.prepare(now, { mode: "idle", mouth: { open: .6 } }, { gestureActive: gestures.isActive() });
      r.core.setParameterValueById(mapping.params.angleY, authored);
      for (const [id, value] of gestures.sample().parameters) r.core.addParameterValueById(id, value);
      r.core.setParameterValueById(mapping.params.mouthOpen || mapping.params.mouthOpenY, .6);
      natural.apply(); return r.values.get(mapping.params.angleY);
    }
    tick(0); const one = gestures.playGesture("nod"); for (let i = 0; i < 24; i++) tick(16);
    const displayed = r.values.get(mapping.params.angleY), two = gestures.playGesture("tilt_head");
    assert.equal((await one).reason, "replaced");
    assert.equal(tick(0), displayed, "replacement starts at the displayed pose, not zero");
    assert.ok(Math.abs(tick(16) - displayed) < .3, "bounded first-frame handoff");
    const last = r.values.get(mapping.params.angleY);
    assert.equal(tick(0, 16), last, "authored motion does not jump at zero elapsed time");
    assert.ok(Math.abs(tick(16, 16) - last) < 2, "authored/procedural handoff is filtered");
    gestures.stop(); assert.equal((await two).status, "interrupted");
    const prior = r.values.get(mapping.params.angleY); assert.equal(tick(0), prior, "stop releases smoothly");
    const cheek = mapping.params.cheek, part = Object.values(mapping.parts || {})[0];
    const beforeFace = r.values.get(cheek) || 0;
    r.core.setParameterValueById(cheek, 1); natural.apply();
    // Same elapsed timestamp must be idempotent: the pre-Core pipeline calls apply
    // once per tick. Compare a fresh zero-dt prepare for face/opacity handoffs.
    natural.prepare(now, { mode: "idle", mouth: { open: 0 } }, { actionActive: true });
    r.core.setParameterValueById(cheek, 1); if (part) r.core.setPartOpacityById(part, 0); natural.apply();
    assert.equal(r.values.get(cheek), beforeFace, "expression handoff holds prior face at zero dt");
    if (part) assert.equal(r.parts.get(part), 1, "part swap fades from previous opacity");
    const eye = mapping.params.eyeLOpen;
    const previousEye = r.values.get(eye);
    r.core.setParameterValueById(eye, 0); natural.apply();
    assert.equal(r.values.get(eye), previousEye, "expression eyelid starts at previous openness");
    now += 16; natural.prepare(now, { mouth: { open: 0 } }, { actionActive: true });
    r.core.setParameterValueById(eye, 0); natural.apply();
    assert.ok(r.values.get(eye) > previousEye * .85, "expression eyelid fade is distinct from fast natural blink");
    const mouthIds = new Set([mapping.params.mouthOpen || mapping.params.mouthOpenY, ...Object.values(mapping.params.vowels || {})]);
    r.writes.length = 0; state.live2dNaturalMotionEnabled = false;
    assert.equal(natural.prepare(now + 16, {}), null); natural.apply();
    assert.equal(r.writes.length, 0, "OFF means zero extra Core writes");
    assert.equal(state.live2dNaturalContext, undefined);
    const disabled = naturalApi.create({ mapping, state, model: r.model, random() { throw Error("disabled must not consume randomness"); } });
    disabled.prepare(now + 32, {}); disabled.apply();
    assert.equal(r.writes.length, 0);
    assert.ok([...mouthIds].every(id => !r.writes.some(x => x[1] === id)));
    natural.dispose(); gestures.dispose();
    const components = rig(mapping), breath = {}, blink = {}, controls = { live2dNaturalMotionEnabled: false };
    components.model.internalModel.breath = breath; components.model.internalModel.eyeBlink = blink;
    const managed = naturalApi.create({ mapping, state: controls, model: components.model, random: seed(123) });
    assert.equal(components.model.internalModel.breath, breath, "OFF never replaces SDK components");
    controls.live2dNaturalMotionEnabled = true; managed.prepare(0, {});
    assert.equal(components.model.internalModel.breath, null); assert.equal(components.model.internalModel.eyeBlink, null);
    controls.live2dNaturalMotionEnabled = false; managed.prepare(16, {});
    assert.equal(components.model.internalModel.breath, breath); assert.equal(components.model.internalModel.eyeBlink, blink);
    controls.live2dNaturalMotionEnabled = true; managed.prepare(32, {}); managed.dispose();
    assert.equal(components.model.internalModel.breath, breath, "dispose restores original SDK component");
    const isolatedRig = rig(mapping), oldRandom = Math.random;
    try {
      Math.random = () => { throw Error("natural idle must not consume the legacy RNG"); };
      const isolated = naturalApi.create({ mapping, state: {}, model: isolatedRig.model });
      isolated.prepare(1000, { mode: "idle" }); isolated.apply(); isolated.dispose();
    } finally { Math.random = oldRandom; }
    const boundaryRig = rig(mapping), boundaryState = { live2dSpeechText: "一，二。三，四。", ttsPlaybackGeneration: 1,
      avatarBrowserSpeech: { phase: "playing", boundaryIndex: 0, boundaryAt: 0 } };
    const boundaries = naturalApi.create({ mapping, state: boundaryState, model: boundaryRig.model, random: seed(621) });
    for (const index of [0, 2, 3, 4, 6, 7]) {
      boundaryState.avatarBrowserSpeech.boundaryIndex = index;
      boundaries.prepare(1000 + index * 300, { mode: "speak", mouth: { open: .8 } });
    }
    assert.equal(boundaries.history.sentences.length, 2, "word/comma boundaries never mint extra sentences");
    for (const s of boundaries.history.sentences) assert.ok(boundaries.history.nods.filter(n => n.sentence === s.sentence).length <= 2);
    boundaries.dispose();
    console.log(`${name}: ten-minute stochastic idle, interrupted/official motion continuity, off/ownership passed.`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
