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
        "先发一句正常聊天，再输入 /braindebug，我会显示上一轮的判断。"
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
    return [
      "角色大脑状态",
      "",
      timeLine,
      `当前判断：${localize(INTENT_LABELS, safe.intent)}`,
      `回复风格：${localize(STYLE_LABELS, safe.reply_style)}；最多约 ${Number(safe.max_sentences) || 3} 句`,
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
