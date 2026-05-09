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

  function cleanList(values, limit = 8) {
    if (!Array.isArray(values)) {
      return [];
    }
    const seen = new Set();
    const out = [];
    for (const value of values) {
      const item = clean(value, "");
      if (!item || seen.has(item)) {
        continue;
      }
      seen.add(item);
      out.push(item);
      if (out.length >= Math.max(1, Number(limit) || 8)) {
        break;
      }
    }
    return out;
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

  function stableScore(text = "") {
    const safe = String(text || "");
    let score = 0;
    for (let i = 0; i < safe.length; i += 1) {
      score = (score * 31 + safe.charCodeAt(i)) % 9973;
    }
    return score;
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
      emphasis: Math.max(0, Math.min(1, Number(extra.emphasis) || 0)),
      motionCue: clean(extra.motionCue, name || "none"),
      motionRole: clean(extra.motionRole, ""),
      motionTags: cleanList(extra.motionTags, 8),
      priority: clampInt(extra.priority, 2, 0, 5),
      cooldownMs: clampInt(extra.cooldownMs, 0, 0, 4000)
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
      blink_pulse: { pulseStyle: "neutral", pulseBoost: 0.3, actionIntent: "listen", actionMood: mood, motionTags: ["blink", "idle", "flick"] },
      micro_pulse: { pulseStyle: "neutral", pulseBoost: 0.26, actionIntent: "listen", actionMood: mood, motionTags: ["idle", "tap", "flick"] },
      head_tilt: { pulseStyle: "steady", pulseBoost: 0.28, actionIntent: "listen", actionMood: "thinking", motionTags: ["head", "tilt", "flick", "pose"] },
      side_eye: { pulseStyle: "neutral", pulseBoost: 0.34, actionIntent: "listen", actionMood: mood, motionTags: ["head", "eye", "side", "flick", "idle"] },
      deadpan_pause: { pulseStyle: "neutral", pulseBoost: 0.2, actionIntent: slot === "beat" ? "talk" : "listen", actionMood: mood, motionTags: ["idle", "wait", "head", "main"] },
      embarrassed_recovery: { pulseStyle: "neutral", pulseBoost: 0.36, actionIntent: "listen", actionMood: "idle", motionTags: ["shy", "down", "head", "flickdown", "idle"] },
      idle_fidget: { pulseStyle: "neutral", pulseBoost: 0.22, actionIntent: slot === "beat" ? "talk" : "idle", actionMood: "idle", motionTags: ["idle", "touch", "body", "flick"] },
      happy_pulse: { pulseStyle: "cheerful", pulseBoost: 0.36, actionIntent: "listen", actionMood: "happy", motionTags: ["happy", "wave", "tap"] },
      tiny_victory_nod: { pulseStyle: "cheerful", pulseBoost: 0.3, actionIntent: slot === "beat" ? "talk" : "thinking", actionMood: "happy", motionTags: ["nod", "happy", "head", "pose"] },
      tiny_nod: { pulseStyle: "steady", pulseBoost: 0.24, actionIntent: slot === "beat" ? "talk" : "thinking", actionMood: "thinking", motionTags: ["nod", "head", "idle", "flick"] },
      thinking_nod: { pulseStyle: "steady", pulseBoost: 0.28, actionIntent: "thinking", actionMood: "thinking", motionTags: ["thinking", "nod", "head", "idle"] },
      soft_stillness: { pulseStyle: "comfort", pulseBoost: 0.18, actionIntent: "none", actionMood: "sad", motionTags: ["soft", "down", "idle", "breath"] },
      eyes_down_soft: { pulseStyle: "comfort", pulseBoost: 0.2, actionIntent: "none", actionMood: "sad", motionTags: ["soft", "down", "head", "idle"] },
      soft_idle: { pulseStyle: "comfort", pulseBoost: 0.14, actionIntent: "none", actionMood: "idle", motionTags: ["soft", "idle", "breath"] },
      focused_idle: { pulseStyle: "steady", pulseBoost: 0.16, actionIntent: "idle", actionMood: "idle", motionTags: ["idle", "main", "steady"] },
      closing_idle: { pulseStyle: "comfort", pulseBoost: 0.18, actionIntent: "idle", actionMood: "idle", motionTags: ["idle", "wave", "soft"] },
      settle_idle: { pulseStyle: style, pulseBoost: 0.18, actionIntent: "idle", actionMood: "idle", motionTags: ["idle", "main", "breath"] },
      soft_speech_start: { pulseStyle: "comfort", pulseBoost: 0.2, actionIntent: "none", actionMood: "sad", motionTags: ["soft", "down", "idle"] },
      steady_speech_start: { pulseStyle: "steady", pulseBoost: 0.22, actionIntent: "talk", actionMood: "thinking", motionTags: ["talk", "body", "steady"] },
      closing_speech_start: { pulseStyle: "comfort", pulseBoost: 0.16, actionIntent: "none", actionMood: "idle", motionTags: ["soft", "idle"] },
      dry_speech_start: { pulseStyle: "neutral", pulseBoost: 0.22, actionIntent: "talk", actionMood: mood, motionTags: ["talk", "flick", "head"] },
      bright_speech_start: { pulseStyle: "cheerful", pulseBoost: 0.26, actionIntent: "talk", actionMood: "happy", motionTags: ["happy", "talk", "wave"] },
      curious_speech_start: { pulseStyle: "steady", pulseBoost: 0.24, actionIntent: "talk", actionMood: "thinking", motionTags: ["curious", "head", "talk"] },
      expressive_speech_start: { pulseStyle: style, pulseBoost: 0.28, actionIntent: "talk", actionMood: mood, motionTags: ["talk", "body", "pose"] }
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
      emphasis: slot === "beat" ? 0.32 : 0.2,
      motionCue: key,
      motionRole: slot === "pre" ? "pre_reaction" : slot === "speech" ? "speech_start" : slot === "beat" ? "speech_beat" : "post_settle",
      motionTags: preset.motionTags,
      priority: slot === "post" ? 1 : slot === "speech" ? 2 : 3,
      cooldownMs: slot === "post" ? 520 : slot === "beat" ? 440 : 760
    });
  }

  const THOUGHT_BURST_ALLOWED_TYPES = new Set([
    "mutter",
    "aside",
    "tiny_rant",
    "callback",
    "mock_defense",
    "celebration",
    "topic_spark"
  ]);

  const THOUGHT_BURST_DEFAULT_SENTENCES = {
    mutter: 1,
    aside: 2,
    tiny_rant: 4,
    callback: 2,
    mock_defense: 3,
    celebration: 2,
    topic_spark: 3
  };

  const THOUGHT_BURST_CHOREOGRAPHY = {
    mutter: {
      motion: { pre: "micro_pulse", speech: "dry_speech_start", beats: ["deadpan_pause"], post: "settle_idle" },
      voice: { delivery: "dry_mutter", pace: "measured", pause_profile: "mutter", segment_style: "one_liner", pre_pause_ms: 40, inter_segment_pause_ms: 180, max_segments: 1 }
    },
    aside: {
      motion: { pre: "side_eye", speech: "dry_speech_start", beats: ["blink_pulse"], post: "settle_idle" },
      voice: { delivery: "dry_playful", pace: "measured", pause_profile: "dry_beat", segment_style: "two_beat", pre_pause_ms: 80, inter_segment_pause_ms: 220, max_segments: 2 }
    },
    tiny_rant: {
      motion: { pre: "side_eye", speech: "dry_speech_start", beats: ["deadpan_pause", "head_tilt", "idle_fidget"], post: "settle_idle" },
      voice: { delivery: "dry_playful", pace: "varied", pause_profile: "thought_burst_beats", segment_style: "thought_burst_beats", pre_pause_ms: 120, inter_segment_pause_ms: 280, max_segments: 4 }
    },
    callback: {
      motion: { pre: "blink_pulse", speech: "expressive_speech_start", beats: ["side_eye", "tiny_nod"], post: "settle_idle" },
      voice: { delivery: "bit_pop", pace: "playful", pause_profile: "callback", segment_style: "two_beat", pre_pause_ms: 60, inter_segment_pause_ms: 220, max_segments: 2 }
    },
    mock_defense: {
      motion: { pre: "embarrassed_recovery", speech: "dry_speech_start", beats: ["deadpan_pause", "tiny_nod"], post: "settle_idle" },
      voice: { delivery: "dry_recovery", pace: "short_pause", pause_profile: "awkward_beat", segment_style: "two_beat", pre_pause_ms: 140, inter_segment_pause_ms: 260, max_segments: 3 }
    },
    celebration: {
      motion: { pre: "happy_pulse", speech: "bright_speech_start", beats: ["tiny_victory_nod", "blink_pulse"], post: "settle_idle" },
      voice: { delivery: "bright_pop", pace: "bright", pause_profile: "celebration_beats", segment_style: "two_beat", pre_pause_ms: 30, inter_segment_pause_ms: 200, max_segments: 2 }
    },
    topic_spark: {
      motion: { pre: "head_tilt", speech: "curious_speech_start", beats: ["side_eye", "head_tilt", "idle_fidget"], post: "settle_idle" },
      voice: { delivery: "dry_playful", pace: "varied", pause_profile: "tangent_beat", segment_style: "thought_burst_beats", pre_pause_ms: 80, inter_segment_pause_ms: 240, max_segments: 3 }
    }
  };

  function getThoughtBurstContext(brain = {}) {
    const safe = brain && typeof brain === "object" && !Array.isArray(brain) ? brain : {};
    const raw = safe.thought_burst && typeof safe.thought_burst === "object" && !Array.isArray(safe.thought_burst)
      ? safe.thought_burst
      : {};
    const intent = clean(safe.intent, "");
    let thoughtType = clean(raw.thought_type, "");
    if (!THOUGHT_BURST_ALLOWED_TYPES.has(thoughtType)) {
      thoughtType = intent === "thought_burst" ? "aside" : "";
    }
    if (!thoughtType) {
      return null;
    }
    const fallback = THOUGHT_BURST_DEFAULT_SENTENCES[thoughtType] || 2;
    const maxSentences = clampInt(raw.max_sentences || safe.max_sentences, fallback, 1, 4);
    const minSentences = clampInt(raw.min_sentences, Math.min(maxSentences, 1), 1, maxSentences);
    return {
      thought_type: thoughtType,
      max_sentences: maxSentences,
      min_sentences: minSentences,
      length_budget: clean(raw.length_budget, `${minSentences}_${maxSentences}_sentences`),
      burst_reason: clean(raw.burst_reason, "stage_thought")
    };
  }

  function buildThoughtBurstChoreography(brain = {}) {
    const context = getThoughtBurstContext(brain);
    if (!context) {
      return null;
    }
    const base = THOUGHT_BURST_CHOREOGRAPHY[context.thought_type] || THOUGHT_BURST_CHOREOGRAPHY.aside;
    const voiceMax = clampInt(base.voice.max_segments, context.max_sentences, 1, 4);
    return {
      thought_type: context.thought_type,
      length_budget: context.length_budget,
      burst_reason: context.burst_reason,
      motion: {
        pre: clean(base.motion.pre, "micro_pulse"),
        speech: clean(base.motion.speech, "expressive_speech_start"),
        beats: cleanList(base.motion.beats, 4),
        post: clean(base.motion.post, "settle_idle")
      },
      voice: {
        ...base.voice,
        thought_type: context.thought_type,
        max_segments: Math.max(1, Math.min(context.max_sentences, voiceMax)),
        suppressed_reasons: ["thought_burst_choreography"]
      }
    };
  }

  function classifyEarlyReaction(text = "") {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    const lower = source.toLowerCase();
    const compact = lower.replace(/\s+/g, "");
    if (!source) return "none";
    if (/^\//.test(source)) return "local_command";
    if (/(sad|tired|anxious|upset|hurt|overwhelmed|lonely|depressed|panic|scared|stress|worn out|wornout|feel bad|feeling bad|stay with me|\u96be\u53d7|\u7126\u8651|\u5d29\u6e83)/i.test(source)) {
      return "comfort";
    }
    if (/\b(you were wrong|you are wrong|that's wrong|incorrect|mistake|not true)\b/i.test(source)) {
      return "correction";
    }
    if (/\b(bye|sleep|goodbye|sign off|wrap up|offline|i'?m going to sleep)\b/i.test(source)) {
      return "closing";
    }
    if (/(whatnext|nextstep|whatshouldidonext|whatdoidonext|todo|roadmap|priority)/i.test(compact)) {
      return "task";
    }
    if (/\?/.test(source) || /^(what|why|how|when|where|who|can|could|should|is|are|do|does)\b/i.test(lower)) {
      return "question";
    }
    return "casual";
  }

  function buildEarlyPreReactionPlan(input = {}) {
    const text = String(input.text || input.userText || "").trim();
    const intent = clean(input.intent || classifyEarlyReaction(text), "casual");
    const nowMs = clampInt(input.nowMs, Date.now(), 0, Number.MAX_SAFE_INTEGER);
    const lastAt = clampInt(input.lastReactionAt, 0, 0, Number.MAX_SAFE_INTEGER);
    const cooldownMs = clampInt(input.cooldownMs, 900, 0, 10000);
    const motionEnabled = input.motionEnabled !== false;
    const expressionEnabled = input.expressionEnabled !== false;
    const speakingNow = input.speakingNow === true;
    const suppressed = [];
    if (!text) suppressed.push("empty_text");
    if (intent === "local_command") suppressed.push("local_command");
    if (input.isAuto === true) suppressed.push("auto_checkin_no_early_reaction");
    if (!motionEnabled && !expressionEnabled) suppressed.push("motion_and_expression_disabled");
    if (speakingNow) suppressed.push("tts_active");
    if (lastAt > 0 && nowMs - lastAt < cooldownMs) suppressed.push("cooldown");

    let name = "micro_pulse";
    let style = clean(input.talkStyle, "neutral");
    let mood = clean(input.mood, "idle");
    if (intent === "comfort") {
      name = "soft_stillness";
      style = "comfort";
      mood = "sad";
    } else if (intent === "correction") {
      name = "embarrassed_recovery";
    } else if (intent === "question") {
      name = "head_tilt";
      style = "steady";
      mood = "thinking";
    } else if (intent === "task") {
      name = "thinking_nod";
      style = "steady";
      mood = "thinking";
    } else if (intent === "closing") {
      name = "no_opening";
      suppressed.push("closing_no_opening");
    } else if (stableScore(text) % 3 === 0) {
      name = "side_eye";
    }

    const planned = name === "no_opening"
      ? phase("no_opening", { suppressed: true })
      : motionDirectorPhase(name, "pre", {
          allowMotion: motionEnabled,
          ttsEnabled: true,
          style,
          mood
        }) || phase(name, {
          pulseStyle: style,
          pulseBoost: 0.24,
          pulseDurationMs: 180,
          actionIntent: motionEnabled ? "listen" : "none",
          actionStyle: style,
          actionMood: mood
        });
    if (!expressionEnabled) {
      planned.pulseBoost = 0;
      planned.pulseDurationMs = 0;
    }
    return {
      version: 1,
      enabled: suppressed.length === 0,
      intent,
      preReaction: planned,
      suppressed: suppressed.slice(0, 8),
      reason: suppressed.length ? suppressed[0] : "safe_pre_llm_reaction",
      updated_at: nowMs
    };
  }

  function toPublicEarlyReactionSummary(plan = null, actual = null) {
    const safe = plan && typeof plan === "object" && !Array.isArray(plan) ? plan : null;
    if (!safe) return null;
    const actualSafe = actual && typeof actual === "object" && !Array.isArray(actual) ? actual : {};
    const latencyMs = clampInt(actualSafe.latency_ms, 0, 0, 60000);
    const targetLatencyMs = clampInt(safe.target_latency_ms, 500, 100, 2000);
    const actualState = clean(actualSafe.actual || actualSafe.status, safe.enabled === true ? "planned" : "suppressed");
    const latencyStatus = safe.enabled !== true || actualState === "suppressed"
      ? "suppressed"
      : actualState !== "dispatched"
        ? "pending"
        : latencyMs <= targetLatencyMs
          ? "ok"
          : "slow";
    return {
      enabled: safe.enabled === true,
      intent: clean(safe.intent, "casual"),
      pre: clean(safe.pre || safe.preReaction?.name, "none"),
      actual: actualState,
      action: clean(actualSafe.action || safe.action || safe.preReaction?.actionIntent, "none"),
      motion_cue: clean(actualSafe.motion_cue || safe.motion_cue || safe.preReaction?.motionCue || safe.preReaction?.name, "none"),
      pulse: actualSafe.pulse === true || safe.pulse === true,
      reason: clean(safe.reason, safe.enabled === true ? "safe_pre_llm_reaction" : "suppressed", 64),
      suppressed: Array.isArray(safe.suppressed)
        ? safe.suppressed.map((item) => clean(item, "", 48)).filter(Boolean).slice(0, 8)
        : [],
      latency_ms: latencyMs,
      target_latency_ms: targetLatencyMs,
      latency_status: latencyStatus,
      updated_at: clampInt(safe.updated_at, 0, 0, Number.MAX_SAFE_INTEGER)
    };
  }

  function executeEarlyPreReactionPlan(plan = null, context = {}) {
    const safe = plan && typeof plan === "object" && !Array.isArray(plan) ? plan : null;
    if (!safe || safe.enabled !== true || !safe.preReaction || safe.preReaction.suppressed === true) {
      return toPublicEarlyReactionSummary(safe, { status: "suppressed", action: "none", pulse: false });
    }
    const enqueue = typeof context.enqueueActionIntent === "function" ? context.enqueueActionIntent : () => {};
    const pulse = typeof context.triggerExpressionPulse === "function" ? context.triggerExpressionPulse : () => {};
    const phasePlan = safe.preReaction;
    const style = clean(phasePlan.actionStyle || phasePlan.pulseStyle || context.style, "neutral");
    const mood = clean(phasePlan.actionMood || context.mood, "idle");
    let didPulse = false;
    if (Number(phasePlan.pulseBoost) > 0 && Number(phasePlan.pulseDurationMs) > 0) {
      pulse(clean(phasePlan.pulseStyle || style, style), Number(phasePlan.pulseBoost), Number(phasePlan.pulseDurationMs));
      didPulse = true;
    }
    const actionIntent = clean(phasePlan.actionIntent, "none");
    if (actionIntent && actionIntent !== "none") {
      enqueue(actionIntent, {
        text: String(context.text || ""),
        style,
        mood,
        combo: phasePlan.combo === true,
        beats: clampInt(phasePlan.beats, 1, 1, 4),
        emphasis: Math.max(0, Math.min(1, Number(phasePlan.emphasis) || 0)),
        motionCue: clean(phasePlan.motionCue || phasePlan.name, "none"),
        motionRole: clean(phasePlan.motionRole, "pre_reaction"),
        motionTags: cleanList(phasePlan.motionTags, 8),
        auditMotion: false
      });
    }
    return toPublicEarlyReactionSummary(safe, {
      status: "dispatched",
      actual: "dispatched",
      action: actionIntent,
      motion_cue: clean(phasePlan.motionCue || phasePlan.name, "none"),
      pulse: didPulse,
      latency_ms: Math.max(0, Date.now() - clampInt(safe.updated_at, Date.now(), 0, Number.MAX_SAFE_INTEGER))
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
    const thoughtChoreography = buildThoughtBurstChoreography(brain);
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
    if (thoughtChoreography) {
      if (!suppressed.includes("thought_burst_choreography")) suppressed.push("thought_burst_choreography");
      preReaction = motionDirectorPhase(thoughtChoreography.motion.pre, "pre", { allowMotion, ttsEnabled, style, mood }) || preReaction;
      speechStart = motionDirectorPhase(thoughtChoreography.motion.speech, "speech", { allowMotion, ttsEnabled, style, mood }) || speechStart;
      postSettle = motionDirectorPhase(thoughtChoreography.motion.post, "post", { allowMotion, ttsEnabled, style, mood }) || postSettle;
      const beatLimit = Math.max(0, Math.min(4, spontaneity, thoughtChoreography.motion.beats.length));
      speechBeats = ttsEnabled
        ? thoughtChoreography.motion.beats.slice(0, beatLimit).map((item, index) => motionDirectorPhase(item, "beat", { allowMotion, ttsEnabled, style, mood, index })).filter(Boolean)
        : [];
    }
    return {
      version: 1,
      enabled: true,
      intent,
      thought_type: thoughtChoreography ? thoughtChoreography.thought_type : "none",
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
    const beatCues = Array.isArray(safe.speechBeats)
      ? safe.speechBeats.map((beat) => clean(beat?.motionCue || beat?.name, "")).filter(Boolean).slice(0, 3)
      : [];
    return {
      enabled: safe.enabled === true,
      thought_type: clean(safe.thought_type, "none"),
      pre: clean(safe.preReaction?.name, "none"),
      speech: clean(safe.speechStart?.name, "none"),
      beats: Array.isArray(safe.speechBeats) ? safe.speechBeats.length : 0,
      post: clean(safe.postSettle?.name, "none"),
      motion: {
        pre: clean(safe.preReaction?.motionCue || safe.preReaction?.name, "none"),
        speech: clean(safe.speechStart?.motionCue || safe.speechStart?.name, "none"),
        beats: beatCues,
        post: clean(safe.postSettle?.motionCue || safe.postSettle?.name, "none")
      },
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
      thought_type: clean(safe.thought_type, "none"),
      suppressed_reasons: suppressed
    };
  }

  function inferVoiceDirector(brain = {}) {
    const intent = clean(brain.intent, "casual");
    const shape = clean(brain.reply_shape, "one_liner");
    const opening = clean(brain.opening_move, "micro_reaction");
    const thoughtChoreography = buildThoughtBurstChoreography(brain);
    if (thoughtChoreography) {
      return normalizeVoiceDirector(thoughtChoreography.voice);
    }
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
    const style = clean(segmentStyle, "whole");
    if (style === "whole" || style === "one_liner") {
      return [source];
    }
    const sentences = source
      .split(/(?<=[.!?;:\u3002\uFF01\uFF1F])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (sentences.length <= 1 && source.length > 90) {
      const midpoint = Math.max(36, Math.min(source.length - 24, Math.floor(source.length / 2)));
      const splitAt = source.indexOf(", ", midpoint) > -1 ? source.indexOf(", ", midpoint) + 1 : midpoint;
      const chunks = [source.slice(0, splitAt).trim(), source.slice(splitAt).trim()].filter(Boolean);
      if (limit <= 1 || chunks.length <= limit) {
        return limit <= 1 ? [source] : chunks;
      }
      return [...chunks.slice(0, limit - 1), chunks.slice(limit - 1).join(" ")].filter(Boolean);
    }
    const parts = sentences.length ? sentences : [source];
    if (parts.length <= limit) {
      return parts;
    }
    return [...parts.slice(0, limit - 1), parts.slice(limit - 1).join(" ")].filter(Boolean);
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
    const fallbackReason = segments.length ? "none" : "empty_reply";
    return {
      version: 1,
      enabled: ttsEnabled,
      voice_director: director,
      thought_type: clean(director.thought_type, "none"),
      delivery: director.delivery,
      pace: director.pace,
      pause_profile: director.pause_profile,
      segment_style: director.segment_style,
      pre_pause_ms: director.pre_pause_ms,
      inter_segment_pause_ms: director.inter_segment_pause_ms,
      max_segments: director.max_segments,
      segments,
      fallback_reason: fallbackReason,
      suppressed
    };
  }

  function buildVoiceSpeechSegments(text, voiceTimeline = null) {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) {
      return [];
    }
    const safe = voiceTimeline && typeof voiceTimeline === "object" && !Array.isArray(voiceTimeline)
      ? voiceTimeline
      : null;
    if (!safe || safe.enabled === false) {
      return [source];
    }
    const director = safe.voice_director && typeof safe.voice_director === "object" && !Array.isArray(safe.voice_director)
      ? normalizeVoiceDirector(safe.voice_director)
      : normalizeVoiceDirector(safe);
    const style = clean(safe.segment_style || director.segment_style, "whole");
    const maxSegments = clampInt(safe.max_segments || director.max_segments, 1, 1, 4);
    return splitVoiceSegments(source, style, maxSegments);
  }

  function toPublicVoiceTimelineSummary(timeline = null) {
    const safe = timeline && typeof timeline === "object" && !Array.isArray(timeline) ? timeline : null;
    if (!safe) {
      return null;
    }
    return {
      enabled: safe.enabled === true,
      thought_type: clean(safe.thought_type || safe.voice_director?.thought_type, "none"),
      delivery: clean(safe.delivery, "steady_clear"),
      pace: clean(safe.pace, "normal"),
      pause_profile: clean(safe.pause_profile, "light"),
      segment_style: clean(safe.segment_style, "whole"),
      segments: Array.isArray(safe.segments) ? clampInt(safe.segments.length, 0, 0, 4) : 0,
      pre_pause_ms: clampInt(safe.pre_pause_ms, 0, 0, 1200),
      inter_segment_pause_ms: clampInt(safe.inter_segment_pause_ms, 160, 0, 1600),
      fallback_reason: clean(safe.fallback_reason, "none"),
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
    else if (director.pace === "measured") speed *= 0.97;
    else if (director.pace === "varied") speed *= 1.02;
    else if (director.pace === "bright") speed *= 1.04;
    else if (director.pace === "playful" || director.pace === "steady_playful") speed *= 1.01;

    if (director.delivery === "soft_low" || director.delivery === "soft_close" || director.delivery === "soft_clear") {
      pitch *= 0.97;
      volume *= 0.94;
    } else if (director.delivery === "steady_clear" || director.delivery === "answer_first") {
      pitch *= 0.99;
      volume *= 1.01;
    } else if (director.delivery === "dry_mutter") {
      speed *= 0.95;
      pitch *= 0.96;
      volume *= 0.95;
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

    function rememberEarlyPreReaction(summary) {
      const safe = summary && typeof summary === "object" && !Array.isArray(summary)
        ? toPublicEarlyReactionSummary(summary)
        : null;
      state.earlyPreReactionLastSummary = safe;
      if (safe && safe.actual === "dispatched") {
        state.earlyPreReactionLastAt = safe.updated_at || Date.now();
      }
      try {
        windowObject.__AI_CHAT_LAST_EARLY_REACTION__ = safe;
      } catch (_) {
        // Optional debug bridge only.
      }
      return safe;
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
          pulse: false,
          motion_cue: clean(plan.motionCue || plan.name, "none"),
          motion_role: clean(plan.motionRole || phaseKey, "timeline_phase")
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
          emphasis: Math.max(0, Math.min(1, Number(plan.emphasis) || 0)),
          motionCue: clean(plan.motionCue || plan.name, "none"),
          motionRole: clean(plan.motionRole || phaseKey, "timeline_phase"),
          motionTags: cleanList(plan.motionTags, 8),
          auditMotion: true,
          priority: clampInt(plan.priority, 2, 0, 5),
          cooldownMs: clampInt(plan.cooldownMs, 0, 0, 4000)
        });
      }
      recordPerformanceAuditEvent("timeline_phase", {
        phase: phaseKey,
        name: clean(plan.name, "none"),
        ok: true,
        suppressed: false,
        action: actionIntent,
        pulse: didPulse,
        motion_cue: clean(plan.motionCue || plan.name, "none"),
        motion_role: clean(plan.motionRole || phaseKey, "timeline_phase"),
        motion_tags: cleanList(plan.motionTags, 8)
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
      buildThoughtBurstChoreography,
      buildPerformanceTimeline,
      toPublicTimelineSummary,
      buildVoiceTimeline,
      buildVoiceSpeechSegments,
      toPublicVoiceTimelineSummary,
      applyVoiceDirectorProsody,
      buildEarlyPreReactionPlan,
      toPublicEarlyReactionSummary,
      executeEarlyPreReactionPlan,
      rememberEarlyPreReaction,
      rememberPerformanceTimeline,
      rememberVoiceTimeline,
      clearPerformanceTimelineTimers,
      executePerformanceTimelinePhase,
      schedulePerformanceTimelineSpeechBeats
    };
  }

  const api = {
    buildThoughtBurstChoreography,
    buildPerformanceTimeline,
    toPublicTimelineSummary,
    buildVoiceTimeline,
    buildVoiceSpeechSegments,
    toPublicVoiceTimelineSummary,
    applyVoiceDirectorProsody,
    buildEarlyPreReactionPlan,
    toPublicEarlyReactionSummary,
    executeEarlyPreReactionPlan,
    countSpeechBeats,
    createController
  };

  root.TaffyPerformanceTimelineController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
