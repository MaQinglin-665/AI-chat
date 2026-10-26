"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const room = require("../web/avatar/vrmScene.js");
assert.deepEqual(room.layout(216), room.layout(216));
assert.notDeepEqual(room.layout(216), room.layout(217));
const data = room.layout();
assert.deepEqual(room.FURNITURE.shelf.size, [1.05, 1.8, 0.32]);
assert.equal(room.FURNITURE.lamp.size[1], 1.5);
assert.equal(room.FURNITURE.lamp.size[0], 0.35);
assert.deepEqual(room.FURNITURE.window.size.slice(0, 2), [1.2, 1.4]);
assert.equal(room.FURNITURE.window.sill, 0.9);
for (const item of data.items.filter(i => i.id.startsWith("book-"))) {
  assert(item.size[1] >= 0.2 && item.size[1] <= 0.28);
  assert(item.position[2] < -1.5);
}
for (const item of data.items.filter(i => /^(shelf|lamp)-/.test(i.id))) {
  assert(Math.abs(item.position[0]) - item.size[0] / 2 > 0.7, "keep the head backdrop clear");
  assert(item.position[2] <= -1.5 && item.position[2] >= -3);
}
assert(data.items.filter(i => i.blossom).every(i => i.position[2] < -6 && i.color === 0xffb7cf));
assert(room.LIGHTS.day.ambient > room.LIGHTS.night.ambient * 2);
assert.equal(new Set(data.items.map(i => i.id)).size, data.items.length);
for (const item of data.items) for (let axis = 0; axis < 3; axis++) {
  assert(item.size[axis] > 0);
  assert(item.position[axis] - item.size[axis] / 2 >= data.bounds.min[axis] - 1e-8, item.id);
  assert(item.position[axis] + item.size[axis] / 2 <= data.bounds.max[axis] + 1e-8, item.id);
}
assert.notDeepEqual(room.LIGHTS.day, room.LIGHTS.night);
assert.equal(room.LIGHTS.day.warm, 0);
assert.equal(room.enabled("full"), true);
assert.equal(room.enabled("full", "none"), false);
assert.equal(room.enabled("model", "room"), false);
const blend = room.transition("night");
assert.equal(blend("day", 0), 0);
assert.equal(blend("day", 1250), 0.5);
assert.equal(blend("day", 2500), 1);
assert.equal(blend("night", 3000), 1);
assert.equal(blend("night", 5500), 0);
// Actual pinned Three geometry/resource lifecycle, without a WebGL context or any asset requests.
const sandbox = { console, AbortController };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../web/vendor/vrm/vrm-vendor.js"), "utf8"), sandbox);
const T = sandbox.XinyuVRMVendor.THREE;
const scene = new T.Scene();
const originalFog = new T.Fog(0xffffff, 1, 3), background = new T.Color(0x112233);
scene.fog = originalFog; scene.background = background;
for (let cycle = 0; cycle < 10; cycle++) {
  const instance = room.create({ THREE: T, scene, height: cycle % 2 ? 1.5 : 1.8 });
  const group = scene.children.find(n => n.isGroup);
  assert.equal(group.scale.x, 1, "furniture metres must not scale with avatar height");
  const resources = new Set();
  scene.traverse(node => {
    if (node.isInstancedMesh) resources.add(node);
    if (node.geometry) resources.add(node.geometry);
    for (const mat of [].concat(node.material || [])) {
      resources.add(mat); for (const value of Object.values(mat)) if (value?.isTexture) resources.add(value);
    }
  });
  let disposed = 0;
  for (const value of resources) value.addEventListener("dispose", () => disposed++);
  instance.update("day", 100); instance.update("day", 2600);
  assert.equal(instance.metrics().day, 1);
  assert.equal(scene.children.filter(n => n.isPointLight).length, 3);
  assert(scene.children.filter(n => n.isPointLight).every(n => n.intensity === 0));
  instance.dispose(); instance.dispose();
  assert.equal(disposed, resources.size);
  assert.equal(instance.metrics().resources, 0);
  assert.equal(scene.children.length, 0); assert.equal(scene.fog, originalFog); assert.equal(scene.background, background);
}
const source = fs.readFileSync(path.join(__dirname, "../web/avatar/vrmScene.js"), "utf8");
assert(!/\b(fetch|XMLHttpRequest|WebSocket|require|import|TextureLoader|FileLoader)\s*\(/.test(source));
assert(!/https?:|file:/.test(source));
const renderer = fs.readFileSync(path.join(__dirname, "../web/avatar/vrmRenderer.js"), "utf8");
assert(/if \(useRoom\)\s*\{?\s*room = roomModule.create/.test(renderer));
assert(renderer.includes('dataset.stageRoom')); // consume the existing controller's decision
const { gradeRoomMaterials, LIGHT } = require("../web/avatar/vrmRenderer.js");
const originalCompile = () => {}, originalKey = () => "original";
const shared = { isMToonMaterial: true, onBeforeCompile: originalCompile, customProgramCacheKey: originalKey };
const restoreGrade = gradeRoomMaterials({ traverse(fn) { fn({ material: shared }); fn({ material: shared }); } }, LIGHT.room);
restoreGrade(); assert.equal(shared.onBeforeCompile, originalCompile); assert.equal(shared.customProgramCacheKey, originalKey);
console.log("[OK] Seeded room bounds, day/night transition, batching and ten-cycle disposal.");

(async () => {
  const { createRenderer } = require("../web/avatar/vrmRenderer.js");
  let created = 0, released = 0;
  class FakeRenderer {
    constructor() { this.shadowMap = {}; }
    setClearColor() {} setPixelRatio() {} dispose() {} forceContextLoss() {}
    getContext() { return { SAMPLES: 1, getParameter: () => 4 }; }
  }
  const vendor = { THREE: { ...T, WebGLRenderer: FakeRenderer },
    GLTFLoader: class {
      register() {}
      async parseAsync() {
        const model = new T.Group(); model.add(new T.Mesh(new T.BoxGeometry(0.5, 1.6, 0.3), new T.MeshBasicMaterial()));
        return { userData: { vrm: { scene: model, humanoid: { getNormalizedBoneNode: () => null } } } };
      }
    }, VRMLoaderPlugin: class {}, VRMUtils: { rotateVRM0() {}, deepDispose(model) {
      model.traverse(n => { n.geometry?.dispose(); n.material?.dispose(); });
    } } };
  const roomModule = { enabled: room.enabled, create() { created++; return { dispose() { released++; } }; } };
  const make = view => createRenderer({ view, vendor, roomModule, canvas: { clientWidth: 800, clientHeight: 600 },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) });
  const full = make("full"); await full.load({ scene: "none" }); assert.equal(created, 0);
  full.setScene("room"); assert.equal(created, 1);
  full.setScene("none"); assert.equal(released, 1);
  await full.load({}); assert.equal(created, 2); full.dispose(); assert.equal(released, 2);
  const pet = make("model"); await pet.load({ scene: "room" }); assert.equal(created, 2); pet.dispose();
  const alternate = make("full"); await alternate.load({ scene: "handpainted" }); assert.equal(created, 3); alternate.setScene("none"); assert.equal(released, 3); alternate.dispose();
  console.log("[OK] Renderer room gate: defaults, none, transparent pet and disposal.");
})().catch(error => { console.error(error); process.exitCode = 1; });
