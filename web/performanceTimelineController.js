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

  function motionDirectorPhase(name, slot, context = {}) {
    const key = clean(name, "");
    if (!key || key === "none") {
      return null;
    }
    const allowMotion = context.allowMotion !== false;
    const ttsEnabled = context.ttsEnabled !== false;
    const style = clean(context.style, "neutral");
    const mood = clean(context.mood, "idle");
    const beatIndex = clampInt(context.index, 0, 0, 4);
    if (slot === "pre" && key === "no_opening") {
      return phase("no_opening", { suppressed: true });
    }
    const presets = {
      blink_pulse: { pulseStyle: "neutral", pulseBoost: 0.3, actionIntent: "listen", actionMood: mood },
      head_tilt: { pulseStyle: "steady", pulseBoost: 0.28, actionIntent: "listen", actionMood: "thinking" },
      side_eye: { pulseStyle: "neutral", pulseBoost: 0.34, actionIntent: "listen", actionMood: mood },
      deadpan_pause: { pulseStyle: "neutral", pulseBoost: 0.2, actionIntent: slot === "beat" ? "talk" : "listen", actionMood: mood },
      embarrassed_recovery: { pulseStyle: "neutral", pulseBoost: 0.36, actionIntent: "listen", actionMood: "idle" },
      happy_pulse: { pulseStyle: "cheerful", pulseBoost: 0.36, actionIntent: "listen", actionMood: "happy" },
      tiny_victory_nod: { pulseStyle: "cheerful", pulseBoost: 0.3, actionIntent: slot === "beat" ? "talk" : "thinking", actionMood: "happy" },
      tiny_nod: { pulseStyle: "steady", pulseBoost: 0.24, actionIntent: slot === "beat" ? "talk" : "thinking", actionMood: "thinking" },
      thinking_nod: { pulseStyle: "steady", pulseBoost: 0.28, actionIntent: "thinking", actionMood: "thinking" },
      eyes_down_soft: { pulseStyle: "comfort", pulseBoost: 0.2, actionIntent: "none", actionMood: "sad" },
      soft_idle: { pulseStyle: "comfort", pulseBoost: 0.14, actionIntent: "none", actionMood: "idle" },
      focused_idle: { pulseStyle: "steady", pulseBoost: 0.16, actionIntent: "idle", actionMood: "idle" },
      closing_idle: { pulseStyle: "comfort", pulseBoost: 0.18, actionIntent: "idle", actionMood: "idle" },
      settle_idle: { pulseStyle: style, pulseBoost: 0.18, actionIntent: "idle", actionMood: "idle" },
      soft_speech_start: { pulseStyle: "comfort", pulseBoost: 0.2, actionIntent: "none", actionMood: "sad" },
      steady_speech_start: { pulseStyle: "steady", pulseBoost: 0.22, actionIntent: "talk", actionMood: "thinking" },
      closing_speech_start: { pulseStyle: "comfort", pulseBoost: 0.16, actionIntent: "none", actionMood: "idle" },
      dry_speech_start: { pulseStyle: "neutral", pulseBoost: 0.22, actionIntent: "talk", actionMood: mood },
      bright_speech_start: { pulseStyle: "cheerful", pulseBoost: 0.26, actionIntent: "talk", actionMood: "happy" },
      curious_speech_start: { pulseStyle: "steady", pulseBoost: 0.24, actionIntent: "talk", actionMood: "thinking" },
      expressive_speech_start: { pulseStyle: style, pulseBoost: 0.28, actionIntent: "talk", actionMood: mood }
    };
    const preset = presets[key] || { pulseStyle: style, pulseBoost: 0.2, actionIntent: slot === "post" ? "idle" : "talk", actionMood: mood };
    return phase(key, {
      delayMs: slot === "pre" ? 50 : slot === "beat" ? 360 + beatIndex * 620 : slot === "post" ? 260 : 0,
      pulseStyle: preset.pulseStyle,
      pulseBoost: Number(preset.pulseBoost) || 0,
      pulseDurationMs: slot === "post" ? 230 : 190,
      actionIntent: allowMotion && (slot !== "speech" || ttsEnabled) ? preset.actionIntent : "none",
      actionStyle: preset.pulseStyle,
      actionMood: preset.actionMood,
      beats: 1,
      emphasis: slot === "beat" ? 0.32 : 0.2
    });
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
    const motionDirector = brain.motion_director && typeof brain.motion_director === "object" && !Array.isArray(brain.motion_director)
      ? brain.motion_director
      : null;
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

    let speechBeats = ttsEnabled
      ? buildSpeechBeats({ text: replyText, spontaneity, style, mood, intent, allowMotion })
      : [];
    if (motionDirector) {
      const motionSuppressed = Array.isArray(motionDirector.suppressed_reasons)
        ? motionDirector.suppressed_reasons.map((item) => clean(item)).filter(Boolean).slice(0, 6)
        : [];
      for (const reason of motionSuppressed) {
        if (!suppressed.includes(reason)) suppressed.push(reason);
      }
      preReaction = motionDirectorPhase(motionDirector.pre_reaction, "pre", { allowMotion, ttsEnabled, style, mood }) || preReaction;
      speechStart = motionDirectorPhase(motionDirector.speech_start, "speech", { allowMotion, ttsEnabled, style, mood }) || speechStart;
      postSettle = motionDirectorPhase(motionDirector.post_settle, "post", { allowMotion, ttsEnabled, style, mood }) || postSettle;
      const motionBeats = Array.isArray(motionDirector.speech_beats)
        ? motionDirector.speech_beats.map((item) => clean(item)).filter(Boolean).slice(0, Math.max(0, Math.min(3, spontaneity)))
        : [];
      if (ttsEnabled) {
        speechBeats = motionBeats.map((item, index) => motionDirectorPhase(item, "beat", { allowMotion, ttsEnabled, style, mood, index })).filter(Boolean);
      } else {
        speechBeats = [];
      }
    }
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

  function clampNumber(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, n));
  }

  function normalizeVoiceDirector(raw = null) {
    const safe = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const suppressed = Array.isArray(safe.suppressed_reasons)
      ? safe.suppressed_reasons.map((item) => clean(item)).filter(Boolean).slice(0, 6)
      : [];
    return {
      delivery: clean(safe.delivery, "steady_clear"),
      pace: clean(safe.pace, "normal"),
      pause_profile: clean(safe.pause_profile, "light"),
      segment_style: clean(safe.segment_style, "whole"),
      pre_pause_ms: clampInt(safe.pre_pause_ms, 0, 0, 1200),
      inter_segment_pause_ms: clampInt(safe.inter_segment_pause_ms, 160, 0, 1600),
      max_segments: clampInt(safe.max_segments, 1, 1, 4),
      suppressed_reasons: suppressed
    };
  }

  function inferVoiceDirector(brain = {}) {
    const intent = clean(brain.intent, "casual");
    const shape = clean(brain.reply_shape, "one_liner");
    const opening = clean(brain.opening_move, "micro_reaction");
    if (brain.voice_director && typeof brain.voice_director === "object" && !Array.isArray(brain.voice_director)) {
      return normalizeVoiceDirector(brain.voice_director);
    }
    if (intent === "comfort") {
      return normalizeVoiceDirector({
        delivery: "soft_low",
        pace: "slow",
        pause_profile: "gentle",
        segment_style: "short_soft",
        pre_pause_ms: 120,
        inter_segment_pause_ms: 360,
        max_segments: 2,
        suppressed_reasons: ["comfort_no_voice_bits"]
      });
    }
    if (intent === "closing") {
      return normalizeVoiceDirector({
        delivery: "soft_close",
        pace: "slow",
        pause_profile: "final",
        segment_style: "one_liner",
        pre_pause_ms: 80,
        inter_segment_pause_ms: 260,
        max_segments: 1,
        suppressed_reasons: ["closing_no_extra_voice"]
      });
    }
    if (intent === "task_help" || intent === "reminder") {
      return normalizeVoiceDirector({
        delivery: "steady_clear",
        pace: "steady",
        pause_profile: "clean",
        segment_style: intent === "task_help" ? "step_then_aside" : "one_liner",
        pre_pause_ms: 40,
        inter_segment_pause_ms: 220,
        max_segments: intent === "task_help" ? 2 : 1,
        suppressed_reasons: [intent === "task_help" ? "task_steady_voice" : "reminder_clear_voice"]
      });
    }
    if (shape === "mini_rant") {
      return normalizeVoiceDirector({
        delivery: "dry_playful",
        pace: "varied",
        pause_profile: "beat",
        segment_style: "mini_rant_beats",
        pre_pause_ms: 80,
        inter_segment_pause_ms: 260,
        max_segments: 3
      });
    }
    if (shape === "answer_then_bit") {
      return normalizeVoiceDirector({
        delivery: "answer_first",
        pace: "steady_playful",
        pause_profile: "answer_then_bit",
        segment_style: "answer_then_bit",
        pre_pause_ms: 20,
        inter_segment_pause_ms: 220,
        max_segments: 2
      });
    }
    return normalizeVoiceDirector({
      delivery: opening === "deadpan_aside" ? "dry_playful" : "steady_clear",
      pace: opening === "deadpan_aside" ? "measured" : "normal",
      pause_profile: opening === "deadpan_aside" ? "dry_beat" : "light",
      segment_style: opening === "deadpan_aside" ? "two_beat" : "whole",
      pre_pause_ms: opening === "deadpan_aside" ? 80 : 0,
      inter_segment_pause_ms: 200,
      max_segments: opening === "deadpan_aside" ? 2 : 1
    });
  }

  function splitVoiceSegments(text, segmentStyle = "whole", maxSegments = 1) {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) {
      return [];
    }
    const limit = clampInt(maxSegments, 1, 1, 4);
    if (clean(segmentStyle, "whole") === "whole") {
      return [source];
    }
    const sentences = source
      .split(/(?<=[.!?;:\u3002\uFF01\uFF1F])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (sentences.length <= 1 && source.length > 90) {
      const midpoint = Math.max(36, Math.min(source.length - 24, Math.floor(source.length / 2)));
      const splitAt = source.indexOf(", ", midpoint) > -1 ? source.indexOf(", ", midpoint) + 1 : midpoint;
      return [source.slice(0, splitAt).trim(), source.slice(splitAt).trim()].filter(Boolean).slice(0, limit);
    }
    return (sentences.length ? sentences : [source]).slice(0, limit);
  }

  function buildVoiceTimeline(input = {}) {
    const brain = input.brainSnapshot && typeof input.brainSnapshot === "object" && !Array.isArray(input.brainSnapshot)
      ? input.brainSnapshot
      : {};
    const ttsEnabled = input.ttsEnabled !== false;
    const director = inferVoiceDirector(brain);
    const segments = splitVoiceSegments(input.replyText, director.segment_style, director.max_segments);
    const suppressed = [...director.suppressed_reasons];
    if (!ttsEnabled) suppressed.push("tts_disabled");
    return {
      version: 1,
      enabled: ttsEnabled,
      voice_director: director,
      delivery: director.delivery,
      pace: director.pace,
      pause_profile: director.pause_profile,
      segment_style: director.segment_style,
      pre_pause_ms: director.pre_pause_ms,
      inter_segment_pause_ms: director.inter_segment_pause_ms,
      max_segments: director.max_segments,
      segments,
      suppressed
    };
  }

  function toPublicVoiceTimelineSummary(timeline = null) {
    const safe = timeline && typeof timeline === "object" && !Array.isArray(timeline) ? timeline : null;
    if (!safe) {
      return null;
    }
    return {
      enabled: safe.enabled === true,
      delivery: clean(safe.delivery, "steady_clear"),
      pace: clean(safe.pace, "normal"),
      pause_profile: clean(safe.pause_profile, "light"),
      segment_style: clean(safe.segment_style, "whole"),
      segments: Array.isArray(safe.segments) ? clampInt(safe.segments.length, 0, 0, 4) : 0,
      pre_pause_ms: clampInt(safe.pre_pause_ms, 0, 0, 1200),
      inter_segment_pause_ms: clampInt(safe.inter_segment_pause_ms, 160, 0, 1600),
      suppressed: Array.isArray(safe.suppressed)
        ? safe.suppressed.map((item) => clean(item)).filter(Boolean).slice(0, 6)
        : []
    };
  }

  function formatProsodyPercent(value, base = 1) {
    const pct = Math.round((Number(value || base) - base) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  }

  function formatPitchHz(value) {
    const hz = Math.round((Number(value || 1) - 1) * 34);
    return `${hz >= 0 ? "+" : ""}${hz}Hz`;
  }

  function applyVoiceDirectorProsody(prosody = null, voiceDirector = null) {
    const base = prosody && typeof prosody === "object" && !Array.isArray(prosody) ? prosody : {};
    const director = normalizeVoiceDirector(voiceDirector);
    let speed = Number.isFinite(Number(base.speed_ratio)) ? Number(base.speed_ratio) : 1;
    let pitch = Number.isFinite(Number(base.pitch_ratio)) ? Number(base.pitch_ratio) : 1;
    let volume = Number.isFinite(Number(base.volume_ratio)) ? Number(base.volume_ratio) : 1;

    if (director.pace === "slow") speed *= 0.92;
    else if (director.pace === "steady") speed *= 0.98;
    else if (director.pace === "short_pause") speed *= 0.96;
    else if (director.pace === "bright") speed *= 1.04;
    else if (director.pace === "playful" || director.pace === "steady_playful") speed *= 1.01;

    if (director.delivery === "soft_low" || director.delivery === "soft_close" || director.delivery === "soft_clear") {
      pitch *= 0.97;
      volume *= 0.94;
    } else if (director.delivery === "steady_clear" || director.delivery === "answer_first") {
      pitch *= 0.99;
      volume *= 1.01;
    } else if (director.delivery === "dry_recovery" || director.delivery === "dry_playful") {
      speed *= 0.98;
      pitch *= 0.98;
      volume *= 0.98;
    } else if (director.delivery === "bright_pop" || director.delivery === "bit_pop") {
      speed *= 1.03;
      pitch *= 1.03;
      volume *= 1.01;
    }

    speed = clampNumber(speed, 1, 0.82, 1.24);
    pitch = clampNumber(pitch, 1, 0.86, 1.18);
    volume = clampNumber(volume, 1, 0.72, 1.08);
    return {
      ...base,
      speed_ratio: Number(speed.toFixed(2)),
      pitch_ratio: Number(pitch.toFixed(2)),
      volume_ratio: Number(volume.toFixed(2)),
      rate: formatProsodyPercent(speed),
      pitch: formatPitchHz(pitch),
      volume: formatProsodyPercent(volume),
      voice_director_delivery: director.delivery,
      voice_director_pace: director.pace
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

    function rememberVoiceTimeline(timeline) {
      const summary = toPublicVoiceTimelineSummary(timeline);
      state.voiceTimelineLastSummary = summary;
      if (state.characterBrainLastDecision && typeof state.characterBrainLastDecision === "object" && !Array.isArray(state.characterBrainLastDecision)) {
        state.characterBrainLastDecision.voice_timeline = summary;
      }
      try {
        windowObject.__AI_CHAT_LAST_VOICE_TIMELINE__ = summary;
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
      buildVoiceTimeline,
      toPublicVoiceTimelineSummary,
      applyVoiceDirectorProsody,
      rememberPerformanceTimeline,
      rememberVoiceTimeline,
      clearPerformanceTimelineTimers,
      executePerformanceTimelinePhase,
      schedulePerformanceTimelineSpeechBeats
    };
  }

  const api = {
    buildPerformanceTimeline,
    toPublicTimelineSummary,
    buildVoiceTimeline,
    toPublicVoiceTimelineSummary,
    applyVoiceDirectorProsody,
    countSpeechBeats,
    createController
  };

  root.TaffyPerformanceTimelineController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
