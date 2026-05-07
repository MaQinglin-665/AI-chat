(function (root) {
  "use strict";

  const CHARACTER_REHEARSAL_PRESETS = [
    {
      label: "开心",
      sample: "好，开心模式上线！我会更轻快一点，但不会吵你。",
      mood: "happy",
      style: "playful",
      runtimeHint: { emotion: "happy", action: "happy_idle", intensity: "normal", voice_style: "cheerful", live2d_hint: "happy" }
    },
    {
      label: "思考",
      sample: "我先想一下，这个点可能有两种走法。",
      mood: "thinking",
      style: "clear",
      runtimeHint: { emotion: "thinking", action: "think", intensity: "low", voice_style: "curious", live2d_hint: "thinking" }
    },
    {
      label: "轻柔",
      sample: "没关系，先慢一点，我在这边陪你把它理顺。",
      mood: "sad",
      style: "comfort",
      runtimeHint: { emotion: "sad", action: "none", intensity: "low", voice_style: "soft", live2d_hint: "quiet" }
    },
    {
      label: "认真",
      sample: "收到，我会把话说清楚一点，先处理最关键的问题。",
      mood: "idle",
      style: "steady",
      runtimeHint: { emotion: "neutral", action: "nod", intensity: "normal", voice_style: "serious", live2d_hint: "idle" }
    }
  ];

  function getRehearsalPreset(index = 0) {
    const safeIndex = Math.abs(Math.round(Number(index || 0))) % CHARACTER_REHEARSAL_PRESETS.length;
    const preset = CHARACTER_REHEARSAL_PRESETS[safeIndex];
    return {
      ...preset,
      runtimeHint: { ...(preset.runtimeHint || {}) }
    };
  }

  function formatNumber(value, fallback = "未配置") {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return String(Math.round(n * 100) / 100);
  }

  function addUnique(items, text) {
    const normalized = String(text || "").trim();
    if (normalized && !items.includes(normalized)) {
      items.push(normalized);
    }
  }

  function addConfigKey(items, key, reason = "") {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      return;
    }
    const normalizedReason = String(reason || "").trim();
    const line = normalizedReason ? `${normalizedKey}：${normalizedReason}` : normalizedKey;
    if (!items.includes(line)) {
      items.push(line);
    }
  }

  function localizeValue(kind, value) {
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

  function buildLatestPerformanceSummary(candidate = null, autoApply = null, now = Date.now()) {
    const runtimeHint = autoApply?.runtimeHint || candidate?.runtimeHint || null;
    if (!candidate && !runtimeHint) {
      return null;
    }
    return {
      at: now,
      textPreview: String(candidate?.textPreview || "").slice(0, 80),
      emotion: String(runtimeHint?.emotion || candidate?.mood || "neutral"),
      action: String(runtimeHint?.action || "none"),
      voiceStyle: String(autoApply?.voiceStyle || runtimeHint?.voice_style || "neutral"),
      applied: autoApply?.applied === true,
      source: String(autoApply?.source || candidate?.source || "assistant_reply")
    };
  }

  function buildFeedbackMessage(feedback) {
    if (!feedback) {
      return "";
    }
    const emotion = localizeValue("emotion", feedback.emotion);
    const action = localizeValue("action", feedback.action);
    const voice = localizeValue("voice", feedback.voiceStyle);
    return `已记录反馈：${feedback.label}\n对象：${emotion} / ${action} / ${voice}\n下一步可以点“角色调优”看建议。`;
  }

  function buildTuningReport(input = {}) {
    const cfg = input.config || {};
    const runtimeCfg = cfg.character_runtime || {};
    const ttsCfg = cfg.tts || {};
    const motionCfg = cfg.motion || {};
    const llmCfg = cfg.llm || {};
    const candidate = input.candidate || null;
    const autoApply = input.autoApply || null;
    const runtimeHint = autoApply?.runtimeHint || candidate?.runtimeHint || null;
    const feedback = input.feedback || null;
    const assistantPrompt = String(cfg.assistant_prompt || "");
    const stateTtsProvider = String(input.ttsProvider || "");
    const speechMotionStrength = Number(motionCfg.speech_motion_strength ?? motionCfg.speech_body_motion_strength ?? input.speechMotionStrength);
    const expressionStrength = Number(motionCfg.expression_strength ?? input.expressionStrength);
    const advice = [];
    const configKeys = [];

    if (runtimeCfg.enabled !== true) {
      addUnique(advice, "先开启 character_runtime.enabled，否则回复不会进入角色表现层。");
      addConfigKey(configKeys, "character_runtime.enabled", "控制角色接入层是否启用");
    }
    if (runtimeCfg.return_metadata !== true) {
      addUnique(advice, "开启 character_runtime.return_metadata，方便后端返回情绪、动作和语音风格。");
      addConfigKey(configKeys, "character_runtime.return_metadata", "让回复返回情绪、动作和语音风格元信息");
    }
    if (runtimeCfg.auto_apply_reply_cue !== true) {
      addUnique(advice, "如果你正在本地测试角色味道，可以临时开启 auto_apply_reply_cue；确认效果后再决定是否默认打开。");
      addConfigKey(configKeys, "character_runtime.auto_apply_reply_cue", "控制上一句回复 cue 是否自动应用到本地表现层");
    }
    if (!candidate) {
      addUnique(advice, "先发一句正常聊天，或点“角色试演”，再看这里的调优建议会更准。");
    } else if (autoApply?.applied !== true) {
      addUnique(advice, "上一句只生成了候选表现，没有真正应用。优先检查角色接入开关和顶部“上一句角色表现”卡片。");
      addConfigKey(configKeys, "character_runtime.auto_apply_reply_cue", "候选表现未应用时优先检查这个开关");
    }
    if (feedback?.rating === "bad") {
      addUnique(advice, "你刚标记“需要调整”。先用“角色试演”复现是哪种情绪不对，再分别判断是声音差异小、动作太弱，还是回复文本不像角色。");
      addConfigKey(configKeys, "assistant_prompt", "如果文本不像角色，先改这里的人设和说话规则");
      addConfigKey(configKeys, "motion.speech_motion_strength", "如果说话动作太弱，调这里");
      addConfigKey(configKeys, "tts.gpt_sovits_fallback_ref_audio_path", "如果声线味道不对，优先检查参考音频");
    } else if (feedback?.rating === "good") {
      addUnique(advice, "你刚标记“表现不错”。先保留这组情绪/动作/语音映射，下一步重点优化 LLM 回复文本的口吻和长度。");
      addConfigKey(configKeys, "assistant_prompt", "表现层可用后，优先把文本口吻调稳定");
    }
    if (String(ttsCfg.provider || stateTtsProvider).toLowerCase() === "gpt_sovits") {
      addUnique(advice, "GPT-SoVITS 对 prosody 参数不一定明显。若开心/轻柔/认真听起来差不多，优先换参考音频或拆分不同情绪音色。");
      addConfigKey(configKeys, "tts.gpt_sovits_ref_audio_path", "主参考音频会明显影响声线味道");
      addConfigKey(configKeys, "tts.gpt_sovits_fallback_ref_audio_path", "主参考不可用时会落到这里");
      if (ttsCfg.gpt_sovits_realtime_tts !== false) {
        addUnique(advice, "建议 GPT-SoVITS 保持 final_only / 非实时模式，先保证长句稳定出声，再追求低延迟。");
        addConfigKey(configKeys, "tts.gpt_sovits_realtime_tts", "长句稳定性优先时建议关闭实时模式");
        addConfigKey(configKeys, "tts.stream_mode", "长句测试阶段优先 final_only");
      }
    }
    const maxTokens = Number(llmCfg.max_tokens || runtimeCfg.max_tokens || 0);
    if (Number.isFinite(maxTokens) && maxTokens > 180) {
      addUnique(advice, "回复长度偏长时角色感会被稀释。先把单轮回复控制到 1 到 3 句，再测试语音表现。");
      addConfigKey(configKeys, "llm.max_tokens", "控制普通聊天回复长度上限");
      addConfigKey(configKeys, "character_runtime.max_tokens", "控制角色续话/角色层回复长度上限");
    }
    if (!/不要|不使用|禁止/.test(assistantPrompt) || !/markdown|编号|列表|项目符号|标题/i.test(assistantPrompt)) {
      addUnique(advice, "提示词里建议明确禁止 Markdown、编号列表和长段解释，桌宠说话会更像在聊天。");
      addConfigKey(configKeys, "assistant_prompt", "加入短句、口语化、禁止 Markdown/编号列表等规则");
    }
    if (Number.isFinite(speechMotionStrength) && speechMotionStrength < 1.1) {
      addUnique(advice, "说话时身体动作偏弱。可以把 motion.speech_motion_strength 提到 1.2 到 1.5 再试。");
      addConfigKey(configKeys, "motion.speech_motion_strength", "控制说话时身体动作强度");
    }
    if (Number.isFinite(expressionStrength) && expressionStrength < 0.9) {
      addUnique(advice, "表情强度偏低。可以把 motion.expression_strength 调到 1.0 左右。");
      addConfigKey(configKeys, "motion.expression_strength", "控制表情幅度");
    }
    if (!advice.length) {
      addUnique(advice, "基础配置看起来可以。下一步重点调人设语气样例、参考音频和四个试演预设的差异。");
      addConfigKey(configKeys, "assistant_prompt", "继续调角色口吻样例");
      addConfigKey(configKeys, "tts.gpt_sovits_ref_audio_path", "继续调参考音频");
    }

    const lastLine = runtimeHint
      ? `上一句表现：情绪=${localizeValue("emotion", runtimeHint.emotion)}；动作=${localizeValue("action", runtimeHint.action)}；语音=${localizeValue("voice", autoApply?.voiceStyle || runtimeHint.voice_style)}；状态=${autoApply?.applied === true ? "已应用" : "未应用"}`
      : "上一句表现：还没有可用记录。";
    const feedbackLine = feedback
      ? `最近反馈：${feedback.label}（${localizeValue("emotion", feedback.emotion)} / ${localizeValue("action", feedback.action)} / ${localizeValue("voice", feedback.voiceStyle)}）`
      : "最近反馈：还没有记录。";

    return [
      "角色调优建议",
      "",
      "当前观察",
      lastLine,
      feedbackLine,
      `角色接入：${runtimeCfg.enabled === true ? "已开启" : "未开启"}；元信息=${runtimeCfg.return_metadata === true ? "开启" : "关闭"}；自动应用=${runtimeCfg.auto_apply_reply_cue === true ? "开启" : "关闭"}`,
      `语音：${String(ttsCfg.provider || stateTtsProvider || "unknown")}；浏览器兜底=${ttsCfg.allow_browser_fallback === true ? "开启" : "关闭"}`,
      `动作：说话强度=${formatNumber(speechMotionStrength)}；表情强度=${formatNumber(expressionStrength)}`,
      "",
      "建议顺序",
      ...advice.map((item, index) => `${index + 1}. ${item}`),
      "",
      "可检查配置项",
      ...(configKeys.length ? configKeys.map((item, index) => `${index + 1}. ${item}`) : ["1. 暂时没有必须改的配置项。"])
    ].join("\n");
  }

  function buildWorkflowGuide() {
    return [
      "角色闭环测试流程",
      "",
      "1. 点“更多 → 链路自检”，先确认 LLM、TTS 和角色接入都正常。",
      "2. 点“更多 → 角色试演”，不经过 LLM，单独听表情、动作和语音风格。",
      "3. 听完点“表现不错”或“需要调整”，把你的主观判断记到本次会话。",
      "4. 点“角色调优”，看下一步该改人设、回复长度、参考音频还是动作强度。",
      "5. 再发一句真实聊天，看顶部“上一句角色表现”是否符合预期。"
    ].join("\n");
  }

  const api = {
    CHARACTER_REHEARSAL_PRESETS,
    getRehearsalPreset,
    formatNumber,
    localizeValue,
    buildLatestPerformanceSummary,
    buildFeedbackMessage,
    buildTuningReport,
    buildWorkflowGuide
  };

  root.TaffyCharacterTuning = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
