(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const requestAnimationFrame = deps.requestAnimationFrame || window.requestAnimationFrame || root.requestAnimationFrame || ((fn) => setTimeout(() => fn(performance.now()), 16));
    const clearTimeoutFn = window.clearTimeout || root.clearTimeout || clearTimeout;
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : () => "idle";
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : (style) => String(style || "neutral").trim() || "neutral";
    const sanitizeSpeakText = typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText : (text) => String(text || "").trim();
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
    const getMotionIntensityPreset = typeof deps.getMotionIntensityPreset === "function" ? deps.getMotionIntensityPreset : () => ({});
    const getActiveModelCadence = typeof deps.getActiveModelCadence === "function" ? deps.getActiveModelCadence : () => ({});
    const enqueueActionIntent = typeof deps.enqueueActionIntent === "function" ? deps.enqueueActionIntent : () => {};
    const hasPendingTalkLikeAction = typeof deps.hasPendingTalkLikeAction === "function" ? deps.hasPendingTalkLikeAction : () => false;
    const buildFollowupAwareIdleMotionContext = typeof deps.buildFollowupAwareIdleMotionContext === "function"
      ? deps.buildFollowupAwareIdleMotionContext
      : () => ({});
    const pickMoodMotionGroupsFromDeps = typeof deps.pickMoodMotionGroups === "function"
      ? deps.pickMoodMotionGroups
      : () => ["Idle"];
    const resetActionSystem = typeof deps.resetActionSystem === "function" ? deps.resetActionSystem : () => {};

    function extractMotionDefinitions(model = null) {
      const targetModel = model || state.model;
      if (!targetModel) {
        return {};
      }
      return (
        targetModel.internalModel?.motionManager?.definitions ||
        targetModel.internalModel?.settings?.FileReferences?.Motions ||
        {}
      );
    }

    function getMotionCount(group) {
      const arr = state.motionDefinitions?.[group];
      return Array.isArray(arr) ? arr.length : 0;
    }

    function listAvailableMotionGroups() {
      return Object.keys(state.motionDefinitions || {}).filter((group) => getMotionCount(group) > 0);
    }

    function setModelMotionDefinitions(model) {
      resetActionSystem();
      state.motionDefinitions = extractMotionDefinitions(model);
      state.availableMotionGroups = listAvailableMotionGroups();
    }

    function stopIdleMotionLoop() {
      if (!state.idleMotionTimer) {
        return;
      }
      clearTimeoutFn(state.idleMotionTimer);
      state.idleMotionTimer = 0;
    }

    function isSpeakingNow() {
      const browserSpeaking =
        "speechSynthesis" in window &&
        !!window.speechSynthesis &&
        !!window.speechSynthesis.speaking;
      const audioSpeaking =
        !!state.ttsAudio &&
        !state.ttsAudio.paused &&
        !state.ttsAudio.ended;
      const contextSpeaking = !!state.ttsContextSpeaking;
      return browserSpeaking || audioSpeaking || contextSpeaking;
    }

    function isListeningPresenceActive() {
      const phase = String(state.listeningPresencePhase || "idle").toLowerCase();
      const sessionId = Number(state.listeningPresenceSession || 0);
      if (!sessionId || !["armed", "hearing", "release"].includes(phase)) {
        return false;
      }
      if (state.uiView !== "model") {
        return true;
      }
      const updatedAt = Number(state._broadcastListeningUpdatedAt || 0);
      return updatedAt > 0 && Date.now() - updatedAt <= 1200;
    }

    function isActualAssistantAudioActive(now = performance.now()) {
      if (state.uiView !== "model") {
        return isSpeakingNow();
      }
      const updatedAt = Number(state._broadcastSpeechUpdatedAt || 0);
      const age = Number(now || performance.now()) - updatedAt;
      return state._broadcastAssistantAudioActive === true
        && updatedAt > 0
        && age >= -80
        && age <= 900;
    }

    function clearStaleBroadcastSpeechState(now = performance.now()) {
      if (state.uiView !== "model") {
        return false;
      }
      const t = Number(now || performance.now());
      const updatedAt = Number(state._broadcastSpeechUpdatedAt || 0);
      const animUntil = Number(state._broadcastSpeechExpiresAt || state.speechAnimUntil || 0);
      if (!updatedAt || t - updatedAt <= 900 || t <= animUntil + 180) {
        return false;
      }
      state._broadcastSpeaking = false;
      state._broadcastAssistantAudioActive = false;
      state._broadcastSpeechExpiresAt = 0;
      state.speechAnimUntil = 0;
      state.speechAnimStartedAt = 0;
      state.speechAnimDurationMs = 0;
      state.speechMouthOpen = 0;
      state.ttsAudioLevel = 0;
      state.moodHoldUntil = 0;
      if (state._broadcastSpeechCueOwned === true) {
        state._broadcastSpeechCueExpiresAt = Math.min(
          Number(state._broadcastSpeechCueExpiresAt || t),
          t
        );
      }
      return true;
    }

    function shouldDeferMotionForListening(opts = {}, now = performance.now()) {
      return isListeningPresenceActive()
        && opts.userInitiated !== true
        && !isActualAssistantAudioActive(now);
    }

    function isSpeechMotionActive(now = performance.now()) {
      if (state.uiView === "model") {
        const t = Number(now || performance.now());
        const updatedAt = Number(state._broadcastSpeechUpdatedAt || 0);
        const animUntil = Number(state._broadcastSpeechExpiresAt || state.speechAnimUntil || 0);
        if (updatedAt > 0 && t - updatedAt > 900) {
          if (t <= animUntil + 180) {
            return true;
          }
          clearStaleBroadcastSpeechState(t);
          return false;
        }
        if (state._broadcastSpeaking) {
          return true;
        }
        return t <= animUntil + 140;
      }
      if (isSpeakingNow()) {
        return true;
      }
      const t = Number(now || performance.now());
      const activeUntil = Number(state.speechAnimUntil || 0);
      const queuePending = Array.isArray(state.streamSpeakQueue) && state.streamSpeakQueue.length > 0;
      if (queuePending && t <= activeUntil + 260) {
        return true;
      }
      return false;
    }

    function shouldSkipIdleMotion() {
      if (!state.model || !state.motionEnabled || !state.idleMotionEnabled) {
        return true;
      }
      if (state.dragData || state.windowDragActive || state.animating) {
        return true;
      }
      if (state.chatBusy || isSpeakingNow() || (state.uiView === "model" && isSpeechMotionActive())) {
        return true;
      }
      if (shouldDeferMotionForListening()) {
        return true;
      }
      return false;
    }

    function scheduleIdleMotionLoop() {
      stopIdleMotionLoop();
      if (!state.idleMotionEnabled) {
        return;
      }
      const preset = getMotionIntensityPreset();
      const cadence = getActiveModelCadence();
      const scale = (Number(preset.idleIntervalScale) || 1) * (Number(cadence?.idleIntervalScale) || 1);
      const minMs = Math.max(5000, Math.round((Number(state.idleMotionMinMs) || 12000) * scale));
      const maxMs = Math.max(minMs + 1000, Math.round((Number(state.idleMotionMaxMs) || 24000) * scale));
      const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
      state.idleMotionTimer = window.setTimeout(async () => {
        state.idleMotionTimer = 0;
        if (!shouldSkipIdleMotion()) {
          enqueueActionIntent("idle", buildFollowupAwareIdleMotionContext());
        }
        scheduleIdleMotionLoop();
      }, delay);
    }

    function pickMoodMotionGroups(mood, source = "emotion") {
      const groups = pickMoodMotionGroupsFromDeps(mood, source);
      return Array.isArray(groups) && groups.length ? groups : ["Idle"];
    }

    function canPlayMotion(cooldownMs = null, force = false) {
      const now = performance.now();
      if (!force && now < state.motionCooldownUntil) {
        return false;
      }
      if (cooldownMs != null && Number.isFinite(Number(cooldownMs))) {
        state.motionCooldownUntil = now + Math.max(120, Number(cooldownMs));
      }
      return true;
    }

    async function playMotionGroup(group, priority = 3) {
      if (!state.model || !group) {
        return false;
      }
      const count = getMotionCount(group);
      if (count <= 0) {
        return false;
      }
      let candidates = Array.from({ length: count }, (_, i) => i);
      if (count > 1) {
        const seed = Math.floor(Math.random() * count);
        candidates = [...candidates.slice(seed), ...candidates.slice(0, seed)];
      }
      for (const idx of candidates) {
        try {
          await state.model.motion(group, idx, priority);
          state.lastMotionGroup = group;
          return true;
        } catch (_) {
          // Try next index in same group.
        }
      }
      return false;
    }

    async function tryBuiltInMotion(mood, opts = {}) {
      if (!state.model || !state.motionEnabled) {
        return false;
      }
      if (state.dragData || state.windowDragActive) {
        return false;
      }
      if (shouldDeferMotionForListening(opts)) {
        return false;
      }
      const source = String(opts.source || "emotion");
      const allowFallback = opts.allowFallback !== false;
      const priority = Number.isFinite(Number(opts.priority)) ? Number(opts.priority) : 3;
      const force = !!opts.force;
      const preserveGroupOrder = !!opts.preserveGroupOrder;
      const cooldownMs = Number.isFinite(Number(opts.cooldownMs))
        ? Number(opts.cooldownMs)
        : state.motionCooldownMs;
      const keyedCooldown = String(opts.motionCooldownKey || "").trim();
      const now = performance.now();
      if (
        keyedCooldown
        && now < Number(state.motionKeyedCooldowns?.[keyedCooldown] || 0)
      ) {
        return false;
      }
      if (!canPlayMotion(cooldownMs, force)) {
        return false;
      }
      const explicitGroups = uniqueMotionGroups(opts.groups);
      const groups = (explicitGroups.length ? explicitGroups : pickMoodMotionGroups(mood, source))
        .filter((group) => getMotionCount(group) > 0);
      if (!preserveGroupOrder) {
        groups.sort((a, b) => {
          if (a === state.lastMotionGroup) return 1;
          if (b === state.lastMotionGroup) return -1;
          return 0;
        });
      }
      for (const group of groups) {
        const ok = await playMotionGroup(group, priority);
        if (ok) {
          if (keyedCooldown) {
            if (!state.motionKeyedCooldowns || typeof state.motionKeyedCooldowns !== "object") {
              state.motionKeyedCooldowns = {};
            }
            state.motionKeyedCooldowns[keyedCooldown] = now + Math.max(120, Number(cooldownMs) || 0);
          }
          const authoredMotion = opts.authoredMotion && typeof opts.authoredMotion === "object"
            ? opts.authoredMotion
            : null;
          if (authoredMotion?.group === group) {
            const durationMs = Math.max(240, Math.round(Number(authoredMotion.durationMs) || 0));
            state.hiyoriAuthoredMotion = {
              group,
              file: String(authoredMotion.file || ""),
              emotion: String(authoredMotion.emotion || opts.motionRole || ""),
              action: String(authoredMotion.action || opts.motionCue || ""),
              playbackGeneration: Number(opts.playbackGeneration || 0),
              startedAt: now,
              until: now + durationMs
            };
            state.hiyoriAuthoredMotionUntil = now + durationMs;
          }
          state.lastMotionDirectorDispatch = {
            group,
            source,
            motionCue: String(opts.motionCue || ""),
            motionRole: String(opts.motionRole || ""),
            authored: authoredMotion?.group === group,
            at: Date.now()
          };
          return true;
        }
      }
      if (!allowFallback) {
        return false;
      }
      return false;
    }

    function uniqueMotionGroups(groups) {
      if (!Array.isArray(groups)) {
        return [];
      }
      const seen = new Set();
      return groups
        .map((group) => String(group || "").trim())
        .filter((group) => {
          if (!group || seen.has(group)) {
            return false;
          }
          seen.add(group);
          return true;
        });
    }

    function animateFallback(mood, opts = {}) {
      if (!state.model || state.animating || state.dragData || state.windowDragActive) {
        return false;
      }
      if (shouldDeferMotionForListening(opts)) {
        return false;
      }
      state.animating = true;
      const model = state.model;
      const style = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
      const intent = String(opts.intent || opts.source || "idle").toLowerCase();
      const amplitudeScale = clampNumber(Number(getMotionIntensityPreset()?.amplitudeScale) || 1, 0.72, 1.55);
      const start = performance.now();
      const duration = intent === "reply" ? 980 : (intent === "talk" ? 760 : 1120);
      const bx = state.baseTransform.x;
      const by = state.baseTransform.y;
      const bs = state.baseTransform.scale;
      const swayBias = style === "playful" ? 1.18 : (style === "comfort" ? 0.82 : 1.0);
      const tiltBias = style === "steady" ? 0.8 : 1.0;

      const frame = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const wave = Math.sin(p * Math.PI * 4);
        const pulse = Math.sin(p * Math.PI);

        if (mood === "happy") {
          model.y = by - Math.abs(wave) * 26 * swayBias * amplitudeScale;
          model.x = bx + wave * 7 * swayBias * amplitudeScale;
          model.scale.set(bs * (1 + Math.abs(wave) * 0.06 * amplitudeScale));
          model.rotation = wave * 0.038 * tiltBias * amplitudeScale;
        } else if (mood === "sad") {
          model.y = by + p * 18 * amplitudeScale;
          model.x = bx - pulse * 4 * amplitudeScale;
          model.scale.set(bs * (1 - p * 0.05 * amplitudeScale));
          model.rotation = -0.06 * tiltBias * amplitudeScale;
        } else if (mood === "angry") {
          model.x = bx + wave * 14 * amplitudeScale;
          model.y = by - Math.abs(Math.sin(p * Math.PI * 5)) * 6 * amplitudeScale;
          model.rotation = wave * 0.05 * tiltBias * amplitudeScale;
        } else if (mood === "surprised") {
          model.y = by - pulse * 12 * amplitudeScale;
          model.scale.set(bs * (1 + Math.abs(wave) * 0.1 * amplitudeScale));
          model.rotation = wave * 0.018 * amplitudeScale;
        } else if (intent === "talk") {
          const bounce = Math.sin(p * Math.PI * 8);
          model.x = bx + wave * 18 * swayBias * amplitudeScale;
          model.y = by + (bounce * 6 - Math.abs(wave) * 18) * amplitudeScale;
          model.rotation = wave * 0.044 * tiltBias * amplitudeScale;
        } else if (intent === "thinking") {
          model.x = bx + Math.sin(p * Math.PI * 2) * 5 * amplitudeScale;
          model.y = by - pulse * 6 * amplitudeScale;
          model.rotation = -0.025 * amplitudeScale;
        } else {
          model.x = bx + wave * 3 * swayBias * amplitudeScale;
          model.y = by;
          model.scale.set(bs);
          model.rotation = wave * 0.012 * amplitudeScale;
        }

        if (p < 1) {
          requestAnimationFrame(frame);
          return;
        }

        model.x = bx;
        model.y = by;
        model.scale.set(bs);
        model.rotation = 0;
        state.animating = false;
      };

      requestAnimationFrame(frame);
      return true;
    }

    function triggerTapMotion() {
      enqueueActionIntent("tap", { combo: true, userInitiated: true });
    }

    function maybePlayTalkGesture(text, style = "neutral") {
      if (!state.motionEnabled || !state.model || state.dragData || state.windowDragActive) {
        return;
      }
      const now = performance.now();
      if (state.motionQuietDuringSpeech && state.speakingEnabled) {
        state.speakingMotionCooldownUntil = Math.max(Number(state.speakingMotionCooldownUntil) || 0, now + 260);
        return;
      }
      const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
      const speakingNow = isSpeechMotionActive(now);
      const pendingStreamSegments = Array.isArray(state.streamSpeakQueue) ? state.streamSpeakQueue.length : 0;
      if ((speakingNow && motionBlend > 0.48) || motionBlend > 0.7) {
        state.speakingMotionCooldownUntil = Math.max(Number(state.speakingMotionCooldownUntil) || 0, now + 220);
        return;
      }
      if (pendingStreamSegments > 1 || hasPendingTalkLikeAction()) {
        state.speakingMotionCooldownUntil = Math.max(Number(state.speakingMotionCooldownUntil) || 0, now + 180);
        return;
      }
      if (now < state.speakingMotionCooldownUntil) {
        return;
      }
      state.speakingMotionCooldownUntil = now + state.speakingMotionCooldownMs;
      const clean = sanitizeSpeakText(text);
      if (!clean) {
        return;
      }
      const clauses = (clean.match(/[，。！？!?、]/g) || []).length + 1;
      const lenBeats = Math.ceil((clean.length || 0) / 20);
      const strongPunct = (clean.match(/[!?\uFF01\uFF1F]/g) || []).length;
      const minorPunct = (clean.match(/[,\uFF0C\u3001;\uFF1B:\uFF1A]/g) || []).length;
      const cadence = getActiveModelCadence();
      const beatScale = Math.max(0.8, Math.min(1.4, Number(cadence?.talkBeatScale) || 1));
      const beats = Math.max(1, Math.min(4, Math.round(Math.max(clauses, lenBeats) * beatScale)));
      const emphasis = clampNumber(
        strongPunct * 0.34 + minorPunct * 0.08 + (style === "playful" ? 0.08 : 0),
        0,
        1
      );
      enqueueActionIntent("talk", { text: clean, style, combo: true, beats, emphasis, accentCount: strongPunct });
    }

    async function playEmotion(text, opts = {}) {
      if (shouldDeferMotionForListening(opts)) {
        return false;
      }
      const mood = detectMood(text);
      const played = await tryBuiltInMotion(mood, opts);
      if (played) {
        return true;
      }
      if (opts.allowFallback !== false) {
        return animateFallback(mood, opts);
      }
      return false;
    }

    return {
      extractMotionDefinitions,
      getMotionCount,
      listAvailableMotionGroups,
      setModelMotionDefinitions,
      stopIdleMotionLoop,
      isSpeakingNow,
      isListeningPresenceActive,
      isActualAssistantAudioActive,
      clearStaleBroadcastSpeechState,
      shouldDeferMotionForListening,
      isSpeechMotionActive,
      shouldSkipIdleMotion,
      scheduleIdleMotionLoop,
      pickMoodMotionGroups,
      canPlayMotion,
      playMotionGroup,
      tryBuiltInMotion,
      animateFallback,
      triggerTapMotion,
      maybePlayTalkGesture,
      playEmotion
    };
  }

  const api = { createController };
  root.TaffyMotionRuntimeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
