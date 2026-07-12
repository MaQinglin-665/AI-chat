(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const consoleObject = deps.consoleObject || root.console || { error: () => {} };
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const requestAnimationFrameFn =
      typeof deps.requestAnimationFrame === "function"
        ? deps.requestAnimationFrame
        : (fn) => window.setTimeout(fn, 16);
    const cancelAnimationFrameFn = typeof deps.cancelAnimationFrame === "function"
      ? deps.cancelAnimationFrame
      : (id) => window.clearTimeout?.(id);
    const setTimeoutFn = typeof deps.setTimeout === "function"
      ? deps.setTimeout
      : (fn, delay) => window.setTimeout(fn, delay);
    const clearTimeoutFn = typeof deps.clearTimeout === "function"
      ? deps.clearTimeout
      : (id) => window.clearTimeout?.(id);
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;
    const resolvePerformanceCueMotionPlan = typeof deps.resolvePerformanceCueMotionPlan === "function"
      ? deps.resolvePerformanceCueMotionPlan
      : (cue) => root.TaffyPerformanceCueController?.resolvePerformanceCueMotionPlan?.(cue) || null;
    const enqueueActionIntent = typeof deps.enqueueActionIntent === "function" ? deps.enqueueActionIntent : () => {};
    const triggerExpressionPulse = typeof deps.triggerExpressionPulse === "function" ? deps.triggerExpressionPulse : () => {};

    function getPerfNow() {
      const value = Number(performance?.now?.());
      return Number.isFinite(value) ? value : Date.now();
    }

    function getWallNow() {
      const value = typeof deps.wallNow === "function" ? Number(deps.wallNow()) : Date.now();
      return Number.isFinite(value) ? value : Date.now();
    }

    function clampBridgeDuration(value, fallback = 0) {
      const parsed = Number(value);
      const safe = Number.isFinite(parsed) ? parsed : Number(fallback || 0);
      return Math.max(0, Math.min(90000, Math.round(safe)));
    }

    function normalizeBroadcastSpeechStyle(value) {
      const style = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_");
      return ["neutral", "playful", "comfort", "steady", "clear"].includes(style) ? style : "";
    }

    function toBridgeEpoch(localDeadline, perfNow, wallNow) {
      const remaining = clampBridgeDuration(Number(localDeadline || 0) - Number(perfNow || 0));
      return remaining > 0 ? Math.round(wallNow + remaining) : 0;
    }

    function getSpeechBroadcastSenderId() {
      if (state._speechBroadcastSenderId) {
        return String(state._speechBroadcastSenderId);
      }
      const entropy = Math.floor(Math.random() * 0xFFFFFF).toString(36);
      state._speechBroadcastSenderId = `speech-${Date.now().toString(36)}-${entropy}`;
      return String(state._speechBroadcastSenderId);
    }

    function cleanPerformancePhaseToken(value, fallback = "", maxLength = 48) {
      const cleaned = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, Math.max(1, Number(maxLength) || 48));
      return cleaned || fallback;
    }

    function clampPerformancePhaseNumber(value, fallback, min, max) {
      const parsed = Number(value);
      const safe = Number.isFinite(parsed) ? parsed : Number(fallback);
      return Math.max(Number(min), Math.min(Number(max), safe));
    }

    function normalizeBroadcastPerformancePhase(input = {}) {
      const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
      const plan = source.phasePlan && typeof source.phasePlan === "object" && !Array.isArray(source.phasePlan)
        ? source.phasePlan
        : source;
      const phase = cleanPerformancePhaseToken(source.phase || plan.phase, "pre_reaction");
      if (!["pre_reaction", "thinking_wait"].includes(phase) || plan.suppressed === true || source.suppressed === true) {
        return null;
      }
      const rawIntent = cleanPerformancePhaseToken(plan.actionIntent || source.actionIntent, "none");
      const actionIntent = ["listen", "thinking", "idle"].includes(rawIntent) ? rawIntent : "none";
      const pulseBoost = clampPerformancePhaseNumber(plan.pulseBoost ?? source.pulseBoost, 0, 0, 1.4);
      const pulseDurationMs = Math.round(clampPerformancePhaseNumber(
        plan.pulseDurationMs ?? source.pulseDurationMs,
        0,
        0,
        1800
      ));
      if (actionIntent === "none" && !(pulseBoost > 0 && pulseDurationMs > 0)) {
        return null;
      }
      const rawTags = Array.isArray(plan.motionTags)
        ? plan.motionTags
        : (Array.isArray(source.motionTags) ? source.motionTags : []);
      return {
        version: 1,
        phase,
        turnId: Math.max(0, Math.round(Number(source.turnId || source.turn_id || 0))),
        actionIntent,
        actionStyle: cleanPerformancePhaseToken(plan.actionStyle || source.actionStyle || source.style, "neutral"),
        actionMood: cleanPerformancePhaseToken(plan.actionMood || source.actionMood || source.mood, "idle"),
        pulseStyle: cleanPerformancePhaseToken(plan.pulseStyle || source.pulseStyle || source.style, "neutral"),
        pulseBoost,
        pulseDurationMs,
        motionCue: cleanPerformancePhaseToken(plan.motionCue || source.motionCue || plan.name || source.name, "none"),
        motionRole: cleanPerformancePhaseToken(plan.motionRole || source.motionRole, "pre_reaction"),
        motionTags: rawTags
          .map((item) => cleanPerformancePhaseToken(item, "", 24))
          .filter(Boolean)
          .slice(0, 8),
        combo: plan.combo === true || source.combo === true,
        beats: Math.round(clampPerformancePhaseNumber(plan.beats ?? source.beats, 1, 1, 4)),
        emphasis: clampPerformancePhaseNumber(plan.emphasis ?? source.emphasis, 0, 0, 1),
        priority: Math.round(clampPerformancePhaseNumber(plan.priority ?? source.priority, 2, 0, 5)),
        cooldownMs: Math.round(clampPerformancePhaseNumber(plan.cooldownMs ?? source.cooldownMs, 0, 0, 4000))
      };
    }

    function requestChatSpeechBroadcastNow() {
      if (!state._speechBroadcastRunning || typeof state._speechBroadcastTick !== "function") {
        return false;
      }
      if (state._speechBroadcastTimer) {
        if (state._speechBroadcastScheduleKind === "animation") {
          cancelAnimationFrameFn(state._speechBroadcastTimer);
        } else {
          clearTimeoutFn(state._speechBroadcastTimer);
        }
      }
      state._speechBroadcastTimer = 0;
      state._speechBroadcastScheduleKind = "";
      state._speechBroadcastTick();
      return true;
    }

    function clearPublishedPerformancePhase(input = {}) {
      const current = state._speechBroadcastPerformancePhase;
      const requestedTurnId = Math.max(0, Math.round(Number(input.turnId || input.turn_id || 0)));
      const currentTurnId = Math.max(0, Math.round(Number(current?.turnId || 0)));
      if (requestedTurnId > 0 && currentTurnId > 0 && requestedTurnId !== currentTurnId) {
        return false;
      }
      if (!current && !state._speechBroadcastPerformancePhaseExpiresAt) {
        return false;
      }
      state._speechBroadcastPerformancePhase = null;
      state._speechBroadcastPerformancePhaseExpiresAt = 0;
      state._speechBroadcastPerformancePhaseRevision = Math.max(
        0,
        Number(state._speechBroadcastPerformancePhaseRevision || 0)
      ) + 1;
      state._speechBroadcastPerformancePhaseSentAtWallMs = getWallNow();
      state._speechBroadcastSignature = "";
      if (input.broadcastNow !== false) {
        requestChatSpeechBroadcastNow();
      }
      return true;
    }

    function publishPerformancePhase(input = {}) {
      if (state.uiView !== "chat") {
        return false;
      }
      const phase = normalizeBroadcastPerformancePhase(input);
      if (!phase) {
        clearPublishedPerformancePhase(input);
        return false;
      }
      const now = getPerfNow();
      const holdMs = Math.round(Math.max(
        450,
        Math.min(3600, Math.max(760, phase.pulseDurationMs + 900, phase.actionIntent !== "none" ? 1500 : 0))
      ));
      state._speechBroadcastPerformancePhase = phase;
      state._speechBroadcastPerformancePhaseExpiresAt = now + holdMs;
      state._speechBroadcastPerformancePhaseRevision = Math.max(
        0,
        Number(state._speechBroadcastPerformancePhaseRevision || 0)
      ) + 1;
      state._speechBroadcastPerformancePhaseSentAtWallMs = getWallNow();
      state._speechBroadcastSignature = "";
      requestChatSpeechBroadcastNow();
      return true;
    }

    function getPublishedPerformancePhase(now) {
      const phase = normalizeBroadcastPerformancePhase(state._speechBroadcastPerformancePhase);
      const expiresAt = Number(state._speechBroadcastPerformancePhaseExpiresAt || 0);
      if (!phase || !(expiresAt > Number(now || 0))) {
        if (state._speechBroadcastPerformancePhase || expiresAt) {
          clearPublishedPerformancePhase({ broadcastNow: false });
        }
        return null;
      }
      return phase;
    }

    function getLocalBridgeDeadline(epochMs, wallNow, perfNow) {
      const epoch = Number(epochMs || 0);
      if (!Number.isFinite(epoch) || epoch <= 0) {
        return 0;
      }
      const remaining = clampBridgeDuration(epoch - wallNow);
      return remaining > 0 ? perfNow + remaining : 0;
    }

    function shouldAcceptBroadcastSpeech(data, receivedPerfNow, receivedWallNow) {
      const senderId = String(data?.speechSenderId || "").trim();
      const revision = Math.max(0, Math.round(Number(data?.speechRevision) || 0));
      const sentAtWallMs = Number(data?.speechSentAtWallMs || 0);
      const previousSenderId = String(state._broadcastSpeechSenderId || "");
      const previousRevision = Math.max(0, Math.round(Number(state._broadcastSpeechRevision) || 0));
      const previousSentAtWallMs = Number(state._broadcastSpeechSentAtWallMs || 0);
      const updatedAt = Number(state._broadcastSpeechUpdatedAt || 0);
      const receiverStale = updatedAt > 0 && receivedPerfNow - updatedAt > 900;
      const speechExpiresAtWallMs = Number(data?.speechExpiresAtEpochMs || 0);
      if (sentAtWallMs > 0 && receivedWallNow - sentAtWallMs > 7000) {
        return false;
      }
      if (data?.speaking === true && speechExpiresAtWallMs > 0 && speechExpiresAtWallMs <= receivedWallNow) {
        return false;
      }
      if (!senderId || !revision) {
        return !previousSenderId || receiverStale;
      }
      if (senderId === previousSenderId && !receiverStale) {
        if (revision < previousRevision) {
          return false;
        }
        if (revision === previousRevision && sentAtWallMs > 0 && sentAtWallMs <= previousSentAtWallMs) {
          return false;
        }
      }
      if (
        senderId !== previousSenderId
        && !receiverStale
        && sentAtWallMs > 0
        && previousSentAtWallMs > 0
        && sentAtWallMs < previousSentAtWallMs
      ) {
        return false;
      }
      return true;
    }

    function applyBroadcastSpeechTiming(data, receivedPerfNow, receivedWallNow) {
      const expiresAt = getLocalBridgeDeadline(data?.speechExpiresAtEpochMs, receivedWallNow, receivedPerfNow);
      const startedAtEpochMs = Number(data?.speechStartedAtEpochMs || 0);
      const durationMs = clampBridgeDuration(data?.animDurationMs, 0);
      const elapsedMs = startedAtEpochMs > 0
        ? clampBridgeDuration(receivedWallNow - startedAtEpochMs)
        : 0;
      state.speechAnimUntil = expiresAt;
      state.speechAnimDurationMs = durationMs;
      state.speechAnimStartedAt = durationMs > 0
        ? receivedPerfNow - Math.min(durationMs, elapsedMs)
        : (expiresAt > 0 ? receivedPerfNow : 0);
      state._broadcastSpeechExpiresAt = expiresAt;
      const moodHoldUntil = getLocalBridgeDeadline(data?.moodHoldExpiresAtEpochMs, receivedWallNow, receivedPerfNow);
      if (Object.prototype.hasOwnProperty.call(data || {}, "moodHoldExpiresAtEpochMs")) {
        state.moodHoldUntil = moodHoldUntil;
      }
      return {
        expiresAt,
        moodHoldUntil,
        cueExpiresAt: getLocalBridgeDeadline(data?.performanceCueExpiresAtEpochMs, receivedWallNow, receivedPerfNow)
      };
    }

    function clearBroadcastPerformancePhase() {
      state._broadcastPerformancePhase = null;
      state._broadcastPerformancePhaseExpiresAt = 0;
      state._broadcastPerformancePhaseKey = "";
    }

    function applyBroadcastPerformancePhase(data, receivedPerfNow, receivedWallNow) {
      const revision = Math.max(0, Math.round(Number(data?.performancePhaseRevision || 0)));
      if (!revision) {
        return false;
      }
      const senderId = String(data?.performancePhaseSenderId || data?.speechSenderId || "").trim();
      const sentAtWallMs = Number(data?.performancePhaseSentAtWallMs || data?.speechSentAtWallMs || 0);
      const previousSenderId = String(state._broadcastPerformancePhaseSenderId || "");
      const previousRevision = Math.max(0, Math.round(Number(state._broadcastPerformancePhaseRevision || 0)));
      const previousSentAtWallMs = Number(state._broadcastPerformancePhaseSentAtWallMs || 0);
      if (!senderId || (sentAtWallMs > 0 && receivedWallNow - sentAtWallMs > 7000)) {
        return false;
      }
      if (senderId === previousSenderId && revision <= previousRevision) {
        return false;
      }
      if (
        senderId !== previousSenderId
        && previousSentAtWallMs > 0
        && sentAtWallMs > 0
        && sentAtWallMs <= previousSentAtWallMs
      ) {
        return false;
      }
      state._broadcastPerformancePhaseSenderId = senderId;
      state._broadcastPerformancePhaseRevision = revision;
      state._broadcastPerformancePhaseSentAtWallMs = sentAtWallMs || receivedWallNow;
      const phase = normalizeBroadcastPerformancePhase(data?.performancePhase);
      const expiresAt = getLocalBridgeDeadline(
        data?.performancePhaseExpiresAtEpochMs,
        receivedWallNow,
        receivedPerfNow
      );
      if (!phase || !(expiresAt > receivedPerfNow)) {
        clearBroadcastPerformancePhase();
        return false;
      }
      const key = `${senderId}|${revision}`;
      if (key === String(state._broadcastPerformancePhaseKey || "")) {
        return false;
      }
      state._broadcastPerformancePhase = phase;
      state._broadcastPerformancePhaseExpiresAt = expiresAt;
      state._broadcastPerformancePhaseKey = key;
      if (phase.pulseBoost > 0 && phase.pulseDurationMs > 0) {
        try {
          triggerExpressionPulse(phase.pulseStyle || phase.actionStyle, phase.pulseBoost, phase.pulseDurationMs);
        } catch (_) {
          // A pulse is optional when the detached runtime is still loading.
        }
      }
      if (phase.actionIntent && phase.actionIntent !== "none") {
        try {
          enqueueActionIntent(phase.actionIntent, {
            style: phase.actionStyle,
            mood: phase.actionMood,
            combo: phase.combo === true,
            beats: phase.beats,
            emphasis: phase.emphasis,
            motionCue: phase.motionCue,
            motionRole: phase.motionRole || "pre_reaction",
            motionTags: phase.motionTags,
            priority: phase.priority,
            cooldownMs: phase.cooldownMs,
            source: "split_window_performance_phase"
          });
        } catch (_) {
          // Existing action-plan fallbacks decide whether a model motion can run.
        }
      }
      return true;
    }

    function clearBroadcastPerformanceCue() {
      if (state._broadcastSpeechCueOwned !== true) {
        return false;
      }
      state._broadcastSpeechCueOwned = false;
      state._broadcastSpeechCueExpiresAt = 0;
      state._broadcastSpeechCueKey = "";
      if (typeof deps.applySpeechPerformanceCue === "function") {
        deps.applySpeechPerformanceCue(null);
      }
      return true;
    }

    function getBroadcastPerformanceCueKey(data) {
      const cue = data?.performanceCue;
      if (!cue || typeof cue !== "object") {
        return "";
      }
      return [
        String(data?.speechSenderId || ""),
        Number(data?.streamSessionId || 0),
        Number(data?.playbackGeneration || 0),
        Math.round(Number(data?.speechStartedAtEpochMs || 0) / 250) * 250,
        cue.version || 1,
        cue.emotion || "",
        cue.action || "",
        cue.intensity || ""
      ].join("|");
    }

    function maybeTriggerPerformanceCueMotion(cue = null, data = {}) {
      if (!cue || typeof deps.tryBuiltInMotion !== "function") {
        return false;
      }
      if (data.speaking !== true && data.allowSilentPerformanceCue !== true) {
        return false;
      }
      const plan = resolvePerformanceCueMotionPlan(cue);
      if (!plan?.shouldTrigger || !Array.isArray(plan.groups) || !plan.groups.length) {
        return false;
      }
      const playbackKey = data.sessionId
        ? `session:${data.sessionId}`
        : data.playbackGeneration
          ? `playback:${data.playbackGeneration}`
          : `animation:${data.animStartedAt || ""}|${data.animUntil || ""}`;
      const key = [
        cue.version || 1,
        plan.emotion || "",
        plan.action || "",
        plan.intensity || "",
        playbackKey
      ].join("|");
      if (key && state._lastPerformanceCueMotionKey === key) {
        return false;
      }
      state._lastPerformanceCueMotionKey = key;
      try {
        deps.tryBuiltInMotion(plan.mood || "idle", {
          source: "performance_cue",
          motionCue: plan.motionCue || "",
          motionRole: plan.motionRole || "",
          groups: plan.groups,
          preserveGroupOrder: true,
          force: true,
          cooldownMs: plan.cooldownMs,
          priority: plan.priority,
          allowFallback: false
        });
      } catch (_) {
        // Motion playback is optional; parameter fallback still applies.
        return false;
      }
      return true;
    }

    async function loadStartupPreferences() {
      await deps.loadConfig?.();
      try {
        await deps.resolveApiToken?.(true);
      } catch (_) {
        // Let authFetch retry on first 401.
      }
      deps.initAssistantAvatar?.();
      deps.loadChatTranslationVisibilityFromStorage?.();
      deps.loadSubtitleEnabledFromStorage?.();
      deps.loadSubtitlePositionFromStorage?.();
      deps.loadOnboardingSeenFromStorage?.();
      deps.loadCharacterExperienceProfile?.();
      deps.loadCharacterBrainSnapshotFromStorage?.();
      await deps.loadPersonaCard?.();
    }

    async function loadModelStartupPreferences() {
      await deps.loadConfig?.();
      try {
        await deps.resolveApiToken?.(true);
      } catch (_) {
        // Let authFetch retry on first 401.
      }
      deps.loadSubtitleEnabledFromStorage?.();
      deps.loadSubtitlePositionFromStorage?.();
    }

    function scheduleDesktopBridgeRechecks() {
      if (!state.desktopMode || state.desktopCanMoveWindow || state.windowLocked) {
        return;
      }
      window.setTimeout(() => deps.refreshDesktopBridgeReady?.(), 350);
      window.setTimeout(() => deps.refreshDesktopBridgeReady?.(), 900);
      window.setTimeout(() => deps.refreshDesktopBridgeReady?.(), 1600);
    }

    function applyBroadcastListeningPresence(listening) {
      if (!listening || typeof listening !== "object" || Array.isArray(listening)) {
        return false;
      }
      const phase = ["idle", "armed", "hearing", "release"].includes(String(listening.phase || "").toLowerCase())
        ? String(listening.phase).toLowerCase()
        : "idle";
      const sessionId = phase === "idle" ? 0 : Math.max(0, Number(listening.sessionId || 0));
      const revision = Math.max(0, Number(listening.revision || 0));
      const now = Date.now();
      const previousRevision = Math.max(0, Number(state.listeningPresenceRevision || 0));
      const previousSession = Math.max(0, Number(state.listeningPresenceSession || 0));
      const staleSender = Number(state._broadcastListeningUpdatedAt || 0) > 0
        && now - Number(state._broadcastListeningUpdatedAt || 0) > 1200;
      if (!staleSender && (revision < previousRevision || (revision === previousRevision && sessionId < previousSession))) {
        return false;
      }
      state.listeningPresencePhase = phase;
      state.listeningPresenceSession = sessionId;
      state.listeningPresenceRevision = revision;
      state.listeningPresenceLevel = 0;
      state.listeningPresenceUpdatedAt = now;
      state._broadcastListeningUpdatedAt = now;
      return true;
    }

    function startModelSpeechBroadcastListener() {
      try {
        const channel = new window.BroadcastChannel("taffy-speech");
        channel.onmessage = (event) => {
          const data = event.data;
          if (!data || data.type !== "speech") return;
          const receivedPerfNow = getPerfNow();
          const receivedWallNow = getWallNow();
          if (!shouldAcceptBroadcastSpeech(data, receivedPerfNow, receivedWallNow)) {
            return;
          }
          const timing = applyBroadcastSpeechTiming(data, receivedPerfNow, receivedWallNow);
          state._broadcastSpeechUpdatedAt = receivedPerfNow;
          state._broadcastSpeechSenderId = String(data.speechSenderId || "").trim();
          state._broadcastSpeechRevision = Math.max(0, Math.round(Number(data.speechRevision) || 0));
          state._broadcastSpeechSentAtWallMs = Number(data.speechSentAtWallMs || 0) || receivedWallNow;
          state.speechMouthOpen = Number(data.mouthOpen) || 0;
          state.speechAnimMood = String(data.mood || "idle");
          const speechStyle = normalizeBroadcastSpeechStyle(data.speechStyle);
          if (speechStyle) {
            // Live2D uses speechAnimStyle for mouth cadence and currentTalkStyle
            // for expression/body layers. Mirror only validated enum values; a
            // missing/invalid older packet must not erase the current delivery.
            state.speechAnimStyle = speechStyle;
            state.currentTalkStyle = speechStyle;
          }
          state._broadcastSpeaking = !!data.speaking;
          state._broadcastAssistantAudioActive = data.assistantAudioActive === true;
          state.ttsAudioLevel = Number(data.audioLevel) || 0;
          applyBroadcastListeningPresence(data.listening);
          applyBroadcastPerformancePhase(data, receivedPerfNow, receivedWallNow);
          const cueIsFresh = timing.cueExpiresAt > receivedPerfNow;
          if (data.performanceCue && cueIsFresh && typeof deps.applySpeechPerformanceCue === "function") {
            const cueKey = getBroadcastPerformanceCueKey(data);
            const cueChanged = cueKey !== String(state._broadcastSpeechCueKey || "");
            state._broadcastSpeechCueOwned = true;
            state._broadcastSpeechCueExpiresAt = timing.cueExpiresAt;
            state._broadcastSpeechCueKey = cueKey;
            if (cueChanged) {
              deps.applySpeechPerformanceCue(data.performanceCue);
            }
            if (Number(state.speechPerformanceCueUntil || 0) > 0) {
              state.speechPerformanceCueUntil = Math.min(
                Number(state.speechPerformanceCueUntil || 0),
                timing.cueExpiresAt
              );
            }
            if (Number(state.speechEmotionPoseUntil || 0) > 0) {
              state.speechEmotionPoseUntil = Math.min(
                Number(state.speechEmotionPoseUntil || 0),
                timing.cueExpiresAt
              );
            }
            if (Number(state.moodHoldUntil || 0) > 0) {
              const limits = [Number(state.moodHoldUntil || 0), timing.cueExpiresAt];
              if (timing.moodHoldUntil > 0) {
                limits.push(timing.moodHoldUntil);
              }
              state.moodHoldUntil = Math.min(...limits);
            }
            maybeTriggerPerformanceCueMotion(data.performanceCue, data);
          } else if (!data.performanceCue || (state._broadcastSpeechCueOwned === true && !cueIsFresh)) {
            clearBroadcastPerformanceCue();
          }
        };
      } catch (_) {
        // BroadcastChannel is optional in older shells.
      }
    }

    function startChatSpeechBroadcastLoop() {
      if (state._speechBroadcastRunning) return;
      try {
        state._speechBroadcast = new window.BroadcastChannel("taffy-speech");
        state._speechBroadcastRunning = true;
        function chatSpeechBroadcastLoop() {
          if (!state._speechBroadcastRunning) return;
          const speaking = deps.isSpeechMotionActive?.() || false;
          const mouthOpen = deps.getSpeechAnimationMouthOpen?.() || 0;
          const now = getPerfNow();
          const wallNow = getWallNow();
          const listeningPhase = String(state.listeningPresencePhase || "idle").toLowerCase();
          const listeningActive = Number(state.listeningPresenceSession || 0) > 0
            && ["armed", "hearing", "release"].includes(listeningPhase);
          const listening = {
            version: 1,
            sessionId: listeningActive ? Number(state.listeningPresenceSession || 0) : 0,
            revision: Math.max(0, Number(state.listeningPresenceRevision || 0)),
            phase: listeningActive ? listeningPhase : "idle"
          };
          const performanceCueUntil = Number(state.speechPerformanceCueUntil || 0);
          const performanceCue = state.speechPerformanceCue && (
            !performanceCueUntil || now <= performanceCueUntil
          )
            ? state.speechPerformanceCue
            : null;
          const performanceCueDeadline = performanceCue
            ? (performanceCueUntil > 0
              ? performanceCueUntil
              : now + Math.max(450, Number(performanceCue?.speech?.holdMs) || 900) + 900)
            : 0;
          const performancePhase = getPublishedPerformancePhase(now);
          const performancePhaseDeadline = performancePhase
            ? Number(state._speechBroadcastPerformancePhaseExpiresAt || 0)
            : 0;
          const speechStartedAt = Number(state.speechAnimStartedAt || 0);
          const speechStyle = normalizeBroadcastSpeechStyle(
            speaking ? state.speechAnimStyle : state.currentTalkStyle
          ) || "neutral";
          const payload = {
            type: "speech",
            speechBridgeVersion: 2,
            speechSenderId: getSpeechBroadcastSenderId(),
            mouthOpen,
            mood: state.speechAnimMood || "idle",
            speechStyle,
            speaking,
            assistantAudioActive: deps.isSpeakingNow?.() === true,
            speechExpiresAtEpochMs: toBridgeEpoch(state.speechAnimUntil, now, wallNow),
            speechStartedAtEpochMs: speechStartedAt > 0
              ? Math.round(wallNow - Math.max(0, now - speechStartedAt))
              : 0,
            animDurationMs: state.speechAnimDurationMs || 0,
            audioLevel: state.ttsAudioLevel || 0,
            moodHoldExpiresAtEpochMs: toBridgeEpoch(state.moodHoldUntil, now, wallNow),
            performanceCueExpiresAtEpochMs: performanceCue
              ? toBridgeEpoch(performanceCueDeadline, now, wallNow)
              : 0,
            streamSessionId: Number(state.streamSpeakSession || 0),
            playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
            performanceCue,
            allowSilentPerformanceCue: state.speechCueSilentPerformance === true,
            performancePhase,
            performancePhaseExpiresAtEpochMs: performancePhase
              ? toBridgeEpoch(performancePhaseDeadline, now, wallNow)
              : 0,
            performancePhaseSenderId: getSpeechBroadcastSenderId(),
            performancePhaseRevision: Math.max(0, Number(state._speechBroadcastPerformancePhaseRevision || 0)),
            performancePhaseSentAtWallMs: Number(state._speechBroadcastPerformancePhaseSentAtWallMs || 0),
            performancePhaseHeartbeat: performancePhase ? Math.floor(wallNow / 180) : 0,
            listening,
            listeningHeartbeat: listeningActive ? Math.floor(now / 500) : 0,
            speechHeartbeat: speaking ? Math.floor(wallNow / 250) : 0
          };
          let signature = "";
          try {
            signature = JSON.stringify(payload);
          } catch (_) {}
          if (!signature || signature !== state._speechBroadcastSignature) {
            try {
              const revision = Math.max(0, Number(state._speechBroadcastRevision || 0)) + 1;
              state._speechBroadcastRevision = revision;
              state._speechBroadcast.postMessage({
                ...payload,
                speechRevision: revision,
                speechSentAtWallMs: wallNow
              });
              state._speechBroadcastSignature = signature;
            } catch (_) {}
          }
          const active = speaking
            || Number(mouthOpen) > 0.01
            || Number(state.ttsAudioLevel || 0) > 0.01
            || !!performanceCue
            || now <= Number(state.speechAnimUntil || 0);
          if (active) {
            state._speechBroadcastScheduleKind = "animation";
            state._speechBroadcastTimer = requestAnimationFrameFn(chatSpeechBroadcastLoop);
          } else if (performancePhase) {
            state._speechBroadcastScheduleKind = "performance_phase";
            state._speechBroadcastTimer = setTimeoutFn(chatSpeechBroadcastLoop, 120);
          } else if (listeningActive) {
            state._speechBroadcastScheduleKind = "listening";
            state._speechBroadcastTimer = setTimeoutFn(chatSpeechBroadcastLoop, 160);
          } else {
            state._speechBroadcastScheduleKind = "idle";
            state._speechBroadcastTimer = setTimeoutFn(chatSpeechBroadcastLoop, 250);
          }
        }
        state._speechBroadcastTick = chatSpeechBroadcastLoop;
        chatSpeechBroadcastLoop();
      } catch (_) {
        state._speechBroadcastRunning = false;
        // BroadcastChannel is optional in older shells.
      }
    }

    function stopChatSpeechBroadcastLoop() {
      state._speechBroadcastRunning = false;
      state._speechBroadcastPerformancePhase = null;
      state._speechBroadcastPerformancePhaseExpiresAt = 0;
      state._speechBroadcastPerformancePhaseRevision = Math.max(
        0,
        Number(state._speechBroadcastPerformancePhaseRevision || 0)
      ) + 1;
      state._speechBroadcastPerformancePhaseSentAtWallMs = getWallNow();
      if (state._speechBroadcastTimer) {
        if (state._speechBroadcastScheduleKind === "animation") {
          cancelAnimationFrameFn(state._speechBroadcastTimer);
        } else {
          clearTimeoutFn(state._speechBroadcastTimer);
        }
      }
      state._speechBroadcastTimer = 0;
      state._speechBroadcastScheduleKind = "";
      state._speechBroadcastSignature = "";
      state._speechBroadcastTick = null;
      try {
        const revision = Math.max(0, Number(state._speechBroadcastRevision || 0)) + 1;
        state._speechBroadcastRevision = revision;
        state._speechBroadcast?.postMessage?.({
          type: "speech",
          speechBridgeVersion: 2,
          speechSenderId: getSpeechBroadcastSenderId(),
          speechRevision: revision,
          speechSentAtWallMs: getWallNow(),
          speaking: false,
          assistantAudioActive: false,
          speechExpiresAtEpochMs: 0,
          moodHoldExpiresAtEpochMs: 0,
          performanceCueExpiresAtEpochMs: 0,
          performancePhase: null,
          performancePhaseExpiresAtEpochMs: 0,
          performancePhaseSenderId: getSpeechBroadcastSenderId(),
          performancePhaseRevision: Number(state._speechBroadcastPerformancePhaseRevision || 0),
          performancePhaseSentAtWallMs: Number(state._speechBroadcastPerformancePhaseSentAtWallMs || 0),
          listening: {
            version: 1,
            sessionId: 0,
            revision: Math.max(0, Number(state.listeningPresenceRevision || 0)) + 1,
            phase: "idle"
          }
        });
      } catch (_) {}
      try {
        state._speechBroadcast?.close?.();
      } catch (_) {}
      state._speechBroadcast = null;
    }

    function startChatRuntimeShell({ broadcastSpeech = false } = {}) {
      if (!isServerTTSProvider(state.ttsProvider)) {
        deps.initTTS?.();
      }
      deps.setupSpeechRecognition?.();
      deps.bindUI?.();
      deps.startFollowupCharacterChipRefresh?.();
      deps.startReminderLoop?.();
      deps.runReminderCheck?.();
      if (broadcastSpeech) {
        startChatSpeechBroadcastLoop();
      }
    }

    function bindRuntimeBridges() {
      deps.bindRuntimeEvents?.();
      deps.installCharacterRuntimeWindowBridge?.();
      if (state.uiView === "model") {
        return;
      }
      deps.installCharacterRuntimeDebugBridge?.();
      deps.installTTSDebugBridge?.();
      deps.installTranslateDebugBridge?.();
    }

    async function main() {
      setStatus("启动中...");
      try {
        deps.refreshDesktopBridgeReady?.();
        await deps.initWindowLockBridge?.();
        scheduleDesktopBridgeRechecks();

        if (state.uiView === "model") {
          await loadModelStartupPreferences();
          await deps.ensureLive2DRuntime?.();
          await deps.initLive2D?.();
          deps.startModelMouseGazePolling?.();
          startModelSpeechBroadcastListener();
          setStatus("待机");
          return;
        }

        await loadStartupPreferences();

        if (state.uiView === "chat") {
          startChatRuntimeShell({ broadcastSpeech: true });
          setStatus("待机");
          return;
        }

        await deps.ensureLive2DRuntime?.();
        await deps.initLive2D?.();
        startChatRuntimeShell();
        if (state.model) {
          setStatus("待机");
        }
      } catch (err) {
        consoleObject.error(err);
        setStatus("启动失败");
        appendMessage("assistant", `启动错误: ${err.message}`);
      }
    }

    function handleBeforeUnload() {
      stopChatSpeechBroadcastLoop();
      deps.closeLearningReviewDrawer?.();
      deps.resetActionSystem?.();
      deps.stopIdleMotionLoop?.();
      if (state.followupCharacterChipRefreshTimer) {
        window.clearInterval(state.followupCharacterChipRefreshTimer);
        state.followupCharacterChipRefreshTimer = 0;
      }
      deps.stopAutoChatLoop?.();
      deps.stopProactiveSchedulerPolling?.("beforeunload");
      deps.stopMicLoop?.(true);
      deps.stopWakeWordListener?.();
      if (state.reminderTimer) {
        window.clearInterval(state.reminderTimer);
        state.reminderTimer = 0;
      }
      if (typeof state.windowLockUnsubscribe === "function") {
        try {
          state.windowLockUnsubscribe();
        } catch (_) {
          // ignore
        }
        state.windowLockUnsubscribe = null;
      }
    }

    return {
      bindRuntimeBridges,
      main,
      handleBeforeUnload,
      startModelSpeechBroadcastListener,
      startChatSpeechBroadcastLoop,
      stopChatSpeechBroadcastLoop,
      applyBroadcastListeningPresence,
      publishPerformancePhase,
      clearPublishedPerformancePhase
    };
  }

  const api = { createController };
  root.TaffyAppStartupController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
