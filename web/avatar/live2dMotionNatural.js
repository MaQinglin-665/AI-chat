(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const ease = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
  const follow = (from, to, dt, tau) => from + (to - from) * (1 - Math.exp(-dt / tau));
  function independentRandom() {
    // Never consume the legacy/global stream: it also chooses authored clips
    // and speech animation seeds. New idle randomness must not retime the mouth.
    const bytes = new Uint32Array(1);
    let seed;
    if (root.crypto?.getRandomValues) { root.crypto.getRandomValues(bytes); seed = bytes[0]; }
    else seed = (Date.now() ^ Math.floor((root.performance?.now?.() || 0) * 1000)) >>> 0;
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  function enabled(mapping, state) {
    return state.live2dNaturalMotionEnabled !== false && state.motionEnabled !== false
      && state.expressionEnabled !== false && mapping.naturalMotion?.enabled === true;
  }
  function create({ mapping, state, model, expressions = {}, random }) {
    const draw = () => (random ||= independentRandom())();
    const spec = mapping.naturalMotion || {}, core = model.internalModel.coreModel, p = mapping.params;
    const internal = model.internalModel, nativeBreath = internal.breath, nativeBlink = internal.eyeBlink;
    let ownsNative = false;
    function manageNative(on) {
      if (on && !ownsNative) { internal.breath = null; internal.eyeBlink = null; ownsNative = true; }
      else if (!on && ownsNative) {
        if (internal.breath === null) internal.breath = nativeBreath;
        if (internal.eyeBlink === null) internal.eyeBlink = nativeBlink;
        ownsNative = false;
      }
    }
    // Replace only the SDK's fixed procedural breath/automatic blink. Official
    // motion clips, physics, focus, expression manager and Core remain untouched.
    manageNative(enabled(mapping, state));
    const between = (a, b) => a + clamp(draw(), 0, 1) * (b - a);
    const mouth = new Set([p.mouthOpen, p.mouthOpenY, p.mouthForm, ...Object.values(p.vowels || {}),
      ...(mapping.channelGroups?.mouth || []).map(alias => p[alias]),
      ...(mapping.channelGroups?.mouthOpen || []).map(alias => p[alias])].filter(Boolean));
    const body = new Set((spec.bodyChannels || []).map(alias => p[alias]).filter(Boolean));
    const eyes = new Set([p.eyeLOpen, p.eyeROpen].filter(Boolean));
    const ids = new Set([...Object.values(p).filter(id => typeof id === "string"),
      ...Object.values(expressions).flatMap(e => (e.Parameters || []).map(item => item.Id))]);
    for (const id of [...ids]) if (mouth.has(id) || id === p.breath || eyes.has(id)) ids.delete(id);
    let lastAt = null, wasEnabled = false, envelope = 0, idleMix = 0, voiceAt = -Infinity;
    let sentence = 0, sentenceStarted = false, nods = 0, nodLimit = 1, nod = null, browserIndex = -1, generation, gesture = null;
    let nextIdle = Infinity, nextBlink = Infinity, blinkAt = -Infinity, blinkMs = 160, breathPhase = 0, breathPeriod = 5000;
    const tracks = {}, filtered = new Map(), filteredParts = new Map(), filteredEyes = new Map();
    const history = { sentences: [], nods: [], idleGestures: [], blinks: [], breathPeriods: [], drifts: [] };
    const remember = (key, value) => { history[key].push(value); if (history[key].length > 256) history[key].shift(); };
    const read = id => {
      if (!id || typeof core.getParameterValueById !== "function") return undefined;
      const values = core._model?.parameters;
      if (values?.ids && !values.ids.includes(id)) return undefined;
      const v = core.getParameterValueById(id);
      return Number.isFinite(v) ? v : undefined;
    };
    function track(name, now, amplitude, minMs, maxMs) {
      let t = tracks[name];
      if (!t || now >= t.until) {
        const duration = between(minMs, maxMs);
        t = tracks[name] = { from: t?.to || 0, to: between(-amplitude, amplitude), at: now, until: now + duration };
        remember("drifts", { name, at: now, duration, to: t.to });
      }
      return t.from + (t.to - t.from) * ease((now - t.at) / (t.until - t.at));
    }
    function startSentence(now) {
      sentence++; nods = 0; nodLimit = draw() < .7 ? 1 : 2;
      remember("sentences", { sentence, at: now, limit: nodLimit });
      requestNod(now);
    }
    function requestNod(now) {
      if (!nod && nods < nodLimit && draw() < .65) {
        nods++;
        nod = { at: now + between(200, 650), duration: between(950, 1450), sentence };
        remember("nods", { sentence, at: nod.at, duration: nod.duration });
      }
    }
    function prepare(now, frame = {}, ownership = {}) {
      const on = enabled(mapping, state);
      manageNative(on);
      if (!on) {
        wasEnabled = false; lastAt = null; delete state.live2dNaturalContext;
        return null;
      }
      if (!wasEnabled) {
        filtered.clear(); filteredParts.clear(); filteredEyes.clear();
        for (const id of ids) { const v = read(id); if (v !== undefined) filtered.set(id, v); }
        for (const id of Object.values(mapping.parts || {})) {
          const v = core.getPartOpacityById?.(id); if (Number.isFinite(v)) filteredParts.set(id, v);
        }
        for (const id of eyes) { const v = read(id); if (v !== undefined) filteredEyes.set(id, v); }
        nextIdle = now + between(9000, 16000); nextBlink = now + between(1800, 5500);
        envelope = 0; idleMix = 0; voiceAt = -Infinity; nod = null; gesture = null;
        lastAt = now; wasEnabled = true;
      }
      const dt = Math.max(0, Math.min(100, now - lastAt)); lastAt = now;
      const level = clamp(frame.mouth?.open ?? state.ttsAudioLevel, 0, 1);
      const playback = `${state.ttsPlaybackGeneration || 0}:${state.speechAnimStartedAt || 0}`;
      if (playback !== generation) { generation = playback; browserIndex = -1; voiceAt = -Infinity; nod = null; sentenceStarted = false; }
      const oldVoiceAt = voiceAt;
      if (level > .025) {
        // Without timestamped punctuation, keep the stricter whole-utterance
        // budget. A hesitant pause must not mint another pair of head nods.
        if (!sentenceStarted) { startSentence(now); sentenceStarted = true; }
        voiceAt = now;
      }
      // A short voiced-activity hold bridges syllable gaps, then a 200/600ms
      // envelope drives BODY ONLY. The original mouth/audio state is never edited.
      const voiced = now - voiceAt < 180;
      envelope = follow(envelope, voiced ? 1 : 0, dt, voiced ? 200 : 600);
      const speaking = now - voiceAt < 650;
      const browser = state.avatarBrowserSpeech;
      const index = browser?.boundaryIndex;
      if (browser?.phase === "playing" && Number.isFinite(index) && index > browserIndex && now >= (browser.boundaryAt || 0)) {
        const text = String(state.live2dSpeechText || "");
        const span = text.slice(Math.max(0, browserIndex), index);
        if (/[。！？.!?]/.test(span) && now - oldVoiceAt <= 750) startSentence(now);
        else if (/[，,；;：:]/.test(span)) requestNod(now);
        browserIndex = index;
      }
      const blocked = ownership.gestureActive || ownership.actionActive || state.dragData || state.windowDragActive;
      if (blocked) { gesture = null; nod = null; nextIdle = Math.max(nextIdle, now + between(9000, 16000)); }
      const idle = !speaking && !blocked && !state.chatBusy && !["listen", "think"].includes(frame.mode);
      idleMix = follow(idleMix, idle ? 1 : 0, dt, idle ? 600 : 200);
      if (idle && now >= nextIdle && !gesture) {
        const choices = (spec.idleGestures || []).filter(name => mapping.gestureVocabulary?.[name]?.keyframes);
        if (choices.length) {
          const candidates = choices.filter(name => name !== history.idleGestures.at(-1)?.name);
          const pool = candidates.length ? candidates : choices;
          const name = pool[Math.min(pool.length - 1, Math.floor(draw() * pool.length))];
          gesture = { name, at: now, spec: mapping.gestureVocabulary[name] };
          remember("idleGestures", { name, at: now, duration: gesture.spec.durationMs });
        }
        nextIdle = now + between(...(spec.idleIntervalMs || [14000, 30000]));
      }
      if (gesture && (now - gesture.at >= gesture.spec.durationMs || !idle)) gesture = null;
      breathPhase += dt / breathPeriod;
      if (breathPhase >= 1) {
        breathPhase %= 1; breathPeriod = between(3600, 6800);
        remember("breathPeriods", breathPeriod);
      }
      if (now >= nextBlink) {
        blinkAt = now; blinkMs = between(140, 210); nextBlink = now + between(2400, 6200);
        remember("blinks", { at: now, duration: blinkMs, nextAt: nextBlink });
      }
      const blinkPhase = (now - blinkAt) / blinkMs;
      const blink = blinkPhase >= 0 && blinkPhase < 1 ? Math.sin(Math.PI * blinkPhase) ** 2 : 0;
      const sway = track("sway", now, 1, 2800, 6300), roll = track("roll", now, 1, 3500, 7400);
      const gaze = { x: track("gazeX", now, .23, 1700, 4700), y: track("gazeY", now, .14, 2300, 5500) };
      const breath = (1 - Math.cos(breathPhase * Math.PI * 2)) * .5;
      const nodPhase = nod ? (now - nod.at) / nod.duration : -1;
      const nodWeight = nodPhase >= 0 && nodPhase < 1 ? Math.sin(Math.PI * nodPhase) ** 2 : 0;
      if (nodPhase >= 1) nod = null;
      const context = { now, dt, envelope, speaking, idleMix, breath, sway, roll, gaze, blink, nodWeight,
        gesture, blocked: !!blocked, gazeOwned: ownership.gazeOwned || frame.gaze != null };
      state.live2dNaturalContext = context;
      return context;
    }
    function add(alias, value) {
      if (p[alias] && !mouth.has(p[alias]) && Number.isFinite(value)) core.addParameterValueById(p[alias], value);
    }
    function apply() {
      const c = state.live2dNaturalContext;
      if (!c || !wasEnabled || typeof core.getParameterValueById !== "function") return;
      const gain = c.idleMix * (spec.idleStrength ?? 1);
      // Model-specific aliases/amplitudes stay in the mapping. Random drifts
      // supplement authored idle, without taking over explicit gaze or gestures.
      for (const [alias, value] of Object.entries(spec.idlePose || {})) {
        add(alias, value * (alias === "angleY" ? c.breath - .5 : c.sway) * gain);
      }
      if (!c.gazeOwned) { add("eyeBallX", c.gaze.x * gain); add("eyeBallY", c.gaze.y * gain); }
      if (p.breath) core.setParameterValueById(p.breath, c.breath);
      if (mapping.driver === "mapped") {
        for (const [alias, value] of Object.entries(spec.speechPose || {})) add(alias, value * c.envelope * (alias === "angleZ" ? c.roll : c.sway));
      }
      for (const [alias, value] of Object.entries(spec.nodPose || {})) add(alias, value * c.nodWeight);
      if (c.gesture) {
        const phase = clamp((c.now - c.gesture.at) / c.gesture.spec.durationMs, 0, 1), keys = c.gesture.spec.keyframes;
        const rightIndex = keys.findIndex(k => k.at > phase);
        if (rightIndex > 0) {
          const left = keys[rightIndex - 1], right = keys[rightIndex], t = ease((phase - left.at) / (right.at - left.at));
          for (const alias of new Set([...Object.keys(left.values), ...Object.keys(right.values)])) {
            add(alias, ((left.values[alias] || 0) * (1 - t) + (right.values[alias] || 0) * t) * gain * .24);
          }
        }
      }
      // One final pre-Core filter sees the complete authored + procedural pose.
      // Replacements start from the LAST DISPLAYED pose, never a zero snapshot.
      for (const id of ids) {
        const target = read(id); if (target === undefined) continue;
        const previous = filtered.get(id) ?? target;
        const tau = body.has(id) ? (Math.abs(target) > Math.abs(previous) ? 200 : 600) : 160;
        const value = follow(previous, target, c.dt, tau);
        filtered.set(id, value); core.setParameterValueById(id, value);
      }
      for (const id of Object.values(mapping.parts || {})) {
        const target = core.getPartOpacityById?.(id); if (!Number.isFinite(target)) continue;
        const value = follow(filteredParts.get(id) ?? target, target, c.dt, 220);
        filteredParts.set(id, value); core.setPartOpacityById(id, value);
      }
      if (!state.avatarIntentOverrides?.blinkSuppressed) {
        for (const id of eyes) {
          const v = read(id); if (v === undefined) continue;
          const base = follow(filteredEyes.get(id) ?? v, v, c.dt, 160);
          filteredEyes.set(id, base); core.setParameterValueById(id, base * (1 - c.blink));
        }
      }
    }
    return { prepare, apply, history, dispose() { manageNative(false); delete state.live2dNaturalContext;
      filtered.clear(); filteredParts.clear(); filteredEyes.clear(); } };
  }
  const api = { create, enabled };
  root.XinyuLive2DMotionNatural = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
