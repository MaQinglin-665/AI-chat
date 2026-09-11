#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const root = path.resolve(__dirname, "..");
const runtimeModule = require(path.join(root, "web", "live2dRuntimeController.js"));
const expressionModule = require(path.join(root, "web", "live2dExpressionController.js"));

async function run() {
  let applicationOptions = null;
  let modelLoadOptions = null;
  const tickerCallbacks = [];
  const ticker = {
    deltaMS: 16.67,
    FPS: 60,
    maxFPS: 0,
    minFPS: 0,
    speed: 0,
    add(callback, context, priority) {
      tickerCallbacks.push({ callback, context, priority });
    }
  };
  const stageChildren = [];
  class FakeApplication {
    constructor(options) {
      applicationOptions = options;
      this.ticker = ticker;
      this.stage = { addChild: (model) => stageChildren.push(model) };
      this.renderer = { width: 1280, height: 720, resolution: 1 };
      this.view = { getBoundingClientRect: () => ({ width: 1280, height: 720 }) };
    }
  }
  const updateDeltas = [];
  const model = {
    autoUpdate: true,
    width: 420,
    height: 700,
    x: 0,
    y: 0,
    scale: { x: 1, y: 1 },
    internalModel: {},
    update(deltaMs) { updateDeltas.push(deltaMs); }
  };
  const state = {
    config: { model_path: "/models/test/test.model3.json" },
    model: null,
    pixiApp: null,
    rendererSurfaceActive: true,
    desktopMode: false,
    uiView: "full",
    baseTransform: { x: 0, y: 0, rotation: 0 },
    availableMotionGroups: []
  };
  const windowObject = {
    PIXI: {
      Application: FakeApplication,
      UPDATE_PRIORITY: { HIGH: 25 },
      live2d: {
        Live2DModel: {
          async from(_path, options) {
            modelLoadOptions = options;
            return model;
          }
        }
      }
    },
    Live2DCubismCore: {},
    devicePixelRatio: 1.5,
    location: { search: "" },
    addEventListener() {}
  };
  const documentObject = {
    getElementById: () => ({ id: "live2d-canvas" })
  };
  const controller = runtimeModule.createController({
    state,
    windowObject,
    documentObject,
    performanceObject: { now: () => 1000 },
    placeModel() {
      state.baseTransform = { x: 640, y: 700, rotation: 0 };
    },
    setModelMotionDefinitions() {},
    attachDrag() {},
    setupClickthroughHitTest() {},
    scheduleIdleMotionLoop() {},
    applyStyleExpressionLayer() {},
    updateMicroMotionLayer() {},
    getStyleExpressionProfile: () => ({}),
    getActiveModelCadence: () => ({})
  });

  await controller.initLive2D();

  assert.strictEqual(applicationOptions.antialias, false, "full-window Live2D should not pay for redundant MSAA");
  assert.strictEqual(applicationOptions.powerPreference, "high-performance");
  assert.strictEqual(applicationOptions.resolution, 1, "render pixels should stay bounded independently of Windows DPI");
  assert.strictEqual(applicationOptions.autoDensity, true);
  assert.strictEqual(applicationOptions.preserveDrawingBuffer, false);
  assert.deepStrictEqual(modelLoadOptions, { autoUpdate: false }, "Live2D should not create a second shared-ticker clock");
  assert.strictEqual(model.autoUpdate, false);
  assert.strictEqual(ticker.maxFPS, 60);
  assert.strictEqual(ticker.minFPS, 30);
  assert.strictEqual(ticker.speed, 1);
  assert.deepStrictEqual(stageChildren, [model]);

  const synchronizedUpdate = tickerCallbacks.find((entry) => entry.priority === 25);
  assert.ok(synchronizedUpdate, "the application ticker should own the model update");
  synchronizedUpdate.callback();
  assert.deepStrictEqual(updateDeltas, [16.67]);
  state.rendererSurfaceActive = false;
  synchronizedUpdate.callback();
  assert.deepStrictEqual(updateDeltas, [16.67], "inactive surfaces must stop model parameter updates too");

  const parameterIds = Array.from({ length: 64 }, (_, index) => `Param${index}`);
  const parameterValues = new Float64Array(parameterIds.length);
  let parameterIndexLookups = 0;
  let addByIndexCalls = 0;
  let addByIdCalls = 0;
  const fakeCore = {
    getParameterIndex(id) {
      parameterIndexLookups += 1;
      return parameterIds.indexOf(id);
    },
    getParameterValueByIndex(index) {
      return parameterValues[index];
    },
    setParameterValueByIndex(index, value) {
      parameterValues[index] = value;
    },
    addParameterValueByIndex(index, delta, weight = 1) {
      addByIndexCalls += 1;
      parameterValues[index] += delta * weight;
    },
    addParameterValueById(id, delta, weight = 1) {
      addByIdCalls += 1;
      const index = this.getParameterIndex(id);
      this.addParameterValueByIndex(index, delta, weight);
    }
  };
  const expression = expressionModule.createController({ state: {} });
  const hotIds = parameterIds.slice(0, 24);
  for (let frame = 0; frame < 180; frame += 1) {
    for (let write = 0; write < 120; write += 1) {
      expression.safeAddParamValue(fakeCore, hotIds[write % hotIds.length], 0.01, 0.5);
    }
  }
  assert.strictEqual(addByIndexCalls, 180 * 120, "speech frames should retain every ordered parameter write");
  assert.strictEqual(addByIdCalls, 0, "speech frames should use the indexed Cubism API when available");
  assert.strictEqual(
    parameterIndexLookups,
    hotIds.length,
    "each hot Live2D parameter id should be resolved only once per core model"
  );

  console.log("Live2D render performance checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
