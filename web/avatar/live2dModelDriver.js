(function (root) {
  "use strict";
  const unit = value => Math.max(0, Math.min(1, Number(value) || 0));
  function create({ mapping, model, expressions = {}, now = () => root.performance.now() }) {
    const core = model.internalModel.coreModel, params = mapping.params, parts = mapping.parts || {};
    let action = null;
    const set = (id, value) => { if (id && Number.isFinite(value)) core.setParameterValueById(id, value); };
    const add = (id, value) => { if (id && Number.isFinite(value)) core.addParameterValueById(id, value); };
    function pose(values, weight) { for (const [alias, value] of Object.entries(values || {})) add(params[alias], value * weight); }
    function gesture(name, phase, intensity = 1) {
      const values = mapping.speechGesturePoses?.[name];
      if (!values) return;
      const weight = Math.sin(Math.PI * unit(phase)) ** 2 * unit(intensity);
      pose(values, weight);
      const effects = mapping.speechGestureEffects?.[name];
      for (const [alias, value] of Object.entries(effects?.parts || {})) {
        if (parts[alias]) {
          core.setPartOpacityById(parts[alias], value);
          if (effects.partParameters) set(parts[alias], value);
        }
      }
      for (const item of effects?.oscillations || []) {
        add(params[item.param], Math.sin(phase * Math.PI * (item.cycles * 2)) * item.amplitude * weight);
      }
    }
    function update(frame = {}) {
      // Runs after Cubism motion/physics and before Core.update, on the original
      // Pixi tick. Only this model-specific path replaces Hiyori's legacy layers.
      const expression = expressions[mapping.faces?.[frame.face || "neutral"]];
      const weight = Number.isFinite(frame.faceIntensity) ? unit(frame.faceIntensity) : 1;
      for (const item of expression?.Parameters || []) {
        if (item.Blend === "Multiply") core.multiplyParameterValueById(item.Id, 1 + (item.Value - 1) * weight);
        else if (item.Blend === "Overwrite") core.setParameterValueById(item.Id, item.Value, weight);
        else add(item.Id, item.Value * weight);
      }
      if (frame.gaze && Number.isFinite(frame.gaze.x) && Number.isFinite(frame.gaze.y)) {
        set(params.eyeBallX, frame.gaze.x); set(params.eyeBallY, frame.gaze.y);
        add(params.angleX, frame.gaze.x * 12); add(params.angleY, frame.gaze.y * 8);
      }
      pose(mapping.deliveryPoses?.[frame.delivery], Number.isFinite(frame.deliveryIntensity) ? unit(frame.deliveryIntensity) : 1);
      pose(mapping.modePoses?.[frame.mode], 1);
      if (frame.blinkSuppressed) { set(params.eyeLOpen, 1); set(params.eyeROpen, 1); }
      if (Number.isFinite(frame.breath)) set(params.breath, unit(frame.breath));
      if (Number.isFinite(frame.energy)) add(params.bodyY, unit(frame.energy));
      const open = unit(frame.mouth?.open), vowel = open > 0.02 ? frame.mouth?.vowel : null;
      const vowels = params.vowels || {};
      for (const [name, id] of Object.entries(vowels)) {
        const textWeight = frame.mouth?.source === "browser-text" && Number.isFinite(frame.mouth.weights?.[name]) ? unit(frame.mouth.weights[name]) : null;
        set(id, textWeight !== null ? (open > .02 ? open * textWeight : 0)
          : open > 0.02 && (vowel ? name === vowel : id === params.mouthOpen) ? open : 0);
      }
      if (!Object.keys(vowels).length) set(params.mouthOpen, open);
      if (frame.speechGesture) gesture(frame.speechGesture.name, frame.speechGesture.phase, frame.speechGesture.intensity ?? 1);
      if (action) {
        const phase = (now() - action.started) / action.duration;
        if (phase >= 1) action = null;
        else gesture(action.name, phase, action.intensity);
      }
    }
    function playAction(name, { intensity = 1 } = {}) {
      const spec = mapping.actions?.[name];
      if (!spec) return false;
      if (spec.gesture) { action = { name: spec.gesture, duration: spec.durationMs || 1000, started: now(), intensity }; return true; }
      if (Array.isArray(spec.motion)) {
        // Cubism owns authored timing; the common API reports supported mapping.
        Promise.resolve(model.motion(spec.motion[0], spec.motion[1], 3)).catch(() => {});
        return true;
      }
      return false;
    }
    function stopAction() { action = null; model.internalModel.motionManager?.stopAllMotions?.(); }
    return { update, playAction, stopAction, dispose: stopAction };
  }
  const api = { create }; root.XinyuLive2DModelDriver = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
