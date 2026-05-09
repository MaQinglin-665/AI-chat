(function (root) {
  "use strict";

  const INTENT_LABELS = {
    greeting: "欢迎 / 打招呼",
    comfort: "安慰",
    encouragement: "鼓励",
    reminder: "提醒确认",
    closing: "收尾",
    task_help: "任务协助",
    question: "问题回答",
    casual: "闲聊",
    low_interrupt_checkin: "低打扰主动陪伴"
  };

  const STYLE_LABELS = {
    natural: "自然",
    warm_brief: "短句欢迎",
    comfort: "安慰",
    encouraging: "鼓励",
    clear: "清晰认真",
    closing: "轻柔收尾",
    curious: "好奇回答",
    low_interrupt: "低打扰短句"
  };

  const FEEDBACK_EFFECT_LABELS = {
    shorter_replies: "因为反馈，下一轮会更短一些",
    less_generic_tone: "因为反馈，会减少客服腔/泛助手感",
    lower_motion_intensity: "因为反馈，会降低动作强度",
    more_visible_motion: "因为反馈，会增加轻微可见动作",
    voice_style_care: "因为反馈，会更注意声线匹配"
  };

  function clean(value, fallback = "未记录") {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text || fallback;
  }

  function localize(map, value, fallback = "未记录") {
    const key = String(value || "").trim().toLowerCase();
    return map[key] || clean(value, fallback);
  }

  function buildBrainDebugReport(snapshot = null, options = {}) {
    const safe = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : null;
    if (!safe) {
      return [
        "角色大脑状态",
        "",
        "还没有可查看的角色大脑判断。",
        "先发一句正常聊天，再输入 /braindebug，我会显示上一轮的判断。",
        "",
        "安全边界：这个报告只读取上一轮聊天判断，不会触发语音、动作、桌面观察、工具调用或 shell。"
      ].join("\n");
    }
    const updatedAt = Number(options.updatedAt || 0);
    const feedbackEffects = Array.isArray(safe.feedback_effects) ? safe.feedback_effects : [];
    const effectLines = feedbackEffects.length
      ? feedbackEffects.map((item, index) => `${index + 1}. ${FEEDBACK_EFFECT_LABELS[item] || clean(item)}`)
      : ["1. 最近反馈没有明显改变这一轮判断。"];
    const timeLine = updatedAt
      ? `更新时间：${new Date(updatedAt).toLocaleTimeString()}`
      : "更新时间：刚刚";
    const continuity = safe.continuity && typeof safe.continuity === "object" && !Array.isArray(safe.continuity)
      ? safe.continuity
      : null;
    const continuityLines = continuity
      ? [
          "",
          "\u8fde\u7eed\u6027\u72b6\u6001",
          `\u4e0a\u4e00\u610f\u56fe\uff1a${clean(continuity.last_intent, "\u65e0")}\uff1b\u8bdd\u9898=${clean(continuity.last_topic, "\u65e0")}`,
          `\u5e95\u8272\uff1a${clean(continuity.mood_baseline, "neutral")}\uff1b\u80fd\u91cf=${clean(continuity.energy, "calm")}\uff1b\u5173\u7cfb\u8bed\u6c14=${clean(continuity.relationship_tone, "steady")}`,
          `\u8fd1\u671f\u9700\u8981\uff1a${clean(continuity.recent_user_need, "\u65e0")}\uff1b\u8fde\u7eed\u8f6e\u6570=${Number(continuity.same_need_turns) || 0}\uff1b\u8870\u51cf=${clean(continuity.decay, "fresh")}`
        ]
      : [];
    const constraints = safe.output_constraints && typeof safe.output_constraints === "object" && !Array.isArray(safe.output_constraints)
      ? safe.output_constraints
      : null;
    const constraintLines = constraints
      ? [
          "",
          "\u8f93\u51fa\u7ea6\u675f",
          `\u8ffd\u95ee\uff1a${constraints.allow_followup_question ? "\u5141\u8bb8" : "\u907f\u514d"}\uff1b\u6f84\u6e05\uff1a${constraints.clarify_only_when_needed ? "\u53ea\u5728\u5fc5\u8981\u65f6" : "\u4e0d\u5f3a\u5236"}`,
          `\u8c03\u4f83\uff1a${constraints.allow_teasing ? "\u5141\u8bb8" : "\u907f\u514d"}\uff1b\u52a8\u4f5c\uff1a${constraints.allow_motion === false ? "\u907f\u514d" : "\u5141\u8bb8"}\uff1b\u8bed\u97f3=${clean(constraints.voice_style, clean(safe.voice_style, "neutral"))}`
        ]
      : [];
    return [
      "角色大脑状态",
      "",
      timeLine,
      ...continuityLines,
      `当前判断：${localize(INTENT_LABELS, safe.intent)}`,
      `回复风格：${localize(STYLE_LABELS, safe.reply_style)}；最多约 ${Number(safe.max_sentences) || 3} 句`,
      `Style beat: ${clean(safe.style_beat, "none")}`,
      `Reaction: ${clean(safe.reaction_mode, "none")}；banter=${Number(safe.banter_level) || 0}/3`,
      ...constraintLines,
      `角色状态：能量=${clean(safe.energy)}；注意力=${clean(safe.attention)}；关系=${clean(safe.relationship)}`,
      `表现建议：情绪=${clean(safe.emotion)}；动作=${clean(safe.action)}；强度=${clean(safe.intensity)}；语音=${clean(safe.voice_style)}`,
      "",
      "反馈影响",
      ...effectLines,
      "",
      "安全边界：这个报告只读取上一轮聊天判断，不会触发语音、动作、桌面观察、工具调用或 shell。"
    ].join("\n");
  }

  const api = {
    buildBrainDebugReport,
    INTENT_LABELS,
    STYLE_LABELS,
    FEEDBACK_EFFECT_LABELS
  };

  root.TaffyCharacterBrainDebug = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
