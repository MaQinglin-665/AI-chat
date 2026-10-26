(function (root) {
  "use strict";
  // Opt-in console probe. Never executes/acknowledges plans or alters the renderer.
  const INTERVAL_MS = 30000;
  let timer = null, lastInput = Date.now(), events = [];
  const input = () => { lastInput = Date.now(); };
  const event = e => {
    const d = e.detail || {};
    if (d.type === "activity") events = [...events.slice(-2), { type: d.type, name: d.name, stage: d.stage }];
  };
  function snapshot() {
    const renderer = root.__xinyuAvatarRenderer;
    const metrics = renderer?.metrics?.() || {}, world = metrics.world || {};
    const scene = metrics.room?.preset || "none";
    const layout = scene === "handpainted" ? root.XinyuVRMHandpainted?.layout() : root.XinyuVRMScene?.layout();
    const places = Object.keys(layout?.activityPoints || {});
    const state = root.__petState || {};
    const focused = root.document?.activeElement;
    return { scene, position: world.position || [0, 0], activity: world.name || "accompany",
      places, activities: places.filter(name => name !== "accompany"),
      gestures: renderer?.capabilities?.().actions || [], period: root.document?.body?.dataset.stageRoom || "night",
      idle_sec: Math.floor((Date.now() - lastInput) / 1000),
      typing: !!(focused && /^(INPUT|TEXTAREA)$/.test(focused.tagName) && Date.now() - lastInput < 10000),
      speaking: !!(state.chatBusy || state.ttsContextSpeaking || state.streamSpeakWorking || state.speechPhase === "speaking"),
      events: events.slice() };
  }
  async function request(endpoint, body = {}) {
    if (typeof root.authFetch !== "function") throw new Error("Authenticated API is not ready");
    const response = await root.authFetch("/api/avatar/brain/" + endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const result = await response.json();
    root.console?.debug("avatar-brain-debug", result);
    return result;
  }
  const api = {
    snapshot, send: () => request("world", snapshot()),
    think: () => request("think"), poll: () => request("poll"),
    start() {
      if (timer !== null) return;
      root.document?.addEventListener("input", input);
      root.addEventListener?.("avatar-world-event", event);
      timer = root.setInterval(() => { api.send().then(() => api.poll()).catch(() => {}); }, INTERVAL_MS);
      return api.send();
    },
    stop() {
      if (timer !== null) root.clearInterval(timer);
      timer = null;
      root.document?.removeEventListener("input", input);
      root.removeEventListener?.("avatar-world-event", event);
    }
  };
  root.XinyuAvatarBrainDebug = api;
})(typeof window !== "undefined" ? window : globalThis);
