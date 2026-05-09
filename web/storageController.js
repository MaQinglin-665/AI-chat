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
    assistantAvatar: "taffy_assistant_avatar_v1",
    characterBrainLastDecision: "taffy_character_brain_last_decision_v1"
  };

  function getStorage(deps = {}) {
    const windowObject = deps.windowObject || root;
    return windowObject.localStorage || null;
  }

  function getSessionStorage(deps = {}) {
    const windowObject = deps.windowObject || root;
    return windowObject.sessionStorage || null;
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

  function cleanText(value, maxLen = 80) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length > maxLen) {
      return text.slice(0, Math.max(0, maxLen - 3)).trimEnd() + "...";
    }
    return text;
  }

  function cleanInt(value, fallback = 0, min = 0, max = 9999999999999) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, n));
  }

  function sanitizeCharacterBrainSnapshot(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const continuityRaw = raw.continuity && typeof raw.continuity === "object" && !Array.isArray(raw.continuity)
      ? raw.continuity
      : {};
    const constraintsRaw = raw.output_constraints && typeof raw.output_constraints === "object" && !Array.isArray(raw.output_constraints)
      ? raw.output_constraints
      : {};
    return {
      version: 1,
      intent: cleanText(raw.intent, 40),
      reply_style: cleanText(raw.reply_style, 40),
      style_beat: cleanText(raw.style_beat, 48),
      reaction_mode: cleanText(raw.reaction_mode, 48),
      banter_level: cleanInt(raw.banter_level, 0, 0, 3),
      energy: cleanText(raw.energy, 24),
      attention: cleanText(raw.attention, 24),
      relationship: cleanText(raw.relationship, 40),
      max_sentences: cleanInt(raw.max_sentences, 3, 1, 8),
      emotion: cleanText(raw.emotion, 32),
      action: cleanText(raw.action, 32),
      intensity: cleanText(raw.intensity, 16),
      voice_style: cleanText(raw.voice_style, 32),
      output_constraints: {
        max_sentences: cleanInt(constraintsRaw.max_sentences, cleanInt(raw.max_sentences, 3, 1, 8), 1, 8),
        allow_followup_question: constraintsRaw.allow_followup_question === true,
        clarify_only_when_needed: constraintsRaw.clarify_only_when_needed === true,
        allow_teasing: constraintsRaw.allow_teasing === true,
        allow_motion: constraintsRaw.allow_motion === false ? false : true,
        voice_style: cleanText(constraintsRaw.voice_style, 32)
      },
      feedback_effects: Array.isArray(raw.feedback_effects)
        ? raw.feedback_effects.slice(0, 5).map((item) => cleanText(item, 48)).filter(Boolean)
        : [],
      continuity: {
        last_intent: cleanText(continuityRaw.last_intent, 40),
        last_topic: cleanText(continuityRaw.last_topic, 48),
        mood_baseline: cleanText(continuityRaw.mood_baseline, 24),
        energy: cleanText(continuityRaw.energy, 24),
        relationship_tone: cleanText(continuityRaw.relationship_tone, 32),
        recent_user_need: cleanText(continuityRaw.recent_user_need, 40),
        same_need_turns: cleanInt(continuityRaw.same_need_turns, 0, 0, 20),
        updated_at: cleanInt(continuityRaw.updated_at, 0, 0),
        decay: cleanText(continuityRaw.decay, 40)
      }
    };
  }

  function saveCharacterBrainSnapshot(state = {}, deps = {}) {
    const storage = getSessionStorage(deps);
    if (!storage) {
      return;
    }
    const snapshot = sanitizeCharacterBrainSnapshot(state.characterBrainLastDecision);
    if (!snapshot) {
      try {
        storage.removeItem(STORAGE_KEYS.characterBrainLastDecision);
      } catch (_) {
        // ignore storage failures
      }
      return;
    }
    try {
      storage.setItem(
        STORAGE_KEYS.characterBrainLastDecision,
        JSON.stringify({
          updated_at: cleanInt(state.characterBrainLastUpdatedAt, Date.now(), 0),
          snapshot
        })
      );
    } catch (_) {
      // ignore storage quota failures
    }
  }

  function loadCharacterBrainSnapshot(state = {}, deps = {}) {
    const storage = getSessionStorage(deps);
    const raw = storage ? storage.getItem(STORAGE_KEYS.characterBrainLastDecision) : "";
    const parsed = safeParseJSON(raw, null);
    const snapshot = sanitizeCharacterBrainSnapshot(parsed?.snapshot);
    if (!snapshot) {
      state.characterBrainLastDecision = null;
      state.characterBrainLastUpdatedAt = 0;
      return null;
    }
    state.characterBrainLastDecision = snapshot;
    state.characterBrainLastUpdatedAt = cleanInt(parsed?.updated_at, 0, 0);
    return snapshot;
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
    saveAssistantAvatar,
    sanitizeCharacterBrainSnapshot,
    saveCharacterBrainSnapshot,
    loadCharacterBrainSnapshot
  };

  root.TaffyStorageController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
