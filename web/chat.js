const state = {
  config: null,
  model: null,
  pixiApp: null,
  history: [],
  chatRecords: [],
  modelProfileName: "",
  uiView: "full",
  desktopMode: false,
  desktopBridge: "",
  alphaMode: "none",
  desktopCanMoveWindow: false,
  desktopCanCapture: false,
  useNativeWindowDrag: false,
  windowLocked: false,
  windowLockUnsubscribe: null,
  observeDesktop: false,
  observeAttachMode: "manual",
  observeAllowAutoChat: false,
  autoChatEnabled: false,
  autoChatMinMs: 180000,
  autoChatMaxMs: 480000,
  autoChatTimer: 0,
  lastAutoChatAt: 0,
  autoChatLastReason: "",
  autoChatLastTopicHint: "",
  autoChatLastTopicAt: 0,
  autoChatBurstCount: 0,
  conversationMode: {
    enabled: false,
    proactiveEnabled: false,
    proactiveSchedulerEnabled: false,
    proactiveCooldownMs: 600000,
    proactiveWarmupMs: 120000,
    proactiveWindowMs: 3600000,
    proactivePollIntervalMs: 60000,
    maxFollowupsPerWindow: 1,
    silenceFollowupMinMs: 180000,
    interruptTtsOnUserSpeech: false
  },
  followupPending: false,
  followupReason: "",
  followupTopicHint: "",
  followupUpdatedAt: 0,
  conversationLastUserAt: 0,
  conversationLastAssistantAt: 0,
  conversationLastTtsFinishedAt: 0,
  proactiveSchedulerStartedAt: 0,
  proactiveLastAttemptAt: 0,
  proactiveLastTriggeredAt: 0,
  proactiveCooldownUntil: 0,
  proactiveWindowStartedAt: 0,
  proactiveCountInWindow: 0,
  proactiveInFlight: false,
  proactiveLastBlockedReason: "",
  proactiveLastResult: "",
  proactivePollTimerId: 0,
  proactiveLastPollAt: 0,
  proactivePollActive: false,
  proactivePollLastResult: "",
  proactivePollActiveIntervalMs: 0,
  proactivePollFailureInjection: null,
  autoChatTuning: {
    triggerBaseThreshold: 1.03,
    shortSilencePenalty: 0.35,
    longSilenceBonus: 0.14,
    emotionBonus: 0.12,
    repeatReasonPenalty: 0.44,
    repeatTopicPenalty: 0.48,
    burstPenalty: 0.32,
    recentAutoPenalty: 0.45,
    scoreJitter: 0.12,
    repeatReasonWindowMs: 14 * 60 * 1000,
    repeatTopicWindowMs: 22 * 60 * 1000,
    burstResetWindowMs: 18 * 60 * 1000,
    maxTopicHintChars: 42
  },
  lastUserMessageAt: Date.now(),
  chatTranslationVisible: true,
  chatBusy: false,
  speakingEnabled: true,
  ttsProvider: "browser",
  modelConfig: { scale: 1, x_ratio: 0.26, y_ratio: 0.96 },
  ttsReady: false,
  ttsVoices: [],
  ttsVoiceIndex: -1,
  ttsVoice: null,
  ttsServerVoices: [],
  ttsServerVoiceIndex: -1,
  ttsServerVoice: null,
  ttsServerAvailable: true,
  ttsServerFailStreak: 0,
  ttsServerLastError: "",
  ttsServerFallbackFailThreshold: 2,
  ttsServerRetryCount: 1,
  ttsServerRetryDelayMs: 220,
  ttsServerRequestTimeoutMs: 14000,
  serverTTSFallbackToBrowser: false,
  ttsAudio: null,
  ttsAudioPlaybackToken: 0,
  ttsPlaybackGeneration: 0,
  ttsContextSpeaking: false,
  subtitleId: 0,
  subtitleHideTimer: 0,
  subtitlePageTimer: 0,
  subtitleEnabled: true,
  subtitlePositionCustom: false,
  subtitlePositionRatioX: 0.5,
  subtitlePositionRatioY: 0.75,
  subtitleDragPointerId: 0,
  ttsLastGoodVoiceName: "",
  streamSpeakEnabled: true,
  streamSpeakMode: "realtime",
  gptSovitsRealtimeTTS: false,
  streamSpeakIdleWaitMs: 90,
  streamSpeakQueue: [],
  streamSpeakWorking: false,
  streamSpeakBuffer: "",
  streamSpeakSession: 0,
  streamSpeakWorkingSession: 0,
  streamSpeakLastEnqueueSession: 0,
  streamSpeakPlayedSession: 0,
  speechAnimUntil: 0,
  speechAnimStartedAt: 0,
  speechAnimDurationMs: 0,
  speechAnimSeed: 0,
  speechAnimTextLength: 0,
  speechAnimPunctuation: 0,
  speechAnimAccentCount: 0,
  speechAnimStyle: "neutral",
  speechAnimMood: "idle",
  speechMouthOpen: 0,
  speechMouthApplied: 0,
  speechMouthTarget: 0,
  speechMouthUpdatedAt: 0,
  speechBodyEnergy: 0,
  speechMotionBlend: 0,
  speechPhase: "idle",
  speechPhaseEnteredAt: 0,
  speechPhaseWasSpeaking: false,
  beatPrevLevel: 0,
  beatImpulse: 0,
  beatNodSmoothed: 0,
  beatCooldownUntil: 0,
  moodExpressionSmoothed: { happy: 0, sad: 0, angry: 0, surprised: 0 },
  moodExpressionUpdatedAt: 0,
  moodHoldUntil: 0,
  moodExpressionWeight: 1,
  moodExpressionWeightUntil: 0,
  moodExpressionWeightMood: "idle",
  moodExpressionRuntimeMood: "idle",
  microBlinkUntil: 0,
  microNextBlinkAt: 0,
  microGazeTargetX: 0,
  microGazeTargetY: 0,
  microGazeCurrentX: 0,
  microGazeCurrentY: 0,
  microNextGazeAt: 0,
  mouseGazeTargetX: 0,
  mouseGazeTargetY: 0,
  mouseGazeCurrentX: 0,
  mouseGazeCurrentY: 0,
  mouseGazePollTimer: 0,
  microBreathSeed: 0,
  microMotionLastAt: 0,
  spring_hairAhoge_vel: 0,
  spring_hairAhoge_pos: 0,
  spring_hairFront_vel: 0,
  spring_hairFront_pos: 0,
  spring_hairBack_vel: 0,
  spring_hairBack_pos: 0,
  spring_ribbon_vel: 0,
  spring_ribbon_pos: 0,
  spring_skirt_vel: 0,
  spring_skirt_pos: 0,
  spring_skirt2_vel: 0,
  spring_skirt2_pos: 0,
  spring_torso_vel: 0,
  spring_torso_pos: 0,
  spring_head_vel: 0,
  spring_head_pos: 0,
  spring_body_vel: 0,
  spring_body_pos: 0,
  spring_body_render: 0,
  spring_torso_render: 0,
  spring_head_render: 0,
  ttsAudioContext: null,
  ttsDecodeContext: null,
  ttsAudioSourceNode: null,
  ttsContextBufferSource: null,
  ttsAudioAnalyser: null,
  ttsAudioAnalyserData: null,
  ttsAudioLevel: 0,
  ttsAudioRawLevel: 0,
  ttsAudioRms: 0,
  ttsAudioLastVoiceAt: 0,
  historyMaxMessages: 64,
  currentTalkStyle: "neutral",
  styleAutoEnabled: true,
  manualTalkStyle: "neutral",
  motionEnabled: true,
  motionQuietDuringSpeech: true,
  motionCooldownMs: 1200,
  motionCooldownUntil: 0,
  speakingMotionCooldownMs: 2200,
  speakingMotionCooldownUntil: 0,
  idleMotionEnabled: true,
  idleMotionMinMs: 12000,
  idleMotionMaxMs: 24000,
  idleMotionTimer: 0,
  motionDefinitions: {},
  availableMotionGroups: [],
  lastMotionGroup: "",
  motionIntensity: "normal",
  speechMotionStrength: 1.35,
  motionComboEnabled: true,
  actionQueue: [],
  actionRunnerBusy: false,
  actionLastAt: {},
  thinkingMotionTimer: 0,
  expressionEnabled: true,
  expressionStrength: 1,
  expressionPulseUntil: 0,
  expressionPulseBoost: 0,
  expressionStyle: "neutral",
  lastPointerDownAt: 0,
  lastPointerDownGlobal: { x: 0, y: 0 },
  pointerDragMoved: false,
  recognition: null,
  recognitionAvailable: false,
  recognitionActive: false,
  micOpen: false,
  micPermissionGranted: false,
  micRestartTimer: 0,
  micRetryCount: 0,
  micSession: 0,
  micSuspendDepth: 0,
  micQueue: [],
  micQueueWorking: false,
  micToggleBusy: false,
  _broadcastSpeechUpdatedAt: 0,
  micKeepListening: true,
  asrTranscribeOnClose: true,
  asrMode: "local_vosk",
  localAsrAvailable: false,
  localAsrRunning: false,
  localAsrStream: null,
  localAsrContext: null,
  localAsrSource: null,
  localAsrProcessor: null,
  localAsrAnalyser: null,
  localAsrMeterRaf: 0,
  localAsrMeterBuffer: null,
  localAsrLastFrameAt: 0,
  localAsrWatchdogTimer: 0,
  localAsrNoFrameWarned: false,
  localAsrPeakRms: 0,
  localAsrStartedAt: 0,
  localAsrLowLevelWarned: false,
  localAsrThresholdAutoAdjusted: false,
  localAsrInputDeviceId: "",
  localAsrInputDeviceLabel: "",
  localAsrInputMuted: false,
  ttsDebugVisible: false,
  ttsDebugEvents: [],
  ttsDebugSeq: 0,
  ttsDebugPanel: null,
  ttsDebugBody: null,
  ttsDebugRefreshTimer: 0,
  ttsDebugLastEventAt: 0,
  ttsDebugCurrentText: "",
  ttsDebugCurrentTraceId: "",
  ttsDebugCurrentSession: 0,
  ttsDebugCurrentSegmentId: 0,
  ttsDebugCurrentBlobBytes: 0,
  ttsDebugCurrentMime: "",
  ttsDebugAudioDurationMs: -1,
  ttsDebugAudioCurrentMs: 0,
  ttsDebugAudioStartedAt: 0,
  ttsDebugAudioEndedAt: 0,
  ttsDebugLastResult: "",
  ttsDebugLastError: "",
  translateDebugVisible: false,
  translateDebugEvents: [],
  translateDebugSeq: 0,
  translateDebugPanel: null,
  translateDebugBody: null,
  translateDebugRefreshTimer: 0,
  translateDebugLastEventAt: 0,
  translateDebugCurrentTraceId: "",
  translateDebugCurrentText: "",
  translateDebugLastResult: "",
  translateDebugLastError: "",
  followupReadinessVisible: false,
  followupReadinessPanel: null,
  followupReadinessBody: null,
  followupReadinessRefreshTimer: 0,
  followupCharacterChipRefreshTimer: 0,
  followupCharacterRuntimeLastTone: "",
  followupCharacterRuntimeLastHintAt: 0,
  followupCharacterRuntimeLastHint: null,
  localAsrMutedWarned: false,
  localAsrInputDeviceCandidates: [],
  localAsrSpeeching: false,
  localAsrSpeechMs: 0,
  localAsrSilenceMs: 0,
  localAsrBuffers: [],
  localAsrSending: false,
  localAsrAbortController: null,
  localAsrMinSpeechMs: 180,
  localAsrSilenceTriggerMs: 380,
  localAsrMaxSpeechMs: 2400,
  localAsrSpeechThreshold: 0.0035,
  localAsrNoiseFloor: 0.0008,
  localAsrProcessorBufferSize: 2048,
  micLevel: 0,
  showMicMeter: true,
  asrHotwordRules: [],
  wakeWordEnabled: true,
  wakeWords: ["\u5854\u83f2", "taffy", "tafi"],
  wakeRecognition: null,
  wakeRecognitionActive: false,
  wakeRestartTimer: 0,
  wakeCooldownUntil: 0,
  personaCard: null,
  assistantAvatarUrl: "",
  reminders: [],
  reminderSeq: 1,
  reminderTimer: 0,
  dailyGreetingEnabled: false,
  dailyGreetingHour: 8,
  dailyGreetingMinute: 0,
  dailyGreetingPrompt: "",
  dailyGreetingLastRunKey: "",
  emotionStats: [],
  emotionDayKey: "",
  animating: false,
  baseTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
  modelPosX: NaN,
  modelPosY: NaN,
  dragData: null,
  windowDragRaf: 0,
  windowDragSessionRaf: 0,
  windowDragDx: 0,
  windowDragDy: 0,
  dragWindowAccumX: 0,
  dragWindowAccumY: 0,
  windowDragActive: false,
  browserDragActive: false,
  suspendRelayoutUntil: 0,
  resizeRaf: 0,
  layoutWidth: 0,
  layoutHeight: 0,
  pendingAttachments: [],
  attachmentReadBusy: false,
  onboardingStepIndex: 0,
  onboardingSeen: false,
  activePerfTraceId: "",
  perfTtsSeq: 0
};
window.__petState = state;

function createPerfTraceId(prefix = "chat") {
  const safePrefix = String(prefix || "chat").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "chat";
  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function perfLog(scope, stage, payload = {}) {
  try {
    console.info(`[perf][${scope}][${stage}]`, payload);
  } catch (_) {
    // ignore logging errors
  }
}

function sanitizeTTSDebugText(text, maxLen = 96) {
  const safe = String(text || "").split(/\s+/).filter(Boolean).join(" ");
  if (safe.length <= maxLen) {
    return safe;
  }
  return `${safe.slice(0, Math.max(0, maxLen - 1))}...`;
}

function recordTTSDebugEvent(stage, payload = {}) {
  const now = performance.now();
  const entry = {
    seq: ++state.ttsDebugSeq,
    atMs: Math.round(now),
    ageMs: 0,
    stage: String(stage || "event"),
    traceId: String(payload.traceId || state.ttsDebugCurrentTraceId || state.activePerfTraceId || ""),
    sessionId: Number(payload.sessionId || state.ttsDebugCurrentSession || 0),
    segmentId: Number(payload.segmentId || state.ttsDebugCurrentSegmentId || 0),
    text: sanitizeTTSDebugText(payload.text || ""),
    queueLen: Array.isArray(state.streamSpeakQueue) ? state.streamSpeakQueue.length : 0,
    blobBytes: Number(payload.blobBytes || 0),
    durationMs: Number(payload.durationMs || -1),
    currentMs: Number(payload.currentMs || 0),
    result: String(payload.result || ""),
    error: String(payload.error || "")
  };
  state.ttsDebugLastEventAt = now;
  if (entry.text) {
    state.ttsDebugCurrentText = entry.text;
  }
  if (entry.traceId) {
    state.ttsDebugCurrentTraceId = entry.traceId;
  }
  if (entry.sessionId) {
    state.ttsDebugCurrentSession = entry.sessionId;
  }
  if (entry.segmentId) {
    state.ttsDebugCurrentSegmentId = entry.segmentId;
  }
  if (entry.blobBytes > 0) {
    state.ttsDebugCurrentBlobBytes = entry.blobBytes;
  }
  if (entry.durationMs >= 0) {
    state.ttsDebugAudioDurationMs = entry.durationMs;
  }
  if (entry.currentMs >= 0) {
    state.ttsDebugAudioCurrentMs = entry.currentMs;
  }
  if (entry.result) {
    state.ttsDebugLastResult = entry.result;
  }
  if (entry.error) {
    state.ttsDebugLastError = entry.error;
  }
  state.ttsDebugEvents.push(entry);
  if (state.ttsDebugEvents.length > 80) {
    state.ttsDebugEvents.splice(0, state.ttsDebugEvents.length - 80);
  }
  updateTTSDebugPanel();
  return entry;
}

function recordTTSAudioEvent(stage, audio, debugContext = {}, extra = {}) {
  recordTTSDebugEvent(stage, {
    ...debugContext,
    ...extra,
    durationMs: Number.isFinite(Number(audio?.duration)) && Number(audio.duration) > 0
      ? Math.round(Number(audio.duration) * 1000)
      : Number(extra.durationMs ?? -1),
    currentMs: Math.round(Number(audio?.currentTime || 0) * 1000)
  });
}

function formatTTSDebugNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "n/a";
  }
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
}

function shouldEnableProactiveSchedulerPolling() {
  const status = getProactiveSchedulerPollingGateStatus();
  return status.enabled;
}

function getProactiveSchedulerPollingGateStatus() {
  const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
    ? state.conversationMode
    : {};
  const blockedReasons = [];
  if (conversationMode.enabled !== true) {
    blockedReasons.push("conversation_disabled");
  }
  if (conversationMode.proactiveEnabled !== true) {
    blockedReasons.push("proactive_disabled");
  }
  if (conversationMode.proactiveSchedulerEnabled !== true) {
    blockedReasons.push("scheduler_disabled");
  }
  return {
    enabled: blockedReasons.length === 0,
    blockedReasons
  };
}

function buildProactiveSchedulerDebugSnapshot(nowMs = Date.now()) {
  const now = Number(nowMs);
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
    ? state.conversationMode
    : {};
  const conversationEnabled = conversationMode.enabled === true;
  const proactiveEnabled = conversationMode.proactiveEnabled === true;
  const schedulerEnabled = conversationMode.proactiveSchedulerEnabled === true;
  const pollIntervalMs = Number.isFinite(Number(conversationMode.proactivePollIntervalMs))
    ? Math.max(30000, Math.min(600000, Math.round(Number(conversationMode.proactivePollIntervalMs))))
    : 60000;
  const warmupMs = Number.isFinite(Number(conversationMode.proactiveWarmupMs))
    ? Math.max(0, Math.round(Number(conversationMode.proactiveWarmupMs)))
    : 120000;
  const maxFollowupsPerWindow = Number.isFinite(Number(conversationMode.maxFollowupsPerWindow))
    ? Math.max(0, Math.round(Number(conversationMode.maxFollowupsPerWindow)))
    : 1;
  const proactiveWindowMs = Number.isFinite(Number(conversationMode.proactiveWindowMs))
    ? Math.max(0, Math.round(Number(conversationMode.proactiveWindowMs)))
    : 3600000;
  const startedAt = Number(state.proactiveSchedulerStartedAt || 0);
  const proactiveCooldownUntil = Number(state.proactiveCooldownUntil || 0);
  const proactiveWindowStartedAt = Number(state.proactiveWindowStartedAt || 0);
  const rawProactiveCountInWindow = Number.isFinite(Number(state.proactiveCountInWindow))
    ? Math.max(0, Math.round(Number(state.proactiveCountInWindow)))
    : 0;
  const proactiveInFlight = state.proactiveInFlight === true;
  const pollTimerActive = Number(state.proactivePollTimerId || 0) > 0;
  const pollingEnabled = shouldEnableProactiveSchedulerPolling();
  const lastPollAt = Number(state.proactiveLastPollAt || 0);
  const lastPollAgeMs = lastPollAt > 0 ? Math.max(0, Math.round(safeNow - lastPollAt)) : -1;
  const lastAttemptAt = Number(state.proactiveLastAttemptAt || 0);
  const lastTriggeredAt = Number(state.proactiveLastTriggeredAt || 0);

  const startedAgeMs = startedAt > 0 ? Math.max(0, Math.round(safeNow - startedAt)) : -1;
  const warmupRemainingMs = startedAt > 0
    ? Math.max(0, Math.round(warmupMs - (safeNow - startedAt)))
    : warmupMs;
  const cooldownRemainingMs = proactiveCooldownUntil > safeNow
    ? Math.max(0, Math.round(proactiveCooldownUntil - safeNow))
    : 0;
  const rawWindowAgeMs = proactiveWindowStartedAt > 0
    ? Math.max(0, Math.round(safeNow - proactiveWindowStartedAt))
    : -1;
  const windowActive = proactiveWindowStartedAt > 0 && rawWindowAgeMs <= proactiveWindowMs;
  const windowAgeMs = windowActive ? rawWindowAgeMs : -1;
  const proactiveCountInWindow = windowActive ? rawProactiveCountInWindow : 0;
  const lastAttemptAgeMs = lastAttemptAt > 0 ? Math.max(0, Math.round(safeNow - lastAttemptAt)) : -1;
  const lastTriggeredAgeMs = lastTriggeredAt > 0 ? Math.max(0, Math.round(safeNow - lastTriggeredAt)) : -1;

  const blockedReasons = [];
  if (!conversationEnabled) {
    blockedReasons.push("conversation_disabled");
  }
  if (!proactiveEnabled) {
    blockedReasons.push("proactive_disabled");
  }
  if (!schedulerEnabled) {
    blockedReasons.push("scheduler_disabled");
  }
  if (warmupRemainingMs > 0) {
    blockedReasons.push("warmup_active");
  }
  if (cooldownRemainingMs > 0) {
    blockedReasons.push("cooldown_active");
  }
  if (proactiveInFlight) {
    blockedReasons.push("in_flight");
  }
  if (proactiveCountInWindow >= maxFollowupsPerWindow) {
    blockedReasons.push("window_limit_reached");
  }

  return {
    schedulerEnabled,
    conversationEnabled,
    proactiveEnabled,
    startedAgeMs,
    warmupRemainingMs,
    cooldownRemainingMs,
    windowAgeMs,
    proactiveCountInWindow,
    maxFollowupsPerWindow,
    proactiveInFlight,
    pollingEnabled,
    pollIntervalMs,
    pollTimerActive,
    lastPollAgeMs,
    pollLastResult: String(state.proactivePollLastResult || ""),
    lastAttemptAgeMs,
    lastTriggeredAgeMs,
    lastBlockedReason: String(state.proactiveLastBlockedReason || ""),
    lastResult: String(state.proactiveLastResult || ""),
    blockedReasons,
    eligibleForSchedulerTick: blockedReasons.length === 0
  };
}

function getTTSDebugSnapshot() {
  const audio = state.ttsAudio;
  const now = performance.now();
  const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
    ? state.conversationMode
    : {};
  const followupUpdatedAt = Number(state.followupUpdatedAt || 0);
  const followupPlan = buildConversationFollowupDebugPlan(Date.now());
  const followupPolicy = buildConversationFollowupPolicy({
    reason: String(state.followupReason || ""),
    topicHint: String(state.followupTopicHint || "")
  });
  const followupCharacterCue = buildConversationFollowupCharacterCue(followupPlan);
  const followupReactionCandidates = buildConversationFollowupReactionCandidates(followupPlan);
  const followupSelectedReaction = selectConversationFollowupReactionCandidate(followupPlan, followupReactionCandidates);
  const followupCharacterPreview = followupSelectedReaction.candidate?.text || "";
  const durationMs = audio && Number.isFinite(Number(audio.duration)) && audio.duration > 0
    ? Math.round(Number(audio.duration) * 1000)
    : Number(state.ttsDebugAudioDurationMs || -1);
  const currentMs = audio ? Math.round(Number(audio.currentTime || 0) * 1000) : Number(state.ttsDebugAudioCurrentMs || 0);
  return {
    provider: state.ttsProvider,
    speakingEnabled: !!state.speakingEnabled,
    streamMode: state.streamSpeakMode,
    streamWorking: !!state.streamSpeakWorking,
    queueLen: Array.isArray(state.streamSpeakQueue) ? state.streamSpeakQueue.length : 0,
    bufferChars: String(state.streamSpeakBuffer || "").length,
    sessionId: Number(state.streamSpeakSession || 0),
    traceId: state.ttsDebugCurrentTraceId || state.activePerfTraceId || "",
    currentText: state.ttsDebugCurrentText || "",
    audioPaused: audio ? !!audio.paused : true,
    audioEnded: audio ? !!audio.ended : true,
    audioReadyState: audio ? Number(audio.readyState || 0) : -1,
    durationMs,
    currentMs,
    contextSpeaking: !!state.ttsContextSpeaking,
    mouthOpen: Number(state.speechMouthOpen || 0),
    audioLevel: Number(state.ttsAudioLevel || 0),
    rawLevel: Number(state.ttsAudioRawLevel || 0),
    rms: Number(state.ttsAudioRms || 0),
    lastVoiceAgeMs: state.ttsAudioLastVoiceAt ? Math.round(now - Number(state.ttsAudioLastVoiceAt)) : -1,
    animUntilMs: Math.round(Number(state.speechAnimUntil || 0) - now),
    animDurationMs: Number(state.speechAnimDurationMs || 0),
    mood: state.speechAnimMood || "idle",
    style: state.speechAnimStyle || state.currentTalkStyle || "neutral",
    conversationMode: {
      enabled: conversationMode.enabled === true,
      proactiveEnabled: conversationMode.proactiveEnabled === true,
      proactiveSchedulerEnabled: conversationMode.proactiveSchedulerEnabled === true,
      proactiveCooldownMs: Number.isFinite(Number(conversationMode.proactiveCooldownMs))
        ? Math.round(Number(conversationMode.proactiveCooldownMs))
        : 600000,
      proactiveWarmupMs: Number.isFinite(Number(conversationMode.proactiveWarmupMs))
        ? Math.round(Number(conversationMode.proactiveWarmupMs))
        : 120000,
      proactiveWindowMs: Number.isFinite(Number(conversationMode.proactiveWindowMs))
        ? Math.round(Number(conversationMode.proactiveWindowMs))
        : 3600000,
      proactivePollIntervalMs: Number.isFinite(Number(conversationMode.proactivePollIntervalMs))
        ? Math.round(Number(conversationMode.proactivePollIntervalMs))
        : 60000,
      maxFollowupsPerWindow: Number.isFinite(Number(conversationMode.maxFollowupsPerWindow))
        ? Math.round(Number(conversationMode.maxFollowupsPerWindow))
        : 1,
      silenceFollowupMinMs: Number.isFinite(Number(conversationMode.silenceFollowupMinMs))
        ? Math.round(Number(conversationMode.silenceFollowupMinMs))
        : 180000,
      interruptTtsOnUserSpeech: conversationMode.interruptTtsOnUserSpeech === true
    },
    followup: {
      pending: state.followupPending === true,
      reason: String(state.followupReason || ""),
      topicHint: String(state.followupTopicHint || ""),
      eligible: followupPlan.eligible === true,
      blockedReasons: Array.isArray(followupPlan.blockedReasons) ? followupPlan.blockedReasons.slice() : [],
      policy: followupPolicy.type,
      policyNote: followupPolicy.note,
      policyBlockedReason: String(followupPolicy.blockedReason || ""),
      characterCue: followupCharacterCue,
      characterPreview: followupCharacterPreview,
      reactionCandidates: followupReactionCandidates,
      selectedReaction: followupSelectedReaction,
      updatedAgeMs: followupUpdatedAt > 0 ? Math.max(0, Math.round(Date.now() - followupUpdatedAt)) : -1
    },
    proactiveScheduler: buildProactiveSchedulerDebugSnapshot(Date.now()),
    silence: buildConversationSilenceDebugSnapshot(Date.now()),
    lastResult: state.ttsDebugLastResult || "",
    lastError: state.ttsDebugLastError || ""
  };
}

function buildConversationSilenceDebugSnapshot(nowMs = Date.now()) {
  const now = Number(nowMs);
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
    ? state.conversationMode
    : {};
  const conversationEnabled = conversationMode.enabled === true;
  const proactiveEnabled = conversationMode.proactiveEnabled === true;
  const proactiveSchedulerEnabled = conversationMode.proactiveSchedulerEnabled === true;
  const followupPending = state.followupPending === true;
  const topicHint = String(state.followupTopicHint || "").trim();
  const reason = String(state.followupReason || "").trim();
  const policy = buildConversationFollowupPolicy({ reason, topicHint });
  const chatBusy = state.chatBusy === true;
  const speaking = isSpeakingNow();
  const silenceFollowupMinMs = Number.isFinite(Number(conversationMode.silenceFollowupMinMs))
    ? Math.max(0, Math.round(Number(conversationMode.silenceFollowupMinMs)))
    : 180000;
  const lastUserAt = Number(state.conversationLastUserAt || 0);
  const lastAssistantAt = Number(state.conversationLastAssistantAt || 0);
  const lastTtsFinishedAt = Number(state.conversationLastTtsFinishedAt || 0);
  const lastUserAgeMs = lastUserAt > 0 ? Math.max(0, Math.round(safeNow - lastUserAt)) : -1;
  const lastAssistantAgeMs = lastAssistantAt > 0 ? Math.max(0, Math.round(safeNow - lastAssistantAt)) : -1;
  const lastTtsFinishedAgeMs = lastTtsFinishedAt > 0 ? Math.max(0, Math.round(safeNow - lastTtsFinishedAt)) : -1;
  const silenceWindowReached = lastTtsFinishedAgeMs >= 0 && lastTtsFinishedAgeMs >= silenceFollowupMinMs;

  const blockedReasons = [];
  if (!conversationEnabled) {
    blockedReasons.push("conversation_disabled");
  }
  if (!proactiveEnabled) {
    blockedReasons.push("proactive_disabled");
  }
  if (!followupPending) {
    blockedReasons.push("no_pending_followup");
  }
  if (!topicHint) {
    blockedReasons.push("empty_topic_hint");
  }
  if (policy.type === "do_not_followup") {
    blockedReasons.push(policy.blockedReason || "policy_do_not_followup");
  }
  if (chatBusy) {
    blockedReasons.push("chat_busy");
  }
  if (speaking) {
    blockedReasons.push("speaking");
  }
  if (lastUserAgeMs < 0) {
    blockedReasons.push("no_user_activity_timestamp");
  } else if (lastUserAgeMs < silenceFollowupMinMs) {
    blockedReasons.push("user_silence_window_not_reached");
  }
  if (lastTtsFinishedAgeMs < 0) {
    blockedReasons.push("no_tts_finished_timestamp");
  } else if (lastTtsFinishedAgeMs < silenceFollowupMinMs) {
    blockedReasons.push("tts_silence_window_not_reached");
  }

  return {
    lastUserAgeMs,
    lastAssistantAgeMs,
    lastTtsFinishedAgeMs,
    silenceFollowupMinMs,
    silenceWindowReached,
    conversationEnabled,
    proactiveEnabled,
    proactiveSchedulerEnabled,
    followupPending,
    followupPolicy: policy.type,
    followupPolicyNote: policy.note,
    chatBusy,
    speaking,
    eligibleForSilenceFollowup: blockedReasons.length === 0,
    blockedReasons
  };
}

function buildConversationFollowupPolicy(plan) {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const reason = String(safePlan.reason || "").trim();
  const topicHint = String(safePlan.topicHint || "").replace(/\s+/g, " ").trim();
  const closingRe = /(不用|算了|没事|先这样|不聊|结束|晚安|睡了|休息|不用回|别追问|不要继续)/i;
  if (topicHint && closingRe.test(topicHint)) {
    return {
      type: "do_not_followup",
      note: "话题像是已收口或不适合继续追问，保持安静。",
      blockedReason: "policy_do_not_followup"
    };
  }
  if (reason === "question_tail") {
    return {
      type: "light_question",
      note: "上一轮以问题收尾，只允许轻轻补一个可忽略的小追问。"
    };
  }
  if (reason === "keyword_hint") {
    return {
      type: "soft_checkin",
      note: "上一轮像是在征求继续意愿，优先给低压力的可选接话。"
    };
  }
  return {
    type: "gentle_continue",
    note: "默认以自然、短句的方式轻轻续一下话题。"
  };
}

function buildConversationFollowupCharacterCue(plan) {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
  const reason = String(safePlan.reason || "followup_pending").trim() || "followup_pending";
  const cueByPolicy = {
    gentle_continue: {
      persona: "温和、好奇、有一点桌宠式陪伴感",
      tone: "像轻轻探头接一句，不像客服提醒",
      emotion: "thinking",
      action: "think",
      intensity: "low",
      voiceStyle: "soft",
      sample: "刚才那个点我还在想，要不要先轻轻放在这里？"
    },
    light_question: {
      persona: "好奇但不追着人问的小伙伴",
      tone: "只问一个可以不回答的小问题",
      emotion: "thinking",
      action: "think",
      intensity: "low",
      voiceStyle: "soft",
      sample: "我有点好奇这个点，不过你想先放着也完全可以。"
    },
    soft_checkin: {
      persona: "低压力、会看气氛的陪伴型角色",
      tone: "把选择权交给用户，不催促继续聊",
      emotion: "happy",
      action: "nod",
      intensity: "low",
      voiceStyle: "soft",
      sample: "如果你还想聊这个，我在这边慢慢听。"
    }
  };
  const cue = cueByPolicy[policy] || cueByPolicy.gentle_continue;
  return {
    ...cue,
    policy,
    reason,
    runtimeMetadataHint: {
      emotion: cue.emotion,
      action: cue.action,
      intensity: cue.intensity,
      voice_style: cue.voiceStyle
    }
  };
}

function buildConversationFollowupCharacterPreview(plan) {
  const candidates = buildConversationFollowupReactionCandidates(plan);
  return selectConversationFollowupReactionCandidate(plan, candidates).candidate?.text || "";
}

function buildConversationFollowupReactionCandidates(plan) {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
  let topicHint = String(safePlan.topicHint || "").replace(/\s+/g, " ").trim();
  if (topicHint.length > 28) {
    topicHint = `${topicHint.slice(0, 28).trim()}...`;
  }
  if (policy === "do_not_followup") {
    return [
      { text: "这个话题像是已经收口了，我先安静待着。", tone: "quiet", emotion: "neutral" },
      { text: "收到，我不追问啦，就在旁边待机。", tone: "quiet", emotion: "neutral" },
      { text: "那我先闭麦一下，有需要你再叫我。", tone: "quiet", emotion: "neutral" }
    ];
  }
  if (!topicHint) {
    return [];
  }
  if (policy === "light_question") {
    return [
      { text: `我有点好奇「${topicHint}」，不过你想先放着也完全可以。`, tone: "curious", emotion: "thinking" },
      { text: `刚才「${topicHint}」那里，我可以只问一个很小的问题吗？`, tone: "curious", emotion: "thinking" },
      { text: `「${topicHint}」这个点有点勾我，但不急，想聊再聊。`, tone: "soft", emotion: "thinking" }
    ];
  }
  if (policy === "soft_checkin") {
    return [
      { text: `如果你还想聊「${topicHint}」，我在这边慢慢听。`, tone: "soft", emotion: "happy" },
      { text: `「${topicHint}」可以先放着，我会记得这个线头。`, tone: "soft", emotion: "thinking" },
      { text: `想继续的话，我可以陪你把「${topicHint}」轻轻接下去。`, tone: "soft", emotion: "happy" }
    ];
  }
  return [
    { text: `刚才「${topicHint}」这个点我还在想，要不要先轻轻放在这里？`, tone: "gentle", emotion: "thinking" },
    { text: `我把「${topicHint}」这根线先捏在手里，你想接的时候我还在。`, tone: "gentle", emotion: "thinking" },
    { text: `关于「${topicHint}」，我有个很轻的小想法，不过不打扰你。`, tone: "gentle", emotion: "thinking" }
  ];
}

function selectConversationFollowupReactionCandidate(plan, candidatesInput) {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const candidates = Array.isArray(candidatesInput)
    ? candidatesInput.filter((item) => item && typeof item === "object" && String(item.text || "").trim())
    : buildConversationFollowupReactionCandidates(safePlan);
  if (!candidates.length) {
    return {
      candidate: null,
      index: -1,
      reason: "no_candidates",
      preferredTone: "",
      candidateCount: 0
    };
  }

  const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
  const reason = String(safePlan.reason || "").trim().toLowerCase();
  const updatedAgeMs = Number(safePlan.updatedAgeMs);
  let preferredTone = "gentle";
  let selectionReason = "default_gentle";

  if (policy === "do_not_followup") {
    preferredTone = "quiet";
    selectionReason = "policy_quiet";
  } else if (policy === "light_question" || reason.includes("question")) {
    preferredTone = "curious";
    selectionReason = "question_context";
  } else if (policy === "soft_checkin") {
    preferredTone = "soft";
    selectionReason = "soft_checkin_policy";
  } else if (Number.isFinite(updatedAgeMs) && updatedAgeMs >= 10 * 60 * 1000) {
    preferredTone = "soft";
    selectionReason = "long_silence_soften";
  }

  let index = candidates.findIndex((item) => String(item.tone || "") === preferredTone);
  if (index < 0) {
    index = 0;
    selectionReason = selectionReason + "_fallback_first";
  }

  return {
    candidate: candidates[index],
    index,
    reason: selectionReason,
    preferredTone,
    candidateCount: candidates.length
  };
}

function buildConversationFollowupDebugPlan(nowMs = Date.now()) {
  const now = Number(nowMs);
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const conversationMode = state.conversationMode && typeof state.conversationMode === "object"
    ? state.conversationMode
    : {};
  const conversationEnabled = conversationMode.enabled === true;
  const proactiveEnabled = conversationMode.proactiveEnabled === true;
  const silenceFollowupMinMs = Number.isFinite(Number(conversationMode.silenceFollowupMinMs))
    ? Math.max(0, Math.round(Number(conversationMode.silenceFollowupMinMs)))
    : 180000;
  const followupPending = state.followupPending === true;
  const topicHint = String(state.followupTopicHint || "").trim();
  const reason = String(state.followupReason || "").trim();
  const followupUpdatedAt = Number(state.followupUpdatedAt || 0);
  const updatedAgeMs = followupUpdatedAt > 0
    ? Math.max(0, Math.round(safeNow - followupUpdatedAt))
    : -1;
  const policy = buildConversationFollowupPolicy({ reason, topicHint, updatedAgeMs });
  const characterCue = buildConversationFollowupCharacterCue({
    reason,
    topicHint,
    followupPolicy: policy.type,
    updatedAgeMs
  });
  const reactionCandidates = buildConversationFollowupReactionCandidates({
    reason,
    topicHint,
    followupPolicy: policy.type,
    updatedAgeMs
  });
  const selectedReaction = selectConversationFollowupReactionCandidate({
    reason,
    topicHint,
    followupPolicy: policy.type,
    updatedAgeMs
  }, reactionCandidates);
  const characterPreview = selectedReaction.candidate?.text || "";

  const blockedReasons = [];
  if (!conversationEnabled) {
    blockedReasons.push("conversation_disabled");
  }
  if (!proactiveEnabled) {
    blockedReasons.push("proactive_disabled");
  }
  if (!followupPending) {
    blockedReasons.push("no_pending_followup");
  }
  if (!topicHint) {
    blockedReasons.push("empty_topic_hint");
  }
  if (state.chatBusy) {
    blockedReasons.push("chat_busy");
  }
  if (isSpeakingNow()) {
    blockedReasons.push("speaking");
  }
  if (updatedAgeMs < 0 || updatedAgeMs < silenceFollowupMinMs) {
    blockedReasons.push("silence_window_not_reached");
  }
  if (policy.type === "do_not_followup") {
    blockedReasons.push(policy.blockedReason || "policy_do_not_followup");
  }

  return {
    eligible: blockedReasons.length === 0,
    reason,
    topicHint,
    followupPolicy: policy.type,
    followupPolicyNote: policy.note,
    characterCue,
    characterPreview,
    reactionCandidates,
    selectedReaction,
    updatedAgeMs,
    conversationEnabled,
    proactiveEnabled,
    silenceFollowupMinMs,
    blockedReasons
  };
}

function buildConversationFollowupDebugView(nowMs = Date.now()) {
  const plan = buildConversationFollowupDebugPlan(nowMs);
  return {
    ...plan,
    promptDraft: buildConversationFollowupPromptDraft(plan),
    characterCue: plan.characterCue || buildConversationFollowupCharacterCue(plan),
    silence: buildConversationSilenceDebugSnapshot(nowMs)
  };
}

function buildConversationFollowupPromptDraft(plan) {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  if (safePlan.eligible !== true) {
    return "";
  }
  const reason = String(safePlan.reason || "").trim() || "followup_pending";
  const policy = String(safePlan.followupPolicy || "gentle_continue").trim() || "gentle_continue";
  const cue = safePlan.characterCue && typeof safePlan.characterCue === "object"
    ? safePlan.characterCue
    : buildConversationFollowupCharacterCue(safePlan);
  let topicHint = String(safePlan.topicHint || "").replace(/\s+/g, " ").trim();
  if (!topicHint) {
    return "";
  }
  if (topicHint.length > 80) {
    topicHint = topicHint.slice(0, 80).trim();
  }
  const policyInstruction = {
    gentle_continue: "策略：轻轻续一句，不重开新话题，不扩大问题范围。",
    light_question: "策略：如果追问，只能追一个很轻的小问题；也可以改成一句自然承接。",
    soft_checkin: "策略：强调“想聊再聊也可以”，不要催促用户继续。"
  }[policy] || "策略：轻轻续一句，不重开新话题，不扩大问题范围。";
  return [
    "你正在生成一次低打扰的主动续话，不是系统通知。",
    "请基于上一轮未收口的话题，用自然、温和的角色口吻仅输出一句可忽略的续话或轻追问。",
    "角色方向：像住在桌面边上的小伙伴，轻轻冒泡，有一点性格，但不要夸张表演。",
    `语气建议: ${cue.tone || "温和、短句、低压力"}`,
    `情绪建议: emotion=${cue.emotion || "thinking"}, action=${cue.action || "think"}, intensity=${cue.intensity || "low"}, voice_style=${cue.voiceStyle || "soft"}`,
    `参考感觉: ${cue.sample || "我刚才还在想那个点，要不要轻轻接一下？"}`,
    policyInstruction,
    "保持简短，不要催促用户立刻回复，不要连续追问，不要长篇解释。",
    "安全边界：不要读取或猜测桌面、屏幕、文件、隐私数据；不要调用工具。",
    "如果 character_runtime 要求返回元信息，只能使用允许字段 emotion/action/intensity/voice_style/live2d_hint，并把正文保持为自然中文。",
    `角色线索: ${cue.persona || "低打扰陪伴型角色"}`,
    `续话策略: ${policy}`,
    `续话原因: ${reason}`,
    `话题线索: ${topicHint}`
  ].join("\n");
}

function previewConversationFollowupPolicy(input = {}) {
  const safeInput = input && typeof input === "object" ? input : {};
  const reason = String(safeInput.reason || "followup_pending").trim() || "followup_pending";
  const topicHint = String(safeInput.topicHint || safeInput.text || "").replace(/\s+/g, " ").trim();
  const policy = buildConversationFollowupPolicy({ reason, topicHint });
  const characterCue = buildConversationFollowupCharacterCue({
    reason,
    topicHint,
    followupPolicy: policy.type,
    updatedAgeMs: 0
  });
  const reactionCandidates = buildConversationFollowupReactionCandidates({
    reason,
    topicHint,
    followupPolicy: policy.type,
    updatedAgeMs: 0
  });
  const selectedReaction = selectConversationFollowupReactionCandidate({
    reason,
    topicHint,
    followupPolicy: policy.type,
    updatedAgeMs: 0
  }, reactionCandidates);
  const characterPreview = selectedReaction.candidate?.text || "";
  const blockedReasons = [];
  if (!topicHint) {
    blockedReasons.push("empty_topic_hint");
  }
  if (policy.type === "do_not_followup") {
    blockedReasons.push(policy.blockedReason || "policy_do_not_followup");
  }
  const plan = {
    eligible: blockedReasons.length === 0,
    reason,
    topicHint,
    followupPolicy: policy.type,
    followupPolicyNote: policy.note,
    characterCue,
    characterPreview,
    reactionCandidates,
    selectedReaction,
    updatedAgeMs: 0,
    conversationEnabled: true,
    proactiveEnabled: true,
    silenceFollowupMinMs: 0,
    blockedReasons
  };
  return {
    ...plan,
    promptDraft: buildConversationFollowupPromptDraft(plan)
  };
}

function getConversationFollowupPolicyDebugText(view) {
  const policy = String(view?.followupPolicy || "").trim();
  const topicHint = String(view?.topicHint || "").trim();
  if (!policy || !topicHint) {
    return "";
  }
  if (policy === "do_not_followup") {
    return "do_not_followup:policy_do_not_followup";
  }
  const blockedReason = String(view?.followupPolicy === "do_not_followup"
    ? (view?.followupPolicyNote || "policy_do_not_followup")
    : (view?.followupPolicyNote || "")
  ).trim();
  return blockedReason ? `${policy}:${blockedReason}` : policy;
}

function snapshotConversationFollowupPending() {
  return {
    pending: state.followupPending === true,
    reason: String(state.followupReason || ""),
    topicHint: String(state.followupTopicHint || ""),
    updatedAt: Number(state.followupUpdatedAt || 0)
  };
}

function restoreConversationFollowupPending(snapshot) {
  const safe = snapshot && typeof snapshot === "object" ? snapshot : {};
  state.followupPending = safe.pending === true;
  state.followupReason = String(safe.reason || "");
  state.followupTopicHint = String(safe.topicHint || "");
  state.followupUpdatedAt = Number.isFinite(Number(safe.updatedAt))
    ? Math.max(0, Math.round(Number(safe.updatedAt)))
    : 0;
}

function clearConversationFollowupPending(nowMs = Date.now()) {
  const now = Number(nowMs);
  state.followupPending = false;
  state.followupReason = "";
  state.followupTopicHint = "";
  state.followupUpdatedAt = Number.isFinite(now) ? Math.max(0, Math.round(now)) : 0;
}

function snapshotConversationFollowupPendingFixtureState() {
  const mode = state.conversationMode && typeof state.conversationMode === "object"
    ? { ...state.conversationMode }
    : null;
  return {
    pending: snapshotConversationFollowupPending(),
    conversationMode: mode,
    conversationLastUserAt: Number(state.conversationLastUserAt || 0),
    conversationLastAssistantAt: Number(state.conversationLastAssistantAt || 0),
    conversationLastTtsFinishedAt: Number(state.conversationLastTtsFinishedAt || 0)
  };
}

function restoreConversationFollowupPendingFixtureState(snapshot) {
  const safe = snapshot && typeof snapshot === "object" ? snapshot : {};
  restoreConversationFollowupPending(safe.pending);
  if (safe.conversationMode && typeof safe.conversationMode === "object") {
    state.conversationMode = { ...safe.conversationMode };
  }
  state.conversationLastUserAt = Number.isFinite(Number(safe.conversationLastUserAt))
    ? Math.max(0, Math.round(Number(safe.conversationLastUserAt)))
    : 0;
  state.conversationLastAssistantAt = Number.isFinite(Number(safe.conversationLastAssistantAt))
    ? Math.max(0, Math.round(Number(safe.conversationLastAssistantAt)))
    : 0;
  state.conversationLastTtsFinishedAt = Number.isFinite(Number(safe.conversationLastTtsFinishedAt))
    ? Math.max(0, Math.round(Number(safe.conversationLastTtsFinishedAt)))
    : 0;
}

function runConversationFollowupPendingFixture(input = {}) {
  const startedAt = Date.now();
  const previous = snapshotConversationFollowupPendingFixtureState();
  const safeInput = input && typeof input === "object" ? input : {};
  const reason = String(safeInput.reason || "followup_pending").trim() || "followup_pending";
  const topicHint = String(
    safeInput.topicHint || safeInput.text || "\u5148\u8fd9\u6837\uff0c\u665a\u5b89"
  ).replace(/\s+/g, " ").trim();
  let result = null;

  try {
    if (!state.conversationMode || typeof state.conversationMode !== "object") {
      state.conversationMode = {
        enabled: false,
        proactiveEnabled: false,
        proactiveSchedulerEnabled: false,
        proactiveCooldownMs: 600000,
        proactiveWarmupMs: 120000,
        proactiveWindowMs: 3600000,
        proactivePollIntervalMs: 60000,
        maxFollowupsPerWindow: 1,
        silenceFollowupMinMs: 180000,
        interruptTtsOnUserSpeech: false
      };
    }
    const silenceFollowupMinMs = Number.isFinite(Number(state.conversationMode.silenceFollowupMinMs))
      ? Math.max(0, Math.round(Number(state.conversationMode.silenceFollowupMinMs)))
      : 180000;
    const oldEnoughAt = Math.max(0, startedAt - Math.max(silenceFollowupMinMs + 1000, 30000));

    state.conversationMode.enabled = true;
    state.conversationMode.proactiveEnabled = true;
    state.conversationMode.proactiveSchedulerEnabled = true;
    state.followupPending = true;
    state.followupReason = reason;
    state.followupTopicHint = topicHint;
    state.followupUpdatedAt = oldEnoughAt;
    state.conversationLastUserAt = oldEnoughAt;
    state.conversationLastAssistantAt = oldEnoughAt;
    state.conversationLastTtsFinishedAt = oldEnoughAt;

    const preview = previewConversationFollowupPolicy({ reason, topicHint });
    const snapshotFollowup = getTTSDebugSnapshot().followup;
    const conversationFollowup = buildConversationFollowupDebugView(startedAt);
    const proactiveScheduler = buildProactiveSchedulerDebugSnapshot(startedAt);
    const policyText = getConversationFollowupPolicyDebugText(conversationFollowup);
    const silenceBlockedReasons = Array.isArray(conversationFollowup?.silence?.blockedReasons)
      ? conversationFollowup.silence.blockedReasons.slice()
      : [];

    recordTTSDebugEvent("conversation_followup_pending_fixture_checked", {
      text: topicHint,
      result: silenceBlockedReasons.join(",") || "silence_checked",
      error: policyText || reason
    });

    result = {
      ok: true,
      fixture: {
        reason,
        topicHint,
        silenceAgeMs: Math.max(0, startedAt - oldEnoughAt),
        temporaryGatesEnabled: true
      },
      preview: {
        followupPolicy: preview.followupPolicy,
        eligible: preview.eligible,
        blockedReasons: Array.isArray(preview.blockedReasons) ? preview.blockedReasons.slice() : [],
        promptDraftEmpty: !String(preview.promptDraft || "").trim()
      },
      snapshotFollowup: {
        pending: snapshotFollowup.pending,
        eligible: snapshotFollowup.eligible,
        blockedReasons: Array.isArray(snapshotFollowup.blockedReasons)
          ? snapshotFollowup.blockedReasons.slice()
          : [],
        policy: snapshotFollowup.policy,
        policyBlockedReason: snapshotFollowup.policyBlockedReason
      },
      conversationFollowup: {
        eligible: conversationFollowup.eligible,
        blockedReasons: Array.isArray(conversationFollowup.blockedReasons)
          ? conversationFollowup.blockedReasons.slice()
          : [],
        followupPolicy: conversationFollowup.followupPolicy,
        promptDraftEmpty: !String(conversationFollowup.promptDraft || "").trim(),
        silence: {
          eligibleForSilenceFollowup: conversationFollowup.silence?.eligibleForSilenceFollowup,
          blockedReasons: silenceBlockedReasons,
          followupPolicy: conversationFollowup.silence?.followupPolicy
        }
      },
      proactiveScheduler: {
        eligibleForSchedulerTick: proactiveScheduler.eligibleForSchedulerTick,
        blockedReasons: Array.isArray(proactiveScheduler.blockedReasons)
          ? proactiveScheduler.blockedReasons.slice()
          : [],
        pollTimerActive: proactiveScheduler.pollTimerActive,
        lastResult: proactiveScheduler.lastResult
      }
    };
  } catch (err) {
    const errorText = String(err?.message || err || "fixture_error");
    recordTTSDebugEvent("conversation_followup_pending_fixture_failed", {
      text: topicHint,
      result: "fixture_error",
      error: errorText
    });
    result = {
      ok: false,
      reason: "fixture_error",
      error: errorText
    };
  } finally {
    restoreConversationFollowupPendingFixtureState(previous);
  }

  const endedAt = Date.now();
  return {
    ...result,
    restored: true,
    afterRestore: {
      pending: state.followupPending === true,
      reason: String(state.followupReason || ""),
      topicHint: String(state.followupTopicHint || ""),
      conversationEnabled: state.conversationMode?.enabled === true,
      proactiveEnabled: state.conversationMode?.proactiveEnabled === true,
      proactiveSchedulerEnabled: state.conversationMode?.proactiveSchedulerEnabled === true
    },
    recentEvents: state.ttsDebugEvents.slice(-30).map((event) => ({
      type: event.type,
      text: event.text,
      result: event.result,
      error: event.error
    })),
    startedAt,
    endedAt,
    elapsedMs: Math.max(0, endedAt - startedAt)
  };
}

async function runConversationFollowupDebug() {
  const startedAt = Date.now();
  const plan = buildConversationFollowupDebugView(startedAt);
  const blockedSummary = Array.isArray(plan.blockedReasons) ? plan.blockedReasons.join(",") : "";
  const reasonText = String(plan.reason || "");
  const topicHintText = String(plan.topicHint || "");
  const policyText = getConversationFollowupPolicyDebugText(plan);
  const finishResult = (result) => {
    const endedAt = Date.now();
    return {
      ...result,
      plan,
      startedAt,
      endedAt,
      elapsedMs: Math.max(0, endedAt - startedAt)
    };
  };

  if (!plan.eligible || !plan.promptDraft) {
    recordTTSDebugEvent("conversation_followup_not_eligible", {
      text: topicHintText,
      result: blockedSummary || "not_eligible",
      error: policyText || reasonText
    });
    return finishResult({
      ok: false,
      reason: "not_eligible",
      consumedPending: false,
      restoredPending: false
    });
  }
  if (typeof requestAssistantReply !== "function") {
    recordTTSDebugEvent("conversation_followup_failed", {
      text: topicHintText,
      result: "no_safe_entrypoint",
      error: policyText || reasonText
    });
    return finishResult({
      ok: false,
      reason: "no_safe_entrypoint",
      consumedPending: false,
      restoredPending: false
    });
  }

  const pendingSnapshot = snapshotConversationFollowupPending();
  recordTTSDebugEvent("conversation_followup_start", {
    text: topicHintText,
    result: reasonText || "followup_pending",
    error: policyText
  });
  clearConversationFollowupPending(startedAt);
  const followupInput = `（debug/manual follow-up）\n${plan.promptDraft}`;
  try {
    const ok = await requestAssistantReply(followupInput, {
      showUser: false,
      rememberUser: false,
      rememberAssistant: true,
      auto: true,
      skipDesktopAttach: true,
      silentError: true,
      userDisplayText: "[debug/manual follow-up]"
    });

    if (ok) {
      recordTTSDebugEvent("conversation_followup_success", {
        text: topicHintText,
        result: reasonText || "followup_pending",
        error: policyText
      });
      return finishResult({
        ok: true,
        reason: "started",
        consumedPending: true,
        restoredPending: false
      });
    }

    restoreConversationFollowupPending(pendingSnapshot);
    recordTTSDebugEvent("conversation_followup_restore_pending", {
      text: sanitizeTTSDebugText(pendingSnapshot.topicHint || topicHintText),
      result: pendingSnapshot.reason || reasonText || "restore"
    });
    recordTTSDebugEvent("conversation_followup_failed", {
      text: topicHintText,
      result: "request_failed",
      error: policyText || reasonText
    });
    return finishResult({
      ok: false,
      reason: "request_failed",
      consumedPending: false,
      restoredPending: true
    });
  } catch (err) {
    restoreConversationFollowupPending(pendingSnapshot);
    const errorText = String(err?.message || err || "request_exception");
    recordTTSDebugEvent("conversation_followup_restore_pending", {
      text: sanitizeTTSDebugText(pendingSnapshot.topicHint || topicHintText),
      result: pendingSnapshot.reason || reasonText || "restore"
    });
    recordTTSDebugEvent("conversation_followup_failed", {
      text: topicHintText,
      result: "request_exception",
      error: policyText ? `${policyText};${errorText}` : errorText
    });
    return finishResult({
      ok: false,
      reason: "request_exception",
      consumedPending: false,
      restoredPending: true
    });
  }
}

async function runConversationSilenceFollowupDryRun() {
  const startedAt = Date.now();
  const view = buildConversationFollowupDebugView(startedAt);
  if (view?.silence?.eligibleForSilenceFollowup !== true) {
    const endedAt = Date.now();
    recordTTSDebugEvent("conversation_silence_followup_blocked", {
      text: String(view?.topicHint || ""),
      result: Array.isArray(view?.silence?.blockedReasons)
        ? view.silence.blockedReasons.join(",")
        : "silence_not_eligible",
      error: getConversationFollowupPolicyDebugText(view) || String(view?.reason || "")
    });
    return {
      ok: false,
      reason: "silence_not_eligible",
      view,
      startedAt,
      endedAt,
      elapsedMs: Math.max(0, endedAt - startedAt)
    };
  }

  recordTTSDebugEvent("conversation_silence_followup_manual_start", {
    text: String(view?.topicHint || ""),
    result: String(view?.reason || "silence_eligible"),
    error: getConversationFollowupPolicyDebugText(view)
  });
  const result = await runConversationFollowupDebug();
  return {
    ...result,
    silenceDryRun: true,
    silenceEligibleAtStart: true,
    silenceStartedAt: startedAt
  };
}

async function runProactiveSchedulerManualTick() {
  const startedAt = Date.now();
  const scheduler = buildProactiveSchedulerDebugSnapshot(startedAt);
  state.proactiveLastAttemptAt = startedAt;
  const finishResult = (result) => {
    const endedAt = Date.now();
    return {
      ...result,
      schedulerManualTick: true,
      schedulerStartedAt: startedAt,
      scheduler,
      startedAt,
      endedAt,
      elapsedMs: Math.max(0, endedAt - startedAt)
    };
  };

  if (scheduler.eligibleForSchedulerTick !== true) {
    const blockedReason = Array.isArray(scheduler.blockedReasons) && scheduler.blockedReasons.length
      ? scheduler.blockedReasons.join(",")
      : "scheduler_not_eligible";
    state.proactiveLastBlockedReason = blockedReason;
    state.proactiveLastResult = "blocked";
    recordTTSDebugEvent("proactive_scheduler_manual_blocked", {
      result: blockedReason
    });
    return finishResult({
      ok: false,
      reason: "scheduler_not_eligible",
      schedulerEligibleAtStart: false
    });
  }

  recordTTSDebugEvent("proactive_scheduler_manual_start", {
    result: "scheduler_eligible"
  });
  state.proactiveInFlight = true;
  try {
    const dryRunResult = await runConversationSilenceFollowupDryRun();
    const finishedAt = Date.now();
    const proactiveCooldownMs = Number.isFinite(Number(state.conversationMode?.proactiveCooldownMs))
      ? Math.max(0, Math.round(Number(state.conversationMode.proactiveCooldownMs)))
      : 600000;
    const proactiveWindowMs = Number.isFinite(Number(state.conversationMode?.proactiveWindowMs))
      ? Math.max(0, Math.round(Number(state.conversationMode.proactiveWindowMs)))
      : 3600000;

    if (dryRunResult?.ok === true) {
      const windowStart = Number(state.proactiveWindowStartedAt || 0);
      if (!(windowStart > 0) || (finishedAt - windowStart) > proactiveWindowMs) {
        state.proactiveWindowStartedAt = finishedAt;
        state.proactiveCountInWindow = 0;
      }
      state.proactiveLastTriggeredAt = finishedAt;
      state.proactiveCooldownUntil = finishedAt + proactiveCooldownMs;
      state.proactiveCountInWindow = Math.max(
        0,
        Math.round(Number(state.proactiveCountInWindow || 0))
      ) + 1;
      state.proactiveLastBlockedReason = "";
      state.proactiveLastResult = "success";
      recordTTSDebugEvent("proactive_scheduler_manual_success", {
        result: "success",
        durationMs: Number(dryRunResult?.elapsedMs || 0)
      });
      return finishResult({
        ...dryRunResult,
        ok: true,
        schedulerEligibleAtStart: true
      });
    }

    const silenceBlockedReasons = Array.isArray(dryRunResult?.view?.silence?.blockedReasons)
      ? dryRunResult.view.silence.blockedReasons.join(",")
      : "";
    const blockedReason = String(dryRunResult?.reason || silenceBlockedReasons || "manual_tick_failed");
    state.proactiveLastBlockedReason = blockedReason;
    const failedReasons = new Set(["request_failed", "request_exception", "no_safe_entrypoint"]);
    state.proactiveLastResult = failedReasons.has(String(dryRunResult?.reason || "")) ? "failed" : "blocked";
    const shortCooldownMs = Math.min(proactiveCooldownMs, 60000);
    state.proactiveCooldownUntil = finishedAt + shortCooldownMs;
    recordTTSDebugEvent("proactive_scheduler_manual_failed", {
      result: blockedReason,
      error: String(dryRunResult?.reason || "")
    });
    return finishResult({
      ...dryRunResult,
      ok: false,
      schedulerEligibleAtStart: true
    });
  } catch (err) {
    const finishedAt = Date.now();
    const proactiveCooldownMs = Number.isFinite(Number(state.conversationMode?.proactiveCooldownMs))
      ? Math.max(0, Math.round(Number(state.conversationMode.proactiveCooldownMs)))
      : 600000;
    const shortCooldownMs = Math.min(proactiveCooldownMs, 60000);
    const errorText = String(err?.message || err || "manual_tick_exception");
    state.proactiveLastBlockedReason = errorText;
    state.proactiveLastResult = "failed";
    state.proactiveCooldownUntil = finishedAt + shortCooldownMs;
    recordTTSDebugEvent("proactive_scheduler_manual_failed", {
      result: "exception",
      error: errorText
    });
    return finishResult({
      ok: false,
      reason: "manual_tick_exception",
      error: errorText,
      schedulerEligibleAtStart: true
    });
  } finally {
    state.proactiveInFlight = false;
  }
}

async function runProactiveSchedulerPollingCheck() {
  try {
    const injectedFailure = consumeProactiveSchedulerPollFailureInjection();
    if (injectedFailure) {
      throw new Error(injectedFailure.reason || "manual_debug_injection");
    }
    const gateStatus = getProactiveSchedulerPollingGateStatus();
    if (!gateStatus.enabled) {
      const gateReason = gateStatus.blockedReasons.join(",") || "polling_disabled";
      state.proactivePollLastResult = "disabled";
      if (state.proactivePollTimerId) {
        stopProactiveSchedulerPolling(`runtime_gate_off:${gateReason}`);
      }
      recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
        result: gateReason
      });
      return;
    }
    const startedAt = Date.now();
    state.proactiveLastPollAt = startedAt;
    const scheduler = buildProactiveSchedulerDebugSnapshot(startedAt);
    const followupView = buildConversationFollowupDebugView(startedAt);
    const followupPolicyText = getConversationFollowupPolicyDebugText(followupView);
    if (scheduler.eligibleForSchedulerTick !== true) {
      state.proactivePollLastResult = "blocked";
      recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
        text: String(followupView?.topicHint || ""),
        result: Array.isArray(scheduler.blockedReasons) && scheduler.blockedReasons.length
          ? scheduler.blockedReasons.join(",")
          : "poll_blocked",
        error: followupPolicyText
      });
      return;
    }
    const silenceBlocked = Array.isArray(followupView?.silence?.blockedReasons)
      ? followupView.silence.blockedReasons.join(",")
      : "";
    if (followupView?.silence?.eligibleForSilenceFollowup !== true) {
      state.proactivePollLastResult = "not_ready";
      recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
        text: String(followupView?.topicHint || ""),
        result: silenceBlocked || "silence_not_ready",
        error: followupPolicyText
      });
      return;
    }
    state.proactivePollLastResult = "ready";
    recordTTSDebugEvent("proactive_scheduler_poll_ready", {
      text: String(followupView?.topicHint || ""),
      result: "silence_ready",
      error: followupPolicyText
    });
    if (!shouldEnableProactiveSchedulerPolling()) {
      state.proactivePollLastResult = "disabled";
      if (state.proactivePollTimerId) {
        stopProactiveSchedulerPolling("runtime_gate_off:before_trigger");
      }
      recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
        text: String(followupView?.topicHint || ""),
        result: "runtime_gate_off_before_trigger",
        error: followupPolicyText
      });
      return;
    }
    const triggerResult = await runProactiveSchedulerManualTick();
    if (triggerResult?.ok === true) {
      state.proactivePollLastResult = "triggered";
      recordTTSDebugEvent("proactive_scheduler_poll_trigger_success", {
        text: String(followupView?.topicHint || ""),
        result: String(triggerResult?.reason || "started"),
        error: followupPolicyText
      });
      return;
    }
    state.proactivePollLastResult = "trigger_blocked";
    recordTTSDebugEvent("proactive_scheduler_poll_trigger_blocked", {
      text: String(followupView?.topicHint || ""),
      result: String(triggerResult?.reason || "trigger_not_started"),
      error: followupPolicyText
    });
  } catch (err) {
    state.proactivePollLastResult = "failed";
    if (state.proactivePollTimerId) {
      stopProactiveSchedulerPolling("poll_exception_fail_closed");
    }
    state.proactivePollLastResult = "failed";
    recordTTSDebugEvent("proactive_scheduler_poll_failed", {
      result: "poll_exception",
      error: String(err?.message || err || "poll_exception")
    });
  }
}

function normalizeProactiveSchedulerPollFailureReason(reason) {
  const text = String(reason || "manual_debug_injection")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 80);
  return text || "manual_debug_injection";
}

function injectProactiveSchedulerPollFailureOnce(reason = "manual_debug_injection") {
  const normalizedReason = normalizeProactiveSchedulerPollFailureReason(reason);
  state.proactivePollFailureInjection = {
    reason: normalizedReason,
    createdAt: Date.now()
  };
  recordTTSDebugEvent("proactive_scheduler_poll_failure_injected", {
    result: normalizedReason
  });
  return getProactiveSchedulerFailureInjectionState();
}

function getProactiveSchedulerFailureInjectionState() {
  const injection = state.proactivePollFailureInjection;
  if (!injection || typeof injection !== "object") {
    return {
      active: false,
      reason: "",
      ageMs: -1
    };
  }
  const createdAt = Number(injection.createdAt || 0);
  return {
    active: true,
    reason: String(injection.reason || "manual_debug_injection"),
    ageMs: createdAt > 0 ? Math.max(0, Date.now() - createdAt) : -1
  };
}

function clearProactiveSchedulerFailureInjection() {
  const previous = getProactiveSchedulerFailureInjectionState();
  state.proactivePollFailureInjection = null;
  recordTTSDebugEvent("proactive_scheduler_poll_failure_injection_cleared", {
    result: previous.active ? previous.reason : "none"
  });
  return getProactiveSchedulerFailureInjectionState();
}

function consumeProactiveSchedulerPollFailureInjection() {
  const injection = state.proactivePollFailureInjection;
  if (!injection || typeof injection !== "object") {
    return null;
  }
  state.proactivePollFailureInjection = null;
  const consumed = {
    reason: normalizeProactiveSchedulerPollFailureReason(injection.reason),
    createdAt: Number(injection.createdAt || 0) || 0
  };
  recordTTSDebugEvent("proactive_scheduler_poll_failure_injection_consumed", {
    result: consumed.reason
  });
  return consumed;
}

function stopProactiveSchedulerPolling(reason = "stop") {
  const wasActive = !!state.proactivePollTimerId;
  if (state.proactivePollTimerId) {
    clearInterval(state.proactivePollTimerId);
    state.proactivePollTimerId = 0;
  }
  state.proactivePollActive = false;
  state.proactivePollActiveIntervalMs = 0;
  state.proactivePollLastResult = "disabled";
  if (wasActive || String(reason || "") === "beforeunload") {
    recordTTSDebugEvent("proactive_scheduler_poll_stop", {
      result: String(reason || "stop")
    });
  }
}

function startProactiveSchedulerPolling() {
  const gateStatus = getProactiveSchedulerPollingGateStatus();
  if (!gateStatus.enabled) {
    stopProactiveSchedulerPolling(`gated_off:${gateStatus.blockedReasons.join(",") || "disabled"}`);
    recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
      result: gateStatus.blockedReasons.join(",") || "polling_disabled"
    });
    return;
  }
  if (state.proactivePollTimerId) {
    return;
  }
  const intervalMs = Number.isFinite(Number(state.conversationMode?.proactivePollIntervalMs))
    ? Math.max(30000, Math.min(600000, Math.round(Number(state.conversationMode.proactivePollIntervalMs))))
    : 60000;
  state.proactivePollTimerId = window.setInterval(() => {
    void runProactiveSchedulerPollingCheck();
  }, intervalMs);
  state.proactivePollActive = true;
  state.proactivePollActiveIntervalMs = intervalMs;
  state.proactivePollLastResult = "started";
  recordTTSDebugEvent("proactive_scheduler_poll_start", {
    result: `interval_ms:${intervalMs}`
  });
}

function syncProactiveSchedulerPolling() {
  const gateStatus = getProactiveSchedulerPollingGateStatus();
  if (!gateStatus.enabled) {
    stopProactiveSchedulerPolling(`sync_disabled:${gateStatus.blockedReasons.join(",") || "disabled"}`);
    recordTTSDebugEvent("proactive_scheduler_poll_blocked", {
      result: gateStatus.blockedReasons.join(",") || "polling_disabled"
    });
    return;
  }
  const desiredIntervalMs = Number.isFinite(Number(state.conversationMode?.proactivePollIntervalMs))
    ? Math.max(30000, Math.min(600000, Math.round(Number(state.conversationMode.proactivePollIntervalMs))))
    : 60000;
  const activeIntervalMs = Number.isFinite(Number(state.proactivePollActiveIntervalMs))
    ? Math.round(Number(state.proactivePollActiveIntervalMs))
    : 0;
  if (state.proactivePollTimerId && activeIntervalMs === desiredIntervalMs) {
    return;
  }
  if (state.proactivePollTimerId) {
    stopProactiveSchedulerPolling("sync_interval_change");
  }
  startProactiveSchedulerPolling();
}

function buildTTSDebugReport() {
  const s = getTTSDebugSnapshot();
  const lines = [
    "TTS debug:",
    `provider=${s.provider}`,
    `speakingEnabled=${s.speakingEnabled}`,
    `streamMode=${s.streamMode}`,
    `streamWorking=${s.streamWorking}`,
    `queueLen=${s.queueLen}`,
    `bufferChars=${s.bufferChars}`,
    `session=${s.sessionId}`,
    `trace=${s.traceId || "(none)"}`,
    `audioPaused=${s.audioPaused}`,
    `audioEnded=${s.audioEnded}`,
    `audioReadyState=${s.audioReadyState}`,
    `audioCurrentMs=${formatTTSDebugNumber(s.currentMs)}`,
    `audioDurationMs=${formatTTSDebugNumber(s.durationMs)}`,
    `contextSpeaking=${s.contextSpeaking}`,
    `mouthOpen=${formatTTSDebugNumber(s.mouthOpen, 3)}`,
    `audioLevel=${formatTTSDebugNumber(s.audioLevel, 3)}`,
    `rawLevel=${formatTTSDebugNumber(s.rawLevel, 3)}`,
    `rms=${formatTTSDebugNumber(s.rms, 5)}`,
    `lastVoiceAgeMs=${s.lastVoiceAgeMs}`,
    `animUntilMs=${s.animUntilMs}`,
    `animDurationMs=${s.animDurationMs}`,
    `mood=${s.mood}`,
    `style=${s.style}`,
    `lastResult=${s.lastResult || "(none)"}`,
    `lastError=${s.lastError || "(none)"}`,
    `currentText=${s.currentText || "(none)"}`
  ];
  const recent = state.ttsDebugEvents.slice(-12).map((event) => {
    const ageMs = Math.round(performance.now() - Number(event.atMs || 0));
    const bits = [
      `#${event.seq}`,
      `${event.stage}`,
      `ageMs=${ageMs}`,
      event.traceId ? `trace=${event.traceId}` : "",
      event.segmentId ? `seg=${event.segmentId}` : "",
      event.blobBytes ? `bytes=${event.blobBytes}` : "",
      event.durationMs >= 0 ? `durMs=${event.durationMs}` : "",
      event.currentMs ? `curMs=${event.currentMs}` : "",
      event.result ? `result=${event.result}` : "",
      event.error ? `error=${event.error}` : "",
      event.text ? `text=${event.text}` : ""
    ].filter(Boolean);
    return bits.join(" ");
  });
  if (recent.length) {
    lines.push("recentEvents=");
    lines.push(...recent);
  } else {
    lines.push("recentEvents=none");
  }
  return lines.join("\n");
}

function ensureTTSDebugPanel() {
  if (state.ttsDebugPanel || typeof document === "undefined") {
    return state.ttsDebugPanel;
  }
  const panel = document.createElement("div");
  panel.id = "tts-debug-panel";
  panel.style.cssText = [
    "position:fixed",
    "right:14px",
    "bottom:14px",
    "z-index:99999",
    "width:min(420px,calc(100vw - 28px))",
    "max-height:52vh",
    "overflow:auto",
    "padding:12px",
    "border:1px solid rgba(120,150,170,.45)",
    "border-radius:14px",
    "background:rgba(8,18,26,.88)",
    "color:#d8f3ff",
    "font:12px/1.45 Consolas,Menlo,monospace",
    "box-shadow:0 18px 45px rgba(0,0,0,.28)",
    "backdrop-filter:blur(10px)",
    "white-space:pre-wrap",
    "display:none"
  ].join(";");
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;";
  const title = document.createElement("strong");
  title.textContent = "TTS Debug";
  title.style.cssText = "font-size:13px;color:#ffffff;";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Hide";
  close.style.cssText = "border:0;border-radius:999px;padding:4px 9px;background:#d8f3ff;color:#10202a;cursor:pointer;";
  close.addEventListener("click", () => {
    state.ttsDebugVisible = false;
    updateTTSDebugPanel();
  });
  head.appendChild(title);
  head.appendChild(close);
  const body = document.createElement("pre");
  body.style.cssText = "margin:0;white-space:pre-wrap;";
  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(panel);
  state.ttsDebugPanel = panel;
  state.ttsDebugBody = body;
  return panel;
}

function updateTTSDebugPanel() {
  if (!state.ttsDebugVisible) {
    if (state.ttsDebugPanel) {
      state.ttsDebugPanel.style.display = "none";
    }
    if (state.ttsDebugRefreshTimer) {
      clearInterval(state.ttsDebugRefreshTimer);
      state.ttsDebugRefreshTimer = 0;
    }
    return;
  }
  const panel = ensureTTSDebugPanel();
  if (!panel) {
    return;
  }
  if (!state.ttsDebugRefreshTimer) {
    state.ttsDebugRefreshTimer = window.setInterval(() => {
      if (!state.ttsDebugVisible) {
        updateTTSDebugPanel();
        return;
      }
      if (state.ttsDebugBody) {
        state.ttsDebugBody.textContent = buildTTSDebugReport();
      }
    }, 1000);
  }
  panel.style.display = "block";
  if (state.ttsDebugBody) {
    state.ttsDebugBody.textContent = buildTTSDebugReport();
  }
}

function toggleTTSDebugPanel(force = null) {
  state.ttsDebugVisible = force === null ? !state.ttsDebugVisible : !!force;
  updateTTSDebugPanel();
  return state.ttsDebugVisible;
}

function formatReadinessBool(value) {
  return value === true ? "开" : "关";
}

function formatReadinessMs(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) {
    return "n/a";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return `${Math.round(ms / 60000)}m`;
}

function joinReadinessReasons(reasons) {
  const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
  return list.length ? list.join(", ") : "none";
}

function explainReadinessReason(reason) {
  const key = String(reason || "").trim();
  const labels = {
    conversation_disabled: "会话模式未开启",
    proactive_disabled: "主动续话未开启",
    scheduler_disabled: "主动调度未开启",
    no_pending_followup: "当前没有待续接的话题",
    empty_topic_hint: "没有可继续的话题线索",
    silence_window_not_reached: "安静时间还不够",
    user_silence_window_not_reached: "用户刚刚还在互动，需要再等一会儿",
    tts_silence_window_not_reached: "语音刚结束或还没有结束记录",
    no_user_activity_timestamp: "还没有用户活动时间记录",
    no_tts_finished_timestamp: "还没有语音结束时间记录",
    policy_do_not_followup: "话题像是已经收口，所以不继续追问",
    chat_busy: "当前正在处理对话",
    speaking: "角色正在说话",
    in_flight: "已有一次主动续话正在执行",
    cooldown_active: "仍在冷却时间内",
    window_limit_reached: "当前时间窗口内续话次数已达上限",
    warmup_active: "调度器还在预热中"
  };
  return labels[key] || key || "未知原因";
}

function explainReadinessReasons(reasons) {
  const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
  return list.length ? list.map(explainReadinessReason).join("；") : "没有阻塞原因";
}

function buildFollowupReadinessFriendlySummary(followup, silence, scheduler) {
  if (followup?.eligible === true && silence?.eligibleForSilenceFollowup === true && scheduler?.eligibleForSchedulerTick === true) {
    return "可以续话：续话、安静窗口和调度器都已满足。";
  }
  if (followup?.pending !== true) {
    return "空闲：当前没有待续接的话题。";
  }
  if (String(followup?.policy || "") === "do_not_followup") {
    return "保持安静：当前话题像是已经收口，不应该继续追问。";
  }
  if (silence?.eligibleForSilenceFollowup !== true) {
    return `等待中：${explainReadinessReasons(silence?.blockedReasons)}。`;
  }
  if (scheduler?.eligibleForSchedulerTick !== true) {
    return `暂不触发：${explainReadinessReasons(scheduler?.blockedReasons)}。`;
  }
  return `暂不触发：${explainReadinessReasons(followup?.blockedReasons)}。`;
}

function buildFollowupCharacterState(followup, silence, scheduler) {
  if (followup?.pending !== true) {
    return {
      label: "安静陪伴",
      mood: "idle",
      description: "现在没有待续接的话题，适合安静待在桌面边上。"
    };
  }
  if (String(followup?.policy || "") === "do_not_followup") {
    return {
      label: "识趣闭麦",
      mood: "neutral",
      description: "话题像是已经收口，角色应该保持安静，不追问。"
    };
  }
  if (scheduler?.eligibleForSchedulerTick === true && silence?.eligibleForSilenceFollowup === true && followup?.eligible === true) {
    return {
      label: "有点想接话",
      mood: followup.characterCue?.emotion || "thinking",
      description: followup.characterPreview || "条件已满足，可以低打扰地轻轻续一句。"
    };
  }
  const schedulerReasons = Array.isArray(scheduler?.blockedReasons) ? scheduler.blockedReasons : [];
  if (schedulerReasons.includes("cooldown_active")) {
    return {
      label: "冷却中",
      mood: "neutral",
      description: "刚刚已经主动过一次，先让用户休息一下。"
    };
  }
  if (schedulerReasons.includes("window_limit_reached")) {
    return {
      label: "今天先收一收",
      mood: "neutral",
      description: "当前时间窗口里的主动续话次数已达上限。"
    };
  }
  const silenceReasons = Array.isArray(silence?.blockedReasons) ? silence.blockedReasons : [];
  if (silenceReasons.includes("user_silence_window_not_reached") || silenceReasons.includes("tts_silence_window_not_reached")) {
    return {
      label: "等你缓一会儿",
      mood: "thinking",
      description: "安静时间还不够，先不打断用户。"
    };
  }
  return {
    label: "观察气氛",
    mood: followup.characterCue?.emotion || "thinking",
    description: "有待续接的话题，但还有 guard 未满足。"
  };
}

function formatFollowupReactionCandidateSummary(candidates) {
  const list = Array.isArray(candidates) ? candidates.filter((item) => item && item.text) : [];
  if (!list.length) {
    return "n/a";
  }
  return list.slice(0, 2).map((item, index) => `${index + 1}. ${item.text}`).join(" / ");
}

function previewConversationFollowupReactions(input = {}) {
  const preview = previewConversationFollowupPolicy(input);
  return {
    policy: preview.followupPolicy,
    topicHint: preview.topicHint,
    selected: preview.selectedReaction || null,
    candidates: Array.isArray(preview.reactionCandidates) ? preview.reactionCandidates.slice() : [],
    preview: preview.characterPreview || ""
  };
}

function getFollowupCharacterStateDebugView() {
  const followup = buildConversationFollowupDebugView(Date.now());
  return buildFollowupCharacterState(
    {
      pending: state.followupPending === true,
      policy: followup.followupPolicy,
      eligible: followup.eligible === true,
      characterCue: followup.characterCue || null,
      characterPreview: followup.characterPreview || "",
      selectedReaction: followup.selectedReaction || null
    },
    followup.silence || {},
    buildProactiveSchedulerDebugSnapshot(Date.now())
  );
}

function buildFollowupCharacterChipTitle(view) {
  const description = String(view?.description || "").trim();
  const selected = view?.selectedReaction && typeof view.selectedReaction === "object"
    ? view.selectedReaction
    : null;
  const selectedText = String(selected?.candidate?.text || "").trim();
  if (!selectedText) {
    return description || "\u5f53\u524d\u7eed\u8bdd\u89d2\u8272\u72b6\u6001";
  }
  const reason = String(selected?.reason || "").trim() || "n/a";
  const tone = String(selected?.preferredTone || selected?.candidate?.tone || "").trim() || "n/a";
  return [
    description || "\u5f53\u524d\u7eed\u8bdd\u89d2\u8272\u72b6\u6001",
    `\u60f3\u63a5\u7684\u4e00\u53e5\uff1a${selectedText}`,
    `\u9009\u62e9\uff1a${reason} / tone=${tone}`
  ].join("\n");
}

function updateFollowupCharacterChip() {
  if (!ui.followupCharacterChip) {
    return;
  }
  let view = null;
  try {
    view = getFollowupCharacterStateDebugView();
  } catch (_) {
    view = { label: "安静陪伴", mood: "idle", description: "当前续话角色状态暂不可用。" };
  }
  const label = String(view.label || "安静陪伴");
  const mood = String(view.mood || "idle");
  const description = String(view.description || "");
  const selectedReaction = view.selectedReaction && typeof view.selectedReaction === "object"
    ? view.selectedReaction
    : null;
  const tone = {
    "有点想接话": "ready",
    "冷却中": "cooldown",
    "今天先收一收": "limit",
    "识趣闭麦": "quiet",
    "等你缓一会儿": "waiting",
    "观察气氛": "watching",
    "安静陪伴": "idle"
  }[label] || "idle";
  const chipTitle = buildFollowupCharacterChipTitle(view);
  ui.followupCharacterChip.textContent = `${label} · ${mood}`;
  ui.followupCharacterChip.title = chipTitle;
  ui.followupCharacterChip.setAttribute("aria-label", chipTitle);
  ui.followupCharacterChip.dataset.state = label;
  ui.followupCharacterChip.dataset.mood = mood;
  ui.followupCharacterChip.dataset.tone = tone;
  ui.followupCharacterChip.dataset.selectedTone = String(selectedReaction?.preferredTone || selectedReaction?.candidate?.tone || "");
  ui.followupCharacterChip.dataset.selectedIndex = Number.isFinite(Number(selectedReaction?.index))
    ? String(Number(selectedReaction.index))
    : "-1";
  maybeEmitFollowupCharacterRuntimeHint({ label, mood, tone });
}

function buildFollowupCharacterRuntimeHint(input = {}) {
  const tone = String(input.tone || "idle");
  const label = String(input.label || "");
  const map = {
    ready: { emotion: "thinking", action: "think", intensity: "low", voice_style: "soft" },
    waiting: { emotion: "thinking", action: "none", intensity: "low", voice_style: "soft" },
    watching: { emotion: "thinking", action: "none", intensity: "low", voice_style: "neutral" },
    cooldown: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" },
    limit: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" },
    quiet: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" },
    idle: { emotion: "neutral", action: "none", intensity: "low", voice_style: "neutral" }
  };
  return {
    ...(map[tone] || map.idle),
    live2d_hint: tone,
    source: "followup_character_state",
    label
  };
}

function maybeEmitFollowupCharacterRuntimeHint(input = {}) {
  if (state.uiView !== "chat") {
    return null;
  }
  const tone = String(input.tone || "idle");
  const now = Date.now();
  const changed = tone !== state.followupCharacterRuntimeLastTone;
  if (!changed) {
    return null;
  }
  const lastHintAt = Number(state.followupCharacterRuntimeLastHintAt || 0);
  if (lastHintAt > 0 && now - lastHintAt < 30000) {
    return null;
  }
  const hint = buildFollowupCharacterRuntimeHint(input);
  state.followupCharacterRuntimeLastTone = tone;
  state.followupCharacterRuntimeLastHintAt = now;
  state.followupCharacterRuntimeLastHint = hint;
  recordTTSDebugEvent("followup_character_runtime_hint", {
    text: String(input.label || ""),
    result: tone,
    error: String(hint.emotion || "")
  });
  try {
    return handleCharacterRuntimeMetadata(hint);
  } catch (_) {
    return null;
  }
}

function startFollowupCharacterChipRefresh() {
  updateFollowupCharacterChip();
  if (state.followupCharacterChipRefreshTimer || typeof window === "undefined") {
    return;
  }
  state.followupCharacterChipRefreshTimer = window.setInterval(() => {
    updateFollowupCharacterChip();
  }, 2000);
}

function buildFollowupAwareIdleMotionContext() {
  try {
    const view = getFollowupCharacterStateDebugView();
    const label = String(view?.label || "");
    if (label === "有点想接话") {
      return { combo: false, idleIntent: "thinking", idleMood: "idle", style: "clear" };
    }
    if (label === "观察气氛" || label === "等你缓一会儿") {
      return { combo: false, idleIntent: "thinking", idleMood: "idle", style: "comfort" };
    }
    if (label === "识趣闭麦" || label === "冷却中" || label === "今天先收一收") {
      return { combo: false, idleIntent: "idle", idleMood: "idle", style: "steady" };
    }
  } catch (_) {
    // Idle motion should never affect the main chat or scheduler flow.
  }
  return { combo: false, idleIntent: "idle", idleMood: "idle" };
}

function buildFollowupReadinessReport() {
  const snapshot = getTTSDebugSnapshot();
  const mode = snapshot.conversationMode || {};
  const followup = snapshot.followup || {};
  const silence = snapshot.silence || {};
  const scheduler = snapshot.proactiveScheduler || {};
  const characterState = buildFollowupCharacterState(followup, silence, scheduler);
  const switchesReady = mode.enabled === true && mode.proactiveEnabled === true && mode.proactiveSchedulerEnabled === true;
  const lines = [
    "\u7eed\u8bdd\u72b6\u6001",
    "",
    "\u6458\u8981",
    buildFollowupReadinessFriendlySummary(followup, silence, scheduler),
    `\u89d2\u8272\u72b6\u6001\uff1a${characterState.label}  \u5fc3\u60c5\uff1a${characterState.mood}`,
    `\u72b6\u6001\u8bf4\u660e\uff1a${characterState.description}`,
    switchesReady
      ? "\u4e09\u5c42\u5f00\u5173\u90fd\u5df2\u5f00\u542f\uff0c\u4f46\u4ecd\u4f1a\u7ee7\u7eed\u53d7\u5b89\u9759\u7a97\u53e3\u3001\u51b7\u5374\u3001\u6b21\u6570\u4e0a\u9650\u548c\u7b56\u7565\u4fdd\u62a4\u3002"
      : "\u5f53\u524d\u4ecd\u6709\u5f00\u5173\u672a\u5f00\u542f\uff0c\u6240\u4ee5\u4e0d\u4f1a\u81ea\u52a8\u7eed\u8bdd\u3002",
    "",
    "\u5f53\u524d\u5f00\u5173",
    `\u4f1a\u8bdd\u6a21\u5f0f\uff1a${formatReadinessBool(mode.enabled)}`,
    `\u4e3b\u52a8\u7eed\u8bdd\uff1a${formatReadinessBool(mode.proactiveEnabled)}`,
    `\u8c03\u5ea6\u5668\uff1a${formatReadinessBool(mode.proactiveSchedulerEnabled)}`,
    "",
    "\u5982\u4f55\u8c03\u6574",
    "1. \u6253\u5f00 config.local.json\u3002",
    "2. \u4fee\u6539 conversation_mode \u91cc\u7684 enabled / proactive_enabled / proactive_scheduler_enabled\u3002",
    "3. \u4fdd\u5b58\u540e\u91cd\u542f\u5e94\u7528\u751f\u6548\u3002",
    "4. \u5982\u679c\u60f3\u7acb\u523b\u505c\u7528\uff0c\u5173\u95ed\u4efb\u610f\u4e00\u4e2a\u5f00\u5173\u5373\u53ef\u3002",
    "",
    "\u5b89\u5168\u9ed8\u8ba4",
    "\u9ed8\u8ba4\u4e0d\u4e3b\u52a8\u89c2\u5bdf\u684c\u9762\uff0c\u4e0d\u8bfb\u6587\u4ef6\uff0c\u4e0d\u8c03\u7528\u5de5\u5177\uff0c\u4e0d\u6267\u884c\u547d\u4ee4\u3002",
    "\u81ea\u52a8\u7eed\u8bdd\u53ea\u4f1a\u5728\u591a\u5c42 guard \u5168\u90e8\u901a\u8fc7\u540e\u5c1d\u8bd5\uff0c\u5e76\u4e14\u4f1a\u907f\u5f00\u5df2\u6536\u53e3\u7684\u8bdd\u9898\u3002",
    "",
    "\u7eed\u8bdd\u8be6\u60c5",
    `\u5f85\u5904\u7406\uff1a${followup.pending === true ? "\u662f" : "\u5426"}  \u7b56\u7565\uff1a${followup.policy || "n/a"}  \u53ef\u89e6\u53d1\uff1a${followup.eligible === true ? "\u662f" : "\u5426"}`,
    `\u8bdd\u9898\uff1a${followup.topicHint || "\uff08\u7a7a\uff09"}`,
    `\u89d2\u8272\u8bed\u6c14\uff1a${followup.characterCue?.tone || "n/a"}  \u60c5\u7eea\uff1a${followup.characterCue?.emotion || "n/a"} / ${followup.characterCue?.action || "n/a"}`,
    `\u672c\u5730\u9884\u89c8\uff1a${followup.characterPreview || "n/a"}`,
    `\u9009\u62e9\u7b56\u7565\uff1a${followup.selectedReaction?.reason || "n/a"}  tone=${followup.selectedReaction?.preferredTone || "n/a"}  index=${Number.isFinite(Number(followup.selectedReaction?.index)) ? Number(followup.selectedReaction.index) : -1}`,
    `\u5019\u9009\u77ed\u53e5\uff1a${formatFollowupReactionCandidateSummary(followup.reactionCandidates)}`,
    `\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(followup.blockedReasons)}`,
    `\u539f\u59cb\u539f\u56e0\uff1a${joinReadinessReasons(followup.blockedReasons)}`,
    `\u66f4\u65b0\u65f6\u95f4\uff1a${formatReadinessMs(followup.updatedAgeMs)}  \u5b89\u9759\u9608\u503c\uff1a${formatReadinessMs(mode.silenceFollowupMinMs)}`,
    "",
    "\u5b89\u9759\u7a97\u53e3",
    `\u53ef\u89e6\u53d1\uff1a${silence.eligibleForSilenceFollowup === true ? "\u662f" : "\u5426"}  \u7b56\u7565\uff1a${silence.followupPolicy || "n/a"}`,
    `\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(silence.blockedReasons)}`,
    `\u539f\u59cb\u539f\u56e0\uff1a${joinReadinessReasons(silence.blockedReasons)}`,
    `\u8ddd\u79bb\u7528\u6237\u53d1\u8a00\uff1a${formatReadinessMs(silence.lastUserAgeMs)}  \u8ddd\u79bb\u8bed\u97f3\u7ed3\u675f\uff1a${formatReadinessMs(silence.lastTtsFinishedAgeMs)}`,
    "",
    "\u8c03\u5ea6\u5668",
    `\u53ef\u89e6\u53d1\uff1a${scheduler.eligibleForSchedulerTick === true ? "\u662f" : "\u5426"}  \u8f6e\u8be2\uff1a${scheduler.pollTimerActive === true ? "\u5f00" : "\u5173"}  \u4e0a\u6b21\u8f6e\u8be2\uff1a${scheduler.pollLastResult || "n/a"}`,
    `\u963b\u585e\u539f\u56e0\uff1a${explainReadinessReasons(scheduler.blockedReasons)}`,
    `\u539f\u59cb\u539f\u56e0\uff1a${joinReadinessReasons(scheduler.blockedReasons)}`,
    `\u51b7\u5374\u5269\u4f59\uff1a${formatReadinessMs(scheduler.cooldownRemainingMs)}  \u6b21\u6570\uff1a${Number(scheduler.proactiveCountInWindow || 0)}/${Number(scheduler.maxFollowupsPerWindow || 0)}`,
    "",
    "\u5b89\u5168\u8bf4\u660e",
    "\u8fd9\u4e2a\u9762\u677f\u53ea\u8bfb\uff1a\u4e0d\u4f1a\u4fee\u6539\u914d\u7f6e\u3001\u89e6\u53d1\u7eed\u8bdd\u3001\u542f\u52a8\u8f6e\u8be2\u3001\u622a\u56fe\u3001\u5de5\u5177\u8c03\u7528\u3001\u6587\u4ef6\u8bbf\u95ee\u3001TTS\u3001fetch \u6216 LLM\u3002"
  ];
  return lines.join("\n");
}

function ensureFollowupReadinessPanel() {
  if (state.followupReadinessPanel || typeof document === "undefined") {
    return state.followupReadinessPanel;
  }
  const panel = document.createElement("div");
  panel.id = "followup-readiness-panel";
  panel.style.cssText = [
    "position:fixed",
    "left:14px",
    "bottom:14px",
    "z-index:99998",
    "width:min(460px,calc(100vw - 28px))",
    "max-height:56vh",
    "overflow:auto",
    "padding:14px",
    "border:1px solid rgba(88,117,170,.36)",
    "border-radius:18px",
    "background:rgba(244,248,255,.94)",
    "color:#24385f",
    "font:12px/1.5 Consolas,Menlo,monospace",
    "box-shadow:0 18px 45px rgba(54,70,110,.22)",
    "backdrop-filter:blur(12px)",
    "white-space:pre-wrap",
    "display:none"
  ].join(";");
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;";
  const title = document.createElement("strong");
  title.textContent = "续话状态";
  title.style.cssText = "font:700 14px/1.2 system-ui,sans-serif;color:#1f3768;";
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;align-items:center;gap:6px;";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "复制";
  copy.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#eef4ff;color:#263d70;cursor:pointer;";
  copy.addEventListener("click", () => {
    copyFollowupReadinessReportToClipboard(copy);
  });
  const copyTemplate = document.createElement("button");
  copyTemplate.type = "button";
  copyTemplate.textContent = "复制模板";
  copyTemplate.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#fff7d6;color:#5b4211;cursor:pointer;";
  copyTemplate.addEventListener("click", () => {
    copyFollowupConfigTemplateToClipboard(copyTemplate);
  });
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "隐藏";
  close.style.cssText = "border:0;border-radius:999px;padding:5px 10px;background:#dce8ff;color:#263d70;cursor:pointer;";
  close.addEventListener("click", () => {
    state.followupReadinessVisible = false;
    updateFollowupReadinessPanel();
  });
  head.appendChild(title);
  actions.appendChild(copy);
  actions.appendChild(copyTemplate);
  actions.appendChild(close);
  head.appendChild(actions);
  const body = document.createElement("pre");
  body.style.cssText = "margin:0;white-space:pre-wrap;";
  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(panel);
  state.followupReadinessPanel = panel;
  state.followupReadinessBody = body;
  return panel;
}

function updateFollowupReadinessPanel() {
  if (!state.followupReadinessVisible) {
    if (state.followupReadinessPanel) {
      state.followupReadinessPanel.style.display = "none";
    }
    if (state.followupReadinessRefreshTimer) {
      clearInterval(state.followupReadinessRefreshTimer);
      state.followupReadinessRefreshTimer = 0;
    }
    return;
  }
  const panel = ensureFollowupReadinessPanel();
  if (!panel) {
    return;
  }
  if (!state.followupReadinessRefreshTimer) {
    state.followupReadinessRefreshTimer = window.setInterval(() => {
      if (!state.followupReadinessVisible) {
        updateFollowupReadinessPanel();
        return;
      }
      if (state.followupReadinessBody) {
        state.followupReadinessBody.textContent = buildFollowupReadinessReport();
      }
    }, 1000);
  }
  panel.style.display = "block";
  if (state.followupReadinessBody) {
    state.followupReadinessBody.textContent = buildFollowupReadinessReport();
  }
}

function toggleFollowupReadinessPanel(force = null) {
  state.followupReadinessVisible = force === null ? !state.followupReadinessVisible : !!force;
  updateFollowupReadinessPanel();
  return state.followupReadinessVisible;
}

function buildFollowupConfigTemplate() {
  return [
    "{",
    '  "conversation_mode": {',
    '    "enabled": true,',
    '    "proactive_enabled": true,',
    '    "proactive_scheduler_enabled": true,',
    '    "proactive_cooldown_ms": 600000,',
    '    "proactive_warmup_ms": 120000,',
    '    "proactive_poll_interval_ms": 60000,',
    '    "max_followups_per_window": 1,',
    '    "silence_followup_min_ms": 180000',
    "  }",
    "}"
  ].join("\n");
}

async function writeTextToClipboard(text) {
  const value = String(text || "");
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyFollowupReadinessReportToClipboard(button = null) {
  const report = buildFollowupReadinessReport();
  try {
    await writeTextToClipboard(report);
    setStatus("续话状态已复制");
    if (button) {
      const previous = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = previous || "复制";
      }, 1200);
    }
    return true;
  } catch (err) {
    setStatus("复制失败，可手动选择面板文字复制");
    return false;
  }
}

async function copyFollowupConfigTemplateToClipboard(button = null) {
  try {
    await writeTextToClipboard(buildFollowupConfigTemplate());
    setStatus("续话配置模板已复制");
    if (button) {
      const previous = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = previous || "复制模板";
      }, 1200);
    }
    return true;
  } catch (err) {
    setStatus("复制模板失败，可手动查看面板说明");
    return false;
  }
}

function sanitizeTranslateDebugText(text, maxLen = 96) {
  return sanitizeTTSDebugText(text, maxLen);
}

function recordTranslateDebugEvent(stage, payload = {}) {
  const now = performance.now();
  const entry = {
    seq: ++state.translateDebugSeq,
    atMs: Math.round(now),
    stage: String(stage || "event"),
    traceId: String(payload.traceId || state.translateDebugCurrentTraceId || ""),
    text: sanitizeTranslateDebugText(payload.text || ""),
    sourceChars: Number(payload.sourceChars || 0),
    translatedChars: Number(payload.translatedChars || 0),
    elapsedMs: Number(payload.elapsedMs || -1),
    status: Number(payload.status || 0),
    degraded: payload.degraded === true,
    fallback: payload.fallback === true,
    cache: String(payload.cache || ""),
    result: String(payload.result || ""),
    error: String(payload.error || "")
  };
  state.translateDebugLastEventAt = now;
  if (entry.traceId) {
    state.translateDebugCurrentTraceId = entry.traceId;
  }
  if (entry.text) {
    state.translateDebugCurrentText = entry.text;
  }
  if (entry.result) {
    state.translateDebugLastResult = entry.result;
  }
  if (entry.error) {
    state.translateDebugLastError = entry.error;
  }
  state.translateDebugEvents.push(entry);
  if (state.translateDebugEvents.length > 80) {
    state.translateDebugEvents.splice(0, state.translateDebugEvents.length - 80);
  }
  updateTranslateDebugPanel();
  return entry;
}

function getTranslateDebugSnapshot() {
  return {
    timeoutMs: _CHAT_TRANSLATE_TIMEOUT_MS,
    cacheSize: _chatTranslationCache.size,
    inFlight: _translationInFlight.size,
    circuitOpen: _isTranslationCircuitOpen(),
    circuitFailures: Number(_translationCircuitState.failures || 0),
    circuitCooldownMs: Math.max(0, Math.round(Number(_translationCircuitState.cooldownUntil || 0) - Date.now())),
    lastTraceId: state.translateDebugCurrentTraceId || "",
    lastText: state.translateDebugCurrentText || "",
    lastResult: state.translateDebugLastResult || "",
    lastError: state.translateDebugLastError || "",
    events: state.translateDebugEvents.slice()
  };
}

function buildTranslateDebugReport() {
  const s = getTranslateDebugSnapshot();
  const lines = [
    "Translation debug:",
    `timeoutMs=${s.timeoutMs}`,
    `cacheSize=${s.cacheSize}`,
    `inFlight=${s.inFlight}`,
    `circuitOpen=${s.circuitOpen}`,
    `circuitFailures=${s.circuitFailures}`,
    `circuitCooldownMs=${s.circuitCooldownMs}`,
    `lastTrace=${s.lastTraceId || "(none)"}`,
    `lastResult=${s.lastResult || "(none)"}`,
    `lastError=${s.lastError || "(none)"}`,
    `lastText=${s.lastText || "(none)"}`
  ];
  const recent = s.events.slice(-12).map((event) => {
    const ageMs = Math.round(performance.now() - Number(event.atMs || 0));
    const bits = [
      `#${event.seq}`,
      `${event.stage}`,
      `ageMs=${ageMs}`,
      event.traceId ? `trace=${event.traceId}` : "",
      event.elapsedMs >= 0 ? `elapsedMs=${event.elapsedMs}` : "",
      event.status ? `status=${event.status}` : "",
      event.sourceChars ? `sourceChars=${event.sourceChars}` : "",
      event.translatedChars ? `translatedChars=${event.translatedChars}` : "",
      event.cache ? `cache=${event.cache}` : "",
      event.degraded ? "degraded=true" : "",
      event.fallback ? "fallback=true" : "",
      event.result ? `result=${event.result}` : "",
      event.error ? `error=${event.error}` : "",
      event.text ? `text=${event.text}` : ""
    ].filter(Boolean);
    return bits.join(" ");
  });
  if (recent.length) {
    lines.push("recentEvents=");
    lines.push(...recent);
  } else {
    lines.push("recentEvents=none");
  }
  return lines.join("\n");
}

function ensureTranslateDebugPanel() {
  if (state.translateDebugPanel || typeof document === "undefined") {
    return state.translateDebugPanel;
  }
  const panel = document.createElement("div");
  panel.id = "translate-debug-panel";
  panel.style.cssText = [
    "position:fixed",
    "right:14px",
    "bottom:14px",
    "z-index:99999",
    "width:min(430px,calc(100vw - 28px))",
    "max-height:52vh",
    "overflow:auto",
    "padding:12px",
    "border:1px solid rgba(120,150,170,.45)",
    "border-radius:14px",
    "background:rgba(8,18,26,.88)",
    "color:#d8f3ff",
    "font:12px/1.45 Consolas,Menlo,monospace",
    "box-shadow:0 18px 45px rgba(0,0,0,.28)",
    "backdrop-filter:blur(10px)",
    "white-space:pre-wrap",
    "display:none"
  ].join(";");
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;";
  const title = document.createElement("strong");
  title.textContent = "Translation Debug";
  title.style.cssText = "font-size:13px;color:#ffffff;";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Hide";
  close.style.cssText = "border:0;border-radius:999px;padding:4px 9px;background:#d8f3ff;color:#10202a;cursor:pointer;";
  close.addEventListener("click", () => {
    state.translateDebugVisible = false;
    updateTranslateDebugPanel();
  });
  head.appendChild(title);
  head.appendChild(close);
  const body = document.createElement("pre");
  body.style.cssText = "margin:0;white-space:pre-wrap;";
  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(panel);
  state.translateDebugPanel = panel;
  state.translateDebugBody = body;
  return panel;
}

function updateTranslateDebugPanel() {
  if (!state.translateDebugVisible) {
    if (state.translateDebugPanel) {
      state.translateDebugPanel.style.display = "none";
    }
    if (state.translateDebugRefreshTimer) {
      clearInterval(state.translateDebugRefreshTimer);
      state.translateDebugRefreshTimer = 0;
    }
    return;
  }
  const panel = ensureTranslateDebugPanel();
  if (!panel) {
    return;
  }
  if (!state.translateDebugRefreshTimer) {
    state.translateDebugRefreshTimer = window.setInterval(() => {
      if (!state.translateDebugVisible) {
        updateTranslateDebugPanel();
        return;
      }
      if (state.translateDebugBody) {
        state.translateDebugBody.textContent = buildTranslateDebugReport();
      }
    }, 1000);
  }
  panel.style.display = "block";
  if (state.translateDebugBody) {
    state.translateDebugBody.textContent = buildTranslateDebugReport();
  }
}

function toggleTranslateDebugPanel(force = null) {
  state.translateDebugVisible = force === null ? !state.translateDebugVisible : !!force;
  updateTranslateDebugPanel();
  return state.translateDebugVisible;
}

const ui = {
  status: document.getElementById("status"),
  assistantName: document.getElementById("assistant-name"),
  heroAvatarImg: document.getElementById("hero-avatar-img"),
  translationChipBtn: document.getElementById("translation-chip-btn"),
  translationToggleBtn: document.getElementById("translation-toggle-btn"),
  subtitleToggleBtn: document.getElementById("subtitle-toggle-btn"),
  moreBtn: document.getElementById("more-btn"),
  helpBtn: document.getElementById("help-btn"),
  helpModal: document.getElementById("help-modal"),
  helpCloseBtn: document.getElementById("help-close-btn"),
  helpOpenOnboardingBtn: document.getElementById("help-open-onboarding-btn"),
  onboardingModal: document.getElementById("onboarding-modal"),
  onboardingSkipBtn: document.getElementById("onboarding-skip-btn"),
  onboardingPrevBtn: document.getElementById("onboarding-prev-btn"),
  onboardingNextBtn: document.getElementById("onboarding-next-btn"),
  onboardingDoneBtn: document.getElementById("onboarding-done-btn"),
  onboardingStepIndex: document.getElementById("onboarding-step-index"),
  onboardingProgressBar: document.getElementById("onboarding-progress-bar"),
  onboardingStepTitle: document.getElementById("onboarding-step-title"),
  onboardingStepDesc: document.getElementById("onboarding-step-desc"),
  onboardingStepTip: document.getElementById("onboarding-step-tip"),
  onboardingPathSplit: document.getElementById("onboarding-path-split"),
  onboardingQuickBtn: document.getElementById("onboarding-quick-btn"),
  onboardingAdvancedBtn: document.getElementById("onboarding-advanced-btn"),
  advancedActions: document.getElementById("advanced-actions"),
  chatLog: document.getElementById("chat-log"),
  attachmentPreview: document.getElementById("attachment-preview"),
  chatInput: document.getElementById("chat-input"),
  attachBtn: document.getElementById("attach-btn"),
  attachInput: document.getElementById("attach-input"),
  sendBtn: document.getElementById("send-btn"),
  micBtn: document.getElementById("mic-btn"),
  speakBtn: document.getElementById("speak-btn"),
  voiceNextBtn: document.getElementById("voice-next-btn"),
  scheduleBtn: document.getElementById("schedule-btn"),
  personaBtn: document.getElementById("persona-btn"),
  lockBtn: document.getElementById("lock-btn"),
  observeBtn: document.getElementById("observe-btn"),
  autoChatBtn: document.getElementById("auto-chat-btn"),
  idleBtn: document.getElementById("idle-btn"),
  micMeterWrap: document.getElementById("mic-meter-wrap"),
  micMeterFill: document.getElementById("mic-meter-fill"),
  micMeterText: document.getElementById("mic-meter-text"),
  scheduleModal: document.getElementById("schedule-modal"),
  scheduleCloseBtn: document.getElementById("schedule-close-btn"),
  scheduleDatetime: document.getElementById("schedule-datetime"),
  scheduleRepeat: document.getElementById("schedule-repeat"),
  scheduleMode: document.getElementById("schedule-mode"),
  scheduleTask: document.getElementById("schedule-task"),
  scheduleSaveBtn: document.getElementById("schedule-save-btn"),
  scheduleList: document.getElementById("schedule-list"),
  personaModal: document.getElementById("persona-modal"),
  personaPreviewBtn: document.getElementById("persona-preview-btn"),
  personaCloseBtn: document.getElementById("persona-close-btn"),
  personaAvatarPreview: document.getElementById("persona-avatar-preview"),
  personaAvatarInput: document.getElementById("persona-avatar-input"),
  personaAvatarChangeBtn: document.getElementById("persona-avatar-change-btn"),
  personaAvatarResetBtn: document.getElementById("persona-avatar-reset-btn"),
  personaApplyBtn: document.getElementById("persona-apply-btn"),
  personaIdentity: document.getElementById("persona-identity"),
  personaPreferences: document.getElementById("persona-preferences"),
  personaDislikes: document.getElementById("persona-dislikes"),
  personaTopics: document.getElementById("persona-topics"),
  personaReplyStyle: document.getElementById("persona-reply-style"),
  personaCompanionshipStyle: document.getElementById("persona-companionship-style"),
  personaSaveBtn: document.getElementById("persona-save-btn"),
  learningReviewBtn: document.getElementById("learning-review-btn"),
  followupReadinessBtn: document.getElementById("followup-readiness-btn"),
  followupCharacterChip: document.getElementById("followup-character-chip"),
  learningReviewBackdrop: document.getElementById("learning-review-backdrop"),
  learningReviewDrawer: document.getElementById("learning-review-drawer"),
  learningReviewCloseBtn: document.getElementById("learning-review-close-btn"),
  learningReviewUndoBtn: document.getElementById("learning-review-undo-btn"),
  learningTabCandidates: document.getElementById("learning-tab-candidates"),
  learningTabSamples: document.getElementById("learning-tab-samples"),
  learningTabDebug: document.getElementById("learning-tab-debug"),
  learningReloadBtn: document.getElementById("learning-reload-btn"),
  learningFilterScore: document.getElementById("learning-filter-score"),
  learningFilterConfidence: document.getElementById("learning-filter-confidence"),
  learningFilterKeyword: document.getElementById("learning-filter-keyword"),
  learningSortMode: document.getElementById("learning-sort-mode"),
  learningFilterHighBtn: document.getElementById("learning-filter-high-btn"),
  learningFilterResetBtn: document.getElementById("learning-filter-reset-btn"),
  learningSelectAll: document.getElementById("learning-select-all"),
  learningSelectedCount: document.getElementById("learning-selected-count"),
  learningBatchDeleteBtn: document.getElementById("learning-batch-delete-btn"),
  learningBatchUpBtn: document.getElementById("learning-batch-up-btn"),
  learningBatchDownBtn: document.getElementById("learning-batch-down-btn"),
  learningBatchPromoteBtn: document.getElementById("learning-batch-promote-btn"),
  learningReviewSummary: document.getElementById("learning-review-summary"),
  learningReviewList: document.getElementById("learning-review-list"),
  learningDebugPanel: document.getElementById("learning-debug-panel"),
  learningQuickInject: document.getElementById("learning-quick-inject"),
  learningQuickSupport: document.getElementById("learning-quick-support"),
  learningQuickApplyBtn: document.getElementById("learning-quick-apply-btn"),
  subtitleLayer: document.getElementById("subtitle-layer"),
  subtitleDragHandle: document.getElementById("subtitle-drag-handle"),
  personaImportTemplateBtn: document.querySelector(".persona-footer-actions .persona-ghost-btn:nth-of-type(1)"),
  personaRandomBtn: document.querySelector(".persona-footer-actions .persona-ghost-btn:nth-of-type(2)"),
  personaResetBtn: document.querySelector(".persona-footer-actions .persona-ghost-btn:nth-of-type(3)")
};

const learningReviewState = {
  activeTab: "candidates",
  debugSnapshot: null,
  candidates: [],
  samples: [],
  selectedCandidates: new Set(),
  selectedSamples: new Set(),
  quickSettings: {
    inject_count: 0,
    promotion_min_support: 1
  },
  sortMode: "score_desc",
  loading: false
};

const RUNTIME_VERSION = "20260409_6";
const MAX_PENDING_ATTACHMENTS = 6;
const MAX_TEXT_ATTACHMENT_CHARS = 12000;
const MAX_TOTAL_ATTACHMENT_TEXT_CHARS = 24000;
const MAX_IMAGE_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const TEXT_ATTACHMENT_EXTS = new Set([
  "txt", "md", "markdown", "json", "csv", "tsv", "yaml", "yml",
  "xml", "html", "htm", "css", "js", "mjs", "cjs", "ts", "tsx",
  "jsx", "py", "java", "c", "cpp", "h", "hpp", "go", "rs",
  "sh", "ps1", "bat", "sql", "log", "ini", "toml"
]);
const REMINDER_STORAGE_KEY = "taffy_reminders_v1";
const EMOTION_STORAGE_KEY = "taffy_emotion_stats_v1";
const DAILY_GREETING_STORAGE_KEY = "taffy_daily_greeting_v1";
const CHAT_HISTORY_STORAGE_KEY = "taffy_chat_history_v2";
const CHAT_TRANSLATION_VISIBILITY_STORAGE_KEY = "taffy_chat_translation_visible_v1";
const SUBTITLE_ENABLED_STORAGE_KEY = "taffy_subtitle_enabled_v1";
const SUBTITLE_POSITION_STORAGE_KEY = "taffy_subtitle_position_v1";
const ONBOARDING_SEEN_STORAGE_KEY = "taffy_onboarding_seen_v1";
const MAX_CHAT_HISTORY_RECORDS = 240;
const TOOL_META_MARKER = "[[TAFFY_TOOL_META]]";
const API_CLIENT = window.TaffyModules?.apiClient || {};
const SPEECH_TEXT = window.TaffyModules?.speechText || {};
const TTS_API = window.TaffyModules?.ttsApi || {};
const PERSONA_CARD_DEFAULT = {
  identity: "",
  user_preferences: "",
  user_dislikes: "",
  common_topics: "",
  reply_style: "",
  companionship_style: "",
  updated_at: ""
};
const ASSISTANT_AVATAR_STORAGE_KEY = "taffy_assistant_avatar_v1";
const ASSISTANT_AVATAR_DEFAULT = "./assets/assistant_avatar_ref.png?v=2";
const ASSISTANT_AVATAR_MAX_BYTES = 4 * 1024 * 1024;
const ONBOARDING_STEPS = [
  {
    title: "先打个招呼",
    desc: "在输入框里发一句话，按 Enter 就可以开始聊天。",
    tip: "想先快速感受，点击下方“立即体验（推荐）”即可。"
  },
  {
    title: "语音先用轻量模式",
    desc: "默认语音是 Browser；也支持 Edge TTS。不配置 GPT-SoVITS 也能直接体验语音。",
    tip: "GPT-SoVITS 保留为高级本地音色模式，建议在本地服务稳定后再启用。"
  },
  {
    title: "默认低打扰更安全",
    desc: "首次启动 observe.attach_mode=manual，不会自动观察桌面；工具调用默认关闭。",
    tip: "如需启用 tools 或 allow_shell，请在高级配置中手动开启并注意风险。"
  },
  {
    title: "需要进阶再去配置中心",
    desc: "想自定义 LLM、TTS、工具和人设，可进入高级配置中心继续完善。",
    tip: "建议先体验基础对话，再逐项开启高级能力，排查问题更容易。"
  }
];

function clearPersistedApiToken() {
  if (typeof API_CLIENT.clearPersistedApiToken === "function") {
    return API_CLIENT.clearPersistedApiToken();
  }
  if (typeof window.clearPersistedApiToken === "function" && window.clearPersistedApiToken !== clearPersistedApiToken) {
    return window.clearPersistedApiToken();
  }
}

async function resolveApiToken(forceRefresh = false) {
  if (typeof API_CLIENT.resolveApiToken === "function") {
    return API_CLIENT.resolveApiToken(forceRefresh);
  }
  if (typeof window.resolveApiToken === "function" && window.resolveApiToken !== resolveApiToken) {
    return window.resolveApiToken(forceRefresh);
  }
  return "";
}

async function authFetch(input, init = {}) {
  if (typeof API_CLIENT.authFetch === "function") {
    return API_CLIENT.authFetch(input, init);
  }
  if (typeof window.authFetch === "function" && window.authFetch !== authFetch) {
    return window.authFetch(input, init);
  }
  return fetch(input, init);
}

function isApiRequestTarget(input) {
  if (typeof API_CLIENT.isApiRequestTarget === "function") {
    return API_CLIENT.isApiRequestTarget(input);
  }
  if (typeof window.isApiRequestTarget === "function" && window.isApiRequestTarget !== isApiRequestTarget) {
    return window.isApiRequestTarget(input);
  }
  try {
    const isRequest = typeof Request !== "undefined" && input instanceof Request;
    const raw = isRequest ? input.url : String(input || "");
    const url = new URL(raw, window.location.origin);
    return url.pathname.startsWith("/api/");
  } catch (_) {
    return false;
  }
}
const AUTO_CHAT_MIN_USER_GAP_MS = 90 * 1000;
const AUTO_CHAT_MIN_ASSISTANT_GAP_MS = 120 * 1000;
const AUTO_CHAT_MIN_BETWEEN_TRIGGERS_MS = 4 * 60 * 1000;
const AUTO_CHAT_EMO_RE = /(难受|难过|焦虑|压力|累|困|崩溃|失眠|emo|心情不好|低落)/i;
const AUTO_CHAT_MIRROR_RE = /(你呢|那你呢|你会|你想|你觉得|那你|你自己)/i;
const AUTO_CHAT_TOPIC_RE = /(项目|考试|工作|学习|代码|模型|部署|计划|进度|复盘|目标)/i;
const AUTO_CHAT_ASK_RE = /[?？]\s*$/;
const AUTO_CHAT_OPEN_LOOP_RE = /(待会|稍后|回头|明天|下次|之后|再聊|先这样|先不|以后)/i;
const AUTO_CHAT_BRIEF_REPLY_RE = /^(嗯|哦|好|行|ok|收到|知道了|先这样|回头说)$/i;
const AUTO_CHAT_REPEAT_REASON_WINDOW_MS = 14 * 60 * 1000;
const AUTO_CHAT_REPEAT_TOPIC_WINDOW_MS = 22 * 60 * 1000;
const AUTO_CHAT_BURST_RESET_WINDOW_MS = 18 * 60 * 1000;
const AUTO_CHAT_REASON_PRIORITY = [
  "emotion_signal",
  "open_loop",
  "followup_pending",
  "brief_ack_drop",
  "mirror_question",
  "topic_hot",
  "long_silence",
  "mid_silence",
  "deep_talk_pause"
];
const AUTO_CHAT_REASON_HINTS = {
  emotion_signal: "用户状态看起来不太好，给一句带温度的接话。",
  open_loop: "用户留了个没收口的话头，轻轻续一下。",
  followup_pending: "上一轮你抛过问题，现在自然接上，不重开场。",
  brief_ack_drop: "用户刚才只简短应了一句，把话题接回来一点点。",
  mirror_question: "用户把问题反问给你，先给你的态度，再顺手延一句。",
  topic_hot: "抓住刚聊过的点，补一句有观点的话。",
  long_silence: "安静有点久了，像突然想到一样冒一句。",
  mid_silence: "沉默了一阵，用自然口吻轻触一下。",
  deep_talk_pause: "刚才聊得不浅，顺着停顿补一句。"
};
const AUTO_CHAT_STYLE_NOTES = [
  "像突然想到就开口，轻一点，不解释。",
  "偏口语，像真人碎碎念，不端着。",
  "短句优先，收尾别太正式。",
  "带一点点态度，但别像说教。",
  "可以有轻微跳跃感，别写成任务通知。"
];
const WAITING_VOICE_HINTS = [
  "我在想，马上回你。",
  "我在组织一下语言，马上好。",
  "稍等一下，我这就回答你。"
];
const MOTION_INTENSITY_PRESETS = {
  low: {
    idleIntervalScale: 1.35,
    talkChance: 0.55,
    comboChance: 0.18,
    tapChance: 0.7,
    listenChance: 0.62,
    thinkingComboChance: 0.28,
    idleComboChance: 0.16,
    replyAccentChance: 0.22,
    talkMaxBeats: 2
  },
  normal: {
    idleIntervalScale: 1.0,
    talkChance: 0.82,
    comboChance: 0.4,
    tapChance: 0.92,
    listenChance: 0.8,
    thinkingComboChance: 0.46,
    idleComboChance: 0.3,
    replyAccentChance: 0.42,
    talkMaxBeats: 3
  },
  high: {
    idleIntervalScale: 0.76,
    talkChance: 1.0,
    comboChance: 0.64,
    tapChance: 1.0,
    listenChance: 0.94,
    thinkingComboChance: 0.68,
    idleComboChance: 0.48,
    replyAccentChance: 0.62,
    talkMaxBeats: 4
  }
};
const STYLE_MOTION_BLUEPRINT = {
  comfort: {
    listen: ["Idle", "FlickDown", "Flick"],
    thinking: ["Idle", "FlickDown"],
    talk: ["Idle", "FlickDown", "Flick"],
    reply: ["FlickDown", "Idle", "Flick"],
    tap: ["Tap", "Idle", "FlickDown"],
    idle: ["Idle", "FlickDown"]
  },
  clear: {
    listen: ["Idle", "FlickUp"],
    thinking: ["Idle", "FlickUp"],
    talk: ["FlickUp", "Idle", "Tap"],
    reply: ["FlickUp", "Tap", "Idle"],
    tap: ["Tap", "FlickUp", "Idle"],
    idle: ["Idle", "FlickUp"]
  },
  playful: {
    listen: ["Tap", "FlickUp", "Idle"],
    thinking: ["FlickUp", "Idle"],
    talk: ["Tap", "Tap@Body", "FlickUp", "Idle"],
    reply: ["Tap", "Tap@Body", "FlickUp", "Idle"],
    tap: ["Tap", "Tap@Body", "FlickUp", "Idle"],
    idle: ["Idle", "Tap", "FlickUp"]
  },
  steady: {
    listen: ["Flick", "Idle", "Flick@Body"],
    thinking: ["Idle", "Flick"],
    talk: ["Flick@Body", "Flick", "Idle"],
    reply: ["Flick@Body", "Flick", "Idle", "Tap@Body"],
    tap: ["Tap@Body", "Flick", "Idle"],
    idle: ["Idle", "Flick"]
  },
  neutral: {
    listen: ["Idle", "Flick"],
    thinking: ["Idle"],
    talk: ["Tap", "FlickUp", "Idle"],
    reply: ["Tap", "Flick", "Idle"],
    tap: ["Tap", "Idle", "FlickUp"],
    idle: ["Idle", "Tap", "FlickUp", "FlickDown"]
  }
};
const LIVE2D_EXPRESSION_TUNING = window.TaffyLive2DExpressionTuning || {};
const STYLE_EXPRESSION_PROFILE = LIVE2D_EXPRESSION_TUNING.STYLE_EXPRESSION_PROFILE || {
  neutral: {
    mouthForm: 0.04,
    cheek: 0.06,
    eyeSmile: 0.05,
    browY: 0.0,
    browAngle: 0.0,
    headX: 0.0,
    headY: 0.0,
    bodyX: 0.0,
    floatScale: 1.0
  }
};
const RUNTIME_EMOTION_EXPRESSION_TUNING = LIVE2D_EXPRESSION_TUNING.RUNTIME_EMOTION_EXPRESSION_TUNING || {
  idle: {
    pulseBoost: 0.36,
    pulseDurationMs: 240,
    holdMs: 900,
    weight: 1.0
  }
};
const MOTION_SEMANTIC_TOKENS = {
  idle: ["idle", "main", "home", "stand", "loop", "breath", "wait"],
  listen: ["tap", "touch", "flick", "head", "body", "idle", "main"],
  thinking: ["flick", "shake", "head", "idle", "main", "touch", "pose"],
  talk: ["tap", "touch", "wave", "body", "arm", "flick", "idle", "main", "pose"],
  reply: ["wave", "tap", "body", "flick", "pose", "main", "idle", "greet"],
  tap: ["tap", "touch", "body", "head", "flick", "wave", "pose"],
  happy: ["happy", "smile", "wave", "jump", "tap", "pose", "greet"],
  sad: ["sad", "down", "shy", "idle", "head", "flickdown", "low"],
  angry: ["angry", "shake", "body", "flick", "tap", "strong"],
  surprised: ["surprise", "wow", "jump", "flickup", "shake", "pose", "open"]
};
const MODEL_MOTION_PROFILES = {
  hiyori_pro_t11: {
    cadence: {
      floatAmp: 1.12,
      floatSpeed: 1.08,
      idleIntervalScale: 0.9,
      talkBeatScale: 1.18
    },
    intents: {
      idle: ["Idle", "FlickDown", "Flick"],
      listen: ["Flick", "Idle", "Tap@Body"],
      thinking: ["FlickUp", "Flick", "Idle"],
      talk: ["Tap", "FlickUp", "Tap@Body", "Idle"],
      reply: ["Tap", "FlickUp", "Flick", "Tap@Body", "Idle"],
      tap: ["Tap", "Tap@Body", "FlickUp", "Flick", "Idle"]
    },
    moods: {
      happy: ["Tap", "FlickUp", "Tap@Body", "Idle"],
      sad: ["FlickDown", "Idle", "Flick"],
      angry: ["Flick@Body", "Tap@Body", "Flick", "Idle"],
      surprised: ["FlickUp", "Tap", "Flick", "Idle"],
      idle: ["Idle", "Flick", "FlickDown"]
    }
  }
};
const TAP_MOVE_THRESHOLD = 8;
const TAP_MAX_DURATION_MS = 280;
const VISION_INTENT_RE =
  /(看到|看见|桌面|屏幕|画面|截图|图里|图片|界面|识别|观察|what do you see|look at|screen|desktop|screenshot|image)/i;

function applyDisplayModeFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  const root = document.documentElement;
  const transparent = params.get("transparent") === "1";
  const alphaMode = params.get("alpha_mode") || (transparent ? "truealpha" : "none");
  const view = String(params.get("view") || "full").toLowerCase();
  state.uiView = ["model", "chat", "full"].includes(view) ? view : "full";
  root.classList.remove("view-model", "view-chat", "view-full");
  document.body.classList.remove("view-model", "view-chat", "view-full");
  root.classList.add(`view-${state.uiView}`);
  document.body.classList.add(`view-${state.uiView}`);
  if (params.get("desktop") === "1") {
    root.classList.add("desktop-mode");
    document.body.classList.add("desktop-mode");
  }
  if (transparent) {
    root.classList.add("transparent-mode");
    document.body.classList.add("transparent-mode");
    if (alphaMode === "colorkey") {
      root.classList.add("alpha-colorkey");
      document.body.classList.add("alpha-colorkey");
    } else {
      root.classList.add("alpha-true");
      document.body.classList.add("alpha-true");
    }
  }
  state.desktopMode = document.body.classList.contains("desktop-mode");
  state.alphaMode = alphaMode;
}

applyDisplayModeFromUrl();

function refreshDesktopBridgeReady() {
  const hasPyBridge =
    !!window.pywebview &&
    !!window.pywebview.api &&
    typeof window.pywebview.api.drag_window === "function";
  const hasElectronMoveBridge =
    !!window.electronAPI &&
    typeof window.electronAPI.moveWindowBy === "function";
  const hasElectronCaptureBridge =
    !!window.electronAPI &&
    typeof window.electronAPI.captureDesktop === "function";

  if (hasElectronMoveBridge || hasElectronCaptureBridge) {
    state.desktopBridge = "electron";
  } else if (hasPyBridge) {
    state.desktopBridge = "pywebview";
  } else {
    state.desktopBridge = "";
  }
  state.desktopCanMoveWindow =
    state.desktopMode &&
    !state.windowLocked &&
    (hasElectronMoveBridge || hasPyBridge);
  state.desktopCanCapture = state.desktopMode && hasElectronCaptureBridge;
  state.useNativeWindowDrag = false;
  document.body.classList.toggle("native-window-drag", !!state.useNativeWindowDrag);
  document.documentElement.classList.toggle("native-window-drag", !!state.useNativeWindowDrag);
  if (state.windowLocked && state.windowDragActive) {
    stopDesktopWindowDrag();
  }
  updateObserveButton();
  updateLockButton();
}

function moveDesktopWindowBy(dx, dy) {
  if (!state.desktopCanMoveWindow || state.windowLocked) {
    return;
  }
  const ix = Math.round(dx);
  const iy = Math.round(dy);
  if (ix === 0 && iy === 0) {
    return;
  }
  try {
    if (state.desktopBridge === "electron") {
      window.electronAPI.moveWindowBy(ix, iy);
      return;
    }
    if (state.desktopBridge === "pywebview") {
      window.pywebview.api.drag_window(ix, iy);
    }
  } catch (_) {
    // ignore bridge failures
  }
}

function beginDesktopWindowDragSession() {
  if (state.windowLocked) {
    return;
  }
  if (state.desktopBridge !== "electron" || !window.electronAPI) {
    return;
  }
  if (typeof window.electronAPI.beginWindowDrag !== "function") {
    return;
  }
  try {
    window.electronAPI.beginWindowDrag();
  } catch (_) {
    // ignore bridge failures
  }
}

function endDesktopWindowDragSession() {
  if (state.desktopBridge !== "electron" || !window.electronAPI) {
    return;
  }
  if (typeof window.electronAPI.endWindowDrag !== "function") {
    return;
  }
  try {
    window.electronAPI.endWindowDrag();
  } catch (_) {
    // ignore bridge failures
  }
}

function scheduleDesktopWindowDragUpdate() {
  if (!state.desktopCanMoveWindow || !state.windowDragActive || state.windowLocked) {
    return;
  }
  if (state.desktopBridge === "electron") {
    // Electron native drag timer is handled in main process for smoother motion.
    return;
  }
  if (
    window.electronAPI
    && typeof window.electronAPI.updateWindowDrag === "function"
  ) {
    try {
      state.suspendRelayoutUntil = performance.now() + 180;
      window.electronAPI.updateWindowDrag();
    } catch (_) {
      // ignore bridge failures
    }
  }
}

function stopDesktopWindowDrag() {
  state.windowDragSessionRaf = 0;
  if (state.windowDragRaf) {
    cancelAnimationFrame(state.windowDragRaf);
    state.windowDragRaf = 0;
  }
  state.windowDragActive = false;
  state.windowDragDx = 0;
  state.windowDragDy = 0;
  state.dragWindowAccumX = 0;
  state.dragWindowAccumY = 0;
  document.body.classList.remove("dragging-window");
  document.documentElement.classList.remove("dragging-window");
  if (state.model) {
    clampModelVisibleInViewport(state.model);
  }
  endDesktopWindowDragSession();
}

function finalizeDesktopDrag() {
  const dx = Math.round(state.dragWindowAccumX || 0);
  const dy = Math.round(state.dragWindowAccumY || 0);
  state.dragWindowAccumX = 0;
  state.dragWindowAccumY = 0;
  if (!dx && !dy) {
    return;
  }
  state.suspendRelayoutUntil = performance.now() + 520;
  moveDesktopWindowBy(dx, dy);
  // Snap model back to anchor after moving the native window.
  setTimeout(() => {
    placeModel();
  }, 30);
}

function isServerTTSProvider(provider) {
  const p = String(provider || "").toLowerCase();
  return p === "edge_tts" || p === "gpt_sovits" || p === "volcengine_tts" || p === "volcengine";
}

function setStatus(text) {
  ui.status.textContent = text;
}

function safeParseJSON(raw, fallback) {
  try {
    const parsed = JSON.parse(String(raw || ""));
    return parsed == null ? fallback : parsed;
  } catch (_) {
    return fallback;
  }
}

function loadRemindersFromStorage() {
  const raw = window.localStorage ? localStorage.getItem(REMINDER_STORAGE_KEY) : "";
  const parsed = safeParseJSON(raw, []);
  if (!Array.isArray(parsed)) {
    state.reminders = [];
    state.reminderSeq = 1;
    renderScheduleList();
    return;
  }
  const now = Date.now();
  const restored = [];
  let maxId = 0;
  let changed = false;
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const id = Math.max(1, Math.floor(Number(item.id) || 0));
    const dueAt = Number(item.dueAt) || 0;
    const text = String(item.text || "").trim();
    const mode = normalizeReminderMode(item.mode);
    const repeat = normalizeReminderRepeat(item.repeat);
    let done = !!item.done;
    let nextDueAt = dueAt;
    if (!id || !dueAt || !text) {
      continue;
    }
    if (repeat === "daily") {
      done = false;
      nextDueAt = normalizeDailyReminderDueAt(dueAt, now);
    } else if (done && dueAt < now - 86400000) {
      continue;
    }
    if (done !== !!item.done || nextDueAt !== dueAt || mode !== item.mode || repeat !== item.repeat) {
      changed = true;
    }
    restored.push({ id, dueAt: nextDueAt, text, done, mode, repeat });
    if (id > maxId) {
      maxId = id;
    }
  }
  restored.sort((a, b) => a.dueAt - b.dueAt);
  state.reminders = restored;
  state.reminderSeq = Math.max(maxId + 1, 1);
  renderScheduleList();
  if (changed) {
    saveRemindersToStorage();
  }
}

function saveRemindersToStorage() {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(state.reminders || []));
  } catch (_) {
    // ignore storage quota failures
  }
  renderScheduleList();
}

function loadDailyGreetingState() {
  const raw = window.localStorage ? localStorage.getItem(DAILY_GREETING_STORAGE_KEY) : "";
  const parsed = safeParseJSON(raw, {});
  state.dailyGreetingLastRunKey = String(parsed?.last_run_key || "").trim();
}

function saveDailyGreetingState() {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(
      DAILY_GREETING_STORAGE_KEY,
      JSON.stringify({
        last_run_key: String(state.dailyGreetingLastRunKey || "").trim()
      })
    );
  } catch (_) {
    // ignore storage failures
  }
}

function parseMessageTimestamp(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return Math.round(num);
  }
  return Date.now();
}

function formatMessageTime(value) {
  const ts = parseMessageTimestamp(value);
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(ts));
  } catch (_) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function formatMessageDivider(value) {
  const ts = parseMessageTimestamp(value);
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const sameDay =
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const time = formatMessageTime(ts);
  if (sameDay) {
    return `今天 ${time}`;
  }
  return sameYear ? `${month}-${day} ${time}` : `${d.getFullYear()}-${month}-${day} ${time}`;
}

function shouldInsertTimeDivider(previousTs, currentTs) {
  if (!previousTs) {
    return true;
  }
  const prev = new Date(parseMessageTimestamp(previousTs));
  const cur = new Date(parseMessageTimestamp(currentTs));
  const changedDay =
    prev.getFullYear() !== cur.getFullYear()
    || prev.getMonth() !== cur.getMonth()
    || prev.getDate() !== cur.getDate();
  if (changedDay) {
    return true;
  }
  return Math.abs(parseMessageTimestamp(currentTs) - parseMessageTimestamp(previousTs)) >= 5 * 60 * 1000;
}

function createTimeDivider(timestamp) {
  const divider = document.createElement("div");
  divider.className = "message-divider";
  divider.textContent = formatMessageDivider(timestamp);
  divider.dataset.timestamp = String(parseMessageTimestamp(timestamp));
  return divider;
}

function trimChatRecords(records) {
  const list = Array.isArray(records) ? records : [];
  if (list.length <= MAX_CHAT_HISTORY_RECORDS) {
    return list;
  }
  return list.slice(list.length - MAX_CHAT_HISTORY_RECORDS);
}

function saveChatHistoryToStorage() {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(trimChatRecords(state.chatRecords || []))
    );
  } catch (_) {
    // ignore storage failures
  }
}

function saveChatTranslationVisibilityToStorage() {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(
      CHAT_TRANSLATION_VISIBILITY_STORAGE_KEY,
      state.chatTranslationVisible ? "1" : "0"
    );
  } catch (_) {
    // ignore storage failures
  }
}

function updateTranslationToggleButton() {
  const visible = state.chatTranslationVisible !== false;
  if (ui.translationToggleBtn) {
    ui.translationToggleBtn.classList.toggle("is-off", !visible);
    ui.translationToggleBtn.setAttribute("aria-pressed", visible ? "true" : "false");
    ui.translationToggleBtn.setAttribute("title", visible ? "隐藏会话翻译" : "显示会话翻译");
    ui.translationToggleBtn.textContent = visible ? "翻译  开" : "翻译  关";
  }
  if (ui.translationChipBtn) {
    ui.translationChipBtn.classList.toggle("is-off", !visible);
    ui.translationChipBtn.setAttribute("aria-pressed", visible ? "true" : "false");
    ui.translationChipBtn.setAttribute("title", visible ? "隐藏会话翻译" : "显示会话翻译");
    ui.translationChipBtn.textContent = visible ? "会话翻译已显示" : "会话翻译已收起";
  }
}

function toggleChatTranslationVisibility() {
  state.chatTranslationVisible = !state.chatTranslationVisible;
  applyChatTranslationVisibility();
  saveChatTranslationVisibilityToStorage();
  setStatus(state.chatTranslationVisible ? "会话翻译已显示" : "会话翻译已收起");
}

function setAdvancedActionsExpanded(expanded) {
  const open = !!expanded;
  if (ui.advancedActions) {
    ui.advancedActions.hidden = !open;
  }
  if (ui.moreBtn) {
    ui.moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    ui.moreBtn.textContent = open ? "收起" : "更多";
  }
}

function applyChatTranslationVisibility() {
  const visible = state.chatTranslationVisible !== false;
  document.body.classList.toggle("chat-translation-collapsed", !visible);
  updateTranslationToggleButton();
}

function loadChatTranslationVisibilityFromStorage() {
  let visible = true;
  if (window.localStorage) {
    try {
      const raw = String(localStorage.getItem(CHAT_TRANSLATION_VISIBILITY_STORAGE_KEY) || "").trim();
      if (raw === "0") {
        visible = false;
      } else if (raw === "1") {
        visible = true;
      }
    } catch (_) {
      // ignore storage failures
    }
  }
  state.chatTranslationVisible = visible;
  applyChatTranslationVisibility();
}

function saveSubtitleEnabledToStorage() {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(SUBTITLE_ENABLED_STORAGE_KEY, state.subtitleEnabled ? "1" : "0");
  } catch (_) {
    // ignore storage failures
  }
}

function loadSubtitleEnabledFromStorage() {
  let enabled = true;
  if (window.localStorage) {
    try {
      const raw = String(localStorage.getItem(SUBTITLE_ENABLED_STORAGE_KEY) || "").trim();
      if (raw === "0") {
        enabled = false;
      } else if (raw === "1") {
        enabled = true;
      }
    } catch (_) {
      // ignore storage failures
    }
  }
  state.subtitleEnabled = enabled;
}

function saveSubtitlePositionToStorage() {
  if (!window.localStorage) {
    return;
  }
  try {
    if (!state.subtitlePositionCustom) {
      localStorage.removeItem(SUBTITLE_POSITION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      SUBTITLE_POSITION_STORAGE_KEY,
      JSON.stringify({
        x: state.subtitlePositionRatioX,
        y: state.subtitlePositionRatioY
      })
    );
  } catch (_) {
    // ignore storage failures
  }
}

function loadSubtitlePositionFromStorage() {
  state.subtitlePositionCustom = false;
  state.subtitlePositionRatioX = 0.5;
  state.subtitlePositionRatioY = 0.75;
  if (!window.localStorage) {
    return;
  }
  try {
    const raw = localStorage.getItem(SUBTITLE_POSITION_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const data = JSON.parse(raw);
    const x = Number(data?.x);
    const y = Number(data?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    state.subtitlePositionRatioX = clampNumber(x, 0.05, 0.95);
    state.subtitlePositionRatioY = clampNumber(y, 0.12, 0.92);
    state.subtitlePositionCustom = true;
  } catch (_) {
    // ignore storage failures
  }
}

function applySubtitlePositionFromState() {
  if (!ui.subtitleLayer) {
    return;
  }
  if (!state.subtitlePositionCustom) {
    ui.subtitleLayer.classList.remove("subtitle-pos-custom");
    ui.subtitleLayer.style.left = "";
    ui.subtitleLayer.style.top = "";
    ui.subtitleLayer.style.bottom = "";
    return;
  }
  ui.subtitleLayer.classList.add("subtitle-pos-custom");
  ui.subtitleLayer.style.left = `${Math.round(state.subtitlePositionRatioX * 1000) / 10}%`;
  ui.subtitleLayer.style.top = `${Math.round(state.subtitlePositionRatioY * 1000) / 10}%`;
  ui.subtitleLayer.style.bottom = "auto";
}

function updateSubtitleToggleButton() {
  if (!ui.subtitleToggleBtn) {
    return;
  }
  const enabled = state.subtitleEnabled !== false;
  ui.subtitleToggleBtn.classList.toggle("is-off", !enabled);
  ui.subtitleToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  ui.subtitleToggleBtn.textContent = enabled ? "字幕: 开" : "字幕: 关";
}

function applySubtitleEnabledState() {
  updateSubtitleToggleButton();
  if (state.subtitleEnabled) {
    return;
  }
  hideSubtitleText();
}

function toggleSubtitleEnabled() {
  state.subtitleEnabled = !state.subtitleEnabled;
  applySubtitleEnabledState();
  saveSubtitleEnabledToStorage();
  setStatus(state.subtitleEnabled ? "字幕已开启" : "字幕已关闭");
}

function bindSubtitleDragHandle() {
  if (!ui.subtitleLayer || !ui.subtitleDragHandle) {
    return;
  }
  const onPointerMove = (event) => {
    if (!state.subtitleDragPointerId) {
      return;
    }
    if (!state.subtitleEnabled) {
      return;
    }
    const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const x = clampNumber(Number(event.clientX || 0) / vw, 0.05, 0.95);
    const y = clampNumber(Number(event.clientY || 0) / vh, 0.12, 0.92);
    state.subtitlePositionRatioX = x;
    state.subtitlePositionRatioY = y;
    state.subtitlePositionCustom = true;
    applySubtitlePositionFromState();
  };
  const endDrag = () => {
    if (!state.subtitleDragPointerId) {
      return;
    }
    state.subtitleDragPointerId = 0;
    ui.subtitleLayer.classList.remove("subtitle-dragging");
    saveSubtitlePositionToStorage();
  };
  ui.subtitleDragHandle.addEventListener("pointerdown", (event) => {
    if (!state.subtitleEnabled) {
      return;
    }
    event.preventDefault();
    state.subtitleDragPointerId = Number(event.pointerId) || 1;
    ui.subtitleLayer.classList.add("subtitle-dragging");
    try {
      ui.subtitleDragHandle.setPointerCapture(event.pointerId);
    } catch (_) {
      // ignore pointer capture failures
    }
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
}

function saveOnboardingSeenToStorage(seen) {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(ONBOARDING_SEEN_STORAGE_KEY, seen ? "1" : "0");
  } catch (_) {
    // ignore storage failures
  }
}

function loadOnboardingSeenFromStorage() {
  let seen = false;
  if (window.localStorage) {
    try {
      seen = String(localStorage.getItem(ONBOARDING_SEEN_STORAGE_KEY) || "").trim() === "1";
    } catch (_) {
      seen = false;
    }
  }
  state.onboardingSeen = seen;
}

function isHelpOpen() {
  return !!(ui.helpModal && !ui.helpModal.hidden);
}

function isOnboardingOpen() {
  return !!(ui.onboardingModal && !ui.onboardingModal.hidden);
}

function closeHelpModal() {
  if (!ui.helpModal) {
    return;
  }
  ui.helpModal.hidden = true;
}

function openHelpModal() {
  if (!ui.helpModal) {
    return;
  }
  if (isOnboardingOpen()) {
    ui.onboardingModal.hidden = true;
  }
  ui.helpModal.hidden = false;
}

function openAdvancedConfigCenter() {
  const target = "/docs/config.html";
  try {
    const popup = window.open(target, "_blank", "noopener,noreferrer");
    if (popup && typeof popup.focus === "function") {
      popup.focus();
      return;
    }
  } catch (_) {
    // ignore and fallback to same-window navigation
  }
  window.location.href = target;
}

function renderOnboardingStep() {
  const total = ONBOARDING_STEPS.length;
  const index = Math.max(0, Math.min(total - 1, Number(state.onboardingStepIndex) || 0));
  state.onboardingStepIndex = index;
  const step = ONBOARDING_STEPS[index] || ONBOARDING_STEPS[0];
  if (ui.onboardingStepTitle) {
    ui.onboardingStepTitle.textContent = step.title;
  }
  if (ui.onboardingStepDesc) {
    ui.onboardingStepDesc.textContent = step.desc;
  }
  if (ui.onboardingStepTip) {
    ui.onboardingStepTip.textContent = step.tip;
  }
  if (ui.onboardingPathSplit) {
    ui.onboardingPathSplit.hidden = index !== 0;
  }
  if (ui.onboardingStepIndex) {
    ui.onboardingStepIndex.textContent = `${index + 1} / ${total}`;
  }
  if (ui.onboardingProgressBar) {
    const ratio = total > 1 ? index / (total - 1) : 1;
    ui.onboardingProgressBar.style.width = `${Math.round(ratio * 100)}%`;
  }
  const atLast = index >= total - 1;
  if (ui.onboardingPrevBtn) {
    ui.onboardingPrevBtn.disabled = index <= 0;
  }
  if (ui.onboardingNextBtn) {
    ui.onboardingNextBtn.hidden = atLast;
  }
  if (ui.onboardingDoneBtn) {
    ui.onboardingDoneBtn.hidden = !atLast;
  }
}

function closeOnboardingModal(options = {}) {
  if (!ui.onboardingModal) {
    return;
  }
  ui.onboardingModal.hidden = true;
  if (options.markSeen) {
    state.onboardingSeen = true;
    saveOnboardingSeenToStorage(true);
  }
}

function openOnboardingModal(options = {}) {
  if (!ui.onboardingModal) {
    return;
  }
  if (ui.helpModal && !ui.helpModal.hidden) {
    closeHelpModal();
  }
  if (options.resetStep) {
    state.onboardingStepIndex = 0;
  }
  ui.onboardingModal.hidden = false;
  renderOnboardingStep();
}

function moveOnboardingStep(delta) {
  const total = ONBOARDING_STEPS.length;
  const next = Math.max(0, Math.min(total - 1, (Number(state.onboardingStepIndex) || 0) + Number(delta || 0)));
  if (next === state.onboardingStepIndex) {
    return;
  }
  state.onboardingStepIndex = next;
  renderOnboardingStep();
}

function maybeAutoOpenOnboarding() {
  if (state.onboardingSeen) {
    return;
  }
  if (state.uiView === "model") {
    return;
  }
  openOnboardingModal({ resetStep: true });
}

function syncConversationHistoryFromChatRecords() {
  const records = Array.isArray(state.chatRecords) ? state.chatRecords : [];
  const convo = records
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: String(item.content || "").trim()
    }))
    .filter((item) => item.content);
  const limit = Math.max(12, Number(state.historyMaxMessages) || 64);
  state.history = convo.slice(Math.max(0, convo.length - limit));
}

function normalizeChatRecord(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const role = item.role === "user" ? "user" : "assistant";
  const content = String(item.content || "").trim();
  if (!content) {
    return null;
  }
  return {
    role,
    content,
    timestamp: parseMessageTimestamp(item.timestamp || item.created_at || item.time)
  };
}

function renderChatHistoryFromState() {
  if (!ui.chatLog) {
    return;
  }
  ui.chatLog.innerHTML = "";
  let previousTs = 0;
  for (const item of state.chatRecords) {
    const timestamp = parseMessageTimestamp(item.timestamp);
    if (shouldInsertTimeDivider(previousTs, timestamp)) {
      ui.chatLog.appendChild(createTimeDivider(timestamp));
    }
    const row = createMessageRow(item.role, item.content, {
      timestamp,
      enableTranslation: false
    });
    ui.chatLog.appendChild(row);
    previousTs = timestamp;
  }
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

function loadChatHistoryFromStorage() {
  const raw = window.localStorage ? localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) : "";
  const parsed = safeParseJSON(raw, []);
  if (!Array.isArray(parsed)) {
    state.chatRecords = [];
    state.history = [];
    renderChatHistoryFromState();
    return;
  }
  state.chatRecords = trimChatRecords(
    parsed.map((item) => normalizeChatRecord(item)).filter(Boolean)
  );
  const lastUserRecord = [...state.chatRecords].reverse().find((item) => item?.role === "user");
  if (lastUserRecord) {
    const ts = parseMessageTimestamp(lastUserRecord.timestamp);
    state.lastUserMessageAt = ts;
    state.conversationLastUserAt = ts;
  }
  const lastAssistantRecord = [...state.chatRecords].reverse().find((item) => item?.role === "assistant");
  if (lastAssistantRecord) {
    state.conversationLastAssistantAt = parseMessageTimestamp(lastAssistantRecord.timestamp);
  }
  syncConversationHistoryFromChatRecords();
  renderChatHistoryFromState();
}

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseReminderWhen(rawWhen) {
  const src = String(rawWhen || "").trim().toLowerCase();
  if (!src) {
    return 0;
  }
  const now = Date.now();
  const rel = src.match(/^(\d{1,4})\s*(s|sec|secs|second|seconds|秒|m|min|mins|minute|minutes|分|h|hr|hrs|hour|hours|小时)$/i);
  if (rel) {
    const amount = Math.max(1, Number(rel[1]) || 0);
    const unit = String(rel[2] || "").toLowerCase();
    let ms = 0;
    if (/^(s|sec|secs|second|seconds|秒)$/.test(unit)) {
      ms = amount * 1000;
    } else if (/^(m|min|mins|minute|minutes|分)$/.test(unit)) {
      ms = amount * 60000;
    } else {
      ms = amount * 3600000;
    }
    return now + ms;
  }
  const hm = src.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const hh = Math.max(0, Math.min(23, Number(hm[1]) || 0));
    const mm = Math.max(0, Math.min(59, Number(hm[2]) || 0));
    const dt = new Date();
    dt.setHours(hh, mm, 0, 0);
    if (dt.getTime() <= now) {
      dt.setDate(dt.getDate() + 1);
    }
    return dt.getTime();
  }
  const full = src.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (full) {
    const y = Number(full[1]) || 0;
    const mo = Math.max(1, Math.min(12, Number(full[2]) || 1)) - 1;
    const d = Math.max(1, Math.min(31, Number(full[3]) || 1));
    const hh = Math.max(0, Math.min(23, Number(full[4]) || 0));
    const mm = Math.max(0, Math.min(59, Number(full[5]) || 0));
    const dt = new Date(y, mo, d, hh, mm, 0, 0);
    return dt.getTime();
  }
  return 0;
}

function formatReminderTime(ts) {
  const d = new Date(Number(ts) || Date.now());
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeReminderMode(mode) {
  const safe = String(mode || "").toLowerCase();
  if (safe === "assistant") {
    return "assistant";
  }
  if (safe === "tool") {
    return "tool";
  }
  return "reminder";
}

function normalizeReminderRepeat(repeat) {
  return String(repeat || "").toLowerCase() === "daily" ? "daily" : "once";
}

function normalizeDailyReminderDueAt(dueAt, now = Date.now()) {
  const ts = Number(dueAt) || 0;
  if (!ts) {
    return 0;
  }
  if (ts > now) {
    return ts;
  }
  const src = new Date(ts);
  const today = new Date(now);
  today.setHours(src.getHours(), src.getMinutes(), 0, 0);
  return today.getTime();
}

function shiftReminderToNextDay(dueAt) {
  const next = new Date(Number(dueAt) || Date.now());
  next.setDate(next.getDate() + 1);
  return next.getTime();
}

function buildReminderDisplayTime(item) {
  const repeat = normalizeReminderRepeat(item?.repeat);
  const d = new Date(Number(item?.dueAt) || Date.now());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return repeat === "daily" ? `每天 ${hh}:${mm}` : `单次 · ${formatReminderTime(item?.dueAt)}`;
}

function buildReminderTypeLabel(item) {
  const mode = normalizeReminderMode(item?.mode);
  if (mode === "assistant") {
    return "AI执行";
  }
  if (mode === "tool") {
    return "工具任务";
  }
  return "普通提醒";
}

function buildDefaultScheduleDateTimeValue() {
  const d = new Date(Date.now() + 10 * 60000);
  d.setSeconds(0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function openSchedulePanel() {
  if (!ui.scheduleModal) {
    return;
  }
  if (isHelpOpen()) {
    closeHelpModal();
  }
  if (isOnboardingOpen()) {
    closeOnboardingModal();
  }
  if (ui.personaModal && !ui.personaModal.hidden) {
    closePersonaPanel();
  }
  if (isLearningReviewOpen()) {
    closeLearningReviewDrawer();
  }
  ui.scheduleModal.hidden = false;
  if (ui.scheduleDatetime && !ui.scheduleDatetime.value) {
    ui.scheduleDatetime.value = buildDefaultScheduleDateTimeValue();
  }
  renderScheduleList();
  if (ui.scheduleTask) {
    ui.scheduleTask.focus();
  }
}

function closeSchedulePanel() {
  if (!ui.scheduleModal) {
    return;
  }
  ui.scheduleModal.hidden = true;
}

function normalizeAssistantAvatarUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return ASSISTANT_AVATAR_DEFAULT;
  }
  if (
    value.startsWith("data:image/")
    || value.startsWith("./")
    || value.startsWith("/")
    || value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("blob:")
  ) {
    return value;
  }
  return ASSISTANT_AVATAR_DEFAULT;
}

function readAssistantAvatarFromStorage() {
  try {
    const saved = localStorage.getItem(ASSISTANT_AVATAR_STORAGE_KEY);
    return normalizeAssistantAvatarUrl(saved);
  } catch (_) {
    return ASSISTANT_AVATAR_DEFAULT;
  }
}

function saveAssistantAvatarToStorage(url) {
  try {
    localStorage.setItem(ASSISTANT_AVATAR_STORAGE_KEY, String(url || ""));
  } catch (_) {
    // ignore storage failures
  }
}

function avatarUrlToCssValue(url) {
  const safe = String(url || ASSISTANT_AVATAR_DEFAULT)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"");
  return `url("${safe}")`;
}

function applyAssistantAvatar(url, options = {}) {
  const safe = normalizeAssistantAvatarUrl(url);
  state.assistantAvatarUrl = safe;
  if (ui.heroAvatarImg) {
    ui.heroAvatarImg.src = safe;
  }
  if (ui.personaAvatarPreview) {
    ui.personaAvatarPreview.src = safe;
  }
  document.querySelectorAll(".persona-avatar-sync").forEach((img) => {
    if (img instanceof HTMLImageElement) {
      img.src = safe;
    }
  });
  document.documentElement.style.setProperty("--assistant-avatar-url", avatarUrlToCssValue(safe));
  if (options.persist !== false) {
    saveAssistantAvatarToStorage(safe);
  }
}

function initAssistantAvatar() {
  const domDefault = String(ui.heroAvatarImg?.getAttribute("src") || "").trim();
  const stored = readAssistantAvatarFromStorage();
  const initial = stored || domDefault || ASSISTANT_AVATAR_DEFAULT;
  applyAssistantAvatar(initial, { persist: false });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

async function setAssistantAvatarFromFile(file) {
  if (!(file instanceof File)) {
    return;
  }
  const mime = String(file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) {
    setStatus("请选择图片文件");
    return;
  }
  if (Number(file.size || 0) > ASSISTANT_AVATAR_MAX_BYTES) {
    setStatus("头像图片不能超过 4MB");
    return;
  }
  const dataUrl = await readFileAsDataUrl(file);
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("图片格式无效");
  }
  applyAssistantAvatar(dataUrl);
  setStatus("头像已更新");
}

function normalizePersonaCardData(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    identity: String(src.identity || "").trim(),
    user_preferences: String(src.user_preferences || "").trim(),
    user_dislikes: String(src.user_dislikes || "").trim(),
    common_topics: String(src.common_topics || "").trim(),
    reply_style: String(src.reply_style || "").trim(),
    companionship_style: String(src.companionship_style || "").trim(),
    updated_at: String(src.updated_at || "").trim()
  };
}

function applyPersonaCardToForm(card) {
  const safe = normalizePersonaCardData(card);
  if (ui.personaIdentity) ui.personaIdentity.value = safe.identity;
  if (ui.personaPreferences) ui.personaPreferences.value = safe.user_preferences;
  if (ui.personaDislikes) ui.personaDislikes.value = safe.user_dislikes;
  if (ui.personaTopics) ui.personaTopics.value = safe.common_topics;
  if (ui.personaReplyStyle) ui.personaReplyStyle.value = safe.reply_style;
  if (ui.personaCompanionshipStyle) ui.personaCompanionshipStyle.value = safe.companionship_style;
}

function readPersonaCardFromForm() {
  return normalizePersonaCardData({
    identity: ui.personaIdentity?.value,
    user_preferences: ui.personaPreferences?.value,
    user_dislikes: ui.personaDislikes?.value,
    common_topics: ui.personaTopics?.value,
    reply_style: ui.personaReplyStyle?.value,
    companionship_style: ui.personaCompanionshipStyle?.value
  });
}

function applyPersonaTemplateDraft() {
  applyPersonaCardToForm({
    identity: "你是我的桌面搭子，叫馨语AI桌宠。",
    user_preferences: "我喜欢简洁直接的建议，也喜欢被温柔鼓励。",
    user_dislikes: "不喜欢太官腔、太冗长、反复重复同一句话。",
    common_topics: "开发、学习计划、日常安排、效率提升。",
    reply_style: "像熟悉的朋友，语气自然，短句优先，必要时再展开。",
    companionship_style: "会主动关心我，但不过度打扰，关键时刻能提醒我。"
  });
  setStatus("已导入人设模板草稿");
}

function applyRandomPersonaDraft() {
  const identities = [
    "你是馨语AI桌宠，我的桌面陪伴伙伴。",
    "你是我的桌宠搭子，偏活泼，也很细心。",
    "你是我长期协作的 AI 桌面助理，兼顾陪伴和执行。"
  ];
  const preferences = [
    "我喜欢清晰分点和可执行建议。",
    "我喜欢轻松口吻，但不想被敷衍。",
    "我喜欢先给结论，再补充原因。"
  ];
  const dislikes = [
    "不喜欢空话和模板化结尾。",
    "不喜欢过度追问和说教。",
    "不喜欢重复前文和无效安慰。"
  ];
  const topics = [
    "代码、项目推进、复盘、日程管理",
    "学习、计划、效率工具、习惯养成",
    "产品灵感、开发排障、日常状态"
  ];
  const replyStyles = [
    "语气自然，回复长度中等，必要时简短反问。",
    "先给重点，再给一到两条具体建议。",
    "多用短句，少套话，尽量贴近上下文。"
  ];
  const companionshipStyles = [
    "低打扰陪伴，适时主动提醒。",
    "对我情绪有感知，先共情再给建议。",
    "能和我连续聊下去，不像单轮问答机器人。"
  ];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)] || "";
  applyPersonaCardToForm({
    identity: pick(identities),
    user_preferences: pick(preferences),
    user_dislikes: pick(dislikes),
    common_topics: pick(topics),
    reply_style: pick(replyStyles),
    companionship_style: pick(companionshipStyles)
  });
  setStatus("已随机生成人设草稿");
}

function resetPersonaDraft() {
  applyPersonaCardToForm(PERSONA_CARD_DEFAULT);
  setStatus("已重置人设草稿");
}

async function loadPersonaCard() {
  if (!ui.personaModal) {
    state.personaCard = normalizePersonaCardData(PERSONA_CARD_DEFAULT);
    return state.personaCard;
  }
  try {
  const resp = await authFetch("/api/persona_card", { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("获取人设卡失败");
    }
    const data = normalizePersonaCardData(await resp.json());
    state.personaCard = data;
    applyPersonaCardToForm(data);
    return data;
  } catch (err) {
    state.personaCard = normalizePersonaCardData(PERSONA_CARD_DEFAULT);
    applyPersonaCardToForm(state.personaCard);
    console.warn("loadPersonaCard failed:", err);
    return state.personaCard;
  }
}

function openPersonaPanel() {
  if (!ui.personaModal) {
    return;
  }
  if (isHelpOpen()) {
    closeHelpModal();
  }
  if (isOnboardingOpen()) {
    closeOnboardingModal();
  }
  if (ui.scheduleModal && !ui.scheduleModal.hidden) {
    closeSchedulePanel();
  }
  if (isLearningReviewOpen()) {
    closeLearningReviewDrawer();
  }
  ui.personaModal.hidden = false;
  applyPersonaCardToForm(state.personaCard || PERSONA_CARD_DEFAULT);
  if (ui.personaIdentity) {
    ui.personaIdentity.focus();
  }
}

function closePersonaPanel() {
  if (!ui.personaModal) {
    return;
  }
  ui.personaModal.hidden = true;
}

async function savePersonaCardFromForm() {
  if (!ui.personaModal) {
    return false;
  }
  const payload = readPersonaCardFromForm();
  try {
  const resp = await authFetch("/api/persona_card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(String(data?.error || "保存失败"));
    }
    state.personaCard = normalizePersonaCardData(data);
    applyPersonaCardToForm(state.personaCard);
    setStatus("人设卡已保存");
    return true;
  } catch (err) {
    setStatus(`保存失败: ${err.message || err}`);
    return false;
  }
}

function isLearningReviewOpen() {
  return !!ui.learningReviewDrawer && !ui.learningReviewDrawer.hidden;
}

function getLearningSelectedSet(tab = learningReviewState.activeTab) {
  return tab === "samples"
    ? learningReviewState.selectedSamples
    : learningReviewState.selectedCandidates;
}

function normalizeLearningReviewItem(item, fallbackId) {
  const src = item && typeof item === "object" ? item : {};
  const itemId = String(src.id || fallbackId || "").trim();
  if (!itemId) {
    return null;
  }
  const assistantPreview = String(src.assistant_preview || "").trim();
  const compressedPattern = String(src.compressed_pattern || "").trim();
  if (!assistantPreview && !compressedPattern) {
    return null;
  }
  const scoreRaw = Number(src.score);
  const confRaw = Number(src.confidence);
  const supportRaw = Number(src.support_count);
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(1, scoreRaw)) : 0;
  const confidence = Number.isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : 0;
  const supportCount = Number.isFinite(supportRaw) ? Math.max(0, Math.round(supportRaw)) : 0;
  return {
    id: itemId,
    assistant_preview: assistantPreview,
    compressed_pattern: compressedPattern,
    score,
    confidence,
    support_count: supportCount,
    status: String(src.status || "candidate").trim() || "candidate",
    updated_at: String(src.updated_at || "").trim(),
    created_at: String(src.created_at || "").trim()
  };
}

function setLearningReviewLoading(loading) {
  learningReviewState.loading = !!loading;
  if (ui.learningReviewSummary) {
    ui.learningReviewSummary.textContent = learningReviewState.loading
      ? "学习审核数据加载中..."
      : ui.learningReviewSummary.textContent;
  }
}

function syncLearningQuickSettingsUI() {
  if (ui.learningQuickInject) {
    ui.learningQuickInject.value = String(
      Number(learningReviewState.quickSettings?.inject_count) >= 1 ? 1 : 0
    );
  }
  if (ui.learningQuickSupport) {
    ui.learningQuickSupport.value = String(
      Number(learningReviewState.quickSettings?.promotion_min_support) >= 2 ? 2 : 1
    );
  }
}

function applyLearningPayload(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  if (Array.isArray(data.candidates)) {
    learningReviewState.candidates = data.candidates
      .map((item, idx) => normalizeLearningReviewItem(item, `cand_${idx}`))
      .filter(Boolean);
  }
  if (Array.isArray(data.samples)) {
    learningReviewState.samples = data.samples
      .map((item, idx) => normalizeLearningReviewItem(item, `sample_${idx}`))
      .filter(Boolean);
  }
  if (data.quick_settings && typeof data.quick_settings === "object") {
    learningReviewState.quickSettings = {
      inject_count: Number(data.quick_settings.inject_count) >= 1 ? 1 : 0,
      promotion_min_support: Number(data.quick_settings.promotion_min_support) >= 2 ? 2 : 1
    };
  }

  const candidateIds = new Set(learningReviewState.candidates.map((item) => item.id));
  const sampleIds = new Set(learningReviewState.samples.map((item) => item.id));
  for (const id of Array.from(learningReviewState.selectedCandidates)) {
    if (!candidateIds.has(id)) {
      learningReviewState.selectedCandidates.delete(id);
    }
  }
  for (const id of Array.from(learningReviewState.selectedSamples)) {
    if (!sampleIds.has(id)) {
      learningReviewState.selectedSamples.delete(id);
    }
  }
  syncLearningQuickSettingsUI();
}

function applyMemoryDebugPayload(payload) {
  learningReviewState.debugSnapshot = payload && typeof payload === "object" ? payload : null;
}

function parseLearningFilterNumber(input, fallback = 0) {
  const value = Number(input?.value);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function parseLearningUpdatedTime(item) {
  const t = Date.parse(String(item?.updated_at || item?.created_at || "").trim());
  return Number.isFinite(t) ? t : 0;
}

function applyLearningHighScorePreset() {
  if (ui.learningFilterScore) {
    ui.learningFilterScore.value = "0.75";
  }
  if (ui.learningFilterConfidence) {
    ui.learningFilterConfidence.value = "0.50";
  }
  if (ui.learningSortMode) {
    ui.learningSortMode.value = "score_desc";
  }
  learningReviewState.sortMode = "score_desc";
  renderLearningReviewList();
}

function resetLearningFilters() {
  if (ui.learningFilterScore) {
    ui.learningFilterScore.value = "0";
  }
  if (ui.learningFilterConfidence) {
    ui.learningFilterConfidence.value = "0";
  }
  if (ui.learningFilterKeyword) {
    ui.learningFilterKeyword.value = "";
  }
  if (ui.learningSortMode) {
    ui.learningSortMode.value = "score_desc";
  }
  learningReviewState.sortMode = "score_desc";
  renderLearningReviewList();
}

function getLearningFilteredItems() {
  const tab = learningReviewState.activeTab === "samples" ? "samples" : "candidates";
  const source = tab === "samples"
    ? learningReviewState.samples
    : learningReviewState.candidates;
  const scoreMin = parseLearningFilterNumber(ui.learningFilterScore, 0);
  const confidenceMin = parseLearningFilterNumber(ui.learningFilterConfidence, 0);
  const keyword = String(ui.learningFilterKeyword?.value || "").trim().toLowerCase();
  const filtered = source.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    if (Number(item.score || 0) < scoreMin) {
      return false;
    }
    if (Number(item.confidence || 0) < confidenceMin) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const haystack = `${item.assistant_preview || ""}\n${item.compressed_pattern || ""}`.toLowerCase();
    return haystack.includes(keyword);
  });
  const sortMode = String(learningReviewState.sortMode || ui.learningSortMode?.value || "score_desc");
  filtered.sort((a, b) => {
    const as = Number(a?.score || 0);
    const bs = Number(b?.score || 0);
    const ac = Number(a?.confidence || 0);
    const bc = Number(b?.confidence || 0);
    const ap = Number(a?.support_count || 0);
    const bp = Number(b?.support_count || 0);
    const at = parseLearningUpdatedTime(a);
    const bt = parseLearningUpdatedTime(b);
    if (sortMode === "confidence_desc") {
      return (bc - ac) || (bs - as) || (bp - ap) || (bt - at);
    }
    if (sortMode === "support_desc") {
      return (bp - ap) || (bs - as) || (bc - ac) || (bt - at);
    }
    if (sortMode === "updated_desc") {
      return (bt - at) || (bs - as) || (bc - ac) || (bp - ap);
    }
    return (bs - as) || (bc - ac) || (bp - ap) || (bt - at);
  });
  return filtered;
}

function buildMemoryDebugReport(snapshot = learningReviewState.debugSnapshot) {
  const data = snapshot && typeof snapshot === "object" ? snapshot : {};
  const memory = data.memory && typeof data.memory === "object" ? data.memory : {};
  const learning = data.learning && typeof data.learning === "object" ? data.learning : {};
  const diagnostics = learning.diagnostics && typeof learning.diagnostics === "object" ? learning.diagnostics : {};
  const last = memory.last_selection && typeof memory.last_selection === "object" ? memory.last_selection : {};
  const lines = [
    "Memory/Learning Debug:",
    `memory.enabled=${memory.enabled === true}`,
    `memory.mem0=${memory.mem0_enabled === true}`,
    `memory.count=${Number(memory.memory_count || 0)}`,
    `last.reason=${String(last.reason || "(none)")}`,
    `last.message=${String(last.message || "")}`,
    `last.explicit=${last.explicit_memory_intent === true}`,
    `last.specific=${last.is_specific_memory_query === true}`,
    `last.lightweight=${last.is_lightweight_checkin === true}`,
    `last.candidates=${Number(last.candidate_count || 0)}`,
    `last.selected=${Array.isArray(last.selected) ? last.selected.length : 0}`,
    `learning.candidates=${Number(learning.candidates_count || 0)}`,
    `learning.samples=${Number(learning.samples_count || 0)}`,
    `learning.degraded=${learning.degraded_mode === true}`,
    `learning.degradedReason=${String(diagnostics.degraded_reason || "(none)")}`,
    `learning.turns=${Number(learning.turn_count || 0)}`,
    `learning.currentWindow=${Number(diagnostics.current_window_size || 0)}`,
    `learning.currentAvgConfidence=${Number(diagnostics.current_window_avg_confidence || 0)}`,
    `learning.currentSignalCoverage=${Number(diagnostics.current_window_signal_coverage || 0)}`,
    `learning.suspectedGarbled=${Number(diagnostics.garbled_count || 0)}`,
  ];
  const selected = Array.isArray(last.selected) ? last.selected.slice(0, 5) : [];
  if (selected.length) {
    lines.push("Selected memory:");
    selected.forEach((item, idx) => {
      lines.push(`${idx + 1}. [${item.source || "selected"}] ${item.user || ""} => ${item.assistant || ""}`);
    });
  }
  const relevant = Array.isArray(last.relevant_candidates) ? last.relevant_candidates.slice(0, 5) : [];
  if (relevant.length) {
    lines.push("Relevant candidates:");
    relevant.forEach((item, idx) => {
      lines.push(`${idx + 1}. score=${Number(item.score || 0)} ${item.user || ""}`);
    });
  }
  const recentAudit = Array.isArray(learning.recent_audit) ? learning.recent_audit.slice(-3) : [];
  if (recentAudit.length) {
    lines.push("Recent learning audit:");
    recentAudit.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.action || item.event || item.id || "(event)"}`);
    });
  }
  const healthWindows = Array.isArray(diagnostics.health_windows) ? diagnostics.health_windows.slice(-3) : [];
  if (healthWindows.length) {
    lines.push("Learning health windows:");
    healthWindows.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. avgConfidence=${Number(item.avg_confidence || 0)} candidateRate=${Number(item.candidate_in_rate || 0)} signalCoverage=${Number(item.signal_coverage || 0)} ended=${String(item.window_ended_at || "")}`
      );
    });
  }
  const latestEvent = diagnostics.latest_event && typeof diagnostics.latest_event === "object" ? diagnostics.latest_event : {};
  if (latestEvent.event || latestEvent.reason) {
    lines.push(
      `Latest learning event: ${String(latestEvent.event || "(event)")} reason=${String(latestEvent.reason || "(none)")} at=${String(latestEvent.ts || "")}`
    );
  }
  const garbledExamples = Array.isArray(diagnostics.garbled_examples) ? diagnostics.garbled_examples.slice(0, 3) : [];
  if (garbledExamples.length) {
    lines.push("Suspected garbled learning examples:");
    garbledExamples.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.user_preview || item.assistant_preview || item.compressed_pattern || item.id || "(item)"}`);
    });
  }
  return lines.join("\n");
}

function renderLearningDebugPanel() {
  if (!ui.learningDebugPanel) {
    return;
  }
  const isDebug = learningReviewState.activeTab === "debug";
  ui.learningDebugPanel.hidden = !isDebug;
  if (ui.learningReviewList) {
    ui.learningReviewList.hidden = isDebug;
  }
  if (!isDebug) {
    return;
  }
  ui.learningDebugPanel.textContent = buildMemoryDebugReport();
  if (ui.learningReviewSummary) {
    ui.learningReviewSummary.textContent = "Memory and learning chain debug snapshot";
  }
}

function refreshLearningSelectAllState(filteredItems) {
  if (!ui.learningSelectAll) {
    return;
  }
  if (learningReviewState.activeTab === "debug") {
    ui.learningSelectAll.indeterminate = false;
    ui.learningSelectAll.checked = false;
    if (ui.learningSelectedCount) {
      ui.learningSelectedCount.textContent = "宸查€?0";
    }
    if (ui.learningBatchDeleteBtn) ui.learningBatchDeleteBtn.disabled = true;
    if (ui.learningBatchUpBtn) ui.learningBatchUpBtn.disabled = true;
    if (ui.learningBatchDownBtn) ui.learningBatchDownBtn.disabled = true;
    if (ui.learningBatchPromoteBtn) ui.learningBatchPromoteBtn.disabled = true;
    return;
  }
  const selectedSet = getLearningSelectedSet();
  const visibleIds = filteredItems.map((item) => item.id);
  const selectedVisible = visibleIds.filter((id) => selectedSet.has(id));
  ui.learningSelectAll.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleIds.length;
  ui.learningSelectAll.checked = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  if (ui.learningSelectedCount) {
    ui.learningSelectedCount.textContent = `已选 ${selectedSet.size}`;
  }
  const canBatch = selectedSet.size > 0;
  if (ui.learningBatchDeleteBtn) ui.learningBatchDeleteBtn.disabled = !canBatch;
  if (ui.learningBatchUpBtn) ui.learningBatchUpBtn.disabled = !canBatch;
  if (ui.learningBatchDownBtn) ui.learningBatchDownBtn.disabled = !canBatch;
  if (ui.learningBatchPromoteBtn) {
    ui.learningBatchPromoteBtn.disabled = !canBatch || learningReviewState.activeTab !== "candidates";
  }
}

function renderLearningReviewList() {
  if (!ui.learningReviewList) {
    return;
  }
  if (learningReviewState.activeTab === "debug") {
    if (ui.learningTabCandidates) {
      ui.learningTabCandidates.classList.remove("is-active");
      ui.learningTabCandidates.setAttribute("aria-selected", "false");
    }
    if (ui.learningTabSamples) {
      ui.learningTabSamples.classList.remove("is-active");
      ui.learningTabSamples.setAttribute("aria-selected", "false");
    }
    if (ui.learningTabDebug) {
      ui.learningTabDebug.classList.add("is-active");
      ui.learningTabDebug.setAttribute("aria-selected", "true");
    }
    refreshLearningSelectAllState([]);
    renderLearningDebugPanel();
    return;
  }
  const tab = learningReviewState.activeTab === "samples" ? "samples" : "candidates";
  const filteredItems = getLearningFilteredItems();
  ui.learningReviewList.innerHTML = "";
  ui.learningReviewList.hidden = false;
  if (ui.learningDebugPanel) {
    ui.learningDebugPanel.hidden = true;
  }

  if (ui.learningTabCandidates) {
    const active = tab === "candidates";
    ui.learningTabCandidates.classList.toggle("is-active", active);
    ui.learningTabCandidates.setAttribute("aria-selected", String(active));
  }
  if (ui.learningTabSamples) {
    const active = tab === "samples";
    ui.learningTabSamples.classList.toggle("is-active", active);
    ui.learningTabSamples.setAttribute("aria-selected", String(active));
  }
  if (ui.learningTabDebug) {
    ui.learningTabDebug.classList.remove("is-active");
    ui.learningTabDebug.setAttribute("aria-selected", "false");
  }
  if (ui.learningReviewSummary) {
    ui.learningReviewSummary.textContent =
      `候选 ${learningReviewState.candidates.length} 条 · 正式 ${learningReviewState.samples.length} 条 · 当前显示 ${filteredItems.length} 条`;
  }

  if (!filteredItems.length) {
    const empty = document.createElement("div");
    empty.className = "learning-empty";
    empty.textContent = "当前筛选条件下暂无数据";
    ui.learningReviewList.appendChild(empty);
    refreshLearningSelectAllState(filteredItems);
    return;
  }

  const selectedSet = getLearningSelectedSet(tab);
  filteredItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "learning-item";
    const scoreValue = Number(item.score || 0);
    const confidenceValue = Number(item.confidence || 0);
    const supportValue = Math.max(0, Number(item.support_count || 0));

    const head = document.createElement("div");
    head.className = "learning-item-head";

    const checkLabel = document.createElement("label");
    checkLabel.className = "learning-item-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "learning-check";
    checkbox.dataset.id = item.id;
    checkbox.checked = selectedSet.has(item.id);
    const checkText = document.createElement("span");
    checkText.textContent = item.id;
    checkLabel.appendChild(checkbox);
    checkLabel.appendChild(checkText);

    const status = document.createElement("span");
    const rawStatus = String(item.status || "candidate").trim().toLowerCase();
    const statusClass = rawStatus.replace(/[^a-z0-9_-]/g, "") || "candidate";
    const statusLabelMap = {
      candidate: "候选",
      active: "正式",
      promoted: "已晋升",
      archived: "已归档"
    };
    status.className = `learning-item-status is-${statusClass}`;
    status.textContent = statusLabelMap[rawStatus] || String(item.status || "候选");
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "learning-item-toggle";
    toggleBtn.textContent = "展开";
    const headRight = document.createElement("div");
    headRight.className = "learning-item-head-right";
    headRight.appendChild(status);
    headRight.appendChild(toggleBtn);

    head.appendChild(checkLabel);
    head.appendChild(headRight);

    const preview = document.createElement("div");
    preview.className = "learning-item-preview";
    const lineA = document.createElement("p");
    lineA.className = "learning-item-line";
    const strongA = document.createElement("strong");
    strongA.textContent = "原始回复：";
    lineA.appendChild(strongA);
    lineA.appendChild(document.createTextNode(item.assistant_preview || "-"));
    const lineB = document.createElement("p");
    lineB.className = "learning-item-line";
    const strongB = document.createElement("strong");
    strongB.textContent = "风格提炼：";
    lineB.appendChild(strongB);
    lineB.appendChild(document.createTextNode(item.compressed_pattern || "-"));
    preview.appendChild(lineA);
    preview.appendChild(lineB);

    const metrics = document.createElement("div");
    metrics.className = "learning-item-metrics";
    const scoreTag = document.createElement("span");
    scoreTag.className = "learning-metric metric-score";
    scoreTag.textContent = `评分 ${scoreValue.toFixed(2)}`;
    if (scoreValue >= 0.8) scoreTag.classList.add("is-high");
    else if (scoreValue >= 0.6) scoreTag.classList.add("is-mid");
    else scoreTag.classList.add("is-low");

    const confTag = document.createElement("span");
    confTag.className = "learning-metric metric-confidence";
    confTag.textContent = `置信 ${confidenceValue.toFixed(2)}`;
    if (confidenceValue >= 0.75) confTag.classList.add("is-high");
    else if (confidenceValue >= 0.5) confTag.classList.add("is-mid");
    else confTag.classList.add("is-low");

    const supportTag = document.createElement("span");
    supportTag.className = "learning-metric metric-support";
    supportTag.textContent = `支持 ${supportValue}`;
    if (supportValue >= 3) supportTag.classList.add("is-high");
    else if (supportValue >= 1) supportTag.classList.add("is-mid");
    else supportTag.classList.add("is-low");

    metrics.appendChild(scoreTag);
    metrics.appendChild(confTag);
    metrics.appendChild(supportTag);

    const actions = document.createElement("div");
    actions.className = "learning-item-actions";
    const makeActionButton = (label, action, extraClass = "") => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.dataset.action = action;
      btn.dataset.id = item.id;
      if (extraClass) {
        String(extraClass).split(/\s+/).filter(Boolean).forEach((cls) => btn.classList.add(cls));
      }
      return btn;
    };
    actions.appendChild(makeActionButton("保留", "keep", "is-keep"));
    actions.appendChild(makeActionButton("删除", "delete", "danger"));
    actions.appendChild(makeActionButton("升权 +0.05", "weight_up", "is-up"));
    actions.appendChild(makeActionButton("降权 -0.05", "weight_down", "is-down"));
    if (tab === "candidates") {
      actions.appendChild(makeActionButton("晋升正式池", "promote", "is-promote"));
    }

    const body = document.createElement("div");
    body.className = "learning-item-body";
    body.appendChild(preview);
    body.appendChild(metrics);
    body.appendChild(actions);

    const setCollapsed = (nextCollapsed) => {
      card.classList.toggle("is-collapsed", !!nextCollapsed);
      toggleBtn.textContent = nextCollapsed ? "展开" : "收起";
      toggleBtn.setAttribute("aria-expanded", String(!nextCollapsed));
    };
    setCollapsed(true);
    toggleBtn.addEventListener("click", () => {
      setCollapsed(!card.classList.contains("is-collapsed"));
    });

    card.appendChild(head);
    card.appendChild(body);
    ui.learningReviewList.appendChild(card);
  });

  refreshLearningSelectAllState(filteredItems);
}

async function learningFetchJson(url, options = {}) {
  const resp = await authFetch(url, options);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || (data && data.ok === false)) {
    const errText = String(data?.error || data?.message || `HTTP ${resp.status}`);
    throw new Error(errText);
  }
  return data;
}

async function reloadLearningReviewData() {
  setLearningReviewLoading(true);
  try {
    const [payload, debugPayload] = await Promise.all([
      learningFetchJson("/api/learning/reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }),
      learningFetchJson("/api/memory/debug")
    ]);
    applyLearningPayload(payload);
    applyMemoryDebugPayload(debugPayload);
    renderLearningReviewList();
    setStatus(payload?.message || "学习审核数据已刷新");
  } finally {
    setLearningReviewLoading(false);
  }
}

async function reloadMemoryDebugData() {
  const payload = await learningFetchJson("/api/memory/debug");
  applyMemoryDebugPayload(payload);
  renderLearningDebugPanel();
  return payload;
}

async function updateLearningEntries(action, extra = {}) {
  const payload = await learningFetchJson("/api/learning/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...extra
    })
  });
  applyLearningPayload(payload);
  renderLearningReviewList();
  if (payload?.message) {
    setStatus(payload.message);
  }
  return payload;
}

async function promoteLearningEntries(candidateIds) {
  const payload = await learningFetchJson("/api/learning/promote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate_ids: Array.isArray(candidateIds) ? candidateIds : []
    })
  });
  applyLearningPayload(payload);
  renderLearningReviewList();
  if (payload?.message) {
    setStatus(payload.message);
  }
  return payload;
}

async function undoLearningLastStep() {
  const payload = await updateLearningEntries("undo", {});
  setStatus(payload?.message || "已撤销上一步");
  return payload;
}

function openLearningReviewDrawer() {
  if (!ui.learningReviewDrawer || !ui.learningReviewBackdrop) {
    return;
  }
  if (isHelpOpen()) {
    closeHelpModal();
  }
  if (isOnboardingOpen()) {
    closeOnboardingModal();
  }
  if (ui.scheduleModal && !ui.scheduleModal.hidden) {
    closeSchedulePanel();
  }
  if (ui.personaModal && !ui.personaModal.hidden) {
    closePersonaPanel();
  }
  ui.learningReviewBackdrop.hidden = false;
  ui.learningReviewDrawer.hidden = false;
  document.body.classList.add("learning-review-open");
  renderLearningReviewList();
  reloadLearningReviewData().catch((err) => {
    setStatus(`学习审核加载失败: ${err.message || err}`);
  });
}

function closeLearningReviewDrawer() {
  if (!ui.learningReviewDrawer || !ui.learningReviewBackdrop) {
    return;
  }
  ui.learningReviewDrawer.hidden = true;
  ui.learningReviewBackdrop.hidden = true;
  document.body.classList.remove("learning-review-open");
}

function toggleLearningReviewDrawer() {
  if (isLearningReviewOpen()) {
    closeLearningReviewDrawer();
    return;
  }
  openLearningReviewDrawer();
}

async function runLearningSingleAction(action, itemId) {
  const tab = learningReviewState.activeTab === "samples" ? "samples" : "candidates";
  const id = String(itemId || "").trim();
  if (!id) {
    return;
  }
  if (action === "promote") {
    await promoteLearningEntries([id]);
    return;
  }
  if (action === "weight_up") {
    await updateLearningEntries("weight", { pool: tab, ids: [id], delta: 0.05 });
    return;
  }
  if (action === "weight_down") {
    await updateLearningEntries("weight", { pool: tab, ids: [id], delta: -0.05 });
    return;
  }
  if (action === "delete") {
    await updateLearningEntries("delete", { pool: tab, ids: [id] });
    return;
  }
  if (action === "keep") {
    await updateLearningEntries("keep", { pool: tab, ids: [id] });
  }
}

async function runLearningBatchAction(action) {
  const tab = learningReviewState.activeTab === "samples" ? "samples" : "candidates";
  const selectedSet = getLearningSelectedSet(tab);
  const visibleIds = new Set(getLearningFilteredItems().map((item) => String(item?.id || "").trim()).filter(Boolean));
  const ids = Array.from(selectedSet).filter((id) => visibleIds.has(String(id || "").trim()));
  if (!ids.length) {
    setStatus("请先勾选当前筛选结果中的条目");
    return;
  }
  if (action === "promote") {
    if (tab !== "candidates") {
      setStatus("只有候选池支持晋升");
      return;
    }
    await promoteLearningEntries(ids);
  } else if (action === "delete") {
    await updateLearningEntries("delete", { pool: tab, ids });
  } else if (action === "weight_up") {
    await updateLearningEntries("weight", { pool: tab, ids, delta: 0.05 });
  } else if (action === "weight_down") {
    await updateLearningEntries("weight", { pool: tab, ids, delta: -0.05 });
  }
  ids.forEach((id) => selectedSet.delete(id));
  renderLearningReviewList();
}

async function applyLearningQuickSettings() {
  const injectCount = Number(ui.learningQuickInject?.value || 0) >= 1 ? 1 : 0;
  const minSupport = Number(ui.learningQuickSupport?.value || 1) >= 2 ? 2 : 1;
  await updateLearningEntries("config", {
    quick_settings: {
      inject_count: injectCount,
      promotion_min_support: minSupport
    }
  });
}

function renderScheduleList() {
  if (!ui.scheduleList) {
    return;
  }
  ui.scheduleList.innerHTML = "";
  const items = (state.reminders || [])
    .filter((item) => item && (!item.done || normalizeReminderRepeat(item.repeat) === "daily"))
    .sort((a, b) => (Number(a?.dueAt) || 0) - (Number(b?.dueAt) || 0));

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "schedule-empty";
    const title = document.createElement("div");
    title.className = "schedule-empty-title";
    title.textContent = "还没有日程";
    const desc = document.createElement("div");
    desc.className = "schedule-empty-desc";
    desc.textContent = "你可以设置某个时间点让馨语AI桌宠主动说话、提醒你，或直接执行工具任务。";
    empty.appendChild(title);
    empty.appendChild(desc);
    ui.scheduleList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "schedule-item";

    const main = document.createElement("div");
    main.className = "schedule-item-main";

    const text = document.createElement("div");
    text.className = "schedule-item-text";
    text.textContent = String(item.text || "").trim();

    const meta = document.createElement("div");
    meta.className = "schedule-item-meta";

    const modeTag = document.createElement("span");
    modeTag.className = `schedule-tag ${normalizeReminderMode(item.mode)}`;
    modeTag.textContent = buildReminderTypeLabel(item);

    const repeatTag = document.createElement("span");
    repeatTag.className = "schedule-tag";
    repeatTag.textContent = normalizeReminderRepeat(item.repeat) === "daily" ? "每天重复" : "一次";

    const time = document.createElement("div");
    time.className = "schedule-item-time";
    time.textContent = buildReminderDisplayTime(item);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "schedule-delete-btn";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () => {
      const ok = removeReminderById(item.id);
      setStatus(ok ? "日程已删除" : "未找到该日程");
    });

    meta.appendChild(modeTag);
    meta.appendChild(repeatTag);
    main.appendChild(text);
    main.appendChild(meta);
    main.appendChild(time);
    row.appendChild(main);
    row.appendChild(delBtn);
    ui.scheduleList.appendChild(row);
  }
}

function addReminder(text, dueAt, opts = {}) {
  const id = state.reminderSeq++;
  state.reminders.push({
    id,
    text: String(text || "").trim(),
    dueAt: Number(dueAt) || Date.now(),
    done: false,
    mode: normalizeReminderMode(opts.mode),
    repeat: normalizeReminderRepeat(opts.repeat)
  });
  state.reminders.sort((a, b) => a.dueAt - b.dueAt);
  saveRemindersToStorage();
  return id;
}

function listPendingReminders() {
  return (state.reminders || []).filter((r) => r && !r.done);
}

function removeReminderById(id) {
  const target = Math.floor(Number(id) || 0);
  if (!target) {
    return false;
  }
  const before = state.reminders.length;
  state.reminders = state.reminders.filter((r) => Number(r?.id) !== target);
  const changed = state.reminders.length !== before;
  if (changed) {
    saveRemindersToStorage();
  }
  return changed;
}

function saveScheduleFromForm() {
  if (!ui.scheduleDatetime || !ui.scheduleTask || !ui.scheduleRepeat || !ui.scheduleMode) {
    return;
  }
  const rawDate = String(ui.scheduleDatetime.value || "").trim();
  const text = String(ui.scheduleTask.value || "").trim();
  const repeat = normalizeReminderRepeat(ui.scheduleRepeat.value);
  const mode = normalizeReminderMode(ui.scheduleMode.value);
  if (!rawDate) {
    setStatus("请先选择执行时间");
    ui.scheduleDatetime.focus();
    return;
  }
  if (!text) {
    setStatus("请先写下让馨语AI桌宠做什么");
    ui.scheduleTask.focus();
    return;
  }

  let dueAt = new Date(rawDate).getTime();
  if (!Number.isFinite(dueAt)) {
    setStatus("日程时间格式无效");
    ui.scheduleDatetime.focus();
    return;
  }

  const now = Date.now();
  if (repeat === "daily") {
    while (dueAt <= now) {
      dueAt = shiftReminderToNextDay(dueAt);
    }
  } else if (dueAt <= now + 5000) {
    setStatus("执行时间需要晚于当前");
    ui.scheduleDatetime.focus();
    return;
  }

  const id = addReminder(text, dueAt, { mode, repeat });
  ui.scheduleTask.value = "";
  ui.scheduleDatetime.value = buildDefaultScheduleDateTimeValue();
  setStatus(`已添加日程 #${id}`);
}

function loadEmotionStats() {
  const raw = window.localStorage ? localStorage.getItem(EMOTION_STORAGE_KEY) : "";
  const parsed = safeParseJSON(raw, { day: "", items: [] });
  const today = new Date().toISOString().slice(0, 10);
  if (!parsed || typeof parsed !== "object" || parsed.day !== today || !Array.isArray(parsed.items)) {
    state.emotionDayKey = today;
    state.emotionStats = [];
    return;
  }
  state.emotionDayKey = today;
  state.emotionStats = parsed.items
    .map((x) => ({
      mood: String(x?.mood || "idle"),
      ts: Number(x?.ts) || Date.now()
    }))
    .filter((x) => ["happy", "sad", "angry", "surprised", "idle"].includes(x.mood))
    .slice(-800);
}

function saveEmotionStats() {
  if (!window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(
      EMOTION_STORAGE_KEY,
      JSON.stringify({
        day: state.emotionDayKey || new Date().toISOString().slice(0, 10),
        items: state.emotionStats || []
      })
    );
  } catch (_) {
    // ignore
  }
}

function recordEmotion(mood) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.emotionDayKey !== today) {
    state.emotionDayKey = today;
    state.emotionStats = [];
  }
  const m = String(mood || "idle");
  state.emotionStats.push({ mood: m, ts: Date.now() });
  if (state.emotionStats.length > 1000) {
    state.emotionStats = state.emotionStats.slice(state.emotionStats.length - 1000);
  }
  saveEmotionStats();
}

function buildEmotionReportText() {
  if (!Array.isArray(state.emotionStats) || !state.emotionStats.length) {
    return "今天还没有足够的对话数据，先多聊几句我再给你情绪日报。";
  }
  const counts = { happy: 0, sad: 0, angry: 0, surprised: 0, idle: 0 };
  for (const item of state.emotionStats) {
    const mood = String(item?.mood || "idle");
    if (Object.prototype.hasOwnProperty.call(counts, mood)) {
      counts[mood] += 1;
    }
  }
  const label = {
    happy: "开心",
    sad: "低落",
    angry: "紧张",
    surprised: "惊讶",
    idle: "平稳"
  };
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const detail = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${label[k] || k}${n}`)
    .join("，");
  return `今日情绪日报：我回复里占比最高的是「${label[top[0]] || top[0]}」。统计：${detail}。`;
}

function markReminderTriggered(item) {
  if (!item) {
    return;
  }
  if (normalizeReminderRepeat(item.repeat) === "daily") {
    item.done = false;
    item.dueAt = shiftReminderToNextDay(item.dueAt);
  } else {
    item.done = true;
  }
}

function startAssistantReminder(item) {
  if (!item || state.chatBusy) {
    return false;
  }
  const snapshot = {
    dueAt: Number(item.dueAt) || Date.now(),
    done: !!item.done
  };
  const scheduleLabel = buildReminderDisplayTime(item);
  const taskText = String(item.text || "").trim();
  const reminderMode = normalizeReminderMode(item.mode);
  if (!taskText) {
    return false;
  }
  markReminderTriggered(item);
  saveRemindersToStorage();
  const promptPrefix = reminderMode === "tool"
    ? `（日程工具任务：${scheduleLabel}）请直接完成这项任务；如果涉及文件、代码、命令或图片，请优先调用工具再给我简短汇报。`
    : `（日程任务：${scheduleLabel}）`;
  requestAssistantReply(`${promptPrefix}${taskText}`, {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false,
    auto: true,
    silentError: true,
    forceTools: reminderMode === "tool"
  }).then((ok) => {
    if (ok) {
      return;
    }
    item.dueAt = snapshot.dueAt;
    item.done = snapshot.done;
    saveRemindersToStorage();
  }).catch(() => {
    item.dueAt = snapshot.dueAt;
    item.done = snapshot.done;
    saveRemindersToStorage();
  });
  return true;
}

function runReminderCheck() {
  runDailyGreetingCheck();
  if (!Array.isArray(state.reminders) || !state.reminders.length) {
    return;
  }
  if (state.chatBusy) {
    return;
  }
  const now = Date.now();
  let assistantItem = null;
  for (const item of state.reminders) {
    if (!item || item.done) {
      continue;
    }
    if ((Number(item.dueAt) || 0) > now) {
      continue;
    }
    if (["assistant", "tool"].includes(normalizeReminderMode(item.mode))) {
      assistantItem = item;
      break;
    }
  }
  if (assistantItem && startAssistantReminder(assistantItem)) {
    return;
  }
  const dueList = [];
  for (const item of state.reminders) {
    if (!item || item.done) {
      continue;
    }
    if (["assistant", "tool"].includes(normalizeReminderMode(item.mode))) {
      continue;
    }
    if ((Number(item.dueAt) || 0) <= now) {
      markReminderTriggered(item);
      dueList.push(item);
    }
  }
  if (!dueList.length) {
    return;
  }
  saveRemindersToStorage();
  for (const item of dueList) {
    const text = `提醒你：${item.text}`;
    appendMessage("assistant", text);
    const prosody = buildSpeakProsody(text, "idle", false, "steady");
    speak(text, { force: true, interrupt: false, prosody });
  }
}

function runDailyGreetingCheck() {
  if (!state.dailyGreetingEnabled) {
    return;
  }
  if (state.chatBusy) {
    return;
  }
  const now = new Date();
  const due = new Date(now.getTime());
  due.setHours(state.dailyGreetingHour, state.dailyGreetingMinute, 0, 0);
  const dayKey = getLocalDateKey(now);
  const runKey = `morning-${dayKey}`;
  if (state.dailyGreetingLastRunKey === runKey) {
    return;
  }
  if (now.getTime() < due.getTime()) {
    return;
  }
  const maxDelayMs = 90 * 60 * 1000;
  if (now.getTime() - due.getTime() > maxDelayMs) {
    state.dailyGreetingLastRunKey = runKey;
    saveDailyGreetingState();
    return;
  }

  state.dailyGreetingLastRunKey = runKey;
  saveDailyGreetingState();

  const hh = String(state.dailyGreetingHour).padStart(2, "0");
  const mm = String(state.dailyGreetingMinute).padStart(2, "0");
  const prompt = String(state.dailyGreetingPrompt || "").trim()
    || "请你主动说一句早安，再给一句鼓励今天努力的暖心鸡汤。";
  requestAssistantReply(`（定时任务：每天 ${hh}:${mm} 早安问候）${prompt}`, {
    showUser: false,
    rememberUser: false,
    rememberAssistant: false,
    auto: true,
    silentError: true
  }).catch(() => {
    state.dailyGreetingLastRunKey = "";
    saveDailyGreetingState();
  });
}

function startReminderLoop() {
  if (state.reminderTimer) {
    clearInterval(state.reminderTimer);
    state.reminderTimer = 0;
  }
  state.reminderTimer = window.setInterval(() => {
    runReminderCheck();
  }, 1200);
}

async function buildMicDebugReport() {
  const tracks =
    state.localAsrStream && typeof state.localAsrStream.getAudioTracks === "function"
      ? state.localAsrStream.getAudioTracks()
      : [];
  const ctx = state.localAsrContext;
  const now = performance.now();
  const lastFrameAt = Number(state.localAsrLastFrameAt) || 0;
  const frameAge = lastFrameAt > 0 ? Math.round(now - lastFrameAt) : -1;
  const peakRms = Number(state.localAsrPeakRms) || 0;
  const lines = [
    "Mic debug:",
    `mode=${state.asrMode}`,
    `micOpen=${state.micOpen}`,
    `localRunning=${state.localAsrRunning}`,
    `context=${ctx ? ctx.state : "none"}`,
    `sampleRate=${ctx ? ctx.sampleRate : "n/a"}`,
    `lastFrameAgeMs=${frameAge}`,
    `peakRms=${peakRms.toFixed(5)}`,
    `noiseFloor=${(Number(state.localAsrNoiseFloor) || 0).toFixed(5)}`,
    `threshold=${(Number(state.localAsrSpeechThreshold) || 0).toFixed(5)}`,
    `selectedInput=${state.localAsrInputDeviceLabel || "(unknown)"}`,
    `selectedInputMuted=${state.localAsrInputMuted}`
  ];
  if (Array.isArray(state.localAsrInputDeviceCandidates) && state.localAsrInputDeviceCandidates.length) {
    lines.push(`knownInputs=${state.localAsrInputDeviceCandidates.join(" | ")}`);
  }
  if (tracks.length) {
    for (const track of tracks) {
      const settings =
        typeof track.getSettings === "function" ? track.getSettings() || {} : {};
      lines.push(
        `track=${track.label || "(no label)"} enabled=${track.enabled} muted=${track.muted} ready=${track.readyState} channel=${settings.channelCount || "n/a"} device=${settings.deviceId || "default"}`
      );
    }
  } else {
    lines.push("track=none");
  }
  try {
    const devices =
      navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === "function"
        ? await navigator.mediaDevices.enumerateDevices()
        : [];
    const inputs = devices.filter((device) => device.kind === "audioinput");
    if (inputs.length) {
      lines.push(`audioInputs=${inputs.map((device) => device.label || "(hidden label)").join(" | ")}`);
    } else {
      lines.push("audioInputs=none");
    }
  } catch (err) {
    lines.push(`audioInputsError=${err?.message || String(err)}`);
  }
  const hasMutedTrack = tracks.some((track) => !!track?.muted);
  if (state.localAsrInputMuted || hasMutedTrack) {
    lines.push("diagnosis=mic_track_muted");
    lines.push(
      "next=检查 Windows 设置 > 系统 > 声音 > 输入，确认当前麦克风未静音且测试条会动；再检查 隐私和安全性 > 麦克风 > 允许桌面应用"
    );
  } else if (state.localAsrRunning && peakRms <= 0) {
    lines.push("diagnosis=no_audio_level");
    lines.push("next=应用正在收音但音量为 0，请确认系统输入设备选中了真实麦克风");
  }
  return lines.join("\n");
}

async function handleLocalCommand(inputText) {
  const text = String(inputText || "").trim();
  if (!text.startsWith("/")) {
    return false;
  }
  if (text.toLowerCase() === "/micdebug") {
    appendMessage("assistant", await buildMicDebugReport(), { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/ttsdebug") {
    appendMessage("assistant", buildTTSDebugReport(), { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/ttsdebug on") {
    toggleTTSDebugPanel(true);
    appendMessage("assistant", "TTS debug panel enabled.", { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/ttsdebug off") {
    toggleTTSDebugPanel(false);
    appendMessage("assistant", "TTS debug panel disabled.", { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/followupstatus") {
    toggleFollowupReadinessPanel(true);
    appendMessage("assistant", buildFollowupReadinessReport(), { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/translatedebug") {
    appendMessage("assistant", buildTranslateDebugReport(), { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/translatedebug on") {
    toggleTranslateDebugPanel(true);
    appendMessage("assistant", "Translation debug panel enabled.", { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/translatedebug off") {
    toggleTranslateDebugPanel(false);
    appendMessage("assistant", "Translation debug panel disabled.", { enableTranslation: false });
    return true;
  }
  if (text.toLowerCase() === "/memorydebug") {
    try {
      const snapshot = await reloadMemoryDebugData();
      appendMessage("assistant", buildMemoryDebugReport(snapshot), { enableTranslation: false });
    } catch (err) {
      appendMessage("assistant", `Memory debug unavailable: ${err.message || err}`, { enableTranslation: false });
    }
    return true;
  }
  if (text === "/情绪日报") {
    const report = buildEmotionReportText();
    appendMessage("assistant", report);
    const prosody = buildSpeakProsody(report, "idle", false, "steady");
    await speak(report, { force: true, interrupt: true, prosody });
    return true;
  }
  if (text === "/测试语音" || text.toLowerCase() === "/testvoice") {
    const sample = "这是语音测试，如果你听到我说话，说明语音链路正常。";
    appendMessage("assistant", sample);
    const prosody = buildSpeakProsody(sample, "idle", false, "steady");
    await speak(sample, { force: true, interrupt: true, prosody });
    return true;
  }
  if (text === "/提醒列表") {
    const items = listPendingReminders();
    if (!items.length) {
      appendMessage("assistant", "当前没有待提醒事项。");
      return true;
    }
    const lines = items.slice(0, 12).map((x) => `#${x.id} ${formatReminderTime(x.dueAt)} ${x.text}`);
    appendMessage("assistant", `待提醒事项：\n${lines.join("\n")}`);
    return true;
  }
  if (text.startsWith("/取消提醒")) {
    const m = text.match(/^\/取消提醒\s+(\d{1,8})$/);
    if (!m) {
      appendMessage("assistant", "格式：/取消提醒 123");
      return true;
    }
    const ok = removeReminderById(Number(m[1]));
    appendMessage("assistant", ok ? "已取消提醒。" : "未找到该提醒 ID。");
    return true;
  }
  if (text.startsWith("/提醒")) {
    const m = text.match(/^\/提醒\s+(\S+)\s+(.+)$/);
    if (!m) {
      appendMessage("assistant", "格式示例：/提醒 10m 开会  或  /提醒 21:30 喝水");
      return true;
    }
    const dueAt = parseReminderWhen(m[1]);
    const remindText = String(m[2] || "").trim();
    if (!dueAt || !remindText) {
      appendMessage("assistant", "提醒时间格式无效。支持 10m / 30s / 21:30 / 2026-04-12 09:00");
      return true;
    }
    const id = addReminder(remindText, dueAt);
    appendMessage("assistant", `好的，已设置提醒 #${id}（${formatReminderTime(dueAt)}）：${remindText}`);
    return true;
  }
  return false;
}

function updateObserveButton() {
  if (!ui.observeBtn) {
    return;
  }
  if (!state.desktopCanCapture) {
    ui.observeBtn.disabled = true;
    ui.observeBtn.textContent = "观察桌面: 不可用";
    return;
  }
  ui.observeBtn.disabled = false;
  ui.observeBtn.textContent = state.observeDesktop ? "观察桌面: 开" : "观察桌面: 关";
}

function updateLockButton() {
  if (!ui.lockBtn) {
    return;
  }
  const available =
    state.desktopMode &&
    state.desktopBridge === "electron" &&
    window.electronAPI &&
    typeof window.electronAPI.setWindowLock === "function";
  if (!available) {
    ui.lockBtn.disabled = true;
    ui.lockBtn.textContent = "桌面锁定: 不可用";
    return;
  }
  ui.lockBtn.disabled = false;
  ui.lockBtn.textContent = state.windowLocked ? "桌面锁定: 开" : "桌面锁定: 关";
}

function applyWindowLockedState(locked, options = {}) {
  const next = !!locked;
  const force = !!options.force;
  if (!force && state.windowLocked === next) {
    updateLockButton();
    return;
  }
  state.windowLocked = next;
  if (next) {
    stopDesktopWindowDrag();
  }
  refreshDesktopBridgeReady();
}

function setWindowLockedFromUI(locked) {
  const next = !!locked;
  applyWindowLockedState(next);
  if (
    state.desktopBridge === "electron" &&
    window.electronAPI &&
    typeof window.electronAPI.setWindowLock === "function"
  ) {
    try {
      window.electronAPI.setWindowLock(next);
    } catch (_) {
      // ignore bridge failures
    }
  }
}

async function initWindowLockBridge() {
  if (state.desktopBridge !== "electron" || !window.electronAPI) {
    applyWindowLockedState(false, { force: true });
    return;
  }
  if (typeof state.windowLockUnsubscribe === "function") {
    try {
      state.windowLockUnsubscribe();
    } catch (_) {
      // ignore
    }
  }
  state.windowLockUnsubscribe = null;
  if (typeof window.electronAPI.onWindowLockChanged === "function") {
    try {
      state.windowLockUnsubscribe = window.electronAPI.onWindowLockChanged((locked) => {
        applyWindowLockedState(locked, { force: true });
      });
    } catch (_) {
      state.windowLockUnsubscribe = null;
    }
  }
  if (typeof window.electronAPI.getWindowLock === "function") {
    try {
      const locked = await window.electronAPI.getWindowLock();
      applyWindowLockedState(locked, { force: true });
      return;
    } catch (_) {
      // ignore bridge failures
    }
  }
  updateLockButton();
}

function updateAutoChatButton() {
  if (!ui.autoChatBtn) {
    return;
  }
  ui.autoChatBtn.textContent = state.autoChatEnabled ? "自动对话: 开" : "自动对话: 关";
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAsrHotwordRules(raw) {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const entries = Object.entries(raw)
    .map(([from, to]) => [String(from || "").trim(), String(to || "").trim()])
    .filter(([from, to]) => from && to);
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries.map(([from, to]) => ({
    from,
    to,
    regex: new RegExp(escapeRegExp(from), "gi")
  }));
}

function applyAsrHotwordCorrections(text) {
  let out = String(text || "").trim();
  if (!out || !state.asrHotwordRules.length) {
    return out;
  }
  for (const rule of state.asrHotwordRules) {
    out = out.replace(rule.regex, rule.to);
  }
  return out.trim();
}

function updateMicMeter(levelOverride = null) {
  if (!ui.micMeterWrap || !ui.micMeterFill || !ui.micMeterText) {
    return;
  }
  if (!state.showMicMeter) {
    ui.micMeterWrap.style.display = "none";
    return;
  }
  ui.micMeterWrap.style.display = "flex";

  let level = levelOverride;
  if (level == null || !Number.isFinite(Number(level))) {
    level = state.micLevel;
  }
  const v = Math.max(0, Math.min(1, Number(level) || 0));
  const visualFloor = 0.025;
  const visualLevel = v <= visualFloor ? 0 : Math.min(1, (v - visualFloor) / (1 - visualFloor));
  const rawPct = Math.round(visualLevel * 100);
  const eased = Math.pow(visualLevel, 0.72);
  const displayPct = state.micOpen && state.micSuspendDepth <= 0 ? Math.round(eased * 100) : 0;
  ui.micMeterFill.style.width = `${displayPct}%`;
  ui.micMeterFill.style.opacity = displayPct > 0 ? "1" : "0";

  if (!state.micOpen) {
    ui.micMeterText.textContent = "未开麦";
  } else if (state.micSuspendDepth > 0) {
    ui.micMeterText.textContent = "暂停";
  } else if (state.asrMode === "local_vosk" && state.localAsrInputMuted) {
    ui.micMeterText.textContent = "系统静音";
  } else if (rawPct < 8) {
    ui.micMeterText.textContent = "静音";
  } else if (rawPct < 28) {
    ui.micMeterText.textContent = "低";
  } else if (rawPct < 60) {
    ui.micMeterText.textContent = "中";
  } else {
    ui.micMeterText.textContent = "高";
  }
}

function updateMicButton() {
  if (!ui.micBtn) {
    return;
  }
  const micAvailable = state.recognitionAvailable || state.localAsrAvailable;
  if (!micAvailable) {
    ui.micBtn.disabled = true;
    ui.micBtn.textContent = "语音输入不可用";
    updateMicMeter(0);
    return;
  }
  ui.micBtn.disabled = false;
  if (!state.micOpen) {
    ui.micBtn.textContent = "开麦: 关";
    updateMicMeter(0);
    return;
  }
  if (state.micSuspendDepth > 0) {
    ui.micBtn.textContent = "开麦: 暂停";
    updateMicMeter(0);
    return;
  }
  if (state.asrMode === "local_vosk") {
    ui.micBtn.textContent =
      state.localAsrRunning && state.localAsrInputMuted
        ? "开麦: 静音"
        : state.localAsrRunning
          ? "开麦: 开"
          : "开麦: 连接中";
    updateMicMeter();
    return;
  }
  ui.micBtn.textContent = state.recognitionActive ? "开麦: 开" : "开麦: 连接中";
  updateMicMeter();
}

function clearMicRestartTimer() {
  if (!state.micRestartTimer) {
    return;
  }
  clearTimeout(state.micRestartTimer);
  state.micRestartTimer = 0;
}

async function ensureMicPermission() {
  if (state.micPermissionGranted) {
    return true;
  }
  const media = navigator.mediaDevices;
  if (!media || typeof media.getUserMedia !== "function") {
    setStatus("当前环境不支持麦克风权限");
    return false;
  }
  try {
    const stream = await media.getUserMedia({ audio: true, video: false });
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_) {
        // ignore
      }
    }
    state.micPermissionGranted = true;
    return true;
  } catch (err) {
    const name = String(err?.name || "");
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setStatus("请允许麦克风权限后再开麦");
    } else if (name === "NotFoundError") {
      setStatus("未检测到麦克风设备");
    } else {
      setStatus("麦克风权限申请失败");
    }
    return false;
  }
}

function floatToInt16(floatArray) {
  const src = floatArray || new Float32Array(0);
  const out = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const s = Math.max(-1, Math.min(1, src[i]));
    out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return out;
}

function downsampleTo16k(floatArray, inputRate) {
  const src = floatArray || new Float32Array(0);
  const inRate = Number(inputRate) || 16000;
  if (!src.length) {
    return new Int16Array(0);
  }
  if (inRate <= 16000) {
    return floatToInt16(src);
  }
  const ratio = inRate / 16000;
  const outLen = Math.max(1, Math.floor(src.length / ratio));
  const out = new Int16Array(outLen);
  let pos = 0;
  for (let i = 0; i < outLen; i++) {
    const next = Math.min(src.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    while (pos < next) {
      sum += src[pos];
      count += 1;
      pos += 1;
    }
    const avg = count > 0 ? sum / count : 0;
    const s = Math.max(-1, Math.min(1, avg));
    out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return out;
}

function pcmChunksToBase64(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return "";
  }
  let totalSamples = 0;
  for (const ch of chunks) {
    totalSamples += ch?.length || 0;
  }
  if (totalSamples <= 0) {
    return "";
  }
  const bytes = new Uint8Array(totalSamples * 2);
  let offset = 0;
  for (const ch of chunks) {
    const arr = ch || new Int16Array(0);
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      bytes[offset++] = v & 0xff;
      bytes[offset++] = (v >> 8) & 0xff;
    }
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

async function transcribeLocalPcmChunks(chunks, signal = undefined) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return "";
  }
  const audio_base64 = pcmChunksToBase64(chunks);
  if (!audio_base64) {
    return "";
  }
  const resp = await authFetch("/api/asr_pcm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      audio_base64,
      sample_rate: 16000
    })
  });
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      if (data?.error) detail = data.error;
    } catch (_) {
      // ignore
    }
    throw new Error(detail);
  }
  const data = await resp.json();
  return String(data?.text || "").trim();
}

function cancelLocalAsrRequest() {
  if (state.localAsrAbortController) {
    try {
      state.localAsrAbortController.abort();
    } catch (_) {
      // ignore
    }
  }
  state.localAsrAbortController = null;
  state.localAsrSending = false;
}

function updateLocalAsrMicLevelFromRms(rms) {
  const safeRms = Math.max(0, Number(rms) || 0);
  state.localAsrPeakRms = Math.max(Number(state.localAsrPeakRms) || 0, safeRms);
  const displayNoiseFloor = clampNumber(
    state.localAsrNoiseFloor * 1.15 + 0.0004,
    0.0004,
    0.018
  );
  const normalizedLevel = clampNumber((safeRms - displayNoiseFloor) / 0.025, 0, 1);
  const smoothing = normalizedLevel > state.micLevel ? 0.38 : 0.24;
  state.micLevel += (normalizedLevel - state.micLevel) * smoothing;
  if (state.micLevel < 0.01 && normalizedLevel <= 0.001) {
    state.micLevel = 0;
  }
  updateMicMeter(state.micLevel);
}

async function ensureAudioContextRunning(ctx) {
  if (!ctx || ctx.state !== "suspended" || typeof ctx.resume !== "function") {
    return true;
  }
  try {
    await ctx.resume();
  } catch (_) {
    // ignore; the caller will check the final state.
  }
  return ctx.state !== "suspended";
}

function stopLocalAsrMeter() {
  if (state.localAsrMeterRaf) {
    try {
      window.cancelAnimationFrame(state.localAsrMeterRaf);
    } catch (_) {
      // ignore
    }
    try {
      clearTimeout(state.localAsrMeterRaf);
    } catch (_) {
      // ignore
    }
  }
  state.localAsrMeterRaf = 0;
  state.localAsrMeterBuffer = null;
}

function startLocalAsrMeter(sessionId = null) {
  stopLocalAsrMeter();
  const token = sessionId == null ? state.micSession : Number(sessionId);
  const analyser = state.localAsrAnalyser;
  if (!analyser) {
    return;
  }
  const size = Math.max(32, Number(analyser.fftSize) || 512);
  state.localAsrMeterBuffer = new Uint8Array(size);
  const schedule =
    typeof window.requestAnimationFrame === "function"
      ? (fn) => window.requestAnimationFrame(fn)
      : (fn) => window.setTimeout(fn, 60);

  const tick = () => {
    if (token !== state.micSession || !state.micOpen || !state.localAsrAnalyser) {
      state.localAsrMeterRaf = 0;
      return;
    }
    const buffer = state.localAsrMeterBuffer;
    if (buffer && state.micSuspendDepth <= 0) {
      try {
        state.localAsrAnalyser.getByteTimeDomainData(buffer);
        let energy = 0;
        for (let i = 0; i < buffer.length; i++) {
          const n = (buffer[i] - 128) / 128;
          energy += n * n;
        }
        updateLocalAsrMicLevelFromRms(Math.sqrt(energy / buffer.length));
      } catch (_) {
        // ignore; the ASR frame path can still update the meter.
      }
    }
    state.localAsrMeterRaf = schedule(tick);
  };
  state.localAsrMeterRaf = schedule(tick);
}

function stopLocalAsrWatchdog() {
  if (state.localAsrWatchdogTimer) {
    clearInterval(state.localAsrWatchdogTimer);
  }
  state.localAsrWatchdogTimer = 0;
  state.localAsrNoFrameWarned = false;
  state.localAsrMutedWarned = false;
}

function startLocalAsrWatchdog(sessionId = null) {
  stopLocalAsrWatchdog();
  const token = sessionId == null ? state.micSession : Number(sessionId);
  state.localAsrLastFrameAt = performance.now();
  state.localAsrNoFrameWarned = false;
  state.localAsrMutedWarned = false;
  state.localAsrWatchdogTimer = window.setInterval(() => {
    if (token !== state.micSession || !state.micOpen || !state.localAsrRunning) {
      stopLocalAsrWatchdog();
      return;
    }
    if (state.micSuspendDepth > 0) {
      return;
    }
    const ctx = state.localAsrContext;
    if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
      ctx.resume().catch(() => {});
      return;
    }
    const startedAt = Number(state.localAsrStartedAt) || 0;
    const muted = isLocalAsrTrackMuted(state.localAsrStream) || state.localAsrInputMuted;
    if (muted) {
      state.localAsrInputMuted = true;
      if (
        !state.localAsrMutedWarned &&
        startedAt > 0 &&
        performance.now() - startedAt > 1200
      ) {
        state.localAsrMutedWarned = true;
        setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
        updateMicButton();
      }
      return;
    }
    const lastFrameAt = Number(state.localAsrLastFrameAt) || 0;
    if (!state.localAsrNoFrameWarned && performance.now() - lastFrameAt > 2200) {
      state.localAsrNoFrameWarned = true;
      setStatus("麦克风已开启，但没有收到音频，请检查系统输入设备");
      return;
    }
    const peakRms = Number(state.localAsrPeakRms) || 0;
    const lowLevelLine = Math.max(0.0018, (Number(state.localAsrSpeechThreshold) || 0.0035) * 0.55);
    if (
      !state.localAsrLowLevelWarned &&
      startedAt > 0 &&
      performance.now() - startedAt > 5500 &&
      peakRms > 0 &&
      peakRms < lowLevelLine
    ) {
      state.localAsrLowLevelWarned = true;
      if (!state.localAsrThresholdAutoAdjusted && state.localAsrSpeechThreshold > 0.0042) {
        const loweredThreshold = clampNumber(
          state.localAsrSpeechThreshold * 0.62,
          0.0022,
          0.0042
        );
        if (loweredThreshold < state.localAsrSpeechThreshold) {
          state.localAsrSpeechThreshold = loweredThreshold;
          state.localAsrThresholdAutoAdjusted = true;
          setStatus("麦克风输入偏低，已自动降低识别阈值一次");
          return;
        }
      }
      setStatus("麦克风输入音量很低，请检查系统输入设备或靠近麦克风");
    }
  }, 1200);
}

async function flushLocalAsrUtterance(force = false, sessionId = null) {
  const token = sessionId == null ? state.micSession : Number(sessionId);
  if (token !== state.micSession) {
    return;
  }
  if (state.localAsrSending) {
    return;
  }
  if (!state.localAsrBuffers.length) {
    return;
  }
  const speechMs = state.localAsrSpeechMs;
  if (!force && speechMs < state.localAsrMinSpeechMs) {
    return;
  }
  const chunks = state.localAsrBuffers.slice();
  state.localAsrBuffers = [];
  state.localAsrSpeeching = false;
  state.localAsrSpeechMs = 0;
  state.localAsrSilenceMs = 0;
  state.localAsrSending = true;
  const controller = new AbortController();
  state.localAsrAbortController = controller;
  try {
    const text = await transcribeLocalPcmChunks(chunks, controller.signal);
    if (token !== state.micSession || !state.micOpen) {
      return;
    }
    if (text) {
      enqueueMicTranscript(text, token);
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      return;
    }
    setStatus(`语音识别失败: ${err.message}`);
  } finally {
    if (state.localAsrAbortController === controller) {
      state.localAsrAbortController = null;
    }
    state.localAsrSending = false;
  }
}

function handleLocalAsrFrame(floatData, inputSampleRate, sessionId = null) {
  const token = sessionId == null ? state.micSession : Number(sessionId);
  if (token !== state.micSession || !state.micOpen) {
    return;
  }
  const pcm16 = downsampleTo16k(floatData, inputSampleRate);
  if (!pcm16.length) {
    return;
  }
  let energy = 0;
  for (let i = 0; i < pcm16.length; i++) {
    const n = pcm16[i] / 32768;
    energy += n * n;
  }
  const rms = Math.sqrt(energy / pcm16.length);
  const frameMs = (pcm16.length / 16000) * 1000;
  updateLocalAsrMicLevelFromRms(rms);

  const baseThreshold = clampNumber(state.localAsrSpeechThreshold || 0.0035, 0.0015, 0.05);
  const adaptiveThreshold = Math.max(
    baseThreshold,
    clampNumber(state.localAsrNoiseFloor * 1.8 + 0.001, 0.0015, 0.02)
  );
  const isSpeech = rms >= adaptiveThreshold;

  if (isSpeech) {
    state.localAsrSpeeching = true;
    state.localAsrSpeechMs += frameMs;
    state.localAsrSilenceMs = 0;
    state.localAsrBuffers.push(pcm16);
    if (state.localAsrSpeechMs >= state.localAsrMaxSpeechMs) {
      flushLocalAsrUtterance(true, token);
    }
    return;
  }

  if (!state.localAsrSpeeching) {
    // Keep tracking environment noise to auto-adapt threshold.
    state.localAsrNoiseFloor = state.localAsrNoiseFloor * 0.94 + rms * 0.06;
  }

  if (!state.localAsrSpeeching) {
    return;
  }
  state.localAsrSilenceMs += frameMs;
  if (state.localAsrSilenceMs < state.localAsrSilenceTriggerMs) {
    state.localAsrBuffers.push(pcm16);
    return;
  }
  flushLocalAsrUtterance(false, token);
}

function clearLocalAsrGraph() {
  stopLocalAsrMeter();
  stopLocalAsrWatchdog();
  if (state.localAsrProcessor) {
    try {
      state.localAsrProcessor.disconnect();
    } catch (_) {
      // ignore
    }
  }
  if (state.localAsrAnalyser) {
    try {
      state.localAsrAnalyser.disconnect();
    } catch (_) {
      // ignore
    }
  }
  if (state.localAsrSource) {
    try {
      state.localAsrSource.disconnect();
    } catch (_) {
      // ignore
    }
  }
  if (state.localAsrContext) {
    try {
      state.localAsrContext.close();
    } catch (_) {
      // ignore
    }
  }
  if (state.localAsrStream) {
    for (const track of state.localAsrStream.getTracks()) {
      try {
        track.stop();
      } catch (_) {
        // ignore
      }
    }
  }
  state.localAsrStream = null;
  state.localAsrContext = null;
  state.localAsrSource = null;
  state.localAsrProcessor = null;
  state.localAsrAnalyser = null;
  state.localAsrLastFrameAt = 0;
  state.localAsrPeakRms = 0;
  state.localAsrStartedAt = 0;
  state.localAsrLowLevelWarned = false;
  state.localAsrThresholdAutoAdjusted = false;
  state.localAsrMutedWarned = false;
  state.localAsrInputDeviceId = "";
  state.localAsrInputDeviceLabel = "";
  state.localAsrInputMuted = false;
  state.localAsrRunning = false;
  state.localAsrSpeeching = false;
  state.localAsrSpeechMs = 0;
  state.localAsrSilenceMs = 0;
  state.localAsrBuffers = [];
  state.localAsrNoiseFloor = 0.0008;
  state.micLevel = 0;
  updateMicMeter(0);
}

function buildLocalAsrAudioConstraints(deviceId = "") {
  const audio = {
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 16000 },
    latency: { ideal: 0 },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };
  const safeDeviceId = String(deviceId || "").trim();
  if (safeDeviceId) {
    audio.deviceId = { exact: safeDeviceId };
  }
  return { audio, video: false };
}

function getLocalAsrAudioTrack(stream) {
  return stream && typeof stream.getAudioTracks === "function"
    ? (stream.getAudioTracks()[0] || null)
    : null;
}

function getLocalAsrTrackLabel(stream) {
  return String(getLocalAsrAudioTrack(stream)?.label || "").trim();
}

function isLocalAsrTrackMuted(stream) {
  return !!getLocalAsrAudioTrack(stream)?.muted;
}

function isDisfavoredLocalAsrInputLabel(label) {
  return /stereo mix|loopback|what u hear|\u7acb\u4f53\u58f0\u6df7\u97f3/i.test(
    String(label || "")
  );
}

function scoreLocalAsrInputDevice(device) {
  const label = String(device?.label || "").toLowerCase();
  if (!label) {
    return 0;
  }
  let score = 0;
  if (/microphone|mic|\u9ea6\u514b\u98ce|\u9635\u5217/.test(label)) {
    score += 80;
  }
  if (/realtek|array/.test(label)) {
    score += 12;
  }
  if (/default|communications/.test(label)) {
    score -= 4;
  }
  if (/stereo mix|loopback|what u hear|\u7acb\u4f53\u58f0\u6df7\u97f3/.test(label)) {
    score -= 120;
  }
  return score;
}

function choosePreferredLocalAsrInputDevice(devices) {
  const inputs = Array.isArray(devices)
    ? devices.filter((device) => device && device.kind === "audioinput")
    : [];
  if (!inputs.length) {
    return null;
  }
  const ranked = inputs
    .map((device, index) => ({ device, index, score: scoreLocalAsrInputDevice(device) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));
  const best = ranked[0];
  return best && best.score > 0 ? best.device : null;
}

function rememberLocalAsrInputDevice(stream, devices = []) {
  const track = getLocalAsrAudioTrack(stream);
  const settings = track && typeof track.getSettings === "function" ? (track.getSettings() || {}) : {};
  state.localAsrInputDeviceId = String(settings.deviceId || "").trim();
  state.localAsrInputDeviceLabel = String(track?.label || "").trim();
  state.localAsrInputMuted = !!track?.muted;
  state.localAsrInputDeviceCandidates = Array.isArray(devices)
    ? devices
        .filter((device) => device && device.kind === "audioinput")
        .map((device) => String(device.label || "(hidden label)").trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

async function openPreferredLocalAsrStream(media) {
  let stream = await media.getUserMedia(buildLocalAsrAudioConstraints());
  let devices = [];
  try {
    devices = await media.enumerateDevices();
  } catch (_) {
    devices = [];
  }
  const currentTrack = getLocalAsrAudioTrack(stream);
  const currentSettings =
    currentTrack && typeof currentTrack.getSettings === "function"
      ? (currentTrack.getSettings() || {})
      : {};
  const currentDeviceId = String(currentSettings.deviceId || "").trim();
  const currentLabel = getLocalAsrTrackLabel(stream);
  if (!isDisfavoredLocalAsrInputLabel(currentLabel) && !isLocalAsrTrackMuted(stream)) {
    rememberLocalAsrInputDevice(stream, devices);
    return stream;
  }

  const inputs = Array.isArray(devices)
    ? devices.filter((device) => device && device.kind === "audioinput")
    : [];
  const ranked = inputs
    .map((device, index) => ({ device, index, score: scoreLocalAsrInputDevice(device) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));
  for (const item of ranked) {
    const candidate = item.device;
    const candidateDeviceId = String(candidate?.deviceId || "").trim();
    if (!candidateDeviceId || candidateDeviceId === currentDeviceId || item.score <= 0) {
      continue;
    }
    let candidateStream = null;
    try {
      candidateStream = await media.getUserMedia(
        buildLocalAsrAudioConstraints(candidateDeviceId)
      );
      if (
        isDisfavoredLocalAsrInputLabel(getLocalAsrTrackLabel(candidateStream)) ||
        isLocalAsrTrackMuted(candidateStream)
      ) {
        for (const track of candidateStream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
        candidateStream = null;
        continue;
      }
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch (_) {
          // ignore
        }
      }
      stream = candidateStream;
      candidateStream = null;
      break;
    } catch (_) {
      if (candidateStream) {
        for (const track of candidateStream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        }
      }
    }
  }
  rememberLocalAsrInputDevice(stream, devices);
  return stream;
}

async function startLocalAsrLoop(sessionId = null) {
  if (state.localAsrRunning) {
    return true;
  }
  const token = sessionId == null ? state.micSession : Number(sessionId);
  const media = navigator.mediaDevices;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!media || typeof media.getUserMedia !== "function" || !AudioCtx) {
    setStatus("当前环境不支持本地语音识别");
    return false;
  }
  let stream = null;
  try {
    stream = await openPreferredLocalAsrStream(media);
  } catch (err) {
    const name = String(err?.name || "");
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setStatus("请允许麦克风权限后再开麦");
    } else {
      setStatus("麦克风开启失败");
    }
    return false;
  }
  if (token !== state.micSession || !state.micOpen) {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_) {
        // ignore
      }
    }
    return false;
  }
  const audioTrack = stream.getAudioTracks()[0] || null;
  if (audioTrack) {
    audioTrack.onmute = () => {
      state.localAsrInputMuted = true;
      if (token === state.micSession && state.micOpen) {
        setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
        updateMicButton();
      }
    };
    audioTrack.onunmute = () => {
      state.localAsrInputMuted = false;
      if (token === state.micSession && state.micOpen) {
        setStatus("开麦中...");
        updateMicButton();
      }
    };
    audioTrack.onended = () => {
      if (token === state.micSession && state.micOpen) {
        setStatus("麦克风输入已断开，请重新开麦");
      }
    };
  }

  const ctx = new AudioCtx();
  const contextReady = await ensureAudioContextRunning(ctx);
  if (!contextReady) {
    setStatus("麦克风音频未启动，请再点一次开麦");
    try {
      ctx.close();
    } catch (_) {
      // ignore
    }
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_) {
        // ignore
      }
    }
    return false;
  }

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.65;
  const processor = ctx.createScriptProcessor(state.localAsrProcessorBufferSize || 2048, 1, 1);
  const sessionToken = token;
  processor.onaudioprocess = (evt) => {
    if (sessionToken !== state.micSession) {
      return;
    }
    if (!state.micOpen || state.micSuspendDepth > 0) {
      return;
    }
    state.localAsrLastFrameAt = performance.now();
    state.localAsrNoFrameWarned = false;
    const input = evt.inputBuffer.getChannelData(0);
    handleLocalAsrFrame(input, ctx.sampleRate, sessionToken);
  };
  source.connect(analyser);
  source.connect(processor);
  processor.connect(ctx.destination);
  if (sessionToken !== state.micSession || !state.micOpen) {
    try {
      processor.disconnect();
    } catch (_) {
      // ignore
    }
    try {
      analyser.disconnect();
    } catch (_) {
      // ignore
    }
    try {
      source.disconnect();
    } catch (_) {
      // ignore
    }
    try {
      ctx.close();
    } catch (_) {
      // ignore
    }
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_) {
        // ignore
      }
    }
    return false;
  }

  state.localAsrStream = stream;
  state.localAsrContext = ctx;
  state.localAsrSource = source;
  state.localAsrProcessor = processor;
  state.localAsrAnalyser = analyser;
  state.localAsrRunning = true;
  state.localAsrSpeeching = false;
  state.localAsrSpeechMs = 0;
  state.localAsrSilenceMs = 0;
  state.localAsrBuffers = [];
  state.localAsrNoiseFloor = 0.0008;
  state.localAsrLastFrameAt = performance.now();
  state.localAsrPeakRms = 0;
  state.localAsrStartedAt = performance.now();
  state.localAsrNoFrameWarned = false;
  state.localAsrLowLevelWarned = false;
  state.localAsrThresholdAutoAdjusted = false;
  state.localAsrMutedWarned = false;
  state.localAsrInputMuted = !!audioTrack?.muted;
  startLocalAsrMeter(sessionToken);
  startLocalAsrWatchdog(sessionToken);
  return true;
}

function stopLocalAsrLoop(forceFlush = false, sessionId = null) {
  if (forceFlush) {
    flushLocalAsrUtterance(true, sessionId);
  }
  cancelLocalAsrRequest();
  clearLocalAsrGraph();
}

function scheduleMicRecognitionStart(delayMs = 0) {
  if (state.asrMode === "local_vosk") {
    return;
  }
  clearMicRestartTimer();
  if (!state.micOpen || !state.recognition || state.micSuspendDepth > 0) {
    updateMicButton();
    return;
  }
  const backoff = Math.min(2500, 260 + state.micRetryCount * 320);
  const waitMs = Math.max(backoff, Math.max(0, Number(delayMs) || 0));
  state.micRestartTimer = window.setTimeout(() => {
    state.micRestartTimer = 0;
    if (!state.micOpen || !state.recognition || state.micSuspendDepth > 0) {
      updateMicButton();
      return;
    }
    try {
      state.recognition.start();
    } catch (_) {
      state.micRetryCount = Math.min(8, state.micRetryCount + 1);
      scheduleMicRecognitionStart(900);
    }
    updateMicButton();
  }, waitMs);
}

function stopMicLoop(manualClose = false) {
  clearMicRestartTimer();
  if (manualClose) {
    state.micSession += 1;
    state.micOpen = false;
    state.micSuspendDepth = 0;
    state.micRetryCount = 0;
    state.micQueue = [];
    state.wakeCooldownUntil = Date.now() + 1200;
  }
  if (state.asrMode === "local_vosk") {
    stopLocalAsrLoop(false, state.micSession);
    if (manualClose) {
      scheduleWakeWordStart(420);
    }
    updateMicButton();
    return;
  }
  if (state.recognition) {
    try {
      if (manualClose && typeof state.recognition.abort === "function") {
        state.recognition.abort();
      } else {
        state.recognition.stop();
      }
    } catch (_) {
      // ignore
    }
  }
  if (manualClose) {
    state.recognitionActive = false;
    scheduleWakeWordStart(420);
  }
  updateMicButton();
}

async function startMicLoop() {
  stopWakeWordListener(true);
  state.micSession += 1;
  const token = state.micSession;
  state.micOpen = true;
  state.micRetryCount = 0;
  state.micQueue = [];
  if (state.asrMode === "local_vosk") {
    const ok = await startLocalAsrLoop(token);
    if (token !== state.micSession || !state.micOpen) {
      stopLocalAsrLoop(false, state.micSession);
      scheduleWakeWordStart(420);
      updateMicButton();
      return;
    }
    if (!ok) {
      state.micOpen = false;
      scheduleWakeWordStart(420);
      updateMicButton();
      return;
    }
  } else {
    if (!state.recognition) {
      state.micOpen = false;
      scheduleWakeWordStart(420);
      updateMicButton();
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) {
      state.micOpen = false;
      scheduleWakeWordStart(420);
      updateMicButton();
      return;
    }
    scheduleMicRecognitionStart(0);
  }
  updateMicButton();
}

function pauseMicForAssistant() {
  if (!(state.recognitionAvailable || state.localAsrAvailable) || !state.micOpen) {
    return;
  }
  if (state.micKeepListening) {
    updateMicButton();
    return;
  }
  state.micSuspendDepth += 1;
  if (state.asrMode === "local_vosk") {
    updateMicButton();
    return;
  }
  stopMicLoop(false);
}

function resumeMicAfterAssistant() {
  if (!(state.recognitionAvailable || state.localAsrAvailable) || !state.micOpen) {
    return;
  }
  if (state.micKeepListening) {
    updateMicButton();
    return;
  }
  if (state.micSuspendDepth > 0) {
    state.micSuspendDepth -= 1;
  }
  if (state.micSuspendDepth <= 0) {
    state.micSuspendDepth = 0;
    if (state.asrMode === "local_vosk") {
      flushLocalAsrUtterance(true, state.micSession);
    } else {
      scheduleMicRecognitionStart(220);
    }
  }
  updateMicButton();
}

function enqueueMicTranscript(text, sessionId = null) {
  const token = sessionId == null ? state.micSession : Number(sessionId);
  if (token !== state.micSession || !state.micOpen) {
    return;
  }
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    return;
  }
  const corrected = applyAsrHotwordCorrections(cleaned);
  state.micQueue.push(corrected || cleaned);
  runMicQueue();
}

async function runMicQueue() {
  if (state.micQueueWorking) {
    return;
  }
  state.micQueueWorking = true;
  try {
    while (state.micQueue.length > 0) {
      if (!state.micOpen) {
        state.micQueue = [];
        break;
      }
      if (state.chatBusy) {
        await new Promise((resolve) => setTimeout(resolve, 160));
        continue;
      }
      const next = state.micQueue.shift();
      if (!next) {
        continue;
      }
      ui.chatInput.value = "";
      await requestAssistantReply(next, {
        showUser: true,
        rememberUser: true,
        auto: false,
        silentError: false
      });
    }
  } finally {
    state.micQueueWorking = false;
  }
}

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

function parseToolMetaFromText(text) {
  const src = String(text || "");
  const idx = src.indexOf(TOOL_META_MARKER);
  if (idx < 0) {
    return { visibleText: stripAssistantPayloadNoise(src), meta: null };
  }
  const visibleText = stripAssistantPayloadNoise(src.slice(0, idx)).trimEnd();
  const raw = src.slice(idx + TOOL_META_MARKER.length).trim();
  if (!raw) {
    return { visibleText, meta: null };
  }
  try {
    const meta = JSON.parse(raw);
    return { visibleText, meta };
  } catch (_) {
    return { visibleText, meta: null };
  }
}

function stripRuntimeMetadataSuffix(text) {
  if (SPEECH_TEXT && typeof SPEECH_TEXT.stripRuntimeMetadataSuffix === "function") {
    return SPEECH_TEXT.stripRuntimeMetadataSuffix(text);
  }
  return String(text || "");
}

function looksLikeAssistantTextWrapperFragment(text) {
  const safe = String(text || "").trim();
  if (!safe) {
    return false;
  }
  if (!/^\s*[{[]/.test(safe)) {
    return false;
  }
  return /["']?\b(?:text|message|content|output_text)\b["']?\s*:/i.test(safe);
}

function looksLikeEmptyAssistantTextWrapperFragment(text) {
  const safe = String(text || "").trim();
  if (!safe) {
    return false;
  }
  return /^[\s{,\["'`]*\b(?:text|message|content|output_text)\b["']?\s*:?\s*["'`]*$/i.test(safe);
}

function extractAssistantTextFromJsonLike(text) {
  const safe = String(text || "").trim();
  if (!looksLikeAssistantTextWrapperFragment(safe)) {
    return "";
  }
  for (const key of ["text", "message", "content", "output_text"]) {
    const quoted = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i").exec(safe);
    if (quoted) {
      try {
        return String(JSON.parse(`"${quoted[1]}"`) || "").trim();
      } catch (_) {
        return String(quoted[1] || "").trim();
      }
    }
    const singleQuoted = new RegExp(`'${key}'\\s*:\\s*'((?:\\\\.|[^'\\\\])*)'`, "i").exec(safe);
    if (singleQuoted) {
      return String(singleQuoted[1] || "").trim();
    }
  }
  return "";
}

function coerceAssistantPayloadText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value == null) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceAssistantPayloadText(item))
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (typeof value === "object") {
    for (const key of ["text", "message", "content", "output_text"]) {
      const nested = coerceAssistantPayloadText(value[key]);
      if (nested) {
        return nested;
      }
    }
  }
  return "";
}

function extractAssistantPayloadText(text) {
  const safe = String(text || "").trim();
  if (!safe || !/^\s*[{[]/.test(safe)) {
    return "";
  }
  try {
    const parsed = JSON.parse(safe);
    return coerceAssistantPayloadText(parsed);
  } catch (_) {
    return "";
  }
}

function stripAssistantPayloadNoise(text) {
  if (SPEECH_TEXT && typeof SPEECH_TEXT.stripAssistantPayloadNoise === "function") {
    return SPEECH_TEXT.stripAssistantPayloadNoise(text);
  }
  const raw = String(text || "");
  const payloadText = extractAssistantPayloadText(raw);
  if (payloadText) {
    return stripRuntimeMetadataSuffix(payloadText);
  }
  const jsonLikeText = extractAssistantTextFromJsonLike(raw);
  if (jsonLikeText) {
    return stripRuntimeMetadataSuffix(jsonLikeText);
  }
  const visible = stripRuntimeMetadataSuffix(raw);
  if (looksLikeEmptyAssistantTextWrapperFragment(visible)) {
    return "";
  }
  if (looksLikeAssistantTextWrapperFragment(visible)) {
    return "";
  }
  return visible;
}

const CHARACTER_RUNTIME = window.TaffyCharacterRuntime || {};
const CHARACTER_RUNTIME_BRIDGE = window.TaffyCharacterRuntimeBridge || {};
const CHARACTER_RUNTIME_DEBUG_BRIDGE = window.TaffyCharacterRuntimeDebugBridge || {};

function normalizeCharacterRuntimeMetadataForFrontend(raw) {
  const filtered = typeof CHARACTER_RUNTIME_BRIDGE.copyAllowedMetadataFields === "function"
    ? CHARACTER_RUNTIME_BRIDGE.copyAllowedMetadataFields(raw)
    : raw;
  if (typeof CHARACTER_RUNTIME_BRIDGE.normalizeMetadataForFrontend === "function") {
    return CHARACTER_RUNTIME_BRIDGE.normalizeMetadataForFrontend(filtered, CHARACTER_RUNTIME);
  }
  if (typeof CHARACTER_RUNTIME.normalizeMetadataForFrontend !== "function") {
    return null;
  }
  return CHARACTER_RUNTIME.normalizeMetadataForFrontend(filtered);
}

const CHARACTER_RUNTIME_BROADCAST_CHANNEL = CHARACTER_RUNTIME_BRIDGE.BROADCAST_CHANNEL || "taffy-character-runtime";
let characterRuntimeBroadcastChannel = null;

function getCharacterRuntimeBroadcastChannel() {
  if (typeof BroadcastChannel !== "function") {
    return null;
  }
  if (characterRuntimeBroadcastChannel) {
    return characterRuntimeBroadcastChannel;
  }
  try {
    characterRuntimeBroadcastChannel = new BroadcastChannel(CHARACTER_RUNTIME_BROADCAST_CHANNEL);
  } catch (_) {
    characterRuntimeBroadcastChannel = null;
  }
  return characterRuntimeBroadcastChannel;
}

function dispatchCharacterRuntimeMetadataLocally(normalized) {
  const isNormalized = typeof CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata === "function"
    ? CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata(normalized)
    : (!!normalized && typeof normalized === "object" && !Array.isArray(normalized));
  if (!isNormalized) {
    return null;
  }
  try {
    window.__AI_CHAT_LAST_CHARACTER_RUNTIME__ = normalized;
    const evtName = CHARACTER_RUNTIME_BRIDGE.UPDATE_EVENT || "character-runtime:update";
    window.dispatchEvent(new CustomEvent(evtName, { detail: normalized }));
  } catch (_) {
    // Keep bridge side-effect safe; metadata is optional.
  }
  return normalized;
}

function broadcastCharacterRuntimeMetadataToModel(normalized) {
  const isNormalized = typeof CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata === "function"
    ? CHARACTER_RUNTIME_BRIDGE.isNormalizedMetadata(normalized)
    : (!!normalized && typeof normalized === "object" && !Array.isArray(normalized));
  if (!isNormalized) {
    return false;
  }
  if (state.uiView !== "chat") {
    return false;
  }
  const channel = getCharacterRuntimeBroadcastChannel();
  if (!channel) {
    return false;
  }
  try {
    const msg = typeof CHARACTER_RUNTIME_BRIDGE.createRuntimeUpdateMessage === "function"
      ? CHARACTER_RUNTIME_BRIDGE.createRuntimeUpdateMessage(normalized)
      : { type: "character-runtime:update", metadata: normalized };
    if (!msg) {
      return false;
    }
    channel.postMessage(msg);
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeRuntimeEmotionForLive2D(emotion) {
  if (typeof emotion !== "string") {
    return "idle";
  }
  const key = String(emotion || "").trim().toLowerCase();
  if (!key) {
    return "idle";
  }
  if (key === "happy") return "happy";
  if (key === "sad") return "sad";
  if (key === "angry") return "angry";
  if (key === "surprised") return "surprised";
  if (key === "annoyed") return "angry";
  if (key === "thinking") return "idle";
  if (key === "neutral") return "idle";
  return "idle";
}

function getRuntimeEmotionExpressionTuning(mood) {
  if (typeof LIVE2D_EXPRESSION_TUNING.getRuntimeEmotionExpressionTuning === "function") {
    return LIVE2D_EXPRESSION_TUNING.getRuntimeEmotionExpressionTuning(mood);
  }
  const key = String(mood || "idle");
  return RUNTIME_EMOTION_EXPRESSION_TUNING[key] || RUNTIME_EMOTION_EXPRESSION_TUNING.idle;
}

function normalizeRuntimeActionForLive2D(action) {
  if (typeof action !== "string") {
    return "none";
  }
  const key = String(action || "").trim().toLowerCase();
  if (!key) {
    return "none";
  }
  if (key === "none") return "none";
  if (key === "wave") return "wave";
  if (key === "nod") return "nod";
  if (key === "shake_head") return "shake_head";
  if (key === "think") return "think";
  if (key === "happy_idle") return "happy_idle";
  if (key === "surprised") return "surprised";
  return "none";
}

function getLive2DMotionForAction(action) {
  const normalized = normalizeRuntimeActionForLive2D(action);
  const plan = {
    wave: {
      mood: "happy",
      groups: ["Tap", "FlickUp", "Idle"],
      pulseBoost: 0.88,
      pulseDurationMs: 420
    },
    nod: {
      mood: "idle",
      groups: ["FlickDown", "Idle"],
      pulseBoost: 0.52,
      pulseDurationMs: 260
    },
    shake_head: {
      mood: "angry",
      groups: ["Flick@Body", "Flick", "Idle"],
      pulseBoost: 0.62,
      pulseDurationMs: 300
    },
    think: {
      mood: "idle",
      groups: ["FlickDown", "Idle"],
      pulseBoost: 0.5,
      pulseDurationMs: 280
    },
    happy_idle: {
      mood: "happy",
      groups: ["Idle", "Tap"],
      pulseBoost: 0.58,
      pulseDurationMs: 300
    },
    surprised: {
      mood: "surprised",
      groups: ["FlickUp", "Tap", "Idle"],
      pulseBoost: 0.9,
      pulseDurationMs: 340
    }
  };
  return plan[normalized] || null;
}

function applyCharacterRuntimeEmotionToLive2D(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  if (!state.model || !state.expressionEnabled) {
    return false;
  }
  try {
    const mood = normalizeRuntimeEmotionForLive2D(metadata.emotion);
    const tuning = getRuntimeEmotionExpressionTuning(mood);
    const now = performance.now();
    state.speechAnimMood = mood;
    state.moodHoldUntil = now + Math.max(300, Number(tuning.holdMs) || 1400);
    state.moodExpressionWeight = clampNumber(Number(tuning.weight) || 1, 0.7, 1.45);
    state.moodExpressionWeightUntil = state.moodHoldUntil;
    state.moodExpressionWeightMood = mood;
    state.moodExpressionRuntimeMood = mood;
    triggerExpressionPulse(
      state.currentTalkStyle || "neutral",
      Number(tuning.pulseBoost) || 0.55,
      Number(tuning.pulseDurationMs) || 320
    );
    return true;
  } catch (err) {
    console.debug("[character-runtime] apply emotion failed:", err);
    return false;
  }
}

function applyCharacterRuntimeActionToLive2D(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  const motionPlan = getLive2DMotionForAction(metadata.action);
  if (!motionPlan) {
    return false;
  }
  if (!state.model || !state.motionEnabled) {
    return false;
  }

  const applyPulseFallback = () => {
    if (!state.model || !state.expressionEnabled) {
      return false;
    }
    try {
      triggerExpressionPulse(
        state.currentTalkStyle || "neutral",
        Number(motionPlan.pulseBoost) || 0.6,
        Number(motionPlan.pulseDurationMs) || 280
      );
      return true;
    } catch (_) {
      return false;
    }
  };

  try {
    if (typeof tryBuiltInMotion !== "function") {
      return applyPulseFallback();
    }
    Promise.resolve(
      tryBuiltInMotion(motionPlan.mood, {
        source: "emotion",
        allowFallback: false,
        priority: 3,
        cooldownMs: Math.max(220, Math.round((Number(state.motionCooldownMs) || 1200) * 0.45)),
        groups: motionPlan.groups
      })
    )
      .then((played) => {
        if (!played) {
          applyPulseFallback();
        }
      })
      .catch((err) => {
        console.debug("[character-runtime] apply action failed:", err);
        applyPulseFallback();
      });
    return true;
  } catch (err) {
    console.debug("[character-runtime] apply action setup failed:", err);
    return applyPulseFallback();
  }
}

function handleCharacterRuntimeMetadata(raw, options = {}) {
  const normalized = normalizeCharacterRuntimeMetadataForFrontend(raw);
  if (!normalized) {
    return null;
  }
  dispatchCharacterRuntimeMetadataLocally(normalized);
  if (options.broadcast !== false) {
    broadcastCharacterRuntimeMetadataToModel(normalized);
  }
  return normalized;
}

function installCharacterRuntimeWindowBridge() {
  if (state.uiView !== "model") {
    return null;
  }
  if (state._characterRuntimeBridgeInstalled) {
    return state._characterRuntimeBridgeInstalled;
  }
  const channel = getCharacterRuntimeBroadcastChannel();
  if (!channel) {
    return null;
  }
  channel.onmessage = (event) => {
    const data = event?.data;
    if (!data || data.type !== "character-runtime:update") {
      return;
    }
    handleCharacterRuntimeMetadata(data.metadata, { broadcast: false });
  };
  state._characterRuntimeBridgeInstalled = channel;
  return channel;
}

function installCharacterRuntimeDebugBridge() {
  if (typeof window === "undefined") {
    return null;
  }
  const key = CHARACTER_RUNTIME_DEBUG_BRIDGE.DEBUG_BRIDGE_KEY || "__AI_CHAT_DEBUG_CHARACTER_RUNTIME__";
  if (window[key] && typeof window[key] === "object") {
    return window[key];
  }

  const samples = CHARACTER_RUNTIME_DEBUG_BRIDGE.DEBUG_SAMPLES || {
    happyWave: {
      emotion: "happy",
      action: "wave",
      intensity: "normal",
      live2d_hint: "happy",
      voice_style: "cheerful"
    },
    annoyed: {
      emotion: "annoyed",
      action: "shake_head",
      intensity: "normal",
      live2d_hint: "angry",
      voice_style: "serious"
    },
    thinking: {
      emotion: "thinking",
      action: "think",
      intensity: "low",
      live2d_hint: "neutral",
      voice_style: "neutral"
    },
    surprised: {
      emotion: "surprised",
      action: "surprised",
      intensity: "high",
      live2d_hint: "surprised",
      voice_style: "cheerful"
    }
  };

  const emit = (metadata) => {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }
    try {
      return handleCharacterRuntimeMetadata(metadata);
    } catch (_) {
      return null;
    }
  };

  const testEmotion = (emotion) => emit(
    typeof CHARACTER_RUNTIME_DEBUG_BRIDGE.createEmotionMetadata === "function"
      ? CHARACTER_RUNTIME_DEBUG_BRIDGE.createEmotionMetadata(emotion)
      : { emotion: String(emotion || "") }
  );
  const testAction = (action) => emit(
    typeof CHARACTER_RUNTIME_DEBUG_BRIDGE.createActionMetadata === "function"
      ? CHARACTER_RUNTIME_DEBUG_BRIDGE.createActionMetadata(action)
      : { action: String(action || "") }
  );

  const bridge = {
    emit,
    testEmotion,
    testAction,
    samples
  };
  try {
    window[key] = bridge;
  } catch (_) {
    return null;
  }
  return bridge;
}

function installTTSDebugBridge() {
  if (typeof window === "undefined") {
    return null;
  }
  const key = "__AI_CHAT_DEBUG_TTS__";
  if (window[key] && typeof window[key] === "object") {
    return window[key];
  }
  const bridge = {
    report: buildTTSDebugReport,
    snapshot: getTTSDebugSnapshot,
    conversationFollowup: () => buildConversationFollowupDebugView(Date.now()),
    previewConversationFollowupPolicy: (input) => previewConversationFollowupPolicy(input),
    previewConversationFollowupReactions: (input) => previewConversationFollowupReactions(input),
    checkConversationFollowupPendingFixture: (input) => runConversationFollowupPendingFixture(input),
    followupReadiness: () => buildFollowupReadinessReport(),
    followupCharacterState: () => getFollowupCharacterStateDebugView(),
    followupCharacterRuntimeHint: () => ({
      lastTone: String(state.followupCharacterRuntimeLastTone || ""),
      lastHintAt: Number(state.followupCharacterRuntimeLastHintAt || 0),
      lastHint: state.followupCharacterRuntimeLastHint || null
    }),
    followupAwareIdleMotionContext: () => buildFollowupAwareIdleMotionContext(),
    showFollowupReadiness: () => toggleFollowupReadinessPanel(true),
    hideFollowupReadiness: () => toggleFollowupReadinessPanel(false),
    runConversationFollowup: () => runConversationFollowupDebug(),
    dryRunSilenceFollowup: () => runConversationSilenceFollowupDryRun(),
    manualProactiveSchedulerTick: () => runProactiveSchedulerManualTick(),
    injectProactiveSchedulerPollFailureOnce: (reason) => injectProactiveSchedulerPollFailureOnce(reason),
    getProactiveSchedulerFailureInjectionState: () => getProactiveSchedulerFailureInjectionState(),
    clearProactiveSchedulerFailureInjection: () => clearProactiveSchedulerFailureInjection(),
    events: () => state.ttsDebugEvents.slice(),
    show: () => toggleTTSDebugPanel(true),
    hide: () => toggleTTSDebugPanel(false),
    toggle: () => toggleTTSDebugPanel()
  };
  try {
    window[key] = bridge;
  } catch (_) {
    return null;
  }
  return bridge;
}

function installTranslateDebugBridge() {
  if (typeof window === "undefined") {
    return null;
  }
  const key = "__AI_CHAT_DEBUG_TRANSLATE__";
  if (window[key] && typeof window[key] === "object") {
    return window[key];
  }
  const bridge = {
    report: buildTranslateDebugReport,
    snapshot: getTranslateDebugSnapshot,
    events: () => state.translateDebugEvents.slice(),
    show: () => toggleTranslateDebugPanel(true),
    hide: () => toggleTranslateDebugPanel(false),
    toggle: () => toggleTranslateDebugPanel()
  };
  try {
    window[key] = bridge;
  } catch (_) {
    return null;
  }
  return bridge;
}

function getToolCardTitle(item) {
  const tool = String(item?.tool || "").trim();
  if (tool === "write_file") return "已写入文件";
  if (tool === "replace_in_file") return "已修改文件";
  if (tool === "read_file") return "已读取文件";
  if (tool === "list_files") return "文件列表";
  if (tool === "search_text") return "文本搜索";
  if (tool === "run_command") return "命令执行";
  if (tool === "generate_image") return "图片生成";
  return tool || "工具结果";
}

function getToolCardSummary(item) {
  const tool = String(item?.tool || "").trim();
  if (!item?.ok) {
    return String(item?.error || "执行失败").trim() || "执行失败";
  }
  if (tool === "write_file") {
    return `${String(item?.path || "").trim()}${item?.chars_written ? ` · ${item.chars_written} 字符` : ""}`;
  }
  if (tool === "replace_in_file") {
    return `${String(item?.path || "").trim()} · 替换 ${Number(item?.replacements || 0)} 处`;
  }
  if (tool === "read_file") {
    return String(item?.path || "").trim();
  }
  if (tool === "list_files") {
    return `共 ${Number(item?.count || 0)} 项`;
  }
  if (tool === "search_text") {
    return `命中 ${Number(item?.count || 0)} 条`;
  }
  if (tool === "run_command") {
    const cmd = String(item?.args?.command || "").trim();
    const code = Number(item?.exit_code || 0);
    return `${cmd || "命令"} · 退出码 ${code}`;
  }
  if (tool === "generate_image") {
    return String(item?.saved_path || item?.image_url || "").trim() || "已生成图片";
  }
  return "执行完成";
}

function renderToolMetaCards(row, meta) {
  if (!row) {
    return;
  }
  const existing = row.querySelector(".tool-meta");
  const items = Array.isArray(meta?.items) ? meta.items : [];
  if (!items.length) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  const wrap = existing || document.createElement("div");
  wrap.className = "tool-meta";
  wrap.innerHTML = "";

  for (const item of items.slice(0, 4)) {
    const card = document.createElement("div");
    card.className = `tool-card ${item?.ok === false ? "is-error" : ""}`;

    const title = document.createElement("div");
    title.className = "tool-card-title";
    title.textContent = getToolCardTitle(item);

    const summary = document.createElement("div");
    summary.className = "tool-card-summary";
    summary.textContent = getToolCardSummary(item);

    card.appendChild(title);
    card.appendChild(summary);

    if (item?.ok && String(item?.path || "").trim() && ["read_file", "write_file", "replace_in_file"].includes(String(item?.tool || ""))) {
      const pathEl = document.createElement("div");
      pathEl.className = "tool-card-detail";
      pathEl.textContent = String(item.path || "").trim();
      card.appendChild(pathEl);
    }

    if (item?.ok && String(item?.tool || "") === "read_file" && String(item?.content_preview || "").trim()) {
      const pre = document.createElement("pre");
      pre.className = "tool-card-pre";
      pre.textContent = String(item.content_preview || "").trim();
      card.appendChild(pre);
    }

    if (item?.ok && String(item?.tool || "") === "search_text" && Array.isArray(item?.results) && item.results.length) {
      for (const hit of item.results.slice(0, 3)) {
        const detail = document.createElement("div");
        detail.className = "tool-card-detail";
        detail.textContent = `${String(hit?.path || "").trim()}:${Number(hit?.line || 0)} ${String(hit?.text || "").trim()}`;
        card.appendChild(detail);
      }
    }

    if (item?.ok && String(item?.tool || "") === "list_files" && Array.isArray(item?.entries) && item.entries.length) {
      const detail = document.createElement("div");
      detail.className = "tool-card-detail";
      detail.textContent = item.entries.slice(0, 4).map((entry) => String(entry?.path || "").trim()).filter(Boolean).join("  |  ");
      if (detail.textContent) {
        card.appendChild(detail);
      }
    }

    if (item?.ok && String(item?.tool || "") === "run_command") {
      const out = String(item?.stdout_preview || item?.stderr_preview || "").trim();
      if (out) {
        const pre = document.createElement("pre");
        pre.className = "tool-card-pre";
        pre.textContent = out;
        card.appendChild(pre);
      }
    }

    if (item?.ok && String(item?.tool || "") === "generate_image" && String(item?.image_url || "").trim()) {
      const img = document.createElement("img");
      img.className = "tool-card-image";
      img.src = String(item.image_url || "").trim();
      img.alt = "生成图片";
      card.appendChild(img);
    }

    wrap.appendChild(card);
  }

  if (!existing) {
    row.appendChild(wrap);
  }
}

const _CHAT_TRANSLATE_TIMEOUT_MS = 60000;
const _CHAT_TRANSLATE_CACHE_LIMIT = 160;
const _TRANSLATE_CIRCUIT_FAILURE_THRESHOLD = 3;
const _TRANSLATE_CIRCUIT_BASE_COOLDOWN_MS = 12000;
const _TRANSLATE_CIRCUIT_MAX_COOLDOWN_MS = 90000;
const _chatTranslationCache = new Map();
const _translationInFlight = new Map();
let _chatTranslationSeq = 0;
const _translationCircuitState = {
  failures: 0,
  cooldownUntil: 0
};

function _isTranslationCircuitOpen() {
  return Date.now() < Number(_translationCircuitState.cooldownUntil || 0);
}

function _markTranslationFailure() {
  _translationCircuitState.failures += 1;
  if (_translationCircuitState.failures < _TRANSLATE_CIRCUIT_FAILURE_THRESHOLD) {
    return;
  }
  const over = _translationCircuitState.failures - _TRANSLATE_CIRCUIT_FAILURE_THRESHOLD;
  const factor = Math.min(6, Math.max(0, over));
  const cooldownMs = Math.min(
    _TRANSLATE_CIRCUIT_MAX_COOLDOWN_MS,
    _TRANSLATE_CIRCUIT_BASE_COOLDOWN_MS * Math.pow(2, factor)
  );
  _translationCircuitState.cooldownUntil = Date.now() + cooldownMs;
}

function _markTranslationSuccess() {
  _translationCircuitState.failures = 0;
  _translationCircuitState.cooldownUntil = 0;
}

function _normalizeChatTranslationKey(text) {
  const safe = String(text || "").replace(/\s+/g, " ").trim();
  if (!safe) {
    return "";
  }
  return safe
    .replace(/([A-Za-z0-9])([.!?])(?=[A-Za-z0-9])/g, "$1$2 ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])\s+/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function _readChatTranslationCache(text) {
  const key = _normalizeChatTranslationKey(text);
  if (!key || !_chatTranslationCache.has(key)) {
    return "";
  }
  const hit = _chatTranslationCache.get(key) || "";
  _chatTranslationCache.delete(key);
  _chatTranslationCache.set(key, hit);
  return String(hit || "").trim();
}

function _writeChatTranslationCache(text, translated) {
  const key = _normalizeChatTranslationKey(text);
  const value = String(translated || "").trim();
  if (!key || !value) {
    return;
  }
  if (_looksLikeBadChatTranslation(text, value)) {
    return;
  }
  if (_chatTranslationCache.has(key)) {
    _chatTranslationCache.delete(key);
  }
  _chatTranslationCache.set(key, value);
  while (_chatTranslationCache.size > _CHAT_TRANSLATE_CACHE_LIMIT) {
    const oldestKey = _chatTranslationCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    _chatTranslationCache.delete(oldestKey);
  }
}

function _isLikelyEnglishForChat(text) {
  const safe = String(text || "").trim();
  if (!safe) {
    return false;
  }
  const latinCount = (safe.match(/[A-Za-z]/g) || []).length;
  const cjkCount = (safe.match(/[\u4e00-\u9fff]/g) || []).length;
  if (latinCount < 6) {
    return false;
  }
  if (cjkCount > 0) {
    return false;
  }
  return _isLikelyEnglish(safe);
}

function _countCjkChars(text) {
  return (String(text || "").match(/[\u4e00-\u9fff]/g) || []).length;
}

function _countLatinChars(text) {
  return (String(text || "").match(/[A-Za-z]/g) || []).length;
}

function _looksLikeBadChatTranslation(source, translated) {
  const src = String(source || "").trim();
  const out = String(translated || "").trim();
  if (!out) {
    return true;
  }
  if (!_isLikelyEnglishForChat(src)) {
    return false;
  }
  const lower = out.toLowerCase();
  if (
    lower.includes("i'm mimo")
    || lower.includes("i am mimo")
    || lower.includes("xiaomi")
    || lower.includes("hyperos")
    || lower.includes("official ai assistant")
    || lower.includes("here to help")
    || lower.includes("i'll do my best")
    || lower.includes("i'm sorry")
  ) {
    return true;
  }
  const cjkCount = _countCjkChars(out);
  if (cjkCount <= 0) {
    return true;
  }
  return _countLatinChars(out) > Math.max(12, cjkCount * 2);
}

function _shouldShowAssistantTranslation(text) {
  const safe = String(text || "").trim();
  if (!safe || safe.length < 4) {
    return false;
  }
  if (safe.includes("```")) {
    return false;
  }
  return _isLikelyEnglishForChat(safe);
}

function normalizeAssistantVisibleText(text) {
  const safe = String(text || "").trim();
  if (!safe || !_isLikelyEnglishForChat(safe)) {
    return safe;
  }
  if (SPEECH_TEXT && typeof SPEECH_TEXT.normalizeEnglishBoundaries === "function") {
    return SPEECH_TEXT.normalizeEnglishBoundaries(safe);
  }
  return safe
    .replace(/([.!?])(?=[A-Z'"\u2018\u2019])/g, "$1 ")
    .replace(/([,;:])(?=[A-Za-z])/g, "$1 ")
    .replace(/\s+([.!?,;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function _ensureMessageTranslationEl(row) {
  if (!row) {
    return null;
  }
  let el = row.querySelector(".content-translation");
  if (el) {
    return el;
  }
  el = document.createElement("span");
  el.className = "content-translation";
  el.hidden = true;
  const timeEl = row.querySelector(".message-time");
  if (timeEl && timeEl.parentNode === row) {
    row.insertBefore(el, timeEl);
  } else {
    row.appendChild(el);
  }
  return el;
}

function _clearMessageTranslation(row) {
  const el = row?.querySelector(".content-translation");
  if (!el) {
    return;
  }
  el.textContent = "";
  el.hidden = true;
}

async function _fetchChatTranslation(text) {
  const safe = String(text || "").trim();
  if (!safe) {
    return "";
  }
  const cacheKey = _normalizeChatTranslationKey(safe);
  const cached = _readChatTranslationCache(safe);
  if (cached) {
    recordTranslateDebugEvent("cache_hit", {
      text: safe,
      sourceChars: safe.length,
      translatedChars: cached.length,
      cache: "hit",
      result: "ok"
    });
    return cached;
  }
  if (_isTranslationCircuitOpen()) {
    recordTranslateDebugEvent("circuit_open", {
      text: safe,
      sourceChars: safe.length,
      result: "skipped",
      error: "translation circuit cooldown"
    });
    return "";
  }
  const inFlight = _translationInFlight.get(cacheKey);
  if (inFlight) {
    recordTranslateDebugEvent("inflight_reuse", {
      text: safe,
      sourceChars: safe.length,
      result: "pending"
    });
    return inFlight;
  }
  const task = (async () => {
    const controller = new AbortController();
    const traceId = createPerfTraceId("translate");
    const startedPerfMs = performance.now();
    const startedWallMs = Date.now();
    recordTranslateDebugEvent("request_start", {
      traceId,
      text: safe,
      sourceChars: safe.length,
      cache: "miss"
    });
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch (_) {
        // ignore
      }
    }, _CHAT_TRANSLATE_TIMEOUT_MS);
    try {
      const resp = await authFetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: safe,
          _perf_trace_id: traceId,
          _perf_client_send_ts_ms: startedWallMs
        }),
        signal: controller.signal
      });
      const elapsedMs = Math.round(performance.now() - startedPerfMs);
      const responseTraceId =
        typeof resp.headers?.get === "function" ? String(resp.headers.get("X-Perf-Trace-Id") || "") : "";
      if (!resp.ok) {
        _markTranslationFailure();
        let errorText = `HTTP ${resp.status}`;
        try {
          const errData = await resp.json();
          errorText = String(errData?.error || errorText);
        } catch (_) {
          // ignore
        }
        recordTranslateDebugEvent("request_fail", {
          traceId: responseTraceId || traceId,
          text: safe,
          sourceChars: safe.length,
          elapsedMs,
          status: Number(resp.status) || 0,
          result: "http_error",
          error: errorText
        });
        return "";
      }
      const data = await resp.json();
      const translated = String(data?.translated || data?.translated_text || "").trim();
      const degraded = data?.degraded === true || data?.fallback === true;
      const badTranslation = _looksLikeBadChatTranslation(safe, translated);
      if (degraded || badTranslation) {
        if (!badTranslation) {
          _markTranslationFailure();
        }
        recordTranslateDebugEvent("request_degraded", {
          traceId: responseTraceId || traceId,
          text: safe,
          sourceChars: safe.length,
          translatedChars: translated.length,
          elapsedMs,
          status: Number(resp.status) || 0,
          degraded: true,
          fallback: data?.fallback === true,
          result: badTranslation ? "invalid_translation" : "degraded",
          error: badTranslation ? "invalid translation result" : String(data?.error || "")
        });
        return "";
      }
      if (!translated) {
        _markTranslationFailure();
        recordTranslateDebugEvent("request_empty", {
          traceId: responseTraceId || traceId,
          text: safe,
          sourceChars: safe.length,
          elapsedMs,
          status: Number(resp.status) || 0,
          result: "empty"
        });
        return "";
      }
      _markTranslationSuccess();
      _writeChatTranslationCache(safe, translated);
      recordTranslateDebugEvent("request_ok", {
        traceId: responseTraceId || traceId,
        text: safe,
        sourceChars: safe.length,
        translatedChars: translated.length,
        elapsedMs,
        status: Number(resp.status) || 0,
        result: "ok"
      });
      return translated;
    } catch (err) {
      if (!controller.signal.aborted || Date.now() >= _translationCircuitState.cooldownUntil) {
        _markTranslationFailure();
      }
      recordTranslateDebugEvent("request_error", {
        traceId,
        text: safe,
        sourceChars: safe.length,
        elapsedMs: Math.round(performance.now() - startedPerfMs),
        result: controller.signal.aborted ? "timeout" : "error",
        error: controller.signal.aborted
          ? `timeout ${_CHAT_TRANSLATE_TIMEOUT_MS}ms`
          : String(err?.message || err || "")
      });
      return "";
    } finally {
      clearTimeout(timeoutId);
    }
  })();
  _translationInFlight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    if (_translationInFlight.get(cacheKey) === task) {
      _translationInFlight.delete(cacheKey);
    }
  }
}

function _renderAssistantTranslation(row, visibleText, options = {}) {
  if (!row || !row.classList.contains("assistant")) {
    return;
  }
  if (options.enableTranslation === false) {
    _clearMessageTranslation(row);
    return;
  }
  const safe = String(visibleText || "").trim();
  if (!_shouldShowAssistantTranslation(safe)) {
    _clearMessageTranslation(row);
    return;
  }
  const translationEl = _ensureMessageTranslationEl(row);
  if (!translationEl) {
    return;
  }
  const cached = _readChatTranslationCache(safe);
  if (cached && cached !== safe) {
    translationEl.textContent = `中译：${cached}`;
    translationEl.hidden = false;
    return;
  }
  const requestId = String(++_chatTranslationSeq);
  row.dataset.translationReqId = requestId;
  row.dataset.translationSource = safe;
  translationEl.textContent = "中译：翻译中...";
  translationEl.hidden = false;
  _fetchChatTranslation(safe).then((zh) => {
    if (!row.isConnected || row.dataset.translationReqId !== requestId) {
      return;
    }
    const translated = String(zh || "").trim();
    if (!translated || translated === safe) {
      translationEl.textContent = "中译：翻译暂时不可用";
      translationEl.hidden = false;
      return;
    }
    translationEl.textContent = `中译：${translated}`;
    translationEl.hidden = false;
  });
}

function applyMessagePayload(row, text, options = {}) {
  const target = row?.querySelector(".content");
  if (!target) {
    return;
  }
  const payload = parseToolMetaFromText(text);
  target.textContent = String(payload.visibleText || "");
  if (row.classList.contains("assistant")) {
    renderToolMetaCards(row, payload.meta);
    _renderAssistantTranslation(row, payload.visibleText, options);
  } else {
    _clearMessageTranslation(row);
  }
}

function setMessageTimestamp(row, timestamp) {
  const target = row?.querySelector(".message-time");
  if (!target) {
    return;
  }
  const ts = parseMessageTimestamp(timestamp);
  row.dataset.timestamp = String(ts);
  target.textContent = formatMessageTime(ts);
  target.hidden = false;
}

function resolveAssistantDisplayName(fallbackName = "Mochi") {
  const runtimeCfg = state.config?.character_runtime;
  if (runtimeCfg?.enabled === true) {
    const overrideCfg = runtimeCfg?.persona_override;
    const overrideName = String(overrideCfg?.name || "").trim();
    if (overrideCfg?.enabled === true && overrideName) {
      return overrideName;
    }
  }
  const configuredName = String(state.config?.assistant_name || "").trim();
  return configuredName || fallbackName;
}

function createMessageRow(role, text, options = {}) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const assistantName = resolveAssistantDisplayName("Hiyori");
  const roleEl = document.createElement("span");
  roleEl.className = "role";
  roleEl.textContent = role === "user" ? "你" : assistantName;
  const textEl = document.createElement("span");
  textEl.className = "content";
  const timeEl = document.createElement("span");
  timeEl.className = "message-time";
  timeEl.hidden = options.hideTimestamp === true;
  row.appendChild(roleEl);
  row.appendChild(textEl);
  row.appendChild(timeEl);
  applyMessagePayload(row, text, {
    enableTranslation: options.enableTranslation !== false
  });
  if (options.hideTimestamp !== true) {
    setMessageTimestamp(row, options.timestamp || Date.now());
  }
  return row;
}

function setMessageText(row, text, options = {}) {
  applyMessagePayload(row, text, options);
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

function commitMessageRecord(role, text, options = {}) {
  const content = String(text || "").trim();
  if (!content) {
    return null;
  }
  const timestamp = parseMessageTimestamp(options.timestamp);
  const record = { role: role === "user" ? "user" : "assistant", content, timestamp };
  const previous = state.chatRecords.length ? state.chatRecords[state.chatRecords.length - 1] : null;
  if (shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
    ui.chatLog.appendChild(createTimeDivider(timestamp));
  }
  state.chatRecords.push(record);
  state.chatRecords = trimChatRecords(state.chatRecords);
  saveChatHistoryToStorage();
  if (options.syncHistory === true) {
    syncConversationHistoryFromChatRecords();
  }
  return record;
}

function appendMessage(role, text, options = {}) {
  const timestamp = parseMessageTimestamp(options.timestamp);
  const row = createMessageRow(role, text, {
    timestamp,
    hideTimestamp: options.hideTimestamp === true,
    enableTranslation: options.enableTranslation !== false
  });
  if (options.persist !== false) {
    commitMessageRecord(role, text, {
      timestamp,
      syncHistory: options.syncHistory === true
    });
  } else if (options.insertDivider && shouldInsertTimeDivider(options.previousTimestamp || 0, timestamp)) {
    ui.chatLog.appendChild(createTimeDivider(timestamp));
  }
  ui.chatLog.appendChild(row);
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
  return row;
}

function finalizePendingMessageRow(row, role, text, options = {}) {
  if (!row) {
    return;
  }
  const content = String(text || "").trim();
  if (!content) {
    row.remove();
    return;
  }
  const timestamp = parseMessageTimestamp(options.timestamp);
  setMessageText(row, content, {
    enableTranslation: options.enableTranslation !== false
  });
  setMessageTimestamp(row, timestamp);
  if (options.persist !== false) {
    const previous = state.chatRecords.length ? state.chatRecords[state.chatRecords.length - 1] : null;
    if (shouldInsertTimeDivider(previous?.timestamp || 0, timestamp)) {
      row.parentNode?.insertBefore(createTimeDivider(timestamp), row);
    }
    state.chatRecords.push({ role: role === "user" ? "user" : "assistant", content, timestamp });
    state.chatRecords = trimChatRecords(state.chatRecords);
    saveChatHistoryToStorage();
    if (options.syncHistory === true) {
      syncConversationHistoryFromChatRecords();
    }
  }
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

function rememberMessage(role, content, options = {}) {
  const timestamp = parseMessageTimestamp(options.timestamp);
  state.history.push({ role, content, timestamp });
  const limit = Math.max(12, Number(state.historyMaxMessages) || 64);
  if (state.history.length > limit) {
    state.history = state.history.slice(state.history.length - limit);
  }
}

function formatFileSize(size) {
  const n = Math.max(0, Number(size) || 0);
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileExt(name) {
  const safe = String(name || "").trim().toLowerCase();
  const idx = safe.lastIndexOf(".");
  if (idx <= 0 || idx === safe.length - 1) {
    return "";
  }
  return safe.slice(idx + 1);
}

function isImageFileObj(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return true;
  }
  return ["png", "jpg", "jpeg", "webp", "bmp", "gif"].includes(getFileExt(file?.name));
}

function isLikelyTextFileObj(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("text/")) {
    return true;
  }
  if (type.includes("json") || type.includes("xml")) {
    return true;
  }
  return TEXT_ATTACHMENT_EXTS.has(getFileExt(file?.name));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function sanitizeAttachmentExcerpt(text, maxChars = MAX_TEXT_ATTACHMENT_CHARS) {
  const src = String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n");
  const compact = src.trim();
  if (!compact) {
    return "";
  }
  if (compact.length <= maxChars) {
    return compact;
  }
  return `${compact.slice(0, maxChars)}\n...(文件内容已截断)`;
}

function clearPendingAttachments() {
  state.pendingAttachments = [];
  renderPendingAttachments();
}

function removePendingAttachment(id) {
  const target = String(id || "");
  state.pendingAttachments = state.pendingAttachments.filter((item) => String(item?.id || "") !== target);
  renderPendingAttachments();
}

function renderPendingAttachments() {
  const wrap = ui.attachmentPreview;
  if (!wrap) {
    return;
  }
  const items = Array.isArray(state.pendingAttachments) ? state.pendingAttachments : [];
  wrap.innerHTML = "";
  if (!items.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  for (const item of items) {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";

    const icon = document.createElement("span");
    icon.className = "attachment-chip-icon";
    icon.textContent = item.kind === "image" ? "图" : (item.kind === "text" ? "文" : "档");
    chip.appendChild(icon);

    const main = document.createElement("span");
    main.className = "attachment-chip-main";

    const name = document.createElement("span");
    name.className = "attachment-chip-name";
    name.textContent = String(item.name || "未命名文件");
    main.appendChild(name);

    const meta = document.createElement("span");
    meta.className = "attachment-chip-meta";
    const kindLabel = item.kind === "image" ? "图片" : (item.kind === "text" ? "文本" : "文件");
    meta.textContent = `${kindLabel} · ${formatFileSize(item.size)}`;
    main.appendChild(meta);
    chip.appendChild(main);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "attachment-chip-remove";
    removeBtn.textContent = "脳";
    removeBtn.title = "移除";
    removeBtn.addEventListener("click", () => {
      removePendingAttachment(item.id);
    });
    chip.appendChild(removeBtn);

    wrap.appendChild(chip);
  }
}

function buildAttachmentContextText(attachments) {
  const items = Array.isArray(attachments) ? attachments : [];
  if (!items.length) {
    return "";
  }
  const lines = ["【本轮附件】"];
  let totalChars = 0;
  for (const item of items) {
    const name = String(item?.name || "未命名文件").slice(0, 120);
    const size = formatFileSize(item?.size);
    if (item?.kind === "image") {
      lines.push(`- 图片: ${name} (${size})`);
      continue;
    }
    if (item?.kind === "text") {
      lines.push(`- 文本文件: ${name} (${size})`);
      const excerpt = String(item?.text || "").trim();
      if (excerpt) {
        const room = Math.max(0, MAX_TOTAL_ATTACHMENT_TEXT_CHARS - totalChars);
        if (room > 0) {
          const clip = excerpt.slice(0, room);
          lines.push(`  内容摘录:\n${clip}`);
          totalChars += clip.length;
        }
      }
      continue;
    }
    lines.push(`- 文件: ${name} (${size})`);
  }
  return lines.join("\n");
}

function buildAttachmentDisplaySuffix(attachments) {
  const items = Array.isArray(attachments) ? attachments : [];
  if (!items.length) {
    return "";
  }
  const names = items
    .map((x) => String(x?.name || "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const rest = items.length - names.length;
  const tail = rest > 0 ? ` 等${items.length}个` : "";
  return `（附件: ${names.join("、")}${tail}）`;
}

async function handleAttachmentFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  if (state.attachmentReadBusy) {
    setStatus("附件处理中，请稍等...");
    return;
  }
  state.attachmentReadBusy = true;
  try {
    const existing = Array.isArray(state.pendingAttachments) ? state.pendingAttachments.slice() : [];
    const remain = Math.max(0, MAX_PENDING_ATTACHMENTS - existing.length);
    if (remain <= 0) {
      setStatus(`最多可附加 ${MAX_PENDING_ATTACHMENTS} 个文件`);
      return;
    }
    const picked = files.slice(0, remain);
    const nextItems = [];
    for (const file of picked) {
      const name = String(file?.name || "未命名文件").slice(0, 180);
      const size = Math.max(0, Number(file?.size) || 0);
      const type = String(file?.type || "").toLowerCase();
      const base = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name,
        size,
        type
      };
      if (isImageFileObj(file)) {
        if (size > MAX_IMAGE_ATTACHMENT_BYTES) {
          setStatus(`图片过大已跳过: ${name}`);
          continue;
        }
        try {
          const dataUrl = await readFileAsDataUrl(file);
          if (!dataUrl || !dataUrl.startsWith("data:image/")) {
            setStatus(`图片读取失败: ${name}`);
            continue;
          }
          nextItems.push({ ...base, kind: "image", dataUrl });
        } catch (_) {
          setStatus(`图片读取失败: ${name}`);
        }
        continue;
      }
      if (isLikelyTextFileObj(file)) {
        try {
          const raw = await file.text();
          const excerpt = sanitizeAttachmentExcerpt(raw, MAX_TEXT_ATTACHMENT_CHARS);
          if (!excerpt) {
            nextItems.push({ ...base, kind: "binary" });
          } else {
            nextItems.push({ ...base, kind: "text", text: excerpt });
          }
        } catch (_) {
          nextItems.push({ ...base, kind: "binary" });
        }
        continue;
      }
      nextItems.push({ ...base, kind: "binary" });
    }
    state.pendingAttachments = existing.concat(nextItems).slice(0, MAX_PENDING_ATTACHMENTS);
    renderPendingAttachments();
    if (nextItems.length) {
      setStatus(`已添加 ${nextItems.length} 个附件`);
    }
  } finally {
    state.attachmentReadBusy = false;
  }
}

function sanitizeSpeakText(text) {
  if (typeof SPEECH_TEXT.sanitizeSpeakText === "function") {
    return SPEECH_TEXT.sanitizeSpeakText(text);
  }
  return parseToolMetaFromText(text).visibleText;
}

// Subtitle helpers

const _SUBTITLE_MAX_CHARS = 320;
const _SUBTITLE_TRANSLATE_TIMEOUT_MS = 15000;
const _SUBTITLE_CACHE_LIMIT = 80;
const _SUBTITLE_SPEECH_RECHECK_MS = 1400;
const _SUBTITLE_HARD_MAX_MS = 90000;
const _SUBTITLE_AFTER_SPEECH_HOLD_MS = 2200;
const _SUBTITLE_PAGE_MIN_INTERVAL_MS = 1500;
const _SUBTITLE_PAGE_MAX_INTERVAL_MS = 3600;
const _subtitleTranslationCache = new Map();
let _subtitleTranslationAbortController = null;
const _subtitlePaging = {
  id: 0,
  enPages: [],
  zhPages: [],
  index: 0,
  intervalMs: 2200,
};

function _subtitleDuration(text) {
  const safe = String(text || "").trim();
  const compact = safe.replace(/\s+/g, "");
  const words = safe.split(/\s+/).filter(Boolean).length;
  const weighted = _isLikelyEnglish(safe)
    ? Math.max(words * 120, compact.length * 30)
    : compact.length * 45;
  return Math.min(Math.max(3800 + weighted, 4000), 10000);
}

function _isLikelyEnglish(text) {
  const letters = String(text).replace(/\s/g, "");
  if (!letters.length) return false;
  const ascii = Array.from(letters).filter((c) => c.charCodeAt(0) < 128).length;
  return ascii / letters.length > 0.70;
}

function _isSubtitleSpeechActive() {
  return isSpeakingNow() || state.streamSpeakWorking || !!state.ttsContextSpeaking;
}

function _splitSubtitlePages(text) {
  const src = String(text || "").replace(/\s+/g, " ").trim();
  if (!src) {
    return [];
  }
  const isEnglish = _isLikelyEnglish(src);
  const limit = isEnglish ? 110 : 56;
  const rough = src.match(/[^.!?。！？\n]+[.!?。！？]?/g) || [src];
  const pages = [];
  let current = "";

  const pushPage = (value) => {
    const clean = String(value || "").trim();
    if (!clean) return;
    pages.push(clean);
  };

  const pushWithChunking = (piece) => {
    const clean = String(piece || "").trim();
    if (!clean) return;
    if (clean.length <= limit) {
      pushPage(clean);
      return;
    }
    if (isEnglish) {
      const words = clean.split(/\s+/).filter(Boolean);
      let chunk = "";
      for (const w of words) {
        const next = chunk ? `${chunk} ${w}` : w;
        if (next.length <= limit) {
          chunk = next;
        } else {
          pushPage(chunk || w.slice(0, limit));
          chunk = w.length > limit ? w.slice(0, limit) : w;
        }
      }
      pushPage(chunk);
      return;
    }
    for (let i = 0; i < clean.length; i += limit) {
      pushPage(clean.slice(i, i + limit));
    }
  };

  for (const rawPiece of rough) {
    const piece = String(rawPiece || "").trim();
    if (!piece) continue;
    if (!current) {
      if (piece.length > limit) {
        pushWithChunking(piece);
        continue;
      }
      current = piece;
      continue;
    }
    const candidate = `${current} ${piece}`.replace(/\s+/g, " ").trim();
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    pushPage(current);
    if (piece.length > limit) {
      pushWithChunking(piece);
      current = "";
    } else {
      current = piece;
    }
  }
  pushPage(current);
  return pages.length ? pages : [src];
}

function _subtitlePageCount() {
  return Math.max(
    1,
    Array.isArray(_subtitlePaging.enPages) ? _subtitlePaging.enPages.length : 0,
    Array.isArray(_subtitlePaging.zhPages) ? _subtitlePaging.zhPages.length : 0
  );
}

function _pickSubtitlePage(pages, index) {
  if (!Array.isArray(pages) || !pages.length) {
    return "";
  }
  const safeIndex = Math.max(0, Math.min(pages.length - 1, Math.round(Number(index) || 0)));
  return String(pages[safeIndex] || "").trim();
}

function _calcSubtitlePageInterval(fullText, pageCount) {
  const base = _subtitleDuration(fullText) / Math.max(1, Number(pageCount) || 1);
  return Math.max(
    _SUBTITLE_PAGE_MIN_INTERVAL_MS,
    Math.min(_SUBTITLE_PAGE_MAX_INTERVAL_MS, Math.round(base))
  );
}

function _stopSubtitlePaging() {
  if (state.subtitlePageTimer) {
    clearTimeout(state.subtitlePageTimer);
    state.subtitlePageTimer = 0;
  }
}

function _scheduleSubtitleSafetyHide(id, baseDelayMs) {
  const startedAt = Date.now();
  const firstDelay = Math.max(3200, Math.round(Number(baseDelayMs) || 0));
  const tick = () => {
    if (id !== state.subtitleId) {
      return;
    }
    const elapsed = Date.now() - startedAt;
    if (_isSubtitleSpeechActive() && elapsed < _SUBTITLE_HARD_MAX_MS) {
      state.subtitleHideTimer = setTimeout(tick, _SUBTITLE_SPEECH_RECHECK_MS);
      return;
    }
    hideSubtitleText();
  };
  state.subtitleHideTimer = setTimeout(tick, firstDelay);
}

function _normalizeSubtitleText(rawText) {
  let out = sanitizeSpeakText(rawText);
  out = out.replace(/^(?:en|english|原文)\s*[:：-]\s*/i, "").trim();
  if (!out) {
    return "";
  }
  return out.slice(0, _SUBTITLE_MAX_CHARS);
}

function _readSubtitleTranslationCache(text) {
  const key = String(text || "").trim();
  if (!key || !_subtitleTranslationCache.has(key)) {
    return "";
  }
  const hit = _subtitleTranslationCache.get(key) || "";
  _subtitleTranslationCache.delete(key);
  _subtitleTranslationCache.set(key, hit);
  return String(hit || "").trim();
}

function _writeSubtitleTranslationCache(text, translated) {
  const key = String(text || "").trim();
  const value = String(translated || "").trim();
  if (!key || !value) {
    return;
  }
  if (_subtitleTranslationCache.has(key)) {
    _subtitleTranslationCache.delete(key);
  }
  _subtitleTranslationCache.set(key, value);
  while (_subtitleTranslationCache.size > _SUBTITLE_CACHE_LIMIT) {
    const oldestKey = _subtitleTranslationCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    _subtitleTranslationCache.delete(oldestKey);
  }
}

function _abortSubtitleTranslation() {
  if (!_subtitleTranslationAbortController) {
    return;
  }
  try {
    _subtitleTranslationAbortController.abort();
  } catch (_) {
    // ignore
  }
  _subtitleTranslationAbortController = null;
}

async function _fetchTranslation(text, capturedId) {
  const safe = String(text || "").trim();
  if (!safe) {
    return "";
  }
  const cached = _readSubtitleTranslationCache(safe) || _readChatTranslationCache(safe);
  if (cached) {
    _writeSubtitleTranslationCache(safe, cached);
    return cached;
  }
  if (_isTranslationCircuitOpen() || capturedId !== state.subtitleId) {
    return "";
  }
  const translated = String(await _fetchChatTranslation(safe) || "").trim();
  if (capturedId !== state.subtitleId) {
    return "";
  }
  if (!translated) {
    return "";
  }
  _writeSubtitleTranslationCache(safe, translated);
  return translated;
}

function _applySubtitleDOM(enText, zhText) {
  const layer = document.getElementById("subtitle-layer");
  if (!layer) return;
  const spanEn = layer.querySelector(".subtitle-en");
  const spanZh = layer.querySelector(".subtitle-zh");
  const en = String(enText || "").trim();
  const zh = String(zhText || "").trim();
  if (spanEn) spanEn.textContent = en;
  if (spanZh) spanZh.textContent = zh;
  layer.classList.toggle("subtitle-zh-ready", !!zh);
  layer.classList.remove("subtitle-hiding");
  layer.classList.add("subtitle-visible");
}

function _emitSubtitleFrame(id, enText, zhText) {
  if (!state.subtitleEnabled) {
    _clearSubtitleDOM(id, true);
    return;
  }
  if (window.electronAPI?.sendSubtitle) {
    window.electronAPI.sendSubtitle({ id, en: enText, zh: zhText });
  } else {
    _applySubtitleDOM(enText, zhText);
  }
}

function _renderSubtitlePage(id) {
  if (id !== state.subtitleId || _subtitlePaging.id !== id) {
    return false;
  }
  const pageIndex = _subtitlePaging.index;
  const en = _pickSubtitlePage(_subtitlePaging.enPages, pageIndex);
  const zh = _pickSubtitlePage(_subtitlePaging.zhPages, pageIndex);
  _emitSubtitleFrame(id, en, zh);
  return true;
}

function _startSubtitlePaging(id, enText, zhText = "", preserveIndex = false) {
  _stopSubtitlePaging();
  const enPages = _splitSubtitlePages(enText);
  const zhPages = _splitSubtitlePages(zhText);
  const pageCount = Math.max(1, enPages.length, zhPages.length);
  const nextIndex = preserveIndex && _subtitlePaging.id === id
    ? Math.max(0, Math.min(pageCount - 1, _subtitlePaging.index))
    : 0;
  _subtitlePaging.id = id;
  _subtitlePaging.enPages = enPages;
  _subtitlePaging.zhPages = zhPages;
  _subtitlePaging.index = nextIndex;
  _subtitlePaging.intervalMs = _calcSubtitlePageInterval(enText, pageCount);
  _renderSubtitlePage(id);
  if (pageCount <= 1) {
    return;
  }
  const tick = () => {
    if (id !== state.subtitleId || _subtitlePaging.id !== id) {
      return;
    }
    const total = _subtitlePageCount();
    if (_subtitlePaging.index >= total - 1) {
      return;
    }
    _subtitlePaging.index += 1;
    _renderSubtitlePage(id);
    state.subtitlePageTimer = setTimeout(tick, _subtitlePaging.intervalMs);
  };
  state.subtitlePageTimer = setTimeout(tick, _subtitlePaging.intervalMs);
}

function _clearSubtitleDOM(id, force = false) {
  if (!force && id !== state.subtitleId) return;
  _stopSubtitlePaging();
  state.subtitleHideTimer = 0;
  const layer = document.getElementById("subtitle-layer");
  if (!layer) return;
  layer.classList.remove("subtitle-visible");
  layer.classList.remove("subtitle-zh-ready");
  layer.classList.add("subtitle-hiding");
  setTimeout(() => {
    if (!force && id !== state.subtitleId) return;
    layer.classList.remove("subtitle-hiding");
    layer.classList.remove("subtitle-zh-ready");
    const spanEn = layer.querySelector(".subtitle-en");
    const spanZh = layer.querySelector(".subtitle-zh");
    if (spanEn) spanEn.textContent = "";
    if (spanZh) spanZh.textContent = "";
  }, 500);
}

function showSubtitleText(rawText) {
  if (!state.subtitleEnabled) {
    return;
  }
  const cleaned = _normalizeSubtitleText(rawText);
  if (!cleaned) return;

  _abortSubtitleTranslation();
  if (state.subtitleHideTimer) {
    clearTimeout(state.subtitleHideTimer);
    state.subtitleHideTimer = 0;
  }

  state.subtitleId++;
  const id = state.subtitleId;
  _startSubtitlePaging(id, cleaned, "", false);

  _scheduleSubtitleSafetyHide(id, _subtitleDuration(cleaned));

  if (cleaned.length >= 3) {
    _fetchTranslation(cleaned, id).then((zh) => {
      if (!zh || id !== state.subtitleId) return;
      _startSubtitlePaging(id, cleaned, zh, true);
    });
  }
}

function hideSubtitleText() {
  const id = state.subtitleId;
  _abortSubtitleTranslation();
  _stopSubtitlePaging();
  if (state.subtitleHideTimer) clearTimeout(state.subtitleHideTimer);
  state.subtitleHideTimer = setTimeout(() => {
    if (id !== state.subtitleId) return;
    if (window.electronAPI?.sendSubtitleHide) {
      window.electronAPI.sendSubtitleHide({ id });
    } else {
      _clearSubtitleDOM(id, true);
    }
    state.subtitleHideTimer = setTimeout(() => _clearSubtitleDOM(id, true), 500);
    if (state.subtitleId === id) {
      state.subtitleId = id + 1;
    }
  }, _SUBTITLE_AFTER_SPEECH_HOLD_MS);
}

// End subtitle helpers

function hashText(text) {
  const src = String(text || "");
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 131 + src.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

function pickByHash(seedText, options) {
  if (!Array.isArray(options) || options.length === 0) {
    return "";
  }
  const idx = hashText(seedText) % options.length;
  return String(options[idx] || "");
}

function insertNaturalPause(seg) {
  if (typeof SPEECH_TEXT.insertNaturalPause === "function") {
    return SPEECH_TEXT.insertNaturalPause(seg);
  }
  return String(seg || "").trim();
}

function colloquializeSpeakText(text) {
  if (typeof SPEECH_TEXT.colloquializeSpeakText === "function") {
    return SPEECH_TEXT.colloquializeSpeakText(text);
  }
  return String(text || "").trim();
}

function simplifySpeechDeliveryText(text, style = "neutral", streamMode = false) {
  if (typeof SPEECH_TEXT.simplifySpeechDeliveryText === "function") {
    return SPEECH_TEXT.simplifySpeechDeliveryText(text, style, streamMode);
  }
  return String(text || "").trim();
}


function tightenMinorSpeechPauses(text, streamMode = false) {
  if (typeof SPEECH_TEXT.tightenMinorSpeechPauses === "function") {
    return SPEECH_TEXT.tightenMinorSpeechPauses(text, streamMode);
  }
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeTalkStyle(style) {
  const s = String(style || "neutral").trim().toLowerCase();
  if (["neutral", "comfort", "clear", "playful", "steady"].includes(s)) {
    return s;
  }
  return "neutral";
}

function inferContextStyle(userText = "", assistantText = "", mood = "idle", isAuto = false) {
  const src = `${String(userText || "")}\n${String(assistantText || "")}`.toLowerCase();
  const score = {
    comfort: 0,
    clear: 0,
    playful: 0,
    steady: 0
  };

  if (/(难过|伤心|焦虑|崩溃|压力|失眠|委屈|心累|痛苦|失落|难受|不舒服)/.test(src)) {
    score.comfort += 5;
  }
  if (/(报错|错误|bug|代码|修复|排查|步骤|教程|配置|接口|api|命令|运行|性能|延迟|怎么做|如何)/.test(src)) {
    score.clear += 5;
  }
  if (/(紧急|立刻|马上|严谨|认真|上线|故障|事故|必须|优先)/.test(src)) {
    score.steady += 4;
  }
  if (/(哈哈|好耶|太棒|开心|可爱|有趣|聊聊|玩|轻松|摸鱼|wow|lol|233)/.test(src)) {
    score.playful += 4;
  }

  if (/[?？]/.test(src)) {
    score.clear += 1;
  }
  if (/[!！]/.test(src)) {
    score.playful += 1;
  }
  if (mood === "happy" || mood === "surprised") {
    score.playful += 2;
  }
  if (mood === "sad") {
    score.comfort += 2;
  }
  if (mood === "angry") {
    score.steady += 2;
  }
  if (isAuto) {
    score.playful += 1;
  }

  let bestStyle = "neutral";
  let bestScore = 0;
  for (const [style, v] of Object.entries(score)) {
    if (v > bestScore) {
      bestStyle = style;
      bestScore = v;
    }
  }
  return bestScore > 0 ? bestStyle : "neutral";
}

function resolveTalkStyle(userText = "", assistantText = "", mood = "idle", isAuto = false) {
  if (state.styleAutoEnabled) {
    return inferContextStyle(userText, assistantText, mood, isAuto);
  }
  return normalizeTalkStyle(state.manualTalkStyle);
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function normalizeMotionIntensity(level) {
  const x = String(level || "normal").trim().toLowerCase();
  if (x === "low" || x === "high" || x === "normal") {
    return x;
  }
  return "normal";
}

function getMotionIntensityPreset() {
  const key = normalizeMotionIntensity(state.motionIntensity);
  return MOTION_INTENSITY_PRESETS[key] || MOTION_INTENSITY_PRESETS.normal;
}

function getStyleExpressionProfile(style) {
  if (typeof LIVE2D_EXPRESSION_TUNING.getStyleExpressionProfile === "function") {
    return LIVE2D_EXPRESSION_TUNING.getStyleExpressionProfile(style);
  }
  const s = normalizeTalkStyle(style);
  return STYLE_EXPRESSION_PROFILE[s] || STYLE_EXPRESSION_PROFILE.neutral;
}

function detectModelProfileName() {
  const modelPath = String(state.config?.model_path || "").trim().toLowerCase();
  for (const key of Object.keys(MODEL_MOTION_PROFILES)) {
    if (modelPath.includes(key.toLowerCase())) {
      return key;
    }
  }
  return "";
}

function getActiveModelMotionProfile() {
  const key = String(state.modelProfileName || "").trim();
  if (!key) {
    return null;
  }
  return MODEL_MOTION_PROFILES[key] || null;
}

function getActiveModelCadence() {
  return getActiveModelMotionProfile()?.cadence || null;
}

function getCoreModel() {
  return state.model?.internalModel?.coreModel || null;
}

function safeAddParamValue(core, id, delta, weight = 1) {
  if (!core || !id || !Number.isFinite(Number(delta)) || Math.abs(Number(delta)) < 0.0001) {
    return;
  }
  const d = Number(delta);
  const w = Number.isFinite(Number(weight)) ? Number(weight) : 1;
  try {
    if (typeof core.addParameterValueById === "function") {
      core.addParameterValueById(id, d, w);
      return;
    }
    if (
      typeof core.getParameterValueById === "function"
      && typeof core.setParameterValueById === "function"
    ) {
      const cur = Number(core.getParameterValueById(id) || 0);
      core.setParameterValueById(id, cur + d, w);
    }
  } catch (_) {
    // ignore unsupported parameter ids
  }
}

function safeSetParamValue(core, id, value, weight = 1) {
  if (!core || !id || !Number.isFinite(Number(value))) {
    return;
  }
  const v = Number(value);
  const w = Number.isFinite(Number(weight)) ? clampNumber(Number(weight), 0, 1) : 1;
  let apiApplied = false;
  let apiTarget = v;
  try {
    if (
      typeof core.getParameterValueById === "function"
      && typeof core.setParameterValueById === "function"
    ) {
      if (w >= 0.999) {
        core.setParameterValueById(id, v, 1);
        apiApplied = true;
        apiTarget = v;
      } else {
        const cur = Number(core.getParameterValueById(id) || 0);
        apiTarget = cur + (v - cur) * w;
        core.setParameterValueById(id, apiTarget, 1);
        apiApplied = true;
      }
    }
  } catch (_) {
    // ignore and fallback to raw parameter array
  }
  if (apiApplied) {
    try {
      if (typeof core.getParameterValueById === "function") {
        const after = Number(core.getParameterValueById(id));
        if (Number.isFinite(after) && Math.abs(after - apiTarget) <= 0.0015) {
          return;
        }
      }
    } catch (_) {
      // ignore and fallback to raw parameter array
    }
  }
  try {
    const params = core?._model?.parameters;
    const ids = params?.ids;
    const vals = params?.values;
    if (!ids || !vals) {
      return;
    }
    const idx = Array.from(ids).indexOf(id);
    if (idx < 0) {
      return;
    }
    const cur = Number(vals[idx] || 0);
    vals[idx] = cur + (v - cur) * w;
  } catch (_) {
    // ignore unsupported parameter ids
  }
}

function safeGetParamValue(core, id) {
  if (!core || !id) {
    return NaN;
  }
  try {
    if (typeof core.getParameterValueById === "function") {
      const v = Number(core.getParameterValueById(id));
      if (Number.isFinite(v)) {
        return v;
      }
    }
  } catch (_) {
    // ignore and fallback to raw parameter array
  }
  try {
    const params = core?._model?.parameters;
    const ids = params?.ids;
    const vals = params?.values;
    if (!ids || !vals) {
      return NaN;
    }
    const idx = Array.from(ids).indexOf(id);
    if (idx < 0) {
      return NaN;
    }
    const v = Number(vals[idx]);
    return Number.isFinite(v) ? v : NaN;
  } catch (_) {
    return NaN;
  }
}

function safeDriveParamValue(core, id, target, gain = 1) {
  if (!core || !id || !Number.isFinite(Number(target))) {
    return;
  }
  const t = Number(target);
  const g = clampNumber(Number(gain) || 1, 0, 1);
  const cur = safeGetParamValue(core, id);
  if (!Number.isFinite(cur)) {
    safeSetParamValue(core, id, t, g);
    return;
  }
  const delta = (t - cur) * g;
  if (Math.abs(delta) < 0.0001) {
    return;
  }
  safeAddParamValue(core, id, delta, 1);
}

function triggerExpressionPulse(style = "neutral", boost = 1, durationMs = 520) {
  const now = performance.now();
  state.expressionStyle = normalizeTalkStyle(style);
  state.expressionPulseBoost = clampNumber(Number(boost) || 1, 0.2, 2.2);
  state.expressionPulseUntil = now + Math.max(120, Number(durationMs) || 520);
}

function estimateSpeechAnimationDurationMs(text, style = "neutral") {
  const cleaned = sanitizeSpeakText(text);
  const chars = cleaned.length;
  const punct = (cleaned.match(/[，。！？!?、]/g) || []).length;
  let duration = 360 + chars * 82 + punct * 130;
  if (style === "comfort") {
    duration *= 1.06;
  } else if (style === "playful") {
    duration *= 0.94;
  } else if (style === "steady") {
    duration *= 0.98;
  }
  return Math.round(clampNumber(duration, 360, 12000));
}

function beginSpeechAnimation(text, mood = "idle", style = "neutral", opts = {}) {
  const cleaned = sanitizeSpeakText(text);
  if (!cleaned) {
    return;
  }
  const now = performance.now();
  const durationMs = Math.max(
    240,
    Math.round(Number(opts.durationMs) || estimateSpeechAnimationDurationMs(cleaned, style))
  );
  state.speechAnimStartedAt = now;
  state.speechAnimDurationMs = durationMs;
  state.speechAnimUntil = now + durationMs + 180;
  state.speechAnimSeed = Math.random() * Math.PI * 2;
  state.speechAnimTextLength = cleaned.length;
  state.speechAnimPunctuation = (cleaned.match(/[，。！？!?、]/g) || []).length;
  state.speechAnimAccentCount = (cleaned.match(/[!?\uFF01\uFF1F]/g) || []).length;
  state.speechAnimStyle = normalizeTalkStyle(style || state.currentTalkStyle || "neutral");
  state.speechAnimMood = String(mood || detectMood(cleaned) || "idle");
}

function endSpeechAnimation() {
  state.speechAnimUntil = 0;
  state.speechAnimStartedAt = 0;
  state.speechAnimDurationMs = 0;
  state.speechAnimAccentCount = 0;
  state.speechMouthOpen = 0;
  state.speechMouthTarget = 0;
  state.speechMouthUpdatedAt = performance.now();
  state.ttsAudioLevel = 0;
  state.ttsAudioRawLevel = 0;
  state.ttsAudioRms = 0;
  state.ttsAudioLastVoiceAt = 0;
  state.moodHoldUntil = performance.now() + 1500;
}

function finishSpeechAnimation() {
  const now = performance.now();
  const releaseMs = 260;
  const holdMs = 900;
  state.speechAnimUntil = now + releaseMs;
  state.speechMouthTarget = 0;
  state.speechMouthUpdatedAt = now;
  state.ttsAudioLevel = 0;
  state.ttsAudioRawLevel = 0;
  state.ttsAudioRms = 0;
  state.ttsAudioLastVoiceAt = 0;
  state.moodHoldUntil = Math.max(Number(state.moodHoldUntil || 0), now + holdMs);
}

function ensureMicroMotionState(now = performance.now()) {
  if (!Number.isFinite(Number(state.microBreathSeed)) || Math.abs(Number(state.microBreathSeed)) < 0.0001) {
    state.microBreathSeed = Math.random() * Math.PI * 2;
  }
  if (!Number(state.microNextBlinkAt)) {
    state.microNextBlinkAt = now + 1400 + Math.random() * 2600;
  }
  if (!Number(state.microNextGazeAt)) {
    state.microNextGazeAt = now + 900 + Math.random() * 2200;
  }
  if (!Number.isFinite(Number(state.microMotionLastAt)) || Number(state.microMotionLastAt) <= 0) {
    state.microMotionLastAt = now;
  }
  if (!["idle", "attack", "sustain", "release"].includes(String(state.speechPhase || ""))) {
    state.speechPhase = "idle";
  }
  if (!Number.isFinite(Number(state.speechPhaseEnteredAt))) {
    state.speechPhaseEnteredAt = 0;
  }
  if (typeof state.speechPhaseWasSpeaking !== "boolean") {
    state.speechPhaseWasSpeaking = false;
  }
  if (!Number.isFinite(Number(state.speechMotionBlend))) {
    state.speechMotionBlend = 0;
  }
  if (!Number.isFinite(Number(state.speechMotionStrength))) {
    state.speechMotionStrength = 1.35;
  }
  if (!Number.isFinite(Number(state.beatPrevLevel))) {
    state.beatPrevLevel = 0;
  }
  if (!Number.isFinite(Number(state.beatImpulse))) {
    state.beatImpulse = 0;
  }
  if (!Number.isFinite(Number(state.beatNodSmoothed))) {
    state.beatNodSmoothed = 0;
  }
  if (!Number.isFinite(Number(state.beatCooldownUntil))) {
    state.beatCooldownUntil = 0;
  }
  if (!Number.isFinite(Number(state.mouseGazeCurrentX))) {
    state.mouseGazeCurrentX = 0;
  }
  if (!Number.isFinite(Number(state.mouseGazeCurrentY))) {
    state.mouseGazeCurrentY = 0;
  }
  if (!Number.isFinite(Number(state.spring_hairAhoge_vel))) state.spring_hairAhoge_vel = 0;
  if (!Number.isFinite(Number(state.spring_hairAhoge_pos))) state.spring_hairAhoge_pos = 0;
  if (!Number.isFinite(Number(state.spring_hairFront_vel))) state.spring_hairFront_vel = 0;
  if (!Number.isFinite(Number(state.spring_hairFront_pos))) state.spring_hairFront_pos = 0;
  if (!Number.isFinite(Number(state.spring_hairBack_vel))) state.spring_hairBack_vel = 0;
  if (!Number.isFinite(Number(state.spring_hairBack_pos))) state.spring_hairBack_pos = 0;
  if (!Number.isFinite(Number(state.spring_ribbon_vel))) state.spring_ribbon_vel = 0;
  if (!Number.isFinite(Number(state.spring_ribbon_pos))) state.spring_ribbon_pos = 0;
  if (!Number.isFinite(Number(state.spring_skirt_vel))) state.spring_skirt_vel = 0;
  if (!Number.isFinite(Number(state.spring_skirt_pos))) state.spring_skirt_pos = 0;
  if (!Number.isFinite(Number(state.spring_skirt2_vel))) state.spring_skirt2_vel = 0;
  if (!Number.isFinite(Number(state.spring_skirt2_pos))) state.spring_skirt2_pos = 0;
  if (!Number.isFinite(Number(state.spring_torso_vel))) state.spring_torso_vel = 0;
  if (!Number.isFinite(Number(state.spring_torso_pos))) state.spring_torso_pos = 0;
  if (!Number.isFinite(Number(state.spring_head_vel))) state.spring_head_vel = 0;
  if (!Number.isFinite(Number(state.spring_head_pos))) state.spring_head_pos = 0;
  if (!Number.isFinite(Number(state.spring_body_vel))) state.spring_body_vel = 0;
  if (!Number.isFinite(Number(state.spring_body_pos))) state.spring_body_pos = 0;
  if (!Number.isFinite(Number(state.spring_body_render))) state.spring_body_render = 0;
  if (!Number.isFinite(Number(state.spring_torso_render))) state.spring_torso_render = 0;
  if (!Number.isFinite(Number(state.spring_head_render))) state.spring_head_render = 0;
}

function getSmoothedMoodExpression(now = performance.now()) {
  const now2 = now || performance.now();
  const holding = now2 < Number(state.moodHoldUntil || 0);
  const speakingNow = isSpeechMotionActive(now2);
  const activeMood = (holding || speakingNow)
    ? String(state.speechAnimMood || "idle")
    : "idle";
  const prev = state.moodExpressionSmoothed && typeof state.moodExpressionSmoothed === "object"
    ? state.moodExpressionSmoothed
    : { happy: 0, sad: 0, angry: 0, surprised: 0 };
  const target = { happy: 0, sad: 0, angry: 0, surprised: 0 };
  if (activeMood in target) {
    target[activeMood] = 1;
  }
  const last = Number(state.moodExpressionUpdatedAt || 0);
  if (last > 0 && now2 - last < 1) {
    return prev;
  }
  const dtFrames = last > 0 ? clampNumber((now2 - last) / 16.6667, 0.5, 3.5) : 1;
  const smoothing = 1 - Math.pow(1 - 0.28, dtFrames);
  const next = {
    happy: prev.happy + (target.happy - prev.happy) * smoothing,
    sad: prev.sad + (target.sad - prev.sad) * smoothing,
    angry: prev.angry + (target.angry - prev.angry) * smoothing,
    surprised: prev.surprised + (target.surprised - prev.surprised) * smoothing
  };
  state.moodExpressionSmoothed = next;
  state.moodExpressionUpdatedAt = now2;
  return next;
}

function ensureTTSAudioAnalyser(audio) {
  if (!audio) {
    return false;
  }
  if (state.ttsAudioAnalyser && state.ttsAudioSourceNode) {
    return true;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return false;
  }
  try {
    if (!state.ttsAudioContext) {
      state.ttsAudioContext = new AudioCtx();
    }
    if (!state.ttsAudioSourceNode) {
      state.ttsAudioSourceNode = state.ttsAudioContext.createMediaElementSource(audio);
    }
    if (!state.ttsAudioAnalyser) {
    state.ttsAudioAnalyser = state.ttsAudioContext.createAnalyser();
    state.ttsAudioAnalyser.fftSize = 256;
    state.ttsAudioAnalyser.smoothingTimeConstant = 0.12;
      state.ttsAudioAnalyserData = new Uint8Array(state.ttsAudioAnalyser.frequencyBinCount);
      state.ttsAudioSourceNode.connect(state.ttsAudioAnalyser);
      state.ttsAudioAnalyser.connect(state.ttsAudioContext.destination);
    }
    return true;
  } catch (_) {
    return false;
  }
}

function sampleTTSAudioLevel() {
  const analyser = state.ttsAudioAnalyser;
  const data = state.ttsAudioAnalyserData;
  if (!analyser || !data || !data.length) {
    state.ttsAudioLevel += (0 - state.ttsAudioLevel) * 0.42;
    state.ttsAudioRawLevel = 0;
    state.ttsAudioRms = 0;
    return state.ttsAudioLevel;
  }
  try {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const centered = (data[i] - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / data.length);
    const normalized = clampNumber((rms - 0.006) / 0.095, 0, 1);
    const smoothing = normalized > state.ttsAudioLevel ? 0.88 : 0.78;
    state.ttsAudioRawLevel = normalized;
    state.ttsAudioRms = rms;
    if (normalized > 0.035) {
      state.ttsAudioLastVoiceAt = performance.now();
    }
    state.ttsAudioLevel += (normalized - state.ttsAudioLevel) * smoothing;
  } catch (_) {
    state.ttsAudioLevel += (0 - state.ttsAudioLevel) * 0.42;
    state.ttsAudioRawLevel = 0;
    state.ttsAudioRms = 0;
  }
  return state.ttsAudioLevel;
}

function updateMicroMotionLayer() {
  if (!state.expressionEnabled || !state.model) {
    return;
  }
  const core = getCoreModel();
  if (!core) {
    return;
  }
  const now = performance.now();
  ensureMicroMotionState(now);
  const prevMotionAt = Number(state.microMotionLastAt) || now;
  const rawDtFrames = (now - prevMotionAt) / 16.6667;
  state.microMotionLastAt = now;
  const style = normalizeTalkStyle(state.currentTalkStyle || state.expressionStyle || "neutral");
  const speaking = isSpeechMotionActive(now);
  const dtFrames = speaking
    ? clampNumber(rawDtFrames, 0.86, 1.16)
    : clampNumber(rawDtFrames, 0.72, 1.5);
  const motionBlendPrev = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
  const motionBlendFollow = speaking
    ? (1 - Math.pow(1 - 0.42, dtFrames))
    : (1 - Math.pow(1 - 0.18, dtFrames));
  const motionBlend = clampNumber(
    motionBlendPrev + ((speaking ? 1 : 0) - motionBlendPrev) * motionBlendFollow,
    0,
    1
  );
  state.speechMotionBlend = motionBlend;
  const smoothMotionOutput = (name, target, opts = {}) => {
    const key = `motion_smooth_${name}`;
    let prev = Number(state[key]);
    if (!Number.isFinite(prev)) {
      prev = Number(target) || 0;
    }
    const rise = clampNumber(
      Number.isFinite(Number(opts.rise)) ? Number(opts.rise) : 0.22,
      0.01,
      0.98
    );
    const fall = clampNumber(
      Number.isFinite(Number(opts.fall)) ? Number(opts.fall) : 0.16,
      0.01,
      0.98
    );
    const maxStep = Math.max(
      0.001,
      Number.isFinite(Number(opts.maxStep)) ? Number(opts.maxStep) : 999
    );
    const follow = target > prev
      ? (1 - Math.pow(1 - rise, dtFrames))
      : (1 - Math.pow(1 - fall, dtFrames));
    let next = prev + (target - prev) * follow;
    const maxDelta = maxStep * dtFrames;
    next = prev + clampNumber(next - prev, -maxDelta, maxDelta);
    state[key] = next;
    return next;
  };
  const speechMotionStrength = clampNumber(Number(state.speechMotionStrength) || 1.35, 0.6, 2.2);
  const speechMotionBoost = 0.82 + speechMotionStrength * 0.28;
  const mouthEnergy = speaking ? clampNumber(Number(state.speechMouthOpen) || 0, 0, 1) : 0;
  const audioEnergy = clampNumber(
    Math.max(Number(state.ttsAudioLevel) || 0, mouthEnergy * 0.56),
    0,
    1
  );
  const priorBeat = clampNumber(Number(state.beatImpulse) || 0, 0, 1);
  const energyInput = motionBlend > 0.02
    ? Math.max(audioEnergy, (0.16 + priorBeat * 0.24 * motionBlend) * speechMotionBoost)
    : audioEnergy;
  const currentBodyEnergy = Number(state.speechBodyEnergy) || 0;
  const energyAttack = 1 - Math.pow(1 - 0.24, dtFrames);
  const energyRelease = 1 - Math.pow(1 - 0.07, dtFrames);
  const energyFollow = energyInput > currentBodyEnergy ? energyAttack : energyRelease;
  state.speechBodyEnergy = clampNumber(
    currentBodyEnergy + (energyInput - currentBodyEnergy) * energyFollow,
    0, 1
  );
  const rawLevel = clampNumber(Number(state.ttsAudioLevel) || 0, 0, 1);
  const prevLevel = Number(state.beatPrevLevel) || 0;
  const dLevel = rawLevel - prevLevel;
  const risingLevel = Math.max(0, dLevel);
  const fallingLevel = Math.max(0, -dLevel);
  const beatVelocity = risingLevel + fallingLevel * 0.28;
  const beatThreshold = 0.08;
  state.beatPrevLevel = rawLevel;
  const beatSoftCap = 0.32 + motionBlend * 0.5;
  if (motionBlend > 0.06 && rawLevel > beatThreshold && beatVelocity > 0.01 && risingLevel > 0.002 && now > Number(state.beatCooldownUntil || 0)) {
    const impulseStrength = clampNumber((beatVelocity - 0.01) / 0.085, 0.05, 0.68);
    const slopeGain = 0.78 + clampNumber(risingLevel * 18, 0, 0.26);
    const currentImpulse = Number(state.beatImpulse) || 0;
    const softened = impulseStrength * 0.58 * slopeGain * (1 - currentImpulse * 0.42);
    state.beatImpulse = clampNumber(currentImpulse + softened, 0, beatSoftCap);
    state.beatCooldownUntil = now + 126;
  }
  const beatDecay = Math.pow(0.74 + motionBlend * 0.14, dtFrames);
  state.beatImpulse = clampNumber((Number(state.beatImpulse) || 0) * beatDecay, 0, beatSoftCap);
  if (motionBlend < 0.02) state.beatImpulse = 0;
  const beatSmoothFollow = motionBlend > 0.05
    ? (1 - Math.pow(1 - 0.34, dtFrames))
    : (1 - Math.pow(1 - 0.22, dtFrames));
  const beatSmoothPrev = Number(state.beatNodSmoothed) || 0;
  state.beatNodSmoothed = clampNumber(
    beatSmoothPrev + ((Number(state.beatImpulse) || 0) - beatSmoothPrev) * beatSmoothFollow,
    0,
    beatSoftCap
  );
  const beatNodRaw = Number(state.beatNodSmoothed) || 0;
  const beatNod = smoothMotionOutput("beat_nod", beatNodRaw, {
    rise: 0.24,
    fall: 0.21,
    maxStep: 0.055
  });
  const bodyEnergyRaw = state.speechBodyEnergy * motionBlend;
  const bodyEnergy = smoothMotionOutput("body_energy", bodyEnergyRaw, {
    rise: 0.22,
    fall: 0.14,
    maxStep: 0.08
  });
  const wasSpeaking = !!state.speechPhaseWasSpeaking;
  state.speechPhaseWasSpeaking = speaking;

  if (!wasSpeaking && speaking) {
    state.speechPhase = "attack";
    state.speechPhaseEnteredAt = now;
  } else if (wasSpeaking && !speaking && state.speechPhase !== "idle") {
    state.speechPhase = "release";
    state.speechPhaseEnteredAt = now;
  } else if (state.speechPhase === "attack" && now - Number(state.speechPhaseEnteredAt) > 300) {
    state.speechPhase = "sustain";
    state.speechPhaseEnteredAt = now;
  } else if (state.speechPhase === "release" && now - Number(state.speechPhaseEnteredAt) > 600) {
    state.speechPhase = "idle";
    state.speechPhaseEnteredAt = 0;
  } else if (!speaking && state.speechPhase === "idle") {
  }

  const phase = state.speechPhase || "idle";
  const phaseAge = now - Number(state.speechPhaseEnteredAt || now);
  const energyBoost = 1.0 + motionBlend * (0.12 + bodyEnergy * 1.2);
  const moodBlend = getSmoothedMoodExpression(now);
  const happyBlend = moodBlend.happy;
  const sadBlend = moodBlend.sad;
  const angryBlend = moodBlend.angry;
  const surprisedBlend = moodBlend.surprised;
  const moodGain = 0.85 + motionBlend * 0.15;
  const blinkLength = 150 - motionBlend * 40;
  if (now >= state.microNextBlinkAt) {
    state.microBlinkUntil = now + blinkLength;
    state.microNextBlinkAt = now + 1800 + Math.random() * 3400;
  }
  let blink = 0;
  if (now < Number(state.microBlinkUntil || 0)) {
    const remain = Math.max(0, Number(state.microBlinkUntil || 0) - now);
    const phase = 1 - remain / blinkLength;
    blink = Math.sin(Math.min(1, phase) * Math.PI);
  }
  if (now >= state.microNextGazeAt) {
    const styleBias = style === "playful" ? 0.34 : (style === "steady" ? 0.16 : 0.24);
    state.microGazeTargetX = clampNumber((Math.random() * 2 - 1) * styleBias, -0.35, 0.35);
    state.microGazeTargetY = clampNumber((Math.random() * 2 - 1) * styleBias * 0.7, -0.22, 0.22);
    state.microNextGazeAt = now + 1200 + Math.random() * 2400;
  }
  state.microGazeCurrentX += (state.microGazeTargetX - state.microGazeCurrentX) * 0.03;
  state.microGazeCurrentY += (state.microGazeTargetY - state.microGazeCurrentY) * 0.03;
  state.mouseGazeCurrentX += (state.mouseGazeTargetX - state.mouseGazeCurrentX) * 0.06;
  state.mouseGazeCurrentY += (state.mouseGazeTargetY - state.mouseGazeCurrentY) * 0.06;
  const mouseWeight = state.uiView === "model" ? 0.65 : 0;
  const saccadeWeight = 1 - mouseWeight;
  const finalGazeX = state.mouseGazeCurrentX * mouseWeight + state.microGazeCurrentX * saccadeWeight;
  const finalGazeY = state.mouseGazeCurrentY * mouseWeight + state.microGazeCurrentY * saccadeWeight;
  const breath = Math.sin(now / 1050 + state.microBreathSeed) * 0.5 + 0.5;
  const sway = Math.sin(now / 860 + state.microBreathSeed * 0.7);
  const ribbon = Math.sin(now / 930 + state.microBreathSeed * 1.3);
  const hair = Math.sin(now / 780 + state.microBreathSeed * 1.9);
  const breathGain = 0.46 - motionBlend * 0.22;
  const styleGain = style === "comfort" ? 1.08 : (style === "playful" ? 1.15 : 1);
  const breathShift = (breath - 0.5) * breathGain * styleGain;
  const bodySwayGain = 0.96 + motionBlend * (0.79 + bodyEnergy * 2.2) * speechMotionBoost;
  const bodySway = sway * 0.22 * bodySwayGain;
  let hairAhogeTarget = hair * (0.18 + audioEnergy * 0.18) + breath * 0.12;
  const hairFrontTarget = hair * 0.12;
  const hairBackTarget = -hair * 0.1;
  let ribbonTarget = ribbon * (0.1 + bodyEnergy * 0.08);
  const skirtTarget = -sway * 0.08;
  const skirt2Target = sway * 0.06;
  if (motionBlend > 0.04 && bodyEnergy > 0.02) {
    const e = bodyEnergy * speechMotionBoost;
    hairAhogeTarget += e * 0.3;
    ribbonTarget += e * 0.2;
  }
  const springK = clampNumber(
    0.068 + motionBlend * 0.04 + bodyEnergy * 0.055 + beatNod * 0.03,
    0.068,
    0.19
  );
  const springDamping = 0.88 - motionBlend * 0.06;
  const springStep = clampNumber(dtFrames, 0.82, 1.25);
  const springSubsteps = Math.max(
    2,
    Math.min(6, Math.round((1 + motionBlend * 2.5) * springStep))
  );
  const springStepEach = springStep / springSubsteps;
  const springTargetFollow = 1 - Math.pow(1 - (0.22 + motionBlend * 0.3), springStep);
  const applySpring = (name, target) => {
    const velKey = `spring_${name}_vel`;
    const posKey = `spring_${name}_pos`;
    const targetKey = `spring_${name}_target`;
    let vel = Number(state[velKey]) || 0;
    let pos = Number(state[posKey]) || 0;
    let smoothedTarget = Number(state[targetKey]);
    if (!Number.isFinite(smoothedTarget)) {
      smoothedTarget = target;
    }
    smoothedTarget += (target - smoothedTarget) * springTargetFollow;
    for (let i = 0; i < springSubsteps; i += 1) {
      vel += (smoothedTarget - pos) * springK * springStepEach;
      vel *= Math.pow(springDamping, springStepEach);
      vel = clampNumber(vel, -1.9, 1.9);
      pos += vel * springStepEach;
      pos = clampNumber(pos, -1, 1);
    }
    state[targetKey] = smoothedTarget;
    state[velKey] = vel;
    state[posKey] = pos;
    return pos;
  };
  const hairAhogeSpring = applySpring("hairAhoge", hairAhogeTarget);
  const hairFrontSpring = applySpring("hairFront", hairFrontTarget);
  const hairBackSpring = applySpring("hairBack", hairBackTarget);
  const ribbonSpring = applySpring("ribbon", ribbonTarget);
  const skirtSpring = applySpring("skirt", skirtTarget);
  const skirt2Spring = applySpring("skirt2", skirt2Target);
  const bodyTarget = clampNumber(
    bodySway * (0.92 + motionBlend * 0.6) + beatNod * (0.12 + motionBlend * 0.24) + breathShift * motionBlend * 0.14,
    -1,
    1
  );
  const bodySpring = applySpring("body", bodyTarget);
  const torsoTarget = clampNumber(
    bodySway * (0.9 + motionBlend * 0.76) + beatNod * (0.16 + motionBlend * 0.28) + breathShift * (0.12 + motionBlend * 0.26),
    -1,
    1
  );
  const torsoSpring = applySpring("torso", torsoTarget);
  const headTarget = clampNumber(
    bodySway * 0.46 + beatNod * 0.24 - torsoSpring * 0.33 - finalGazeX * 0.2,
    -1,
    1
  );
  const headSpring = applySpring("head", headTarget);
  const springRenderFollow = 1 - Math.pow(1 - (0.22 + motionBlend * 0.2), dtFrames);
  state.spring_body_render += (bodySpring - Number(state.spring_body_render || 0)) * springRenderFollow;
  state.spring_torso_render += (torsoSpring - Number(state.spring_torso_render || 0)) * springRenderFollow;
  state.spring_head_render += (headSpring - Number(state.spring_head_render || 0)) * springRenderFollow;
  const bodySpringOut = Number(state.spring_body_render) || 0;
  const torsoSpringOut = Number(state.spring_torso_render) || 0;
  const headSpringOut = Number(state.spring_head_render) || 0;
  const upperSpeechEnvelopeTarget = speaking
    ? motionBlend * (0.74 + bodyEnergy * 0.7) * speechMotionBoost
    : 0;
  const upperSpeechEnvelope = smoothMotionOutput("speech_upper_envelope", upperSpeechEnvelopeTarget, {
    rise: 0.14,
    fall: 0.11,
    maxStep: 0.055
  });
  const upperSpeechEnvelopeOut = smoothMotionOutput("speech_upper_envelope_out", upperSpeechEnvelope, {
    rise: 0.12,
    fall: 0.1,
    maxStep: 0.045
  });
  const upperSpeechGain = speaking
    ? (1 + upperSpeechEnvelopeOut * (0.34 + bodyEnergy * 0.4))
    : 1;
  const upperShoulderGain = speaking
    ? (1 + upperSpeechEnvelopeOut * (0.46 + bodyEnergy * 0.5))
    : 1;
  const angleYSpeechTarget = (-finalGazeY * 4.4)
    + breathShift * (1.4 * upperSpeechGain)
    + (speaking ? (torsoSpringOut * 0.52 + beatNod * (0.62 + upperSpeechEnvelopeOut * 0.72)) : 0);
  const angleYBase = smoothMotionOutput("param_angle_y_base", angleYSpeechTarget, {
    rise: 0.22,
    fall: 0.2,
    maxStep: 0.72
  });
  const angleZSpeechTarget = sway * 1.2 * energyBoost * (0.9 + motionBlend * 0.35)
    + headSpringOut * (2.2 + motionBlend * 1.1)
    + (speaking ? beatNod * (0.82 + upperSpeechEnvelopeOut * 2.1) : 0);
  const angleZBase = smoothMotionOutput("param_angle_z_base", angleZSpeechTarget, {
    rise: 0.2,
    fall: 0.19,
    maxStep: 0.82
  });
  const bodyTalkGain = 1 + motionBlend * (0.32 + bodyEnergy * 0.48) * speechMotionBoost;
  const bodyXBase = smoothMotionOutput("param_body_x_base", finalGazeX * 2.2 + breathShift * 1.1 + torsoSpringOut * 1.08 * bodyTalkGain, {
    rise: 0.24,
    fall: 0.21,
    maxStep: 0.72
  });
  const bodyYBase = smoothMotionOutput("param_body_y_base", breathShift * 0.86 + torsoSpringOut * 1.28 * bodyTalkGain, {
    rise: 0.22,
    fall: 0.2,
    maxStep: 0.82
  });
  const bodyZBase = smoothMotionOutput("param_body_z_base", bodySpringOut * 9.6 * bodyTalkGain + torsoSpringOut * 3.5 * (1 + motionBlend * 0.3), {
    rise: 0.21,
    fall: 0.2,
    maxStep: 1.45
  });
  const shoulderSpeechPulse = speaking
    ? (Math.sin(now / 188 + state.microBreathSeed * 0.9) * 0.5 + 0.5) * upperSpeechEnvelopeOut * (0.12 + bodyEnergy * 0.28)
    : 0;
  const shoulderBaseTarget = 0.08
    + breath * (speaking ? (0.2 + audioEnergy * 0.28) * upperShoulderGain : 0.18)
    + shoulderSpeechPulse;
  const shoulderBase = smoothMotionOutput("param_shoulder_base", shoulderBaseTarget, {
    rise: 0.17,
    fall: 0.15,
    maxStep: 0.1
  });
  const upperTalkWave = speaking
    ? Math.sin(now / 192 + state.microBreathSeed * 1.1) * upperSpeechEnvelopeOut * (0.32 + bodyEnergy * 0.68)
    : 0;
  const upperTalkWaveSmoothed = smoothMotionOutput("param_upper_talk_wave", upperTalkWave, {
    rise: 0.17,
    fall: 0.15,
    maxStep: 0.09
  });
  const upperShoulderLift = smoothMotionOutput(
    "param_upper_shoulder_lift",
    speaking ? Math.abs(upperTalkWaveSmoothed) * (0.24 + motionBlend * 0.34) : 0,
    {
      rise: 0.18,
      fall: 0.16,
      maxStep: 0.06
    }
  );
  const upperTalkWaveOut = smoothMotionOutput("param_upper_talk_wave_out", upperTalkWaveSmoothed, {
    rise: 0.16,
    fall: 0.14,
    maxStep: 0.07
  });
  const upperShoulderLiftOut = smoothMotionOutput("param_upper_shoulder_lift_out", upperShoulderLift, {
    rise: 0.16,
    fall: 0.14,
    maxStep: 0.05
  });
  safeAddParamValue(core, "ParamEyeLOpen", -blink * 0.82, 0.96);
  safeAddParamValue(core, "ParamEyeROpen", -blink * 0.82, 0.96);
  safeAddParamValue(core, "ParamEyeBallX", finalGazeX, 0.45);
  safeAddParamValue(core, "ParamEyeBallY", finalGazeY, 0.45);
  safeAddParamValue(core, "ParamAngleX", finalGazeX * 5.8, 0.18);
  safeAddParamValue(core, "ParamAngleY", angleYBase, 0.18);
  safeAddParamValue(core, "ParamAngleZ", angleZBase, 0.12);
  safeAddParamValue(core, "ParamBodyAngleX", bodyXBase, 0.13);
  safeAddParamValue(core, "ParamBodyAngleY", bodyYBase, 0.13);
  safeAddParamValue(core, "ParamBodyAngleZ", bodyZBase, 0.64);
  safeAddParamValue(core, "ParamBreath", 0.22 + breath * 0.42, 0.2);
  safeAddParamValue(core, "ParamShoulder", shoulderBase, 0.14);
  if (speaking && upperSpeechEnvelopeOut > 0.04) {
    safeAddParamValue(core, "ParamAngleY", upperTalkWaveOut * 1.9, 0.36);
    safeAddParamValue(core, "ParamAngleZ", upperTalkWaveOut * 0.95, 0.3);
    safeAddParamValue(core, "ParamShoulder", upperShoulderLiftOut, 0.46);
  }
  safeAddParamValue(core, "ParamHairAhoge", hairAhogeSpring, 0.16);
  safeAddParamValue(core, "ParamHairFront", hairFrontSpring, 0.12);
  safeAddParamValue(core, "ParamHairBack", hairBackSpring, 0.1);
  safeAddParamValue(core, "ParamRibbon", ribbonSpring, 0.1);
  safeAddParamValue(core, "ParamSkirt", skirtSpring, 0.08);
  safeAddParamValue(core, "ParamSkirt2", skirt2Spring, 0.08);
  if (motionBlend > 0.06 && bodyEnergy > 0.02) {
    const e = bodyEnergy;
    const eShaped = Math.tanh(e * 1.45) / Math.tanh(1.45);
    const yBounceRaw = (Math.sin(now / 118 + state.microBreathSeed * 0.6) * 0.5 + 0.5) * eShaped;
    const yBounce = smoothMotionOutput("speech_y_bounce", yBounceRaw, {
      rise: 0.2,
      fall: 0.18,
      maxStep: 0.085
    });
    const motionGain = clampNumber(
      upperSpeechEnvelopeOut * (0.58 + upperSpeechEnvelopeOut * 0.52) * speechMotionBoost,
      0,
      1.55
    );
    const bodyZEnergyAdd = smoothMotionOutput("param_body_z_energy_add", eShaped * 17.6 * motionGain, {
      rise: 0.18,
      fall: 0.16,
      maxStep: 1.22
    });
    const bodyXEnergyAdd = smoothMotionOutput("param_body_x_energy_add", eShaped * 1.46 * motionGain, {
      rise: 0.2,
      fall: 0.17,
      maxStep: 0.2
    });
    const angleZEnergyAdd = smoothMotionOutput("param_angle_z_energy_add", (eShaped * 9.4 + headSpringOut * 1.9) * motionGain, {
      rise: 0.18,
      fall: 0.16,
      maxStep: 0.86
    });
    const angleYEnergyAdd = smoothMotionOutput("param_angle_y_energy_add", (-eShaped * 1.7 + yBounce * 2.7) * motionGain, {
      rise: 0.2,
      fall: 0.17,
      maxStep: 0.52
    });
    const bodyYEnergyAdd = smoothMotionOutput("param_body_y_energy_add", (yBounce * 5.6 + torsoSpringOut * 2.3) * motionGain, {
      rise: 0.19,
      fall: 0.17,
      maxStep: 0.74
    });
    const shoulderEnergyAdd = smoothMotionOutput("param_shoulder_energy_add", e * 0.46 * motionGain, {
      rise: 0.19,
      fall: 0.16,
      maxStep: 0.08
    });
    safeAddParamValue(core, "ParamBodyAngleZ", bodyZEnergyAdd, 0.84);
    safeAddParamValue(core, "ParamBodyAngleX", bodyXEnergyAdd, 0.5);
    safeAddParamValue(core, "ParamAngleZ", angleZEnergyAdd, 0.64);
    safeAddParamValue(core, "ParamAngleY", angleYEnergyAdd, 0.4);
    safeAddParamValue(core, "ParamBodyAngleY", bodyYEnergyAdd, 0.6);
    safeAddParamValue(core, "ParamShoulder", shoulderEnergyAdd, 0.52);
    if (beatNod > 0.02) {
      const beatAngleYAdd = smoothMotionOutput("param_angle_y_beat_add", beatNod * 4.1 * motionGain, {
        rise: 0.22,
        fall: 0.2,
        maxStep: 0.42
      });
      const beatBodyYAdd = smoothMotionOutput("param_body_y_beat_add", beatNod * 2.8 * motionGain, {
        rise: 0.2,
        fall: 0.18,
        maxStep: 0.46
      });
      const beatShoulderAdd = smoothMotionOutput(
        "param_shoulder_beat_add",
        beatNod * 0.42 * motionGain * (1 + motionBlend * 0.8),
        {
          rise: 0.22,
          fall: 0.2,
          maxStep: 0.06
        }
      );
      safeAddParamValue(core, "ParamAngleY", beatAngleYAdd, 0.52);
      safeAddParamValue(core, "ParamBodyAngleY", beatBodyYAdd, 0.54);
      safeAddParamValue(core, "ParamShoulder", beatShoulderAdd, 0.5);
    }
  }

  if (phase === "attack") {
    const t = clampNumber(phaseAge / 300, 0, 1);
    const attackCurve = Math.sin(t * Math.PI);
    const a = attackCurve * 0.8;
    safeAddParamValue(core, "ParamBodyAngleY", a * 2.2, 0.5);
    safeAddParamValue(core, "ParamAngleY", -a * 1.8, 0.45);
    safeAddParamValue(core, "ParamShoulder", a * 0.15, 0.4);
  }

  if (phase === "release") {
    const t = clampNumber(1 - phaseAge / 600, 0, 1);
    const r = t * 0.5;
    safeAddParamValue(core, "ParamBodyAngleY", r * 1.2, 0.4);
    safeAddParamValue(core, "ParamAngleY", -r * 0.8, 0.35);
  }
  if (happyBlend > 0.001) {
    const g = happyBlend * moodGain;
    safeAddParamValue(core, "ParamCheek", (0.12 + breath * 0.05) * g, 0.42);
    safeAddParamValue(core, "ParamBrowLForm", 0.18 * g, 0.42);
    safeAddParamValue(core, "ParamBrowRForm", 0.18 * g, 0.42);
    safeAddParamValue(core, "ParamAngleX", 1.2 * g, 0.28);
  }
  if (sadBlend > 0.001) {
    const g = sadBlend * moodGain;
    safeAddParamValue(core, "ParamAngleY", 0.32 * g, 0.36);
    safeAddParamValue(core, "ParamShoulder", -0.18 * g, 0.3);
    safeAddParamValue(core, "ParamBrowLX", -0.08 * g, 0.32);
    safeAddParamValue(core, "ParamBrowRX", 0.08 * g, 0.32);
    safeAddParamValue(core, "ParamBrowLForm", -0.22 * g, 0.36);
    safeAddParamValue(core, "ParamBrowRForm", -0.22 * g, 0.36);
    safeAddParamValue(core, "ParamBodyAngleX", -0.24 * g, 0.28);
  }
  if (angryBlend > 0.001) {
    const g = angryBlend * moodGain;
    safeAddParamValue(core, "ParamBrowLY", -0.22 * g, 0.44);
    safeAddParamValue(core, "ParamBrowRY", -0.22 * g, 0.44);
    safeAddParamValue(core, "ParamBrowLAngle", -0.16 * g, 0.4);
    safeAddParamValue(core, "ParamBrowRAngle", 0.16 * g, 0.4);
    safeAddParamValue(core, "ParamEyeLOpen", 0.08 * g, 0.3);
    safeAddParamValue(core, "ParamEyeROpen", 0.08 * g, 0.3);
    safeAddParamValue(core, "ParamBodyAngleZ", Math.sin(now / 120) * 4 * g, 0.3);
  }
  if (surprisedBlend > 0.001) {
    const g = surprisedBlend * moodGain;
    safeAddParamValue(core, "ParamHairAhoge", 0.32 * g, 0.34);
    safeAddParamValue(core, "ParamEyeLOpen", 0.24 * g, 0.42);
    safeAddParamValue(core, "ParamEyeROpen", 0.24 * g, 0.42);
    safeAddParamValue(core, "ParamBrowLY", 0.22 * g, 0.4);
    safeAddParamValue(core, "ParamBrowRY", 0.22 * g, 0.4);
    safeAddParamValue(core, "ParamAngleY", -0.22 * g, 0.28);
  }
  if (style === "comfort") {
    safeAddParamValue(core, "ParamHandL", 0.06 + breath * 0.04, 0.1);
    safeAddParamValue(core, "ParamHandR", -0.05 - breath * 0.03, 0.1);
    safeAddParamValue(core, "ParamArmLB", 0.08, 0.08);
    safeAddParamValue(core, "ParamArmRB", -0.06, 0.08);
  } else if (style === "playful") {
    safeAddParamValue(core, "ParamHandL", 0.08 + sway * 0.06, 0.11);
    safeAddParamValue(core, "ParamHandR", 0.08 - sway * 0.06, 0.11);
    safeAddParamValue(core, "ParamArmLA", sway * 0.14, 0.08);
    safeAddParamValue(core, "ParamArmRA", -sway * 0.14, 0.08);
  } else if (style === "steady") {
    safeAddParamValue(core, "ParamShoulder", breath * 0.1, 0.12);
    safeAddParamValue(core, "ParamArmLA", -0.04, 0.08);
    safeAddParamValue(core, "ParamArmRA", 0.04, 0.08);
  }
}

function getSpeechAnimationMouthOpen() {
  const now = performance.now();
  const audioPlaying = isSpeakingNow();
  const speaking = isSpeechMotionActive(now);
  const activeUntil = Number(state.speechAnimUntil || 0);
  if (!speaking) {
    const closeSpeed = now >= activeUntil ? 0.74 : 0.48;
    state.speechMouthOpen += (0 - state.speechMouthOpen) * closeSpeed;
    if (Math.abs(state.speechMouthOpen) < 0.003) {
      state.speechMouthOpen = 0;
    }
    return state.speechMouthOpen;
  }
  const liveLevel = sampleTTSAudioLevel();
  const hasLiveAudio = audioPlaying && !!state.ttsAudioAnalyser;
  const start = Number(state.speechAnimStartedAt || now);
  const duration = Math.max(260, Number(state.speechAnimDurationMs) || 1000);
  const progress = clampNumber((now - start) / duration, 0, 1.3);
  const style = normalizeTalkStyle(state.speechAnimStyle || state.currentTalkStyle || "neutral");
  const mood = String(state.speechAnimMood || "idle");
  const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
  const chars = Math.max(1, Number(state.speechAnimTextLength) || 8);
  const punct = Math.max(0, Number(state.speechAnimPunctuation) || 0);
  const accentCount = Math.max(0, Number(state.speechAnimAccentCount) || 0);
  const seed = Number(state.speechAnimSeed) || 0;
  const pace = style === "playful" ? 11.5 : (style === "comfort" ? 8.4 : 9.8);
  const waveA = Math.abs(Math.sin(progress * Math.PI * pace + seed));
  const waveB = Math.abs(Math.sin(progress * Math.PI * (pace * 0.53) + seed * 0.67));
  const pauseShape = 1 - Math.pow(Math.sin(clampNumber(progress, 0, 1) * Math.PI), 6) * 0.08;
  let energy = 0.24 + waveA * 0.64 + waveB * 0.28;
  energy *= pauseShape;
  if (mood === "happy" || mood === "surprised") {
    energy += 0.06;
  } else if (mood === "sad") {
    energy -= 0.04;
  }
  energy += Math.min(0.08, punct * 0.012) + Math.min(0.06, chars / 260);
  if (!speaking) {
    energy *= Math.max(0, 1 - clampNumber((now - activeUntil) / 220, 0, 1));
  }
  const syllableRate = style === "playful" ? 2.7 : (style === "steady" ? 3.8 : 3.2);
  const pseudoSyllables = Math.max(
    3,
    Math.min(26, Math.round(chars / syllableRate) + punct + accentCount * 2)
  );
  const durationSec = Math.max(0.24, duration / 1000);
  const syllablesPerSec = pseudoSyllables / durationSec;
  const fastSpeechFactor = clampNumber((syllablesPerSec - 4.8) / 4.2, 0, 1);
  const visemePhase = progress * pseudoSyllables;
  const visemeT = visemePhase - Math.floor(visemePhase);
  const visemeOpen = Math.pow(Math.sin(visemeT * Math.PI), style === "steady" ? 1.6 : 1.28);
  const visemeClosureRaw = Math.pow(Math.abs(Math.cos(visemeT * Math.PI)), 4.2) * (0.18 + punct * 0.01);
  const closureGate = clampNumber(
    visemeClosureRaw * (1.05 + fastSpeechFactor * 0.75),
    0,
    0.9
  );
  const accentSlots = Math.max(1, Math.min(6, punct + accentCount + 1));
  let accentPulse = 0;
  for (let i = 0; i < accentSlots; i += 1) {
    const center = (i + 0.5) / accentSlots + Math.sin(seed + i * 1.7) * 0.012;
    const width = i % 3 === 1 ? 0.1 : 0.075;
    const shape = Math.max(0, 1 - Math.abs(progress - center) / width);
    const accentGain = [1.12, 0.78, 1.0][i % 3];
    accentPulse = Math.max(accentPulse, shape * accentGain);
  }
  const visemeJitter = Math.sin(progress * Math.PI * (5.8 + punct * 0.35) + seed * 1.37) * 0.035;
  let target = clampNumber(
    energy * (0.46 + visemeOpen * 0.64)
      + accentPulse * 0.2
      - visemeClosureRaw * (0.88 + fastSpeechFactor * 0.34)
      + visemeJitter,
    0,
    1
  );
  if (speaking) {
    target *= (1 - closureGate * (0.22 + fastSpeechFactor * 0.18));
    const speakingFloor = 0.02 + motionBlend * (0.05 - fastSpeechFactor * 0.03);
    target = Math.max(target, speakingFloor);
  }
  if (hasLiveAudio) {
    const rawLevel = clampNumber(Number(state.ttsAudioRawLevel) || liveLevel || 0, 0, 1);
    const voiceRecent = now - Number(state.ttsAudioLastVoiceAt || 0) < 58;
    const voiced = rawLevel > 0.035 || liveLevel > 0.045 || voiceRecent;
    const closureDip = clampNumber(closureGate * (0.68 + fastSpeechFactor * 0.5), 0, 0.92);
    const rhythmGate = clampNumber(0.62 + visemeOpen * 0.48 - closureDip, 0.035, 1.06);
    const liveBase = voiced
      ? clampNumber(rawLevel * 1.48 + liveLevel * 0.42 + accentPulse * 0.02, 0, 1)
      : 0;
    const textHint = voiced ? clampNumber(target * (0.07 + visemeOpen * 0.08), 0, 0.1) : 0;
    target = clampNumber(liveBase * rhythmGate + textHint, 0, 1);
    if (voiced && closureGate > 0.28) {
      const closureCap = clampNumber(
        0.045 + liveLevel * 0.16 + rawLevel * 0.1 + (1 - fastSpeechFactor) * 0.035,
        0.045,
        0.24
      );
      target = Math.min(target, closureCap);
    }
    if (!voiced && liveLevel < 0.04) {
      target = 0;
    }
    const openSmooth = voiced ? clampNumber(0.78 - closureGate * 0.28, 0.46, 0.82) : 0.22;
    const closeSmooth = voiced
      ? clampNumber(0.86 + closureGate * 0.2 + fastSpeechFactor * 0.1, 0.84, 0.985)
      : 0.94;
    const smoothing = target > state.speechMouthOpen ? openSmooth : closeSmooth;
    state.speechMouthOpen += (target - state.speechMouthOpen) * smoothing;
    if (!voiced && state.speechMouthOpen < 0.012) {
      state.speechMouthOpen = 0;
    }
    return state.speechMouthOpen;
  }
  const openSmooth = clampNumber(0.64 - closureGate * 0.14, 0.45, 0.68);
  const closeSmooth = clampNumber(
    0.56 + closureGate * 0.18 + fastSpeechFactor * 0.1,
    0.42,
    0.82
  );
  const smoothing = target > state.speechMouthOpen ? openSmooth : closeSmooth;
  state.speechMouthOpen += (target - state.speechMouthOpen) * smoothing;
  return state.speechMouthOpen;
}

function applyStyleExpressionLayer() {
  if (!state.expressionEnabled || !state.model) {
    return;
  }
  const core = getCoreModel();
  if (!core) {
    return;
  }
  const style = normalizeTalkStyle(state.currentTalkStyle || state.expressionStyle || "neutral");
  const profile = getStyleExpressionProfile(style);
  const now = performance.now();
  const speaking = isSpeechMotionActive(now);
  const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
  const speakingQuiet = state.motionQuietDuringSpeech && speaking;
  const moodBlend = getSmoothedMoodExpression(now);
  const weightedMood = String(state.moodExpressionWeightMood || "idle");
  const runtimeMoodActive = now < Number(state.moodExpressionWeightUntil || 0)
    && weightedMood === String(state.moodExpressionRuntimeMood || "idle");
  const runtimeMoodWeight = runtimeMoodActive
    ? clampNumber(Number(state.moodExpressionWeight) || 1, 0.7, 1.45)
    : 1;
  const runtimeMoodBlend = runtimeMoodActive && weightedMood in moodBlend
    ? { ...moodBlend, [weightedMood]: Math.max(Number(moodBlend[weightedMood]) || 0, 1) }
    : moodBlend;
  const happyMoodScale = speakingQuiet ? (0.32 + (1 - motionBlend) * 0.2) : 1;
  const subtleMoodScale = speakingQuiet ? (0.16 + (1 - motionBlend) * 0.12) : 1;
  const happyBlend = clampNumber(runtimeMoodBlend.happy * (weightedMood === "happy" ? runtimeMoodWeight : 1), 0, 1.35) * happyMoodScale;
  const sadBlend = clampNumber(runtimeMoodBlend.sad * (weightedMood === "sad" ? runtimeMoodWeight : 1), 0, 1.35) * subtleMoodScale;
  const angryBlend = clampNumber(runtimeMoodBlend.angry * (weightedMood === "angry" ? runtimeMoodWeight : 1), 0, 1.35) * subtleMoodScale * (speakingQuiet ? 0.8 : 1);
  const surprisedBlend = clampNumber(runtimeMoodBlend.surprised * (weightedMood === "surprised" ? runtimeMoodWeight : 1), 0, 1.35) * subtleMoodScale * (speakingQuiet ? 0.75 : 1);
  const pulseActive = now < Number(state.expressionPulseUntil || 0);
  const pulseWeight = pulseActive ? state.expressionPulseBoost : 0;
  const strength = clampNumber(Number(state.expressionStrength) || 1, 0.2, 2.0);
  const speakGain = 0.36 + motionBlend * 0.64;
  const pulseGain = pulseActive
    ? (0.65 + pulseWeight * 0.28) * (speakingQuiet ? 0.34 : 1)
    : 0.0;
  const gain = strength * (speakGain + pulseGain);
  if (state.uiView === "model" && !speaking) {
    state.speechMouthOpen += (0 - (Number(state.speechMouthOpen) || 0)) * 0.46;
    if (Math.abs(Number(state.speechMouthOpen) || 0) < 0.003) {
      state.speechMouthOpen = 0;
    }
  }
  const mouthOpen = state.uiView === "model"
    ? Number(state.speechMouthOpen) || 0
    : getSpeechAnimationMouthOpen();

  const surpriseMouthBoost = surprisedBlend > 0.001
    ? (0.34 + 0.38 * motionBlend) * surprisedBlend * gain
    : 0;
  const sadMouthDip = sadBlend > 0.001
    ? 0.16 * sadBlend * gain
    : 0;
  const mouthCarry = 0.08 + motionBlend * 0.94;
  const mouthSpeakBoost = speaking ? (1.1 + motionBlend * 0.24) : 1.0;
  const mouthTarget = clampNumber(
    mouthOpen * mouthCarry * mouthSpeakBoost + surpriseMouthBoost - sadMouthDip,
    0,
    1
  );
  state.speechMouthTarget = mouthTarget;
  state.speechMouthUpdatedAt = now;

  safeAddParamValue(core, "ParamMouthForm", profile.mouthForm * gain, 0.9);
  safeDriveParamValue(core, "ParamMouthOpenY", mouthTarget, 0.84 + motionBlend * 0.14);
  safeAddParamValue(core, "ParamCheek", profile.cheek * gain, 0.9);
  safeAddParamValue(core, "ParamEyeLSmile", profile.eyeSmile * gain, 0.9);
  safeAddParamValue(core, "ParamEyeRSmile", profile.eyeSmile * gain, 0.9);
  safeAddParamValue(core, "ParamBrowLY", profile.browY * gain, 0.9);
  safeAddParamValue(core, "ParamBrowRY", profile.browY * gain, 0.9);
  safeAddParamValue(core, "ParamBrowLAngle", profile.browAngle * gain, 0.9);
  safeAddParamValue(core, "ParamBrowRAngle", -profile.browAngle * gain, 0.9);
  safeAddParamValue(core, "ParamAngleX", profile.headX * gain, 0.82);
  safeAddParamValue(core, "ParamAngleY", profile.headY * gain, 0.82);
  safeAddParamValue(core, "ParamBodyAngleX", profile.bodyX * gain, 0.76);
  if (happyBlend > 0.001) {
    const g = happyBlend * gain;
    safeAddParamValue(core, "ParamEyeLSmile", 0.4 * g, 0.85);
    safeAddParamValue(core, "ParamEyeRSmile", 0.4 * g, 0.85);
    safeAddParamValue(core, "ParamMouthForm", 0.5 * g, 0.85);
    safeAddParamValue(core, "ParamCheek", 0.4 * g, 0.8);
    safeAddParamValue(core, "ParamBrowLY", 0.15 * g, 0.7);
    safeAddParamValue(core, "ParamBrowRY", 0.15 * g, 0.7);
    safeAddParamValue(core, "ParamAngleX", 3.0 * g, 0.5);
  }
  if (sadBlend > 0.001) {
    const g = sadBlend * gain;
    safeAddParamValue(core, "ParamEyeLOpen", -0.34 * g, 0.85);
    safeAddParamValue(core, "ParamEyeROpen", -0.34 * g, 0.85);
    safeAddParamValue(core, "ParamBrowLY", -0.3 * g, 0.82);
    safeAddParamValue(core, "ParamBrowRY", -0.3 * g, 0.82);
    safeAddParamValue(core, "ParamBrowLForm", -0.32 * g, 0.76);
    safeAddParamValue(core, "ParamBrowRForm", -0.32 * g, 0.76);
    safeAddParamValue(core, "ParamBrowLAngle", 0.22 * g, 0.72);
    safeAddParamValue(core, "ParamBrowRAngle", -0.22 * g, 0.72);
    safeAddParamValue(core, "ParamMouthForm", -0.68 * g, 0.86);
    safeDriveParamValue(core, "ParamMouthOpenY", 0.02, 0.5);
    safeAddParamValue(core, "ParamAngleY", 4.8 * g, 0.54);
    safeAddParamValue(core, "ParamBodyAngleX", -3.4 * g, 0.42);
  }
  if (angryBlend > 0.001) {
    const g = angryBlend * gain;
    safeAddParamValue(core, "ParamBrowLY", -0.35 * g, 0.9);
    safeAddParamValue(core, "ParamBrowRY", -0.35 * g, 0.9);
    safeAddParamValue(core, "ParamBrowLAngle", -0.2 * g, 0.85);
    safeAddParamValue(core, "ParamBrowRAngle", 0.2 * g, 0.85);
    safeAddParamValue(core, "ParamEyeLOpen", 0.1 * g, 0.7);
    safeAddParamValue(core, "ParamEyeROpen", 0.1 * g, 0.7);
    safeAddParamValue(core, "ParamMouthForm", -0.35 * g, 0.85);
    safeAddParamValue(core, "ParamBodyAngleZ", Math.sin(now / 120) * 4 * g, 0.3);
  }
  if (surprisedBlend > 0.001) {
    const g = surprisedBlend * gain;
    safeAddParamValue(core, "ParamEyeLOpen", 0.55 * g, 0.92);
    safeAddParamValue(core, "ParamEyeROpen", 0.55 * g, 0.92);
    safeAddParamValue(core, "ParamBrowLY", 0.42 * g, 0.88);
    safeAddParamValue(core, "ParamBrowRY", 0.42 * g, 0.88);
    safeAddParamValue(core, "ParamBrowLForm", 0.26 * g, 0.72);
    safeAddParamValue(core, "ParamBrowRForm", 0.26 * g, 0.72);
    safeAddParamValue(core, "ParamMouthForm", -0.34 * g, 0.78);
    safeDriveParamValue(core, "ParamMouthOpenY", clampNumber(0.28 * g, 0, 0.55), 0.62);
    safeAddParamValue(core, "ParamAngleY", -3.8 * g, 0.52);
  }
}

function uniqueMotionGroups(groups) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(groups) ? groups : []) {
    const g = String(raw || "").trim();
    if (!g || seen.has(g)) {
      continue;
    }
    seen.add(g);
    out.push(g);
  }
  return out;
}

function normalizeMotionGroupKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function findSemanticMotionGroups(tags = [], limit = 8) {
  const normalizedTags = uniqueMotionGroups(tags)
    .map((tag) => normalizeMotionGroupKey(tag))
    .filter(Boolean);
  if (!normalizedTags.length || !Array.isArray(state.availableMotionGroups) || !state.availableMotionGroups.length) {
    return [];
  }
  const scored = [];
  for (const group of state.availableMotionGroups) {
    const key = normalizeMotionGroupKey(group);
    if (!key) {
      continue;
    }
    let score = 0;
    for (const tag of normalizedTags) {
      if (key === tag) {
        score += 6;
      } else if (key.startsWith(tag) || key.endsWith(tag)) {
        score += 4;
      } else if (key.includes(tag)) {
        score += 2;
      }
    }
    if (score > 0) {
      if (group === state.lastMotionGroup) {
        score -= 1.2;
      }
      scored.push({ group, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return uniqueMotionGroups(scored.slice(0, Math.max(1, limit)).map((item) => item.group));
}

function getSemanticMotionTags(intent, mood = "idle", style = "neutral", source = "emotion") {
  const tags = [];
  tags.push(...(MOTION_SEMANTIC_TOKENS[String(intent || "idle").toLowerCase()] || []));
  tags.push(...(MOTION_SEMANTIC_TOKENS[String(mood || "idle").toLowerCase()] || []));
  tags.push(...(MOTION_SEMANTIC_TOKENS[String(source || "emotion").toLowerCase()] || []));
  if (style === "playful") {
    tags.push("tap", "wave", "happy", "jump");
  } else if (style === "comfort") {
    tags.push("idle", "down", "soft", "head");
  } else if (style === "clear") {
    tags.push("flickup", "pose", "main");
  } else if (style === "steady") {
    tags.push("body", "main", "flick");
  }
  return uniqueMotionGroups(tags);
}

function getStyleMotionGroups(style, intent) {
  const s = normalizeTalkStyle(style);
  const i = String(intent || "reply").trim().toLowerCase();
  const table = STYLE_MOTION_BLUEPRINT[s] || STYLE_MOTION_BLUEPRINT.neutral;
  const picked = table[i] || table.reply || STYLE_MOTION_BLUEPRINT.neutral.reply;
  return uniqueMotionGroups(picked);
}

function buildPlannedMotionGroups(style, intent, mood, source) {
  const profile = getActiveModelMotionProfile();
  const byStyle = getStyleMotionGroups(style, intent);
  const byMood = pickMoodMotionGroups(mood, source);
  const byProfileIntent = profile?.intents?.[String(intent || "idle").toLowerCase()] || [];
  const byProfileMood = profile?.moods?.[String(mood || "idle").toLowerCase()] || [];
  const semantic = findSemanticMotionGroups(
    getSemanticMotionTags(intent, mood, style, source),
    10
  );
  return uniqueMotionGroups([...byProfileIntent, ...byStyle, ...byProfileMood, ...byMood, ...semantic]);
}

function shouldThrottleActionIntent(intent, minGapMs = 700) {
  const key = String(intent || "unknown");
  const now = performance.now();
  const last = Number(state.actionLastAt?.[key] || 0);
  if ((now - last) < Math.max(80, Number(minGapMs) || 0)) {
    return true;
  }
  state.actionLastAt[key] = now;
  return false;
}

function clearThinkingMotionTimer() {
  if (!state.thinkingMotionTimer) {
    return;
  }
  clearTimeout(state.thinkingMotionTimer);
  state.thinkingMotionTimer = 0;
}

function resetActionSystem() {
  clearThinkingMotionTimer();
  state.actionQueue = [];
  state.actionRunnerBusy = false;
  state.expressionPulseUntil = 0;
  state.expressionPulseBoost = 0;
}

function buildActionPlan(intent, context = {}) {
  const preset = getMotionIntensityPreset();
  const style = normalizeTalkStyle(context.style || state.currentTalkStyle || "neutral");
  const mood = detectMood(context.text || context.mood || "");
  const idleMood = ["happy", "sad", "angry", "surprised", "idle"].includes(String(context.idleMood || ""))
    ? String(context.idleMood || "")
    : "idle";
  const idleIntent = ["idle", "thinking", "listen"].includes(String(context.idleIntent || ""))
    ? String(context.idleIntent || "")
    : "idle";
  const comboEnabled = state.motionComboEnabled && context.combo !== false;
  const requestedBeats = Math.max(1, Math.min(4, Math.round(Number(context.beats) || 1)));
  const steps = [];

  if (intent === "tap") {
    const tapMood = mood === "idle" ? "happy" : mood;
    if (Math.random() <= preset.tapChance) {
      steps.push({
        mood: tapMood,
        source: "tap",
        groups: buildPlannedMotionGroups(style, "tap", tapMood, "tap"),
        priority: 3,
        force: true,
        cooldownMs: 620,
        allowFallback: false
      });
    }
    if (comboEnabled && Math.random() < preset.comboChance) {
      const followMood = ["happy", "surprised", "idle"][Math.floor(Math.random() * 3)] || "idle";
      steps.push({
        mood: followMood,
        source: "talk",
        groups: buildPlannedMotionGroups(style, "talk", followMood, "talk"),
        priority: 2,
        force: true,
        cooldownMs: 520,
        delayMs: 160,
        allowFallback: false
      });
    }
    return steps;
  }

  if (intent === "listen") {
    const listenMood = mood === "angry" ? "angry" : "idle";
    if (Math.random() < (Number(preset.listenChance) || 0.78)) {
      steps.push({
        mood: listenMood,
        source: "talk",
        groups: buildPlannedMotionGroups(style, "listen", listenMood, "talk"),
        priority: 2,
        force: false,
        cooldownMs: 900,
        allowFallback: false
      });
    }
    if (comboEnabled && Math.random() < (Number(preset.comboChance) || 0.4) * 0.28) {
      steps.push({
        mood: listenMood,
        source: "idle",
        groups: buildPlannedMotionGroups(style, "thinking", listenMood, "idle"),
        priority: 1,
        force: false,
        cooldownMs: 520,
        delayMs: 120,
        allowFallback: false
      });
    }
    return steps;
  }

  if (intent === "thinking") {
    steps.push({
      mood: "idle",
      source: "idle",
      groups: buildPlannedMotionGroups(style, "thinking", "idle", "idle"),
      priority: 2,
      force: false,
      cooldownMs: 1200,
      allowFallback: false
    });
    if (comboEnabled && Math.random() < (Number(preset.thinkingComboChance) || 0.4)) {
      steps.push({
        mood: "idle",
        source: "idle",
        groups: buildPlannedMotionGroups(style, "idle", "idle", "idle"),
        priority: 1,
        force: false,
        cooldownMs: 640,
        delayMs: 180,
        allowFallback: false
      });
    }
    return steps;
  }

  if (intent === "talk") {
    const emphasis = clampNumber(Number(context.emphasis) || 0, 0, 1);
    const accentCount = Math.max(0, Math.round(Number(context.accentCount) || 0));
    const talkChance = clampNumber((Number(preset.talkChance) || 0.82) + emphasis * 0.12, 0, 0.92);
    if (Math.random() > talkChance) {
      return steps;
    }
    const talkMood = mood === "idle" && style === "playful" ? "happy" : mood;
    const maxBeats = Math.max(1, Math.min(4, Number(preset.talkMaxBeats) || 3));
    const beats = Math.max(1, Math.min(maxBeats, requestedBeats));
    steps.push({
      mood: talkMood,
      source: style === "playful" ? "tap" : "talk",
      groups: buildPlannedMotionGroups(
        style,
        "talk",
        talkMood,
        style === "playful" ? "tap" : "talk"
      ),
      priority: 2,
      force: true,
      cooldownMs: Math.max(520, Math.round(780 - emphasis * 140)),
      allowFallback: false
    });
    const cadencePattern = emphasis > 0.45 ? [96, 270, 128] : [108, 256, 136];
    const cadenceStride = emphasis > 0.6 ? 46 : 52;
    for (let beat = 1; beat < beats; beat += 1) {
      const beatMood = beat % 2 === 0 ? "idle" : talkMood;
      const beatRole = (beat - 1) % 3;
      const isAccentBeat = beatRole === 0 || (accentCount > 1 && beatRole === 2);
      const nonlinearBeatDelay = cadencePattern[beatRole];
      steps.push({
        mood: beatMood,
        source: isAccentBeat ? "reply" : "talk",
        groups: buildPlannedMotionGroups(style, isAccentBeat ? "reply" : "talk", beatMood, "talk"),
        priority: isAccentBeat ? 2 : 1,
        force: true,
        cooldownMs: isAccentBeat ? Math.max(340, Math.round(460 - emphasis * 80)) : 460,
        delayMs: nonlinearBeatDelay + Math.floor((beat - 1) / 3) * (cadenceStride + Math.round((1 - emphasis) * 8)),
        allowFallback: false
      });
    }
    const comboChance = (Number(preset.comboChance) || 0.4) * (0.42 + emphasis * 0.55);
    if (comboEnabled && (emphasis > 0.82 || Math.random() < comboChance)) {
      const accentMood = style === "comfort" ? "idle" : (talkMood === "idle" ? "happy" : talkMood);
      steps.push({
        mood: accentMood,
        source: "talk",
        groups: buildPlannedMotionGroups(style, "reply", accentMood, "talk"),
        priority: 2,
        force: true,
        cooldownMs: Math.max(460, Math.round(540 - emphasis * 60)),
        delayMs: Math.max(130, Math.round((180 + beats * 92) - emphasis * 38)),
        allowFallback: false
      });
    }
    return steps;
  }

  if (intent === "reply") {
    steps.push({
      mood,
      source: style === "playful" ? "tap" : "emotion",
      groups: buildPlannedMotionGroups(
        style,
        "reply",
        mood,
        style === "playful" ? "tap" : "emotion"
      ),
      priority: 3,
      force: true,
      cooldownMs: 860,
      allowFallback: true
    });
    if (comboEnabled && Math.random() < (preset.comboChance * 0.8)) {
      const follow = style === "comfort" ? "idle" : mood;
      steps.push({
        mood: follow,
        source: "talk",
        groups: buildPlannedMotionGroups(style, "talk", follow, "talk"),
        priority: 2,
        force: true,
        cooldownMs: 560,
        delayMs: 170,
        allowFallback: false
      });
    }
    if (comboEnabled && Math.random() < (Number(preset.replyAccentChance) || 0.42)) {
      const tailMood = style === "playful" ? "happy" : "idle";
      steps.push({
        mood: tailMood,
        source: "idle",
        groups: buildPlannedMotionGroups(style, "idle", tailMood, "idle"),
        priority: 1,
        force: false,
        cooldownMs: 480,
        delayMs: 280,
        allowFallback: false
      });
    }
    return steps;
  }

  // idle/default
  steps.push({
    mood: idleMood,
    source: "idle",
    groups: buildPlannedMotionGroups(style, idleIntent, idleMood, "idle"),
    priority: 2,
    force: false,
    cooldownMs: 1000,
    allowFallback: false
  });
  if (comboEnabled && Math.random() < (Number(preset.idleComboChance) || 0.3)) {
    steps.push({
      mood: "idle",
      source: "idle",
      groups: buildPlannedMotionGroups(style, "thinking", "idle", "idle"),
      priority: 1,
      force: false,
      cooldownMs: 520,
      delayMs: 220,
      allowFallback: false
    });
  }
  return steps;
}

function isTalkLikeActionStep(step) {
  const source = String(step?.source || "").toLowerCase();
  return source === "talk" || source === "reply";
}

function hasPendingTalkLikeAction() {
  if (!Array.isArray(state.actionQueue) || state.actionQueue.length <= 0) {
    return false;
  }
  return state.actionQueue.some((item) => isTalkLikeActionStep(item));
}

function shouldSkipActionStepForSpeech(step, now = performance.now()) {
  if (!isTalkLikeActionStep(step)) {
    return false;
  }
  const t = Number(now || performance.now());
  const activeUntil = Number(state.speechAnimUntil || 0);
  const speakingWindow = isSpeechMotionActive(t) || t <= activeUntil + 120;
  if (!speakingWindow) {
    return false;
  }
  if (state.motionQuietDuringSpeech) {
    return true;
  }
  const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
  const delayMs = Number(step?.delayMs) || 0;
  if (delayMs > 0) {
    return true;
  }
  return motionBlend > 0.2 && (Number(step?.priority) || 0) <= 2;
}

async function runActionQueue() {
  if (state.actionRunnerBusy) {
    return;
  }
  state.actionRunnerBusy = true;
  try {
    while (state.actionQueue.length > 0) {
      const step = state.actionQueue.shift();
      if (!step || !state.motionEnabled || !state.model) {
        continue;
      }
      if (state.dragData || state.windowDragActive) {
        continue;
      }
      if (shouldSkipActionStepForSpeech(step, performance.now())) {
        continue;
      }
      if (Number(step.delayMs) > 0) {
        await waitMs(step.delayMs);
      }
      if (shouldSkipActionStepForSpeech(step, performance.now())) {
        continue;
      }
      await playEmotion(step.mood || "idle", {
        source: step.source || "emotion",
        groups: step.groups,
        priority: Number.isFinite(Number(step.priority)) ? Number(step.priority) : 2,
        force: !!step.force,
        cooldownMs: Number.isFinite(Number(step.cooldownMs)) ? Number(step.cooldownMs) : state.motionCooldownMs,
        allowFallback: step.allowFallback !== false
      });
    }
  } finally {
    state.actionRunnerBusy = false;
  }
}

function enqueueActionIntent(intent, context = {}) {
  if (!state.motionEnabled || !state.model) {
    return;
  }
  const i = String(intent || "idle");
  const minGap = i === "talk" ? Math.max(420, state.speakingMotionCooldownMs * 0.45) : 680;
  if (shouldThrottleActionIntent(i, minGap)) {
    return;
  }
  const plan = buildActionPlan(i, context);
  if (!Array.isArray(plan) || !plan.length) {
    return;
  }
  const style = normalizeTalkStyle(context.style || state.currentTalkStyle || "neutral");
  if (i === "reply") {
    triggerExpressionPulse(style, 1.2, 640);
  } else if (i === "talk") {
    triggerExpressionPulse(style, 0.95, 460);
  } else if (i === "tap") {
    triggerExpressionPulse(style, 1.0, 420);
  } else if (i === "listen") {
    triggerExpressionPulse(style, 0.58, 320);
  } else if (i === "thinking") {
    triggerExpressionPulse(style, 0.46, 260);
  } else if (i === "idle") {
    triggerExpressionPulse(style, 0.28, 200);
  }
  state.actionQueue.push(...plan);
  runActionQueue();
}

function buildSpeechDeliveryText(text, mood = "idle", style = "neutral", streamMode = false) {
  if (typeof SPEECH_TEXT.buildSpeechDeliveryText === "function") {
    return SPEECH_TEXT.buildSpeechDeliveryText(text, mood, style, streamMode);
  }
  return sanitizeSpeakText(text);
}

function buildStableSpeakText(text) {
  if (typeof SPEECH_TEXT.buildStableSpeakText === "function") {
    return SPEECH_TEXT.buildStableSpeakText(text);
  }
  return sanitizeSpeakText(text);
}

function stopAllAudioPlayback() {
  state.ttsPlaybackGeneration = Number(state.ttsPlaybackGeneration || 0) + 1;
  state.streamSpeakPlayedSession = 0;
  if (
    state.streamSpeakWorking
    && Number(state.streamSpeakWorkingSession || 0)
    && Number(state.streamSpeakWorkingSession || 0) !== Number(state.streamSpeakSession || 0)
  ) {
    state.streamSpeakWorking = false;
    state.streamSpeakWorkingSession = 0;
  }
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      // ignore
    }
  }
  if (state.ttsAudio) {
    try {
      state.ttsAudio.pause();
      state.ttsAudio.currentTime = 0;
    } catch (_) {
      // ignore
    }
  }
  if (state.ttsContextBufferSource) {
    try {
      state.ttsContextBufferSource.onended = null;
      state.ttsContextBufferSource.stop(0);
    } catch (_) {
      // ignore
    }
    try {
      state.ttsContextBufferSource.disconnect();
    } catch (_) {
      // ignore
    }
    state.ttsContextBufferSource = null;
  }
  endSpeechAnimation();
  state.ttsAudioLevel = 0;
  state.ttsAudioRawLevel = 0;
  state.ttsAudioRms = 0;
  state.ttsContextSpeaking = false;
}

function isCurrentTTSPlaybackGeneration(generation) {
  return Number(generation || 0) === Number(state.ttsPlaybackGeneration || 0);
}

function shouldUseStreamSpeak() {
  return (
    state.speakingEnabled &&
    isServerTTSProvider(state.ttsProvider) &&
    state.streamSpeakEnabled
    && state.streamSpeakMode === "realtime"
    && (state.ttsProvider !== "gpt_sovits" || state.gptSovitsRealtimeTTS)
  );
}

function shouldSerializeStreamTTSRequests() {
  return state.ttsProvider === "gpt_sovits";
}

function splitStreamSpeakSegments(buffer, flush = false) {
  if (typeof SPEECH_TEXT.splitStreamSpeakSegments === "function") {
    return SPEECH_TEXT.splitStreamSpeakSegments(buffer, {
      flush,
      style: state.currentTalkStyle || "neutral",
      provider: state.ttsProvider || ""
    });
  }
  return { segments: [], rest: String(buffer || "") };
}

function clampNumber(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function textJitter(text, scale = 0.02) {
  const src = String(text || "");
  if (!src) {
    return 0;
  }
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 131 + src.charCodeAt(i)) % 1000003;
  }
  const normalized = ((hash % 1000) / 999) * 2 - 1;
  return normalized * scale;
}

function buildSpeakProsody(text, mood, streamMode = false, style = "neutral") {
  if (typeof SPEECH_TEXT.buildSpeakProsody === "function") {
    return SPEECH_TEXT.buildSpeakProsody(text, mood, streamMode, style);
  }
  return {
    speed_ratio: 1,
    pitch_ratio: 1,
    volume_ratio: 1,
    rate: "+0%",
    pitch: "+0Hz",
    volume: "+0%"
  };
}

function ensureStreamSpeakBlobPromise(item) {
  if (!item) {
    return null;
  }
  if (item.blobPromise) {
    return item.blobPromise;
  }
  const prosody = shouldSerializeStreamTTSRequests()
    ? null
    : item.prosody || buildSpeakProsody(
      item.text,
      detectMood(item.text),
      true,
      item.style || state.currentTalkStyle || "neutral"
    );
  item.prosody = prosody;
  recordTTSDebugEvent("stream_request_start", {
    traceId: item.traceId,
    sessionId: item.sessionId,
    segmentId: item.segmentId,
    text: item.text
  });
  item.blobPromise = requestServerTTSBlob(item.text, prosody, {
    traceId: item.traceId || state.activePerfTraceId || ""
  }).then((blob) => {
    recordTTSDebugEvent("stream_request_ok", {
      traceId: item.traceId,
      sessionId: item.sessionId,
      segmentId: item.segmentId,
      text: item.text,
      blobBytes: Number(blob?.size || 0)
    });
    return blob;
  }).catch((err) => {
    recordTTSDebugEvent("stream_request_fail", {
      traceId: item.traceId,
      sessionId: item.sessionId,
      segmentId: item.segmentId,
      text: item.text,
      error: String(err?.message || err || "")
    });
    throw err;
  });
  return item.blobPromise;
}

function enqueueStreamSpeakSegment(text, sessionId, prosody = null, style = "neutral") {
  const cleaned = buildSpeechDeliveryText(text, detectMood(text), style, true);
  if (!cleaned) {
    return;
  }
  const item = {
    text: cleaned,
    sessionId,
    prosody,
    style,
    playbackGeneration: Number(state.ttsPlaybackGeneration || 0),
    blobPromise: null,
    segmentId: ++state.perfTtsSeq,
    traceId: state.activePerfTraceId || ""
  };
  state.streamSpeakQueue.push(item);
  state.streamSpeakLastEnqueueSession = sessionId;
  recordTTSDebugEvent("stream_enqueue", {
    traceId: item.traceId,
    sessionId,
    segmentId: item.segmentId,
    text: cleaned
  });
  if (!shouldSerializeStreamTTSRequests()) {
    ensureStreamSpeakBlobPromise(item);
  }
}

function dequeueStreamSpeakItem(sessionId) {
  if (!Array.isArray(state.streamSpeakQueue) || state.streamSpeakQueue.length <= 0) {
    return null;
  }
  for (let i = 0; i < state.streamSpeakQueue.length; i += 1) {
    const item = state.streamSpeakQueue[i];
    if (!item) {
      state.streamSpeakQueue.splice(i, 1);
      i -= 1;
      continue;
    }
    if (item.sessionId !== sessionId) {
      continue;
    }
    state.streamSpeakQueue.splice(i, 1);
    return item;
  }
  return null;
}

function hasQueuedStreamSpeakItem(sessionId) {
  return Array.isArray(state.streamSpeakQueue)
    && state.streamSpeakQueue.some((item) => item && item.sessionId === sessionId);
}

function discardQueuedStreamSpeakItems(sessionId) {
  if (!Array.isArray(state.streamSpeakQueue) || state.streamSpeakQueue.length <= 0) {
    return 0;
  }
  const before = state.streamSpeakQueue.length;
  state.streamSpeakQueue = state.streamSpeakQueue.filter(
    (item) => item && item.sessionId !== sessionId
  );
  return before - state.streamSpeakQueue.length;
}

function ensureStreamSpeakQueueRunning(sessionId, delayMs = 0) {
  const safeSession = Number(sessionId || 0);
  if (!safeSession || safeSession !== state.streamSpeakSession || !shouldUseStreamSpeak()) {
    return;
  }
  const delay = Math.max(0, Math.min(360, Math.round(Number(delayMs) || 0)));
  window.setTimeout(() => {
    if (safeSession !== state.streamSpeakSession || !shouldUseStreamSpeak()) {
      return;
    }
    if (!hasQueuedStreamSpeakItem(safeSession)) {
      return;
    }
    if (
      state.streamSpeakWorking
      && Number(state.streamSpeakWorkingSession || 0) === safeSession
    ) {
      ensureStreamSpeakQueueRunning(safeSession, 80);
      return;
    }
    if (
      state.streamSpeakWorking
      && Number(state.streamSpeakWorkingSession || 0) !== safeSession
    ) {
      recordTTSDebugEvent("stream_run_clear_stale_busy", {
        sessionId: safeSession,
        result: "stale_busy",
        error: String(state.streamSpeakWorkingSession || "")
      });
      state.streamSpeakWorking = false;
      state.streamSpeakWorkingSession = 0;
    }
    runStreamSpeakQueue();
  }, delay);
}

async function waitNextStreamSpeakItem(sessionId, waitMs = 0) {
  let item = dequeueStreamSpeakItem(sessionId);
  if (item || waitMs <= 0) {
    return item;
  }
  const end = Date.now() + Math.max(0, Number(waitMs) || 0);
  while (Date.now() < end) {
    if (sessionId !== state.streamSpeakSession) {
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 18));
    item = dequeueStreamSpeakItem(sessionId);
    if (item) {
      return item;
    }
  }
  return null;
}

async function runStreamSpeakQueue() {
  if (state.streamSpeakWorking) {
    recordTTSDebugEvent("stream_run_skip_busy");
    return;
  }
  const activeSession = state.streamSpeakSession;
  state.streamSpeakWorking = true;
  state.streamSpeakWorkingSession = activeSession;
  recordTTSDebugEvent("stream_run_start", { sessionId: activeSession });
  try {
    if (!state.speakingEnabled || !isServerTTSProvider(state.ttsProvider)) {
      recordTTSDebugEvent("stream_run_disabled", { sessionId: activeSession });
      return;
    }

    const idleWaitMs = Math.max(30, Math.min(220, Number(state.streamSpeakIdleWaitMs) || 90));
    let current = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 60);
    if (!current) {
      recordTTSDebugEvent("stream_run_empty", { sessionId: activeSession });
      return;
    }

    while (current) {
      if (activeSession !== state.streamSpeakSession) {
        recordTTSDebugEvent("stream_session_changed", {
          sessionId: activeSession,
          result: "break"
        });
        break;
      }
      let currentBlob = null;
      try {
        currentBlob = await ensureStreamSpeakBlobPromise(current);
      } catch (err) {
        console.warn("Stream TTS fetch failed:", err);
        // Retry once without prosody to avoid provider-side parsing instability.
        try {
          recordTTSDebugEvent("stream_retry_no_prosody", {
            traceId: current.traceId,
            sessionId: activeSession,
            segmentId: current.segmentId,
            text: current.text,
            error: String(err?.message || err || "")
          });
          currentBlob = await requestServerTTSBlob(current.text, null, {
            traceId: current.traceId || state.activePerfTraceId || ""
          });
        } catch (retryErr) {
          console.warn("Stream TTS retry failed:", retryErr);
          recordTTSDebugEvent("stream_retry_fail", {
            traceId: current.traceId,
            sessionId: activeSession,
            segmentId: current.segmentId,
            text: current.text,
            error: String(retryErr?.message || retryErr || "")
          });
          setStatus("语音片段失败，已跳过");
          current = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 60);
          continue;
        }
      }
      if (!currentBlob) {
        recordTTSDebugEvent("stream_empty_blob", {
          traceId: current.traceId,
          sessionId: activeSession,
          segmentId: current.segmentId,
          text: current.text
        });
        current = await waitNextStreamSpeakItem(activeSession, 20);
        continue;
      }
      if (
        activeSession !== state.streamSpeakSession ||
        !isCurrentTTSPlaybackGeneration(current.playbackGeneration)
      ) {
        recordTTSDebugEvent("stream_stale_skip", {
          traceId: current.traceId,
          sessionId: activeSession,
          segmentId: current.segmentId,
          text: current.text,
          result: "stale"
        });
        break;
      }
      let next = dequeueStreamSpeakItem(activeSession);
      if (!next) {
        next = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 80);
      }
      if (next) {
        ensureStreamSpeakBlobPromise(next);
      }

      await playAudioBlob(currentBlob, {
        interrupt: false,
        text: current.text,
        mood: detectMood(current.text),
        style: current.style || state.currentTalkStyle || "neutral",
        perfTraceId: current.traceId || state.activePerfTraceId || "",
        segmentId: current.segmentId,
        sessionId: activeSession,
        playbackGeneration: current.playbackGeneration
      });
      current = next || await waitNextStreamSpeakItem(
        activeSession,
        state.chatBusy ? idleWaitMs : 180
      );
    }
    state.ttsServerAvailable = true;
  } catch (err) {
    console.warn("Stream speak queue failed:", err);
    recordTTSDebugEvent("stream_run_fail", {
      sessionId: activeSession,
      error: String(err?.message || err || "")
    });
  } finally {
    if (Number(state.streamSpeakWorkingSession || 0) === Number(activeSession || 0)) {
      state.streamSpeakWorking = false;
      state.streamSpeakWorkingSession = 0;
    }
    recordTTSDebugEvent("stream_run_done", { sessionId: activeSession });
    if (
      activeSession === state.streamSpeakSession
      && shouldUseStreamSpeak()
      && hasQueuedStreamSpeakItem(activeSession)
    ) {
      recordTTSDebugEvent("stream_run_restart", { sessionId: activeSession });
      window.setTimeout(() => runStreamSpeakQueue(), 0);
    } else if (
      activeSession !== state.streamSpeakSession
      && shouldUseStreamSpeak()
      && hasQueuedStreamSpeakItem(state.streamSpeakSession)
    ) {
      recordTTSDebugEvent("stream_run_handoff", { sessionId: state.streamSpeakSession });
      ensureStreamSpeakQueueRunning(state.streamSpeakSession, 0);
    }
  }
}

function feedStreamSpeakDelta(delta, sessionId, style = "neutral") {
  if (!shouldUseStreamSpeak()) {
    return;
  }
  if (sessionId !== state.streamSpeakSession) {
    return;
  }
  state.streamSpeakBuffer += String(delta || "");
  const parsed = splitStreamSpeakSegments(state.streamSpeakBuffer, false);
  state.streamSpeakBuffer = parsed.rest;
  for (const seg of parsed.segments) {
    const mood = detectMood(seg);
    const prosody = buildSpeakProsody(seg, mood, true, style);
    enqueueStreamSpeakSegment(seg, sessionId, prosody, style);
    maybePlayTalkGesture(seg, style);
  }
  if (parsed.segments.length) {
    ensureStreamSpeakQueueRunning(sessionId, 0);
  }
}

function flushStreamSpeak(sessionId, style = "neutral") {
  if (sessionId !== state.streamSpeakSession) {
    return;
  }
  const parsed = splitStreamSpeakSegments(state.streamSpeakBuffer, true);
  state.streamSpeakBuffer = "";
  for (const seg of parsed.segments) {
    const mood = detectMood(seg);
    const prosody = buildSpeakProsody(seg, mood, false, style);
    enqueueStreamSpeakSegment(seg, sessionId, prosody, style);
    maybePlayTalkGesture(seg, style);
  }
  if (parsed.segments.length) {
    ensureStreamSpeakQueueRunning(sessionId, 0);
  }
}

function scheduleFinalSpeechWatchdog({
  sessionId,
  text,
  mood = "idle",
  style = "neutral",
  traceId = ""
} = {}) {
  const safeSession = Number(sessionId || 0);
  const safeText = buildStableSpeakText(text) || sanitizeSpeakText(text);
  if (!safeSession || !safeText || !shouldUseStreamSpeak()) {
    return;
  }
  const generation = Number(state.ttsPlaybackGeneration || 0);
  const startedAt = Number(state.ttsDebugAudioStartedAt || 0);
  window.setTimeout(async () => {
    if (
      safeSession !== state.streamSpeakSession
      || !isCurrentTTSPlaybackGeneration(generation)
      || state.streamSpeakPlayedSession === safeSession
    ) {
      return;
    }
    if (hasQueuedStreamSpeakItem(safeSession) || state.streamSpeakWorking) {
      ensureStreamSpeakQueueRunning(safeSession, 0);
      window.setTimeout(async () => {
        if (
          safeSession !== state.streamSpeakSession
          || !isCurrentTTSPlaybackGeneration(generation)
          || state.streamSpeakPlayedSession === safeSession
        ) {
          return;
        }
        recordTTSDebugEvent("final_watchdog_tts", {
          traceId,
          sessionId: safeSession,
          text: safeText,
          result: "fallback_after_queue_wait"
        });
        const prosody = buildSpeakProsody(safeText, mood, false, style);
        await speak(safeText, { prosody, interrupt: true, mood, style, perfTraceId: traceId, playbackGeneration: generation });
      }, 2200);
      return;
    }
    if (Number(state.ttsDebugAudioStartedAt || 0) > startedAt) {
      return;
    }
    recordTTSDebugEvent("final_watchdog_tts", {
      traceId,
      sessionId: safeSession,
      text: safeText,
      result: "fallback"
    });
    const prosody = buildSpeakProsody(safeText, mood, false, style);
    await speak(safeText, { prosody, interrupt: true, mood, style, perfTraceId: traceId, playbackGeneration: generation });
  }, 2600);
}

function initServerTTSVoices() {
  const cfg = state.config?.tts || {};
  const isVolcengine = state.ttsProvider === "volcengine_tts" || state.ttsProvider === "volcengine";
  const isGptSovits = state.ttsProvider === "gpt_sovits";
  const list = Array.isArray(cfg.voices) ? cfg.voices.filter(Boolean) : [];
  const fallback = (isVolcengine || isGptSovits)
    ? [cfg.voice]
    : [
      cfg.voice,
      "zh-CN-XiaoxiaoNeural",
      "zh-CN-XiaoyiNeural",
      "zh-CN-YunxiNeural",
      "zh-CN-YunjianNeural",
    ].filter(Boolean);
  const merged = [...list, ...fallback];
  const deduped = [...new Set(merged)];
  state.ttsServerVoices = deduped;
  const initVoice = cfg.voice || deduped[0] || null;
  const idx = deduped.findIndex((v) => v === initVoice);
  state.ttsServerVoiceIndex = idx >= 0 ? idx : 0;
  state.ttsServerVoice = deduped[state.ttsServerVoiceIndex] || null;
}

function scoreVoice(v) {
  const name = String(v?.name || "").toLowerCase();
  const lang = String(v?.lang || "").toLowerCase();
  let score = 0;
  if (lang === "zh-cn") score += 500;
  else if (lang.startsWith("zh")) score += 300;
  if (/natural|neural|online|xiaoxiao|xiaoyi|yunxi|yunyang|huihui/.test(name)) {
    score += 220;
  }
  if (/yaoyao/.test(name)) score += 90;
  if (/kangkang/.test(name)) score += 30;
  if (/huihui/.test(name)) score -= 20;
  if (/microsoft|edge|google/.test(name)) {
    score += 60;
  }
  if (/english|en-us|en-gb/.test(name + " " + lang)) {
    score -= 200;
  }
  return score;
}

function getSortedVoices() {
  if (!("speechSynthesis" in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) {
    return [];
  }
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

function chooseTTSVoice() {
  const sorted = getSortedVoices();
  return sorted.length ? sorted[0] : null;
}

function setActiveVoice(index) {
  if (!state.ttsVoices.length) {
    state.ttsVoice = null;
    state.ttsVoiceIndex = -1;
    return;
  }
  const safe = ((index % state.ttsVoices.length) + state.ttsVoices.length) % state.ttsVoices.length;
  state.ttsVoiceIndex = safe;
  state.ttsVoice = state.ttsVoices[safe];
}

function buildVoiceCandidates() {
  const chosen = state.ttsVoice || chooseTTSVoice();
  const fallbackZh = state.ttsVoices.find((v) => /^zh/i.test(String(v.lang || "")));
  const candidates = [];
  if (chosen) candidates.push(chosen);
  if (fallbackZh && (!chosen || fallbackZh.name !== chosen.name)) {
    candidates.push(fallbackZh);
  }
  // null means use browser default voice
  candidates.push(null);
  return candidates;
}

function speakOnceWithVoice(text, voice, opts = {}) {
  return new Promise((resolve) => {
    const force = typeof opts === "object" ? !!opts.force : !!opts;
    const playbackGeneration = Number(
      (typeof opts === "object" ? opts.playbackGeneration : 0) || state.ttsPlaybackGeneration || 0
    );
    if (!("speechSynthesis" in window)) {
      resolve(false);
      return;
    }
    if (!force && !state.speakingEnabled) {
      resolve(false);
      return;
    }
    const cleaned = String(text || "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleaned);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "zh-CN";
    } else {
      utterance.lang = "zh-CN";
    }
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    let started = false;
    let settled = false;
    utterance.onstart = () => {
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {
          // ignore
        }
        return;
      }
      started = true;
      beginSpeechAnimation(cleaned, detectMood(cleaned), state.currentTalkStyle || "neutral");
      showSubtitleText(cleaned);
      setStatus("语音中...");
    };
    utterance.onend = () => {
      if (settled) return;
      settled = true;
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        resolve(false);
        return;
      }
      if (voice?.name) {
        state.ttsLastGoodVoiceName = voice.name;
      }
      finishSpeechAnimation();
      hideSubtitleText();
      setStatus("待机");
      resolve(true);
    };
    utterance.onerror = () => {
      if (settled) return;
      settled = true;
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        resolve(false);
        return;
      }
      endSpeechAnimation();
      hideSubtitleText();
      setStatus("语音失败");
      resolve(false);
    };

    try {
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        resolve(false);
        return;
      }
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      // Guard against engines that fail silently (no onstart fired).
      setTimeout(() => {
        if (settled) return;
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          settled = true;
          resolve(false);
          return;
        }
        if (!started) {
          settled = true;
          endSpeechAnimation();
          try {
            window.speechSynthesis.cancel();
          } catch (_) {
            // ignore
          }
          resolve(false);
        }
      }, 1800);
    } catch (_) {
      resolve(false);
    }
  });
}

function initTTS() {
  if (!("speechSynthesis" in window)) {
    state.ttsReady = false;
    ui.speakBtn.disabled = true;
    ui.speakBtn.textContent = "语音不可用";
    return;
  }

  const refresh = () => {
    const prevName = state.ttsVoice?.name || "";
    state.ttsVoices = getSortedVoices();
    let idx = state.ttsVoices.findIndex((v) => v.name === prevName);
    if (idx < 0) idx = 0;
    setActiveVoice(idx);
    state.ttsReady = true;
    if (ui.voiceNextBtn) {
      ui.voiceNextBtn.disabled = state.ttsVoices.length <= 1;
    }
    if (state.speakingEnabled) {
      ui.speakBtn.textContent = "语音开";
    } else {
      ui.speakBtn.textContent = "语音关";
    }
  };

  refresh();
  window.speechSynthesis.onvoiceschanged = refresh;

  // Warm up TTS engine so first sentence is less likely to be dropped.
  const warmup = () => {
    try {
      const u = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(u);
      window.speechSynthesis.cancel();
    } catch (_) {
      // Ignore warmup failure.
    }
    document.removeEventListener("pointerdown", warmup);
    document.removeEventListener("keydown", warmup);
  };
  document.addEventListener("pointerdown", warmup, { once: true });
  document.addEventListener("keydown", warmup, { once: true });
}

function loadScript(src, isReady) {
  return new Promise((resolve, reject) => {
    if (typeof isReady === "function" && isReady()) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src.includes("?") ? src : `${src}?v=${RUNTIME_VERSION}`;
    script.async = false;
    script.onload = () => {
      if (typeof isReady === "function" && !isReady()) {
        reject(new Error(`Loaded but missing runtime object: ${src}`));
        return;
      }
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function ensureLive2DRuntime() {
  await loadScript(
    "/vendor/pixi.min.js",
    () => typeof window.PIXI !== "undefined"
  );

  await loadScript(
    "/vendor/live2dcubismcore.min.js",
    () =>
      typeof window.Live2DCubismCore !== "undefined" &&
      !!window.Live2DCubismCore.Version
  );

  // Fallback to official direct link if local core script gets corrupted/cached badly.
  if (
    typeof window.Live2DCubismCore === "undefined" ||
    !window.Live2DCubismCore.Version
  ) {
    await loadScript(
      "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
      () =>
        typeof window.Live2DCubismCore !== "undefined" &&
        !!window.Live2DCubismCore.Version
    );
  }

  await loadScript(
    "/vendor/cubism4.min.js",
    () =>
      !!window.PIXI &&
      !!window.PIXI.live2d &&
      !!window.PIXI.live2d.Live2DModel
  );
}

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
    proactiveEnabled: conversationCfg.proactive_enabled === true,
    proactiveSchedulerEnabled: conversationCfg.proactive_scheduler_enabled === true,
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
    interruptTtsOnUserSpeech: conversationCfg.interrupt_tts_on_user_speech === true
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
      Number(autoChatTuningCfg.trigger_base_threshold ?? 1.03),
      0.4,
      3.0
    ),
    shortSilencePenalty: clampNumber(
      Number(autoChatTuningCfg.short_silence_penalty ?? 0.35),
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
  state.autoChatMinMs = Math.max(60000, Number(observeCfg.auto_chat_min_ms || 180000));
  state.autoChatMaxMs = Math.max(state.autoChatMinMs + 30000, Number(observeCfg.auto_chat_max_ms || 480000));
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
  state.motionQuietDuringSpeech = motionCfg.quiet_speech !== false;
  state.motionIntensity = normalizeMotionIntensity(
    motionCfg.intensity || motionCfg.action_intensity || "normal"
  );
  state.speechMotionStrength = clampNumber(
    Number(motionCfg.speech_motion_strength ?? motionCfg.speech_body_motion_strength ?? 1.35),
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
    clampNumber(Number(motionCfg.speaking_cooldown_ms || 1600), 500, 8000)
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

async function initLive2D() {
  const canvas = document.getElementById("live2d-canvas");
  const rawModelPath = String(state.config?.model_path || "").trim();
  const normalizedModelPath = rawModelPath.replace(/\\/g, "/").toLowerCase();
  const live2dPathMissing = !rawModelPath || normalizedModelPath.includes("your_model");

  const showLive2DSetupGuide = (statusText, guideText) => {
    setStatus(statusText);
    if (state.live2dGuideShown) {
      return;
    }
    state.live2dGuideShown = true;
    appendMessage("assistant", guideText);
  };

  if (live2dPathMissing) {
    showLive2DSetupGuide(
      "未配置 Live2D 模型",
      "还没有检测到可用的 Live2D 模型。你可以先直接聊天体验；随后把模型放到 web/models 目录，并在 config.json 设置 model_path（示例：/models/hiyori/hiyori.model3.json）。"
    );
    return;
  }

  if (!window.Live2DCubismCore) {
    setStatus("CubismCore 缺失");
    appendMessage("assistant", "Cubism 核心未加载，请强制刷新（Ctrl+F5）。");
    return;
  }
  if (!window.PIXI || !PIXI.live2d || !PIXI.live2d.Live2DModel) {
    setStatus("Live2D 运行时缺失");
    appendMessage("assistant", "Live2D 运行时未加载，请强制刷新（Ctrl+F5）。");
    return;
  }
  state.pixiApp = new PIXI.Application({
    view: canvas,
    autoStart: true,
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true
  });

  const { Live2DModel } = PIXI.live2d;
  try {
    const model = await Live2DModel.from(state.config.model_path);
    state.model = model;
    window.__petModel = model;
    setModelMotionDefinitions(model);
    state.pixiApp.stage.addChild(model);
    placeModel();
    attachDrag(model);
    setupClickthroughHitTest();
    scheduleIdleMotionLoop();
    (function patchCoreModelUpdate(m) {
      const coreModel = m.internalModel && m.internalModel.coreModel;
      if (!coreModel || typeof coreModel.update !== "function") {
        return;
      }
      const _orig = coreModel.update.bind(coreModel);
      coreModel.update = function () {
        if (state.model === m && !state.dragData && !state.windowDragActive) {
          applyStyleExpressionLayer();
          updateMicroMotionLayer();
        }
        return _orig();
      };
    }(model));

    state.pixiApp.ticker.add(() => {
      if (!state.model) {
        return;
      }
      if (!state.animating && !state.windowDragActive && !state.browserDragActive) {
        const t = performance.now() / 1000;
        const styleProfile = getStyleExpressionProfile(state.currentTalkStyle || "neutral");
        const cadence = getActiveModelCadence();
        const floatScale = clampNumber(
          (Number(styleProfile.floatScale) || 1) * (Number(cadence?.floatAmp) || 1),
          0.68,
          1.36
        );
        const floatSpeed = Math.max(0.72, Math.min(1.4, Number(cadence?.floatSpeed) || 1));
        const floatY = state.baseTransform.y + Math.sin(t * 1.5 * floatSpeed) * (4 * floatScale);
        const floatRot = state.baseTransform.rotation + Math.sin(t * 1.2 * floatSpeed) * (0.02 * floatScale);
        state.model.rotation = Number.isFinite(floatRot) ? floatRot : 0;
        state.model.y = Number.isFinite(floatY) ? floatY : state.baseTransform.y;
      }
    });

    const i = model.internalModel || {};
    const info = `模型已就绪（${Math.round(model.width)}x${Math.round(model.height)}，动作组 ${state.availableMotionGroups.length}）`;
    console.log("[pet] model metrics", {
      width: model.width,
      height: model.height,
      internalWidth: i.width,
      internalHeight: i.height,
      originalWidth: i.originalWidth,
      originalHeight: i.originalHeight,
      x: model.x,
      y: model.y,
      scaleX: model.scale?.x,
      scaleY: model.scale?.y
    });
    // --- Tight-fit: resize Electron window to match model bounds ---
    if (
      state.desktopMode &&
      state.uiView === "model" &&
      state.desktopBridge === "electron" &&
      state._stableModelBounds
    ) {
      const bounds = state._stableModelBounds;
      const bw = Math.round(bounds.right - bounds.left);
      const bh = Math.round(bounds.bottom - bounds.top);
      // Add padding so the model isn't clipped at edges.
      const pad = 40;
      const fitW = Math.max(200, bw + pad * 2);
      const fitH = Math.max(300, bh + pad);
      const canvas = state.pixiApp.view;
      const rect = canvas.getBoundingClientRect();
      // Only resize if current window is significantly larger than needed.
      if (rect.width > fitW * 1.15 || rect.height > fitH * 1.15) {
        if (typeof window.electronAPI?.resizeWindow === "function") {
          window.electronAPI.resizeWindow(fitW, fitH);
          // Re-place model after resize settles.
          setTimeout(() => { placeModel(); }, 80);
        }
      }
    }
    setStatus(info);
  } catch (err) {
    console.error(err);
    stopIdleMotionLoop();
    const detail = String(err?.message || err || "").trim();
    const missingFile = /not\s*found|failed\s*to\s*fetch|404|enoent/i.test(detail);
    if (missingFile) {
      showLive2DSetupGuide(
        "未找到 Live2D 模型",
        `未找到 Live2D 模型文件：${rawModelPath || "(空)"}。请确认模型文件已放在 web/models 下，并把 config.json 的 model_path 指向 .model3.json 文件。`
      );
      return;
    }
    showLive2DSetupGuide(
      "模型加载失败，请检查 model_path",
      "Live2D 初始化失败。你可以先继续使用聊天功能，再检查 model_path 是否指向可访问的 .model3.json 文件。"
    );
    return;
  }

  window.addEventListener("resize", handleWindowResize);
}

function placeModel() {
  if (!state.model || !state.pixiApp) {
    return;
  }
  const model = state.model;
  const w = state.pixiApp.renderer.width;
  const h = state.pixiApp.renderer.height;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 120 || h < 120) {
    return;
  }
  const sx = Math.max(0.0001, Number(model.scale?.x) || 1);
  const sy = Math.max(0.0001, Number(model.scale?.y) || 1);
  const internal = model.internalModel || {};
  const baseHeightCandidates = [
    Number(internal.originalHeight),
    Number(internal.height),
    Number(model.height) / sy,
    Number(model.height)
  ];
  const baseWidthCandidates = [
    Number(internal.originalWidth),
    Number(internal.width),
    Number(model.width) / sx,
    Number(model.width)
  ];
  const baseHeight = baseHeightCandidates.find((n) => Number.isFinite(n) && n > 1) || null;
  const baseWidth = baseWidthCandidates.find((n) => Number.isFinite(n) && n > 1) || null;

  // Fallback to a conservative scale when runtime reports odd initial size.
  let scale = 0.28;
  if (baseHeight) {
    const targetHeight = h * 0.76;
    scale = Math.max(0.08, Math.min(1.4, targetHeight / baseHeight));
  } else if (baseWidth) {
    const targetWidth = w * 0.34;
    scale = Math.max(0.08, Math.min(1.4, targetWidth / baseWidth));
  }
  scale *= state.modelConfig?.scale || 1;
  scale = Math.max(0.05, Math.min(4.0, scale));

  model.scale.set(scale);
  if (state.desktopMode && state.uiView === "model") {
    if (!Number.isFinite(state.modelPosX) || !Number.isFinite(state.modelPosY)) {
      state.modelPosX = w * 0.5;
      state.modelPosY = h * 0.9;
    }
    model.x = state.modelPosX;
    model.y = state.modelPosY;
  } else {
    model.x = w * (state.modelConfig?.x_ratio ?? 0.26);
    model.y = h * (state.modelConfig?.y_ratio ?? 0.96);
  }
  if (model.anchor && typeof model.anchor.set === "function") {
    model.anchor.set(0.5, 1.0);
  }
  model.visible = true;
  model.alpha = 1;
  if (state.desktopMode && state.uiView === "model") {
    clampModelVisibleInViewport(model);
    state.modelPosX = Number(model.x) || (w * 0.5);
    state.modelPosY = Number(model.y) || (h * 0.9);
  }
  state.layoutWidth = w;
  state.layoutHeight = h;
  state.baseTransform = {
    x: model.x,
    y: model.y,
    scale: scale,
    rotation: 0
  };
}

function clampModelVisibleInViewport(model) {
  if (!model || !state.pixiApp) {
    return;
  }
  const rw = Number(state.pixiApp.renderer?.width) || 0;
  const rh = Number(state.pixiApp.renderer?.height) || 0;
  if (rw < 120 || rh < 120) {
    return;
  }
  const mw = Math.max(80, Number(model.width) || rw * 0.32);
  const mh = Math.max(120, Number(model.height) || rh * 0.6);
  const marginX = Math.max(20, Math.min(rw * 0.18, mw * 0.24));
  const minX = marginX;
  const maxX = rw - marginX;
  const minY = Math.max(70, Math.min(rh * 0.6, mh * 0.28));
  const maxY = rh - 4;
  model.x = clampNumber(Number(model.x) || 0, minX, maxX);
  model.y = clampNumber(Number(model.y) || 0, minY, maxY);
  if (!model.visible) {
    model.visible = true;
  }
  if (!Number.isFinite(Number(model.alpha)) || model.alpha < 0.98) {
    model.alpha = 1;
  }
}

function handleWindowResize() {
  if (!state.model || !state.pixiApp) {
    return;
  }
  if (state.resizeRaf) {
    cancelAnimationFrame(state.resizeRaf);
  }
  state.resizeRaf = requestAnimationFrame(() => {
    state.resizeRaf = 0;
    const now = performance.now();
    if (state.windowDragActive || now < state.suspendRelayoutUntil) {
      return;
    }
    const rw = Number(state.pixiApp.renderer?.width) || 0;
    const rh = Number(state.pixiApp.renderer?.height) || 0;
    if (!rw || !rh) {
      return;
    }
    const dw = Math.abs(rw - state.layoutWidth);
    const dh = Math.abs(rh - state.layoutHeight);
    if (dw < 2 && dh < 2) {
      return;
    }
    placeModel();
  });
}

function attachDrag(model) {
  if (state.useNativeWindowDrag) {
    // In model-only Electron window, rely on native drag region for stability.
    model.interactive = false;
    model.cursor = "default";
    return;
  }
  model.interactive = true;
  model.cursor = "grab";

  const maybeTriggerTapAction = () => {
    const downAt = Number(state.lastPointerDownAt) || 0;
    if (!downAt) {
      return;
    }
    const elapsed = performance.now() - downAt;
    const shouldTap = !state.pointerDragMoved && elapsed <= TAP_MAX_DURATION_MS;
    state.lastPointerDownAt = 0;
    state.pointerDragMoved = false;
    if (shouldTap) {
      triggerTapMotion();
    }
  };

  model.on("pointerdown", (e) => {
    if (state.desktopMode && state.desktopBridge === "electron") {
      const ev = e?.data?.originalEvent || null;
      const cx = Number(ev?.clientX);
      const cy = Number(ev?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        return;
      }
      if (!isPointOverVisibleModelArea(cx, cy)) {
        return;
      }
    }
    const g = e.data?.global || { x: 0, y: 0 };
    state.lastPointerDownAt = performance.now();
    state.lastPointerDownGlobal = { x: Number(g.x) || 0, y: Number(g.y) || 0 };
    state.pointerDragMoved = false;
    state.windowDragActive = false;
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
    state.dragData = {
      data: e.data,
      lastGlobal: { x: g.x, y: g.y }
    };
    if (state.desktopMode) {
      document.body.classList.add("dragging-window");
      document.documentElement.classList.add("dragging-window");
      if (state.model) {
        state.model.visible = true;
        state.model.alpha = 1;
      }
    }
    // Fullscreen overlay: no window drag session needed.
    model.cursor = "grabbing";
    if (state.desktopMode && state.desktopBridge === "electron") {
      const start = state.dragData?.lastGlobal || { x: Number(g.x) || 0, y: Number(g.y) || 0 };
      const grabOffsetX = (Number(state.modelPosX) || Number(state.model?.x) || 0) - Number(start.x || 0);
      const grabOffsetY = (Number(state.modelPosY) || Number(state.model?.y) || 0) - Number(start.y || 0);
      const onDocMove = (ev) => {
        if (!state.dragData || !state.model) {
          document.removeEventListener("pointermove", onDocMove);
          return;
        }
        const canvas = state.pixiApp?.view;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const renderer = state.pixiApp.renderer;
        const rw = Number(renderer?.width) || rect.width;
        const rh = Number(renderer?.height) || rect.height;
        const gx = (ev.clientX - rect.left) * (rw / rect.width);
        const gy = (ev.clientY - rect.top) * (rh / rect.height);
        if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
          return;
        }
        state.dragData.lastGlobal = { x: gx, y: gy };
        const dxTap = Number(gx) - Number(state.lastPointerDownGlobal?.x || 0);
        const dyTap = Number(gy) - Number(state.lastPointerDownGlobal?.y || 0);
        if ((dxTap * dxTap + dyTap * dyTap) > (TAP_MOVE_THRESHOLD * TAP_MOVE_THRESHOLD)) {
          state.pointerDragMoved = true;
        }
        const nextX = gx + grabOffsetX;
        const nextY = gy + grabOffsetY;
        if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
          return;
        }
        state.modelPosX = nextX;
        state.modelPosY = nextY;
        state.model.x = state.modelPosX;
        state.model.y = state.modelPosY;
        state.baseTransform.x = state.modelPosX;
        state.baseTransform.y = state.modelPosY;
        state.suspendRelayoutUntil = performance.now() + 240;
      };
      document.addEventListener("pointermove", onDocMove);
      const cleanup = () => {
        document.removeEventListener("pointermove", onDocMove);
        document.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointerup", cleanup);
      };
      document.addEventListener("pointerup", cleanup);
      window.addEventListener("pointerup", cleanup);
    } else if (!state.desktopMode) {
      // 浏览器模式：document 级监听，保证鼠标移出模型区域后拖动不中断
      state.browserDragActive = true;
      const canvas = state.pixiApp?.view;
      const scaleX = canvas
        ? (Number(state.pixiApp?.renderer?.width) || canvas.offsetWidth) /
          (canvas.getBoundingClientRect().width || 1)
        : 1;
      const scaleY = canvas
        ? (Number(state.pixiApp?.renderer?.height) || canvas.offsetHeight) /
          (canvas.getBoundingClientRect().height || 1)
        : 1;
      const grabOffsetX = (Number(state.model?.x) || 0) - (Number(g.x) || 0);
      const grabOffsetY = (Number(state.model?.y) || 0) - (Number(g.y) || 0);

      const onDocMoveBrowser = (ev) => {
        if (!state.browserDragActive || !state.model || !state.dragData) return;
        const c = state.pixiApp?.view;
        if (!c) return;
        const rect = c.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const rw = Number(state.pixiApp.renderer?.width) || rect.width;
        const rh = Number(state.pixiApp.renderer?.height) || rect.height;
        const px = (ev.clientX - rect.left) * (rw / rect.width) + grabOffsetX;
        const py = (ev.clientY - rect.top) * (rh / rect.height) + grabOffsetY;
        const dxTap = (ev.clientX - rect.left) * (rw / rect.width) -
                      Number(state.lastPointerDownGlobal?.x || 0);
        const dyTap = (ev.clientY - rect.top) * (rh / rect.height) -
                      Number(state.lastPointerDownGlobal?.y || 0);
        if ((dxTap * dxTap + dyTap * dyTap) > (TAP_MOVE_THRESHOLD * TAP_MOVE_THRESHOLD)) {
          state.pointerDragMoved = true;
        }
        state.model.x = px;
        state.model.y = py;
        state.baseTransform.x = px;
        state.baseTransform.y = py;
      };

      const cleanupBrowser = () => {
        state.browserDragActive = false;
        document.removeEventListener("pointermove", onDocMoveBrowser);
        document.removeEventListener("pointerup", cleanupBrowser);
        window.removeEventListener("pointerup", cleanupBrowser);
        maybeTriggerTapAction();
        model.cursor = "grab";
      };

      document.addEventListener("pointermove", onDocMoveBrowser);
      document.addEventListener("pointerup", cleanupBrowser);
      window.addEventListener("pointerup", cleanupBrowser);
    }
  });
  model.on("pointerup", () => {
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    maybeTriggerTapAction();
    model.cursor = "grab";
  });
  model.on("pointerupoutside", () => {
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    model.cursor = "grab";
  });
  model.on("pointercancel", () => {
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    state.lastPointerDownAt = 0;
    state.pointerDragMoved = false;
    model.cursor = "grab";
  });

  const releaseDrag = () => {
    if (state.browserDragActive) return;
    if (!state.dragData) {
      return;
    }
    if (
      state.windowDragActive
      && state.desktopCanMoveWindow
      && state.desktopBridge !== "electron"
    ) {
      finalizeDesktopDrag();
    }
    state.dragData = null;
    stopDesktopWindowDrag();
    state.lastPointerDownAt = 0;
    state.pointerDragMoved = false;
    model.cursor = "grab";
  };
  window.addEventListener("mouseup", releaseDrag);
  window.addEventListener("blur", releaseDrag);

  model.on("pointermove", (e) => {
    if (!state.dragData) {
      return;
    }

    const globalNow = e.data?.global || state.dragData?.data?.global;
    if (globalNow) {
      const dxTap = Number(globalNow.x) - Number(state.lastPointerDownGlobal?.x || 0);
      const dyTap = Number(globalNow.y) - Number(state.lastPointerDownGlobal?.y || 0);
      if ((dxTap * dxTap + dyTap * dyTap) > (TAP_MOVE_THRESHOLD * TAP_MOVE_THRESHOLD)) {
        state.pointerDragMoved = true;
      }
    }

    if (state.desktopMode && state.desktopBridge === "electron") {
      // Electron desktop mode uses document-level pointermove for stable drag tracking.
      return;
    }

    const pos = state.dragData.data.getLocalPosition(state.pixiApp.stage);
    const px = Number(pos?.x);
    const py = Number(pos?.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      return;
    }
    model.x = px;
    model.y = py;
    if (state.desktopMode) {
      state.modelPosX = px;
      state.modelPosY = py;
      clampModelVisibleInViewport(model);
      state.modelPosX = Number(model.x) || state.modelPosX;
      state.modelPosY = Number(model.y) || state.modelPosY;
      state.suspendRelayoutUntil = performance.now() + 180;
    }
    state.baseTransform.x = model.x;
    state.baseTransform.y = model.y;
  });

  const canvas = state.pixiApp?.view;
  if (canvas) {
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!state.model) return;
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const currentScale = Number(state.model.scale?.x) || 1;
      const newScale = Math.max(0.05, Math.min(4.0, currentScale * factor));
      state.model.scale.set(newScale);
      state.baseTransform.scale = newScale;
      const baseAuto = newScale / Math.max(0.001, Number(state.modelConfig?.scale) || 1);
      if (Number.isFinite(baseAuto) && baseAuto > 0) {
        state.modelConfig.scale = newScale / baseAuto;
      }
    }, { passive: false });
  }
}

function getModelInteractiveBounds() {
  if (!state.model || !state.pixiApp) return null;
  let bounds = state._stableModelBounds;
  if (!bounds) {
    const mw = Number(state.model.width) || 0;
    const mh = Number(state.model.height) || 0;
    if (mw <= 0 || mh <= 0) return null;
    bounds = {
      left: Number(state.model.x) - mw * 0.5,
      right: Number(state.model.x) + mw * 0.5,
      top: Number(state.model.y) - mh,
      bottom: Number(state.model.y)
    };
  }
  const left = Number(bounds.left);
  const right = Number(bounds.right);
  const top = Number(bounds.top);
  const bottom = Number(bounds.bottom);
  if (
    !Number.isFinite(left) || !Number.isFinite(right) ||
    !Number.isFinite(top) || !Number.isFinite(bottom)
  ) {
    return null;
  }
  const width = right - left;
  const height = bottom - top;
  if (width < 20 || height < 20) {
    return null;
  }
  // Keep a conservative center zone for drag/click-through hit test.
  // Horizontal stays narrow; vertical is widened to include head/body/legs.
  const insetX = clampNumber(width * 0.30, 20, 180);
  const insetTop = clampNumber(height * 0.10, 8, 72);
  const insetBottom = clampNumber(height * 0.08, 6, 64);
  const hitLeft = left + insetX;
  const hitRight = right - insetX;
  const hitTop = top + insetTop;
  const hitBottom = bottom - insetBottom;
  if (hitRight - hitLeft < 20 || hitBottom - hitTop < 20) {
    return null;
  }
  return {
    left: hitLeft,
    right: hitRight,
    top: hitTop,
    bottom: hitBottom
  };
}

function isPointInModelDragHotzone(x, y, bounds) {
  if (!bounds) return false;
  const left = Number(bounds.left);
  const right = Number(bounds.right);
  const top = Number(bounds.top);
  const bottom = Number(bounds.bottom);
  if (
    !Number.isFinite(left) || !Number.isFinite(right) ||
    !Number.isFinite(top) || !Number.isFinite(bottom) ||
    !Number.isFinite(x) || !Number.isFinite(y)
  ) {
    return false;
  }
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) {
    return false;
  }
  const centerX = (left + right) * 0.5;
  const yRatio = clampNumber((y - top) / height, 0, 1);
  let halfWidthRatio = 0.22;
  if (yRatio < 0.22) {
    // Head: narrower center band to preserve lateral click-through.
    halfWidthRatio = 0.20 + (yRatio / 0.22) * 0.03;
  } else if (yRatio < 0.64) {
    // Torso: widest draggable region.
    halfWidthRatio = 0.23 + ((yRatio - 0.22) / 0.42) * 0.13;
  } else {
    // Legs: taper back to a narrow center strip.
    halfWidthRatio = 0.24 - ((yRatio - 0.64) / 0.36) * 0.05;
  }
  const halfWidth = clampNumber(width * halfWidthRatio, 10, width * 0.48);
  return Math.abs(x - centerX) <= halfWidth;
}

function isPointOverVisibleModelArea(clientX, clientY) {
  if (!state.model || !state.pixiApp) return false;
  const bounds = getModelInteractiveBounds();
  if (!bounds) return false;
  const canvas = state.pixiApp.view;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const renderer = state.pixiApp.renderer;
  const rw = Number(renderer?.width) || 0;
  const rh = Number(renderer?.height) || 0;
  if (rw <= 0 || rh <= 0) return false;
  const x = (clientX - rect.left) * (rw / rect.width);
  const y = (clientY - rect.top) * (rh / rect.height);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const pad = 2;
  const inStrictBounds = (
    x >= bounds.left - pad &&
    x <= bounds.right + pad &&
    y >= bounds.top - pad &&
    y <= bounds.bottom + pad
  );
  if (!inStrictBounds) return false;
  if (!isPointInModelDragHotzone(x, y, bounds)) return false;
  // Prefer runtime hit areas when available, but do not hard-reject when
  // hit areas miss while still inside strict conservative bounds.
  try {
    const hitFn = state.model && typeof state.model.hitTest === "function"
      ? state.model.hitTest.bind(state.model)
      : null;
    if (!hitFn) {
      return true;
    }
    const hit = hitFn(x, y);
    if (Array.isArray(hit)) {
      if (hit.length > 0) {
        return true;
      }
      return true;
    }
    if (typeof hit === "boolean") {
      if (hit) {
        return true;
      }
      return true;
    }
  } catch (_) {
    // Fallback to strict bounds only.
  }
  return true;
}

function isPointInModelDragHotzone(x, y, bounds) {
  if (!bounds) return false;
  const left = Number(bounds.left);
  const right = Number(bounds.right);
  const top = Number(bounds.top);
  const bottom = Number(bounds.bottom);
  if (
    !Number.isFinite(left) || !Number.isFinite(right) ||
    !Number.isFinite(top) || !Number.isFinite(bottom) ||
    !Number.isFinite(x) || !Number.isFinite(y)
  ) {
    return false;
  }
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return false;
  const centerX = (left + right) * 0.5;
  const rawRatio = (y - top) / height;
  const yRatio = Math.max(0, Math.min(1, rawRatio));
  let halfWidthRatio = 0.22;
  if (yRatio < 0.22) {
    halfWidthRatio = 0.20 + (yRatio / 0.22) * 0.03;
  } else if (yRatio < 0.64) {
    halfWidthRatio = 0.23 + ((yRatio - 0.22) / 0.42) * 0.13;
  } else {
    halfWidthRatio = 0.24 - ((yRatio - 0.64) / 0.36) * 0.05;
  }
  const halfWidth = Math.max(10, Math.min(width * 0.48, width * halfWidthRatio));
  return Math.abs(x - centerX) <= halfWidth;
}

function setupClickthroughHitTest() {
  if (state.desktopBridge !== "electron") return;
  if (typeof window.electronAPI?.setClickthrough !== "function") return;
  let lastClickthrough = true;
  document.addEventListener("mousemove", (e) => {
    if (state.windowDragActive) {
      if (lastClickthrough) {
        window.electronAPI.setClickthrough(false);
        lastClickthrough = false;
      }
      return;
    }
    const over = isPointOverVisibleModelArea(e.clientX, e.clientY);
    const want = !over;
    if (want !== lastClickthrough) {
      lastClickthrough = want;
      window.electronAPI.setClickthrough(want);
    }
  });
}

function startModelMouseGazePolling() {
  if (state.uiView !== "model") {
    return;
  }
  if (state.mouseGazePollTimer) {
    return;
  }
  if (
    typeof window.electronAPI?.getCursorScreenPoint !== "function" ||
    typeof window.electronAPI?.getModelWindowBounds !== "function"
  ) {
    return;
  }
  let busy = false;
  state.mouseGazePollTimer = window.setInterval(async () => {
    if (busy) {
      return;
    }
    busy = true;
    try {
      const [cursor, bounds] = await Promise.all([
        window.electronAPI.getCursorScreenPoint(),
        window.electronAPI.getModelWindowBounds()
      ]);
      if (!cursor || !bounds) {
        return;
      }
      const width = Math.max(1, Number(bounds.width) || 0);
      const height = Math.max(1, Number(bounds.height) || 0);
      const centerX = Number(bounds.x) + width / 2;
      const centerY = Number(bounds.y) + height / 2;
      const relX = clampNumber((Number(cursor.x) - centerX) / (width / 2), -1, 1);
      const relY = clampNumber((Number(cursor.y) - centerY) / (height / 2), -1, 1);
      const gazeX = relX * 0.55;
      const gazeY = -relY * 0.38;
      state.mouseGazeTargetX = clampNumber(gazeX, -0.55, 0.55);
      state.mouseGazeTargetY = clampNumber(gazeY, -0.38, 0.38);
    } catch (_) {
    } finally {
      busy = false;
    }
  }, 33);
}

const MOOD_KEYWORDS = {
  happy: [
    "哈哈", "嘻嘻", "笑死", "开心", "高兴", "太好了", "太棒了", "不错", "喜欢",
    "爱你", "赞", "可爱", "有意思", "好玩", "真好", "厉害", "稳", "6", "666",
    "yyds", "hhh", "lol", "lmao", "haha", "yay", "nice", "cool", "amazing", "wonderful",
    "fantastic", "excited", "great", "awesome", "sweet", "happy", "love", "cheerful"
  ],
  sad: [
    "唉", "哭", "难过", "伤心", "失落", "遗憾", "心疼", "无语", "累了",
    "好累", "不想", "算了", "躺平", "寂寞", "孤独", "没意思", "无聊", "好烦", "emo",
    "破防", "心累", "麻了", "废了", "摆烂", "低落", "委屈", "崩溃", "疲惫", "sad",
    "sorry", "upset", "tired", "miss", "sigh", "alone", "depressed", "lonely", "blue"
  ],
  angry: [
    "烦", "草", "卧槽", "我去", "气死", "火大", "烦死", "讨厌", "闭嘴",
    "够了", "受不了", "离谱", "过分", "太过分", "可恶", "气炸", "炸了",
    "tmd", "wtf", "damn", "shut up", "hate", "pissed", "furious", "annoyed", "angry", "mad",
    "rage", "生气", "怒火", "暴躁"
  ],
  surprised: [
    "啊", "卧槽", "我去", "天哪", "不会吧", "不可能吧", "什么鬼", "啥情况", "真的假的",
    "牛", "nb", "离谱", "绝了", "不敢相信", "吓死", "震惊", "惊呆", "惊了", "居然",
    "竟然", "omg", "what", "seriously", "no way", "incredible", "unbelievable", "wow", "unexpected",
    "逆天", "神了", "太夸张了", "开玩笑吧"
  ]
};

function hasMoodKeyword(text, keywords) {
  for (let i = 0; i < keywords.length; i += 1) {
    const token = String(keywords[i] || "").trim().toLowerCase();
    if (token && text.includes(token)) {
      return true;
    }
  }
  return false;
}

function detectMood(text) {
  const s = String(text || "").toLowerCase().trim();
  if (!s) {
    return "idle";
  }
  if (hasMoodKeyword(s, MOOD_KEYWORDS.surprised)) {
    return "surprised";
  }
  if (hasMoodKeyword(s, MOOD_KEYWORDS.angry)) {
    return "angry";
  }
  if (hasMoodKeyword(s, MOOD_KEYWORDS.sad)) {
    return "sad";
  }
  if (hasMoodKeyword(s, MOOD_KEYWORDS.happy)) {
    return "happy";
  }
  return "idle";
}
function extractMotionDefinitions(model = null) {
  const targetModel = model || state.model;
  if (!targetModel) {
    return {};
  }
  return (
    targetModel.internalModel?.motionManager?.definitions ||
    targetModel.internalModel?.settings?.FileReferences?.Motions ||
    {}
  );
}

function getMotionCount(group) {
  const arr = state.motionDefinitions?.[group];
  return Array.isArray(arr) ? arr.length : 0;
}

function listAvailableMotionGroups() {
  return Object.keys(state.motionDefinitions || {}).filter((group) => getMotionCount(group) > 0);
}

function setModelMotionDefinitions(model) {
  resetActionSystem();
  state.motionDefinitions = extractMotionDefinitions(model);
  state.availableMotionGroups = listAvailableMotionGroups();
}

function stopIdleMotionLoop() {
  if (!state.idleMotionTimer) {
    return;
  }
  clearTimeout(state.idleMotionTimer);
  state.idleMotionTimer = 0;
}

function isSpeakingNow() {
  const browserSpeaking =
    "speechSynthesis" in window &&
    !!window.speechSynthesis &&
    !!window.speechSynthesis.speaking;
  const audioSpeaking =
    !!state.ttsAudio &&
    !state.ttsAudio.paused &&
    !state.ttsAudio.ended;
  const contextSpeaking = !!state.ttsContextSpeaking;
  return browserSpeaking || audioSpeaking || contextSpeaking;
}

function isSpeechMotionActive(now = performance.now()) {
  if (state.uiView === "model") {
    const t = Number(now || performance.now());
    const updatedAt = Number(state._broadcastSpeechUpdatedAt || 0);
    const animUntil = Number(state.speechAnimUntil || 0);
    if (updatedAt > 0 && t - updatedAt > 900) {
      return t <= animUntil + 180;
    }
    if (state._broadcastSpeaking) {
      return true;
    }
    return t <= animUntil + 140;
  }
  if (isSpeakingNow()) {
    return true;
  }
  const t = Number(now || performance.now());
  const activeUntil = Number(state.speechAnimUntil || 0);
  const queuePending = Array.isArray(state.streamSpeakQueue) && state.streamSpeakQueue.length > 0;
  if (queuePending && t <= activeUntil + 260) {
    return true;
  }
  return false;
}

function shouldSkipIdleMotion() {
  if (!state.model || !state.motionEnabled || !state.idleMotionEnabled) {
    return true;
  }
  if (state.dragData || state.windowDragActive || state.animating) {
    return true;
  }
  if (state.chatBusy || isSpeakingNow()) {
    return true;
  }
  return false;
}

function scheduleIdleMotionLoop() {
  stopIdleMotionLoop();
  if (!state.idleMotionEnabled) {
    return;
  }
  const preset = getMotionIntensityPreset();
  const cadence = getActiveModelCadence();
  const scale = (Number(preset.idleIntervalScale) || 1) * (Number(cadence?.idleIntervalScale) || 1);
  const minMs = Math.max(5000, Math.round((Number(state.idleMotionMinMs) || 12000) * scale));
  const maxMs = Math.max(minMs + 1000, Math.round((Number(state.idleMotionMaxMs) || 24000) * scale));
  const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
  state.idleMotionTimer = window.setTimeout(async () => {
    state.idleMotionTimer = 0;
    if (!shouldSkipIdleMotion()) {
      enqueueActionIntent("idle", buildFollowupAwareIdleMotionContext());
    }
    scheduleIdleMotionLoop();
  }, delay);
}

function pickMoodMotionGroups(mood, source = "emotion") {
  let idleGroups = ["Idle"];
  if (source === "idle") {
    idleGroups = ["Idle", "Tap", "FlickUp", "FlickDown"];
  } else if (source === "talk") {
    idleGroups = ["Tap", "FlickUp", "Idle"];
  } else if (source === "tap") {
    idleGroups = ["Tap", "Tap@Body", "FlickUp", "Idle"];
  }
  const map = {
    happy: ["Tap", "Tap@Body", "FlickUp", "Idle"],
    sad: ["FlickDown", "Idle", "Flick"],
    angry: ["Flick@Body", "Flick", "Tap@Body", "Idle"],
    surprised: ["FlickUp", "Tap", "Flick", "Idle"],
    idle: idleGroups
  };
  return map[mood] || map.idle;
}

function canPlayMotion(cooldownMs = null, force = false) {
  const now = performance.now();
  if (!force && now < state.motionCooldownUntil) {
    return false;
  }
  if (cooldownMs != null && Number.isFinite(Number(cooldownMs))) {
    state.motionCooldownUntil = now + Math.max(120, Number(cooldownMs));
  }
  return true;
}

async function playMotionGroup(group, priority = 3) {
  if (!state.model || !group) {
    return false;
  }
  const count = getMotionCount(group);
  if (count <= 0) {
    return false;
  }
  let candidates = Array.from({ length: count }, (_, i) => i);
  if (count > 1) {
    const seed = Math.floor(Math.random() * count);
    candidates = [...candidates.slice(seed), ...candidates.slice(0, seed)];
  }
  for (const idx of candidates) {
    try {
      await state.model.motion(group, idx, priority);
      state.lastMotionGroup = group;
      return true;
    } catch (_) {
      // Try next index in same group.
    }
  }
  return false;
}

async function tryBuiltInMotion(mood, opts = {}) {
  if (!state.model || !state.motionEnabled) {
    return false;
  }
  if (state.dragData || state.windowDragActive) {
    return false;
  }
  const source = String(opts.source || "emotion");
  const allowFallback = opts.allowFallback !== false;
  const priority = Number.isFinite(Number(opts.priority)) ? Number(opts.priority) : 3;
  const force = !!opts.force;
  const cooldownMs = Number.isFinite(Number(opts.cooldownMs))
    ? Number(opts.cooldownMs)
    : state.motionCooldownMs;
  if (!canPlayMotion(cooldownMs, force)) {
    return false;
  }
  const explicitGroups = uniqueMotionGroups(opts.groups);
  const groups = (explicitGroups.length ? explicitGroups : pickMoodMotionGroups(mood, source))
    .filter((group) => getMotionCount(group) > 0)
    .sort((a, b) => {
      if (a === state.lastMotionGroup) return 1;
      if (b === state.lastMotionGroup) return -1;
      return 0;
    });
  for (const group of groups) {
    const ok = await playMotionGroup(group, priority);
    if (ok) {
      return true;
    }
  }
  if (!allowFallback) {
    return false;
  }
  return false;
}

function animateFallback(mood, opts = {}) {
  if (!state.model || state.animating || state.dragData || state.windowDragActive) {
    return;
  }
  state.animating = true;
  const model = state.model;
  const style = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
  const intent = String(opts.intent || opts.source || "idle").toLowerCase();
  const start = performance.now();
  const duration = intent === "reply" ? 980 : (intent === "talk" ? 760 : 1120);
  const bx = state.baseTransform.x;
  const by = state.baseTransform.y;
  const bs = state.baseTransform.scale;
  const swayBias = style === "playful" ? 1.18 : (style === "comfort" ? 0.82 : 1.0);
  const tiltBias = style === "steady" ? 0.8 : 1.0;

  const frame = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const wave = Math.sin(p * Math.PI * 4);
    const pulse = Math.sin(p * Math.PI);

    if (mood === "happy") {
      model.y = by - Math.abs(wave) * 26 * swayBias;
      model.x = bx + wave * 7 * swayBias;
      model.scale.set(bs * (1 + Math.abs(wave) * 0.06));
      model.rotation = wave * 0.038 * tiltBias;
    } else if (mood === "sad") {
      model.y = by + p * 18;
      model.x = bx - pulse * 4;
      model.scale.set(bs * (1 - p * 0.05));
      model.rotation = -0.06 * tiltBias;
    } else if (mood === "angry") {
      model.x = bx + wave * 14;
      model.y = by - Math.abs(Math.sin(p * Math.PI * 5)) * 6;
      model.rotation = wave * 0.05 * tiltBias;
    } else if (mood === "surprised") {
      model.y = by - pulse * 12;
      model.scale.set(bs * (1 + Math.abs(wave) * 0.1));
      model.rotation = wave * 0.018;
    } else if (intent === "talk") {
      const bounce = Math.sin(p * Math.PI * 8);
      model.x = bx + wave * 18 * swayBias;
      model.y = by + bounce * 6 - Math.abs(wave) * 18;
      model.rotation = wave * 0.044 * tiltBias;
    } else if (intent === "thinking") {
      model.x = bx + Math.sin(p * Math.PI * 2) * 5;
      model.y = by - pulse * 6;
      model.rotation = -0.025;
    } else {
      model.x = bx + wave * 3 * swayBias;
      model.y = by;
      model.scale.set(bs);
      model.rotation = wave * 0.012;
    }

    if (p < 1) {
      requestAnimationFrame(frame);
      return;
    }

    model.x = bx;
    model.y = by;
    model.scale.set(bs);
    model.rotation = 0;
    state.animating = false;
  };

  requestAnimationFrame(frame);
}

function triggerTapMotion() {
  enqueueActionIntent("tap", { combo: true });
}

function maybePlayTalkGesture(text, style = "neutral") {
  if (!state.motionEnabled || !state.model || state.dragData || state.windowDragActive) {
    return;
  }
  const now = performance.now();
  if (state.motionQuietDuringSpeech && state.speakingEnabled) {
    state.speakingMotionCooldownUntil = Math.max(Number(state.speakingMotionCooldownUntil) || 0, now + 260);
    return;
  }
  const motionBlend = clampNumber(Number(state.speechMotionBlend) || 0, 0, 1);
  const speakingNow = isSpeechMotionActive(now);
  const pendingStreamSegments = Array.isArray(state.streamSpeakQueue) ? state.streamSpeakQueue.length : 0;
  if ((speakingNow && motionBlend > 0.1) || motionBlend > 0.24) {
    state.speakingMotionCooldownUntil = Math.max(Number(state.speakingMotionCooldownUntil) || 0, now + 220);
    return;
  }
  if (pendingStreamSegments > 1 || hasPendingTalkLikeAction()) {
    state.speakingMotionCooldownUntil = Math.max(Number(state.speakingMotionCooldownUntil) || 0, now + 180);
    return;
  }
  if (now < state.speakingMotionCooldownUntil) {
    return;
  }
  state.speakingMotionCooldownUntil = now + state.speakingMotionCooldownMs;
  const clean = sanitizeSpeakText(text);
  if (!clean) {
    return;
  }
  const clauses = (clean.match(/[，。！？!?、]/g) || []).length + 1;
  const lenBeats = Math.ceil((clean.length || 0) / 20);
  const strongPunct = (clean.match(/[!?\uFF01\uFF1F]/g) || []).length;
  const minorPunct = (clean.match(/[,\uFF0C\u3001;\uFF1B:\uFF1A]/g) || []).length;
  const cadence = getActiveModelCadence();
  const beatScale = Math.max(0.8, Math.min(1.4, Number(cadence?.talkBeatScale) || 1));
  const beats = Math.max(1, Math.min(4, Math.round(Math.max(clauses, lenBeats) * beatScale)));
  const emphasis = clampNumber(
    strongPunct * 0.34 + minorPunct * 0.08 + (style === "playful" ? 0.08 : 0),
    0,
    1
  );
  enqueueActionIntent("talk", { text: clean, style, combo: true, beats, emphasis, accentCount: strongPunct });
}

async function playEmotion(text, opts = {}) {
  const mood = detectMood(text);
  const played = await tryBuiltInMotion(mood, opts);
  if (!played && opts.allowFallback !== false) {
    animateFallback(mood, opts);
  }
}

async function speakByBrowser(text, opts = {}) {
  const force = !!opts.force;
  const requestedGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
  if (!force && !state.speakingEnabled) {
    return false;
  }
  if (!("speechSynthesis" in window)) {
    return false;
  }
  if (!state.ttsReady) {
    initTTS();
  }

  if (!isCurrentTTSPlaybackGeneration(requestedGeneration)) {
    recordTTSDebugEvent("browser_stale_skip", {
      text,
      result: "stale"
    });
    return false;
  }
  stopAllAudioPlayback();
  const playbackGeneration = Number(state.ttsPlaybackGeneration || 0);
  const candidates = buildVoiceCandidates();
  for (const v of candidates) {
    const ok = await speakOnceWithVoice(text, v, { force, playbackGeneration });
    if (ok) {
      return true;
    }
  }
  return false;
}

function buildServerTTSPayload(cleanedText, opts = {}) {
  if (typeof TTS_API.buildServerTTSPayload === "function") {
    return TTS_API.buildServerTTSPayload(cleanedText, {
      ...opts,
      voice: state.ttsServerVoice
    });
  }
  return { text: String(cleanedText || "") };
}

function isRetriableTTSError(err) {
  if (typeof TTS_API.isRetriableTTSError === "function") {
    return TTS_API.isRetriableTTSError(err);
  }
  return false;
}

async function requestServerTTSBlob(text, prosody = null, requestOpts = {}) {
  if (typeof TTS_API.requestServerTTSBlob !== "function") {
    throw new Error("ttsApi request helper is not available");
  }
  return TTS_API.requestServerTTSBlob(text, prosody, {
    authFetch,
    sanitizeSpeakText,
    perfLog,
    traceId: String(requestOpts.traceId || state.activePerfTraceId || "").trim(),
    timeoutMs: Math.max(
      1500,
      Math.min(90000, Math.round(Number(requestOpts.timeoutMs) || Number(state.ttsServerRequestTimeoutMs) || 14000))
    ),
    voice: state.ttsServerVoice,
    now: () => performance.now(),
    wallNow: () => Date.now()
  });
}

async function requestServerTTSBlobWithRetry(text, prosody = null, opts = {}) {
  if (typeof TTS_API.requestServerTTSBlobWithRetry !== "function") {
    throw new Error("ttsApi retry helper is not available");
  }
  return TTS_API.requestServerTTSBlobWithRetry(text, prosody, {
    authFetch,
    sanitizeSpeakText,
    perfLog,
    traceId: opts.traceId,
    retries: Math.max(0, Math.min(4, Math.round(Number(opts.retries) || 0))),
    retryDelayMs: Math.max(
      60,
      Math.min(3000, Math.round(Number(opts.retryDelayMs) || Number(state.ttsServerRetryDelayMs) || 220))
    ),
    timeoutMs: Math.max(
      1500,
      Math.min(90000, Math.round(Number(opts.timeoutMs) || Number(state.ttsServerRequestTimeoutMs) || 14000))
    ),
    voice: state.ttsServerVoice,
    now: () => performance.now(),
    wallNow: () => Date.now(),
    wait: waitMs,
    onRetry: ({ attempt, nextWaitMs, error }) => {
      console.warn("Server TTS request retry", {
        attempt,
        nextWaitMs,
        reason: String(error?.message || error)
      });
    }
  });
}

async function playAudioByContext(blob, debugContext = {}) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || !blob) {
    recordTTSDebugEvent("context_unavailable", debugContext);
    return false;
  }
  const playbackGeneration = Number(debugContext.playbackGeneration || state.ttsPlaybackGeneration || 0);
  if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
    recordTTSDebugEvent("context_stale_skip", {
      ...debugContext,
      result: "stale"
    });
    return false;
  }
  let markedSpeaking = false;
  let fallbackTimer = 0;
  let source = null;
  let contextPlaybackStarted = false;
  try {
    if (!state.ttsDecodeContext || state.ttsDecodeContext.state === "closed") {
      state.ttsDecodeContext = new AudioCtx();
    }
    const ctx = state.ttsDecodeContext;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      recordTTSDebugEvent("context_stale_skip", {
        ...debugContext,
        result: "stale"
      });
      return false;
    }
    const arrayBuf = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
    if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      recordTTSDebugEvent("context_stale_skip", {
        ...debugContext,
        result: "stale"
      });
      return false;
    }
      recordTTSDebugEvent("context_play_start", {
        ...debugContext,
        blobBytes: Number(blob?.size || arrayBuf.byteLength || 0),
        durationMs: Number.isFinite(Number(decoded.duration)) && decoded.duration > 0
          ? Math.round(decoded.duration * 1000)
          : -1
      });
      state.ttsDebugAudioStartedAt = performance.now();
      if (debugContext.sessionId) {
        state.streamSpeakPlayedSession = Number(debugContext.sessionId || 0);
      }
    source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    source.buffer = decoded;
    state.ttsContextBufferSource = source;
    if (!state.ttsAudioAnalyser || state.ttsAudioAnalyser.context !== ctx) {
      state.ttsAudioAnalyser = ctx.createAnalyser();
      state.ttsAudioAnalyser.fftSize = 256;
      state.ttsAudioAnalyser.smoothingTimeConstant = 0.12;
      state.ttsAudioAnalyserData = new Uint8Array(state.ttsAudioAnalyser.frequencyBinCount);
    }
    source.connect(state.ttsAudioAnalyser);
    state.ttsAudioAnalyser.connect(gain);
    gain.connect(ctx.destination);
    state.ttsContextSpeaking = true;
    markedSpeaking = true;
    await new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve();
      };
      source.onended = resolveOnce;
      const durationMs = Number.isFinite(Number(decoded.duration)) && decoded.duration > 0
        ? Math.round(decoded.duration * 1000)
        : 45000;
      fallbackTimer = window.setTimeout(resolveOnce, Math.min(180000, durationMs + 900));
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        recordTTSDebugEvent("context_stale_skip", {
          ...debugContext,
          result: "stale"
        });
        resolveOnce();
        return;
      }
      source.start(0);
      contextPlaybackStarted = true;
    });
    if (state.ttsContextBufferSource === source) {
      state.ttsContextBufferSource = null;
    }
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
    try {
      source.disconnect();
    } catch (_) {
      // ignore
    }
    if (!contextPlaybackStarted || !isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      recordTTSDebugEvent("context_stale_skip", {
        ...debugContext,
        result: "stale"
      });
      return false;
    }
    state.ttsContextSpeaking = false;
    state.ttsAudioLevel = 0;
    state.ttsAudioRawLevel = 0;
    state.ttsAudioRms = 0;
    state.conversationLastTtsFinishedAt = Date.now();
    markedSpeaking = false;
    recordTTSDebugEvent("context_play_end", {
      ...debugContext,
      result: "ok"
    });
    return true;
  } catch (err) {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
    if (markedSpeaking && isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      state.ttsContextSpeaking = false;
    }
    if (source) {
      try {
        source.stop(0);
      } catch (_) {
        // ignore
      }
      try {
        source.disconnect();
      } catch (_) {
        // ignore
      }
    }
    if (state.ttsContextBufferSource === source) {
      state.ttsContextBufferSource = null;
    }
    if (isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      state.ttsAudioLevel = 0;
      state.ttsAudioRawLevel = 0;
      state.ttsAudioRms = 0;
    }
    recordTTSDebugEvent("context_play_fail", {
      ...debugContext,
      result: "fail",
      error: String(err?.message || err || "")
    });
    return false;
  }
}

async function playAudioBlob(blob, opts = {}) {
  if (!blob) {
    return false;
  }
  const playbackGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
  if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
    recordTTSDebugEvent("audio_stale_skip", {
      traceId: String(opts.perfTraceId || state.activePerfTraceId || "").trim(),
      sessionId: Number(opts.sessionId || state.streamSpeakSession || 0),
      segmentId: Number(opts.segmentId || 0),
      text: opts.text || "",
      blobBytes: Number(blob?.size || 0),
      result: "stale"
    });
    return false;
  }
  const perfTraceId = String(opts.perfTraceId || state.activePerfTraceId || "").trim();
  const perfBlobReadyPerfMs = Number(opts.perfBlobReadyPerfMs) || 0;
  const perfSpeakStartedPerfMs = Number(opts.perfSpeakStartedPerfMs) || 0;
  const debugContext = {
    traceId: perfTraceId,
    sessionId: Number(opts.sessionId || state.streamSpeakSession || 0),
    segmentId: Number(opts.segmentId || 0),
    text: opts.text || "",
    blobBytes: Number(blob?.size || 0),
    playbackGeneration
  };
  recordTTSDebugEvent("audio_blob_ready", debugContext);
  if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
    recordTTSDebugEvent("audio_stale_skip", {
      ...debugContext,
      result: "stale"
    });
    return false;
  }
  if (!state.ttsAudio) {
    state.ttsAudio = new Audio();
    state.ttsAudio.preload = "auto";
  }
  const audio = state.ttsAudio;
  ensureTTSAudioAnalyser(audio);
  audio.muted = false;
  audio.volume = 1.0;
  const speechText = sanitizeSpeakText(opts.text || "");
  const speechMood = String(opts.mood || detectMood(speechText) || "idle");
  const speechStyle = normalizeTalkStyle(opts.style || state.currentTalkStyle || "neutral");
  const url = URL.createObjectURL(blob);
  const audioPlaybackToken = Number(state.ttsAudioPlaybackToken || 0) + 1;
  state.ttsAudioPlaybackToken = audioPlaybackToken;
  if (opts.interrupt) {
    recordTTSDebugEvent("audio_interrupt", debugContext);
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (_) {
      // ignore
    }
  }
  return await new Promise((resolve) => {
    let settled = false;
    let failTimer = 0;
    let startupTimer = 0;
    let progressTimer = 0;
    let fallbackSpeechStarted = false;
    const isCurrentHtmlAudioPlayback = () => (
      Number(state.ttsAudioPlaybackToken || 0) === audioPlaybackToken
      && audio.src === url
    );
    const stopHtmlAudio = () => {
      if (!isCurrentHtmlAudioPlayback()) {
        return;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {
        // ignore
      }
    };
    const beginFallbackSpeech = () => {
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        return;
      }
      if (fallbackSpeechStarted) {
        return;
      }
      fallbackSpeechStarted = true;
      recordTTSDebugEvent("audio_fallback_begin", {
        ...debugContext,
        durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : -1,
        currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
      });
      beginSpeechAnimation(speechText, speechMood, speechStyle, {
        durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : undefined
      });
    };
    const armFailTimer = (ms) => {
      if (failTimer) {
        clearTimeout(failTimer);
        failTimer = 0;
      }
      const timeoutMs = Math.max(12000, Math.min(180000, Math.round(Number(ms) || 0)));
      failTimer = window.setTimeout(() => done(false), timeoutMs);
    };
    const done = (ok) => {
      if (settled) return;
      settled = true;
      if (failTimer) {
        clearTimeout(failTimer);
        failTimer = 0;
      }
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = 0;
      }
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = 0;
      }
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || !isCurrentHtmlAudioPlayback()) {
        recordTTSDebugEvent("audio_stale_skip", {
          ...debugContext,
          result: "stale"
        });
        try {
          URL.revokeObjectURL(url);
        } catch (_) {
          // ignore
        }
        resolve(false);
        return;
      }
      state.ttsContextSpeaking = false;
      state.ttsAudioLevel = 0;
      state.ttsAudioRawLevel = 0;
      state.ttsAudioRms = 0;
      state.ttsDebugAudioEndedAt = performance.now();
      state.conversationLastTtsFinishedAt = Date.now();
      state.ttsDebugAudioCurrentMs = Math.round(Number(audio.currentTime || 0) * 1000);
      if (ok) {
        finishSpeechAnimation();
      } else {
        stopHtmlAudio();
        endSpeechAnimation();
      }
      hideSubtitleText();
      recordTTSDebugEvent("audio_done", {
        ...debugContext,
        result: ok ? "ok" : "fail",
        durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : -1,
        currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
      });
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // ignore
      }
      setStatus(ok ? "待机" : "语音失败");
      resolve(ok);
    };
    audio.onended = () => {
      if (!isCurrentHtmlAudioPlayback()) {
        done(false);
        return;
      }
      recordTTSAudioEvent("audio_ended_event", audio, debugContext);
      done(true);
    };
    audio.onerror = async () => {
      if (!isCurrentHtmlAudioPlayback()) {
        done(false);
        return;
      }
      recordTTSAudioEvent("audio_error", audio, debugContext, {
        error: String(audio.error?.message || audio.error?.code || "")
      });
      stopHtmlAudio();
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        done(false);
        return;
      }
      beginFallbackSpeech();
      const ok = await playAudioByContext(blob, debugContext);
      done(!!ok);
    };
    audio.oncanplay = () => recordTTSAudioEvent("audio_canplay", audio, debugContext);
    audio.onplaying = () => recordTTSAudioEvent("audio_playing", audio, debugContext);
    audio.onpause = () => {
      if (!settled && !audio.ended) {
        recordTTSAudioEvent("audio_pause", audio, debugContext);
      }
    };
    audio.onwaiting = () => recordTTSAudioEvent("audio_waiting", audio, debugContext);
    audio.onstalled = () => recordTTSAudioEvent("audio_stalled", audio, debugContext);
    audio.onsuspend = () => recordTTSAudioEvent("audio_suspend", audio, debugContext);
    audio.onplay = () => {
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || !isCurrentHtmlAudioPlayback()) {
        stopHtmlAudio();
        done(false);
        return;
      }
      state.ttsDebugAudioStartedAt = performance.now();
      state.ttsDebugAudioEndedAt = 0;
      if (debugContext.sessionId) {
        state.streamSpeakPlayedSession = Number(debugContext.sessionId || 0);
      }
      recordTTSDebugEvent("audio_play_start", {
        ...debugContext,
        durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : -1,
        currentMs: Math.round(Number(audio.currentTime || 0) * 1000)
      });
      if (perfTraceId) {
        perfLog("tts", "audio_play_start", {
          traceId: perfTraceId,
          fromBlobReadyMs: perfBlobReadyPerfMs ? Math.round(performance.now() - perfBlobReadyPerfMs) : -1,
          fromSpeakStartMs: perfSpeakStartedPerfMs ? Math.round(performance.now() - perfSpeakStartedPerfMs) : -1
        });
      }
      if (state.ttsAudioContext && typeof state.ttsAudioContext.resume === "function") {
        state.ttsAudioContext.resume().catch(() => {});
      }
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = 0;
      }
      // Some environments resolve play() but never advance currentTime.
      let lastProgressAt = performance.now();
      let lastCurrentTime = Number(audio.currentTime || 0);
      progressTimer = window.setInterval(async () => {
        if (settled) {
          return;
        }
        if (!isCurrentHtmlAudioPlayback()) {
          done(false);
          return;
        }
        const current = Number(audio.currentTime || 0);
        if (current > lastCurrentTime + 0.01) {
          lastCurrentTime = current;
          lastProgressAt = performance.now();
          return;
        }
        if (audio.paused || audio.ended) {
          return;
        }
        if (performance.now() - lastProgressAt < 2800) {
          return;
        }
        stopHtmlAudio();
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          done(false);
          return;
        }
        beginFallbackSpeech();
        const ok = await playAudioByContext(blob, debugContext);
        done(!!ok);
      }, 650);
      beginSpeechAnimation(speechText, speechMood, speechStyle, {
        durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : undefined
      });
      showSubtitleText(speechText);
    };
    audio.onloadedmetadata = () => {
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration) || !isCurrentHtmlAudioPlayback()) {
        stopHtmlAudio();
        done(false);
        return;
      }
      if (Number.isFinite(Number(audio.duration)) && audio.duration > 0) {
        state.ttsDebugAudioDurationMs = Math.round(audio.duration * 1000);
        recordTTSDebugEvent("audio_metadata", {
          ...debugContext,
          durationMs: Math.round(audio.duration * 1000)
        });
        armFailTimer(audio.duration * 1000 + 12000);
        beginSpeechAnimation(speechText, speechMood, speechStyle, {
          durationMs: Math.round(audio.duration * 1000)
        });
        if (audio.paused && !audio.ended) {
          audio.play().catch(async () => {
            if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
              done(false);
              return;
            }
            beginFallbackSpeech();
            const ok = await playAudioByContext(blob, debugContext);
            done(!!ok);
          });
        }
      }
    };
    if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      done(false);
      return;
    }
    audio.src = url;
    audio.play().then(() => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = 0;
      }
    }).catch(async () => {
      recordTTSDebugEvent("audio_play_rejected", debugContext);
      stopHtmlAudio();
      if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
        done(false);
        return;
      }
      beginFallbackSpeech();
      const ok = await playAudioByContext(blob, debugContext);
      done(!!ok);
    });
    armFailTimer(45000);
    startupTimer = window.setTimeout(async () => {
      if (settled) {
        return;
      }
      if (audio.paused && !audio.ended && Number(audio.currentTime || 0) === 0) {
        recordTTSDebugEvent("audio_startup_stalled", debugContext);
        stopHtmlAudio();
        if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
          done(false);
          return;
        }
        beginFallbackSpeech();
        const ok = await playAudioByContext(blob, debugContext);
        done(!!ok);
      }
    }, 3200);
  });
}

async function speakByServer(text, opts = {}) {
  const force = !!opts.force;
  const perfTraceId = String(opts.perfTraceId || state.activePerfTraceId || "").trim();
  const speakStartedPerfMs = performance.now();
  const playbackGeneration = Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0);
  if (!force && !state.speakingEnabled) {
    return false;
  }
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      // ignore
    }
  }
  if (opts.interrupt && state.ttsAudio) {
    try {
      state.ttsAudio.pause();
      state.ttsAudio.currentTime = 0;
    } catch (_) {
      // ignore
    }
  }
  const cleaned = sanitizeSpeakText(text);
  if (!cleaned) {
    return false;
  }

  try {
    setStatus("语音中...");
    perfLog("tts", "speak_start", {
      traceId: perfTraceId || "(none)",
      textChars: cleaned.length
    });
    const blob = await requestServerTTSBlobWithRetry(cleaned, opts.prosody || null, {
      retries: Number.isFinite(Number(opts.retries))
        ? Number(opts.retries)
        : Number(state.ttsServerRetryCount),
      retryDelayMs: Number(state.ttsServerRetryDelayMs),
      timeoutMs: Number(state.ttsServerRequestTimeoutMs),
      traceId: perfTraceId
    });
    if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      recordTTSDebugEvent("speak_stale_skip", {
        traceId: perfTraceId || "(none)",
        text: cleaned,
        result: "stale"
      });
      return false;
    }
    return await playAudioBlob(blob, {
      interrupt: !!opts.interrupt,
      text: cleaned,
      mood: opts.mood || detectMood(cleaned),
      style: opts.style || state.currentTalkStyle || "neutral",
      perfTraceId,
      perfBlobReadyPerfMs: performance.now(),
      perfSpeakStartedPerfMs: speakStartedPerfMs,
      playbackGeneration
    });
  } catch (err) {
    if (!isCurrentTTSPlaybackGeneration(playbackGeneration)) {
      recordTTSDebugEvent("speak_stale_skip", {
        traceId: perfTraceId || "(none)",
        text: cleaned,
        result: "stale",
        error: String(err?.message || err || "")
      });
      return false;
    }
    perfLog("tts", "speak_fail", {
      traceId: perfTraceId || "(none)",
      elapsedMs: Math.round(performance.now() - speakStartedPerfMs),
      error: String(err?.message || err || "")
    });
    console.warn("Server TTS failed:", err);
    state.ttsServerAvailable = false;
    state.ttsServerFailStreak = Math.max(0, Number(state.ttsServerFailStreak) || 0) + 1;
    state.ttsServerLastError = String(err?.message || err || "");
    setStatus("语音服务未就绪");
    return false;
  }
}

async function speak(text, opts = {}) {
  const speakOpts = {
    ...opts,
    playbackGeneration: Number(opts.playbackGeneration || state.ttsPlaybackGeneration || 0)
  };
  if (isServerTTSProvider(state.ttsProvider)) {
    // Always retry even if a previous call failed - GPT-SoVITS may have started later.
    const ok = await speakByServer(text, speakOpts);
    if (ok) {
      state.ttsServerAvailable = true;
      state.ttsServerFailStreak = 0;
      state.ttsServerLastError = "";
      return true;
    }
    if (!isCurrentTTSPlaybackGeneration(speakOpts.playbackGeneration)) {
      recordTTSDebugEvent("speak_fallback_stale_skip", {
        traceId: String(speakOpts.perfTraceId || state.activePerfTraceId || "(none)"),
        text,
        result: "stale"
      });
      return false;
    }
    if (!state.serverTTSFallbackToBrowser) {
      return false;
    }
    const failThreshold = Math.max(
      1,
      Math.min(8, Math.round(Number(state.ttsServerFallbackFailThreshold) || 1))
    );
    const failStreak = Math.max(0, Number(state.ttsServerFailStreak) || 0);
    const lastErr = String(state.ttsServerLastError || "");
    const lastErrLower = lastErr.toLowerCase();
    const immediateBrowserFallback =
      state.ttsProvider === "gpt_sovits" ||
      lastErrLower.includes("connection failed") ||
      lastErrLower.includes("network") ||
      lastErrLower.includes("timeout") ||
      lastErrLower.includes("aborted") ||
      lastErrLower.includes("empty audio") ||
      /^http\s+5\d\d$/i.test(lastErr);
    if (immediateBrowserFallback) {
      console.warn("Server TTS immediate fallback -> browser TTS", {
        provider: state.ttsProvider,
        streak: failStreak,
        reason: lastErr
      });
      recordTTSDebugEvent("browser_fallback_start", {
        traceId: String(speakOpts.perfTraceId || state.activePerfTraceId || "(none)"),
        text,
        provider: state.ttsProvider,
        streak: failStreak,
        threshold: failThreshold,
        error: lastErr,
        timeoutMs: Number(state.ttsServerRequestTimeoutMs || 0)
      });
      return await speakByBrowser(text, { force: !!speakOpts.force, playbackGeneration: speakOpts.playbackGeneration });
    }
    const nonRetriableClientError =
      /^HTTP\s+4\d\d$/i.test(lastErr) && !/^HTTP\s+(408|429)$/i.test(lastErr);
    if (!nonRetriableClientError && failStreak < failThreshold) {
      console.warn("Server TTS failed but fallback is delayed", {
        streak: failStreak,
        threshold: failThreshold,
        provider: state.ttsProvider,
        reason: lastErr
      });
      setStatus(`TTS retrying (${failStreak}/${failThreshold})`);
      return false;
    }
    // Server TTS failed: fallback to browser speech when enabled.
    console.warn("Server TTS fallback -> browser TTS", {
      provider: state.ttsProvider,
      streak: failStreak,
      threshold: failThreshold,
      reason: lastErr
    });
    return await speakByBrowser(text, { force: !!speakOpts.force, playbackGeneration: speakOpts.playbackGeneration });
  }
  return await speakByBrowser(text, speakOpts);
}

function switchVoice() {
  if (isServerTTSProvider(state.ttsProvider)) {
    if (!state.ttsServerVoices.length) {
      setStatus("无可用服务端音色");
      return;
    }
    state.ttsServerVoiceIndex =
      (state.ttsServerVoiceIndex + 1) % state.ttsServerVoices.length;
    state.ttsServerVoice = state.ttsServerVoices[state.ttsServerVoiceIndex];
    setStatus(`音色: ${state.ttsServerVoice}`);
    return;
  }

  if (!state.ttsVoices.length) {
    setStatus("无可用音色");
    return;
  }
  setActiveVoice(state.ttsVoiceIndex + 1);
  const name = state.ttsVoice?.name || "未知";
  setStatus(`音色: ${name}`);
}

function clearWakeRestartTimer() {
  if (!state.wakeRestartTimer) {
    return;
  }
  clearTimeout(state.wakeRestartTimer);
  state.wakeRestartTimer = 0;
}

function shouldRunWakeWordListener() {
  return (
    !!state.wakeWordEnabled &&
    !!state.recognitionAvailable &&
    !state.micToggleBusy &&
    !state.micOpen &&
    !state.recognitionActive &&
    !state.chatBusy
  );
}

function stopWakeWordListener(hardStop = false) {
  clearWakeRestartTimer();
  if (!state.wakeRecognition) {
    state.wakeRecognitionActive = false;
    return;
  }
  try {
    if (hardStop && typeof state.wakeRecognition.abort === "function") {
      state.wakeRecognition.abort();
    } else {
      state.wakeRecognition.stop();
    }
  } catch (_) {
    // ignore
  }
  state.wakeRecognitionActive = false;
}

function scheduleWakeWordStart(delayMs = 0) {
  clearWakeRestartTimer();
  if (!shouldRunWakeWordListener()) {
    return;
  }
  state.wakeRestartTimer = window.setTimeout(() => {
    state.wakeRestartTimer = 0;
    if (!shouldRunWakeWordListener() || !state.wakeRecognition || state.wakeRecognitionActive) {
      return;
    }
    try {
      state.wakeRecognition.start();
    } catch (_) {
      scheduleWakeWordStart(900);
    }
  }, Math.max(0, Number(delayMs) || 0));
}

function wakeTranscriptHit(text) {
  const src = String(text || "").toLowerCase();
  if (!src) {
    return false;
  }
  const words = Array.isArray(state.wakeWords) ? state.wakeWords : [];
  for (const raw of words) {
    const w = String(raw || "").trim().toLowerCase();
    if (w && src.includes(w)) {
      return true;
    }
  }
  return false;
}

function setupWakeWordRecognition(RecognitionCtor) {
  if (!RecognitionCtor) {
    state.wakeRecognition = null;
    state.wakeRecognitionActive = false;
    return;
  }
  const wake = new RecognitionCtor();
  wake.lang = "zh-CN";
  wake.continuous = true;
  wake.interimResults = false;
  wake.maxAlternatives = 1;
  wake.onstart = () => {
    state.wakeRecognitionActive = true;
  };
  wake.onerror = () => {
    state.wakeRecognitionActive = false;
  };
  wake.onend = () => {
    state.wakeRecognitionActive = false;
    if (shouldRunWakeWordListener()) {
      scheduleWakeWordStart(280);
    }
  };
  wake.onresult = async (event) => {
    if (!shouldRunWakeWordListener()) {
      return;
    }
    if (Date.now() < state.wakeCooldownUntil) {
      return;
    }
    for (let i = event.resultIndex || 0; i < (event.results?.length || 0); i++) {
      const result = event.results[i];
      if (!result || !result.isFinal) {
        continue;
      }
      const transcript = String(result?.[0]?.transcript || "").trim();
      if (!wakeTranscriptHit(transcript)) {
        continue;
      }
      state.wakeCooldownUntil = Date.now() + 2200;
      stopWakeWordListener(true);
      setStatus("热词已唤醒，正在开麦...");
      if (!state.micOpen) {
        await toggleMicOpen();
      }
      return;
    }
  };
  state.wakeRecognition = wake;
  scheduleWakeWordStart(700);
}

function setupSpeechRecognition() {
  const hasLocalAsr =
    !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") &&
    !!(window.AudioContext || window.webkitAudioContext);
  state.localAsrAvailable = hasLocalAsr;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    state.recognitionAvailable = false;
    state.recognition = null;
    if (hasLocalAsr) {
      state.asrMode = "local_vosk";
    }
    updateMicButton();
    return;
  }

  const recog = new Recognition();
  recog.lang = "zh-CN";
  recog.continuous = true;
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  recog.onstart = () => {
    state.recognitionActive = true;
    state.micRetryCount = 0;
    if (state.micOpen && state.micSuspendDepth === 0) {
      setStatus("开麦中...");
    }
    updateMicButton();
  };
  recog.onerror = (event) => {
    state.recognitionActive = false;
    const code = String(event?.error || "");
    if (code === "not-allowed" || code === "service-not-allowed") {
      state.micOpen = false;
      setStatus("麦克风权限被拒绝");
    } else if (code === "audio-capture") {
      state.micRetryCount = Math.min(8, state.micRetryCount + 1);
      setStatus("麦克风不可用，请检查设备");
    } else if (code === "network") {
      state.micRetryCount = Math.min(8, state.micRetryCount + 1);
      setStatus("语音识别网络异常，正在重试");
    } else if (code && code !== "aborted" && code !== "no-speech") {
      state.micRetryCount = Math.min(8, state.micRetryCount + 1);
      setStatus("语音输入失败");
    }
    updateMicButton();
  };
  recog.onend = () => {
    state.recognitionActive = false;
    if (state.micOpen && state.micSuspendDepth === 0) {
      scheduleMicRecognitionStart(220);
      setStatus("开麦中...");
    } else {
      setStatus("待机");
    }
    updateMicButton();
  };
  recog.onresult = (event) => {
    for (let i = event.resultIndex || 0; i < (event.results?.length || 0); i++) {
      const result = event.results[i];
      if (!result || !result.isFinal) {
        continue;
      }
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) {
        enqueueMicTranscript(transcript, state.micSession);
      }
    }
  };

  state.recognition = recog;
  state.recognitionAvailable = true;
  if (state.localAsrAvailable) {
    // Prefer local Vosk ASR to avoid browser cloud recognition instability.
    state.asrMode = "local_vosk";
  } else {
    state.asrMode = "webspeech";
  }
  setupWakeWordRecognition(Recognition);
  updateMicButton();
}

async function streamAssistantReply(payload, onDelta, perfHooks = null) {
  const chatApi = window.TaffyModules?.chatApi || {};
  if (typeof chatApi.streamAssistantReply !== "function") {
    throw new Error("chatApi stream helper is not available");
  }
  return chatApi.streamAssistantReply(payload, onDelta, {
    authFetch,
    onCharacterRuntimeMetadata: handleCharacterRuntimeMetadata,
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
    const finalTalkStyle = resolveTalkStyle(message, visibleReply, mood, isAuto);
    state.currentTalkStyle = finalTalkStyle;
    state.speechAnimMood = mood;
    if (state.motionQuietDuringSpeech && state.speakingEnabled) {
      triggerExpressionPulse(finalTalkStyle, 0.4, 220);
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
        const prosody = buildSpeakProsody(speechText || visibleReply, mood, false, finalTalkStyle);
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
      const prosody = buildSpeakProsody(speechText || visibleReply, mood, false, finalTalkStyle);
      maybePlayTalkGesture(speechText || visibleReply, finalTalkStyle);
      await speak(speechText || visibleReply, {
        prosody,
        interrupt: false,
        mood,
        style: finalTalkStyle,
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
      const msg = `错误: ${err.message}`;
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

function snapshotPendingLocalAsr() {
  const chunks = Array.isArray(state.localAsrBuffers) ? state.localAsrBuffers.slice() : [];
  const speechMs = Number(state.localAsrSpeechMs) || 0;
  return { chunks, speechMs };
}

async function waitLocalAsrSendingDone(timeoutMs = 700) {
  const started = Date.now();
  while (state.localAsrSending && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

async function transcribeSnapshotAfterMicClose(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.chunks) || snapshot.chunks.length === 0) {
    return false;
  }
  const minCloseMs = Math.max(90, Math.min(state.localAsrMinSpeechMs || 180, 220));
  if ((Number(snapshot.speechMs) || 0) < minCloseMs) {
    return false;
  }
  try {
    const text = await transcribeLocalPcmChunks(snapshot.chunks);
    const corrected = applyAsrHotwordCorrections(text);
    if (!corrected) {
      return false;
    }
    let spins = 0;
    while (state.chatBusy && spins < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      spins += 1;
    }
    if (state.chatBusy) {
      return false;
    }
    await requestAssistantReply(corrected, {
      showUser: true,
      rememberUser: true,
      auto: false,
      silentError: false
    });
    return true;
  } catch (err) {
    console.warn("transcribeSnapshotAfterMicClose failed:", err);
    return false;
  }
}

async function toggleMicOpen() {
  if (state.micToggleBusy) {
    return;
  }
  if (!(state.recognitionAvailable || state.localAsrAvailable)) {
    setStatus("语音输入不可用");
    return;
  }
  state.micToggleBusy = true;
  try {
    if (state.micOpen) {
      let closeSnapshot = null;
      if (state.asrTranscribeOnClose && state.asrMode === "local_vosk") {
        await waitLocalAsrSendingDone(700);
        closeSnapshot = snapshotPendingLocalAsr();
      }
      stopMicLoop(true);
      if (closeSnapshot) {
        setStatus("关闭中，处理最后一句...");
        await transcribeSnapshotAfterMicClose(closeSnapshot);
      }
      setStatus("开麦已关闭");
      return;
    }
    await startMicLoop();
    if (state.micOpen) {
      if (state.asrMode === "local_vosk" && state.localAsrInputMuted) {
        setStatus("麦克风轨道被系统静音，请检查 Windows 输入设备、隐私权限或硬件静音键");
      } else {
        setStatus(state.micKeepListening ? "开麦已开启（通话模式）" : "开麦已开启");
      }
    }
  } finally {
    state.micToggleBusy = false;
    updateMicButton();
  }
}

function bindUI() {
  if ("speechSynthesis" in window) {
    ui.speakBtn.textContent = state.speakingEnabled ? "语音开" : "语音关";
  }
  if (ui.scheduleDatetime && !ui.scheduleDatetime.value) {
    ui.scheduleDatetime.value = buildDefaultScheduleDateTimeValue();
  }
  if (ui.voiceNextBtn) {
    ui.voiceNextBtn.disabled =
      isServerTTSProvider(state.ttsProvider)
        ? state.ttsServerVoices.length <= 1
        : state.ttsVoices.length <= 1;
  }
  updateObserveButton();
  updateLockButton();
  updateAutoChatButton();
  updateTranslationToggleButton();
  applySubtitleEnabledState();
  setAdvancedActionsExpanded(false);
  updateMicButton();
  renderScheduleList();
  renderPendingAttachments();
  syncLearningQuickSettingsUI();
  renderLearningReviewList();
  applySubtitlePositionFromState();
  bindSubtitleDragHandle();
  renderOnboardingStep();

  ui.sendBtn.addEventListener("click", sendChat);
  ui.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendChat();
    }
  });
  if (ui.attachBtn && ui.attachInput) {
    ui.attachBtn.addEventListener("click", () => {
      if (state.attachmentReadBusy) {
        setStatus("附件处理中，请稍等...");
        return;
      }
      ui.attachInput.click();
    });
    ui.attachInput.addEventListener("change", async () => {
      try {
        await handleAttachmentFiles(ui.attachInput.files);
      } finally {
        ui.attachInput.value = "";
      }
    });
  }

  ui.micBtn.addEventListener("click", async () => {
    await toggleMicOpen();
  });
  window.addEventListener("keydown", async (event) => {
    if (!event.ctrlKey) {
      if (event.key === "Escape" && isOnboardingOpen()) {
        event.preventDefault();
        closeOnboardingModal({ markSeen: true });
        return;
      }
      if (event.key === "Escape" && isHelpOpen()) {
        event.preventDefault();
        closeHelpModal();
        return;
      }
      if (event.key === "Escape" && isLearningReviewOpen()) {
        event.preventDefault();
        closeLearningReviewDrawer();
        return;
      }
      if (event.key === "Escape" && ui.personaModal && !ui.personaModal.hidden) {
        event.preventDefault();
        closePersonaPanel();
        return;
      }
      if (event.key === "Escape" && ui.scheduleModal && !ui.scheduleModal.hidden) {
        event.preventDefault();
        closeSchedulePanel();
      }
      return;
    }
    if (String(event.key || "").toLowerCase() !== "m") {
      return;
    }
    if (event.repeat) {
      return;
    }
    event.preventDefault();
    await toggleMicOpen();
  });

  ui.speakBtn.addEventListener("click", () => {
    state.speakingEnabled = !state.speakingEnabled;
    ui.speakBtn.textContent = state.speakingEnabled ? "语音开" : "语音关";
    if (!state.speakingEnabled) {
      stopAllAudioPlayback();
    }
  });

  if (ui.voiceNextBtn) {
    ui.voiceNextBtn.addEventListener("click", async () => {
      switchVoice();
      state.speakingEnabled = true;
      ui.speakBtn.textContent = "语音开";
      const ok = await speak("你好，我是新的音色。", { force: true });
      if (!ok) {
        setStatus("当前声线不可用");
      }
    });
  }

  if (ui.observeBtn) {
    ui.observeBtn.addEventListener("click", () => {
      if (!state.desktopCanCapture) {
        setStatus("桌面观察不可用");
        return;
      }
      state.observeDesktop = !state.observeDesktop;
      updateObserveButton();
      setStatus(state.observeDesktop ? "桌面观察已开启" : "桌面观察已关闭");
    });
  }

  if (ui.lockBtn) {
    ui.lockBtn.addEventListener("click", () => {
      if (
        state.desktopBridge !== "electron" ||
        !window.electronAPI ||
        typeof window.electronAPI.setWindowLock !== "function"
      ) {
        setStatus("桌面锁定仅在桌面版可用");
        updateLockButton();
        return;
      }
      const next = !state.windowLocked;
      setWindowLockedFromUI(next);
      setStatus(next ? "桌面已锁定" : "桌面已解锁");
    });
  }

  if (ui.autoChatBtn) {
    ui.autoChatBtn.addEventListener("click", () => {
      state.autoChatEnabled = !state.autoChatEnabled;
      updateAutoChatButton();
      if (state.autoChatEnabled) {
        startAutoChatLoop();
        setStatus("自动对话已开启");
      } else {
        stopAutoChatLoop();
        setStatus("自动对话已关闭");
      }
    });
  }

  if (ui.scheduleBtn) {
    ui.scheduleBtn.addEventListener("click", () => {
      if (ui.scheduleModal?.hidden) {
        openSchedulePanel();
      } else {
        closeSchedulePanel();
      }
    });
  }

  if (ui.moreBtn) {
    ui.moreBtn.addEventListener("click", () => {
      const expanded = ui.moreBtn.getAttribute("aria-expanded") === "true";
      setAdvancedActionsExpanded(!expanded);
    });
  }

  if (ui.personaBtn) {
    ui.personaBtn.addEventListener("click", () => {
      if (ui.personaModal?.hidden) {
        openPersonaPanel();
      } else {
        closePersonaPanel();
      }
    });
  }

  if (ui.learningReviewBtn) {
    ui.learningReviewBtn.addEventListener("click", () => {
      toggleLearningReviewDrawer();
    });
  }

  if (ui.followupReadinessBtn) {
    ui.followupReadinessBtn.addEventListener("click", () => {
      const visible = toggleFollowupReadinessPanel();
      updateFollowupCharacterChip();
      setStatus(visible ? "续话状态面板已打开" : "续话状态面板已隐藏");
    });
  }

  if (ui.learningReviewCloseBtn) {
    ui.learningReviewCloseBtn.addEventListener("click", () => {
      closeLearningReviewDrawer();
    });
  }

  if (ui.learningReviewBackdrop) {
    ui.learningReviewBackdrop.addEventListener("click", () => {
      closeLearningReviewDrawer();
    });
  }

  if (ui.learningReviewUndoBtn) {
    ui.learningReviewUndoBtn.addEventListener("click", async () => {
      try {
        await undoLearningLastStep();
      } catch (err) {
        setStatus(`撤销失败: ${err.message || err}`);
      }
    });
  }

  if (ui.translationToggleBtn) {
    ui.translationToggleBtn.addEventListener("click", () => {
      toggleChatTranslationVisibility();
    });
  }

  if (ui.subtitleToggleBtn) {
    ui.subtitleToggleBtn.addEventListener("click", () => {
      toggleSubtitleEnabled();
    });
  }

  if (ui.translationChipBtn) {
    ui.translationChipBtn.addEventListener("click", () => {
      toggleChatTranslationVisibility();
    });
  }

  if (ui.helpBtn) {
    ui.helpBtn.addEventListener("click", () => {
      if (isHelpOpen()) {
        closeHelpModal();
      } else {
        openHelpModal();
      }
    });
  }

  if (ui.helpCloseBtn) {
    ui.helpCloseBtn.addEventListener("click", () => {
      closeHelpModal();
    });
  }

  if (ui.helpModal) {
    ui.helpModal.addEventListener("click", (event) => {
      if (event.target === ui.helpModal) {
        closeHelpModal();
      }
    });
  }

  if (ui.helpOpenOnboardingBtn) {
    ui.helpOpenOnboardingBtn.addEventListener("click", () => {
      openOnboardingModal({ resetStep: true });
    });
  }

  if (ui.onboardingSkipBtn) {
    ui.onboardingSkipBtn.addEventListener("click", () => {
      closeOnboardingModal({ markSeen: true });
    });
  }

  if (ui.onboardingQuickBtn) {
    ui.onboardingQuickBtn.addEventListener("click", () => {
      closeOnboardingModal({ markSeen: true });
      setStatus("已进入立即体验模式");
    });
  }

  if (ui.onboardingAdvancedBtn) {
    ui.onboardingAdvancedBtn.addEventListener("click", () => {
      closeOnboardingModal({ markSeen: true });
      setStatus("正在打开高级配置中心");
      openAdvancedConfigCenter();
    });
  }

  if (ui.onboardingPrevBtn) {
    ui.onboardingPrevBtn.addEventListener("click", () => {
      moveOnboardingStep(-1);
    });
  }

  if (ui.onboardingNextBtn) {
    ui.onboardingNextBtn.addEventListener("click", () => {
      moveOnboardingStep(1);
    });
  }

  if (ui.onboardingDoneBtn) {
    ui.onboardingDoneBtn.addEventListener("click", () => {
      closeOnboardingModal({ markSeen: true });
      setStatus("新手引导已完成");
    });
  }

  if (ui.onboardingModal) {
    ui.onboardingModal.addEventListener("click", (event) => {
      if (event.target === ui.onboardingModal) {
        closeOnboardingModal({ markSeen: true });
      }
    });
  }

  if (ui.learningTabCandidates) {
    ui.learningTabCandidates.addEventListener("click", () => {
      learningReviewState.activeTab = "candidates";
      renderLearningReviewList();
    });
  }

  if (ui.learningTabSamples) {
    ui.learningTabSamples.addEventListener("click", () => {
      learningReviewState.activeTab = "samples";
      renderLearningReviewList();
    });
  }

  if (ui.learningTabDebug) {
    ui.learningTabDebug.addEventListener("click", async () => {
      learningReviewState.activeTab = "debug";
      renderLearningReviewList();
      try {
        await reloadMemoryDebugData();
      } catch (err) {
        setStatus(`Memory debug failed: ${err.message || err}`);
      }
    });
  }

  for (const filterInput of [
    ui.learningFilterScore,
    ui.learningFilterConfidence,
    ui.learningFilterKeyword
  ]) {
    if (!filterInput) {
      continue;
    }
    filterInput.addEventListener("input", () => {
      renderLearningReviewList();
    });
  }

  if (ui.learningSortMode) {
    ui.learningSortMode.value = learningReviewState.sortMode;
    ui.learningSortMode.addEventListener("change", () => {
      learningReviewState.sortMode = String(ui.learningSortMode?.value || "score_desc");
      renderLearningReviewList();
    });
  }

  if (ui.learningFilterHighBtn) {
    ui.learningFilterHighBtn.addEventListener("click", () => {
      applyLearningHighScorePreset();
    });
  }

  if (ui.learningFilterResetBtn) {
    ui.learningFilterResetBtn.addEventListener("click", () => {
      resetLearningFilters();
    });
  }

  if (ui.learningReloadBtn) {
    ui.learningReloadBtn.addEventListener("click", async () => {
      try {
        await reloadLearningReviewData();
      } catch (err) {
        setStatus(`重读失败: ${err.message || err}`);
      }
    });
  }

  if (ui.learningQuickApplyBtn) {
    ui.learningQuickApplyBtn.addEventListener("click", async () => {
      try {
        await applyLearningQuickSettings();
      } catch (err) {
        setStatus(`快捷开关更新失败: ${err.message || err}`);
      }
    });
  }

  if (ui.learningSelectAll) {
    ui.learningSelectAll.addEventListener("change", () => {
      const selectedSet = getLearningSelectedSet();
      const filteredItems = getLearningFilteredItems();
      if (ui.learningSelectAll.checked) {
        filteredItems.forEach((item) => selectedSet.add(item.id));
      } else {
        filteredItems.forEach((item) => selectedSet.delete(item.id));
      }
      renderLearningReviewList();
    });
  }

  if (ui.learningBatchDeleteBtn) {
    ui.learningBatchDeleteBtn.addEventListener("click", async () => {
      try {
        await runLearningBatchAction("delete");
      } catch (err) {
        setStatus(`批量删除失败: ${err.message || err}`);
      }
    });
  }

  if (ui.learningBatchUpBtn) {
    ui.learningBatchUpBtn.addEventListener("click", async () => {
      try {
        await runLearningBatchAction("weight_up");
      } catch (err) {
        setStatus(`批量升权失败: ${err.message || err}`);
      }
    });
  }

  if (ui.learningBatchDownBtn) {
    ui.learningBatchDownBtn.addEventListener("click", async () => {
      try {
        await runLearningBatchAction("weight_down");
      } catch (err) {
        setStatus(`批量降权失败: ${err.message || err}`);
      }
    });
  }

  if (ui.learningBatchPromoteBtn) {
    ui.learningBatchPromoteBtn.addEventListener("click", async () => {
      try {
        await runLearningBatchAction("promote");
      } catch (err) {
        setStatus(`批量晋升失败: ${err.message || err}`);
      }
    });
  }

  if (ui.learningReviewList) {
    ui.learningReviewList.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (!target.classList.contains("learning-check")) {
        return;
      }
      const id = String(target.dataset.id || "").trim();
      if (!id) {
        return;
      }
      const selectedSet = getLearningSelectedSet();
      if (target.checked) {
        selectedSet.add(id);
      } else {
        selectedSet.delete(id);
      }
      renderLearningReviewList();
    });

    ui.learningReviewList.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }
      const action = String(target.dataset.action || "").trim();
      const id = String(target.dataset.id || "").trim();
      if (!action || !id) {
        return;
      }
      try {
        await runLearningSingleAction(action, id);
      } catch (err) {
        setStatus(`操作失败: ${err.message || err}`);
      }
    });
  }

  if (ui.scheduleCloseBtn) {
    ui.scheduleCloseBtn.addEventListener("click", () => {
      closeSchedulePanel();
    });
  }

  if (ui.scheduleModal) {
    ui.scheduleModal.addEventListener("click", (event) => {
      if (event.target === ui.scheduleModal) {
        closeSchedulePanel();
      }
    });
  }

  if (ui.personaCloseBtn) {
    ui.personaCloseBtn.addEventListener("click", () => {
      closePersonaPanel();
    });
  }

  if (ui.personaModal) {
    ui.personaModal.addEventListener("click", (event) => {
      if (event.target === ui.personaModal) {
        closePersonaPanel();
      }
    });
  }

  if (ui.personaSaveBtn) {
    ui.personaSaveBtn.addEventListener("click", async () => {
      await savePersonaCardFromForm();
    });
  }

  if (ui.personaPreviewBtn) {
    ui.personaPreviewBtn.addEventListener("click", () => {
      setStatus("预览提示：保存后会在接下来的对话中逐步生效");
    });
  }

  if (ui.personaAvatarChangeBtn && ui.personaAvatarInput) {
    ui.personaAvatarChangeBtn.addEventListener("click", () => {
      ui.personaAvatarInput.click();
    });
  }

  if (ui.personaAvatarInput) {
    ui.personaAvatarInput.addEventListener("change", async () => {
      try {
        const file = ui.personaAvatarInput.files && ui.personaAvatarInput.files[0];
        if (!file) {
          return;
        }
        await setAssistantAvatarFromFile(file);
      } catch (err) {
        setStatus(`头像更新失败: ${err.message || err}`);
      } finally {
        ui.personaAvatarInput.value = "";
      }
    });
  }

  if (ui.personaAvatarResetBtn) {
    ui.personaAvatarResetBtn.addEventListener("click", () => {
      applyAssistantAvatar(ASSISTANT_AVATAR_DEFAULT);
      setStatus("已恢复默认头像");
    });
  }

  if (ui.personaApplyBtn) {
    ui.personaApplyBtn.addEventListener("click", async () => {
      const ok = await savePersonaCardFromForm();
      if (ok) {
        setStatus("人设卡已应用");
      }
    });
  }

  if (ui.personaImportTemplateBtn) {
    ui.personaImportTemplateBtn.addEventListener("click", () => {
      applyPersonaTemplateDraft();
    });
  }

  if (ui.personaRandomBtn) {
    ui.personaRandomBtn.addEventListener("click", () => {
      applyRandomPersonaDraft();
    });
  }

  if (ui.personaResetBtn) {
    ui.personaResetBtn.addEventListener("click", () => {
      resetPersonaDraft();
    });
  }

  for (const field of [
    ui.personaIdentity,
    ui.personaPreferences,
    ui.personaDislikes,
    ui.personaTopics,
    ui.personaReplyStyle,
    ui.personaCompanionshipStyle
  ]) {
    if (!field) {
      continue;
    }
    field.addEventListener("keydown", async (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        await savePersonaCardFromForm();
      }
    });
  }

  if (ui.scheduleSaveBtn) {
    ui.scheduleSaveBtn.addEventListener("click", () => {
      saveScheduleFromForm();
    });
  }

  if (ui.scheduleTask) {
    ui.scheduleTask.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        saveScheduleFromForm();
      }
    });
  }

  if (ui.idleBtn) {
    ui.idleBtn.addEventListener("click", () => {
      enqueueActionIntent("tap", { combo: true });
      scheduleIdleMotionLoop();
    });
  }

  setTimeout(() => {
    maybeAutoOpenOnboarding();
  }, 180);
}

if (window.electronAPI?.onSubtitle) {
  window.electronAPI.onSubtitle(({ id, en, zh }) => {
    state.subtitleId = id;
    if (!state.subtitleEnabled) {
      _clearSubtitleDOM(id, true);
      return;
    }
    _applySubtitleDOM(en || "", zh || "");
  });
  window.electronAPI.onSubtitleHide(({ id }) => {
    _clearSubtitleDOM(id);
  });
}

window.addEventListener("character-runtime:update", (event) => {
  try {
    applyCharacterRuntimeEmotionToLive2D(event?.detail || null);
    applyCharacterRuntimeActionToLive2D(event?.detail || null);
  } catch (_) {
    // Keep runtime bridge isolated from chat main flow.
  }
});
installCharacterRuntimeWindowBridge();
installCharacterRuntimeDebugBridge();
installTTSDebugBridge();
installTranslateDebugBridge();

async function main() {
  setStatus("启动中...");
  try {
    refreshDesktopBridgeReady();
    await initWindowLockBridge();
    if (state.desktopMode && !state.desktopCanMoveWindow && !state.windowLocked) {
      setTimeout(refreshDesktopBridgeReady, 350);
      setTimeout(refreshDesktopBridgeReady, 900);
      setTimeout(refreshDesktopBridgeReady, 1600);
    }
    await loadConfig();
    try {
      await resolveApiToken(true);
    } catch (_) {
      // ignore and let authFetch retry on first 401
    }
    initAssistantAvatar();
    loadChatTranslationVisibilityFromStorage();
    loadSubtitleEnabledFromStorage();
    loadSubtitlePositionFromStorage();
    loadOnboardingSeenFromStorage();
    await loadPersonaCard();
    if (state.uiView === "model") {
      await ensureLive2DRuntime();
      await initLive2D();
      startModelMouseGazePolling();
      try {
        const ch = new BroadcastChannel("taffy-speech");
        ch.onmessage = (e) => {
          const d = e.data;
          if (!d || d.type !== "speech") return;
          state._broadcastSpeechUpdatedAt = performance.now();
          state.speechMouthOpen = Number(d.mouthOpen) || 0;
          state.speechAnimMood = String(d.mood || "idle");
          state.speechAnimUntil = Number(d.animUntil) || 0;
          state._broadcastSpeaking = !!d.speaking;
          state.ttsAudioLevel = Number(d.audioLevel) || 0;
          if (d.moodHoldUntil) state.moodHoldUntil = Number(d.moodHoldUntil);
        };
      } catch (_) {}
      setStatus("待机");
      return;
    }

    if (state.uiView === "chat") {
      if (!isServerTTSProvider(state.ttsProvider)) {
        initTTS();
      }
      setupSpeechRecognition();
      bindUI();
      startFollowupCharacterChipRefresh();
      startReminderLoop();
      runReminderCheck();
      try {
        state._speechBroadcast = new BroadcastChannel("taffy-speech");
        (function chatSpeechBroadcastLoop() {
          const speaking = isSpeechMotionActive();
          const mouthOpen = getSpeechAnimationMouthOpen();
          try {
            state._speechBroadcast.postMessage({
              type: "speech",
              mouthOpen: mouthOpen,
              mood: state.speechAnimMood || "idle",
              speaking: speaking,
              animUntil: state.speechAnimUntil || 0,
              animStartedAt: state.speechAnimStartedAt || 0,
              animDurationMs: state.speechAnimDurationMs || 0,
              audioLevel: state.ttsAudioLevel || 0,
              moodHoldUntil: state.moodHoldUntil || 0
            });
          } catch (_) {}
          requestAnimationFrame(chatSpeechBroadcastLoop);
        }());
      } catch (_) {}
      setStatus("待机");
      return;
    }

    await ensureLive2DRuntime();
    await initLive2D();
    if (!isServerTTSProvider(state.ttsProvider)) {
      initTTS();
    }
    setupSpeechRecognition();
    bindUI();
    startFollowupCharacterChipRefresh();
    startReminderLoop();
    runReminderCheck();
    if (state.model) {
      setStatus("待机");
    }
  } catch (err) {
    console.error(err);
    setStatus("启动失败");
    appendMessage("assistant", `启动错误: ${err.message}`);
  }
}

window.addEventListener("beforeunload", () => {
  closeLearningReviewDrawer();
  resetActionSystem();
  stopIdleMotionLoop();
  if (state.followupCharacterChipRefreshTimer) {
    clearInterval(state.followupCharacterChipRefreshTimer);
    state.followupCharacterChipRefreshTimer = 0;
  }
  stopAutoChatLoop();
  stopProactiveSchedulerPolling("beforeunload");
  stopMicLoop(true);
  stopWakeWordListener();
  if (state.reminderTimer) {
    clearInterval(state.reminderTimer);
    state.reminderTimer = 0;
  }
  if (typeof state.windowLockUnsubscribe === "function") {
    try {
      state.windowLockUnsubscribe();
    } catch (_) {
      // ignore
    }
    state.windowLockUnsubscribe = null;
  }
});

main();
