"use strict";
const assert = require("node:assert/strict");
const { createIntentDriver, poseAt, MOTION, QUALITY, pixelRatioFor, cameraFraming, hitSegments, randomAt } = require("../web/avatar/vrmRenderer.js");
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
driver.stopAction(); driver.update({now: 800}); assert.notEqual(nodes.rightUpperArm.rotation.z, poseAt(800).bones.rightUpperArm.z);
driver.update({now: 1100}); assert.equal(nodes.rightUpperArm.rotation.z, poseAt(1100).bones.rightUpperArm.z);
driver.playAction("nod"); driver.update({now: 1000}); driver.update({now: 1200}); assert.notEqual(nodes.head.rotation.x, 0);
driver.stopAction(); driver.update({now: 1300}); assert.notEqual(nodes.head.rotation.x, poseAt(1300).bones.head.x);
driver.update({now: 1600}); assert.equal(nodes.head.rotation.x, poseAt(1600).bones.head.x);
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
  assert.equal(rig.rightUpperArm.rotation.z, poseAt(0, {facing: version === "0" ? -1 : 1}).bones.rightUpperArm.z);
}
console.log("VRM intent mapping, missing expressions, actions and amplitude fallback passed (fake VRM only).");

// Every action returns to the same time-dependent standing pose, without drift.
for (const version of ["0", "1"]) for (const action of ["wave", "nod", "small_nod", "nod_double"]) {
  const make = () => Object.fromEntries(Object.keys(poseAt(0).bones).map(n => [n, {
    rotation: rotation(), position: rotation(0, 1, 0), scale: rotation(1, 1, 1)
  }]));
  const actual = make(), control = make();
  const model = rig => ({meta:{metaVersion:version}, humanoid:{getNormalizedBoneNode:n=>rig[n]}});
  const d = createIntentDriver(model(actual)), idle = createIntentDriver(model(control));
  d.update({now:0}); idle.update({now:0});
  assert(Math.abs(actual.rightUpperArm.rotation.z) > 65 * Math.PI / 180);
  assert(Math.abs(actual.rightUpperArm.rotation.z) < 75 * Math.PI / 180);
  assert.notEqual(actual.rightLowerArm.rotation.y, 0);
  assert.notEqual(actual.rightHand.rotation.z, 0);
  d.playAction(action); d.update({now:100}); d.update({now:500});
  assert(d.isAnimating());
  d.update({now:2200}); idle.update({now:2200});
  assert(!d.isAnimating());
  for (const n of Object.keys(actual)) for (const prop of ["rotation","position","scale"])
    for (const axis of ["x","y","z"]) assert.equal(actual[n][prop][axis], control[n][prop][axis]);
  d.playAction(action); d.update({now:2300}); d.stopAction(); d.update({now:2500}); idle.update({now:2500});
  for (const n of Object.keys(actual)) assert.equal(actual[n].rotation.z, control[n].rotation.z);
}
assert.deepEqual(poseAt(12345,{seed:42}), poseAt(12345,{seed:42}));
assert.notDeepEqual(poseAt(12345,{seed:42}), poseAt(12345,{seed:43}));
assert(poseAt(1000,{bodyEnvelope:1}).bones.spine.x > poseAt(1000,{bodyEnvelope:0}).bones.spine.x);
for (let i=1;i<100;i++) {
  const interval=MOTION.smallPeriod + MOTION.smallJitter*(randomAt(42,i*3)-randomAt(42,(i-1)*3));
  assert(interval>=8 && interval<=20);
}
for (const h of [0.5,1.6,2.4]) {
  const framing=cameraFraming(0,h);
  const tilt=Math.atan2(framing.cameraY-framing.targetY,framing.distance);
  const eyeAngle=Math.atan2(framing.cameraY-h*0.91,framing.distance);
  assert(framing.cameraY>h*0.91);
  assert(Math.abs(0.5-Math.tan(tilt-eyeAngle)/(2*Math.tan(27*Math.PI/360))-1/3)<1e-10);
}
for (const [w,h] of [[480,720],[1380,898],[1708,1068]]) {
  const ratio=pixelRatioFor(w,h,1.5);
  assert(w*h*ratio*ratio<=Math.max(QUALITY.pixelBudget,w*h)+1e-6);
  assert(ratio>=1); assert(ratio<=QUALITY.maxDpr);
}
assert(hitSegments(12,50,[{ax:10,ay:10,bx:10,by:90,radius:5}]));
assert(!hitSegments(20,50,[{ax:10,ay:10,bx:10,by:90,radius:5}]));
console.log("Standing pose, action recovery, deterministic motion, camera and constant-size hit tests passed.");

// Updated for the intended independent random idle layer; no model data.
const snapshot = poseAt(12345,{seed:42}).bones;
assert.deepEqual(Object.values(snapshot.head).map(v=>+v.toFixed(6)), [-0.010191,-0.253594,-0.012421,0,0,1]);
assert.deepEqual(Object.values(snapshot.hips).map(v=>+v.toFixed(6)), [0,0.261799,0.028146,0.013717,0.002311,1]);

const { smoothCutoutEdges } = require("../web/avatar/vrmRenderer.js");
const cutout={alphaTest:0.5,transparent:false}, outline={alphaTest:0.5,transparent:false,isOutline:true};
const blend={alphaTest:0.5,transparent:true}, opaque={alphaTest:0,transparent:false};
const scene={traverse:fn=>[{material:[cutout,outline]},{material:blend},{material:opaque},{}].forEach(fn)};
smoothCutoutEdges(scene,0); assert.equal(cutout.alphaToCoverage,undefined);
smoothCutoutEdges(scene,4);
assert.equal(cutout.alphaToCoverage,true);assert.equal(outline.alphaToCoverage,true);
assert.equal(blend.alphaToCoverage,undefined);assert.equal(opaque.alphaToCoverage,undefined);
assert.equal(outline.isOutline,true,'retain authored MToon outline');

const { STANCE, EXPRESSION, LIGHT, saccadeAt, gradeRoomMaterials } = require("../web/avatar/vrmRenderer.js");
assert.equal(poseAt(0).bones.hips.y,STANCE.yaw);
assert(poseAt(0).bones.leftIndexDistal.z < poseAt(0).bones.leftIndexProximal.z);
assert(poseAt(0).bones.leftShoulder.py<0);
assert(Math.abs(poseAt(0).bones.leftLowerArm.y) > Math.abs(poseAt(0).bones.rightLowerArm.y));
assert.deepEqual(saccadeAt(5,42),saccadeAt(5,42));
assert(saccadeAt(0).x===0);
driver.update({now:3000,face:"neutral"});assert.equal(values.relaxed,EXPRESSION.idleSmile);
driver.update({now:3050,face:"neutral",preparingSpeech:true});assert.equal(values.relaxed,EXPRESSION.preparingSmile);
assert.equal(frameFromState({conversationLastAssistantAt:1000},0,1100).preparingSpeech,true);
assert.equal(frameFromState({conversationLastAssistantAt:1000},0,9999).preparingSpeech,false);
const mat={isMToonMaterial:true,onBeforeCompile(){}};
const matScene={traverse:fn=>fn({material:mat})};
gradeRoomMaterials(matScene,LIGHT.pet);assert.equal(mat.needsUpdate,undefined);
gradeRoomMaterials(matScene,LIGHT.room);const shader={fragmentShader:"#include <tonemapping_fragment>"};mat.onBeforeCompile(shader);
assert(shader.fragmentShader.includes("0.8600"));assert(shader.fragmentShader.includes("#include <tonemapping_fragment>"));
