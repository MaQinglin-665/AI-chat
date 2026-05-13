(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const fetch = deps.fetchObject || root.fetch?.bind(root);
    const clampNumber = typeof deps.clampNumber === "function" ? deps.clampNumber : (v, min, max) => Math.min(max, Math.max(min, v));
    const isServerTTSProvider = typeof deps.isServerTTSProvider === "function" ? deps.isServerTTSProvider : () => false;
    const initServerTTSVoices = typeof deps.initServerTTSVoices === "function" ? deps.initServerTTSVoices : () => {};
    const buildAsrHotwordRules = typeof deps.buildAsrHotwordRules === "function" ? deps.buildAsrHotwordRules : () => [];
    const syncProactiveSchedulerPolling = typeof deps.syncProactiveSchedulerPolling === "function" ? deps.syncProactiveSchedulerPolling : () => {};
    const startAutoChatLoop = typeof deps.startAutoChatLoop === "function" ? deps.startAutoChatLoop : () => {};
    const stopAutoChatLoop = typeof deps.stopAutoChatLoop === "function" ? deps.stopAutoChatLoop : () => {};
    const normalizeTalkStyle = typeof deps.normalizeTalkStyle === "function" ? deps.normalizeTalkStyle : () => "neutral";
    const normalizeMotionIntensity = typeof deps.normalizeMotionIntensity === "function" ? deps.normalizeMotionIntensity : () => "normal";
    const loadChatHistoryFromStorage = typeof deps.loadChatHistoryFromStorage === "function" ? deps.loadChatHistoryFromStorage : () => {};
    const loadRemindersFromStorage = typeof deps.loadRemindersFromStorage === "function" ? deps.loadRemindersFromStorage : () => {};
    const loadDailyGreetingState = typeof deps.loadDailyGreetingState === "function" ? deps.loadDailyGreetingState : () => {};
    const loadEmotionStats = typeof deps.loadEmotionStats === "function" ? deps.loadEmotionStats : () => {};
    const resolveAssistantDisplayName = typeof deps.resolveAssistantDisplayName === "function" ? deps.resolveAssistantDisplayName : (name) => name;
    const updateObserveButton = typeof deps.updateObserveButton === "function" ? deps.updateObserveButton : () => {};
    const updateMicMeter = typeof deps.updateMicMeter === "function" ? deps.updateMicMeter : () => {};
    const detectModelProfileName = typeof deps.detectModelProfileName === "function" ? deps.detectModelProfileName : () => "";

    async function loadConfig() {
      const resp = await fetch("/config.json", { cache: "no-store" });
      if (!resp.ok) {
        throw new Error("加载 /config.json 失败");
      }
      state.config = await resp.json();
      const ttsCfg = state.config?.tts || {};
      const modelCfg = state.config?.model || {};
      const scale = Number(modelCfg.scale);
      const xRatio = Number(modelCfg.x_ratio);
      const yRatio = Number(modelCfg.y_ratio);
      state.modelConfig = {
        scale: Number.isFinite(scale) ? Math.max(0.1, Math.min(3.0, scale)) : 1,
        x_ratio: Number.isFinite(xRatio) ? Math.max(0, Math.min(1, xRatio)) : 0.26,
        y_ratio: Number.isFinite(yRatio) ? Math.max(0, Math.min(1, yRatio)) : 0.96
      };
      state.ttsProvider = String(ttsCfg.provider || "browser").toLowerCase();
      state.modelProfileName = detectModelProfileName();
      state.gptSovitsRealtimeTTS = ttsCfg.gpt_sovits_realtime_tts === true;
      state.streamSpeakMode = String(ttsCfg.stream_mode || "realtime").toLowerCase();
      state.serverTTSFallbackToBrowser = ttsCfg.allow_browser_fallback === true;
      const retryCountCfg = Number(ttsCfg.server_retry_count);
      const fallbackFailThresholdCfg = Number(ttsCfg.server_fallback_fail_threshold);
      const retryDelayCfg = Number(ttsCfg.server_retry_delay_ms);
      const timeoutCfg = Number(ttsCfg.server_request_timeout_ms);
      const streamIdleWaitCfg = Number(ttsCfg.stream_speak_idle_wait_ms);
      const isSovits = state.ttsProvider === "gpt_sovits";
      state.ttsServerRetryCount = Number.isFinite(retryCountCfg)
        ? Math.max(0, Math.min(4, Math.round(retryCountCfg)))
        : (isSovits ? 2 : 1);
      state.ttsServerFallbackFailThreshold = Number.isFinite(fallbackFailThresholdCfg)
        ? Math.max(1, Math.min(8, Math.round(fallbackFailThresholdCfg)))
        : (isSovits ? 1 : 2);
      state.ttsServerRetryDelayMs = Number.isFinite(retryDelayCfg)
        ? Math.max(60, Math.min(3000, Math.round(retryDelayCfg)))
        : 220;
      const sovitsTimeoutMs = isSovits && Number.isFinite(Number(ttsCfg.gpt_sovits_timeout_sec))
        ? Math.round(Number(ttsCfg.gpt_sovits_timeout_sec) * 1000)
        : 0;
      const resolvedTimeoutMs = Number.isFinite(timeoutCfg)
        ? timeoutCfg
        : (sovitsTimeoutMs || 14000);
      state.ttsServerRequestTimeoutMs = Math.max(1500, Math.min(90000, Math.round(resolvedTimeoutMs)));
      state.streamSpeakIdleWaitMs = Number.isFinite(streamIdleWaitCfg)
        ? Math.max(30, Math.min(220, Math.round(streamIdleWaitCfg)))
        : 90;
      state.ttsServerFailStreak = 0;
      state.ttsServerLastError = "";
      if (!["final_only", "realtime"].includes(state.streamSpeakMode)) {
        state.streamSpeakMode = "realtime";
      }
      if (state.ttsProvider === "gpt_sovits" && !state.gptSovitsRealtimeTTS) {
        state.streamSpeakMode = "final_only";
      }
      if (isServerTTSProvider(state.ttsProvider)) {
        state.ttsServerAvailable = true;
        initServerTTSVoices();
      }
      const asrCfg = state.config?.asr || {};
      const observeCfg = state.config?.observe || {};
      const conversationCfg = state.config?.conversation_mode || {};
      const historySummaryCfg = state.config?.history_summary || {};
      const styleCfg = state.config?.style || {};
      const motionCfg = state.config?.motion || {};
      const runtimeCfg = state.config?.character_runtime || {};
      state.characterRuntimeAutoApplyReplyCue =
        runtimeCfg.enabled === true && runtimeCfg.auto_apply_reply_cue === true;
      state.showMicMeter = asrCfg.show_mic_meter !== false;
      state.micKeepListening = asrCfg.keep_listening !== false;
      state.asrTranscribeOnClose = asrCfg.transcribe_on_close !== false;
      state.localAsrMinSpeechMs = Math.round(
        clampNumber(Number(asrCfg.min_speech_ms || 180), 80, 1200)
      );
      state.localAsrSilenceTriggerMs = Math.round(
        clampNumber(Number(asrCfg.silence_trigger_ms || 380), 180, 1200)
      );
      state.localAsrMaxSpeechMs = Math.round(
        clampNumber(Number(asrCfg.max_speech_ms || 2400), 1000, 6000)
      );
      state.localAsrSpeechThreshold = clampNumber(
        Number(asrCfg.speech_threshold || 0.0035),
        0.0015,
        0.05
      );
      const buf = Math.round(Number(asrCfg.processor_buffer_size || 2048));
      state.localAsrProcessorBufferSize = [1024, 2048, 4096, 8192].includes(buf) ? buf : 2048;
      state.asrSemanticCorrectionEnabled = asrCfg.semantic_correction_enabled !== false;
      state.voiceTurnMergeWindowMs = Math.round(
        clampNumber(Number(asrCfg.voice_turn_merge_window_ms ?? 1200), 0, 2500)
      );
      state.voiceTurnHoldIncompleteEnabled = asrCfg.voice_turn_hold_incomplete_enabled !== false;
      state.asrLowConfidenceConfirmEnabled = asrCfg.low_confidence_confirm_enabled !== false;
      state.asrLowConfidenceThreshold = clampNumber(
        Number(asrCfg.low_confidence_threshold ?? 0.48),
        0.2,
        0.9
      );
      state.asrHotwordRules = buildAsrHotwordRules(asrCfg.hotword_replacements || {});
      state.wakeWordEnabled = asrCfg.wake_word_enabled !== false;
      state.wakeWords = Array.isArray(asrCfg.wake_words) && asrCfg.wake_words.length
        ? asrCfg.wake_words.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 8)
        : ["\u5854\u83f2", "taffy", "tafi"];
      {
        const rawAttachMode = String(observeCfg.attach_mode || "").toLowerCase();
        if (rawAttachMode === "always" || rawAttachMode === "auto") {
          state.observeAttachMode = "always";
        } else if (rawAttachMode === "keyword" || rawAttachMode === "manual") {
          state.observeAttachMode = "manual";
        } else {
          state.observeAttachMode = "manual";
        }
      }
      state.observeAllowAutoChat = observeCfg.allow_auto_chat === true;
      state.conversationMode = {
        enabled: conversationCfg.enabled === true,
        chatStreamEnabled: conversationCfg.chat_stream_enabled !== false,
        proactiveEnabled: conversationCfg.proactive_enabled === true,
        proactiveSchedulerEnabled: conversationCfg.proactive_scheduler_enabled === true,
        grayAutoEnabled: conversationCfg.gray_auto_enabled === true,
        grayAutoTrialEnabled: conversationCfg.gray_auto_trial_enabled === true,
        grayAutoTrialMaxTriggersPerSession: Math.round(
          clampNumber(Number(conversationCfg.gray_auto_trial_max_triggers_per_session ?? 1), 0, 4)
        ),
        proactiveCooldownMs: Math.round(
          clampNumber(Number(conversationCfg.proactive_cooldown_ms ?? 600000), 60000, 3600000)
        ),
        proactiveWarmupMs: Math.round(
          clampNumber(Number(conversationCfg.proactive_warmup_ms ?? 120000), 30000, 1800000)
        ),
        proactiveWindowMs: Math.round(
          clampNumber(Number(conversationCfg.proactive_window_ms ?? 3600000), 600000, 86400000)
        ),
        proactivePollIntervalMs: Math.round(
          clampNumber(Number(conversationCfg.proactive_poll_interval_ms ?? 60000), 30000, 600000)
        ),
        maxFollowupsPerWindow: Math.round(
          clampNumber(Number(conversationCfg.max_followups_per_window ?? 1), 0, 4)
        ),
        silenceFollowupMinMs: Math.round(
          clampNumber(Number(conversationCfg.silence_followup_min_ms ?? 180000), 30000, 1800000)
        ),
        interruptTtsOnUserSpeech: conversationCfg.interrupt_tts_on_user_speech !== false,
        protectImportantSpeech: conversationCfg.protect_important_speech !== false,
        importantSpeechMinMs: Math.round(
          clampNumber(Number(conversationCfg.important_speech_min_ms ?? 900), 0, 3000)
        ),
        importantSpeechMaxHoldMs: Math.round(
          clampNumber(Number(conversationCfg.important_speech_max_hold_ms ?? 4200), 500, 9000)
        ),
        importantSpeechForceAfterAttempts: Math.round(
          clampNumber(Number(conversationCfg.important_speech_force_after_attempts ?? 2), 1, 4)
        )
      };
      if (!(Number(state.proactiveSchedulerStartedAt || 0) > 0)) {
        state.proactiveSchedulerStartedAt = Date.now();
      }
      syncProactiveSchedulerPolling();
      const autoChatTuningCfg = observeCfg && typeof observeCfg.auto_chat_tuning === "object"
        ? observeCfg.auto_chat_tuning
        : {};
      state.autoChatTuning = {
        triggerBaseThreshold: clampNumber(
          Number(autoChatTuningCfg.trigger_base_threshold ?? 0.82),
          0.4,
          3.0
        ),
        shortSilencePenalty: clampNumber(
          Number(autoChatTuningCfg.short_silence_penalty ?? 0.16),
          0,
          1.2
        ),
        longSilenceBonus: clampNumber(
          Number(autoChatTuningCfg.long_silence_bonus ?? 0.14),
          0,
          1.0
        ),
        emotionBonus: clampNumber(
          Number(autoChatTuningCfg.emotion_bonus ?? 0.12),
          0,
          0.8
        ),
        repeatReasonPenalty: clampNumber(
          Number(autoChatTuningCfg.repeat_reason_penalty ?? 0.44),
          0,
          1.2
        ),
        repeatTopicPenalty: clampNumber(
          Number(autoChatTuningCfg.repeat_topic_penalty ?? 0.48),
          0,
          1.2
        ),
        burstPenalty: clampNumber(
          Number(autoChatTuningCfg.burst_penalty ?? 0.32),
          0,
          1.2
        ),
        recentAutoPenalty: clampNumber(
          Number(autoChatTuningCfg.recent_auto_penalty ?? 0.45),
          0,
          1.5
        ),
        scoreJitter: clampNumber(
          Number(autoChatTuningCfg.score_jitter ?? 0.12),
          0,
          0.8
        ),
        repeatReasonWindowMs: Math.round(
          clampNumber(
            Number(autoChatTuningCfg.repeat_reason_window_ms ?? (14 * 60 * 1000)),
            2 * 60 * 1000,
            120 * 60 * 1000
          )
        ),
        repeatTopicWindowMs: Math.round(
          clampNumber(
            Number(autoChatTuningCfg.repeat_topic_window_ms ?? (22 * 60 * 1000)),
            2 * 60 * 1000,
            150 * 60 * 1000
          )
        ),
        burstResetWindowMs: Math.round(
          clampNumber(
            Number(autoChatTuningCfg.burst_reset_window_ms ?? (18 * 60 * 1000)),
            3 * 60 * 1000,
            150 * 60 * 1000
          )
        ),
        maxTopicHintChars: Math.round(
          clampNumber(
            Number(autoChatTuningCfg.max_topic_hint_chars ?? 42),
            12,
            120
          )
        )
      };
      state.dailyGreetingEnabled = observeCfg.daily_greeting_enabled === true;
      state.dailyGreetingHour = Math.round(
        clampNumber(Number(observeCfg.daily_greeting_hour || 8), 0, 23)
      );
      state.dailyGreetingMinute = Math.round(
        clampNumber(Number(observeCfg.daily_greeting_minute || 0), 0, 59)
      );
      state.dailyGreetingPrompt = String(observeCfg.daily_greeting_prompt || "").trim()
        || "请你像桌宠一样主动向我说早安，简短自然地问好，再给我一句鼓励今天认真努力的暖心鸡汤。控制在两三句内，不要太像模板。";
      // 主动说话：从 config 读取开关和随机间隔范围
      const prevAutoChatEnabled = state.autoChatEnabled;
      state.autoChatEnabled = observeCfg.auto_chat_enabled === true;
      state.autoChatMinMs = Math.max(60000, Number(observeCfg.auto_chat_min_ms || 60000));
      state.autoChatMaxMs = Math.max(state.autoChatMinMs + 30000, Number(observeCfg.auto_chat_max_ms || 180000));
      if (state.autoChatEnabled && !prevAutoChatEnabled) {
        startAutoChatLoop();
      } else if (!state.autoChatEnabled && prevAutoChatEnabled) {
        stopAutoChatLoop();
      }
      const keepRecent = Math.max(4, Math.min(40, Number(historySummaryCfg.keep_recent_messages || 8)));
      const triggerN = Math.max(8, Math.min(80, Number(historySummaryCfg.trigger_messages || 14)));
      state.historyMaxMessages = Math.max(12, Math.min(120, triggerN + keepRecent + 8));
      state.styleAutoEnabled = styleCfg.auto !== false;
      state.manualTalkStyle = normalizeTalkStyle(styleCfg.manual || "neutral");
      state.motionEnabled = motionCfg.enabled !== false;
      state.motionQuietDuringSpeech = motionCfg.quiet_speech === true;
      state.motionIntensity = normalizeMotionIntensity(
        motionCfg.intensity || motionCfg.action_intensity || "normal"
      );
      state.speechMotionStrength = clampNumber(
        Number(motionCfg.speech_motion_strength ?? motionCfg.speech_body_motion_strength ?? 1.48),
        0.6,
        2.2
      );
      state.motionComboEnabled = motionCfg.combo_enabled !== false;
      state.expressionEnabled = motionCfg.expression_enabled !== false;
      state.expressionStrength = clampNumber(
        Number(motionCfg.expression_strength || 1),
        0.2,
        2.0
      );
      state.motionCooldownMs = Math.round(
        clampNumber(Number(motionCfg.cooldown_ms || 1200), 250, 8000)
      );
      state.speakingMotionCooldownMs = Math.round(
        clampNumber(Number(motionCfg.speaking_cooldown_ms || 1100), 500, 8000)
      );
      state.idleMotionEnabled = motionCfg.idle_enabled !== false;
      state.idleMotionMinMs = Math.round(
        clampNumber(Number(motionCfg.idle_min_ms || 12000), 4000, 90000)
      );
      state.idleMotionMaxMs = Math.round(
        clampNumber(Number(motionCfg.idle_max_ms || 24000), state.idleMotionMinMs + 1000, 150000)
      );
      loadChatHistoryFromStorage();
      loadRemindersFromStorage();
      loadDailyGreetingState();
      loadEmotionStats();
      ui.assistantName.textContent = resolveAssistantDisplayName("Mochi");
      updateObserveButton();
      updateMicMeter(0);
    }

    return { loadConfig };
  }

  const api = { createController };
  root.TaffyAppConfigController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
