(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const document = deps.documentObject || root.document || {};
    const window = deps.windowObject || root;
    const constants = deps.constants || {};
    const parseMessageTimestamp = typeof deps.parseMessageTimestamp === "function" ? deps.parseMessageTimestamp : (value) => Number(value) || Date.now();
    const requestAssistantReply = typeof deps.requestAssistantReply === "function" ? deps.requestAssistantReply : async () => false;
    const AUTO_CHAT_MIN_USER_GAP_MS = constants.AUTO_CHAT_MIN_USER_GAP_MS || 90 * 1000;
    const AUTO_CHAT_MIN_ASSISTANT_GAP_MS = constants.AUTO_CHAT_MIN_ASSISTANT_GAP_MS || 120 * 1000;
    const AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS = constants.AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS || 4 * 60 * 1000;
    const AUTO_CHAT_EMO_RE = constants.AUTO_CHAT_EMO_RE || /a^/;
    const AUTO_CHAT_MIRROR_RE = constants.AUTO_CHAT_MIRROR_RE || /a^/;
    const AUTO_CHAT_TOPIC_RE = constants.AUTO_CHAT_TOPIC_RE || /a^/;
    const AUTO_CHAT_ASK_RE = constants.AUTO_CHAT_ASK_RE || /[??]\s*$/;
    const AUTO_CHAT_OPEN_LOOP_RE = constants.AUTO_CHAT_OPEN_LOOP_RE || /a^/;
    const AUTO_CHAT_BRIEF_REPLY_RE = constants.AUTO_CHAT_BRIEF_REPLY_RE || /a^/;
    const AUTO_CHAT_REPEAT_REASON_WINDOW_MS = constants.AUTO_CHAT_REPEAT_REASON_WINDOW_MS || 14 * 60 * 1000;
    const AUTO_CHAT_REPEAT_TOPIC_WINDOW_MS = constants.AUTO_CHAT_REPEAT_TOPIC_WINDOW_MS || 22 * 60 * 1000;
    const AUTO_CHAT_BURST_RESET_WINDOW_MS = constants.AUTO_CHAT_BURST_RESET_WINDOW_MS || 18 * 60 * 1000;
    const AUTO_CHAT_REASON_PRIORITY = constants.AUTO_CHAT_REASON_PRIORITY || [];
    const AUTO_CHAT_REASON_HINTS = constants.AUTO_CHAT_REASON_HINTS || {};
    const AUTO_CHAT_STYLE_NOTES = constants.AUTO_CHAT_STYLE_NOTES || ["??????????????"];
    const WAITING_VOICE_HINTS = constants.WAITING_VOICE_HINTS || [""];
    const VISION_INTENT_RE = constants.VISION_INTENT_RE || /a^/;
    function stopAutoChatLoop() {
      if (!state.autoChatTimer) {
        return;
      }
      clearTimeout(state.autoChatTimer);
      state.autoChatTimer = 0;
    }

    function shouldSkipAutoChat() {
      if (state.chatBusy) {
        return true;
      }
      const now = Date.now();
      if (state.lastAutoChatAt > 0 && now - state.lastAutoChatAt < AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS) {
        return true;
      }
      if (state.lastUserMessageAt > 0 && now - state.lastUserMessageAt < AUTO_CHAT_MIN_USER_GAP_MS) {
        return true;
      }
      const records = Array.isArray(state.chatRecords) ? state.chatRecords : [];
      for (let i = records.length - 1; i >= 0; i -= 1) {
        const item = records[i];
        if (!item || item.role !== "assistant") {
          continue;
        }
        const ts = parseMessageTimestamp(item.timestamp);
        if (ts > 0 && now - ts < AUTO_CHAT_MIN_ASSISTANT_GAP_MS) {
          return true;
        }
        break;
      }
      if (!ui.chatInput) {
        return false;
      }
      const focused = document.activeElement === ui.chatInput;
      const typing = ui.chatInput.value.trim().length > 0;
      return focused && typing;
    }

    function shouldPlayLatencyHint(isAuto, useStreamSpeak) {
      // Disabled: latency hint can race with final reply TTS and interrupt playback.
      return false;
    }

    function pickLatencyHintText() {
      const idx = Math.floor(Math.random() * WAITING_VOICE_HINTS.length);
      return WAITING_VOICE_HINTS[idx] || WAITING_VOICE_HINTS[0];
    }

    function normalizeAutoChatTopicHint(text = "") {
      let safe = String(text || "").replace(/\s+/g, " ").trim();
      if (!safe) {
        return "";
      }
      safe = safe.replace(/[“”"'`【】[\]（）()]/g, "").trim();
      const maxChars = Math.max(
        12,
        Number(state.autoChatTuning?.maxTopicHintChars) || 42
      );
      if (safe.length > maxChars) {
        safe = safe.slice(0, maxChars).trim();
      }
      return safe;
    }

    function buildConversationFollowupTopicHint(text = "") {
      let safe = String(text || "").replace(/\s+/g, " ").trim();
      if (!safe) {
        return "";
      }
      const lines = safe.split(/\r?\n/).map((line) => String(line || "").trim()).filter(Boolean);
      safe = lines.length ? lines[lines.length - 1] : safe;
      const tailSplit = safe.split(/[。！？!?]/).map((item) => String(item || "").trim()).filter(Boolean);
      let hint = tailSplit.length ? tailSplit[tailSplit.length - 1] : safe;
      if (hint.length > 80) {
        hint = hint.slice(0, 80).trim();
      }
      return hint;
    }

    function detectOpenLoopFollowup(text = "") {
      const safe = String(text || "").replace(/\s+/g, " ").trim();
      if (!safe) {
        return { pending: false, reason: "", topicHint: "" };
      }
      if (/[?？][”"'’）)\]]*\s*$/.test(safe)) {
        return {
          pending: true,
          reason: "question_tail",
          topicHint: buildConversationFollowupTopicHint(safe)
        };
      }
      if (/(你觉得呢|要不要|要不要我继续)/i.test(safe)) {
        return {
          pending: true,
          reason: "keyword_hint",
          topicHint: buildConversationFollowupTopicHint(safe)
        };
      }
      return { pending: false, reason: "", topicHint: "" };
    }

    function updateConversationFollowupState(assistantText = "") {
      if (state.conversationMode?.enabled !== true) {
        state.followupPending = false;
        state.followupReason = "";
        state.followupTopicHint = "";
        state.followupUpdatedAt = 0;
        return;
      }
      const result = detectOpenLoopFollowup(assistantText);
      state.followupPending = result.pending === true;
      state.followupReason = String(result.reason || "");
      state.followupTopicHint = String(result.topicHint || "");
      state.followupUpdatedAt = Date.now();
    }

    function pickAutoChatPrimaryReason(reasons = []) {
      for (const key of AUTO_CHAT_REASON_PRIORITY) {
        if (Array.isArray(reasons) && reasons.includes(key)) {
          return key;
        }
      }
      if (Array.isArray(reasons) && reasons.length > 0) {
        return String(reasons[0] || "").trim() || "spontaneous";
      }
      return "spontaneous";
    }

    function analyzeAutoChatContext() {
      const now = Date.now();
      const tuning = state.autoChatTuning || {};
      const repeatReasonWindowMs = Math.max(
        2 * 60 * 1000,
        Number(tuning.repeatReasonWindowMs) || AUTO_CHAT_REPEAT_REASON_WINDOW_MS
      );
      const repeatTopicWindowMs = Math.max(
        2 * 60 * 1000,
        Number(tuning.repeatTopicWindowMs) || AUTO_CHAT_REPEAT_TOPIC_WINDOW_MS
      );
      const burstResetWindowMs = Math.max(
        3 * 60 * 1000,
        Number(tuning.burstResetWindowMs) || AUTO_CHAT_BURST_RESET_WINDOW_MS
      );
      const records = Array.isArray(state.chatRecords) ? state.chatRecords : [];
      const recent = records.slice(-16);
      const recentUsers = recent
        .filter((item) => item && item.role === "user" && typeof item.content === "string")
        .slice(-8);
      const lastUser = recentUsers.length ? recentUsers[recentUsers.length - 1] : null;
      const prevUser = recentUsers.length > 1 ? recentUsers[recentUsers.length - 2] : null;
      const lastAssistant = [...recent].reverse().find((item) => item && item.role === "assistant") || null;

      const lastUserText = String(lastUser?.content || "").trim();
      const prevUserText = String(prevUser?.content || "").trim();
      const lastAssistantText = String(lastAssistant?.content || "").trim();
      const assistantRawTs = Number(lastAssistant?.timestamp);
      const lastAssistantTs = Number.isFinite(assistantRawTs) && assistantRawTs > 0
        ? Math.round(assistantRawTs)
        : 0;
      const minsSinceAssistant = lastAssistantTs > 0 ? (now - lastAssistantTs) / 60000 : 999;
      const silentMinutes = Math.max(0, Math.round((now - (state.lastUserMessageAt || now)) / 60000));

      let score = 0;
      const reasons = [];
      const topicSeeds = [];

      if (silentMinutes >= 140) {
        score += 1.1;
        reasons.push("long_silence");
      } else if (silentMinutes >= 55) {
        score += 0.68;
        reasons.push("mid_silence");
      }

      if (lastUserText) {
        if (AUTO_CHAT_EMO_RE.test(lastUserText)) {
          score += 0.95;
          reasons.push("emotion_signal");
          topicSeeds.push(lastUserText.slice(0, 40));
        }
        if (AUTO_CHAT_MIRROR_RE.test(lastUserText)) {
          score += 0.62;
          reasons.push("mirror_question");
          topicSeeds.push(lastUserText.slice(0, 40));
        }
        if (lastUserText.length >= 16 && AUTO_CHAT_TOPIC_RE.test(lastUserText)) {
          score += 0.52;
          reasons.push("topic_hot");
          topicSeeds.push(lastUserText.slice(0, 40));
        }
        if (AUTO_CHAT_OPEN_LOOP_RE.test(lastUserText)) {
          score += 0.62;
          reasons.push("open_loop");
          topicSeeds.push(lastUserText.slice(0, 40));
        }
      }

      const longUserCount = recentUsers
        .filter((item) => String(item?.content || "").trim().length >= 16)
        .length;
      if (longUserCount >= 2 && silentMinutes >= 10) {
        score += 0.3;
        reasons.push("deep_talk_pause");
      }

      if (lastAssistantText) {
        const hasPendingQuestion = AUTO_CHAT_ASK_RE.test(lastAssistantText)
          || /(你觉得|你会|你想|要不要|可以吗|想听|要不要我)/.test(lastAssistantText);
        if (hasPendingQuestion && silentMinutes >= 5) {
          score += 0.56;
          reasons.push("followup_pending");
        }
        if (hasPendingQuestion && AUTO_CHAT_BRIEF_REPLY_RE.test(lastUserText) && silentMinutes >= 3) {
          score += 0.45;
          reasons.push("brief_ack_drop");
        }
      }

      if (!lastUserText && prevUserText && AUTO_CHAT_TOPIC_RE.test(prevUserText)) {
        topicSeeds.push(prevUserText.slice(0, 40));
      }

      if (minsSinceAssistant < 3) {
        score -= 0.8;
      }
      if (minsSinceAssistant < 1.5) {
        score -= 1.2;
      }
      if (state.lastAutoChatAt > 0 && now - state.lastAutoChatAt < 7 * 60 * 1000) {
        score -= Math.max(0, Number(tuning.recentAutoPenalty) || 0.45);
      }

      const topicHint = normalizeAutoChatTopicHint(topicSeeds.find(Boolean) || "");
      const primaryReason = pickAutoChatPrimaryReason(reasons);

      let threshold = Number.isFinite(Number(tuning.triggerBaseThreshold))
        ? Number(tuning.triggerBaseThreshold)
        : 1.03;
      if (silentMinutes < 15) {
        threshold += Math.max(0, Number(tuning.shortSilencePenalty) || 0.35);
      }
      if (silentMinutes >= 90) {
        threshold -= Math.max(0, Number(tuning.longSilenceBonus) || 0.14);
      }
      if (reasons.includes("emotion_signal") || reasons.includes("open_loop")) {
        threshold -= Math.max(0, Number(tuning.emotionBonus) || 0.12);
      }

      const sameReasonRecent = !!state.autoChatLastReason
        && state.autoChatLastReason === primaryReason
        && now - (state.lastAutoChatAt || 0) < repeatReasonWindowMs;
      if (sameReasonRecent) {
        threshold += Math.max(0, Number(tuning.repeatReasonPenalty) || 0.44);
      }

      const lastTopic = normalizeAutoChatTopicHint(state.autoChatLastTopicHint || "");
      const sameTopicRecent = !!topicHint
        && !!lastTopic
        && (topicHint.includes(lastTopic) || lastTopic.includes(topicHint))
        && now - (state.autoChatLastTopicAt || 0) < repeatTopicWindowMs;
      if (sameTopicRecent) {
        threshold += Math.max(0, Number(tuning.repeatTopicPenalty) || 0.48);
      }

      if ((Number(state.autoChatBurstCount) || 0) >= 2 && now - (state.lastAutoChatAt || 0) < burstResetWindowMs) {
        threshold += Math.max(0, Number(tuning.burstPenalty) || 0.32);
      }

      const jitterSpan = Math.max(0, Number(tuning.scoreJitter) || 0.12);
      const jitter = (Math.random() - 0.5) * jitterSpan;
      const finalScore = score + jitter;
      return {
        shouldTrigger: finalScore >= threshold,
        score: finalScore,
        threshold,
        reasons,
        primaryReason,
        topicHint,
        silentMinutes
      };
    }

    function buildAutoChatPrompt(context = null) {
      const ctx = context && typeof context === "object" ? context : analyzeAutoChatContext();
      const hour = new Date().getHours();
      const clockText = hour < 5
        ? `深夜${hour}点`
        : hour < 9
          ? `早上${hour}点`
          : hour < 12
            ? `上午${hour}点`
            : hour < 14
              ? "中午"
              : hour < 18
                ? `下午${hour}点`
                : hour < 22
                  ? `晚上${hour}点`
                  : "夜里";
      const reason = String(ctx.primaryReason || "").trim();
      const reasonHint = AUTO_CHAT_REASON_HINTS[reason] || "像突然想到一样自然开口。";
      const styleNote = AUTO_CHAT_STYLE_NOTES[Math.floor(Math.random() * AUTO_CHAT_STYLE_NOTES.length)]
        || AUTO_CHAT_STYLE_NOTES[0];
      const topicHint = normalizeAutoChatTopicHint(ctx.topicHint || "");
      const topicLine = topicHint
        ? `可借用线索：「${topicHint}」。`
        : "没有明确线索时，就用当下的一句感受开场。";
      const brevityLine = (Number(ctx.silentMinutes) || 0) >= 90
        ? "一句也可以，最多两句。"
        : "最多两句，优先一句。";

      return [
        "你现在是桌宠馨语AI桌宠，要主动开口。",
        `当前时段：${clockText}。`,
        `触发线索：${reasonHint}`,
        topicLine,
        `语气要求：${styleNote}`,
        "直接输出你要说的话，不要解释你为什么主动开口。",
        `${brevityLine} 尽量用陈述句收尾。`,
        "避免问候模板（如“在吗/哈喽/早安模板”）和任务播报腔。"
      ].join("\n");
    }

    function scheduleNextAutoChat() {
      if (!state.autoChatEnabled) return;
      const minMs = Math.max(60000, state.autoChatMinMs || 180000);
      const maxMs = Math.max(minMs + 30000, state.autoChatMaxMs || 480000);
      const delay = Math.round(minMs + Math.random() * (maxMs - minMs));
      state.autoChatTimer = setTimeout(() => {
        if (!state.autoChatEnabled) return;
        const context = analyzeAutoChatContext();
        if (!shouldSkipAutoChat() && context.shouldTrigger) {
          const triggerReason = String(context.primaryReason || "").trim();
          const triggerTopic = normalizeAutoChatTopicHint(context.topicHint || "");
          requestAssistantReply(buildAutoChatPrompt(context), {
              showUser: false,
              rememberUser: false,
              rememberAssistant: true,
              auto: true,
              silentError: true
            }).then((ok) => {
              if (ok) {
                const now = Date.now();
                const previousAutoAt = Number(state.lastAutoChatAt) || 0;
                const burstResetWindowMs = Math.max(
                  3 * 60 * 1000,
                  Number(state.autoChatTuning?.burstResetWindowMs) || AUTO_CHAT_BURST_RESET_WINDOW_MS
                );
                state.lastAutoChatAt = now;
                state.autoChatLastReason = triggerReason;
                state.autoChatLastTopicHint = triggerTopic;
                state.autoChatLastTopicAt = triggerTopic ? now : 0;
                state.autoChatBurstCount = previousAutoAt > 0 && now - previousAutoAt < burstResetWindowMs
                  ? Math.min(6, (Number(state.autoChatBurstCount) || 0) + 1)
                  : 1;
              }
            }).catch(() => {
              // ignore
            });
        }
        // 无论是否跳过，都重新调度，保持随机间隔
        scheduleNextAutoChat();
      }, delay);
    }

    function startAutoChatLoop() {
      stopAutoChatLoop();
      if (!state.autoChatEnabled) return;
      scheduleNextAutoChat();
    }

    async function captureDesktopSnapshot() {
      if (!state.desktopCanCapture) {
        return "";
      }
      try {
        const dataUrl = await window.electronAPI.captureDesktop();
        if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
          return dataUrl;
        }
      } catch (err) {
        console.warn("Desktop capture failed:", err);
      }
      return "";
    }

    function shouldAttachDesktopImage(message, isAuto = false) {
      if (!state.observeDesktop || !state.desktopCanCapture) {
        return false;
      }
      if (isAuto && !state.observeAllowAutoChat) {
        return false;
      }
      if (state.observeAttachMode === "always") {
        return true;
      }
      return VISION_INTENT_RE.test(String(message || ""));
    }


    return {
      stopAutoChatLoop,
      shouldSkipAutoChat,
      shouldPlayLatencyHint,
      pickLatencyHintText,
      normalizeAutoChatTopicHint,
      buildConversationFollowupTopicHint,
      detectOpenLoopFollowup,
      updateConversationFollowupState,
      pickAutoChatPrimaryReason,
      analyzeAutoChatContext,
      buildAutoChatPrompt,
      scheduleNextAutoChat,
      startAutoChatLoop,
      captureDesktopSnapshot,
      shouldAttachDesktopImage
    };
  }

  const api = { createController };
  root.TaffyAutoChatController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
