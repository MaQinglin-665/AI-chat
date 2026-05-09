(function (root) {
  "use strict";

  const STYLE_MOTION_BLUEPRINT = {
    comfort: {
      listen: ["Idle", "FlickDown", "Flick"],
      thinking: ["Idle", "FlickDown"],
      talk: ["Idle", "FlickDown", "Flick"],
      reply: ["FlickDown", "Idle", "Flick"],
      tap: ["Tap", "Idle", "FlickDown"],
      idle: ["Idle", "FlickDown"]
    },
    clear: {
      listen: ["Idle", "FlickUp"],
      thinking: ["Idle", "FlickUp"],
      talk: ["FlickUp", "Idle", "Tap"],
      reply: ["FlickUp", "Tap", "Idle"],
      tap: ["Tap", "FlickUp", "Idle"],
      idle: ["Idle", "FlickUp"]
    },
    playful: {
      listen: ["Tap", "FlickUp", "Idle"],
      thinking: ["FlickUp", "Idle"],
      talk: ["Tap", "Tap@Body", "FlickUp", "Idle"],
      reply: ["Tap", "Tap@Body", "FlickUp", "Idle"],
      tap: ["Tap", "Tap@Body", "FlickUp", "Idle"],
      idle: ["Idle", "Tap", "FlickUp"]
    },
    steady: {
      listen: ["Flick", "Idle", "Flick@Body"],
      thinking: ["Idle", "Flick"],
      talk: ["Flick@Body", "Flick", "Idle"],
      reply: ["Flick@Body", "Flick", "Idle", "Tap@Body"],
      tap: ["Tap@Body", "Flick", "Idle"],
      idle: ["Idle", "Flick"]
    },
    neutral: {
      listen: ["Idle", "Flick"],
      thinking: ["Idle"],
      talk: ["Tap", "FlickUp", "Idle"],
      reply: ["Tap", "Flick", "Idle"],
      tap: ["Tap", "Idle", "FlickUp"],
      idle: ["Idle", "Tap", "FlickUp", "FlickDown"]
    }
  };

  const MOTION_SEMANTIC_TOKENS = {
    idle: ["idle", "main", "home", "stand", "loop", "breath", "wait"],
    listen: ["tap", "touch", "flick", "head", "body", "idle", "main"],
    thinking: ["flick", "shake", "head", "idle", "main", "touch", "pose"],
    talk: ["tap", "touch", "wave", "body", "arm", "flick", "idle", "main", "pose"],
    reply: ["wave", "tap", "body", "flick", "pose", "main", "idle", "greet"],
    tap: ["tap", "touch", "body", "head", "flick", "wave", "pose"],
    happy: ["happy", "smile", "wave", "jump", "tap", "pose", "greet"],
    sad: ["sad", "down", "shy", "idle", "head", "flickdown", "low"],
    angry: ["angry", "shake", "body", "flick", "tap", "strong"],
    surprised: ["surprise", "wow", "jump", "flickup", "shake", "pose", "open"]
  };

  const MOTION_CUE_TOKENS = {
    side_eye: ["head", "eye", "side", "flick", "idle"],
    head_tilt: ["head", "tilt", "flick", "pose", "idle"],
    tiny_nod: ["head", "nod", "idle", "flick"],
    tiny_victory_nod: ["head", "nod", "happy", "pose"],
    deadpan_pause: ["idle", "wait", "head", "main"],
    embarrassed_recovery: ["shy", "down", "head", "flickdown", "idle"],
    idle_fidget: ["idle", "touch", "body", "flick"],
    soft_stillness: ["idle", "down", "soft", "breath", "wait"],
    eyes_down_soft: ["idle", "down", "soft", "head"],
    micro_pulse: ["idle", "tap", "flick", "touch"],
    blink_pulse: ["blink", "idle", "flick"],
    thinking_nod: ["thinking", "head", "nod", "idle"],
    happy_pulse: ["happy", "wave", "tap"],
    task_snap: ["thinking", "body", "flick", "pose"],
    answer_first: ["thinking", "head", "idle"],
    soft_idle: ["idle", "soft", "breath"],
    focused_idle: ["idle", "main", "steady"],
    closing_idle: ["idle", "wave", "soft"],
    settle_idle: ["idle", "main", "breath"],
    dry_speech_start: ["talk", "flick", "head"],
    steady_speech_start: ["talk", "body", "steady"],
    expressive_speech_start: ["talk", "body", "pose"],
    curious_speech_start: ["talk", "head", "thinking"]
  };

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function uniqueMotionGroups(groups) {
    const seen = new Set();
    const out = [];
    for (const raw of Array.isArray(groups) ? groups : []) {
      const g = String(raw || "").trim();
      if (!g || seen.has(g)) {
        continue;
      }
      seen.add(g);
      out.push(g);
    }
    return out;
  }

  function normalizeMotionGroupKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizeMotionCue(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getMotionCueTags(cue) {
    return uniqueMotionGroups(MOTION_CUE_TOKENS[normalizeMotionCue(cue)] || []);
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const perf = deps.performanceObject || root.performance || { now: () => Date.now() };
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : (() => "neutral");
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : (() => "idle");
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : ((v, min, max) => Math.min(max, Math.max(min, v)));
    const waitMs = typeof deps.waitMs === "function" ? deps.waitMs : ((ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0))));
    const recordPerformanceAuditEvent = typeof deps.recordPerformanceAuditEvent === "function" ? deps.recordPerformanceAuditEvent : () => {};

    function findSemanticMotionGroups(tags = [], limit = 8) {
      const normalizedTags = uniqueMotionGroups(tags).map((tag) => normalizeMotionGroupKey(tag)).filter(Boolean);
      if (!normalizedTags.length || !Array.isArray(state.availableMotionGroups) || !state.availableMotionGroups.length) {
        return [];
      }
      const scored = [];
      for (const group of state.availableMotionGroups) {
        const key = normalizeMotionGroupKey(group);
        if (!key) {
          continue;
        }
        let score = 0;
        for (const tag of normalizedTags) {
          if (key === tag) {
            score += 6;
          } else if (key.startsWith(tag) || key.endsWith(tag)) {
            score += 4;
          } else if (key.includes(tag)) {
            score += 2;
          }
        }
        if (score > 0) {
          if (group === state.lastMotionGroup) {
            score -= 1.2;
          }
          scored.push({ group, score });
        }
      }
      scored.sort((a, b) => b.score - a.score);
      return uniqueMotionGroups(scored.slice(0, Math.max(1, limit)).map((item) => item.group));
    }

    function getSemanticMotionTags(intent, mood = "idle", style = "neutral", source = "emotion", extraTags = []) {
      const tags = [];
      tags.push(...(MOTION_SEMANTIC_TOKENS[String(intent || "idle").toLowerCase()] || []));
      tags.push(...(MOTION_SEMANTIC_TOKENS[String(mood || "idle").toLowerCase()] || []));
      tags.push(...(MOTION_SEMANTIC_TOKENS[String(source || "emotion").toLowerCase()] || []));
      tags.push(...uniqueMotionGroups(extraTags));
      if (style === "playful") {
        tags.push("tap", "wave", "happy", "jump");
      } else if (style === "comfort") {
        tags.push("idle", "down", "soft", "head");
      } else if (style === "clear") {
        tags.push("flickup", "pose", "main");
      } else if (style === "steady") {
        tags.push("body", "main", "flick");
      }
      return uniqueMotionGroups(tags);
    }

    function getStyleMotionGroups(style, intent) {
      const s = normalizeTalkStyle(style);
      const i = String(intent || "reply").trim().toLowerCase();
      const table = STYLE_MOTION_BLUEPRINT[s] || STYLE_MOTION_BLUEPRINT.neutral;
      const picked = table[i] || table.reply || STYLE_MOTION_BLUEPRINT.neutral.reply;
      return uniqueMotionGroups(picked);
    }

    function buildPlannedMotionGroups(style, intent, mood, source, extraTags = []) {
      const profile = call(deps.getActiveModelMotionProfile);
      const byStyle = getStyleMotionGroups(style, intent);
      const byMood = call(deps.pickMoodMotionGroups, mood, source) || [];
      const byProfileIntent = profile?.intents?.[String(intent || "idle").toLowerCase()] || [];
      const byProfileMood = profile?.moods?.[String(mood || "idle").toLowerCase()] || [];
      const semantic = findSemanticMotionGroups(getSemanticMotionTags(intent, mood, style, source, extraTags), 10);
      return uniqueMotionGroups([...byProfileIntent, ...byStyle, ...byProfileMood, ...byMood, ...semantic]);
    }

    function shouldThrottleActionIntent(intent, minGapMs = 700) {
      const key = String(intent || "unknown");
      const now = perf.now();
      const last = Number(state.actionLastAt?.[key] || 0);
      if ((now - last) < Math.max(80, Number(minGapMs) || 0)) {
        return true;
      }
      if (!state.actionLastAt) {
        state.actionLastAt = {};
      }
      state.actionLastAt[key] = now;
      return false;
    }

    function clearThinkingMotionTimer() {
      if (!state.thinkingMotionTimer) {
        return;
      }
      clearTimeout(state.thinkingMotionTimer);
      state.thinkingMotionTimer = 0;
    }

    function resetActionSystem() {
      clearThinkingMotionTimer();
      state.actionQueue = [];
      state.actionRunnerBusy = false;
      state.expressionPulseUntil = 0;
      state.expressionPulseBoost = 0;
    }

    function buildActionPlan(intent, context = {}) {
      const preset = call(deps.getMotionIntensityPreset) || {};
      const style = normalizeTalkStyle(context.style || state.currentTalkStyle || "neutral");
      const mood = detectMood(context.text || context.mood || "");
      const idleMood = ["happy", "sad", "angry", "surprised", "idle"].includes(String(context.idleMood || "")) ? String(context.idleMood || "") : "idle";
      const idleIntent = ["idle", "thinking", "listen"].includes(String(context.idleIntent || "")) ? String(context.idleIntent || "") : "idle";
      const comboEnabled = state.motionComboEnabled && context.combo !== false;
      const requestedBeats = Math.max(1, Math.min(4, Math.round(Number(context.beats) || 1)));
      const motionCue = normalizeMotionCue(context.motionCue || intent);
      const motionRole = normalizeMotionCue(context.motionRole || intent);
      const motionTags = uniqueMotionGroups([
        ...getMotionCueTags(motionCue),
        ...(Array.isArray(context.motionTags) ? context.motionTags : [])
      ]);
      const auditMotion = context.auditMotion === true;
      const steps = [];
      const planGroups = (motionIntent, motionMood, motionSource) => buildPlannedMotionGroups(style, motionIntent, motionMood, motionSource, motionTags);
      const finalizeSteps = () => steps.map((step) => ({
        ...step,
        motionCue,
        motionRole,
        motionTags: motionTags.slice(0, 8),
        auditMotion
      }));

      if (intent === "tap") {
        const tapMood = mood === "idle" ? "happy" : mood;
        if (Math.random() <= preset.tapChance) {
          steps.push({ mood: tapMood, source: "tap", groups: planGroups("tap", tapMood, "tap"), priority: 3, force: true, cooldownMs: 620, allowFallback: false });
        }
        if (comboEnabled && Math.random() < preset.comboChance) {
          const followMood = ["happy", "surprised", "idle"][Math.floor(Math.random() * 3)] || "idle";
          steps.push({ mood: followMood, source: "talk", groups: planGroups("talk", followMood, "talk"), priority: 2, force: true, cooldownMs: 520, delayMs: 160, allowFallback: false });
        }
        return finalizeSteps();
      }

      if (intent === "listen") {
        const listenMood = mood === "angry" ? "angry" : "idle";
        if (Math.random() < (Number(preset.listenChance) || 0.78)) {
          steps.push({ mood: listenMood, source: "talk", groups: planGroups("listen", listenMood, "talk"), priority: 2, force: false, cooldownMs: 900, allowFallback: false });
        }
        if (comboEnabled && Math.random() < (Number(preset.comboChance) || 0.4) * 0.28) {
          steps.push({ mood: listenMood, source: "idle", groups: planGroups("thinking", listenMood, "idle"), priority: 1, force: false, cooldownMs: 520, delayMs: 120, allowFallback: false });
        }
        return finalizeSteps();
      }

      if (intent === "thinking") {
        steps.push({ mood: "idle", source: "idle", groups: planGroups("thinking", "idle", "idle"), priority: 2, force: false, cooldownMs: 1200, allowFallback: false });
        if (comboEnabled && Math.random() < (Number(preset.thinkingComboChance) || 0.4)) {
          steps.push({ mood: "idle", source: "idle", groups: planGroups("idle", "idle", "idle"), priority: 1, force: false, cooldownMs: 640, delayMs: 180, allowFallback: false });
        }
        return finalizeSteps();
      }

      if (intent === "talk") {
        const emphasis = clampNumber(Number(context.emphasis) || 0, 0, 1);
        const accentCount = Math.max(0, Math.round(Number(context.accentCount) || 0));
        const talkChance = clampNumber((Number(preset.talkChance) || 0.82) + emphasis * 0.12, 0, 0.92);
        if (Math.random() > talkChance) {
          return finalizeSteps();
        }
        const talkMood = mood === "idle" && style === "playful" ? "happy" : mood;
        const maxBeats = Math.max(1, Math.min(4, Number(preset.talkMaxBeats) || 3));
        const beats = Math.max(1, Math.min(maxBeats, requestedBeats));
        steps.push({ mood: talkMood, source: style === "playful" ? "tap" : "talk", groups: planGroups("talk", talkMood, style === "playful" ? "tap" : "talk"), priority: 2, force: true, cooldownMs: Math.max(520, Math.round(780 - emphasis * 140)), allowFallback: false });
        const cadencePattern = emphasis > 0.45 ? [96, 270, 128] : [108, 256, 136];
        const cadenceStride = emphasis > 0.6 ? 46 : 52;
        for (let beat = 1; beat < beats; beat += 1) {
          const beatMood = beat % 2 === 0 ? "idle" : talkMood;
          const beatRole = (beat - 1) % 3;
          const isAccentBeat = beatRole === 0 || (accentCount > 1 && beatRole === 2);
          const nonlinearBeatDelay = cadencePattern[beatRole];
          steps.push({ mood: beatMood, source: isAccentBeat ? "reply" : "talk", groups: planGroups(isAccentBeat ? "reply" : "talk", beatMood, "talk"), priority: isAccentBeat ? 2 : 1, force: true, cooldownMs: isAccentBeat ? Math.max(340, Math.round(460 - emphasis * 80)) : 460, delayMs: nonlinearBeatDelay + Math.floor((beat - 1) / 3) * (cadenceStride + Math.round((1 - emphasis) * 8)), allowFallback: false });
        }
        const comboChance = (Number(preset.comboChance) || 0.4) * (0.42 + emphasis * 0.55);
        if (comboEnabled && (emphasis > 0.82 || Math.random() < comboChance)) {
          const accentMood = style === "comfort" ? "idle" : (talkMood === "idle" ? "happy" : talkMood);
          steps.push({ mood: accentMood, source: "talk", groups: planGroups("reply", accentMood, "talk"), priority: 2, force: true, cooldownMs: Math.max(460, Math.round(540 - emphasis * 60)), delayMs: Math.max(130, Math.round((180 + beats * 92) - emphasis * 38)), allowFallback: false });
        }
        return finalizeSteps();
      }

      if (intent === "reply") {
        steps.push({ mood, source: style === "playful" ? "tap" : "emotion", groups: planGroups("reply", mood, style === "playful" ? "tap" : "emotion"), priority: 3, force: true, cooldownMs: 860, allowFallback: true });
        if (comboEnabled && Math.random() < (preset.comboChance * 0.8)) {
          const follow = style === "comfort" ? "idle" : mood;
          steps.push({ mood: follow, source: "talk", groups: planGroups("talk", follow, "talk"), priority: 2, force: true, cooldownMs: 560, delayMs: 170, allowFallback: false });
        }
        if (comboEnabled && Math.random() < (Number(preset.replyAccentChance) || 0.42)) {
          const tailMood = style === "playful" ? "happy" : "idle";
          steps.push({ mood: tailMood, source: "idle", groups: planGroups("idle", tailMood, "idle"), priority: 1, force: false, cooldownMs: 480, delayMs: 280, allowFallback: false });
        }
        return finalizeSteps();
      }

      steps.push({ mood: idleMood, source: "idle", groups: planGroups(idleIntent, idleMood, "idle"), priority: 2, force: false, cooldownMs: 1000, allowFallback: false });
      if (comboEnabled && Math.random() < (Number(preset.idleComboChance) || 0.3)) {
        steps.push({ mood: "idle", source: "idle", groups: planGroups("thinking", "idle", "idle"), priority: 1, force: false, cooldownMs: 520, delayMs: 220, allowFallback: false });
      }
      return finalizeSteps();
    }

    function isTalkLikeActionStep(step) {
      const source = String(step?.source || "").toLowerCase();
      return source === "talk" || source === "reply";
    }

    function hasPendingTalkLikeAction() {
      if (!Array.isArray(state.actionQueue) || state.actionQueue.length <= 0) {
        return false;
      }
      return state.actionQueue.some((item) => isTalkLikeActionStep(item));
    }

    function shouldSkipActionStepForSpeech(step, now = perf.now()) {
      if (!isTalkLikeActionStep(step)) {
        return false;
      }
      const t = Number(now || perf.now());
      const activeUntil = Number(state.speechAnimUntil || 0);
      const speakingWindow = !!call(deps.isSpeechMotionActive, t) || t <= activeUntil + 120;
      if (!speakingWindow) {
        return false;
      }
      if (state.motionQuietDuringSpeech) {
        return true;
      }
      const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
      const delayMs = Number(step?.delayMs) || 0;
      if (delayMs > 0) {
        return true;
      }
      return motionBlend > 0.2 && (Number(step?.priority) || 0) <= 2;
    }

    async function runActionQueue() {
      if (state.actionRunnerBusy) {
        return;
      }
      state.actionRunnerBusy = true;
      try {
        while (state.actionQueue.length > 0) {
          const step = state.actionQueue.shift();
          if (!step || !state.motionEnabled || !state.model) {
            continue;
          }
          if (state.dragData || state.windowDragActive) {
            continue;
          }
          if (shouldSkipActionStepForSpeech(step, perf.now())) {
            continue;
          }
          if (Number(step.delayMs) > 0) {
            await waitMs(step.delayMs);
          }
          if (shouldSkipActionStepForSpeech(step, perf.now())) {
            continue;
          }
          const beforeDispatchAt = Number(state.lastMotionDirectorDispatch?.at || 0);
          const played = await call(deps.playEmotion, step.mood || "idle", {
            source: step.source || "emotion",
            groups: step.groups,
            priority: Number.isFinite(Number(step.priority)) ? Number(step.priority) : 2,
            force: !!step.force,
            cooldownMs: Number.isFinite(Number(step.cooldownMs)) ? Number(step.cooldownMs) : state.motionCooldownMs,
            allowFallback: step.allowFallback !== false,
            motionCue: step.motionCue,
            motionRole: step.motionRole
          });
          const dispatch = state.lastMotionDirectorDispatch && Number(state.lastMotionDirectorDispatch.at || 0) >= beforeDispatchAt
            ? state.lastMotionDirectorDispatch
            : null;
          if (step.auditMotion === true) {
            recordPerformanceAuditEvent("motion_dispatch", {
              phase: step.motionRole,
              name: step.motionCue,
              action: step.source || "emotion",
              motion_cue: step.motionCue,
              motion_role: step.motionRole,
              group: dispatch?.group || "fallback",
              ok: played !== false
            });
          }
        }
      } finally {
        state.actionRunnerBusy = false;
      }
    }

    function enqueueActionIntent(intent, context = {}) {
      if (!state.motionEnabled || !state.model) {
        return;
      }
      const i = String(intent || "idle");
      const minGap = i === "talk" ? Math.max(420, state.speakingMotionCooldownMs * 0.45) : 680;
      if (shouldThrottleActionIntent(i, minGap)) {
        return;
      }
      const plan = buildActionPlan(i, context);
      if (!Array.isArray(plan) || !plan.length) {
        return;
      }
      const style = normalizeTalkStyle(context.style || state.currentTalkStyle || "neutral");
      if (i === "reply") {
        call(deps.triggerExpressionPulse, style, 1.2, 640);
      } else if (i === "talk") {
        call(deps.triggerExpressionPulse, style, 0.95, 460);
      } else if (i === "tap") {
        call(deps.triggerExpressionPulse, style, 1.0, 420);
      } else if (i === "listen") {
        call(deps.triggerExpressionPulse, style, 0.58, 320);
      } else if (i === "thinking") {
        call(deps.triggerExpressionPulse, style, 0.46, 260);
      } else if (i === "idle") {
        call(deps.triggerExpressionPulse, style, 0.28, 200);
      }
      state.actionQueue.push(...plan);
      runActionQueue();
    }

    return { uniqueMotionGroups, normalizeMotionGroupKey, normalizeMotionCue, getMotionCueTags, findSemanticMotionGroups, getSemanticMotionTags, getStyleMotionGroups, buildPlannedMotionGroups, shouldThrottleActionIntent, clearThinkingMotionTimer, resetActionSystem, buildActionPlan, isTalkLikeActionStep, hasPendingTalkLikeAction, shouldSkipActionStepForSpeech, runActionQueue, enqueueActionIntent };
  }

  const api = { STYLE_MOTION_BLUEPRINT, MOTION_SEMANTIC_TOKENS, MOTION_CUE_TOKENS, uniqueMotionGroups, normalizeMotionGroupKey, normalizeMotionCue, getMotionCueTags, createController };
  root.TaffyActionPlanController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
