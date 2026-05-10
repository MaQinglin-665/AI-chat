(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const document = deps.documentObject || root.document || {};
    const window = deps.windowObject || root;
    const constants = deps.constants || {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const parseMessageTimestamp = typeof deps.parseMessageTimestamp === "function" ? deps.parseMessageTimestamp : (value) => Number(value) || Date.now();
    const requestAssistantReply = typeof deps.requestAssistantReply === "function" ? deps.requestAssistantReply : async () => false;
    const enqueueActionIntent = typeof deps.enqueueActionIntent === "function" ? deps.enqueueActionIntent : () => {};
    const triggerExpressionPulse = typeof deps.triggerExpressionPulse === "function" ? deps.triggerExpressionPulse : () => {};
    const turnTakingDirector = deps.turnTakingDirector || root.TaffyTurnTakingDirector || {};
    const AUTO_CHAT_MIN_USER_GAP_MS = constants.AUTO_CHAT_MIN_USER_GAP_MS || 45 * 1000;
    const AUTO_CHAT_MIN_ASSISTANT_GAP_MS = constants.AUTO_CHAT_MIN_ASSISTANT_GAP_MS || 60 * 1000;
    const AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS = constants.AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS || 4 * 60 * 1000;
    const AUTO_CHAT_INTERJECTION_COOLDOWN_MS = constants.AUTO_CHAT_INTERJECTION_COOLDOWN_MS || 22 * 1000;
    const AUTO_CHAT_INTERJECTION_RETRY_MS = constants.AUTO_CHAT_INTERJECTION_RETRY_MS || 1400;
    const AUTO_CHAT_INTERJECTION_MAX_RETRIES = constants.AUTO_CHAT_INTERJECTION_MAX_RETRIES || 30;
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
    const THOUGHT_BURST_BUDGETS = {
      none: { label: "quiet", min: 0, max: 0, guide: "Do not speak." },
      mutter: { label: "1 sentence", min: 1, max: 1, guide: "A quick mutter is enough." },
      aside: { label: "1-2 sentences", min: 1, max: 2, guide: "A small side thought may take one or two sentences." },
      tiny_rant: { label: "2-4 short beats", min: 2, max: 4, guide: "Let the thought run for a few short beats, then stop before it becomes an assistant answer." },
      callback: { label: "1-2 sentences", min: 1, max: 2, guide: "Briefly callback the recent stage bit without turning it into a catchphrase." },
      mock_defense: { label: "1-3 sentences", min: 1, max: 3, guide: "A little mock-defensive recovery is allowed, but own the miss." },
      celebration: { label: "1-3 sentences", min: 1, max: 3, guide: "Celebrate like a spontaneous desk-side victory lap." },
      topic_spark: { label: "1-3 sentences", min: 1, max: 3, guide: "Follow the sudden association for a moment, then land it." }
    };
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

    function isUserTypingNow() {
      if (!ui.chatInput) {
        return false;
      }
      return document.activeElement === ui.chatInput && String(ui.chatInput.value || "").trim().length > 0;
    }

    function buildTurnTakingDecisionForContext(context = {}, attempt = 0) {
      const builder = typeof turnTakingDirector.buildTurnTakingDecision === "function"
        ? turnTakingDirector.buildTurnTakingDecision
        : null;
      if (!builder) {
        return {
          version: 1,
          decision: isAssistantSpeechActive() || state.chatBusy ? "defer_until_tts_end" : "interject_now",
          reason: isAssistantSpeechActive() || state.chatBusy ? "assistant_speaking" : "both_idle",
          queued: isAssistantSpeechActive() || state.chatBusy,
          retry: isAssistantSpeechActive() || state.chatBusy,
          delay_ms: isAssistantSpeechActive() || state.chatBusy ? AUTO_CHAT_INTERJECTION_RETRY_MS : Math.max(500, Number(context.delayMs) || 900),
          silence_window_ms: 650,
          conversation_pressure: Math.max(0, Math.min(3, Number(context.score || 0))),
          pending_thought_type: String(context.director?.thought_type || "none"),
          suppressed: [],
          updated_at: Date.now()
        };
      }
      return builder({
        context,
        state,
        nowMs: Date.now(),
        userSpeaking: isUserSpeechInputActive(),
        userTyping: isUserTypingNow(),
        assistantSpeaking: isAssistantSpeechActive(),
        chatBusy: state.chatBusy === true,
        cooldownMs: AUTO_CHAT_INTERJECTION_COOLDOWN_MS,
        retryMs: AUTO_CHAT_INTERJECTION_RETRY_MS,
        attempt
      });
    }

    function rememberTurnTakingDecision(decision = null, context = {}) {
      const summary = typeof turnTakingDirector.toPublicTurnTakingSummary === "function"
        ? turnTakingDirector.toPublicTurnTakingSummary(decision)
        : decision;
      state.turnTakingLastDecision = summary;
      state.turnTakingLastUpdatedAt = Date.now();
      state.turnTakingLastSuppressed = String(summary?.reason || "");
      if (summary && ["queue_after_user", "defer_until_tts_end", "interject_now"].includes(summary.decision) && typeof turnTakingDirector.buildPendingThoughtBurst === "function") {
        state.turnTakingPendingThoughtBurst = turnTakingDirector.buildPendingThoughtBurst(context, summary, Date.now());
      } else if (summary && (summary.decision === "interject_now" || summary.decision === "cancel_stale_thought" || summary.decision === "hold")) {
        state.turnTakingPendingThoughtBurst = null;
      }
      return summary;
    }

    function stopAutoChatLoop() {
      if (!state.autoChatTimer) {
        stopTurnInterjectionTimer();
        return;
      }
      clearTimeout(state.autoChatTimer);
      state.autoChatTimer = 0;
      stopTurnInterjectionTimer();
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
      const turn = rememberTurnTakingDecision(buildTurnTakingDecisionForContext(context), context);
      if (!turn || turn.decision === "interject_now") {
        return { skip: false, reason: "" };
      }
      if (turn.decision === "defer_until_tts_end") {
        return { skip: true, reason: turn.reason === "chat_busy" ? "busy" : "assistant_speaking", retry: true };
      }
      if (turn.decision === "queue_after_user") {
        return { skip: true, reason: turn.reason || "user_speaking", retry: true };
      }
      if (turn.decision === "cancel_stale_thought") {
        state.turnTakingPendingThoughtBurst = null;
        return { skip: true, reason: turn.reason || "cancel_stale_thought", retry: false };
      }
      if (turn.decision === "soft_react_only") {
        return { skip: true, reason: turn.reason || "soft_react_only", retry: false };
      }
      return { skip: true, reason: turn.reason || "hold", retry: false };
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

    function buildInterjectionDirectorPlan(context = {}, input = {}) {
      const reasons = Array.isArray(context.reasons)
        ? context.reasons.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      const primaryReason = String(context.primaryReason || reasons[0] || "afterthought").trim() || "afterthought";
      const protectedReasons = ["comfort_quiet", "closing_quiet", "focused_quiet", "safety_quiet", "no_interjection"];
      const safetyClamp = protectedReasons.includes(primaryReason)
        ? primaryReason
        : reasons.find((reason) => protectedReasons.includes(reason)) || "";
      const base = {
        version: 2,
        decision: "hold_back",
        stance: "quiet",
        chaos_level: 0,
        reason: primaryReason,
        safety_clamp: safetyClamp,
        thought_type: "none",
        length_budget: THOUGHT_BURST_BUDGETS.none.label,
        min_sentences: 0,
        max_sentences: 0,
        burst_reason: primaryReason,
        motion_cue: "none",
        pulse_style: "neutral",
        pulse_boost: 0,
        voice_style: "soft",
        can_speak: false,
        can_motion: false,
        no_desktop_observation: true,
        no_screenshot: true,
        no_file_read: true,
        no_shell: true,
        no_tools: true
      };

      if (safetyClamp) {
        return base;
      }

      const withThoughtBurst = (plan = {}, thoughtType = "aside") => {
        const type = THOUGHT_BURST_BUDGETS[thoughtType] ? thoughtType : "aside";
        const budget = THOUGHT_BURST_BUDGETS[type];
        return {
          ...base,
          ...plan,
          thought_type: type,
          length_budget: budget.label,
          min_sentences: budget.min,
          max_sentences: budget.max,
          burst_reason: plan.burst_reason || primaryReason,
          length_guide: budget.guide
        };
      };

      const score = Number(context.score || 0);
      const threshold = Number(context.threshold || 1);
      if (!(context.shouldTrigger === true || score >= threshold)) {
        return withThoughtBurst({
          decision: "react",
          stance: "listening",
          chaos_level: 1,
          safety_clamp: "",
          motion_cue: "micro_pulse",
          pulse_style: "neutral",
          pulse_boost: 0.16,
          can_motion: true
        }, "mutter");
      }

      if (reasons.includes("stage_callback")) {
        return withThoughtBurst({
          decision: "callback",
          stance: "callback_imp",
          chaos_level: 2,
          safety_clamp: "",
          motion_cue: "idle_fidget",
          pulse_style: "neutral",
          pulse_boost: 0.22,
          voice_style: "teasing",
          can_speak: true,
          can_motion: true
        }, "callback");
      }
      if (reasons.includes("correction_afterthought")) {
        return withThoughtBurst({
          decision: "interject",
          stance: "mock_defensive_repair",
          chaos_level: 2,
          safety_clamp: "",
          motion_cue: "embarrassed_recovery",
          pulse_style: "neutral",
          pulse_boost: 0.34,
          voice_style: "warm",
          can_speak: true,
          can_motion: true
        }, "mock_defense");
      }
      if (reasons.includes("stage_observation")) {
        return withThoughtBurst({
          decision: "interject",
          stance: "suspicious_deadpan",
          chaos_level: 3,
          safety_clamp: "",
          motion_cue: "side_eye",
          pulse_style: "neutral",
          pulse_boost: 0.34,
          voice_style: "dry",
          can_speak: true,
          can_motion: true
        }, "tiny_rant");
      }
      if (reasons.includes("completion_spark")) {
        return withThoughtBurst({
          decision: "interject",
          stance: "tiny_victory",
          chaos_level: 2,
          safety_clamp: "",
          motion_cue: "tiny_victory_nod",
          pulse_style: "cheerful",
          pulse_boost: 0.3,
          voice_style: "cheerful",
          can_speak: true,
          can_motion: true
        }, "celebration");
      }
      if (reasons.includes("handed_back")) {
        return withThoughtBurst({
          decision: "interject",
          stance: "opinionated",
          chaos_level: 2,
          safety_clamp: "",
          motion_cue: "head_tilt",
          pulse_style: "steady",
          pulse_boost: 0.26,
          voice_style: "curious",
          can_speak: true,
          can_motion: true
        }, "topic_spark");
      }
      if (reasons.includes("answer_afterthought")) {
        return withThoughtBurst({
          decision: "interject",
          stance: "answer_echo",
          chaos_level: 1,
          safety_clamp: "",
          motion_cue: "tiny_nod",
          pulse_style: "steady",
          pulse_boost: 0.22,
          voice_style: "soft",
          can_speak: true,
          can_motion: true
        }, "aside");
      }

      return withThoughtBurst({
        decision: "interject",
        stance: "small_aside",
        chaos_level: 1,
        safety_clamp: "",
        motion_cue: "micro_pulse",
        pulse_style: "neutral",
        pulse_boost: 0.22,
        voice_style: "soft",
        can_speak: true,
        can_motion: true
      }, "aside");
    }

    function buildQuietTurnInterjectionContext(primaryReason, reasons = []) {
      const safeReasons = Array.isArray(reasons) && reasons.length ? reasons : [primaryReason].filter(Boolean);
      const context = {
        interjection: true,
        shouldTrigger: false,
        primaryReason,
        reasons: safeReasons,
        score: 0,
        threshold: 1,
        topicHint: "",
        silentMinutes: 0,
        expectedUserAt: Number(state.lastUserMessageAt || 0),
        expectedAssistantAt: Number(state.conversationLastAssistantAt || 0),
        delayMs: 0,
        assistantHint: ""
      };
      context.director = buildInterjectionDirectorPlan(context);
      context.brainGate = buildAutoChatBrainGate(context);
      context.explanation = buildAutoChatTriggerExplanation(context);
      return context;
    }

    function getInterjectionMotionPlan(motionCue = "none") {
      const cue = String(motionCue || "none").trim().toLowerCase();
      const plans = {
        side_eye: { intent: "listen", style: "neutral", mood: "idle", boost: 0.34, tags: ["head", "eye", "side", "flick", "idle"] },
        head_tilt: { intent: "listen", style: "steady", mood: "thinking", boost: 0.26, tags: ["head", "tilt", "flick", "pose"] },
        tiny_nod: { intent: "listen", style: "steady", mood: "thinking", boost: 0.22, tags: ["nod", "head", "idle", "flick"] },
        tiny_victory_nod: { intent: "listen", style: "cheerful", mood: "happy", boost: 0.3, tags: ["nod", "happy", "head", "pose"] },
        embarrassed_recovery: { intent: "listen", style: "neutral", mood: "idle", boost: 0.34, tags: ["shy", "down", "head", "flickdown", "idle"] },
        idle_fidget: { intent: "idle", style: "neutral", mood: "idle", boost: 0.22, tags: ["idle", "touch", "body", "flick"] },
        micro_pulse: { intent: "listen", style: "neutral", mood: "idle", boost: 0.2, tags: ["idle", "tap", "flick"] }
      };
      return plans[cue] ? { cue, ...plans[cue] } : { cue: "none", intent: "none", style: "neutral", mood: "idle", boost: 0, tags: [] };
    }

    function executeInterjectionDirectorMotion(context = {}) {
      const director = context && typeof context === "object" ? context.director || {} : {};
      const motionCue = String(director.motion_cue || "none").trim().toLowerCase();
      if (director.can_motion !== true || !motionCue || motionCue === "none") {
        state.autoChatInterjectionLastMotion = "none";
        return false;
      }
      const plan = getInterjectionMotionPlan(motionCue);
      if (plan.intent === "none") {
        state.autoChatInterjectionLastMotion = "none";
        return false;
      }
      state.autoChatInterjectionLastMotion = plan.cue;
      try {
        triggerExpressionPulse(plan.style, Number(director.pulse_boost || plan.boost || 0.2), 420);
      } catch (err) {
        state.autoChatInterjectionLastMotion = `${plan.cue}:pulse_failed`;
      }
      try {
        enqueueActionIntent(plan.intent, {
          source: "auto_interjection_director",
          style: plan.style,
          mood: plan.mood,
          combo: true,
          motionCue: plan.cue,
          motionRole: "interjection_reaction",
          motionTags: plan.tags
        });
        state.autoChatInterjectionLastMotion = plan.cue;
        return true;
      } catch (err) {
        state.autoChatInterjectionLastMotion = `${plan.cue}:action_failed`;
        return false;
      }
    }

    function buildTurnInterjectionContext(input = {}) {
      const userText = String(input.userText || "").replace(/\s+/g, " ").trim();
      const assistantText = String(input.assistantText || "").replace(/\s+/g, " ").trim();
      const brainSnapshot = input.brainSnapshot && typeof input.brainSnapshot === "object" ? input.brainSnapshot : {};
      const intent = String(brainSnapshot.intent || input.intent || "").trim().toLowerCase();
      const mood = String(input.mood || "").trim().toLowerCase();
      const loweredUser = userText.toLowerCase();
      const loweredAssistant = assistantText.toLowerCase();
      const reasons = [];
      const topicSeeds = [];
      let score = 0;

      if (!userText || userText.startsWith("/")) {
        return buildQuietTurnInterjectionContext("no_interjection", ["no_interjection"]);
      }
      if (/doctor|debug|api key|token|password|secret|private key/i.test(userText)) {
        return buildQuietTurnInterjectionContext("safety_quiet", ["safety_quiet"]);
      }
      if (/sleep|good night|bye|later|leave|exit|i'?m going to sleep|我要睡|晚安|再见/i.test(userText)) {
        return buildQuietTurnInterjectionContext("closing_quiet", ["closing_quiet"]);
      }
      if (/(feel bad|sad|depressed|anxious|panic|hurt|难受|难过|焦虑)/i.test(userText) || intent === "comfort" || mood === "sad") {
        return buildQuietTurnInterjectionContext("comfort_quiet", ["comfort_quiet"]);
      }
      if (intent === "task_help" || intent === "reminder" || intent === "doctor" || intent === "debug") {
        return buildQuietTurnInterjectionContext("focused_quiet", ["focused_quiet"]);
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
      const stageMemory = brainSnapshot.stage_memory && typeof brainSnapshot.stage_memory === "object"
        ? brainSnapshot.stage_memory
        : (brainSnapshot.stageMemory && typeof brainSnapshot.stageMemory === "object" ? brainSnapshot.stageMemory : {});
      const improv = brainSnapshot.improv && typeof brainSnapshot.improv === "object" ? brainSnapshot.improv : {};
      const callbackPolicy = String(stageMemory.callback_policy || improv.callback_policy || "").trim().toLowerCase();
      const callbackBlocked = callbackPolicy === "none" || callbackPolicy === "blocked" || callbackPolicy === "avoid_repeat";
      const callbackSeed = normalizeAutoChatTopicHint(stageMemory.current_bit || stageMemory.recent_callback || stageMemory.mini_agenda || "");
      if (callbackSeed && !callbackBlocked && !reasons.includes("stage_observation")) {
        score += 0.8;
        reasons.push("stage_callback");
        topicSeeds.push(callbackSeed);
      }
      if (/\?$/.test(loweredAssistant) || /what do you think|anything else|let me know/.test(loweredAssistant)) {
        score -= 0.35;
      }

      const threshold = reasons.includes("correction_afterthought") || reasons.includes("stage_observation")
        || reasons.includes("stage_callback")
        ? 0.62
        : 0.72;
      const primaryReason = pickAutoChatPrimaryReason(reasons);
      const topicHint = normalizeAutoChatTopicHint(topicSeeds.find(Boolean) || userText);
      const delayMs = Math.round(450 + Math.random() * 1150);
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
      context.director = buildInterjectionDirectorPlan(context, input);
      context.shouldTrigger = context.director.decision === "interject" || context.director.decision === "callback";
      context.brainGate = buildAutoChatBrainGate(context);
      context.explanation = buildAutoChatTriggerExplanation(context);
      return context;
    }

    function buildAutoChatBrainGate(context = {}) {
      const reason = String(context.primaryReason || "spontaneous").trim() || "spontaneous";
      const director = context.interjection === true && context.director && typeof context.director === "object"
        ? context.director
        : null;
      const maxSentences = director
        ? Math.max(1, Math.min(4, Math.round(Number(director.max_sentences || 1))))
        : 1;
      return {
        intent: director ? "thought_burst" : "low_interrupt_checkin",
        reason,
        optional: true,
        canIgnore: true,
        singleSentence: maxSentences <= 1,
        maxSentences,
        allowFollowupQuestion: false,
        allowDesktopObservation: false,
        allowFileRead: false,
        allowShell: false,
        allowToolCall: false,
        voiceStyle: director?.voice_style || "soft",
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
        stage_callback: "Taffy can briefly callback a recent stage bit",
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
      const brainGate = buildAutoChatBrainGate(ctx);
      const openingLine = ctx.interjection === true
        ? "You are Taffy, a small desktop AI companion. This is a sudden thought burst after the last turn, like she briefly got caught thinking out loud."
        : "You are Taffy, a small desktop AI companion. This is a proactive low-interruption check-in.";
      const afterthoughtLine = ctx.interjection === true
        ? "Make it feel like a spontaneous interjection between friends; it can be mildly teasing, deadpan, or oddly specific when safe, but never turns into a full assistant answer."
        : "Make it feel like a live stage aside, not a customer-service follow-up.";
      const director = ctx.director && typeof ctx.director === "object" ? ctx.director : buildInterjectionDirectorPlan(ctx);
      const directorLine = ctx.interjection === true
        ? `Interjection director: decision=${director.decision || "hold_back"}; stance=${director.stance || "quiet"}; chaos=${Number(director.chaos_level || 0)}/3; thought_type=${director.thought_type || "aside"}; length=${director.length_budget || "1-2 sentences"}; motion=${director.motion_cue || "none"}; voice=${director.voice_style || "soft"}; safety_clamp=${director.safety_clamp || "none"}.`
        : "";
      const lengthLine = ctx.interjection === true
        ? `Length: ${director.length_guide || "Speak as long as the thought naturally needs, then stop."} Use ${Math.max(1, Number(director.min_sentences || 1))}-${Math.max(1, Number(director.max_sentences || 2))} sentence-like beats if the thought wants that shape.`
        : "Use exactly one short sentence.";

      return [
        openingLine,
        `Current time hint: ${clockText}.`,
        `Trigger clue: ${reasonHint}`,
        topicLine,
        directorLine,
        `Tone: ${styleNote}`,
        `Character brain guard: ${brainGate.intent}; max_sentences=${brainGate.maxSentences}; optional=true; can_ignore=true; no desktop observation; no file read; no shell; no tool call; do not require a reply.`,
        `Why now: ${brainGate.explanation}`,
        ctx.assistantHint ? `Previous answer vibe: "${String(ctx.assistantHint).replace(/"/g, "'")}".` : "",
        "Reply in English only.",
        "Output only the line Taffy should say. Do not explain why you are speaking.",
        `${lengthLine} Prefer a statement the user can ignore; do not force an answer.`,
        afterthoughtLine,
        "Avoid greeting templates, task-report language, and notification wording."
      ].filter(Boolean).join("\n");
    }

    function dispatchAutoChatContext(context = {}) {
      const prompt = buildAutoChatPrompt(context);
      state.turnTakingPendingThoughtBurst = null;
      return requestAssistantReply(prompt, {
        showUser: false,
        rememberUser: false,
        rememberAssistant: true,
        auto: true,
        autoKind: context.interjection === true ? "thought_burst" : "low_interrupt_checkin",
        autoThoughtBurst: context.interjection === true ? {
          thought_type: String(context.director?.thought_type || "aside"),
          length_budget: String(context.director?.length_budget || "1-2 sentences"),
          min_sentences: Number(context.director?.min_sentences || 1),
          max_sentences: Number(context.director?.max_sentences || 2),
          stance: String(context.director?.stance || "small_aside"),
          burst_reason: String(context.director?.burst_reason || context.primaryReason || "afterthought"),
          voice_style: String(context.director?.voice_style || "soft"),
          safety_clamp: String(context.director?.safety_clamp || "none")
        } : null,
        dropIfSpeaking: true,
        skipDesktopAttach: true,
        silentError: true
      }).then((ok) => {
        state.autoChatInterjectionLastOk = ok === true;
        if (ok) {
          rememberAutoChatSuccess(context);
        } else if (context.interjection === true) {
          state.autoChatInterjectionLastSuppressed = "request_failed_or_suppressed";
        }
        return ok;
      }).catch(() => {
        state.autoChatInterjectionLastOk = false;
        if (context.interjection === true) {
          state.autoChatInterjectionLastSuppressed = "request_error";
        }
        return false;
      });
    }

    function scheduleTurnInterjection(input = {}) {
      stopTurnInterjectionTimer();
      const context = buildTurnInterjectionContext(input);
      const initialTurn = rememberTurnTakingDecision(buildTurnTakingDecisionForContext(context), context);
      context.turn_taking = initialTurn;
      state.autoChatInterjectionLastContext = context;
      state.autoChatInterjectionLastDirector = context.director || null;
      state.autoChatInterjectionLastThoughtType = String(context.director?.thought_type || "");
      state.autoChatInterjectionLastLengthBudget = String(context.director?.length_budget || "");
      state.autoChatInterjectionLastScheduledAt = 0;
      state.autoChatInterjectionLastSuppressed = "";
      state.autoChatInterjectionLastMotion = "";
      if (state.autoChatEnabled !== true || context.shouldTrigger !== true) {
        state.autoChatInterjectionLastSuppressed = state.autoChatEnabled === true
          ? `not_triggered:${context.primaryReason || "unknown"}`
          : "disabled";
        return { scheduled: false, context };
      }
      if (initialTurn && ["hold", "soft_react_only", "cancel_stale_thought"].includes(initialTurn.decision)) {
        state.autoChatInterjectionLastSuppressed = `turn_taking:${initialTurn.reason || initialTurn.decision}`;
        if (initialTurn.decision === "cancel_stale_thought") {
          state.turnTakingPendingThoughtBurst = null;
        }
        return { scheduled: false, context };
      }
      const run = (attempt = 0) => {
        state.autoChatInterjectionTimer = 0;
        state.autoChatInterjectionLastAttemptAt = Date.now();
        const turn = rememberTurnTakingDecision(buildTurnTakingDecisionForContext(context, attempt), context);
        context.turn_taking = turn;
        const skip = shouldSkipTurnInterjection(context);
        if (!skip.skip) {
          state.autoChatInterjectionLastDispatchAt = Date.now();
          state.autoChatInterjectionLastSuppressed = "";
          executeInterjectionDirectorMotion(context);
          dispatchAutoChatContext(context);
          return;
        }
        state.autoChatInterjectionLastSuppressed = skip.reason || "skipped";
        if (skip.retry && attempt < AUTO_CHAT_INTERJECTION_MAX_RETRIES) {
          const retryMs = Math.max(300, Math.min(6000, Number(turn?.delay_ms || AUTO_CHAT_INTERJECTION_RETRY_MS)));
          state.autoChatInterjectionTimer = window.setTimeout(() => run(attempt + 1), retryMs);
        }
      };
      state.autoChatInterjectionLastScheduledAt = Date.now();
      const scheduledDelayMs = Math.max(500, Number(initialTurn?.delay_ms || context.delayMs) || 1800);
      state.autoChatInterjectionTimer = window.setTimeout(() => run(0), scheduledDelayMs);
      setStatus("Taffy thought queued");
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
      buildInterjectionDirectorPlan,
      buildTurnInterjectionContext,
      shouldSkipTurnInterjection,
      buildAutoChatBrainGate,
      buildAutoChatTriggerExplanation,
      buildAutoChatPrompt,
      executeInterjectionDirectorMotion,
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
