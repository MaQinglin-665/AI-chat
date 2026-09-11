(function (root) {
  "use strict";

  const PHASES = new Set(["idle", "listening", "thinking", "preparing", "speaking", "settling"]);
  const EMOTIONS = new Set(["neutral", "happy", "playful", "sad", "anxious", "surprised", "serious", "thinking"]);
  const GESTURES = new Set(["none", "nod", "think", "wave", "shake_head", "surprised"]);
  const INTENSITIES = new Set(["low", "medium", "high"]);

  function cleanToken(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeIntent(raw) {
    const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
    if (!input) return null;
    const phase = cleanToken(input.phase);
    const emotion = cleanToken(input.emotion);
    const gesture = cleanToken(input.gesture);
    const intensity = cleanToken(input.intensity);
    const holdMs = Math.round(Number(input.hold_ms));
    if (!PHASES.has(phase) || !EMOTIONS.has(emotion) || !GESTURES.has(gesture) || !INTENSITIES.has(intensity)) return null;
    if (!Number.isFinite(holdMs)) return null;
    return { phase, emotion, gesture, intensity, hold_ms: Math.max(200, Math.min(5000, holdMs)) };
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const performance = deps.performanceObject || root.performance || { now: () => Date.now() };
    const requestPerformanceMode = typeof deps.requestPerformanceMode === "function" ? deps.requestPerformanceMode : () => "idle";
    const triggerSemanticAction = typeof deps.triggerSemanticAction === "function" ? deps.triggerSemanticAction : () => false;
    const triggerExpressionPulse = typeof deps.triggerExpressionPulse === "function" ? deps.triggerExpressionPulse : () => false;
    const publishPerformancePhase = typeof deps.publishPerformancePhase === "function" ? deps.publishPerformancePhase : () => false;
    const isSpeakingNow = typeof deps.isSpeakingNow === "function" ? deps.isSpeakingNow : () => false;
    const isSpeechMotionActive = typeof deps.isSpeechMotionActive === "function" ? deps.isSpeechMotionActive : () => false;
    const isUserListening = typeof deps.isUserListening === "function" ? deps.isUserListening : () => false;
    const bridge = {
      lastConsumedTriggerSequence: 0,
      activePhase: "idle",
      activeUntil: 0,
      lastReason: "",
      lastAppliedAt: 0
    };

    function remember(reason, phase = "idle") {
      bridge.lastReason = String(reason || "");
      bridge.activePhase = phase;
      bridge.lastAppliedAt = Number(performance.now()) || Date.now();
      state.behaviorPerformanceBridge = { ...bridge };
    }

    function replyPerformanceOwnsStage(now) {
      return isSpeakingNow() === true
        || isSpeechMotionActive(now) === true
        || (state.speechPerformanceCue && Number(state.speechPerformanceCueUntil || 0) > now);
    }

    function apply(decision) {
      const source = decision && typeof decision === "object" ? decision : {};
      const intent = normalizeIntent(source.performance_intent);
      const sequence = Math.round(Number(source.trigger_sequence || 0));
      if (!intent || !Number.isFinite(sequence) || sequence <= 0) {
        remember("invalid_intent");
        return false;
      }
      if (sequence <= bridge.lastConsumedTriggerSequence) {
        remember("duplicate_or_stale", bridge.activePhase);
        return false;
      }
      bridge.lastConsumedTriggerSequence = sequence;
      const now = Number(performance.now()) || Date.now();
      if (intent.phase === "speaking" || replyPerformanceOwnsStage(now)) {
        remember("reply_performance_owns_stage");
        return false;
      }
      if (intent.phase === "preparing" && isUserListening() === true) {
        remember("user_listening_owns_stage");
        return false;
      }
      const mode = { listening: "listen", thinking: "think", preparing: "think", settling: "idle" }[intent.phase] || "idle";
      try { requestPerformanceMode(mode, { holdMs: intent.hold_ms }); } catch (_) {}
      if (intent.gesture !== "none" && intent.phase !== "settling") {
        try {
          triggerSemanticAction(intent.gesture, {
            priority: intent.intensity === "high" ? 3 : 2,
            intensity: intent.intensity === "high" ? 1.2 : (intent.intensity === "low" ? 0.72 : 1),
            source: "behavior_performance_bridge"
          });
        } catch (_) {}
      }
      if (intent.phase !== "settling") {
        try { triggerExpressionPulse(intent.emotion, intent.intensity === "high" ? 0.34 : 0.2, Math.min(480, intent.hold_ms)); } catch (_) {}
      }
      try {
        publishPerformancePhase({
          phase: "behavior_intent",
          turnId: sequence,
          actionIntent: intent.phase === "settling" ? "idle" : (intent.phase === "preparing" ? "thinking" : "listen"),
          actionStyle: intent.emotion,
          actionMood: intent.emotion,
          pulseStyle: intent.emotion,
          pulseBoost: intent.phase === "settling" ? 0 : 0.2,
          pulseDurationMs: intent.phase === "settling" ? 0 : Math.min(480, intent.hold_ms),
          motionCue: intent.gesture,
          motionRole: "behavior_intent",
          priority: intent.intensity === "high" ? 3 : 2
        });
      } catch (_) {}
      bridge.activeUntil = now + intent.hold_ms;
      remember(String(source.reason || "behavior_intent"), intent.phase);
      return true;
    }

    function getStatus() { return { ...bridge }; }
    return { apply, getStatus, normalizeIntent };
  }

  const api = { PHASES: [...PHASES], EMOTIONS: [...EMOTIONS], GESTURES: [...GESTURES], INTENSITIES: [...INTENSITIES], normalizeIntent, createController };
  root.TaffyBehaviorPerformanceBridge = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
