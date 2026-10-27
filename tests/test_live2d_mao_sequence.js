"use strict";
// Immutable main sources are the oracle. Compare full ordered calls and every
// parameter/part, without tolerances. Real Core/Mao is additional local evidence;
// CI always runs the resource-free protocol comparison, never downloads models.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const crypto = require("node:crypto"), { EventEmitter } = require("node:events");
const repo = path.resolve(__dirname, ".."), reference = path.join(__dirname, "fixtures/mao-before-effects");
const provenance = require("./fixtures/mao-before-effects/provenance.json");
for (const [name, hash] of Object.entries(provenance.sha256)) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(reference, name))).digest("hex"), hash);
const before = require("./fixtures/mao-before-effects/live2dModelDriver.js"), after = require("../web/avatar/live2dModelDriver.js");
const oldMapping = require("./fixtures/mao-before-effects/mao.json"), newMapping = require("../web/avatar/mappings/mao.json");
function protocolCore() {
  const values = new Map(), parts = new Map();
  return { setParameterValueById(id, v, w = 1) { values.set(id, (values.get(id) || 0) * (1 - w) + v * w); },
    addParameterValueById(id, v) { values.set(id, (values.get(id) || 0) + v); },
    multiplyParameterValueById(id, v) { values.set(id, (values.get(id) || 0) * v); },
    setPartOpacityById(id, v) { parts.set(id, v); }, reset() { values.clear(); parts.clear(); },
    snapshot() { return { values: [...values], parts: [...parts] }; } };
}
function compare(makeCore, expressions, label) {
  let time = 1000, calls = 0;
  const pair = [[before, oldMapping], [after, newMapping]].map(([api, mapping]) => {
    const core = makeCore(), writes = [];
    for (const name of ["setParameterValueById", "setParameterValueByIndex", "addParameterValueById", "addParameterValueByIndex", "multiplyParameterValueById", "multiplyParameterValueByIndex", "setPartOpacityById", "setPartOpacityByIndex"]) {
      if (!core[name]) continue;
      const original = core[name]; core[name] = function (...args) { writes.push([name, ...args]); return original.apply(this, args); };
    }
    const model = { internalModel: { coreModel: core, motionManager: { stopAllMotions() { writes.push(["stopAllMotions"]); } } },
      motion(...args) { writes.push(["motion", ...args]); return Promise.resolve(true); } };
    return { core, writes, driver: api.create({ mapping, model, expressions, now: () => time }) };
  });
  const faces = Object.keys(oldMapping.faces), vowels = ["a", "i", "u", "e", "o", null];
  const gestures = [null, ...Object.keys(oldMapping.speechGesturePoses)], actions = Object.keys(oldMapping.actions);
  try {
    for (let i = 0; i < 1440; i++) {
      time += 1000 / 60;
      const frame = { face: faces[i % faces.length], faceIntensity: [0, .5, 1][i % 3],
        mouth: { open: i % 23 < 4 ? 0 : (i % 17) / 16, vowel: vowels[i % vowels.length] },
        mode: ["idle", "listen", "think", "speak"][i % 4], delivery: Object.keys(oldMapping.deliveryPoses)[i % 12],
        deliveryIntensity: (i % 5) / 4, gaze: i % 3 ? { x: Math.sin(i), y: Math.cos(i) } : null,
        blinkSuppressed: i % 7 === 0, breath: (i % 9) / 8, energy: (i % 11) / 10,
        speechGesture: gestures[i % gestures.length] ? { name: gestures[i % gestures.length], phase: (i % 61) / 60 } : null };
      const snapshots = pair.map(item => {
        item.writes.length = 0; item.core.reset();
        if (i % 120 === 0) item.driver.playAction(actions[(i / 120) % actions.length]);
        if (i % 131 === 0) item.driver.stopAction();
        item.driver.update(frame);
        return { writes: item.writes.slice(), ...item.core.snapshot() };
      });
      assert.deepStrictEqual(snapshots[1], snapshots[0], `${label}: complete sequence/snapshot frame ${i}`);
      calls += snapshots[0].writes.length;
    }
    console.log(`${label}: exact1440 frames/${calls} calls and full parameter/part snapshots`);
  } finally { pair.forEach(item => item.driver.dispose()); pair.forEach(item => item.core.release?.()); }
}
(async () => {
  compare(protocolCore, { exp_02: { Parameters: [{ Id: "ParamCheek", Blend: "Add", Value: .5 }, { Id: "ParamEyeLOpen", Blend: "Multiply", Value: .6 }, { Id: "ParamMouthUp", Blend: "Overwrite", Value: .3 }] } }, "CI protocol");
  const mocFile = path.join(repo, "models_local/Mao/Mao.moc3");
  if (!fs.existsSync(mocFile)) { console.log("[LOCAL ONLY] Real Core/Mao comparison requires the user's local official model; protocol comparison passed."); return; }
  const coreFile = path.join(repo, "web/vendor/live2dcubismcore.min.js"), context = { console, require, process, Buffer, TextDecoder, TextEncoder, WebAssembly, setTimeout, clearTimeout, __dirname: path.dirname(coreFile) };
  vm.createContext(context); vm.runInContext(fs.readFileSync(coreFile, "utf8"), context);
  const core = context.Live2DCubismCore;
  for (let i = 0; ; i++) { try { assert.equal(core.Version.csmGetVersion(), 100663297); break; } catch (e) { if (i === 500) throw e; await new Promise(r => setTimeout(r, 10)); } }
  const PIXI = { utils: { EventEmitter }, Matrix: class {}, Transform: class {}, Container: class extends EventEmitter {}, Point: class {}, Rectangle: class {} };
  vm.runInNewContext(fs.readFileSync(path.join(repo, "web/vendor/cubism4.min.js"), "utf8"), { PIXI, window: { PIXI, Live2DCubismCore: core }, console, Live2DCubismCore: core });
  const bytes = fs.readFileSync(mocFile), moc = core.Moc.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const modelRoot = path.dirname(mocFile), manifest = JSON.parse(fs.readFileSync(path.join(modelRoot, "Mao.model3.json")));
  const expressions = Object.fromEntries(manifest.FileReferences.Expressions.map(item => [item.Name, JSON.parse(fs.readFileSync(path.join(modelRoot, item.File)))]));
  try { compare(() => {
    const model = core.Model.fromMoc(moc), wrapped = new PIXI.live2d.CubismModel(model); wrapped.initialize();
    wrapped.reset = () => { model.parameters.values.set(model.parameters.defaultValues); model.parts.opacities.fill(1); };
    wrapped.snapshot = () => ({ values: Array.from(model.parameters.values), parts: Array.from(model.parts.opacities) });
    wrapped.release = () => model.release(); return wrapped;
  }, expressions, "Local real Core6/Mao"); } finally { moc._release(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
