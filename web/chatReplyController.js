(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const window = deps.windowObject || root;
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const AbortController = window.AbortController || root.AbortController;
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => { throw new Error("authFetch is not available"); };

    function reportBehaviorEvent(type, metadata = {}) {
      // Observability must never delay, cancel, or alter audible playback.
      try {
        Promise.resolve(authFetch("/api/behavior/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, metadata })
        })).catch(() => {});
      } catch (_) {
        // A synchronous transport failure is telemetry-only as well.
      }
    }
    const acknowledgeDeliveredTurn = typeof deps.acknowledgeDeliveredTurn === "function"
      ? deps.acknowledgeDeliveredTurn
      : async () => false;
    const deliveryAckQueue = deps.deliveryAckQueue && typeof deps.deliveryAckQueue.enqueue === "function"
      ? deps.deliveryAckQueue
      : null;
    const getPendingDeliveryReceiptIds = typeof deps.getPendingDeliveryReceiptIds === "function"
      ? deps.getPendingDeliveryReceiptIds
      : () => [];
    const createPerfTraceId = typeof deps.createPerfTraceId === "function" ? deps.createPerfTraceId : () => "chat-" + Date.now();
    const perfLog = typeof deps.perfLog === "function" ? deps.perfLog : () => {};
    const handleCharacterRuntimeMetadata = typeof deps.handleCharacterRuntimeMetadata === "function" ? deps.handleCharacterRuntimeMetadata : () => {};
    const handleCharacterBrainDecision = typeof deps.handleCharacterBrainDecision === "function" ? deps.handleCharacterBrainDecision : () => {};
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const rememberMessage = typeof deps.rememberMessage === "function" ? deps.rememberMessage : () => {};
    const detectMood = typeof deps.detectMood === "function" ? deps.detectMood : () => "idle";
    const resolveTalkStyle = typeof deps.resolveTalkStyle === "function" ? deps.resolveTalkStyle : () => "neutral";
    const enqueueActionIntent = typeof deps.enqueueActionIntent === "function" ? deps.enqueueActionIntent : () => {};
    const stopWakeWordListener = typeof deps.stopWakeWordListener === "function" ? deps.stopWakeWordListener : () => {};
    const pauseMicForAssistant = typeof deps.pauseMicForAssistant === "function" ? deps.pauseMicForAssistant : () => {};
    const resumeMicAfterAssistant = typeof deps.resumeMicAfterAssistant === "function" ? deps.resumeMicAfterAssistant : () => {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const shouldUseStreamSpeak = typeof deps.shouldUseStreamSpeak === "function" ? deps.shouldUseStreamSpeak : () => false;
    const stopAllAudioPlayback = typeof deps.stopAllAudioPlayback === "function" ? deps.stopAllAudioPlayback : () => {};
    const abortServerTTSRequests = typeof deps.abortServerTTSRequests === "function" ? deps.abortServerTTSRequests : () => 0;
    const shouldPlayLatencyHint = typeof deps.shouldPlayLatencyHint === "function" ? deps.shouldPlayLatencyHint : () => false;
    const pickLatencyHintText = typeof deps.pickLatencyHintText === "function" ? deps.pickLatencyHintText : () => "";
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;
    const requestServerTTSBlobWithRetry = typeof deps.requestServerTTSBlobWithRetry === "function" ? deps.requestServerTTSBlobWithRetry : null;
    const playAudioBlob = typeof deps.playAudioBlob === "function" ? deps.playAudioBlob : null;
    const clearThinkingMotionTimer = typeof deps.clearThinkingMotionTimer === "function" ? deps.clearThinkingMotionTimer : () => {};
    const shouldAttachDesktopImage = typeof deps.shouldAttachDesktopImage === "function" ? deps.shouldAttachDesktopImage : () => false;
    const captureDesktopSnapshot = typeof deps.captureDesktopSnapshot === "function" ? deps.captureDesktopSnapshot : async () => "";
    const parseToolMetaFromText = typeof deps.parseToolMetaFromText === "function" ? deps.parseToolMetaFromText : (text) => ({ visibleText: String(text || ""), meta: [] });
    const setMessageText = typeof deps.setMessageText === "function" ? deps.setMessageText : () => {};
    const feedStreamSpeakDelta = typeof deps.feedStreamSpeakDelta === "function" ? deps.feedStreamSpeakDelta : () => {};
    const normalizeAssistantVisibleText = typeof deps.normalizeAssistantVisibleText === "function" ? deps.normalizeAssistantVisibleText : (text) => String(text || "").trim();
    const finalizePendingMessageRow = typeof deps.finalizePendingMessageRow === "function" ? deps.finalizePendingMessageRow : () => {};
    const updateConversationFollowupState = typeof deps.updateConversationFollowupState === "function" ? deps.updateConversationFollowupState : () => {};
    const maybeSendAssistantMoodSticker = typeof deps.maybeSendAssistantMoodSticker === "function" ? deps.maybeSendAssistantMoodSticker : () => null;
    const scheduleAutoChatInterjectionAfterTurn = typeof deps.scheduleAutoChatInterjectionAfterTurn === "function" ? deps.scheduleAutoChatInterjectionAfterTurn : () => null;
    const queueConversationAwarenessAfterTurn = typeof deps.queueConversationAwarenessAfterTurn === "function" ? deps.queueConversationAwarenessAfterTurn : () => null;
    const recordEmotion = typeof deps.recordEmotion === "function" ? deps.recordEmotion : () => {};
    const previewAssistantReplyCharacterCueCandidate = typeof deps.previewAssistantReplyCharacterCueCandidate === "function" ? deps.previewAssistantReplyCharacterCueCandidate : () => null;
    const maybeAutoApplyAssistantReplyCharacterCueCandidate = typeof deps.maybeAutoApplyAssistantReplyCharacterCueCandidate === "function" ? deps.maybeAutoApplyAssistantReplyCharacterCueCandidate : () => null;
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : (style) => String(style || "neutral").trim() || "neutral";
    const normalizeRuntimeVoiceStyle = typeof deps.normalizeRuntimeVoiceStyle === "function"
      ? deps.normalizeRuntimeVoiceStyle
      : (style) => {
          const key = String(style || "neutral").trim().toLowerCase().replace(/-/g, "_");
          if (["neutral", "soft", "cheerful", "teasing", "serious", "curious", "warm"].includes(key)) {
            return key;
          }
          return "neutral";
        };
    const runtimeVoiceStyleToTalkStyle = typeof deps.runtimeVoiceStyleToTalkStyle === "function"
      ? deps.runtimeVoiceStyleToTalkStyle
      : (style, fallback = "neutral") => {
          const voiceStyle = normalizeRuntimeVoiceStyle(style);
          if (voiceStyle === "soft" || voiceStyle === "warm") return "comfort";
          if (voiceStyle === "cheerful" || voiceStyle === "teasing") return "playful";
          if (voiceStyle === "serious") return "steady";
          if (voiceStyle === "curious") return "clear";
          return normalizeTalkStyle(fallback);
        };
    const applyPerformanceControlsToRuntimeHint = typeof deps.applyPerformanceControlsToRuntimeHint === "function"
      ? deps.applyPerformanceControlsToRuntimeHint
      : (runtimeHint) => runtimeHint;
    const buildPerformanceCue = typeof deps.buildPerformanceCue === "function"
      ? deps.buildPerformanceCue
      : (input) => (typeof root.TaffyPerformanceCueController?.buildPerformanceCue === "function"
          ? root.TaffyPerformanceCueController.buildPerformanceCue(input)
          : null);
    const applySpeechPerformanceCue = typeof deps.applySpeechPerformanceCue === "function"
      ? deps.applySpeechPerformanceCue
      : () => null;
    const triggerPerformanceCueMotion = typeof deps.triggerPerformanceCueMotion === "function"
      ? deps.triggerPerformanceCueMotion
      : () => false;
    const publishPerformancePhase = typeof deps.publishPerformancePhase === "function"
      ? deps.publishPerformancePhase
      : () => false;
    const clearPerformancePhase = typeof deps.clearPerformancePhase === "function"
      ? deps.clearPerformancePhase
      : () => false;
    const buildPerformanceTimeline = typeof deps.buildPerformanceTimeline === "function" ? deps.buildPerformanceTimeline : () => null;
    const rememberPerformanceTimeline = typeof deps.rememberPerformanceTimeline === "function" ? deps.rememberPerformanceTimeline : () => null;
    const buildEarlyPreReactionPlan = typeof deps.buildEarlyPreReactionPlan === "function"
      ? deps.buildEarlyPreReactionPlan
      : (input) => (typeof root.TaffyPerformanceTimelineController?.buildEarlyPreReactionPlan === "function"
          ? root.TaffyPerformanceTimelineController.buildEarlyPreReactionPlan(input)
          : null);
    const executeEarlyPreReactionPlan = typeof deps.executeEarlyPreReactionPlan === "function"
      ? deps.executeEarlyPreReactionPlan
      : (plan, context) => (typeof root.TaffyPerformanceTimelineController?.executeEarlyPreReactionPlan === "function"
          ? root.TaffyPerformanceTimelineController.executeEarlyPreReactionPlan(plan, context)
          : null);
    const rememberEarlyPreReaction = typeof deps.rememberEarlyPreReaction === "function"
      ? deps.rememberEarlyPreReaction
      : (summary) => {
          state.earlyPreReactionLastSummary = summary || null;
          if (summary?.actual === "dispatched") {
            state.earlyPreReactionLastAt = Number(summary.updated_at) || Date.now();
          }
          return summary || null;
        };
    const buildVoiceTimeline = typeof deps.buildVoiceTimeline === "function"
      ? deps.buildVoiceTimeline
      : (input) => (typeof root.TaffyPerformanceTimelineController?.buildVoiceTimeline === "function"
          ? root.TaffyPerformanceTimelineController.buildVoiceTimeline(input)
          : null);
    const buildVoiceSpeechSegments = typeof deps.buildVoiceSpeechSegments === "function"
      ? deps.buildVoiceSpeechSegments
      : (text, voiceTimeline) => (typeof root.TaffyPerformanceTimelineController?.buildVoiceSpeechSegments === "function"
          ? root.TaffyPerformanceTimelineController.buildVoiceSpeechSegments(text, voiceTimeline)
          : [String(text || "").trim()].filter(Boolean));
    const rememberVoiceTimeline = typeof deps.rememberVoiceTimeline === "function"
      ? deps.rememberVoiceTimeline
      : () => null;
    const applyVoiceDirectorProsody = typeof deps.applyVoiceDirectorProsody === "function"
      ? deps.applyVoiceDirectorProsody
      : (prosody, voiceDirector) => (typeof root.TaffyPerformanceTimelineController?.applyVoiceDirectorProsody === "function"
          ? root.TaffyPerformanceTimelineController.applyVoiceDirectorProsody(prosody, voiceDirector)
          : prosody);
    const clearPerformanceTimelineTimers = typeof deps.clearPerformanceTimelineTimers === "function" ? deps.clearPerformanceTimelineTimers : () => {};
    const executePerformanceTimelinePhase = typeof deps.executePerformanceTimelinePhase === "function" ? deps.executePerformanceTimelinePhase : () => false;
    const schedulePerformanceTimelineSpeechBeats = typeof deps.schedulePerformanceTimelineSpeechBeats === "function" ? deps.schedulePerformanceTimelineSpeechBeats : () => 0;
    const startPerformanceAudit = typeof deps.startPerformanceAudit === "function" ? deps.startPerformanceAudit : () => null;
    const recordPerformanceAuditEventRaw = typeof deps.recordPerformanceAuditEvent === "function" ? deps.recordPerformanceAuditEvent : () => null;
    const recordPerformanceAuditEvent = (type, detail = {}) => {
      const result = recordPerformanceAuditEventRaw(type, detail);
      if (type === "tts_end") {
        reportBehaviorEvent("tts_finished", {
          source: String(detail?.source || "playback"),
          reason: String(detail?.reason || (detail?.ok === false ? "not_played" : "completed"))
        });
      }
      return result;
    };
    const finishPerformanceAudit = typeof deps.finishPerformanceAudit === "function" ? deps.finishPerformanceAudit : () => null;
    const persistCharacterBrainSnapshot = typeof deps.persistCharacterBrainSnapshot === "function" ? deps.persistCharacterBrainSnapshot : () => {};
    const triggerExpressionPulse = typeof deps.triggerExpressionPulse === "function" ? deps.triggerExpressionPulse : () => {};
    const flushStreamSpeak = typeof deps.flushStreamSpeak === "function" ? deps.flushStreamSpeak : () => {};
    const scheduleFinalSpeechWatchdog = typeof deps.scheduleFinalSpeechWatchdog === "function" ? deps.scheduleFinalSpeechWatchdog : () => {};
    const buildStableSpeakText = typeof deps.buildStableSpeakText === "function" ? deps.buildStableSpeakText : (text) => String(text || "").trim();
    const maybePlayTalkGesture = typeof deps.maybePlayTalkGesture === "function" ? deps.maybePlayTalkGesture : () => {};
    const discardQueuedStreamSpeakItems = typeof deps.discardQueuedStreamSpeakItems === "function" ? deps.discardQueuedStreamSpeakItems : () => 0;
    const recordTTSDebugEvent = typeof deps.recordTTSDebugEvent === "function" ? deps.recordTTSDebugEvent : () => {};
    const buildChatFailureDoctorHint = typeof deps.buildChatFailureDoctorHint === "function" ? deps.buildChatFailureDoctorHint : (err) => String(err?.message || err || "Request failed");
    const scheduleWakeWordStart = typeof deps.scheduleWakeWordStart === "function" ? deps.scheduleWakeWordStart : () => {};
    const updateMicButton = typeof deps.updateMicButton === "function" ? deps.updateMicButton : () => {};
    const handleLocalCommand = typeof deps.handleLocalCommand === "function" ? deps.handleLocalCommand : async () => false;
    const buildAttachmentContextText = typeof deps.buildAttachmentContextText === "function" ? deps.buildAttachmentContextText : () => "";
    const buildAttachmentDisplaySuffix = typeof deps.buildAttachmentDisplaySuffix === "function" ? deps.buildAttachmentDisplaySuffix : () => "";
    const clearPendingAttachments = typeof deps.clearPendingAttachments === "function" ? deps.clearPendingAttachments : () => {};
    const getCharacterExperienceRequestProfile =
      typeof deps.getCharacterExperienceRequestProfile === "function"
        ? deps.getCharacterExperienceRequestProfile
        : () => null;
    let characterRuntimeMetadataForReply = null;
    let companionTurnForReply = null;
    let conversationDecisionForReply = null;

    function rememberCharacterRuntimeMetadataForReply(metadata) {
      const adjusted = applyPerformanceControlsToRuntimeHint(metadata, state.characterBrainLastDecision);
      const normalized = handleCharacterRuntimeMetadata(adjusted || metadata);
      if (normalized && typeof normalized === "object" && !Array.isArray(normalized)) {
        characterRuntimeMetadataForReply = normalized;
      } else if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        characterRuntimeMetadataForReply = metadata;
      }
      return normalized;
    }

    function rememberCompanionTurnForReply(turn) {
      if (!turn || typeof turn !== "object" || Array.isArray(turn)) {
        return null;
      }
      if (typeof turn.reply_text !== "string" || typeof turn.spoken_text !== "string") {
        return null;
      }
      companionTurnForReply = turn;
      return turn;
    }

    function rememberConversationDecisionForReply(decision) {
      if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
        conversationDecisionForReply = null;
        return null;
      }
      const mode = String(decision.mode || "").trim().toLowerCase();
      if (!["reply", "silence", "micro_reaction", "defer"].includes(mode)) {
        conversationDecisionForReply = null;
        return null;
      }
      conversationDecisionForReply = {
        version: 1,
        mode,
        thinking_level: String(decision.thinking_level || "normal"),
        thinking_delay_ms: Math.max(
          0,
          Math.min(5000, Math.round(Number(decision.thinking_delay_ms) || 0))
        ),
        reaction: String(decision.reaction || "")
      };
      state.naturalConversationDecision = conversationDecisionForReply;
      return conversationDecisionForReply;
    }

    function isCompanionSpeechPrewarmEligible() {
      return state.speakingEnabled !== false
        && state.companionTurnEnabled === true
        && state.modelDirectReply === true
        && String(state.ttsProvider || "").toLowerCase() === "gpt_sovits"
        && typeof requestServerTTSBlobWithRetry === "function"
        && typeof playAudioBlob === "function"
        && typeof AbortController === "function";
    }

    function canStreamBeforeCompanionTurnFinalizes() {
      return state.speakingEnabled !== false
        && state.companionTurnEnabled === true
        && state.modelDirectReply === true
        && String(state.ttsProvider || "").toLowerCase() === "qwen3_tts"
        && state.qwen3TtsReplyContinuity === false;
    }

    function extractStableCompanionSpeechPrefix(value) {
      const draft = String(value || "").trim();
      if (draft.length < 16) {
        return "";
      }
      const match = draft.match(/^([\s\S]{16,220}?[.!?。！？](?:["'”’）)\]]+)?)(?=\s|$)/);
      const prefix = String(match?.[1] || "").trim();
      if (!prefix) {
        return "";
      }
      if (/\b(?:mr|mrs|ms|dr|prof|sr|jr|vs|etc|e\.g|i\.e)\.$/i.test(prefix)) {
        return "";
      }
      return prefix;
    }

    function abortCompanionSpeechPrewarm(prewarm, reason = "discarded") {
      if (!prewarm || prewarm.aborted === true) {
        return false;
      }
      prewarm.aborted = true;
      prewarm.discardReason = String(reason || "discarded");
      if (typeof prewarm.removeChatAbortListener === "function") {
        prewarm.removeChatAbortListener();
        prewarm.removeChatAbortListener = null;
      }
      if (prewarm.controller && prewarm.controller.signal?.aborted !== true) {
        try {
          prewarm.controller.abort();
        } catch (_) {
          // ignore
        }
      }
      recordTTSDebugEvent("companion_prewarm_discard", {
        traceId: prewarm.traceId,
        sessionId: prewarm.sessionId,
        text: prewarm.text,
        reason: prewarm.discardReason
      });
      return true;
    }

    function startCompanionSpeechPrewarm(text, context = {}) {
      const prefix = extractStableCompanionSpeechPrefix(text);
      if (!prefix || !isCompanionSpeechPrewarmEligible()) {
        return null;
      }
      const controller = new AbortController();
      const prewarm = {
        text: prefix,
        turnId: Number(context.turnId || 0),
        sessionId: Number(context.sessionId || 0),
        playbackGeneration: Number(context.playbackGeneration || state.ttsPlaybackGeneration || 0),
        traceId: String(context.traceId || state.activePerfTraceId || "").trim(),
        prosody: context.prosody && typeof context.prosody === "object" ? context.prosody : null,
        performanceSignature: String(context.performanceSignature || ""),
        startedPerfMs: performance.now(),
        controller,
        aborted: false,
        consumed: false,
        discardReason: "",
        removeChatAbortListener: null,
        promise: null
      };
      const chatSignal = context.chatSignal;
      if (chatSignal?.aborted === true) {
        abortCompanionSpeechPrewarm(prewarm, "chat_cancelled_before_start");
        return null;
      }
      if (typeof chatSignal?.addEventListener === "function") {
        const onChatAbort = () => abortCompanionSpeechPrewarm(prewarm, "chat_cancelled");
        chatSignal.addEventListener("abort", onChatAbort, { once: true });
        prewarm.removeChatAbortListener = () => {
          try {
            chatSignal.removeEventListener("abort", onChatAbort);
          } catch (_) {
            // ignore
          }
        };
      }
      recordTTSDebugEvent("companion_prewarm_start", {
        traceId: prewarm.traceId,
        sessionId: prewarm.sessionId,
        text: prewarm.text
      });
      prewarm.promise = requestServerTTSBlobWithRetry(prewarm.text, prewarm.prosody, {
        retries: 0,
        retryDelayMs: Number(state.ttsServerRetryDelayMs),
        timeoutMs: Number(state.ttsServerRequestTimeoutMs),
        traceId: prewarm.traceId,
        signal: controller.signal,
        playbackGeneration: prewarm.playbackGeneration,
        sessionId: prewarm.sessionId,
        kind: "companion_prewarm"
      }).then((blob) => {
        if (prewarm.aborted || !blob) {
          return { ok: false, aborted: prewarm.aborted === true, blob: null };
        }
        recordTTSDebugEvent("companion_prewarm_ready", {
          traceId: prewarm.traceId,
          sessionId: prewarm.sessionId,
          text: prewarm.text,
          blobBytes: Number(blob.size || 0)
        });
        return { ok: true, blob };
      }).catch((error) => {
        const aborted = prewarm.aborted === true || error?.aborted === true || error?.name === "AbortError";
        recordTTSDebugEvent("companion_prewarm_fail", {
          traceId: prewarm.traceId,
          sessionId: prewarm.sessionId,
          text: prewarm.text,
          aborted,
          error: String(error?.message || error || "")
        });
        return { ok: false, aborted, error };
      }).finally(() => {
        if (typeof prewarm.removeChatAbortListener === "function") {
          prewarm.removeChatAbortListener();
          prewarm.removeChatAbortListener = null;
        }
      });
      return prewarm;
    }

    async function takeConfirmedCompanionSpeechPrewarm(prewarm, context = {}) {
      if (!prewarm || prewarm.aborted === true || context.hasCanonicalTurn !== true) {
        abortCompanionSpeechPrewarm(prewarm, "no_canonical_turn");
        return null;
      }
      const speechText = String(context.speechText || "").trim();
      const performanceSignature = String(context.performanceSignature || "");
      if (
        !speechText.startsWith(prewarm.text)
        || (performanceSignature && performanceSignature !== prewarm.performanceSignature)
        || Number(context.turnId || 0) !== prewarm.turnId
        || Number(context.sessionId || 0) !== prewarm.sessionId
        || Number(context.playbackGeneration || state.ttsPlaybackGeneration || 0) !== prewarm.playbackGeneration
        || !isCurrentChatTurn(prewarm.turnId)
      ) {
        abortCompanionSpeechPrewarm(prewarm, "canonical_prefix_mismatch");
        return null;
      }
      const result = await prewarm.promise;
      if (
        !result?.ok
        || !result.blob
        || prewarm.aborted === true
        || !isCurrentChatTurn(prewarm.turnId)
        || Number(state.streamSpeakSession || 0) !== prewarm.sessionId
        || Number(state.ttsPlaybackGeneration || 0) !== prewarm.playbackGeneration
      ) {
        return null;
      }
      prewarm.consumed = true;
      recordTTSDebugEvent("companion_prewarm_reuse", {
        traceId: prewarm.traceId,
        sessionId: prewarm.sessionId,
        text: prewarm.text,
        blobBytes: Number(result.blob.size || 0)
      });
      return {
        blob: result.blob,
        prefix: prewarm.text,
        tail: speechText.slice(prewarm.text.length).trim(),
        startedPerfMs: prewarm.startedPerfMs
      };
    }

    function normalizePerformanceSegmentText(text) {
      return String(text || "").replace(/\s+/g, "").trim();
    }

    function findCompanionSegmentPerformance(turn, text) {
      const segments = Array.isArray(turn?.performance_segments) ? turn.performance_segments : [];
      const needle = normalizePerformanceSegmentText(text);
      const fallback = turn?.performance && typeof turn.performance === "object"
        ? turn.performance
        : null;
      if (!needle) return fallback;
      const exact = segments.find((segment) => (
        normalizePerformanceSegmentText(segment?.text) === needle
      ));
      if (exact?.performance && typeof exact.performance === "object") {
        return exact.performance;
      }
      const containing = segments.find((segment) => {
        const candidate = normalizePerformanceSegmentText(segment?.text);
        return candidate && (candidate.includes(needle) || needle.includes(candidate));
      });
      return containing?.performance && typeof containing.performance === "object"
        ? containing.performance
        : fallback;
    }

    function buildSegmentPerformanceCue(text, context = {}) {
      const performancePlan = findCompanionSegmentPerformance(context.companionTurn, text);
      return buildPerformanceCue({
        replyText: String(text || ""),
        mood: context.mood || detectMood(text),
        talkStyle: context.talkStyle || "neutral",
        runtimeMetadata: performancePlan || context.runtimeMetadata || null,
        performancePlan,
        motionIntensity: state.motionIntensity
      });
    }

    function mergePerformanceCueProsody(prosody, cue) {
      const base = prosody && typeof prosody === "object" ? prosody : {};
      if (!cue || typeof cue !== "object") return base;
      return {
        ...base,
        emotion: String(cue.emotion || "neutral"),
        intensity: String(cue.intensity || "medium"),
        voice_style: String(cue.voiceStyle || "neutral")
      };
    }

    function performanceCueSignature(cue) {
      if (!cue || typeof cue !== "object") return "";
      return [
        String(cue.emotion || "neutral"),
        String(cue.intensity || "medium"),
        String(cue.voiceStyle || "neutral")
      ].join(":");
    }

    function getSpeechAnimationClockNow() {
      const now = Number(typeof performance.now === "function" ? performance.now() : NaN);
      return Number.isFinite(now) ? now : Date.now();
    }

    function isAssistantSpeechActive() {
      const phase = String(state.speechPhase || "").trim().toLowerCase();
      const now = getSpeechAnimationClockNow();
      return state.ttsContextSpeaking === true
        || state.streamSpeakWorking === true
        || phase === "speaking"
        || (Number(state.speechAnimUntil || 0) > now + 80);
    }

    function clampNumber(value, fallback, min, max) {
      const num = Number(value);
      const base = Number.isFinite(num) ? num : Number(fallback);
      return Math.max(Number(min), Math.min(Number(max), base));
    }

    function getImportantSpeechConfig() {
      const mode = state.conversationMode || {};
      const maxHoldMs = Math.round(clampNumber(mode.importantSpeechMaxHoldMs, 4200, 500, 9000));
      const minMs = Math.round(clampNumber(mode.importantSpeechMinMs, 900, 0, Math.min(3000, maxHoldMs)));
      return {
        enabled: mode.protectImportantSpeech !== false,
        minMs,
        maxHoldMs,
        forceAfterAttempts: Math.round(clampNumber(mode.importantSpeechForceAfterAttempts, 2, 1, 4))
      };
    }

    function resetProtectedInterruptionState() {
      state.protectedInterruptionLastAt = 0;
      state.protectedInterruptionCount = 0;
      state.protectedInterruptionUntil = 0;
      state.protectedInterruptionReason = "";
    }

    function normalizeInterruptionPolicy(value) {
      return String(value || "").trim().toLowerCase().replace(/-/g, "_");
    }

    function getActiveSpeechElapsedMs(now = Date.now()) {
      const perfNow = getSpeechAnimationClockNow();
      const elapsed = [
        [Number(state.ttsDebugAudioStartedAt || 0), perfNow],
        [Number(state.speechAnimStartedAt || 0), perfNow],
        [Number(state.speechPhaseEnteredAt || 0), perfNow],
        [Number(state.activeAssistantTurnStartedAt || 0), now]
      ].map(([value, clockNow]) => {
        if (!(value > 0)) {
          return -1;
        }
        const diff = clockNow - value;
        return diff >= 0 && diff < 60000 ? diff : -1;
      }).filter((value) => value >= 0);
      if (!elapsed.length) {
        return 0;
      }
      return Math.max(0, Math.min(...elapsed));
    }

    function hasImportantSpeechSignal(text) {
      const compact = String(text || "").replace(/\s+/g, " ").trim();
      if (!compact) {
        return false;
      }
      return /(重要|关键|注意|先别|不要|必须|一定|记住|安全|隐私|密钥|口令|密码|危险|报错|错误|失败|崩|先|建议|最好|important|key point|privacy|secret|token|password|must|do not|don't|warning|first)/i.test(compact);
    }

    function isProtectedInterruptionPolicy(policy) {
      return [
        "finish_key_sentence_before_yield",
        "finish_key_point_before_yield",
        "finish_important_sentence",
        "protect_key_sentence",
        "protect_important_speech"
      ].includes(normalizeInterruptionPolicy(policy));
    }

    function isProtectedIntent(intent) {
      return ["comfort", "task_help", "reminder", "feedback"].includes(normalizeInterruptionPolicy(intent));
    }

    function cleanTurnManagerText(value, maxLen = 96) {
      let text = String(value || "").replace(/\s+/g, " ").trim();
      if (!text) {
        return "";
      }
      text = text.replace(
        /(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['"]?[^'"\s,;]+|bearer\s+[a-z0-9._-]+|sk-[a-z0-9]{8,}/gi,
        "[redacted]"
      );
      const limit = Math.max(24, Math.min(180, Math.round(Number(maxLen) || 96)));
      if (text.length > limit) {
        text = text.slice(0, Math.max(0, limit - 3)).trimEnd() + "...";
      }
      return text;
    }

    function estimateSpeechDurationMs(text) {
      const source = String(text || "").replace(/\s+/g, " ").trim();
      if (!source) {
        return 900;
      }
      const cjkCount = (source.match(/[\u3400-\u9fff]/g) || []).length;
      const wordCount = (source.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g) || []).length;
      const punctuationCount = (source.match(/[,.!?;:\u3002\uff01\uff1f\uff0c\uff1b\uff1a\u3001]/g) || []).length;
      const base = cjkCount > 0
        ? cjkCount * 155 + wordCount * 210
        : Math.max(1, wordCount) * 310;
      return Math.round(clampNumber(base + punctuationCount * 120 + 380, 700, 6200));
    }

    function classifyAssistantSpeechSegment(segment, index, total, brain = {}) {
      const director = brain?.conversation_director && typeof brain.conversation_director === "object"
        ? brain.conversation_director
        : {};
      const policy = normalizeInterruptionPolicy(director.interruption_policy);
      const intent = normalizeInterruptionPolicy(brain.intent);
      const replyMove = normalizeInterruptionPolicy(director.reply_move);
      const policyProtects = isProtectedInterruptionPolicy(policy);
      const intentProtects = isProtectedIntent(intent);
      const textProtects = hasImportantSpeechSignal(segment);
      if (textProtects || ((policyProtects || intentProtects) && index === 0)) {
        return {
          role: "key",
          protected: true,
          reason: textProtects ? "text_signal" : (policyProtects ? "director_policy" : "intent_policy")
        };
      }
      if (replyMove === "clarify" || policy === "yield_if_user_speaks" || policy === "treat_as_natural_interruption") {
        return {
          role: "tail",
          protected: false,
          reason: "yield_policy"
        };
      }
      if (total > 1 && index >= total - 1) {
        return {
          role: "tail",
          protected: false,
          reason: "tail_segment"
        };
      }
      return {
        role: "support",
        protected: false,
        reason: "supporting_segment"
      };
    }

    function buildAssistantSpeechPlan(text, voiceTimeline = null, brainSnapshot = null, providedSegments = null) {
      const source = String(text || "").replace(/\s+/g, " ").trim();
      const brain = brainSnapshot && typeof brainSnapshot === "object" && !Array.isArray(brainSnapshot)
        ? brainSnapshot
        : (state.characterBrainLastDecision && typeof state.characterBrainLastDecision === "object" ? state.characterBrainLastDecision : {});
      const director = brain?.conversation_director && typeof brain.conversation_director === "object"
        ? brain.conversation_director
        : {};
      const rawSegments = Array.isArray(providedSegments) && providedSegments.length
        ? providedSegments
        : buildVoiceSpeechSegments(source, voiceTimeline);
      const segments = rawSegments.map((item, idx) => {
        const segmentText = String(item || "").replace(/\s+/g, " ").trim();
        const role = classifyAssistantSpeechSegment(segmentText, idx, rawSegments.length, brain);
        return {
          index: idx + 1,
          text: segmentText,
          text_excerpt: cleanTurnManagerText(segmentText, 88),
          role: role.role,
          protected: role.protected === true,
          reason: role.reason,
          estimated_ms: estimateSpeechDurationMs(segmentText)
        };
      }).filter((item) => item.text);
      return {
        version: 1,
        created_at: Date.now(),
        interruption_policy: normalizeInterruptionPolicy(director.interruption_policy) || "none",
        intent: normalizeInterruptionPolicy(brain.intent) || "casual",
        reply_move: normalizeInterruptionPolicy(director.reply_move) || "answer",
        total_segments: segments.length,
        protected_segments: segments.filter((item) => item.protected).map((item) => item.index),
        segments
      };
    }

    function activateAssistantSpeechPlan(plan) {
      const safe = plan && typeof plan === "object" && !Array.isArray(plan) ? plan : null;
      state.activeAssistantSpeechPlan = safe;
      state.activeAssistantSpeechSegmentIndex = 0;
      state.activeAssistantSpeechSegmentRole = "";
      state.activeAssistantSpeechSegmentStartedAt = 0;
      state.activeAssistantSpeechCurrentText = "";
      return safe;
    }

    function setActiveAssistantSpeechSegment(index, text = "") {
      const plan = state.activeAssistantSpeechPlan && typeof state.activeAssistantSpeechPlan === "object"
        ? state.activeAssistantSpeechPlan
        : null;
      const safeIndex = Math.max(1, Math.round(Number(index) || 1));
      const segment = Array.isArray(plan?.segments)
        ? plan.segments.find((item) => Number(item.index) === safeIndex)
        : null;
      state.activeAssistantSpeechSegmentIndex = safeIndex;
      state.activeAssistantSpeechSegmentRole = segment?.role || "support";
      state.activeAssistantSpeechSegmentStartedAt = Date.now();
      state.activeAssistantSpeechCurrentText = cleanTurnManagerText(text || segment?.text || segment?.text_excerpt, 120);
      recordTTSDebugEvent("turn_segment_start", {
        segmentId: safeIndex,
        segmentRole: state.activeAssistantSpeechSegmentRole,
        protected: segment?.protected === true,
        reason: segment?.reason || "",
        text: state.activeAssistantSpeechCurrentText
      });
      return segment || null;
    }

    function clearAssistantSpeechPlan() {
      state.activeAssistantSpeechPlan = null;
      state.activeAssistantSpeechSegmentIndex = 0;
      state.activeAssistantSpeechSegmentRole = "";
      state.activeAssistantSpeechSegmentStartedAt = 0;
      state.activeAssistantSpeechCurrentText = "";
    }

    function rememberTurnManagerDecision(decision = {}) {
      const safe = decision && typeof decision === "object" && !Array.isArray(decision) ? decision : {};
      const publicDecision = {
        version: 1,
        updated_at: Date.now(),
        action: String(safe.action || "interrupt_now"),
        reason: String(safe.reason || "none"),
        wait_ms: Math.max(0, Math.round(Number(safe.waitMs || safe.wait_ms || 0))),
        turn_id: Math.max(0, Math.round(Number(safe.turnId || safe.turn_id || state.activeChatTurnId || 0))),
        speech_active: safe.speechActive === true,
        protected_key_sentence: safe.protectedKeySentence === true || safe.protected_key_sentence === true,
        segment_index: Math.max(0, Math.round(Number(safe.segmentIndex || safe.segment_index || state.activeAssistantSpeechSegmentIndex || 0))),
        segment_role: String(safe.segmentRole || safe.segment_role || state.activeAssistantSpeechSegmentRole || ""),
        segment_reason: String(safe.segmentReason || safe.segment_reason || ""),
        interruption_policy: String(safe.policy || safe.interruption_policy || ""),
        intent: String(safe.intent || ""),
        reply_move: String(safe.replyMove || safe.reply_move || ""),
        elapsed_ms: Math.max(0, Math.round(Number(safe.elapsedMs || safe.elapsed_ms || 0))),
        repeated: safe.repeated === true
      };
      state.turnManagerLastDecision = publicDecision;
      state.turnManagerLastUpdatedAt = publicDecision.updated_at;
      return publicDecision;
    }

    function buildInterruptionArbitration(reason = "user_input", opts = {}) {
      if (opts.force === true || opts.bypassProtection === true) {
        return rememberTurnManagerDecision({
          action: "interrupt_now",
          reason: "forced",
          speechActive: isAssistantSpeechActive()
        });
      }
      const config = getImportantSpeechConfig();
      if (!config.enabled || state.conversationMode?.interruptTtsOnUserSpeech !== true) {
        resetProtectedInterruptionState();
        return rememberTurnManagerDecision({
          action: "interrupt_now",
          reason: "disabled",
          speechActive: isAssistantSpeechActive()
        });
      }
      if (!isAssistantSpeechActive()) {
        resetProtectedInterruptionState();
        clearAssistantSpeechPlan();
        return rememberTurnManagerDecision({ action: "no_active_speech", reason: "idle" });
      }
      const now = Date.now();
      const activeUntil = Number(state.protectedInterruptionUntil || 0);
      if (activeUntil > now) {
        return rememberTurnManagerDecision({
          action: "finish_key_sentence",
          reason: "already_protected",
          waitMs: Math.max(120, Math.round(activeUntil - now)),
          repeated: true,
          speechActive: true,
          protectedKeySentence: true,
          policy: state.activeAssistantSpeechPlan?.interruption_policy || "",
          intent: state.activeAssistantSpeechPlan?.intent || "",
          replyMove: state.activeAssistantSpeechPlan?.reply_move || ""
        });
      }
      const policy = normalizeInterruptionPolicy(
        state.characterBrainLastDecision?.conversation_director?.interruption_policy
      );
      const intent = normalizeInterruptionPolicy(state.characterBrainLastDecision?.intent);
      const plan = state.activeAssistantSpeechPlan && typeof state.activeAssistantSpeechPlan === "object"
        ? state.activeAssistantSpeechPlan
        : null;
      const segmentIndex = Math.max(0, Math.round(Number(state.activeAssistantSpeechSegmentIndex || 0)));
      const activeSegment = Array.isArray(plan?.segments)
        ? plan.segments.find((item) => Number(item.index) === segmentIndex)
          || plan.segments.find((item) => item.protected === true)
          || plan.segments[0]
        : null;
      const segmentRole = String(activeSegment?.role || state.activeAssistantSpeechSegmentRole || "");
      const segmentReason = String(activeSegment?.reason || "");
      const policyProtects = isProtectedInterruptionPolicy(policy);
      const intentProtects = isProtectedIntent(intent);
      const textForSignal = activeSegment
        ? (activeSegment.text || activeSegment.text_excerpt || state.activeAssistantSpeechCurrentText)
        : (state.activeAssistantDraftText || state.activeAssistantSpeechCurrentText);
      const textProtects = hasImportantSpeechSignal(textForSignal);
      const segmentProtects = activeSegment?.protected === true && segmentRole === "key";
      const planAwareProtection = !!activeSegment;
      const shouldProtectThisBeat = segmentProtects
        || (planAwareProtection ? textProtects : (policyProtects || intentProtects || textProtects));
      if (!shouldProtectThisBeat) {
        return rememberTurnManagerDecision({
          action: "interrupt_now",
          reason: segmentRole === "tail" ? "tail_segment" : "not_important",
          speechActive: true,
          segmentIndex,
          segmentRole,
          segmentReason,
          policy,
          intent,
          replyMove: plan?.reply_move || ""
        });
      }
      const elapsedMs = getActiveSpeechElapsedMs(now);
      if (elapsedMs >= config.maxHoldMs) {
        resetProtectedInterruptionState();
        return rememberTurnManagerDecision({
          action: "interrupt_now",
          reason: "max_hold_elapsed",
          speechActive: true,
          segmentIndex,
          segmentRole,
          segmentReason,
          elapsedMs,
          policy,
          intent,
          replyMove: plan?.reply_move || ""
        });
      }
      const recentCount = now - Number(state.protectedInterruptionLastAt || 0) < 8000
        ? Math.max(0, Math.round(Number(state.protectedInterruptionCount || 0)))
        : 0;
      if (recentCount >= config.forceAfterAttempts) {
        resetProtectedInterruptionState();
        return rememberTurnManagerDecision({
          action: "interrupt_now",
          reason: "force_after_attempts",
          speechActive: true,
          segmentIndex,
          segmentRole,
          segmentReason,
          elapsedMs,
          policy,
          intent,
          replyMove: plan?.reply_move || ""
        });
      }
      const remainingHoldMs = Math.max(120, config.maxHoldMs - elapsedMs);
      const segmentStartedAt = Number(state.activeAssistantSpeechSegmentStartedAt || 0);
      const segmentElapsedMs = segmentStartedAt > 0 ? Math.max(0, now - segmentStartedAt) : elapsedMs;
      const estimatedSegmentMs = Number(activeSegment?.estimated_ms || 0);
      const estimatedRemainingSegmentMs = estimatedSegmentMs > 0
        ? Math.max(180, estimatedSegmentMs - segmentElapsedMs)
        : 900;
      const minimumRemainingMs = Math.max(0, config.minMs - elapsedMs);
      const waitMs = Math.round(Math.min(
        remainingHoldMs,
        Math.max(500, Math.min(estimatedRemainingSegmentMs, 1800), minimumRemainingMs)
      ));
      if (!(waitMs > 160)) {
        return rememberTurnManagerDecision({
          action: "interrupt_now",
          reason: "segment_almost_done",
          speechActive: true,
          segmentIndex,
          segmentRole,
          segmentReason,
          elapsedMs,
          policy,
          intent,
          replyMove: plan?.reply_move || ""
        });
      }
      state.protectedInterruptionLastAt = now;
      state.protectedInterruptionCount = recentCount + 1;
      state.protectedInterruptionUntil = now + waitMs;
      state.protectedInterruptionReason = String(reason || "user_input");
      return rememberTurnManagerDecision({
        action: "finish_key_sentence",
        reason: segmentProtects ? "key_segment" : "important_speech",
        waitMs,
        elapsedMs,
        speechActive: true,
        protectedKeySentence: true,
        segmentIndex,
        segmentRole,
        segmentReason,
        policy,
        intent,
        replyMove: plan?.reply_move || "",
        textSignal: textProtects
      });
    }

    function shouldProtectImportantAssistantSpeech(reason = "user_input", opts = {}) {
      const decision = buildInterruptionArbitration(reason, opts);
      if (decision.action === "finish_key_sentence") {
        return {
          protect: true,
          reason: decision.reason,
          waitMs: decision.wait_ms,
          until: state.protectedInterruptionUntil,
          elapsedMs: decision.elapsed_ms,
          policy: decision.interruption_policy,
          intent: decision.intent,
          replyMove: decision.reply_move,
          segmentRole: decision.segment_role,
          segmentIndex: decision.segment_index,
          repeated: decision.repeated === true,
          turnDecision: decision
        };
      }
      return {
        protect: false,
        reason: decision.reason,
        policy: decision.interruption_policy,
        intent: decision.intent,
        segmentRole: decision.segment_role,
        segmentIndex: decision.segment_index,
        turnDecision: decision
      };
    }

    function nextChatTurnId() {
      const next = Math.max(1, Math.round(Number(state.chatTurnSeq || 0)) + 1);
      state.chatTurnSeq = next;
      return next;
    }

    function nextStreamSpeakSession() {
      const now = Date.now();
      const current = Number(state.streamSpeakSession || 0);
      return now > current ? now : current + 1;
    }

    function createChatAbortController() {
      if (typeof AbortController !== "function") {
        return null;
      }
      try {
        return new AbortController();
      } catch (_) {
        return null;
      }
    }

    function isAbortError(err) {
      return err?.name === "AbortError" || /abort/i.test(String(err?.message || ""));
    }

    function makeChatTurnInterruptedError() {
      const err = new Error("Chat turn interrupted");
      err.name = "AbortError";
      return err;
    }

    function isCurrentChatTurn(turnId) {
      const safeTurnId = Number(turnId || 0);
      return !!safeTurnId && Number(state.activeChatTurnId || 0) === safeTurnId;
    }

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

    function rememberInterruptedAssistantContext(reason = "user_input", turnId = 0, speechActive = false) {
      const assistantPartial = cleanConversationContextText(state.activeAssistantDraftText, 360);
      const previousUserMessage = cleanConversationContextText(state.activeAssistantUserText, 180);
      if (!assistantPartial && !previousUserMessage) {
        state.interruptedAssistantContext = null;
        state.interruptedAssistantContextUpdatedAt = 0;
        return null;
      }
      const now = Date.now();
      const turnManager = state.turnManagerLastDecision && typeof state.turnManagerLastDecision === "object" && !Array.isArray(state.turnManagerLastDecision)
        ? state.turnManagerLastDecision
        : null;
      const context = {
        version: 1,
        reason: cleanConversationContextText(reason, 48).toLowerCase().replace(/[^a-z0-9_-]+/g, "_") || "user_input",
        interrupted_at: now,
        turn_id: Math.max(0, Math.round(Number(turnId) || 0)),
        speech_active: speechActive === true,
        assistant_partial: assistantPartial,
        assistant_summary: cleanConversationContextText(assistantPartial, 140),
        previous_user_message: previousUserMessage,
        previous_user_summary: cleanConversationContextText(previousUserMessage, 100),
        turn_manager: turnManager
          ? {
              action: cleanConversationContextText(turnManager.action, 48),
              reason: cleanConversationContextText(turnManager.reason, 64),
              protected_key_sentence: turnManager.protected_key_sentence === true,
              segment_index: Math.max(0, Math.round(Number(turnManager.segment_index) || 0)),
              segment_role: cleanConversationContextText(turnManager.segment_role, 32),
              interruption_policy: cleanConversationContextText(turnManager.interruption_policy, 64),
              reply_move: cleanConversationContextText(turnManager.reply_move, 48)
            }
          : null
      };
      state.interruptedAssistantContext = context;
      state.interruptedAssistantContextUpdatedAt = now;
      return context;
    }

    function takeInterruptedAssistantContext(maxAgeMs = 90000) {
      const context = state.interruptedAssistantContext;
      if (!context || typeof context !== "object" || Array.isArray(context)) {
        return null;
      }
      const updatedAt = Number(context.interrupted_at || state.interruptedAssistantContextUpdatedAt || 0);
      state.interruptedAssistantContext = null;
      state.interruptedAssistantContextUpdatedAt = 0;
      if (!updatedAt || Date.now() - updatedAt > Math.max(1000, Number(maxAgeMs) || 90000)) {
        return null;
      }
      return {
        version: 1,
        reason: cleanConversationContextText(context.reason, 48) || "user_input",
        interrupted_at: Math.max(0, Math.round(updatedAt)),
        turn_id: Math.max(0, Math.round(Number(context.turn_id) || 0)),
        speech_active: context.speech_active === true,
        assistant_partial: cleanConversationContextText(context.assistant_partial, 360),
        assistant_summary: cleanConversationContextText(context.assistant_summary || context.assistant_partial, 140),
        previous_user_message: cleanConversationContextText(context.previous_user_message, 180),
        previous_user_summary: cleanConversationContextText(context.previous_user_summary || context.previous_user_message, 100),
        turn_manager: context.turn_manager && typeof context.turn_manager === "object" && !Array.isArray(context.turn_manager)
          ? {
              action: cleanConversationContextText(context.turn_manager.action, 48),
              reason: cleanConversationContextText(context.turn_manager.reason, 64),
              protected_key_sentence: context.turn_manager.protected_key_sentence === true,
              segment_index: Math.max(0, Math.round(Number(context.turn_manager.segment_index) || 0)),
              segment_role: cleanConversationContextText(context.turn_manager.segment_role, 32),
              interruption_policy: cleanConversationContextText(context.turn_manager.interruption_policy, 64),
              reply_move: cleanConversationContextText(context.turn_manager.reply_move, 48)
            }
          : null
      };
    }

    function buildInterruptedVisibleText(value) {
      const text = String(value || "").trim();
      if (!text) {
        return "";
      }
      const withoutTrailingEllipsis = text.replace(/(?:\.{3}|…)+\s*$/u, "").trimEnd();
      return `${withoutTrailingEllipsis || text}…`;
    }

    function finalizeInterruptedAssistantMessage() {
      const row = state.activeAssistantMessageRow;
      if (!row || row.dataset?.interruptionFinalized === "true") {
        return false;
      }
      const interruptedText = buildInterruptedVisibleText(state.activeAssistantDraftText);
      if (!interruptedText) {
        return false;
      }
      const timestamp = Date.now();
      const rowDataset = row.dataset || (row.dataset = {});
      rowDataset.interruptionFinalized = "true";
      row.classList?.add?.("is-interrupted");
      row.querySelector?.(".message-feedback")?.remove?.();
      finalizePendingMessageRow(row, "assistant", interruptedText, {
        timestamp,
        persist: true,
        enableTranslation: false
      });
      rememberMessage("assistant", interruptedText, { timestamp });
      state.conversationLastAssistantAt = timestamp;
      state.activeAssistantDraftText = interruptedText;
      state.activeAssistantMessageRow = null;
      return true;
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
      if (!raw) {
        return null;
      }
      const paralinguisticRaw = raw.paralinguistic
        && typeof raw.paralinguistic === "object"
        && !Array.isArray(raw.paralinguistic)
        ? raw.paralinguistic
        : null;
      const allowedEmotions = new Set([
        "angry", "disgusted", "fearful", "happy", "neutral", "sad", "surprised", "unknown"
      ]);
      const allowedCues = new Set([
        "nonverbal_vocalization", "laughter", "crying", "cough", "sneeze", "breath"
      ]);
      const allowedEvents = new Set([
        "speech", "laughter", "crying", "cough", "sneeze", "breath", "applause", "bgm", "music"
      ]);
      let paralinguistic = null;
      if (paralinguisticRaw) {
        const emotion = String(paralinguisticRaw.emotion || "unknown").trim().toLowerCase();
        const cueType = String(paralinguisticRaw.cue_type || "").trim().toLowerCase();
        const events = (Array.isArray(paralinguisticRaw.events) ? paralinguisticRaw.events : [])
          .map((item) => String(item || "").trim().toLowerCase())
          .filter((item, index, all) => allowedEvents.has(item) && all.indexOf(item) === index)
          .slice(0, 6);
        paralinguistic = {
          emotion: allowedEmotions.has(emotion) ? emotion : "unknown",
          events,
          cue_type: allowedCues.has(cueType) ? cueType : "",
          voiced: paralinguisticRaw.voiced === true,
          voiced_ratio: Math.max(0, Math.min(1, Number(paralinguisticRaw.voiced_ratio) || 0)),
          pitch_stability: Math.max(0, Math.min(1, Number(paralinguisticRaw.pitch_stability) || 0)),
          meaningful: paralinguisticRaw.meaningful === true
        };
      }
      if (raw.needs_confirmation !== true && !paralinguistic) {
        return null;
      }
      const confidence = Number(raw.confidence);
      const context = {
        version: 1,
        source: cleanConversationContextText(raw.source || "voice_transcript", 48),
        raw_text: cleanConversationContextText(raw.raw_text, 160),
        final_text: cleanConversationContextText(raw.final_text, 160),
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        reason: cleanConversationContextText(raw.reason || raw.confidence_reason, 80),
        needs_confirmation: raw.needs_confirmation === true
      };
      if (paralinguistic) {
        context.paralinguistic = paralinguistic;
      }
      return context;
    }

    function isChatTurnCancelled(turnId, abortController = null, err = null) {
      return !isCurrentChatTurn(turnId)
        || (abortController?.signal && abortController.signal.aborted === true)
        || isAbortError(err);
    }

    function throwIfChatTurnCancelled(turnId, abortController = null) {
      if (isChatTurnCancelled(turnId, abortController)) {
        throw makeChatTurnInterruptedError();
      }
    }

    function interruptActiveChatTurn(reason = "user_input", opts = {}) {
      const activeTurnId = Number(state.activeChatTurnId || 0);
      const hadActiveTurn = state.chatBusy === true || activeTurnId > 0 || !!state.chatAbortController;
      const hadAssistantSpeech = isAssistantSpeechActive();
      if (!hadActiveTurn && !hadAssistantSpeech) {
        return false;
      }
      const protectedSpeech = shouldProtectImportantAssistantSpeech(reason, opts);
      if (protectedSpeech.protect) {
        recordTTSDebugEvent("important_speech_protected", {
          reason: String(reason || "user_input"),
          turnId: activeTurnId,
          waitMs: Number(protectedSpeech.waitMs || 0),
          policy: String(protectedSpeech.policy || ""),
          intent: String(protectedSpeech.intent || ""),
          segmentId: Number(protectedSpeech.segmentIndex || 0),
          segmentRole: String(protectedSpeech.segmentRole || ""),
          turnAction: String(protectedSpeech.turnDecision?.action || "finish_key_sentence"),
          repeated: protectedSpeech.repeated === true
        });
        return false;
      }
      const controller = state.chatAbortController;
      const interruptedContext = rememberInterruptedAssistantContext(reason, activeTurnId, hadAssistantSpeech);
      const interruptedMessagePreserved = finalizeInterruptedAssistantMessage();
      clearPerformancePhase({ turnId: activeTurnId, reason: "chat_turn_interrupted" });
      state.activeChatTurnId = 0;
      state.chatAbortController = null;
      state.chatBusy = false;
      state.chatInterruptedAt = Date.now();
      resetProtectedInterruptionState();
      if (controller && typeof controller.abort === "function" && controller.signal?.aborted !== true) {
        try {
          controller.abort();
        } catch (_) {
          // ignore
        }
      }
      const oldSession = Number(state.streamSpeakSession || 0);
      if (oldSession) {
        abortServerTTSRequests({
          sessionId: oldSession,
          reason: "chat_turn_interrupted"
        });
        discardQueuedStreamSpeakItems(oldSession);
      }
      state.streamSpeakSession = nextStreamSpeakSession();
      state.streamSpeakQueue = [];
      state.streamSpeakBuffer = "";
      state.streamSpeakLastEnqueueSession = 0;
      state.streamSpeakDelivery = null;
      clearPerformanceTimelineTimers();
      clearThinkingMotionTimer();
      stopAllAudioPlayback();
      clearAssistantSpeechPlan();
      recordTTSDebugEvent("chat_turn_interrupted", {
        reason: String(reason || "user_input"),
        turnId: activeTurnId,
        speechActive: hadAssistantSpeech,
        contextCaptured: !!interruptedContext,
        visiblePartialPreserved: interruptedMessagePreserved,
        turnAction: String(protectedSpeech.turnDecision?.action || "interrupt_now"),
        turnReason: String(protectedSpeech.turnDecision?.reason || protectedSpeech.reason || ""),
        segmentRole: String(protectedSpeech.segmentRole || "")
      });
      return true;
    }

    function handleUserSpeechStart(input = {}) {
      if (state.conversationMode?.interruptTtsOnUserSpeech !== true) {
        return false;
      }
      if (!state.chatBusy && !isAssistantSpeechActive()) {
        return false;
      }
      if (input?.confirmedTranscript !== true) {
        recordTTSDebugEvent("voice_barge_in_candidate", {
          reason: String(input?.reason || "user_speech_start"),
          source: "speech_start",
          semanticConfirmationPending: true
        });
        return false;
      }
      const kind = String(input?.kind || "").trim().toLowerCase();
      const mustYieldImmediately = !kind || kind === "stop" || kind === "correction";
      return interruptActiveChatTurn(input?.reason || "user_speech_start", {
        bypassProtection: mustYieldImmediately
      });
    }

    function waitForSpeechTurnIdle(timeoutMs = 14000) {
      const limitMs = Math.max(0, Math.min(45000, Math.round(Number(timeoutMs) || 0)));
      if (!isAssistantSpeechActive()) {
        return Promise.resolve(true);
      }
      const startedAt = Date.now();
      return new Promise((resolve) => {
        const tick = () => {
          if (!isAssistantSpeechActive()) {
            resolve(true);
            return;
          }
          if (Date.now() - startedAt >= limitMs) {
            resolve(false);
            return;
          }
          window.setTimeout(tick, 120);
        };
        tick();
      });
    }

    function resolveOrderedContinuationBreathMs(currentText = "", style = "neutral") {
      const history = Array.isArray(state.history) ? state.history : [];
      const current = String(currentText || "").trim();
      let prior = "";
      let skippedCurrent = false;
      for (let i = history.length - 1; i >= 0; i -= 1) {
        const item = history[i];
        if (String(item?.role || "") !== "assistant") continue;
        const text = String(item?.content || "").trim();
        if (!skippedCurrent && current && text === current) {
          skippedCurrent = true;
          continue;
        }
        prior = text;
        break;
      }
      const styleKey = String(style || "neutral").trim().toLowerCase();
      let pause = 145;
      if (/(?:\.{2,}|\u2026|\u3002{2,})$/.test(prior)) pause += 80;
      else if (/[?\uFF1F]$/.test(prior)) pause += 45;
      else if (/[!\uFF01]$/.test(prior)) pause -= 25;
      else if (/[,，、;；:]$/.test(prior)) pause -= 35;
      if (["comfort", "soft", "warm", "thinking"].includes(styleKey)) pause += 30;
      if (["playful", "cheerful", "teasing", "happy"].includes(styleKey)) pause -= 20;
      return Math.max(80, Math.min(280, Math.round(pause)));
    }

    async function waitOrderedContinuationBreath(currentText, style, signal = null) {
      const waitMs = resolveOrderedContinuationBreathMs(currentText, style);
      const endAt = Date.now() + waitMs;
      while (Date.now() < endAt) {
        if (signal?.aborted === true) return false;
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(20, endAt - Date.now())));
      }
      return true;
    }

    function waitForChatTurnIdle(timeoutMs = 1200) {
      const limitMs = Math.max(0, Math.min(5000, Math.round(Number(timeoutMs) || 0)));
      if (!state.chatBusy) {
        return Promise.resolve(true);
      }
      const startedAt = Date.now();
      return new Promise((resolve) => {
        const tick = () => {
          if (!state.chatBusy) {
            resolve(true);
            return;
          }
          if (Date.now() - startedAt >= limitMs) {
            resolve(false);
            return;
          }
          window.setTimeout(tick, 80);
        };
        tick();
      });
    }

    async function waitForNonInterruptingSpeechTurn(opts = {}) {
      const isAutoTurn = opts.auto === true;
      const allowInterrupt = opts.interruptTts === true
        || (state.conversationMode?.interruptTtsOnUserSpeech === true && !isAutoTurn);
      if (allowInterrupt || !isAssistantSpeechActive()) {
        return { ready: true, interrupt: allowInterrupt, waited: false };
      }
      if (isAutoTurn || opts.dropIfSpeaking === true) {
        return { ready: false, interrupt: false, waited: false, reason: "speaking" };
      }
      const ok = await waitForSpeechTurnIdle(opts.speechTurnWaitMs ?? 14000);
      return { ready: ok, interrupt: false, waited: true, reason: ok ? "" : "speech_wait_timeout" };
    }

    function normalizeRuntimeVoiceStyleForSpeech(style) {
      const raw = String(style || "").trim();
      if (!raw) {
        return "";
      }
      const key = raw.toLowerCase().replace(/-/g, "_");
      const allowedAliases = [
        "neutral", "soft", "cheerful", "teasing", "serious", "curious", "warm",
        "happy", "playful", "sad", "anxious", "angry", "annoyed", "thinking",
        "comfort", "clear", "steady"
      ];
      if (!allowedAliases.includes(key)) {
        return "";
      }
      return normalizeRuntimeVoiceStyle(raw);
    }

    function resolveRuntimeTalkStyleForSpeech(runtimeVoiceStyle, fallback) {
      if (!runtimeVoiceStyle) {
        return normalizeTalkStyle(fallback);
      }
      return normalizeTalkStyle(runtimeVoiceStyleToTalkStyle(runtimeVoiceStyle, fallback, normalizeTalkStyle));
    }

    function waitVoiceDirectorPause(
      ms,
      sessionId,
      signal = null,
      playbackGeneration = state.ttsPlaybackGeneration
    ) {
      const delayMs = Math.max(0, Math.min(1600, Number(ms) || 0));
      if (delayMs <= 0) {
        return Promise.resolve(
          signal?.aborted !== true
          && (!sessionId || Number(state.streamSpeakSession || 0) === Number(sessionId || 0))
          && Number(state.ttsPlaybackGeneration || 0) === Number(playbackGeneration || 0)
        );
      }
      return new Promise((resolve) => {
        let settled = false;
        let timer = 0;
        let removeAbortListener = null;
        const settle = (ready) => {
          if (settled) {
            return;
          }
          settled = true;
          if (timer) {
            try {
              window.clearTimeout(timer);
            } catch (_) {
              // ignore
            }
            state.performanceTimelineTimers = Array.isArray(state.performanceTimelineTimers)
              ? state.performanceTimelineTimers.filter((entry) => entry !== timer)
              : [];
          }
          if (typeof removeAbortListener === "function") {
            removeAbortListener();
            removeAbortListener = null;
          }
          resolve(ready === true);
        };
        timer = window.setTimeout(() => settle(true), delayMs);
        state.performanceTimelineTimers = Array.isArray(state.performanceTimelineTimers) ? state.performanceTimelineTimers : [];
        state.performanceTimelineTimers.push(timer);
        if (signal?.aborted === true) {
          settle(false);
        } else if (typeof signal?.addEventListener === "function") {
          const onAbort = () => settle(false);
          signal.addEventListener("abort", onAbort, { once: true });
          removeAbortListener = () => {
            try {
              signal.removeEventListener("abort", onAbort);
            } catch (_) {
              // ignore
            }
          };
        }
      }).then((ready) => {
        if (
          ready !== true
          || signal?.aborted === true
          || (sessionId && Number(state.streamSpeakSession || 0) !== Number(sessionId || 0))
          || Number(state.ttsPlaybackGeneration || 0) !== Number(playbackGeneration || 0)
        ) {
          return false;
        }
        return true;
      });
    }

    function canPrefetchServerVoiceSegments(voiceTimeline, segments) {
      return String(state.ttsProvider || "").toLowerCase() === "gpt_sovits"
        && typeof requestServerTTSBlobWithRetry === "function"
        && typeof playAudioBlob === "function"
        && voiceTimeline?.enabled === true
        && Array.isArray(segments)
        && segments.length > 1;
    }

    async function speakPrefetchedServerVoiceSegments(segments, context, voiceTimeline, voiceDirector, mode, speechPlan = null) {
      const playbackGeneration = Number(context.playbackGeneration || state.ttsPlaybackGeneration || 0);
      const sessionId = Number(context.sessionId || 0);
      const requests = [];
      const makeRequest = (index) => {
        if (requests[index]) {
          return requests[index];
        }
        const segment = String(segments[index] || "").trim();
        const segmentPerformanceCue = typeof context.performanceCueForText === "function"
          ? context.performanceCueForText(segment)
          : (context.performanceCue || null);
        const prosody = mergePerformanceCueProsody(
          applyVoiceDirectorProsody(
            buildSpeakProsody(segment, context.mood, false, context.prosodyStyle),
            voiceDirector
          ),
          segmentPerformanceCue
        );
        const startedAt = performance.now();
        requests[index] = requestServerTTSBlobWithRetry(segment, prosody, {
          retries: Number(state.ttsServerRetryCount),
          retryDelayMs: Number(state.ttsServerRetryDelayMs),
          timeoutMs: Number(state.ttsServerRequestTimeoutMs),
          traceId: context.traceId,
          signal: context.signal || null,
          playbackGeneration,
          sessionId,
          kind: "segmented_prefetch"
        })
          .then((blob) => ({
            ok: true,
            blob,
            segment,
            segmentPerformanceCue,
            index,
            startedAt,
            readyAt: performance.now()
          }))
          .catch((error) => ({
            ok: false,
            error,
            segment,
            segmentPerformanceCue,
            index,
            startedAt,
            readyAt: performance.now()
          }));
        return requests[index];
      };

      makeRequest(0);
      if (segments.length > 1) {
        makeRequest(1);
      }
      if (!(await waitVoiceDirectorPause(
        Math.min(30, Number(voiceTimeline.pre_pause_ms) || 0),
        context.sessionId,
        context.signal || null,
        playbackGeneration
      ))) {
        recordPerformanceAuditEvent("tts_end", { mode, ok: false, reason: "prefetch_pre_pause_cancelled" });
        return false;
      }

      let allOk = true;
      let spokenCount = 0;
      for (let i = 0; i < segments.length; i += 1) {
        const result = await makeRequest(i);
        if (speechPlan) {
          setActiveAssistantSpeechSegment(i + 1, result.segment || segments[i]);
        }
        if (i + 1 < segments.length) {
          makeRequest(i + 1);
        }
        if (
          context.signal?.aborted === true
          || (sessionId && Number(state.streamSpeakSession || 0) !== sessionId)
          || Number(state.ttsPlaybackGeneration || 0) !== playbackGeneration
        ) {
          allOk = false;
          break;
        }
        if (!result.ok || !result.blob) {
          allOk = false;
          recordPerformanceAuditEvent("tts_segment", {
            mode,
            index: i + 1,
            segments: segments.length,
            ok: false,
            prefetch: true
          });
          const fallbackOk = await speak(result.segment || segments[i], {
            prosody: mergePerformanceCueProsody(
              applyVoiceDirectorProsody(
                buildSpeakProsody(result.segment || segments[i], context.mood, false, context.prosodyStyle),
                voiceDirector
              ),
              result.segmentPerformanceCue
            ),
            interrupt: context.interrupt === true && i === 0,
            mood: context.mood,
            style: context.talkStyle,
            voiceStyle: context.prosodyStyle,
            perfTraceId: context.traceId,
            performanceCue: result.segmentPerformanceCue || context.performanceCue || null,
            playbackGeneration,
            preserveTurnPlaybackGeneration: context.preserveTurnPlaybackGeneration === true,
            sessionId,
            signal: context.signal || null,
            onPlaybackStart: context.onPlaybackStart,
            onPlaybackProgress: context.onPlaybackProgress
          });
          if (fallbackOk !== false) {
            spokenCount += 1;
          }
        } else {
          const ok = await playAudioBlob(result.blob, {
            interrupt: context.interrupt === true && i === 0,
            text: result.segment,
            mood: context.mood,
            style: context.talkStyle,
            perfTraceId: context.traceId,
            perfBlobReadyPerfMs: result.readyAt,
            perfSpeakStartedPerfMs: result.startedAt,
            playbackGeneration,
            sessionId: context.sessionId,
            segmentId: i + 1,
            performanceCue: result.segmentPerformanceCue || context.performanceCue || null,
            onPlaybackStart: context.onPlaybackStart,
            onPlaybackProgress: context.onPlaybackProgress
          });
          recordPerformanceAuditEvent("tts_segment", {
            mode,
            index: i + 1,
            segments: segments.length,
            ok: ok !== false,
            prefetch: true
          });
          if (ok === false) {
            allOk = false;
          } else {
            spokenCount += 1;
          }
        }
        if (i < segments.length - 1) {
          const keepGoing = await waitVoiceDirectorPause(
            Math.min(180, Number(voiceTimeline.inter_segment_pause_ms) || 0),
            context.sessionId,
            context.signal || null,
            playbackGeneration
          );
          if (!keepGoing) {
            allOk = false;
            break;
          }
        }
      }
      recordPerformanceAuditEvent("tts_end", { mode, ok: allOk && spokenCount > 0, prefetch: true });
      return allOk && spokenCount > 0;
    }

    async function speakWithVoiceTimeline(speechText, context = {}) {
      const text = String(speechText || "").trim();
      if (!text) {
        return false;
      }
      const voiceTimeline = context.voiceTimeline && typeof context.voiceTimeline === "object" && !Array.isArray(context.voiceTimeline)
        ? context.voiceTimeline
        : null;
      const performanceCue = context.performanceCue && typeof context.performanceCue === "object"
        ? context.performanceCue
        : null;
      let playbackStartNotified = false;
      const notifyPlaybackStart = (event = {}) => {
        if (playbackStartNotified) {
          return false;
        }
        playbackStartNotified = true;
        recordPerformanceAuditEvent("tts_start", {
          mode,
          source: String(event?.source || "server_tts")
        });
        reportBehaviorEvent("tts_started", {
          source: String(event?.source || "server_tts"),
          interaction_id: String(context.traceId || "").slice(0, 80)
        });
        if (typeof context.onPlaybackStart === "function") {
          try {
            context.onPlaybackStart(event);
          } catch (_) {
            // Optional timing hooks must never interrupt speech delivery.
          }
        }
        return true;
      };
      const voiceTimelineDirector = voiceTimeline?.voice_director && typeof voiceTimeline.voice_director === "object" && !Array.isArray(voiceTimeline.voice_director)
        ? voiceTimeline.voice_director
        : null;
      const voiceDirector = voiceTimelineDirector || state.characterBrainLastDecision?.voice_director || voiceTimeline;
      const segments = buildVoiceSpeechSegments(text, voiceTimeline).filter(Boolean);
      const safeSegments = segments.length ? segments : [text];
      const speechPlan = activateAssistantSpeechPlan(
        buildAssistantSpeechPlan(text, voiceTimeline, state.characterBrainLastDecision, safeSegments)
      );
      const qwenContinuousReply = String(state.ttsProvider || "").toLowerCase() === "qwen3_tts"
        && state.qwen3TtsReplyContinuity !== false;
      const useSegmented = !qwenContinuousReply
        && voiceTimeline?.enabled === true
        && safeSegments.length > 1;
      const usePrefetchSegmented = canPrefetchServerVoiceSegments(voiceTimeline, safeSegments);
      const mode = usePrefetchSegmented
        ? `${context.mode || "direct"}_prefetch_segmented`
        : (useSegmented
          ? `${context.mode || "direct"}_segmented`
          : (qwenContinuousReply ? `${context.mode || "direct"}_continuous_reply` : (context.mode || "direct")));
      const fallbackReason = String(voiceTimeline?.fallback_reason || "none");
      const voiceSegmentAudit = {
        mode,
        segments: useSegmented || usePrefetchSegmented ? safeSegments.length : 1,
        delivery: String(voiceTimeline?.delivery || voiceDirector?.delivery || "none"),
        pace: String(voiceTimeline?.pace || voiceDirector?.pace || "none"),
        pause_profile: String(voiceTimeline?.pause_profile || voiceDirector?.pause_profile || "none"),
        segment_style: String(voiceTimeline?.segment_style || voiceDirector?.segment_style || "whole"),
        energy: String(voiceTimeline?.energy || voiceDirector?.energy || "neutral"),
        gesture_profile: String(voiceTimeline?.gesture_profile || voiceDirector?.gesture_profile || "neutral"),
        pre_pause_ms: Number(voiceTimeline?.pre_pause_ms) || 0,
        inter_segment_pause_ms: Number(voiceTimeline?.inter_segment_pause_ms) || 0,
        fallback_reason: fallbackReason
      };
      if (!useSegmented) {
        recordPerformanceAuditEvent("voice_segment_plan", voiceSegmentAudit);
        setActiveAssistantSpeechSegment(1, text);
        const segmentPerformanceCue = typeof context.performanceCueForText === "function"
          ? context.performanceCueForText(text)
          : performanceCue;
        const prosody = mergePerformanceCueProsody(
          applyVoiceDirectorProsody(
            buildSpeakProsody(text, context.mood, false, context.prosodyStyle),
            voiceDirector
          ),
          segmentPerformanceCue
        );
        const ok = await speak(text, {
          prosody,
          interrupt: context.interrupt === true,
          mood: context.mood,
          style: context.talkStyle,
          voiceStyle: context.prosodyStyle,
          perfTraceId: context.traceId,
          performanceCue: segmentPerformanceCue,
          playbackGeneration: context.playbackGeneration,
          preserveTurnPlaybackGeneration: context.preserveTurnPlaybackGeneration === true,
          sessionId: context.sessionId,
          signal: context.signal || null,
          onPlaybackStart: notifyPlaybackStart,
          onPlaybackProgress: context.onPlaybackProgress
        });
        if (ok !== false) {
          recordPerformanceAuditEvent("tts_segment", { mode, index: 1, segments: safeSegments.length, ok: true });
        } else {
          recordPerformanceAuditEvent("tts_segment", { mode, index: 1, segments: safeSegments.length, ok: false });
        }
        recordPerformanceAuditEvent("tts_end", { mode, ok: ok !== false });
        return ok !== false;
      }

      recordPerformanceAuditEvent("voice_segment_plan", voiceSegmentAudit);
      if (usePrefetchSegmented) {
        return await speakPrefetchedServerVoiceSegments(
          safeSegments,
          { ...context, onPlaybackStart: notifyPlaybackStart },
          voiceTimeline,
          voiceDirector,
          mode,
          speechPlan
        );
      }
      if (!(await waitVoiceDirectorPause(
        voiceTimeline.pre_pause_ms,
        context.sessionId,
        context.signal || null,
        context.playbackGeneration
      ))) {
        recordPerformanceAuditEvent("tts_end", { mode, ok: false });
        return false;
      }
      let allOk = true;
      let spokenCount = 0;
      for (let i = 0; i < safeSegments.length; i += 1) {
        const segment = String(safeSegments[i] || "").trim();
        if (!segment) {
          continue;
        }
        setActiveAssistantSpeechSegment(i + 1, segment);
        const segmentPerformanceCue = typeof context.performanceCueForText === "function"
          ? context.performanceCueForText(segment)
          : performanceCue;
        const prosody = mergePerformanceCueProsody(
          applyVoiceDirectorProsody(
            buildSpeakProsody(segment, context.mood, false, context.prosodyStyle),
            voiceDirector
          ),
          segmentPerformanceCue
        );
        const ok = await speak(segment, {
          prosody,
          interrupt: context.interrupt === true && i === 0,
          mood: context.mood,
          style: context.talkStyle,
          voiceStyle: context.prosodyStyle,
          perfTraceId: context.traceId,
          performanceCue: segmentPerformanceCue,
          playbackGeneration: context.playbackGeneration,
          preserveTurnPlaybackGeneration: context.preserveTurnPlaybackGeneration === true,
          sessionId: context.sessionId,
            signal: context.signal || null,
            onPlaybackStart: notifyPlaybackStart,
            onPlaybackProgress: context.onPlaybackProgress
        });
        recordPerformanceAuditEvent("tts_segment", {
          mode,
          index: i + 1,
          segments: safeSegments.length,
          ok: ok !== false
        });
        if (ok === false) {
          allOk = false;
        } else {
          spokenCount += 1;
        }
        if (i < safeSegments.length - 1) {
          const keepGoing = await waitVoiceDirectorPause(
            voiceTimeline.inter_segment_pause_ms,
            context.sessionId,
            context.signal || null,
            context.playbackGeneration
          );
          if (!keepGoing) {
            allOk = false;
            break;
          }
        }
      }
      recordPerformanceAuditEvent("tts_end", { mode, ok: allOk && spokenCount > 0 });
      return allOk && spokenCount > 0;
    }

    function shouldSuppressGenericReplyMotion(metadata) {
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return false;
      }
      const action = String(metadata.action || "").trim().toLowerCase().replace(/-/g, "_");
      const brainIntent = String(metadata.brain_intent || "").trim().toLowerCase().replace(/-/g, "_");
      const live2dHint = String(metadata.live2d_hint || "").trim().toLowerCase();
      if (action !== "none") {
        return false;
      }
      return brainIntent === "comfort"
        || brainIntent === "low_interrupt_checkin"
        || live2dHint === "quiet"
        || live2dHint === "eyes_down";
    }

    async function streamAssistantReply(payload, onDelta, perfHooks = null, requestOptions = {}) {
      const chatApi = window.TaffyModules?.chatApi || {};
      if (typeof chatApi.streamAssistantReply !== "function") {
        throw new Error("chatApi stream helper is not available");
      }
      const turnId = Number(requestOptions.turnId || 0);
      const onDeliveryId = typeof requestOptions.onDeliveryId === "function"
        ? requestOptions.onDeliveryId
        : () => {};
      return chatApi.streamAssistantReply(payload, onDelta, {
        authFetch,
        onCharacterRuntimeMetadata: (metadata) => {
          if (turnId && !isCurrentChatTurn(turnId)) {
            return null;
          }
          return rememberCharacterRuntimeMetadataForReply(metadata);
        },
        onCharacterBrainDecision: (decision) => {
          if (turnId && !isCurrentChatTurn(turnId)) {
            return null;
          }
          return handleCharacterBrainDecision(decision);
        },
        onCompanionTurn: (turn) => {
          if (turnId && !isCurrentChatTurn(turnId)) {
            return null;
          }
          return rememberCompanionTurnForReply(turn);
        },
        onConversationDecision: (decision) => {
          if (turnId && !isCurrentChatTurn(turnId)) {
            return null;
          }
          return rememberConversationDecisionForReply(decision);
        },
        onDeliveryId: (deliveryId) => {
          if (turnId && !isCurrentChatTurn(turnId)) {
            return null;
          }
          return onDeliveryId(deliveryId);
        },
        preferStream: state.conversationMode.chatStreamEnabled !== false,
        firstDeltaTimeoutMs: state.naturalConversation?.enabled === true
          ? 30000
          : 12000,
        perfHooks,
        perfLog,
        now: () => performance.now(),
        signal: requestOptions.signal || null
      });
    }

    async function requestAssistantReply(text, opts = {}) {
      const message = String(text || "").trim();
      if (!message) {
        return false;
      }
      const isAuto = !!opts.auto;
      // The ASR turn manager owns this decision. Do not downgrade an explicitly
      // ordered continuation during a thinking-only phase or the tiny silence
      // between audio segments; both are valid parts of the prior delivery chain.
      const preservePriorSpeech = opts.preservePriorSpeech === true;
      const allowActiveInterrupt = !preservePriorSpeech
        && (opts.interruptActive === true || (opts.interruptActive !== false && !isAuto));
      if (allowActiveInterrupt && (state.chatBusy || isAssistantSpeechActive())) {
        const interruptReason = opts.interruptReason || "new_user_turn";
        const protectedSpeech = shouldProtectImportantAssistantSpeech(interruptReason);
        if (protectedSpeech.protect) {
          recordTTSDebugEvent("important_speech_protected", {
            reason: String(interruptReason || "new_user_turn"),
            waitMs: Number(protectedSpeech.waitMs || 0),
            policy: String(protectedSpeech.policy || ""),
            intent: String(protectedSpeech.intent || ""),
            segmentId: Number(protectedSpeech.segmentIndex || 0),
            segmentRole: String(protectedSpeech.segmentRole || ""),
            turnAction: String(protectedSpeech.turnDecision?.action || "finish_key_sentence"),
            source: "request"
          });
          const finished = await waitForSpeechTurnIdle(protectedSpeech.waitMs);
          const turnReady = finished ? await waitForChatTurnIdle(1200) : false;
          if ((!finished || !turnReady) && (state.chatBusy || isAssistantSpeechActive())) {
            interruptActiveChatTurn(interruptReason, { bypassProtection: true });
          }
        } else {
          interruptActiveChatTurn(interruptReason, { bypassProtection: true });
        }
      }
      if (state.chatBusy) {
        return false;
      }
      const turnId = nextChatTurnId();
      const chatAbortController = createChatAbortController();
      state.activeChatTurnId = turnId;
      state.chatAbortController = chatAbortController;
      state.chatBusy = true;
      const userDisplayText = String(opts.userDisplayText || message).trim() || message;
      const rememberContent = String(opts.rememberContent || message).trim() || message;
      const imageDataUrlOverride = typeof opts.imageDataUrlOverride === "string"
        ? String(opts.imageDataUrlOverride || "").trim()
        : "";

      const showUser = opts.showUser !== false;
      const rememberUser = opts.rememberUser !== false;
      const rememberAssistant = opts.rememberAssistant !== false;
      const silentError = !!opts.silentError;
      const skipDesktopAttach = opts.skipDesktopAttach === true;
      const forceTools = opts.forceTools === true;
      const toolsOptional = opts.toolsOptional === true;
      const inputModality = isAuto
        ? "auto"
        : normalizeInputModality(opts.inputModality || opts.input_modality, "text");
      const naturalParticipation = isAuto && opts.naturalParticipation === true;
      const speechTurn = preservePriorSpeech
        ? { ready: true, interrupt: false, waited: false, reason: "ordered_continuation" }
        : await waitForNonInterruptingSpeechTurn({
            auto: isAuto,
            interruptTts: opts.interruptTts === true || allowActiveInterrupt,
            dropIfSpeaking: opts.dropIfSpeaking === true,
            speechTurnWaitMs: opts.speechTurnWaitMs
          });
      if (!speechTurn.ready) {
        recordTTSDebugEvent(isAuto ? "proactive_reply_suppressed" : "chat_turn_wait_failed", {
          result: speechTurn.reason || "speaking",
          text: message
        });
        if (isCurrentChatTurn(turnId)) {
          state.activeChatTurnId = 0;
          if (state.chatAbortController === chatAbortController) {
            state.chatAbortController = null;
          }
          state.chatBusy = false;
        }
        return false;
      }
      if (isChatTurnCancelled(turnId, chatAbortController)) {
        return false;
      }
      characterRuntimeMetadataForReply = null;
      companionTurnForReply = null;
      conversationDecisionForReply = null;
      state.naturalConversationDecision = null;
      const chatPerfTraceId = createPerfTraceId("chat");
      const chatPerfStartPerfMs = performance.now();
      const chatPerfStartWallMs = Date.now();
      let chatPerfApiHeaderPerfMs = 0;
      let chatPerfFirstDeltaPerfMs = 0;
      state.activePerfTraceId = chatPerfTraceId;
      state.activeAssistantDraftText = "";
      state.activeAssistantUserText = userDisplayText;
      state.activeAssistantTurnStartedAt = chatPerfStartWallMs;
      perfLog("chat", "send_click", {
        traceId: chatPerfTraceId,
        mode: String(state.streamSpeakMode || ""),
        ttsProvider: String(state.ttsProvider || ""),
        messageChars: message.length
      });
      const userTimestamp = Date.now();
      if (showUser || rememberUser) {
        state.lastUserMessageAt = userTimestamp;
        state.conversationLastUserAt = userTimestamp;
        if (!isAuto) {
          state.autoChatBurstCount = 0;
        }
      }

      if (showUser) {
        appendMessage("user", userDisplayText, { timestamp: userTimestamp });
      }
      if (rememberUser) {
        rememberMessage("user", rememberContent, { timestamp: userTimestamp });
      }
      const initialMood = detectMood(userDisplayText);
      const talkStyle = resolveTalkStyle(userDisplayText, "", initialMood, isAuto);
      state.currentTalkStyle = talkStyle;
       clearPerformancePhase({ reason: "new_chat_turn" });
       stopWakeWordListener(true);
       const micPauseLeaseHeld = pauseMicForAssistant() === true;
       let micPauseLeaseReleased = false;
       const releaseMicPauseLease = () => {
         if (!micPauseLeaseHeld || micPauseLeaseReleased) {
           return false;
         }
         micPauseLeaseReleased = true;
         return resumeMicAfterAssistant();
       };
      const wasSpeakingAtSend = state.ttsContextSpeaking === true
        || state.streamSpeakWorking === true
        || String(state.speechPhase || "").toLowerCase() === "speaking";
      const earlyPreReactionPlan = buildEarlyPreReactionPlan({
        text: userDisplayText,
        mood: initialMood,
        talkStyle,
        motionEnabled: state.motionEnabled !== false,
        expressionEnabled: state.expressionEnabled !== false,
        speakingNow: wasSpeakingAtSend,
        lastReactionAt: Number(state.earlyPreReactionLastAt || 0),
        nowMs: Date.now(),
        isAuto
      });
      let earlyPreReactionSummary = null;
      if (earlyPreReactionPlan) {
        earlyPreReactionSummary = executeEarlyPreReactionPlan(earlyPreReactionPlan, {
          text: userDisplayText,
          style: talkStyle,
          mood: initialMood,
          enqueueActionIntent,
          triggerExpressionPulse
        });
        earlyPreReactionSummary = rememberEarlyPreReaction(earlyPreReactionSummary);
        if (earlyPreReactionSummary?.actual === "dispatched") {
          publishPerformancePhase({
            turnId,
            phase: "pre_reaction",
            phasePlan: earlyPreReactionPlan.preReaction,
            style: talkStyle,
            mood: initialMood
          });
        }
      }
      if (!earlyPreReactionPlan && (!earlyPreReactionSummary || earlyPreReactionSummary.actual !== "dispatched")) {
        enqueueActionIntent("listen", { text: userDisplayText, style: talkStyle, mood: initialMood });
        publishPerformancePhase({
          turnId,
          phase: "pre_reaction",
          actionIntent: "listen",
          actionStyle: talkStyle,
          actionMood: initialMood,
          pulseStyle: talkStyle,
          pulseBoost: 0.2,
          pulseDurationMs: 180,
          motionCue: "listen",
          motionRole: "pre_reaction"
        });
      }

      setStatus(isAuto ? "主动陪伴中..." : "思考中...");
      let assistantRow = null;
        let assistantRowFinalized = false;
        let reply = "";
        let visibleStreamReply = "";
        let companionSpeechPrewarm = null;
        let gotFirstDelta = false;
        let deliveryIdForReply = "";
        let deliveryAcknowledged = false;
      let latencyHintTimer = 0;
      let streamSpeechSettlement = null;
      const streamSpeakSession = nextStreamSpeakSession();
      const useStreamSpeak = shouldUseStreamSpeak() && !preservePriorSpeech;
      // Qwen defaults to one finalized request so punctuation and adjacent
      // clauses share the same voice identity and emotional through-line.
      // The legacy low-latency sentence stream remains available only when
      // qwen3_tts_reply_continuity is explicitly disabled.
      const normalTurnWaitsForCompanionEnvelope = state.companionTurnEnabled === true
        && !canStreamBeforeCompanionTurnFinalizes();
      const waitForCompanionTurn = preservePriorSpeech || normalTurnWaitsForCompanionEnvelope;
      if (!preservePriorSpeech && (speechTurn.interrupt || !isAssistantSpeechActive())) {
        stopAllAudioPlayback();
      }
      clearPerformanceTimelineTimers();
      if (!preservePriorSpeech) {
        state.streamSpeakSession = streamSpeakSession;
        state.streamSpeakQueue = [];
        state.streamSpeakBuffer = "";
        state.streamSpeakLastEnqueueSession = 0;
        state.streamSpeakDelivery = null;
      }
      let streamActualPlaybackEvent = null;
      let streamPlaybackTimelineHandler = null;
      const performanceCueForStreamText = (segmentText) => buildSegmentPerformanceCue(segmentText, {
        companionTurn: companionTurnForReply,
        mood: detectMood(segmentText),
        talkStyle: state.currentTalkStyle || talkStyle
      });
      const streamPlaybackGeneration = Number(state.ttsPlaybackGeneration || 0);
      const isCurrentStreamPlayback = () => (
        Number(state.streamSpeakSession || 0) === Number(streamSpeakSession || 0)
        && Number(state.ttsPlaybackGeneration || 0) === streamPlaybackGeneration
        && (
          isCurrentChatTurn(turnId)
          || (!state.chatBusy && Number(state.activeChatTurnId || 0) === 0)
        )
      );
      const handleStreamPlaybackStart = (event = {}) => {
        const eventPlaybackGeneration = Number(event.playbackGeneration || streamPlaybackGeneration);
        if (
          !isCurrentStreamPlayback()
          || eventPlaybackGeneration !== streamPlaybackGeneration
        ) {
          return false;
        }
        const playbackEvent = {
          ...event,
          playbackGeneration: eventPlaybackGeneration,
          startedAtPerfMs: Number(event.startedAtPerfMs) || performance.now()
        };
        if (!streamActualPlaybackEvent) {
          streamActualPlaybackEvent = playbackEvent;
        }
        if (typeof streamPlaybackTimelineHandler === "function") {
          streamPlaybackTimelineHandler(playbackEvent);
        }
        return true;
      };
      if (
        shouldPlayLatencyHint(isAuto, useStreamSpeak)
        && !(
          inputModality === "voice"
          && state.naturalConversation?.enabled === true
        )
      ) {
        latencyHintTimer = window.setTimeout(async () => {
          if (!isCurrentChatTurn(turnId) || !state.chatBusy || gotFirstDelta) {
            return;
          }
          if (streamSpeakSession !== state.streamSpeakSession) {
            return;
          }
          const hint = pickLatencyHintText();
          const prosody = buildSpeakProsody(hint, "idle", false, talkStyle);
          clearPerformancePhase({ turnId, reason: "latency_hint_started" });
            await speak(hint, {
              force: true,
              interrupt: true,
              prosody,
              signal: chatAbortController?.signal || null,
              sessionId: streamSpeakSession,
              playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
              preserveTurnPlaybackGeneration: true
            });
          if (isCurrentChatTurn(turnId) && state.chatBusy && !gotFirstDelta) {
            setStatus(isAuto ? "主动陪伴中..." : "思考中...");
          }
        }, 850);
      }
      clearThinkingMotionTimer();
      state.thinkingMotionTimer = window.setTimeout(() => {
        if (!isCurrentChatTurn(turnId) || !state.chatBusy || gotFirstDelta) {
          return;
        }
        enqueueActionIntent("thinking", { style: talkStyle, mood: initialMood, combo: false });
        publishPerformancePhase({
          turnId,
          phase: "thinking_wait",
          actionIntent: "thinking",
          actionStyle: talkStyle,
          actionMood: "thinking",
          motionCue: "thinking_nod",
          motionRole: "thinking_wait",
          combo: false,
          beats: 1,
          emphasis: 0.2,
          priority: 2,
          cooldownMs: 1200
        });
      }, 520);

      try {
        throwIfChatTurnCancelled(turnId, chatAbortController);
        let imageDataUrl = imageDataUrlOverride;
        if (!skipDesktopAttach && !imageDataUrl && shouldAttachDesktopImage(message, isAuto)) {
          setStatus("正在观察桌面...");
          imageDataUrl = await captureDesktopSnapshot();
          throwIfChatTurnCancelled(turnId, chatAbortController);
          setStatus(isAuto ? "主动陪伴中..." : "思考中...");
        }

        const pendingDeliveryReceiptIds = getPendingDeliveryReceiptIds();
        const payload = {
          message,
          history: (state.history || []).map((item) => ({
            role: item.role,
            content: item.content
          })),
          auto: isAuto,
          input_modality: inputModality,
          natural_participation: naturalParticipation,
          force_tools: forceTools,
          tools_optional: toolsOptional,
          client_capabilities: {
            delivered_turn_receipt_v1: true
          },
          pending_delivery_ids: (Array.isArray(pendingDeliveryReceiptIds)
            ? pendingDeliveryReceiptIds
            : []).slice(0, 8),
          _perf_trace_id: chatPerfTraceId,
          _perf_client_send_ts_ms: chatPerfStartWallMs
        };
        const interruptionContext = isAuto ? null : takeInterruptedAssistantContext();
        const asrContext = isAuto ? null : normalizeAsrConversationContext(opts.asrContext || opts.asr_context);
        const conversationContext = {};
        if (interruptionContext) {
          const replyPolicy = classifyBargeInReplyPolicy(message);
          interruptionContext.reply_policy = replyPolicy;
          if (state.turnManagerLastDecision && typeof state.turnManagerLastDecision === "object" && !Array.isArray(state.turnManagerLastDecision)) {
            state.turnManagerLastDecision.barge_in_kind = replyPolicy.kind;
            state.turnManagerLastDecision.next_reply_move = replyPolicy.reply_move;
            state.turnManagerLastDecision.next_reply_goal = replyPolicy.goal;
          }
          conversationContext.interruption = interruptionContext;
        }
        if (asrContext) {
          conversationContext.asr = asrContext;
        }
        const ambient = state.naturalConversationAmbient;
        const ambientTtlMs = Math.max(
          30000,
          Math.min(
            900000,
            Number(state.naturalConversation?.ambientContextTtlMs) || 180000
          )
        );
        if (
          (inputModality === "voice" || naturalParticipation)
          && state.naturalConversation?.enabled === true
          && state.naturalConversation?.rememberAmbientContext !== false
          && ambient
          && typeof ambient === "object"
          && Date.now() - Number(ambient.recorded_at || 0) <= ambientTtlMs
        ) {
          conversationContext.ambient = ambient;
        } else if (
          ambient
          && Date.now() - Number(ambient.recorded_at || 0) > ambientTtlMs
        ) {
          state.naturalConversationAmbient = null;
        }
        if (Object.keys(conversationContext).length) {
          payload.conversation_context = conversationContext;
        }
        if (isAuto && opts.autoKind) {
          payload.auto_kind = String(opts.autoKind || "").trim().slice(0, 40);
        }
        if (isAuto && opts.autoThoughtBurst && typeof opts.autoThoughtBurst === "object" && !Array.isArray(opts.autoThoughtBurst)) {
          payload.auto_thought_burst = opts.autoThoughtBurst;
        }
        if (imageDataUrl) {
          payload.image_data_url = imageDataUrl;
        }
        const characterExperienceProfile = getCharacterExperienceRequestProfile();
        if (characterExperienceProfile) {
          payload.character_experience_profile = characterExperienceProfile;
        }

        throwIfChatTurnCancelled(turnId, chatAbortController);
        assistantRow = appendMessage("assistant", "", {
          persist: false,
          hideTimestamp: true,
          continuation: !!interruptionContext || preservePriorSpeech
        });
        if (preservePriorSpeech) {
          assistantRow?.classList?.add?.("is-awaiting-speech");
        }
        state.activeAssistantMessageRow = assistantRow;
        const streamed = await streamAssistantReply(payload, (delta) => {
          if (isChatTurnCancelled(turnId, chatAbortController)) {
            return;
          }
          if (!gotFirstDelta) {
            gotFirstDelta = true;
            if (!chatPerfFirstDeltaPerfMs) {
              chatPerfFirstDeltaPerfMs = performance.now();
            }
            perfLog("chat", "first_text_render", {
              traceId: chatPerfTraceId,
              elapsedMs: Math.round(chatPerfFirstDeltaPerfMs - chatPerfStartPerfMs),
              fromApiHeadersMs: chatPerfApiHeaderPerfMs
                ? Math.round(chatPerfFirstDeltaPerfMs - chatPerfApiHeaderPerfMs)
                : -1
            });
            clearThinkingMotionTimer();
            clearPerformancePhase({ turnId, reason: "first_reply_delta" });
            if (latencyHintTimer) {
              clearTimeout(latencyHintTimer);
              latencyHintTimer = 0;
            }
          }
          reply += delta;
          const nextVisibleStreamReply = normalizeAssistantVisibleText(parseToolMetaFromText(reply).visibleText);
          const visibleDelta = nextVisibleStreamReply.startsWith(visibleStreamReply)
            ? nextVisibleStreamReply.slice(visibleStreamReply.length)
            : "";
          visibleStreamReply = nextVisibleStreamReply;
          state.activeAssistantDraftText = visibleStreamReply;
          setMessageText(assistantRow, visibleStreamReply, {
            enableTranslation: false,
            streamAppend: true
          });
          if (!companionSpeechPrewarm && waitForCompanionTurn && isCompanionSpeechPrewarmEligible()) {
            const prewarmText = extractStableCompanionSpeechPrefix(visibleStreamReply);
            const prewarmCue = performanceCueForStreamText(prewarmText);
            companionSpeechPrewarm = startCompanionSpeechPrewarm(visibleStreamReply, {
              turnId,
              sessionId: streamSpeakSession,
              playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
              traceId: chatPerfTraceId,
              chatSignal: chatAbortController?.signal || null,
              prosody: mergePerformanceCueProsody(
                buildSpeakProsody(
                  prewarmText,
                  detectMood(prewarmText),
                  false,
                  talkStyle
                ),
                prewarmCue
              ),
              performanceSignature: performanceCueSignature(prewarmCue)
            });
          }
          if (useStreamSpeak && !waitForCompanionTurn) {
            feedStreamSpeakDelta(visibleDelta, streamSpeakSession, talkStyle, {
              onPlaybackStart: handleStreamPlaybackStart,
              signal: chatAbortController?.signal || null,
              performanceCueForText: performanceCueForStreamText
            });
          }
          setStatus(isAuto ? "主动陪伴中..." : "思考中...");
        }, {
          onApiHeaders: ({ mode, status, atPerfMs }) => {
            chatPerfApiHeaderPerfMs = Number(atPerfMs) || performance.now();
            perfLog("chat", "api_headers", {
              traceId: chatPerfTraceId,
              mode: String(mode || ""),
              status: Number(status) || 0,
              elapsedMs: Math.round(chatPerfApiHeaderPerfMs - chatPerfStartPerfMs)
            });
          },
          onFirstDelta: ({ atPerfMs }) => {
            chatPerfFirstDeltaPerfMs = Number(atPerfMs) || performance.now();
          }
        }, {
          turnId,
          signal: chatAbortController?.signal || null,
          onDeliveryId: (deliveryId) => {
            deliveryIdForReply = String(deliveryId || "").trim();
          }
        });
        throwIfChatTurnCancelled(turnId, chatAbortController);
        if (streamed && streamed !== reply) {
          reply = streamed;
          visibleStreamReply = normalizeAssistantVisibleText(parseToolMetaFromText(reply).visibleText);
          state.activeAssistantDraftText = visibleStreamReply;
          setMessageText(assistantRow, visibleStreamReply, { enableTranslation: false });
        }
        const activeCompanionTurn = companionTurnForReply
          && companionTurnForReply.reply_text === reply
          && companionTurnForReply.spoken_text === reply
          ? companionTurnForReply
          : null;
        if (!activeCompanionTurn) {
          companionTurnForReply = null;
        }
        reply = reply.trim();
        const parsedReply = parseToolMetaFromText(reply);
        const visibleReply = normalizeAssistantVisibleText(parsedReply.visibleText);
        const naturalMode = String(conversationDecisionForReply?.mode || "reply");
        if (
          !visibleReply
          && ["silence", "micro_reaction", "defer"].includes(naturalMode)
        ) {
          clearThinkingMotionTimer();
          clearPerformanceTimelineTimers();
          if (assistantRow && !assistantRowFinalized) {
            try {
              assistantRow.remove();
            } catch (_) {
              // An absent transient row is already the desired result.
            }
          }
          if (state.activeAssistantMessageRow === assistantRow) {
            state.activeAssistantMessageRow = null;
          }
          const reaction = String(conversationDecisionForReply?.reaction || "");
          if (naturalMode === "micro_reaction" || naturalMode === "defer") {
            const actionIntent = reaction === "soft_ack" ? "listen" : "thinking";
            enqueueActionIntent(actionIntent, {
              text: userDisplayText,
              style: talkStyle,
              mood: reaction === "concerned" ? "sad" : "thinking",
              combo: false
            });
            publishPerformancePhase({
              turnId,
              phase: "quiet_reaction",
              actionIntent,
              actionStyle: talkStyle,
              actionMood: reaction === "concerned" ? "sad" : "thinking",
              motionCue: reaction === "soft_ack" ? "listen" : "thinking_nod",
              motionRole: "quiet_reaction",
              combo: false,
              beats: 1,
              emphasis: naturalMode === "defer" ? 0.24 : 0.16,
              priority: 2,
              cooldownMs: 1400
            });
          }
          if (!isAuto && state.naturalConversation?.rememberAmbientContext !== false) {
            const moodHint = initialMood && initialMood !== "idle"
              ? `The user sounded ${initialMood} while speaking casually.`
              : "The user made a casual voice remark that did not need an immediate answer.";
            state.naturalConversationAmbient = {
              version: 1,
              mode: naturalMode,
              summary: naturalMode === "defer"
                ? `${moodHint} Xinyu chose to keep listening and may connect it naturally later.`
                : moodHint,
              topic_hint: String(userDisplayText || "").replace(/\s+/g, " ").trim().slice(0, 80),
              reaction,
              recorded_at: Date.now()
            };
          }
          if (!isAuto) {
            queueConversationAwarenessAfterTurn({
              userText: userDisplayText,
              mode: naturalMode,
              reaction,
              mood: initialMood,
              talkStyle,
              brainSnapshot: state.characterBrainLastDecision,
              userTimestamp
            });
          }
          recordTTSDebugEvent("natural_conversation_no_reply", {
            mode: naturalMode,
            reaction,
            thinkingLevel: String(conversationDecisionForReply?.thinking_level || "normal"),
            thinkingDelayMs: Number(conversationDecisionForReply?.thinking_delay_ms || 0)
          });
          setStatus("待机");
          return true;
        }
        if (!visibleReply) {
          throw new Error("模型没有返回内容");
        }
        state.activeAssistantDraftText = visibleReply;
        const assistantTimestamp = Date.now();
        finalizePendingMessageRow(assistantRow, "assistant", visibleReply, {
          timestamp: assistantTimestamp,
          persist: true,
          deferStreamFlatten: preservePriorSpeech
        });
        assistantRowFinalized = true;
        if (state.activeAssistantMessageRow === assistantRow) {
          state.activeAssistantMessageRow = null;
        }
        if (deliveryIdForReply && !deliveryAcknowledged && isCurrentChatTurn(turnId)) {
          deliveryAcknowledged = true;
          if (deliveryAckQueue) {
            const queued = deliveryAckQueue.enqueue(deliveryIdForReply);
            if (!queued) {
              recordTTSDebugEvent("delivery_ack_not_confirmed", {
                traceId: chatPerfTraceId,
                result: "queue_rejected"
              });
            }
          } else {
            try {
              Promise.resolve(acknowledgeDeliveredTurn(deliveryIdForReply)).then((ok) => {
                if (ok !== true) {
                  recordTTSDebugEvent("delivery_ack_not_confirmed", {
                    traceId: chatPerfTraceId,
                    result: "not_confirmed"
                  });
                }
              }, () => {
                recordTTSDebugEvent("delivery_ack_not_confirmed", {
                  traceId: chatPerfTraceId,
                  result: "failed"
                });
              });
            } catch (_) {
              recordTTSDebugEvent("delivery_ack_not_confirmed", {
                traceId: chatPerfTraceId,
                result: "threw"
              });
            }
          }
        }
        perfLog("chat", "reply_ready", {
          traceId: chatPerfTraceId,
          elapsedMs: Math.round(performance.now() - chatPerfStartPerfMs),
          replyChars: visibleReply.length,
          apiToRenderMs: chatPerfApiHeaderPerfMs
            ? Math.round((chatPerfFirstDeltaPerfMs || performance.now()) - chatPerfApiHeaderPerfMs)
            : -1
        });
        if (rememberAssistant) {
          rememberMessage("assistant", visibleReply, { timestamp: assistantTimestamp });
        }
        state.conversationLastAssistantAt = assistantTimestamp;
        updateConversationFollowupState(visibleReply);
        const mood = detectMood(visibleReply);
        recordEmotion(mood);
        maybeSendAssistantMoodSticker({ mood, text: visibleReply, auto: isAuto });
        const baseTalkStyle = resolveTalkStyle(message, visibleReply, mood, isAuto);
        const replyCueCandidate = previewAssistantReplyCharacterCueCandidate({
          text: visibleReply,
          mood,
          style: baseTalkStyle,
          auto: isAuto,
          characterBrain: state.characterBrainLastDecision
        });
        const replyCueApply = maybeAutoApplyAssistantReplyCharacterCueCandidate(replyCueCandidate, {
          text: visibleReply,
          mood,
          style: baseTalkStyle,
          auto: isAuto,
          characterBrain: state.characterBrainLastDecision
        });
        const performanceMetadataForReply = activeCompanionTurn?.performance || characterRuntimeMetadataForReply;
        const performanceCue = buildPerformanceCue({
          replyText: visibleReply,
          mood,
          talkStyle: baseTalkStyle,
          runtimeMetadata: performanceMetadataForReply,
          performancePlan: activeCompanionTurn?.performance || null,
          replyCue: replyCueApply,
          characterBrain: state.characterBrainLastDecision,
          motionIntensity: state.motionIntensity
        });
        const runtimeVoiceStyle = normalizeRuntimeVoiceStyleForSpeech(
          performanceCue?.voiceStyle || performanceMetadataForReply?.voice_style
        );
        const finalTalkStyle = performanceCue?.talkStyle || resolveRuntimeTalkStyleForSpeech(
          runtimeVoiceStyle,
          replyCueApply?.speechStyle || baseTalkStyle
        );
        const finalProsodyStyle = runtimeVoiceStyle || performanceCue?.voiceStyle || replyCueApply?.voiceStyle || finalTalkStyle;
        const timelineMood = performanceCue?.live2dMood || mood;
        state.currentTalkStyle = finalTalkStyle;
        state.speechAnimMood = timelineMood;
        const useSilentPerformanceCue = state.speakingEnabled === false;
        state.speechCueSilentPerformance = useSilentPerformanceCue;
        if (useSilentPerformanceCue) {
          applySpeechPerformanceCue(performanceCue);
          triggerPerformanceCueMotion(performanceCue, {
            source: "text_reply",
            sessionId: streamSpeakSession,
            allowSilentPerformanceCue: true
          });
        }
        const performanceTimeline = buildPerformanceTimeline({
          brainSnapshot: state.characterBrainLastDecision,
          runtimeMetadata: performanceMetadataForReply,
          replyText: visibleReply,
          mood: timelineMood,
          talkStyle: finalTalkStyle,
          performanceCue,
          ttsEnabled: state.speakingEnabled !== false
        });
        const performanceTimelineSummary = rememberPerformanceTimeline(performanceTimeline);
        const voiceTimeline = buildVoiceTimeline({
          brainSnapshot: state.characterBrainLastDecision,
          runtimeMetadata: performanceMetadataForReply,
          replyText: visibleReply,
          mood: timelineMood,
          talkStyle: finalTalkStyle,
          performanceCue,
          ttsProvider: state.ttsProvider,
          ttsEnabled: state.speakingEnabled !== false
        });
        const voiceTimelineSummary = rememberVoiceTimeline(voiceTimeline);
        if (performanceTimelineSummary || voiceTimelineSummary) {
          startPerformanceAudit({
            traceId: chatPerfTraceId,
            sessionId: streamSpeakSession,
            brainSnapshot: state.characterBrainLastDecision,
            timelineSummary: performanceTimelineSummary,
            voiceSummary: voiceTimelineSummary,
            earlyReactionSummary: earlyPreReactionSummary
          });
          if (performanceCue) {
            recordPerformanceAuditEvent("performance_cue", {
              source: performanceCue.source,
              emotion: performanceCue.emotion,
              live2dMood: performanceCue.live2dMood,
              action: performanceCue.action,
              intensity: performanceCue.intensity,
              talkStyle: performanceCue.talkStyle,
              voiceStyle: performanceCue.voiceStyle,
              motionStrength: performanceCue.speech?.motionStrength
            });
          }
          if (voiceTimelineSummary) {
            recordPerformanceAuditEvent("voice_plan", {
              delivery: voiceTimelineSummary.delivery,
              pace: voiceTimelineSummary.pace,
              segments: voiceTimelineSummary.segments,
              fallback_reason: voiceTimelineSummary.fallback_reason
            });
          }
          persistCharacterBrainSnapshot();
        }
        const timelineContext = {
          text: visibleReply,
          mood: timelineMood,
          style: finalTalkStyle,
          performanceCue,
          sessionId: streamSpeakSession,
          traceId: chatPerfTraceId
        };
        let timelineSpeechStarted = false;
        let timelinePostSettled = false;
        const runTimelineSpeechStart = () => {
          if (timelineSpeechStarted) {
            return false;
          }
          clearPerformancePhase({ turnId, reason: "speech_started" });
          if (!performanceTimeline) {
            return false;
          }
          timelineSpeechStarted = true;
          executePerformanceTimelinePhase(performanceTimeline, "speechStart", timelineContext);
          schedulePerformanceTimelineSpeechBeats(performanceTimeline, timelineContext);
          return true;
        };
        const runTimelinePostSettle = (delayOverrideMs = null) => {
          if (!performanceTimeline || timelinePostSettled) {
            return false;
          }
          timelinePostSettled = true;
          if (delayOverrideMs != null && performanceTimeline.postSettle && typeof performanceTimeline.postSettle === "object") {
            executePerformanceTimelinePhase({
              ...performanceTimeline,
              postSettle: {
                ...performanceTimeline.postSettle,
                delayMs: Math.max(0, Number(delayOverrideMs) || 0)
              }
            }, "postSettle", timelineContext);
            return true;
          }
          executePerformanceTimelinePhase(performanceTimeline, "postSettle", timelineContext);
          return true;
        };
        if (performanceTimeline) {
          executePerformanceTimelinePhase(performanceTimeline, "preReaction", timelineContext);
        } else if (state.motionQuietDuringSpeech && state.speakingEnabled) {
          triggerExpressionPulse(finalTalkStyle, 0.4, 220);
        } else if (shouldSuppressGenericReplyMotion(performanceMetadataForReply)) {
          triggerExpressionPulse(finalTalkStyle, 0.28, 180);
        } else {
          enqueueActionIntent("reply", { text: visibleReply, style: finalTalkStyle, mood, combo: true });
        }
        if (useStreamSpeak && !waitForCompanionTurn) {
          let streamSpeechPerformanceStarted = false;
          const startStreamSpeechPerformance = (event = {}) => {
            const eventPlaybackGeneration = Number(event.playbackGeneration || streamPlaybackGeneration);
            const browserFallbackPlayback = String(event?.source || "") === "browser_tts";
            if (
              streamSpeechPerformanceStarted
              || !isCurrentStreamPlayback()
              || Number(state.streamSpeakSession || 0) !== Number(streamSpeakSession || 0)
              || Number(state.ttsPlaybackGeneration || 0) !== eventPlaybackGeneration
              || (!browserFallbackPlayback && eventPlaybackGeneration !== streamPlaybackGeneration)
            ) {
              return false;
            }
            streamSpeechPerformanceStarted = true;
            recordPerformanceAuditEvent("tts_start", {
              mode: "stream",
              source: String(event?.source || "server_tts")
            });
            runTimelineSpeechStart();
            const streamSpeechPlan = activateAssistantSpeechPlan(
              buildAssistantSpeechPlan(visibleReply, voiceTimeline, state.characterBrainLastDecision)
            );
            if (streamSpeechPlan?.segments?.length) {
              setActiveAssistantSpeechSegment(1, streamSpeechPlan.segments[0].text);
            }
            runTimelinePostSettle(Math.min(9000, Math.max(900, visibleReply.length * 48 + 420)));
            return true;
          };
          const startStreamFallbackPerformance = (event = {}) => {
            const started = startStreamSpeechPerformance(event);
            if (started && !performanceTimeline) {
              maybePlayTalkGesture(buildStableSpeakText(visibleReply) || visibleReply, finalTalkStyle);
            }
            return started;
          };
          streamPlaybackTimelineHandler = startStreamSpeechPerformance;
          if (streamActualPlaybackEvent) {
            const streamTimelineAttachLagMs = Math.max(
              0,
              performance.now() - Number(streamActualPlaybackEvent.startedAtPerfMs || 0)
            );
            if (streamTimelineAttachLagMs <= 160) {
              startStreamSpeechPerformance(streamActualPlaybackEvent);
            } else {
              // A semantic plan assembled after this audio has been visibly
              // underway must not retroactively trigger a new "speech start"
              // pose. The already-running audio keeps its real-time gesture;
              // the final plan attaches to the next actual segment instead.
              recordPerformanceAuditEvent("stream_timeline_wait_next_audio", {
                lag_ms: Math.round(streamTimelineAttachLagMs),
                source: String(streamActualPlaybackEvent.source || "server_tts")
              });
            }
          }
          flushStreamSpeak(streamSpeakSession, finalTalkStyle, {
            onPlaybackStart: handleStreamPlaybackStart,
            signal: chatAbortController?.signal || null,
            performanceCueForText: performanceCueForStreamText
          });
          const hadStreamSegments = state.streamSpeakLastEnqueueSession === streamSpeakSession;
          if (hadStreamSegments && state.streamSpeakPlayedSession === streamSpeakSession) {
            recordPerformanceAuditEvent("tts_handoff", { mode: "stream_playing", ok: true });
            streamSpeechSettlement = scheduleFinalSpeechWatchdog({
              sessionId: streamSpeakSession,
              text: visibleReply,
              mood: timelineMood,
              style: finalTalkStyle,
              traceId: chatPerfTraceId,
              onPlaybackStart: startStreamFallbackPerformance,
              preserveTurnPlaybackGeneration: true,
              signal: chatAbortController?.signal || null
            });
          } else if (!hadStreamSegments || !state.streamSpeakWorking) {
            const speechText = buildStableSpeakText(visibleReply) || visibleReply;
            const discardedSegments = discardQueuedStreamSpeakItems(streamSpeakSession);
            recordTTSDebugEvent("final_direct_tts", {
              traceId: chatPerfTraceId,
              sessionId: streamSpeakSession,
              text: speechText || visibleReply,
              result: hadStreamSegments ? "no_stream_playback_yet" : "no_stream_segments",
              blobBytes: discardedSegments
            });
            await speakWithVoiceTimeline(speechText || visibleReply, {
              voiceTimeline,
              mode: "stream_direct_fallback",
              interrupt: true,
              mood,
              talkStyle: finalTalkStyle,
              prosodyStyle: finalProsodyStyle,
              traceId: chatPerfTraceId,
              performanceCue: performanceCue || null,
              performanceCueForText: performanceCueForStreamText,
              sessionId: streamSpeakSession,
              playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
              preserveTurnPlaybackGeneration: true,
              signal: chatAbortController?.signal || null,
              onPlaybackStart: startStreamFallbackPerformance
            });
            throwIfChatTurnCancelled(turnId, chatAbortController);
          } else {
            recordPerformanceAuditEvent("tts_handoff", { mode: "stream_working", ok: true });
            streamSpeechSettlement = scheduleFinalSpeechWatchdog({
              sessionId: streamSpeakSession,
              text: visibleReply,
              mood: timelineMood,
              style: finalTalkStyle,
              traceId: chatPerfTraceId,
              onPlaybackStart: startStreamFallbackPerformance,
              preserveTurnPlaybackGeneration: true,
              signal: chatAbortController?.signal || null
            });
          }
        } else {
          const speechText = activeCompanionTurn?.spoken_text || buildStableSpeakText(visibleReply) || visibleReply;
          if (preservePriorSpeech) {
            const priorSpeechFinished = await waitForSpeechTurnIdle(45000);
            throwIfChatTurnCancelled(turnId, chatAbortController);
            if (!priorSpeechFinished && isAssistantSpeechActive()) {
              recordTTSDebugEvent("ordered_continuation_wait_timeout", {
                traceId: chatPerfTraceId,
                sessionId: streamSpeakSession,
                result: "forced_handoff"
              });
              stopAllAudioPlayback();
            }
            const breathStartedAt = performance.now();
            const breathCompleted = await waitOrderedContinuationBreath(
              visibleReply,
              finalTalkStyle,
              chatAbortController?.signal || null
            );
            throwIfChatTurnCancelled(turnId, chatAbortController);
            if (!breathCompleted) {
              throw makeChatTurnInterruptedError();
            }
            recordTTSDebugEvent("ordered_continuation_breath", {
              traceId: chatPerfTraceId,
              sessionId: streamSpeakSession,
              waitMs: Math.round(performance.now() - breathStartedAt),
              style: finalTalkStyle
            });
            state.streamSpeakSession = streamSpeakSession;
            state.streamSpeakQueue = [];
            state.streamSpeakBuffer = "";
            state.streamSpeakLastEnqueueSession = 0;
            state.streamSpeakDelivery = null;
          }
          const confirmedPrewarm = await takeConfirmedCompanionSpeechPrewarm(companionSpeechPrewarm, {
            hasCanonicalTurn: !!activeCompanionTurn,
            speechText,
            turnId,
            sessionId: streamSpeakSession,
            playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
            performanceSignature: performanceCueSignature(performanceCueForStreamText(
              extractStableCompanionSpeechPrefix(speechText)
            ))
          });
          throwIfChatTurnCancelled(turnId, chatAbortController);
          const directPlaybackGeneration = Number(state.ttsPlaybackGeneration || 0);
          let directSpeechPerformanceStarted = false;
          let orderedContinuationRevealStarted = false;
          let orderedContinuationVisibleChars = 0;
          const revealOrderedContinuationProgress = (event = {}) => {
            if (
              !preservePriorSpeech
              || !orderedContinuationRevealStarted
              || !isCurrentChatTurn(turnId)
              || Number(state.streamSpeakSession || 0) !== Number(streamSpeakSession || 0)
            ) {
              return;
            }
            const spokenSegment = String(event.text || "").trim();
            const durationMs = Math.max(1, Number(event.durationMs) || 0);
            if (!spokenSegment || durationMs <= 1) return;
            const leadMs = 350;
            const ratio = Math.max(0, Math.min(1, (Number(event.elapsedMs || 0) + leadMs) / durationMs));
            let segmentStart = visibleReply.indexOf(spokenSegment, Math.max(0, orderedContinuationVisibleChars - 2));
            if (segmentStart < 0) {
              segmentStart = Math.min(visibleReply.length, orderedContinuationVisibleChars);
            }
            const desiredChars = Math.min(
              visibleReply.length,
              segmentStart + Math.max(1, Math.ceil(spokenSegment.length * ratio))
            );
            if (desiredChars <= orderedContinuationVisibleChars) return;
            orderedContinuationVisibleChars = desiredChars;
            const revealedText = visibleReply.slice(0, desiredChars);
            state.activeAssistantDraftText = revealedText;
            setMessageText(assistantRow, revealedText, {
              enableTranslation: false,
              streamAppend: true
            });
          };
          const startDirectSpeechPerformance = (event = {}) => {
            const textOnlyDelivery = String(event?.source || "") === "text_reply";
            const eventPlaybackGeneration = Number(event.playbackGeneration || directPlaybackGeneration);
            if (
              directSpeechPerformanceStarted
              || !isCurrentChatTurn(turnId)
              || Number(state.streamSpeakSession || 0) !== Number(streamSpeakSession || 0)
              || (!textOnlyDelivery && (
                Number(state.ttsPlaybackGeneration || 0) !== directPlaybackGeneration
                || eventPlaybackGeneration !== directPlaybackGeneration
              ))
            ) {
              return false;
            }
            directSpeechPerformanceStarted = true;
            if (preservePriorSpeech && !orderedContinuationRevealStarted) {
              orderedContinuationRevealStarted = true;
              assistantRow?.classList?.remove?.("is-awaiting-speech");
              setMessageText(assistantRow, "", { enableTranslation: false });
              revealOrderedContinuationProgress(event);
            }
            runTimelineSpeechStart();
            if (!performanceTimeline && !textOnlyDelivery) {
              maybePlayTalkGesture(confirmedPrewarm?.prefix || speechText || visibleReply, finalTalkStyle);
            }
            return true;
          };
          if (useSilentPerformanceCue) {
            startDirectSpeechPerformance({
              source: "text_reply",
              playbackGeneration: directPlaybackGeneration
            });
          } else if (confirmedPrewarm) {
            const prefixOk = await playAudioBlob(confirmedPrewarm.blob, {
              interrupt: false,
              text: confirmedPrewarm.prefix,
              mood,
              style: finalTalkStyle,
              perfTraceId: chatPerfTraceId,
              perfBlobReadyPerfMs: performance.now(),
              perfSpeakStartedPerfMs: confirmedPrewarm.startedPerfMs,
              playbackGeneration: directPlaybackGeneration,
              sessionId: streamSpeakSession,
              segmentId: 1,
              performanceCue: performanceCueForStreamText(confirmedPrewarm.prefix) || performanceCue || null,
              onPlaybackStart: (event) => {
                recordPerformanceAuditEvent("tts_start", {
                  mode: "companion_turn_prewarm",
                  source: String(event?.source || "server_tts")
                });
                startDirectSpeechPerformance(event);
              },
              onPlaybackProgress: revealOrderedContinuationProgress
            });
            recordPerformanceAuditEvent("tts_segment", {
              mode: "companion_turn_prewarm",
              index: 1,
              segments: confirmedPrewarm.tail ? 2 : 1,
              ok: prefixOk !== false,
              prewarm: true
            });
            if (prefixOk !== false && confirmedPrewarm.tail) {
              await speakWithVoiceTimeline(confirmedPrewarm.tail, {
                voiceTimeline: null,
                mode: "companion_turn_prewarm_tail",
                interrupt: false,
                mood,
                talkStyle: finalTalkStyle,
                prosodyStyle: finalProsodyStyle,
                traceId: chatPerfTraceId,
                performanceCue: null,
                performanceCueForText: performanceCueForStreamText,
                sessionId: streamSpeakSession,
                playbackGeneration: directPlaybackGeneration,
                preserveTurnPlaybackGeneration: true,
                signal: chatAbortController?.signal || null,
                onPlaybackStart: startDirectSpeechPerformance,
                onPlaybackProgress: revealOrderedContinuationProgress
              });
            }
            recordPerformanceAuditEvent("tts_end", {
              mode: "companion_turn_prewarm",
              ok: prefixOk !== false,
              prewarm: true
            });
          } else {
            await speakWithVoiceTimeline(speechText || visibleReply, {
              voiceTimeline,
              mode: activeCompanionTurn ? "companion_turn_final" : "direct",
              interrupt: false,
              mood,
              talkStyle: finalTalkStyle,
              prosodyStyle: finalProsodyStyle,
              traceId: chatPerfTraceId,
              performanceCue: performanceCue || null,
              performanceCueForText: performanceCueForStreamText,
              sessionId: streamSpeakSession,
              playbackGeneration: directPlaybackGeneration,
              preserveTurnPlaybackGeneration: true,
              signal: chatAbortController?.signal || null,
              onPlaybackStart: startDirectSpeechPerformance,
              onPlaybackProgress: revealOrderedContinuationProgress
            });
          }
          // Text-only replies are already visibly delivered. Give the same
          // low-interruption follow-up timer a reliable delivery endpoint as
          // browser/server TTS, without treating a queued or cancelled turn as
          // the newest assistant response.
          if (useSilentPerformanceCue && isCurrentChatTurn(turnId)) {
            state.conversationLastTtsFinishedAt = Date.now();
          }
          if (preservePriorSpeech && orderedContinuationRevealStarted) {
            state.activeAssistantDraftText = visibleReply;
            setMessageText(assistantRow, visibleReply, { enableTranslation: true });
          }
          throwIfChatTurnCancelled(turnId, chatAbortController);
          if (directSpeechPerformanceStarted || useSilentPerformanceCue) {
            runTimelinePostSettle();
          }
        }
        throwIfChatTurnCancelled(turnId, chatAbortController);
        finishPerformanceAudit({ status: "reply_done", lastEvent: "reply_done" });
        if (!isAuto) {
          scheduleAutoChatInterjectionAfterTurn({
            userText: userDisplayText,
            assistantText: visibleReply,
            mood,
            talkStyle: finalTalkStyle,
            brainSnapshot: state.characterBrainLastDecision,
            userTimestamp,
            assistantTimestamp
          });
        }
        setStatus("待机");
        return true;
      } catch (err) {
        const interrupted = isChatTurnCancelled(turnId, chatAbortController, err);
        if (interrupted) {
          perfLog("chat", "interrupted", {
            traceId: chatPerfTraceId,
            elapsedMs: Math.round(performance.now() - chatPerfStartPerfMs),
            error: String(err?.message || err || "")
          });
          if (latencyHintTimer) {
            clearTimeout(latencyHintTimer);
            latencyHintTimer = 0;
          }
          if (streamSpeakSession === state.streamSpeakSession) {
            state.streamSpeakQueue = [];
            state.streamSpeakBuffer = "";
            state.streamSpeakDelivery = null;
          }
          if (isCurrentChatTurn(turnId)) {
            clearThinkingMotionTimer();
            clearPerformanceTimelineTimers();
            finishPerformanceAudit({ status: "interrupted", lastEvent: "interrupted" });
          }
          if (
            assistantRow
            && !assistantRowFinalized
            && assistantRow.dataset?.interruptionFinalized !== "true"
          ) {
            try {
              assistantRow.remove();
            } catch (_) {
              // ignore
            }
          }
          return false;
        }
        perfLog("chat", "fail", {
          traceId: chatPerfTraceId,
          elapsedMs: Math.round(performance.now() - chatPerfStartPerfMs),
          error: String(err?.message || err || "")
        });
        clearThinkingMotionTimer();
        clearPerformanceTimelineTimers();
        recordPerformanceAuditEvent("failure", { ok: false });
        finishPerformanceAudit({ status: "failed", lastEvent: "failure" });
        if (latencyHintTimer) {
          clearTimeout(latencyHintTimer);
          latencyHintTimer = 0;
        }
        if (streamSpeakSession === state.streamSpeakSession) {
          state.streamSpeakQueue = [];
          state.streamSpeakBuffer = "";
          state.streamSpeakDelivery = null;
        }
        if (assistantRow && !assistantRowFinalized && !reply) {
          try {
            assistantRow.remove();
          } catch (_) {
            // ignore
          }
        }
        if (!silentError) {
          const msg = buildChatFailureDoctorHint(err);
          appendMessage("assistant", msg, { category: "system", persist: false, enableFeedback: false });
        }
        setStatus("请求失败");
        return false;
      } finally {
        if (companionSpeechPrewarm && companionSpeechPrewarm.consumed !== true) {
          abortCompanionSpeechPrewarm(companionSpeechPrewarm, "turn_finished");
        }
        perfLog("chat", "done", {
          traceId: chatPerfTraceId,
          elapsedMs: Math.round(performance.now() - chatPerfStartPerfMs)
        });
        if (latencyHintTimer) {
          clearTimeout(latencyHintTimer);
          latencyHintTimer = 0;
        }
        const deferMicPauseRelease = micPauseLeaseHeld
          && streamSpeechSettlement
          && typeof streamSpeechSettlement.then === "function";
        if (deferMicPauseRelease) {
          Promise.resolve(streamSpeechSettlement).then(
            () => releaseMicPauseLease(),
            () => releaseMicPauseLease()
          ).then(() => {
            if (state.chatAbortController === chatAbortController && state.chatBusy !== true) {
              state.chatAbortController = null;
            }
          });
        } else {
          releaseMicPauseLease();
        }
        if (isCurrentChatTurn(turnId)) {
          clearPerformancePhase({ turnId, reason: "chat_turn_finished" });
          state.activePerfTraceId = "";
          state.activeAssistantDraftText = "";
          state.activeAssistantUserText = "";
          state.activeAssistantTurnStartedAt = 0;
          if (state.activeAssistantMessageRow === assistantRow) {
            state.activeAssistantMessageRow = null;
          }
          if (!isAssistantSpeechActive()) {
            clearAssistantSpeechPlan();
          }
          resetProtectedInterruptionState();
          clearThinkingMotionTimer();
          if (!deferMicPauseRelease && state.chatAbortController === chatAbortController) {
            state.chatAbortController = null;
          }
          state.activeChatTurnId = 0;
          state.chatBusy = false;
          if (!state.micOpen) {
            scheduleWakeWordStart(360);
          }
          updateMicButton();
        } else if (!deferMicPauseRelease && state.chatAbortController === chatAbortController) {
          state.chatAbortController = null;
        }
      }
    }

    async function sendChat() {
      const rawText = ui.chatInput.value.trim();
      const pending = Array.isArray(state.pendingAttachments) ? state.pendingAttachments.slice() : [];
      if (!rawText && !pending.length) {
        return;
      }
      ui.chatInput.value = "";
      const text = rawText || "请帮我看看我发的附件。";
      const singingSong = window.TaffySinging?.matchSong?.(text);
      if (singingSong && !pending.length) {
        appendMessage("user", text, { enableTranslation: false });
        appendMessage("assistant", `好呀，我来唱《${singingSong.title}》。`, { enableTranslation: false });
        await window.TaffySinging.performSong(singingSong.id, singingSong.title);
        return;
      }
      const consumed = await handleLocalCommand(text);
      if (consumed) {
        setStatus("待机");
        return;
      }
      let modelText = text;
      let displayText = text;
      let imageDataUrlOverride = "";
      if (pending.length) {
        const ctx = buildAttachmentContextText(pending);
        if (ctx) {
          modelText = `${text}\n\n${ctx}`;
        }
        displayText = `${text}${buildAttachmentDisplaySuffix(pending)}`;
        const firstImage = pending.find((item) => item?.kind === "image" && typeof item?.dataUrl === "string");
        if (firstImage?.dataUrl) {
          imageDataUrlOverride = String(firstImage.dataUrl || "");
        }
      }
      const ok = await requestAssistantReply(modelText, {
        showUser: true,
        rememberUser: true,
        auto: false,
        silentError: false,
        userDisplayText: displayText,
        rememberContent: displayText,
        imageDataUrlOverride
      });
      if (ok && pending.length) {
        clearPendingAttachments();
        if (ui.attachInput) {
          ui.attachInput.value = "";
        }
      }
    }

    return {
      streamAssistantReply,
      requestAssistantReply,
      interruptActiveChatTurn,
      handleUserSpeechStart,
      shouldProtectImportantAssistantSpeech,
      buildAssistantSpeechPlan,
      buildInterruptionArbitration,
      takeInterruptedAssistantContext,
      sendChat
    };
  }

  const api = { createController };
  root.TaffyChatReplyController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
