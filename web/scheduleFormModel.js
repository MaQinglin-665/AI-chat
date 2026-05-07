(function (root) {
  "use strict";

  function defaultNormalizeRepeat(repeat) {
    return String(repeat || "").toLowerCase() === "daily" ? "daily" : "once";
  }

  function defaultNormalizeMode(mode) {
    const safe = String(mode || "").toLowerCase();
    return ["assistant", "tool"].includes(safe) ? safe : "reminder";
  }

  function shiftToNextDay(dueAt) {
    const next = new Date(Number(dueAt) || Date.now());
    next.setDate(next.getDate() + 1);
    return next.getTime();
  }

  function buildDefaultDateTimeValue(options = {}) {
    const now = typeof options.now === "function" ? Number(options.now()) : Date.now();
    const d = new Date(now + 10 * 60000);
    d.setSeconds(0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function buildScheduleDraft(input = {}, helpers = {}) {
    const rawDate = String(input.rawDate || "").trim();
    const text = String(input.text || "").trim();
    const normalizeRepeat = typeof helpers.normalizeReminderRepeat === "function"
      ? helpers.normalizeReminderRepeat
      : defaultNormalizeRepeat;
    const normalizeMode = typeof helpers.normalizeReminderMode === "function"
      ? helpers.normalizeReminderMode
      : defaultNormalizeMode;
    const shiftReminderToNextDay = typeof helpers.shiftReminderToNextDay === "function"
      ? helpers.shiftReminderToNextDay
      : shiftToNextDay;
    const now = typeof helpers.now === "function" ? Number(helpers.now()) : Date.now();
    const repeat = normalizeRepeat(input.repeat);
    const mode = normalizeMode(input.mode);

    if (!rawDate) {
      return { ok: false, reason: "missing_time", focus: "time", message: "请先选择执行时间" };
    }
    if (!text) {
      return { ok: false, reason: "missing_text", focus: "text", message: "请先写下让馨语AI桌宠做什么" };
    }

    let dueAt = new Date(rawDate).getTime();
    if (!Number.isFinite(dueAt)) {
      return { ok: false, reason: "invalid_time", focus: "time", message: "日程时间格式无效" };
    }

    if (repeat === "daily") {
      while (dueAt <= now) {
        dueAt = shiftReminderToNextDay(dueAt);
      }
    } else if (dueAt <= now + 5000) {
      return { ok: false, reason: "time_too_soon", focus: "time", message: "执行时间需要晚于当前" };
    }

    return {
      ok: true,
      rawDate,
      text,
      dueAt,
      repeat,
      mode
    };
  }

  const api = {
    buildDefaultDateTimeValue,
    buildScheduleDraft
  };

  root.TaffyScheduleFormModel = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
