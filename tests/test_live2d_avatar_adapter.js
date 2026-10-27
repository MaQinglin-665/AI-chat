"use strict";
const assert = require("node:assert/strict"), vm = require("node:vm"), fs = require("node:fs");
const mappingApi = require("../web/avatar/live2dMapping.js");
const rendererApi = require("../web/avatar/live2dRenderer.js");
const runtimeApi = require("../web/avatar/avatarRuntime.js");
const hiyori = mappingApi.getDefault();
(async () => {
  assert.equal(await mappingApi.load(), hiyori);
  assert.equal(mappingApi.resolve(hiyori).params.angleX, "ParamAngleX");
  assert.equal(mappingApi.resolve(hiyori).has("bodyAdd", "ParamAngleX"), true);
  assert.equal(runtimeApi.normalizeSource(undefined, { model_path: "/old.model3.json" }).path, "/old.model3.json");
  assert.equal(runtimeApi.normalizeSource({ kind: "live2d" }, { model_path: "/old", avatar: { kind: "live2d", path: "/new", mapping: "web/avatar/mappings/hiyori.json" } }).path, "/new");
  assert.throws(() => mappingApi.resolve({ version: 9, params: {} }), /mapping/);
  const state = {}, ticks = [], loaded = [];
  let disposed = 0;
  const host = { performance: { now: () => 1234 } };
  const renderer = rendererApi.createRenderer({ state, host, lifecycle: { async load(source) { loaded.push(source); return { dispose: () => disposed++ }; } } });
  await renderer.load({ path: "/hiyori.model3.json" });
  assert.equal(loaded[0].path, "/hiyori.model3.json");
  assert.equal(renderer.capabilities().vowels, false);
  assert.deepEqual(renderer.capabilities().armGestures, []);
  assert.equal(renderer.playAction("unknown"), false);
  renderer.update({ mode: "alien", face: "untrusted", delivery: "untrusted", mouth: { open: NaN, vowel: "a" }, gaze: { x: Infinity, y: 0 }, speechGesture: { name: "untrusted", phase: .2 } });
  assert.deepEqual(state.avatarIntentOverrides, {});
  renderer.update({ mode: "speak", face: "happy", mouth: { open: 2, vowel: "a" }, gaze: { x: -2, y: 2 }, speechGesture: { name: "nod", phase: .5 } });
  assert.equal(state.avatarIntentOverrides.mouth.open, 1);
  assert.equal(state.avatarIntentOverrides.mouth.vowel, null);
  assert.deepEqual(state.avatarIntentOverrides.gaze, { x: -1, y: 1 });
  renderer.update({ face: "happy", mouth: { open: .3 } }, { derived: true, overrides: {} });
  assert.deepEqual(state.avatarIntentOverrides, {}, "state-derived frames must not double-apply legacy inputs");
  const stop = renderer.startClock(now => ticks.push(now));
  let layers = 0;
  loaded[0].beforeCoreUpdate(() => layers++);
  assert.deepEqual(ticks, [1234]); assert.equal(layers, 1);
  assert.equal(renderer.playAction("nod", { intensity: .5 }), true);
  renderer.stopAction(); assert.equal(state.hiyoriDirector.action, null);
  stop(); loaded[0].beforeCoreUpdate(() => layers++); assert.equal(ticks.length, 1);
  renderer.dispose(); renderer.dispose(); assert.equal(disposed, 1);

  // Rename every model parameter without retaining the Hiyori spelling. This
  // also checks that channel ownership/rates come from the mapping, not regexes
  // matching an accidental substring in the physical model parameter id.
  const custom = JSON.parse(JSON.stringify(hiyori));
  for (const name of Object.keys(custom.params)) custom.params[name] = `Custom_${name}`;
  const director = require("../web/hiyoriPerformanceDirector.js");
  const customState = { avatarMapping: custom, modelProfileName: "hiyori_pro_t11" };
  const customDirector = director.createController({ state: customState, random: () => .3, performanceObject: host.performance });
  customDirector.sample({ now: 1000 });
  const sample = customDirector.sample({ now: 1200, speaking: true, audioActive: true, audioLevel: .8, emotion: "happy" });
  assert.ok(Object.keys(sample.parameters).length > 5);
  assert.ok(Object.keys(sample.parameters).every(id => id.startsWith("Custom_")));
  const calls = [];
  const expression = require("../web/live2dExpressionController.js").createController({ state: customState,
    hiyoriPerformanceDirector: director, performanceObject: host.performance });
  expression.applyHiyoriPerformanceLayer({ addParameterValueById: (...args) => calls.push(args) }, { now: 1300, speaking: true, emotion: "happy" });
  assert.ok(calls.length > 5); assert.ok(calls.every(([id]) => id.startsWith("Custom_")));
  const partial = { ...custom, params: {} };
  const partialState = { avatarMapping: partial, modelProfileName: "hiyori_pro_t11" };
  const partialExpression = require("../web/live2dExpressionController.js").createController({ state: partialState, hiyoriPerformanceDirector: director });
  partialExpression.applyHiyoriPerformanceLayer({ addParameterValueById() { throw Error("missing aliases must not write"); } }, { speaking: true, emotion: "happy" });

  // Direct v1 frames affect the existing layers at their original hook.
  const frameState = { expressionEnabled: true, modelProfileName: "hiyori_pro_t11", currentTalkStyle: "neutral", ttsAudioLevel: 0, speechMouthOpen: 0,
    model: { internalModel: { coreModel: { addParameterValueById() {}, setParameterValueById() {}, getParameterValueById: () => 0 } } } };
  const frameRenderer = rendererApi.createRenderer({ state: frameState, host, lifecycle: { load: async () => ({ dispose() {} }) } });
  await frameRenderer.load({});
  const frameExpression = require("../web/live2dExpressionController.js").createController({ state: frameState,
    hiyoriPerformanceDirector: director, performanceObject: host.performance });
  frameRenderer.update({ mode: "listen", face: "happy", faceIntensity: 0, mouth: { open: .7, vowel: "a" } });
  assert.equal(frameExpression.getSpeechAnimationMouthOpen(), .7);
  frameExpression.updateMicroMotionLayer();
  assert.equal(frameState.hiyoriPerformanceDebug.mode, "listen");
  assert.equal(frameState.moodExpressionSmoothed.happy, 0);
  frameRenderer.update({ mode: "idle" }); frameExpression.updateMicroMotionLayer();
  assert.equal(frameState.hiyoriPerformanceDebug.mode, "idle");
  frameRenderer.dispose();

  // Dispose during an active drag removes document/window/wheel handlers.
  // Repeated completed drags also release their transient handlers immediately.
  const surface = () => {
    const events = new Map();
    return { events, addEventListener(n, fn) { if (!events.has(n)) events.set(n, new Set()); events.get(n).add(fn); },
      removeEventListener(n, fn) { events.get(n)?.delete(fn); } };
  };
  const dragWindow = surface(), dragDocument = surface(), dragCanvas = surface();
  const modelEvents = new Map();
  const dragModel = { on(n, fn) { modelEvents.set(n, fn); }, x: 0, y: 0 };
  const dragState = { model: dragModel, baseTransform: {}, pixiApp: { view: dragCanvas } };
  dragCanvas.getBoundingClientRect = () => ({ width: 500, height: 500 });
  const layout = require("../web/live2dLayoutController.js").createController({ state: dragState, windowObject: dragWindow, documentObject: dragDocument,
    performanceObject: host.performance });
  const removeDrag = layout.attachDrag(dragModel);
  for (let i = 0; i < 100; i++) {
    modelEvents.get("pointerdown")({ data: { global: { x: 0, y: 0 } } });
    assert.equal(dragDocument.events.get("pointermove").size, 1);
    for (const fn of [...dragDocument.events.get("pointerup")]) fn();
    assert.equal(dragDocument.events.get("pointermove").size, 0);
    assert.equal(dragWindow.events.get("pointerup").size, 0);
  }
  modelEvents.get("pointerdown")({ data: { global: { x: 0, y: 0 } } });
  removeDrag(); removeDrag();
  for (const target of [dragWindow, dragDocument, dragCanvas]) for (const handlers of target.events.values()) assert.equal(handlers.size, 0);
  assert.equal(dragState.dragData, null); assert.equal(dragState.browserDragActive, false);

  // The shared runtime owns exactly one event/channel subscription. Live2D's
  // original pointer layer is not replaced, and it never receives a new RAF.
  let next = 0, channels = 0, liveLoads = 0, vrmLoads = 0, clock, updates = [];
  const listeners = new Map();
  const root = { document: { body: { dataset: {} }, getElementById: () => null, addEventListener() {} },
    performance: host.performance, addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    clearInterval() {}, requestAnimationFrame() { throw Error("Live2D must not add RAF"); },
    BroadcastChannel: class { constructor() { channels++; this.id = ++next; root.channel = this; } close() { channels--; } },
    XinyuLive2DRenderer: { createRenderer: () => ({ kind: "live2d", ownsPointer: true, prepareMs: 0,
      load: async source => { liveLoads++; assert.equal(source.path, "/legacy"); }, dispose() {},
      startClock(produce) { clock = produce; return () => { clock = null; }; }, update: (frame, options) => updates.push([frame, options]),
      playAction(name) { root.action = name; }, stopAction() {},
      playGesture(name) { root.gesture = name; return Promise.resolve({ name, status: "completed" }); },
      lookAt(target) { root.look = target; return { status: "completed" }; } }) },
    XinyuVRMRenderer: { createRenderer() { vrmLoads++; } } };
  vm.runInNewContext(fs.readFileSync(require.resolve("../web/avatar/avatarRuntime.js"), "utf8"), { window: root });
  const s = { config: { model_path: "/legacy" }, uiView: "full", ttsAudioLevel: .4 };
  for (let i = 0; i < 10; i++) {
    const runtime = await root.XinyuAvatarRuntime.start({ state: s, canvas: {} });
    assert.equal(channels, 1); assert.equal(listeners.get("avatar-intent").size, 1);
    assert.equal(listeners.has("pointermove"), false);
    clock(1300);
    assert.equal(updates.at(-1)[0].mouth.open, .4);
    assert.equal(updates.at(-1)[0].mode, "speak");
    for (const fn of listeners.get("avatar-intent")) fn({ detail: { frame: { face: "happy" }, action: "nod" } });
    clock(1400);
    assert.equal(updates.at(-1)[1].overrides.face, "happy"); assert.equal(root.action, "nod");
    root.channel.onmessage({ data: { frame: { delivery: "shy" } } }); clock(1500);
    assert.equal(updates.at(-1)[1].overrides.delivery, "shy");
    for (const fn of listeners.get("avatar-intent")) fn({ detail: { type: "gesture", name: "wave" } });
    assert.equal(root.gesture, "wave");
    root.channel.onmessage({ data: { type: "look_at", target: "left" } }); assert.equal(root.look, "left");
    assert.equal((await runtime.playGesture("nod")).status, "completed");
    assert.equal(runtime.lookAt("reset").status, "completed");
    runtime.dispose(); runtime.dispose();
    assert.equal(clock, null); assert.equal(channels, 0); assert.equal(listeners.get("avatar-intent").size, 0);
  }
  assert.equal(liveLoads, 10); assert.equal(vrmLoads, 0);
  console.log("Live2D mapping, v1 intents, legacy configuration, single runtime and ten-cycle cleanup passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
