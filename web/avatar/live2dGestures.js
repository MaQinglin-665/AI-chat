(function (root) {
  "use strict";
  const RANGES = Object.freeze({ nod: [600,1600], shake_head: [800,2000], wave: [1200,2400],
    think: [1200,2400], happy: [1000,2400], surprised: [600,1600], shy: [1000,2200],
    sad: [1200,2600], tilt_head: [800,2000], idle_reset: [0,0] });
  const own = (value, key) => Object.hasOwn(value || {}, key);
  const clamp = value => Math.max(-1, Math.min(1, value));
  function validateSpec(mapping, name, spec) {
    const range = RANGES[name];
    if (!range || !mapping?.params || !spec || !Number.isFinite(spec.durationMs) || spec.durationMs < range[0] || spec.durationMs > range[1]) return false;
    if (name === "idle_reset") return !spec.face && !spec.speechGesture && !spec.keyframes;
    if (spec.face && !own(mapping.faces, spec.face)) return false;
    if (spec.speechGesture && !own(mapping.speechGesturePoses, spec.speechGesture)) return false;
    const frames = spec.keyframes;
    if (!frames) return !!(spec.face || spec.speechGesture);
    if (!Array.isArray(frames) || frames.length < 2 || frames.length > 32 || frames[0]?.at !== 0 || frames.at(-1)?.at !== 1) return false;
    const mouth = new Set([mapping.params.mouthOpen, mapping.params.mouthOpenY, ...Object.values(mapping.params.vowels || {}),
      ...(mapping.channelGroups?.mouthOpen || []).map(alias => mapping.params[alias])].filter(Boolean));
    let last = -1;
    for (const frame of frames) {
      if (!frame || !Number.isFinite(frame.at) || frame.at <= last || frame.at < 0 || frame.at > 1 || !frame.values || typeof frame.values !== "object" || Array.isArray(frame.values)) return false;
      for (const [alias, value] of Object.entries(frame.values)) {
        if (!own(mapping.params, alias) || typeof mapping.params[alias] !== "string" || mouth.has(mapping.params[alias]) || !Number.isFinite(value)) return false;
      }
      last = frame.at;
    }
    const aliases = new Set(frames.flatMap(frame => Object.keys(frame.values)));
    return !!(aliases.size || spec.face || spec.speechGesture) && [...aliases].every(alias => (frames[0].values[alias] || 0) === 0 && (frames.at(-1).values[alias] || 0) === 0);
  }
  function create({ mapping, state = {}, host = root, canvas, stopLegacy = () => {} }) {
    let active = null, gaze = null, disposed = false;
    const now = () => host.performance?.now?.() ?? root.performance.now();
    const schedule = host.setTimeout?.bind(host) || setTimeout;
    const unschedule = host.clearTimeout?.bind(host) || clearTimeout;
    const result = (name, status, reason, durationMs = 0) => ({ name, status, durationMs, ...(reason ? { reason } : {}) });
    function finish(status, reason) {
      const current = active; if (!current) return;
      active = null; unschedule(current.timer); current.signal?.removeEventListener("abort", current.abort);
      current.resolve(result(current.name, status, reason, current.spec.durationMs));
    }
    function playGesture(name, options = {}) {
      if (disposed) return Promise.resolve(result(name, "failed", "not_ready"));
      if (typeof name !== "string" || !options || typeof options !== "object") return Promise.resolve(result(name, "failed", "invalid_input"));
      const spec = mapping.gestureVocabulary?.[name];
      if (!own(RANGES, name) || !own(mapping.gestureVocabulary, name)) return Promise.resolve(result(name, "unsupported"));
      if (!validateSpec(mapping, name, spec)) return Promise.resolve(result(name, "failed", "invalid_mapping"));
      const intensity = options.intensity ?? 1, signal = options.signal;
      if (!Number.isFinite(intensity) || (signal && (typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function"))) return Promise.resolve(result(name, "failed", "invalid_input"));
      if (signal?.aborted) return Promise.resolve(result(name, "interrupted", "aborted"));
      finish("interrupted", "replaced");
      if (name === "idle_reset") {
        gaze = null; stopLegacy(); return Promise.resolve(result(name, "completed"));
      }
      return new Promise(resolve => {
        const current = { name, spec, resolve, signal, start: now(), intensity: Math.max(0, Math.min(1, intensity)) };
        active = current;
        current.abort = () => { if (active === current) finish("interrupted", "aborted"); };
        current.timer = schedule(() => { if (active === current) finish("failed", "clock_stalled"); }, spec.durationMs + 1000);
        signal?.addEventListener("abort", current.abort, { once: true });
      });
    }
    function lookAt(target) {
      if (disposed) return { status: "failed", reason: "not_ready" };
      if (["user","left","right","up","down","reset"].includes(target)) { gaze = target === "reset" ? null : target; return { status: "completed" }; }
      if (target?.type === "screen" && Number.isFinite(target.x) && Number.isFinite(target.y)) {
        const rect = canvas?.getBoundingClientRect?.();
        if (rect?.width > 0 && rect?.height > 0) { gaze = { ...target }; return { status: "completed" }; }
      }
      return { status: "failed", reason: "invalid_target" };
    }
    function sample() {
      const frame = {}, parameters = [];
      if (disposed) return { frame, parameters };
      if (gaze) {
        if (gaze === "user") frame.gaze = { x: clamp(Number(state.mouseGazeCurrentX ?? state.mouseGazeTargetX) || 0), y: clamp(Number(state.mouseGazeCurrentY ?? state.mouseGazeTargetY) || 0) };
        else if (typeof gaze === "string") frame.gaze = { x: gaze === "left" ? -1 : gaze === "right" ? 1 : 0, y: gaze === "up" ? 1 : gaze === "down" ? -1 : 0 };
        else {
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) frame.gaze = { x: clamp(((gaze.x - (host.screenX || 0) - rect.left) / rect.width - .5) * 2),
            y: clamp((.5 - (gaze.y - (host.screenY || 0) - rect.top) / rect.height) * 2) };
        }
      }
      const current = active;
      if (!current) return { frame, parameters };
      const phase = Math.max(0, (now() - current.start) / current.spec.durationMs);
      if (phase >= 1) { finish("completed"); return { frame, parameters }; }
      const spec = current.spec, weight = Math.sin(Math.PI * phase) ** 2 * current.intensity;
      if (spec.face) { frame.face = spec.face; frame.faceIntensity = weight; }
      if (spec.speechGesture) frame.speechGesture = { name: spec.speechGesture, phase, intensity: current.intensity };
      if (spec.keyframes) {
        const rightIndex = spec.keyframes.findIndex(key => key.at > phase);
        const left = spec.keyframes[rightIndex - 1], right = spec.keyframes[rightIndex], ratio = (phase - left.at) / (right.at - left.at);
        for (const alias of new Set([...Object.keys(left.values), ...Object.keys(right.values)])) {
          const a = left.values[alias] || 0, b = right.values[alias] || 0;
          parameters.push([mapping.params[alias], (a + (b - a) * ratio) * current.intensity]);
        }
      }
      return { frame, parameters };
    }
    return { playGesture, lookAt, sample, stop(reason = "stopped") { finish("interrupted", reason); },
      dispose() { if (!disposed) { disposed = true; gaze = null; finish("interrupted", "disposed"); } } };
  }
  const api = { create, validateSpec, RANGES }; root.XinyuLive2DGestures = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
