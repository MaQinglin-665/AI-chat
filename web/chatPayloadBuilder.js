(function (root) {
  "use strict";

  function cleanConversationContextText(value, maxLen = 360) {
    let text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) {
      return "";
    }
    const limit = Math.max(24, Math.min(720, Math.round(Number(maxLen) || 360)));
    if (text.length > limit) {
      text = text.slice(0, Math.max(0, limit - 3)).trim() + "...";
    }
    return text;
  }

  function classifyBargeInReplyPolicy(value) {
    const text = cleanConversationContextText(value, 240).toLowerCase();
    const compact = text.replace(/\s+/g, "");
    let kind = "new_topic";
    if (!compact) {
      kind = "new_topic";
    } else if (/(not that|that's not|thats not|wrong|no i mean|i meant|not this)/.test(text) || /(\u4e0d\u662f\u8fd9\u4e2a|\u4e0d\u5bf9|\u6211\u4e0d\u662f\u8bf4|\u6211\u8bf4\u7684\u662f|\u4e0d\u662f\u90a3\u4e2a)/.test(text)) {
      kind = "correction";
    } else if (/(shorter|too long|briefly|one sentence|summari[sz]e|less detail)/.test(text) || /(\u8bf4\u77ed\u70b9|\u77ed\u4e00\u70b9|\u7b80\u5355\u70b9|\u7b80\u77ed|\u592a\u957f|\u4e00\u53e5\u8bdd|\u5c11\u4e00\u70b9)/.test(text)) {
      kind = "shorten";
    } else if (/(rephrase|say it differently|different wording|another way|say that again)/.test(text) || /(\u6362\u4e2a\u8bf4\u6cd5|\u91cd\u65b0\u8bf4|\u6362\u4e00\u4e0b|\u518d\u8bf4\u4e00\u904d)/.test(text)) {
      kind = "rephrase";
    } else if (/(continue|go on|keep going|finish that|same topic)/.test(text) || /(\u7ee7\u7eed|\u63a5\u7740|\u8bf4\u5b8c|\u8fd8\u662f\u8fd9\u4e2a|\u521a\u624d\u90a3\u4e2a)/.test(text)) {
      kind = "continue";
    } else if (/(stop|cancel|never mind|nevermind|wait|hold on|drop it|forget it)/.test(text) || /(\u505c|\u522b\u8bf4|\u6253\u4f4f|\u7b49\u7b49|\u7b97\u4e86|\u5148\u522b|\u4e0d\u7528\u4e86)/.test(text)) {
      kind = "stop";
    } else if (/^(also|plus|and|actually|by the way|btw)\b/.test(text) || /(\u8fd8\u6709|\u53e6\u5916|\u8865\u5145|\u987a\u4fbf|\u5176\u5b9e|\u5bf9\u4e86)/.test(text)) {
      kind = "supplement";
    }
    const moveByKind = {
      stop: "yield",
      correction: "repair",
      shorten: "shorten",
      rephrase: "rephrase",
      continue: "continue_topic",
      supplement: "integrate",
      new_topic: "answer_latest"
    };
    const goalByKind = {
      stop: "stop_or_acknowledge_briefly",
      correction: "repair_mismatch_without_defensiveness",
      shorten: "compress_interrupted_answer",
      rephrase: "restate_interrupted_point",
      continue: "continue_only_if_user_asked",
      supplement: "fold_user_addition_into_current_thread",
      new_topic: "answer_latest_message_without_resuming_old_answer"
    };
    return {
      version: 1,
      kind,
      reply_move: moveByKind[kind] || "answer_latest",
      goal: goalByKind[kind] || "answer_latest_message_without_resuming_old_answer",
      source: "latest_user_message"
    };
  }

  function normalizeInputModality(value, fallback = "text") {
    const key = String(value || fallback || "text").trim().toLowerCase().replace(/-/g, "_");
    if (key === "voice" || key === "speech" || key === "asr" || key === "mic" || key === "microphone") {
      return "voice";
    }
    if (key === "auto" || key === "proactive") {
      return "auto";
    }
    return "text";
  }

  function normalizeAsrConversationContext(value = null) {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? value : null;
    if (!raw || raw.needs_confirmation !== true) {
      return null;
    }
    const confidence = Number(raw.confidence);
    return {
      version: 1,
      source: cleanConversationContextText(raw.source || "voice_transcript", 48),
      raw_text: cleanConversationContextText(raw.raw_text, 160),
      final_text: cleanConversationContextText(raw.final_text, 160),
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
      reason: cleanConversationContextText(raw.reason || raw.confidence_reason, 80),
      needs_confirmation: true
    };
  }

  function normalizeHistoryForRequest(history) {
    const items = Array.isArray(history) ? history : [];
    return items.map((item) => ({
      role: item && item.role,
      content: item && item.content
    }));
  }

  function clonePlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return { ...value };
  }

  function normalizeClientTimestamp(value) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
  }

  function buildAssistantRequestPayload(input = {}) {
    const isAuto = input.auto === true;
    const message = String(input.message || "").trim();
    const inputModality = isAuto
      ? "auto"
      : normalizeInputModality(input.inputModality || input.input_modality, "text");
    const payload = {
      message,
      history: normalizeHistoryForRequest(input.history),
      auto: isAuto,
      input_modality: inputModality,
      force_tools: input.forceTools === true || input.force_tools === true,
      _perf_trace_id: String(input.perfTraceId || input._perf_trace_id || ""),
      _perf_client_send_ts_ms: normalizeClientTimestamp(
        input.clientSendTsMs != null ? input.clientSendTsMs : input._perf_client_send_ts_ms
      )
    };

    let replyPolicy = null;
    const conversationContext = {};
    const interruptionContext = isAuto ? null : clonePlainObject(input.interruptionContext || input.interruption_context);
    const asrContext = isAuto ? null : normalizeAsrConversationContext(input.asrContext || input.asr_context);
    if (interruptionContext) {
      replyPolicy = classifyBargeInReplyPolicy(message);
      conversationContext.interruption = {
        ...interruptionContext,
        reply_policy: replyPolicy
      };
    }
    if (asrContext) {
      conversationContext.asr = asrContext;
    }
    if (Object.keys(conversationContext).length) {
      payload.conversation_context = conversationContext;
    }

    if (isAuto && input.autoKind) {
      payload.auto_kind = String(input.autoKind || "").trim().slice(0, 40);
    }
    if (isAuto && input.autoThoughtBurst && typeof input.autoThoughtBurst === "object" && !Array.isArray(input.autoThoughtBurst)) {
      payload.auto_thought_burst = input.autoThoughtBurst;
    }

    const imageDataUrl = String(input.imageDataUrl || input.image_data_url || "").trim();
    if (imageDataUrl) {
      payload.image_data_url = imageDataUrl;
    }
    if (input.characterExperienceProfile) {
      payload.character_experience_profile = input.characterExperienceProfile;
    }

    return { payload, replyPolicy };
  }

  const api = {
    cleanConversationContextText,
    classifyBargeInReplyPolicy,
    normalizeInputModality,
    normalizeAsrConversationContext,
    normalizeHistoryForRequest,
    buildAssistantRequestPayload
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.chatPayloadBuilder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
