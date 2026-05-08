(function (root) {
  "use strict";

  function getSpeechText(deps = {}) {
    return deps.speechText || root.TaffyModules?.speechText || {};
  }

  function hashText(text) {
    const src = String(text || "");
    let hash = 0;
    for (let i = 0; i < src.length; i += 1) {
      hash = (hash * 131 + src.charCodeAt(i)) % 2147483647;
    }
    return Math.abs(hash);
  }

  function pickByHash(seedText, options) {
    if (!Array.isArray(options) || options.length === 0) {
      return "";
    }
    const idx = hashText(seedText) % options.length;
    return String(options[idx] || "");
  }

  function insertNaturalPause(seg, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.insertNaturalPause === "function") {
      return speechText.insertNaturalPause(seg);
    }
    return String(seg || "").trim();
  }

  function colloquializeSpeakText(text, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.colloquializeSpeakText === "function") {
      return speechText.colloquializeSpeakText(text);
    }
    return String(text || "").trim();
  }

  function simplifySpeechDeliveryText(text, style = "neutral", streamMode = false, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.simplifySpeechDeliveryText === "function") {
      return speechText.simplifySpeechDeliveryText(text, style, streamMode);
    }
    return String(text || "").trim();
  }

  function tightenMinorSpeechPauses(text, streamMode = false, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.tightenMinorSpeechPauses === "function") {
      return speechText.tightenMinorSpeechPauses(text, streamMode);
    }
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeTalkStyle(style) {
    const s = String(style || "neutral").trim().toLowerCase();
    if (["neutral", "comfort", "clear", "playful", "steady"].includes(s)) {
      return s;
    }
    return "neutral";
  }

  function inferContextStyle(userText = "", assistantText = "", mood = "idle", isAuto = false) {
    const src = (String(userText || "") + "\n" + String(assistantText || "")).toLowerCase();
    const score = {
      comfort: 0,
      clear: 0,
      playful: 0,
      steady: 0
    };

    if (/(难过|伤心|焦虑|崩溃|压力|失眠|委屈|心累|痛苦|失落|难受|不舒服)/.test(src)) {
      score.comfort += 5;
    }
    if (/(报错|错误|bug|代码|修复|排查|步骤|教程|配置|接口|api|命令|运行|性能|延迟|怎么做|如何)/.test(src)) {
      score.clear += 5;
    }
    if (/(紧急|立刻|马上|严谨|认真|上线|故障|事故|必须|优先)/.test(src)) {
      score.steady += 4;
    }
    if (/(哈哈|好耶|太棒|开心|可爱|有趣|聊聊|玩|轻松|摸鱼|wow|lol|233)/.test(src)) {
      score.playful += 4;
    }

    if (/[?？]/.test(src)) {
      score.clear += 1;
    }
    if (/[!！]/.test(src)) {
      score.playful += 1;
    }
    if (mood === "happy" || mood === "surprised") {
      score.playful += 2;
    }
    if (mood === "sad") {
      score.comfort += 2;
    }
    if (mood === "angry") {
      score.steady += 2;
    }
    if (isAuto) {
      score.playful += 1;
    }

    let bestStyle = "neutral";
    let bestScore = 0;
    for (const [style, v] of Object.entries(score)) {
      if (v > bestScore) {
        bestStyle = style;
        bestScore = v;
      }
    }
    return bestScore > 0 ? bestStyle : "neutral";
  }

  function resolveTalkStyle(userText = "", assistantText = "", mood = "idle", isAuto = false, deps = {}) {
    const state = deps.state || {};
    if (state.styleAutoEnabled) {
      return inferContextStyle(userText, assistantText, mood, isAuto);
    }
    return normalizeTalkStyle(state.manualTalkStyle);
  }

  function buildSpeechDeliveryText(text, mood = "idle", style = "neutral", streamMode = false, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.buildSpeechDeliveryText === "function") {
      return speechText.buildSpeechDeliveryText(text, mood, style, streamMode);
    }
    return typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText(text) : String(text || "").trim();
  }

  function buildStableSpeakText(text, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.buildStableSpeakText === "function") {
      return speechText.buildStableSpeakText(text);
    }
    return typeof deps.sanitizeSpeakText === "function" ? deps.sanitizeSpeakText(text) : String(text || "").trim();
  }

  function splitStreamSpeakSegments(buffer, flush = false, deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.splitStreamSpeakSegments === "function") {
      const state = deps.state || {};
      return speechText.splitStreamSpeakSegments(buffer, {
        flush,
        style: state.currentTalkStyle || "neutral",
        provider: state.ttsProvider || ""
      });
    }
    return { segments: [], rest: String(buffer || "") };
  }

  function textJitter(text, scale = 0.02) {
    const src = String(text || "");
    if (!src) {
      return 0;
    }
    let hash = 0;
    for (let i = 0; i < src.length; i += 1) {
      hash = (hash * 131 + src.charCodeAt(i)) % 1000003;
    }
    const normalized = ((hash % 1000) / 999) * 2 - 1;
    return normalized * scale;
  }

  function buildSpeakProsody(text, mood, streamMode = false, style = "neutral", deps = {}) {
    const speechText = getSpeechText(deps);
    if (typeof speechText.buildSpeakProsody === "function") {
      return speechText.buildSpeakProsody(text, mood, streamMode, style);
    }
    return {
      speed_ratio: 1,
      pitch_ratio: 1,
      volume_ratio: 1,
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%"
    };
  }

  function createController(deps = {}) {
    return {
      hashText,
      pickByHash,
      insertNaturalPause: (seg) => insertNaturalPause(seg, deps),
      colloquializeSpeakText: (text) => colloquializeSpeakText(text, deps),
      simplifySpeechDeliveryText: (text, style = "neutral", streamMode = false) => simplifySpeechDeliveryText(text, style, streamMode, deps),
      tightenMinorSpeechPauses: (text, streamMode = false) => tightenMinorSpeechPauses(text, streamMode, deps),
      normalizeTalkStyle,
      inferContextStyle,
      resolveTalkStyle: (userText = "", assistantText = "", mood = "idle", isAuto = false) => resolveTalkStyle(userText, assistantText, mood, isAuto, deps),
      buildSpeechDeliveryText: (text, mood = "idle", style = "neutral", streamMode = false) => buildSpeechDeliveryText(text, mood, style, streamMode, deps),
      buildStableSpeakText: (text) => buildStableSpeakText(text, deps),
      splitStreamSpeakSegments: (buffer, flush = false) => splitStreamSpeakSegments(buffer, flush, deps),
      textJitter,
      buildSpeakProsody: (text, mood, streamMode = false, style = "neutral") => buildSpeakProsody(text, mood, streamMode, style, deps)
    };
  }

  const api = {
    createController,
    hashText,
    pickByHash,
    insertNaturalPause,
    colloquializeSpeakText,
    simplifySpeechDeliveryText,
    tightenMinorSpeechPauses,
    normalizeTalkStyle,
    inferContextStyle,
    resolveTalkStyle,
    buildSpeechDeliveryText,
    buildStableSpeakText,
    splitStreamSpeakSegments,
    textJitter,
    buildSpeakProsody
  };

  root.TaffySpeechStyleController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
