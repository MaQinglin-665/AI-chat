(function (root) {
  "use strict";

  function getNow(options = {}) {
    return typeof options.now === "function" ? Number(options.now()) : Date.now();
  }

  function parseLocalDateTime(raw) {
    const match = String(raw || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[t\s]+(\d{1,2}):(\d{2})$/i);
    if (!match) return 0;
    const [year, month, day, hour, minute] = match.slice(1).map(Number);
    if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return 0;
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    // Date silently normalizes impossible dates (February 30, skipped local hours).
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day
        || date.getHours() !== hour || date.getMinutes() !== minute) return 0;
    return date.getTime();
  }

  function parseReminderWhen(rawWhen, options = {}) {
    const src = String(rawWhen || "").trim().toLowerCase();
    if (!src) {
      return 0;
    }
    const now = getNow(options);
    const rel = src.match(/^(\d{1,4})\s*(s|sec|secs|second|seconds|秒|m|min|mins|minute|minutes|分|分钟|h|hr|hrs|hour|hours|时|小时)$/i);
    if (rel) {
      const amount = Number(rel[1]);
      if (amount <= 0) return 0;
      const unit = String(rel[2] || "").toLowerCase();
      if (["s", "sec", "secs", "second", "seconds", "秒"].includes(unit)) {
        return now + amount * 1000;
      }
      if (["m", "min", "mins", "minute", "minutes", "分", "分钟"].includes(unit)) {
        return now + amount * 60000;
      }
      return now + amount * 3600000;
    }
    const hm = src.match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
      const hh = Number(hm[1]);
      const mm = Number(hm[2]);
      if (hh > 23 || mm > 59) return 0;
      const dt = new Date(now);
      dt.setHours(hh, mm, 0, 0);
      if (dt.getTime() <= now) {
        dt.setDate(dt.getDate() + 1);
      }
      return dt.getTime();
    }
    return parseLocalDateTime(src);
  }

  function formatReminderTime(ts, options = {}) {
    const d = new Date(Number(ts) || getNow(options));
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

  function shiftReminderToNextDay(dueAt, options = {}) {
    const next = new Date(Number(dueAt) || getNow(options));
    next.setDate(next.getDate() + 1);
    return next.getTime();
  }

  function buildReminderDisplayTime(item, options = {}) {
    const repeat = normalizeReminderRepeat(item?.repeat);
    const d = new Date(Number(item?.dueAt) || getNow(options));
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return repeat === "daily" ? `每天 ${hh}:${mm}` : `单次 · ${formatReminderTime(item?.dueAt, options)}`;
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

  const api = {
    parseLocalDateTime,
    parseReminderWhen,
    formatReminderTime,
    normalizeReminderMode,
    normalizeReminderRepeat,
    normalizeDailyReminderDueAt,
    shiftReminderToNextDay,
    buildReminderDisplayTime,
    buildReminderTypeLabel
  };

  root.TaffyReminderUtils = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
