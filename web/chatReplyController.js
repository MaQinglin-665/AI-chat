(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const window = deps.windowObject || root;
    const performance = deps.performanceObject || window.performance || root.performance || { now: () => Date.now() };
    const authFetch = typeof deps.authFetch === "function" ? deps.authFetch : async () => { throw new Error("authFetch is not available"); };
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
    const shouldPlayLatencyHint = typeof deps.shouldPlayLatencyHint === "function" ? deps.shouldPlayLatencyHint : () => false;
    const pickLatencyHintText = typeof deps.pickLatencyHintText === "function" ? deps.pickLatencyHintText : () => "";
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;
    const clearThinkingMotionTimer = typeof deps.clearThinkingMotionTimer === "function" ? deps.clearThinkingMotionTimer : () => {};
    const shouldAttachDesktopImage = typeof deps.shouldAttachDesktopImage === "function" ? deps.shouldAttachDesktopImage : () => false;
    const captureDesktopSnapshot = typeof deps.captureDesktopSnapshot === "function" ? deps.captureDesktopSnapshot : async () => "";
    const parseToolMetaFromText = typeof deps.parseToolMetaFromText === "function" ? deps.parseToolMetaFromText : (text) => ({ visibleText: String(text || ""), meta: [] });
    const setMessageText = typeof deps.setMessageText === "function" ? deps.setMessageText : () => {};
    const feedStreamSpeakDelta = typeof deps.feedStreamSpeakDelta === "function" ? deps.feedStreamSpeakDelta : () => {};
    const normalizeAssistantVisibleText = typeof deps.normalizeAssistantVisibleText === "function" ? deps.normalizeAssistantVisibleText : (text) => String(text || "").trim();
    const finalizePendingMessageRow = typeof deps.finalizePendingMessageRow === "function" ? deps.finalizePendingMessageRow : () => {};
    const updateConversationFollowupState = typeof deps.updateConversationFollowupState === "function" ? deps.updateConversationFollowupState : () => {};
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

    function rememberCharacterRuntimeMetadataForReply(metadata) {
      const normalized = handleCharacterRuntimeMetadata(metadata);
      if (normalized && typeof normalized === "object" && !Array.isArray(normalized)) {
        characterRuntimeMetadataForReply = normalized;
      } else if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        characterRuntimeMetadataForReply = metadata;
      }
      return normalized;
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

    async function streamAssistantReply(payload, onDelta, perfHooks = null) {
      const chatApi = window.TaffyModules?.chatApi || {};
      if (typeof chatApi.streamAssistantReply !== "function") {
        throw new Error("chatApi stream helper is not available");
      }
      return chatApi.streamAssistantReply(payload, onDelta, {
        authFetch,
        onCharacterRuntimeMetadata: rememberCharacterRuntimeMetadataForReply,
        onCharacterBrainDecision: handleCharacterBrainDecision,
        preferStream: state.conversationMode.chatStreamEnabled !== false,
        perfHooks,
        perfLog,
        now: () => performance.now()
      });
    }

    async function requestAssistantReply(text, opts = {}) {
      const message = String(text || "").trim();
      if (!message || state.chatBusy) {
        return false;
      }
      const userDisplayText = String(opts.userDisplayText || message).trim() || message;
      const rememberContent = String(opts.rememberContent || message).trim() || message;
      const imageDataUrlOverride = typeof opts.imageDataUrlOverride === "string"
        ? String(opts.imageDataUrlOverride || "").trim()
        : "";

      const showUser = opts.showUser !== false;
      const rememberUser = opts.rememberUser !== false;
      const rememberAssistant = opts.rememberAssistant !== false;
      const silentError = !!opts.silentError;
      const isAuto = !!opts.auto;
      const skipDesktopAttach = opts.skipDesktopAttach === true;
      const forceTools = opts.forceTools === true;
      characterRuntimeMetadataForReply = null;
      const chatPerfTraceId = createPerfTraceId("chat");
      const chatPerfStartPerfMs = performance.now();
      const chatPerfStartWallMs = Date.now();
      let chatPerfApiHeaderPerfMs = 0;
      let chatPerfFirstDeltaPerfMs = 0;
      state.activePerfTraceId = chatPerfTraceId;
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
      enqueueActionIntent("listen", { text: userDisplayText, style: talkStyle, mood: initialMood });

      state.chatBusy = true;
      stopWakeWordListener(true);
      pauseMicForAssistant();
      setStatus(isAuto ? "自动对话中..." : "思考中...");
      let assistantRow = null;
      let reply = "";
      let visibleStreamReply = "";
      let gotFirstDelta = false;
      let latencyHintTimer = 0;
      const streamSpeakSession = Date.now();
      const useStreamSpeak = shouldUseStreamSpeak();
      stopAllAudioPlayback();
      state.streamSpeakSession = streamSpeakSession;
      state.streamSpeakQueue = [];
      state.streamSpeakBuffer = "";
      state.streamSpeakLastEnqueueSession = 0;
      if (shouldPlayLatencyHint(isAuto, useStreamSpeak)) {
        latencyHintTimer = window.setTimeout(async () => {
          if (!state.chatBusy || gotFirstDelta) {
            return;
          }
          if (streamSpeakSession !== state.streamSpeakSession) {
            return;
          }
          const hint = pickLatencyHintText();
          const prosody = buildSpeakProsody(hint, "idle", false, talkStyle);
            await speak(hint, { force: true, interrupt: true, prosody });
          if (state.chatBusy && !gotFirstDelta) {
            setStatus(isAuto ? "自动对话中..." : "思考中...");
          }
        }, 850);
      }
      clearThinkingMotionTimer();
      state.thinkingMotionTimer = window.setTimeout(() => {
        if (!state.chatBusy || gotFirstDelta) {
          return;
        }
        enqueueActionIntent("thinking", { style: talkStyle, mood: initialMood, combo: false });
      }, 520);

      try {
        let imageDataUrl = imageDataUrlOverride;
        if (!skipDesktopAttach && !imageDataUrl && shouldAttachDesktopImage(message, isAuto)) {
          setStatus("正在观察桌面...");
          imageDataUrl = await captureDesktopSnapshot();
          setStatus(isAuto ? "自动对话中..." : "思考中...");
        }

        const payload = {
          message,
          history: (state.history || []).map((item) => ({
            role: item.role,
            content: item.content
          })),
          auto: isAuto,
          force_tools: forceTools,
          _perf_trace_id: chatPerfTraceId,
          _perf_client_send_ts_ms: chatPerfStartWallMs
        };
        if (imageDataUrl) {
          payload.image_data_url = imageDataUrl;
        }
        const characterExperienceProfile = getCharacterExperienceRequestProfile();
        if (characterExperienceProfile) {
          payload.character_experience_profile = characterExperienceProfile;
        }

        assistantRow = appendMessage("assistant", "", {
          persist: false,
          hideTimestamp: true
        });
        const streamed = await streamAssistantReply(payload, (delta) => {
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
            if (latencyHintTimer) {
              clearTimeout(latencyHintTimer);
              latencyHintTimer = 0;
            }
          }
          reply += delta;
          const nextVisibleStreamReply = parseToolMetaFromText(reply).visibleText;
          const visibleDelta = nextVisibleStreamReply.startsWith(visibleStreamReply)
            ? nextVisibleStreamReply.slice(visibleStreamReply.length)
            : "";
          visibleStreamReply = nextVisibleStreamReply;
          setMessageText(assistantRow, visibleStreamReply, { enableTranslation: false });
          if (useStreamSpeak) {
            feedStreamSpeakDelta(visibleDelta, streamSpeakSession, talkStyle);
          }
          setStatus(isAuto ? "自动对话中..." : "思考中...");
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
        });
        if (streamed && streamed !== reply) {
          reply = streamed;
          visibleStreamReply = parseToolMetaFromText(reply).visibleText;
          setMessageText(assistantRow, visibleStreamReply, { enableTranslation: false });
        }
        reply = reply.trim();
        const parsedReply = parseToolMetaFromText(reply);
        const visibleReply = normalizeAssistantVisibleText(parsedReply.visibleText);
        if (!visibleReply) {
          throw new Error("模型没有返回内容");
        }
        const assistantTimestamp = Date.now();
        finalizePendingMessageRow(assistantRow, "assistant", visibleReply, {
          timestamp: assistantTimestamp,
          persist: true
        });
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
        const baseTalkStyle = resolveTalkStyle(message, visibleReply, mood, isAuto);
        const replyCueCandidate = previewAssistantReplyCharacterCueCandidate({
          text: visibleReply,
          mood,
          style: baseTalkStyle,
          auto: isAuto
        });
        const replyCueApply = maybeAutoApplyAssistantReplyCharacterCueCandidate(replyCueCandidate, {
          text: visibleReply,
          mood,
          style: baseTalkStyle,
          auto: isAuto
        });
        const runtimeVoiceStyle = normalizeRuntimeVoiceStyleForSpeech(characterRuntimeMetadataForReply?.voice_style);
        const finalTalkStyle = resolveRuntimeTalkStyleForSpeech(
          runtimeVoiceStyle,
          replyCueApply?.speechStyle || baseTalkStyle
        );
        const finalProsodyStyle = runtimeVoiceStyle || replyCueApply?.voiceStyle || finalTalkStyle;
        state.currentTalkStyle = finalTalkStyle;
        state.speechAnimMood = mood;
        if (state.motionQuietDuringSpeech && state.speakingEnabled) {
          triggerExpressionPulse(finalTalkStyle, 0.4, 220);
        } else if (shouldSuppressGenericReplyMotion(characterRuntimeMetadataForReply)) {
          triggerExpressionPulse(finalTalkStyle, 0.28, 180);
        } else {
          enqueueActionIntent("reply", { text: visibleReply, style: finalTalkStyle, mood, combo: true });
        }
        if (useStreamSpeak) {
          flushStreamSpeak(streamSpeakSession, finalTalkStyle);
          const hadStreamSegments = state.streamSpeakLastEnqueueSession === streamSpeakSession;
          if (hadStreamSegments && state.streamSpeakPlayedSession === streamSpeakSession) {
            scheduleFinalSpeechWatchdog({
              sessionId: streamSpeakSession,
              text: visibleReply,
              mood,
              style: finalTalkStyle,
              traceId: chatPerfTraceId
            });
          } else if (!hadStreamSegments || !state.streamSpeakWorking) {
            const speechText = buildStableSpeakText(visibleReply) || visibleReply;
            const prosody = buildSpeakProsody(speechText || visibleReply, mood, false, finalProsodyStyle);
            maybePlayTalkGesture(speechText || visibleReply, finalTalkStyle);
            const discardedSegments = discardQueuedStreamSpeakItems(streamSpeakSession);
            recordTTSDebugEvent("final_direct_tts", {
              traceId: chatPerfTraceId,
              sessionId: streamSpeakSession,
              text: speechText || visibleReply,
              result: hadStreamSegments ? "no_stream_playback_yet" : "no_stream_segments",
              blobBytes: discardedSegments
            });
            await speak(speechText || visibleReply, {
              prosody,
              interrupt: true,
              mood,
              style: finalTalkStyle,
              voiceStyle: finalProsodyStyle,
              perfTraceId: chatPerfTraceId,
              playbackGeneration: Number(state.ttsPlaybackGeneration || 0)
            });
          } else {
            scheduleFinalSpeechWatchdog({
              sessionId: streamSpeakSession,
              text: visibleReply,
              mood,
              style: finalTalkStyle,
              traceId: chatPerfTraceId
            });
          }
        } else {
          const speechText = buildStableSpeakText(visibleReply) || visibleReply;
          const prosody = buildSpeakProsody(speechText || visibleReply, mood, false, finalProsodyStyle);
          maybePlayTalkGesture(speechText || visibleReply, finalTalkStyle);
          await speak(speechText || visibleReply, {
            prosody,
            interrupt: false,
            mood,
            style: finalTalkStyle,
            voiceStyle: finalProsodyStyle,
            perfTraceId: chatPerfTraceId
          });
        }
        setStatus("待机");
        return true;
      } catch (err) {
        perfLog("chat", "fail", {
          traceId: chatPerfTraceId,
          elapsedMs: Math.round(performance.now() - chatPerfStartPerfMs),
          error: String(err?.message || err || "")
        });
        clearThinkingMotionTimer();
        if (latencyHintTimer) {
          clearTimeout(latencyHintTimer);
          latencyHintTimer = 0;
        }
        if (streamSpeakSession === state.streamSpeakSession) {
          state.streamSpeakQueue = [];
          state.streamSpeakBuffer = "";
        }
        if (assistantRow && !reply) {
          try {
            assistantRow.remove();
          } catch (_) {
            // ignore
          }
        }
        if (!silentError) {
          const msg = buildChatFailureDoctorHint(err);
          appendMessage("assistant", msg);
        }
        setStatus("请求失败");
        return false;
      } finally {
        perfLog("chat", "done", {
          traceId: chatPerfTraceId,
          elapsedMs: Math.round(performance.now() - chatPerfStartPerfMs)
        });
        state.activePerfTraceId = "";
        clearThinkingMotionTimer();
        if (latencyHintTimer) {
          clearTimeout(latencyHintTimer);
          latencyHintTimer = 0;
        }
        state.chatBusy = false;
        resumeMicAfterAssistant();
        if (!state.micOpen) {
          scheduleWakeWordStart(360);
        }
        updateMicButton();
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
      sendChat
    };
  }

  const api = { createController };
  root.TaffyChatReplyController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
