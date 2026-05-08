(function (root) {
  "use strict";

  const STORAGE_KEYS = {
    reminders: "taffy_reminders_v1",
    emotion: "taffy_emotion_stats_v1",
    dailyGreeting: "taffy_daily_greeting_v1",
    chatHistory: "taffy_chat_history_v2",
    chatTranslationVisible: "taffy_chat_translation_visible_v1",
    subtitleEnabled: "taffy_subtitle_enabled_v1",
    subtitlePosition: "taffy_subtitle_position_v1",
    onboardingSeen: "taffy_onboarding_seen_v1",
    assistantAvatar: "taffy_assistant_avatar_v1"
  };

  function getStorage(deps = {}) {
    const windowObject = deps.windowObject || root;
    return windowObject.localStorage || null;
  }

  function safeParseJSON(raw, fallback) {
    try {
      const parsed = JSON.parse(String(raw || ""));
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function loadReminders(state = {}, deps = {}) {
    const storage = getStorage(deps);
    const raw = storage ? storage.getItem(STORAGE_KEYS.reminders) : "";
    const parsed = safeParseJSON(raw, []);
    if (!Array.isArray(parsed)) {
      state.reminders = [];
      state.reminderSeq = 1;
      call(deps.renderScheduleList);
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
      const mode = call(deps.normalizeReminderMode, item.mode);
      const repeat = call(deps.normalizeReminderRepeat, item.repeat);
      let done = !!item.done;
      let nextDueAt = dueAt;
      if (!id || !dueAt || !text) {
        continue;
      }
      if (repeat === "daily") {
        done = false;
        nextDueAt = call(deps.normalizeDailyReminderDueAt, dueAt, now);
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
    call(deps.renderScheduleList);
    if (changed) {
      saveReminders(state, deps);
    }
  }

  function saveReminders(state = {}, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEYS.reminders, JSON.stringify(state.reminders || []));
    } catch (_) {
      // ignore storage quota failures
    }
    call(deps.renderScheduleList);
  }

  function loadDailyGreetingState(state = {}, deps = {}) {
    const storage = getStorage(deps);
    const raw = storage ? storage.getItem(STORAGE_KEYS.dailyGreeting) : "";
    const parsed = safeParseJSON(raw, {});
    state.dailyGreetingLastRunKey = String(parsed?.last_run_key || "").trim();
  }

  function saveDailyGreetingState(state = {}, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEYS.dailyGreeting, JSON.stringify({
        last_run_key: String(state.dailyGreetingLastRunKey || "").trim()
      }));
    } catch (_) {
      // ignore storage failures
    }
  }

  function saveChatHistory(state = {}, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return;
    }
    try {
      storage.setItem(
        STORAGE_KEYS.chatHistory,
        JSON.stringify((state.chatRecords || []).slice(-(Number(deps.maxChatHistoryRecords) || 240)))
      );
    } catch (_) {
      // ignore storage quota failures
    }
  }

  function loadChatHistory(state = {}, deps = {}) {
    const storage = getStorage(deps);
    const raw = storage ? storage.getItem(STORAGE_KEYS.chatHistory) : "";
    const parsed = safeParseJSON(raw, []);
    if (!Array.isArray(parsed)) {
      state.chatRecords = [];
      state.history = [];
      call(deps.renderChatHistoryFromState);
      return;
    }
    const normalizeChatRecord = deps.normalizeChatRecord;
    const parseMessageTimestamp = deps.parseMessageTimestamp;
    const trimChatRecords = deps.trimChatRecords;
    state.chatRecords = typeof trimChatRecords === "function"
      ? trimChatRecords(parsed.map((item) => call(normalizeChatRecord, item)).filter(Boolean))
      : parsed;
    const lastUserRecord = [...state.chatRecords].reverse().find((item) => item?.role === "user");
    if (lastUserRecord) {
      const ts = call(parseMessageTimestamp, lastUserRecord.timestamp);
      state.lastUserMessageAt = ts;
      state.conversationLastUserAt = ts;
    }
    const lastAssistantRecord = [...state.chatRecords].reverse().find((item) => item?.role === "assistant");
    if (lastAssistantRecord) {
      state.conversationLastAssistantAt = call(parseMessageTimestamp, lastAssistantRecord.timestamp);
    }
    call(deps.syncConversationHistoryFromChatRecords);
    call(deps.renderChatHistoryFromState);
  }

  function saveBoolean(key, value, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return;
    }
    try {
      storage.setItem(key, value ? "1" : "0");
    } catch (_) {
      // ignore storage failures
    }
  }

  function loadBoolean(key, fallback, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return fallback;
    }
    try {
      const raw = String(storage.getItem(key) || "").trim();
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch (_) {
      // ignore storage failures
    }
    return fallback;
  }

  function saveChatTranslationVisibility(state = {}, deps = {}) {
    saveBoolean(STORAGE_KEYS.chatTranslationVisible, state.chatTranslationVisible !== false, deps);
  }

  function loadChatTranslationVisibility(state = {}, deps = {}) {
    state.chatTranslationVisible = loadBoolean(STORAGE_KEYS.chatTranslationVisible, true, deps);
    call(deps.updateChatTranslationVisibility);
  }

  function saveSubtitleEnabled(state = {}, deps = {}) {
    saveBoolean(STORAGE_KEYS.subtitleEnabled, state.subtitleEnabled !== false, deps);
  }

  function loadSubtitleEnabled(state = {}, deps = {}) {
    state.subtitleEnabled = loadBoolean(STORAGE_KEYS.subtitleEnabled, true, deps);
    call(deps.applySubtitleEnabledState, { persist: false });
  }

  function saveSubtitlePosition(state = {}, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return;
    }
    try {
      if (!state.subtitlePositionCustom) {
        storage.removeItem(STORAGE_KEYS.subtitlePosition);
        return;
      }
      storage.setItem(STORAGE_KEYS.subtitlePosition, JSON.stringify({
        x: Number(state.subtitlePositionRatioX) || 0.5,
        y: Number(state.subtitlePositionRatioY) || 0.75
      }));
    } catch (_) {
      // ignore storage failures
    }
  }

  function loadSubtitlePosition(state = {}, deps = {}) {
    const storage = getStorage(deps);
    state.subtitlePositionCustom = false;
    state.subtitlePositionRatioX = 0.5;
    state.subtitlePositionRatioY = 0.75;
    if (storage) {
      try {
        const raw = storage.getItem(STORAGE_KEYS.subtitlePosition);
        const parsed = safeParseJSON(raw, null);
        const x = Number(parsed?.x);
        const y = Number(parsed?.y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          state.subtitlePositionCustom = true;
          state.subtitlePositionRatioX = Math.max(0.05, Math.min(0.95, x));
          state.subtitlePositionRatioY = Math.max(0.08, Math.min(0.92, y));
        }
      } catch (_) {
        // ignore storage failures
      }
    }
    call(deps.applySubtitlePositionFromState);
  }

  function saveOnboardingSeen(seen, deps = {}) {
    saveBoolean(STORAGE_KEYS.onboardingSeen, !!seen, deps);
  }

  function loadOnboardingSeen(state = {}, deps = {}) {
    state.onboardingSeen = loadBoolean(STORAGE_KEYS.onboardingSeen, false, deps);
    return state.onboardingSeen;
  }

  function readAssistantAvatar(deps = {}) {
    const storage = getStorage(deps);
    try {
      const saved = storage ? storage.getItem(STORAGE_KEYS.assistantAvatar) : "";
      return call(deps.normalizeAssistantAvatarUrl, saved);
    } catch (_) {
      return call(deps.normalizeAssistantAvatarUrl, "");
    }
  }

  function saveAssistantAvatar(url, deps = {}) {
    const storage = getStorage(deps);
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEYS.assistantAvatar, String(url || ""));
    } catch (_) {
      // ignore storage failures
    }
  }

  const api = {
    STORAGE_KEYS,
    safeParseJSON,
    loadReminders,
    saveReminders,
    loadDailyGreetingState,
    saveDailyGreetingState,
    saveChatHistory,
    loadChatHistory,
    saveChatTranslationVisibility,
    loadChatTranslationVisibility,
    saveSubtitleEnabled,
    loadSubtitleEnabled,
    saveSubtitlePosition,
    loadSubtitlePosition,
    saveOnboardingSeen,
    loadOnboardingSeen,
    readAssistantAvatar,
    saveAssistantAvatar
  };

  root.TaffyStorageController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
