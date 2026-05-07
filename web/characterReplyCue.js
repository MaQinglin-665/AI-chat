(function (root) {
  "use strict";

  function localizeValue(kind, value) {
    const tuning = root.TaffyCharacterTuning || {};
    if (typeof tuning.localizeValue === "function") {
      return tuning.localizeValue(kind, value);
    }
    const key = String(value || "").trim().toLowerCase();
    if (!key) {
      return "未定";
    }
    const maps = {
      emotion: {
        neutral: "平静",
        idle: "待机",
        happy: "开心",
        playful: "调皮",
        thinking: "思考",
        surprised: "惊讶",
        sad: "低落",
        anxious: "紧张",
        angry: "生气",
        annoyed: "小不爽"
      },
      action: {
        none: "轻待机",
        nod: "点头",
        think: "思考动作",
        happy_idle: "开心待机",
        wave: "挥手",
        shake_head: "摇头",
        surprised: "惊讶动作"
      },
      voice: {
        neutral: "自然声线",
        soft: "轻柔声线",
        warm: "温暖声线",
        cheerful: "明亮声线",
        teasing: "调皮声线",
        serious: "认真声线",
        curious: "好奇声线"
      }
    };
    return maps[kind]?.[key] || key.replace(/_/g, " ");
  }

  function buildReplyCharacterChipView(candidate = null, autoApply = null) {
    const safeCandidate = candidate && typeof candidate === "object" ? candidate : null;
    const safeAutoApply = autoApply && typeof autoApply === "object" ? autoApply : null;
    if (!safeCandidate) {
      return {
        text: "上一句角色表现 · 待回复",
        title: "发送一条消息后，这里会显示上一句回复触发的情绪、动作和语音风格。",
        tone: "waiting"
      };
    }
    const runtimeHint = safeAutoApply?.runtimeHint && typeof safeAutoApply.runtimeHint === "object"
      ? safeAutoApply.runtimeHint
      : (safeCandidate.runtimeHint || {});
    const emotion = localizeValue("emotion", runtimeHint.emotion || safeCandidate.mood || "neutral");
    const action = localizeValue("action", runtimeHint.action || "none");
    const voice = localizeValue("voice", safeAutoApply?.voiceStyle || runtimeHint.voice_style || "neutral");
    const applied = safeAutoApply?.applied === true;
    const reason = String(safeAutoApply?.reason || "").trim();
    const statusText = applied
      ? "已应用"
      : reason === "disabled"
        ? "仅预览"
        : reason
          ? "未应用"
          : "候选已生成";
    const tone = applied ? "applied" : (reason === "disabled" ? "blocked" : "waiting");
    const preview = String(safeCandidate.textPreview || "").trim();
    const title = [
      `情绪：${emotion}`,
      `动作：${action}`,
      `语音：${voice}`,
      `状态：${statusText}${reason && !applied ? `（${reason}）` : ""}`,
      preview ? `回复片段：${preview}` : ""
    ].filter(Boolean).join("\n");
    return {
      text: `上一句：${emotion} / ${action} / ${voice} · ${statusText}`,
      title,
      tone
    };
  }

  function buildFollowupCharacterRuntimeHint(input = {}) {
    const tone = String(input.tone || "idle");
    const label = String(input.label || "");
    const map = {
      ready: { emotion: "thinking", action: "think", intensity: "low", voice_style: "soft" },
      waiting: { emotion: "thinking", action: "none", intensity: "low", voice_style: "soft" },
      watching: { emotion: "thinking", action: "none", intensity: "low", voice_style: "neutral" },
      cooldown: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" },
      limit: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" },
      quiet: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" },
      idle: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" }
    };
    return {
      ...(map[tone] || map.idle),
      live2d_hint: tone,
      source: "followup_character_state",
      label
    };
  }

  const GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS = {
    auto: {
      label: "\u5f53\u524d\u9884\u89c8",
      tone: "auto",
      description: "\u4f7f\u7528\u5f53\u524d\u7eed\u8bdd\u9884\u89c8\u63a8\u5bfc\u7684\u89d2\u8272 cue",
      runtimeHint: null
    },
    happy_wave: {
      label: "\u5f00\u5fc3\u6325\u624b",
      tone: "ready",
      description: "\u624b\u52a8\u6d4b\u8bd5\u53cb\u597d\u6253\u62db\u547c",
      runtimeHint: { emotion: "happy", action: "wave", intensity: "normal", voice_style: "cheerful", live2d_hint: "happy" }
    },
    thinking: {
      label: "\u601d\u8003\u4e00\u4e0b",
      tone: "watching",
      description: "\u624b\u52a8\u6d4b\u8bd5\u601d\u8003\u72b6\u6001",
      runtimeHint: { emotion: "thinking", action: "think", intensity: "low", voice_style: "neutral", live2d_hint: "thinking" }
    },
    surprised: {
      label: "\u8f7b\u5fae\u60ca\u8bb6",
      tone: "ready",
      description: "\u624b\u52a8\u6d4b\u8bd5\u60ca\u8bb6\u53cd\u5e94",
      runtimeHint: { emotion: "surprised", action: "surprised", intensity: "normal", voice_style: "cheerful", live2d_hint: "surprised" }
    },
    calm_idle: {
      label: "\u5b89\u9759\u5f85\u673a",
      tone: "quiet",
      description: "\u624b\u52a8\u6d4b\u8bd5\u4f4e\u6253\u6270\u5f85\u673a",
      runtimeHint: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral", live2d_hint: "idle" }
    }
  };

  function normalizeGrayAutoTrialCharacterCuePresetKey(value) {
    const key = String(value || "auto").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS, key) ? key : "auto";
  }

  function listGrayAutoTrialCharacterCuePresets() {
    return Object.entries(GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS).map(([key, preset]) => ({
      key,
      label: String(preset.label || key),
      tone: String(preset.tone || ""),
      description: String(preset.description || "")
    }));
  }

  function resolveGrayAutoTrialCharacterCuePreset(input = {}, checklist = null) {
    const safeInput = input && typeof input === "object" ? input : {};
    const safeChecklist = checklist && typeof checklist === "object" ? checklist : {};
    const key = normalizeGrayAutoTrialCharacterCuePresetKey(safeInput.presetKey || safeInput.preset || safeInput.cuePreset);
    const preset = GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS[key] || GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS.auto;
    const runtimeHint = preset.runtimeHint && typeof preset.runtimeHint === "object"
      ? { ...preset.runtimeHint }
      : { ...(safeChecklist.runtimeHint || {}) };
    return {
      key,
      label: key === "auto" ? String(safeChecklist.label || preset.label || "") : String(preset.label || key),
      tone: key === "auto" ? String(safeChecklist.tone || preset.tone || "") : String(preset.tone || ""),
      description: String(preset.description || ""),
      runtimeHint
    };
  }

  function buildAssistantReplyCharacterExpressionCue(input = {}) {
    const safe = input && typeof input === "object" ? input : {};
    const text = String(safe.text || "").trim();
    const lower = text.toLowerCase();
    const mood = String(safe.mood || "idle").trim().toLowerCase();
    const style = String(safe.style || "neutral").trim().toLowerCase();
    const tone = String(safe.tone || "idle").trim().toLowerCase();
    const hasQuestion = lower.includes("?") || text.includes("\uff1f");
    const hasExclaim = lower.includes("!") || text.includes("\uff01");
    if (mood === "surprised" || hasQuestion) {
      return {
        reason: "question_or_surprise",
        runtimeHint: { emotion: "thinking", action: "think", intensity: "low", voice_style: "curious", live2d_hint: "thinking" }
      };
    }
    if (mood === "happy" || mood === "playful" || style === "playful" || hasExclaim) {
      return {
        reason: "warm_or_playful",
        runtimeHint: { emotion: "happy", action: "happy_idle", intensity: "normal", voice_style: "cheerful", live2d_hint: "happy" }
      };
    }
    if (mood === "sad" || mood === "anxious") {
      return {
        reason: "soft_low_interrupt",
        runtimeHint: { emotion: mood === "anxious" ? "anxious" : "sad", action: "none", intensity: "low", voice_style: "soft", live2d_hint: "quiet" }
      };
    }
    if (mood === "angry" || mood === "annoyed") {
      return {
        reason: "restrained_negative",
        runtimeHint: { emotion: mood, action: "none", intensity: "low", voice_style: "neutral", live2d_hint: "quiet" }
      };
    }
    if (tone === "cooldown" || style === "brief" || safe.auto === true) {
      return {
        reason: "cooldown",
        runtimeHint: { emotion: "neutral", action: "nod", intensity: "low", voice_style: "neutral", live2d_hint: "cooldown" }
      };
    }
    if (tone === "watching") {
      return {
        reason: "watching",
        runtimeHint: { emotion: "thinking", action: "think", intensity: "low", voice_style: "neutral", live2d_hint: "thinking" }
      };
    }
    return {
      reason: "neutral_idle",
      runtimeHint: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral", live2d_hint: "idle" }
    };
  }

  function buildAssistantReplyCharacterCueCandidate(input = {}, options = {}) {
    const safe = input && typeof input === "object" ? input : {};
    const normalizeMetadata = typeof options.normalizeMetadata === "function"
      ? options.normalizeMetadata
      : (metadata) => metadata;
    const now = typeof options.now === "function" ? options.now : Date.now;
    const text = String(safe.text || "").trim();
    const mood = String(safe.mood || "idle").trim().toLowerCase();
    const style = String(safe.style || "neutral").trim().toLowerCase();
    const auto = safe.auto === true;
    const lower = text.toLowerCase();
    let tone = "idle";
    if (mood === "happy" || /[!！]$/.test(text)) {
      tone = "ready";
    } else if (mood === "surprised" || lower.includes("?") || text.includes("？")) {
      tone = "watching";
    } else if (mood === "sad" || mood === "anxious") {
      tone = "quiet";
    } else if (style === "playful") {
      tone = "ready";
    } else if (style === "brief" || auto) {
      tone = "cooldown";
    }
    const expressionCue = buildAssistantReplyCharacterExpressionCue({
      text,
      mood,
      style,
      auto,
      tone
    });
    const runtimeHint = normalizeMetadata(expressionCue.runtimeHint);
    return {
      readOnly: true,
      source: "assistant_reply",
      generatedAt: now(),
      eligibleForManualSend: !!runtimeHint,
      autoTriggered: false,
      auto,
      mood,
      style,
      tone,
      expressionReason: expressionCue.reason,
      textPreview: text.slice(0, 80),
      runtimeHint,
      safety: {
        noRuntimeCueEmission: true,
        noLive2DMove: true,
        noTts: true,
        noSchedulerChange: true,
        noFollowupExecution: true,
        noConfigWrites: true
      }
    };
  }

  function normalizeRuntimeVoiceStyle(style) {
    const key = String(style || "neutral").trim().toLowerCase().replace(/-/g, "_");
    const aliases = {
      happy: "cheerful",
      playful: "teasing",
      sad: "soft",
      anxious: "soft",
      angry: "serious",
      annoyed: "serious",
      thinking: "curious",
      comfort: "warm",
      clear: "curious",
      steady: "serious"
    };
    const normalized = aliases[key] || key;
    if (["neutral", "soft", "cheerful", "teasing", "serious", "curious", "warm"].includes(normalized)) {
      return normalized;
    }
    return "neutral";
  }

  function runtimeVoiceStyleToTalkStyle(style, fallback = "neutral", normalizeTalkStyle = null) {
    const voiceStyle = normalizeRuntimeVoiceStyle(style);
    const fallbackStyle = typeof normalizeTalkStyle === "function"
      ? normalizeTalkStyle(fallback)
      : String(fallback || "neutral").trim().toLowerCase();
    if (voiceStyle === "soft" || voiceStyle === "warm") {
      return "comfort";
    }
    if (voiceStyle === "cheerful" || voiceStyle === "teasing") {
      return "playful";
    }
    if (voiceStyle === "serious") {
      return "steady";
    }
    if (voiceStyle === "curious") {
      return "clear";
    }
    return fallbackStyle;
  }

  const api = {
    GRAY_AUTO_TRIAL_CHARACTER_CUE_PRESETS,
    localizeValue,
    buildReplyCharacterChipView,
    buildFollowupCharacterRuntimeHint,
    normalizeGrayAutoTrialCharacterCuePresetKey,
    listGrayAutoTrialCharacterCuePresets,
    resolveGrayAutoTrialCharacterCuePreset,
    buildAssistantReplyCharacterExpressionCue,
    buildAssistantReplyCharacterCueCandidate,
    normalizeRuntimeVoiceStyle,
    runtimeVoiceStyleToTalkStyle
  };

  root.TaffyCharacterReplyCue = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
