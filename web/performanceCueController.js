(function (root) {
  "use strict";

  const VALID_EMOTIONS = ["neutral", "happy", "playful", "excited", "shy", "hurt", "sad", "anxious", "angry", "surprised", "serious", "thinking"];
  const VALID_ACTIONS = ["none", "nod", "think", "happy_idle", "wave", "shake_head", "surprised"];
  const VALID_VOICE_STYLES = ["neutral", "soft", "cheerful", "teasing", "serious", "curious", "warm"];
  const VALID_TALK_STYLES = ["neutral", "playful", "comfort", "steady", "clear"];

  const EMOTION_PROFILES = {
    neutral: { live2dMood: "idle", talkStyle: "neutral", voiceStyle: "neutral", gestureProfile: "neutral", motionStrength: 1.22, bodyBoost: 1.0, beatBoost: 0.92, expressionBoost: 1.0, holdMs: 900, pulseBoost: 0.22, pulseMs: 190 },
    happy: { live2dMood: "happy", talkStyle: "playful", voiceStyle: "cheerful", gestureProfile: "bright", motionStrength: 1.64, bodyBoost: 1.14, beatBoost: 1.22, expressionBoost: 1.12, holdMs: 1150, pulseBoost: 0.34, pulseMs: 220 },
    playful: { live2dMood: "happy", talkStyle: "playful", voiceStyle: "teasing", gestureProfile: "bright", motionStrength: 1.82, bodyBoost: 1.22, beatBoost: 1.32, expressionBoost: 1.18, holdMs: 1200, pulseBoost: 0.38, pulseMs: 230 },
    excited: { live2dMood: "happy", talkStyle: "playful", voiceStyle: "cheerful", gestureProfile: "bright", motionStrength: 1.94, bodyBoost: 1.28, beatBoost: 1.4, expressionBoost: 1.24, holdMs: 1050, pulseBoost: 0.44, pulseMs: 210 },
    shy: { live2dMood: "happy", talkStyle: "comfort", voiceStyle: "soft", gestureProfile: "shy", motionStrength: 1.08, bodyBoost: 0.84, beatBoost: 0.72, expressionBoost: 1.16, holdMs: 1450, pulseBoost: 0.2, pulseMs: 250 },
    hurt: { live2dMood: "sad", talkStyle: "comfort", voiceStyle: "soft", gestureProfile: "soft", motionStrength: 0.94, bodyBoost: 0.74, beatBoost: 0.62, expressionBoost: 1.14, holdMs: 1600, pulseBoost: 0.18, pulseMs: 280 },
    sad: { live2dMood: "sad", talkStyle: "comfort", voiceStyle: "soft", gestureProfile: "soft", motionStrength: 0.98, bodyBoost: 0.78, beatBoost: 0.68, expressionBoost: 1.08, holdMs: 1500, pulseBoost: 0.2, pulseMs: 260 },
    anxious: { live2dMood: "sad", talkStyle: "comfort", voiceStyle: "soft", gestureProfile: "soft", motionStrength: 1.06, bodyBoost: 0.84, beatBoost: 0.78, expressionBoost: 1.14, holdMs: 1450, pulseBoost: 0.24, pulseMs: 230 },
    angry: { live2dMood: "angry", talkStyle: "steady", voiceStyle: "serious", gestureProfile: "steady", motionStrength: 1.5, bodyBoost: 1.08, beatBoost: 1.08, expressionBoost: 1.2, holdMs: 1250, pulseBoost: 0.32, pulseMs: 190 },
    surprised: { live2dMood: "surprised", talkStyle: "clear", voiceStyle: "curious", gestureProfile: "bright", motionStrength: 1.74, bodyBoost: 1.18, beatBoost: 1.28, expressionBoost: 1.24, holdMs: 1050, pulseBoost: 0.4, pulseMs: 210 },
    serious: { live2dMood: "idle", talkStyle: "steady", voiceStyle: "serious", gestureProfile: "steady", motionStrength: 1.16, bodyBoost: 0.92, beatBoost: 0.82, expressionBoost: 1.02, holdMs: 1200, pulseBoost: 0.2, pulseMs: 230 },
    thinking: { live2dMood: "thinking", talkStyle: "clear", voiceStyle: "curious", gestureProfile: "curious", motionStrength: 1.34, bodyBoost: 0.96, beatBoost: 0.9, expressionBoost: 1.1, holdMs: 1300, pulseBoost: 0.26, pulseMs: 240 }
  };

  const INTENSITY_SCALE = {
    low: 0.84,
    medium: 1,
    high: 1.16
  };

  const MOTION_MODE_SCALE = {
    low: 0.9,
    medium: 1,
    high: 1.22
  };

  const HIYORI_AUTHORED_MOTIONS = Object.freeze({
    happy: Object.freeze({ group: "EmotionHappy", file: "hiyori_m06.motion3.json", durationMs: 5370, cooldownMs: 6500 }),
    playful: Object.freeze({ group: "EmotionPlayful", file: "hiyori_m08.motion3.json", durationMs: 2100, cooldownMs: 3300 }),
    excited: Object.freeze({ group: "EmotionHappy", file: "hiyori_m06.motion3.json", durationMs: 5370, cooldownMs: 6500 }),
    shy: Object.freeze({ group: "EmotionShy", file: "hiyori_m05.motion3.json", durationMs: 8570, cooldownMs: 11000 }),
    hurt: Object.freeze({ group: "EmotionSad", file: "hiyori_m10.motion3.json", durationMs: 4170, cooldownMs: 6500 }),
    sad: Object.freeze({ group: "EmotionSad", file: "hiyori_m10.motion3.json", durationMs: 4170, cooldownMs: 6500 }),
    anxious: Object.freeze({ group: "EmotionSad", file: "hiyori_m10.motion3.json", durationMs: 4170, cooldownMs: 6500 }),
    angry: Object.freeze({ group: "EmotionAngry", file: "hiyori_m09.motion3.json", durationMs: 1600, cooldownMs: 3000 }),
    surprised: Object.freeze({ group: "EmotionSurprised", file: "hiyori_m07.motion3.json", durationMs: 1900, cooldownMs: 2800 })
  });

  const HIYORI_AUTHORED_ACTIONS = Object.freeze({
    wave: Object.freeze({ group: "EmotionHappy", file: "hiyori_m06.motion3.json", durationMs: 5370, cooldownMs: 6500 }),
    nod: Object.freeze({ group: "FlickDown", file: "hiyori_m04.motion3.json", durationMs: 4430, cooldownMs: 5000 }),
    think: Object.freeze({ group: "Thinking", file: "hiyori_thinking_01.motion3.json", durationMs: 2800, cooldownMs: 4200 }),
    happy_idle: Object.freeze({ group: "EmotionHappy", file: "hiyori_m06.motion3.json", durationMs: 5370, cooldownMs: 6500 }),
    surprised: Object.freeze({ group: "EmotionSurprised", file: "hiyori_m07.motion3.json", durationMs: 1900, cooldownMs: 2800 })
  });

  function clampNumber(value, fallback, min, max) {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) ? numeric : fallback;
    return Math.max(min, Math.min(max, safe));
  }

  function clean(value, fallback = "") {
    const text = String(value == null ? "" : value).trim();
    return text || fallback;
  }

  function key(value) {
    return clean(value).toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  }

  function normalizePerformanceCueEmotion(value) {
    const raw = key(value);
    const aliases = {
      idle: "neutral",
      joy: "happy",
      cheerful: "happy",
      teasing: "playful",
      embarrassed: "shy",
      bashful: "shy",
      aggrieved: "hurt",
      wounded: "hurt",
      worry: "anxious",
      worried: "anxious",
      nervous: "anxious",
      curious: "thinking",
      thoughtful: "thinking",
      think: "thinking",
      surprise: "surprised"
    };
    const normalized = aliases[raw] || raw;
    return VALID_EMOTIONS.includes(normalized) ? normalized : "neutral";
  }

  function normalizePerformanceCueIntensity(value) {
    if (typeof value === "number") {
      if (value >= 0.72) return "high";
      if (value <= 0.34) return "low";
      return "medium";
    }
    const raw = key(value);
    if (["high", "strong", "large", "big", "excited", "intense"].includes(raw)) return "high";
    if (["low", "soft", "small", "subtle", "calm"].includes(raw)) return "low";
    return "medium";
  }

  function normalizeAction(value) {
    const raw = key(value || "none");
    const aliases = {
      ponder: "think",
      thinking: "think",
      consider: "think"
    };
    const normalized = aliases[raw] || raw;
    return VALID_ACTIONS.includes(normalized) ? normalized : "none";
  }

  function normalizeVoiceStyle(value, fallback) {
    const raw = key(value || fallback || "neutral");
    return VALID_VOICE_STYLES.includes(raw) ? raw : fallback || "neutral";
  }

  function normalizeTalkStyle(value, fallback) {
    const raw = key(value || fallback || "neutral");
    return VALID_TALK_STYLES.includes(raw) ? raw : fallback || "neutral";
  }

  function resolveHiyoriAuthoredMotion(emotionValue, actionValue, intensityValue) {
    const emotion = normalizePerformanceCueEmotion(emotionValue);
    const action = normalizeAction(actionValue || "none");
    const intensity = normalizePerformanceCueIntensity(intensityValue || "medium");
    const explicit = HIYORI_AUTHORED_ACTIONS[action] || null;
    if (explicit) {
      return {
        ...explicit,
        emotion,
        action,
        reason: "explicit_action"
      };
    }
    // A semantic-only action such as shake_head should retain its dedicated
    // procedural choreography instead of being replaced by a generic emotion.
    if (action !== "none" || intensity !== "high") {
      return null;
    }
    const emotional = HIYORI_AUTHORED_MOTIONS[emotion] || null;
    return emotional
      ? {
          ...emotional,
          emotion,
          action,
          reason: "high_intensity_emotion"
        }
      : null;
  }

  function normalizeCompanionPerformancePlan(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const hasSignal = ["emotion", "action", "intensity", "voice_style"].some((keyName) => {
      const raw = value[keyName];
      return raw !== undefined && raw !== null && String(raw).trim() !== "";
    });
    if (!hasSignal) {
      return null;
    }
    return {
      emotion: normalizePerformanceCueEmotion(value.emotion),
      action: normalizeAction(value.action || "none"),
      intensity: normalizePerformanceCueIntensity(value.intensity || "medium"),
      voiceStyle: normalizeVoiceStyle(value.voice_style || "neutral", "neutral")
    };
  }

  function inferEmotionFromText(text, mood) {
    const source = clean(text);
    const moodEmotion = normalizePerformanceCueEmotion(mood);
    if (moodEmotion !== "neutral") return moodEmotion;
    if (!source) return "neutral";
    if (/[？?].*[！!]|[！!].*[？?]|真的假的|真的吗|不会吧|欸/.test(source)) return "surprised";
    if (/好耶|做到了|成功了|太棒了|so excited|we did it/i.test(source)) return "excited";
    if (/哈哈|开心|太好了|nice|great/i.test(source)) return "happy";
    if (/嘿嘿|逗你|开玩笑|哼哼/.test(source)) return "playful";
    if (/害羞|脸红|不好意思啦|别这么看/.test(source)) return "shy";
    if (/委屈|欺负人|有点受伤|不公平/.test(source)) return "hurt";
    if (/担心|焦虑|不太妙|糟糕/.test(source)) return "anxious";
    if (/难过|抱歉|对不起|遗憾/.test(source)) return "sad";
    if (/生气|别这样|不行|过分/.test(source)) return "angry";
    if (/认真说|说正经的|重点是|必须|务必/.test(source)) return "serious";
    if (/想一下|我看看|让我想|分析一下|maybe|think/i.test(source)) return "thinking";
    return "neutral";
  }

  function buildPerformanceCue(input = {}) {
    const runtime = input.runtimeMetadata && typeof input.runtimeMetadata === "object" && !Array.isArray(input.runtimeMetadata)
      ? input.runtimeMetadata
      : null;
    const companionPlan = normalizeCompanionPerformancePlan(input.performancePlan);
    const replyCue = input.replyCue && typeof input.replyCue === "object" && !Array.isArray(input.replyCue)
      ? input.replyCue
      : null;
    const runtimeEmotionRaw = runtime && runtime.emotion != null ? clean(runtime.emotion) : "";
    const runtimeEmotion = runtimeEmotionRaw ? normalizePerformanceCueEmotion(runtimeEmotionRaw) : "";
    const fallbackEmotion = inferEmotionFromText(input.replyText, input.mood);
    const replyCueHasSignal = !!(replyCue && (replyCue.speechStyle || replyCue.voiceStyle));
    const emotion = companionPlan ? companionPlan.emotion : (runtimeEmotion || fallbackEmotion);
    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
    const source = companionPlan
      ? "companion_turn"
      : runtimeEmotionRaw
        ? "runtime"
      : replyCueHasSignal
        ? "reply_cue"
        : fallbackEmotion !== "neutral"
          ? "text_fallback"
          : "default";
    const intensity = companionPlan
      ? companionPlan.intensity
      : normalizePerformanceCueIntensity(runtime?.intensity || input.intensity || "medium");
    const motionMode = normalizePerformanceCueIntensity(input.motionIntensity || "medium");
    const scale = (INTENSITY_SCALE[intensity] || 1) * (MOTION_MODE_SCALE[motionMode] || 1);
    const voiceStyle = companionPlan
      ? companionPlan.voiceStyle
      : normalizeVoiceStyle(runtime?.voice_style || replyCue?.voiceStyle || profile.voiceStyle, profile.voiceStyle);
    const candidateTalkStyle = replyCue?.speechStyle || (source === "text_fallback" ? profile.talkStyle : input.talkStyle) || profile.talkStyle;
    const talkStyle = normalizeTalkStyle(
      companionPlan || runtime?.voice_style ? profile.talkStyle : candidateTalkStyle,
      profile.talkStyle
    );
    const motionStrength = clampNumber(profile.motionStrength * scale, 1.48, 0.7, 2.2);
    const cue = {
      version: 1,
      source,
      emotion,
      live2dMood: profile.live2dMood,
      action: companionPlan ? companionPlan.action : normalizeAction(runtime?.action || input.action || "none"),
      intensity,
      motionMode,
      talkStyle,
      voiceStyle,
      speech: {
        motionStrength: Number(motionStrength.toFixed(2)),
        bodyBoost: Number(clampNumber(profile.bodyBoost * scale, 1, 0.65, 1.45).toFixed(2)),
        beatBoost: Number(clampNumber(profile.beatBoost * scale, 1, 0.55, 1.55).toFixed(2)),
        expressionBoost: Number(clampNumber(profile.expressionBoost * scale, 1, 0.75, 1.45).toFixed(2)),
        holdMs: Math.round(clampNumber(profile.holdMs * scale, 900, 500, 2200)),
        pulseBoost: Number(clampNumber(profile.pulseBoost * scale, 0.28, 0.12, 0.62).toFixed(2)),
        pulseMs: Math.round(clampNumber(profile.pulseMs, 220, 120, 480))
      },
      timeline: {
        mood: profile.live2dMood,
        style: talkStyle,
        gestureProfile: profile.gestureProfile
      }
    };
    cue.authoredMotion = resolveHiyoriAuthoredMotion(cue.emotion, cue.action, cue.intensity);
    return cue;
  }

  function resolvePerformanceCueMotionPlan(cue = null) {
    if (!cue || typeof cue !== "object" || Array.isArray(cue)) {
      return null;
    }
    const emotion = normalizePerformanceCueEmotion(cue.emotion);
    const action = normalizeAction(cue.action || "none");
    const intensity = normalizePerformanceCueIntensity(cue.intensity || "medium");
    const explicitGroups = {
      wave: ["FlickUp", "Tap"],
      nod: ["FlickDown", "Idle"],
      think: ["Thinking", "Tap@Body", "Flick@Body", "FlickDown"],
      happy_idle: ["Tap", "Idle"],
      shake_head: ["Flick@Body", "Flick", "FlickDown"],
      surprised: ["Flick", "Tap@Body"]
    };
    const emotionalGroups = {
      happy: ["FlickUp", "Tap"],
      playful: ["FlickUp", "Tap"],
      surprised: ["Flick", "Tap@Body"],
      thinking: ["Thinking", "Tap@Body", "Flick@Body", "FlickDown"],
      sad: ["Flick@Body", "FlickDown"],
      anxious: ["Flick@Body", "FlickDown"],
      angry: ["Tap@Body", "FlickDown"]
    };
    const authoredMotion = resolveHiyoriAuthoredMotion(emotion, action, intensity);
    const legacyGroups = (explicitGroups[action] || emotionalGroups[emotion] || []).slice();
    const groups = authoredMotion
      ? [authoredMotion.group, ...legacyGroups.filter((group) => group !== authoredMotion.group)]
      : legacyGroups;
    const explicitAction = action !== "none";
    const shouldTrigger = groups.length > 0 && (explicitAction || intensity === "high");
    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;
    return {
      shouldTrigger,
      reason: explicitAction ? "explicit_action" : (intensity === "high" ? "high_intensity" : "none"),
      mood: clean(cue.live2dMood, profile.live2dMood),
      emotion,
      action,
      intensity,
      groups,
      motionCue: action,
      motionRole: emotion,
      priority: explicitAction ? 5 : 4,
      cooldownMs: authoredMotion?.cooldownMs || 900,
      authoredMotion
    };
  }

  const api = {
    EMOTION_PROFILES,
    HIYORI_AUTHORED_MOTIONS,
    HIYORI_AUTHORED_ACTIONS,
    buildPerformanceCue,
    normalizeCompanionPerformancePlan,
    normalizePerformanceCueEmotion,
    normalizePerformanceCueIntensity,
    resolveHiyoriAuthoredMotion,
    resolvePerformanceCueMotionPlan
  };

  root.TaffyPerformanceCueController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
