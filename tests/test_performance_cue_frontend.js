#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const PERFORMANCE_CUE_JS = path.resolve(__dirname, "..", "web", "performanceCueController.js");
const INDEX_HTML = path.resolve(__dirname, "..", "web", "index.html");
const DESKTOP_CSS = path.resolve(__dirname, "..", "web", "desktop.css");
const CHAT_JS = path.resolve(__dirname, "..", "web", "chat.js");
const CHAT_REPLY_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "chatReplyController.js");
const LIVE2D_EXPRESSION_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "live2dExpressionController.js");
const TTS_PLAYBACK_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "ttsPlaybackController.js");
const APP_STARTUP_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "appStartupController.js");
const MOTION_RUNTIME_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "motionRuntimeController.js");
const HIYORI_EMOTION_OVERLAY_CONTROLLER_JS = path.resolve(__dirname, "..", "web", "hiyoriEmotionOverlayController.js");
const HIYORI_MODEL_JSON = path.resolve(__dirname, "..", "web", "models", "hiyori_pro_t11", "hiyori_pro_t11.model3.json");
const HIYORI_MODEL_DIR = path.dirname(HIYORI_MODEL_JSON);
const HIYORI_OVERLAY_MANIFEST = path.resolve(__dirname, "..", "web", "assets", "live2d-overlays", "hiyori", "manifest.json");
const HIYORI_OVERLAY_DIR = path.dirname(HIYORI_OVERLAY_MANIFEST);

const cueController = require(PERFORMANCE_CUE_JS);
const live2dExpressionController = require(LIVE2D_EXPRESSION_CONTROLLER_JS);
const motionRuntimeController = require(MOTION_RUNTIME_CONTROLLER_JS);
const appStartupController = require(APP_STARTUP_CONTROLLER_JS);
const ttsPlaybackController = require(TTS_PLAYBACK_CONTROLLER_JS);
const hiyoriEmotionOverlayController = require(HIYORI_EMOTION_OVERLAY_CONTROLLER_JS);

assert.strictEqual(typeof cueController.buildPerformanceCue, "function");
assert.strictEqual(typeof cueController.normalizePerformanceCueEmotion, "function");
assert.strictEqual(typeof cueController.normalizePerformanceCueIntensity, "function");
assert.strictEqual(typeof cueController.resolvePerformanceCueMotionPlan, "function");
assert.strictEqual(typeof ttsPlaybackController.createController, "function");
assert.strictEqual(typeof hiyoriEmotionOverlayController.createController, "function");

{
  const modelJson = JSON.parse(fs.readFileSync(HIYORI_MODEL_JSON, "utf8"));
  const expressions = modelJson.FileReferences?.Expressions || [];
  const motions = modelJson.FileReferences?.Motions || {};
  const expressionNames = expressions.map((item) => item.Name).sort();
  assert.deepStrictEqual(
    expressionNames,
    ["angry", "anxious", "happy", "neutral", "playful", "sad", "surprised", "thinking"],
    "hiyori_pro_t11 should ship local exp3 expression assets for every performance cue emotion"
  );
  for (const item of expressions) {
    assert.ok(item.Name && item.File, "each hiyori expression entry should include Name and File");
    const expressionPath = path.resolve(HIYORI_MODEL_DIR, item.File);
    assert.ok(expressionPath.startsWith(HIYORI_MODEL_DIR), "expression files should stay inside the hiyori model directory");
    assert.ok(fs.existsSync(expressionPath), `missing hiyori expression file: ${item.File}`);
    const expression = JSON.parse(fs.readFileSync(expressionPath, "utf8"));
    assert.strictEqual(expression.Type, "Live2D Expression", `${item.Name} should be a Live2D expression file`);
    assert.ok(Array.isArray(expression.Parameters), `${item.Name} should define expression parameters`);
    assert.ok(expression.Parameters.length >= 3, `${item.Name} should tune more than one facial parameter`);
    for (const param of expression.Parameters) {
      assert.ok(typeof param.Id === "string" && param.Id, `${item.Name} should use parameter ids`);
      assert.strictEqual(typeof param.Value, "number", `${item.Name}.${param.Id} should use numeric values`);
      assert.ok(["Add", "Multiply", "Overwrite"].includes(param.Blend), `${item.Name}.${param.Id} should use a valid blend mode`);
    }
  }
  const expressionByName = Object.fromEntries(expressions.map((item) => {
    const expressionPath = path.resolve(HIYORI_MODEL_DIR, item.File);
    return [item.Name, JSON.parse(fs.readFileSync(expressionPath, "utf8"))];
  }));
  const expressionParam = (name, id) => {
    const param = expressionByName[name]?.Parameters?.find((item) => item.Id === id);
    return typeof param?.Value === "number" ? param.Value : 0;
  };
  const expressionAbsSum = (name, ids) => ids.reduce((sum, id) => sum + Math.abs(expressionParam(name, id)), 0);
  assert.ok(
    expressionParam("angry", "ParamBrowLY") <= -1.35 && expressionParam("angry", "ParamBrowRY") <= -1.35,
    "angry exp3 should use a happy-level obvious lowered-brow pose"
  );
  assert.ok(
    expressionParam("angry", "ParamMouthForm") <= -1.55,
    "angry exp3 should use a happy-level obvious tense-mouth pose"
  );
  assert.ok(
    expressionAbsSum("angry", ["ParamArmLA", "ParamArmRA", "ParamArmLB", "ParamArmRB", "ParamHandL", "ParamHandR"]) >= 15,
    "angry exp3 should include happy-level obvious arm and hand tension"
  );
  assert.ok(
    Math.abs(expressionParam("thinking", "ParamAngleZ")) >= 5.6 && Math.abs(expressionParam("thinking", "ParamEyeBallX")) >= 0.42,
    "thinking exp3 should include a happy-level obvious head tilt and side glance"
  );
  assert.ok(
    expressionAbsSum("thinking", ["ParamArmLA", "ParamArmRA", "ParamArmLB", "ParamArmRB", "ParamHandL", "ParamHandR"]) >= 9,
    "thinking exp3 should include a happy-level obvious hand-to-chin style prompt"
  );

  assert.ok(Array.isArray(motions.Thinking), "hiyori_pro_t11 should register a dedicated Thinking motion group");
  assert.ok(motions.Thinking.length >= 1, "hiyori_pro_t11 Thinking group should include at least one motion");
  const thinkingMotionPath = path.resolve(HIYORI_MODEL_DIR, motions.Thinking[0].File || "");
  assert.ok(thinkingMotionPath.startsWith(HIYORI_MODEL_DIR), "Thinking motion should stay inside the hiyori model directory");
  assert.ok(fs.existsSync(thinkingMotionPath), `missing hiyori Thinking motion file: ${motions.Thinking[0].File}`);
  const thinkingMotion = JSON.parse(fs.readFileSync(thinkingMotionPath, "utf8"));
  assert.strictEqual(thinkingMotion.Version, 3, "Thinking motion should be a Cubism motion3 file");
  assert.strictEqual(thinkingMotion.Meta?.Loop, false, "Thinking motion should be a one-shot accent, not a stuck idle loop");
  assert.ok(Number(thinkingMotion.Meta?.Duration || 0) >= 2.2, "Thinking motion should hold the pose long enough to read");
  const thinkingCurves = new Map((thinkingMotion.Curves || []).map((curve) => [curve.Id, curve]));
  const curveMaxAbs = (id) => {
    const segments = thinkingCurves.get(id)?.Segments || [];
    let max = 0;
    for (let i = 1; i < segments.length; i += 3) {
      if (typeof segments[i] === "number") {
        max = Math.max(max, Math.abs(segments[i]));
      }
    }
    return max;
  };
  const curveMaxAbsBefore = (id, maxTime) => {
    const segments = thinkingCurves.get(id)?.Segments || [];
    let max = 0;
    for (let i = 0; i < segments.length - 1; i += 3) {
      const t = Number(segments[i]);
      const v = Number(segments[i + 1]);
      if (Number.isFinite(t) && Number.isFinite(v) && t <= maxTime) {
        max = Math.max(max, Math.abs(v));
      }
    }
    return max;
  };
  const curveSignedRangeBefore = (id, maxTime) => {
    const segments = thinkingCurves.get(id)?.Segments || [];
    let min = 0;
    let max = 0;
    for (let i = 0; i < segments.length - 1; i += 3) {
      const t = Number(segments[i]);
      const v = Number(segments[i + 1]);
      if (Number.isFinite(t) && Number.isFinite(v) && t <= maxTime) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
    return { min, max };
  };
  assert.ok(
    curveMaxAbs("ParamAngleZ") >= 7 && curveMaxAbs("ParamBodyAngleX") >= 5,
    "Thinking motion should include a readable head/body lean"
  );
  assert.ok(
    curveMaxAbs("ParamArmLA") + curveMaxAbs("ParamArmLB") + curveMaxAbs("ParamHandL") >= 13,
    "Thinking motion should include a stronger hand-to-chin silhouette than the expression alone"
  );
  assert.ok(
    curveMaxAbsBefore("ParamAngleZ", 0.35) >= 6
      && curveMaxAbsBefore("ParamBodyAngleX", 0.35) >= 4
      && curveMaxAbsBefore("PartArmB", 0.35) >= 0.7,
    "Thinking motion should snap into a visible pose during the first 0.35s"
  );
  const earlyHeadSnap = curveSignedRangeBefore("ParamAngleX", 0.72);
  assert.ok(
    earlyHeadSnap.max >= 3.5 && earlyHeadSnap.min <= -2.5,
    "Thinking motion should include a quick side snap and rebound before the hold"
  );
}

{
  assert.ok(fs.existsSync(HIYORI_OVERLAY_MANIFEST), "Hiyori emotion overlay manifest should exist");
  const manifest = JSON.parse(fs.readFileSync(HIYORI_OVERLAY_MANIFEST, "utf8"));
  assert.strictEqual(manifest.version, 1, "Hiyori overlay manifest should use version 1");
  assert.strictEqual(manifest.character, "hiyori_pro_t11", "Hiyori overlay manifest should be scoped to the current model");
  for (const [emotion, minAssets] of Object.entries({ thinking: 2, angry: 2, surprised: 1 })) {
    assert.ok(Array.isArray(manifest.emotions?.[emotion]?.assets), `${emotion} overlay should define assets`);
    assert.ok(manifest.emotions[emotion].assets.length >= minAssets, `${emotion} overlay should include enough readable assets`);
    for (const asset of manifest.emotions[emotion].assets) {
      assert.ok(asset.id && asset.file && asset.placement, `${emotion} overlay assets should include id, file, and placement`);
      const assetPath = path.resolve(HIYORI_OVERLAY_DIR, asset.file);
      assert.ok(assetPath.startsWith(HIYORI_OVERLAY_DIR), `${emotion} overlay assets should stay inside the hiyori overlay directory`);
      assert.ok(/\.(png|webp)$/i.test(asset.file), `${emotion}.${asset.id} should use a browser-displayable bitmap`);
      assert.ok(fs.existsSync(assetPath), `missing Hiyori overlay asset: ${asset.file}`);
      const bytes = fs.readFileSync(assetPath);
      assert.ok(bytes.length >= 512, `${asset.file} should not be an empty stub file`);
      const pngSignature = bytes.subarray(0, 8).toString("hex");
      const webpSignature = bytes.subarray(8, 12).toString("ascii");
      assert.ok(
        pngSignature === "89504e470d0a1a0a" || webpSignature === "WEBP",
        `${asset.file} should be a PNG or WebP bitmap`
      );
    }
  }
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "太好了！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: {
      emotion: "happy",
      action: "wave",
      intensity: "high",
      voice_style: "cheerful"
    }
  });
  assert.strictEqual(cue.source, "runtime");
  assert.strictEqual(cue.emotion, "happy");
  assert.strictEqual(cue.live2dMood, "happy");
  assert.strictEqual(cue.action, "wave");
  assert.strictEqual(cue.intensity, "high");
  assert.strictEqual(cue.talkStyle, "playful");
  assert.strictEqual(cue.voiceStyle, "cheerful");
  assert.ok(cue.speech.motionStrength > 1.55);
  assert.ok(cue.speech.beatBoost > 1);
}

{
  const input = {
    replyText: "That is absurdly funny.",
    mood: "happy",
    talkStyle: "playful",
    runtimeMetadata: {
      emotion: "happy",
      action: "happy_idle",
      intensity: "medium",
      voice_style: "cheerful"
    }
  };
  const normal = cueController.buildPerformanceCue({ ...input, motionIntensity: "normal" });
  const expressive = cueController.buildPerformanceCue({ ...input, motionIntensity: "high" });
  assert.strictEqual(normal.motionMode, "medium", "normal configured motion should preserve the existing amplitude");
  assert.strictEqual(expressive.motionMode, "high", "high configured motion should be visible in the bounded cue");
  assert.ok(expressive.speech.motionStrength > normal.speech.motionStrength, "high motion mode should amplify speech motion");
  assert.ok(expressive.speech.bodyBoost > normal.speech.bodyBoost, "high motion mode should amplify body response");
  assert.ok(expressive.speech.expressionBoost > normal.speech.expressionBoost, "high motion mode should amplify expression response");
}

{
  function peakHappyFallback(amplitudeScale) {
    let now = 0;
    const frames = [];
    const model = {
      x: 0,
      y: 0,
      rotation: 0,
      scale: { value: 1, set(value) { this.value = value; } }
    };
    const state = {
      model,
      animating: false,
      baseTransform: { x: 0, y: 0, scale: 1 },
      currentTalkStyle: "playful"
    };
    const controller = motionRuntimeController.createController({
      state,
      windowObject: {},
      performanceObject: { now: () => now },
      requestAnimationFrame: (callback) => frames.push(callback),
      getMotionIntensityPreset: () => ({ amplitudeScale })
    });
    assert.strictEqual(controller.animateFallback("happy", { style: "playful" }), true);
    let peak = 0;
    while (frames.length && now <= 1400) {
      const frame = frames.shift();
      now += 80;
      frame(now);
      peak = Math.max(peak, Math.abs(model.y));
    }
    return peak;
  }

  const normalPeak = peakHappyFallback(1);
  const expressivePeak = peakHappyFallback(1.38);
  assert.ok(normalPeak > 20, "normal fallback should retain a readable transform reaction");
  assert.ok(expressivePeak > normalPeak * 1.3, "high motion mode should visibly amplify fallback transform distance");
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "This is wonderful and exciting!",
    mood: "happy",
    talkStyle: "playful",
    performancePlan: {
      emotion: "neutral",
      action: "nod",
      intensity: "low",
      voice_style: "warm"
    },
    runtimeMetadata: { emotion: "angry", action: "shake_head", intensity: "high" }
  });
  assert.strictEqual(cue.source, "companion_turn", "an explicit turn plan should beat runtime and text inference");
  assert.strictEqual(cue.emotion, "neutral", "explicit neutral must not be overwritten by happy text");
  assert.strictEqual(cue.action, "nod");
  assert.strictEqual(cue.intensity, "low");
  assert.strictEqual(cue.voiceStyle, "warm");
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "欸？真的假的？！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: null
  });
  assert.strictEqual(cue.source, "text_fallback");
  assert.strictEqual(cue.emotion, "surprised");
  assert.strictEqual(cue.live2dMood, "surprised");
  assert.strictEqual(cue.talkStyle, "clear");
  assert.ok(cue.speech.pulseBoost >= 0.34);
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "我先想一下……",
    mood: "thinking",
    talkStyle: "neutral",
    replyCue: {
      speechStyle: "clear",
      voiceStyle: "curious"
    }
  });
  assert.strictEqual(cue.source, "reply_cue");
  assert.strictEqual(cue.emotion, "thinking");
  assert.strictEqual(cue.live2dMood, "thinking");
  assert.strictEqual(cue.voiceStyle, "curious");
}

{
  const cue = cueController.buildPerformanceCue({
    replyText: "我再推理一下。",
    mood: "thinking",
    talkStyle: "clear",
    runtimeMetadata: {
      emotion: "thinking",
      action: "ponder",
      intensity: "high",
      voice_style: "curious"
    }
  });
  assert.strictEqual(cue.action, "think", "ponder action should normalize to the thinking action cue");
}

{
  const emotions = [
    "neutral",
    "happy",
    "playful",
    "excited",
    "shy",
    "hurt",
    "sad",
    "anxious",
    "angry",
    "surprised",
    "serious",
    "thinking"
  ];
  for (const emotion of emotions) {
    const cue = cueController.buildPerformanceCue({
      replyText: "测试",
      mood: "idle",
      talkStyle: "neutral",
      runtimeMetadata: { emotion, intensity: "medium", action: "unknown-action" }
    });
    assert.strictEqual(cue.emotion, emotion);
    assert.ok(cue.live2dMood);
    assert.strictEqual(cue.action, "none");
    assert.ok(cue.speech.motionStrength >= 0.7);
    assert.ok(cue.speech.motionStrength <= 2.2);
  }
}

{
  assert.strictEqual(cueController.normalizePerformanceCueEmotion("joy"), "happy");
  assert.strictEqual(cueController.normalizePerformanceCueEmotion("curious"), "thinking");
  assert.strictEqual(cueController.normalizePerformanceCueEmotion("bad-value"), "neutral");
  assert.strictEqual(cueController.normalizePerformanceCueIntensity("strong"), "high");
  assert.strictEqual(cueController.normalizePerformanceCueIntensity(0.2), "low");
}

{
  const explicitThinking = cueController.resolvePerformanceCueMotionPlan({
    emotion: "neutral",
    action: "think",
    intensity: "medium"
  });
  assert.strictEqual(explicitThinking.shouldTrigger, true, "an explicit think action should trigger even at medium intensity");
  assert.strictEqual(explicitThinking.groups[0], "Thinking", "explicit think should use the dedicated one-shot Thinking motion first");
  assert.strictEqual(explicitThinking.priority, 5, "explicit actions should outrank generic high-intensity fallback motions");

  const neutralHappy = cueController.resolvePerformanceCueMotionPlan({
    emotion: "happy",
    action: "none",
    intensity: "medium"
  });
  assert.strictEqual(neutralHappy.shouldTrigger, false, "ordinary medium mood cues should remain expressive without forcing a gesture");
}

{
  let now = 1000;
  const expressionCalls = [];
  const state = {
    model: {
      expression(name) {
        expressionCalls.push(name);
        return Promise.resolve(true);
      }
    }
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "angry",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: "不行，这样会把体验弄坏。",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: {
      emotion: "angry",
      action: "shake_head",
      intensity: "high",
      voice_style: "serious"
    }
  });
  controller.applySpeechPerformanceCue(cue);
  assert.deepStrictEqual(expressionCalls, ["angry"], "performance cue should call the model-level exp3 expression");
  assert.strictEqual(state.live2dExpressionLast?.name, "angry", "performance cue should record the selected model expression");
  assert.ok(Number(state.live2dExpressionLast?.at || 0) >= now, "selected model expression should include a timestamp");
}

{
  let now = 2000;
  const expressionCalls = [];
  const state = {
    expressionEnabled: true,
    model: {
      expression(name) {
        expressionCalls.push(name);
        return true;
      },
      internalModel: { coreModel: {} }
    },
    currentTalkStyle: "neutral",
    speechMotionBlend: 0,
    moodExpressionSmoothed: { happy: 0, sad: 0, angry: 0, surprised: 0 }
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false
  });
  controller.applySpeechPerformanceCue({
    emotion: "angry",
    live2dMood: "angry",
    intensity: "medium",
    holdMs: 5000
  });
  controller.finishSpeechAnimation();
  assert.ok(state.speechPerformanceCueUntil <= now + 380, "audible completion should bound the remaining expression hold");
  now += 400;
  controller.applyStyleExpressionLayer();
  assert.deepStrictEqual(
    expressionCalls,
    ["angry", "neutral"],
    "an expired local speech cue should actively restore neutral instead of leaving exp3 locked"
  );
  assert.strictEqual(state.speechPerformanceCue, null);
}

{
  let now = 3000;
  const samples = new Uint8Array(128);
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = i % 2 === 0 ? 96 : 160;
  }
  const state = {
    ttsAudioLevel: 0,
    ttsPcmAudioAnalyserActive: true,
    ttsPcmAudioAnalyser: {
      getByteTimeDomainData(target) {
        target.set(samples);
      }
    },
    ttsPcmAudioAnalyserData: new Uint8Array(128)
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now }
  });
  assert.ok(controller.sampleTTSAudioLevel() > 0.5, "streaming PCM analyser energy should drive Live2D mouth level");
  assert.ok(state.ttsAudioRawLevel > 0.5);
  assert.strictEqual(state.ttsAudioLastVoiceAt, now);
}

function createEmotionFrameSampler({ emotion, text, action = "none", style = "neutral", seed = 2.1 }) {
  let now = 1000;
  let frame = 0;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ frame, id, value: Number(delta) * Number(weight) });
    },
    setPartOpacityById(id, value) {
      calls.push({ frame, id, value: Number(value), part: true });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: style,
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: seed,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (value) => String(value || "").trim(),
    normalizeTalkStyle: (value) => String(value || "neutral").trim() || "neutral",
    detectMood: () => emotion,
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: text,
    mood: emotion,
    talkStyle: style,
    runtimeMetadata: {
      emotion,
      action,
      intensity: "high"
    }
  });
  controller.beginSpeechAnimation(text, emotion, style, {
    durationMs: 2200,
    performanceCue: cue
  });
  state.speechAnimSeed = seed;
  function advanceFrames(count, stepMs = 33.333) {
    for (frame = 0; frame < count; frame += 1) {
      now += stepMs;
      controller.applyStyleExpressionLayer();
      controller.updateMicroMotionLayer();
    }
  }
  function weightedFrameValue(id, frameIndex) {
    return calls
      .filter((call) => call.id === id && call.frame === frameIndex && !call.part)
      .reduce((sum, call) => sum + call.value, 0);
  }
  function weightedMax(id) {
    return calls
      .filter((call) => call.id === id && !call.part)
      .reduce((max, call) => Math.max(max, Math.abs(call.value)), 0);
  }
  function weightedTotal(ids) {
    return ids.reduce(
      (sum, id) => sum + calls
        .filter((call) => call.id === id && !call.part)
        .reduce((inner, call) => inner + Math.abs(call.value), 0),
      0
    );
  }
  function maxFrameStep(id, frameCount = 36) {
    let maxStep = 0;
    for (let i = 1; i < frameCount; i += 1) {
      maxStep = Math.max(maxStep, Math.abs(weightedFrameValue(id, i) - weightedFrameValue(id, i - 1)));
    }
    return maxStep;
  }
  return { state, calls, cue, advanceFrames, weightedMax, weightedTotal, maxFrameStep };
}

{
  let now = 1000;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ id, delta: Number(delta), weight: Number(weight) });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: "playful",
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: 1.3,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "happy",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: "太好了！我们先这样！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: {
      emotion: "happy",
      action: "wave",
      intensity: "high",
      voice_style: "cheerful"
    }
  });
  controller.beginSpeechAnimation("太好了！我们先这样！", "happy", "playful", {
    durationMs: 2200,
    performanceCue: cue
  });
  for (let i = 0; i < 8; i += 1) {
    now += 120;
    controller.applyStyleExpressionLayer();
    controller.updateMicroMotionLayer();
  }
  const weightedTotal = (id) => calls
    .filter((call) => call.id === id)
    .reduce((sum, call) => sum + Math.abs(call.delta * call.weight), 0);
  const weightedMax = (id) => calls
    .filter((call) => call.id === id)
    .reduce((max, call) => Math.max(max, Math.abs(call.delta * call.weight)), 0);
  assert.ok(
    weightedTotal("ParamBodyAngleZ") >= 10,
    "high happy cue should create visible body sway even when TTS audio level is zero"
  );
  assert.ok(
    weightedTotal("ParamAngleZ") >= 4,
    "high happy cue should create visible head sway even when TTS audio level is zero"
  );
  assert.ok(
    weightedTotal("ParamShoulder") >= 0.45,
    "high happy cue should create visible shoulder lift even when TTS audio level is zero"
  );
  assert.ok(
    state.speechPerformanceAccentDebug?.visibleMotion >= 2.4,
    "high happy cue should enable an explicit visible accent layer"
  );
  assert.strictEqual(state.moodExpressionWeightMood, "happy", "high happy cue should pin the runtime expression mood");
  assert.strictEqual(state.moodExpressionRuntimeMood, "happy", "high happy cue should expose the active runtime expression mood");
  assert.ok(
    Number(state.moodExpressionWeightUntil || 0) > now,
    "high happy cue should hold runtime expression weight during the cue"
  );
  assert.ok(
    weightedMax("ParamEyeLSmile") >= 0.45 && weightedMax("ParamEyeRSmile") >= 0.45,
    "high happy cue should create a readable eye-smile expression"
  );
  assert.ok(
    weightedMax("ParamMouthForm") >= 0.6,
    "high happy cue should create a readable smile mouth form"
  );
  assert.ok(
    weightedMax("ParamCheek") >= 0.45,
    "high happy cue should create readable cheek expression"
  );
  assert.ok(
    weightedMax("ParamArmLA") + weightedMax("ParamArmRA") + weightedMax("ParamHandL") + weightedMax("ParamHandR") >= 1.2,
    "high happy cue should create readable arm or hand motion"
  );
}

{
  const happy = createEmotionFrameSampler({
    emotion: "happy",
    text: "太好了！这个结果我很喜欢！",
    action: "wave",
    style: "playful",
    seed: 1.3
  });
  happy.advanceFrames(36);
  assert.ok(
    happy.weightedTotal(["ParamBodyAngleY", "ParamShoulder", "ParamArmLA", "ParamArmRA", "ParamHandL", "ParamHandR"]) >= 430,
    "high happy should have stronger readable body, shoulder, arm, and hand motion"
  );
  assert.ok(
    happy.maxFrameStep("ParamAngleZ") <= 3.4 && happy.maxFrameStep("ParamBodyAngleZ") <= 3.6,
    "high happy should stay energetic without twitchy head/body frame jumps"
  );

  const playful = createEmotionFrameSampler({
    emotion: "playful",
    text: "嘿嘿，这里我有个小想法。",
    action: "wave",
    style: "playful",
    seed: 1.9
  });
  playful.advanceFrames(36);
  assert.ok(
    playful.weightedMax("ParamEyeBallX") >= 0.42,
    "high playful should add an asymmetric teasing accent beyond happy bounce"
  );
  assert.ok(
    playful.weightedTotal(["ParamBodyAngleY", "ParamShoulder", "ParamArmLA", "ParamArmRA", "ParamHandL", "ParamHandR"]) >= 460,
    "high playful should be at least as lively as high happy"
  );
  assert.ok(
    playful.maxFrameStep("ParamAngleZ") <= 3.6 && playful.maxFrameStep("ParamBodyAngleZ") <= 3.8,
    "high playful should avoid rapid model-body twitching"
  );
}

{
  const surprised = createEmotionFrameSampler({
    emotion: "surprised",
    text: "欸？真的假的？！",
    action: "surprised",
    style: "clear",
    seed: 1.5
  });
  surprised.advanceFrames(36);
  assert.ok(
    surprised.weightedMax("ParamEyeLOpen") >= 0.7 && surprised.weightedMax("ParamEyeROpen") >= 0.7,
    "high surprised should create a readable wide-eye reaction"
  );
  assert.ok(
    surprised.weightedMax("ParamBodyAngleX") + surprised.weightedMax("ParamAngleY") >= 5.2,
    "high surprised should create a readable pop/recoil body reaction"
  );
  assert.ok(
    surprised.maxFrameStep("ParamBodyAngleX") <= 3.8 && surprised.maxFrameStep("ParamAngleY") <= 3.8,
    "high surprised should rebound smoothly instead of twitching"
  );
}

{
  const manifest = JSON.parse(fs.readFileSync(HIYORI_OVERLAY_MANIFEST, "utf8"));
  assert.ok(Array.isArray(manifest.emotions?.surprised?.assets), "surprised overlay should define assets");
  assert.ok(
    manifest.emotions.surprised.assets.some((asset) => asset.id === "surprised-spark"),
    "surprised overlay should include the lightweight spark asset"
  );
}

{
  const sad = createEmotionFrameSampler({
    emotion: "sad",
    text: "有点难过，我先慢一点。",
    action: "none",
    style: "comfort",
    seed: 2.4
  });
  sad.advanceFrames(36);
  assert.ok(
    sad.weightedMax("ParamAngleY") + sad.weightedMax("ParamBodyAngleX") + sad.weightedMax("ParamShoulder") >= 3.2,
    "high sad should create a readable lowered and inward pose"
  );
  assert.ok(
    sad.maxFrameStep("ParamAngleY") <= 2.2 && sad.maxFrameStep("ParamBodyAngleX") <= 2.2,
    "high sad should stay slow and non-jittery"
  );

  const anxious = createEmotionFrameSampler({
    emotion: "anxious",
    text: "这个地方可能不太妙，我有点担心。",
    action: "none",
    style: "comfort",
    seed: 2.8
  });
  anxious.advanceFrames(36);
  assert.ok(
    anxious.weightedMax("ParamShoulder") + anxious.weightedMax("ParamArmLB") + anxious.weightedMax("ParamArmRB") >= 2.8,
    "high anxious should create readable tense shoulder and arm posture"
  );
  assert.ok(
    anxious.maxFrameStep("ParamAngleZ") <= 2.4 && anxious.maxFrameStep("ParamBodyAngleZ") <= 2.4,
    "high anxious should read as held tension rather than vibration"
  );
}

{
  let now = 1000;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ id, value: Number(delta) * Number(weight), at: now });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: "playful",
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: 1.1,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (value) => String(value || "").trim(),
    normalizeTalkStyle: (value) => String(value || "neutral").trim() || "neutral",
    detectMood: () => "idle",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  for (let i = 0; i < 48; i += 1) {
    now += 83;
    controller.updateMicroMotionLayer();
  }
  const total = (id) => calls
    .filter((call) => call.id === id)
    .reduce((sum, call) => sum + Math.abs(call.value), 0);
  const max = (id) => calls
    .filter((call) => call.id === id)
    .reduce((best, call) => Math.max(best, Math.abs(call.value)), 0);
  assert.ok(
    total("ParamBodyAngleY") + total("ParamAngleY") >= 3.2,
    "neutral idle should have a visible low-distraction life layer"
  );
  assert.ok(
    max("ParamBodyAngleZ") <= 1.8 && max("ParamAngleZ") <= 1.6,
    "neutral idle should remain subtle and below active emotion motion"
  );
}

{
  let now = 1000;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ id, delta: Number(delta), weight: Number(weight) });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: "steady",
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: 2.1,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "angry",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: "不行，这样会把体验弄坏。",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: {
      emotion: "angry",
      action: "shake_head",
      intensity: "high",
      voice_style: "serious"
    }
  });
  controller.beginSpeechAnimation("不行，这样会把体验弄坏。", "angry", "steady", {
    durationMs: 2200,
    performanceCue: cue
  });
  for (let i = 0; i < 8; i += 1) {
    now += 120;
    controller.applyStyleExpressionLayer();
    controller.updateMicroMotionLayer();
  }
  const weightedMax = (id) => calls
    .filter((call) => call.id === id)
    .reduce((max, call) => Math.max(max, Math.abs(call.delta * call.weight)), 0);
  assert.strictEqual(state.speechPerformanceAccentDebug?.emotion, "angry", "high angry cue should use the angry accent path");
  assert.ok(
    weightedMax("ParamBrowLY") >= 0.55 && weightedMax("ParamBrowRY") >= 0.55,
    "high angry cue should create a happy-level obvious lowered-brow expression"
  );
  assert.ok(
    weightedMax("ParamMouthForm") >= 0.75,
    "high angry cue should create a happy-level obvious tense mouth expression"
  );
  assert.ok(
    weightedMax("ParamAngleZ") + weightedMax("ParamBodyAngleZ") >= 5.8,
    "high angry cue should create happy-level obvious head/body shake"
  );
  assert.ok(
    weightedMax("ParamArmLA") + weightedMax("ParamArmRA") + weightedMax("ParamArmLB") + weightedMax("ParamArmRB") + weightedMax("ParamHandL") + weightedMax("ParamHandR") >= 5.4,
    "high angry cue should create happy-level obvious arm and hand emphasis"
  );
}

{
  let now = 1000;
  let frame = 0;
  const calls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ frame, id, value: Number(delta) * Number(weight) });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: "steady",
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: 2.1,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "angry",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: "不行，这样会把体验弄坏。",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: {
      emotion: "angry",
      action: "shake_head",
      intensity: "high",
      voice_style: "serious"
    }
  });
  controller.beginSpeechAnimation("不行，这样会把体验弄坏。", "angry", "steady", {
    durationMs: 2200,
    performanceCue: cue
  });
  state.speechAnimSeed = 2.1;
  for (frame = 0; frame < 36; frame += 1) {
    now += 33.333;
    controller.applyStyleExpressionLayer();
    controller.updateMicroMotionLayer();
  }
  const weightedFrameValue = (id, frameIndex) => calls
    .filter((call) => call.id === id && call.frame === frameIndex)
    .reduce((sum, call) => sum + call.value, 0);
  const maxFrameStep = (id) => {
    let maxStep = 0;
    for (let i = 1; i < 36; i += 1) {
      maxStep = Math.max(
        maxStep,
        Math.abs(weightedFrameValue(id, i) - weightedFrameValue(id, i - 1))
      );
    }
    return maxStep;
  };
  assert.ok(
    maxFrameStep("ParamAngleZ") <= 3.2,
    "high angry cue should avoid twitchy frame-to-frame head-angle jumps"
  );
  assert.ok(
    maxFrameStep("ParamBodyAngleZ") <= 3.2,
    "high angry cue should avoid twitchy frame-to-frame body-angle jumps"
  );
  assert.ok(
    maxFrameStep("ParamArmLA") <= 2.1 && maxFrameStep("ParamArmRA") <= 2.1,
    "high angry cue should keep arm tension readable without rapid frame-to-frame snapping"
  );
}

{
  let now = 1000;
  const calls = [];
  const partOpacityCalls = [];
  const coreModel = {
    addParameterValueById(id, delta, weight) {
      calls.push({ id, delta: Number(delta), weight: Number(weight), at: now });
    },
    setPartOpacityById(id, value) {
      partOpacityCalls.push({ id, value: Number(value) });
    }
  };
  const state = {
    expressionEnabled: true,
    model: { internalModel: { coreModel } },
    config: {},
    uiView: "model",
    currentTalkStyle: "clear",
    speechMouthOpen: 0,
    ttsAudioLevel: 0,
    microBreathSeed: 1.7,
    microNextBlinkAt: 999999,
    microNextGazeAt: 999999,
    microMotionLastAt: now - 16.6667,
    microGazeTargetX: 0,
    microGazeTargetY: 0,
    microGazeCurrentX: 0,
    microGazeCurrentY: 0,
    mouseGazeCurrentX: 0,
    mouseGazeCurrentY: 0
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "thinking",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: "等一下，我认真想想这里的关系。",
    mood: "thinking",
    talkStyle: "clear",
    runtimeMetadata: {
      emotion: "thinking",
      action: "ponder",
      intensity: "high",
      voice_style: "curious"
    }
  });
  controller.beginSpeechAnimation("等一下，我认真想想这里的关系。", "thinking", "clear", {
    durationMs: 2200,
    performanceCue: cue
  });
  for (let i = 0; i < 8; i += 1) {
    now += 120;
    controller.applyStyleExpressionLayer();
    controller.updateMicroMotionLayer();
  }
  const weightedMax = (id) => calls
    .filter((call) => call.id === id)
    .reduce((max, call) => Math.max(max, Math.abs(call.delta * call.weight)), 0);
  const weightedMaxBefore = (id, maxAt) => calls
    .filter((call) => call.id === id && Number(call.at) <= maxAt)
    .reduce((max, call) => Math.max(max, Math.abs(call.delta * call.weight)), 0);
  assert.strictEqual(state.speechPerformanceAccentDebug?.emotion, "thinking", "high thinking cue should use the thinking accent path");
  assert.strictEqual(
    state.speechPerformanceAccentDebug?.thinkingReactionMode,
    "snap_jitter",
    "high thinking cue should expose the sudden snap-jitter reaction mode"
  );
  assert.strictEqual(
    state.speechPerformanceAccentDebug?.thinkingUpperBoundProbe,
    true,
    "high thinking cue should mark the Hiyori upper-bound probe when using runtime-only resources"
  );
  assert.strictEqual(
    state.moodExpressionWeightMood,
    "thinking",
    "high thinking cue should keep the runtime expression mood as thinking instead of borrowing surprised"
  );
  assert.ok(
    weightedMaxBefore("ParamAngleX", 1360) >= 2.4,
    "high thinking cue should create a short early side-snap before the thinking hold"
  );
  assert.ok(
    weightedMax("ParamAngleZ") + weightedMax("ParamBodyAngleX") >= 6.2,
    "high thinking cue should create a happy-level obvious head/body thinking tilt"
  );
  assert.ok(
    weightedMax("ParamArmLA") + weightedMax("ParamArmLB") + weightedMax("ParamHandL") >= 4.8,
    "high thinking cue should create a happy-level obvious hand-to-chin style gesture"
  );
  assert.ok(
    weightedMax("ParamHandLB") + weightedMax("ParamHandRB") >= 4.5,
    "high thinking cue should drive the model's real B-arm hand-rotation controls"
  );
  assert.ok(
    partOpacityCalls.some((call) => call.id === "PartArmB" && call.value >= 0.85)
      && partOpacityCalls.some((call) => call.id === "PartArmA" && call.value <= 0.08),
    "high thinking cue should switch cleanly toward the alternate B-arm pose without leaving an A-arm ghost"
  );
}

{
  let now = 1000;
  const classNames = new Set();
  const fakeBubble = {
    hidden: true,
    classList: {
      add(name) { classNames.add(name); },
      remove(name) { classNames.delete(name); },
      contains(name) { return classNames.has(name); }
    },
    setAttribute(name, value) {
      this[name] = value;
    }
  };
  const state = {};
  const controller = live2dExpressionController.createController({
    state,
    windowObject: {
      document: {
        getElementById(id) {
          return id === "thinking-cue-bubble" ? fakeBubble : null;
        }
      }
    },
    performanceObject: { now: () => now },
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "thinking",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const thinkingCue = cueController.buildPerformanceCue({
    replyText: "我先想一下。",
    mood: "thinking",
    talkStyle: "clear",
    runtimeMetadata: { emotion: "thinking", action: "ponder", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(thinkingCue);
  assert.strictEqual(fakeBubble.hidden, false, "high thinking cue should reveal the thinking bubble");
  assert.ok(classNames.has("is-visible"), "high thinking cue should mark the thinking bubble visible");
  assert.strictEqual(state.thinkingCueSymbolActive, true, "thinking cue symbol state should be active");

  const angryCue = cueController.buildPerformanceCue({
    replyText: "不行。",
    mood: "idle",
    talkStyle: "steady",
    runtimeMetadata: { emotion: "angry", action: "shake_head", intensity: "high" }
  });
  now += 40;
  controller.applySpeechPerformanceCue(angryCue);
  assert.strictEqual(fakeBubble.hidden, true, "non-thinking cue should hide the thinking bubble");
  assert.ok(!classNames.has("is-visible"), "non-thinking cue should remove the thinking visible class");

  controller.applySpeechPerformanceCue(thinkingCue);
  controller.clearSpeechPerformanceCue();
  assert.strictEqual(fakeBubble.hidden, true, "clearing speech cue should hide the thinking bubble");
}

{
  let now = 2000;
  const children = [];
  const classNames = new Set();
  const fakeLayer = {
    hidden: true,
    replaceChildren(...nodes) {
      children.length = 0;
      children.push(...nodes);
    },
    classList: {
      add(name) { classNames.add(name); },
      remove(name) { classNames.delete(name); },
      contains(name) { return classNames.has(name); }
    },
    setAttribute(name, value) {
      this[name] = value;
    }
  };
  const fakeDocument = {
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: "",
        alt: "",
        src: "",
        dataset: {},
        style: {},
        setAttribute(name, value) {
          this[name] = value;
        }
      };
    },
    getElementById(id) {
      return id === "live2d-emotion-overlay-layer" ? fakeLayer : null;
    }
  };
  const state = {};
  const controller = hiyoriEmotionOverlayController.createController({
    state,
    documentObject: fakeDocument,
    performanceObject: { now: () => now },
    setTimeoutFn: (fn) => {
      state._overlayTimeout = fn;
      return 7;
    },
    clearTimeoutFn: () => {}
  });
  const result = controller.showEmotionOverlay("thinking", { intensity: "high", durationMs: 1800 });
  assert.strictEqual(result, true, "high thinking should show the Hiyori overlay");
  assert.strictEqual(fakeLayer.hidden, false, "showing the overlay should reveal the host");
  assert.ok(classNames.has("is-visible"), "showing the overlay should add is-visible");
  assert.ok(children.some((node) => node.dataset.assetId === "thinking-focus-lines"), "thinking overlay should include the focus-line asset");
  assert.ok(children.some((node) => node.dataset.assetId === "thinking-ellipsis"), "thinking overlay should include the ellipsis asset");
  assert.strictEqual(state.hiyoriEmotionOverlayDebug?.emotion, "thinking", "overlay debug should record the active emotion");
  controller.clearEmotionOverlay();
  assert.strictEqual(fakeLayer.hidden, true, "clearing the overlay should hide the host");
  assert.strictEqual(children.length, 0, "clearing the overlay should remove asset nodes");
}

{
  const children = [];
  const fakeView = {
    width: 1600,
    height: 1000,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1600, height: 1000 };
    }
  };
  const fakeLayer = {
    hidden: true,
    replaceChildren(...nodes) {
      children.length = 0;
      children.push(...nodes);
    },
    classList: {
      add() {},
      remove() {}
    },
    setAttribute() {}
  };
  const fakeDocument = {
    documentElement: { clientWidth: 1600, clientHeight: 1000 },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: "",
        alt: "",
        src: "",
        dataset: {},
        style: {},
        setAttribute(name, value) {
          this[name] = value;
        }
      };
    },
    getElementById(id) {
      if (id === "live2d-emotion-overlay-layer") return fakeLayer;
      if (id === "live2d-canvas") return fakeView;
      return null;
    }
  };
  const state = {
    model: { x: 1400, y: 1000, width: 600, height: 800 },
    pixiApp: {
      view: fakeView,
      renderer: { width: 1600, height: 1000 }
    }
  };
  const controller = hiyoriEmotionOverlayController.createController({
    state,
    documentObject: fakeDocument,
    performanceObject: { now: () => 1000 },
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });
  controller.showEmotionOverlay("thinking", { intensity: "high", durationMs: 1800 });
  const focusLines = children.find((node) => node.dataset.assetId === "thinking-focus-lines");
  const ellipsis = children.find((node) => node.dataset.assetId === "thinking-ellipsis");
  assert.ok(focusLines, "thinking overlay should include the positioned focus-line asset");
  assert.ok(ellipsis, "thinking overlay should include the positioned ellipsis asset");
  assert.ok(
    Number.parseInt(focusLines.style.left, 10) >= 1320,
    "thinking focus lines should be anchored near the right-side Hiyori model, not the viewport center"
  );
  assert.ok(
    Number.parseInt(focusLines.style.top, 10) >= 300 && Number.parseInt(focusLines.style.top, 10) <= 360,
    "thinking focus lines should be anchored near Hiyori's head zone"
  );
  assert.ok(
    Number.parseInt(ellipsis.style.left, 10) > Number.parseInt(focusLines.style.left, 10),
    "thinking ellipsis should sit to the side of the head anchor"
  );
}

{
  let shown = [];
  const overlayController = {
    showEmotionOverlay(emotion, opts) {
      shown.push({ emotion, opts });
      return true;
    },
    clearEmotionOverlay() {
      shown.push({ clear: true });
    }
  };
  const controller = live2dExpressionController.createController({
    state: {},
    hiyoriEmotionOverlayController: overlayController,
    performanceObject: { now: () => 1000 },
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "thinking",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const thinkingCue = cueController.buildPerformanceCue({
    replyText: "我先想一下。",
    mood: "thinking",
    talkStyle: "clear",
    runtimeMetadata: { emotion: "thinking", action: "ponder", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(thinkingCue);
  assert.strictEqual(shown[0]?.emotion, "thinking", "high thinking cue should show the Hiyori thinking overlay");
  assert.strictEqual(shown[0]?.opts?.intensity, "high", "thinking overlay should receive cue intensity");
  controller.clearSpeechPerformanceCue();
  assert.ok(shown.some((item) => item.clear), "clearing speech performance cue should clear the Hiyori overlay");

  shown = [];
  const angryCue = cueController.buildPerformanceCue({
    replyText: "不行。",
    mood: "idle",
    talkStyle: "steady",
    runtimeMetadata: { emotion: "angry", action: "shake_head", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(angryCue);
  assert.strictEqual(shown[0]?.emotion, "angry", "high angry cue should reuse the Hiyori overlay mechanism");

  shown = [];
  const surprisedCue = cueController.buildPerformanceCue({
    replyText: "欸？真的假的？！",
    mood: "surprised",
    runtimeMetadata: { emotion: "surprised", action: "surprised", intensity: "high" }
  });
  controller.applySpeechPerformanceCue(surprisedCue);
  assert.strictEqual(shown[0]?.emotion, "surprised", "high surprised cue should use the Hiyori lightweight overlay mechanism");
}

{
  let now = 1000;
  const controller = live2dExpressionController.createController({
    state: {},
    performanceObject: { now: () => now },
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "happy",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const cue = cueController.buildPerformanceCue({
    replyText: "太好了！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: { emotion: "happy", action: "wave", intensity: "high" }
  });
  const first = controller.applySpeechPerformanceCue(cue);
  now += 40;
  const second = controller.applySpeechPerformanceCue(first);
  assert.strictEqual(second.motionStrength, first.motionStrength, "normalizing an already-normalized cue should preserve motion strength");
  assert.strictEqual(second.bodyBoost, first.bodyBoost, "normalizing an already-normalized cue should preserve body boost");
  assert.strictEqual(second.beatBoost, first.beatBoost, "normalizing an already-normalized cue should preserve beat boost");
  assert.strictEqual(second.expressionBoost, first.expressionBoost, "normalizing an already-normalized cue should preserve expression boost");
  assert.strictEqual(second.visibleMotion, first.visibleMotion, "normalizing an already-normalized cue should preserve visible motion");
}

{
  let now = 1000;
  let assistantAudioActive = true;
  const parameterCalls = [];
  const parameterValues = new Map();
  const core = {
    addParameterValueById(id, value, weight) {
      parameterCalls.push({ kind: "add", id, value, weight });
      parameterValues.set(id, (Number(parameterValues.get(id)) || 0) + Number(value || 0));
    },
    getParameterValueById(id) {
      return Number(parameterValues.get(id)) || 0;
    },
    setParameterValueById(id, value, weight) {
      parameterCalls.push({ kind: "set", id, value, weight });
      parameterValues.set(id, Number(value) || 0);
    }
  };
  const state = {
    expressionEnabled: true,
    expressionStrength: 1,
    currentTalkStyle: "playful",
    expressionStyle: "playful",
    uiView: "chat",
    model: { internalModel: { coreModel: core } },
    listeningPresencePhase: "hearing",
    listeningPresenceSession: 9,
    listeningPresenceRevision: 4,
    listeningPresenceLevel: 0.7
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeakingNow: () => assistantAudioActive,
    isSpeechMotionActive: () => false,
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "idle",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });

  const suppressedListening = controller.getListeningPresenceState(now);
  assert.strictEqual(
    suppressedListening.assistantAudioActive,
    true,
    "real assistant audio should suppress the listening pose even when a user-speech state is pending"
  );
  controller.applyListeningPresenceLayer(core, now, suppressedListening);
  assert.ok(
    parameterCalls.length === 0,
    "pending listening must not compete with an actually audible assistant turn"
  );

  assistantAudioActive = false;
  parameterCalls.length = 0;
  parameterValues.set("ParamMouthOpenY", 0.5);
  for (let i = 0; i < 12; i += 1) {
    now += 20;
    controller.applyStyleExpressionLayer();
    controller.updateMicroMotionLayer();
  }
  const listening = controller.getListeningPresenceState(now);
  assert.strictEqual(listening.effective, true, "the pending listening pose should appear after actual assistant audio stops");
  assert.ok(
    parameterCalls.some((call) => call.id === "ParamAngleZ"),
    "hearing should produce a readable head-tilt parameter layer"
  );
  assert.ok(
    parameterCalls.some((call) => call.id === "ParamEyeBallY"),
    "hearing should direct a restrained attentive eye focus"
  );
  assert.ok(
    Number(parameterValues.get("ParamMouthOpenY") || 0) < 0.02
      && state.speechMouthOpen === 0
      && state.speechMouthTarget === 0,
    "listening must explicitly keep the mouth closed"
  );
  assert.ok(
    !parameterCalls.some((call) => /^(ParamArm|ParamHand)/.test(call.id)),
    "listening must not dispatch arm or hand gestures"
  );
}

{
  let now = 3000;
  const state = {
    uiView: "model",
    listeningPresencePhase: "hearing",
    listeningPresenceSession: 12,
    listeningPresenceRevision: 7,
    _broadcastListeningUpdatedAt: Date.now(),
    _broadcastAssistantAudioActive: true,
    _broadcastSpeechUpdatedAt: 100
  };
  const controller = live2dExpressionController.createController({
    state,
    performanceObject: { now: () => now },
    isSpeakingNow: () => false,
    isSpeechMotionActive: () => false,
    sanitizeSpeakText: (text) => String(text || "").trim(),
    normalizeTalkStyle: (style) => String(style || "neutral").trim() || "neutral",
    detectMood: () => "idle",
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0))
  });
  const staleAudioPresence = controller.getListeningPresenceState(now);
  assert.strictEqual(
    staleAudioPresence.assistantAudioActive,
    false,
    "a detached model must not suppress listening forever after a stale assistant-audio bridge update"
  );
  assert.strictEqual(
    staleAudioPresence.effective,
    true,
    "a fresh listening heartbeat should recover the attentive pose when the old audio sender disappears"
  );
  state._broadcastSpeechUpdatedAt = now;
  const freshAudioPresence = controller.getListeningPresenceState(now + 20);
  assert.strictEqual(
    freshAudioPresence.assistantAudioActive,
    true,
    "a fresh detached audio update should still take priority over listening"
  );
}

{
  const previousUtterance = global.SpeechSynthesisUtterance;
  const hadUtterance = Object.prototype.hasOwnProperty.call(global, "SpeechSynthesisUtterance");
  const previousSetTimeout = global.setTimeout;
  let utterance = null;
  const animationCalls = [];
  const motionCalls = [];
  const playbackStarts = [];
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  global.SpeechSynthesisUtterance = FakeUtterance;
  global.setTimeout = () => 0;
  try {
    const state = {
      speakingEnabled: true,
      ttsPlaybackGeneration: 1,
      conversationLastTtsFinishedAt: 0,
      streamSpeakPlayedSession: 0
    };
    const controller = ttsPlaybackController.createController({
      state,
      windowObject: {
        speechSynthesis: {
          resume() {},
          cancel() {},
          speak(value) { utterance = value; }
        }
      },
      isCurrentTTSPlaybackGeneration: (generation) => generation === 1,
      buildSpeakProsody: () => ({}),
      beginSpeechAnimation(...args) { animationCalls.push(args); },
      triggerPerformanceCueMotion(...args) { motionCalls.push(args); }
    });
    const cue = { emotion: "happy", action: "wave", intensity: "high" };
    void controller.speakOnceWithVoice("hello", { name: "test", lang: "en-US" }, {
      force: true,
      playbackGeneration: 1,
      prosody: {},
      performanceCue: cue,
      sessionId: 44,
      onPlaybackStart: (event) => playbackStarts.push(event)
    });
    assert.ok(utterance, "browser TTS should create an utterance before playback starts");
    assert.strictEqual(animationCalls.length, 0, "browser TTS should not animate before the actual onstart event");
    assert.strictEqual(motionCalls.length, 0, "browser TTS should not dispatch a motion before the actual onstart event");
    assert.strictEqual(playbackStarts.length, 0, "browser TTS should not announce playback before onstart");
    utterance.onstart();
    assert.strictEqual(animationCalls.length, 1, "browser TTS should begin expression animation at onstart");
    assert.strictEqual(motionCalls.length, 1, "browser TTS should dispatch the performance motion at onstart");
    assert.strictEqual(motionCalls[0][0], cue, "browser TTS should preserve the selected cue for motion dispatch");
    assert.strictEqual(playbackStarts.length, 1, "browser TTS should announce actual playback at onstart");
    assert.strictEqual(playbackStarts[0].sessionId, 44, "browser playback callback should retain the stream session");
    assert.strictEqual(state.streamSpeakPlayedSession, 44, "browser fallback should satisfy the stream playback watchdog only after onstart");
    utterance.onend();
    assert.ok(
      state.conversationLastTtsFinishedAt > 0,
      "browser TTS completion should establish a delivery endpoint for low-interruption follow-ups"
    );
  } finally {
    global.setTimeout = previousSetTimeout;
    if (hadUtterance) {
      global.SpeechSynthesisUtterance = previousUtterance;
    } else {
      delete global.SpeechSynthesisUtterance;
    }
  }
}

{
  const previousAudio = global.Audio;
  const hadAudio = Object.prototype.hasOwnProperty.call(global, "Audio");
  const previousUrl = global.URL;
  const hadUrl = Object.prototype.hasOwnProperty.call(global, "URL");
  const animationCalls = [];
  const motionCalls = [];
  let playbackStarts = 0;
  class FakeAudio {
    constructor() {
      this.src = "";
      this.paused = true;
      this.ended = false;
      this.duration = 2;
      this.currentTime = 0;
    }
    play() {
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  global.Audio = FakeAudio;
  global.URL = {
    createObjectURL: () => "blob:performance-cue-test",
    revokeObjectURL() {}
  };
  try {
    const state = { ttsPlaybackGeneration: 7, ttsAudioPlaybackToken: 0 };
    const controller = ttsPlaybackController.createController({
      state,
      windowObject: {
        setTimeout: () => 1,
        clearTimeout() {},
        setInterval: () => 1,
        clearInterval() {}
      },
      performanceObject: { now: () => 1000 },
      isCurrentTTSPlaybackGeneration: (generation) => generation === state.ttsPlaybackGeneration,
      sanitizeSpeakText: (text) => String(text || "").trim(),
      detectMood: () => "happy",
      normalizeTalkStyle: (style) => String(style || "neutral"),
      ensureTTSAudioAnalyser: () => false,
      beginSpeechAnimation(...args) { animationCalls.push(args); },
      triggerPerformanceCueMotion(...args) { motionCalls.push(args); }
    });
    const cue = { emotion: "happy", action: "wave", intensity: "high" };
    void controller.playAudioBlob({ size: 1 }, {
      text: "hello",
      playbackGeneration: 7,
      performanceCue: cue,
      onPlaybackStart: () => { playbackStarts += 1; }
    });
    const audio = state.ttsAudio;
    assert.ok(audio instanceof FakeAudio, "server TTS should allocate the injected audio element");
    audio.onloadedmetadata();
    assert.strictEqual(animationCalls.length, 0, "server TTS metadata must not begin speech animation before audio playback");
    assert.strictEqual(motionCalls.length, 0, "server TTS metadata must not dispatch a motion before audio playback");
    assert.strictEqual(playbackStarts, 0, "server TTS must not announce playback before audio.onplay");
    audio.paused = false;
    audio.onplay();
    assert.strictEqual(animationCalls.length, 1, "server TTS should begin expression animation at audio.onplay");
    assert.strictEqual(motionCalls.length, 1, "server TTS should dispatch the performance motion at audio.onplay");
    assert.strictEqual(motionCalls[0][0], cue, "server TTS should preserve the selected cue for motion dispatch");
    assert.strictEqual(playbackStarts, 1, "server TTS should announce playback exactly at audio.onplay");
    audio.ended = true;
    audio.onended();
  } finally {
    if (hadAudio) {
      global.Audio = previousAudio;
    } else {
      delete global.Audio;
    }
    if (hadUrl) {
      global.URL = previousUrl;
    } else {
      delete global.URL;
    }
  }
}

{
  const channels = new Map();
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      const peers = channels.get(name) || [];
      peers.push(this);
      channels.set(name, peers);
    }
    postMessage(message) {
      const peers = channels.get(this.name) || [];
      for (const peer of peers) {
        if (peer !== this && typeof peer.onmessage === "function") {
          peer.onmessage({ data: message });
        }
      }
    }
  }
  const cue = cueController.buildPerformanceCue({
    replyText: "太好了！我们先这样！",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: { emotion: "happy", action: "wave", intensity: "high" }
  });
  const windowObject = {
    BroadcastChannel: FakeBroadcastChannel,
    setTimeout: () => 0,
    clearInterval: () => {}
  };
  const styleCalls = [];
  const modelState = {
    uiView: "model",
    expressionEnabled: true,
    model: {
      internalModel: {
        coreModel: {
          addParameterValueById(id, delta, weight) {
            styleCalls.push({ id, value: Number(delta) * Number(weight) });
          }
        }
      }
    }
  };
  let appliedCue = null;
  let motionCall = null;
  const modelStartup = appStartupController.createController({
    state: modelState,
    windowObject,
    performanceObject: { now: () => 2000 },
    applySpeechPerformanceCue(cueArg) {
      appliedCue = cueArg;
      modelState.speechPerformanceCue = cueArg;
      return cueArg;
    },
    tryBuiltInMotion(mood, opts = {}) {
      motionCall = { mood, opts };
      return Promise.resolve(true);
    }
  });
  modelStartup.startModelSpeechBroadcastListener();
  const chatState = {
    uiView: "chat",
    speechMouthOpen: 0.2,
    speechAnimMood: "happy",
    speechAnimStyle: "playful",
    currentTalkStyle: "playful",
    speechAnimUntil: 3200,
    speechAnimStartedAt: 1200,
    speechAnimDurationMs: 1800,
    ttsAudioLevel: 0,
    moodHoldUntil: 3500,
    speechPerformanceCue: cue
  };
  const chatStartup = appStartupController.createController({
    state: chatState,
    windowObject,
    requestAnimationFrame: () => 0,
    isSpeechMotionActive: () => false,
    getSpeechAnimationMouthOpen: () => 0.2
  });
  chatStartup.startChatSpeechBroadcastLoop();
  assert.deepStrictEqual(appliedCue, cue, "desktop speech broadcast should carry the performance cue to the model page");
  assert.deepStrictEqual(modelState.speechPerformanceCue, cue, "model page should apply broadcast performance cue");
  assert.strictEqual(modelState.speechAnimStyle, "playful", "model speech cadence should inherit the chat renderer's actual style");
  assert.strictEqual(modelState.currentTalkStyle, "playful", "model expression/body style should inherit the delivered talk style");
  const styleExpression = live2dExpressionController.createController({
    state: modelState,
    performanceObject: { now: () => 2000 },
    isSpeechMotionActive: () => true,
    styleExpressionProfile: {
      neutral: { mouthForm: 0, cheek: 0, eyeSmile: 0, browY: 0, browAngle: 0, headX: 0, headY: 0, bodyX: 0, floatScale: 1 },
      playful: { mouthForm: 0.7, cheek: 0.3, eyeSmile: 0.4, browY: 0, browAngle: 0, headX: 0, headY: 0, bodyX: 0, floatScale: 1 }
    }
  });
  styleExpression.applyStyleExpressionLayer();
  assert.ok(
    styleCalls.some((call) => call.id === "ParamMouthForm" && call.value > 0),
    "the bridged playful style should reach the existing model expression layer"
  );
  assert.strictEqual(motionCall, null, "model page should wait for actual speech playback before dispatching a cue motion");
  const playbackChannel = new FakeBroadcastChannel("taffy-speech");
  const bridgeNow = Date.now();
  playbackChannel.postMessage({
    type: "speech",
    speechBridgeVersion: 2,
    speechSenderId: modelState._broadcastSpeechSenderId,
    speechRevision: Number(modelState._broadcastSpeechRevision || 0) + 1,
    speechSentAtWallMs: bridgeNow,
    mouthOpen: 0.2,
    mood: "happy",
    speaking: true,
    speechExpiresAtEpochMs: bridgeNow + 1200,
    speechStartedAtEpochMs: bridgeNow - 200,
    animDurationMs: 1800,
    moodHoldExpiresAtEpochMs: bridgeNow + 900,
    performanceCueExpiresAtEpochMs: bridgeNow + 1100,
    performanceCue: cue
  });
  assert.strictEqual(motionCall?.mood, "happy", "model page should trigger a visible built-in motion for high happy cue");
  assert.ok(
    Array.isArray(motionCall?.opts?.groups) && motionCall.opts.groups[0] === "EmotionHappy",
    "high happy cue should prefer the deterministic authored Hiyori motion group"
  );
  assert.strictEqual(motionCall?.opts?.authoredMotion?.file, "hiyori_m06.motion3.json", "split model window should retain authored motion metadata");
}

{
  const channels = new Map();
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      const peers = channels.get(name) || [];
      peers.push(this);
      channels.set(name, peers);
    }
    postMessage(message) {
      const peers = channels.get(this.name) || [];
      for (const peer of peers) {
        if (peer !== this && typeof peer.onmessage === "function") {
          peer.onmessage({ data: message });
        }
      }
    }
  }
  const cue = cueController.buildPerformanceCue({
    replyText: "不行，这样会把体验弄坏。",
    mood: "idle",
    talkStyle: "neutral",
    runtimeMetadata: { emotion: "angry", action: "shake_head", intensity: "high" }
  });
  const windowObject = {
    BroadcastChannel: FakeBroadcastChannel,
    setTimeout: () => 0,
    clearInterval: () => {}
  };
  const modelState = { uiView: "model" };
  let motionCall = null;
  const modelStartup = appStartupController.createController({
    state: modelState,
    windowObject,
    performanceObject: { now: () => 3000 },
    applySpeechPerformanceCue(cueArg) {
      modelState.speechPerformanceCue = cueArg;
      return cueArg;
    },
    tryBuiltInMotion(mood, opts = {}) {
      motionCall = { mood, opts };
      return Promise.resolve(true);
    }
  });
  modelStartup.startModelSpeechBroadcastListener();
  const chatState = {
    uiView: "chat",
    speechMouthOpen: 0.2,
    speechAnimMood: "angry",
    speechAnimUntil: 4200,
    speechAnimStartedAt: 2200,
    speechAnimDurationMs: 1800,
    ttsAudioLevel: 0,
    moodHoldUntil: 4500,
    speechPerformanceCue: cue
  };
  const chatStartup = appStartupController.createController({
    state: chatState,
    windowObject,
    requestAnimationFrame: () => 0,
    isSpeechMotionActive: () => true,
    getSpeechAnimationMouthOpen: () => 0.2
  });
  chatStartup.startChatSpeechBroadcastLoop();
  assert.strictEqual(motionCall?.mood, "angry", "model page should trigger a visible built-in motion for high angry cue");
  assert.deepStrictEqual(
    motionCall?.opts?.groups,
    ["Flick@Body", "Flick", "FlickDown"],
    "explicit shake-head cue should use its action-specific body and head motion order"
  );
  assert.strictEqual(
    motionCall?.opts?.preserveGroupOrder,
    true,
    "performance cue motions should preserve the explicit emotion-group order"
  );
}

{
  const channels = new Map();
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      const peers = channels.get(name) || [];
      peers.push(this);
      channels.set(name, peers);
    }
    postMessage(message) {
      const peers = channels.get(this.name) || [];
      for (const peer of peers) {
        if (peer !== this && typeof peer.onmessage === "function") {
          peer.onmessage({ data: message });
        }
      }
    }
  }
  const cue = cueController.buildPerformanceCue({
    replyText: "等一下，我认真想想这里的关系。",
    mood: "idle",
    talkStyle: "clear",
    runtimeMetadata: { emotion: "neutral", action: "think", intensity: "medium" }
  });
  const windowObject = {
    BroadcastChannel: FakeBroadcastChannel,
    setTimeout: () => 0,
    clearInterval: () => {}
  };
  const modelState = { uiView: "model" };
  let motionCall = null;
  const modelStartup = appStartupController.createController({
    state: modelState,
    windowObject,
    performanceObject: { now: () => 3000 },
    applySpeechPerformanceCue(cueArg) {
      modelState.speechPerformanceCue = cueArg;
      return cueArg;
    },
    tryBuiltInMotion(mood, opts = {}) {
      motionCall = { mood, opts };
      return Promise.resolve(true);
    }
  });
  modelStartup.startModelSpeechBroadcastListener();
  const chatState = {
    uiView: "chat",
    speechMouthOpen: 0.2,
    speechAnimMood: "idle",
    speechAnimUntil: 4200,
    speechAnimStartedAt: 2200,
    speechAnimDurationMs: 1800,
    ttsAudioLevel: 0,
    moodHoldUntil: 4500,
    speechPerformanceCue: cue
  };
  const chatStartup = appStartupController.createController({
    state: chatState,
    windowObject,
    requestAnimationFrame: () => 0,
    isSpeechMotionActive: () => true,
    getSpeechAnimationMouthOpen: () => 0.2
  });
  chatStartup.startChatSpeechBroadcastLoop();
  assert.strictEqual(motionCall?.mood, "idle", "explicit think should retain the cue's neutral presentation mood");
  assert.deepStrictEqual(
    motionCall?.opts?.groups,
    ["Thinking", "Tap@Body", "Flick@Body", "FlickDown"],
    "explicit think should prioritize the dedicated thinking motion before generic body/arm fallbacks"
  );
  assert.strictEqual(
    motionCall?.opts?.preserveGroupOrder,
    true,
    "explicit think should preserve the explicit body/arm motion priority even after another motion"
  );
}

{
  const channels = new Map();
  const sent = [];
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      const peers = channels.get(name) || [];
      peers.push(this);
      channels.set(name, peers);
    }
    postMessage(message) {
      sent.push(message);
      const peers = channels.get(this.name) || [];
      for (const peer of peers) {
        if (peer !== this && typeof peer.onmessage === "function") {
          peer.onmessage({ data: message });
        }
      }
    }
    close() {}
  }
  const timers = [];
  const windowObject = {
    BroadcastChannel: FakeBroadcastChannel,
    setTimeout(fn, ms) {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeout() {}
  };
  const modelState = { uiView: "model", listeningPresenceRevision: 0, listeningPresenceSession: 0 };
  const modelStartup = appStartupController.createController({
    state: modelState,
    windowObject,
    performanceObject: { now: () => 5000 }
  });
  modelStartup.startModelSpeechBroadcastListener();
  const chatState = {
    uiView: "chat",
    listeningPresencePhase: "armed",
    listeningPresenceSession: 17,
    listeningPresenceRevision: 4,
    speechAnimUntil: 0,
    speechMouthOpen: 0,
    ttsAudioLevel: 0
  };
  const chatStartup = appStartupController.createController({
    state: chatState,
    windowObject,
    performanceObject: { now: () => 5100 },
    requestAnimationFrame: () => 0,
    isSpeechMotionActive: () => false,
    isSpeakingNow: () => false,
    getSpeechAnimationMouthOpen: () => 0
  });
  chatStartup.startChatSpeechBroadcastLoop();
  assert.strictEqual(modelState.listeningPresencePhase, "armed", "model view should mirror the compact listening phase");
  assert.strictEqual(modelState.listeningPresenceSession, 17, "model view should retain the active listening session only");
  assert.strictEqual(modelState.listeningPresenceRevision, 4, "model view should retain the newest listening revision");
  assert.strictEqual(chatState._speechBroadcastScheduleKind, "listening", "quiet listening should use a rate-limited bridge timer instead of animation-frame IPC");
  const presencePayload = sent.find((item) => item?.listening?.sessionId === 17);
  assert.deepStrictEqual(
    Object.keys(presencePayload.listening).sort(),
    ["phase", "revision", "sessionId", "version"],
    "detached listening sync must contain only compact state, never transcript or audio data"
  );
  const staleSender = new FakeBroadcastChannel("taffy-speech");
  staleSender.postMessage({
    type: "speech",
    speaking: false,
    assistantAudioActive: false,
    listening: { version: 1, sessionId: 0, revision: 3, phase: "idle" }
  });
  assert.strictEqual(modelState.listeningPresencePhase, "armed", "an older listening revision must not erase a newer model-view state");
  chatStartup.stopChatSpeechBroadcastLoop();
  assert.strictEqual(modelState.listeningPresencePhase, "idle", "closing the chat bridge should explicitly release the detached listening pose");
}

if (fs.existsSync(MOTION_RUNTIME_CONTROLLER_JS)) {
  const motionRuntimeSource = fs.readFileSync(MOTION_RUNTIME_CONTROLLER_JS, "utf8");
  assert.ok(
    motionRuntimeSource.includes("preserveGroupOrder"),
    "motion runtime should support preserving explicit performance-cue motion order"
  );
}

if (fs.existsSync(INDEX_HTML)) {
  const indexSource = fs.readFileSync(INDEX_HTML, "utf8");
  const perfCueScript = '<script src="./performanceCueController.js"></script>';
  const timelineScript = '<script src="./performanceTimelineController.js"></script>';
  const overlayScript = '<script src="./hiyoriEmotionOverlayController.js"></script>';
  assert.ok(indexSource.includes(perfCueScript), "index should load performance cue controller");
  assert.ok(
    indexSource.indexOf(perfCueScript) < indexSource.indexOf(timelineScript),
    "performance cue controller should load before performance timeline"
  );
  assert.ok(indexSource.includes('id="thinking-cue-bubble"'), "index should include a thinking cue bubble overlay");
  assert.ok(indexSource.includes('id="live2d-emotion-overlay-layer"'), "model page should include the Hiyori emotion overlay host");
  assert.ok(
    indexSource.indexOf(overlayScript) > indexSource.indexOf(perfCueScript),
    "Hiyori overlay controller should load after performance cue code exists"
  );
  assert.ok(
    indexSource.indexOf(overlayScript) < indexSource.indexOf("./live2dExpressionController.js"),
    "Hiyori overlay controller should load before Live2D expression controller"
  );
}

if (fs.existsSync(DESKTOP_CSS)) {
  const desktopSource = fs.readFileSync(DESKTOP_CSS, "utf8");
  assert.ok(desktopSource.includes(".thinking-cue-bubble"), "desktop css should style the thinking cue bubble");
  assert.ok(desktopSource.includes(".thinking-cue-bubble.is-visible"), "desktop css should define a visible thinking cue bubble state");
  assert.ok(desktopSource.includes("thinking-cue-jitter"), "desktop css should give the thinking bubble a short jitter accent");
  assert.ok(desktopSource.includes(".live2d-emotion-overlay-layer"), "desktop CSS should style the emotion overlay host");
  assert.ok(desktopSource.includes("pointer-events: none"), "emotion overlay CSS should keep the layer non-interactive");
  assert.ok(desktopSource.includes(".hiyori-emotion-overlay-asset.thinking-focus-lines"), "desktop CSS should animate the thinking focus-line asset");
  assert.ok(desktopSource.includes(".hiyori-emotion-overlay-asset.angry-impact-lines"), "desktop CSS should animate the angry impact-line asset");
  assert.ok(desktopSource.includes(".hiyori-emotion-overlay-asset.surprised-spark"), "desktop CSS should animate the surprised spark asset");
}

if (fs.existsSync(CHAT_JS)) {
  const source = fs.readFileSync(CHAT_JS, "utf8");
  assert.ok(source.includes("const PERFORMANCE_CUE_CONTROLLER = window.TaffyPerformanceCueController"), "chat.js should reference the cue controller global");
  assert.ok(source.includes("TaffyHiyoriEmotionOverlayController"), "chat should pass the Hiyori overlay controller into Live2D expression deps");
  assert.ok(source.includes("function buildPerformanceCue("), "chat.js should expose buildPerformanceCue wrapper");
  assert.ok(source.includes("function resolvePerformanceCueMotionPlan("), "chat.js should reuse the shared performance cue motion resolver");
  assert.ok(source.includes("function triggerPerformanceCueMotion("), "chat.js should dispatch full-view performance motions at actual speech start");
  assert.ok(source.includes("function applySpeechPerformanceCue("), "chat.js should expose Live2D cue wrapper");
  assert.ok(source.includes("applySpeechPerformanceCue,\n      resolvePerformanceCueMotionPlan,\n      tryBuiltInMotion,\n      bindRuntimeEvents"), "app startup controller should receive the shared cue-motion resolver");
}

if (fs.existsSync(CHAT_REPLY_CONTROLLER_JS)) {
  const source = fs.readFileSync(CHAT_REPLY_CONTROLLER_JS, "utf8");
  assert.ok(source.includes("const buildPerformanceCue ="), "chat reply controller should accept cue builder dependency");
  assert.ok(source.includes("const triggerPerformanceCueMotion ="), "chat reply controller should support text-only performance motions");
  assert.ok(source.includes("const performanceCue = buildPerformanceCue({"), "chat reply controller should build a cue for each visible reply");
  assert.ok(source.includes("const useSilentPerformanceCue = state.speakingEnabled === false"), "chat reply controller should preserve visual performance for text-only replies");
  assert.ok(source.includes('recordPerformanceAuditEvent("performance_cue"'), "chat reply controller should audit the cue");
  assert.ok(source.includes("performanceCue: performanceCue || null"), "chat reply controller should pass the cue into speech");
}

if (fs.existsSync(LIVE2D_EXPRESSION_CONTROLLER_JS)) {
  const source = fs.readFileSync(LIVE2D_EXPRESSION_CONTROLLER_JS, "utf8");
  assert.ok(source.includes("function applySpeechPerformanceCue("), "Live2D expression controller should expose cue application");
  assert.ok(source.includes("function applySpeechPerformanceAccent("), "Live2D expression controller should include a visible cue accent layer");
  assert.ok(source.includes("hiyoriEmotionOverlayController"), "Live2D expression controller should accept the Hiyori overlay dependency");
  assert.ok(source.includes("opts.performanceCue"), "beginSpeechAnimation should accept cue options");
  assert.ok(
    source.includes('normalized.motionOwnership = "semantic"'),
    "verified Hiyori semantic actions should claim motion ownership and keep cooldown rejections authoritative"
  );
}

if (fs.existsSync(TTS_PLAYBACK_CONTROLLER_JS)) {
  const source = fs.readFileSync(TTS_PLAYBACK_CONTROLLER_JS, "utf8");
  assert.ok(
    source.includes('appliedPerformanceCue?.motionOwnership !== "semantic"'),
    "actual playback should not stack a fixed Cubism motion over a Hiyori-owned semantic action"
  );
  assert.ok(source.includes("performanceCue: opts.performanceCue || null"), "TTS playback should carry cue options");
  assert.ok(source.includes("performanceCue: speechPerformanceCue"), "audio playback should pass cue into beginSpeechAnimation");
  assert.ok(source.includes("function beginSpeechPerformance("), "TTS playback should centralize actual-start expression and motion dispatch");
}

console.log("Performance cue frontend checks passed.");
