(function (root) {
  "use strict";

  function clean(value, fallback = "") {
    const text = String(value || "").trim().toLowerCase().replace(/-/g, "_");
    return text || fallback;
  }

  function clampInt(value, fallback, min, max) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, n));
  }

  function countSpeechBeats(text, spontaneity) {
    const safeSpontaneity = clampInt(spontaneity, 0, 0, 3);
    if (safeSpontaneity <= 0) {
      return 0;
    }
    const source = String(text || "").trim();
    if (!source) {
      return 0;
    }
    const punctuation = (source.match(/[.!?,;:\uFF01\uFF1F\u3002\uFF0C\u3001]/g) || []).length;
    const lengthBeats = Math.max(1, Math.ceil(source.length / 95));
    const naturalBeats = Math.max(1, Math.min(3, Math.ceil((punctuation + lengthBeats) / 2)));
    return Math.min(safeSpontaneity, naturalBeats);
  }

  function phase(name, extra = {}) {
    return {
      name,
      suppressed: extra.suppressed === true,
      delayMs: clampInt(extra.delayMs, 0, 0, 4000),
      pulseStyle: clean(extra.pulseStyle, "neutral"),
      pulseBoost: Number.isFinite(Number(extra.pulseBoost)) ? Number(extra.pulseBoost) : 0,
      pulseDurationMs: clampInt(extra.pulseDurationMs, 0, 0, 2000),
      actionIntent: clean(extra.actionIntent, "none"),
      actionStyle: clean(extra.actionStyle, extra.pulseStyle || "neutral"),
      actionMood: clean(extra.actionMood, "idle"),
      combo: extra.combo === true,
      beats: clampInt(extra.beats, 1, 1, 4),
      emphasis: Math.max(0, Math.min(1, Number(extra.emphasis) || 0))
    };
  }

  function buildSpeechBeats({ text, spontaneity, style, mood, intent, allowMotion }) {
    if (allowMotion === false || ["comfort", "reminder", "closing", "low_interrupt_checkin"].includes(intent)) {
      return [];
    }
    const count = countSpeechBeats(text, spontaneity);
    const beats = [];
    for (let i = 0; i < count; i += 1) {
      beats.push(
        phase(i === 0 ? "speech_beat" : `speech_beat_${i + 1}`, {
          delayMs: 360 + i * 620,
          pulseStyle: style,
          pulseBoost: 0.26 + Math.min(0.18, Number(spontaneity || 0) * 0.04),
          pulseDurationMs: 180,
          actionIntent: "talk",
          actionStyle: style,
          actionMood: mood,
          beats: 1,
          emphasis: Math.min(0.55, 0.18 + Number(spontaneity || 0) * 0.08)
        })
      );
    }
    return beats;
  }

  function buildPerformanceTimeline(input = {}) {
    const brain = input.brainSnapshot && typeof input.brainSnapshot === "object" && !Array.isArray(input.brainSnapshot)
      ? input.brainSnapshot
      : {};
    const runtime = input.runtimeMetadata && typeof input.runtimeMetadata === "object" && !Array.isArray(input.runtimeMetadata)
      ? input.runtimeMetadata
      : {};
    const intent = clean(brain.intent || runtime.brain_intent || runtime.intent, "casual");
    const opening = clean(brain.opening_move, "no_opening");
    const reaction = clean(brain.reaction_mode, "");
    const spontaneity = clampInt(brain.spontaneity, 0, 0, 3);
    const constraints = brain.output_constraints && typeof brain.output_constraints === "object" && !Array.isArray(brain.output_constraints)
      ? brain.output_constraints
      : {};
    const allowMotion = constraints.allow_motion === false ? false : true;
    const ttsEnabled = input.ttsEnabled !== false;
    const style = clean(input.talkStyle || runtime.voice_style || brain.voice_style, "neutral");
    const mood = clean(input.mood || runtime.emotion || brain.emotion, "idle");
    const replyText = String(input.replyText || "").trim();
    const suppressed = [];
    if (!ttsEnabled) suppressed.push("tts_disabled");
    if (!allowMotion) suppressed.push("motion_disallowed");

    let preReaction = phase("micro_reaction", {
      delayMs: 40,
      pulseStyle: style,
      pulseBoost: 0.4,
      pulseDurationMs: 220,
      actionIntent: allowMotion ? "listen" : "none",
      actionStyle: style,
      actionMood: mood
    });
    let speechStart = phase("expressive_speech_start", {
      pulseStyle: style,
      pulseBoost: 0.28,
      pulseDurationMs: 180,
      actionIntent: allowMotion && ttsEnabled ? "talk" : "none",
      actionStyle: style,
      actionMood: mood
    });
    let postSettle = phase("settle_idle", {
      delayMs: 260,
      pulseStyle: style,
      pulseBoost: 0.18,
      pulseDurationMs: 220,
      actionIntent: allowMotion ? "idle" : "none",
      actionStyle: style,
      actionMood: "idle"
    });

    if (opening === "soft_anchor" || intent === "comfort" || intent === "low_interrupt_checkin") {
      preReaction = phase("soft_anchor", {
        delayMs: 80,
        pulseStyle: "comfort",
        pulseBoost: 0.22,
        pulseDurationMs: 240,
        actionIntent: "none",
        actionStyle: "comfort",
        actionMood: "sad"
      });
      speechStart = phase("soft_speech_start", {
        pulseStyle: "comfort",
        pulseBoost: 0.2,
        pulseDurationMs: 200,
        actionIntent: "none",
        actionStyle: "comfort",
        actionMood: "sad"
      });
      postSettle = phase("soft_idle", {
        delayMs: 300,
        pulseStyle: "comfort",
        pulseBoost: 0.14,
        pulseDurationMs: 260,
        actionIntent: "none",
        actionStyle: "comfort",
        actionMood: "idle"
      });
    } else if (opening === "no_opening" || intent === "closing") {
      preReaction = phase("no_opening", { suppressed: true });
      speechStart = phase("closing_speech_start", {
        pulseStyle: "comfort",
        pulseBoost: 0.16,
        pulseDurationMs: 180,
        actionIntent: "none",
        actionStyle: "comfort",
        actionMood: "idle"
      });
      postSettle = phase("closing_idle", {
        delayMs: 260,
        pulseStyle: "comfort",
        pulseBoost: 0.18,
        pulseDurationMs: 240,
        actionIntent: allowMotion ? "idle" : "none",
        actionStyle: "comfort",
        actionMood: "idle"
      });
    } else if (opening === "answer_first" || reaction === "task_snap" || intent === "task_help" || intent === "reminder") {
      preReaction = phase(reaction === "task_snap" ? "task_snap" : "answer_first", {
        delayMs: 60,
        pulseStyle: "steady",
        pulseBoost: 0.32,
        pulseDurationMs: 220,
        actionIntent: allowMotion ? "thinking" : "none",
        actionStyle: "steady",
        actionMood: "thinking"
      });
      speechStart = phase("steady_speech_start", {
        pulseStyle: "steady",
        pulseBoost: 0.22,
        pulseDurationMs: 180,
        actionIntent: allowMotion && ttsEnabled ? "talk" : "none",
        actionStyle: "steady",
        actionMood: "thinking"
      });
      postSettle = phase("focused_idle", {
        delayMs: 240,
        pulseStyle: "steady",
        pulseBoost: 0.16,
        pulseDurationMs: 220,
        actionIntent: allowMotion ? "idle" : "none",
        actionStyle: "steady",
        actionMood: "idle"
      });
    } else if (opening === "deadpan_aside") {
      preReaction = phase("deadpan_aside", {
        delayMs: 40,
        pulseStyle: "neutral",
        pulseBoost: 0.3,
        pulseDurationMs: 210,
        actionIntent: allowMotion ? "listen" : "none",
        actionStyle: "neutral",
        actionMood: "idle"
      });
      speechStart = phase("dry_speech_start", {
        pulseStyle: "neutral",
        pulseBoost: 0.22,
        pulseDurationMs: 180,
        actionIntent: allowMotion && ttsEnabled ? "talk" : "none",
        actionStyle: "neutral",
        actionMood: mood
      });
    }

    const speechBeats = ttsEnabled
      ? buildSpeechBeats({ text: replyText, spontaneity, style, mood, intent, allowMotion })
      : [];
    return {
      version: 1,
      enabled: true,
      intent,
      opening_move: opening,
      reaction_mode: reaction,
      spontaneity,
      tts_enabled: ttsEnabled,
      suppressed,
      preReaction,
      speechStart,
      speechBeats,
      postSettle
    };
  }

  function toPublicTimelineSummary(timeline = null) {
    const safe = timeline && typeof timeline === "object" && !Array.isArray(timeline) ? timeline : null;
    if (!safe) {
      return null;
    }
    return {
      enabled: safe.enabled === true,
      pre: clean(safe.preReaction?.name, "none"),
      speech: clean(safe.speechStart?.name, "none"),
      beats: Array.isArray(safe.speechBeats) ? safe.speechBeats.length : 0,
      post: clean(safe.postSettle?.name, "none"),
      suppressed: Array.isArray(safe.suppressed)
        ? safe.suppressed.map((item) => clean(item)).filter(Boolean).slice(0, 6)
        : []
    };
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const windowObject = deps.windowObject || root;
    const enqueueActionIntent = typeof deps.enqueueActionIntent === "function" ? deps.enqueueActionIntent : () => {};
    const triggerExpressionPulse = typeof deps.triggerExpressionPulse === "function" ? deps.triggerExpressionPulse : () => {};
    const maybePlayTalkGesture = typeof deps.maybePlayTalkGesture === "function" ? deps.maybePlayTalkGesture : () => {};
    const recordPerformanceAuditEvent = typeof deps.recordPerformanceAuditEvent === "function" ? deps.recordPerformanceAuditEvent : () => {};
    const perfLog = typeof deps.perfLog === "function" ? deps.perfLog : () => {};

    function clearPerformanceTimelineTimers() {
      const timers = Array.isArray(state.performanceTimelineTimers) ? state.performanceTimelineTimers : [];
      for (const timer of timers) {
        try {
          windowObject.clearTimeout(timer);
        } catch (_) {
          // Ignore stale timers.
        }
      }
      state.performanceTimelineTimers = [];
    }

    function rememberPerformanceTimeline(timeline) {
      const summary = toPublicTimelineSummary(timeline);
      state.performanceTimelineLastSummary = summary;
      if (state.characterBrainLastDecision && typeof state.characterBrainLastDecision === "object" && !Array.isArray(state.characterBrainLastDecision)) {
        state.characterBrainLastDecision.performance_timeline = summary;
      }
      try {
        windowObject.__AI_CHAT_LAST_PERFORMANCE_TIMELINE__ = summary;
      } catch (_) {
        // Optional debug bridge only.
      }
      return summary;
    }

    function executePhasePlan(plan, context = {}, phaseKey = "") {
      if (!plan || typeof plan !== "object") {
        return false;
      }
      if (plan.suppressed === true) {
        recordPerformanceAuditEvent("timeline_phase", {
          phase: phaseKey,
          name: clean(plan.name, "none"),
          ok: false,
          suppressed: true,
          action: "none",
          pulse: false
        });
        return false;
      }
      const style = clean(plan.actionStyle || plan.pulseStyle || context.style, "neutral");
      const mood = clean(plan.actionMood || context.mood, "idle");
      let didPulse = false;
      if (Number(plan.pulseBoost) > 0 && Number(plan.pulseDurationMs) > 0) {
        triggerExpressionPulse(clean(plan.pulseStyle || style, style), Number(plan.pulseBoost), Number(plan.pulseDurationMs));
        didPulse = true;
      }
      const actionIntent = clean(plan.actionIntent, "none");
      if (actionIntent && actionIntent !== "none") {
        enqueueActionIntent(actionIntent, {
          text: String(context.text || ""),
          style,
          mood,
          combo: plan.combo === true,
          beats: clampInt(plan.beats, 1, 1, 4),
          emphasis: Math.max(0, Math.min(1, Number(plan.emphasis) || 0))
        });
      }
      recordPerformanceAuditEvent("timeline_phase", {
        phase: phaseKey,
        name: clean(plan.name, "none"),
        ok: true,
        suppressed: false,
        action: actionIntent,
        pulse: didPulse
      });
      return true;
    }

    function executePerformanceTimelinePhase(timeline, phaseName, context = {}) {
      if (!timeline || typeof timeline !== "object" || timeline.enabled !== true) {
        return false;
      }
      const phaseKey = String(phaseName || "").trim();
      const plan = phaseKey === "preReaction"
        ? timeline.preReaction
        : phaseKey === "speechStart"
          ? timeline.speechStart
          : phaseKey === "postSettle"
            ? timeline.postSettle
            : null;
      if (!plan) {
        return false;
      }
      const run = () => {
        const ok = executePhasePlan(plan, context, phaseKey);
        perfLog("performance_timeline", phaseKey, {
          name: clean(plan.name, "none"),
          ok,
          suppressed: plan.suppressed === true
        });
        return ok;
      };
      if (Number(plan.delayMs) > 0) {
        const timer = windowObject.setTimeout(run, Number(plan.delayMs));
        state.performanceTimelineTimers = Array.isArray(state.performanceTimelineTimers) ? state.performanceTimelineTimers : [];
        state.performanceTimelineTimers.push(timer);
        return true;
      }
      return run();
    }

    function schedulePerformanceTimelineSpeechBeats(timeline, context = {}) {
      if (!timeline || !Array.isArray(timeline.speechBeats) || !timeline.speechBeats.length) {
        return 0;
      }
      state.performanceTimelineTimers = Array.isArray(state.performanceTimelineTimers) ? state.performanceTimelineTimers : [];
      let count = 0;
      for (const beat of timeline.speechBeats) {
        const timer = windowObject.setTimeout(() => {
          if (context.sessionId && Number(state.streamSpeakSession || 0) !== Number(context.sessionId || 0)) {
            return;
          }
          if (typeof maybePlayTalkGesture === "function") {
            maybePlayTalkGesture(String(context.text || ""), clean(beat.actionStyle || context.style, "neutral"));
          }
          executePhasePlan(beat, context, "speechBeat");
        }, Math.max(0, Number(beat.delayMs) || 0));
        state.performanceTimelineTimers.push(timer);
        count += 1;
      }
      perfLog("performance_timeline", "speechBeats", { count });
      return count;
    }

    return {
      buildPerformanceTimeline,
      toPublicTimelineSummary,
      rememberPerformanceTimeline,
      clearPerformanceTimelineTimers,
      executePerformanceTimelinePhase,
      schedulePerformanceTimelineSpeechBeats
    };
  }

  const api = {
    buildPerformanceTimeline,
    toPublicTimelineSummary,
    countSpeechBeats,
    createController
  };

  root.TaffyPerformanceTimelineController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
