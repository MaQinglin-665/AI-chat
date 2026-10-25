"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { EventEmitter } = require("events");

// Load the actual shipped UMD bundle. Pixi stubs only support module registration;
// the getter under test is the real exported CubismModel implementation.
const PIXI = {
  utils: { EventEmitter }, Matrix: class {}, Transform: class {},
  Container: class extends EventEmitter {}, Point: class {}, Rectangle: class {}
};
const window = { PIXI, Live2DCubismCore: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../web/vendor/cubism4.min.js"), "utf8"),
  { PIXI, window, console }, { timeout: 5000 });
const model = Object.create(PIXI.live2d.CubismModel.prototype);
const oldOrders = new Int32Array([2, 0, 1]);
const newOrders = new Int32Array([1, 2, 0]);

model._model = { drawables: { renderOrders: oldOrders } };
assert.strictEqual(model.getDrawableRenderOrders(), oldOrders, "Core 4 keeps the original typed array");
model._model.renderOrders = newOrders;
assert.strictEqual(model.getDrawableRenderOrders(), oldOrders, "legacy field retains priority");

model._model = { drawables: {}, renderOrders: newOrders, offscreens: { count: 0 } };
assert.strictEqual(model.getDrawableRenderOrders(), newOrders, "Core 6 returns model-level render orders");
newOrders[0] = 0;
assert.strictEqual(model.getDrawableRenderOrders()[0], 0, "frame updates remain live, without copying");
model._model.offscreens.count = 1;
assert.throws(() => model.getDrawableRenderOrders(), /offscreen rendering is not supported/,
  "unsupported offscreen effects must not be silently rendered incorrectly");
assert.strictEqual(PIXI.live2d.VERSION, "0.4.0+ai-chat.core6.1");
console.log("Live2D shipped bundle: Core 4/6 render orders, legacy priority, live updates and unsupported-effect guard passed.");
