"use strict";
const assert = require("node:assert/strict");
const { createIntentDriver } = require("../web/avatar/vrmRenderer.js");
const { frameFromState, formatConditions } = require("../web/avatar/avatarRuntime.js");
const values = {};
function rotation(x = 0, y = 0, z = 0) { return { x, y, z,
  clone() { return rotation(this.x, this.y, this.z); }, copy(r) { Object.assign(this, {x:r.x, y:r.y, z:r.z}); } }; }
const nodes = Object.fromEntries(["head", "chest", "spine", "leftUpperArm", "rightUpperArm", "rightLowerArm", "rightHand"].map(n => [n, {rotation: rotation()}]));
const names = new Set(["aa", "ih", "ou", "ee", "oh", "happy", "sad", "angry", "relaxed", "blink"]);
let updates = 0;
const vrm = { expressionManager: {getExpression: n => names.has(n), setValue: (n, v) => { assert(names.has(n)); values[n] = v; }},
  humanoid: {getNormalizedBoneNode: n => nodes[n]}, update: delta => { assert(delta >= 0 && delta <= 0.05); updates++; } };
const driver = createIntentDriver(vrm);
driver.update({now: 0, face: "happy", faceIntensity: 0.7, mouth: {open: 0.8, vowel: null}});
assert.equal(values.happy, 0.7); assert.equal(values.aa, 0.8);
for (const [vowel, name] of Object.entries({a:"aa", i:"ih", u:"ou", e:"ee", o:"oh"})) {
  driver.update({now: 16, mouth: {open: 0.5, vowel}}); assert.equal(values[name], 0.5);
  for (const other of ["aa", "ih", "ou", "ee", "oh"].filter(n => n !== name)) assert.equal(values[other], 0);
}
driver.update({face: "thinking", faceIntensity: 0.4}); assert.equal(values.relaxed, 0.4);
assert.doesNotThrow(() => driver.update({face: "surprised", mouth: {open: 1, vowel: "unknown"}, speechGesture: {name:"unknown"}}));
assert.doesNotThrow(() => driver.update({face: "unknown", mode: "unknown", delivery: "unknown"}));
assert.doesNotThrow(() => driver.update({face: "constructor", mouth: {open:1, vowel:"__proto__"}}));
assert.equal(formatConditions({allowRedistribution:false, creditNotation:"required"}), "再分发：不允许\n署名要求：必须署名");
assert(formatConditions({otherLicenseUrl:"https://hub.vroid.com/license?redistribution=disallow&credit=necessary"}).includes("再分发：不允许"));
assert(!formatConditions({otherLicenseUrl:"https://untrusted.example/license?redistribution=allow"}).includes("再分发：允许"));
assert.equal(driver.playAction("unknown"), false);
assert.equal(driver.playAction("wave"), true);
driver.update({now: 100}); driver.update({now: 700});
assert.notEqual(nodes.rightUpperArm.rotation.z, 1.15);
driver.stopAction(); driver.update({now: 800}); assert.equal(nodes.rightUpperArm.rotation.z, 1.15);
driver.playAction("nod"); driver.update({now: 1000}); driver.update({now: 1200}); assert.notEqual(nodes.head.rotation.x, 0);
driver.stopAction(); driver.update({now: 1300}); assert.equal(nodes.head.rotation.x, 0);
assert(!driver.capabilities().faces.includes("surprised")); assert(driver.capabilities().vowels);
assert.equal(frameFromState({uiView:"model", _broadcastSpeechUpdatedAt:100, ttsAudioLevel:0.8}, 200).mouth.open, 0.8);
assert.equal(frameFromState({uiView:"model", _broadcastSpeechUpdatedAt:100, ttsAudioLevel:0.8}, 1200).mouth.open, 0);
assert.equal(frameFromState({ttsAudioLevel:0.6}, 200).mouth.vowel, null);
assert(updates > 0);
// VRM0 and VRM1 normalized rigs use opposite local facing conventions.
for (const version of ["0", "1"]) {
  const rig = Object.fromEntries(Object.keys(nodes).map(n => [n, { rotation: rotation() }]));
  const d = createIntentDriver({ ...vrm, meta: {metaVersion: version}, humanoid: {getNormalizedBoneNode:n=>rig[n]} });
  d.update({now:0});
  assert.equal(rig.rightUpperArm.rotation.z, version === "0" ? -1.15 : 1.15);
}
console.log("VRM intent mapping, missing expressions, actions and amplitude fallback passed (fake VRM only).");
