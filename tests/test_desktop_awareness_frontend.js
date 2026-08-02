"use strict";

const assert = require("assert");
const { createController } = require("../web/autoChatController.js");

const state = {};
const controller = createController({
  state,
  windowObject: {
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout
  },
  documentObject: {}
});

const baseline = new Array(144).fill(10);
const tinyChange = baseline.slice();
tinyChange[0] = 11;
const sceneChange = baseline.map((value, index) => index < 50 ? value + 8 : value);

assert.strictEqual(controller.desktopFingerprintChanged(baseline, tinyChange), false);
assert.strictEqual(controller.desktopFingerprintChanged(baseline, sceneChange), true);
assert.strictEqual(controller.desktopFingerprintChanged(null, sceneChange), false);

console.log("[OK] autonomous desktop awareness frontend tests");
