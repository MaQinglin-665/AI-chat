"use strict";
const assert = require("node:assert/strict");
const estimator = require("../web/avatar/vowelEstimator.js");
const mapping = require("../web/avatar/mappings/mao.json");
const driverApi = require("../web/avatar/live2dModelDriver.js");
const runtime = require("../web/avatar/avatarRuntime.js");
const assets = require("../web/avatar/live2dAssets.js");
const rendererApi = require("../web/avatar/live2dRenderer.js");
function spectrum(f1, f2) {
  return Uint8Array.from({ length: 512 }, (_, i) => 15 + 180 * Math.exp(-(((i * 16000 / 1024 - f1) / 75) ** 2))
    + 140 * Math.exp(-(((i * 16000 / 1024 - f2) / 90) ** 2)));
}
(async () => {
  for (const [vowel, [f1, f2]] of Object.entries({ a: [800,1250], i: [300,2300], u: [350,750], e: [500,1900], o: [500,1000] })) {
    assert.equal(estimator.estimate(spectrum(f1, f2), 16000, 1024, .1).vowel, vowel);
    assert.equal(estimator.estimate(spectrum(f1, f2), 16000, 1024, 0).vowel, null);
  }
  assert.equal(estimator.estimate(new Uint8Array(512).fill(180), 16000, 1024, .1).vowel, null);
  assert.equal(estimator.estimate(spectrum(400,875), 16000, 1024, .1).vowel, null, "ambiguous u/o falls back");
  assert.equal(estimator.estimate([], NaN, 0, .2).vowel, null);
  const audio = {}, analyser = { frequencyBinCount: 512, fftSize: 1024, context: { sampleRate: 16000 }, getByteFrequencyData(out) { out.set(spectrum(800,1250)); } };
  estimator.sample(audio, analyser, .1, 100, 50); assert.equal(audio.ttsVowel, null);
  estimator.sample(audio, analyser, .1, 160, 50); assert.equal(audio.ttsVowel, "a");
  estimator.sample(audio, analyser, 0, 180, 50); assert.equal(audio.ttsVowel, null);
  assert.equal(runtime.frameFromState({ ttsAudioLevel: .8, ttsVowel: "i" }, 123).mouth.vowel, "i");
  assert.equal(runtime.frameFromState({ uiView: "model", ttsAudioLevel: .8, ttsVowel: "i", _broadcastSpeechUpdatedAt: 1 }, 2000).mouth.vowel, null);
  const writes = [], native = [];
  const core = Object.fromEntries(["setParameterValueById", "addParameterValueById", "multiplyParameterValueById", "setPartOpacityById"].map(name => [name, (...args) => writes.push([name,...args])]));
  const model = { internalModel: { coreModel: core, motionManager: { stopAllMotions() { native.push("stop"); } } }, motion(...args) { native.push(args); } };
  const driver = driverApi.create({ mapping, model, expressions: { exp_02: { Parameters: [{ Id: "from-official-expression", Value: 1, Blend: "Add" }] } }, now: () => 1000 });
  for (const vowel of ["a", "i", "u", "e", "o", null]) {
    writes.length = 0; driver.update({ mouth: { open: .8, vowel } });
    for (const [name, id] of Object.entries(mapping.params.vowels)) assert.ok(writes.some(([method, key, value]) => method === "setParameterValueById" && key === id && value === ((vowel || "a") === name ? .8 : 0)));
  }
  writes.length = 0; driver.update({ face: "happy", faceIntensity: .5, speechGesture: { name: "wave", phase: .5 } });
  assert.ok(writes.some(([,id,value]) => id === "from-official-expression" && value === .5));
  assert.ok(writes.some(([method,id]) => method === "setPartOpacityById" && id === mapping.parts.armRA));
  assert.equal(driver.playAction("unknown"), false);
  for (const name of Object.keys(mapping.actions)) assert.equal(driver.playAction(name), true);
  assert.equal(native.length, 8); driver.stopAction(); assert.equal(native.at(-1), "stop");
  assert.doesNotThrow(() => driver.update({ face: "unknown", speechGesture: { name: "unknown", phase: .5 } }));
  const manifest = { FileReferences: { Moc: "Mao.moc3", Textures: ["texture.png"], Expressions: [{ Name: "exp_02", File: "face.exp3.json" }], Motions: { Idle: [{ File: "idle.motion3.json", Sound: "private.wav" }] } } };
  const requested = [], revoked = []; let created = 0;
  const host = { location: { origin: "http://127.0.0.1" }, URL: class extends URL {
    static createObjectURL() { return `blob:${++created}`; } static revokeObjectURL(url) { revoked.push(url); }
  }, async authFetch(url) { requested.push(url); return { ok: true, json: async () => structuredClone(manifest), blob: async () => new Blob([JSON.stringify({ Parameters: [] })]) }; } };
  const prepared = await assets.prepare("/api/avatar/live2d/Mao.model3.json", host);
  assert.equal(prepared.settings.FileReferences.Moc, "blob:1"); assert.ok(prepared.expressions.exp_02);
  assert.equal(requested.length, 5); assert.equal(prepared.settings.FileReferences.Motions.Idle[0].Sound, undefined);
  prepared.dispose(); prepared.dispose(); assert.equal(revoked.length, 4);
  host.authFetch = async url => ({ ok: !url.endsWith("texture.png"), json: async () => structuredClone(manifest), blob: async () => new Blob(["x"]) });
  await assert.rejects(assets.prepare("/api/avatar/live2d/Mao.model3.json", host));
  assert.equal(revoked.length, 5, "partial load releases earlier object URL");
  // Cancelling a configuration load must never report a ready renderer.
  // Exercise both asynchronous boundaries without requiring model resources.
  const cancelledBeforeMapping = rendererApi.createRenderer({ state: {}, lifecycle: {
    load() { throw Error("cancelled mapping must not start model loading"); }
  } });
  const earlyLoad = cancelledBeforeMapping.load({ mapping });
  cancelledBeforeMapping.dispose();
  assert.equal(await earlyLoad, false, "disposed during mapping load is an explicit failure");
  const cancelledBeforeDefaultReady = rendererApi.createRenderer({ state: {}, lifecycle: {
    load() { throw Error("cancelled readiness must not start model loading"); }
  } });
  const readyLoad = cancelledBeforeDefaultReady.load({ mapping });
  await Promise.resolve(); cancelledBeforeDefaultReady.dispose();
  assert.equal(await readyLoad, false, "disposed while awaiting default mapping readiness");
  let finish, started, disposed = 0, driverCreated = 0;
  const loading = new Promise(resolve => { started = resolve; });
  const cancelledDuringModel = rendererApi.createRenderer({ state: {}, host: {
    XinyuLive2DModelDriver: { create() { driverCreated++; throw Error("must not create a cancelled driver"); } }
  }, lifecycle: { load() { started(); return new Promise(resolve => { finish = resolve; }); } } });
  const lateLoad = cancelledDuringModel.load({ mapping });
  await loading; cancelledDuringModel.dispose(); cancelledDuringModel.dispose();
  finish({ model: {}, dispose() { disposed++; } });
  assert.equal(await lateLoad, false, "late resource completion cannot revive disposed renderer");
  assert.equal(driverCreated, 0); assert.equal(disposed, 1, "late resources released exactly once");
  console.log("[OK] Mao vowels, mapped expressions/actions/arms, silence/latency and authenticated resources");
})().catch(error => { console.error(error); process.exitCode = 1; });
