(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const characterTuning = deps.characterTuning || root.TaffyCharacterTuning || {};
    const characterExperienceController = deps.characterExperienceController || null;
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;
    const handleCharacterRuntimeMetadata =
      typeof deps.handleCharacterRuntimeMetadata === "function" ? deps.handleCharacterRuntimeMetadata : () => null;
    const normalizeRuntimeVoiceStyle =
      typeof deps.normalizeRuntimeVoiceStyle === "function" ? deps.normalizeRuntimeVoiceStyle : (style) => String(style || "neutral");
    const runtimeVoiceStyleToTalkStyle =
      typeof deps.runtimeVoiceStyleToTalkStyle === "function" ? deps.runtimeVoiceStyleToTalkStyle : (_style, fallback = "neutral") => fallback;
    const updateReplyCharacterChip =
      typeof deps.updateReplyCharacterChip === "function" ? deps.updateReplyCharacterChip : () => {};

    async function runVoiceTestAndAppendReport() {
      const sample = "这是语音测试。如果你听到我说话，说明语音链路正常。";
      appendMessage("assistant", sample);
      setStatus("语音测试中...");
      const prosody = buildSpeakProsody(sample, "idle", false, "steady");
      const ok = await speak(sample, { force: true, interrupt: true, prosody });
      if (!ok) {
        appendMessage(
          "assistant",
          "语音测试没有成功。请点“更多 -> 链路自检”，或输入 /ttsdebug 查看最近一次语音状态。",
          { enableTranslation: false }
        );
        setStatus("语音测试失败");
      }
      return ok;
    }

    function getNextCharacterRehearsalPreset() {
      const index = Math.abs(Math.round(Number(state.characterRehearsalIndex || 0)));
      const preset = typeof characterTuning.getRehearsalPreset === "function"
        ? characterTuning.getRehearsalPreset(index)
        : null;
      state.characterRehearsalIndex = index + 1;
      return preset || {
        label: "默认",
        sample: "角色试演准备好了。",
        mood: "idle",
        style: "steady",
        runtimeHint: { emotion: "neutral", action: "nod", intensity: "normal", voice_style: "serious", live2d_hint: "idle" }
      };
    }

    async function runCharacterRehearsalAndAppendReport() {
      const preset = getNextCharacterRehearsalPreset();
      const normalized = handleCharacterRuntimeMetadata(preset.runtimeHint);
      const voiceStyle = normalizeRuntimeVoiceStyle(preset.runtimeHint.voice_style);
      const speechStyle = runtimeVoiceStyleToTalkStyle(voiceStyle, preset.style);
      const candidate = {
        textPreview: preset.sample,
        mood: preset.mood,
        style: preset.style,
        runtimeHint: normalized || preset.runtimeHint
      };
      const apply = {
        at: Date.now(),
        applied: !!normalized,
        reason: normalized ? "applied" : "runtime_unavailable",
        voiceStyle,
        speechStyle,
        runtimeHint: normalized || preset.runtimeHint,
        source: "character_rehearsal"
      };
      state.followupCharacterRuntimeLastReplyCandidate = candidate;
      state.followupCharacterRuntimeLastReplyAutoApply = apply;
      updateReplyCharacterChip(candidate, apply);
      appendMessage("assistant", `角色试演：${preset.label}\n${preset.sample}`, { enableTranslation: false });
      setStatus(`角色试演：${preset.label}`);
      if (!state.speakingEnabled) {
        appendMessage("assistant", "语音开关当前是关闭状态，这次只测试了表情和动作。", { enableTranslation: false });
        return true;
      }
      const prosody = buildSpeakProsody(preset.sample, preset.mood, false, voiceStyle);
      const ok = await speak(preset.sample, {
        force: true,
        interrupt: true,
        prosody,
        mood: preset.mood,
        style: speechStyle,
        voiceStyle
      });
      if (!ok) {
        appendMessage("assistant", "角色试演的语音没有成功。可以先点“测试语音”或“链路自检”确认语音服务。", {
          enableTranslation: false
        });
        setStatus("角色试演语音失败");
      }
      return ok;
    }

    function getLatestCharacterPerformanceSummary() {
      if (typeof characterTuning.buildLatestPerformanceSummary !== "function") {
        return null;
      }
      return characterTuning.buildLatestPerformanceSummary(
        state.followupCharacterRuntimeLastReplyCandidate || null,
        state.followupCharacterRuntimeLastReplyAutoApply || null
      );
    }

    function recordCharacterPerformanceFeedback(rating = "good", note = "") {
      const summary = getLatestCharacterPerformanceSummary();
      if (!summary) {
        appendMessage("assistant", "还没有可评价的角色表现。先发一句聊天，或点“角色试演”再反馈。", { enableTranslation: false });
        setStatus("暂无角色表现可反馈");
        return null;
      }
      const normalizedRating = rating === "bad" ? "bad" : "good";
      const feedback = {
        ...summary,
        rating: normalizedRating,
        label: normalizedRating === "good" ? "表现不错" : "需要调整",
        note: String(note || "").trim()
      };
      state.characterPerformanceLastFeedback = feedback;
      state.characterPerformanceFeedbacks.unshift(feedback);
      if (state.characterPerformanceFeedbacks.length > 8) {
        state.characterPerformanceFeedbacks.length = 8;
      }
      const experienceResult = characterExperienceController
        && typeof characterExperienceController.recordFeedback === "function"
          ? characterExperienceController.recordFeedback(feedback)
          : null;
      appendMessage(
        "assistant",
        [
          typeof characterTuning.buildFeedbackMessage === "function"
            ? characterTuning.buildFeedbackMessage(feedback)
            : `已记录反馈：${feedback.label}`,
          experienceResult?.requestProfile
            ? "这条反馈已纳入下轮角色风格微调。"
            : ""
        ].filter(Boolean).join("\n"),
        { enableTranslation: false }
      );
      setStatus(`已记录：${feedback.label}`);
      return feedback;
    }

    function buildCharacterTuningReport() {
      if (typeof characterTuning.buildTuningReport !== "function") {
        return "角色调优建议\n\n角色调优模块暂不可用。";
      }
      return characterTuning.buildTuningReport({
        config: state.config || {},
        candidate: state.followupCharacterRuntimeLastReplyCandidate || null,
        autoApply: state.followupCharacterRuntimeLastReplyAutoApply || null,
        feedback: state.characterPerformanceLastFeedback || null,
        experienceProfile: state.characterExperienceProfile || null,
        ttsProvider: state.ttsProvider || "",
        speechMotionStrength: state.speechMotionStrength,
        expressionStrength: state.expressionStrength
      });
    }

    function runCharacterTuningAndAppendReport() {
      const row = appendMessage("assistant", buildCharacterTuningReport(), { enableTranslation: false });
      row?.classList?.add("doctor-report");
      setStatus("角色调优建议已生成");
    }

    function buildCharacterWorkflowGuide() {
      return typeof characterTuning.buildWorkflowGuide === "function"
        ? characterTuning.buildWorkflowGuide()
        : "角色闭环测试流程\n\n角色流程模块暂不可用。";
    }

    function appendCharacterWorkflowGuide() {
      const row = appendMessage("assistant", buildCharacterWorkflowGuide(), { enableTranslation: false });
      row?.classList?.add("doctor-report");
      setStatus("角色流程已显示");
    }

    return {
      runVoiceTestAndAppendReport,
      getNextCharacterRehearsalPreset,
      runCharacterRehearsalAndAppendReport,
      getLatestCharacterPerformanceSummary,
      recordCharacterPerformanceFeedback,
      buildCharacterTuningReport,
      runCharacterTuningAndAppendReport,
      buildCharacterWorkflowGuide,
      appendCharacterWorkflowGuide
    };
  }

  const api = { createController };
  root.TaffyCharacterDiagnosticsController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
