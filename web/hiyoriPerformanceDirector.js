(function (root) {
  "use strict";

  function createImplementation(mapping) {
  const mapped = mappingApi.resolve(mapping);
  const P = new Proxy(mapped.params, { get: (params, key) => params[key] || "" });
  const validIds = new Set(Object.values(mapped.params));

  const MODES = ["idle", "listen", "think", "speak"];
  const EMOTIONS = ["happy", "sad", "angry", "surprised", "thinking"];

  // Sentence-level delivery stays richer than the five legacy face moods.
  // These additive poses use existing Hiyori rig channels, never mouth-open
  // or eyelid channels owned by lip sync and blinking.
  const DELIVERY_POSES = mapped.poses(mapping.deliveryPoses);
  const DELIVERY_KEYS = Object.keys(DELIVERY_POSES);

  function normalizeDelivery(value) {
    const key = String(value || "").trim().toLowerCase();
    if (key === "think" || key === "curious") return "thinking";
    return DELIVERY_KEYS.includes(key) ? key : "neutral";
  }

  const SPEECH_GESTURE_POSES = mapped.poses(mapping.speechGesturePoses);
  const SPEECH_GESTURE_POOLS = {
    neutral: ["nod", "open_explain", "question_tilt"],
    happy: ["light_lift", "open_explain", "nod"],
    excited: ["light_lift", "open_explain", "nod"],
    playful: ["question_tilt", "light_lift", "open_explain"],
    thinking: ["question_tilt", "small_nod", "open_explain"],
    serious: ["open_explain", "nod"],
    surprised: ["question_tilt", "small_nod"],
    angry: ["nod", "open_explain"],
    sad: ["soft_lean", "small_nod"],
    hurt: ["soft_lean", "small_nod"],
    anxious: ["soft_lean", "small_nod"],
    shy: ["soft_lean", "small_nod"]
  };

  function createSpeechGestures() {
    return { active: null, history: [], restUntil: 0, lastRhythmCount: 0, count: 0 };
  }

  function sampleSpeechGesture(gestures, rhythm, delivery, now, active, blocked) {
    if (!active) {
      gestures.active = null;
      gestures.lastRhythmCount = 0;
      return 0;
    }
    if (gestures.active && (now >= gestures.active.endsAt || gestures.active.delivery !== delivery || blocked)) {
      gestures.active = null;
    }
    if (rhythm.count !== gestures.lastRhythmCount) {
      // Consume every detected rise, even while resting or an explicit motion
      // owns the model. Skipped emphasis must never play late in a quiet gap.
      gestures.lastRhythmCount = rhythm.count;
      if (!blocked && now >= gestures.restUntil) {
        const pool = SPEECH_GESTURE_POOLS[delivery] || SPEECH_GESTURE_POOLS.neutral;
        const recent = gestures.history.slice(-2);
        let choices = pool.filter((name) => !recent.includes(name));
        if (!choices.length) choices = pool.filter((name) => name !== recent.at(-1));
        if (!choices.length) choices = pool;
        const name = choices[0];
        const soft = ["sad", "hurt", "anxious", "shy"].includes(delivery);
        const bright = ["happy", "playful", "excited"].includes(delivery);
        gestures.active = { name, delivery, startedAt: rhythm.lastBeatAt, endsAt: rhythm.lastBeatAt + 620,
          strength: rhythm.strength * (soft ? 0.32 : (bright ? 1.2 : 0.85)) };
        gestures.restUntil = now + (soft ? 1900 : 1500);
        gestures.history.push(name);
        gestures.history = gestures.history.slice(-6);
        gestures.count += 1;
      }
    }
    const gesture = gestures.active;
    const phase = gesture ? (now - gesture.startedAt) / 620 : -1;
    return phase >= 0 && phase < 1
      ? Math.pow(Math.sin(Math.PI * phase), 2) * gesture.strength : 0;
  }

  function createSpeechRhythm() {
    return { fast: 0, floor: 0, armed: true, lastBeatAt: -Infinity, strength: 0, count: 0, hasSignal: false };
  }

  function sampleSpeechRhythm(rhythm, audio, now, elapsedMs, active) {
    if (!active) {
      Object.assign(rhythm, createSpeechRhythm());
      return 0;
    }
    if (elapsedMs > 0) {
      if (audio > 0.02) rhythm.hasSignal = true;
      const dt = Math.min(elapsedMs, 120);
      rhythm.fast += (audio - rhythm.fast) * (1 - Math.exp(-dt / 70));
      rhythm.floor += (audio - rhythm.floor) * (1 - Math.exp(-dt / 420));
      const rise = rhythm.fast - rhythm.floor;
      if (rise < 0.045 || rhythm.fast < 0.06) rhythm.armed = true;
      if (rhythm.armed && rhythm.fast > 0.16 && rise > 0.095 && now - rhythm.lastBeatAt >= 680) {
        rhythm.lastBeatAt = now;
        rhythm.strength = clamp(rise * 2.6, 0.25, 1);
        rhythm.armed = false;
        rhythm.count += 1;
      }
    }
    const phase = (now - rhythm.lastBeatAt) / 620;
    return phase >= 0 && phase < 1
      ? Math.pow(Math.sin(Math.PI * phase), 2) * rhythm.strength
      : 0;
  }

  const MODE_POSES = mapped.poses(mapping.modePoses);

  const EMOTION_POSES = mapped.poses(mapping.emotionPoses);

  const ACTION_SPECS = {
    nod: { durationMs: 1960, attackMs: 360, releaseMs: 520, priority: 3, cooldownMs: 520 },
    nod_double: { durationMs: 2440, attackMs: 380, releaseMs: 620, priority: 3, cooldownMs: 760 },
    shake: { durationMs: 2480, attackMs: 380, releaseMs: 620, priority: 3, cooldownMs: 650 },
    attentive_tilt: { durationMs: 2700, attackMs: 520, releaseMs: 720, priority: 2, cooldownMs: 920 },
    thoughtful_glance: { durationMs: 3100, attackMs: 620, releaseMs: 820, priority: 2, cooldownMs: 1050 },
    thought_resolve: { durationMs: 2380, attackMs: 440, releaseMs: 680, priority: 3, cooldownMs: 820 },
    lean_forward: { durationMs: 2180, attackMs: 440, releaseMs: 620, priority: 2, cooldownMs: 760 },
    lean_back: { durationMs: 2040, attackMs: 400, releaseMs: 600, priority: 2, cooldownMs: 760 },
    care_lean: { durationMs: 3200, attackMs: 640, releaseMs: 900, priority: 3, cooldownMs: 1180 },
    shy_glance: { durationMs: 3300, attackMs: 680, releaseMs: 920, priority: 2, cooldownMs: 1250 },
    speak_emphasis: { durationMs: 1900, attackMs: 340, releaseMs: 560, priority: 3, cooldownMs: 740 },
    sentence_release: { durationMs: 2800, attackMs: 560, releaseMs: 860, priority: 1, cooldownMs: 900 },
    happy_bounce: { durationMs: 2600, attackMs: 400, releaseMs: 680, priority: 4, cooldownMs: 900 }
  };

  const ACTION_ALIASES = {
    yes: "nod",
    agree: "nod",
    tiny_nod: "nod",
    ack_single: "nod",
    confirm: "nod",
    nod_twice: "nod_double",
    double_nod: "nod_double",
    ack_double: "nod_double",
    tiny_victory_nod: "nod_double",
    no: "shake",
    disagree: "shake",
    disagree_soft: "shake",
    head_shake: "shake",
    shake_head: "shake",
    listen_soft: "attentive_tilt",
    listen: "attentive_tilt",
    head_tilt: "attentive_tilt",
    curious_speech_start: "attentive_tilt",
    side_eye: "thoughtful_glance",
    think_enter: "thoughtful_glance",
    thoughtful: "thoughtful_glance",
    think: "thoughtful_glance",
    thinking: "thoughtful_glance",
    thinking_nod: "thought_resolve",
    think_resolve: "thought_resolve",
    task_snap: "thought_resolve",
    answer_first: "thought_resolve",
    forward: "lean_forward",
    approach: "lean_forward",
    emphasize: "lean_forward",
    care: "care_lean",
    comfort: "care_lean",
    eyes_down_soft: "care_lean",
    shy: "shy_glance",
    embarrassed_recovery: "shy_glance",
    speech_emphasis: "speak_emphasis",
    dry_speech_start: "speak_emphasis",
    steady_speech_start: "speak_emphasis",
    expressive_speech_start: "speak_emphasis",
    settle: "sentence_release",
    settle_idle: "sentence_release",
    closing_idle: "sentence_release",
    soft_idle: "sentence_release",
    soft_stillness: "sentence_release",
    deadpan_pause: "sentence_release",
    back: "lean_back",
    recoil: "lean_back",
    surprised: "lean_back",
    surprise: "lean_back",
    happy: "happy_bounce",
    happy_idle: "happy_bounce",
    celebrate: "happy_bounce",
    tiny_victory_nod: "happy_bounce",
    happy_pulse: "happy_bounce"
  };

  const IDLE_VARIANTS = [
    "soft_breath",
    "glance_left",
    "glance_right",
    "head_tilt_left",
    "head_tilt_right",
    "weight_shift",
    "shoulder_release",
    "tiny_bob"
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function smoothstep(value) {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function smootherstep(value) {
    const x = clamp(value, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function shiftedPhase(progress, delay = 0) {
    const d = clamp(delay, 0, 0.3);
    return smootherstep(clamp((clamp(progress, 0, 1) - d) / Math.max(0.001, 1 - d), 0, 1));
  }

  function staggeredEnvelope(progress, envelope, delay = 0, releaseLead = 0) {
    const raw = clamp(progress, 0, 1);
    const enter = smootherstep(clamp((raw - clamp(delay, 0, 0.16)) / 0.2, 0, 1));
    const leave = smootherstep(clamp((1 - raw - clamp(releaseLead, 0, 0.16)) / 0.22, 0, 1));
    return clamp(envelope, 0, 1) * enter * leave;
  }

  function gestureStroke(progress, cycles = 1) {
    const life = Math.sin(clamp(progress, 0, 1) * Math.PI);
    return Math.sin(clamp(progress, 0, 1) * Math.PI * 2 * cycles) * life * life;
  }

  function addPose(target, pose, gain = 1) {
    const g = Number(gain) || 0;
    if (!target || !pose || Math.abs(g) < 0.0001) {
      return target;
    }
    for (const [id, raw] of Object.entries(pose)) {
      if (!validIds.has(id)) continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        continue;
      }
      target[id] = (Number(target[id]) || 0) + value * g;
    }
    return target;
  }

  function channelResponseRate(id, mode = "idle") {
    const key = String(id || "");
    if (mapped.has("mouthOpen", key)) return 15;
    if (mapped.has("face", key)) return 12.5;
    if (mapped.has("head", key)) return mode === "speak" ? 10.8 : 9.4;
    if (mapped.has("torso", key)) return mode === "speak" ? 8.8 : 7.6;
    if (mapped.has("limb", key)) return 6.6;
    if (mapped.has("secondary", key)) return 6.2;
    return 8;
  }

  function smoothParameterChannels(director, targets, elapsedMs, mode = "idle") {
    if (!director.channelStates || typeof director.channelStates !== "object") {
      director.channelStates = {};
    }
    const dt = clamp((Number(elapsedMs) || 0) / 1000, 0, 0.12);
    const ids = new Set([
      ...Object.keys(director.channelStates),
      ...Object.keys(targets || {})
    ]);
    const output = {};
    for (const id of ids) {
      const target = Number(targets?.[id]) || 0;
      const previous = director.channelStates[id] || { value: 0, velocity: 0 };
      let value = Number(previous.value) || 0;
      let velocity = Number(previous.velocity) || 0;
      if (dt > 0) {
        // Exact critically-damped spring step for a constant target. Applying
        // it to the director's final additive channels gives every layer the
        // same inertial hand-off without frame-rate-dependent lerp stacking.
        const omega = channelResponseRate(id, mode);
        const offset = value - target;
        const helper = velocity + omega * offset;
        const decay = Math.exp(-omega * dt);
        value = target + (offset + helper * dt) * decay;
        velocity = (velocity - omega * helper * dt) * decay;
      }
      if (Math.abs(target) < 0.00001 && Math.abs(value) < 0.00008 && Math.abs(velocity) < 0.0008) {
        delete director.channelStates[id];
        continue;
      }
      director.channelStates[id] = { value, velocity };
      output[id] = value;
    }
    return output;
  }

  function normalizeMode(value) {
    const key = String(value || "idle").trim().toLowerCase();
    if (key === "listening" || key === "hearing") return "listen";
    if (key === "thinking" || key === "pending") return "think";
    if (key === "talk" || key === "talking" || key === "reply" || key === "speaking") return "speak";
    return MODES.includes(key) ? key : "idle";
  }

  function normalizeEmotion(value) {
    const key = String(value || "idle").trim().toLowerCase();
    if (key === "anxious" || key === "hurt") return "sad";
    if (key === "excited" || key === "shy" || key === "playful") return "happy";
    if (key === "serious") return "thinking";
    if (key === "think") return "thinking";
    return EMOTIONS.includes(key) ? key : "idle";
  }

  function normalizeAction(value) {
    const key = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (ACTION_SPECS[key]) return key;
    return ACTION_ALIASES[key] || "";
  }

  function actionEnvelope(spec, ageMs) {
    const duration = Math.max(1, Number(spec?.durationMs) || 1);
    const attack = Math.max(1, Math.min(duration, Number(spec?.attackMs) || 1));
    const release = Math.max(1, Math.min(duration, Number(spec?.releaseMs) || 1));
    if (ageMs < 0 || ageMs > duration) return 0;
    if (ageMs < attack) return smootherstep(ageMs / attack);
    if (ageMs > duration - release) return smootherstep((duration - ageMs) / release);
    return 1;
  }

  function sampleAction(name, progress, envelope) {
    // Cubism motions linger around readable key poses and leave their
    // boundaries with zero velocity. A quintic phase warp gives procedural
    // actions the same unhurried, spline-like timing.
    const raw = clamp(progress, 0, 1);
    const p = smootherstep(raw);
    const e = clamp(envelope, 0, 1);
    const pose = {};
    if (name === "nod") {
      const headStroke = gestureStroke(p, 1);
      const bodyStroke = gestureStroke(shiftedPhase(raw, 0.04), 1);
      const shoulderStroke = gestureStroke(shiftedPhase(raw, 0.065), 1);
      pose[P.angleY] = -7.0 * headStroke * staggeredEnvelope(raw, e, 0, 0.045);
      pose[P.bodyAngleY] = -1.75 * bodyStroke * staggeredEnvelope(raw, e, 0.04, 0);
      pose[P.shoulder] = 0.055 * Math.abs(shoulderStroke) * staggeredEnvelope(raw, e, 0.065, 0.015);
    } else if (name === "nod_double") {
      const headStroke = gestureStroke(p, 2);
      const bodyStroke = gestureStroke(shiftedPhase(raw, 0.055), 2);
      const shoulderStroke = gestureStroke(shiftedPhase(raw, 0.085), 2);
      pose[P.angleY] = -5.4 * headStroke * staggeredEnvelope(raw, e, 0, 0.055);
      pose[P.bodyAngleY] = -1.05 * bodyStroke * staggeredEnvelope(raw, e, 0.055, 0.01);
      pose[P.shoulder] = 0.045 * Math.abs(shoulderStroke) * staggeredEnvelope(raw, e, 0.085, 0.025);
    } else if (name === "shake") {
      const eyeStroke = gestureStroke(p, 2);
      const headStroke = gestureStroke(shiftedPhase(raw, 0.015), 2);
      const bodyStroke = gestureStroke(shiftedPhase(raw, 0.07), 2);
      pose[P.eyeBallX] = -0.1 * eyeStroke * staggeredEnvelope(raw, e, 0, 0.065);
      pose[P.angleX] = 7.6 * headStroke * staggeredEnvelope(raw, e, 0.015, 0.035);
      pose[P.angleZ] = 1.15 * headStroke * staggeredEnvelope(raw, e, 0.025, 0.025);
      pose[P.bodyAngleX] = 1.55 * bodyStroke * staggeredEnvelope(raw, e, 0.07, 0);
    } else if (name === "attentive_tilt") {
      const hold = staggeredEnvelope(raw, e, 0, 0);
      pose[P.eyeLOpen] = 0.055 * hold;
      pose[P.eyeROpen] = 0.055 * hold;
      pose[P.eyeBallX] = 0.075 * staggeredEnvelope(raw, e, 0.02, 0.02);
      pose[P.browLY] = 0.045 * staggeredEnvelope(raw, e, 0.035, 0.025);
      pose[P.browRY] = 0.045 * staggeredEnvelope(raw, e, 0.035, 0.025);
      pose[P.angleZ] = 2.45 * staggeredEnvelope(raw, e, 0.045, 0.035);
      pose[P.angleY] = -0.85 * staggeredEnvelope(raw, e, 0.075, 0.055);
      pose[P.bodyAngleX] = 0.72 * staggeredEnvelope(raw, e, 0.09, 0.035);
      pose[P.bodyAngleY] = 0.9 * staggeredEnvelope(raw, e, 0.11, 0.025);
      pose[P.shoulder] = 0.045 * staggeredEnvelope(raw, e, 0.12, 0.02);
    } else if (name === "thoughtful_glance") {
      const hold = staggeredEnvelope(raw, e, 0, 0);
      pose[P.eyeBallX] = -0.22 * hold;
      pose[P.eyeBallY] = 0.08 * staggeredEnvelope(raw, e, 0.015, 0.02);
      pose[P.browLY] = 0.075 * staggeredEnvelope(raw, e, 0.035, 0.03);
      pose[P.browRY] = -0.045 * staggeredEnvelope(raw, e, 0.035, 0.03);
      pose[P.mouthForm] = -0.055 * staggeredEnvelope(raw, e, 0.045, 0.025);
      pose[P.angleX] = -1.25 * staggeredEnvelope(raw, e, 0.055, 0.04);
      pose[P.angleY] = 0.75 * staggeredEnvelope(raw, e, 0.075, 0.045);
      pose[P.angleZ] = -1.7 * staggeredEnvelope(raw, e, 0.085, 0.035);
      pose[P.bodyAngleX] = -0.62 * staggeredEnvelope(raw, e, 0.115, 0.02);
      pose[P.armLA] = 0.22 * staggeredEnvelope(raw, e, 0.12, 0.015);
      pose[P.handL] = 0.12 * staggeredEnvelope(raw, e, 0.135, 0.01);
    } else if (name === "thought_resolve") {
      const lift = staggeredEnvelope(raw, e, 0, 0);
      const nodStroke = gestureStroke(shiftedPhase(raw, 0.12), 1);
      pose[P.eyeBallX] = 0.13 * lift;
      pose[P.eyeBallY] = -0.035 * lift;
      pose[P.browLY] = 0.055 * lift;
      pose[P.browRY] = 0.055 * lift;
      pose[P.mouthForm] = 0.075 * staggeredEnvelope(raw, e, 0.035, 0.02);
      pose[P.angleY] = -2.7 * nodStroke * staggeredEnvelope(raw, e, 0.12, 0.035);
      pose[P.angleZ] = 1.0 * staggeredEnvelope(raw, e, 0.055, 0.035);
      pose[P.bodyAngleY] = 1.1 * staggeredEnvelope(raw, e, 0.085, 0.02);
      pose[P.shoulder] = 0.05 * staggeredEnvelope(raw, e, 0.1, 0.015);
    } else if (name === "lean_forward") {
      pose[P.bodyAngleY] = 4.8 * staggeredEnvelope(raw, e, 0, 0);
      pose[P.bodyAngleX] = 1.15 * staggeredEnvelope(raw, e, 0.025, 0.01);
      pose[P.shoulder] = 0.12 * staggeredEnvelope(raw, e, 0.04, 0.025);
      pose[P.angleY] = -2.15 * staggeredEnvelope(raw, e, 0.065, 0.055);
    } else if (name === "lean_back") {
      pose[P.bodyAngleY] = -4.8 * staggeredEnvelope(raw, e, 0, 0);
      pose[P.bodyAngleX] = -1.05 * staggeredEnvelope(raw, e, 0.02, 0.01);
      pose[P.shoulder] = 0.1 * staggeredEnvelope(raw, e, 0.035, 0.025);
      pose[P.angleY] = 2.4 * staggeredEnvelope(raw, e, 0.06, 0.055);
      pose[P.eyeLOpen] = 0.08 * staggeredEnvelope(raw, e, 0.085, 0.075);
      pose[P.eyeROpen] = 0.08 * staggeredEnvelope(raw, e, 0.085, 0.075);
    } else if (name === "care_lean") {
      const hold = staggeredEnvelope(raw, e, 0, 0);
      pose[P.eyeLOpen] = -0.035 * hold;
      pose[P.eyeROpen] = -0.035 * hold;
      pose[P.browLY] = 0.065 * hold;
      pose[P.browRY] = 0.065 * hold;
      pose[P.mouthForm] = 0.065 * staggeredEnvelope(raw, e, 0.025, 0.02);
      pose[P.angleY] = 1.0 * staggeredEnvelope(raw, e, 0.035, 0.045);
      pose[P.angleZ] = -1.55 * staggeredEnvelope(raw, e, 0.045, 0.035);
      pose[P.bodyAngleY] = 2.65 * staggeredEnvelope(raw, e, 0.075, 0.02);
      pose[P.bodyAngleX] = -0.55 * staggeredEnvelope(raw, e, 0.095, 0.015);
      pose[P.shoulder] = -0.045 * staggeredEnvelope(raw, e, 0.11, 0.01);
    } else if (name === "shy_glance") {
      const hold = staggeredEnvelope(raw, e, 0, 0);
      pose[P.cheek] = 0.13 * hold;
      pose[P.eyeLOpen] = -0.075 * hold;
      pose[P.eyeROpen] = -0.075 * hold;
      pose[P.eyeBallX] = 0.18 * hold;
      pose[P.eyeBallY] = 0.1 * hold;
      pose[P.browLY] = 0.045 * hold;
      pose[P.browRY] = 0.045 * hold;
      pose[P.mouthForm] = 0.08 * hold;
      pose[P.angleX] = 1.25 * staggeredEnvelope(raw, e, 0.045, 0.04);
      pose[P.angleY] = 1.85 * staggeredEnvelope(raw, e, 0.055, 0.035);
      pose[P.angleZ] = 1.55 * staggeredEnvelope(raw, e, 0.075, 0.025);
      pose[P.bodyAngleX] = 0.65 * staggeredEnvelope(raw, e, 0.1, 0.015);
      pose[P.shoulder] = 0.035 * staggeredEnvelope(raw, e, 0.12, 0.01);
    } else if (name === "speak_emphasis") {
      const stroke = gestureStroke(p, 1);
      const torso = staggeredEnvelope(raw, e, 0, 0);
      pose[P.bodyAngleY] = 2.35 * torso;
      pose[P.bodyAngleX] = 0.65 * staggeredEnvelope(raw, e, 0.035, 0.02);
      pose[P.angleY] = -2.25 * stroke * staggeredEnvelope(raw, e, 0.075, 0.04);
      pose[P.angleZ] = 0.65 * stroke * staggeredEnvelope(raw, e, 0.085, 0.035);
      pose[P.shoulder] = 0.085 * staggeredEnvelope(raw, e, 0.055, 0.025);
      pose[P.armLA] = 0.16 * staggeredEnvelope(raw, e, 0.095, 0.015);
      pose[P.armRA] = -0.16 * staggeredEnvelope(raw, e, 0.095, 0.015);
    } else if (name === "sentence_release") {
      const release = staggeredEnvelope(raw, e, 0, 0);
      pose[P.eyeLOpen] = -0.035 * release;
      pose[P.eyeROpen] = -0.035 * release;
      pose[P.mouthForm] = 0.04 * release;
      pose[P.angleY] = 0.65 * staggeredEnvelope(raw, e, 0.035, 0.04);
      pose[P.angleZ] = -0.55 * staggeredEnvelope(raw, e, 0.055, 0.03);
      pose[P.bodyAngleY] = -0.8 * staggeredEnvelope(raw, e, 0.075, 0.02);
      pose[P.bodyAngleX] = -0.45 * staggeredEnvelope(raw, e, 0.085, 0.015);
      pose[P.shoulder] = -0.075 * staggeredEnvelope(raw, e, 0.1, 0.01);
      pose[P.breath] = 0.11 * staggeredEnvelope(raw, e, 0.115, 0);
    } else if (name === "happy_bounce") {
      const pulse = Math.sin(p * Math.PI * 2);
      const life = Math.sin(p * Math.PI);
      const bodyEnvelope = staggeredEnvelope(raw, e, 0, 0);
      const headPhase = shiftedPhase(raw, 0.04);
      const headPulse = Math.sin(headPhase * Math.PI * 2);
      const headLife = Math.sin(headPhase * Math.PI);
      const bounce = pulse * pulse * bodyEnvelope;
      const headBounce = headPulse * headPulse * staggeredEnvelope(raw, e, 0.04, 0.035);
      const side = Math.sin(p * Math.PI * 2) * life * life * bodyEnvelope;
      const headSide = Math.sin(headPhase * Math.PI * 2) * headLife * headLife
        * staggeredEnvelope(raw, e, 0.055, 0.045);
      pose[P.bodyAngleY] = 5.0 * bounce;
      pose[P.angleY] = -2.2 * headBounce;
      pose[P.bodyAngleZ] = 1.8 * side;
      pose[P.angleZ] = 1.2 * headSide;
      pose[P.shoulder] = 0.17 * pulse * pulse * staggeredEnvelope(raw, e, 0.025, 0.015);
      pose[P.eyeLSmile] = 0.16 * e;
      pose[P.eyeRSmile] = 0.16 * e;
      pose[P.mouthForm] = 0.18 * e;
      pose[P.hairAhoge] = 0.18 * headBounce;
    }
    return pose;
  }

  function sampleIdleVariant(name, progress, seed = 0) {
    const p = clamp(progress, 0, 1);
    const e = Math.sin(p * Math.PI);
    const wave = Math.sin(p * Math.PI * 2);
    const pose = {};
    if (name === "soft_breath") {
      pose[P.breath] = 0.18 * e;
      pose[P.shoulder] = 0.035 * e;
    } else if (name === "glance_left") {
      pose[P.eyeBallX] = -0.24 * e;
      pose[P.angleX] = -1.2 * e;
    } else if (name === "glance_right") {
      pose[P.eyeBallX] = 0.24 * e;
      pose[P.angleX] = 1.2 * e;
    } else if (name === "head_tilt_left") {
      pose[P.angleZ] = -1.7 * e;
      pose[P.bodyAngleX] = -0.35 * e;
    } else if (name === "head_tilt_right") {
      pose[P.angleZ] = 1.7 * e;
      pose[P.bodyAngleX] = 0.35 * e;
    } else if (name === "weight_shift") {
      pose[P.bodyAngleX] = 0.8 * wave;
      pose[P.bodyAngleZ] = 1.25 * wave;
      pose[P.shoulder] = 0.035 * wave;
    } else if (name === "shoulder_release") {
      pose[P.shoulder] = -0.07 * e;
      pose[P.bodyAngleY] = -0.55 * e;
      pose[P.angleY] = 0.35 * e;
    } else if (name === "tiny_bob") {
      const bob = Math.abs(Math.sin(p * Math.PI * 2 + seed * 0.01)) * e;
      pose[P.bodyAngleY] = 1.1 * bob;
      pose[P.angleY] = -0.65 * bob;
      pose[P.hairAhoge] = 0.08 * bob;
    }
    return pose;
  }

  function createController(deps = {}) {
    const state = deps.state || {};
    const perf = deps.performanceObject || root.performance || { now: () => Date.now() };
    const random = typeof deps.random === "function" ? deps.random : Math.random;

    function ensureState(now = perf.now()) {
      if (!state.hiyoriDirector || typeof state.hiyoriDirector !== "object") {
        state.hiyoriDirector = {
          lastAt: now,
          mode: "idle",
          requestedMode: "idle",
          requestedModeUntil: 0,
          requestedModeSource: "",
          modeWeights: { idle: 1, listen: 0, think: 0, speak: 0 },
          emotionWeights: { happy: 0, sad: 0, angry: 0, surprised: 0, thinking: 0 },
          action: null,
          outgoingAction: null,
          cooldowns: {},
          idleBag: [],
          idleActive: null,
          idleNextAt: now + 4200 + random() * 2800,
          idleHistory: [],
          seed: random() * 10000,
          speechDrive: 0,
          deliveryWeights: {},
          speechRhythm: createSpeechRhythm(),
          speechGestures: createSpeechGestures(),
          channelStates: {},
          rejectedActions: 0
        };
      }
      return state.hiyoriDirector;
    }

    function refillIdleBag(director) {
      const bag = IDLE_VARIANTS.slice();
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(clamp(random(), 0, 0.999999) * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      const previous = director.idleHistory[director.idleHistory.length - 1];
      if (bag.length > 1 && bag[0] === previous) {
        [bag[0], bag[1]] = [bag[1], bag[0]];
      }
      director.idleBag = bag;
    }

    function nextIdleVariant(director) {
      if (!director.idleBag.length) refillIdleBag(director);
      let next = director.idleBag.shift();
      const previous = director.idleHistory[director.idleHistory.length - 1];
      if (next === previous && director.idleBag.length) {
        director.idleBag.push(next);
        next = director.idleBag.shift();
      }
      director.idleHistory.push(next);
      director.idleHistory = director.idleHistory.slice(-12);
      return next;
    }

    function requestMode(mode, opts = {}) {
      const now = Number.isFinite(Number(opts.now)) ? Number(opts.now) : perf.now();
      const director = ensureState(now);
      director.requestedMode = normalizeMode(mode);
      director.requestedModeUntil = now + clamp(Number(opts.holdMs) || 0, 0, 12000);
      director.requestedModeSource = String(opts.source || "runtime");
      return director.requestedMode;
    }

    function triggerAction(action, opts = {}) {
      const name = normalizeAction(action);
      if (!name) return false;
      const now = Number.isFinite(Number(opts.now)) ? Number(opts.now) : perf.now();
      const director = ensureState(now);
      const spec = ACTION_SPECS[name];
      const priority = clamp(Number(opts.priority) || spec.priority, 1, 5);
      const cooldownUntil = Number(director.cooldowns[name] || 0);
      if (now < cooldownUntil && opts.force !== true) {
        director.rejectedActions += 1;
        return false;
      }
      if (
        opts.force !== true
        && (
          (director.action && now < director.action.endsAt && director.action.name === name)
          || (director.outgoingAction && now < director.outgoingAction.releaseEndsAt && director.outgoingAction.name === name)
        )
      ) {
        director.rejectedActions += 1;
        return false;
      }
      if (director.action && now < director.action.endsAt && director.action.priority > priority && opts.force !== true) {
        director.rejectedActions += 1;
        return false;
      }
      if (director.action && now < director.action.endsAt) {
        const outgoingSpec = ACTION_SPECS[director.action.name];
        const outgoingAge = now - director.action.startedAt;
        const interruptReleaseMs = clamp(Number(opts.crossfadeMs) || 190, 120, 320);
        director.outgoingAction = {
          ...director.action,
          interruptedAt: now,
          interruptReleaseMs,
          releaseEndsAt: now + interruptReleaseMs,
          interruptedProgress: outgoingSpec
            ? clamp(outgoingAge / outgoingSpec.durationMs, 0, 1)
            : 0,
          interruptedEnvelope: outgoingSpec
            ? actionEnvelope(outgoingSpec, outgoingAge) * director.action.intensity
            : 0
        };
      }
      const intensity = clamp(Number(opts.intensity) || 1, 0.45, 1.45);
      director.action = {
        name,
        startedAt: now,
        endsAt: now + spec.durationMs,
        priority,
        intensity,
        source: String(opts.source || "runtime")
      };
      director.cooldowns[name] = director.action.endsAt + spec.cooldownMs;
      director.idleActive = null;
      director.idleNextAt = Math.max(director.idleNextAt, director.action.endsAt + 2400);
      return true;
    }

    function resolveMode(context, director, now) {
      if (MODES.includes(context.mode)) return context.mode;
      if (context.speaking) return "speak";
      if (Number(context.listeningBlend || 0) > 0.035) return "listen";
      if (context.thinking) return "think";
      if (director.requestedModeUntil > now) return director.requestedMode;
      return "idle";
    }

    function updateWeights(weights, active, keys, attackFollow, releaseFollow = attackFollow) {
      for (const key of keys) {
        const target = key === active ? 1 : 0;
        const follow = target > (Number(weights[key]) || 0) ? attackFollow : releaseFollow;
        weights[key] = clamp((Number(weights[key]) || 0) + (target - (Number(weights[key]) || 0)) * follow, 0, 1);
      }
    }

    function sample(context = {}) {
      const now = Number.isFinite(Number(context.now)) ? Number(context.now) : perf.now();
      const director = ensureState(now);
      // Advance strictly from elapsed wall time. The previous minimum step made
      // duplicate samples and high-refresh displays move the blend state faster
      // than real time, which read as a small snap beside authored Cubism clips.
      const elapsedMs = Math.max(0, now - Number(director.lastAt ?? now));
      const dtFrames = clamp(elapsedMs / 16.6667, 0, 3.5);
      director.lastAt = now;
      const mode = resolveMode(context, director, now);
      const emotion = normalizeEmotion(context.emotion);
      const delivery = normalizeDelivery(context.emotion);
      const audible = context.audioActive === undefined ? context.speaking === true : context.audioActive === true;
      const speechActive = mode === "speak" && audible;
      const generation = context.playbackGeneration;
      const gestures = director.speechGestures || (director.speechGestures = createSpeechGestures());
      if (generation !== undefined && generation !== director.playbackGeneration) {
        director.speechRhythm = createSpeechRhythm();
        gestures.active = null;
        gestures.lastRhythmCount = 0;
        director.playbackGeneration = generation;
      }
      const rhythm = director.speechRhythm || (director.speechRhythm = createSpeechRhythm());
      const audio = clamp(Number(context.audioLevel) || 0, 0, 1);
      const beat = sampleSpeechRhythm(rhythm, audio, now, elapsedMs, speechActive);
      const gestureBlocked = context.authoredMotionActive === true || context.speechGestureAllowed === false
        || !!(director.action && now < director.action.endsAt)
        || !!(director.outgoingAction && now < director.outgoingAction.releaseEndsAt);
      const autoGestureWeight = sampleSpeechGesture(gestures, rhythm, delivery, now, speechActive, gestureBlocked);
      const gestureWeight = context.speechGesture === undefined ? autoGestureWeight : 0;
      const deliveryWeights = director.deliveryWeights || (director.deliveryWeights = {});
      updateWeights(deliveryWeights, speechActive ? delivery : "neutral", DELIVERY_KEYS,
        1 - Math.exp(-Math.min(elapsedMs, 120) / 180), 1 - Math.exp(-Math.min(elapsedMs, 120) / 260));
      const modeAttackFollow = 1 - Math.pow(1 - 0.075, dtFrames);
      const modeReleaseFollow = 1 - Math.pow(1 - 0.048, dtFrames);
      const emotionAttackFollow = 1 - Math.pow(1 - 0.065, dtFrames);
      const emotionReleaseFollow = 1 - Math.pow(1 - 0.038, dtFrames);
      updateWeights(director.modeWeights, mode, MODES, modeAttackFollow, modeReleaseFollow);
      updateWeights(director.emotionWeights, emotion, EMOTIONS, emotionAttackFollow, emotionReleaseFollow);
      director.mode = mode;

      const parameters = {};
      for (const key of MODES) addPose(parameters, MODE_POSES[key], director.modeWeights[key]);
      for (const key of EMOTIONS) addPose(parameters, EMOTION_POSES[key], director.emotionWeights[key] * (context.faceIntensity ?? 1));

      const motionGain = context.motionIntensity === "low" ? 0.45 : (context.motionIntensity === "high" ? 1.3 : 1);
      const deliveryIntensity = context.deliveryIntensity ?? (context.intensity === "low" ? 0.65 : (context.intensity === "high" ? 1.15 : 1));
      for (const key of DELIVERY_KEYS) {
        addPose(parameters, DELIVERY_POSES[key], (deliveryWeights[key] || 0) * motionGain * deliveryIntensity);
      }
      if (speechActive) {
        addPose(parameters, SPEECH_GESTURE_POSES[gestures.active?.name], gestureWeight * motionGain * deliveryIntensity);
      }

      if (mode === "speak" && audible) {
        const audio = clamp(Number(context.audioLevel) || 0, 0, 1);
        const energy = clamp(Number(context.bodyEnergy) || audio, 0, 1.35);
        const seedPhase = director.seed * 0.001;
        const headCadence = Math.sin(now / 225 + seedPhase)
          + Math.sin(now / 510 + seedPhase * 0.63) * 0.22;
        const shoulderCadence = Math.sin((now - 55) / 238 + seedPhase * 0.91);
        const bodyPhrase = Math.sin((now - 105) / 720 + seedPhase * 0.7);
        // Keep a VTuber-like upper-body presence throughout audible speech.
        // Real audio still controls the energy, while the floor prevents long
        // clauses from looking frozen between syllable peaks.
        // After a real signal has been observed, a pause should settle the
        // body even if the legacy synthetic body-energy floor remains high.
        // Browser voices without analyser data keep the existing soft cadence.
        const voicePresence = rhythm.hasSignal ? clamp(rhythm.fast * 8 + 0.1, 0.1, 1) : 1;
        const driveTarget = clamp(0.3 + audio * 0.62 + energy * 0.38, 0, 1.35) * voicePresence;
        const driveFollow = 1 - Math.pow(
          1 - (driveTarget > Number(director.speechDrive || 0) ? 0.1 : 0.055),
          dtFrames
        );
        director.speechDrive = clamp(
          Number(director.speechDrive || 0) + (driveTarget - Number(director.speechDrive || 0)) * driveFollow,
          0,
          1.35
        );
        const drive = director.speechDrive;
        const audioAccent = Math.max(0, audio - 0.08);
        const armCadence = shoulderCadence * 0.22 - bodyPhrase * 0.14;
        addPose(parameters, {
          [P.angleY]: (-0.68 - Math.max(0, headCadence) * 1.24) * drive,
          [P.angleZ]: headCadence * 1.16 * drive,
          [P.bodyAngleX]: bodyPhrase * 0.86 * drive,
          [P.bodyAngleY]: (1.16 + Math.max(0, shoulderCadence) * 1.72 + audioAccent * 0.48) * drive,
          [P.bodyAngleZ]: bodyPhrase * 1.72 * drive,
          [P.shoulder]: (0.075 + Math.max(0, shoulderCadence) * 0.065 + audioAccent * 0.2) * drive,
          [P.armLA]: armCadence * drive,
          [P.armRA]: -armCadence * drive
        });
      } else if (Number(director.speechDrive || 0) > 0.0001) {
        const releaseFollow = 1 - Math.pow(1 - 0.055, dtFrames);
        director.speechDrive += (0 - director.speechDrive) * releaseFollow;
        if (director.speechDrive < 0.0001) director.speechDrive = 0;
      }

      if (director.outgoingAction) {
        const outgoing = director.outgoingAction;
        const spec = ACTION_SPECS[outgoing.name];
        const releaseAge = now - outgoing.interruptedAt;
        if (!spec || releaseAge >= outgoing.interruptReleaseMs) {
          director.outgoingAction = null;
        } else {
          const interruptionFade = smoothstep(1 - releaseAge / outgoing.interruptReleaseMs);
          const progress = clamp(Number(outgoing.interruptedProgress) || 0, 0, 1);
          const envelope = clamp(Number(outgoing.interruptedEnvelope) || 0, 0, 1.45) * interruptionFade;
          addPose(parameters, sampleAction(outgoing.name, progress, envelope));
        }
      }

      if (director.action) {
        const spec = ACTION_SPECS[director.action.name];
        const age = now - director.action.startedAt;
        if (age > spec.durationMs) {
          director.action = null;
        } else {
          const progress = clamp(age / spec.durationMs, 0, 1);
          const envelope = actionEnvelope(spec, age) * director.action.intensity;
          addPose(parameters, sampleAction(director.action.name, progress, envelope));
        }
      }

      const idleAllowed = mode === "idle" && !director.action && !director.outgoingAction && context.allowIdle !== false;
      if (!idleAllowed) {
        director.idleActive = null;
        director.idleNextAt = Math.max(director.idleNextAt, now + 2600);
      } else {
        if (!director.idleActive && now >= director.idleNextAt) {
          const name = nextIdleVariant(director);
          const durationMs = 1800 + random() * 2100;
          director.idleActive = { name, startedAt: now, durationMs };
        }
        if (director.idleActive) {
          const age = now - director.idleActive.startedAt;
          if (age >= director.idleActive.durationMs) {
            director.idleActive = null;
            director.idleNextAt = now + 4800 + random() * 7600;
          } else {
            addPose(
              parameters,
              sampleIdleVariant(director.idleActive.name, age / director.idleActive.durationMs, director.seed),
              0.82
            );
          }
        }
      }

      if (context.speechGesture?.name && SPEECH_GESTURE_POSES[context.speechGesture.name]) {
        addPose(parameters, SPEECH_GESTURE_POSES[context.speechGesture.name], Math.pow(Math.sin(Math.PI * clamp(context.speechGesture.phase, 0, 1)), 2));
      }
      const smoothedParameters = smoothParameterChannels(director, parameters, elapsedMs, mode);
      director.lastSample = {
        at: now,
        mode,
        emotion,
        delivery,
        speechAccent: beat,
        speechAccentCount: rhythm.count,
        speechGesture: gestures.active?.name || "",
        speechGestureCount: gestures.count,
        speechGestureRestUntil: gestures.restUntil,
        speechGestureHistory: gestures.history.slice(),
        action: director.action?.name || "",
        outgoingAction: director.outgoingAction?.name || "",
        idle: director.idleActive?.name || "",
        parameterCount: Object.keys(smoothedParameters).length
      };
      return { ...director.lastSample, parameters: smoothedParameters };
    }

    function reset(now = perf.now()) {
      delete state.hiyoriDirector;
      ensureState(now);
    }

    function stopSpeech() {
      const director = ensureState();
      director.speechRhythm = createSpeechRhythm();
      director.deliveryWeights = {};
      if (director.speechGestures) {
        director.speechGestures.active = null;
        director.speechGestures.lastRhythmCount = 0;
      }
      const cancelledNames = new Set();
      for (const slot of ["action", "outgoingAction"]) {
        if (director[slot]?.source === "speech_cue") {
          cancelledNames.add(director[slot].name);
          director[slot] = null;
        }
      }
      for (const name of cancelledNames) {
        if (director.action?.name !== name) delete director.cooldowns[name];
      }
      if (director.requestedModeSource === "speech_cue") {
        director.requestedMode = "idle";
        director.requestedModeUntil = 0;
        director.requestedModeSource = "";
      }
      // Keep channel inertia: interruption releases smoothly instead of snapping.
    }

    return { ensureState, requestMode, triggerAction, sample, reset, stopSpeech };
  }

  const api = {
    SPEECH_GESTURE_POSES,
    SPEECH_GESTURE_POOLS,
    MODES,
    EMOTIONS,
    MODE_POSES,
    EMOTION_POSES,
    DELIVERY_POSES,
    normalizeDelivery,
    ACTION_SPECS,
    ACTION_ALIASES,
    IDLE_VARIANTS,
    normalizeMode,
    normalizeEmotion,
    normalizeAction,
    smootherstep,
    shiftedPhase,
    staggeredEnvelope,
    actionEnvelope,
    sampleAction,
    sampleIdleVariant,
    channelResponseRate,
    smoothParameterChannels,
    createController
  };

  return api;
  }

  const mappingApi = root.XinyuLive2DMapping || (typeof require === "function" ? require("./avatar/live2dMapping.js") : null);
  let defaultApi;
  const current = () => defaultApi || (defaultApi = createImplementation(mappingApi.getDefault()));
  const api = {};
  for (const name of ["normalizeDelivery", "normalizeMode", "normalizeEmotion", "normalizeAction", "smootherstep", "shiftedPhase", "staggeredEnvelope", "actionEnvelope", "sampleAction", "sampleIdleVariant", "channelResponseRate", "smoothParameterChannels"]) {
    api[name] = (...args) => current()[name](...args);
  }
  for (const name of ["SPEECH_GESTURE_POSES", "SPEECH_GESTURE_POOLS", "MODES", "EMOTIONS", "MODE_POSES", "EMOTION_POSES", "DELIVERY_POSES", "ACTION_SPECS", "ACTION_ALIASES", "IDLE_VARIANTS"]) {
    Object.defineProperty(api, name, { enumerable: true, get: () => current()[name] });
  }
  api.createController = (deps = {}) => {
    let controller, selected;
    const get = () => {
      const mapping = deps.mapping || deps.state?.avatarMapping || mappingApi.getDefault();
      if (!controller || selected !== mapping) {
        selected = mapping;
        controller = createImplementation(mapping).createController(deps);
      }
      return controller;
    };
    return Object.fromEntries(["ensureState", "requestMode", "triggerAction", "sample", "reset", "stopSpeech"].map(name => [name, (...args) => get()[name](...args)]));
  };
  root.TaffyHiyoriPerformanceDirector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
