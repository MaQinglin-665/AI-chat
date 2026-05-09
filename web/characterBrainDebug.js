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
    const improv = safe.improv && typeof safe.improv === "object" && !Array.isArray(safe.improv)
      ? safe.improv
      : null;
    const stageMemory = safe.stage_memory && typeof safe.stage_memory === "object" && !Array.isArray(safe.stage_memory)
      ? safe.stage_memory
      : null;
    const safetyClamp = safe.safety_clamp && typeof safe.safety_clamp === "object" && !Array.isArray(safe.safety_clamp)
      ? safe.safety_clamp
      : null;
    const motionDirector = safe.motion_director && typeof safe.motion_director === "object" && !Array.isArray(safe.motion_director)
      ? safe.motion_director
      : null;
    const voiceDirector = safe.voice_director && typeof safe.voice_director === "object" && !Array.isArray(safe.voice_director)
      ? safe.voice_director
      : null;
    const improvLines = improv
      ? [
          "",
          "Improv",
          `stance=${clean(improv.stance, "steady")}; chaos=${Number(improv.chaos_level) || 0}/3; callback=${clean(improv.callback_policy, "none")}; agenda=${clean(improv.agenda, "none")}`
        ]
      : [];
    const stageMemoryLines = stageMemory
      ? [
          "",
          "Stage memory",
          `bit=${clean(stageMemory.current_bit, "none")}; callback=${clean(stageMemory.recent_callback, "none")}; agenda=${clean(stageMemory.mini_agenda || stageMemory.agenda, "none")}`,
          `correction=${clean(stageMemory.correction_state, "none")}; cooldown=${Number(stageMemory.callback_cooldown_turns) || 0}; turns=${Number(stageMemory.turns_since_callback) || 0}`
        ]
      : [];
    const safetyClampLines = safetyClamp
      ? [
          "",
          "Safety clamp",
          `level=${clean(safetyClamp.level, "none")}; reason=${clean(safetyClamp.reason, "none")}`
        ]
      : [];
    const motionSuppressed = Array.isArray(motionDirector?.suppressed_reasons)
      ? motionDirector.suppressed_reasons.map((item) => clean(item, "")).filter(Boolean).slice(0, 6)
      : [];
    const motionBeats = Array.isArray(motionDirector?.speech_beats)
      ? motionDirector.speech_beats.map((item) => clean(item, "")).filter(Boolean).slice(0, 3)
      : [];
    const motionLines = motionDirector
      ? [
          "",
          "Motion Director",
          `pre=${clean(motionDirector.pre_reaction, "none")}; speech=${clean(motionDirector.speech_start, "none")}; beats=${motionBeats.length ? motionBeats.join(",") : "none"}; correction=${clean(motionDirector.correction_reaction, "none")}; post=${clean(motionDirector.post_settle, "none")}`,
          `suppressed=${motionSuppressed.length ? motionSuppressed.join(", ") : "none"}`
        ]
      : [];
    const voiceSuppressed = Array.isArray(voiceDirector?.suppressed_reasons)
      ? voiceDirector.suppressed_reasons.map((item) => clean(item, "")).filter(Boolean).slice(0, 6)
      : [];
    const voiceLines = voiceDirector
      ? [
          "",
          "Voice Director",
          `delivery=${clean(voiceDirector.delivery, "steady_clear")}; pace=${clean(voiceDirector.pace, "normal")}; pause=${clean(voiceDirector.pause_profile, "light")}; segment=${clean(voiceDirector.segment_style, "whole")}; max_segments=${Number(voiceDirector.max_segments) || 1}`,
          `suppressed=${voiceSuppressed.length ? voiceSuppressed.join(", ") : "none"}`
        ]
      : [];
    const constraints = safe.output_constraints && typeof safe.output_constraints === "object" && !Array.isArray(safe.output_constraints)
      ? safe.output_constraints
      : null;
    const execution = safe.performance_execution && typeof safe.performance_execution === "object" && !Array.isArray(safe.performance_execution)
      ? safe.performance_execution
      : null;
    const timeline = safe.performance_timeline && typeof safe.performance_timeline === "object" && !Array.isArray(safe.performance_timeline)
      ? safe.performance_timeline
      : null;
    const voiceTimeline = safe.voice_timeline && typeof safe.voice_timeline === "object" && !Array.isArray(safe.voice_timeline)
      ? safe.voice_timeline
      : null;
    const audit = safe.performance_audit && typeof safe.performance_audit === "object" && !Array.isArray(safe.performance_audit)
      ? safe.performance_audit
      : null;
    const constraintLines = constraints
      ? [
          "",
          "\u8f93\u51fa\u7ea6\u675f",
          `\u8ffd\u95ee\uff1a${constraints.allow_followup_question ? "\u5141\u8bb8" : "\u907f\u514d"}\uff1b\u6f84\u6e05\uff1a${constraints.clarify_only_when_needed ? "\u53ea\u5728\u5fc5\u8981\u65f6" : "\u4e0d\u5f3a\u5236"}`,
          `\u8c03\u4f83\uff1a${constraints.allow_teasing ? "\u5141\u8bb8" : "\u907f\u514d"}\uff1b\u52a8\u4f5c\uff1a${constraints.allow_motion === false ? "\u907f\u514d" : "\u5141\u8bb8"}\uff1b\u8bed\u97f3=${clean(constraints.voice_style, clean(safe.voice_style, "neutral"))}`
        ]
      : [];
    const executionLines = execution
      ? [
          "",
          "Execution",
          `shape=${clean(execution.reply_shape, clean(safe.reply_shape, "none"))}; final_sentences=${Number(execution.final_sentences) || 0}`,
          `removed_followup=${execution.removed_followup === true ? "yes" : "no"}; shortened=${execution.shortened === true ? "yes" : "no"}; used_bit=${execution.used_bit === true ? "yes" : "no"}; removed_unsafe_bit=${execution.removed_unsafe_bit === true ? "yes" : "no"}; removed_context=${execution.removed_context_bleed === true ? "yes" : "no"}`
        ]
      : [];
    const timelineSuppressed = Array.isArray(timeline?.suppressed)
      ? timeline.suppressed.map((item) => clean(item, "")).filter(Boolean).slice(0, 6)
      : [];
    const timelineLines = timeline
      ? [
          "",
          "Timeline",
          `enabled=${timeline.enabled === true ? "yes" : "no"}; pre=${clean(timeline.pre, "none")}; speech=${clean(timeline.speech, "none")}; beats=${Number(timeline.beats) || 0}; post=${clean(timeline.post, "none")}`,
          `suppressed=${timelineSuppressed.length ? timelineSuppressed.join(", ") : "none"}`
        ]
      : [];
    const voiceTimelineSuppressed = Array.isArray(voiceTimeline?.suppressed)
      ? voiceTimeline.suppressed.map((item) => clean(item, "")).filter(Boolean).slice(0, 6)
      : [];
    const voiceTimelineLines = voiceTimeline
      ? [
          "",
          "Voice Timeline",
          `enabled=${voiceTimeline.enabled === true ? "yes" : "no"}; delivery=${clean(voiceTimeline.delivery, "steady_clear")}; pace=${clean(voiceTimeline.pace, "normal")}; segments=${Number(voiceTimeline.segments) || 0}; pause=${clean(voiceTimeline.pause_profile, "light")}`,
          `suppressed=${voiceTimelineSuppressed.length ? voiceTimelineSuppressed.join(", ") : "none"}; fallback=${clean(voiceTimeline.fallback_reason, "none")}`
        ]
      : [];
    const auditActual = audit?.actual && typeof audit.actual === "object" && !Array.isArray(audit.actual)
      ? audit.actual
      : {};
    const auditTts = audit?.tts && typeof audit.tts === "object" && !Array.isArray(audit.tts)
      ? audit.tts
      : {};
    const auditVoice = audit?.voice && typeof audit.voice === "object" && !Array.isArray(audit.voice)
      ? audit.voice
      : {};
    const auditMotion = audit?.motion && typeof audit.motion === "object" && !Array.isArray(audit.motion)
      ? audit.motion
      : {};
    const auditMotionPlanned = auditMotion.planned && typeof auditMotion.planned === "object" && !Array.isArray(auditMotion.planned)
      ? auditMotion.planned
      : {};
    const auditMotionActual = auditMotion.actual && typeof auditMotion.actual === "object" && !Array.isArray(auditMotion.actual)
      ? auditMotion.actual
      : {};
    const auditMotionPlannedBeats = Array.isArray(auditMotionPlanned.beats)
      ? auditMotionPlanned.beats.map((item) => clean(item, "")).filter(Boolean).slice(0, 3)
      : [];
    const auditMotionActualBeats = Array.isArray(auditMotionActual.beats)
      ? auditMotionActual.beats.map((item) => clean(item, "")).filter(Boolean).slice(0, 4)
      : [];
    const auditMotionSuppressed = Array.isArray(auditMotion.suppressed)
      ? auditMotion.suppressed.map((item) => clean(item, "")).filter(Boolean).slice(0, 6)
      : [];
    const auditEarly = audit?.early_reaction && typeof audit.early_reaction === "object" && !Array.isArray(audit.early_reaction)
      ? audit.early_reaction
      : null;
    const auditEarlySuppressed = auditEarly && Array.isArray(auditEarly.suppressed)
      ? auditEarly.suppressed.map((item) => clean(item, "")).filter(Boolean).slice(0, 6)
      : [];
    const earlyLines = auditEarly
      ? [
          "",
          "Early Reaction",
          `enabled=${auditEarly.enabled === true ? "yes" : "no"}; intent=${clean(auditEarly.intent, "none")}; pre=${clean(auditEarly.pre, "none")}; actual=${clean(auditEarly.actual, "pending")}; cue=${clean(auditEarly.motion_cue, clean(auditEarly.pre, "none"))}`,
          `action=${clean(auditEarly.action, "none")}; pulse=${auditEarly.pulse === true ? "yes" : "no"}; latency=${Number(auditEarly.latency_ms) || 0}ms/${Number(auditEarly.target_latency_ms) || 500}ms; status=${clean(auditEarly.latency_status, "pending")}; reason=${clean(auditEarly.reason, "none")}`,
          `suppressed=${auditEarlySuppressed.length ? auditEarlySuppressed.join(", ") : "none"}`
        ]
      : [];
    const motionActualLines = audit
      ? [
          "",
          "Motion Actual",
          `planned=${clean(auditMotionPlanned.pre, "none")}/${clean(auditMotionPlanned.speech, "none")}/${auditMotionPlannedBeats.length ? auditMotionPlannedBeats.join(",") : "none"}/${clean(auditMotionPlanned.post, "none")}`,
          `actual=${clean(auditMotionActual.pre, "pending")}/${clean(auditMotionActual.speech, "pending")}/${auditMotionActualBeats.length ? auditMotionActualBeats.join(",") : "none"}/${clean(auditMotionActual.post, "pending")}; dispatches=${Number(auditMotionActual.dispatches) || 0}; failed=${Number(auditMotionActual.failed_dispatches) || 0}; pulse_only=${Number(auditMotionActual.pulse_only) || 0}; settle=${clean(auditMotionActual.settle_result, "pending")}`,
          `last_group=${clean(auditMotionActual.last_group, "none")}; last_cue=${clean(auditMotionActual.last_cue, "none")}; family=${clean(auditMotionActual.last_family, "none")}`,
          `suppressed=${auditMotionSuppressed.length ? auditMotionSuppressed.join(", ") : "none"}`
        ]
      : [];
    const auditLines = audit
      ? [
          "",
          "Actual",
          `status=${clean(audit.status, "unknown")}; pre=${clean(auditActual.pre, "pending")}; speech=${clean(auditActual.speech, "pending")}; beats=${Number(auditActual.beats) || 0}; post=${clean(auditActual.post, "pending")}`,
          `dispatches=action:${Number(auditActual.action_dispatches) || 0}/pulse:${Number(auditActual.pulse_dispatches) || 0}; tts=${auditTts.started === true ? "started" : "not_started"}/${auditTts.finished === true ? "finished" : "pending"}; settle=${audit.settled === true ? "yes" : "pending"}`,
          `voice=${clean(auditVoice.delivery, "none")}/${clean(auditVoice.pace, "none")}; segment=${clean(auditVoice.segment_style, "none")}; pause=${clean(auditVoice.pause_profile, "none")}; segments=${Number(auditVoice.spoken_segments) || 0}/${Number(auditVoice.planned_segments) || 0}; failed=${Number(auditVoice.failed_segments) || 0}; last=${Number(auditVoice.last_segment_index) || 0}; mode=${clean(auditVoice.mode, "none")}; fallback=${clean(auditVoice.fallback_reason, "none")}`,
          `voice_pause=pre:${Number(auditVoice.pre_pause_ms) || 0}ms/inter:${Number(auditVoice.inter_segment_pause_ms) || 0}ms`
        ]
      : [];
    return [
      "角色大脑状态",
      "",
      timeLine,
      ...continuityLines,
      ...improvLines,
      ...stageMemoryLines,
      ...safetyClampLines,
      ...motionLines,
      ...voiceLines,
      `当前判断：${localize(INTENT_LABELS, safe.intent)}`,
      `回复风格：${localize(STYLE_LABELS, safe.reply_style)}；最多约 ${Number(safe.max_sentences) || 3} 句`,
      `Style beat: ${clean(safe.style_beat, "none")}`,
      `Reaction: ${clean(safe.reaction_mode, "none")}；banter=${Number(safe.banter_level) || 0}/3`,
      `Performance: opening=${clean(safe.opening_move, "none")}；shape=${clean(safe.reply_shape, "none")}；bit=${clean(safe.performance_bit, "none")}`,
      `Spontaneity: ${Number(safe.spontaneity) || 0}/3；Question policy: ${clean(safe.question_policy, "none")}`,
      ...constraintLines,
      ...executionLines,
      ...timelineLines,
      ...voiceTimelineLines,
      ...earlyLines,
      ...motionActualLines,
      ...auditLines,
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
