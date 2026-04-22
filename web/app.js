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
  observeAttachMode: "always",
  observeAllowAutoChat: false,
  autoChatEnabled: false,
  autoChatMinMs: 180000,
  autoChatMaxMs: 480000,
  autoChatTimer: 0,
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
  serverTTSFallbackToBrowser: false,
  ttsAudio: null,
  ttsLastGoodVoiceName: "",
  streamSpeakEnabled: true,
  streamSpeakMode: "realtime",
  gptSovitsRealtimeTTS: false,
  streamSpeakIdleWaitMs: 150,
  streamSpeakQueue: [],
  streamSpeakWorking: false,
  streamSpeakBuffer: "",
  streamSpeakSession: 0,
  streamSpeakLastEnqueueSession: 0,
  speechAnimUntil: 0,
  speechAnimStartedAt: 0,
  speechAnimDurationMs: 0,
  speechAnimSeed: 0,
  speechAnimTextLength: 0,
  speechAnimPunctuation: 0,
  speechAnimStyle: "neutral",
  speechAnimMood: "idle",
  speechMouthOpen: 0,
  microBlinkUntil: 0,
  microNextBlinkAt: 0,
  microGazeTargetX: 0,
  microGazeTargetY: 0,
  microGazeCurrentX: 0,
  microGazeCurrentY: 0,
  microNextGazeAt: 0,
  microBreathSeed: 0,
  ttsAudioContext: null,
  ttsDecodeContext: null,
  ttsAudioSourceNode: null,
  ttsAudioAnalyser: null,
  ttsAudioAnalyserData: null,
  ttsAudioLevel: 0,
  historyMaxMessages: 64,
  currentTalkStyle: "neutral",
  styleAutoEnabled: true,
  manualTalkStyle: "neutral",
  motionEnabled: true,
  motionCooldownMs: 1200,
  motionCooldownUntil: 0,
  speakingMotionCooldownMs: 1600,
  speakingMotionCooldownUntil: 0,
  idleMotionEnabled: true,
  idleMotionMinMs: 12000,
  idleMotionMaxMs: 24000,
  idleMotionTimer: 0,
  motionDefinitions: {},
  availableMotionGroups: [],
  lastMotionGroup: "",
  motionIntensity: "normal",
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
  micKeepListening: true,
  asrTranscribeOnClose: true,
  asrMode: "local_vosk",
  localAsrAvailable: false,
  localAsrRunning: false,
  localAsrStream: null,
  localAsrContext: null,
  localAsrSource: null,
  localAsrProcessor: null,
  localAsrSpeeching: false,
  localAsrSpeechMs: 0,
  localAsrSilenceMs: 0,
  localAsrBuffers: [],
  localAsrSending: false,
  localAsrAbortController: null,
  localAsrMinSpeechMs: 180,
  localAsrSilenceTriggerMs: 380,
  localAsrMaxSpeechMs: 2400,
  localAsrSpeechThreshold: 0.009,
  localAsrNoiseFloor: 0.004,
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
  suspendRelayoutUntil: 0,
  resizeRaf: 0,
  layoutWidth: 0,
  layoutHeight: 0,
  pendingAttachments: [],
  attachmentReadBusy: false
};
window.__petState = state;

const ui = {
  status: document.getElementById("status"),
  assistantName: document.getElementById("assistant-name"),
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
  personaCloseBtn: document.getElementById("persona-close-btn"),
  personaIdentity: document.getElementById("persona-identity"),
  personaPreferences: document.getElementById("persona-preferences"),
  personaDislikes: document.getElementById("persona-dislikes"),
  personaTopics: document.getElementById("persona-topics"),
  personaReplyStyle: document.getElementById("persona-reply-style"),
  personaCompanionshipStyle: document.getElementById("persona-companionship-style"),
  personaSaveBtn: document.getElementById("persona-save-btn")
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
const MAX_CHAT_HISTORY_RECORDS = 240;
const TOOL_META_MARKER = "[[TAFFY_TOOL_META]]";
const PERSONA_CARD_DEFAULT = {
  identity: "",
  user_preferences: "",
  user_dislikes: "",
  common_topics: "",
  reply_style: "",
  companionship_style: "",
  updated_at: ""
};
const AUTO_CHAT_PROMPTS = [
  // 无特定时间
  "请你主动发起一句简短对话，像真人朋友那样自然开口，不要说'我来找你聊天'之类的。",
  "请你主动说一句话，可以是感慨、问一个问题、或随口说件事，保持简短自然。",
  "请你主动开口，可以是关心、闲聊、或提一个小话题，一两句就好。",
  "请你主动说一句关心的话，不要太正式，像朋友随口说的那种。",
  "请你主动提起一件最近聊过或觉得有意思的事，简短自然。",
  "请你随口说一句话，可以是吐槽、好奇、或突然想到的事，不超过两句。",
];
const WAITING_VOICE_HINTS = [
  "嗯，我在想，马上回你。",
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
const STYLE_EXPRESSION_PROFILE = {
  comfort: {
    mouthForm: 0.14,
    cheek: 0.18,
    eyeSmile: 0.16,
    browY: 0.05,
    browAngle: 0.03,
    headX: -0.35,
    headY: 0.2,
    bodyX: -0.25,
    floatScale: 0.92
  },
  clear: {
    mouthForm: -0.05,
    cheek: 0.03,
    eyeSmile: 0.02,
    browY: 0.08,
    browAngle: -0.06,
    headX: 0.18,
    headY: -0.14,
    bodyX: 0.24,
    floatScale: 0.82
  },
  playful: {
    mouthForm: 0.28,
    cheek: 0.32,
    eyeSmile: 0.26,
    browY: 0.02,
    browAngle: 0.06,
    headX: 0.56,
    headY: -0.1,
    bodyX: 0.36,
    floatScale: 1.18
  },
  steady: {
    mouthForm: -0.12,
    cheek: -0.02,
    eyeSmile: 0.0,
    browY: -0.05,
    browAngle: -0.12,
    headX: -0.08,
    headY: -0.18,
    bodyX: -0.24,
    floatScale: 0.74
  },
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
  /(看|看到|看见|桌面|屏幕|画面|截图|图里|图片|界面|识别|观察|what do you see|look at|screen|desktop|screenshot|image)/i;

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
  if (state.desktopCanCapture && !state.observeDesktop) {
    state.observeDesktop = true;
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
    const row = createMessageRow(item.role, item.content, { timestamp });
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
  if (ui.personaModal && !ui.personaModal.hidden) {
    closePersonaPanel();
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

async function loadPersonaCard() {
  if (!ui.personaModal) {
    state.personaCard = normalizePersonaCardData(PERSONA_CARD_DEFAULT);
    return state.personaCard;
  }
  try {
    const resp = await fetch("/api/persona_card", { cache: "no-store" });
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
  if (ui.scheduleModal && !ui.scheduleModal.hidden) {
    closeSchedulePanel();
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
    const resp = await fetch("/api/persona_card", {
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
    empty.textContent = "还没有日程。你可以设置某个时间点让 Taffy 主动说话、提醒你，或直接执行工具任务。";
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
    setStatus("请先写下让 Taffy 做什么");
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
    angry: "紧绷",
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

async function handleLocalCommand(inputText) {
  const text = String(inputText || "").trim();
  if (!text.startsWith("/")) {
    return false;
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
    appendMessage("assistant", ok ? "已取消提醒。" : "未找到该提醒ID。");
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
  const pct = Math.round(v * 100);
  ui.micMeterFill.style.width = `${pct}%`;

  if (!state.micOpen) {
    ui.micMeterText.textContent = "未开麦";
  } else if (state.micSuspendDepth > 0) {
    ui.micMeterText.textContent = "暂停";
  } else if (pct < 8) {
    ui.micMeterText.textContent = "静音";
  } else if (pct < 28) {
    ui.micMeterText.textContent = "低";
  } else if (pct < 60) {
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
    ui.micBtn.textContent = state.localAsrRunning ? "开麦: 开" : "开麦: 连接中";
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
  const resp = await fetch("/api/asr_pcm", {
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
  const normalizedLevel = Math.max(0, Math.min(1, rms / 0.07));
  state.micLevel = state.micLevel * 0.72 + normalizedLevel * 0.28;
  updateMicMeter(state.micLevel);

  const baseThreshold = clampNumber(state.localAsrSpeechThreshold || 0.009, 0.003, 0.05);
  const adaptiveThreshold = Math.max(
    baseThreshold,
    clampNumber(state.localAsrNoiseFloor * 2.4 + 0.002, 0.003, 0.03)
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
  if (state.localAsrProcessor) {
    try {
      state.localAsrProcessor.disconnect();
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
  state.localAsrRunning = false;
  state.localAsrSpeeching = false;
  state.localAsrSpeechMs = 0;
  state.localAsrSilenceMs = 0;
  state.localAsrBuffers = [];
  state.localAsrNoiseFloor = 0.004;
  state.micLevel = 0;
  updateMicMeter(0);
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
    stream = await media.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        latency: 0,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
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

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(state.localAsrProcessorBufferSize || 2048, 1, 1);
  const sessionToken = token;
  processor.onaudioprocess = (evt) => {
    if (sessionToken !== state.micSession) {
      return;
    }
    if (!state.micOpen || state.micSuspendDepth > 0) {
      return;
    }
    const input = evt.inputBuffer.getChannelData(0);
    handleLocalAsrFrame(input, ctx.sampleRate, sessionToken);
  };
  source.connect(processor);
  processor.connect(ctx.destination);
  if (sessionToken !== state.micSession || !state.micOpen) {
    try {
      processor.disconnect();
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
  state.localAsrRunning = true;
  state.localAsrSpeeching = false;
  state.localAsrSpeechMs = 0;
  state.localAsrSilenceMs = 0;
  state.localAsrBuffers = [];
  state.localAsrNoiseFloor = 0.004;
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

function buildAutoChatPrompt() {
  const hour = new Date().getHours();
  const idx = Math.floor(Math.random() * AUTO_CHAT_PROMPTS.length);
  const base = AUTO_CHAT_PROMPTS[idx] || AUTO_CHAT_PROMPTS[0];
  return `（现在是${hour}点）${base}`;
}

function scheduleNextAutoChat() {
  if (!state.autoChatEnabled) return;
  const minMs = Math.max(60000, state.autoChatMinMs || 180000);
  const maxMs = Math.max(minMs + 30000, state.autoChatMaxMs || 480000);
  const delay = Math.round(minMs + Math.random() * (maxMs - minMs));
  state.autoChatTimer = setTimeout(() => {
    if (!state.autoChatEnabled) return;
      if (!shouldSkipAutoChat()) {
        requestAssistantReply(buildAutoChatPrompt(), {
          showUser: false,
          rememberUser: false,
          rememberAssistant: false,
          auto: true,
          silentError: true
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
    return { visibleText: src, meta: null };
  }
  const visibleText = src.slice(0, idx).trimEnd();
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

function applyMessagePayload(row, text) {
  const target = row?.querySelector(".content");
  if (!target) {
    return;
  }
  const payload = parseToolMetaFromText(text);
  target.textContent = String(payload.visibleText || "");
  if (row.classList.contains("assistant")) {
    renderToolMetaCards(row, payload.meta);
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

function createMessageRow(role, text, options = {}) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const assistantName = state.config?.assistant_name || "Hiyori";
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
  applyMessagePayload(row, text);
  if (options.hideTimestamp !== true) {
    setMessageTimestamp(row, options.timestamp || Date.now());
  }
  return row;
}

function setMessageText(row, text) {
  applyMessagePayload(row, text);
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
    hideTimestamp: options.hideTimestamp === true
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
  setMessageText(row, content);
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
    removeBtn.textContent = "×";
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
  const plain = parseToolMetaFromText(text).visibleText;
  return String(plain || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[【】\[\]{}<>]/g, " ")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/([。！？!?，,、])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const src = String(seg || "").trim();
  if (!src) {
    return "";
  }
  if (src.length < 24 || /[，,、]/.test(src)) {
    return src;
  }
  let pivot = Math.floor(src.length * 0.5);
  pivot = Math.max(7, Math.min(src.length - 6, pivot));
  return `${src.slice(0, pivot)}，${src.slice(pivot)}`;
}

function colloquializeSpeakText(text) {
  let out = String(text || "").trim();
  if (!out) {
    return "";
  }
  out = out
    .replace(/作为AI[^，。！？!?]*[，。！？!?]?/gi, "")
    .replace(/作为一个AI[^，。！？!?]*[，。！？!?]?/gi, "")
    .replace(/根据你的描述/g, "按你刚说的")
    .replace(/您可以/g, "你可以")
    .replace(/可以考虑/g, "可以直接")
    .replace(/请注意[，,:：]?\s*/g, "要注意，")
    .replace(/\b您\b/g, "你")
    .replace(/首先[，,:：]?\s*/g, "先说重点，")
    .replace(/其次[，,:：]?\s*/g, "另外，")
    .replace(/最后[，,:：]?\s*/g, "最后，")
    .replace(/综上所述[，,:：]?\s*/g, "简单说，")
    .replace(/总而言之[，,:：]?\s*/g, "简单说，")
    .replace(/建议你/g, "你可以")
    .replace(/建议您/g, "你可以")
    .replace(/需要注意的是[，,:：]?\s*/g, "要注意，")
    .replace(/与此同时[，,:：]?\s*/g, "同时，")
    .replace(/因此[，,:：]?\s*/g, "所以，")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

function simplifySpeechDeliveryText(text, style = "neutral", streamMode = false) {
  let out = String(text || "").trim();
  if (!out) {
    return "";
  }
  out = out
    .replace(/[~～]/g, "")
    .replace(/[（(][^()（）\n]{0,24}[)）]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/^(嗯哼|嗯呢|诶|欸|啊|呃)[，,\s]+/g, "")
    .replace(/(我给你|给你)(倒|递|拿)([^，。！？!?]{0,10})(可乐|咖啡|奶茶|热可可|水)/g, "")
    .replace(/刚(吃|啃|喝|刷)([^，。！？!?]{0,12})/g, "")
    .replace(/(虚拟|电子|赛博)/g, "")
    .replace(/(嘿嘿|哼哼|呀呀|啦啦)/g, "")
    .replace(/总之[，,、]?/g, "")
    .replace(/简单说[，,、]?/g, "")
    .replace(/先说重点[，,、]?/g, "")
    .replace(/\s+/g, " ")
    .replace(/，{2,}/g, "，")
    .replace(/[。！？!?]{2,}/g, "。")
    .trim();

  if (streamMode) {
    out = out
      .replace(/[：:]/g, "，")
      .replace(/[；;]/g, "，");
  }

  if (style === "clear") {
    out = out
      .replace(/你可以直接/g, "你直接")
      .replace(/你可以先/g, "你先");
  }

  out = out.replace(/^[，,。！？!?]+|[，,。！？!?]+$/g, "").trim();
  return out;
}


function tightenMinorSpeechPauses(text, streamMode = false) {
  let out = String(text || "").trim();
  if (!out) {
    return "";
  }
  if (!streamMode) {
    return out.replace(/\s+/g, " ").trim();
  }
  const compactLen = out.replace(/\s+/g, "").length;
  if (compactLen <= 10) {
    // Streaming short chunks should avoid long comma pauses.
    out = out.replace(/[，,、]/g, "");
  } else if (compactLen <= 18) {
    out = out.replace(/[，,、]/g, "，").replace(/，{2,}/g, "，");
  } else if (compactLen <= 28) {
    out = out.replace(/([，,、])(?=[^，,、。！？!?]{1,4}[。！？!?]?$)/g, "");
  }
  out = out.replace(/\s+/g, " ").trim();
  return out;
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

  if (/(难过|伤心|焦虑|崩溃|压力|失眠|害怕|委屈|心累|痛苦|失落|难受|不舒服)/.test(src)) {
    score.comfort += 5;
  }
  if (/(报错|错误|bug|代码|修复|排查|步骤|教程|配置|接口|api|命令|运行|性能|延迟|怎么做|如何)/.test(src)) {
    score.clear += 5;
  }
  if (/(紧急|立刻|马上|严肃|认真|上线|故障|事故|必须|优先)/.test(src)) {
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

function triggerExpressionPulse(style = "neutral", boost = 1, durationMs = 520) {
  const now = performance.now();
  state.expressionStyle = normalizeTalkStyle(style);
  state.expressionPulseBoost = clampNumber(Number(boost) || 1, 0.2, 2.2);
  state.expressionPulseUntil = now + Math.max(120, Number(durationMs) || 520);
}

function estimateSpeechAnimationDurationMs(text, style = "neutral") {
  const cleaned = sanitizeSpeakText(text);
  const chars = cleaned.length;
  const punct = (cleaned.match(/[，。！？!?；;、]/g) || []).length;
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
  state.speechAnimPunctuation = (cleaned.match(/[，。！？!?；;、]/g) || []).length;
  state.speechAnimStyle = normalizeTalkStyle(style || state.currentTalkStyle || "neutral");
  state.speechAnimMood = String(mood || detectMood(cleaned) || "idle");
}

function endSpeechAnimation() {
  state.speechAnimUntil = 0;
  state.speechAnimStartedAt = 0;
  state.speechAnimDurationMs = 0;
  state.speechMouthOpen = 0;
  state.ttsAudioLevel = 0;
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
      state.ttsAudioAnalyser.smoothingTimeConstant = 0.72;
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
    state.ttsAudioLevel += (0 - state.ttsAudioLevel) * 0.24;
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
    const normalized = clampNumber((rms - 0.012) / 0.16, 0, 1);
    state.ttsAudioLevel += (normalized - state.ttsAudioLevel) * 0.45;
  } catch (_) {
    state.ttsAudioLevel += (0 - state.ttsAudioLevel) * 0.24;
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
  const style = normalizeTalkStyle(state.currentTalkStyle || state.expressionStyle || "neutral");
  const mood = String(state.speechAnimMood || "idle");
  const speaking = isSpeakingNow() || state.streamSpeakWorking;
  const blinkLength = speaking ? 110 : 150;
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
  const breath = Math.sin(now / 1050 + state.microBreathSeed) * 0.5 + 0.5;
  const sway = Math.sin(now / 860 + state.microBreathSeed * 0.7);
  const ribbon = Math.sin(now / 930 + state.microBreathSeed * 1.3);
  const hair = Math.sin(now / 780 + state.microBreathSeed * 1.9);
  const breathGain = speaking ? 0.24 : 0.46;
  const styleGain = style === "comfort" ? 1.08 : (style === "playful" ? 1.15 : 1);
  const breathShift = (breath - 0.5) * breathGain * styleGain;
  const bodySway = sway * 0.18 * (speaking ? 0.75 : 1);
  safeAddParamValue(core, "ParamEyeLOpen", -blink * 0.82, 0.96);
  safeAddParamValue(core, "ParamEyeROpen", -blink * 0.82, 0.96);
  safeAddParamValue(core, "ParamEyeBallX", state.microGazeCurrentX, 0.45);
  safeAddParamValue(core, "ParamEyeBallY", state.microGazeCurrentY, 0.45);
  safeAddParamValue(core, "ParamAngleX", state.microGazeCurrentX * 5.8, 0.18);
  safeAddParamValue(core, "ParamAngleY", (-state.microGazeCurrentY * 4.4) + breathShift * 1.4, 0.18);
  safeAddParamValue(core, "ParamAngleZ", sway * 1.2, 0.12);
  safeAddParamValue(core, "ParamBodyAngleX", state.microGazeCurrentX * 2.2 + breathShift * 1.1, 0.12);
  safeAddParamValue(core, "ParamBodyAngleY", breathShift * 0.8, 0.11);
  safeAddParamValue(core, "ParamBodyAngleZ", bodySway * 5.4, 0.1);
  safeAddParamValue(core, "ParamBreath", 0.22 + breath * 0.42, 0.2);
  safeAddParamValue(core, "ParamShoulder", 0.08 + breath * 0.18, 0.14);
  safeAddParamValue(core, "ParamHairAhoge", hair * 0.18 + breath * 0.12, 0.16);
  safeAddParamValue(core, "ParamHairFront", hair * 0.12, 0.12);
  safeAddParamValue(core, "ParamHairBack", -hair * 0.1, 0.1);
  safeAddParamValue(core, "ParamRibbon", ribbon * 0.1, 0.1);
  safeAddParamValue(core, "ParamSkirt", -sway * 0.08, 0.08);
  safeAddParamValue(core, "ParamSkirt2", sway * 0.06, 0.08);
  if (mood === "happy") {
    safeAddParamValue(core, "ParamCheek", 0.03 + breath * 0.01, 0.24);
    safeAddParamValue(core, "ParamBrowLForm", 0.05, 0.24);
    safeAddParamValue(core, "ParamBrowRForm", 0.05, 0.24);
  } else if (mood === "sad") {
    safeAddParamValue(core, "ParamAngleY", 0.04, 0.16);
    safeAddParamValue(core, "ParamShoulder", -0.06, 0.14);
    safeAddParamValue(core, "ParamBrowLX", -0.02, 0.16);
    safeAddParamValue(core, "ParamBrowRX", 0.02, 0.16);
    safeAddParamValue(core, "ParamBrowLForm", -0.06, 0.18);
    safeAddParamValue(core, "ParamBrowRForm", -0.06, 0.18);
  } else if (mood === "angry") {
    safeAddParamValue(core, "ParamBrowLY", -0.08, 0.18);
    safeAddParamValue(core, "ParamBrowRY", -0.08, 0.18);
    safeAddParamValue(core, "ParamBodyAngleZ", Math.sin(now / 140) * 2.2, 0.08);
  } else if (mood === "surprised") {
    safeAddParamValue(core, "ParamHairAhoge", 0.12, 0.16);
    safeAddParamValue(core, "ParamEyeLOpen", 0.06, 0.18);
    safeAddParamValue(core, "ParamEyeROpen", 0.06, 0.18);
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
  const speaking = isSpeakingNow() || state.streamSpeakWorking;
  const activeUntil = Number(state.speechAnimUntil || 0);
  if (!speaking && now >= activeUntil) {
    state.speechMouthOpen += (0 - state.speechMouthOpen) * 0.28;
    return state.speechMouthOpen;
  }
  const start = Number(state.speechAnimStartedAt || now);
  const duration = Math.max(260, Number(state.speechAnimDurationMs) || 1000);
  const progress = clampNumber((now - start) / duration, 0, 1.3);
  const style = normalizeTalkStyle(state.speechAnimStyle || state.currentTalkStyle || "neutral");
  const mood = String(state.speechAnimMood || "idle");
  const chars = Math.max(1, Number(state.speechAnimTextLength) || 8);
  const punct = Math.max(0, Number(state.speechAnimPunctuation) || 0);
  const seed = Number(state.speechAnimSeed) || 0;
  const pace = style === "playful" ? 11.5 : (style === "comfort" ? 8.4 : 9.8);
  const waveA = Math.abs(Math.sin(progress * Math.PI * pace + seed));
  const waveB = Math.abs(Math.sin(progress * Math.PI * (pace * 0.53) + seed * 0.67));
  const pauseShape = 1 - Math.pow(Math.sin(clampNumber(progress, 0, 1) * Math.PI), 6) * 0.08;
  let energy = 0.2 + waveA * 0.58 + waveB * 0.24;
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
  if (speaking) {
    const liveLevel = sampleTTSAudioLevel();
    if (liveLevel > 0.02) {
      energy = Math.max(energy * 0.42, 0.14 + liveLevel * 0.96);
    }
  }
  const target = clampNumber(energy, 0, 1);
  state.speechMouthOpen += (target - state.speechMouthOpen) * 0.42;
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
  const speaking = isSpeakingNow() || state.streamSpeakWorking;
  const mood = String(state.speechAnimMood || "idle");
  const pulseActive = now < Number(state.expressionPulseUntil || 0);
  const pulseWeight = pulseActive ? state.expressionPulseBoost : 0;
  const strength = clampNumber(Number(state.expressionStrength) || 1, 0.2, 2.0);
  const speakGain = speaking ? 1.0 : 0.36;
  const pulseGain = pulseActive ? (0.65 + pulseWeight * 0.28) : 0.0;
  const gain = strength * (speakGain + pulseGain);
  const mouthOpen = getSpeechAnimationMouthOpen();

  // Soft semantic expression layer (additive), intentionally small to avoid fighting motions.
  safeAddParamValue(core, "ParamMouthForm", profile.mouthForm * gain, 0.9);
  safeAddParamValue(core, "ParamMouthOpenY", mouthOpen * (speaking ? 0.9 : 0.28), 1.0);
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
  if (mood === "happy") {
    safeAddParamValue(core, "ParamEyeBallX", 0.04 * gain, 0.6);
    safeAddParamValue(core, "ParamEyeBallY", -0.02 * gain, 0.6);
  } else if (mood === "sad") {
    safeAddParamValue(core, "ParamEyeLOpen", -0.05 * gain, 0.5);
    safeAddParamValue(core, "ParamEyeROpen", -0.05 * gain, 0.5);
    safeAddParamValue(core, "ParamAngleY", 0.07 * gain, 0.5);
  } else if (mood === "angry") {
    safeAddParamValue(core, "ParamBrowLY", -0.06 * gain, 0.7);
    safeAddParamValue(core, "ParamBrowRY", -0.06 * gain, 0.7);
    safeAddParamValue(core, "ParamEyeBallX", 0.03 * Math.sign(Math.sin(now / 160)), 0.4);
  } else if (mood === "surprised") {
    safeAddParamValue(core, "ParamEyeLOpen", 0.08 * gain, 0.7);
    safeAddParamValue(core, "ParamEyeROpen", 0.08 * gain, 0.7);
    safeAddParamValue(core, "ParamAngleY", -0.06 * gain, 0.55);
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
    if (Math.random() > preset.talkChance) {
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
      cooldownMs: 760,
      allowFallback: false
    });
    for (let beat = 1; beat < beats; beat += 1) {
      const beatMood = beat % 2 === 0 ? "idle" : talkMood;
      steps.push({
        mood: beatMood,
        source: "talk",
        groups: buildPlannedMotionGroups(style, "talk", beatMood, "talk"),
        priority: 2,
        force: true,
        cooldownMs: 420,
        delayMs: 110 + beat * 120,
        allowFallback: false
      });
    }
    if (comboEnabled && Math.random() < (preset.comboChance * 0.65)) {
      const accentMood = style === "comfort" ? "idle" : (talkMood === "idle" ? "happy" : talkMood);
      steps.push({
        mood: accentMood,
        source: "talk",
        groups: buildPlannedMotionGroups(style, "reply", accentMood, "talk"),
        priority: 2,
        force: true,
        cooldownMs: 520,
        delayMs: 170 + beats * 90,
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
    mood: "idle",
    source: "idle",
    groups: buildPlannedMotionGroups(style, "idle", "idle", "idle"),
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
      if (Number(step.delayMs) > 0) {
        await waitMs(step.delayMs);
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
  let spoken = sanitizeSpeakText(text);
  if (!spoken) {
    return "";
  }
  spoken = colloquializeSpeakText(spoken);
  spoken = simplifySpeechDeliveryText(spoken, style, streamMode);
  if (!spoken) {
    return "";
  }

  const pieces = spoken.match(/[^。！？!?]+[。！？!?]?/g) || [spoken];
  const normalized = pieces
    .map((p) => {
      const safe = String(p || "").trim();
      if (!safe) {
        return "";
      }
      if (streamMode) {
        const streamSafe = safe.replace(/[：:；;]/g, "，");
        return tightenMinorSpeechPauses(streamSafe, true);
      }
      return insertNaturalPause(safe);
    })
    .filter(Boolean);
  spoken = normalized.join("").trim();

  spoken = spoken
    .replace(/[（(][^)）]{2,28}[)）]/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\s+/g, " ")
    .replace(/，{2,}/g, "，")
    .replace(/([。！？!?]){2,}/g, "$1")
    .trim();

  if (style === "clear") {
    spoken = spoken
      .replace(/我建议你/g, "你直接")
      .replace(/你可以考虑/g, "你直接")
      .replace(/一般来说[，,:：]?\s*/g, "");
  }

  if (!/[。！？!?]$/.test(spoken)) {
    spoken += "。";
  }
  return tightenMinorSpeechPauses(spoken, streamMode);
}

function buildStableSpeakText(text) {
  const base = sanitizeSpeakText(text);
  if (!base) {
    return "";
  }
  // Keep delivery close to original sentence to avoid over-sanitizing into short/noisy clips.
  const compact = base.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }
  if (compact.length <= 2) {
    return "";
  }
  return tightenMinorSpeechPauses(compact, false);
}

function stopAllAudioPlayback() {
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
  endSpeechAnimation();
  state.ttsAudioLevel = 0;
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

function splitStreamSpeakSegments(buffer, flush = false) {
  const raw = parseToolMetaFromText(buffer).visibleText;
  const src = simplifySpeechDeliveryText(raw, state.currentTalkStyle || "neutral", true);
  const segments = [];
  if (!src) {
    return { segments, rest: "" };
  }

  const strongTerminal = "。！？!?…\n";
  const softTerminal = "：:";
  let start = 0;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const currentLen = i - start + 1;
    const isStrong = strongTerminal.includes(ch);
    const isSoft = softTerminal.includes(ch);
    if (!isStrong && !isSoft) {
      continue;
    }

    const piece = src.slice(start, i + 1).trim();
    const minLen = isStrong ? 6 : 28;
    if (piece.length >= minLen) {
      segments.push(piece);
      start = i + 1;
    }
  }

  let rest = src.slice(start);
  if (!flush && rest.length > 56) {
    const hardCut = Math.min(36, rest.length);
    let cut = -1;
    for (let i = hardCut - 1; i >= 18; i--) {
      if ("，,、 ：: ".includes(rest[i])) {
        cut = i + 1;
        break;
      }
    }
    if (cut < 0) {
      cut = hardCut;
    }
    const chunk = rest.slice(0, cut).trim();
    if (chunk.length >= 14) {
      segments.push(chunk);
      rest = rest.slice(cut);
    }
  }

  if (flush) {
    const tail = rest.trim();
    if (tail.length >= 3) {
      segments.push(tail);
    }
    rest = "";
  }

  return { segments, rest };
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
  const t = String(text || "");
  const clean = t.replace(/\s+/g, " ").trim();
  const textLen = clean.length;
  const commaCount = (clean.match(/[，,、]/g) || []).length;
  const exclaimCount = (clean.match(/[！!]/g) || []).length;

  let speed = 1.04;
  let pitch = 0.99;
  let volume = 1.0;

  if (textLen > 36) speed -= 0.02;
  if (textLen < 12) speed += 0.02;
  if (commaCount >= 2) speed -= 0.01;
  if (exclaimCount >= 1) {
    speed += 0.01;
    volume += 0.02;
  }

  if (mood === "happy") {
    speed += 0.02;
    pitch += 0.02;
  } else if (mood === "sad") {
    speed -= 0.02;
    pitch -= 0.01;
  } else if (mood === "angry") {
    speed += 0.01;
    pitch -= 0.01;
    volume += 0.03;
  } else if (mood === "surprised") {
    speed += 0.02;
    pitch += 0.03;
  }

  if (/[?？]/.test(clean)) {
    pitch += 0.02;
  }
  if (/！|!/.test(clean)) {
    pitch += 0.02;
  }

  if (style === "comfort") {
    speed -= 0.02;
    pitch -= 0.01;
    volume -= 0.02;
  } else if (style === "clear") {
    speed += 0.02;
    pitch -= 0.02;
  } else if (style === "playful") {
    speed += 0.02;
    pitch += 0.02;
    volume += 0.01;
  } else if (style === "steady") {
    speed -= 0.01;
    pitch -= 0.02;
    volume += 0.02;
  }

  speed += textJitter(clean, 0.004);
  pitch += textJitter(clean.split("").reverse().join(""), 0.004);

  if (streamMode && textLen > 0 && textLen < 18) {
    speed = Math.max(speed, 1.04);
  }

  speed = clampNumber(speed, 0.98, 1.16);
  pitch = clampNumber(pitch, 0.95, 1.07);
  volume = clampNumber(volume, 0.9, 1.08);

  const ratePercent = Math.round((speed - 1) * 100);
  const pitchHz = Math.round((pitch - 1) * 34);
  const volumePercent = Math.round((volume - 1) * 100);

  return {
    speed_ratio: Number(speed.toFixed(2)),
    pitch_ratio: Number(pitch.toFixed(2)),
    volume_ratio: Number(volume.toFixed(2)),
    rate: `${ratePercent >= 0 ? "+" : ""}${ratePercent}%`,
    pitch: `${pitchHz >= 0 ? "+" : ""}${pitchHz}Hz`,
    volume: `${volumePercent >= 0 ? "+" : ""}${volumePercent}%`
  };
}

function ensureStreamSpeakBlobPromise(item) {
  if (!item) {
    return null;
  }
  if (item.blobPromise) {
    return item.blobPromise;
  }
  const prosody = item.prosody || buildSpeakProsody(
    item.text,
    detectMood(item.text),
    true,
    item.style || state.currentTalkStyle || "neutral"
  );
  item.prosody = prosody;
  item.blobPromise = requestServerTTSBlob(item.text, prosody);
  return item.blobPromise;
}

function enqueueStreamSpeakSegment(text, sessionId, prosody = null, style = "neutral") {
  const cleaned = buildSpeechDeliveryText(text, detectMood(text), style, true);
  if (!cleaned) {
    return;
  }
  const item = { text: cleaned, sessionId, prosody, style, blobPromise: null };
  state.streamSpeakQueue.push(item);
  state.streamSpeakLastEnqueueSession = sessionId;
  ensureStreamSpeakBlobPromise(item);
}

function dequeueStreamSpeakItem(sessionId) {
  while (state.streamSpeakQueue.length > 0) {
    const item = state.streamSpeakQueue.shift();
    if (!item) {
      continue;
    }
    if (item.sessionId !== sessionId) {
      continue;
    }
    return item;
  }
  return null;
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
    return;
  }
  state.streamSpeakWorking = true;
  try {
    if (!state.speakingEnabled || !isServerTTSProvider(state.ttsProvider)) {
      return;
    }

    const activeSession = state.streamSpeakSession;
    const idleWaitMs = Math.max(50, Math.min(280, Number(state.streamSpeakIdleWaitMs) || 150));
    let current = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 60);
    if (!current) {
      return;
    }

    while (current) {
      if (activeSession !== state.streamSpeakSession) {
        break;
      }
      let currentBlob = null;
      try {
        currentBlob = await ensureStreamSpeakBlobPromise(current);
      } catch (err) {
        console.warn("Stream TTS fetch failed:", err);
        // Retry once without prosody to avoid provider-side parsing instability.
        try {
          currentBlob = await requestServerTTSBlob(current.text, null);
        } catch (retryErr) {
          console.warn("Stream TTS retry failed:", retryErr);
          setStatus("语音片段失败，跳过");
          current = await waitNextStreamSpeakItem(activeSession, state.chatBusy ? idleWaitMs : 60);
          continue;
        }
      }
      if (!currentBlob) {
        current = await waitNextStreamSpeakItem(activeSession, 20);
        continue;
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
        style: current.style || state.currentTalkStyle || "neutral"
      });
      current = next;
    }
    state.ttsServerAvailable = true;
  } catch (err) {
    console.warn("Stream speak queue failed:", err);
  } finally {
    state.streamSpeakWorking = false;
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
    runStreamSpeakQueue();
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
    runStreamSpeakQueue();
  }
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

function speakOnceWithVoice(text, voice, force = false) {
  return new Promise((resolve) => {
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
      started = true;
      beginSpeechAnimation(cleaned, detectMood(cleaned), state.currentTalkStyle || "neutral");
      setStatus("语音中...");
    };
    utterance.onend = () => {
      if (settled) return;
      settled = true;
      if (voice?.name) {
        state.ttsLastGoodVoiceName = voice.name;
      }
      endSpeechAnimation();
      setStatus("待机");
      resolve(true);
    };
    utterance.onerror = () => {
      if (settled) return;
      settled = true;
      endSpeechAnimation();
      setStatus("语音失败");
      resolve(false);
    };

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
      // Guard against engines that fail silently (no onstart fired).
      setTimeout(() => {
        if (settled) return;
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
  if (!["final_only", "realtime"].includes(state.streamSpeakMode)) {
    state.streamSpeakMode = "realtime";
  }
  if (state.ttsProvider === "gpt_sovits" && !state.gptSovitsRealtimeTTS) {
    state.streamSpeakMode = "final_only";
    // GPT-SoVITS mode should stay single-source to avoid browser double voice overlap.
    state.serverTTSFallbackToBrowser = false;
  }
  if (isServerTTSProvider(state.ttsProvider)) {
    state.ttsServerAvailable = true;
    initServerTTSVoices();
  }
  const asrCfg = state.config?.asr || {};
  const observeCfg = state.config?.observe || {};
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
    Number(asrCfg.speech_threshold || 0.009),
    0.003,
    0.05
  );
  const buf = Math.round(Number(asrCfg.processor_buffer_size || 2048));
  state.localAsrProcessorBufferSize = [1024, 2048, 4096, 8192].includes(buf) ? buf : 2048;
  state.asrHotwordRules = buildAsrHotwordRules(asrCfg.hotword_replacements || {});
  state.wakeWordEnabled = asrCfg.wake_word_enabled !== false;
  state.wakeWords = Array.isArray(asrCfg.wake_words) && asrCfg.wake_words.length
    ? asrCfg.wake_words.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 8)
    : ["\u5854\u83f2", "taffy", "tafi"];
  state.observeAttachMode = ["always", "keyword"].includes(String(observeCfg.attach_mode || "").toLowerCase())
    ? String(observeCfg.attach_mode || "").toLowerCase()
    : "always";
  state.observeAllowAutoChat = observeCfg.allow_auto_chat === true;
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
  state.motionIntensity = normalizeMotionIntensity(
    motionCfg.intensity || motionCfg.action_intensity || "normal"
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
  ui.assistantName.textContent = state.config.assistant_name || "Mochi";
  updateObserveButton();
  updateMicMeter(0);
}

async function initLive2D() {
  const canvas = document.getElementById("live2d-canvas");
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

    state.pixiApp.ticker.add(() => {
      if (!state.model) {
        return;
      }
      if (!state.animating && !state.windowDragActive) {
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
      applyStyleExpressionLayer();
      updateMicroMotionLayer();
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
    setStatus("模型加载失败，请检查 model_path");
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
    const g = e.data?.global || { x: 0, y: 0 };
    state.lastPointerDownAt = performance.now();
    state.lastPointerDownGlobal = { x: Number(g.x) || 0, y: Number(g.y) || 0 };
    state.pointerDragMoved = false;
    state.windowDragActive = !!(state.desktopMode && state.desktopCanMoveWindow);
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
    state.dragData = {
      data: e.data,
      lastGlobal: { x: g.x, y: g.y }
    };
    if (state.windowDragActive) {
      document.body.classList.add("dragging-window");
      document.documentElement.classList.add("dragging-window");
      if (state.model) {
        state.model.visible = true;
        state.model.alpha = 1;
      }
    }
    // Fullscreen overlay: no window drag session needed.
    model.cursor = "grabbing";
    if (state.windowDragActive && state.desktopBridge === "electron") {
      const start = state.dragData?.lastGlobal || { x: Number(g.x) || 0, y: Number(g.y) || 0 };
      const grabOffsetX = (Number(state.modelPosX) || Number(state.model?.x) || 0) - Number(start.x || 0);
      const grabOffsetY = (Number(state.modelPosY) || Number(state.model?.y) || 0) - Number(start.y || 0);
      const onDocMove = (ev) => {
        if (!state.windowDragActive || !state.model) {
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
        state.dragData.lastGlobal = { x: gx, y: gy };
        const dxTap = Number(gx) - Number(state.lastPointerDownGlobal?.x || 0);
        const dyTap = Number(gy) - Number(state.lastPointerDownGlobal?.y || 0);
        if ((dxTap * dxTap + dyTap * dyTap) > (TAP_MOVE_THRESHOLD * TAP_MOVE_THRESHOLD)) {
          state.pointerDragMoved = true;
        }
        state.modelPosX = gx + grabOffsetX;
        state.modelPosY = gy + grabOffsetY;
        state.model.x = state.modelPosX;
        state.model.y = state.modelPosY;
        state.baseTransform.x = state.modelPosX;
        state.baseTransform.y = state.modelPosY;
      };
      document.addEventListener("pointermove", onDocMove);
      const cleanup = () => {
        document.removeEventListener("pointermove", onDocMove);
        document.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointerup", cleanup);
      };
      document.addEventListener("pointerup", cleanup);
      window.addEventListener("pointerup", cleanup);
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

    if (state.desktopMode) {
      if (state.desktopCanMoveWindow && state.windowDragActive) {
        if (state.desktopBridge === "electron") {
          // Handled by document-level pointermove listener.
          return;
        } else {
          const g = e.data?.global || state.dragData.data?.global;
          if (g) {
            const last = state.dragData.lastGlobal || g;
            const dx = g.x - last.x;
            const dy = g.y - last.y;
            state.dragData.lastGlobal = { x: g.x, y: g.y };
            if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
              return;
            }
            state.suspendRelayoutUntil = performance.now() + 240;
            moveDesktopWindowBy(dx, dy);
            state.dragWindowAccumX = 0;
            state.dragWindowAccumY = 0;
          }
        }
      }
      // In desktop mode never move model itself to avoid drift/flicker.
      return;
    }

    if (state.desktopCanMoveWindow && state.windowDragActive) {
      const g = e.data?.global || state.dragData.data?.global;
      if (g) {
        const last = state.dragData.lastGlobal || g;
        const dx = g.x - last.x;
        const dy = g.y - last.y;
        state.dragData.lastGlobal = { x: g.x, y: g.y };
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          return;
        }
        // Live move native window so drag path and destination are consistent.
        state.suspendRelayoutUntil = performance.now() + 140;
        moveDesktopWindowBy(dx, dy);
        // Clear deferred accumulator to avoid double-moving on release.
        state.dragWindowAccumX = 0;
        state.dragWindowAccumY = 0;
      }
      return;
    }

    const pos = state.dragData.data.getLocalPosition(state.pixiApp.stage);
    model.x = pos.x;
    model.y = pos.y;
    state.baseTransform.x = model.x;
    state.baseTransform.y = model.y;
  });
}

function isPointOverVisibleModelArea(clientX, clientY) {
  if (!state.model || !state.pixiApp) return false;
  let bounds = state._stableModelBounds;
  if (!bounds) {
    const mw = Number(state.model.width) || 0;
    const mh = Number(state.model.height) || 0;
    if (mw <= 0 || mh <= 0) return false;
    bounds = {
      left: Number(state.model.x) - mw * 0.5,
      right: Number(state.model.x) + mw * 0.5,
      top: Number(state.model.y) - mh,
      bottom: Number(state.model.y)
    };
  }
  const canvas = state.pixiApp.view;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const renderer = state.pixiApp.renderer;
  const rw = Number(renderer?.width) || 0;
  const rh = Number(renderer?.height) || 0;
  if (rw <= 0 || rh <= 0) return false;
  const x = (clientX - rect.left) * (rw / rect.width);
  const y = (clientY - rect.top) * (rh / rect.height);
  const pad = 30;
  return (
    x >= bounds.left - pad &&
    x <= bounds.right + pad &&
    y >= bounds.top - pad &&
    y <= bounds.bottom + pad
  );
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

function detectMood(text) {
  const s = String(text || "").toLowerCase();
  if (/(开心|高兴|太棒|喜欢|快乐|哈哈|nice|great|awesome|happy|love)/.test(s)) {
    return "happy";
  }
  if (/(难过|伤心|失落|遗憾|抱歉|sad|sorry|upset)/.test(s)) {
    return "sad";
  }
  if (/(生气|愤怒|气死|烦死|angry|mad|annoyed)/.test(s)) {
    return "angry";
  }
  if (/(惊讶|震惊|居然|竟然|真的吗|surprise|wow)/.test(s)) {
    return "surprised";
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
  return browserSpeaking || audioSpeaking;
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
      enqueueActionIntent("idle", { combo: false });
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
      model.x = bx + wave * 6 * swayBias;
      model.y = by - Math.abs(wave) * 10;
      model.rotation = wave * 0.022 * tiltBias;
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
  if (now < state.speakingMotionCooldownUntil) {
    return;
  }
  state.speakingMotionCooldownUntil = now + state.speakingMotionCooldownMs;
  const clean = sanitizeSpeakText(text);
  const clauses = (clean.match(/[，。！？!?；;、]/g) || []).length + 1;
  const lenBeats = Math.ceil((clean.length || 0) / 20);
  const cadence = getActiveModelCadence();
  const beatScale = Math.max(0.8, Math.min(1.4, Number(cadence?.talkBeatScale) || 1));
  const beats = Math.max(1, Math.min(4, Math.round(Math.max(clauses, lenBeats) * beatScale)));
  enqueueActionIntent("talk", { text: clean, style, combo: true, beats });
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
  if (!force && !state.speakingEnabled) {
    return false;
  }
  if (!("speechSynthesis" in window)) {
    return false;
  }
  if (!state.ttsReady) {
    initTTS();
  }

  stopAllAudioPlayback();
  const candidates = buildVoiceCandidates();
  for (const v of candidates) {
    const ok = await speakOnceWithVoice(text, v, force);
    if (ok) {
      return true;
    }
  }
  return false;
}

function buildServerTTSPayload(cleanedText, opts = {}) {
  const payload = { text: String(cleanedText || "") };
  if (state.ttsServerVoice) {
    payload.voice = state.ttsServerVoice;
  }
  if (opts.prosody && typeof opts.prosody === "object") {
    const p = opts.prosody;
    if (Number.isFinite(Number(p.speed_ratio))) payload.speed_ratio = Number(p.speed_ratio);
    if (Number.isFinite(Number(p.pitch_ratio))) payload.pitch_ratio = Number(p.pitch_ratio);
    if (Number.isFinite(Number(p.volume_ratio))) payload.volume_ratio = Number(p.volume_ratio);
    if (typeof p.rate === "string" && p.rate.trim()) payload.rate = p.rate.trim();
    if (typeof p.pitch === "string" && p.pitch.trim()) payload.pitch = p.pitch.trim();
    if (typeof p.volume === "string" && p.volume.trim()) payload.volume = p.volume.trim();
  }
  return payload;
}

async function requestServerTTSBlob(text, prosody = null) {
  const cleaned = sanitizeSpeakText(text);
  if (!cleaned) {
    return null;
  }

  const payload = buildServerTTSPayload(cleaned, { prosody });
  const resp = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
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
  const blob = await resp.blob();
  if (!blob || blob.size === 0) {
    throw new Error("语音数据为空");
  }
  const type = String(blob.type || "").toLowerCase();
  if (type.startsWith("audio/")) {
    return blob;
  }
  // Some providers may return octet-stream with valid audio bytes.
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let mime = "application/octet-stream";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
    mime = "audio/wav";
  } else if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    mime = "audio/ogg";
  } else if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    mime = "audio/flac";
  } else if (
    (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2))
  ) {
    mime = "audio/mpeg";
  }
  return new Blob([buf], { type: mime });
}

async function playAudioByContext(blob) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || !blob) {
    return false;
  }
  try {
    if (!state.ttsDecodeContext || state.ttsDecodeContext.state === "closed") {
      state.ttsDecodeContext = new AudioCtx();
    }
    const ctx = state.ttsDecodeContext;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const arrayBuf = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    source.buffer = decoded;
    source.connect(gain);
    gain.connect(ctx.destination);
    await new Promise((resolve) => {
      source.onended = resolve;
      source.start(0);
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function playAudioBlob(blob, opts = {}) {
  if (!blob) {
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
  if (opts.interrupt) {
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
      endSpeechAnimation();
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // ignore
      }
      setStatus(ok ? "待机" : "语音失败");
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = async () => {
      const ok = await playAudioByContext(blob);
      done(!!ok);
    };
    audio.onplay = () => {
      if (state.ttsAudioContext && typeof state.ttsAudioContext.resume === "function") {
        state.ttsAudioContext.resume().catch(() => {});
      }
      beginSpeechAnimation(speechText, speechMood, speechStyle, {
        durationMs: Number.isFinite(Number(audio.duration)) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : undefined
      });
    };
    audio.onloadedmetadata = () => {
      if (Number.isFinite(Number(audio.duration)) && audio.duration > 0) {
        // Add a generous buffer to prevent long GPT-SoVITS clips from being misclassified as failures.
        armFailTimer(audio.duration * 1000 + 12000);
        beginSpeechAnimation(speechText, speechMood, speechStyle, {
          durationMs: Math.round(audio.duration * 1000)
        });
      }
    };
    audio.src = url;
    audio.play().then(() => {
      // started
    }).catch(async () => {
      const ok = await playAudioByContext(blob);
      done(!!ok);
    });
    // Metadata may arrive late on some environments; start with a conservative guard timer first.
    armFailTimer(45000);
  });
}

async function speakByServer(text, opts = {}) {
  const force = !!opts.force;
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
    const blob = await requestServerTTSBlob(cleaned, opts.prosody || null);
    return await playAudioBlob(blob, {
      interrupt: !!opts.interrupt,
      text: cleaned,
      mood: opts.mood || detectMood(cleaned),
      style: opts.style || state.currentTalkStyle || "neutral"
    });
  } catch (err) {
    console.warn("Server TTS failed:", err);
    setStatus("语音服务未就绪");
    return false;
  }
}

async function speak(text, opts = {}) {
  if (isServerTTSProvider(state.ttsProvider)) {
    // Always retry even if a previous call failed — GPT-SoVITS may have started later.
    const ok = await speakByServer(text, opts);
    if (ok) {
      state.ttsServerAvailable = true;
      return true;
    }
    // Keep GPT-SoVITS single-source to avoid duplicate browser speech overlap.
    if (!state.serverTTSFallbackToBrowser || state.ttsProvider === "gpt_sovits") {
      return false;
    }
    // Optional fallback for other server providers when explicitly enabled.
    return await speakByBrowser(text, { force: !!opts.force });
  }
  return await speakByBrowser(text, opts);
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

async function streamAssistantReply(payload, onDelta) {
  const preferNonStream = state.streamSpeakMode !== "realtime";
  if (preferNonStream) {
    const directResp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const directData = await directResp.json();
    if (!directResp.ok) {
      throw new Error(directData.error || `HTTP ${directResp.status}`);
    }
    const text = String(directData.reply || "");
    if (text) onDelta(text);
    return text;
  }

  const resp = await fetch("/api/chat_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
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

  if (!resp.body || typeof resp.body.getReader !== "function") {
    // Fallback for environments without stream reader.
    const fallbackResp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const fallbackData = await fallbackResp.json();
    if (!fallbackResp.ok) {
      throw new Error(fallbackData.error || `HTTP ${fallbackResp.status}`);
    }
    const text = String(fallbackData.reply || "");
    if (text) onDelta(text);
    return text;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";
  let doneReply = "";

  const handleDataLine = (line) => {
    if (!line || !line.startsWith("data:")) {
      return false;
    }
    const raw = line.slice(5).trim();
    if (!raw) {
      return false;
    }
    if (raw === "[DONE]") {
      return true;
    }
    let evt = null;
    try {
      evt = JSON.parse(raw);
    } catch (_) {
      return false;
    }
    if (evt.type === "error") {
      throw new Error(evt.error || "流式请求失败");
    }
    if (evt.type === "delta" && typeof evt.text === "string" && evt.text) {
      fullText += evt.text;
      onDelta(evt.text);
    }
    if (evt.type === "done" && typeof evt.reply === "string" && evt.reply.trim()) {
      doneReply = evt.reply.trim();
    }
    return evt.type === "done";
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let lineIndex = buffer.indexOf("\n");
    while (lineIndex >= 0) {
      const line = buffer.slice(0, lineIndex).trim();
      buffer = buffer.slice(lineIndex + 1);
      const isDone = handleDataLine(line);
      if (isDone) {
        return doneReply || fullText;
      }
      lineIndex = buffer.indexOf("\n");
    }
  }

  const tail = buffer.trim();
  if (tail) {
    handleDataLine(tail);
  }
  return doneReply || fullText;
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
  const forceTools = opts.forceTools === true;
  const userTimestamp = Date.now();

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
  let gotFirstDelta = false;
  let latencyHintTimer = 0;
  const streamSpeakSession = Date.now();
  const useStreamSpeak = shouldUseStreamSpeak();
  state.streamSpeakSession = streamSpeakSession;
  state.streamSpeakQueue = [];
  state.streamSpeakBuffer = "";
  if (useStreamSpeak) {
    stopAllAudioPlayback();
  }
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
    if (!imageDataUrl && shouldAttachDesktopImage(message, isAuto)) {
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
      force_tools: forceTools
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
        clearThinkingMotionTimer();
        if (latencyHintTimer) {
          clearTimeout(latencyHintTimer);
          latencyHintTimer = 0;
        }
      }
      reply += delta;
      setMessageText(assistantRow, reply);
      if (useStreamSpeak) {
        feedStreamSpeakDelta(delta, streamSpeakSession, talkStyle);
      }
      setStatus(isAuto ? "自动对话中..." : "思考中...");
    });
    if (streamed && streamed !== reply) {
      reply = streamed;
      setMessageText(assistantRow, reply);
    }
    reply = reply.trim();
    const parsedReply = parseToolMetaFromText(reply);
    const visibleReply = String(parsedReply.visibleText || "").trim();
    if (!visibleReply) {
      throw new Error("模型没有返回内容");
    }
    const assistantTimestamp = Date.now();
    finalizePendingMessageRow(assistantRow, "assistant", visibleReply, {
      timestamp: assistantTimestamp,
      persist: true
    });
    if (rememberAssistant) {
      rememberMessage("assistant", visibleReply, { timestamp: assistantTimestamp });
    }
    const mood = detectMood(visibleReply);
    recordEmotion(mood);
    const finalTalkStyle = resolveTalkStyle(message, visibleReply, mood, isAuto);
    state.currentTalkStyle = finalTalkStyle;
    enqueueActionIntent("reply", { text: visibleReply, style: finalTalkStyle, mood, combo: true });
    if (useStreamSpeak) {
      flushStreamSpeak(streamSpeakSession, finalTalkStyle);
      const hadStreamSegments = state.streamSpeakLastEnqueueSession === streamSpeakSession;
      if (!hadStreamSegments) {
        const speechText = buildStableSpeakText(visibleReply) || visibleReply;
        const prosody = buildSpeakProsody(speechText || visibleReply, mood, false, finalTalkStyle);
        maybePlayTalkGesture(speechText || visibleReply, finalTalkStyle);
        await speak(speechText || visibleReply, {
          prosody,
          interrupt: true,
          mood,
          style: finalTalkStyle
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
        style: finalTalkStyle
      });
    }
    setStatus("待机");
    return true;
  } catch (err) {
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
        setStatus("关麦中，处理最后一句...");
        await transcribeSnapshotAfterMicClose(closeSnapshot);
      }
      setStatus("开麦已关闭");
      return;
    }
    await startMicLoop();
    if (state.micOpen) {
      setStatus(state.micKeepListening ? "开麦已开启（通话模式）" : "开麦已开启");
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
  updateMicButton();
  renderScheduleList();
  renderPendingAttachments();

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

  if (ui.personaBtn) {
    ui.personaBtn.addEventListener("click", () => {
      if (ui.personaModal?.hidden) {
        openPersonaPanel();
      } else {
        closePersonaPanel();
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
}
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
    await loadPersonaCard();
    if (state.uiView === "model") {
      await ensureLive2DRuntime();
      await initLive2D();
      setStatus("待机");
      return;
    }

    if (state.uiView === "chat") {
      if (!isServerTTSProvider(state.ttsProvider)) {
        initTTS();
      }
      setupSpeechRecognition();
      bindUI();
      startReminderLoop();
      runReminderCheck();
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
  resetActionSystem();
  stopIdleMotionLoop();
  stopAutoChatLoop();
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
