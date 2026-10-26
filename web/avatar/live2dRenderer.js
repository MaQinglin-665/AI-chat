(function (root) {
  "use strict";
  const mappingApi = root.XinyuLive2DMapping || (typeof require === "function" ? require("./live2dMapping.js") : null);
  const directorApi = () => root.TaffyHiyoriPerformanceDirector || (typeof require === "function" ? require("../hiyoriPerformanceDirector.js") : null);
  const unit = value => Math.max(0, Math.min(1, Number(value)));
  function createRenderer({ state, lifecycle, host = root } = {}) {
    let mapping, resource, clock, driver, disposed = false;
    function sanitize(frame) {
      const value = {};
      if (!frame || typeof frame !== "object") return value;
      if (["idle", "listen", "think", "speak"].includes(frame.mode)) value.mode = frame.mode;
      if (Object.hasOwn(mapping.faces || {}, frame.face)) value.face = frame.face;
      if (frame.delivery === "neutral" || Object.hasOwn(mapping.deliveryPoses || {}, frame.delivery)) value.delivery = frame.delivery;
      for (const key of ["deliveryIntensity", "faceIntensity", "breath", "energy"]) if (Number.isFinite(frame[key])) value[key] = unit(frame[key]);
      if (frame.gaze === null) value.gaze = null;
      else if (Number.isFinite(frame.gaze?.x) && Number.isFinite(frame.gaze?.y)) value.gaze = {
        x: Math.max(-1, Math.min(1, frame.gaze.x)), y: Math.max(-1, Math.min(1, frame.gaze.y)) };
      if (Number.isFinite(frame.mouth?.open)) value.mouth = { open: unit(frame.mouth.open),
        vowel: mapping.capabilities?.vowels && ["a", "i", "u", "e", "o"].includes(frame.mouth.vowel) ? frame.mouth.vowel : null };
      if (frame.speechGesture === null) value.speechGesture = null;
      else if (Object.hasOwn(mapping.speechGesturePoses || {}, frame.speechGesture?.name) && Number.isFinite(frame.speechGesture.phase)) {
        value.speechGesture = { name: frame.speechGesture.name, phase: unit(frame.speechGesture.phase) };
      }
      if (typeof frame.blinkSuppressed === "boolean") value.blinkSuppressed = frame.blinkSuppressed;
      return value;
    }
    async function load(source = {}) {
      if (disposed) throw new Error("Live2D renderer is disposed");
      mapping = await mappingApi.load(source.mapping || mappingApi.DEFAULT_PATH);
      if (disposed) return;
      await mappingApi.ready();
      state.avatarMapping = mapping;
      resource = await lifecycle.load({ ...source, mapping, beforeCoreUpdate(runLayers) {
        // Called only at the original pre-Core hook, inside the Pixi model tick.
        if (mapping.driver === "mapped" && state.uiView !== "model") host.sampleTTSAudioLevel?.();
        clock?.(host.performance.now());
        if (mapping.driver === "mapped") driver?.update(sanitize(state.avatarIntentFrame));
        else runLayers();
      } });
      if (mapping.driver === "mapped" && resource?.model) {
        const api = host.XinyuLive2DModelDriver || (typeof require === "function" ? require("./live2dModelDriver.js") : null);
        driver = api.create({ mapping, model: resource.model, expressions: resource.expressions, now: () => host.performance.now() });
      }
      if (disposed) resource?.dispose();
      return resource !== null;
    }
    function update(frame = {}, options = {}) {
      if (disposed || !mapping) return;
      state.avatarIntentFrame = frame;
      // State-derived fields already feed the legacy layers, including their
      // richer envelopes/ownership. Reapplying them would change ordered writes.
      // Only explicit intent overrides replace those inputs. Direct v1 calls
      // treat the complete supplied frame as explicit.
      state.avatarIntentOverrides = sanitize(options.derived ? options.overrides : frame);
    }
    function playAction(name, { intensity = 1 } = {}) {
      if (disposed || !mapping || !Object.hasOwn(mapping.actions || {}, name)) return false;
      const action = mapping.actions[name];
      if (driver) return driver.playAction(name, { intensity: Number.isFinite(intensity) ? unit(intensity) : 1 });
      if (action.type !== "procedural") return false;
      return directorApi().createController({ state, mapping, performanceObject: host.performance })
        .triggerAction(action.name, { intensity: Number.isFinite(intensity) ? unit(intensity) : 1, source: "avatar-intent" });
    }
    function stopAction() {
      driver?.stopAction();
      if (!state.hiyoriDirector) return;
      state.hiyoriDirector.action = null;
      state.hiyoriDirector.outgoingAction = null;
    }
    function dispose() {
      if (disposed) return;
      disposed = true; clock = null;
      driver?.dispose(); resource?.dispose();
      delete state.avatarIntentFrame; delete state.avatarIntentOverrides;
    }
    return { kind: "live2d", load, dispose, update, playAction, stopAction,
      capabilities: () => ({ vowels: false, armGestures: [], fullBody: false, locomotion: false,
        ...mapping?.capabilities, faces: Object.keys(mapping?.faces || {}), actions: Object.keys(mapping?.actions || {}) }),
      get metadata() { return mapping?.metadata; },
      startClock(produceFrame) { clock = produceFrame; return () => { clock = null; }; },
      // Pointer behavior stays with the original Live2D layout controller.
      ownsPointer: true, prepareMs: 0 };
  }
  const api = { createRenderer };
  root.XinyuLive2DRenderer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
