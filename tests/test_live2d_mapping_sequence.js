"use strict";
// The reference files are byte-for-byte sources from b39ab99, never a rewritten
// expected-value algorithm. Both sides execute against the same shipped Core6
// WASM and pixi-live2d-display CubismModel. Compare every call and frame exactly.
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
const { createRequire } = require("node:module"), { EventEmitter } = require("node:events");
const repo = path.resolve(__dirname, "..");
const reference = path.join(__dirname, "fixtures/live2d-before-mapping");
const provenance = require("./fixtures/live2d-before-mapping/provenance.json");
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
for (const [file, hash] of Object.entries(provenance.sha256)) assert.equal(digest(fs.readFileSync(path.join(reference, file))), hash, `reference changed: ${file}`);
const coreFile = path.join(repo, "web/vendor/live2dcubismcore.min.js");
assert.equal(digest(fs.readFileSync(coreFile)), provenance.coreSha256);
async function loadCore() {
  const context = { console, require, process, Buffer, TextDecoder, TextEncoder, WebAssembly, setTimeout, clearTimeout,
    __dirname: path.dirname(coreFile) };
  vm.createContext(context); vm.runInContext(fs.readFileSync(coreFile, "utf8"), context, { filename: "Core6.js" });
  const core = context.Live2DCubismCore;
  const deadline = Date.now() + 5000;
  for (;;) {
    try { assert.equal(core.Version.csmGetVersion(), 100663297); return core; }
    catch (error) { if (Date.now() >= deadline) throw error; await new Promise(resolve => setTimeout(resolve, 10)); }
  }
}
function loadModule(file, window, math) {
  const context = { window, console, Math: math, Date, module: { exports: {} }, require: createRequire(file), setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  return context.module.exports;
}
async function harness(core, CubismModel, before) {
  let now = 1000, seed = 9173;
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const callbacks = [];
  const ticker = { deltaMS: 1000 / 60, add(fn, _, priority = 0) { callbacks.push({ fn, priority }); }, remove(fn) { const i = callbacks.findIndex(entry => entry.fn === fn); if (i >= 0) callbacks.splice(i, 1); } };
  const canvas = { getBoundingClientRect: () => ({ width: 1280, height: 720 }) };
  const document = { body: { dataset: {} }, getElementById: id => id === "live2d-canvas" ? canvas : null };
  const window = { document, performance: { now: () => now }, setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, removeEventListener() {} };
  const source = before ? reference : path.join(repo, "web");
  const director = loadModule(path.join(source, "hiyoriPerformanceDirector.js"), window, math);
  const expression = loadModule(path.join(source, "live2dExpressionController.js"), window, math);
  const bytes = fs.readFileSync(path.join(repo, "web/models/hiyori_pro_t11/hiyori_pro_t11.moc3"));
  const moc = core.Moc.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const model = core.Model.fromMoc(moc), wrapped = new CubismModel(model); wrapped.initialize();
  let writes = [];
  for (const name of ["addParameterValueByIndex", "addParameterValueById", "setParameterValueByIndex", "setParameterValueById", "multiplyParameterValueByIndex", "multiplyParameterValueById", "setPartOpacityById", "setPartOpacityByIndex", "update"]) {
    if (typeof wrapped[name] !== "function") continue;
    const original = wrapped[name];
    wrapped[name] = function (...args) { writes.push([name, ...args]); return original.apply(this, args); };
  }
  const display = { internalModel: { coreModel: wrapped }, scale: {}, update(delta) {
    writes.push(["model.update", delta]); model.parameters.values.set(model.parameters.defaultValues); wrapped.update();
  } };
  window.PIXI = { UPDATE_PRIORITY: { HIGH: 25 }, Application: class {
    constructor() { this.ticker = ticker; this.stage = { addChild() {} }; this.view = canvas; } destroy() {}
  }, live2d: { Live2DModel: { from: async () => display } } };
  window.Live2DCubismCore = core;
  // The naturalization overlay is intentionally different. Compare the original
  // ordered writes with that optional layer explicitly OFF; never update fixtures.
  const state = { live2dNaturalMotionEnabled: false, uiView: "full", baseTransform: { y: 0, rotation: 0 }, availableMotionGroups: [], config: { model_path: "/models/hiyori_pro_t11/hiyori_pro_t11.model3.json" },
    modelProfileName: "hiyori_pro_t11", ttsPlaybackGeneration: 1, expressionEnabled: true, motionEnabled: true,
    ttsAudioLevel: 0, speechMouthOpen: 0, expressionStrength: 1, currentTalkStyle: "neutral" };
  let speaking = false;
  const controller = expression.createController({ state, windowObject: window, performanceObject: window.performance,
    hiyoriPerformanceDirector: director, isSpeakingNow: () => speaking, isSpeechMotionActive: () => speaking });
  const runtime = loadModule(path.join(source, "live2dRuntimeController.js"), window, math).createController({ state, windowObject: window, documentObject: document,
    consoleObject: { log() {}, error: console.error }, performanceObject: window.performance,
    applyStyleExpressionLayer: controller.applyStyleExpressionLayer, updateMicroMotionLayer: controller.updateMicroMotionLayer });
  await runtime.initLive2D();
  assert.equal(document.body.dataset.avatarReady, "true");
  assert.equal(callbacks.filter(entry => entry.priority === 25).length, 1, "exactly one original Pixi HIGH model callback");
  return { state, controller, director, step(input, frameIndex) {
    now += input.dt || 1000 / 60;
    speaking = !!input.speaking;
    Object.assign(state, input.state || {});
    state.ttsAudioLevel = speaking && frameIndex % 60 < 20 ? 0.85 : 0;
    if (input.begin && frameIndex === 0) controller.beginSpeechAnimation("A question, a pause, and an answer!", input.mood || "idle", "neutral",
      { durationMs: 30000, performanceCue: { emotion: input.begin, action: "none", speech: { holdMs: 500 } } });
    if (input.action && frameIndex === 0) controller.triggerSemanticAction(input.action, { now, force: true });
    if (input.mode) controller.requestPerformanceMode(input.mode, { now, holdMs: 100 });
    if (input.stop && frameIndex === 0) controller.endSpeechAnimation();
    if (input.finish && frameIndex === 0) controller.finishSpeechAnimation();
    writes = [];
    ticker.deltaMS = input.dt || 1000 / 60;
    for (const { fn } of [...callbacks].sort((a, b) => b.priority - a.priority)) fn();
    return { writes, values: Array.from(model.parameters.values), parts: Array.from(model.parts.opacities) };
  }, dispose() { state.avatarRuntime?.dispose(); model.release(); moc._release(); } };
}
(async () => {
  const core = await loadCore();
  const PIXI = { utils: { EventEmitter }, Matrix: class {}, Transform: class {}, Container: class extends EventEmitter {}, Point: class {}, Rectangle: class {} };
  vm.runInNewContext(fs.readFileSync(path.join(repo, "web/vendor/cubism4.min.js"), "utf8"), { PIXI, window: { PIXI, Live2DCubismCore: core }, console, Live2DCubismCore: core });
  const old = await harness(core, PIXI.live2d.CubismModel, true), current = await harness(core, PIXI.live2d.CubismModel, false);
  const cases = [
    ["idle", 540, {}], ["listen", 100, { mode: "listen" }], ["think", 100, { mode: "think", state: { chatBusy: true } }],
    ...["neutral", "happy", "playful", "excited", "shy", "hurt", "sad", "anxious", "angry", "surprised", "serious", "thinking"].map(begin => [begin, 95, { begin, speaking: true, state: { chatBusy: false } }]),
    ["silence", 100, { speaking: false }], ["interrupt", 100, { stop: true }],
    ["resume", 100, { begin: "playful", speaking: true, state: { ttsPlaybackGeneration: 2 } }],
    ["authored ownership", 100, { speaking: true, state: { hiyoriAuthoredMotionUntil: 999999, hiyoriAuthoredMotion: { playbackGeneration: 2 } } }],
    ["generation invalidation", 100, { speaking: true, state: { ttsPlaybackGeneration: 3 } }],
    ["finish", 100, { finish: true, state: { hiyoriAuthoredMotionUntil: 0 } }],
    ...Object.keys(old.director.ACTION_SPECS).map(action => [action, 180, { action }]),
    ["drag", 20, { state: { dragData: {} } }], ["drag release", 50, { state: { dragData: null } }],
    ["window drag", 20, { state: { windowDragActive: true } }], ["release", 50, { state: { windowDragActive: false } }],
    ["low", 100, { speaking: true, begin: "excited", state: { motionIntensity: "low" } }],
    ["high", 100, { speaking: true, begin: "excited", state: { motionIntensity: "high" } }],
    ["detached", 100, { speaking: true, state: { uiView: "model" } }],
    ["disabled", 20, { state: { expressionEnabled: false } }]
  ];
  let frames = 0, writes = 0;
  try {
    for (const [name, count, input] of cases) for (let index = 0; index < count; index++) {
      const a = old.step(input, index), b = current.step(input, index);
      assert.deepStrictEqual(b, a, `EXACT complete sequence/snapshot mismatch at ${name}/${index}`);
      frames++; writes += a.writes.length;
    }
  } finally { old.dispose(); current.dispose(); }
  console.log(`Core6 exact ordered writes and parameter/part snapshots passed: ${frames} frames, ${writes} calls, ${cases.length} scenarios.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
