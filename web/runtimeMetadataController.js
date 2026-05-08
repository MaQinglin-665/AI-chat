(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const performance = deps.performanceObject || root.performance || { now: () => Date.now() };
    const BroadcastChannel = window.BroadcastChannel || root.BroadcastChannel;
    const CustomEvent = window.CustomEvent || root.CustomEvent;
    const SPEECH_TEXT = deps.speechText || {};
    const CHARACTER_RUNTIME = deps.characterRuntime || {};
    const CHARACTER_RUNTIME_BRIDGE = deps.characterRuntimeBridge || {};
    const CHARACTER_RUNTIME_DEBUG_BRIDGE = deps.characterRuntimeDebugBridge || {};
    const LIVE2D_EXPRESSION_TUNING = deps.live2dExpressionTuning || {};
    const RUNTIME_EMOTION_EXPRESSION_TUNING = deps.runtimeEmotionExpressionTuning || { idle: {} };
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
    const triggerExpressionPulse = typeof deps.triggerExpressionPulse === "function" ? deps.triggerExpressionPulse : () => false;
    const tryBuiltInMotion = typeof deps.tryBuiltInMotion === "function" ? deps.tryBuiltInMotion : null;
    function stripRuntimeMetadataSuffix(text) {
      if (SPEECH_TEXT && typeof SPEECH_TEXT.stripRuntimeMetadataSuffix === "function") {
        return SPEECH_TEXT.stripRuntimeMetadataSuffix(text);
      }
      return String(text || "");
    }

    function stripAssistantPayloadNoise(text) {
      if (SPEECH_TEXT && typeof SPEECH_TEXT.stripAssistantPayloadNoise === "function") {
        return SPEECH_TEXT.stripAssistantPayloadNoise(text);
      }
      return stripRuntimeMetadataSuffix(text);
    }

    function normalizeCharacterRuntimeMetadataForFrontend(raw) {
      const filtered = typeof CHARACTER_RUNTIME_BRIDGE.copyAllowedMetadataFields === "function"
        ? CHARACTER_RUNTIME_BRIDGE.copyAllowedMetadataFields(raw)
        : raw;
      if (typeof CHARACTER_RUNTIME_BRIDGE.normalizeMetadataForFrontend === "function") {
        return CHARACTER_RUNTIME_BRIDGE.normalizeMetadataForFrontend(filtered, CHARACTER_RUNTIME);
      }
      if (typeof CHARACTER_RUNTIME.normalizeMetadataForFrontend !== "function") {
        return null;
      }
      return CHARACTER_RUNTIME.normalizeMetadataForFrontend(filtered);
    }

    const CHARACTER_RUNTIME_BROADCAST_CHANNEL = CHARACTER_RUNTIME_BRIDGE.BROADCAST_CHANNEL || "taffy-character-runtime";
    let characterRuntimeBroadcastChannel = null;

    function getCharacterRuntimeBroadcastChannel() {
      if (typeof BroadcastChannel !== "function") {
        return null;
      }
      if (characterRuntimeBroadcastChannel) {
        return characterRuntimeBroadcastChannel;
      }
      try {
        characterRuntimeBroadcastChannel = new BroadcastChannel(CHARACTER_RUNTIME_BROADCAST_CHANNEL);
      } catch (_) {
        characterRuntimeBroadcastChannel = null;
      }
      return characterRuntimeBroadcastChannel;
    }

    function dispatchCharacterRuntimeMetadataLocally(normalized) {
      const isNormalized = typeof CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata === "function"
        ? CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata(normalized)
        : (!!normalized && typeof normalized === "object" && !Array.isArray(normalized));
      if (!isNormalized) {
        return null;
      }
      try {
        window.__AI_CHAT_LAST_CHARACTER_RUNTIME__ = normalized;
        const evtName = CHARACTER_RUNTIME_BRIDGE.UPDATE_EVENT || "character-runtime:update";
        window.dispatchEvent(new CustomEvent(evtName, { detail: normalized }));
      } catch (_) {
        // Keep bridge side-effect safe; metadata is optional.
      }
      return normalized;
    }

    function broadcastCharacterRuntimeMetadataToModel(normalized) {
      const isNormalized = typeof CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata === "function"
        ? CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata(normalized)
        : (!!normalized && typeof normalized === "object" && !Array.isArray(normalized));
      if (!isNormalized) {
        return false;
      }
      if (state.uiView !== "chat") {
        return false;
      }
      const channel = getCharacterRuntimeBroadcastChannel();
      if (!channel) {
        return false;
      }
      try {
        const msg = typeof CHARACTER_RUNTIME_BRIDGE.createRuntimeUpdateMessage === "function"
          ? CHARACTER_RUNTIME_BRIDGE.createRuntimeUpdateMessage(normalized)
          : { type: "character-runtime:update", metadata: normalized };
        if (!msg) {
          return false;
        }
        channel.postMessage(msg);
        return true;
      } catch (_) {
        return false;
      }
    }

    function normalizeRuntimeEmotionForLive2D(emotion) {
      if (typeof emotion !== "string") {
        return "idle";
      }
      const key = String(emotion || "").trim().toLowerCase();
      if (!key) {
        return "idle";
      }
      if (key === "happy") return "happy";
      if (key === "sad") return "sad";
      if (key === "angry") return "angry";
      if (key === "surprised") return "surprised";
      if (key === "annoyed") return "angry";
      if (key === "thinking") return "idle";
      if (key === "neutral") return "idle";
      return "idle";
    }

    function getRuntimeEmotionExpressionTuning(mood) {
      if (typeof LIVE2D_EXPRESSION_TUNING.getRuntimeEmotionExpressionTuning === "function") {
        return LIVE2D_EXPRESSION_TUNING.getRuntimeEmotionExpressionTuning(mood);
      }
      const key = String(mood || "idle");
      return RUNTIME_EMOTION_EXPRESSION_TUNING[key] || RUNTIME_EMOTION_EXPRESSION_TUNING.idle;
    }

    function normalizeRuntimeActionForLive2D(action) {
      if (typeof action !== "string") {
        return "none";
      }
      const key = String(action || "").trim().toLowerCase();
      if (!key) {
        return "none";
      }
      if (key === "none") return "none";
      if (key === "wave") return "wave";
      if (key === "nod") return "nod";
      if (key === "shake_head") return "shake_head";
      if (key === "think") return "think";
      if (key === "happy_idle") return "happy_idle";
      if (key === "surprised") return "surprised";
      return "none";
    }

    function getLive2DMotionForAction(action) {
      const normalized = normalizeRuntimeActionForLive2D(action);
      const plan = {
        wave: {
          mood: "happy",
          groups: ["Tap", "FlickUp", "Idle"],
          pulseBoost: 0.88,
          pulseDurationMs: 420
        },
        nod: {
          mood: "idle",
          groups: ["FlickDown", "Idle"],
          pulseBoost: 0.52,
          pulseDurationMs: 260
        },
        shake_head: {
          mood: "angry",
          groups: ["Flick@Body", "Flick", "Idle"],
          pulseBoost: 0.62,
          pulseDurationMs: 300
        },
        think: {
          mood: "idle",
          groups: ["FlickDown", "Idle"],
          pulseBoost: 0.5,
          pulseDurationMs: 280
        },
        happy_idle: {
          mood: "happy",
          groups: ["Idle", "Tap"],
          pulseBoost: 0.58,
          pulseDurationMs: 300
        },
        surprised: {
          mood: "surprised",
          groups: ["FlickUp", "Tap", "Idle"],
          pulseBoost: 0.9,
          pulseDurationMs: 340
        }
      };
      return plan[normalized] || null;
    }

    function applyCharacterRuntimeEmotionToLive2D(metadata) {
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return false;
      }
      if (!state.model || !state.expressionEnabled) {
        return false;
      }
      try {
        const mood = normalizeRuntimeEmotionForLive2D(metadata.emotion);
        const tuning = getRuntimeEmotionExpressionTuning(mood);
        const now = performance.now();
        state.speechAnimMood = mood;
        state.moodHoldUntil = now + Math.max(300, Number(tuning.holdMs) || 1400);
        state.moodExpressionWeight = clampNumber(Number(tuning.weight) || 1, 0.7, 1.45);
        state.moodExpressionWeightUntil = state.moodHoldUntil;
        state.moodExpressionWeightMood = mood;
        state.moodExpressionRuntimeMood = mood;
        triggerExpressionPulse(
          state.currentTalkStyle || "neutral",
          Number(tuning.pulseBoost) || 0.55,
          Number(tuning.pulseDurationMs) || 320
        );
        return true;
      } catch (err) {
        console.debug("[character-runtime] apply emotion failed:", err);
        return false;
      }
    }

    function applyCharacterRuntimeActionToLive2D(metadata) {
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return false;
      }
      const motionPlan = getLive2DMotionForAction(metadata.action);
      if (!motionPlan) {
        return false;
      }
      if (!state.model || !state.motionEnabled) {
        return false;
      }

      const applyPulseFallback = () => {
        if (!state.model || !state.expressionEnabled) {
          return false;
        }
        try {
          triggerExpressionPulse(
            state.currentTalkStyle || "neutral",
            Number(motionPlan.pulseBoost) || 0.6,
            Number(motionPlan.pulseDurationMs) || 280
          );
          return true;
        } catch (_) {
          return false;
        }
      };

      try {
        if (typeof tryBuiltInMotion !== "function") {
          return applyPulseFallback();
        }
        Promise.resolve(
          tryBuiltInMotion(motionPlan.mood, {
            source: "emotion",
            allowFallback: false,
            priority: 3,
            cooldownMs: Math.max(220, Math.round((Number(state.motionCooldownMs) || 1200) * 0.45)),
            groups: motionPlan.groups
          })
        )
          .then((played) => {
            if (!played) {
              applyPulseFallback();
            }
          })
          .catch((err) => {
            console.debug("[character-runtime] apply action failed:", err);
            applyPulseFallback();
          });
        return true;
      } catch (err) {
        console.debug("[character-runtime] apply action setup failed:", err);
        return applyPulseFallback();
      }
    }

    function handleCharacterRuntimeMetadata(raw, options = {}) {
      const normalized = normalizeCharacterRuntimeMetadataForFrontend(raw);
      if (!normalized) {
        return null;
      }
      const localDispatched = !!dispatchCharacterRuntimeMetadataLocally(normalized);
      const broadcasted = options.broadcast !== false
        ? broadcastCharacterRuntimeMetadataToModel(normalized)
        : false;
      const dispatchFeedback = {
        at: Date.now(),
        uiView: String(state.uiView || ""),
        emotion: String(normalized.emotion || ""),
        action: String(normalized.action || ""),
        intensity: String(normalized.intensity || ""),
        live2d_hint: String(normalized.live2d_hint || ""),
        localDispatched,
        broadcastAllowed: options.broadcast !== false,
        broadcasted
      };
      state.followupCharacterRuntimeLastDispatch = dispatchFeedback;
      try {
        window.__AI_CHAT_LAST_CHARACTER_RUNTIME_DISPATCH__ = dispatchFeedback;
      } catch (_) {
        // Diagnostics are optional.
      }
      return normalized;
    }

    function installCharacterRuntimeWindowBridge() {
      if (state.uiView !== "model") {
        return null;
      }
      if (state._characterRuntimeBridgeInstalled) {
        return state._characterRuntimeBridgeInstalled;
      }
      const channel = getCharacterRuntimeBroadcastChannel();
      if (!channel) {
        return null;
      }
      channel.onmessage = (event) => {
        const data = event?.data;
        if (!data || data.type !== "character-runtime:update") {
          return;
        }
        handleCharacterRuntimeMetadata(data.metadata, { broadcast: false });
      };
      state._characterRuntimeBridgeInstalled = channel;
      return channel;
    }

    function installCharacterRuntimeDebugBridge() {
      if (typeof window === "undefined") {
        return null;
      }
      const key = CHARACTER_RUNTIME_DEBUG_BRIDGE.DEBUG_BRIDGE_KEY || "__AI_CHAT_DEBUG_CHARACTER_RUNTIME__";
      if (window[key] && typeof window[key] === "object") {
        return window[key];
      }

      const samples = CHARACTER_RUNTIME_DEBUG_BRIDGE.DEBUG_SAMPLES || {
        happyWave: {
          emotion: "happy",
          action: "wave",
          intensity: "normal",
          live2d_hint: "happy",
          voice_style: "cheerful"
        },
        annoyed: {
          emotion: "annoyed",
          action: "shake_head",
          intensity: "normal",
          live2d_hint: "angry",
          voice_style: "serious"
        },
        thinking: {
          emotion: "thinking",
          action: "think",
          intensity: "low",
          live2d_hint: "neutral",
          voice_style: "neutral"
        },
        surprised: {
          emotion: "surprised",
          action: "surprised",
          intensity: "high",
          live2d_hint: "surprised",
          voice_style: "cheerful"
        }
      };

      const emit = (metadata) => {
        if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
          return null;
        }
        try {
          return handleCharacterRuntimeMetadata(metadata);
        } catch (_) {
          return null;
        }
      };

      const testEmotion = (emotion) => emit(
        typeof CHARACTER_RUNTIME_DEBUG_BRIDGE.createEmotionMetadata === "function"
          ? CHARACTER_RUNTIME_DEBUG_BRIDGE.createEmotionMetadata(emotion)
          : { emotion: String(emotion || "") }
      );
      const testAction = (action) => emit(
        typeof CHARACTER_RUNTIME_DEBUG_BRIDGE.createActionMetadata === "function"
          ? CHARACTER_RUNTIME_DEBUG_BRIDGE.createActionMetadata(action)
          : { action: String(action || "") }
      );

      const bridge = {
        emit,
        testEmotion,
        testAction,
        samples
      };
      try {
        window[key] = bridge;
      } catch (_) {
        return null;
      }
      return bridge;
    }


    return {
      stripRuntimeMetadataSuffix,
      stripAssistantPayloadNoise,
      normalizeCharacterRuntimeMetadataForFrontend,
      getCharacterRuntimeBroadcastChannel,
      dispatchCharacterRuntimeMetadataLocally,
      broadcastCharacterRuntimeMetadataToModel,
      normalizeRuntimeEmotionForLive2D,
      getRuntimeEmotionExpressionTuning,
      normalizeRuntimeActionForLive2D,
      getLive2DMotionForAction,
      applyCharacterRuntimeEmotionToLive2D,
      applyCharacterRuntimeActionToLive2D,
      handleCharacterRuntimeMetadata,
      installCharacterRuntimeWindowBridge,
      installCharacterRuntimeDebugBridge
    };
  }

  const api = { createController };
  root.TaffyRuntimeMetadataController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
