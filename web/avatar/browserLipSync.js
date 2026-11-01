(function (root) {
  "use strict";
  const unit = v => Math.max(0, Math.min(1, Number(v) || 0));
  const textChannels = new WeakMap();
  function publishText(state, value, now) {
    // Separate message type on the existing speech channel. Existing/VRM
    // listeners ignore it; only a vowels-capable Live2D renderer consumes it.
    // Never send the whole utterance: at most eight bounded current word plans.
    if (!root.document || typeof root.BroadcastChannel !== "function" || !state._speechBroadcastSenderId) return;
    let channel = textChannels.get(state);
    if (!channel && !["ended", "cancelled"].includes(value.phase)) {
      try { channel = new root.BroadcastChannel("taffy-speech"); textChannels.set(state, channel); } catch (_) { return; }
    }
    if (!channel) return;
    const wallNow = Date.now();
    try { channel.postMessage({ type: "live2d-browser-text", sender: state._speechBroadcastSenderId,
      token: value.token, generation: value.generation, phase: value.phase, sentAt: wallNow,
      plans: value.textBoundaries.map(plan => ({ ...plan, at: wallNow + plan.at - now })) }); }
    catch (_) { /* Optional text transport must never interrupt speech playback. */ }
    if (["ended", "cancelled"].includes(value.phase)) { channel.close(); textChannels.delete(state); }
  }
  function current(state, token) {
    const value = state.avatarBrowserSpeech;
    return value && value.token === token && value.token === Number(state.ttsBrowserPlaybackToken || 0)
      && value.generation === Number(state.ttsPlaybackGeneration || 0) ? value : null;
  }
  function begin(state, { token, generation, rate, delayMs }, now) {
    state.avatarBrowserSpeech = { token, generation, rate: Math.max(.5, Math.min(2, Number(rate) || 1)),
      delayMs: Number.isFinite(delayMs) ? Math.max(0, Math.min(500, delayMs)) : 120,
      phase: "pending", source: "", queuedAt: now, startedAt: 0, gateAt: Infinity,
      pausedAt: 0, pausedMs: 0, boundaryAt: null, boundaryIndex: -1, textBoundaries: [], charMs: 300 / Math.max(.5, Math.min(2, Number(rate) || 1)) };
    state.speechMouthOpen = 0;
    publishText(state, state.avatarBrowserSpeech, now);
  }
  function start(state, token, now, source = "event") {
    const value = current(state, token);
    if (!value || ["ended", "cancelled", "paused"].includes(value.phase)) return;
    // A late real event supersedes the missing-onstart fallback once. It must
    // not restart the legacy body/cue playback callback or the utterance itself.
    if (value.phase === "playing" && (source === "speaking_state" || value.source !== "speaking_state")) return;
    value.phase = "playing"; value.source = source; value.startedAt = now;
    value.gateAt = now + Math.max(value.delayMs, source === "speaking_state" ? 300 : 0);
    value.pausedMs = 0; value.boundaryAt = null;
    value.textBoundaries = [];
    publishText(state, value, now);
  }
  function boundary(state, token, now, event = {}) {
    const value = current(state, token);
    if (!value || !Number.isFinite(event.charIndex) || event.charIndex < value.boundaryIndex || event.charIndex < 0
      || ["paused", "ended", "cancelled"].includes(value.phase)) return;
    if (value.phase === "pending" || value.source === "speaking_state") start(state, token, now, "boundary");
    const text = event.utterance?.text;
    if (typeof text === "string" && event.charIndex < text.length) {
      const previous = value.textBoundaries.at(-1);
      if (previous && event.charIndex > previous.index) {
        const observed = (now + value.delayMs - previous.at) / (event.charIndex - previous.index);
        value.charMs = Math.max(140 / value.rate, Math.min(450 / value.rate, observed));
      }
      const length = Number.isFinite(event.charLength) && event.charLength > 0 ? Math.min(32, Math.floor(event.charLength)) : 4;
      let chunk = text.slice(event.charIndex, event.charIndex + length);
      if (!(event.charLength > 0)) chunk = chunk.match(/^[^，。！？；：、,.!?;:…—]*[，。！？；：、,.!?;:…—]?/u)?.[0] || chunk;
      const punctuation = text.slice(event.charIndex + chunk.length).match(/^[\s，。！？；：、,.!?;:…—]+/u)?.[0] || "";
      chunk = (chunk + punctuation).slice(0, 32);
      value.textBoundaries.push({ index: event.charIndex, text: chunk, at: now + value.delayMs, charMs: value.charMs });
      value.textBoundaries = value.textBoundaries.slice(-8);
    }
    value.boundaryIndex = event.charIndex;
    value.boundaryAt = now + value.delayMs;
    publishText(state, value, now);
  }
  function pause(state, token, now) {
    const value = current(state, token);
    if (value?.phase === "playing") { value.phase = "paused"; value.pausedAt = now; state.speechMouthOpen = 0; publishText(state, value, now); }
  }
  function resume(state, token, now) {
    const value = current(state, token);
    if (value?.phase !== "paused") return;
    const elapsed = Math.max(0, now - value.pausedAt);
    value.pausedMs += elapsed; value.gateAt += elapsed;
    if (value.boundaryAt !== null) value.boundaryAt += elapsed;
    for (const plan of value.textBoundaries) plan.at += elapsed;
    value.phase = "playing";
    publishText(state, value, now);
  }
  function stop(state, token, phase = "ended") {
    const value = current(state, token);
    if (value) { value.phase = phase; state.speechMouthOpen = 0; publishText(state, value, root.performance?.now?.() || 0); }
  }
  function sample(state, now) {
    const value = current(state, Number(state.ttsBrowserPlaybackToken || 0));
    if (!value) return null;
    if (value.phase !== "playing" || now < value.gateAt) return 0;
    const elapsed = Math.max(0, now - value.startedAt - value.pausedMs - value.delayMs);
    // Never normalize by an estimated sentence duration: speech may last much
    // longer. Word/sentence boundaries can re-anchor the rhythm when provided.
    const cycle = value.boundaryAt !== null && now >= value.boundaryAt ? now - value.boundaryAt : elapsed;
    const t = cycle / 1000 * value.rate;
    const pulse = Math.sin(t * Math.PI * 4.6) ** 2;
    const accent = .88 + .12 * Math.sin(elapsed / 1000 * 3.1);
    const attack = unit(elapsed / 65);
    return unit((.06 + .66 * pulse) * accent * attack);
  }
  // Shared intent-frame selection; browser speech has no readable analyser.
  // Explicit ownership avoids stale server analysers opening the browser mouth.
  function mouthLevel(state, now, analysedLevel = 0) {
    if (state.uiView === "model") {
      return state.ttsBrowserMouthActive === true ? unit(state.speechMouthOpen) : unit(analysedLevel);
    }
    return sample(state, now) ?? unit(analysedLevel);
  }
  const api = { begin, start, boundary, pause, resume, stop, sample, mouthLevel,
    textTimeline: state => current(state, Number(state.ttsBrowserPlaybackToken || 0)) };
  root.XinyuBrowserLipSync = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
