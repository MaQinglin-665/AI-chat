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
    const AUTO_CHAT_MIN_USER_GAP_MS = constants.AUTO_CHAT_MIN_USER_GAP_MS || 45 * 1000;
    const AUTO_CHAT_MIN_ASSISTANT_GAP_MS = constants.AUTO_CHAT_MIN_ASSISTANT_GAP_MS || 60 * 1000;
    const AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS = constants.AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS || 4 * 60 * 1000;
    const AUTO_CHAT_INTERJECTION_COOLDOWN_MS = constants.AUTO_CHAT_INTERJECTION_COOLDOWN_MS || 24 * 1000;
    const AUTO_CHAT_INTERJECTION_RETRY_MS = constants.AUTO_CHAT_INTERJECTION_RETRY_MS || 1400;
    const AUTO_CHAT_INTERJECTION_MAX_RETRIES = constants.AUTO_CHAT_INTERJECTION_MAX_RETRIES || 8;
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
    const AUTO_CHAT_STYLE_NOTES = constants.AUTO_CHAT_STYLE_NOTES || [
      "Keep it casual, present, and easy to ignore."
    ];
    const WAITING_VOICE_HINTS = constants.WAITING_VOICE_HINTS || ["I'm thinking, one second."];
    const VISION_INTENT_RE = constants.VISION_INTENT_RE || /a^/;
    function isAssistantSpeechActive() {
      const phase = String(state.speechPhase || "").trim().toLowerCase();
      const now = Date.now();
      return state.ttsContextSpeaking === true
        || state.streamSpeakWorking === true
        || phase === "speaking"
        || (Number(state.speechAnimUntil || 0) > now + 80);
    }

    function isUserSpeechInputActive() {
      return state.localAsrSpeeching === true
        || state.localAsrSending === true
        || (state.micOpen === true
          && Number(state.micSuspendDepth || 0) <= 0
          && state.recognitionActive === true);
    }

    function stopAutoChatLoop() {
      if (!state.autoChatTimer) {
        return;
      }
      clearTimeout(state.autoChatTimer);
      state.autoChatTimer = 0;
    }

    function stopTurnInterjectionTimer() {
      if (!state.autoChatInterjectionTimer) {
        return;
      }
      clearTimeout(state.autoChatInterjectionTimer);
      state.autoChatInterjectionTimer = 0;
    }

    function rememberAutoChatSuccess(context = {}) {
      const now = Date.now();
      const previousAutoAt = Number(state.lastAutoChatAt) || 0;
      const burstResetWindowMs = Math.max(
        3 * 60 * 1000,
        Number(state.autoChatTuning?.burstResetWindowMs) || AUTO_CHAT_BURST_RESET_WINDOW_MS
      );
      const triggerReason = String(context.primaryReason || "spontaneous").trim() || "spontaneous";
      const triggerTopic = normalizeAutoChatTopicHint(context.topicHint || "");
      state.lastAutoChatAt = now;
      state.autoChatLastReason = triggerReason;
      state.autoChatLastTopicHint = triggerTopic;
      state.autoChatLastTopicAt = triggerTopic ? now : 0;
      state.autoChatLastExplanation = buildAutoChatTriggerExplanation(context);
      state.autoChatBurstCount = previousAutoAt > 0 && now - previousAutoAt < burstResetWindowMs
        ? Math.min(6, (Number(state.autoChatBurstCount) || 0) + 1)
        : 1;
      if (context.interjection === true) {
        state.autoChatInterjectionLastAt = now;
      }
    }

    function shouldSkipAutoChat() {
      if (state.chatBusy) {
        return true;
      }
      if (isAssistantSpeechActive()) {
        return true;
      }
      if (isUserSpeechInputActive()) {
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

    function shouldSkipTurnInterjection(context = {}) {
      if (state.autoChatEnabled !== true) {
        return { skip: true, reason: "disabled" };
      }
      if (state.chatBusy) {
        return { skip: true, reason: "busy", retry: true };
      }
      if (isAssistantSpeechActive()) {
        return { skip: true, reason: "assistant_speaking", retry: true };
      }
      if (isUserSpeechInputActive()) {
        return { skip: true, reason: "user_speaking" };
      }
      if (ui.chatInput) {
        const focused = document.activeElement === ui.chatInput;
        const typing = ui.chatInput.value.trim().length > 0;
        if (focused && typing) {
          return { skip: true, reason: "user_typing" };
        }
      }
      const now = Date.now();
      if (state.lastAutoChatAt > 0 && now - state.lastAutoChatAt < AUTO_CHAT_INTERJECTION_COOLDOWN_MS) {
        return { skip: true, reason: "cooldown" };
      }
      if (state.autoChatInterjectionLastAt > 0 && now - state.autoChatInterjectionLastAt < AUTO_CHAT_INTERJECTION_COOLDOWN_MS) {
        return { skip: true, reason: "interjection_cooldown" };
      }
      const expectedUserAt = Number(context.expectedUserAt || 0);
      if (expectedUserAt > 0 && Number(state.lastUserMessageAt || 0) > expectedUserAt + 50) {
        return { skip: true, reason: "new_user_turn" };
      }
      const expectedAssistantAt = Number(context.expectedAssistantAt || 0);
      if (expectedAssistantAt > 0 && Number(state.conversationLastAssistantAt || 0) > expectedAssistantAt + 50) {
        return { skip: true, reason: "new_assistant_turn" };
      }
      return { skip: false, reason: "" };
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
      const userSilenceMs = Math.max(0, now - (state.lastUserMessageAt || now));
      const silentMinutes = Math.max(0, Math.round(userSilenceMs / 60000));

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
        const lastUserWasQuestion = AUTO_CHAT_ASK_RE.test(lastUserText);
        const lastUserWasBrief = AUTO_CHAT_BRIEF_REPLY_RE.test(lastUserText);
        if (!lastUserWasQuestion && userSilenceMs >= 45 * 1000 && userSilenceMs <= 8 * 60 * 1000) {
          score += lastUserWasBrief ? 0.38 : 0.72;
          reasons.push(lastUserWasBrief ? "quiet_ack" : "stage_pause");
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
        : 0.82;
      if (silentMinutes < 15) {
        threshold += Math.max(0, Number(tuning.shortSilencePenalty) || 0.16);
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
      const context = {
        shouldTrigger: finalScore >= threshold,
        score: finalScore,
        threshold,
        reasons,
        primaryReason,
        topicHint,
        silentMinutes
      };
      context.brainGate = buildAutoChatBrainGate(context);
      context.explanation = buildAutoChatTriggerExplanation(context);
      return context;
    }

    function buildTurnInterjectionContext(input = {}) {
      const userText = String(input.userText || "").replace(/\s+/g, " ").trim();
      const assistantText = String(input.assistantText || "").replace(/\s+/g, " ").trim();
      const intent = String(input.brainSnapshot?.intent || input.intent || "").trim().toLowerCase();
      const mood = String(input.mood || "").trim().toLowerCase();
      const loweredUser = userText.toLowerCase();
      const loweredAssistant = assistantText.toLowerCase();
      const reasons = [];
      const topicSeeds = [];
      let score = 0;

      if (!userText || userText.startsWith("/")) {
        return { shouldTrigger: false, primaryReason: "no_interjection", reasons: [], score: 0, threshold: 1 };
      }
      if (/doctor|debug|api key|token|password|secret|private key/i.test(userText)) {
        return { shouldTrigger: false, primaryReason: "safety_quiet", reasons: ["safety_quiet"], score: 0, threshold: 1 };
      }
      if (/sleep|good night|bye|later|leave|exit|i'?m going to sleep|我要睡|晚安|再见/i.test(userText)) {
        return { shouldTrigger: false, primaryReason: "closing_quiet", reasons: ["closing_quiet"], score: 0, threshold: 1 };
      }
      if (/(feel bad|sad|depressed|anxious|panic|hurt|难受|难过|焦虑)/i.test(userText) || intent === "comfort" || mood === "sad") {
        return { shouldTrigger: false, primaryReason: "comfort_quiet", reasons: ["comfort_quiet"], score: 0, threshold: 1 };
      }
      if (intent === "task_help" || intent === "reminder" || intent === "doctor" || intent === "debug") {
        return { shouldTrigger: false, primaryReason: "focused_quiet", reasons: ["focused_quiet"], score: 0, threshold: 1 };
      }

      if (/(wrong|mistake|not true|you lied|you were off|不对|错了|说错)/i.test(userText)) {
        score += 1.05;
        reasons.push("correction_afterthought");
      }
      if (/(desk|desktop|cursor|window|screen|keyboard|weird|strange|怪|桌面|光标|键盘)/i.test(userText)) {
        score += 0.92;
        reasons.push("stage_observation");
        topicSeeds.push(userText);
      }
      if (/(finished|done|completed|it works|搞定|完成|好了)/i.test(userText)) {
        score += 0.82;
        reasons.push("completion_spark");
      }
      if (AUTO_CHAT_MIRROR_RE.test(userText)) {
        score += 0.7;
        reasons.push("handed_back");
      }
      if (AUTO_CHAT_ASK_RE.test(userText) && assistantText.length > 0 && assistantText.length < 260) {
        score += 0.48;
        reasons.push("answer_afterthought");
      }
      if (userText.length >= 10 && userText.length <= 120 && !AUTO_CHAT_ASK_RE.test(userText)) {
        score += 0.46;
        reasons.push("small_stage_thought");
        topicSeeds.push(userText);
      }
      if (/\?$/.test(loweredAssistant) || /what do you think|anything else|let me know/.test(loweredAssistant)) {
        score -= 0.35;
      }

      const threshold = reasons.includes("correction_afterthought") || reasons.includes("stage_observation")
        ? 0.62
        : 0.72;
      const primaryReason = pickAutoChatPrimaryReason(reasons);
      const topicHint = normalizeAutoChatTopicHint(topicSeeds.find(Boolean) || userText);
      const delayMs = Math.round(2600 + Math.random() * 5200);
      const context = {
        interjection: true,
        shouldTrigger: score >= threshold,
        score,
        threshold,
        reasons,
        primaryReason: primaryReason === "spontaneous" ? "afterthought" : primaryReason,
        topicHint,
        silentMinutes: 0,
        expectedUserAt: Number(input.userTimestamp || state.lastUserMessageAt || 0),
        expectedAssistantAt: Number(input.assistantTimestamp || state.conversationLastAssistantAt || 0),
        delayMs,
        assistantHint: assistantText.slice(0, 140)
      };
      context.brainGate = buildAutoChatBrainGate(context);
      context.explanation = buildAutoChatTriggerExplanation(context);
      return context;
    }

    function buildAutoChatBrainGate(context = {}) {
      const reason = String(context.primaryReason || "spontaneous").trim() || "spontaneous";
      return {
        intent: "low_interrupt_checkin",
        reason,
        optional: true,
        canIgnore: true,
        singleSentence: true,
        maxSentences: 1,
        allowFollowupQuestion: false,
        allowDesktopObservation: false,
        allowFileRead: false,
        allowShell: false,
        allowToolCall: false,
        voiceStyle: "soft",
        action: "none",
        cooldownMs: AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS,
        explanation: buildAutoChatTriggerExplanation(context)
      };
    }

    function buildAutoChatTriggerExplanation(context = {}) {
      const reason = String(context.primaryReason || "spontaneous").trim() || "spontaneous";
      const labels = {
        followup_pending: "the last thread still has a soft open loop",
        correction_afterthought: "Taffy had a quick recovery thought after being corrected",
        stage_observation: "the recent turn left a stage object to react to",
        completion_spark: "the user finished something and the moment still has energy",
        handed_back: "the user handed the thought back",
        answer_afterthought: "Taffy has a small thought after answering",
        small_stage_thought: "the last turn left room for a small aside",
        afterthought: "Taffy had a small thought after the turn",
        stage_pause: "the user left a small stage pause",
        quiet_ack: "the user gave a quiet acknowledgement",
        long_silence: "things have been quiet for a while",
        mid_silence: "there has been a short quiet pause",
        emotion_signal: "the recent tone carried an emotional signal",
        open_loop: "the last message left a light open thread",
        topic_hot: "the recent topic still has a little energy",
        mirror_question: "the user handed the thought back",
        brief_ack_drop: "the user closed with a very short acknowledgement",
        deep_talk_pause: "the previous exchange was a little deeper, then paused",
        spontaneous: "low-interruption companion check-in"
      };
      const topic = normalizeAutoChatTopicHint(context.topicHint || "");
      const base = labels[reason] || labels.spontaneous;
      return topic ? `${base}; clue: ${topic}` : base;
    }

    function buildAutoChatPrompt(context = null) {
      const ctx = context && typeof context === "object" ? context : analyzeAutoChatContext();
      const hour = new Date().getHours();
      const clockText = hour < 5
        ? `late night, around ${hour}:00`
        : hour < 9
          ? `morning, around ${hour}:00`
          : hour < 12
            ? `late morning, around ${hour}:00`
            : hour < 14
              ? "midday"
              : hour < 18
                ? `afternoon, around ${hour}:00`
                : hour < 22
                  ? `evening, around ${hour}:00`
                  : "night";
      const reason = String(ctx.primaryReason || "").trim();
      const reasonHint = AUTO_CHAT_REASON_HINTS[reason] || "Open naturally, like a small thought surfaced.";
      const styleNote = AUTO_CHAT_STYLE_NOTES[Math.floor(Math.random() * AUTO_CHAT_STYLE_NOTES.length)]
        || AUTO_CHAT_STYLE_NOTES[0];
      const topicHint = normalizeAutoChatTopicHint(ctx.topicHint || "");
      const topicLine = topicHint
        ? `Possible thread: "${topicHint}".`
        : "No explicit thread; use one grounded present-moment line.";
      const brevityLine = "Use exactly one short sentence.";
      const brainGate = buildAutoChatBrainGate(ctx);
      const openingLine = ctx.interjection === true
        ? "You are Taffy, a small desktop AI companion. This is a quick afterthought after the last turn, like she had her own tiny thought bubble."
        : "You are Taffy, a small desktop AI companion. This is a proactive low-interruption check-in.";
      const afterthoughtLine = ctx.interjection === true
        ? "Make it feel like a spontaneous interjection between friends; it can be mildly teasing or deadpan when safe, but never turns into a new task."
        : "Make it feel like a live stage aside, not a customer-service follow-up.";

      return [
        openingLine,
        `Current time hint: ${clockText}.`,
        `Trigger clue: ${reasonHint}`,
        topicLine,
        `Tone: ${styleNote}`,
        `Character brain guard: ${brainGate.intent}; max_sentences=${brainGate.maxSentences}; optional=true; can_ignore=true; no desktop observation; no file read; no shell; no tool call; do not require a reply.`,
        `Why now: ${brainGate.explanation}`,
        ctx.assistantHint ? `Previous answer vibe: "${String(ctx.assistantHint).replace(/"/g, "'")}".` : "",
        "Reply in English only.",
        "Output only the line Taffy should say. Do not explain why you are speaking.",
        `${brevityLine} Prefer a statement the user can ignore; do not force an answer.`,
        afterthoughtLine,
        "Avoid greeting templates, task-report language, and notification wording."
      ].filter(Boolean).join("\n");
    }

    function dispatchAutoChatContext(context = {}) {
      const prompt = buildAutoChatPrompt(context);
      return requestAssistantReply(prompt, {
        showUser: false,
        rememberUser: false,
        rememberAssistant: true,
        auto: true,
        dropIfSpeaking: true,
        skipDesktopAttach: true,
        silentError: true
      }).then((ok) => {
        if (ok) {
          rememberAutoChatSuccess(context);
        }
        return ok;
      }).catch(() => false);
    }

    function scheduleTurnInterjection(input = {}) {
      stopTurnInterjectionTimer();
      const context = buildTurnInterjectionContext(input);
      state.autoChatInterjectionLastContext = context;
      if (state.autoChatEnabled !== true || context.shouldTrigger !== true) {
        return { scheduled: false, context };
      }
      const run = (attempt = 0) => {
        state.autoChatInterjectionTimer = 0;
        const skip = shouldSkipTurnInterjection(context);
        if (!skip.skip) {
          dispatchAutoChatContext(context);
          return;
        }
        state.autoChatInterjectionLastSuppressed = skip.reason || "skipped";
        if (skip.retry && attempt < AUTO_CHAT_INTERJECTION_MAX_RETRIES) {
          state.autoChatInterjectionTimer = window.setTimeout(() => run(attempt + 1), AUTO_CHAT_INTERJECTION_RETRY_MS);
        }
      };
      state.autoChatInterjectionTimer = window.setTimeout(() => run(0), Math.max(500, Number(context.delayMs) || 3600));
      return { scheduled: true, context };
    }

    function scheduleNextAutoChat() {
      if (!state.autoChatEnabled) return;
      const minMs = Math.max(60000, state.autoChatMinMs || 60000);
      const maxMs = Math.max(minMs + 30000, state.autoChatMaxMs || 180000);
      const delay = Math.round(minMs + Math.random() * (maxMs - minMs));
      state.autoChatTimer = setTimeout(() => {
        if (!state.autoChatEnabled) return;
        const context = analyzeAutoChatContext();
        if (!shouldSkipAutoChat() && context.shouldTrigger) {
          dispatchAutoChatContext(context);
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
      buildTurnInterjectionContext,
      shouldSkipTurnInterjection,
      buildAutoChatBrainGate,
      buildAutoChatTriggerExplanation,
      buildAutoChatPrompt,
      scheduleTurnInterjection,
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
