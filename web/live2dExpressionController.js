(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const window = deps.windowObject || root;
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
    const sanitizeSpeakText = typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText : (text) => String(text || "").trim();
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : (style) => String(style || "neutral").trim() || "neutral";
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : () => "idle";
    const isSpeechMotionActive = typeof deps.isSpeechMotionActive === "function" ? deps.isSpeechMotionActive : () => false;
    const isSpeakingNow = typeof deps.isSpeakingNow === "function" ? deps.isSpeakingNow : () => false;
    const LIVE2D_EXPRESSION_TUNING = deps.live2dExpressionTuning || {};
    const STYLE_EXPRESSION_PROFILE = deps.styleExpressionProfile || LIVE2D_EXPRESSION_TUNING.STYLE_EXPRESSION_PROFILE || { neutral: { mouthForm: 0, cheek: 0, eyeSmile: 0, browY: 0, browAngle: 0, headX: 0, headY: 0, bodyX: 0, floatScale: 1 } };
    const MOTION_INTENSITY_PRESETS = deps.motionIntensityPresets || { normal: { idleIntervalScale: 1, talkChance: 1, comboChance: 0.4, tapChance: 1, listenChance: 0.8, thinkingComboChance: 0.46, idleComboChance: 0.3, replyAccentChance: 0.42, talkMaxBeats: 3 } };
    const MODEL_MOTION_PROFILES = deps.modelMotionProfiles || {};

    function normalizeMotionIntensity(level) {
      const x = String(level || "normal").trim().toLowerCase();
      if (x === "low" || x === "high" || x === "normal") {
        return x;
      }
      return "normal";
    }

    function getMotionIntensityPreset() {
      const key = normalizeMotionIntensity(state.motionIntensity);
      return MOTION_INTENSITY_PRESETS[key] || MOTION_INTENSITY_PRESETS.normal;
    }

    function getStyleExpressionProfile(style) {
      if (typeof LIVE2D_EXPRESSION_TUNING.getStyleExpressionProfile === "function") {
        return LIVE2D_EXPRESSION_TUNING.getStyleExpressionProfile(style);
      }
      const s = normalizeTalkStyle(style);
      return STYLE_EXPRESSION_PROFILE[s] || STYLE_EXPRESSION_PROFILE.neutral;
    }

    function detectModelProfileName() {
      const modelPath = String(state.config?.model_path || "").trim().toLowerCase();
      for (const key of Object.keys(MODEL_MOTION_PROFILES)) {
        if (modelPath.includes(key.toLowerCase())) {
          return key;
        }
      }
      return "";
    }

    function getActiveModelMotionProfile() {
      const key = String(state.modelProfileName || "").trim();
      if (!key) {
        return null;
      }
      return MODEL_MOTION_PROFILES[key] || null;
    }

    function getActiveModelCadence() {
      return getActiveModelMotionProfile()?.cadence || null;
    }

    function getCoreModel() {
      return state.model?.internalModel?.coreModel || null;
    }

    function safeAddParamValue(core, id, delta, weight = 1) {
      if (!core || !id || !Number.isFinite(Number(delta)) || Math.abs(Number(delta)) < 0.0001) {
        return;
      }
      const d = Number(delta);
      const w = Number.isFinite(Number(weight)) ? Number(weight) : 1;
      try {
        if (typeof core.addParameterValueById === "function") {
          core.addParameterValueById(id, d, w);
          return;
        }
        if (
          typeof core.getParameterValueById === "function"
          && typeof core.setParameterValueById === "function"
        ) {
          const cur = Number(core.getParameterValueById(id) || 0);
          core.setParameterValueById(id, cur + d, w);
        }
      } catch (_) {
        // ignore unsupported parameter ids
      }
    }

    function safeSetParamValue(core, id, value, weight = 1) {
      if (!core || !id || !Number.isFinite(Number(value))) {
        return;
      }
      const v = Number(value);
      const w = Number.isFinite(Number(weight)) ? clampNumber(Number(weight), 0, 1) : 1;
      let apiApplied = false;
      let apiTarget = v;
      try {
        if (
          typeof core.getParameterValueById === "function"
          && typeof core.setParameterValueById === "function"
        ) {
          if (w >= 0.999) {
            core.setParameterValueById(id, v, 1);
            apiApplied = true;
            apiTarget = v;
          } else {
            const cur = Number(core.getParameterValueById(id) || 0);
            apiTarget = cur + (v - cur) * w;
            core.setParameterValueById(id, apiTarget, 1);
            apiApplied = true;
          }
        }
      } catch (_) {
        // ignore and fallback to raw parameter array
      }
      if (apiApplied) {
        try {
          if (typeof core.getParameterValueById === "function") {
            const after = Number(core.getParameterValueById(id));
            if (Number.isFinite(after) && Math.abs(after - apiTarget) <= 0.0015) {
              return;
            }
          }
        } catch (_) {
          // ignore and fallback to raw parameter array
        }
      }
      try {
        const params = core?._model?.parameters;
        const ids = params?.ids;
        const vals = params?.values;
        if (!ids || !vals) {
          return;
        }
        const idx = Array.from(ids).indexOf(id);
        if (idx < 0) {
          return;
        }
        const cur = Number(vals[idx] || 0);
        vals[idx] = cur + (v - cur) * w;
      } catch (_) {
        // ignore unsupported parameter ids
      }
    }

    function safeGetParamValue(core, id) {
      if (!core || !id) {
        return NaN;
      }
      try {
        if (typeof core.getParameterValueById === "function") {
          const v = Number(core.getParameterValueById(id));
          if (Number.isFinite(v)) {
            return v;
          }
        }
      } catch (_) {
        // ignore and fallback to raw parameter array
      }
      try {
        const params = core?._model?.parameters;
        const ids = params?.ids;
        const vals = params?.values;
        if (!ids || !vals) {
          return NaN;
        }
        const idx = Array.from(ids).indexOf(id);
        if (idx < 0) {
          return NaN;
        }
        const v = Number(vals[idx]);
        return Number.isFinite(v) ? v : NaN;
      } catch (_) {
        return NaN;
      }
    }

    function safeDriveParamValue(core, id, target, gain = 1) {
      if (!core || !id || !Number.isFinite(Number(target))) {
        return;
      }
      const t = Number(target);
      const g = clampNumber(Number(gain) || 1, 0, 1);
      const cur = safeGetParamValue(core, id);
      if (!Number.isFinite(cur)) {
        safeSetParamValue(core, id, t, g);
        return;
      }
      const delta = (t - cur) * g;
      if (Math.abs(delta) < 0.0001) {
        return;
      }
      safeAddParamValue(core, id, delta, 1);
    }

    function triggerExpressionPulse(style = "neutral", boost = 1, durationMs = 520) {
      const now = performance.now();
      state.expressionStyle = normalizeTalkStyle(style);
      state.expressionPulseBoost = clampNumber(Number(boost) || 1, 0.2, 2.2);
      state.expressionPulseUntil = now + Math.max(120, Number(durationMs) || 520);
    }

    function estimateSpeechAnimationDurationMs(text, style = "neutral") {
      const cleaned = sanitizeSpeakText(text);
      const chars = cleaned.length;
      const punct = (cleaned.match(/[，。！？!?、]/g) || []).length;
      let duration = 360 + chars * 82 + punct * 130;
      if (style === "comfort") {
        duration *= 1.06;
      } else if (style === "playful") {
        duration *= 0.94;
      } else if (style === "steady") {
        duration *= 0.98;
      }
      return Math.round(clampNumber(duration, 360, 12000));
    }

    function beginSpeechAnimation(text, mood = "idle", style = "neutral", opts = {}) {
      const cleaned = sanitizeSpeakText(text);
      if (!cleaned) {
        return;
      }
      const now = performance.now();
      const durationMs = Math.max(
        240,
        Math.round(Number(opts.durationMs) || estimateSpeechAnimationDurationMs(cleaned, style))
      );
      state.speechAnimStartedAt = now;
      state.speechAnimDurationMs = durationMs;
      state.speechAnimUntil = now + durationMs + 180;
      state.speechAnimSeed = Math.random() * Math.PI * 2;
      state.speechAnimTextLength = cleaned.length;
      state.speechAnimPunctuation = (cleaned.match(/[，。！？!?、]/g) || []).length;
      state.speechAnimAccentCount = (cleaned.match(/[!?\uFF01\uFF1F]/g) || []).length;
      state.speechAnimStyle = normalizeTalkStyle(style || state.currentTalkStyle || "neutral");
      state.speechAnimMood = String(mood || detectMood(cleaned) || "idle");
    }

    function endSpeechAnimation() {
      state.speechAnimUntil = 0;
      state.speechAnimStartedAt = 0;
      state.speechAnimDurationMs = 0;
      state.speechAnimAccentCount = 0;
      state.speechMouthOpen = 0;
      state.speechMouthTarget = 0;
      state.speechMouthUpdatedAt = performance.now();
      state.ttsAudioLevel = 0;
      state.ttsAudioRawLevel = 0;
      state.ttsAudioRms = 0;
      state.ttsAudioLastVoiceAt = 0;
      state.moodHoldUntil = performance.now() + 1500;
    }

    function finishSpeechAnimation() {
      const now = performance.now();
      const releaseMs = 260;
      const holdMs = 900;
      state.speechAnimUntil = now + releaseMs;
      state.speechMouthTarget = 0;
      state.speechMouthUpdatedAt = now;
      state.ttsAudioLevel = 0;
      state.ttsAudioRawLevel = 0;
      state.ttsAudioRms = 0;
      state.ttsAudioLastVoiceAt = 0;
      state.moodHoldUntil = Math.max(Number(state.moodHoldUntil || 0), now + holdMs);
    }

    function ensureMicroMotionState(now = performance.now()) {
      if (!Number.isFinite(Number(state.microBreathSeed)) || Math.abs(Number(state.microBreathSeed)) < 0.0001) {
        state.microBreathSeed = Math.random() * Math.PI * 2;
      }
      if (!Number(state.microNextBlinkAt)) {
        state.microNextBlinkAt = now + 1400 + Math.random() * 2600;
      }
      if (!Number(state.microNextGazeAt)) {
        state.microNextGazeAt = now + 900 + Math.random() * 2200;
      }
      if (!Number.isFinite(Number(state.microMotionLastAt)) || Number(state.microMotionLastAt) <= 0) {
        state.microMotionLastAt = now;
      }
      if (!["idle", "attack", "sustain", "release"].includes(String(state.speechPhase || ""))) {
        state.speechPhase = "idle";
      }
      if (!Number.isFinite(Number(state.speechPhaseEnteredAt))) {
        state.speechPhaseEnteredAt = 0;
      }
      if (typeof state.speechPhaseWasSpeaking !== "boolean") {
        state.speechPhaseWasSpeaking = false;
      }
      if (!Number.isFinite(Number(state.speechMotionBlend))) {
        state.speechMotionBlend = 0;
      }
      if (!Number.isFinite(Number(state.speechMotionStrength))) {
        state.speechMotionStrength = 1.48;
      }
      if (!Number.isFinite(Number(state.beatPrevLevel))) {
        state.beatPrevLevel = 0;
      }
      if (!Number.isFinite(Number(state.beatImpulse))) {
        state.beatImpulse = 0;
      }
      if (!Number.isFinite(Number(state.beatNodSmoothed))) {
        state.beatNodSmoothed = 0;
      }
      if (!Number.isFinite(Number(state.beatCooldownUntil))) {
        state.beatCooldownUntil = 0;
      }
      if (!Number.isFinite(Number(state.mouseGazeCurrentX))) {
        state.mouseGazeCurrentX = 0;
      }
      if (!Number.isFinite(Number(state.mouseGazeCurrentY))) {
        state.mouseGazeCurrentY = 0;
      }
      if (!Number.isFinite(Number(state.spring_hairAhoge_vel))) state.spring_hairAhoge_vel = 0;
      if (!Number.isFinite(Number(state.spring_hairAhoge_pos))) state.spring_hairAhoge_pos = 0;
      if (!Number.isFinite(Number(state.spring_hairFront_vel))) state.spring_hairFront_vel = 0;
      if (!Number.isFinite(Number(state.spring_hairFront_pos))) state.spring_hairFront_pos = 0;
      if (!Number.isFinite(Number(state.spring_hairBack_vel))) state.spring_hairBack_vel = 0;
      if (!Number.isFinite(Number(state.spring_hairBack_pos))) state.spring_hairBack_pos = 0;
      if (!Number.isFinite(Number(state.spring_ribbon_vel))) state.spring_ribbon_vel = 0;
      if (!Number.isFinite(Number(state.spring_ribbon_pos))) state.spring_ribbon_pos = 0;
      if (!Number.isFinite(Number(state.spring_skirt_vel))) state.spring_skirt_vel = 0;
      if (!Number.isFinite(Number(state.spring_skirt_pos))) state.spring_skirt_pos = 0;
      if (!Number.isFinite(Number(state.spring_skirt2_vel))) state.spring_skirt2_vel = 0;
      if (!Number.isFinite(Number(state.spring_skirt2_pos))) state.spring_skirt2_pos = 0;
      if (!Number.isFinite(Number(state.spring_torso_vel))) state.spring_torso_vel = 0;
      if (!Number.isFinite(Number(state.spring_torso_pos))) state.spring_torso_pos = 0;
      if (!Number.isFinite(Number(state.spring_head_vel))) state.spring_head_vel = 0;
      if (!Number.isFinite(Number(state.spring_head_pos))) state.spring_head_pos = 0;
      if (!Number.isFinite(Number(state.spring_body_vel))) state.spring_body_vel = 0;
      if (!Number.isFinite(Number(state.spring_body_pos))) state.spring_body_pos = 0;
      if (!Number.isFinite(Number(state.spring_body_render))) state.spring_body_render = 0;
      if (!Number.isFinite(Number(state.spring_torso_render))) state.spring_torso_render = 0;
      if (!Number.isFinite(Number(state.spring_head_render))) state.spring_head_render = 0;
    }

    function getSmoothedMoodExpression(now = performance.now()) {
      const now2 = now || performance.now();
      const holding = now2 < Number(state.moodHoldUntil || 0);
      const speakingNow = isSpeechMotionActive(now2);
      const activeMood = (holding || speakingNow)
        ? String(state.speechAnimMood || "idle")
        : "idle";
      const prev = state.moodExpressionSmoothed && typeof state.moodExpressionSmoothed === "object"
        ? state.moodExpressionSmoothed
        : { happy: 0, sad: 0, angry: 0, surprised: 0 };
      const target = { happy: 0, sad: 0, angry: 0, surprised: 0 };
      if (activeMood in target) {
        target[activeMood] = 1;
      }
      const last = Number(state.moodExpressionUpdatedAt || 0);
      if (last > 0 && now2 - last < 1) {
        return prev;
      }
      const dtFrames = last > 0 ? clampNumber((now2 - last) / 16.6667, 0.5, 3.5) : 1;
      const smoothing = 1 - Math.pow(1 - 0.28, dtFrames);
      const next = {
        happy: prev.happy + (target.happy - prev.happy) * smoothing,
        sad: prev.sad + (target.sad - prev.sad) * smoothing,
        angry: prev.angry + (target.angry - prev.angry) * smoothing,
        surprised: prev.surprised + (target.surprised - prev.surprised) * smoothing
      };
      state.moodExpressionSmoothed = next;
      state.moodExpressionUpdatedAt = now2;
      return next;
    }

    function ensureTTSAudioAnalyser(audio) {
      if (!audio) {
        return false;
      }
      if (state.ttsAudioAnalyser && state.ttsAudioSourceNode) {
        return true;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return false;
      }
      try {
        if (!state.ttsAudioContext) {
          state.ttsAudioContext = new AudioCtx();
        }
        if (!state.ttsAudioSourceNode) {
          state.ttsAudioSourceNode = state.ttsAudioContext.createMediaElementSource(audio);
        }
        if (!state.ttsAudioAnalyser) {
        state.ttsAudioAnalyser = state.ttsAudioContext.createAnalyser();
        state.ttsAudioAnalyser.fftSize = 256;
        state.ttsAudioAnalyser.smoothingTimeConstant = 0.12;
          state.ttsAudioAnalyserData = new Uint8Array(state.ttsAudioAnalyser.frequencyBinCount);
          state.ttsAudioSourceNode.connect(state.ttsAudioAnalyser);
          state.ttsAudioAnalyser.connect(state.ttsAudioContext.destination);
        }
        return true;
      } catch (_) {
        return false;
      }
    }

    function sampleTTSAudioLevel() {
      const analyser = state.ttsAudioAnalyser;
      const data = state.ttsAudioAnalyserData;
      if (!analyser || !data || !data.length) {
        state.ttsAudioLevel += (0 - state.ttsAudioLevel) * 0.42;
        state.ttsAudioRawLevel = 0;
        state.ttsAudioRms = 0;
        return state.ttsAudioLevel;
      }
      try {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const centered = (data[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / data.length);
        const normalized = clampNumber((rms - 0.006) / 0.095, 0, 1);
        const smoothing = normalized > state.ttsAudioLevel ? 0.88 : 0.78;
        state.ttsAudioRawLevel = normalized;
        state.ttsAudioRms = rms;
        if (normalized > 0.035) {
          state.ttsAudioLastVoiceAt = performance.now();
        }
        state.ttsAudioLevel += (normalized - state.ttsAudioLevel) * smoothing;
      } catch (_) {
        state.ttsAudioLevel += (0 - state.ttsAudioLevel) * 0.42;
        state.ttsAudioRawLevel = 0;
        state.ttsAudioRms = 0;
      }
      return state.ttsAudioLevel;
    }

    function updateMicroMotionLayer() {
      if (!state.expressionEnabled || !state.model) {
        return;
      }
      const core = getCoreModel();
      if (!core) {
        return;
      }
      const now = performance.now();
      ensureMicroMotionState(now);
      const prevMotionAt = Number(state.microMotionLastAt) || now;
      const rawDtFrames = (now - prevMotionAt) / 16.6667;
      state.microMotionLastAt = now;
      const style = normalizeTalkStyle(state.currentTalkStyle || state.expressionStyle || "neutral");
      const speaking = isSpeechMotionActive(now);
      const dtFrames = speaking
        ? clampNumber(rawDtFrames, 0.86, 1.16)
        : clampNumber(rawDtFrames, 0.72, 1.5);
      const motionBlendPrev = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
      const motionBlendFollow = speaking
        ? (1 - Math.pow(1 - 0.42, dtFrames))
        : (1 - Math.pow(1 - 0.18, dtFrames));
      const motionBlend = clampNumber(
        motionBlendPrev + ((speaking ? 1 : 0) - motionBlendPrev) * motionBlendFollow,
        0,
        1
      );
      state.speechMotionBlend = motionBlend;
      const smoothMotionOutput = (name, target, opts = {}) => {
        const key = `motion_smooth_${name}`;
        let prev = Number(state[key]);
        if (!Number.isFinite(prev)) {
          prev = Number(target) || 0;
        }
        const rise = clampNumber(
          Number.isFinite(Number(opts.rise)) ? Number(opts.rise) : 0.22,
          0.01,
          0.98
        );
        const fall = clampNumber(
          Number.isFinite(Number(opts.fall)) ? Number(opts.fall) : 0.16,
          0.01,
          0.98
        );
        const maxStep = Math.max(
          0.001,
          Number.isFinite(Number(opts.maxStep)) ? Number(opts.maxStep) : 999
        );
        const follow = target > prev
          ? (1 - Math.pow(1 - rise, dtFrames))
          : (1 - Math.pow(1 - fall, dtFrames));
        let next = prev + (target - prev) * follow;
        const maxDelta = maxStep * dtFrames;
        next = prev + clampNumber(next - prev, -maxDelta, maxDelta);
        state[key] = next;
        return next;
      };
      const speechMotionStrength = clampNumber(Number(state.speechMotionStrength) || 1.48, 0.6, 2.2);
      const speechMotionBoost = 0.82 + speechMotionStrength * 0.28;
      const mouthEnergy = speaking ? clampNumber(Number(state.speechMouthOpen) || 0, 0, 1) : 0;
      const audioEnergy = clampNumber(
        Math.max(Number(state.ttsAudioLevel) || 0, mouthEnergy * 0.56),
        0,
        1
      );
      const priorBeat = clampNumber(Number(state.beatImpulse) || 0, 0, 1);
      const energyInput = motionBlend > 0.02
        ? Math.max(audioEnergy, (0.16 + priorBeat * 0.24 * motionBlend) * speechMotionBoost)
        : audioEnergy;
      const currentBodyEnergy = Number(state.speechBodyEnergy) || 0;
      const energyAttack = 1 - Math.pow(1 - 0.24, dtFrames);
      const energyRelease = 1 - Math.pow(1 - 0.07, dtFrames);
      const energyFollow = energyInput > currentBodyEnergy ? energyAttack : energyRelease;
      state.speechBodyEnergy = clampNumber(
        currentBodyEnergy + (energyInput - currentBodyEnergy) * energyFollow,
        0, 1
      );
      const rawLevel = clampNumber(Number(state.ttsAudioLevel) || 0, 0, 1);
      const prevLevel = Number(state.beatPrevLevel) || 0;
      const dLevel = rawLevel - prevLevel;
      const risingLevel = Math.max(0, dLevel);
      const fallingLevel = Math.max(0, -dLevel);
      const beatVelocity = risingLevel + fallingLevel * 0.28;
      const beatThreshold = 0.08;
      state.beatPrevLevel = rawLevel;
      const beatSoftCap = 0.32 + motionBlend * 0.5;
      if (motionBlend > 0.06 && rawLevel > beatThreshold && beatVelocity > 0.01 && risingLevel > 0.002 && now > Number(state.beatCooldownUntil || 0)) {
        const impulseStrength = clampNumber((beatVelocity - 0.01) / 0.085, 0.05, 0.68);
        const slopeGain = 0.78 + clampNumber(risingLevel * 18, 0, 0.26);
        const currentImpulse = Number(state.beatImpulse) || 0;
        const softened = impulseStrength * 0.58 * slopeGain * (1 - currentImpulse * 0.42);
        state.beatImpulse = clampNumber(currentImpulse + softened, 0, beatSoftCap);
        state.beatCooldownUntil = now + 126;
      }
      const beatDecay = Math.pow(0.74 + motionBlend * 0.14, dtFrames);
      state.beatImpulse = clampNumber((Number(state.beatImpulse) || 0) * beatDecay, 0, beatSoftCap);
      if (motionBlend < 0.02) state.beatImpulse = 0;
      const beatSmoothFollow = motionBlend > 0.05
        ? (1 - Math.pow(1 - 0.34, dtFrames))
        : (1 - Math.pow(1 - 0.22, dtFrames));
      const beatSmoothPrev = Number(state.beatNodSmoothed) || 0;
      state.beatNodSmoothed = clampNumber(
        beatSmoothPrev + ((Number(state.beatImpulse) || 0) - beatSmoothPrev) * beatSmoothFollow,
        0,
        beatSoftCap
      );
      const beatNodRaw = Number(state.beatNodSmoothed) || 0;
      const beatNod = smoothMotionOutput("beat_nod", beatNodRaw, {
        rise: 0.24,
        fall: 0.21,
        maxStep: 0.055
      });
      const bodyEnergyRaw = state.speechBodyEnergy * motionBlend;
      const bodyEnergy = smoothMotionOutput("body_energy", bodyEnergyRaw, {
        rise: 0.22,
        fall: 0.14,
        maxStep: 0.08
      });
      const wasSpeaking = !!state.speechPhaseWasSpeaking;
      state.speechPhaseWasSpeaking = speaking;

      if (!wasSpeaking && speaking) {
        state.speechPhase = "attack";
        state.speechPhaseEnteredAt = now;
      } else if (wasSpeaking && !speaking && state.speechPhase !== "idle") {
        state.speechPhase = "release";
        state.speechPhaseEnteredAt = now;
      } else if (state.speechPhase === "attack" && now - Number(state.speechPhaseEnteredAt) > 300) {
        state.speechPhase = "sustain";
        state.speechPhaseEnteredAt = now;
      } else if (state.speechPhase === "release" && now - Number(state.speechPhaseEnteredAt) > 600) {
        state.speechPhase = "idle";
        state.speechPhaseEnteredAt = 0;
      } else if (!speaking && state.speechPhase === "idle") {
      }

      const phase = state.speechPhase || "idle";
      const phaseAge = now - Number(state.speechPhaseEnteredAt || now);
      const energyBoost = 1.0 + motionBlend * (0.12 + bodyEnergy * 1.2);
      const moodBlend = getSmoothedMoodExpression(now);
      const happyBlend = moodBlend.happy;
      const sadBlend = moodBlend.sad;
      const angryBlend = moodBlend.angry;
      const surprisedBlend = moodBlend.surprised;
      const moodGain = 0.85 + motionBlend * 0.15;
      const blinkLength = 150 - motionBlend * 40;
      if (now >= state.microNextBlinkAt) {
        state.microBlinkUntil = now + blinkLength;
        state.microNextBlinkAt = now + 1800 + Math.random() * 3400;
      }
      let blink = 0;
      if (now < Number(state.microBlinkUntil || 0)) {
        const remain = Math.max(0, Number(state.microBlinkUntil || 0) - now);
        const phase = 1 - remain / blinkLength;
        blink = Math.sin(Math.min(1, phase) * Math.PI);
      }
      if (now >= state.microNextGazeAt) {
        const styleBias = style === "playful" ? 0.34 : (style === "steady" ? 0.16 : 0.24);
        state.microGazeTargetX = clampNumber((Math.random() * 2 - 1) * styleBias, -0.35, 0.35);
        state.microGazeTargetY = clampNumber((Math.random() * 2 - 1) * styleBias * 0.7, -0.22, 0.22);
        state.microNextGazeAt = now + 1200 + Math.random() * 2400;
      }
      state.microGazeCurrentX += (state.microGazeTargetX - state.microGazeCurrentX) * 0.03;
      state.microGazeCurrentY += (state.microGazeTargetY - state.microGazeCurrentY) * 0.03;
      state.mouseGazeCurrentX += (state.mouseGazeTargetX - state.mouseGazeCurrentX) * 0.06;
      state.mouseGazeCurrentY += (state.mouseGazeTargetY - state.mouseGazeCurrentY) * 0.06;
      const mouseWeight = state.uiView === "model" ? 0.65 : 0;
      const saccadeWeight = 1 - mouseWeight;
      const finalGazeX = state.mouseGazeCurrentX * mouseWeight + state.microGazeCurrentX * saccadeWeight;
      const finalGazeY = state.mouseGazeCurrentY * mouseWeight + state.microGazeCurrentY * saccadeWeight;
      const breath = Math.sin(now / 1050 + state.microBreathSeed) * 0.5 + 0.5;
      const sway = Math.sin(now / 860 + state.microBreathSeed * 0.7);
      const ribbon = Math.sin(now / 930 + state.microBreathSeed * 1.3);
      const hair = Math.sin(now / 780 + state.microBreathSeed * 1.9);
      const breathGain = 0.46 - motionBlend * 0.22;
      const styleGain = style === "comfort" ? 1.08 : (style === "playful" ? 1.15 : 1);
      const breathShift = (breath - 0.5) * breathGain * styleGain;
      const bodySwayGain = 0.96 + motionBlend * (0.79 + bodyEnergy * 2.2) * speechMotionBoost;
      const bodySway = sway * 0.22 * bodySwayGain;
      let hairAhogeTarget = hair * (0.18 + audioEnergy * 0.18) + breath * 0.12;
      const hairFrontTarget = hair * 0.12;
      const hairBackTarget = -hair * 0.1;
      let ribbonTarget = ribbon * (0.1 + bodyEnergy * 0.08);
      const skirtTarget = -sway * 0.08;
      const skirt2Target = sway * 0.06;
      if (motionBlend > 0.04 && bodyEnergy > 0.02) {
        const e = bodyEnergy * speechMotionBoost;
        hairAhogeTarget += e * 0.3;
        ribbonTarget += e * 0.2;
      }
      const springK = clampNumber(
        0.068 + motionBlend * 0.04 + bodyEnergy * 0.055 + beatNod * 0.03,
        0.068,
        0.19
      );
      const springDamping = 0.88 - motionBlend * 0.06;
      const springStep = clampNumber(dtFrames, 0.82, 1.25);
      const springSubsteps = Math.max(
        2,
        Math.min(6, Math.round((1 + motionBlend * 2.5) * springStep))
      );
      const springStepEach = springStep / springSubsteps;
      const springTargetFollow = 1 - Math.pow(1 - (0.22 + motionBlend * 0.3), springStep);
      const applySpring = (name, target) => {
        const velKey = `spring_${name}_vel`;
        const posKey = `spring_${name}_pos`;
        const targetKey = `spring_${name}_target`;
        let vel = Number(state[velKey]) || 0;
        let pos = Number(state[posKey]) || 0;
        let smoothedTarget = Number(state[targetKey]);
        if (!Number.isFinite(smoothedTarget)) {
          smoothedTarget = target;
        }
        smoothedTarget += (target - smoothedTarget) * springTargetFollow;
        for (let i = 0; i < springSubsteps; i += 1) {
          vel += (smoothedTarget - pos) * springK * springStepEach;
          vel *= Math.pow(springDamping, springStepEach);
          vel = clampNumber(vel, -1.9, 1.9);
          pos += vel * springStepEach;
          pos = clampNumber(pos, -1, 1);
        }
        state[targetKey] = smoothedTarget;
        state[velKey] = vel;
        state[posKey] = pos;
        return pos;
      };
      const hairAhogeSpring = applySpring("hairAhoge", hairAhogeTarget);
      const hairFrontSpring = applySpring("hairFront", hairFrontTarget);
      const hairBackSpring = applySpring("hairBack", hairBackTarget);
      const ribbonSpring = applySpring("ribbon", ribbonTarget);
      const skirtSpring = applySpring("skirt", skirtTarget);
      const skirt2Spring = applySpring("skirt2", skirt2Target);
      const bodyTarget = clampNumber(
        bodySway * (0.92 + motionBlend * 0.6) + beatNod * (0.12 + motionBlend * 0.24) + breathShift * motionBlend * 0.14,
        -1,
        1
      );
      const bodySpring = applySpring("body", bodyTarget);
      const torsoTarget = clampNumber(
        bodySway * (0.9 + motionBlend * 0.76) + beatNod * (0.16 + motionBlend * 0.28) + breathShift * (0.12 + motionBlend * 0.26),
        -1,
        1
      );
      const torsoSpring = applySpring("torso", torsoTarget);
      const headTarget = clampNumber(
        bodySway * 0.46 + beatNod * 0.24 - torsoSpring * 0.33 - finalGazeX * 0.2,
        -1,
        1
      );
      const headSpring = applySpring("head", headTarget);
      const springRenderFollow = 1 - Math.pow(1 - (0.22 + motionBlend * 0.2), dtFrames);
      state.spring_body_render += (bodySpring - Number(state.spring_body_render || 0)) * springRenderFollow;
      state.spring_torso_render += (torsoSpring - Number(state.spring_torso_render || 0)) * springRenderFollow;
      state.spring_head_render += (headSpring - Number(state.spring_head_render || 0)) * springRenderFollow;
      const bodySpringOut = Number(state.spring_body_render) || 0;
      const torsoSpringOut = Number(state.spring_torso_render) || 0;
      const headSpringOut = Number(state.spring_head_render) || 0;
      const upperSpeechEnvelopeTarget = speaking
        ? motionBlend * (0.74 + bodyEnergy * 0.7) * speechMotionBoost
        : 0;
      const upperSpeechEnvelope = smoothMotionOutput("speech_upper_envelope", upperSpeechEnvelopeTarget, {
        rise: 0.14,
        fall: 0.11,
        maxStep: 0.055
      });
      const upperSpeechEnvelopeOut = smoothMotionOutput("speech_upper_envelope_out", upperSpeechEnvelope, {
        rise: 0.12,
        fall: 0.1,
        maxStep: 0.045
      });
      const upperSpeechGain = speaking
        ? (1 + upperSpeechEnvelopeOut * (0.34 + bodyEnergy * 0.4))
        : 1;
      const upperShoulderGain = speaking
        ? (1 + upperSpeechEnvelopeOut * (0.46 + bodyEnergy * 0.5))
        : 1;
      const angleYSpeechTarget = (-finalGazeY * 4.4)
        + breathShift * (1.4 * upperSpeechGain)
        + (speaking ? (torsoSpringOut * 0.52 + beatNod * (0.62 + upperSpeechEnvelopeOut * 0.72)) : 0);
      const angleYBase = smoothMotionOutput("param_angle_y_base", angleYSpeechTarget, {
        rise: 0.22,
        fall: 0.2,
        maxStep: 0.72
      });
      const angleZSpeechTarget = sway * 1.2 * energyBoost * (0.9 + motionBlend * 0.35)
        + headSpringOut * (2.2 + motionBlend * 1.1)
        + (speaking ? beatNod * (0.82 + upperSpeechEnvelopeOut * 2.1) : 0);
      const angleZBase = smoothMotionOutput("param_angle_z_base", angleZSpeechTarget, {
        rise: 0.2,
        fall: 0.19,
        maxStep: 0.82
      });
      const bodyTalkGain = 1 + motionBlend * (0.32 + bodyEnergy * 0.48) * speechMotionBoost;
      const bodyXBase = smoothMotionOutput("param_body_x_base", finalGazeX * 2.2 + breathShift * 1.1 + torsoSpringOut * 1.08 * bodyTalkGain, {
        rise: 0.24,
        fall: 0.21,
        maxStep: 0.72
      });
      const bodyYBase = smoothMotionOutput("param_body_y_base", breathShift * 0.86 + torsoSpringOut * 1.28 * bodyTalkGain, {
        rise: 0.22,
        fall: 0.2,
        maxStep: 0.82
      });
      const bodyZBase = smoothMotionOutput("param_body_z_base", bodySpringOut * 9.6 * bodyTalkGain + torsoSpringOut * 3.5 * (1 + motionBlend * 0.3), {
        rise: 0.21,
        fall: 0.2,
        maxStep: 1.45
      });
      const shoulderSpeechPulse = speaking
        ? (Math.sin(now / 188 + state.microBreathSeed * 0.9) * 0.5 + 0.5) * upperSpeechEnvelopeOut * (0.12 + bodyEnergy * 0.28)
        : 0;
      const shoulderBaseTarget = 0.08
        + breath * (speaking ? (0.2 + audioEnergy * 0.28) * upperShoulderGain : 0.18)
        + shoulderSpeechPulse;
      const shoulderBase = smoothMotionOutput("param_shoulder_base", shoulderBaseTarget, {
        rise: 0.17,
        fall: 0.15,
        maxStep: 0.1
      });
      const upperTalkWave = speaking
        ? Math.sin(now / 192 + state.microBreathSeed * 1.1) * upperSpeechEnvelopeOut * (0.32 + bodyEnergy * 0.68)
        : 0;
      const upperTalkWaveSmoothed = smoothMotionOutput("param_upper_talk_wave", upperTalkWave, {
        rise: 0.17,
        fall: 0.15,
        maxStep: 0.09
      });
      const upperShoulderLift = smoothMotionOutput(
        "param_upper_shoulder_lift",
        speaking ? Math.abs(upperTalkWaveSmoothed) * (0.24 + motionBlend * 0.34) : 0,
        {
          rise: 0.18,
          fall: 0.16,
          maxStep: 0.06
        }
      );
      const upperTalkWaveOut = smoothMotionOutput("param_upper_talk_wave_out", upperTalkWaveSmoothed, {
        rise: 0.16,
        fall: 0.14,
        maxStep: 0.07
      });
      const upperShoulderLiftOut = smoothMotionOutput("param_upper_shoulder_lift_out", upperShoulderLift, {
        rise: 0.16,
        fall: 0.14,
        maxStep: 0.05
      });
      safeAddParamValue(core, "ParamEyeLOpen", -blink * 0.82, 0.96);
      safeAddParamValue(core, "ParamEyeROpen", -blink * 0.82, 0.96);
      safeAddParamValue(core, "ParamEyeBallX", finalGazeX, 0.45);
      safeAddParamValue(core, "ParamEyeBallY", finalGazeY, 0.45);
      safeAddParamValue(core, "ParamAngleX", finalGazeX * 5.8, 0.18);
      safeAddParamValue(core, "ParamAngleY", angleYBase, 0.18);
      safeAddParamValue(core, "ParamAngleZ", angleZBase, 0.12);
      safeAddParamValue(core, "ParamBodyAngleX", bodyXBase, 0.13);
      safeAddParamValue(core, "ParamBodyAngleY", bodyYBase, 0.13);
      safeAddParamValue(core, "ParamBodyAngleZ", bodyZBase, 0.64);
      safeAddParamValue(core, "ParamBreath", 0.22 + breath * 0.42, 0.2);
      safeAddParamValue(core, "ParamShoulder", shoulderBase, 0.14);
      if (speaking && upperSpeechEnvelopeOut > 0.04) {
        safeAddParamValue(core, "ParamAngleY", upperTalkWaveOut * 1.9, 0.36);
        safeAddParamValue(core, "ParamAngleZ", upperTalkWaveOut * 0.95, 0.3);
        safeAddParamValue(core, "ParamShoulder", upperShoulderLiftOut, 0.46);
      }
      safeAddParamValue(core, "ParamHairAhoge", hairAhogeSpring, 0.16);
      safeAddParamValue(core, "ParamHairFront", hairFrontSpring, 0.12);
      safeAddParamValue(core, "ParamHairBack", hairBackSpring, 0.1);
      safeAddParamValue(core, "ParamRibbon", ribbonSpring, 0.1);
      safeAddParamValue(core, "ParamSkirt", skirtSpring, 0.08);
      safeAddParamValue(core, "ParamSkirt2", skirt2Spring, 0.08);
      if (motionBlend > 0.06 && bodyEnergy > 0.02) {
        const e = bodyEnergy;
        const eShaped = Math.tanh(e * 1.45) / Math.tanh(1.45);
        const yBounceRaw = (Math.sin(now / 118 + state.microBreathSeed * 0.6) * 0.5 + 0.5) * eShaped;
        const yBounce = smoothMotionOutput("speech_y_bounce", yBounceRaw, {
          rise: 0.2,
          fall: 0.18,
          maxStep: 0.085
        });
        const motionGain = clampNumber(
          upperSpeechEnvelopeOut * (0.58 + upperSpeechEnvelopeOut * 0.52) * speechMotionBoost,
          0,
          1.55
        );
        const bodyZEnergyAdd = smoothMotionOutput("param_body_z_energy_add", eShaped * 17.6 * motionGain, {
          rise: 0.18,
          fall: 0.16,
          maxStep: 1.22
        });
        const bodyXEnergyAdd = smoothMotionOutput("param_body_x_energy_add", eShaped * 1.46 * motionGain, {
          rise: 0.2,
          fall: 0.17,
          maxStep: 0.2
        });
        const angleZEnergyAdd = smoothMotionOutput("param_angle_z_energy_add", (eShaped * 9.4 + headSpringOut * 1.9) * motionGain, {
          rise: 0.18,
          fall: 0.16,
          maxStep: 0.86
        });
        const angleYEnergyAdd = smoothMotionOutput("param_angle_y_energy_add", (-eShaped * 1.7 + yBounce * 2.7) * motionGain, {
          rise: 0.2,
          fall: 0.17,
          maxStep: 0.52
        });
        const bodyYEnergyAdd = smoothMotionOutput("param_body_y_energy_add", (yBounce * 5.6 + torsoSpringOut * 2.3) * motionGain, {
          rise: 0.19,
          fall: 0.17,
          maxStep: 0.74
        });
        const shoulderEnergyAdd = smoothMotionOutput("param_shoulder_energy_add", e * 0.46 * motionGain, {
          rise: 0.19,
          fall: 0.16,
          maxStep: 0.08
        });
        safeAddParamValue(core, "ParamBodyAngleZ", bodyZEnergyAdd, 0.84);
        safeAddParamValue(core, "ParamBodyAngleX", bodyXEnergyAdd, 0.5);
        safeAddParamValue(core, "ParamAngleZ", angleZEnergyAdd, 0.64);
        safeAddParamValue(core, "ParamAngleY", angleYEnergyAdd, 0.4);
        safeAddParamValue(core, "ParamBodyAngleY", bodyYEnergyAdd, 0.6);
        safeAddParamValue(core, "ParamShoulder", shoulderEnergyAdd, 0.52);
        if (beatNod > 0.02) {
          const beatAngleYAdd = smoothMotionOutput("param_angle_y_beat_add", beatNod * 4.1 * motionGain, {
            rise: 0.22,
            fall: 0.2,
            maxStep: 0.42
          });
          const beatBodyYAdd = smoothMotionOutput("param_body_y_beat_add", beatNod * 2.8 * motionGain, {
            rise: 0.2,
            fall: 0.18,
            maxStep: 0.46
          });
          const beatShoulderAdd = smoothMotionOutput(
            "param_shoulder_beat_add",
            beatNod * 0.42 * motionGain * (1 + motionBlend * 0.8),
            {
              rise: 0.22,
              fall: 0.2,
              maxStep: 0.06
            }
          );
          safeAddParamValue(core, "ParamAngleY", beatAngleYAdd, 0.52);
          safeAddParamValue(core, "ParamBodyAngleY", beatBodyYAdd, 0.54);
          safeAddParamValue(core, "ParamShoulder", beatShoulderAdd, 0.5);
        }
      }

      if (phase === "attack") {
        const t = clampNumber(phaseAge / 300, 0, 1);
        const attackCurve = Math.sin(t * Math.PI);
        const a = attackCurve * 0.8;
        safeAddParamValue(core, "ParamBodyAngleY", a * 2.2, 0.5);
        safeAddParamValue(core, "ParamAngleY", -a * 1.8, 0.45);
        safeAddParamValue(core, "ParamShoulder", a * 0.15, 0.4);
      }

      if (phase === "release") {
        const t = clampNumber(1 - phaseAge / 600, 0, 1);
        const r = t * 0.5;
        safeAddParamValue(core, "ParamBodyAngleY", r * 1.2, 0.4);
        safeAddParamValue(core, "ParamAngleY", -r * 0.8, 0.35);
      }
      if (happyBlend > 0.001) {
        const g = happyBlend * moodGain;
        safeAddParamValue(core, "ParamCheek", (0.12 + breath * 0.05) * g, 0.42);
        safeAddParamValue(core, "ParamBrowLForm", 0.18 * g, 0.42);
        safeAddParamValue(core, "ParamBrowRForm", 0.18 * g, 0.42);
        safeAddParamValue(core, "ParamAngleX", 1.2 * g, 0.28);
      }
      if (sadBlend > 0.001) {
        const g = sadBlend * moodGain;
        safeAddParamValue(core, "ParamAngleY", 0.32 * g, 0.36);
        safeAddParamValue(core, "ParamShoulder", -0.18 * g, 0.3);
        safeAddParamValue(core, "ParamBrowLX", -0.08 * g, 0.32);
        safeAddParamValue(core, "ParamBrowRX", 0.08 * g, 0.32);
        safeAddParamValue(core, "ParamBrowLForm", -0.22 * g, 0.36);
        safeAddParamValue(core, "ParamBrowRForm", -0.22 * g, 0.36);
        safeAddParamValue(core, "ParamBodyAngleX", -0.24 * g, 0.28);
      }
      if (angryBlend > 0.001) {
        const g = angryBlend * moodGain;
        safeAddParamValue(core, "ParamBrowLY", -0.22 * g, 0.44);
        safeAddParamValue(core, "ParamBrowRY", -0.22 * g, 0.44);
        safeAddParamValue(core, "ParamBrowLAngle", -0.16 * g, 0.4);
        safeAddParamValue(core, "ParamBrowRAngle", 0.16 * g, 0.4);
        safeAddParamValue(core, "ParamEyeLOpen", 0.08 * g, 0.3);
        safeAddParamValue(core, "ParamEyeROpen", 0.08 * g, 0.3);
        safeAddParamValue(core, "ParamBodyAngleZ", Math.sin(now / 120) * 4 * g, 0.3);
      }
      if (surprisedBlend > 0.001) {
        const g = surprisedBlend * moodGain;
        safeAddParamValue(core, "ParamHairAhoge", 0.32 * g, 0.34);
        safeAddParamValue(core, "ParamEyeLOpen", 0.24 * g, 0.42);
        safeAddParamValue(core, "ParamEyeROpen", 0.24 * g, 0.42);
        safeAddParamValue(core, "ParamBrowLY", 0.22 * g, 0.4);
        safeAddParamValue(core, "ParamBrowRY", 0.22 * g, 0.4);
        safeAddParamValue(core, "ParamAngleY", -0.22 * g, 0.28);
      }
      if (style === "comfort") {
        safeAddParamValue(core, "ParamHandL", 0.06 + breath * 0.04, 0.1);
        safeAddParamValue(core, "ParamHandR", -0.05 - breath * 0.03, 0.1);
        safeAddParamValue(core, "ParamArmLB", 0.08, 0.08);
        safeAddParamValue(core, "ParamArmRB", -0.06, 0.08);
      } else if (style === "playful") {
        safeAddParamValue(core, "ParamHandL", 0.08 + sway * 0.06, 0.11);
        safeAddParamValue(core, "ParamHandR", 0.08 - sway * 0.06, 0.11);
        safeAddParamValue(core, "ParamArmLA", sway * 0.14, 0.08);
        safeAddParamValue(core, "ParamArmRA", -sway * 0.14, 0.08);
      } else if (style === "steady") {
        safeAddParamValue(core, "ParamShoulder", breath * 0.1, 0.12);
        safeAddParamValue(core, "ParamArmLA", -0.04, 0.08);
        safeAddParamValue(core, "ParamArmRA", 0.04, 0.08);
      }
    }

    function getSpeechAnimationMouthOpen() {
      const now = performance.now();
      const audioPlaying = isSpeakingNow();
      const speaking = isSpeechMotionActive(now);
      const activeUntil = Number(state.speechAnimUntil || 0);
      if (!speaking) {
        const closeSpeed = now >= activeUntil ? 0.74 : 0.48;
        state.speechMouthOpen += (0 - state.speechMouthOpen) * closeSpeed;
        if (Math.abs(state.speechMouthOpen) < 0.003) {
          state.speechMouthOpen = 0;
        }
        return state.speechMouthOpen;
      }
      const liveLevel = sampleTTSAudioLevel();
      const hasLiveAudio = audioPlaying && !!state.ttsAudioAnalyser;
      const start = Number(state.speechAnimStartedAt || now);
      const duration = Math.max(260, Number(state.speechAnimDurationMs) || 1000);
      const progress = clampNumber((now - start) / duration, 0, 1.3);
      const style = normalizeTalkStyle(state.speechAnimStyle || state.currentTalkStyle || "neutral");
      const mood = String(state.speechAnimMood || "idle");
      const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
      const chars = Math.max(1, Number(state.speechAnimTextLength) || 8);
      const punct = Math.max(0, Number(state.speechAnimPunctuation) || 0);
      const accentCount = Math.max(0, Number(state.speechAnimAccentCount) || 0);
      const seed = Number(state.speechAnimSeed) || 0;
      const pace = style === "playful" ? 11.5 : (style === "comfort" ? 8.4 : 9.8);
      const waveA = Math.abs(Math.sin(progress * Math.PI * pace + seed));
      const waveB = Math.abs(Math.sin(progress * Math.PI * (pace * 0.53) + seed * 0.67));
      const pauseShape = 1 - Math.pow(Math.sin(clampNumber(progress, 0, 1) * Math.PI), 6) * 0.08;
      let energy = 0.24 + waveA * 0.64 + waveB * 0.28;
      energy *= pauseShape;
      if (mood === "happy" || mood === "surprised") {
        energy += 0.06;
      } else if (mood === "sad") {
        energy -= 0.04;
      }
      energy += Math.min(0.08, punct * 0.012) + Math.min(0.06, chars / 260);
      if (!speaking) {
        energy *= Math.max(0, 1 - clampNumber((now - activeUntil) / 220, 0, 1));
      }
      const syllableRate = style === "playful" ? 2.7 : (style === "steady" ? 3.8 : 3.2);
      const pseudoSyllables = Math.max(
        3,
        Math.min(26, Math.round(chars / syllableRate) + punct + accentCount * 2)
      );
      const durationSec = Math.max(0.24, duration / 1000);
      const syllablesPerSec = pseudoSyllables / durationSec;
      const fastSpeechFactor = clampNumber((syllablesPerSec - 4.8) / 4.2, 0, 1);
      const visemePhase = progress * pseudoSyllables;
      const visemeT = visemePhase - Math.floor(visemePhase);
      const visemeOpen = Math.pow(Math.sin(visemeT * Math.PI), style === "steady" ? 1.6 : 1.28);
      const visemeClosureRaw = Math.pow(Math.abs(Math.cos(visemeT * Math.PI)), 4.2) * (0.18 + punct * 0.01);
      const closureGate = clampNumber(
        visemeClosureRaw * (1.05 + fastSpeechFactor * 0.75),
        0,
        0.9
      );
      const accentSlots = Math.max(1, Math.min(6, punct + accentCount + 1));
      let accentPulse = 0;
      for (let i = 0; i < accentSlots; i += 1) {
        const center = (i + 0.5) / accentSlots + Math.sin(seed + i * 1.7) * 0.012;
        const width = i % 3 === 1 ? 0.1 : 0.075;
        const shape = Math.max(0, 1 - Math.abs(progress - center) / width);
        const accentGain = [1.12, 0.78, 1.0][i % 3];
        accentPulse = Math.max(accentPulse, shape * accentGain);
      }
      const visemeJitter = Math.sin(progress * Math.PI * (5.8 + punct * 0.35) + seed * 1.37) * 0.035;
      let target = clampNumber(
        energy * (0.46 + visemeOpen * 0.64)
          + accentPulse * 0.2
          - visemeClosureRaw * (0.88 + fastSpeechFactor * 0.34)
          + visemeJitter,
        0,
        1
      );
      if (speaking) {
        target *= (1 - closureGate * (0.22 + fastSpeechFactor * 0.18));
        const speakingFloor = 0.02 + motionBlend * (0.05 - fastSpeechFactor * 0.03);
        target = Math.max(target, speakingFloor);
      }
      if (hasLiveAudio) {
        const rawLevel = clampNumber(Number(state.ttsAudioRawLevel) || liveLevel || 0, 0, 1);
        const voiceRecent = now - Number(state.ttsAudioLastVoiceAt || 0) < 58;
        const voiced = rawLevel > 0.035 || liveLevel > 0.045 || voiceRecent;
        const closureDip = clampNumber(closureGate * (0.68 + fastSpeechFactor * 0.5), 0, 0.92);
        const rhythmGate = clampNumber(0.62 + visemeOpen * 0.48 - closureDip, 0.035, 1.06);
        const liveBase = voiced
          ? clampNumber(rawLevel * 1.48 + liveLevel * 0.42 + accentPulse * 0.02, 0, 1)
          : 0;
        const textHint = voiced ? clampNumber(target * (0.07 + visemeOpen * 0.08), 0, 0.1) : 0;
        target = clampNumber(liveBase * rhythmGate + textHint, 0, 1);
        if (voiced && closureGate > 0.28) {
          const closureCap = clampNumber(
            0.045 + liveLevel * 0.16 + rawLevel * 0.1 + (1 - fastSpeechFactor) * 0.035,
            0.045,
            0.24
          );
          target = Math.min(target, closureCap);
        }
        if (!voiced && liveLevel < 0.04) {
          target = 0;
        }
        const openSmooth = voiced ? clampNumber(0.78 - closureGate * 0.28, 0.46, 0.82) : 0.22;
        const closeSmooth = voiced
          ? clampNumber(0.86 + closureGate * 0.2 + fastSpeechFactor * 0.1, 0.84, 0.985)
          : 0.94;
        const smoothing = target > state.speechMouthOpen ? openSmooth : closeSmooth;
        state.speechMouthOpen += (target - state.speechMouthOpen) * smoothing;
        if (!voiced && state.speechMouthOpen < 0.012) {
          state.speechMouthOpen = 0;
        }
        return state.speechMouthOpen;
      }
      const openSmooth = clampNumber(0.64 - closureGate * 0.14, 0.45, 0.68);
      const closeSmooth = clampNumber(
        0.56 + closureGate * 0.18 + fastSpeechFactor * 0.1,
        0.42,
        0.82
      );
      const smoothing = target > state.speechMouthOpen ? openSmooth : closeSmooth;
      state.speechMouthOpen += (target - state.speechMouthOpen) * smoothing;
      return state.speechMouthOpen;
    }

    function applyStyleExpressionLayer() {
      if (!state.expressionEnabled || !state.model) {
        return;
      }
      const core = getCoreModel();
      if (!core) {
        return;
      }
      const style = normalizeTalkStyle(state.currentTalkStyle || state.expressionStyle || "neutral");
      const profile = getStyleExpressionProfile(style);
      const now = performance.now();
      const speaking = isSpeechMotionActive(now);
      const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
      const speakingQuiet = state.motionQuietDuringSpeech && speaking;
      const moodBlend = getSmoothedMoodExpression(now);
      const weightedMood = String(state.moodExpressionWeightMood || "idle");
      const runtimeMoodActive = now < Number(state.moodExpressionWeightUntil || 0)
        && weightedMood === String(state.moodExpressionRuntimeMood || "idle");
      const runtimeMoodWeight = runtimeMoodActive
        ? clampNumber(Number(state.moodExpressionWeight) || 1, 0.7, 1.45)
        : 1;
      const runtimeMoodBlend = runtimeMoodActive && weightedMood in moodBlend
        ? { ...moodBlend, [weightedMood]: Math.max(Number(moodBlend[weightedMood]) || 0, 1) }
        : moodBlend;
      const happyMoodScale = speakingQuiet ? (0.32 + (1 - motionBlend) * 0.2) : 1;
      const subtleMoodScale = speakingQuiet ? (0.16 + (1 - motionBlend) * 0.12) : 1;
      const happyBlend = clampNumber(runtimeMoodBlend.happy * (weightedMood === "happy" ? runtimeMoodWeight : 1), 0, 1.35) * happyMoodScale;
      const sadBlend = clampNumber(runtimeMoodBlend.sad * (weightedMood === "sad" ? runtimeMoodWeight : 1), 0, 1.35) * subtleMoodScale;
      const angryBlend = clampNumber(runtimeMoodBlend.angry * (weightedMood === "angry" ? runtimeMoodWeight : 1), 0, 1.35) * subtleMoodScale * (speakingQuiet ? 0.8 : 1);
      const surprisedBlend = clampNumber(runtimeMoodBlend.surprised * (weightedMood === "surprised" ? runtimeMoodWeight : 1), 0, 1.35) * subtleMoodScale * (speakingQuiet ? 0.75 : 1);
      const pulseActive = now < Number(state.expressionPulseUntil || 0);
      const pulseWeight = pulseActive ? state.expressionPulseBoost : 0;
      const strength = clampNumber(Number(state.expressionStrength) || 1, 0.2, 2.0);
      const speakGain = 0.36 + motionBlend * 0.64;
      const pulseGain = pulseActive
        ? (0.65 + pulseWeight * 0.28) * (speakingQuiet ? 0.34 : 1)
        : 0.0;
      const gain = strength * (speakGain + pulseGain);
      if (state.uiView === "model" && !speaking) {
        state.speechMouthOpen += (0 - (Number(state.speechMouthOpen) || 0)) * 0.46;
        if (Math.abs(Number(state.speechMouthOpen) || 0) < 0.003) {
          state.speechMouthOpen = 0;
        }
      }
      const mouthOpen = state.uiView === "model"
        ? Number(state.speechMouthOpen) || 0
        : getSpeechAnimationMouthOpen();

      const surpriseMouthBoost = surprisedBlend > 0.001
        ? (0.34 + 0.38 * motionBlend) * surprisedBlend * gain
        : 0;
      const sadMouthDip = sadBlend > 0.001
        ? 0.16 * sadBlend * gain
        : 0;
      const mouthCarry = 0.08 + motionBlend * 0.94;
      const mouthSpeakBoost = speaking ? (1.1 + motionBlend * 0.24) : 1.0;
      const mouthTarget = clampNumber(
        mouthOpen * mouthCarry * mouthSpeakBoost + surpriseMouthBoost - sadMouthDip,
        0,
        1
      );
      state.speechMouthTarget = mouthTarget;
      state.speechMouthUpdatedAt = now;

      safeAddParamValue(core, "ParamMouthForm", profile.mouthForm * gain, 0.9);
      safeDriveParamValue(core, "ParamMouthOpenY", mouthTarget, 0.84 + motionBlend * 0.14);
      safeAddParamValue(core, "ParamCheek", profile.cheek * gain, 0.9);
      safeAddParamValue(core, "ParamEyeLSmile", profile.eyeSmile * gain, 0.9);
      safeAddParamValue(core, "ParamEyeRSmile", profile.eyeSmile * gain, 0.9);
      safeAddParamValue(core, "ParamBrowLY", profile.browY * gain, 0.9);
      safeAddParamValue(core, "ParamBrowRY", profile.browY * gain, 0.9);
      safeAddParamValue(core, "ParamBrowLAngle", profile.browAngle * gain, 0.9);
      safeAddParamValue(core, "ParamBrowRAngle", -profile.browAngle * gain, 0.9);
      safeAddParamValue(core, "ParamAngleX", profile.headX * gain, 0.82);
      safeAddParamValue(core, "ParamAngleY", profile.headY * gain, 0.82);
      safeAddParamValue(core, "ParamBodyAngleX", profile.bodyX * gain, 0.76);
      if (happyBlend > 0.001) {
        const g = happyBlend * gain;
        safeAddParamValue(core, "ParamEyeLSmile", 0.4 * g, 0.85);
        safeAddParamValue(core, "ParamEyeRSmile", 0.4 * g, 0.85);
        safeAddParamValue(core, "ParamMouthForm", 0.5 * g, 0.85);
        safeAddParamValue(core, "ParamCheek", 0.4 * g, 0.8);
        safeAddParamValue(core, "ParamBrowLY", 0.15 * g, 0.7);
        safeAddParamValue(core, "ParamBrowRY", 0.15 * g, 0.7);
        safeAddParamValue(core, "ParamAngleX", 3.0 * g, 0.5);
      }
      if (sadBlend > 0.001) {
        const g = sadBlend * gain;
        safeAddParamValue(core, "ParamEyeLOpen", -0.34 * g, 0.85);
        safeAddParamValue(core, "ParamEyeROpen", -0.34 * g, 0.85);
        safeAddParamValue(core, "ParamBrowLY", -0.3 * g, 0.82);
        safeAddParamValue(core, "ParamBrowRY", -0.3 * g, 0.82);
        safeAddParamValue(core, "ParamBrowLForm", -0.32 * g, 0.76);
        safeAddParamValue(core, "ParamBrowRForm", -0.32 * g, 0.76);
        safeAddParamValue(core, "ParamBrowLAngle", 0.22 * g, 0.72);
        safeAddParamValue(core, "ParamBrowRAngle", -0.22 * g, 0.72);
        safeAddParamValue(core, "ParamMouthForm", -0.68 * g, 0.86);
        safeDriveParamValue(core, "ParamMouthOpenY", 0.02, 0.5);
        safeAddParamValue(core, "ParamAngleY", 4.8 * g, 0.54);
        safeAddParamValue(core, "ParamBodyAngleX", -3.4 * g, 0.42);
      }
      if (angryBlend > 0.001) {
        const g = angryBlend * gain;
        safeAddParamValue(core, "ParamBrowLY", -0.35 * g, 0.9);
        safeAddParamValue(core, "ParamBrowRY", -0.35 * g, 0.9);
        safeAddParamValue(core, "ParamBrowLAngle", -0.2 * g, 0.85);
        safeAddParamValue(core, "ParamBrowRAngle", 0.2 * g, 0.85);
        safeAddParamValue(core, "ParamEyeLOpen", 0.1 * g, 0.7);
        safeAddParamValue(core, "ParamEyeROpen", 0.1 * g, 0.7);
        safeAddParamValue(core, "ParamMouthForm", -0.35 * g, 0.85);
        safeAddParamValue(core, "ParamBodyAngleZ", Math.sin(now / 120) * 4 * g, 0.3);
      }
      if (surprisedBlend > 0.001) {
        const g = surprisedBlend * gain;
        safeAddParamValue(core, "ParamEyeLOpen", 0.55 * g, 0.92);
        safeAddParamValue(core, "ParamEyeROpen", 0.55 * g, 0.92);
        safeAddParamValue(core, "ParamBrowLY", 0.42 * g, 0.88);
        safeAddParamValue(core, "ParamBrowRY", 0.42 * g, 0.88);
        safeAddParamValue(core, "ParamBrowLForm", 0.26 * g, 0.72);
        safeAddParamValue(core, "ParamBrowRForm", 0.26 * g, 0.72);
        safeAddParamValue(core, "ParamMouthForm", -0.34 * g, 0.78);
        safeDriveParamValue(core, "ParamMouthOpenY", clampNumber(0.28 * g, 0, 0.55), 0.62);
        safeAddParamValue(core, "ParamAngleY", -3.8 * g, 0.52);
      }
    }

    return {
      normalizeMotionIntensity,
      getMotionIntensityPreset,
      getStyleExpressionProfile,
      detectModelProfileName,
      getActiveModelMotionProfile,
      getActiveModelCadence,
      getCoreModel,
      safeAddParamValue,
      safeSetParamValue,
      safeGetParamValue,
      safeDriveParamValue,
      triggerExpressionPulse,
      estimateSpeechAnimationDurationMs,
      beginSpeechAnimation,
      endSpeechAnimation,
      finishSpeechAnimation,
      ensureMicroMotionState,
      getSmoothedMoodExpression,
      ensureTTSAudioAnalyser,
      sampleTTSAudioLevel,
      updateMicroMotionLayer,
      getSpeechAnimationMouthOpen,
      applyStyleExpressionLayer
    };
  }

  const api = { createController };
  root.TaffyLive2DExpressionController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
