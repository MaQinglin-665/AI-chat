(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const document = deps.documentObject || root.document;
    const window = deps.windowObject || root;
    const REMINDER_UTILS = deps.reminderUtils || {};
    const SCHEDULE_LIST_VIEW = deps.scheduleListView || {};
    const SCHEDULE_FORM_MODEL = deps.scheduleFormModel || {};
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const saveRemindersToStorage = typeof deps.saveRemindersToStorage === "function" ? deps.saveRemindersToStorage : () => {};
    const saveDailyGreetingState = typeof deps.saveDailyGreetingState === "function" ? deps.saveDailyGreetingState : () => {};
    const requestAssistantReply = typeof deps.requestAssistantReply === "function" ? deps.requestAssistantReply : async () => false;
    const appendMessage = typeof deps.appendMessage === "function" ? deps.appendMessage : () => null;
    const buildSpeakProsody = typeof deps.buildSpeakProsody === "function" ? deps.buildSpeakProsody : () => null;
    const speak = typeof deps.speak === "function" ? deps.speak : async () => false;
    const isHelpOpen = typeof deps.isHelpOpen === "function" ? deps.isHelpOpen : () => false;
    const closeHelpModal = typeof deps.closeHelpModal === "function" ? deps.closeHelpModal : () => {};
    const isOnboardingOpen = typeof deps.isOnboardingOpen === "function" ? deps.isOnboardingOpen : () => false;
    const closeOnboardingModal = typeof deps.closeOnboardingModal === "function" ? deps.closeOnboardingModal : () => {};
    const closePersonaPanel = typeof deps.closePersonaPanel === "function" ? deps.closePersonaPanel : () => {};
    const isLearningReviewOpen = typeof deps.isLearningReviewOpen === "function" ? deps.isLearningReviewOpen : () => false;
    const closeLearningReviewDrawer = typeof deps.closeLearningReviewDrawer === "function" ? deps.closeLearningReviewDrawer : () => {};
    function getLocalDateKey(date = new Date()) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }


    function parseReminderWhen(rawWhen) {
      return typeof REMINDER_UTILS.parseReminderWhen === "function"
        ? REMINDER_UTILS.parseReminderWhen(rawWhen)
        : 0;
    }


    function formatReminderTime(ts) {
      return typeof REMINDER_UTILS.formatReminderTime === "function"
        ? REMINDER_UTILS.formatReminderTime(ts)
        : "";
    }


    function normalizeReminderMode(mode) {
      return typeof REMINDER_UTILS.normalizeReminderMode === "function"
        ? REMINDER_UTILS.normalizeReminderMode(mode)
        : "reminder";
    }


    function normalizeReminderRepeat(repeat) {
      return typeof REMINDER_UTILS.normalizeReminderRepeat === "function"
        ? REMINDER_UTILS.normalizeReminderRepeat(repeat)
        : "once";
    }


    function normalizeDailyReminderDueAt(dueAt, now = Date.now()) {
      return typeof REMINDER_UTILS.normalizeDailyReminderDueAt === "function"
        ? REMINDER_UTILS.normalizeDailyReminderDueAt(dueAt, now)
        : 0;
    }


    function shiftReminderToNextDay(dueAt) {
      return typeof REMINDER_UTILS.shiftReminderToNextDay === "function"
        ? REMINDER_UTILS.shiftReminderToNextDay(dueAt)
        : Number(dueAt) || Date.now();
    }


    function buildReminderDisplayTime(item) {
      return typeof REMINDER_UTILS.buildReminderDisplayTime === "function"
        ? REMINDER_UTILS.buildReminderDisplayTime(item)
        : formatReminderTime(item?.dueAt);
    }


    function buildReminderTypeLabel(item) {
      return typeof REMINDER_UTILS.buildReminderTypeLabel === "function"
        ? REMINDER_UTILS.buildReminderTypeLabel(item)
        : "????";
    }

    function buildDefaultScheduleDateTimeValue() {
      return typeof SCHEDULE_FORM_MODEL.buildDefaultDateTimeValue === "function"
        ? SCHEDULE_FORM_MODEL.buildDefaultDateTimeValue()
        : "";
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

    function renderScheduleList() {
      if (!ui.scheduleList) {
        return;
      }
      if (typeof SCHEDULE_LIST_VIEW.renderScheduleList !== "function") {
        ui.scheduleList.innerHTML = "";
        return;
      }
      SCHEDULE_LIST_VIEW.renderScheduleList(ui.scheduleList, state.reminders || [], {
        normalizeReminderMode,
        normalizeReminderRepeat,
        buildReminderTypeLabel,
        buildReminderDisplayTime,
        onRemove: (item) => {
          const ok = removeReminderById(item?.id);
          setStatus(ok ? "?????" : "??????");
        }
      }, document);
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
      const draft = typeof SCHEDULE_FORM_MODEL.buildScheduleDraft === "function"
        ? SCHEDULE_FORM_MODEL.buildScheduleDraft({
          rawDate: ui.scheduleDatetime.value,
          text: ui.scheduleTask.value,
          repeat: ui.scheduleRepeat.value,
          mode: ui.scheduleMode.value
        }, {
          normalizeReminderRepeat,
          normalizeReminderMode,
          shiftReminderToNextDay
        })
        : { ok: false, message: "???????", focus: "time" };
      if (!draft.ok) {
        setStatus(draft.message || "??????");
        if (draft.focus === "text") {
          ui.scheduleTask.focus();
        } else {
          ui.scheduleDatetime.focus();
        }
        return;
      }

      const id = addReminder(draft.text, draft.dueAt, { mode: draft.mode, repeat: draft.repeat });
      ui.scheduleTask.value = "";
      ui.scheduleDatetime.value = buildDefaultScheduleDateTimeValue();
      setStatus(`????? #${id}`);
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


    return {
      getLocalDateKey,
      parseReminderWhen,
      formatReminderTime,
      normalizeReminderMode,
      normalizeReminderRepeat,
      normalizeDailyReminderDueAt,
      shiftReminderToNextDay,
      buildReminderDisplayTime,
      buildReminderTypeLabel,
      buildDefaultScheduleDateTimeValue,
      openSchedulePanel,
      closeSchedulePanel,
      renderScheduleList,
      addReminder,
      listPendingReminders,
      removeReminderById,
      saveScheduleFromForm,
      markReminderTriggered,
      startAssistantReminder,
      runReminderCheck,
      runDailyGreetingCheck,
      startReminderLoop
    };
  }

  const api = { createController };
  root.TaffyReminderScheduleController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
