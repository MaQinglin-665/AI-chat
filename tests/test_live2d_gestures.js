"use strict";
const assert = require("node:assert/strict");
const api = require("../web/avatar/live2dGestures.js"), renderers = require("../web/avatar/live2dRenderer.js");
const words = Object.keys(api.RANGES);
function clock() {
  let time = 1000, id = 0; const timers = new Map();
  return { host: { performance: { now: () => time }, screenX: 100, screenY: 50,
    setTimeout(fn, ms) { timers.set(++id, { fn, at: time + ms }); return id; }, clearTimeout(key) { timers.delete(key); } },
    timers, advance(ms, fire = false) { time += ms; if (fire) for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); } } };
}
(async () => {
  for (const name of ["hiyori", "mao"]) {
    const mapping = require(`../web/avatar/mappings/${name}.json`), c = clock(), state = { mouseGazeCurrentX: .4, mouseGazeCurrentY: -.3 };
    const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 800, height: 600 }) };
    const gestures = api.create({ mapping, state, host: c.host, canvas });
    for (const word of words) {
      assert.equal(api.validateSpec(mapping, word, mapping.gestureVocabulary[word]), true, `${name}/${word} schema`);
      const pending = gestures.playGesture(word);
      c.advance(mapping.gestureVocabulary[word].durationMs / 2); const sample = gestures.sample();
      assert.equal(Object.hasOwn(sample.frame, "mouth"), false); assert.equal(Object.hasOwn(sample.frame, "mode"), false);
      c.advance(mapping.gestureVocabulary[word].durationMs / 2 + 1); gestures.sample();
      assert.equal((await pending).status, "completed", `${name}/${word} completes`); assert.equal(c.timers.size, 0);
    }
    let first = gestures.playGesture("nod"); assert.equal((await gestures.playGesture("missing")).status, "unsupported");
    c.advance(1000); gestures.sample(); assert.equal((await first).status, "completed", "unsupported never interrupts");
    first = gestures.playGesture("nod"); const second = gestures.playGesture("wave");
    assert.equal((await first).reason, "replaced"); gestures.stop(); assert.equal((await second).reason, "stopped");
    const signal = new AbortController(), aborted = gestures.playGesture("happy", { signal: signal.signal }); signal.abort();
    assert.equal((await aborted).reason, "aborted"); assert.equal(c.timers.size, 0);
    assert.equal((await gestures.playGesture("nod", { signal: signal.signal })).status, "interrupted");
    const stalled = gestures.playGesture("think"); c.advance(3000, true); assert.equal((await stalled).reason, "clock_stalled");
    assert.deepEqual(gestures.lookAt("user"), { status: "completed" }); assert.deepEqual(gestures.sample().frame.gaze, { x: .4, y: -.3 });
    for (const [target, expected] of Object.entries({ left: [-1,0], right: [1,0], up: [0,1], down: [0,-1] })) {
      gestures.lookAt(target); assert.deepEqual(Object.values(gestures.sample().frame.gaze), expected);
    }
    gestures.lookAt({ type: "screen", x: 910, y: 70 }); assert.deepEqual(gestures.sample().frame.gaze, { x: 1, y: 1 });
    assert.equal(gestures.lookAt({ type: "screen", x: NaN, y: 2 }).reason, "invalid_target");
    const resetInterrupted = gestures.playGesture("sad"); assert.equal((await gestures.playGesture("idle_reset")).status, "completed");
    assert.equal((await resetInterrupted).status, "interrupted"); assert.equal(gestures.sample().frame.gaze, undefined);
    const disposed = gestures.playGesture("nod"); gestures.dispose(); gestures.dispose();
    assert.equal((await disposed).reason, "disposed"); assert.equal((await gestures.playGesture("nod")).status, "failed"); assert.equal(c.timers.size, 0);

    // Renderer integration uses its original pre-Core hook. No extra RAF or
    // parameter-writing timer is allowed; gesture frames never own the mouth.
    let tick; const writes = [], values = new Map();
    const core = { setParameterValueById(id, value) { writes.push([id, value]); values.set(id, value); },
      addParameterValueById(id, value) { writes.push([id, value]); values.set(id, (values.get(id) || 0) + value); },
      multiplyParameterValueById() {}, setPartOpacityById() {} };
    const renderer = renderers.createRenderer({ state, host: c.host, lifecycle: { async load({ beforeCoreUpdate }) {
      tick = () => beforeCoreUpdate(() => core.setParameterValueById(mapping.params.mouthOpenY, state.avatarIntentOverrides.mouth.open));
      return { model: { internalModel: { coreModel: core, motionManager: { stopAllMotions() {} } } }, app: { view: canvas }, dispose() {} };
    } } });
    await renderer.load({ mapping });
    const mouthId = mapping.params.mouthOpen || mapping.params.mouthOpenY;
    for (const word of words) {
      const pending = renderer.playGesture(word), samples = [];
      const count = Math.ceil(mapping.gestureVocabulary[word].durationMs / 20) + 2;
      for (let i = 0; i < count; i++) {
        const mouth = { open: i % 2 ? .8 : .2, vowel: "a" };
        renderer.update({ mode: "speak", mouth }); c.advance(20); tick(); samples.push(values.get(mouthId));
        assert.deepEqual(state.avatarIntentOverrides.mouth, { ...mouth, vowel: mapping.capabilities?.vowels ? "a" : null }, "gesture ownership is temporary");
      }
      assert.equal((await pending).status, "completed"); assert.ok(Math.max(...samples) - Math.min(...samples) > .5, `${name}/${word} speech mouth continues`);
    }
    const last = renderer.playGesture("wave"); renderer.dispose(); assert.equal((await last).status, "interrupted");
  }
  for (const spec of [null, { durationMs: 900, keyframes: [null, { at: 1, values: {} }] },
    { durationMs: 900, keyframes: [{ at: 0, values: { mouth: 0 } }, { at: 1, values: { mouth: 0 } }] },
    { durationMs: 900, keyframes: [{ at: 0, values: { head: 0 } }, { at: 1, values: { head: 1 } }] }]) {
    const c = clock(), mapping = { params: { mouthOpen: "mouth", mouth: "mouth", head: "head" }, gestureVocabulary: { nod: spec } };
    const controller = api.create({ mapping, host: c.host });
    assert.equal((await controller.playGesture("nod")).reason, "invalid_mapping"); assert.equal(c.timers.size, 0);
  }
  console.log("Both models: all vocabulary, bounded lifecycle, cancellation, gaze, original-clock integration and speech ownership passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
