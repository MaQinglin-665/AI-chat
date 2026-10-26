(function (root) {
  "use strict";
  const unit = v => Math.max(0, Math.min(1, Number(v) || 0));
  function enabled(state) {
    return state.avatarMapping?.driver === "mapped" || (state.config?.avatar?.kind === "live2d"
      && ["web/avatar/mappings/mao.json", "/avatar/mappings/mao.json"].includes(state.config.avatar.mapping));
  }
  function current(state, token) {
    const value = state.avatarBrowserSpeech;
    return value && value.token === token && value.token === Number(state.ttsBrowserPlaybackToken || 0)
      && value.generation === Number(state.ttsPlaybackGeneration || 0) ? value : null;
  }
  function begin(state, { token, generation, rate, delayMs }, now) {
    if (!enabled(state)) return;
    state.avatarBrowserSpeech = { token, generation, rate: Math.max(.5, Math.min(2, Number(rate) || 1)),
      delayMs: Number.isFinite(delayMs) ? Math.max(0, Math.min(500, delayMs)) : 120,
      phase: "pending", source: "", queuedAt: now, startedAt: 0, gateAt: Infinity,
      pausedAt: 0, pausedMs: 0, boundaryAt: null, boundaryIndex: -1 };
    state.speechMouthOpen = 0;
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
  }
  function boundary(state, token, now, event = {}) {
    const value = current(state, token);
    if (!value || !Number.isFinite(event.charIndex) || event.charIndex < value.boundaryIndex || event.charIndex < 0
      || ["paused", "ended", "cancelled"].includes(value.phase)) return;
    if (value.phase === "pending" || value.source === "speaking_state") start(state, token, now, "boundary");
    value.boundaryIndex = event.charIndex;
    value.boundaryAt = now + value.delayMs;
  }
  function pause(state, token, now) {
    const value = current(state, token);
    if (value?.phase === "playing") { value.phase = "paused"; value.pausedAt = now; state.speechMouthOpen = 0; }
  }
  function resume(state, token, now) {
    const value = current(state, token);
    if (value?.phase !== "paused") return;
    const elapsed = Math.max(0, now - value.pausedAt);
    value.pausedMs += elapsed; value.gateAt += elapsed;
    if (value.boundaryAt !== null) value.boundaryAt += elapsed;
    value.phase = "playing";
  }
  function stop(state, token, phase = "ended") {
    const value = current(state, token);
    if (value) { value.phase = phase; state.speechMouthOpen = 0; }
  }
  function sample(state, now) {
    if (!enabled(state)) return null;
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
  const api = { enabled, begin, start, boundary, pause, resume, stop, sample };
  root.XinyuBrowserLipSync = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
